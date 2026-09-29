# TestMaker production on cPanel

`testmaker.pk` serves `/home/tmpk/public_html` and PHP 8.4. The production
workflow builds Composer dependencies and Vite assets on GitHub Actions,
uploads the release in 8 MiB parts through cPanel's HTTPS API, and lets a cPanel
cron job verify, assemble, migrate, and activate it. Node and an interactive
shell are not needed on the server. The cPanel Git clone for `dev.testmaker.pk`
is not changed by this
process. Its disabled **Deploy HEAD Commit** button is not used; the GitHub
workflow publishes the complete built release after `git push origin master`.

## One-time cPanel setup

1. Export a backup of the populated dev database from phpMyAdmin. Confirm that
   `old.testmaker.pk` has its own copy of the old site. Before the first live
   activation, move the old site's remaining files out of `public_html` using
   File Manager. Keep cPanel-managed files such as `.well-known` and do not
   remove the `_app` or `_deploy` directories below.
2. In File Manager, enable **Show Hidden Files**. Create
   `/home/tmpk/public_html/_app/shared` and
   `/home/tmpk/public_html/_deploy/incoming`. Put the contents of
   [`deny.htaccess`](deny.htaccess) in both `_app/.htaccess` and
   `_deploy/.htaccess`. Before adding credentials, place temporary probe files
   in both directories and confirm their URLs return HTTP 403. Delete the
   probes. If either is publicly readable, stop and ask the host to enable
   `.htaccess` overrides for this domain.
3. Create `/home/tmpk/public_html/_app/shared/.env`. Copy the dev site's `.env`
   through File Manager, then set `APP_ENV=production`, `APP_DEBUG=false`, and
   `APP_URL=https://testmaker.pk`. Keep the existing `APP_KEY` and database
   connection because the two sites share data. Set a distinct
   `SESSION_COOKIE=testmaker_production_session` and
   `CACHE_PREFIX=testmaker_production`. Never commit or send this file in chat.
4. Create `/home/tmpk/public_html/storage`. Copy the **contents** of
   `/home/tmpk/repositories/TestMaker/storage/app/public` into this directory
   with File Manager before the first deployment. Preserve directory structure
   and filenames because the shared database stores paths to those files.
   Production then keeps its own uploads, logs, cache, and sessions. New
   uploads on one site will not automatically appear on the other site even
   though the database is shared.
5. In cPanel **Manage API Tokens**, create a token for deployment. In GitHub,
   create the `production` environment and add the token as its secret
   `CPANEL_API_TOKEN`. Never commit or send the token in chat. The workflow
   authenticates as cPanel user `tmpk` at `https://testmaker.pk:2083`; the old
   `CPANEL_FTP_USERNAME` and `CPANEL_FTP_PASSWORD` secrets are no longer used.
6. In repository **Settings → Secrets and variables → Actions → Variables**,
   create `PRODUCTION_DEPLOY_ENABLED` with value `true` only when the first
   deployment is ready. While it is unset, a manual workflow run builds and
   tests but does not upload.
7. In cPanel **Cron Jobs**, add this command to run every minute:

   ```text
   /usr/local/bin/ea-php84 /home/tmpk/public_html/_deploy/runner.php >/dev/null 2>&1
   ```

   The runner is uploaded by the workflow. It logs deployment results to
   `/home/tmpk/public_html/_deploy/deploy.log`, which is blocked from HTTP.

## Deploy and verify

Push to `master` after enabling the repository variable, or run the
**production deployment** workflow manually. It runs the PHP tests, builds the
frontend with Node on GitHub Actions, makes a production Composer install,
packages only runtime files, and uploads verified 8 MiB parts followed by the
checksum marker. Cron assembles and verifies the ZIP, prepares a new release
under `_app/releases`, runs
`migrate --force` against the shared database, and switches `_app/current` only
after the release and public assets are ready. Existing releases remain for a
code rollback; migrations are not automatically reversed.

The workflow waits for `https://testmaker.pk/up` to serve the new commit and
checks that `/_app/shared/.env` is denied over HTTP. Also open a paper containing
an uploaded image to verify that the copied files are served from `storage/`.
If activation fails, inspect `_deploy/deploy.log` in File
Manager. Do not run `migrate:fresh` or seeders on the shared database.
