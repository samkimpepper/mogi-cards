#!/usr/bin/env python3
"""Pilot discovery, event routing and evidence-backed, idempotent recording.

Examples:
  python3 scripts/pilots.py status
  python3 scripts/pilots.py due --event review
  python3 scripts/pilots.py due --event test-request --requested
  python3 scripts/pilots.py record explanation-depth-and-jargon --key PR40-P1 \
      --result completed --evidence raw/session.md --note '실제 설명과 사용자 반응'

Definitions and counters stay in the existing pilot files. This program does not
infer that an explanation/audit/test actually happened from a matching event.
"""

import argparse
import fcntl
import hashlib
import json
import os
from pathlib import Path
import re
import sys
import tempfile
import unicodedata
from datetime import datetime, timezone

ROOT = Path(__file__).resolve().parents[1]
# Existing definitions predate an event field. New files can specify `event`
# and `requires_request` in their own frontmatter; unknown files remain visible.
LEGACY_EVENTS = {
    "raw-diff-contact": ("diff", False),
    "discovery-dedupe-gate": ("memo", False),
    "native-compaction-baseline": ("session-end", False),
    "reference-completeness-audit": ("code-note", False),
    "invalid-input-and-broken-tool-tests": ("test-request", True),
    "explanation-depth-and-jargon": ("review", False),
}
EVENTS = ("review", "diff", "code-note", "session-end", "test-request", "memo")
TERMINAL = {"completed", "awaiting-review", "paused", "retired"}
# These are retrieval hints, not an intent classifier. In particular, a mention
# of tests is never equivalent to the explicit request required by that pilot.
PROMPT_SIGNALS = {
    "review": r"(?<![a-z0-9_])pr(?=$|[^a-z])|리뷰|jargon|자곤",
    "diff": r"(?<![a-z])diff(?![a-z])|디프|코드\s*(?:차이|변경|전후)|변경\s*전후",
    "code-note": r"(?:코드|diff|디프)\s*(?:학습\s*)?(?:노트|해설)|해설\s*(?:노트|파일)",
    "session-end": r"(?:세션|과외).{0,12}(?:종료|끝|마무리)|오늘.{0,12}(?:여기까지|그만)"
                   r"|다\s*(?:봤|끝)|끝났|마무리|끝내자|마치자|종료하자",
    "test-request": r"(?<![a-z])(?:tdd|tests?|testing)(?![a-z])|테스트|시험|(?:틀린|잘못된)\s*입력",
    "memo": r"마스터\s*메모|전달용\s*메모|마스터.{0,12}전달",
}


def metadata(text):
    match = re.match(r"\A---\n(.*?)\n---(?:\n|$)", text, re.S)
    if not match:
        raise ValueError("frontmatter가 없음")
    values = {}
    for line in match[1].splitlines():
        if not line.strip() or line.lstrip().startswith("#"):
            continue
        key, sep, value = line.partition(":")
        if not sep or key in values:
            raise ValueError("잘못되거나 중복된 frontmatter")
        values[key] = value.strip()
    return values


