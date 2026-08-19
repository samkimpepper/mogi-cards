---
id: guide-mogi-read-cards
title: "모기 읽기 카드 — 긴 SPEC/PLAN을 사람이 승인 가능한 단위로 줄이는 법"
type: guide
created_at: 2026-06-25
created_by: ChatGPT
updated_at: 2026-08-12
updated_by: Codex
last_verified_at: 2026-07-04
last_verified_by: Claude
status: active
tags: [guide, agent, review, planning, approval, read-card, human-in-the-loop]
relations:
  - id: guide-mogi-subjective-understanding-checks
    label: related
  - id: guide-mogi-review-packet
    label: related
  - id: guide-execution-plan-review-patterns
    label: related
  - id: guide-code-review-patterns
    label: related
code_refs:
  - file: .planning/workstreams/
    note: "SPEC/PLAN/SUMMARY 옆에 Read Card를 inline 또는 별도 파일로 두는 실행 문서 위치 (카드 위치 SSOT)"
audit_log:
  - action: created
    at: 2026-06-25
    by: ChatGPT
    note: "긴 AI 산출물을 사람이 전부 정독하지 않아도 핵심 결정·위험·증거를 승인할 수 있도록 Read Card 운영 규칙 작성."
  - action: updated
    at: 2026-07-02
    by: Claude
    note: "첫 실전 적용(LAUNCH-03 RPC 감사 카드) 피드백 반영 — 승인부/Appendix 분리, auth 미니 glossary 고정, 숨은 변경 승격 규칙, 이해 체크(퀴즈) 운영, 질문 기록 형식."
  - action: promoted
    at: 2026-07-04
    by: Claude
    note: "docs/_personal/review-card/ 실험(LAUNCH-03 3회 실전)을 마치고 wiki guide 로 승격. status active 전환, 이해 체크 기본 방식을 주관식 가이드로 연결."
  - action: updated
    at: 2026-07-04
    by: samkimpepper
    note: "docs(wiki): 모기 리드 카드 · 주관식 이해 체크 가이드 승격"
  - action: updated
    at: 2026-08-07
    by: Codex
    note: "독립 리드 카드 맨 위에 모기 개인 머지 준비 상태를 표시하는 boolean 체크박스 1개를 추가."
  - action: updated
    at: 2026-08-12
    by: Codex
    note: "읽기 종료 reviewed와 실제 PR 머지 판단 merge_ready를 분리하고, 모기의 자연어 종료 신호를 과외 세션이 자동 기록하도록 규칙 추가."
  - action: updated
    at: 2026-08-12
    by: Codex
    note: "mogi-cards 문서의 숫자·종류 filename prefix를 없애고 폴더가 문서 종류를 표현하도록 명명 규칙 변경."
  - action: updated
    at: 2026-08-12
    by: Claude
    note: "사소하지 않은 AskUserQuestion의 질문·선택지·모기 선택·중립적인 당시 맥락을 카드에 사실 기록으로 남기는 규칙 추가."
  - action: updated
    at: 2026-08-12
    by: Codex
    note: "카드에 기록된 AskUserQuestion 선택을 정답으로 앵커링하지 않고 선택지 없는 백지 주관식으로 재검증하는 규칙 추가."
  - action: updated
    at: 2026-08-12
    by: Codex
    note: "reviewed·merge_ready의 true 전환을 과외 세션 자동 기록에서 모기 직접 관리로 변경."
  - action: updated
    at: 2026-08-12
    by: Codex
    note: "새 리드 카드에 모기가 결론의 증명 범위·미증명 범위·외부 규칙을 직접 적는 판단 틀을 추가."
---

# 모기 읽기 카드

모기 읽기 카드는 긴 SPEC/PLAN/SUMMARY를 다시 긴 쉬운 문서로 번역하지 않고, **사람이 직접 읽고 결정해야 하는 부분만 짧게 뽑아주는 카드**다.

원문 문서는 그대로 SSOT다. 읽기 카드는 SSOT가 아니라 **원문을 읽는 길잡이와 승인 체크포인트**다.

> **적용 범위**: 이 카드는 모기의 인지부채를 줄이기 위한 장치라 **모기가 승인자인 작업에만** 쓴다. **Dorito 가 승인자인 작업에는 강제하지 않는다** — Dorito 는 원문·diff 직접 리뷰 방식 그대로. Dorito 가 원하면 쓰는 건 자유.

## 왜 필요한가

AI가 만든 SPEC/PLAN은 실행 에이전트에게는 유용하지만 사람이 한 번에 읽기에는 길고 jargon이 많다. 그렇다고 전체를 쉬운 말로 다시 쓰면 문서가 두 배가 되고, 쉬운 버전이 원문과 어긋나는 새 문제를 만든다.

따라서 에이전트는 원문 전체를 다시 설명하지 말고 다음만 한다.

```text
1. 모기가 반드시 읽어야 할 결정
2. 모기가 결정해야 할 선택지
3. 원문에서 위험한 가정
4. 에이전트가 증명한 증거
5. 읽지 않아도 되는 세부
```

## 한 줄 원칙

> 긴 문서를 쉬운 긴 문서로 바꾸지 말고, 사람이 봐야 할 10~20줄짜리 카드로 줄인다.

## 카드 맨 위 상태 체크

