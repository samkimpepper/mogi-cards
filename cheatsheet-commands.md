# Cheatsheet — 명령어·시스템·운용 레퍼런스

> Supabase 마이그·스킬 3종·슬래시 커맨드·시스템 위치·frontmatter·룰 점검·저장 프롬프트. 분리본: 도메인=cheatsheet-domain.md · 회고=mogi-sins.md

## Supabase 마이그 워크플로우 (모기 환경)

- **로컬 Supabase 안 씀**. 사장님 공유 클라우드 인스턴스 사용.
- 마이그 파일 작성 후 적용 = **`supabase db push`** (모기가 직접 터미널에서).
- `supabase migration up` (로컬), `supabase start` (로컬) 안 씀.
- CLAUDE.md 의 `docker exec ... psql ...` 진단 명령도 로컬 전용 → 사용 불가.
- 적용 검증 = supabase studio (웹) 또는 db push 출력.

---
## "모긔" vs "모기" 모드 (Claude 한테)

- **모기** = 정상 모드. 평소 답변.
- **모긔** = 피곤·머리 안돌아감. Claude 가:
  - 컬럼/필드 지칭 시 **어떤 테이블의 어떤 컬럼인지 명시**
  - 도메인 용어 풀어서 설명
  - 헷갈린 거 콕 짚어서 정리

---
## 스킬 시스템 3 종 (gstack / gsd / superpowers) — 언제 무엇 쓰나

> 사장님이 준 mental model. 헷갈리면 *질문* 으로 매칭하기.

```
gstack      → "무엇을 왜 만드나"   (전략·검증)
              /cso, /qa, /ship, /review

gsd         → "어떤 순서로 만드나" (구조·실행)
              /gsd:discuss-phase, /gsd:plan-phase, /gsd:execute-phase, /gsd:validate-phase

superpowers → "어떻게 잘 만드나"   (방법론·품질)
              TDD, 체계적 디버깅, 코드 리뷰 프로토콜
```

| 시스템 | 답하는 질문 | 대표 명령 | 영역 |
|---|---|---|---|
| **gstack** | 무엇을 *왜* | `/cso` `/qa` `/ship` `/review` | 전략·검증 |
| **gsd** | 어떤 *순서* | `/gsd:discuss-phase` `/gsd:plan-phase` `/gsd:execute-phase` `/gsd:validate-phase` | 구조·실행 |
| **superpowers** | 어떻게 *잘* | TDD / 체계적 디버깅 / 코드 리뷰 프로토콜 | 방법론·품질 |

→ 작업 들어가기 전 "지금 어느 축인지" 한 박자 짚기. 셋 다 동시 안 씀 — 보통 한 흐름에 1개 주연.

---
## 슬래시 커맨드 cheatsheet (2026-05-13 사장님 시스템)

> 사장님이 어제 만든 슬래시 5개. 옵션이라 굳이 안 써도 되지만 *디버깅 시간 많이 쓴 후 `/postmortem`* 만 들이면 학습 효과 큼.

| 슬래시 | 언제 쓰나 | 결과물 |
|---|---|---|
| `/scope <작업>` | **작업 시작 전** — 규모 추정 + skill 호출 순서 가이드 받기 | "소/중/대/특대" 판정 + Phase 호출 체크리스트 (가이드 모드, 자동 실행 X) |
| `/postmortem <사건>` | **디버깅 시간 많이 쓴 후** — 회고 자동 작성 | `docs/wiki/postmortem/NNN-YYYYMMDD-mogi-<slug>.md` 1 파일 (008/014 같은 8섹션 형식) |
| `/memory-status` | Layer 2 메모리 시스템 헬스체크 | Memory/Context/Archive 상태 + frontmatter coverage |
| `/memory-archive` | 메모리 수동 백업 | `~/Documents/swatch-archive/` 로 즉시 복사 (launchd 가 자동도 함) |
| `/docs-sync` | docs 정합성 점검 | Context/decision 반영 후보 제안 + D-NNN sentinel + frontmatter 검사 |

### 모기가 *지금* 알아두면 좋은 부수 룰

