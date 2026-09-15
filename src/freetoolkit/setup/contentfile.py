"""Editing content/config.yaml and content/affiliates.yaml without flattening them.

Both files are documentation as much as data: the comments explain why ads are
on during the review, why an empty slot renders nothing, which programmes pay
per merchant. Loading them with PyYAML and dumping them back would delete every
one of those comments, so this edits the lines it has to and nothing else.

Every write is checked by loading the result: if the value read back is not
the value written, the file is left untouched and the write fails. And every
write keeps a copy of the previous file in .setup/backups/.
"""

from __future__ import annotations

import json
import re
import shutil
from datetime import datetime, UTC
from pathlib import Path

import yaml

KEEP_BACKUPS = 20

_MAPPING_LINE = re.compile(r"^(?P<indent> *)(?P<key>[A-Za-z0-9_-]+):(?P<value>.*)$")
_ITEM_NAME = re.compile(r'^(?P<indent> *)- name: *(?P<name>"[^"]*"|\S.*?)\s*$')
_ITEM_FIELD = re.compile(r"^(?P<indent> *)(?P<key>url|affiliate):(?P<value>.*)$")


class ContentWriteError(RuntimeError):
    """The edit would not have produced the value asked for."""


def _quoted(value: str) -> str:
    # A JSON string is a valid YAML double-quoted scalar.
    return json.dumps(value, ensure_ascii=False)


def _backup(path: Path, backup_dir: Path) -> None:
    if not path.exists():
        return
    backup_dir.mkdir(parents=True, exist_ok=True)
    stamp = datetime.now(UTC).strftime("%Y%m%dT%H%M%S%fZ")
    shutil.copy2(path, backup_dir / f"{path.name}.{stamp}")
    copies = sorted(backup_dir.glob(f"{path.name}.*"))
    for old in copies[:-KEEP_BACKUPS]:
        old.unlink()


def _write(path: Path, text: str) -> None:
    tmp = path.with_suffix(path.suffix + ".tmp")
    tmp.write_text(text, encoding="utf-8")
    tmp.replace(path)


def config_value(document: dict, dotted: str) -> object:
    node: object = document
    for part in dotted.split("."):
        if not isinstance(node, dict) or part not in node:
            return None
        node = node[part]
    return node


def read_config(path: Path) -> dict:
    return yaml.safe_load(path.read_text(encoding="utf-8")) or {}


def set_config_values(path: Path, updates: dict[str, str], *, backup_dir: Path) -> None:
    """Set scalar values addressed by dotted paths, such as ``site.formspree_id``.

    Only keys that already exist are written: a typo in a path must fail loudly
    rather than add a key the build never reads.
    """
    lines = path.read_text(encoding="utf-8").splitlines(keepends=True)
    stack: list[tuple[int, str]] = []
    found: set[str] = set()
    for index, line in enumerate(lines):
        match = _MAPPING_LINE.match(line.rstrip("\n"))
        if not match:
            continue
        indent = len(match["indent"])
        while stack and stack[-1][0] >= indent:
            stack.pop()
        dotted = ".".join([key for _, key in stack] + [match["key"]])
        value = match["value"].strip()
        if dotted in updates and value and not value.startswith(("|", ">")):
            ending = "\n" if line.endswith("\n") else ""
            lines[index] = f"{match['indent']}{match['key']}: {_quoted(updates[dotted])}{ending}"
            found.add(dotted)
        stack.append((indent, match["key"]))

    missing = set(updates) - found
    if missing:
        raise ContentWriteError(f"{path.name} has no scalar key {', '.join(sorted(missing))}")
    text = "".join(lines)
    document = yaml.safe_load(text) or {}
    for dotted, value in updates.items():
        if config_value(document, dotted) != value:
            raise ContentWriteError(f"{dotted} would not read back as {value!r}")
    _backup(path, backup_dir)
    _write(path, text)


def read_affiliates(path: Path) -> dict[str, list[dict]]:
    return yaml.safe_load(path.read_text(encoding="utf-8")) or {}


def programme_entries(document: dict[str, list[dict]], name: str) -> list[dict]:
    return [entry for entries in document.values() for entry in (entries or [])
            if entry.get("name") == name]


def set_affiliate_url(path: Path, name: str, url: str, *, backup_dir: Path) -> int:
    """Point every card for one programme at its tracked URL and mark it
    ``affiliate: true``, which renders the disclosure badge. Returns how many
    cards changed."""
    lines = path.read_text(encoding="utf-8").splitlines(keepends=True)
    in_programme = False
    item_indent = -1
    touched = 0
    for index, raw in enumerate(lines):
        line = raw.rstrip("\n")
        ending = "\n" if raw.endswith("\n") else ""
        item = _ITEM_NAME.match(line)
        if item:
            in_programme = yaml.safe_load(item["name"]) == name
            item_indent = len(item["indent"])
            touched += in_programme
            continue
        if not line.strip() or line.lstrip().startswith("#"):
            continue
        indent = len(line) - len(line.lstrip())
        if indent <= item_indent:
            in_programme = False
            continue
        field = _ITEM_FIELD.match(line)
        if in_programme and field:
            value = _quoted(url) if field["key"] == "url" else "true"
            lines[index] = f"{field['indent']}{field['key']}: {value}{ending}"

    text = "".join(lines)
    entries = programme_entries(yaml.safe_load(text) or {}, name)
    if not entries:
        raise ContentWriteError(f"no card is named {name!r} in {path.name}")
    if any(entry.get("url") != url or entry.get("affiliate") is not True for entry in entries):
        raise ContentWriteError(f"not every {name} card would carry the tracked link")
    _backup(path, backup_dir)
    _write(path, text)
    return touched
