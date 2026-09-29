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

        release_bytes = archive.read_bytes()
        checksum = hashlib.sha256(release_bytes).hexdigest()
        archive.unlink()
        parts = []

        for index, offset in enumerate(range(0, len(release_bytes), 97), start=1):
            content = release_bytes[offset : offset + 97]
            name = f"release-{commit}.part{index:03d}"
            (incoming / name).write_bytes(content)
            parts.append({
                "name": name,
                "size": len(content),
                "sha256": hashlib.sha256(content).hexdigest(),
            })

        (incoming / "release.json").write_text(
            json.dumps({"commit": commit, "sha256": checksum, "parts": parts})
        )

        result = subprocess.run(
            ["php", str(deploy / "runner.php")], capture_output=True, text=True
        )
        assert hashlib.sha256(archive.read_bytes()).hexdigest() == checksum

        if os.name == "nt" and result.returncode != 0:
            print("Archive assembly passed; full activation requires Linux symlink privileges.")
            return

        assert result.returncode == 0, result.stderr
        assert (app / "current").read_text().strip() == commit
        assert (root / "asset.txt").read_text() == "new release\n"
        assert (app / "shared" / "storage" / "app" / "public").is_symlink()
        assert (root / "index.php").is_file()

        bad_commit = "b" * 40
        bad_part = f"release-{bad_commit}.part001"
        (incoming / bad_part).write_bytes(b"bad")
        (incoming / "release.json").write_text(json.dumps({
            "commit": bad_commit,
            "sha256": "0" * 64,
            "parts": [{"name": bad_part, "size": 3, "sha256": "0" * 64}],
        }))
        result = subprocess.run(
            ["php", str(deploy / "runner.php")], capture_output=True, text=True
        )
        assert result.returncode != 0
        assert (app / "current").read_text().strip() == commit

    print("Deployment activation and checksum rejection passed.")


if __name__ == "__main__":
    main()
