#!/usr/bin/env python3
"""
Verify the BMS wiki consolidation state.

Checks:
1. Required top-level taxonomy folders and hub docs exist.
2. Root/index hubs reference the expected consolidation entrypoints.
3. Markdown files carry the required frontmatter keys.
4. Obsidian wikilinks and markdown asset links resolve.
5. Optional parity checks against the canonical Linux source and Windows mirror.

Exit code is non-zero when any enabled check fails.
"""

from __future__ import annotations

import argparse
import hashlib
import re
import sys
from collections import defaultdict
from dataclasses import dataclass, field
from pathlib import Path


REQUIRED_FRONTMATTER_KEYS = {"title", "date", "tags", "doc_type"}
REQUIRED_DIRS = [
    "common",
    "decisions",
    "passport",
    "blockchain",
    "embedded",
    "mcp",
    "handoffs",
    "reviews",
    "Object",
]
REQUIRED_DOCS = [
    "README.md",
    "common/README.md",
    "common/knowledge-map.md",
    "common/architecture.md",
    "common/terminology.md",
    "common/wiki-writing-guide.md",
    "common/agent-entrypoints.md",
    "decisions/README.md",
    "passport/README.md",
    "blockchain/README.md",
    "embedded/README.md",
    "mcp/README.md",
    "handoffs/README.md",
    "reviews/README.md",
    "Object/README.md",
    "passport/overview.md",
    "blockchain/overview.md",
    "embedded/overview.md",
    "mcp/overview.md",
]
EXPECTED_HUB_LINKS = {
    "README.md": [
        "common/knowledge-map",
        "common/README",
        "decisions/README",
        "passport/README",
        "blockchain/README",
        "embedded/README",
        "mcp/README",
        "handoffs/README",
        "reviews/README",
    ],
    "common/knowledge-map.md": [
        "common/README",
        "decisions/README",
        "decisions/001-sidebar-navigation",
        "decisions/002-session-scope-redistribution",
        "passport/README",
        "blockchain/README",
        "embedded/README",
        "mcp/README",
        "common/agent-entrypoints",
        "common/wiki-writing-guide",
        "handoffs/README",
        "reviews/README",
        "Object/README",
    ],
}
IGNORE_PARITY_PATHS = {
    ".obsidian/app.json",
    ".obsidian/appearance.json",
    ".obsidian/core-plugins.json",
    ".obsidian/graph.json",
    ".obsidian/workspace.json",
    ".gitignore",
}
IGNORE_PARITY_PREFIXES = (
    ".trash/",
)
WIKILINK_RE = re.compile(r"\[\[([^\]]+)\]\]")
MARKDOWN_LINK_RE = re.compile(r"\[[^\]]+\]\(([^)]+)\)")


@dataclass
class VerificationResult:
    passed: list[str] = field(default_factory=list)
    failed: list[str] = field(default_factory=list)
    skipped: list[str] = field(default_factory=list)

    def ok(self) -> bool:
        return not self.failed

    def add(self, status: str, message: str) -> None:
        getattr(self, status).append(message)


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(65536), b""):
            digest.update(chunk)
    return digest.hexdigest()


def parse_frontmatter(text: str) -> dict[str, str] | None:
    if not text.startswith("---\n"):
        return None
    parts = text.split("---\n", 2)
    if len(parts) < 3:
        return None
    _, raw_frontmatter, _ = parts
    data: dict[str, str] = {}
    for line in raw_frontmatter.splitlines():
        if ":" not in line:
            continue
        key, value = line.split(":", 1)
        data[key.strip()] = value.strip()
    return data


def root_relative_without_suffix(path: Path, root: Path) -> str:
    return path.relative_to(root).with_suffix("").as_posix()


def collect_markdown_index(root: Path) -> tuple[set[str], dict[str, set[str]]]:
    docs = {root_relative_without_suffix(path, root) for path in root.rglob("*.md")}
    by_name: dict[str, set[str]] = defaultdict(set)
    for doc in docs:
        by_name[Path(doc).name].add(doc)
    return docs, by_name