- **AI 가 "박는다 / 박았다 / 박혀" 못 씀** (한국어 슬랭 hook). 모기 본인은 자유롭게 써도 됨. AI 답에서는 "넣다 / 추가 / 적어두 / 기록" 등으로 옴.
- **`/postmortem` 호출 시 박-슬랭 hook self-skip** — 디버깅 회고에서 hook 차단 사례 *메타-인용* 가능 (postmortem 011 이 그 케이스).
- **모기 활동 영역 자동 review 핑** — `shade-detail/` + `shadeAxisRatingsRepo.ts` 누가 건드리면 `@samkimpepper` 자동 호출 (CODEOWNERS).
- **PR base 는 무조건 `dev`** — `--base main` 잡으면 CI 가 차단 (main-merge-guard workflow).

---
## 시스템 위치 cheatsheet (자주 까먹을 위치)

> 사장님이 PR #101 wiki migration 으로 위치 다 옮김. 옛 path 와 매핑.

| 찾는 것 | 위치 |
|---|---|
| ADR (D-NNN 결정 로그) | `docs/wiki/decisions/D-NNN.md` (옛 `strategy/14_decision_log.md` 가 79 파일로 쪼개짐) |
| 옛 통합 결정 로그 (3059줄) | git history 만 — `docs/wiki/archive/` 는 2026-05-27 청소 (PR #193) 로 삭제됨 |
| 모기 옛 plan 들 (30~35_plan) | git history 만 — `git show <옛커밋>:docs/wiki/archive/plans/NN_plan....md` 로 회수 |
| postmortem / 회고 문서 | `docs/wiki/postmortem/` |
| guides (handbook, mobile-design) | `docs/wiki/guides/` |
| 서비스 운영 스펙 (에러/QA/인터뷰) | `docs/wiki/services/spec/` |
| 아키텍처/PRD/NSM/지표 | `docs/wiki/architecture/` |
| frontmatter 표준 | `docs/wiki/_schema/frontmatter.md` |
| AI 컨텍스트 (Layer 2) | `.agent/Instructions.md`, `.agent/Context.md`, `.agent/Memory.md` |
| 워크플로우 8종 (Triple Crown 등) | `.agent/workflows/` |
| 새 작업 plan 시작 위치 | `.planning/workstreams/<name>/phases/` (D-092 GSD workstream mode — 옛 milestones flat 구조 폐기) |
| wiki 카탈로그 진입점 | `docs/wiki/index.md` |

### 검색 우선순위 (D-093 룰 — 옛 D78 은 superseded)

1. **code-review-graph MCP** (코드 구조 — 함수/호출/import/영향 범위)
2. **wiki 파일** (결정 이유·운영 규칙 — `docs/wiki/decisions/` · `guides/` · `postmortem/`)
3. **rg + `pnpm wiki:lint`** (텍스트 탐색 · stale sweep)

→ 옛 docs-graph FTS5 (`pnpm docs:traverse`) 는 D-079 deprecated — 스크립트 자체가 package.json 에 없음.
→ "그거 어디 있지" 할 때 grep 부터 가지 말고 *위에서부터*.

---
## D-NNN frontmatter 영역 사전 지식 (2026-05-14 추가)

> 자세한 풀이 = postmortem 019 § 0 (`swatch-v2/docs/wiki/postmortem/019-20260514-mogi-relations-backfill-cycle.md`)

### frontmatter 필드 — 갱신 영역 표

| 필드 | 갱신 시점 |
|---|---|
| `id` / `created_at` / `created_by` | ❄️ 영원히 변경 X |
| `updated_at` / `updated_by` / `audit_log` | 🔄 매 수정 시 |
| `last_verified_at` / `last_verified_by` | 📅 정합 점검 시 |
| `status` | 🎯 결정 lifecycle 시 (active → superseded 등) |
| `relations` / `code_refs` | 🔗 백필 / 보강 시 |

### label 풀 6종

| label | 한 줄 의미 |
|---|---|
| `references` | 내가 저쪽 본문 직접 인용 |
| `depends-on` | 저쪽 lock 풀려야 의미 있음 |
| `supplemented-by` | 같은 도메인 후속 보강 |
| `related` | 약한 도메인 관계 / 명시적 분리 |
| `partially-supersedes` | 부분 대체 (역방향 = `partially-superseded-by`) |
| `referenced-by` | 저쪽이 나를 인용 (단방향) |

### plan vs D-NNN

- 📓 plan = 공책 (스케치 / 옵션 / lock-in 표)
- 🃏 D-NNN = 카드 (lock 한 줄)
- plan 진화 (stub → draft → active → complete) ≠ D-NNN 생성. **나란히** 가는 별 영역.

---
## 매번 짚어야 할 룰 목록 (AI 가 준수했는지 점검!) (2026-05-14 추가)

> 모기가 AI 에게 매번 "이거 준수했냐?" 물어볼 룰들. **내용은 외우지 않음** — 이름 + 위치만 숙지, 작업 시점에 해당 파일 참조.

| 룰 | 위치 | 점검 시점 |
|---|---|---|
| 브랜치 룰 | `CONTRIBUTING.md` § 브랜치 정책 | PR 만들기 전 |
| Supabase 마이그 룰 | `CLAUDE.md` § Supabase 마이그레이션 | 마이그 파일 추가 시 |
| gstack 룰 | `CLAUDE.md` § gstack | 작업 시작 시 |
| 박- 어휘 회피 룰 | `UserPromptSubmit` hook | 매 AI 응답 |
| 코어=프리미엄 룰 | `.agent/Memory.md` § feedback_core_premium | 권한 분기 결정 시 |
| editorial 원칙 ("모아오기" 금지) | `.agent/Memory.md` § feedback_editorial_principles | 글 작성 시 |
| Dupe/AI 유사도 분리 룰 | `.agent/Memory.md` § project_dupe_ai_separation | dupe 영역 작업 시 |
| 결정 ownership 룰 (옵션 + 트레이드오프) | `.agent/Memory.md` § feedback_decision_ownership | 큰 결정 받을 때 |
| moki 모드 룰 | `.agent/Memory.md` § feedback_moki_mode | 모기 피곤 신호 시 |
| DB 쿼리 먼저 룰 | `.agent/Memory.md` § feedback_db_query_first | state mismatch 디버깅 시 |
| lock 전 한 박자 룰 | `.agent/Memory.md` § feedback_lock_pause | plan/마이그 push 직전 |
| chain 영역 룰 (엄격 해석) | postmortem 019 § 6-3 | chain 작업 시 |
| 모기콕 모드 룰 | postmortem 019 § 5-3 | 매 AI 응답 |

**모기 영역 룰**: 위 목록 매번 왔다 갔다 점검 → AI 가 룰 어겼는지 모기가 짚어야 함. 룰 내용은 해당 파일 참조 → 외울 부담 없음.

<!-- 2026-05-14 hardlink sync 테스트 -->

---
## 프롬프트 모음 (저장해둔 LLM 프롬프트)

### KR → EN 번역 / workplace English 다듬기 (2026-05-27 추가)

백엔드·AI 엔지니어링 업무 톤. Slack / GitHub / 엔지니어링 토론 결.

#### v1.5 (2026-05-27)

````
Task:
Translate messy Korean into natural, practical English for backend / AI engineering workplace communication.

Requirements:

- Preserve original intent and tone.
- Infer the most likely meaning, but do not invent facts.
- Input may be fragmented, emotional, vague, shorthand-heavy, or context-light.
- Prefer practical workplace English over textbook English.
- Keep responses concise.

Behavior:

- Translate Korean into natural workplace English.
- Preserve developer jargon when appropriate.
- Do NOT translate:
code blocks,
logs,
stack traces,
API payloads,
SQL,
shell commands,
config keys,
file paths,
identifiers

Return exactly:

```
[natural workplace English]
```

```
- direct Korean interpretation of the English output
- nuance / why it sounds natural
- grammar points
- difficult vocabulary
- backend / AI / software engineering jargon if relevant
- better real-world phrasing if applicable
```

Style:

- no emojis
- no overexplaining
- avoid overly corporate wording
- avoid awkward textbook phrasing
- prefer Slack / GitHub / engineering discussion tone
````

