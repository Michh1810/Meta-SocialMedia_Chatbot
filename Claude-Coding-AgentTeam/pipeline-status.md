---
description: Check the current status of the build pipeline. Shows which stage is complete, what's next, and any errors encountered.
---

# Pipeline Status Check

Check the current state of the build pipeline by reading the pipeline state files.

Run these commands and report the status:

```bash
echo "=== PIPELINE STATUS ==="
echo ""

# Check what files exist
for f in .pipeline/requirements.md .pipeline/technical-plan.md .pipeline/plan-review.md .pipeline/approved-approach.md .pipeline/compile-success.md .pipeline/compile-errors.md .pipeline/qa-report.json .pipeline/delivery-summary.md; do
  if [ -f "$f" ]; then
    echo "✅ $f"
  else
    echo "⬜ $f (not yet created)"
  fi
done

echo ""
echo "=== PIPELINE LOG ==="
cat .pipeline/pipeline-log.md 2>/dev/null || echo "(no log yet)"

echo ""
echo "=== CODE FILES ==="
find .pipeline/code -type f 2>/dev/null | head -20 || echo "(no code yet)"
```

Then summarize:
- ✅ What stages are complete
- 🔄 What stage is currently in progress  
- ⏳ What's next
- ❌ Any errors blocking progress
- 💡 Suggested next action for the user
