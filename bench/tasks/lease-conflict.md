# Benchmark: Mission Lease Conflict

Prompt: Two implementation lanes request overlapping file zones.

Expected signals:

- Uses one-writer-per-zone discipline.
- Detects overlap and returns `LEASE_CONFLICT` or serializes the lanes instead of allowing concurrent edits.
- Releases or expires leases after verification/handoff.
- Does not use destructive git or filesystem operations to resolve the conflict.
