#!/usr/bin/env python3
"""Register the tutor's Orca address, or verify the tutor/Todo address without sending."""

import argparse
from datetime import datetime, timezone
import json
import os
from pathlib import Path
import platform
import shlex
import subprocess
import tempfile

ROOT = Path(__file__).resolve().parents[1]
REGISTRY = ROOT / ".local" / "agent-registry"
TODO_ADDRESS = ROOT.parent / "mogi-productivity" / ".local" / "agent-address.json"


def cli_command():
    configured = os.environ.get("ORCA_CLI_COMMAND")
    if configured:
        return shlex.split(configured)
    if os.environ.get("ORCA_DEV_REPO_ROOT"):
        return ["orca-dev"]
    if platform.system() == "Linux" and not os.environ.get("ORCA_TERMINAL_HANDLE"):
        return ["orca-ide"]
    return ["orca"]


# Select once, using the installed orca-cli skill's executable routing.
ORCA_COMMAND = cli_command()


def orca(*args):
    result = subprocess.run(
        [*ORCA_COMMAND, *args, "--json"],
        capture_output=True, text=True, timeout=20,
    )
    if result.returncode:
        raise RuntimeError(result.stderr.strip() or result.stdout.strip())
    receipt = json.loads(result.stdout)
    if not receipt.get("ok"):
        raise RuntimeError("Orca did not return a successful receipt")
    return receipt


def inventory():
    receipt = orca("terminal", "list")
    result = receipt["result"]
    if result.get("truncated"):
        raise RuntimeError("Terminal inventory is incomplete; refusing discovery")
    return receipt["_meta"]["runtimeId"], result["terminals"]


def own_handle():
    handle = os.environ.get("ORCA_TERMINAL_HANDLE")
    if not handle:
        # An unqualified terminal-show can select the active pane in this CLI.
        # That is not proof of the caller when several sessions share a checkout.
        raise RuntimeError("ORCA_TERMINAL_HANDLE is missing; cannot prove the caller")
    return handle


def current_run(handle, runtime_id):
    receipt = orca("orchestration", "run-current", "--from", handle)
    if receipt["_meta"]["runtimeId"] != runtime_id:
        raise RuntimeError("Orca runtime changed during registration; retry discovery")
    run = receipt["result"].get("run")
    if run and run["coordinator_handle"] != handle:
        raise RuntimeError("Bound Run does not belong to this terminal")
    return run


def verify(binding, runtime_id, terminals):
    if binding["schemaVersion"] != 2:
        raise RuntimeError("A schemaVersion 2 address with a bound Run is required")
    if binding["runtimeId"] != runtime_id:
        raise RuntimeError("Orca runtime changed; the role owner must register again")
    matches = [t for t in terminals if t["handle"] == binding["terminalHandle"]]
    if len(matches) != 1:
        raise RuntimeError("Registered address is unavailable or ambiguous")
    terminal = matches[0]
    for field in ("incarnationId", "worktreeId", "executionHostId", "agentIdentity"):
        if terminal.get(field) != binding[field]:
            raise RuntimeError(f"Registered {field} changed; the role owner must register again")
    if Path(terminal.get("worktreePath", "")).resolve() != Path(binding["workspacePath"]).resolve():
        raise RuntimeError("Registered workspace does not match the terminal")
    if not terminal.get("connected") or not terminal.get("writable"):
        raise RuntimeError("Registered terminal is not connected and writable")
    run = current_run(binding["terminalHandle"], runtime_id)
    if not run or run["id"] != binding["runId"] or run["consumer_generation"] != binding["consumerGeneration"]:
        raise RuntimeError("Registered Run binding changed; the role owner must register again")


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("action", choices=("register", "resolve"))
    parser.add_argument("role", choices=("tutor", "todo"))
    parser.add_argument("--replace", action="store_true",
                        help="Replace another terminal's tutor address after explicit role transfer")
    args = parser.parse_args()
    if args.action == "register" and args.role != "tutor":
        raise RuntimeError("Only the tutor's own address can be registered here")
    path = REGISTRY / "tutor.json" if args.role == "tutor" else TODO_ADDRESS
    runtime_id, terminals = inventory()

    if args.action == "resolve":
        binding = json.loads(path.read_text())
        if binding["role"] != args.role:
            raise RuntimeError("Registration does not match the requested role")
        if args.role == "tutor" and Path(binding["workspacePath"]).resolve() != ROOT.resolve():
            raise RuntimeError("Tutor registration belongs to a different checkout")
        verify(binding, runtime_id, terminals)
        print(json.dumps(binding, ensure_ascii=False, indent=2))
        return

    if Path.cwd().resolve() != ROOT.resolve():
        raise RuntimeError("Register from the tutor's own checkout directory")
    handle = own_handle()
    candidates = [t for t in terminals if t["handle"] == handle]
    if len(candidates) != 1:
        raise RuntimeError("Own terminal is not uniquely present in Orca inventory")
    terminal = candidates[0]
    if terminal.get("agentIdentity") != "codex" or terminal.get("executionHostId") != "local":
        raise RuntimeError("This registration supports local Codex tutor terminals only")
    if Path(terminal.get("worktreePath", "")).resolve() != ROOT.resolve():
        raise RuntimeError("Own Orca workspace does not match this checkout")
    run = current_run(handle, runtime_id)
    if not run:
        raise RuntimeError("No Run bound to this terminal; establish its own Run first")
    binding = {
        "schemaVersion": 2, "role": "tutor", "workspacePath": str(ROOT),
        "runtimeId": runtime_id, "terminalHandle": handle,
        **{field: terminal[field] for field in
           ("incarnationId", "worktreeId", "executionHostId", "agentIdentity")},
        "runId": run["id"], "consumerGeneration": run["consumer_generation"],
        "registeredAt": datetime.now(timezone.utc).isoformat(),
    }
    verify(binding, runtime_id, terminals)
    if path.exists():
        old = json.loads(path.read_text())
        same = all(old.get(k) == binding[k] for k in
                   ("runtimeId", "terminalHandle", "incarnationId"))
        if not same and not args.replace:
            raise RuntimeError("Tutor already registered elsewhere; explicit transfer needs --replace")
    REGISTRY.mkdir(parents=True, exist_ok=True)
    temp_path = None
    try:
        with tempfile.NamedTemporaryFile(mode="w", dir=REGISTRY, delete=False) as output:
            temp_path = Path(output.name)
            json.dump(binding, output, ensure_ascii=False, indent=2)
            output.write("\n")
        os.replace(temp_path, path)
    finally:
        if temp_path is not None and temp_path.exists():
            temp_path.unlink()
    print(json.dumps(binding, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    try:
        main()
    except (RuntimeError, KeyError, TypeError, ValueError, OSError, subprocess.TimeoutExpired) as error:
        raise SystemExit(f"Registration unavailable: {error}")
