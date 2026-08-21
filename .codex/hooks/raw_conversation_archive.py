#!/usr/bin/env python3
"""Archive user prompts and final assistant messages from Codex hook events."""

from __future__ import annotations

import hashlib
import json
import os
import re
import sys
from datetime import datetime
from pathlib import Path
from typing import Any


SESSION_KEY_RE = re.compile(r"^codex_session_key:\s*(\S+)\s*$", re.MULTILINE)
TURN_KEY_RE = re.compile(r"^Codex turn key:\s*`([0-9a-f]{16})`\s*$", re.MULTILINE)
TURN_HEADING_RE = re.compile(r"^## Turn (\d+)\s*$")
FENCE_RE = re.compile(r"^([~`]{3,})")
DATE_NUMBER_RE = re.compile(r"^(\d{4}-\d{2}-\d{2})-(\d+)-")


def stable_key(value: str) -> str:
    return hashlib.sha256(value.encode("utf-8")).hexdigest()[:16]


def frontmatter_prefix(path: Path, limit: int = 4096) -> str:
    with path.open("r", encoding="utf-8") as handle:
        return handle.read(limit)


def session_key_in(path: Path) -> str | None:
    match = SESSION_KEY_RE.search(frontmatter_prefix(path))
    return match.group(1) if match else None


def claim_pending_file(path: Path, session_key: str) -> None:
    text = path.read_text(encoding="utf-8")
    updated, count = re.subn(
        r"^codex_session_key:\s*pending\s*$",
        f"codex_session_key: {session_key}",
        text,
        count=1,
        flags=re.MULTILINE,
    )
    if count != 1:
        raise ValueError(f"pending session marker missing in {path.name}")
    path.write_text(updated, encoding="utf-8")


def next_daily_number(raw_dir: Path, date_text: str) -> int:
    highest = 0
    for path in raw_dir.glob(f"{date_text}-*.md"):
        match = DATE_NUMBER_RE.match(path.name)
        if match and match.group(1) == date_text:
            highest = max(highest, int(match.group(2)))
    return highest + 1


def create_session_file(raw_dir: Path, date_text: str, session_key: str) -> Path:
    number = next_daily_number(raw_dir, date_text)
    while True:
        path = raw_dir / f"{date_text}-{number:02d}-session.md"
        header = (
            "---\n"
            f"date: {date_text}\n"
            f"session_number: {number}\n"
            "slug: session\n"
            "scope: user-messages-and-final-answers\n"
            f"codex_session_key: {session_key}\n"
            "---\n\n"
            f"# {date_text} 세션 {number:02d} — 자동 원문 기록\n"
        )
        try:
            with path.open("x", encoding="utf-8") as handle:
                handle.write(header)
            return path
        except FileExistsError:
            number += 1


def find_or_create_session_file(
    raw_dir: Path,
    session_key: str,
    date_text: str,
) -> Path:
    raw_dir.mkdir(parents=True, exist_ok=True)
    paths = sorted(raw_dir.glob("*.md"))

    for path in paths:
        if session_key_in(path) == session_key:
            return path

    pending = [
        path
        for path in paths
        if path.name.startswith(f"{date_text}-") and session_key_in(path) == "pending"
    ]
    if len(pending) == 1:
        claim_pending_file(pending[0], session_key)
        return pending[0]

    return create_session_file(raw_dir, date_text, session_key)


def markdown_fence(text: str) -> str:
    longest = max((len(run) for run in re.findall(r"~+", text)), default=0)
    fence = "~" * max(3, longest + 1)
    body = text if text.endswith("\n") else text + "\n"
    return f"{fence}text\n{body}{fence}\n"


def top_level_turn_positions(text: str) -> list[tuple[int, int]]:
    turns: list[tuple[int, int]] = []
    fence_char: str | None = None
    fence_length = 0
    offset = 0

    for raw_line in text.splitlines(keepends=True):
        line = raw_line.rstrip("\r\n")
        fence_match = FENCE_RE.match(line)
        if fence_char is None:
            if fence_match:
                marker = fence_match.group(1)
                fence_char = marker[0]
                fence_length = len(marker)
                offset += len(raw_line)
                continue
            heading = TURN_HEADING_RE.match(line)
            if heading:
                turns.append((int(heading.group(1)), offset))
            offset += len(raw_line)
            continue

        stripped = line.lstrip()
        if stripped.startswith(fence_char * fence_length):
            marker_length = len(stripped) - len(stripped.lstrip(fence_char))
            if marker_length >= fence_length:
                fence_char = None
                fence_length = 0
        offset += len(raw_line)

    return turns


