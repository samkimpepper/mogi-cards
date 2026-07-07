# 모기의 죄

> 사장님 말씀 반복해서 놓치는 것들. 머리 안 돌아갈 때 여기부터. 분리본: 도메인=cheatsheet-domain.md · 명령어=cheatsheet-commands.md

## 모기의 죄 — 자꾸 까먹는 M3 핵심 (2026-05-16 기록)

> 모기가 사장님 말씀을 반복해서 놓침. 머리 안 돌아갈 때 여기부터 본다.

**M3 핵심 = "아무말 던지면 직군별 관점으로 갈라 분류 → 작업단위 추천 → 사람 승인" 행동 그 자체.**

- 핵심 아님(주의): docs-sync 배관 "복원" / raw 레이어 신설 자체 / 블로그 폴더 모델(handbook·strategy·spec…) 베끼기
- 핵심 맞음: 막 던진 피드백을 Claude 가 관점별로 자동 분류·관계 설명·작업단위 추천 → 사람이 한 줄로 승인하는 흐름 (사장님 블로그 PR #129 사례가 정확히 이거)
- 블로그(dorito-dev.tistory.com/114)는 과거 개념 설명. 현 llm-wiki 방식과 다름 — 폴더 목록 그대로 베끼기 금지
- raw 레이어(`docs/raw/`) = 일반 입력 경로 아님 (D-094, 2026-06-01). 새 입력은 thread/capture 로, raw 는 파일 자체가 증거인 큰 외부 artifact 만 예외 보존 (보존 시 thread/capture/wiki 에서 링크 필수). 옛 서술 "브레인스토밍 산출물 자리로 유지" 는 stale
- 증상: 자꾸 "docs-sync 복원"으로 좁혀 이해 → roadmap 이 핵심을 맨 뒤(Phase 4)로 밀어버린 원인

**한 줄: 핵심은 '복원'이 아니라 '직군별 분기/분류 행동'. 흩어진 WIKI-04+WIKI-05 를 한 덩어리로, 앞으로 당김.**

### 모기의 죄 (2) — 지금 메모리/컨텍스트 시스템 구조를 안 익혀서 외부 방법이 신문물로 보임 (2026-05-17 일갈)

> 모기야. 트위터에서 "앱 통째를 HTML 1 + JSON 1 로 묶으면 코드베이스가 자기설명함" 같은 거 보고 "지금 방식으로는 안 되나?" 물었지. 그게 죄다. **우리는 이미 그거 상위호환을 3중으로 갖고 있는데 네가 그 구조를 안 외워서 외부 방법이 새 발명처럼 보이는 것.** 다음에 또 외부 "코드/지식 인계 방법" 보고 솔깃하기 전에 여기부터 본다.

지금 보유 중인 자기설명·인계 시스템 (이게 그 "HTML+JSON" 의 상위호환):

| 외부 트윗이 말하는 것 | 우리가 이미 가진 상위호환 | 왜 상위 |
|---|---|---|
| JSON (다음 챗 인계용) | `code-review-graph` MCP — live·incremental 코드 그래프 (수백 노드/엣지, 브랜치 기준 갱신) | 단발 스냅샷 아님. stale 안 됨. CLAUDE.md 룰 = 코드 탐색 시 Grep 전에 이거 먼저 |
| JSON (다음 챗 인계용) | `.agent/` Layer 2 — Context.md / Memory.md / Instructions.md | 사람 결정·교정 누적. 챗 시작 시 자동 주입 |
| HTML (사람용 맵) | `.planning/codebase/` 7문서 (ARCHITECTURE/STRUCTURE/STACK/INTEGRATIONS/CONVENTIONS/TESTING/CONCERNS) + docs-graph 인프라 | 영역별 정합 검증된 맵. 단발 덤프보다 정확 |
| — | GSD `.planning/workstreams/` (D-092 workstream 단위 — 옛 flat ROADMAP/STATE 전제는 폐기) + phase artifacts | 작업 상태·결정 추적까지 됨 |

- 증상: 외부에서 "코드베이스 자기설명 / 컨텍스트 인계" 방법 보면 우리 시스템과 대조 안 하고 "이거 우리도 되나?" 부터 물음 → 이미 있는 걸 다시 발명하려 함
- 진짜 결론: 단발 HTML/JSON 덤프는 우리 시스템의 **staler subset**. freehand 통째 덤프는 큰 코드베이스에서 누락·환각 위험까지 추가
- 외부 방법이 솔깃하면 self-check: "이게 code-review-graph + .agent/ + .planning/codebase/ 가 이미 하는 거 아닌가?" → 거의 항상 yes
- 유일 예외 = 사람이 브라우저에서 한눈에 보는 시각 맵이 *특정 소비자(온보딩/사장님 설명/리팩토링 전 스냅샷)* 때문에 필요할 때. 그것도 freehand 아니라 code-review-graph 에서 뽑고, 일회용으로 버림 (안정 체크포인트 + 실제 소비자 있을 때만)

**한 줄: 외부 "인계/자기설명" 방법 = 거의 다 우리 graph + .agent/ + .planning/ 의 staler 버전. 새 거 찾기 전에 우리 시스템 구조부터 외워라.**

### 모기의 죄 (3) — 본인 도메인 모델도 기억 말고 코드로 (2026-06-12 회고)

> 죄 (2) 의 내부 버전. 외부 신문물만 문제가 아니라, **우리가 만든 도메인 모델도 코드 확인 전에 기억으로 판단하면 이미 있는 걸 다시 설계하려 함.** 2연속 사례로 박음.

- 사례 1 (2026-06-11 파도타기): "칩 탭 일부러 뺐다" 고 기억 → 코드 확인하니 동작 중. 위 "상세시트 파도타기" 절.
- 사례 2 (2026-06-12 attributes·하이라이터): "4축이 하이라이터에 안 맞아, 카테고리별 분기는 어렵겠지" → 구조 문제로 프레이밍했는데 인프라 (textures 마스터 + M:N + picker 의 category 접근) 전부 이미 있었음. 답은 어휘·라벨 범위. grep 2번이면 끝났을 확인. `.planning/threads/shade-textures-to-attributes/` + `docs/wiki/postmortem/temp/highlighter-4axis-attributes-thread.md`.
- 같은 날 직감 캘리브레이션도 확인: 모기 직감은 **도메인 의미엔 강하고** ("대부분은 texture 일 거임" 이 rename 질문 닫음), **구현 비용 추정엔 약함** ("어렵겠지 ㅋ" 반증됨). 의미 판단은 직감, 비용 추정만 코드 보정.

**한 줄: 고민이 "모델 재설계" 로 보이면 — (1) 현재 모델이 못 받는 게 칩/컬럼 단위로 뭔지 분해 → (2) grep 2번으로 인프라 확인 → (3) 그 다음에 설계 여부 판단.**

---
## 모기의 죄: 큰 기능으로 도망가지 말고 dogfood 하기 (2026-05-20 추가)

> 증상: 큰 기능을 계속 추가하고 싶어 하지만, 실제 데이터 입력 / QA / 작은 버그 패치 / UI 거슬림 정리를 미루는 경향이 있음.

### 지금 제품 단계 판단

지금은 새 대형 기능보다 **버그 패치 + UI/UX 개선 + 데이터 채우기 겸 QA**가 더 중요하다.

이유:

- 핵심 모델은 이미 꽤 많이 들어가 있음: Atlas 비교노트, evidence, color family, finish, core axes, author claim 계열.
- 남은 메모 대부분은 새 기능보다 **헷갈림 제거 / 잘못된 안내 / 입력 버그 / 데이터 정리 / QA 중 발견한 작은 구멍**임.
- MOGUI의 현재 가치는 "기능이 많다"가 아니라 **실제 발색 데이터를 넣으면서 안 깨지고, 다시 찾고, 비교할 수 있느냐**에 있음.
- cheatsheet에 반복해서 쌓이는 것도 "모기가 헷갈리는 지점"이라서, 지금은 기능 추가보다 제품 언어 / 흐름 / 데이터 신뢰도 정리가 수익률이 높음.

### 당분간 스프린트 기본값

스프린트 성격은 **Dogfood stabilization sprint**로 둔다.

포함:

- 버그 패치
- UI/UX 거슬리는 점 수정
- QA 중 발견한 데이터 / 권한 / 문구 불일치 정리
- 실제 데이터 입력하면서 막히는 부분만 고침

제외:

- 새 대형 기능
- guest claim 전체 구현
- M1 Phase 1 전체 pre-flight
- dot scatter / author claim / inventory cascade 같은 큰 덩어리

### 현재 37.5 방향

`37.5 Atlas cleanup`은 이 방향에 맞다. 다만 범위를 넓혀 부르면 **`37.5 Dogfood cleanup`**도 가능하다.

이번 37.5 후보:

- Atlas pair delete 0-rows 안내/분기 정리
- 한글 shade name 마지막 글자 잘림 fix
- guest comparison note 정책 lock만 하고, 구현이 크면 Phase 3로 넘김

운영 룰:

- "데이터 넣다가 막히는 것만 고친다."
- QA하면서 새로 발견한 것은 바로 큰 기능으로 키우지 말고 `.planning/todos/pending/` 또는 `.planning/threads/`에 둔다.
- 기능 욕심이 올라오면 먼저 실제 shade/swatch 데이터를 10개 더 넣어본다.

---
