---
reviewed: false
status: pilot
planned_sessions: 2
completed_sessions: 0
remaining_sessions: 2
---

# Codex native compaction 자연 상태 관찰

## 목적

저컨텍스트 비율 경고와 rolling checkpoint 없이, 기존 `SessionStart` 훅과 Codex의
native compaction만으로 과외 연속성이 유지되는지 다음 Codex 과외 세션 2회 동안 본다.
경고 훅과 compaction이 이미 발생한 2026-08-21 현재 세션은 baseline에 넣지 않고,
철회 뒤 새로 시작하는 과외 세션부터 `0/2`로 센다.

## 두 세션 동안 하지 않는 것

- transcript의 비공개 `token_count` 이벤트를 읽어 남은 비율을 경고하지 않는다.
- compaction을 세션 종료로 취급하지 않는다.
- compaction을 예상해 중간 관찰일지나 복구 checkpoint를 선제 생성하지 않는다.
- JSONL을 자동으로 다시 읽지 않는다.
- 모기의 반응 없이 rolling checkpoint 파일럿으로 자동 승격하지 않는다.

## 그대로 유지하는 것

- `SessionStart(startup|resume|clear|compact)` 훅은 과외 지시와 최신 누적 검토를 다시
  제공한다.
- compaction 뒤에는 native compact 상태를 이어서 과외를 계속한다.
- 모기가 진짜 세션 종료를 알렸을 때만 기존 규칙대로 session-end observation을 쓴다.

## 카운트와 기록

- 모기가 종료를 알린 Codex 과외 세션마다 최대 1회만 센다.
- compaction이 없었다면 `없음`, 있었지만 모기가 연속성 이상을 말하지 않았다면
  `사용자 보고 없음`으로 적는다. 과외냥이가 손실이 없었다고 대신 판정하지 않는다.
- 모기가 이전 질문·근거 위치·작업 상태가 사라졌다고 느낀 경우 그 표현과 실제 복구
  행동만 적는다.
- 2회를 채운 뒤에도 이상 보고가 없으면 별도 checkpoint를 만들지 않는다. 이상이
  있었다면 그때 모기와 rolling checkpoint 파일럿 도입 여부를 검토한다.

## 실행 기록

아직 실행 없음.