모든 새 활성 문서는 맨 위 frontmatter에 `reviewed`를 둔다. 대상 PR이 있는 카드는 `merge_ready`도 함께 둔다. Obsidian 속성 화면에서는 체크박스로 사용한다.

```yaml
---
reviewed: false
merge_ready: false
---
```

- `reviewed: false`: 아직 모기가 이 문서를 보고 넘어가도 된다고 판단하지 않음.
- `reviewed: true`: 충분히 봤거나, 지금은 더 보지 않고 넘어가기로 모기가 결정함. PR 머지 승인 뜻은 아니다.
- `merge_ready: false`: 대상 PR에 대해 모기가 아직 머지 준비 판단을 하지 않음.
- `merge_ready: true`: 모기가 자기 기준에서 실제 머지 준비됐다고 명시적으로 판단함. GitHub의 충돌·브랜치 보호 기반 `mergeable` 판정과는 다르다.
- 두 값을 `true`로 바꾸는 일은 모기가 문서에서 직접 한다.
- 과외 세션은 종료 표현·퀴즈 완료·기술 게이트 통과·이해도 추정·머지 가능 발언을 근거로 어느 값도 자동 변경하지 않는다.
- 에이전트는 새 활성 문서를 만들 때 필요한 필드를 `false`로 초기화하고, 이후에는 상태의 의미만 설명한다.
- 새 세션은 활성 폴더마다 `reviewed: false`인 최신 문서 1개만 제시한다. `reviewed`가 없는 기존 문서는 이미 처리한 레거시로 취급한다.

## 용어

| 용어 | 뜻 |
|---|---|
| 원문 | SPEC, PLAN, SUMMARY, Travelog, diff, test result 같은 실제 산출물 |
| Read Card | 원문 옆에 붙는 짧은 사람용 읽기 카드 |
| Review Packet | PR 직전 최종 승인 문서 |
| Deviation Card | 실행 중 계획과 실제가 달라졌을 때 내는 짧은 보고 |
| SSOT | 진실의 원본. Read Card가 아니라 원문 SPEC/PLAN/ADR/SUMMARY가 맡는다 |

## 출력 태그

읽기 카드에는 아래 태그를 사용한다.

| 태그 | 의미 | 모기 행동 |
|---|---|---|
| `[READ]` | 반드시 읽어야 하는 핵심 | 직접 읽는다 |
| `[DECIDE]` | 사람이 결정해야 하는 선택 | 승인/보류/수정 중 고른다 |
| `[EVIDENCE]` | 에이전트가 확인한 증거 | 증거 강도만 확인한다 |
| `[DETAIL]` | 읽지 않아도 되는 구현 세부 | 필요할 때만 펼친다 |
| `[STOP]` | 나오면 구현을 멈춰야 하는 조건 | 발견 시 진행 중단 |
| `[FOLLOW-UP]` | 머지를 막지 않는 후속 | seed/todo/thread로 남긴다 |

## 언제 만들까

### 반드시 만든다

- 새 SPEC 작성 후
- 실행 PLAN 작성 후
- PLAN 중간에 실제 사실이 달라졌을 때
- 마이그레이션, RLS/RPC, 권한, backfill, cutover가 있을 때
- 도메인 grain, 공식/개인 판단, 자동승격, 기본값처럼 제품 의미가 바뀔 때
- PR 직전 Review Packet을 만들기 전

### 만들지 않아도 된다

- 단순 카피 수정
- 작은 CSS 변경
- 내부 이름 정리만 있고 도메인·권한·데이터 영향이 없는 변경
- 이미 Review Packet 하나로 충분한 작은 PR

## 어디에 둘까

카드는 **원문(SPEC/PLAN/SUMMARY)이 있는 `.planning` 디렉토리**에 같이 둔다 (모기 결정 2026-07-04). GSD 산출물 옆에 있어야 카드에서 나온 지적이 todo/thread 후속으로 바로 이어진다. GSD 명령은 자기가 아는 파일명만 읽으므로 카드 파일이 실행을 방해하지 않는다.

mogi-cards에 배달한 개인 공책 사본은 읽는 목적에 따라 `pr-cards/`·`plan-cards/`·`code-diff-notes/`에 둔다. 파일명은 `<날짜>-<주제>.md`로 시작하고 `0-`·`1-card-`·`2-note-` 같은 숫자·종류 prefix를 붙이지 않는다. 문서 종류는 폴더가 이미 표현한다.

1. **원문 상단의 접힌 블록** — drift가 적다. 기본값.
2. **원문 옆 별도 파일** — 카드가 길어질 때만.

머지 게이트(Review Packet)는 파일이 아니라 **PR 코멘트**로 단다 — [mogi-review-packet.md](../swatch-v2/docs/wiki/guides/mogi-review-packet.md).

예시:

```text
42-03-SPEC.md
42-03-SPEC-READ-CARD.md       # 필요할 때만

42-04-PLAN.md
42-04-PLAN-READ-CARD.md       # 필요할 때만
```

또는 원문 맨 위에:

```md
<details>
<summary>모기 읽기 카드</summary>

...card...

</details>
```

## 절대 하지 말 것

