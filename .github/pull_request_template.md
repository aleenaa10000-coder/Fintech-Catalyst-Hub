<!--
Thanks for contributing to FintechPressHub! Please fill in each section.
Delete any section that isn't relevant to your change.
-->

## Summary

<!-- A short, plain-English description of what this PR does and why. -->

## Related issue / ticket

<!-- Link the issue this closes, e.g. "Closes #123" or "Part of #456". -->

## Type of change

- [ ] `feat` — new feature or capability
- [ ] `fix` — bug fix
- [ ] `chore` — dependency bump, tooling, or refactor with no behavior change
- [ ] `docs` — documentation only
- [ ] `perf` — performance improvement
- [ ] `test` — adding or improving test coverage
- [ ] `ci` — CI/CD pipeline change

## Screenshots / recordings

<!--
For UI changes, paste before/after screenshots or a short screen recording.
Delete this section if not applicable.
-->

## Testing done

<!--
Describe how you tested this change. Examples:
  - "Ran the admin blog page and verified the countdown ticks."
  - "Checked `pnpm typecheck` passes locally."
  - "Tested the publish-now button against the dev API."
-->

## Checklist

- [ ] `pnpm install` completes without errors
- [ ] `pnpm typecheck` passes locally (no TypeScript errors)
- [ ] If the **OpenAPI spec** changed (`lib/api-spec/openapi.yaml`), I ran `pnpm --filter @workspace/api-spec run codegen` and committed the generated files
- [ ] If the **DB schema** changed (`lib/db/src/schema/`), I ran `pnpm --filter @workspace/db run push` and updated the seed script if needed
- [ ] If **environment variables** were added or renamed, I updated `README.md` and any relevant `.env.example`
- [ ] I updated inline docs / README / CONTRIBUTING where behavior, commands, or env vars changed
- [ ] My branch is rebased on the latest `main` with no unresolved conflicts
- [ ] I have reviewed my own diff and removed any debug logs, console statements, or temporary code

## Deployment notes

<!--
Anything the reviewer or deployer should know before merging:
  - DB migrations that must run first
  - New environment variables to set in production
  - Feature flags to toggle
  - Cache invalidation required
Leave blank if there are no special steps.
-->