def inspect(path, root):
    text = path.read_text(encoding="utf-8")
    info = {"id": re.sub(r"^\d{4}-\d{2}-\d{2}-", "", path.stem),
            "path": path.relative_to(root).as_posix(), "issues": []}
    try:
        meta = metadata(text)
        info["status"] = meta.get("status", "unknown")
        event, requested = LEGACY_EVENTS.get(info["id"], (None, False))
        info["event"] = meta.get("event", event)
        info["requires_request"] = meta.get("requires_request", str(requested)).lower() == "true"
        if info["event"] not in EVENTS:
            info["issues"].append("적용 사건 미등록: event를 정해야 함")
        if info["status"] not in {"pilot"} | TERMINAL:
            info["issues"].append("알 수 없는 상태")
        info.update(unit=None, completed=None, planned=None, count_key=None)
        for unit, planned_key, count_key in (
            ("cases", "planned_cases", "completed_cases"),
            ("sessions", "planned_sessions", "completed_sessions"),
            ("runs", "planned_runs", "completed_runs"),
            ("runs", "prospective_runs", "completed_runs"),
        ):
            if planned_key not in meta and count_key not in meta:
                continue
            if planned_key not in meta or count_key not in meta:
                # prospective_runs is the older name of planned_runs.
                if planned_key == "planned_runs" and "prospective_runs" in meta:
                    continue
                raise ValueError("계획·완료 카운터가 한 쌍이 아님")
            if not meta[planned_key].isdigit() or not meta[count_key].isdigit():
                raise ValueError("횟수는 0 이상의 정수여야 함")
            planned, completed = int(meta[planned_key]), int(meta[count_key])
            if planned < 1 or completed > planned:
                raise ValueError("계획 횟수 또는 완료 횟수 범위 오류")
            remaining_key = "remaining_" + unit
            if remaining_key in meta and meta[remaining_key] != str(planned - completed):
                raise ValueError("남은 횟수 불일치")
            info.update(unit=unit, completed=completed, planned=planned, count_key=count_key)
            break
        if info["planned"] is None:
            info["issues"].append("명시적 카운터 없음: 과거 기록을 추측해 집계하지 않음")
        exhausted = info["planned"] is not None and info["completed"] >= info["planned"]
        info["available"] = info["status"] == "pilot" and not exhausted and not info["issues"]
        if info["status"] == "pilot" and exhausted:
            info["issues"].append("횟수 도달: 적용 중단·사후 검토 필요")
    except (ValueError, UnicodeError) as exc:
        info.update(status="invalid", available=False, event=None, requires_request=False,
                    completed=None, planned=None, unit=None, count_key=None)
        info["issues"].append(str(exc))
    return info


def inventory(root):
    return [inspect(path, root) for path in sorted((root / "harness/pilots").glob("*.md"))]


def due(root, event, requested=False):
    # A full diff lesson is also an explanation; the reverse is not automatic.
    matching_events = {event, "review"} if event == "diff" else {event}
    items = inventory(root)
    return {
        "due": [item for item in items if item["available"] and item["event"] in matching_events
                and (requested or not item["requires_request"])],
        "attention": [item for item in items if item["issues"] and item["status"] not in TERMINAL],
    }


def prompt_context(root, prompt):
    """Return a read-only reminder for this message; no persisted conversation state."""
    normalized = unicodedata.normalize("NFKC", prompt).casefold()
    signals = {}
    for event, pattern in PROMPT_SIGNALS.items():
        matches = list(dict.fromkeys(re.findall(pattern, normalized)))
        if matches:
            signals[event] = [match[:40] for match in matches[:3]]
    if not signals:
        return ""
    # A diff lesson is also a review explanation; report its original signal.
    if "diff" in signals and "review" not in signals:
        signals["review"] = signals["diff"]
    lines = []
    for item in inventory(root):
        if item["event"] not in signals or item["status"] in TERMINAL:
            continue
        if not item["available"] and not item["issues"]:
            continue
        count = (f'{item["completed"]}/{item["planned"]} {item["unit"]}'
                 if item["planned"] is not None else "횟수 미정")
        matched = json.dumps(signals[item["event"]], ensure_ascii=False)
        state = "후보" if item["available"] else "확인 필요·적용 보류"
        lines.append(f'- {state}: {item["path"]} · {count} · 걸린 표현={matched}')
        if item["requires_request"]:
            lines.append("  사용자 실제 요청 확인 필요. 키워드 언급은 요청 승인이 아니며 --requested를 자동으로 붙이지 않는다.")
        if item["issues"]:
            lines.append("  이유: " + "; ".join(item["issues"]))
    if not lines:
        return ""
    return "\n".join([
        "## 이번 메시지의 파일럿 후보 — 키워드 검색 알림",
        *lines,
        "키워드는 적용·종료 의도의 판정이 아니다. 대화 문맥으로 관련성을 판단하고, 관련 후보의 원문 추가 조건을 확인한다.",
        "일반 용어 질문·인용·부정·운영 대화에는 파일럿을 자동 적용하지 않는다. PR 마무리와 세션 종료를 구분한다.",
        "이 알림은 조회만 수행했다. 실행·기록·횟수 증가는 하지 않았다. 실제 수행과 근거를 확인한 뒤에만 record한다.",
        "같은 사건의 후속 질문은 같은 건이며, 세션 단위는 같은 세션 키를 쓴다. 키워드 없는 후속 말은 앞 대화와 연결한다.",
        "알림이나 깊이 선택 질문을 매번 모기에게 보여줄 필요는 없다. 모기의 현재 질문부터 답한다.",
    ])