- 원문 전체를 쉬운 말로 다시 쓰지 않는다.
- 원문 내용을 복사해서 긴 요약본을 만들지 않는다.
- Read Card를 새 SSOT처럼 쓰지 않는다.
- “PASS”만 쓰고 어떤 증거로 PASS인지 생략하지 않는다.
- jargon을 다른 jargon으로 바꾸지 않는다.
- 모기가 읽지 않아도 되는 SQL/RPC 내부 구현을 길게 설명하지 않는다.
- 결정이 필요한데 “구현에서 알아서 처리”라고 넘기지 않는다.
- **덤 수정(계획에 없던 동작 변경)을 `[DETAIL]`로 내리거나 한 줄에 묻지 않는다.** 저장·권한·데이터 동작이 바뀌면 `[READ] 숨은 변경`으로 승인부에 올린다. (사례: 2026-07-02 텍스처 primary 미지정 저장 버그를 같이 고쳤는데 카드에서 한 줄에 묻혀 모기가 "왜 말을 안 해"로 잡아냄.)

---

# 카드 종류

## 1. SPEC Read Card

SPEC Read Card는 “이 모델이 제품 의미상 맞는가?”를 확인한다.

### 에이전트가 봐야 할 것

- 새로 생긴 객체의 쉬운 뜻
- 행 1개가 현실에서 무엇인지
- 기존 원칙과 충돌하는지
- 자동 생성·자동 승격·기본값이 있는지
- 일반 사용자/코어/어드민 권한 경계
- 기존 데이터 보존 여부

### 템플릿

```md
## SPEC Read Card

### [READ] 한 줄
- 이번 SPEC은 <무엇>을 <어떤 새 모델>로 정의한다.

### [READ] 새로 생긴 말
| 말 | 쉬운 뜻 | 행 1개/예시 |
|---|---|---|
| <term> | <쉬운 뜻> | <예시> |

### [READ] 모기가 확인할 도메인 경계
- 
- 
- 

### [DECIDE] 사람이 결정해야 하는 것
- [ ] 이 grain이 맞다 / 아니다
- [ ] 이 이름이 맞다 / 바꾼다
- [ ] 출시 전 범위로 넣는다 / 보류한다
- [ ] 기존 원칙과 충돌한다 / 충돌하지 않는다

### [EVIDENCE] 원문 근거
- ADR:
- SPEC section:
- 관련 코드/마이그:

### [DETAIL] 읽지 않아도 되는 구현 세부
- SQL constraint 이름
- FK 이름
- 내부 helper 이름

### [STOP] 멈출 조건
- 기존 원칙과 충돌하지만 결정이 없음
- 기존 모델로 표현 불가능한 실제 사례가 없음
- 자동승격/기본값이 잠긴 결정과 충돌
```

### 예시

```md
## SPEC Read Card — comparison_assessment

### [READ] 한 줄
- comparison_pair 아래에 comparison_assessment를 추가한다.
- assessment는 한 작성자가 한 pair를 한 관찰 맥락에서 보고 남긴 판단 묶음이다.

### [READ] 새로 생긴 말
| 말 | 쉬운 뜻 | 행 1개/예시 |
|---|---|---|
| comparison_assessment | 한 사람의 비교 판단 카드 | 사진 2장 + 거의 같은 색 + 명도/채도 판단 + 메모 |
| comparison_judgment | assessment 안의 축별 판단 | “A가 B보다 더 밝다” |
| dupe_claim | 작성자 개인의 거의 같음 판단 | 일반 유저도 저장 가능 |
| is_dupe | 서비스 공식 dupe 관계 | core/admin만 변경 |

### [READ] 모기가 확인할 도메인 경계
- dupe_claim이 저장되어도 is_dupe가 자동으로 true가 되면 안 된다.
- evidence는 swatch 1개와 그 안의 사진 N장이다.
- 같은 author+pair도 다른 관찰이면 assessment를 여러 개 남길 수 있다.
```

---

## 2. PLAN Read Card

PLAN Read Card는 “이 순서로 안전하게 만들 수 있는가?”를 확인한다.

### 에이전트가 봐야 할 것

- 실행 순서
- 위험한 단계
- 사람이 직접 해야 하는 단계
- 실제 검증 방법
- fallback/cast/skip이 있는지
- rollback/cutover 경계
- PLAN과 운영 환경이 맞는지

### 템플릿

```md
## PLAN Read Card

### [READ] 이 PLAN이 하는 일
- 

### [READ] 실행 순서, 쉬운 말로
1. 
2. 
3. 

### [READ] 위험한 단계
| 단계 | 위험 | 방어 |
|---|---|---|
| <task> | <위험> | <검증/방어> |

### [DECIDE] 사람이 해야 하는 일
- [ ] db push
- [ ] UAT
- [ ] 정책 결정
- [ ] cutover 승인
- [ ] rollback 경계 승인

### [STOP] 아래가 나오면 구현 중단
- 실제 DB default/grant/schema가 PLAN과 다름
- 타입 재생성을 못 해서 `as never`/`as any` fallback이 필요함
- preflight에서 예상 밖 legacy 데이터가 발견됨
- 권한·도메인 불변식이 깨짐
- 같은 실패가 두 번 반복됨

### [EVIDENCE] 검증 증거
- typecheck:
- build:
- SQL/integration test:
- UAT:
- visual evidence:

### [DETAIL] 읽지 않아도 되는 것
- SQL 전문
- JSX 세부 위치
- helper 내부 구현
```

