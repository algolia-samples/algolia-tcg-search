# Claude Code Guidelines

## Git Workflow

When starting a new conversation with a defined scope:
1. Create a new git branch for the conversation
2. Use semantic branch naming with prefixes:
   - `feat/` - New features
   - `fix/` or `bug/` - Bug fixes
   - `chore/` - Maintenance tasks, cleanup, dependencies
   - `refactor/` - Code refactoring
   - `docs/` - Documentation updates
   - `test/` - Test additions or updates
3. Make all changes on that branch
4. When ready, create a PR for review

This keeps the main branch clean and allows for better collaboration and code review.
