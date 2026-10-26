# Repository agent instructions

## Releases

For any version preparation, publication, release recovery, npm authentication,
GitHub protection, tag, or Pages task, read `CONTRIBUTING.md` before acting.

- Never commit or push directly to `main`. Feature changes and prepared versions reach `main` only through pull requests.
- Never run `prepare-version` on `main` or a feature branch. It belongs only on the exact `release/vX.Y.Z` branch created from current `origin/main`.
- Preparation is a mandatory human-review boundary. After it succeeds, stop and ask the user to review the numbered changelog entry and remove `<!-- requires-review -->`.
- Never run `publish-version` before the release PR is merged. Publication runs only from clean, synchronized `main` and must not modify it.
- Never alter GitHub protection, move/delete a release tag, prepare another version, or retry an irreversible step automatically.
- External mutations require explicit user authorization at the step where they occur.