def normalize_wikilink_target(raw_target: str) -> str:
    target = raw_target.split("|", 1)[0].split("#", 1)[0].strip()
    return target.removesuffix(".md").lstrip("/")


def resolve_wikilink(
    target: str, current_doc: Path, docs: set[str], by_name: dict[str, set[str]], wiki_root: Path
) -> bool:
    if not target:
        return True
    if "." in Path(target).name:
        candidate = (wiki_root / target).resolve()
        try:
            candidate.relative_to(wiki_root.resolve())
        except ValueError:
            return False
        return candidate.exists()
    if "/" in target or target.startswith("."):
        return target in docs
    matches = by_name.get(Path(target).name, set())
    if len(matches) == 1:
        return True
    current_prefix = current_doc.with_suffix("").as_posix().rsplit("/", 1)[0] if "/" in current_doc.as_posix() else ""
    if current_prefix:
        preferred = f"{current_prefix}/{target}"
        if preferred in matches:
            return True
    return False


def resolve_markdown_link(raw_target: str, current_file: Path, wiki_root: Path) -> bool:
    target = raw_target.strip()
    if not target or target.startswith(("http://", "https://", "mailto:")) or target.startswith("#"):
        return True
    target = target.split("#", 1)[0]
    candidate = (current_file.parent / target).resolve()
    try:
        candidate.relative_to(wiki_root.resolve())
    except ValueError:
        return False
    return candidate.exists()


def verify_taxonomy(root: Path, result: VerificationResult) -> None:
    missing_dirs = [item for item in REQUIRED_DIRS if not (root / item).is_dir()]
    missing_docs = [item for item in REQUIRED_DOCS if not (root / item).is_file()]
    if missing_dirs:
        result.add("failed", f"Missing taxonomy directories: {', '.join(missing_dirs)}")
    else:
        result.add("passed", "Required taxonomy directories exist")
    if missing_docs:
        result.add("failed", f"Missing hub/reference docs: {', '.join(missing_docs)}")
    else:
        result.add("passed", "Required hub/reference docs exist")


def verify_frontmatter(root: Path, result: VerificationResult) -> None:
    issues: list[str] = []
    for path in sorted(root.rglob("*.md")):
        frontmatter = parse_frontmatter(path.read_text(encoding="utf-8"))
        rel = path.relative_to(root).as_posix()
        if frontmatter is None:
            issues.append(f"{rel}: missing or malformed frontmatter")
            continue
        missing = sorted(REQUIRED_FRONTMATTER_KEYS - set(frontmatter))
        if missing:
            issues.append(f"{rel}: missing keys {', '.join(missing)}")
    if issues:
        result.add("failed", "Frontmatter issues:\n  - " + "\n  - ".join(issues))
    else:
        result.add("passed", "All markdown files include the required frontmatter keys")


def verify_hub_links(root: Path, result: VerificationResult) -> None:
    issues: list[str] = []
    for rel_path, expected_targets in EXPECTED_HUB_LINKS.items():
        text = (root / rel_path).read_text(encoding="utf-8")
        normalized_targets = {normalize_wikilink_target(match.group(1)) for match in WIKILINK_RE.finditer(text)}
        missing = [target for target in expected_targets if target not in normalized_targets]
        if missing:
            issues.append(f"{rel_path}: missing links {', '.join(missing)}")
    if issues:
        result.add("failed", "Hub coverage issues:\n  - " + "\n  - ".join(issues))
    else:
        result.add("passed", "Root/index hubs reference the expected consolidation entrypoints")


def verify_links(root: Path, result: VerificationResult) -> None:
    docs, by_name = collect_markdown_index(root)
    issues: list[str] = []
    for file_path in sorted(root.rglob("*.md")):
        rel = file_path.relative_to(root)
        text = file_path.read_text(encoding="utf-8")
        for match in WIKILINK_RE.finditer(text):
            raw_target = match.group(1)
            target = normalize_wikilink_target(raw_target)
            if not resolve_wikilink(target, rel, docs, by_name, root):
                issues.append(f"{rel.as_posix()}: broken wikilink [[{raw_target}]]")
        for match in MARKDOWN_LINK_RE.finditer(text):
            raw_target = match.group(1)
            if not resolve_markdown_link(raw_target, file_path, root):
                issues.append(f"{rel.as_posix()}: broken markdown link ({raw_target})")
    if issues:
        result.add("failed", "Link integrity issues:\n  - " + "\n  - ".join(issues))
    else:
        result.add("passed", "All Obsidian wikilinks and markdown asset links resolve")


