# Changelog

All notable changes to CertTrack are documented here. The format is based on
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and this project follows
[Semantic Versioning](https://semver.org/).

## [Unreleased]

### Added

- Client flows for email verification, password reset, Google sign-in completion and
  2FA setup.
- Authenticated proof-document endpoint; proof files are no longer served publicly.
- Department-scoped checks for HOD access to faculty analytics and user details.
- Shared development runner (`npm run dev`), CI workflow, unit tests, linting and
  repository documentation.
- Soft-delete/archive behaviour for certificates that are no longer drafts.

### Changed

- Certificate approval now respects the workflow state machine and requires a proof
  document.
- Submission limits come from settings instead of a hard-coded value.
- Development email output includes the message body so verification and reset links
  are usable without SMTP.
- Seeding refuses to overwrite a non-empty database unless `--reset` is supplied.
- CSV exports protect against spreadsheet formula injection.

### Fixed

- Crash on the new-certificate page caused by an undefined limit variable.
- QR verification links now resolve to an existing client route.
- PDF text extraction with pdf-parse v2.
- Faculty/HOD could edit certificates they did not own.
- Relative proof URLs no longer depend on the client dev-server origin.
- Missing `deleteMany` guard on the append-only credit ledger.
- Race and self-service gaps in certificate editing and approval.
