#!/usr/bin/env python3
"""Safely validate or extract a tar bundle.

The off-host benchmark importers ingest tarballs from another machine.  Python's
tarfile.extractall() is intentionally not used here: besides absolute/../ path
traversal, symlink and hardlink members can redirect later extraction outside of
the destination.  This helper rejects links and special files, then writes only
regular files/directories under the resolved destination.
"""

from __future__ import annotations

import argparse
import shutil
import stat
import tarfile
from pathlib import Path, PurePosixPath


def _normalize_member_name(name: str) -> str:
    path = PurePosixPath(name)
    if path.is_absolute() or ".." in path.parts:
        raise SystemExit(f"unsafe tar member path: {name}")

    normalized = str(path)
    while normalized.startswith("./"):
        normalized = normalized[2:]
    if normalized == ".":
        return ""
    if normalized == "":
        raise SystemExit(f"unsafe tar member path: {name}")
    return normalized


def _ensure_under_dest(dest: Path, target: Path, member_name: str) -> None:
    resolved_dest = dest.resolve()
    resolved_target = target.resolve(strict=False)
    if resolved_target != resolved_dest and resolved_dest not in resolved_target.parents:
        raise SystemExit(f"tar member escapes destination: {member_name}")


def _reject_unsafe_member(member: tarfile.TarInfo) -> str:
    normalized = _normalize_member_name(member.name)
    if member.issym() or member.islnk():
        raise SystemExit(f"unsafe tar link member: {member.name}")
    if normalized == "" and not member.isdir():
        raise SystemExit(f"unsafe tar member path: {member.name}")
    if not (member.isdir() or member.isfile()):
        raise SystemExit(f"unsafe tar special member: {member.name}")
    return normalized


def _reject_symlink_parents(dest: Path, target: Path, member_name: str) -> None:
    current = dest.resolve()
    for part in target.relative_to(dest).parts[:-1]:
        current = current / part
        if current.is_symlink():
            raise SystemExit(f"tar member parent is symlink: {member_name}")


def validate(bundle: Path) -> list[tuple[tarfile.TarInfo, str]]:
    members: list[tuple[tarfile.TarInfo, str]] = []
    with tarfile.open(bundle, "r:*") as tar:
        for member in tar.getmembers():
            members.append((member, _reject_unsafe_member(member)))
    return members


def extract(bundle: Path, dest: Path) -> int:
    dest.mkdir(parents=True, exist_ok=True)
    dest = dest.resolve()
    count = 0

    with tarfile.open(bundle, "r:*") as tar:
        for member in tar.getmembers():
            normalized = _reject_unsafe_member(member)
            target = dest / normalized
            _ensure_under_dest(dest, target, member.name)
            _reject_symlink_parents(dest, target, member.name)

            if member.isdir():
                if normalized == "":
                    continue
                if target.is_symlink():
                    raise SystemExit(f"tar directory target is symlink: {member.name}")
                target.mkdir(parents=True, exist_ok=True)
                count += 1
                continue

            target.parent.mkdir(parents=True, exist_ok=True)
            _reject_symlink_parents(dest, target, member.name)
            if target.is_symlink():
                raise SystemExit(f"tar file target is symlink: {member.name}")

            source = tar.extractfile(member)
            if source is None:
                raise SystemExit(f"unable to read tar member: {member.name}")
            with source, target.open("wb") as out:
                shutil.copyfileobj(source, out)
            target.chmod(member.mode & (stat.S_IRWXU | stat.S_IRWXG | stat.S_IRWXO))
            count += 1

    return count


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--bundle", required=True)
    parser.add_argument("--dest")
    parser.add_argument("--check-only", action="store_true")
    args = parser.parse_args()

    bundle = Path(args.bundle)
    if args.check_only:
        members = validate(bundle)
        print(f"SAFE_TAR_MEMBERS={len(members)}")
        return
    if not args.dest:
        raise SystemExit("--dest is required unless --check-only is set")
    count = extract(bundle, Path(args.dest))
    print(f"SAFE_TAR_EXTRACTED={count}")


if __name__ == "__main__":
    main()
