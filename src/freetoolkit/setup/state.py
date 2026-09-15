"""Where the wizard remembers what has been proven.

A JSON file in .setup/, ignored by git: progress belongs to the person at
this keyboard, not to the repository. Everything in it can be re-derived by
running the checks again, and it never holds a credential.
"""

from __future__ import annotations

import json
from dataclasses import dataclass, field
from datetime import datetime, UTC
from enum import StrEnum
from pathlib import Path


STATE_VERSION = 1


class StepStatus(StrEnum):
    PENDING = "PENDING"
    #: Values are saved but the check has not been run, or was run and failed.
    FAILED = "FAILED"
    VERIFIED = "VERIFIED"
    #: An optional step the operator declined. It unlocks what follows it.
    SKIPPED = "SKIPPED"


@dataclass
class StepRecord:
    status: StepStatus = StepStatus.PENDING
    summary: str = ""
    checked_at: datetime | None = None
    #: Acknowledgement text -> when it was ticked. A decision a human made is
    #: evidence, and it is worth knowing when they made it.
    acknowledged: dict[str, str] = field(default_factory=dict)
    #: Values the site has no setting for, such as the date a review was
    #: requested, kept so a check or a later step can read them.
    values: dict[str, str] = field(default_factory=dict)

    @property
    def satisfied(self) -> bool:
        return self.status in (StepStatus.VERIFIED, StepStatus.SKIPPED)

    def as_dict(self) -> dict[str, object]:
        return {
            "status": self.status.value,
            "summary": self.summary,
            "checked_at": self.checked_at.isoformat(timespec="seconds") if self.checked_at else None,
            "acknowledged": dict(self.acknowledged),
            "values": dict(self.values),
        }

    @classmethod
    def from_dict(cls, payload: dict) -> StepRecord:
        raw = payload.get("checked_at")
        return cls(
            status=StepStatus(payload.get("status", StepStatus.PENDING)),
            summary=str(payload.get("summary", "")),
            checked_at=datetime.fromisoformat(raw) if raw else None,
            acknowledged=dict(payload.get("acknowledged") or {}),
            values=dict(payload.get("values") or {}),
        )


@dataclass
class SetupState:
    path: Path
    steps: dict[str, StepRecord] = field(default_factory=dict)

    def record(self, step_id: str) -> StepRecord:
        return self.steps.setdefault(step_id, StepRecord())

    def satisfied(self, step_id: str) -> bool:
        return self.record(step_id).satisfied

    def mark(self, step_id: str, status: StepStatus, summary: str = "") -> StepRecord:
        record = self.record(step_id)
        record.status = status
        record.summary = summary
        record.checked_at = datetime.now(UTC)
        self.save()
        return record

    def acknowledge(self, step_id: str, ticked: list[str]) -> StepRecord:
        record = self.record(step_id)
        now = datetime.now(UTC).isoformat(timespec="seconds")
        for text in ticked:
            record.acknowledged.setdefault(text, now)
        for text in list(record.acknowledged):
            if text not in ticked:
                del record.acknowledged[text]
        self.save()
        return record

    def remember(self, step_id: str, values: dict[str, str]) -> StepRecord:
        record = self.record(step_id)
        record.values.update(values)
        self.save()
        return record

    def local_values(self) -> dict[str, str]:
        """Every remembered value, across steps, for a check to read."""
        merged: dict[str, str] = {}
        for record in self.steps.values():
            merged.update(record.values)
        return merged

    def save(self) -> None:
        self.path.parent.mkdir(parents=True, exist_ok=True)
        tmp = self.path.with_suffix(".tmp")
        tmp.write_text(json.dumps({
            "version": STATE_VERSION,
            "steps": {name: record.as_dict() for name, record in sorted(self.steps.items())},
        }, indent=2, ensure_ascii=False), encoding="utf-8")
        tmp.replace(self.path)

    @classmethod
    def load(cls, path: Path) -> SetupState:
        if not path.exists():
            return cls(path=path)
        try:
            payload = json.loads(path.read_text(encoding="utf-8"))
        except (json.JSONDecodeError, OSError):
            # A corrupt progress file must not stop the wizard: everything in
            # it is re-derivable by running the checks again.
            return cls(path=path)
        steps = {
            name: StepRecord.from_dict(value)
            for name, value in (payload.get("steps") or {}).items()
        }
        return cls(path=path, steps=steps)
