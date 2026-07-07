---
type: personal
status: active
owner: samkimpepper
created: 2026-07-07
topic: PR #311 — loop-engineering 시스템 (.agent/loops/ · daily-triage L1)
guide: guide-mogi-read-cards.md
source: codex 요약 + Claude 원본 대조
---

# 모기 리드 카드 — PR #311 loop-engineering 시스템

> 원문이 SSOT. 이 카드는 길잡이.
> 원문: `.agent/loops/LOOP.md` · `.agent/workflows/daily-triage.md` · `loop-l2-propose.md` · `loop-l3-unattended.md` · `.agent/loops/daily-triage.STATE.md` · PR #311
> 요약 뼈대 = codex, 원본 대조·정정 = Claude(2026-07-07)

## 한 줄 [READ]

- #311은 **swatch repo에 "매일 아침 repo 건강검진"을 도는 읽기 전용 운영 점검 루프(daily-triage)를 설치**하고, 나중에 믿을 만해지면 작은 문서·운영 수정만 PR로 제안하도록 **L1 → L2 → L3 성숙도 사다리**를 문서화한 PR이다.
- 기능 개발 PR이 아니라 **"MOGUI를 같이 만드는 AI/사람 협업 운영체계"를 제품처럼 설계한 PR.**

> [!important] 내가 원본 대조하며 잡은 정정 (이거 하나는 꼭)
> **PR 본문에는 "daily-triage · Maturity L2"라고 써있지만, 현재 파일 기준 실제는 L1이다** (`LOOP.md:42`에서 2026-07-06 정정됨). 그 "L2" 라벨은 다른 하네스 인스턴스(albumlab) dry-run에서 상속된 거고, swatch 자체 run은 아직 0회였어서 L1로 내렸다.
> → **즉 지금 daily-triage는 "보고만" 한다. 아무것도 자동으로 안 고친다.**
> (템플릿 백포트도 실제로 됨 — `templates/mogui-agent-harness/`에 같은 파일들 들어감. ✓ 확인.)

---

## 1. 루프 엔지니어링이 뭐냐

매번 손으로 이렇게 시키는 대신:

> "dev 최신 커밋 봐줘" / "열린 PR 중 하네스 건드린 거 있어?" / "memory·wiki stale한 거 있어?" / "이거 작은 수정 PR로 올려도 돼?"

이 반복 점검을 **정해진 절차 + 상태 파일 + 실행 로그 + 멈춤 조건**으로 묶은 것. 그냥 "자동화"가 아니라 **반복되는 agent 운영 업무를 제품처럼 설계**한 것에 가깝다.

**#311이 만든 핵심 파일:**

| 파일 | 역할 |
|---|---|
| `.agent/loops/LOOP.md` | 루프 레지스트리 = 계약서 (SSOT) |
| `.agent/workflows/daily-triage.md` | 매일 점검 절차 |
| `.agent/workflows/loop-l2-propose.md` | 문제가 작고 명확하면 PR 제안하는 절차 |
| `.agent/workflows/loop-l3-unattended.md` | 나중에 무인 실행할 때 절차 |
| `.agent/loops/daily-triage.STATE.md` | daily-triage 현재 상태 파일 |

## 2. 제일 중요한 개념 — L1 / L2 / L3

"AI 자동화 성숙도"를 3단계로 나눈 게 중심 (`LOOP.md:19`).

| 단계 | 뜻 | 파일 수정 | 머지 |
|---|---|---|---|
| **L1** | 보고만 함 (읽기 전용) | ❌ STATE·run log만 | — |
| **L2** | 작은 수정 PR을 **제안** | 문서·운영 파일만 | **사람이** 함 |
| **L3** | allowlist 안에서만 무인 실행 | 좁은 경로만 | 사람 명시 허용 시만 |

**한 번에 한 단계만 승격** (`LOOP.md:30`):
- L1 → L2: dry-run ≥1주 + 오탐/누락률 OK + 예산 안정 + 제안 스코프 합의
- L2 → L3: L2 ≥1주 + 수용된 제안 PR ≥5건 + 기각률 ≤20% + path allowlist 확정

> 핵심: 도리토가 "AI야 알아서 고쳐"가 아니라, **AI가 믿을 만한지 계측한 뒤 단계적으로 권한을 올리자**는 설계.

## 3. 그런데 daily-triage는 지금 L1 (위 정정 참고)

`LOOP.md:42` — #311은 L2/L3 **절차까지 다 만들었지만**, swatch에서 실제 daily-triage는 **아직 보고 전용 L1로 시작**한다. 절차 파일이 있다 ≠ 그 단계가 켜졌다.

