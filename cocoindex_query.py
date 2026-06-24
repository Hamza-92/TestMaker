"""Query helpers for the local CocoIndex SQLite database."""

from __future__ import annotations

import argparse
import sqlite3
import sys
import textwrap
from pathlib import Path

ROOT_DIR = Path(__file__).resolve().parent
INDEX_DB_PATH = ROOT_DIR / ".tools" / "cocoindex" / "code_index.sqlite3"
STATE_DB_PATH = ROOT_DIR / ".tools" / "cocoindex" / "state.db"


def connect() -> sqlite3.Connection:
    if not INDEX_DB_PATH.exists():
        raise SystemExit(
            f"Index database not found at {INDEX_DB_PATH}. "
            "Run the CocoIndex update command first."
        )

    conn = sqlite3.connect(INDEX_DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def print_stats(_: argparse.Namespace) -> int:
    with connect() as conn:
        file_count = conn.execute("select count(*) from files").fetchone()[0]
        chunk_count = conn.execute("select count(*) from chunks").fetchone()[0]

    print(f"index_db: {INDEX_DB_PATH}")
    print(f"state_db: {STATE_DB_PATH}")
    print(f"files: {file_count}")
    print(f"chunks: {chunk_count}")
    return 0


def print_files(args: argparse.Namespace) -> int:
    sql = """
        select path, language, size_bytes
        from files
        where (? is null or lower(path) like ?)
        order by path
        limit ?
    """
    pattern = None
    if args.pattern:
        pattern = f"%{args.pattern.lower()}%"

    with connect() as conn:
        rows = conn.execute(sql, (args.pattern, pattern, args.limit)).fetchall()

    if not rows:
        print("No indexed files matched.")
        return 0

    for row in rows:
        language = row["language"] or "-"
        print(f"{row['path']} [{language}] {row['size_bytes']} bytes")
    return 0


def build_snippet(content: str, needle: str, width: int = 220) -> str:
    lowered = content.lower()
    start = lowered.find(needle.lower())
    if start < 0:
        snippet = content[:width]
    else:
        left = max(0, start - width // 3)
        right = min(len(content), start + width)
        snippet = content[left:right]
    snippet = " ".join(snippet.split())
    return textwrap.shorten(snippet, width=width, placeholder=" ...")


def print_search(args: argparse.Namespace) -> int:
    path_like = f"%{args.path.lower()}%" if args.path else None
    term_like = f"%{args.query.lower()}%"
    sql = """
        select path, chunk_index, start_line, end_line, content
        from chunks
        where lower(content) like ?
          and (? is null or lower(path) like ?)
        order by path, chunk_index
        limit ?
    """

    with connect() as conn:
        rows = conn.execute(sql, (term_like, args.path, path_like, args.limit)).fetchall()

    if not rows:
        print("No indexed chunks matched.")
        return 0

    for row in rows:
        snippet = build_snippet(row["content"], args.query, width=args.width)
        print(f"{row['path']}:{row['start_line']}-{row['end_line']} [chunk {row['chunk_index']}]")
        print(snippet)
        print("---")
    return 0


def print_show_file(args: argparse.Namespace) -> int:
    file_sql = """
        select path, language, size_bytes, fingerprint
        from files
        where path = ?
    """
    chunk_sql = """
        select chunk_index, start_line, end_line, content
        from chunks
        where path = ?
        order by chunk_index
        limit ? offset ?
    """

    with connect() as conn:
        file_row = conn.execute(file_sql, (args.path,)).fetchone()
        if not file_row:
            print("Indexed file not found.")
            return 0

        rows = conn.execute(chunk_sql, (args.path, args.limit, args.offset)).fetchall()

    language = file_row["language"] or "-"
    print(f"path: {file_row['path']}")
    print(f"language: {language}")
    print(f"size_bytes: {file_row['size_bytes']}")
    print(f"fingerprint: {file_row['fingerprint']}")
    print(f"offset: {args.offset}")
    print(f"returned_chunks: {len(rows)}")
    print("---")

    for row in rows:
        print(f"[chunk {row['chunk_index']}] lines {row['start_line']}-{row['end_line']}")
        print(row["content"].rstrip())
        print("---")
    return 0


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        description="Query the local CocoIndex SQLite database for this repository."
    )
    subparsers = parser.add_subparsers(dest="command", required=True)

    stats_parser = subparsers.add_parser("stats", help="Show index counts and paths.")
    stats_parser.set_defaults(func=print_stats)

    files_parser = subparsers.add_parser("files", help="List indexed files.")
    files_parser.add_argument("pattern", nargs="?", help="Optional path substring filter.")
    files_parser.add_argument("--limit", type=int, default=50, help="Maximum rows to print.")
    files_parser.set_defaults(func=print_files)

    search_parser = subparsers.add_parser("search", help="Search chunk content with LIKE.")
    search_parser.add_argument("query", help="Case-insensitive text to search for.")
    search_parser.add_argument("--path", help="Optional path substring filter.")
    search_parser.add_argument("--limit", type=int, default=20, help="Maximum matches to print.")
    search_parser.add_argument(
        "--width",
        type=int,
        default=220,
        help="Snippet width for each match.",
    )
    search_parser.set_defaults(func=print_search)

    show_parser = subparsers.add_parser(
        "show-file",
        help="Show indexed chunk content for one file path.",
    )
    show_parser.add_argument("path", help="Exact indexed path, e.g. routes/web.php")
    show_parser.add_argument("--offset", type=int, default=0, help="Chunk offset.")
    show_parser.add_argument("--limit", type=int, default=5, help="Chunk count to print.")
    show_parser.set_defaults(func=print_show_file)

    return parser


def main() -> int:
    if hasattr(sys.stdout, "reconfigure"):
        sys.stdout.reconfigure(encoding="utf-8", errors="replace")

    parser = build_parser()
    args = parser.parse_args()
    return args.func(args)


if __name__ == "__main__":
    raise SystemExit(main())
