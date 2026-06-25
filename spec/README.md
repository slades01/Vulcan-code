# Spec Artifact Gate

Rung 2+ work should produce a compact spec artifact before edit lanes touch leased file zones.

Recommended path: `.opencode/spec/<mission-hash>.md` in the project being edited.

Minimum artifact shape:

```markdown
# <Mission>

- Goal:
- Non-goals:
- Acceptance criteria:
- Edge cases/invariants:
- File ownership zones:
- Verification target / tier:
- Stop conditions:
- R&D inputs used:
```

For tiny Rung 1 work, the spec may be prompt-embedded instead of persisted.