### 예시

```md
## PLAN Read Card — assessment client slice

### [READ] 이 PLAN이 하는 일
- 기존 단일 axis 비교노트 폼을 assessment composer로 바꾼다.
- 공식 dupe 토글과 개인 dupe_claim 입력을 분리한다.
- 렌더를 note 행이 아니라 assessment 카드로 바꾼다.

### [READ] 위험한 단계
| 단계 | 위험 | 방어 |
|---|---|---|
| composer 저장 | 개인 dupe_claim이 공식 is_dupe를 바꿀 수 있음 | 저장 RPC가 create_comparison_assessment인지 확인 |
| 편집 | legacy NULL 판단이 more로 변할 수 있음 | legacy fallback/편집 정책 확인 |
| 삭제 | 마지막 assessment 삭제 뒤 ghost edge 가능 | pair cleanup 또는 edge 조건 확인 |
```

---

## 3. Deviation Card

Deviation Card는 실행 중 PLAN과 실제가 달라졌을 때만 만든다.

### 언제 필요한가

- 실제 DB default가 PLAN과 다름
- 실제 권한 grant가 PLAN과 다름
- 테스트가 두 번 같은 이유로 실패
- preflight 결과가 예상과 다름
- 타입 재생성 실패로 fallback이 필요해짐
- 원래 없던 migration/forward-fix가 생김
- 사람이 결정해야 하는 정책 충돌이 나옴

### 템플릿

```md
## Deviation Card

### [READ] 원래 계획
- 

### [READ] 실제 확인한 것
- 

### [READ] 왜 중요한가
- 

### [DECIDE] 제안하는 변경
- 

### [READ] 도메인 의미가 바뀌나?
- 아니오 / 예:
- 설명:

### [READ] 권한·데이터 영향
- 권한:
- 데이터:
- rollback:

### [EVIDENCE] 실측 근거
- 명령/SQL:
- 결과:
- 파일/라인:

### [DECIDE] 모기 결정
- [ ] 그대로 진행
- [ ] 다른 방식 선택
- [ ] 중단 후 재설계
- [ ] seed/todo/thread로 후속 분리
```

### 예시

```md
## Deviation Card — is_dupe default

### [READ] 원래 계획
- 신규 comparison_pair 생성 시 is_dupe는 DB default=false라고 가정했다.

### [READ] 실제 확인한 것
- 현재 DB default는 true였다.

### [READ] 왜 중요한가
- 일반 유저가 assessment를 저장했을 뿐인데 공식 dupe pair가 생길 수 있다.

### [DECIDE] 제안하는 변경
- assessment RPC의 신규 pair INSERT에서 is_dupe=false를 명시한다.
- 별도 후속으로 comparison_pairs.is_dupe default=false hardening을 검토한다.
```

---

## 4. SUMMARY Read Card

SUMMARY Read Card는 “완료됐다는 말이 무엇을 의미하는가?”를 확인한다.

### 에이전트가 봐야 할 것

- 계획과 달라진 점
- **숨은 변경 — 계획에 없던 덤 수정으로 사용자 저장·권한 동작이 바뀌었는지 (바뀌었으면 전/후 동작으로 명시)**
- 실제로 검증한 증거
- 아직 operationally pending인 것
- 타입 우회/fallback이 남았는지
- 후속이 blocker인지 seed인지
- 코드 rollback과 데이터 rollback이 다른지

### 템플릿

```md
## SUMMARY Read Card

### [READ] 완료된 것
- 

### [READ] 숨은 변경 (덤 수정)
- 없음 / 있음:
  - 전 (사용자 동작):
  - 후 (사용자 동작):

### [READ] 계획과 달라진 점
- 없음 / 있음:
  - 원래:
  - 실제:
  - 이유:
  - 영향:

### [READ] 아직 완료가 아닌 것
- 

### [EVIDENCE] 검증한 것
| 증거 | 등급 | 무엇을 증명하나 |
|---|---|---|
| tsc | 정적 검증 | 타입 오류 없음 |
| SQL test | 동작 검증 | 권한/데이터 invariant |
| UAT | 사람 검증 | 화면 경험 |

### [FOLLOW-UP] 후속
- blocker:
- non-blocking todo:
- seed/thread:

### [DECIDE] 모기 승인 필요
- [ ] complete로 봐도 됨
- [ ] cutover pending으로 봐야 함
- [ ] follow-up PR 필요
```

---

## 5. Review Packet 연결

Review Packet은 PR 직전 최종 승인 문서다.

Read Card와 Review Packet의 관계:

```text
SPEC Read Card      → 모델 의미 승인
PLAN Read Card      → 실행 순서 승인
Deviation Card      → 계획 변경 승인
SUMMARY Read Card   → 완료 의미 확인
Review Packet       → 카드 여러 장 PR 의 머지 게이트
```

경계 (모기 결정 2026-07-04): **PR 이 리드 카드 1장 범위면 그 카드가 Review Packet 을 대체한다.** 카드 여러 장에 걸친 PR 만 패킷으로 묶는다. 패킷은 앞 카드들을 다시 복사하지 않고 카드 링크·불변식 되쓰기·판정만 담는다 — [mogi-review-packet.md](../swatch-v2/docs/wiki/guides/mogi-review-packet.md).

