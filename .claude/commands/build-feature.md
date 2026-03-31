---
description: Run the full multi-agent build pipeline. Creates a production-ready codebase from requirements through planning, review, implementation, compilation, and QA. Provide your feature requirements as the argument, or create .pipeline/requirements.md first.
argument-hint: [feature requirements or leave empty if .pipeline/requirements.md exists]
---

# Start the Multi-Agent Build Pipeline

$ARGUMENTS

## Instructions

If the user provided arguments above, write them to `.pipeline/requirements.md` first:
```bash
mkdir -p .pipeline
```
Then write the requirements to that file.

If no arguments were provided, check that `.pipeline/requirements.md` already exists. If not, ask the user for their requirements.

Once requirements are in place, invoke the **manager-agent** to orchestrate the full pipeline:

"Use the manager-agent to run the complete build pipeline starting from the requirements in .pipeline/requirements.md"

The manager-agent will:
1. 📋 Invoke planning-agent → technical plan
2. 🔍 Invoke plan-review-agent → approach options  
3. 🛑 Wait for your approval
4. ⚙️ Invoke implementing-agent → write code
5. 🔨 Invoke compiling-agent → build & test (loops with implementing-agent until success)
6. 🧪 Invoke qa-agent → quality check (loops with implementing-agent if issues found)
7. 🎉 Deliver production-ready code in `.pipeline/code/`
