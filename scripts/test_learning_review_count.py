"""Check coverage counting with omitted, same-day, and partially reviewed logs."""

from pathlib import Path
import shutil
import subprocess
import tempfile
import unittest

from learning_review_count import hook_text, pending_sessions


class LearningReviewCountTests(unittest.TestCase):
    def setUp(self):
        temporary = tempfile.TemporaryDirectory()
        self.addCleanup(temporary.cleanup)
        self.root = Path(temporary.name).resolve()
        self.directory = self.root / "head-test"
        self.directory.mkdir()

    def session(self, name):
        path = self.directory / f"{name}-session-end-analysis.md"
        path.write_text("---\nreviewed: true\n---\n", encoding="utf-8")
        return path

    def review(self, name, sessions, extra=""):
        links = "\n".join(f"1. [로그](./{path.name})" for path in sessions)
        (self.directory / f"{name}-learning-observation-cumulative-review.md").write_text(
            f"## 1. 분석 대상 세션 로그\n{links}\n## 2. 결론\n{extra}", encoding="utf-8")

    def test_no_reviews_counts_all_direct_logs_only_regardless_of_read_status(self):
        session = self.session("2026-10-22-a")
        (self.directory / "archive").mkdir()
        (self.directory / "archive/2026-10-22-b-session-end-analysis.md").touch()
        self.assertEqual(pending_sessions(self.root), [session])
        self.assertIn("1개", hook_text(self.root))

    def test_coverage_uses_all_reviews_and_does_not_discard_older_or_same_day_logs(self):
        older = self.session("2026-10-19-a")
        omitted = self.session("2026-10-19-b")
        same_day = self.session("2026-10-22-a")
        later_same_day = self.session("2026-10-22-b")
        self.review("2026-10-20", [older])
        self.review("2026-10-22", [older, same_day])
        self.assertEqual(pending_sessions(self.root), [omitted, later_same_day])
        # A partial new review reduces the count only by its explicit new targets.
        self.review("2026-10-23", [later_same_day])
        self.assertEqual(pending_sessions(self.root), [omitted])

    def test_mentions_outside_analysis_targets_are_not_coverage(self):
        session = self.session("2026-10-22-a")
        self.review("2026-10-22", [], f"참고: [로그](./{session.name})")
        self.assertEqual(pending_sessions(self.root), [session])

    def test_unrecognized_review_does_not_report_a_confident_count(self):
        (self.directory / "2026-10-22-learning-observation-cumulative-review.md").write_text(
            "# 목록 형식 미확인", encoding="utf-8")
        with self.assertRaisesRegex(ValueError, "분석 대상 세션 로그 절 없음"):
            pending_sessions(self.root)

    def test_start_hook_reports_count_and_preserves_guides_on_count_error(self):
        repo = Path(__file__).resolve().parents[1]
        subprocess.run(["git", "init", "-q", str(self.root)], check=True, capture_output=True)
        scripts = self.root / "scripts"
        scripts.mkdir()
        shutil.copy2(repo / "scripts/learning_review_count.py", scripts)
        (scripts / "pilots.py").write_text("print('파일럿 현황')\n", encoding="utf-8")
        for filename in ("guide-tutor-preamble.md", "guide-mogi-head-test.md"):
            (self.root / filename).write_text(f"원문 {filename}", encoding="utf-8")
        self.session("2026-10-22-a")
        hook = repo / ".codex/hooks/session-start-tutor-context.sh"
        result = subprocess.run(["sh", str(hook)], cwd=self.root, text=True, capture_output=True)
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertIn("누적 검토 미반영 종료 기록: 1개", result.stdout)
        (scripts / "learning_review_count.py").write_text("raise RuntimeError('broken counter')\n")
        result = subprocess.run(["sh", str(hook)], cwd=self.root, text=True, capture_output=True)
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertIn("누적 검토 개수 집계 불가", result.stdout)
        self.assertIn("broken counter", result.stdout)
        self.assertNotIn("미반영 종료 기록: 0개", result.stdout)
        self.assertIn("원문 guide-tutor-preamble.md", result.stdout)
        self.assertIn("원문 guide-mogi-head-test.md", result.stdout)
        self.assertIn("파일럿 현황", result.stdout)


if __name__ == "__main__":
    unittest.main()