def prompt_hook(root, payload):
    """Codex UserPromptSubmit JSON output; failures must never block tutoring."""
    response = {"continue": True}
    try:
        if not isinstance(payload, dict):
            raise ValueError("hook payload가 객체가 아님")
        if payload.get("hook_event_name") != "UserPromptSubmit":
            return response
        prompt = payload.get("prompt")
        if not isinstance(prompt, str):
            raise ValueError("UserPromptSubmit prompt가 문자열이 아님")
        context = prompt_context(root, prompt)
        if context:
            response["hookSpecificOutput"] = {
                "hookEventName": "UserPromptSubmit", "additionalContext": context,
            }
    except (ValueError, OSError, UnicodeError) as error:
        response["systemMessage"] = "파일럿 후보 조회 실패(대화 계속): " + str(error)
    return response


def replace_meta(text, key, value):
    match = re.match(r"\A---\n(.*?)\n---(?:\n|$)", text, re.S)
    block, changed = re.subn(r"(?m)^" + re.escape(key) + r":.*$", f"{key}: {value}", match[1])
    if changed != 1:
        raise ValueError(f"갱신할 메타데이터가 없음: {key}")
    return text[:match.start(1)] + block + text[match.end(1):]


def atomic_write(path, text):
    fd, temporary = tempfile.mkstemp(prefix=".pilot-", dir=path.parent)
    try:
        with os.fdopen(fd, "w", encoding="utf-8") as out:
            out.write(text)
            out.flush()
            os.fsync(out.fileno())
        os.chmod(temporary, path.stat().st_mode & 0o777)
        os.replace(temporary, path)
    finally:
        if os.path.exists(temporary):
            os.unlink(temporary)


def record(root, pilot_id, key, result, evidence, note, requested=False):
    if not key.strip() or not note.strip():
        raise ValueError("실제 사건 키와 결과 설명이 필요함")
    proof = (root / evidence).resolve()
    if not proof.is_relative_to(root.resolve()) or not proof.is_file() or proof.stat().st_size == 0:
        raise ValueError("이 공책 안에 존재하는 근거 파일이 필요함")
    digest = hashlib.sha256(key.encode()).hexdigest()
    marker = f"<!-- pilot-run:{digest}:{result} -->"
    completed_marker = f"<!-- pilot-run:{digest}:completed -->"
    lock_dir = root / ".local"
    lock_dir.mkdir(exist_ok=True)
    with (lock_dir / "pilots.lock").open("a") as lock:
        fcntl.flock(lock, fcntl.LOCK_EX)
        matches = [item for item in inventory(root) if pilot_id in (item["id"], Path(item["path"]).stem)]
        if len(matches) != 1:
            raise ValueError("파일럿 ID가 없거나 하나로 정해지지 않음")
        item = matches[0]
        path = root / item["path"]
        text = path.read_text(encoding="utf-8")
        if marker in text or completed_marker in text:
            return {"recorded": False, "reason": "already-recorded", "pilot": item}
        if item["status"] != "pilot":
            raise ValueError("종료·검토 대기·미확인 상태의 파일럿에는 기록할 수 없음")
        if item["requires_request"] and not requested:
            raise ValueError("이 파일럿은 사용자의 실제 요청 확인(--requested)이 필요함")
        if result == "completed" and not item["available"]:
            raise ValueError("적용 가능 상태가 아님: " + "; ".join(item["issues"]))
        if result == "completed":
            count = item["completed"] + 1
            text = replace_meta(text, item["count_key"], count)
            if "remaining_" + item["unit"] in metadata(text):
                text = replace_meta(text, "remaining_" + item["unit"], item["planned"] - count)
            if count == item["planned"]:
                text = replace_meta(text, "status", "awaiting-review")
            # Remove only present-tense empty-log placeholders, never past entries.
            text = re.sub(r"(?m)^아직 (?:적용 기록|실행) 없음\.[^\n]*\n?", "", text)
        stamp = datetime.now(timezone.utc).isoformat(timespec="seconds")
        text = text.rstrip() + f"\n\n{marker}\n### {stamp} · {key}\n\n"
        text += f"- 결과: {result}\n- 근거: {proof.relative_to(root.resolve()).as_posix()}\n"
        text += "- 기록: " + note.replace("\n", "\n  ") + "\n"
        atomic_write(path, text)
        return {"recorded": True, "pilot": inspect(path, root)}


