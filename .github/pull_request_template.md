<!--
Thanks for contributing! Please fill in each section. See CONTRIBUTING.md
for the full guidelines.
-->

## Summary

<!-- A short, plain-English description of what this PR does. -->

## Why

<!-- The motivation. Link the issue, e.g. "Closes #123". -->

## Type of change

- [ ] feat — new feature
- [ ] fix — bug fix
- [ ] chore — tooling, dependency bump, refactor with no behavior change
- [ ] docs — documentation only
- [ ] perf / refactor / test / ci

## Screenshots / recordings

<!-- For UI changes, paste before/after screenshots here. Delete this section if not applicable. -->

## Checklist

- [ ] `pnpm bootstrap` passes locally
- [ ] `pnpm typecheck` passes locally
- [ ] If the OpenAPI spec changed, I ran `pnpm --filter @workspace/api-spec run codegen`
- [ ] If the DB schema changed, I ran `pnpm --filter @workspace/db run push` and updated the auto-seed script if needed
- [ ] I updated docs (README / CONTRIBUTING / inline) where behavior, env vars, or commands changed
- [ ] My branch is rebased on the latest `main`
