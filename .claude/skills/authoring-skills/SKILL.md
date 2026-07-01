---
name: authoring-skills
description: Use when creating, editing, or reviewing an agent skill (SKILL.md), or when asked how to write, structure, or trim a skill. Extends superpowers:writing-skills with a loading-budget model and house style.
---

# Authoring Skills

**REQUIRED BACKGROUND:** Use superpowers:writing-skills first. It owns the TDD
cycle, frontmatter and `description` rules, naming, anti-rationalization tables,
and flowcharts. This skill does not repeat them. It adds three things that skill
covers thinly: how to budget content across loading levels, what a skill body
should be, and house style.

## A skill is a workflow, not an essay

Write the steps an agent follows, with checkpoints that produce evidence and a
defined exit criterion. End on a verification gate: name the proof (passing
tests, clean build, a trace, reviewer sign-off). "Seems right" is not done.
If the body reads as background prose with no steps and no exit, it is a doc,
not a skill.

## Budget content across the three loading levels

Every skill loads in stages. Put each piece at the cheapest level that works.

| Level                     | Loaded                      | Holds                 | Budget                 |
| ------------------------- | --------------------------- | --------------------- | ---------------------- |
| 1. `name` + `description` | always, in system prompt    | when to trigger       | ~100 tokens            |
| 2. `SKILL.md` body        | when triggered              | the workflow          | aim under ~200 lines   |
| 3. Extra files, scripts   | on demand, only when linked | heavy reference, code | unbounded, off-context |

Inline only what every run needs; link the rest. Level 3 costs nothing until the
agent opens it, so a skill can bundle unlimited reference. Never paste an API
reference into the body to "save a hop", that tax is paid on every trigger.

A skill folder holds three Level-3 content types, each read only when the body links it:

```text
authoring-skills/
  SKILL.md        # the workflow (Level 2)
  reference.md    # instructions: deep guidance, read on demand
  schema.json     # resource: a fact the agent looks up, not memorizes
  scripts/
    validate.py   # code: agent runs it, output enters context, source does not
```

Prefer a script for deterministic work (validation, parsing, formatting): the code
never loads, only its output, so it beats re-deriving the logic. Name files for
what they hold and link them, or the agent never finds them.

## House style (project rule)

- No em dashes. Use a comma, a period, or parentheses.
- Be concise. Cut every word that does not change what the agent does. If the
  explanation is longer than the step, delete the explanation.
- One runnable, commented example beats many. Do not reimplement it per language.

## Checklist (in addition to superpowers:writing-skills)

- [ ] Body is a workflow ending in a verification gate, not background prose
- [ ] Each piece sits at its cheapest loading level; heavy reference and code linked at Level 3
- [ ] No em dashes, no filler
