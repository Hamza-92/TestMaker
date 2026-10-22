# TestBase read-only export API

The five GET resources under `/api/testbase-export/v1/` implement the
`testmaker-export/1` contract documented in the TestBase repository at
`docs/testmaker-export-api.md`. The existing superadmin transfer screens and
web routes are separate and are not used by this API.

The API is disabled by default. It does not need a migration or a browser build.
Before enabling it on a host, set these server-only environment values:

```dotenv
TESTBASE_EXPORT_ENABLED=false
TESTBASE_EXPORT_INSTALLATION_ID=<stable random ID for this bank>
TESTBASE_EXPORT_TOKEN_SHA256=<lowercase SHA-256 of a random 256-bit token>
TESTBASE_EXPORT_IMAGE_HOSTS=<optional comma-separated trusted image URL hosts>
```

The same bank on production and development hosts must use the same installation
ID. A separate bank must use a different ID. Give the plaintext token only to
the TestBase API server; configure its `TESTMAKER_EXPORT_TOKEN` there. Never put
the plaintext token in this repository or browser code. Enable the exporter only
after an isolated fixture test and a reviewed, disposable subject pilot. Live
traffic requires HTTPS and a reachable host name.

The exporter reads the exact pattern/class/subject assignment, computes a
revision over structure, type rules, questions and image bytes, and rejects pages
or assets if that revision changes. Unsupported source content remains in counts
with a blocking issue. Image URLs resolve only through the approved local
question-image table or public storage; missing and unsupported images are
reported in the manifest. No academic bank records or audit rows are written.

Run the isolated SQLite tests on Windows:

```powershell
php -d extension=pdo_sqlite -d extension=sqlite3 vendor/bin/pest tests/Feature/TestbaseExportTest.php
```

Also run the existing question management, legacy export and permission suites
when changing the exporter. The source deployment and live pilot remain subject
to normal human review and release approval.
