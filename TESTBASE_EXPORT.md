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

Legacy pixel image styles (`width`/`height`, 1–4000 px) become portable image
attributes, including images in shared content. Supported font weight, italic,
underline/strike and subscript/superscript styles become rich-text marks; table
cell alignment and ordered-list start values are preserved. Other CSS remains
blocked with the source field, element and property in the issue. The API never
passes CSS or executable HTML through to TestBase.

Available English and Urdu content is always exported. A missing translation
does not discard a convertible payload: TestBase checks the selected destination
language, including English-only or Urdu-only extraction from a Both source.
Invalid objective answer keys and unsupported semantics still block conversion.
Objective conversion checks the actual option keys, including for types that
permit multiple answers: exactly one correct option converts, while zero or
multiple correct options remain blocked.
Start a fresh review after deploying a converter fix; saved source snapshots
are immutable.

Legacy `subjective_grouped` worksheets sometimes store the complete image/text
in `intro_en`/`intro_ur` with one empty editor placeholder instead of authored
children. These export as a separate `STANDARD_SUBJECTIVE` variant: the intro
becomes the statement, with one parent item and no fabricated child. Existing
answers/explanations are retained. Actual authored children remain grouped;
incomplete children without a statement in either language stay blocked.

For `subjective_standard`, an empty prompt may use a retained intro or legacy
statement column; current authored content takes priority. Legacy answers and
descriptions fill empty corresponding fields. If both statement languages are
absent and guidance contains images and whitespace only, export that image as
the statement once, removing the duplicate explanation. Ordinary explanations
retain their role. Authored child content under a standalone schema is blocked
instead of discarded. Map the separate worksheet variant to a Standard Subjective
TestBase type and start a fresh review after deployment.

Run the isolated SQLite tests on Windows:

```powershell
php -d extension=pdo_sqlite -d extension=sqlite3 vendor/bin/pest tests/Feature/TestbaseExportTest.php
```

Also run the existing question management, legacy export and permission suites
when changing the exporter. The source deployment and live pilot remain subject
to normal human review and release approval.
