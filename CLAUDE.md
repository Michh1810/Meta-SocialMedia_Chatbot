# 🏗️ Multi-Agent Build Pipeline

## What This Project Is
This is a multi-agent orchestration system. Claude Code agents work together in a structured pipeline to produce production-quality code from requirements. Each agent has a specific role and hands off to the next.

## Pipeline Order
```
Planning → Plan Review → [HUMAN APPROVAL] → Implementing ⟷ Compiling → QA → Done
                                                    ↑_______________|
```

## Shared Rules (ALL Agents Must Follow)
- **Never skip steps.** The pipeline order exists for a reason.
- **Write everything to disk.** Use files in `.pipeline/` to pass state between agents.
- **Always read prior agent output before starting.** Check `.pipeline/` for files from previous stages.
- **Be specific, not vague.** No TODOs, no placeholders, no "add your logic here".
- **Log your work.** Append your status to `.pipeline/pipeline-log.md` when you start and finish.

## Pipeline State Files (`.pipeline/` directory)
| File | Written By | Read By |
|------|-----------|---------|
| `requirements.md` | Human | Planning Agent |
| `technical-plan.md` | Planning Agent | Plan Review, Implementing |
| `plan-review.md` | Plan Review Agent | Human (approval) |
| `approved-approach.md` | Human | Implementing Agent |
| `code/` | Implementing Agent | Compiling, QA |
| `compile-errors.md` | Compiling Agent | Implementing Agent |
| `qa-report.json` | QA Agent | Human, Manager |
| `pipeline-log.md` | All Agents | All Agents (append) |

## Code Quality Standards
- All code must be complete and runnable — no stubs
- Every function needs error handling with meaningful messages
- Every external call needs a timeout
- Logging at: entry, exit, error, and key decisions
- Secrets via environment variables only — never hardcoded
- Include a `Makefile` with: `make install`, `make dev`, `make test`, `make lint`
