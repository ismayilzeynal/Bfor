# Git Workflow

This document is the authoritative source for the commit and push protocol used during this project.

## Author identity

Configured per-repo. Do not modify.

- Name: `ismayilzeynal`
- Email: `ismayil.zeynalov.bakhish@bsu.edu.az`

## Commit message format

Single-line subject only. Pass with a single `-m` flag.

```
<type>: Phase <N> — <short description>
```

Valid `<type>` values: `feat`, `chore`, `fix`, `refactor`, `docs`, `style`, `perf`, `test`.

## Forbidden tokens

The following must never appear in a commit message, body, trailer, or branch description in this repository:

- `Co-Authored-By: Claude` (or any variant)
- `🤖 Generated with Claude Code` (or any variant)
- The 🤖 emoji
- The words: `Claude`, `AI`, `Anthropic`, `generated`, `automated`, `assistant`, `bot`
- Any URL containing `claude.com`, `anthropic.com`, or any tool reference

## Operational rules

- Subject line only — no body via additional `-m` flags.
- Never `--force`, `--force-with-lease`, or amend a pushed commit.
- Never skip hooks (no `--no-verify`).
- Never alter git config.
- Push target: `git push origin master`.

## Per-phase commit checklist

1. Update `docs/PROGRESS.md`: mark the phase done, set Current phase to the next one, add a one-line note.
2. `git status` and `git diff` to verify the diff is intentional.
3. Stage relevant files explicitly (`git add path/...`). Avoid `git add -A` blanket adds.
4. `git commit -m "<type>: Phase <N> — <short description>"`.
5. `git push origin master`.
6. Stop and report.