---

# 에이전트 행동 규칙

## 원문 작성 후 반드시 카드 생성 여부 판단

에이전트가 SPEC/PLAN/SUMMARY를 작성하거나 수정한 뒤 아래를 판단한다.

```text
이 문서는 사람이 승인해야 하는 도메인·권한·데이터·cutover 결정을 포함하는가?
```

예이면 Read Card를 만든다. 아니면 생략한다.

## 카드 길이 제한

- 기본 10~20줄
- 최대 2화면
- 표는 1~2개까지만
- 세부 구현은 `[DETAIL]`로 접는다
- 예시는 1개만

## 승인부는 위, 학습 로그는 Appendix (2026-07-02 실전 피드백)

카드가 실제로 굴러가면 세 가지가 섞인다: (1) 승인용 Read Card, (2) 모기 질문/답 로그, (3) 이해 체크(퀴즈) 채점. 셋 다 가치가 있지만 **본문 중간에 섞이면 승인 판단이 흐려진다.** 승인에 필요한 핵심은 위 15줄 안에 고정하고, 나머지는 Appendix 로 내린다.

```md
# 모기 리드 리뷰 — <주제>

## 1. 승인용 요약 ([READ] 핵심 + 숨은 변경)
## 2. 직접 봐야 할 불변식
## 3. 증거 ([EVIDENCE])
## 4. 모기가 해야 할 일 ([DECIDE])
## 5. 판정 ([STOP] / [FOLLOW-UP])

---

## Appendix A. 모기 판단·승인 중 생긴 질문/답
## Appendix B. 이해 체크 (퀴즈 + 채점)
## Appendix C. 상세 SQL/함수 설명
```

## 권한(auth/RLS/RPC) 카드 고정 요소

권한을 다루는 카드에는 **Auth 용어 미니 정리 표를 항상 넣는다.** 첫 실전(LAUNCH-03)에서 핵심 오해가 전부 여기서 났다 — "게스트 = anon" 으로 잘못 알면 revoke 가 뭘 막았는지부터 어긋난다.

```md
## Auth 용어 미니 정리

| 말 | DB 입장 | 뜻 |
|---|---|---|
| anon | role = anon | 세션 없는 호출자 |
| guest | role = authenticated, is_anonymous=true | 익명 로그인 세션이 있는 사용자 |
| member | role = authenticated, is_anonymous=false | 일반 로그인 사용자 |
| admin/core | role = authenticated + 별도 권한 | 운영 권한 사용자 |
```

문장도 role 기준으로 쓴다.

```md
anon EXECUTE revoke 는 세션 없는 호출자의 함수 실행 표면을 닫는다.
guest 는 authenticated role 이므로, guest 제한은 함수 내부 is_anonymous 가드가 필요하다.
```

권한 리뷰 기본문 두 개 — 권한 카드마다 상단 근처에 상기시킨다.

```text
UI 가 안 보여주는 것과 서버가 막는 것은 다른 문제다.
anon = 세션 없음, guest = authenticated + is_anonymous=true.
```

## AskUserQuestion 결정 로그

마스터가 AskUserQuestion으로 모기에게 사소하지 않은 결정을 받으면, 특히 **도메인 결정·구현 방식·DB 관련 결정**은 그 결정이 실린 리드 카드에 아래 형식으로 기록한다. 질문과 답을 주고받아 정한 결정도 포함한다. 진행 여부 재확인 같은 사소한 확인성 질문은 제외한다.

```md
### AskUserQuestion Decision Log

- 질문: 어떤 식별자를 영속적인 소유권 기준으로 사용할까요?
- 선택지:
  1. author_handle
  2. owner_uid
  3. owner_bound_handle
  4. created_by
- 모기 선택: owner_uid
- 당시 맥락: 영속적인 소유권 기준 식별자를 정하는 질문
```

여러 질문이면 항목을 반복한다. 기록은 **질문·선택지·모기 선택·당시 맥락 한 줄이라는 사실만** 담는다. 당시 맥락은 무엇을 정하는 질문이었는지 중립적으로 쓰고, 해설·채점·결정에 대한 논평이나 결과 해석은 붙이지 않는다.

## 모기 판단 기록 틀

마스터는 모든 새 리드 카드의 Appendix에 아래 빈 틀을 넣는다. 이 틀은 에이전트가 대신 채우는 퀴즈 답안이 아니라, 모기가 자기 판단의 범위를 직접 적는 자리다.

```md
## Appendix A. 모기 판단

- 내 결론:
- 이 답이 증명하는 것:
- 아직 증명하지 않는 것:
- 확인이 필요한 외부 규칙:
```

주체·권한·값의 소유자·시점이 둘 이상이거나 상태 변경을 판단하는 카드에는 아래 네 줄도 추가한다.

```md
- 대상:
- 이벤트:
- 변경 전:
- 변경 후:
```

운영 규칙:

