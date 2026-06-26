# Agent Instructions

## Tool Call Argument Length Limit

**CRITICAL: Keep all `shell_command` arguments under 800 characters.**

When you need to make multiple edits to a file, prefer:
- Running a **single short command** that does one thing (e.g., `Set-Content ...` with a small patch)
- **Multiple sequential single-file edits** instead of one large multi-file script
- **Inline short scripts** written directly to temp files and executed, rather than embedding long heredocs

**Forbidden patterns (they get truncated and break JSON):**
- Embedding full file content inside command arguments
- Multi-line PowerShell/JavaScript scripts inline in the `command` field
- Strings longer than 800 characters inside `command` or `justification` fields

**Always split large operations into small steps.** It is better to run 5 commands of 200 chars each than 1 command of 2000 chars.