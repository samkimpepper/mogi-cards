"""Exercise pilot routing and records against disposable notebook fixtures."""

from concurrent.futures import ThreadPoolExecutor
import importlib.util
from pathlib import Path
import subprocess
import tempfile
import unittest

spec = importlib.util.spec_from_file_location("pilots", Path(__file__).with_name("pilots.py"))
pilots = importlib.util.module_from_spec(spec)
spec.loader.exec_module(pilots)


class PilotTests(unittest.TestCase):
    def setUp(self):
        temporary = tempfile.TemporaryDirectory()
        self.addCleanup(temporary.cleanup)
        self.root = Path(temporary.name).resolve()
        self.directory = self.root / "harness/pilots"
        self.directory.mkdir(parents=True)
        (self.root / "proof.md").write_text("실제 보고와 사용자 반응", encoding="utf-8")

    def pilot(self, name="sample", fields=None):
        header = {"reviewed": "false", "status": "pilot", "event": "review",
                  "planned_cases": "3", "completed_cases": "0"}
        if fields is not None:
            header = fields
        path = self.directory / f"2026-10-20-{name}.md"
        path.write_text("---\n" + "\n".join(f"{key}: {value}" for key, value in header.items())
                        + "\n---\n\n# 기존 파일럿\n\n## 실행 기록\n\n아직 실행 없음.\n", encoding="utf-8")
        return path

    def record(self, name="sample", key="case-1", result="completed", **kwargs):
        return pilots.record(self.root, name, key, result, "proof.md", "보고를 읽고 기록함", **kwargs)

    def test_new_pilot_is_discovered_and_explicit_event_routes_it(self):
        self.pilot()
        self.assertEqual([item["id"] for item in pilots.due(self.root, "review")["due"]], ["sample"])
        self.assertEqual(pilots.due(self.root, "code-note")["due"], [])
        self.assertEqual(len(pilots.due(self.root, "diff")["due"]), 1)

    def test_unknown_pilot_remains_visible_and_needs_classification(self):
        self.pilot("unknown", {"reviewed": "false", "status": "pilot"})
        row = pilots.inventory(self.root)[0]
        self.assertFalse(row["available"])
        self.assertIsNone(row["completed"])
        self.assertIn("unknown", pilots.hook_text(self.root))
        self.assertEqual(len(pilots.due(self.root, "review")["attention"]), 1)

    def test_request_only_does_not_start_from_an_ordinary_event(self):
        self.pilot("invalid-input-and-broken-tool-tests", {
            "reviewed": "false", "status": "pilot", "planned_runs": "3", "completed_runs": "0"})
        self.assertEqual(pilots.due(self.root, "test-request")["due"], [])
        self.assertEqual(len(pilots.due(self.root, "test-request", requested=True)["due"]), 1)
        with self.assertRaisesRegex(ValueError, "requested"):
            self.record("invalid-input-and-broken-tool-tests")
        self.assertEqual(self.record("invalid-input-and-broken-tool-tests", requested=True)["pilot"]["completed"], 1)

    def test_completion_updates_existing_counter_and_stops_at_budget(self):
        path = self.pilot(fields={"reviewed": "false", "status": "pilot", "event": "code-note",
                                  "planned_sessions": "3", "completed_sessions": "2", "remaining_sessions": "1"})
        result = self.record()
        self.assertEqual(result["pilot"]["completed"], 3)
        self.assertEqual(result["pilot"]["status"], "awaiting-review")
        self.assertEqual(pilots.due(self.root, "code-note")["due"], [])
        text = path.read_text()
        self.assertIn("reviewed: false", text)
        self.assertIn("remaining_sessions: 0", text)
        self.assertNotIn("아직 실행 없음", text)
        with self.assertRaises(ValueError):
            self.record(key="case-2")
        self.assertFalse(self.record()["recorded"])

    def test_retry_and_concurrent_same_key_count_only_once(self):
        self.pilot()
        with ThreadPoolExecutor(max_workers=2) as pool:
            results = list(pool.map(lambda _: self.record(), range(2)))
        self.assertEqual(sum(item["recorded"] for item in results), 1)
        self.assertEqual(pilots.inventory(self.root)[0]["completed"], 1)

    def test_blocked_run_does_not_count_and_can_later_complete(self):
        self.pilot()
        self.assertEqual(self.record(result="blocked")["pilot"]["completed"], 0)
        self.assertEqual(self.record()["pilot"]["completed"], 1)
        self.assertFalse(self.record()["recorded"])

    def test_missing_evidence_and_corrupt_counters_preserve_definition(self):
        path = self.pilot(fields={"reviewed": "false", "status": "pilot", "event": "review",
                                  "planned_cases": "3", "completed_cases": "no"})
        before = path.read_bytes()
        with self.assertRaises(ValueError):
            self.record()
        self.assertEqual(path.read_bytes(), before)
        path = self.pilot()
        before = path.read_bytes()
        with self.assertRaises(ValueError):
            pilots.record(self.root, "sample", "key", "completed", "missing.md", "보고")
        self.assertEqual(path.read_bytes(), before)

    def test_completed_pilot_is_not_reactivated_and_legacy_count_is_not_invented(self):
        self.pilot("discovery-dedupe-gate", {"reviewed": "false", "status": "completed",
                   "prospective_runs": "3", "completed_runs": "3"})
        self.pilot("raw-diff-contact", {"reviewed": "false", "status": "pilot"})
        self.assertEqual(pilots.due(self.root, "memo")["due"], [])
        with self.assertRaises(ValueError):
            self.record("discovery-dedupe-gate")
        with self.assertRaises(ValueError):
            self.record("raw-diff-contact")
        result = self.record("raw-diff-contact", result="blocked")
        self.assertIsNone(result["pilot"]["completed"])

    def test_budget_reached_without_status_update_is_still_not_due(self):
        self.pilot(fields={"reviewed": "false", "status": "pilot", "event": "review",
                           "planned_cases": "3", "completed_cases": "3"})
        self.assertEqual(pilots.due(self.root, "review")["due"], [])
        self.assertTrue(pilots.due(self.root, "review")["attention"])

    def test_broken_catalog_does_not_remove_existing_startup_guides(self):
        subprocess.run(["git", "init", "-q", str(self.root)], check=True, capture_output=True)
        (self.root / "guide-tutor-preamble.md").write_text("기존 프리앰블", encoding="utf-8")
        (self.root / "guide-mogi-head-test.md").write_text("기존 학습 관찰 지침", encoding="utf-8")
        (self.root / "head-test").mkdir()
        (self.root / "scripts").mkdir()
        (self.root / "scripts/pilots.py").write_text("raise SystemExit('catalog broken')\n", encoding="utf-8")
        hook = Path(__file__).resolve().parents[1] / ".codex/hooks/session-start-tutor-context.sh"
        result = subprocess.run(["sh", str(hook)], cwd=self.root, capture_output=True, text=True)
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertIn("기존 프리앰블", result.stdout)
        self.assertIn("기존 학습 관찰 지침", result.stdout)
        self.assertIn("파일럿 현황 조회 실패", result.stdout)


if __name__ == "__main__":
    unittest.main()
