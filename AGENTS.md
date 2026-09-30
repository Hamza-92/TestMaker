# TestMaker agent instructions

These instructions apply to the entire repository. Follow the current user request and higher-priority instructions when they differ from this file.

## Project and scope

- This is a Laravel 13, Inertia, React, and TypeScript application. PHP 8.4 runs on production cPanel. Node 22 is used to build assets in CI; the production server has no Node or Chromium runtime. Do not introduce a feature that requires either runtime on the server.
- Keep changes focused. Inspect `git status --short` before editing, preserve existing work, and avoid broad rewrites or formatting unrelated files.
- Trace a feature through its route, controller or service, Inertia props, React page, and relevant tests. Enforce permissions and business rules on the server as well as in the UI.
- Preserve existing behavior for English, Urdu, and bilingual papers, including Federal and custom layouts, multipart questions, OR groups, print, and PDF. The browser-side PDF implementation lives under `resources/js/pages/customer/papers/paper-layouts/`; changes to paper rendering need focused checks for pagination, images, fonts, and both text directions.
- Keep teacher data and actions within the teacher's granted scope. A hidden button alone is not access control.
- A saved payment log is immutable. Its status may still move through the existing review workflow; do not restore an edit path for its recorded payment details.

## Data safety

- Production `testmaker.pk` and `dev.testmaker.pk` use the same populated database. Treat migrations and data scripts as production-impacting even when working on dev. Make migrations compatible with existing data and code during deployment.
- Use the isolated SQLite test configuration in `phpunit.xml` for automated tests. Never run `migrate:fresh`, `db:wipe`, seeders, or destructive test commands against the configured application database. Do not change or disclose `.env`, API tokens, credentials, or customer data.
- Production uploads and dev uploads are separate even though the database is shared. Preserve stored file paths and do not assume a new upload on one site appears on the other.

## Validation

- Run focused Pest tests for changed PHP behavior. On this Windows checkout, if the CLI lacks SQLite by default, use `php -d extension=pdo_sqlite -d extension=sqlite3 vendor/bin/pest <test-file>`.
- For changed frontend files, run `npm run types:check`, targeted ESLint and Prettier checks, and `npm run build` when the production bundle or styling changes. For changed PHP files, run `php vendor/bin/pint --test <files>` and relevant tests.
- Distinguish a failure introduced by the change from an existing repository-wide failure. Report any check that could not run and why. Do not modify unrelated code solely to make a broad check pass.

## Deployment

- Read `deploy/cpanel/README.md` and `.github/workflows/deploy-production.yml` before changing deployment. A push to `master` triggers the production workflow while `PRODUCTION_DEPLOY_ENABLED=true`. Do not push to `master` merely to save coding work; push when the user has requested a push or deployment.
- GitHub Actions builds Composer dependencies and Vite assets, uploads checksum-verified 8 MiB parts through cPanel HTTPS, and the cPanel cron runner activates a release after checks. Preserve the protected `_app` and `_deploy` layout, health check, checksum verification, and rollback behavior.
- The runner executes `migrate --force` against the shared database. Review migration effects before any production push. Never package `.env`, local storage, uploads, or Vite's `public/hot` file into a release.
