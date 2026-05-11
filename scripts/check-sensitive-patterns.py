#!/usr/bin/env python3
"""High-signal sensitive marker guard for tracked repository content.

This is intentionally dependency-free and conservative. It blocks common
regressions that previously reached GitHub: local machine paths, personal
webmail addresses, hard-coded credentials, private keys, provider tokens, real
environment/credential file names, and Korean personal identifiers. It does not
replace full secret scanning.
"""
from __future__ import annotations

import argparse
import hashlib
import re
import subprocess
import sys
from pathlib import Path

SKIP_DIRS = {
    ".git",
    "node_modules",
    "logs",
    "wallet",
    ".omx",
    ".omc",
    "__pycache__",
}

SKIP_SUFFIXES = {
    ".png",
    ".jpg",
    ".jpeg",
    ".gif",
    ".webp",
    ".pdf",
    ".zip",
    ".tar",
    ".gz",
    ".tgz",
    ".elf",
    ".o",
    ".so",
    ".dll",
    ".exe",
}

LEGACY_MARKER_SHA256 = {
    # SHA-256 of lowercased historical sensitive markers. Plaintext values are intentionally not stored here.
    "5fcf82bc15aef42cd3ec93e6d4b51c04df110cf77ee715f62f3f172ff8ed9de9",
    "0bfbb87057bbd958120d72eb670d7b2efbbdd0bde3faff7b4d96439d1680158b",
    "50547d109a9c0a1fee83f4a68f913fcac813d0670306e23b69a263a45ab5b974",
    "92809ab604c9377285fbbcf82c4f30db65f107ecfd7217c7e62c17a2b3be7633",
    "399f1a7cae7287c2443e43c5ffc3e4d8900c1fd2e311ae1b4fee4be8fcf60c20",
    "9a9d1f4cbc00d81a6dd134f54584d7705d2d94c6cfd9af69061d6459e6f5ca0a",
}

TOKEN = re.compile(r"[A-Za-z0-9._@#:-]{4,}")

SENSITIVE_PATH_SUFFIXES = {
    ".pem",
    ".key",
    ".p12",
    ".pfx",
    ".jks",
    ".keystore",
    ".kdbx",
}

SENSITIVE_PATH_NAMES = {
    ".netrc",
    ".pypirc",
    ".npmrc",
    "id_rsa",
    "id_dsa",
    "id_ecdsa",
    "id_ed25519",
}

ENV_EXAMPLE_SUFFIXES = (".example", ".template", ".sample")


PATTERNS: list[tuple[str, re.Pattern[str]]] = [
    ("local_unix_home_path", re.compile(r"/home/[A-Za-z0-9._-]+")),
    ("local_windows_user_path", re.compile(r"C:\\\\Users\\\\[A-Za-z0-9._-]+", re.I)),
    ("personal_webmail", re.compile(r"\b[A-Za-z0-9._%+-]+@(gmail|naver|kakao|hanmail|daum)\.[A-Za-z.]+\b", re.I)),
    ("private_key_header", re.compile(r"-----BEGIN (?:RSA |EC |OPENSSH |DSA |)?PRIVATE KEY-----")),
    ("github_token", re.compile(r"\b(?:ghp|gho|ghu|ghs|ghr)_[A-Za-z0-9_]{20,}\b|\bgithub_pat_[A-Za-z0-9_]+\b")),
    ("aws_access_key", re.compile(r"\bAKIA[0-9A-Z]{16}\b")),
    ("jwt", re.compile(r"\beyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\b")),
    ("korean_rrn", re.compile(r"\b\d{6}-[1-4]\d{6}\b")),
    ("korean_mobile", re.compile(r"\b01[016789][- .]?\d{3,4}[- .]?\d{4}\b")),
    ("fabric_literal_id_secret", re.compile(r"--id\.secret\s+(?!\$\{)[A-Za-z0-9_.@#:-]{6,}")),
    ("url_basic_auth_literal", re.compile(r"https?://[^\s:/@]+:(?!\$\{)[^\s${}@]{6,}@")),
]


def sensitive_path_reason(path: Path) -> str | None:
    name = path.name.lower()
    suffix = path.suffix.lower()

    if name == ".env":
        return "sensitive_env_filename"
    if name.startswith(".env.") and not name.endswith(ENV_EXAMPLE_SUFFIXES):
        return "sensitive_env_filename"
    if suffix in SENSITIVE_PATH_SUFFIXES:
        return "sensitive_credential_file_extension"
    if name in SENSITIVE_PATH_NAMES:
        return "sensitive_credential_filename"
    return None


def git_files(include_untracked: bool) -> list[Path]:
    args = ["git", "ls-files", "-z"]
    if include_untracked:
        args = ["git", "ls-files", "-co", "--exclude-standard", "-z"]
    output = subprocess.check_output(args)
    return [Path(raw.decode("utf-8", "surrogateescape")) for raw in output.split(b"\0") if raw]


def should_skip(path: Path) -> bool:
    if any(part in SKIP_DIRS for part in path.parts):
        return True
    return path.suffix.lower() in SKIP_SUFFIXES


def read_text(path: Path) -> str | None:
    try:
        data = path.read_bytes()
    except OSError:
        return None
    if b"\0" in data[:8192]:
        return None
    try:
        return data.decode("utf-8")
    except UnicodeDecodeError:
        return None


def legacy_marker_hit(line: str) -> bool:
    for token in TOKEN.findall(line):
        normalized = token.strip("'\"`.,;:()[]{}<> ").lower()
        if not normalized:
            continue
        digest = hashlib.sha256(normalized.encode("utf-8")).hexdigest()
        if digest in LEGACY_MARKER_SHA256:
            return True
    return False


def scan_file(path: Path) -> list[tuple[str, int, str]]:
    text = read_text(path)
    if text is None:
        return []
    findings: list[tuple[str, int, str]] = []
    for line_no, line in enumerate(text.splitlines(), 1):
        for name, pattern in PATTERNS:
            if pattern.search(line):
                findings.append((name, line_no, line.strip()[:220]))
        if legacy_marker_hit(line):
            findings.append(("legacy_sensitive_marker", line_no, line.strip()[:220]))
    return findings


def main() -> int:
    parser = argparse.ArgumentParser(description="Scan tracked files for high-signal sensitive markers.")
    parser.add_argument("--include-untracked", action="store_true", help="also scan untracked non-ignored files")
    args = parser.parse_args()

    total = 0
    for path in git_files(args.include_untracked):
        if not path.exists() or path.is_dir():
            continue
        if reason := sensitive_path_reason(path):
            total += 1
            print(f"{reason}\t{path}:0\treal credential-like file path is not allowed")
            continue
        if should_skip(path):
            continue
        for name, line_no, sample in scan_file(path):
            total += 1
            print(f"{name}\t{path}:{line_no}\t{sample}")

    if total:
        print(f"FAILED sensitive marker scan: {total} finding(s)", file=sys.stderr)
        return 1
    print("sensitive marker scan: 0 findings")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
