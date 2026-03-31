# 🤖 Claude Code Multi-Agent Build Team

A complete multi-agent pipeline built natively in Claude Code — no Python scripts, no API keys needed. Just Claude Code.

## Prerequisites

```bash
# Install Claude Code
npm install -g @anthropic-ai/claude-code

# Login (uses your Claude subscription)
claude login
```

## Installation

Copy this project into any directory you want to build in:

```bash
# Option 1: Use this as a template for a new project
cp -r claude-code-team/ my-new-project/
cd my-new-project
claude  # Open Claude Code

# Option 2: Copy just the .claude/ config into an existing project
cp -r claude-code-team/.claude/ your-existing-project/.claude/
cp claude-code-team/CLAUDE.md your-existing-project/CLAUDE.md
```

## How to Use

### Quick Start (Full Pipeline)
```
/build-feature Build a REST API for managing a todo list with CRUD operations, SQLite, and JWT auth
```

That single command kicks off the entire 6-agent pipeline.

### Manual Agent Control
You can also invoke agents individually for more control:

```
# Start with planning
"Use the planning-agent to plan this feature: [your requirements]"

# Review the plan  
"Use the plan-review-agent to review the plan"

# After approving → implement
"Use the implementing-agent to write the code"

# Compile check
"Use the compiling-agent to build and check for errors"

# QA review
"Use the qa-agent to review the code quality"

# Check pipeline state anytime
/pipeline-status
```

## Agent Reference

| Agent | Model | Role | Input | Output |
|-------|-------|------|-------|--------|
| `manager-agent` | opus | Orchestrates everything | requirements.md | All pipeline files |
| `planning-agent` | opus | Technical architecture | requirements.md | technical-plan.md |
| `plan-review-agent` | opus | Approach tradeoffs | technical-plan.md | plan-review.md |
| `implementing-agent` | opus | Writes all code | plan + approved approach | .pipeline/code/ |
| `compiling-agent` | sonnet | Builds & catches errors | .pipeline/code/ | compile-success.md or compile-errors.md |
| `qa-agent` | opus | Quality assurance | .pipeline/code/ | qa-report.json |

## Pipeline State Files

All pipeline state is in `.pipeline/`:
```
.pipeline/
├── requirements.md      ← You write this (or /build-feature does it)
├── technical-plan.md    ← Planning agent output
├── plan-review.md       ← Plan review agent output  
├── approved-approach.md ← YOU write this after reviewing options
├── compile-errors.md    ← Compiling agent (if errors found)
├── compile-success.md   ← Compiling agent (if success)
├── qa-report.json       ← QA agent output
├── delivery-summary.md  ← Final delivery (pipeline complete)
├── pipeline-log.md      ← Running log from all agents
└── code/                ← All generated code lives here
```

## Filesystem Access

Claude Code agents have full access to your local filesystem by default. The agents use:
- **Read** — to read your codebase, plan files, and errors
- **Write** — to create pipeline state files and generate code  
- **Bash** — to actually RUN the code (real compilation, not simulated!)
- **Glob/Grep** — to explore your codebase

This means the compiling-agent **actually runs your code** and catches real errors — not hypothetical ones.

## Tips

**Start clean for each feature:**
```bash
rm -rf .pipeline && mkdir .pipeline
```

**The human approval gate is intentional.** Don't skip it — it's where you catch bad architectural decisions before they're coded.

**Sonnet for compiling is fast.** The compile→fix loop can iterate 5x quickly because Sonnet is faster than Opus for error analysis. Opus handles all the deep reasoning stages.

**Resume from any stage** if something goes wrong — just invoke the specific agent you need.

## Enabling Experimental Agent Teams

For true parallel execution (e.g., run planning and codebase exploration simultaneously):

```bash
# In your shell
export CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=true
claude
```

Or in `.claude/settings.json`:
```json
{
  "env": {
    "CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS": "true"
  }
}
```