def top_level_turns(text: str) -> list[int]:
    return [number for number, _ in top_level_turn_positions(text)]


def has_top_level_line(text: str, expected: str) -> bool:
    fence_char: str | None = None
    fence_length = 0

    for line in text.splitlines():
        fence_match = FENCE_RE.match(line)
        if fence_char is None:
            if fence_match:
                marker = fence_match.group(1)
                fence_char = marker[0]
                fence_length = len(marker)
                continue
            if line == expected:
                return True
            continue

        stripped = line.lstrip()
        if stripped.startswith(fence_char * fence_length):
            marker_length = len(stripped) - len(stripped.lstrip(fence_char))
            if marker_length >= fence_length:
                fence_char = None
                fence_length = 0

    return False


def section_for_turn_key(text: str, turn_key: str) -> str | None:
    match = re.search(
        rf"^Codex turn key:\s*`{re.escape(turn_key)}`\s*$",
        text,
        flags=re.MULTILINE,
    )
    if not match:
        return None

    positions = top_level_turn_positions(text)
    containing = [position for _, position in positions if position <= match.start()]
    if not containing:
        return None
    start = containing[-1]
    following = [position for _, position in positions if position > match.start()]
    end = following[0] if following else len(text)
    return text[start:end]


def append_user_turn(path: Path, turn_key: str, prompt: str) -> None:
    text = path.read_text(encoding="utf-8")
    if TURN_KEY_RE.search(text) and section_for_turn_key(text, turn_key) is not None:
        return

    turns = top_level_turns(text)
    number = max(turns, default=0) + 1
    block = (
        f"\n## Turn {number:02d}\n\n"
        f"Codex turn key: `{turn_key}`\n\n"
        "### 모기\n\n"
        f"{markdown_fence(prompt)}"
    )
    with path.open("a", encoding="utf-8") as handle:
        handle.write(block)


def append_assistant_turn(path: Path, turn_key: str, message: str | None) -> None:
    text = path.read_text(encoding="utf-8")
    section = section_for_turn_key(text, turn_key)
    if section is None:
        append_user_turn(path, turn_key, "[원문 미확보]")
        text = path.read_text(encoding="utf-8")
        section = section_for_turn_key(text, turn_key)

    if section is not None and has_top_level_line(section, "### 과외냥이"):
        return

    assistant_text = message if message is not None else "[원문 미확보]"
    block = f"\n### 과외냥이\n\n{markdown_fence(assistant_text)}"
    with path.open("a", encoding="utf-8") as handle:
        handle.write(block)


def archive_event(
    payload: dict[str, Any],
    repo_root: Path,
    date_text: str | None = None,
) -> Path | None:
    event = payload.get("hook_event_name")
    if event not in {"UserPromptSubmit", "Stop"}:
        return None

    session_id = payload.get("session_id")
    turn_id = payload.get("turn_id")
    if not isinstance(session_id, str) or not session_id:
        raise ValueError("hook payload is missing session_id")
    if not isinstance(turn_id, str) or not turn_id:
        raise ValueError("hook payload is missing turn_id")

    today = date_text or datetime.now().astimezone().date().isoformat()
    raw_dir = repo_root / "raw"
    path = find_or_create_session_file(raw_dir, stable_key(session_id), today)
    turn_key = stable_key(turn_id)

    if event == "UserPromptSubmit":
        prompt = payload.get("prompt")
        if not isinstance(prompt, str):
            raise ValueError("UserPromptSubmit payload is missing prompt")
        append_user_turn(path, turn_key, prompt)
    else:
        message = payload.get("last_assistant_message")
        if message is not None and not isinstance(message, str):
            raise ValueError("Stop payload has an invalid last_assistant_message")
        append_assistant_turn(path, turn_key, message)

    return path


def main() -> int:
    response: dict[str, Any] = {"continue": True}
    try:
        payload = json.load(sys.stdin)
        repo_root = Path(__file__).resolve().parents[2]
        archive_event(payload, repo_root)
    except Exception as error:  # A logging failure must not block the tutoring turn.
        response["systemMessage"] = (
            "mogi-cards raw archive hook failed: "
            f"{type(error).__name__}: {error}"
        )
    json.dump(response, sys.stdout, ensure_ascii=False)
    sys.stdout.write("\n")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
