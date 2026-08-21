#!/usr/bin/env python3

from __future__ import annotations

import importlib.util
import tempfile
import unittest
from pathlib import Path


SCRIPT = Path(__file__).with_name("raw_conversation_archive.py")
SPEC = importlib.util.spec_from_file_location("raw_conversation_archive", SCRIPT)
assert SPEC is not None and SPEC.loader is not None
archive = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(archive)


class RawConversationArchiveTest(unittest.TestCase):
    def setUp(self) -> None:
        self.temp_dir = tempfile.TemporaryDirectory()
        self.repo_root = Path(self.temp_dir.name)

    def tearDown(self) -> None:
        self.temp_dir.cleanup()

    def payload(self, event: str, **extra: object) -> dict[str, object]:
        return {
            "hook_event_name": event,
            "session_id": "session-123",
            "turn_id": "turn-123",
            "cwd": str(self.repo_root),
            **extra,
        }

    def test_user_and_stop_events_create_one_complete_turn(self) -> None:
        path = archive.archive_event(
            self.payload(
                "UserPromptSubmit",
                prompt=(
                    "원문 `code`\n"
                    "```md\n"
                    "## Turn 99\n"
                    "### 과외냥이\n"
                    "```"
                ),
            ),
            self.repo_root,
            "2026-08-21",
        )
        self.assertIsNotNone(path)

        archive.archive_event(
            self.payload("Stop", last_assistant_message="최종 답변"),
            self.repo_root,
            "2026-08-21",
        )
        archive.archive_event(
            self.payload("Stop", last_assistant_message="최종 답변"),
            self.repo_root,
            "2026-08-21",
        )

        assert path is not None
        text = path.read_text(encoding="utf-8")
        self.assertEqual(archive.top_level_turns(text), [1])
        self.assertEqual(text.count("### 모기"), 1)
        self.assertEqual(text.count("### 과외냥이"), 2)
        section = archive.section_for_turn_key(text, archive.stable_key("turn-123"))
        assert section is not None
        self.assertTrue(archive.has_top_level_line(section, "### 과외냥이"))
        self.assertIn("## Turn 99", text)
        self.assertIn("최종 답변", text)

    def test_renamed_file_is_found_by_hashed_session_key(self) -> None:
        path = archive.archive_event(
            self.payload("UserPromptSubmit", prompt="첫 질문"),
            self.repo_root,
            "2026-08-21",
        )
        assert path is not None
        renamed = path.with_name("2026-08-21-01-meaningful-slug.md")
        path.rename(renamed)

        second = self.payload(
            "UserPromptSubmit",
            prompt="둘째 질문",
            turn_id="turn-456",
        )
        found = archive.archive_event(second, self.repo_root, "2026-08-21")

        self.assertEqual(found, renamed)
        self.assertEqual(archive.top_level_turns(renamed.read_text(encoding="utf-8")), [1, 2])

    def test_current_manual_file_can_be_claimed_once(self) -> None:
        raw_dir = self.repo_root / "raw"
        raw_dir.mkdir()
        pending = raw_dir / "2026-08-21-01-existing-session.md"
        pending.write_text(
            "---\n"
            "date: 2026-08-21\n"
            "session_number: 1\n"
            "codex_session_key: pending\n"
            "---\n\n"
            "# existing\n",
            encoding="utf-8",
        )

        found = archive.archive_event(
            self.payload("UserPromptSubmit", prompt="이어지는 질문"),
            self.repo_root,
            "2026-08-21",
        )

        self.assertEqual(found, pending)
        text = pending.read_text(encoding="utf-8")
        self.assertIn(
            f"codex_session_key: {archive.stable_key('session-123')}",
            text,
        )
        self.assertNotIn("codex_session_key: pending", text)


if __name__ == "__main__":
    unittest.main()