## 4. daily-triage가 실제로 보는 것

매일 repo 건강검진 (`LOOP.md:52`, 전부 read-only):

- 마지막 run 이후 dev 신규 커밋
- dev 대상 열린 PR
- 열린 PR별 로컬 review 이력
- **열린 PR이 하네스 파일을 건드렸는지** → `.agent/**` · `.claude/**` · `.codex/**` · `scripts/**` · `templates/**` · `.gitignore`. 건드리면 "사람 확인 권장" 신호 (`daily-triage.md:35`)
- code-review-graph 브랜치 불일치/변경 신호
- memory·wiki stale 여부

> 왜 하네스 파일을 보냐 = 최근 **개인/로컬 상태가 공유 repo에 섞이는 사고**(#305 계열)를 경계하려고.

> [!note] "review 이력 없음"은 "리뷰 안 함"이 아니다
> 로컬·머신별 신호라, 다른 머신에서 리뷰됐으면 여기 안 잡힌다. 그래서 **"review 이력 없음(로컬 기준)"으로만** 리포트한다 (`daily-triage.md:33`). 자동화가 자신 없는 신호를 과장 안 하게 하는 장치.

## 5. kill switch — 폭주 방지 브레이크

`LOOP.md:59`:

- 같은 항목이 **3 run 연속 미해결** → 사람 에스컬레이션
- 예산 초과 → 중단
- L1인데 STATE·run log 밖 파일 diff 생기면 → read-only 위반, 중단
- 리뷰 안 된 루프 PR **3개 누적** → 신규 제안 중단 (L2)
- code-review-graph가 다른 브랜치 기준이면 → 그 신호 skip

> **Tracking exclusions** (`STATE.md:25`): 도리토가 일부러 열어둔 draft PR 같은 걸 매일 "미해결!" 하고 때리지 않게 빼두는 칸. 영구 무시가 아니라 재검토 조건 충족되면 돌아옴. (지금 실제 등록된 항목은 `없음`.)

## 6. L2가 할 수 있는 것 / 없는 것

`loop-l2-propose.md` + `LOOP.md:47`:

| 할 수 있는 것 | 못 하는 것 |
|---|---|
| wiki frontmatter 작은 수정 | `src/` 제품 코드 수정 |
| stale 링크 수정 | `supabase/` DB 수정 |
| index 누락 수정 | (제품코드·DB는 **리포트만**) |
| memory archive 소규모 운영 수정 | |

규칙: `feat\|fix\|docs\|chore/loop-<루프>-<slug>` 브랜치만, **dev 직접 커밋 금지**, **루프가 머지 안 함**, 구현 agent와 검증 agent 분리, **항목 1개당 PR 1개**, 제목 접두 `loop(<루프>):`.

> 꽤 보수적: "agent가 매일 보다가 발견한 **문서·운영 잡초**는 PR 제안 가능, 근데 **제품 코드와 DB는 건드리지 마라.**"

## 7. L3는 아직 미래용 + 매우 제한적

`loop-l3-unattended.md`: 무인 실행이지만 자동 머지 아님. 전제 = L2 1주+ / 수용 PR 5건+ / 기각률 20% 이하 / path allowlist 확정 / 첫 주 사람이 run log 확인. **L3에서도 dev 직접 커밋 금지.**

- L3 allowlist 예정안 (`LOOP.md:48`): `.agent/loops/**`, `docs/wiki/postmortem/temp/**` — **아직 발효 아님, 승격 시 발효.**
- 설계 철학 한 줄 (`loop-l3-unattended.md:24`): **애매하면 실행 안 하고 L2로 내린다. L3 기본값은 "안 한다".**

## 8. maker / checker 분리

"고친 agent가 자기 숙제를 자기가 채점하지 마라" (`LOOP.md:20`). maker = 고침, checker = 별도 agent가 diff 검증(기각 기본값). 루프가 "내가 찾고 내가 고치고 내가 통과시킴"이 되면 위험하니까.

## 9. #311은 템플릿도 같이 백포트

swatch 루트 `.agent/`만 바꾼 게 아니라 `templates/mogui-agent-harness/`에도 L2/L3 절차를 영어·일반화판으로 넣음. **템플릿 기본값은 L1.** = 도리토가 이걸 swatch 전용 꼼수가 아니라 **재사용 가능한 agent harness 패턴**으로 밀고 있다는 뜻.

## 10. 왜 지금 하냐

요즘 PR들이 하네스·`.agent`·templates·hooks·memory·review gate 쪽에서 엄청 빨리 움직여서, 사람이 매번 놓치기 쉬운 게 생김 (하네스 파일 리뷰 없이 지나감 / 개인·로컬 규칙이 공유 템플릿에 섞임 / stale 경고 오탐 헷갈림 / PR 쌓여서 후속 놓침). #311은 이걸 **사람이 정신력으로 추적하지 말고, 루프가 매일 관측해서 상태 파일에 남기게** 하자는 설계.

## 한 문장 요약

> AI 비서한테 매일 아침 repo 건강검진을 시키되, **처음엔 말만 하게 하고**(L1), 믿을 만해지면 **작은 문서 수정 PR까지만** 시키고(L2), 아주 나중에만 **좁은 경로에서 자동 실행**(L3)하게 하자.

---

# 이해 체크 (주관식 · 답은 Claude가 채점)

> 가이드: `0-guide-subjective-check.md`. 객관식은 워밍업 1개, 진짜 이해는 주관식으로.

**오해하기 쉬운 지점 (읽기 전 경고)**
- "루프 등록됐으니 AI가 이제 알아서 고친다" → 아님 (L1 = 리포트만)
- "L2/L3 workflow 파일 있으니 무인 자동화 켜졌다" → 아님 (절차만 존재, 미발효)
- "PR 본문에 Maturity L2라 써있으니 L2다" → 아님 (본문 stale, 현재 L1)

## A. 객관식 워밍업 (행동 확인 — 쉬워도 됨)

1. 지금 daily-triage를 수동 실행하면 repo 파일이 자동으로 고쳐진다? (O / X)
   - → 어디 보면: `daily-triage.md:14` (read-only 불변식)

## B. 주관식 진단

**Q1. 막는 것 / 못 막는 것**
- 질문: daily-triage가 지금 **L1**이라는 게 무엇을 보장하고(막고), 무엇은 보장 못 하나(못 막나)?
- → 어디 보면: `LOOP.md:42` + `daily-triage.md:14-17` + `LOOP.md:47`
- 내 답:
  - 막는 것:
  - 못 막는 것:

**Q2. STOP / FOLLOW-UP / 정상**
- 상황: 언젠가 daily-triage가 L2로 승격됐고, 루프가 stale 링크 수정 PR을 `loop(daily-triage):` 접두로 올렸다. 이 PR을 아무도 리뷰 안 하면 dev에 자동으로 들어가나? 판정은?
- → 어디 보면: `loop-l2-propose.md:15` + `LOOP.md:24`
- 내 판정 / 이유:

**Q3. 바꾸는 동작 / 바꾸지 않는 동작**
- 질문: #311 머지가 **지금 당장** 바꾸는 것과, **아직 안 바꾸는** 것은?
- → 어디 보면: `LOOP.md:36-48` + `LOOP.md:76-82`
- 내 답:
  - 바꾸는 것:
  - 안 바꾸는 것:

## C. 잘못된 리뷰 댓글에 답하기

> 리뷰어: "L2/L3 workflow 파일까지 다 만들었으면 이제 AI가 무인으로 문서 고쳐서 PR 올리는 거네요? 아직 검증도 안 됐는데 이렇게 열어도 되나요?"

- 모기 답:

<details>
<summary>D. 채점 기준 (답 쓰고 나서 열기)</summary>

- **Q1 기대 핵심**: 막는 것 = 루프가 STATE·run log 밖 파일을 못 고침(read-only), 제품코드·DB 자동수정 불가. 못 막는 것 = 사람이 리포트를 안 읽고 넘기는 것, 리포트 자체 오탐, code-review-graph 브랜치 불일치 같은 판단 한계.
- **Q2 기대 핵심**: 자동으로 안 들어감. 머지는 항상 사람 게이트(`loop-l2-propose.md:15`). 리뷰 안 된 루프 PR 3개 쌓이면 신규 제안까지 중단. → 정상(루프가 절대 머지 안 하는 게 설계).
- **Q3 기대 핵심**: 바꾸는 것 = `.agent/loops/` 레지스트리·절차·STATE 신설 + 라우터 4종 sync + 템플릿 백포트. 안 바꾸는 것 = 실제 자동화 동작(daily-triage는 L1 리포트만, L2/L3 미발효), 제품 코드·DB 일절 안 건드림.
- **리뷰 댓글 기대 핵심**: 절차 파일 **존재 ≠ 발효**. daily-triage는 L1이고, L2·L3 승격은 실적(dry-run·수용 PR·기각률)이 쌓여야 레지스트리 한 줄 수정으로만 올라감(`LOOP.md:30`). "열어둔" 게 아니라 "미래에 올릴 사다리를 문서화"한 것.
- **자주 나올 오해**: 파일이 있으니 켜졌다 / L1인데 L2로 읽음 / 루프가 dev에 머지한다.

</details>
