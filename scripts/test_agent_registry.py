"""Run with: python3 -m unittest discover -s scripts -p 'test_*.py'."""

import contextlib
import importlib.util
import io
import json
import os
from pathlib import Path
import tempfile
import unittest
from unittest.mock import patch

spec = importlib.util.spec_from_file_location(
    "agent_registry", Path(__file__).with_name("agent-registry.py")
)
registry = importlib.util.module_from_spec(spec)
spec.loader.exec_module(registry)


class RegistrationTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name).resolve()
        self.directory = self.root / ".local" / "agent-registry"
        self.path = self.directory / "tutor.json"
        self.terminal = dict(
            handle="term_self", incarnationId="inc_self", worktreeId="workspace_self",
            worktreePath=str(self.root), executionHostId="local", agentIdentity="codex",
            connected=True, writable=True,
        )
        self.run = dict(id="run_self", coordinator_handle="term_self", consumer_generation=2)

    def invoke(self, *args, run=True, terminals=None):
        with contextlib.ExitStack() as stack:
            stack.enter_context(patch.object(registry, "REGISTRY", self.directory))
            stack.enter_context(patch.object(registry, "ROOT", self.root))
            stack.enter_context(patch.object(registry.Path, "cwd", return_value=self.root))
            stack.enter_context(patch.object(registry, "inventory", return_value=(
                "runtime_self", [self.terminal] if terminals is None else terminals
            )))
            stack.enter_context(patch.object(registry, "own_handle", return_value="term_self"))
            stack.enter_context(patch.object(registry, "current_run", return_value=self.run if run else None))
            stack.enter_context(patch("sys.argv", ["agent-registry.py", *args]))
            stack.enter_context(contextlib.redirect_stdout(io.StringIO()))
            registry.main()

    def test_register_and_resolve_current_run(self):
        self.invoke("register", "tutor")
        saved = json.loads(self.path.read_text())
        self.assertEqual(saved["runId"], "run_self")
        self.assertEqual(saved["consumerGeneration"], 2)
        self.invoke("resolve", "tutor")

    def test_missing_run_preserves_existing_file(self):
        self.invoke("register", "tutor")
        before = self.path.read_bytes()
        with self.assertRaisesRegex(RuntimeError, "No Run bound"):
            self.invoke("register", "tutor", run=False)
        self.assertEqual(self.path.read_bytes(), before)

    def test_changed_run_is_rejected_by_resolve(self):
        self.invoke("register", "tutor")
        self.run = dict(self.run, id="run_changed")
        with self.assertRaisesRegex(RuntimeError, "Run binding changed"):
            self.invoke("resolve", "tutor")

    def test_changed_consumer_generation_is_rejected(self):
        self.invoke("register", "tutor")
        self.run = dict(self.run, consumer_generation=3)
        with self.assertRaisesRegex(RuntimeError, "Run binding changed"):
            self.invoke("resolve", "tutor")
        self.invoke("register", "tutor")
        self.invoke("resolve", "tutor")

    def test_different_registration_requires_explicit_replace(self):
        self.invoke("register", "tutor")
        saved = json.loads(self.path.read_text())
        saved["terminalHandle"] = "term_other"
        self.path.write_text(json.dumps(saved))
        before = self.path.read_bytes()
        with self.assertRaisesRegex(RuntimeError, "explicit transfer"):
            self.invoke("register", "tutor")
        self.assertEqual(self.path.read_bytes(), before)
        self.invoke("register", "tutor", "--replace")
        self.invoke("resolve", "tutor")

    def test_other_workspace_cannot_register(self):
        self.terminal["worktreePath"] = str(self.root / "other")
        with self.assertRaisesRegex(RuntimeError, "workspace does not match"):
            self.invoke("register", "tutor")
        self.assertFalse(self.path.exists())

    def test_missing_environment_does_not_guess_from_active_pane(self):
        with patch.dict(os.environ, {}, clear=True):
            with self.assertRaisesRegex(RuntimeError, "cannot prove the caller"):
                registry.own_handle()

    def test_peer_address_is_resolved_but_never_registered(self):
        self.invoke("register", "tutor")
        peer = self.root / "peer.json"
        saved = json.loads(self.path.read_text())
        saved["role"] = "todo"
        saved["agentIdentity"] = "claude"
        peer.write_text(json.dumps(saved))
        peer_terminal = dict(self.terminal, agentIdentity="claude")
        with patch.object(registry, "TODO_ADDRESS", peer):
            self.invoke("resolve", "todo", terminals=[peer_terminal])
            before = peer.read_bytes()
            with self.assertRaisesRegex(RuntimeError, "Only the tutor"):
                self.invoke("register", "todo", terminals=[peer_terminal])
            self.assertEqual(peer.read_bytes(), before)

    def test_runtime_change_preserves_existing_registration(self):
        self.invoke("register", "tutor")
        saved = json.loads(self.path.read_text())
        saved["runtimeId"] = "old_runtime"
        self.path.write_text(json.dumps(saved))
        before = self.path.read_bytes()
        with self.assertRaisesRegex(RuntimeError, "Orca runtime changed"):
            self.invoke("resolve", "tutor")
        self.assertEqual(self.path.read_bytes(), before)

    def test_disconnected_address_is_not_resolved(self):
        self.invoke("register", "tutor")
        self.terminal["connected"] = False
        with self.assertRaisesRegex(RuntimeError, "not connected and writable"):
            self.invoke("resolve", "tutor")

    def test_wrong_peer_role_is_rejected(self):
        self.invoke("register", "tutor")
        with patch.object(registry, "TODO_ADDRESS", self.path):
            with self.assertRaisesRegex(RuntimeError, "requested role"):
                self.invoke("resolve", "todo")

    def test_run_owned_by_another_terminal_is_rejected(self):
        receipt = {"_meta": {"runtimeId": "runtime_self"},
                   "result": {"run": dict(self.run, coordinator_handle="term_other")}}
        with patch.object(registry, "orca", return_value=receipt):
            with self.assertRaisesRegex(RuntimeError, "does not belong"):
                registry.current_run("term_self", "runtime_self")


if __name__ == "__main__":
    unittest.main()
