"""Exercise cPanel's release switch in a disposable directory on Linux CI."""

from __future__ import annotations

import hashlib
import json
import os
from pathlib import Path
import shutil
import subprocess
import tempfile
from zipfile import ZipFile


TEMPLATES = Path(__file__).resolve().parent


def main() -> None:
    if os.name == "nt":
        print("Activation smoke test runs on Linux CI (Windows symlink privileges differ).")
        return

    with tempfile.TemporaryDirectory() as temporary:
        root = Path(temporary)
        deploy = root / "_deploy"
        app = root / "_app"
        incoming = deploy / "incoming"
        uploads = root / "storage"

        for directory in (incoming, uploads, app / "shared"):
            directory.mkdir(parents=True)

        for name in ("runner.php", "front-controller.php", "public.htaccess"):
            shutil.copy2(TEMPLATES / name, deploy / name)

        shutil.copy2(TEMPLATES / "deny.htaccess", deploy / ".htaccess")
        shutil.copy2(TEMPLATES / "deny.htaccess", app / ".htaccess")
        (app / "shared" / ".env").write_text("APP_ENV=testing\n")

        commit = "a" * 40
        archive = incoming / f"release-{commit}.zip"

        with ZipFile(archive, "w") as release_zip:
            release_zip.writestr("vendor/autoload.php", "<?php\n")
            release_zip.writestr(
                "bootstrap/app.php",
                """<?php
return new class {
    public function make(string $name): object {
        return new class {
            public function call(string $command, array $arguments): int {
                return $command === 'migrate' ? 0 : 1;
            }
        };
    }
};
""",
            )
            release_zip.writestr("public/index.php", "<?php echo 'ready';\n")
            release_zip.writestr("public/build/manifest.json", "{}\n")
            release_zip.writestr("public/asset.txt", "new release\n")

        checksum = hashlib.sha256(archive.read_bytes()).hexdigest()
        (incoming / "release.json").write_text(
            json.dumps({"commit": commit, "sha256": checksum})
        )

        result = subprocess.run(
            ["php", str(deploy / "runner.php")], capture_output=True, text=True
        )
        assert result.returncode == 0, result.stderr
        assert (app / "current").read_text().strip() == commit
        assert (root / "asset.txt").read_text() == "new release\n"
        assert (app / "shared" / "storage" / "app" / "public").is_symlink()
        assert (root / "index.php").is_file()

        (incoming / "release.json").write_text(
            json.dumps({"commit": "b" * 40, "sha256": "0" * 64})
        )
        result = subprocess.run(
            ["php", str(deploy / "runner.php")], capture_output=True, text=True
        )
        assert result.returncode != 0
        assert (app / "current").read_text().strip() == commit

    print("Deployment activation and checksum rejection passed.")


if __name__ == "__main__":
    main()
