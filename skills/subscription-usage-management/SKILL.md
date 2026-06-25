---
name: subscription-usage-management
description: Use when tracking ChatGPT Pro, GLM Code, OpenCode Go, monthly quota, remaining tokens/messages, reset dates, usage ledger, or max-swarm budget decisions.
---

# Subscription Usage Management

Use this skill whenever swarm size, model routing, or monthly quota burn-down matters.

## Source of Truth

Use the non-secret ledger:

`~\.config\opencode\usage\subscriptions.jsonc`

Never store secrets there. Only store plan names, reset dates, usage numbers, remaining ratios, confidence, source labels, and timestamps.

## Classification

- Green: enough confirmed remaining monthly capacity for broad useful waves.
- Yellow: some capacity remains, or one major pool is unknown/stale; cap fan-out.
- Red: low confirmed remaining capacity; run minimal/high-value tasks only.
- Unknown: no trustworthy remaining quota. Do not treat as green.

Local `opencode stats` is an activity proxy. It is not provider billing truth.

## Subscription Pools

- ChatGPT Pro / OpenAI: best for orchestration, synthesis, security, high-stakes review, ambiguity.
- GLM Code / Z.AI Coding Plan: primary bulk coding and swarm workhorse.
- OpenCode Go: cheap/background lanes if available and quota is confirmed.

## Efficient Burn-Down

- If a pool is green and near reset, spend it on useful independent backlog: tests, docs, security review, performance, dependency drift, architecture maps, and benchmark variants.
- If a pool is yellow, reserve it for lanes where that model family has clear value.
- If a pool is red, avoid it except for critical synthesis/safety gates.
- If unknown, request no approval; proceed with capped execution and list exact ledger fields needed.

## Required Output

- Per-pool state and confidence.
- Combined state.
- Recommended wave size and model routing.
- Missing non-secret values needed to improve accuracy.
