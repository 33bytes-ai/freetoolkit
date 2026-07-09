STATUS: PASS

## Changements examinés

- `static/js/lib/common.js` — suppression du fallback textarea/execCommand dans `copyToClipboard()`
- `tests/test_tools.js` — ajout de 3 tests pour `copyToClipboard` (lignes 527–555)

## Vérifications

### Implémentation (`common.js`)

La nouvelle `copyToClipboard` :
1. Vérifie `navigator.clipboard && navigator.clipboard.writeText` avant d'utiliser l'API.
2. Retourne `Promise.reject(new Error("Clipboard API unavailable (HTTPS required)"))` si indisponible.
3. Délègue directement à `navigator.clipboard.writeText(text)`.

Comportement correct, minimal, sans dead code.

### Compatibilité des appelants

Trois outils appellent `copyToClipboard` avec `.then().catch()` :
- `stripe-fee-calculator.js:107`
- `paypal-fee-calculator.js:86`
- `invoice-total-calculator.js:79`

Tous les `catch` affichent un message UI (`FTK.flash(el, "Copy unavailable")`), ce qui satisfait l'exigence de retour utilisateur en cas d'indisponibilité. Aucune régression.

### Tests (`test_tools.js`)

Trois cas couverts via le helper `loadCommon` (injection de `navigator`/`window` par `new Function`) :

| Test | Scénario | Résultat attendu |
|------|----------|-----------------|
| `resolves when clipboard API available` | `writeText` renvoie `Promise.resolve()` | `doesNotReject` |
| `rejects when clipboard API unavailable` | `navigator` sans propriété `clipboard` | rejet avec `/HTTPS/` |
| `forwards rejection from writeText` | `writeText` renvoie `Promise.reject("denied")` | rejet avec `/denied/` |

Les tests sont corrects et pertinents. Le helper `loadCommon` isole proprement le code sans dépendance au DOM.

### Conventions CLAUDE.md

- Pas de commentaires superflus.
- Pas de shim de rétrocompatibilité.
- Pas de code mort.
- Fichier existant modifié, pas de nouveau fichier créé.

## Problèmes trouvés

Aucun.
