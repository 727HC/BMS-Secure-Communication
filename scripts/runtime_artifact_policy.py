#!/usr/bin/env python3
from __future__ import annotations

import argparse
from pathlib import Path

RUNTIME_IGNORE_LINES = [
    '.omc/',
    '**/.omc/',
    '.playwright-mcp/',
    '/batp-*.png',
    '/e2e-tests/screenshots/',
    '/e2e-tests/test-results/',
    '/webapp/frontend-react/dist/',
    '/webapp/frontend-react/*.tsbuildinfo',
    '/caliper-workspace/report.html',
    '/passport-network/*.tar.gz',
    '/passport-network/log.txt',
]

DIR_TARGETS = [
    '.omc',
    '.playwright-mcp',
    'e2e-tests/screenshots',
    'e2e-tests/test-results',
    'webapp/frontend-react/dist',
]
DIR_GLOBS = [
    '**/.omc',
]
FILE_GLOBS = [
    'batp-*.png',
    'webapp/frontend-react/*.tsbuildinfo',
    'caliper-workspace/report.html',
    'passport-network/*.tar.gz',
    'passport-network/log.txt',
]

BLOCK_BEGIN = '# BEGIN runtime-artifact-policy'
BLOCK_END = '# END runtime-artifact-policy'


def repo_root() -> Path:
    return Path(__file__).resolve().parents[1]


def iter_existing_targets(root: Path) -> list[str]:
    seen: set[str] = set()
    ordered: list[str] = []
    for rel in DIR_TARGETS:
        path = root / rel
        if path.exists():
            key = path.relative_to(root).as_posix()
            if key not in seen:
                seen.add(key)
                ordered.append(key)
    for pattern in DIR_GLOBS:
        for path in sorted(root.glob(pattern)):
            if path.exists():
                key = path.relative_to(root).as_posix()
                if key not in seen:
                    seen.add(key)
                    ordered.append(key)
    for pattern in FILE_GLOBS:
        for path in sorted(root.glob(pattern)):
            if path.exists():
                key = path.relative_to(root).as_posix()
                if key not in seen:
                    seen.add(key)
                    ordered.append(key)
    return ordered


def extract_runtime_block(ignore_text: str) -> list[str]:
    try:
        after_begin = ignore_text.split(BLOCK_BEGIN, 1)[1]
        body = after_begin.split(BLOCK_END, 1)[0]
    except IndexError as exc:
        raise SystemExit('runtime artifact policy markers missing from .gitignore') from exc
    lines = []
    for raw in body.splitlines():
        line = raw.strip()
        if not line or line.startswith('#'):
            continue
        lines.append(line)
    return lines


def cmd_audit_gitignore() -> int:
    root = repo_root()
    ignore_text = (root / '.gitignore').read_text(encoding='utf-8')
    current = extract_runtime_block(ignore_text)
    if current != RUNTIME_IGNORE_LINES:
        print('FAIL: runtime artifact policy block drift detected')
        print('expected:')
        for line in RUNTIME_IGNORE_LINES:
            print(f'  {line}')
        print('actual:')
        for line in current:
            print(f'  {line}')
        return 1
    print('PASS: runtime artifact policy block matches scripts/runtime_artifact_policy.py')
    return 0


def cmd_list_existing() -> int:
    for rel in iter_existing_targets(repo_root()):
        print(rel)
    return 0


def main() -> int:
    parser = argparse.ArgumentParser(description='Audit and enumerate runtime artifact policy targets.')
    sub = parser.add_subparsers(dest='cmd', required=True)
    sub.add_parser('audit-gitignore')
    sub.add_parser('list-existing')
    args = parser.parse_args()
    if args.cmd == 'audit-gitignore':
        return cmd_audit_gitignore()
    if args.cmd == 'list-existing':
        return cmd_list_existing()
    return 1


if __name__ == '__main__':
    raise SystemExit(main())
