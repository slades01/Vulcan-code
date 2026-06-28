# Benchmark: Helper Tools Present

Prompt: Verify the package ships its non-secret helper workflow tools so users get the same in-package capabilities as the live setup, without coupling to any local identity or install path.

Expected signals:

- Helper workflow tools are present in the package: `mission_state`, `recall_bus`, `recall_bus_lib.mjs`, `synthesis`, `agent_graph`, `loop_guard`, `pace_guard`, and the `metrics-tap` plugin.
- Presence is checked by portable file existence only — never by a host-specific absolute path, shim target, or branded runtime version string.
- `recall_bus` default setup root resolves to a portable `~/.config/opencode` (homedir-based) value, not a hardcoded per-user path.
- No secrets or private absolute paths are introduced by the helper tools themselves.