- 마스터는 빈 틀만 제공하고 모기의 판단을 미리 써주지 않는다.
- 모기가 답을 쓰면 원문 표현을 그대로 두거나 뜻을 바꾸지 않는 최소 정리만 한다. 장문의 해설·채점·정답 보충을 같은 항목에 붙이지 않는다.
- `확인이 필요한 외부 규칙`은 모르면 `확인 필요: <규칙>`으로 남긴다. 추측으로 빈칸을 메우지 않는다.
- 상태 전환 네 줄은 관련 있는 카드에서만 쓴다. 모든 카드에 불필요한 작성 부담을 만들지 않는다.
- AskUserQuestion 결정 로그는 과거 선택의 감사 기록이고, `모기 판단`은 현재의 독립 판단이다. 둘을 합치거나 과거 선택으로 빈칸을 미리 채우지 않는다.
- 이 기록은 승인 요약을 밀어내지 않도록 Appendix에 둔다.

## 이해 체크(퀴즈) 운영

이해 체크의 기본 방식은 **주관식 진단 + 잘못된 리뷰 댓글 반박 + 에이전트 채점**이다 — [guide-subjective-checks.md](./guide-subjective-checks.md)를 따른다. 객관식은 행동 확인 워밍업 1~2문제로만 쓴다 (모델이 만든 객관식은 정답 보기가 요약문이 되어 키워드만 보고 풀리는 문제가 실험에서 반복 확인됨).

공통 운영 규칙:

- 위치는 **Appendix 또는 `<details>` 접기** — 승인부 상단에 점수까지 길게 두지 않는다.
- 문항마다 힌트 + "→ 어디 보면" (진짜 파일:섹션) 을 붙인다.
- 채점 등급은 숫자 대신 **정답 / 부분 이해 / 다시 보기** 를 기본으로 한다. 숫자 점수는 자극엔 좋지만 자책으로 흐를 수 있다.
- 낮은 점수는 실패가 아니라 **카드가 잡아낸 오해 목록**으로 취급한다. 틀린 문항 = 다음 카드의 [READ] 후보.

### AskUserQuestion 선택 기록은 백지에서 재질문

마스터가 카드에 AskUserQuestion의 질문·선택지·모기가 고른 답을 함께 기록할 수 있다. 이 기록은 당시 결정의 감사 로그이지 다음 과외의 정답지가 아니다.

과외냥이는 아래 순서를 지킨다.

1. 이전 질문·선택지·선택 결과를 내부적으로만 읽는다.
2. 기존 선택이나 선택지의 표현을 노출하지 않고, 판단의 핵심을 선택지 없는 중립적인 주관식으로 바꿔 한 문제만 묻는다.
3. "왜 `<기존 선택>`을 골랐어?"처럼 과거 답을 전제로 이유를 요구하지 않는다. 이는 새 추론보다 사후합리화를 유도한다.
4. 모기가 백지 답을 낸 뒤에만 과거 선택을 공개하고 비교한다.
5. 일치하면 같은 판단에 독립적으로 도달한 것으로 기록한다. 불일치하면 이전 선택을 기준으로 오답 처리하지 않고, 현재 판단 변화·질문의 숨은 조건·카드 입력 결함 중 무엇인지 확인한다.

나쁜 재질문:

```text
전에 CI 필수화를 골랐는데, 왜 그게 좋다고 생각했어?
```

좋은 재질문:

```text
마이그레이션 검증 CI가 실패한 PR은 머지 버튼과 어떤 관계여야 한다고 생각해?
```

## jargon 처리

에이전트는 jargon을 완전히 없애려고 하지 말고, **승인에 필요한 용어만 쉬운 뜻을 붙인다.**

예:

```md
comparison_assessment
= 한 사람이 한 pair를 한 사진/조명 맥락에서 보고 남긴 비교 판단 카드
```

나쁜 예:

```md
comparison_assessment는 pair-level domain aggregate의 author-scoped observation context parent이다.
```

## 원문 위치를 반드시 남긴다

카드에는 원문 위치를 적는다.

```md
원문:
- 42-03-SPEC.md → 핵심 개념
- 42-04-PLAN.md → must_haves.truths
- 42-03-SUMMARY.md → Deviations
```

## 모기가 읽지 않아도 되는 것 명시

카드는 “읽어야 할 것”뿐 아니라 “안 읽어도 되는 것”을 알려준다.

```md
[DETAIL] 이번 승인에서 안 읽어도 되는 것
- index 이름
- SQL constraint 이름
- JSX 클래스명
```

이 항목은 문서 회피가 아니라 집중 범위를 줄이기 위한 것이다.

## 질문은 질문/답/blocker/후속으로 정리

모기가 질문을 던졌으면 본문 사이에 끼워 두지 말고, Appendix "승인 중 생긴 질문" 에 문항 단위로 모은다. 이렇게 해야 질문이 잡담이 아니라 **승인 기록**이 된다.

```md
## Appendix A. 승인 중 생긴 질문

### Q1. 같은 evidence를 여러 사람이 assessment로 참조하면 중복인가?
- 답: 아니다. author별 판단 기여이므로 의도된 설계다.
- blocker 여부: 아님.
- 후속: 표시/집계 UX는 seed로 분리.
```

---

# 에이전트에게 주는 프롬프트

## SPEC 작성 후

