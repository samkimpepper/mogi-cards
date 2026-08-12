---
id: postmortem-temp-harness-review-retrieval-gap
title: "세션 스냅샷 — 주말 PR 복기 + 하네스 점검 + tag-컬럼 ROI 측정 + retrieval 갭 발견"
type: postmortem
date: 2026-06-29
context: 모기가 주말에 올린 PR 3개(#282/#283/#284) 복기로 시작 → #276 jargon 댓글 게시 → #134 close + 하네스 점검 → glossary 위치 논의 → Context.md staleness + 감지훅 설계 → 도메인 용어 retrieval 히트율 2-호스트 측정 → 추천 전 .planning retrieval 갭 발견. 긴 세션이라 스냅샷.
audience: 주니어 개발자
length: 세션 스냅샷 (정식 회고 아님 — temp/)
created_at: 2026-06-29
created_by: samkimpepper
updated_at: 2026-06-29
updated_by: "Claude"
status: draft
tags: [postmortem, handoff, harness, retrieval, discussion, context-staleness, glossary]
relations:
  - .planning/seeds/SEED-009-policy-conflict-and-decisions-infra.md
  - .planning/seeds/SEED-004-comparison-axis-texture-finish.md
  - .agent/Context.md
  - docs/wiki/postmortem/temp/2026-06-27-discussion-sweep-276-281.md
---

# 세션 스냅샷 — 하네스 점검 + retrieval 갭

## 한 줄

주말 PR 3개 복기에서 출발해 Discussion 두 개(#276 댓글, #134 close)를 처리하고, 하네스 상태를 점검하다가 "에이전트가 추천하기 전에 기존 파킹된 사고(.planning)를 retrieval 안 한다" 는 구조 갭을 발견. 같은 세션에서 도메인 용어 retrieval 히트율을 2개 호스트로 측정.

## 한 일 (순서)

1. **주말 PR 3개 복기** — #282(skill-inventory), #283(Dorito 42 PLAN 피드백 원문), #284(Discussion #275~281 실측 스윕). 셋 다 코드 변경 0, 6/26 Dorito 42 PLAN 리뷰가 한 뿌리.
2. **#276 jargon 댓글 게시** — subject source/target/canonical 모호성을 발색 예시로 풀이 + "이미 assessment repo 에서 subjectSlug 로 해결, 남은 건 전파" 프레이밍. (discussioncomment-17465202)
3. **#134 close + 하네스 점검** — `/memory-status` + `verify-agent-ssot.sh`. 결정 반영 확인(4슬롯·D-083·B3·D2) 후 close. verify FAIL 2개는 Windows symlink 가짜양성(postmortem 047).
4. **glossary 위치 논의** — 코드 jargon glossary 는 wiki(또는 .agent) 에 두되 자동로드 X + Context.md 포인터 한 줄 추천. 제품 glossary(Context 자동로드)와 분리.
5. **Context.md staleness + 감지훅 설계** — 아래 별도 절.
6. **tag/관계 컬럼 ROI 측정** — 아래 별도 절.
7. **retrieval 갭 발견** — 아래 별도 절.

## 측정 결과 — tag/관계 컬럼 ROI (보존)

Discussion #281 c(Dorito): "decisions README 표에 태그/대체관계 컬럼 추가? KV 캐싱 히트율 관점에서 고민." → 측정으로 답함.

12개 도메인 용어를 2개 조건에 던짐:

- **맨몸 서브에이전트**(Context 자동로드 없이 repo grep): 11 Hit + 1 Partial(WAC 약어 지어냄) / 12.
- **codex**(Context 자동로드 낀, 모기가 자유질문 5개): 5/5 Hit, 출처 정확.

함정 4개(번복 undertone·rename dupe_pairs·존재안함 classifyDataError·이동 finish) 를 **두 호스트 다 관계 컬럼 없이** 잡음 — D-NNN 본문·audit_log·마이그를 직접 읽어 추적.

결론:
- **tag/관계 컬럼 = 검색 히트율 안 올림 → 저ROI.** 생성기 신규 구축(아직 미존재, 표는 현재 수기 유지 — Dorito "커밋 훅 걸어둠" 은 기억 착오) 비용 대비 가치 낮음.
- 자동로드 가치는 **glossary 류 압축 지식에서만** 드러남(WAC 만 맨몸에서 삐끗). 단 codex 에 WAC 미테스트라 반쪽 증거 — 다음에 codex 에 "WAC?" 하나 던지면 닫힘.

## Context.md staleness — 무방비 + 감지훅 설계

실측: Context.md `updated: 2026-06-01`(28일), 결정 테이블이 D-092 에서 멈춤(실제 D-112, 20개 뒤처짐), Active Projects 도 옛 sprint(27~35_plan), Key People 에 블민 아직 현역(2026-05-17 떠남). decisions README 자체는 D-112 정합(D-105).

Dorito(#281 b): staleness 관리 시스템 무방비(임시 90일). 실시간 자동동기화는 불신("모든 기록에 사람 개입").

설계한 해법:
- **B(구조)**: Context 에서 휘발성 정보(결정 테이블·Active Projects)를 손유지 대신 포인터로 빼서 낡을 거리를 줄임. 안 변하는 것만 남김.
- **A(감지)**: SessionStart 훅이 staleness 감지(updated 나이 + Context max-D vs 실제 max-D) → `[AGENT-ASK]` 한 줄 출력 → 에이전트가 첫 턴에 "갱신할까?" 물음 → 모기 승인 → 에이전트가 기계적 갱신. 훅은 파일 안 건드림(human-in-loop 유지). 별도 cron 불필요.

## 발견 — 추천 전 .planning retrieval 갭

모기가 codex 에 "비교축에 제형 추가?" 물음. codex 는 ADR(D-112·D-097·D-109)·코드만 읽고 추천했는데, 모기가 이미 같은 주제로 `.planning/seeds/SEED-004` 에 긴장 3개 + 옵션 3개를 파킹해둠. codex 는 SEED-004 를 안 보고 같은 결론에 도착(수렴 = 결정 일관성 좋은 신호).

문제: 에이전트가 **decisions/code 레이어는 쳤는데 .planning(파킹된 사고) 레이어를 건너뜀.** "should-we" 열린 질문의 prior art 는 .planning 에 사는데. 이번엔 수렴했지만, SEED-004 에 ADR 엔 없는 새 근거가 있었으면 통째로 놓쳤을 것.

- 이건 #282(harness-vs-existing-skills)의 **재발명 패턴 재현** — 토픽만 다름.
- Claude(나)도 같은 세션에서 .planning 안 보고 "충돌이다" 라고 앞서감 → codex 만의 문제 아니라 구조 갭.
- 고칠 방향: **"추천 전 retrieval" 규칙** — 열린/should-we 질문엔 `.planning/{seeds,todos,threads}` + 열린 ADR 을 토픽 키워드로 먼저 grep → 기존 거 surface 후 의견. using-superpowers 의 프로젝트-artifact 버전. 부분 기계화 가능(키워드 grep). 자리 = Instructions.md 규칙 또는 .agent/workflow, #282 결론과 한 묶음.

## 열린 것 / 다음 세션 액션

1. **is_dupe vs D-112 정책 충돌(#281 a)** — 모기 직접 결정(폐기/대체/일부도입). Dorito 가 넘김. 닫히면 ADR.
2. **Context.md 갱신(B)** — 블민(사실오류) → 결정 테이블 D-112 → 현재 sprint 42-xx → 날짜. 의미 바뀌는 문서라 승인 후. 미착수.
3. **Context staleness 감지훅(A)** — Dorito 영역(훅 추가), 에이전트가 갱신 실행.
4. **glossary** — wiki(또는 .agent) + Context 포인터 추천. 유지 주체·갱신 트리거 미정 → thread 파킹.
5. **제형 비교축(SEED-004)** — codex·seed 둘 다 B(속성처리)/C(보류) lean. 도메인 결정이라 모기 몫.
6. **"추천 전 .planning retrieval" 규칙** — Instructions/.agent workflow 후보. #281/#282 근거로.
7. **tag/관계 컬럼** — 측정상 저ROI. 안 만드는 쪽 + 근거를 #281 c 댓글로(모기 직접).

## 메모

- 댓글 게시: #276(완료), #134 close(완료), #281 a~e·c 답(모기 직접 진행 중).
- 이 세션 패턴: 매 단계 코드·라이브 grep 으로 grounding → "이미 됨 vs 진짜 갭" 분리. 추상 논쟁 회피(2026-06-27 스윕 세션과 같은 결).
