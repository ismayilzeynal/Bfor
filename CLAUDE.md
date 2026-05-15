# Claude Code Instructions — Bravo FreshFlow AI

You are working on Bravo FreshFlow AI — a frontend-only Next.js hackathon demo for an AI-powered retail loss prevention platform.

## Reading order at the start of every session
1. `docs/SPEC.md` — full project specification (source of truth)
2. `docs/PROGRESS.md` — current phase status
3. `docs/GIT_WORKFLOW.md` — commit & push rules (MANDATORY — never skip)
4. `docs/DECISIONS.md` — architectural decisions log

## Workflow per turn
- Execute exactly ONE phase per turn (or one fix/refinement if user asks for one).
- Use TodoWrite to break the phase into sub-tasks.
- At the end of every phase:
  1. Update `docs/PROGRESS.md` (mark phase done, set Current phase to the next one, add a one-line note)
  2. Follow `docs/GIT_WORKFLOW.md` to commit and push
  3. Stop and report

## Git commit rules (CRITICAL — never violate)
- Author identity is configured per-repo: ismayilzeynal <ismayil.zeynalov.bakhish@bsu.edu.az>. Do not change it.
- Commit message format (single line, single `-m` flag):
      <type>: Phase <N> — <short description>
  Valid types: feat, chore, fix, refactor, docs, style, perf, test
- NEVER include any of these in commit messages, bodies, or trailers:
  - "Co-Authored-By: Claude" (or any variant)
  - "🤖 Generated with Claude Code" (or any variant)
  - The 🤖 emoji
  - The words: Claude, AI, Anthropic, generated, automated, assistant, bot
  - Any URL containing claude.com, anthropic.com, or any tool reference
- Use only the subject line. Do not pass a body via additional `-m` flags.
- Never use `--force`, `--force-with-lease`, or amend pushed commits.
- Push target: `git push origin master`

## Language convention
- Code, comments, file names, and UI chrome: English
- Data content (product names, recommendation text, task descriptions, notifications): Azerbaijani

## See also
- `docs/SPEC.md` for the complete product, tech, and phase spec
- `docs/GIT_WORKFLOW.md` for the detailed commit/push protocol