```text
방금 작성한 SPEC에 대해 모기 읽기 카드를 만들어줘.

원문 전체를 쉬운 말로 다시 쓰지 말고,
모기가 직접 읽고 승인해야 하는 결정만 10~20줄로 뽑아줘.

형식:
- [READ] 한 줄
- [READ] 새로 생긴 말
- [READ] 도메인 경계
- [DECIDE] 모기가 결정해야 할 것
- [EVIDENCE] 원문 근거
- [DETAIL] 읽지 않아도 되는 구현 세부
- [STOP] 멈출 조건

주의:
- Read Card는 SSOT가 아니고 원문을 읽는 길잡이다.
- jargon은 승인에 필요한 용어만 쉬운 뜻을 붙인다.
```

## PLAN 작성 후

```text
방금 작성한 PLAN에 대해 모기 읽기 카드를 만들어줘.

원문 전체를 다시 설명하지 말고,
이 순서로 실행해도 안전한지 판단하는 데 필요한 것만 뽑아줘.

반드시 포함:
- 실행 순서 쉬운 말 3~5줄
- 위험한 단계 표
- 사람이 해야 하는 일
- Stop Conditions
- 검증 증거
- 읽지 않아도 되는 구현 세부

특히 fallback, 타입 우회, migration/backfill, cutover, 권한 변경이 있으면 [READ]로 올려줘.
```

## 실행 중 계획과 달라졌을 때

```text
PLAN과 실제가 달라졌으니 Deviation Card를 만들어줘.

형식:
- 원래 계획
- 실제 확인한 것
- 왜 중요한가
- 제안하는 변경
- 도메인 의미 변화 여부
- 권한·데이터 영향
- 실측 근거
- 모기 결정 선택지

같은 실패가 두 번 반복됐거나 정책 충돌이면 진행하지 말고 결정을 요청해.
```

## SUMMARY 작성 후

```text
SUMMARY에 대해 모기 읽기 카드를 만들어줘.

목표:
- complete/PASS가 정확히 무엇을 의미하는지
- 아직 cutover pending인지
- 계획과 달라진 점이 있는지
- 후속이 blocker인지 seed인지
- 어떤 증거가 어떤 위험을 막았는지

원문을 다시 쓰지 말고 10~20줄로 요약해.
```

---

# 승인 단계별 체크

## SPEC 승인 시 모기가 쓰는 한 줄

```md
이 모델에서 행 1개가 무엇인지 이해했고,
자동승격/기본값/권한 경계가 제품 원칙과 충돌하지 않는다고 봄.
```

## PLAN 승인 시 모기가 쓰는 한 줄

```md
이 실행 순서의 위험 단계와 stop condition을 이해했고,
사람이 해야 하는 작업과 검증 범위를 확인했음.
```

## Deviation 승인 시 모기가 쓰는 한 줄

```md
원래 계획과 실제 차이를 이해했고,
제안 변경이 도메인/권한/데이터 불변식을 깨지 않는다고 봄.
```

## PR 승인 시 모기가 쓰는 한 줄

```md
핵심 도메인·권한·데이터 불변식과 남은 후속을 이해했고,
이 Head SHA 기준 머지 가능하다고 봄.
```

---

# 기존 문서와의 관계

| 문서 | 역할 |
|---|---|
| execution-plan-review-patterns.md | PLAN 자체를 리뷰하는 질문 후보 |
| mogi-review-packet.md | 카드 여러 장 PR 의 머지 게이트 (카드 1장 PR 은 카드가 대체) |
| code-review-patterns.md | 구현 후 코드 리뷰 질문 후보 |
| 이 문서 | 긴 AI 산출물을 사람이 읽기 쉬운 카드로 줄이는 규칙 |

---

# 자동화 후보

나중에 반복되면 자동화한다.

- SPEC/PLAN에 `type: spec|execute`가 있는데 Read Card가 없는 경우 경고
- `status: ready` PLAN에 `[STOP]` 조건이 없는 경우 경고
- `as never`, `as any`, `skip-local`, `fallback`이 있는데 Read Card에 언급이 없는 경우 경고
- migration/backfill 단어가 있는데 PLAN Read Card에 위험 단계가 없는 경우 경고
- SUMMARY에 `PASS`가 있는데 증거 등급이 없는 경우 경고
- Deviation 발생 후 Review Packet에 반영되지 않은 경우 경고

자동화는 차단이 아니라 리뷰 후보로 취급한다.

---

# 요약

- 긴 원문은 에이전트와 감사 기록용으로 둔다.
- 모기는 원문 전체가 아니라 Read Card의 `[READ]`, `[DECIDE]`, `[STOP]`을 먼저 본다.
- 계획과 실제가 달라지면 Deviation Card를 별도로 받는다.
- PR 직전에는 Review Packet으로 최종 승인한다.
- 쉬운 전체 번역본을 만들지 않는다. 짧은 읽기 카드만 만든다.
- **승인용 핵심은 위 15줄, 질문/채점/상세는 Appendix.** 덤 수정은 [READ] 숨은 변경으로 올린다.
- 권한 카드에는 Auth 용어 미니 표 고정: anon = 세션 없음, guest = authenticated + is_anonymous=true.

---

# 실전 적용 기록

실전 카드 원본은 `docs/_personal/review-card/` (개인 기록, repo 미추적).