def hook_text(root):
    lines = ["## 파일럿 현황 — scripts/pilots.py가 원문에서 조회함"]
    for item in inventory(root):
        count = (f'{item["completed"]}/{item["planned"]} {item["unit"]}'
                 if item["planned"] is not None else "횟수 미정")
        issues = "; ".join(item["issues"])
        lines.append(f'- {item["path"]}: {item["status"]}, {count}, event={item["event"]}'
                     + ("; 요청할 때만" if item["requires_request"] else "")
                     + (f"; 확인 필요: {issues}" if issues else ""))
    lines += [
        "PR·리뷰 설명 전: python3 scripts/pilots.py due --event review",
        "실제 diff 과외 전: due --event diff / 여러 층 코드 노트 작성 시: due --event code-note",
        "모기가 세션 종료를 알렸을 때: due --event session-end",
        "테스트 요청 파일럿을 실제 요청받았을 때만: due --event test-request --requested",
        "due에 나온 원문만 읽고 해당 정의의 추가 조건을 확인한다. 모든 파일럿을 일괄 실행하지 않는다.",
        "실제 실행 뒤 record <id> --key <고유 사건/세션 키> --result completed --evidence <공책 근거 파일> --note <실제 결과>로 기록한다.",
        "조건에 맞았지만 못 했으면 --result skipped 또는 blocked로 이유를 기록한다(횟수 증가 없음).",
        "record는 동일 키 중복을 막고, 횟수 도달 시 awaiting-review로 바꾼다. 세션 단위는 동일 세션 키를 쓴다.",
        "주의: due는 실제 수행·성공의 증거가 아니다. 독립 감사 보고·사용자 반응·시험 실행 등 원문이 요구하는 근거가 있어야 completed로 기록한다.",
        "확인 필요 항목을 자동 실행/종료/승격하거나 과거 횟수를 추측해 채우지 않는다.",
    ]
    return "\n".join(lines)


def main():
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    subs = parser.add_subparsers(dest="command", required=True)
    status = subs.add_parser("status", help="모든 파일럿과 누락·종료 상태 조회")
    status.add_argument("--for-hook", action="store_true")
    subs.add_parser("prompt-hook", help="UserPromptSubmit stdin을 읽어 파일럿 후보만 알림")
    select = subs.add_parser("due", help="사건과 요청 여부에 맞는 파일럿만 조회")
    select.add_argument("--event", choices=EVENTS, required=True)
    select.add_argument("--requested", action="store_true")
    write = subs.add_parser("record", help="실제 근거와 결과 기록; 미실행은 집계하지 않음")
    write.add_argument("pilot")
    for field in ("key", "evidence", "note"):
        write.add_argument("--" + field, required=True)
    write.add_argument("--result", choices=("completed", "skipped", "blocked"), required=True)
    write.add_argument("--requested", action="store_true")
    args = parser.parse_args()
    if args.command == "prompt-hook":
        try:
            output = prompt_hook(ROOT, json.load(sys.stdin))
        except (ValueError, OSError, UnicodeError) as error:
            output = {"continue": True, "systemMessage": "파일럿 후보 입력 오류(대화 계속): " + str(error)}
    elif args.command == "status":
        output = hook_text(ROOT) if args.for_hook else inventory(ROOT)
    elif args.command == "due":
        output = due(ROOT, args.event, args.requested)
    else:
        output = record(ROOT, args.pilot, args.key, args.result, args.evidence, args.note, args.requested)
    print(output if isinstance(output, str) else json.dumps(output, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    try:
        main()
    except (ValueError, OSError) as error:
        print(f"pilots: {error}", file=sys.stderr)
        sys.exit(1)
