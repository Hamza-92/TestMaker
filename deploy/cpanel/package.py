"""Create a PHP-only production release from a staged Git checkout.

The staging directory must already contain Composer's vendor/ directory and
Vite's public/build/ directory. Only runtime paths are included in the ZIP.
"""

from __future__ import annotations

import argparse
import os
from pathlib import Path
from zipfile import ZIP_DEFLATED, ZipFile


RUNTIME_PATHS = (
    "app",
    "artisan",
    "bootstrap",
    "composer.json",
    "composer.lock",
    "config",
    "database/migrations",
    "public",
    "resources/views",
    "routes",
    "vendor",
)


def package(source: Path, output: Path) -> None:
    for required in ("vendor/autoload.php", "public/build/manifest.json", "public/index.php"):
        if not (source / required).is_file():
            raise SystemExit(f"Missing production build file: {required}")

    output.parent.mkdir(parents=True, exist_ok=True)

    with ZipFile(output, "w", ZIP_DEFLATED, compresslevel=6, allowZip64=True) as archive:
        for name in RUNTIME_PATHS:
            path = source / name

            if not path.exists():
                raise SystemExit(f"Missing runtime path: {name}")

            if path.is_file():
                archive.write(path, name)
                continue

            for parent, directories, files in os.walk(path, followlinks=False):
                folder = Path(parent)
                directories[:] = sorted(
                    directory
                    for directory in directories
                    if not _is_link(folder / directory)
                    and (folder / directory).relative_to(source).as_posix()
                    != "public/storage"
                )

                for filename in sorted(files):
                    child = folder / filename
                    relative = child.relative_to(source).as_posix()

                    # Local uploads and Vite's hot-file must never enter a release.
                    if _is_link(child) or relative in {"public/hot", "public/storage"}:
                        continue

                    archive.write(child, relative)


def _is_link(path: Path) -> bool:
    return path.is_symlink() or getattr(path, "is_junction", lambda: False)()


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("source", type=Path)
    parser.add_argument("output", type=Path)
    arguments = parser.parse_args()
    package(arguments.source.resolve(), arguments.output.resolve())