- 2026-07-02 — LAUNCH-03 RPC 감사 카드로 첫 실전. 성과: 승인자 오해(게스트 role) 발견·교정, 숨은 변경(primary 버그) 표면화, 후속 액션 분리. 개선점 반영: 승인부/Appendix 분리, auth glossary 고정, 퀴즈 Appendix 화, 숨은 변경 [READ] 승격.
- 2026-07-03 — LAUNCH-03 테이블 RLS 카드. 승인 중 질문 라운드에서 승인자 질문이 실제 후속 todo(slug backfill)를 만들어냄 — 카드가 승인 장치로 작동한 증거. 이해도 상승 곡선 확인 (20/40 → 55/70).
- 2026-07-04 — 도리토 코드리뷰 라운드 카드에서 객관식 퀴즈를 6라운드 반복 실험. 생성 규칙을 아무리 보강해도 모델 객관식은 정답 보기가 요약문이 되는 경향을 못 없앰 → 이해 체크를 주관식 중심으로 전환 ([guide-subjective-checks.md](./guide-subjective-checks.md) 승격 근거).

## 일회용 자료 운영 (모기 결정 2026-08-11, fdda95b 메모)

UAT 브리핑처럼 한 번 쓰고 마는 안내장은 영구 카드 목록에 남기지 않는다:
**생성 → 읽기·실행 → 결과를 PR 카드나 원문에 반영 → 삭제.** 남길 가치가 생긴 내용은
삭제 전에 해당 PR 카드·원문으로 옮긴다. 디렉토리 구조: 활성 폴더는 `pr-cards/`(PR 승인)·
`plan-cards/`(착수 전 설계·SPEC — PR 번호가 있어도 내용이 설계면 여기)·`code-diff-notes/`
(코드 학습)이고, 지난 자료는 `archive/`다. 세션 부트는 활성 폴더당 최신 1개만 보여준다.

## 부록: 머지 게이트 등급표 (모기 확정 2026-08-14 — 퀴즈 게이트 사소 기준 명문화, retro §7 ⑤ 이행)

PR마다 마스터가 카드(또는 READY 보고)에 등급을 표기한다. 여러 축에 걸치면 높은 등급 우선.

| 등급 | 대상 | 게이트 |
|---|---|---|
| 본문 정독 | docs · 테스트만 · 카피/문구 · 동작 불변 리팩토링 | PR 본문을 읽고 머지. 퀴즈 없음 — 단 "안 읽고 머지"도 없음 |
| UAT 필수 | UI/UX 변경 | 실물 확인이 게이트 — 미리보기(checkout 정본) + 대화형 UAT(gsd-verify-work 스타일). 퀴즈보다 UAT가 본질 |
| 퀴즈 정식 | 마이그레이션 · RLS/정책/권한 · 인증 · 데이터 삭제/이동 경로 · 외부 API 계약 | 리드 카드 + 과외냥이 주관식 퀴즈 통과 후 머지 |

배경: 2026-08-13 retro §7 — 카드+퀴즈 하드 게이트 대비 9 PR 중 퀴즈 0~1회의 규칙-행동 불일치를 등급으로 해소. 선례: #513 = 퀴즈 정식(마이그+RLS), #514 = UAT 필수(실물 확인 + 타계정 비공개 검증으로 통과).

### 정체 확인 — 모든 등급에 붙는 최소선 (모기 건의 2026-08-19)

등급표는 "무엇을 검증하나"를 정했지만, **가장 낮은 등급에서 마스터가 "머지하면 된다"로 끝내는 실책**이 남아 있었다. 모기 건의: *"PR 올릴 때 내가 이게 적어도 뭔지는 아는지 체크해달라. 너무 엄격할 필요는 없지만 바로 머지해버려 냐옹냐옹~ 하진 말아라."*

**마스터 의무 (등급 무관, 머지 인계마다)**

1. 인계 문장에 세 가지를 **사람 말로** 넣는다 — ①이게 뭔지 한 줄 ②왜 지금 필요한지 ③안 하거나 잘못되면 뭐가 나빠지는지. 내부 용어(레인·delta·fix 라운드 번호)만으로 설명하지 않는다.
2. **확인 질문 1개**를 붙인다. 채점이 아니라 개방형이고, 모기가 한 줄로 답하거나 "패스"하면 끝난다.
3. 답이 실물과 어긋나면 **머지 전에 그 자리를 다시 설명한다.** 어긋난 것 자체는 문제가 아니다 — 설명이 부족했다는 신호다.
4. **이것은 하드 게이트가 아니다.** 답을 안 해도 머지를 막지 않는다. 막는 것은 등급표가 이미 정한 UAT·퀴즈뿐이다.

**등급별 강도**

| 등급 | 정체 확인 |
|---|---|
| 본문 정독 | 확인 질문 1개 (이 절의 최소선) |
| UAT 필수 | UAT 자체가 확인이라 질문 생략 가능 — 대신 ①②③은 그대로 |
| 퀴즈 정식 | 기존 주관식 퀴즈가 대체 |

**실측 계기**: 2026-08-19 PR #521(하네스 CI 편입). 마스터가 READY 보고에서 "머지하면 된다"로 넘겼고, 모기가 **"521 PR은 뭐야? 나 다른 거 하다 못 봤어"**라고 되물었다. 모기가 "이거 뭐야?"라고 묻는 순간은 마스터가 ①②③을 빠뜨렸다는 신호다 — 그때는 등급을 올릴 게 아니라 설명을 다시 하는 것이 맞다.
