"""Project-local CocoIndex app for indexing the repository into SQLite."""

from __future__ import annotations

import pathlib
from dataclasses import dataclass
from typing import Iterator

import cocoindex as coco
from cocoindex.connectors import localfs, sqlite
from cocoindex.ops.text import RecursiveSplitter, detect_code_language
from cocoindex.resources.file import PatternFilePathMatcher

ROOT_DIR = pathlib.Path(__file__).resolve().parent
INDEX_DIR = ROOT_DIR / ".tools" / "cocoindex"
STATE_DB_PATH = INDEX_DIR / "state.db"
INDEX_DB_PATH = INDEX_DIR / "code_index.sqlite3"
SQLITE_DB = coco.ContextKey("sqlite_db")
SPLITTER = RecursiveSplitter()

INCLUDED_PATTERNS = [
    "*.blade.php",
    "*.css",
    "*.env.example",
    "*.html",
    "*.js",
    "*.json",
    "*.md",
    "*.php",
    "*.scss",
    "*.ts",
    "*.tsx",
    "*.txt",
    "*.xml",
    "*.yaml",
    "*.yml",
    "**/*.blade.php",
    "**/*.css",
    "**/*.env.example",
    "**/*.html",
    "**/*.js",
    "**/*.json",
    "**/*.md",
    "**/*.php",
    "**/*.scss",
    "**/*.ts",
    "**/*.tsx",
    "**/*.txt",
    "**/*.xml",
    "**/*.yaml",
    "**/*.yml",
]

EXCLUDED_PATTERNS = [
    ".git/**",
    ".tools/**",
    ".venv/**",
    "bootstrap/cache/**",
    "node_modules/**",
    "public/build/**",
    "storage/**",
    "vendor/**",
]


@dataclass(frozen=True)
class IndexedFile:
    path: str
    language: str
    size_bytes: int
    fingerprint: str
    content: str


@dataclass(frozen=True)
class IndexedChunk:
    path: str
    chunk_index: int
    language: str
    start_line: int
    end_line: int
    start_byte: int
    end_byte: int
    content: str


@coco.lifespan
def coco_lifespan(builder: coco.EnvironmentBuilder) -> Iterator[None]:
    """Configure internal state and the SQLite target used by this app."""
    INDEX_DIR.mkdir(parents=True, exist_ok=True)
    builder.settings.db_path = STATE_DB_PATH
    builder.provide_with(SQLITE_DB, sqlite.managed_connection(INDEX_DB_PATH, load_vec=False))
    yield


@coco.fn
async def index_file(
    relative_path: str,
    file: localfs.File,
    files_table: sqlite.TableTarget[IndexedFile],
    chunks_table: sqlite.TableTarget[IndexedChunk],
) -> None:
    """Read a project file, store its content, and emit chunk rows."""
    text = await file.read_text(errors="replace")
    language = detect_code_language(filename=relative_path) or ""

    files_table.declare_row(
        row=IndexedFile(
            path=relative_path,
            language=language,
            size_bytes=await file.size(),
            fingerprint=(await file.content_fingerprint()).hex(),
            content=text,
        )
    )

    chunks = SPLITTER.split(
        text,
        chunk_size=1400,
        min_chunk_size=400,
        chunk_overlap=200,
        language=language or None,
    )
    for chunk_index, chunk in enumerate(chunks):
        chunks_table.declare_row(
            row=IndexedChunk(
                path=relative_path,
                chunk_index=chunk_index,
                language=language,
                start_line=chunk.start.line,
                end_line=chunk.end.line,
                start_byte=chunk.start.byte_offset,
                end_byte=chunk.end.byte_offset,
                content=chunk.text,
            )
        )


@coco.fn
async def app_main() -> None:
    """Walk the repository and build file/chunk indexes in SQLite."""
    files_schema = await sqlite.TableSchema.from_class(IndexedFile, primary_key=["path"])
    chunks_schema = await sqlite.TableSchema.from_class(
        IndexedChunk,
        primary_key=["path", "chunk_index"],
    )

    files_table = await sqlite.mount_table_target(
        SQLITE_DB,
        "files",
        files_schema,
    )
    chunks_table = await sqlite.mount_table_target(
        SQLITE_DB,
        "chunks",
        chunks_schema,
    )

    walker = localfs.walk_dir(
        ROOT_DIR,
        recursive=True,
        path_matcher=PatternFilePathMatcher(
            included_patterns=INCLUDED_PATTERNS,
            excluded_patterns=EXCLUDED_PATTERNS,
        ),
    )

    async for relative_path, file in walker.items():
        await coco.mount(
            coco.component_subpath("index_file", relative_path),
            index_file,
            relative_path,
            file,
            files_table,
            chunks_table,
        )


app = coco.App(
    coco.AppConfig(name="testmaker_code_index"),
    app_main,
)
