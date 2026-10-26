# Changelog

Notable changes, starting with 0.1.0. The latest five releases are detailed here; older releases are archived.

## 0.2.1 — 2026-10-27

### Changes

- Added validated builder restoration from built or JSON-deserialized breakdown objects while preserving semantic types and detaching input data.
- Expanded human-readable formatting to every BCP 47 locale supported by the host's `Intl` implementation.
- Improved the mobile playground menu and added content-hashed assets to prevent stale Safari layouts.
- Made npm publication authentication links short and clickable in narrow ShellFish terminals.

## 0.2.0 — 2026-10-26

### Changes

- fix: mirror README on Pages root
- fix: show playground in Pages navigation
- feat: add playground site navigation
- docs: shorten playground reference
- feat!: require object dictionary entries

## 0.1.2 — 2026-10-26

- Added an opt-in locale mode to the playground that preserves calculation edits, keeps the default example limited to the calculation, and falls back to semantic keys without generated dictionary placeholders.
- Made the playground vertically scrollable and its three panels usable on mobile screens.
- Fixed the deployed playground by including every browser ESM module, and kept release artifact inspection JSON-safe by suppressing duplicate package lifecycle scripts.

## 0.1.1 — 2026-10-26

- Added the guarded npm, Git tag, release-PR, and GitHub Pages deployment workflow used by `payload-vars`.

## 0.1.0 — 2026-10-26

### Added

- Added the typed calculation breakdown builder, localized human-readable formatter, and interactive invoice playground.
