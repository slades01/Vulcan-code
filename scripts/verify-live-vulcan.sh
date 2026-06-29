#!/usr/bin/env bash
set -euo pipefail

# Verify the live Vulcan/OpenCode runtime. This proves more than config parsing:
# it checks schema compatibility, agent resolution, provider auth, and live model calls.

echo "== Vulcan runtime =="
vulcan --version

echo "== Live config parse =="
vulcan debug config >/dev/null

echo "== Representative live agent resolution =="
vulcan debug agent orchestrator >/dev/null
vulcan debug agent implementation-lane >/dev/null
vulcan debug agent verification-lane >/dev/null
vulcan debug agent panel-deepseek-v4-pro >/dev/null

echo "== Live model route smoke: OpenAI orchestrator =="
vulcan run --agent orchestrator "Smoke test only. Do not use tools. Reply exactly: orchestrator live ok."

echo "== Live model route smoke: GLM worker =="
vulcan run --model opencode-go/glm-5.2 "Smoke test only. Do not use tools. Reply exactly: glm live ok."

echo "== Live model route smoke: panel model =="
vulcan run --model opencode-go/deepseek-v4-pro "Smoke test only. Do not use tools. Reply exactly: panel live ok."

echo "== MCP status (informational) =="
vulcan mcp list || true

echo "== Live Vulcan verification passed =="