def should_ignore_parity_path(rel: str) -> bool:
    return rel in IGNORE_PARITY_PATHS or any(rel.startswith(prefix) for prefix in IGNORE_PARITY_PREFIXES)


def compare_trees(source: Path, target: Path) -> tuple[list[str], list[str], list[str]]:
    source_files = {
        path.relative_to(source).as_posix()
        for path in source.rglob("*")
        if path.is_file() and not should_ignore_parity_path(path.relative_to(source).as_posix())
    }
    target_files = {
        path.relative_to(target).as_posix()
        for path in target.rglob("*")
        if path.is_file() and not should_ignore_parity_path(path.relative_to(target).as_posix())
    }
    only_in_source = sorted(source_files - target_files)
    only_in_target = sorted(target_files - source_files)
    differing: list[str] = []
    for rel in sorted(source_files & target_files):
        if sha256(source / rel) != sha256(target / rel):
            differing.append(rel)
    return only_in_source, only_in_target, differing


def verify_parity(label: str, source: Path, target: Path, result: VerificationResult) -> None:
    if not source.exists():
        result.add("skipped", f"{label}: source path not found ({source})")
        return
    if not target.exists():
        result.add("skipped", f"{label}: target path not found ({target})")
        return
    if source.resolve() == target.resolve():
        result.add("skipped", f"{label}: source and target are the same path ({source})")
        return
    only_in_source, only_in_target, differing = compare_trees(source, target)
    if only_in_source or only_in_target or differing:
        lines = []
        if only_in_source:
            lines.append(f"only in source: {', '.join(only_in_source)}")
        if only_in_target:
            lines.append(f"only in target: {', '.join(only_in_target)}")
        if differing:
            lines.append(f"differing: {', '.join(differing)}")
        result.add("failed", f"{label}: parity mismatch\n  - " + "\n  - ".join(lines))
    else:
        result.add("passed", f"{label}: parity OK")


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Verify wiki consolidation and parity.")
    parser.add_argument("--wiki-root", default="wiki", help="Wiki root inside the repo")
    parser.add_argument(
        "--canonical-source",
        default="/home/heechan/bms-blockchain/wiki",
        help="Canonical Linux wiki source to compare against",
    )
    parser.add_argument(
        "--windows-mirror",
        default="/mnt/c/Users/heechan/Documents/BMS-Knowledge",
        help="Windows Obsidian mirror to compare against",
    )
    parser.add_argument(
        "--skip-source-parity",
        action="store_true",
        help="Skip canonical Linux source parity check",
    )
    parser.add_argument(
        "--skip-windows-parity",
        action="store_true",
        help="Skip Windows mirror parity check",
    )
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    repo_root = Path.cwd()
    wiki_root = (repo_root / args.wiki_root).resolve()

    if not wiki_root.exists():
        print(f"FAIL: wiki root not found: {wiki_root}", file=sys.stderr)
        return 1

    result = VerificationResult()
    verify_taxonomy(wiki_root, result)
    verify_frontmatter(wiki_root, result)
    verify_hub_links(wiki_root, result)
    verify_links(wiki_root, result)

    if not args.skip_source_parity:
        verify_parity("Canonical source parity", wiki_root, Path(args.canonical_source).resolve(), result)
    if not args.skip_windows_parity:
        verify_parity("Windows mirror parity", wiki_root, Path(args.windows_mirror).resolve(), result)

    for message in result.passed:
        print(f"PASS: {message}")
    for message in result.skipped:
        print(f"SKIP: {message}")
    for message in result.failed:
        print(f"FAIL: {message}")

    if result.ok():
        print("SUMMARY: wiki verification passed")
        return 0
    print("SUMMARY: wiki verification failed")
    return 1


if __name__ == "__main__":
    raise SystemExit(main())
