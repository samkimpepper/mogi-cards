# Cheatsheet — 도메인 헷갈림

> 발색·비교노트·축·finish 등 도메인 모델 헷갈릴 때 먼저 보는 곳. 분리본: 명령어=cheatsheet-commands.md · 회고=mogi-sins.md

## 비교 노트 vs 색 분류 (자주 헷갈림)

**`comparison_notes` 테이블** (= 두 발색 *사이* 이야기)
- 행 1개 = "shade A vs shade B 의 비교 노트 1줄"
- 컬럼 (2026-05-05 재구조화 후 — `20260505010000_comparison_notes_restructure.sql`): `pair_id` (comparison_pairs FK, NOT NULL) · `subject_side` ('a'|'b' — 페어의 어느 쪽이 이 노트의 주어인지) · `axis` · `direction` · `free_text` · `author_user_id` · `created_at`
- 옛 `subject_shade_id` / `object_shade_id` 직접 컬럼은 위 재구조화에서 drop 됨 — init_core (`20260416063901_init_core.sql:346-357`) 기준 설명은 stale
- 누가 채움: 어드민 (MVP B1) → 유저 (P2 후속)

**`shade_color_families` 테이블** (= 1개 발색의 분류 칩)
- 행 1개 = "shade X 는 그레이쉬핑크 family 에 속함"
- 27_plan 에서 박힘 (이미 운영 중)
- 발색 1개당 N 개 family 매핑 가능

**핵심 차이**: comparison = 2개 사이 / color_family = 1개 분류. **두 영역 절대 안 만남**.

### "관계" vs "노트" — 두 노드 사이 데이터 2 종류

같이 헷갈리지 말 것. 두 노드 사이 데이터가 **두 종류** 있음:

| 종류 | 테이블 | 행 수 | 의미 | 비유 |
|------|--------|------|------|------|
| **관계 (relationship)** | `comparison_pairs` / `AtlasEdge` (kind: `dupe` · `same_line` · `comparison_note`) | **1행** (한 쌍 당 1개) | "A 와 B 는 dupe 다" / "같은 라인이다" / "비교 노트가 있다" 같은 **분류** | 페이스북 친구 관계 1개 |
| **노트 (notes)** | `comparison_notes` | **N행** (한 쌍에 여러 사람이 여러 노트) | "A 가 미묘하게 톤다운" / "같이 발리네" 같은 **자유 코멘트** | 그 친구한테 보낸 메시지 N개 |

**데이터 모델은 분리, UI 는 통합** (28_plan A4 lock 2026-05-04):
- DB: 두 테이블 그대로 분리 유지.
- UI: Atlas 의 link 시트 1개 안에 **상단 = 관계** (dupe 배지 등) / **하단 = 노트 리스트 + 입력 폼** 으로 같이 보여줌. 시트 두 개 안 만듦.

### Atlas 그래프 선 종류 (`AtlasEdge.kind` 3종) — **D-060 후 갱신 (2026-05-05)**

`app/src/data/types.ts:244` + `app/src/features/explore/AtlasExploreView.tsx:1022` 시각 정의:

| kind                  | 색            | 선            | 의미                                    | 데이터 출처                                   |
| --------------------- | ------------ | ------------ | ------------------------------------- | ---------------------------------------- |
| **`dupe`**            | accent (강조색) | **실선 (굵음)**  | 명시적 dupe 등록                           | `comparison_pairs` (`is_dupe=true`) 테이블  |
| **`same_line`**       | cool (차가운색)  | **실선**       | 같은 product_line 자매 발색 (현재 미구현, 코드 보존) | 자동 derive (DB 안 씀)                       |
| **`comparison_note`** | text3 (회색)   | **점선 `4 3`** | 비교 노트 있는 두 발색 (= 사회 필터로 인한 약한 유사 신호)  | `comparison_pairs` (`is_dupe=false`) 테이블 |
| ~~`similar`~~         | ~~— ~~       | ~~점선~~       | ~~알고리즘 추정 유사 (LAB 거리)~~               | **❌ D-60 폐기** — 데이터 생성 함수 부재 (실측 0건)     |

→ 그래프에서 **점선 = 사회 필터 (비교 노트 존재)**. dupe 는 항상 실선 (=사람이 정한 것).
→ `dupe_pairs` 테이블은 **D-59 (2026-05-05)** 부터 `comparison_pairs` 로 rename + `is_dupe boolean` 컬럼 추가됨.
→ 28_plan α 에선 link 폼이 `comparison_notes` 만 INSERT (`comparison_pairs.is_dupe=true` INSERT X) → **일반 유저는 dupe edge 추가 진입점 부재**. dupe 등록 = 코어/어드민 한정 토글 (D-57 lock).
→ 그래서 link 버튼 라벨 변경 ("연결" → "비교 노트 추가") + 1 노드 focus 시 fan-out 리스트로 진입점 보완 (D-I lock 2026-05-04).

### 비교노트 근거 발색샷 권한 — swatch 작성자 소유가 아니라 note 작성자 참조 (2026-06-13)

> 모기야, 또 "남이 올린 발색샷을 내가 비교노트 근거로 붙여도 되나?" 헷갈릴 수 있어서 박아둠.

**결론: 로그인한 비교노트 작성자는 공개 발색샷을 근거로 참조할 수 있게 두는 게 맞음.** 발색샷 작성자 본인만 허용하면 Atlas 비교노트 가치가 너무 줄어든다.

- 이 기능은 발색샷을 새로 게시하거나 복제하는 게 아니라, 기존 `swatches` row 를 `comparison_note_swatches` junction 으로 **참조**하는 구조.
- 권한 경계는 swatch 작성자가 아니라 **comparison note 작성자**다. 즉 "내 노트에 evidence 붙이기/떼기"만 가능해야 함.
- 이미 잠긴 RLS 의도도 "타작성자 note 에 evidence 못 붙임 / 못 뗌"이지, "타작성자 swatch 를 evidence 로 못 씀"이 아님.
- 안전장치는 따로 있음: evidence 후보는 현재 비교 pair 의 **두 shade 를 모두 포함한 swatch** 만 반환. 아무 사진이나 붙이는 구조 아님.
- UI 의미는 "이 발색샷 작성자가 이 비교노트에 동의했다"가 아니라 **"비교노트 작성자가 공개 발색샷을 근거로 참고했다"**.
- 나중에 위험 줄일 거면 owner-only 제한보다 **신고 / 관리자 제거** 쪽이 맞음.

**한 줄: 근거 발색샷은 소유권 이전이 아니라 공개 자료 인용에 가깝다. 막을 대상은 남의 swatch 참조가 아니라 남의 note 수정이다.**

---
## Atlas edge 시각 종류 (D-K · D60 · 2026-05-05)

| kind | 출처 | 시각 | 신호 강도 |
|---|---|---|---|
| `dupe` | `comparison_pairs.is_dupe=true` | 실선 굵음 | 강 (admin curated) |
| `same_line` | 제품라인 자동 derive (현재 미구현, 코드 보존) | 실선 | 중 (제품 정보) |
| `comparison_note` (신규 D60) | `comparison_pairs.is_dupe=false AND is_deleted=false` | 점선 `4 3` | 중 (사회 필터) |
| ~~`similar`~~ | ~~알고리즘 — 실측 데이터 0건 발견~~ | 폐기 (D60) | — |

### 왜 비교 노트 = 점선이 의미 있나 (모기모기 인사이트 2026-05-05)

- 사람들은 무관한 발색끼리 비교 안 함 (예: 틸티드데님 vs 생딸기젤리, 안 일어남)
- 비슷한 계열끼리만 비교 노트 작성 → **비교 노트 존재 자체 = 어느 정도 유사** 신호
- 노트 수 ↑ = dupe-ish ↑ (admin 이 못 본 dupe 후보)
- 즉 dupe (admin 강신호) 와 similar (알고리즘 약신호) 사이 = 사회 필터 중간 신호

### `similar` edge 폐기 발견

- 코드엔 정의 + UI 시각 + 필터 토글 다 있었지만 데이터 생성 함수 부재
- 실측: 점선이 화면에 한 번도 안 떴음
- D-I option 2 폐기 이유 = "similar 와 시각 충돌" — 충돌할 데이터가 없었음 → 이유 무효
- 같은 자리 (점선 `4 3`) comparison_note 페어가 차지

### 미래 가능성 (Phase 2 후)

- 노트 수 비례 굵기 (1건 = 얇음 ~ N건 = 진해짐)
- 노트 ≥ N + is_dupe=false → admin 한테 알림 ("dupe 후보 페어")
- D59 의 `comparison_pairs` 단일 부모 + `pair_id JOIN` 으로 카운트 query 자연스럽게 가능

---
## "swatch_items.note 가 swatches.caption 과 중복 아냐?" 모기 우려 (자주 떠오름)

> 트윗 contribute 흐름에서 caption 자동 import + 매핑할 때 한 줄 note 도 입력. 중복 같음.

**답**: 부분적 중복 인정. 그래도 **multi-shade 트윗에선 note 만이 가지는 가치** 가 있어 유지.

- `swatches.caption` = 트윗 본문 전체. swatch 1 개당 1 개. 두루뭉술 (예: "오늘 막데이 / @쭈아").
- `swatch_items.note` = (image, shade) 매핑당 1 줄. shade-specific 한 평.

**의미 분기**:
- **single-shade 트윗** → caption 이 그 shade 얘기뿐. note 거의 중복. 모기 우려 정확
- **multi-shade 트윗** (팔레트·MLBB·비교) → caption 두루뭉술, **note 가 per-shade 평 분리**. 검색·detail 에 결정적
- 즉 single 케이스에선 redundant 처럼 보이지만 multi 케이스의 가치 때문에 영역 유지

**결론**: 기능 변경 안 함. UX 차원에서 placeholder 로 "이 shade 에 대한 짧은 평만 (caption 복붙 안 함)" 식 유도가 정공이긴 함 — 추후 작은 UI 개선 여지 있음 (지금은 패스).

---
## "comparison_notes 트윗과 중복 아냐?" 모기 우려 (자주 떠오름)

> 모기모기 모드에서 자주 떠오르는 의문. 답을 박아둠.

**우려**: 트윗 (`swatches.note` / `swatch_items.caption` 등) 에 작성자가 이미 "A 가 B 보다 톤다운" 같은 비교 코멘트 적었을 텐데, `comparison_notes` 또 만들면 데이터 중복 아냐?

**답**: 부분적으로 중복 가능. 인정. **그래도 comparison_notes 유일 가치 있어서 별 영역 유지.**

### 왜 별 영역 유지 (4 이유)

| 이유 | 설명 |
|------|------|
| **1. 페어 단위 인덱스** | 트윗 caption = 자유 텍스트라 페어 검색 불가. `comparison_notes` = `(subject_shade_id, object_shade_id)` 인덱스로 **즉시 두 발색 페어 매칭**. Atlas 두 노드 선택 시 깔끔한 시트 = 이 인덱스 덕분 |
| **2. 작성자 차이** | 트윗 = **원작자 1명**. comparison_notes = **모든 로그인 유저 N명**. 같은 페어에 N개 누적 → 깊이가 쌓임 |
| **3. 컨텍스트 차이** | 트윗 = 발색 발표 (1차 컨텐츠). 노트 = Atlas 에서 두 노드 보다 떠오른 **메타 코멘트 (2차)**. 의도 다름 |
| **4. 페어 모호성 0** | 비교 트윗에 A·B·C·D 4개 같이 → A-B? A-C? B-D? 모호. NLP 없으면 자동 추출 불가. 노트 = 두 노드 명시 선택 → 페어 분명 |

### 안 좋은 대안 옵션 (왜 채택 안 했냐)

- 트윗만 쓰고 노트 없애기 → 페어 검색 안 됨, N명 누적 안 됨
- 트윗 caption 자동 NLP → 작업 큼, MVP 범위 밖
- 트윗 입력 시 두 shade ID 강제 매핑 → 단일 발색 트윗에 무거움

### 후속 진로 (Phase 4 후보, 지금 안 함)

- 어드민이 비교 트윗 보고 "이 트윗 → 페어 X-Y 노트로 등록" 수동 변환 액션.
- 트윗 caption 부분 클립해서 노트로 박는 어드민 큐레이션 UI.

→ 별 plan 거리. 28_plan 범위 밖.

---
## "axis" 단어가 3 군데 컬럼에 나옴 (제일 자주 헷갈림)

같은 "axis / 4축" 단어가 컬럼 3 군데에 나오는데 **의미 다 다름**:

| 컬럼 | 무엇 | 데이터 형태 | 용도 |
|------|------|------------|------|
| `user_profiles.chroma` / `cloudiness` / `temperature` / `lightness` ⚠️ **NEW (2026-05-12 D76, cores 테이블 dead 확인 후 위치 옮김)** | 그 **코어 본인의 시그니처 4축** (예: 모기 = chroma 4, cloudiness 2, temperature 3 (웜), lightness 3) | 정량 (0~5 int) + `skin_tone_note text?` | Atlas "내 축과 비슷한 코어만" 필터 (28_plan F1) + 노드 click chip (28_plan F3) |
| `shade_axis_ratings.chroma` / `cloudiness` / `temperature` / `lightness` ⚠️ **NEW (2026-05-11 왓챠 모델)** | 그 **shade 자체** 에 대한 **로그인 유저의 4축 평가** (1유저 × 1shade = 1행, upsert) | 정량 (0~5 int) | 30_plan dot scatter 의 **★ + ● 둘 다** ((가) 채택 2026-05-12 — JOIN `user_profiles.is_core` 로 ★/● 분기, 분포 시각화, **평균 ❌**) |
| `comparison_notes.axis` | **두 발색 비교 노트** 가 **어느 축** 에 대한 거냐의 **라벨** | enum 1개 (`chroma` / `cloudiness` / `temperature` / `lightness`, nullable) | 비교 노트 chip 색깔/그룹핑 |

**핵심 차이**:
- `user_profiles` · `shade_axis_ratings` 의 4축 = **수치값** (0~5 정량)
- `comparison_notes.axis` = **라벨 한 개** (어느 축에 대한 비교인지만 표시, 수치 없음)
- `user_profiles` (`is_core=true` 한정) = **코어 본인 정체성** (1코어 = 본인 시그니처 1행). `shade_axis_ratings` = **누구나 누적 평가** (1shade 에 N유저 행, upsert).
- 모기 자주 헷갈림: "axis 가 따로 테이블 있지 않았어?" → 가설로 `shade_core_axes` 가 D28 본문 (`14_decision_log.md:1328`) 에 "또는" 으로 등장 → 폐기. 그 후 `swatch_items.submitter_*` 안 (31_plan §1 D-B) → **다시 폐기 (2026-05-11 왓챠 모델)** → `shade_axis_ratings` 신규 테이블로 **최종 안착**.
- 2026-05-12 진동: D76 마이그 박을 때 30_plan §1 D-F 가 (II) "★ = `user_profiles.4축`" (코어 본인 시그니처) 가정 박혔으나 모기 본 의도 = (가) "★ = `shade_axis_ratings` (이 shade 평가한 코어)". docs cascade 9 군데 update + 격리 표 (아래 새 section) 추가.

---
## "코어 4축" 어휘 충돌 — 영역 별 다른 의미 (2026-05-12 (가) 채택 후 격리)

같은 "코어 4축" 단어가 두 영역에 등장하는데 의미 완전 다름. **dot scatter (DetailSheet) 얘기 중에 "코어 4축" 들으면 자동으로 Atlas F3 영역 떠올리는 패턴 = 헷갈림 출발점**.

| 영역 | 의미 | source 컬럼 | 어디서 표시 |
|---|---|---|---|
| **28_plan F1/F3** (Atlas) | 코어 **본인 시그니처** (= 그 코어가 평소 좋아하는 톤) | `user_profiles.chroma/cloudiness/temperature/lightness` (D27 · D76, 2026-05-12 마이그) | F1 = Atlas 노드 필터 (모기 본인 시그니처와 비슷한 코어만) / F3 = 노드 click 시 코어 본인 chip |
| **30_plan dot scatter ★** (DetailSheet) | 그 **shade 의 평가 점수** (코어가 매긴 것) | `shade_axis_ratings.chroma/cloudiness/temperature/lightness` (D75) + JOIN `user_profiles.is_core` 플래그 (★/● 분기) | DetailSheet 안 4축 axis 별 horizontal scatter — 한 shade 의 평가 분포 |

**구체 차이 비유** (코어 김00 의 경우):
- `user_profiles.chroma=2` = 김00 본인 시그니처 (= 평소 채도 낮은 거 좋아함, shade 와 무관)
- `shade_axis_ratings.chroma=4` (김00 × #샤넬립A) = 김00 가 #샤넬립A 의 채도를 4 라고 평가 (이 shade 한정)

샤넬립A 의 dot scatter 채도 axis 에 김00 의 ★ 찍을 때:
- **(가) 채택** → ★ 위치 = **4** (김00 가 이 shade 에 매긴 점수)
- ~~(나) 폐기~~ → ★ 위치 = 2 였을 거 (김00 본인 시그니처 — shade 와 무관)

→ (가) = 한 axis 줄 안에 모든 점이 같은 질문 ("이 shade 채도 어때요?") 의 답. 깔끔.
→ (나) = 한 줄 안에 두 다른 질문 (이 shade 채도 vs 평소 좋아하는 채도) 섞임 — 비교 무의미라 폐기.

**컨텍스트 분리 룰**:
- "30_plan dot scatter" 얘기 중 = `shade_axis_ratings` 데이터 + JOIN `is_core` 플래그
- "28_plan F1/F3 · Atlas · byline chip" 얘기 중 = `user_profiles.4축` 데이터
- 두 영역 점프 시 영역 명시 안 알리면 자동 헷갈림 → Claude 가 plan 점프 시 영역 명시 룰 = `Instructions.md` 박을 후보 (2026-05-12 모기 confirm).

---
## comparison_notes 컬럼 cheatsheet

| 컬럼 | 의미 | 정책 (D-E lock 2026-05-04 → D-097 갱신 2026-06-11) |
|------|------|------|
| `axis` | 이 비교가 어느 축에 대한 거냐 (`chroma`/`cloudiness`/`temperature`/`lightness`) | **nullable** — NULL 이면 "축 없는 전반 인상 노트" |
| `direction` | 그 축에서 subject 가 어느 쪽이냐 | **활성 (D-097, D-E 번복)** — 문장 빌더가 채움. canonical = **항상 `'more'`** ("subject 가 object 보다 더 ~"). 'less' 는 저장 안 됨 — 교환 버튼이 subject 를 바꿔 표현. RPC 가 'more' 외 거부 |
| `free_text` | 자연어 본문 ("A 가 미묘하게 톤다운됨") | direction 있는 노트에선 **뉘앙스 전용 + 생략 가능** ("한 스푼 정도"). direction NULL (전반 인상) 노트는 본문 필수 (T-37-05) |

**"축 없는 비교 노트" 예시** (axis=NULL + free_text):
- "이 둘 자매 라인 같음"
- "같이 발랐을 때 묘하게 안 어울림"
- "둘 다 입술 위에서 발리는 느낌이 다름"

→ 어떤 축 (채도? 탁기?) 으로도 콕 찍기 애매한 비교는 axis 비우고 free_text 만.

### 방향성 — "더 탁함" 이 누구 얘긴지 (2026-06-11 추가, 모기 결정 → 같은 날 구현 완료)

- 문제 (해결됨): `direction` 이 MVP NULL (D-E lock) 인 상태에서 free_text 에 "더 탁함" 만 쓰면 페어의 어느 쪽이 더 탁한지 알 수 없었음.
- 스키마엔 자리 있음: `subject_side` 가 노트마다 주어 (기준 shade) 를 가리킴. 단 UI 가 주어를 표시 안 하면 독자는 못 읽음.
- **정식 해결 (D-097, 구현 = PR #214): 문장 빌더** — 작성 UI 에서 축 클릭 시 "맥 모데스티가 로라메르시에 핑크쉬폰보다 더 탁하다" 완성 문장을 UI 가 생성, 교환 버튼으로 두 shade 교환. 읽기도 같은 문장 생성 함수로 렌더 (`app/src/features/explore/comparisonSentence.ts`). 구조화 상태 (subject + axis + direction) 에서 문장이 생성되니 모호한 노트가 아예 생길 수 없음. todo = `.planning/todos/done/comparison-note-subject-side-ui.md` (done)
- 임시방편 (free_text 에 주어 이름 명시) 은 구현 완료로 **종료**.
- D-E 번복 근거와 canonical 규칙은 [D-097](../../wiki/decisions/D-097.md) 에 lock: **항상 direction='more' 저장, 교환 버튼 = subject 교환** (direction 반전 아님). 같은 사실의 표현이 2개 생겨 검색이 모호해지는 것을 차단.
- 구노트 (direction NULL) 는 소급 변환 안 함 (작성자 의도 추정 불가) — 읽기 화면에서 "기준: shade" 표기만 붙음.
- 계보 (리뉴얼/단종) 방향성은 별개 단위 — `.planning/todos/pending/lineage-pair-relation-renewal-discontinued.md` 의 "열린 결정" 참고. 거긴 페어당 1개 분류 사실이라 노트가 아니라 페어 컬럼으로 풀 문제.

---
## `comparison_notes.axis` enum 살리는 이유 (2026-05-11 — 또 의문 떠올라서 박음)

> 모기 자주 떠오르는 의문: "free_text 만 있어도 의미 전달 되는데, axis enum 박은 이유? 자연어로 충분하지 않아?"

**답**: 살리는 이유 = **미래 axial 검색의 SQL 인덱스 역할**.

### Use case (모기 원안 의도, 2026-05-11 본인 정의)

> *"맥 모데스티보다 더 저채도인 거 없나?"*

→ canonical (D-097: 항상 `direction='more'`) 기준으로 "모데스티가 A 보다 더 쨍하다" 노트를 찾으면 object 쪽이 답. 현재 스키마 (pair_id + subject_side, D-059 재구조화 후) SQL 한방:

```sql
SELECT CASE WHEN n.subject_side = 'a' THEN p.shade_b_id ELSE p.shade_a_id END AS object_shade_id
FROM comparison_notes n
JOIN comparison_pairs p ON p.id = n.pair_id
WHERE (CASE WHEN n.subject_side = 'a' THEN p.shade_a_id ELSE p.shade_b_id END)
      = (SELECT id FROM shades WHERE slug = 'mac_modesty')
  AND n.axis = 'chroma' AND n.direction = 'more'
  AND p.is_deleted = false;
```

주의 — `direction = 'less'` 조건은 영원히 안 잡힌다. canonical 이 'less' 저장 자체를 막기 때문 ("A 가 더 저채도" 는 subject 를 바꿔 "B 가 더 쨍" 으로 저장됨).

free_text "이거 더 채도 낮음" 만 박혀있으면 **NLP 없이는 못 잡음**. enum 박혀있으면 즉시.

### 왜 자연어로 못 갈음

| 시나리오 | free_text 만 | axis + direction enum |
|---|---|---|
| "X 보다 더 Y 한 shade" 검색 | NLP 필요 (MVP 범위 밖) | SQL 한방 |
| 축별 비교 노트 묶음 ("chroma 비교만 보여줘") | 키워드 매칭 noise | `WHERE axis=...` 한 줄 |
| 다국어 (한/영) | 어휘 흔들림 | enum 안정 |

### 단점도 인정

- 입력 부담 (칩 4+null 중 1택)
- 자연어 안에 이미 정보 있으면 redundant
- **평가 4축 (왓챠 D75)** 과 어휘 충돌 위험 → 이미 위 "axis 단어 3 군데" section 으로 격리 풀이 박음

### 결론

살리고 간다. 박지 말까 의문 또 떠오르면 이 section 다시 보기.

---
## axes.ts 키 rename (완료 — 2026-06-10 stale 정리)

rename 끝남. `AxisKey` 는 현재 `app/src/data/types.ts:35` (`chroma | cloudiness | temperature | lightness`). 옛 `app/src/shared/lib/axes.ts` 파일은 더 이상 없음.

| 기존 (임시) | rename 후 |
|------|------|
| `chroma` | `chroma` (그대로) |
| `murk` | `cloudiness` |
| `temp` | `temperature` |
| `value` | `lightness` |

→ caption backfill (`[axes: murk=...]` 기존 데이터 정리) 은 D-090 (2026-05-26) 으로 폐기 — `shade_axis_ratings` 신규 입력 path 단독. 31_plan 자체도 D-090 으로 공식 폐기.

---
## 4축 데이터 — 왓챠 모델 (2026-05-11 brainstorm → lock 완료: 마이그 `20260511000000_shade_axis_ratings.sql` + D-082 + D-090)

> ⚠️ **모기 자주 까먹음 — 이 섹션 자주 다시 봐**. brainstorm 5/3 → 5/11 사이 흐름이 진동. 옛 정신 (swatch_items.submitter_*, 평균 도출) 은 폐기. 아래가 진본.

### 정신 한 줄

**등록 ↔ 평가 분리**. swatch 등록 흐름에는 4축 입력 ❌. shade 상세 / Atlas 노드 click 시트 안에서 누구나 별점처럼 평가 (왓챠피디아 모드).

### 어디 박힘

| 4축 출처 | 위치 | 단위 |
|---|---|---|
| **코어 본인 시그니처** (D27) | `user_profiles.chroma/cloudiness/temperature/lightness` (`is_core=true` 한정) | 1코어 = 1행 |
| **일반·코어 평가** (왓챠 모델) | `shade_axis_ratings` 신규 테이블 | 1유저 × 1shade = 1행, UNIQUE(shade_id, user_id) **upsert** |

### 평균 ❌ · 분포 ⭕ (자주 까먹어서 박음)

- 30_plan §1 D-B + DoD 정신: **분포만**. 평균 어디에도 박지 않음 (DB도 view 도).
- 이유: 4축 = 본질적 주관 (코덕 시각). 평균 박으면 거짓 권위 + 코어/일반 의견 차이 소실 + 메모리 룰 "코어 = 프리미엄" 위반.
- 평가 1명만 있어도 그 1명 dot 만 표시. "객관적 4축" 도출 ❌.
- 알고 싶으면 derived 통계 (중앙값 · IQR · 평가 수) 정도. 평균 X.

### 폐기된 정신 (5/3 brainstorm — 이제 무시)

| 옛 박힘 | 현재 |
|---|---|
| `swatch_items.submitter_*` 컬럼 추가 (31_plan §1 D-B stub) | ❌ **폐기** (단위 자체가 틀림 — swatch × shade ❌ → shade × user ⭕) |
| swatch 등록 흐름 마지막에 4축 입력 forced | ❌ **제거** (5~6개 multi-shade 트윗 입력 부담 해소) |
| `swatches.note` 끝 stringly-typed `[axes: ...]` 임시 저장 | ❌ **폐기** + caption 정리 (`stripAxisLine`) |
| 평균값으로 shade 의 "객관적 4축" 도출 | ❌ **분포만** — 평균 박지 않음 |

### shade_core_axes 라는 테이블은 안 만듦 (자주 까먹음 — 폐기 메모)

- D28 본문 (`14_decision_log.md:1328`) "또는" 가설. 안 만들기로 함.
- 그 이후 `swatch_items.submitter_*` 도 폐기 → **최종 안착 = `shade_axis_ratings`** (왓챠 모델).
- 즉 4축 평가 데이터 = **새 테이블 `shade_axis_ratings` 1개**. shades · swatch_items 컬럼 추가 ❌.

### 결정 진동 추적 (왜 흐름이 두 번 뒤집혔냐 — 모기 자가 점검용)

| 시점 | 박힘 | 비고 |
|---|---|---|
| 2026-05-03 | 31_plan §1 D-B stub = `swatch_items.submitter_*` 컬럼 | 30_plan dot scatter source. swatch × shade 단위 |
| 2026-05-03 | 30_plan §1 D-B + DoD = **평균 ❌ · 분포만** | 모기 의식 흐름 |
| 2026-05-11 | 왓챠 모델 brainstorm = 등록↔평가 분리 + shade × user 단위 | multi-shade 5~6개 트윗 등록 부담이 트리거. Claude 와 같이 굳힘 |
| 2026-05-11 | 일시 진동: "평균값으로 객관 4축 도출" | 본인이 5/3 박은 정신 잠깐 잊음. Claude 짚어줌 → **분포 정공 재확인** |
| 2026-05-11~26 | 마이그 `20260511000000_shade_axis_ratings.sql` + D-082 (dot scatter source lock) + D-090 (caption backfill 폐기) | lock 완료 — 이 표는 역사 추적용 |

---
## finish vs texture — D68/D72 이후 (자주 헷갈림)

> "립스틱 카테고리인데 글로우립스틱·매트립스틱이 있을 때 어디에 두지?" 자주 떠오름.

### 옛 판단 (D68 전 — stale)

- ~~**`product_lines.finish` 없음** — `init_core.sql:74-93` 확인. 라인 단위 finish 컬럼 미존재.~~
- ~~**`shades.finish` 있음** — `init_core.sql:109`. 개별 shade 단위.~~
- ~~즉 finish = **shade 단위 데이터**. 같은 라인 안에서도 shade 별로 다른 finish 가능 (팔레트, MLBB 시리즈에 매트+글리터 섞임 등).~~
- ~~트레이드오프: 매번 shade 입력 시 finish 반복 입력 부담 ↑. 단 라인 단위로 통일했으면 한 라인에 여러 finish 섞인 제품 못 표현.~~
- ~~**결론**: 현재 데이터 모델 유지 (shade 단위). 라인 단위 hint (예: "같은 라인의 다른 shade 가 매트면 자동 매트") 가 노가다 부담 줄이는 path. 데이터 모델 변경 안 함.~~

### 현재 truth (D68/D72/D-095/D-096/D-107/D-108 + PR #246)

- **현재 운영 SSOT (PR A-C 구간) = 기존 컬럼/테이블**. `forms`, `finishes`, `textures`, `product_lines.form_id`, `product_lines.finish_id`, `shade_textures`가 아직 write source. PR #246에서 traits 계열은 trigger mirror shadow 로 추가됨.
- **장기 방향 = form/finish/texture/finish_detail 을 `traits` 로 일반화**. `line_traits`는 product_line 공통값, `shade_traits`는 shade별 추가/예외값, `effective_traits(shade)`는 둘을 합친 값.
- **라인 단위 큰 피니시 후보 = `finishes` 마스터 + `product_lines.finish_id`** (D68, D-095). 단, D-107 이후 finish는 product_line identity가 아니라 trait로 본다. `product_lines.finish_id`는 legacy compatibility / mirror source.
- **물리적 형태 (form) = `forms` 마스터 + `product_lines.form_id` nullable FK** (D-096, 2026-06-10). category (탐색 단위) 와 finish (마감) 사이 레이어. 예: powder / cream / liquid / gel / stick / pencil. pressed·loose·baked 는 powder 하위로 취급 — top-level form 에 없음. form 은 라인 식별 키에 들어가지 않음.
- **`shades.finish` 는 D68 마이그에서 즉시 drop**. deprecated 보존 안 함.
- ~~**라인 식별 의미 = `(brand_id, name, finish)` / `(brand_id, name, finish_id)`**~~ 는 D-107로 superseded. 새 product_line identity 의미는 `brand + category + official line name + optional variant/disambiguator`. 구현은 PR D에서 확정.
- 기존 데이터 중 한 라인 안에 finish 가 섞인 케이스는 자동 split 안 함 → `product_lines.finish_id = NULL` 로 두고 어드민이 수동 정리.
- finish 어휘는 더 이상 frontend hardcoded enum 이 아님. 어드민/QA 가 `finishes` row 로 추가·수정한다 (D-095).
- **shade 단위 미세 질감 / nuance = `texture`** (D72). finish 와 다른 도메인.
- texture 모델 = `textures` 마스터 + `shade_textures` M:N 정션 (color_family 패턴).
- 예: 라인 finish=`cream`, shade texture=`creamy` 공존 가능. 이름이 비슷해도 의미 다름.
- `formula_variant` / `texture_note` / shade finish 재신설 후보는 D72 에서 폐기.
- **finish_detail 은 texture가 아님** (D-108). `finish_detail`은 parent `finish`가 있는 독립 trait이고, parent finish와 함께 저장·검증한다. 예: `glossy` + `glass_gloss`.

### 2026-06-18 QA 메모 — 설계가 더러워 보일 때 보는 원칙

- 색조 도메인은 "예쁜 정규화 한 방"으로 안 접힌다. 제품 라인, 쉐이드, 발색샷, 질감, 광, 펄, 성능 표현이 서로 완전히 분리되지 않고 겹친다.
- 지금 구조는 막장이 아니라 **핵심 데이터와 입력 보조 규칙을 분리한 구조**다.
  - `finish/form` = 라인 단위 큰 속성.
  - `texture` = shade 단위 미세 특징.
  - `*_category_rules` = 입력 UI 추천을 줄이는 규칙.
  - 전체 보기 = 예외 허용.
  - seed/어드민 = 운영하면서 조정.
- 모델링 대상은 제품의 객관 속성만이 아니라 **코덕이 제품을 설명할 때 쓰는 언어의 층위**다. 자연어라 예외가 계속 나온다.
- 저장 구조는 단계적으로 간다. 지금은 기존 `product_lines.finish_id/form_id`, `shade_textures`가 write source이고, traits 계열은 mirror. PR D 이후 traits를 SSOT로 뒤집는다.
- 추천 구조는 좀 지저분해도 된다: 현재 `*_category_rules`, mirror `category_trait_rules`, 나중의 finish 조건부 추천.
- 운영 seed 는 계속 바뀌어도 된다. QA 하면서 어드민으로 조정한다.
- "예쁜 모델"은 저장 구조에만 요구하고, 추천/입력 보조 규칙은 변하는 층으로 둔다.
- D-104 의 장점은 이 지저분함을 프런트 상수에 숨기지 않고 DB 규칙으로 빼낸 것이다.
- 지금 더 정규화하지 않는다. 우선순위:
  - finish/form/texture 경계 원칙 지키기.
  - 자동 선택 금지, 추천만 하기.
  - 립 texture seed 줄이기.
  - 하이라이터 texture seed 는 적극적으로 두기.
  - 조건부 추천은 메모만 두고 MVP 후속.

---
## Atlas 노드 다중색 표현 (자주 까먹음)

> Atlas 노드를 단색 이상으로 표현하고 싶은 욕구 자주 떠오름. 결정 박아둠.

- **듀오 섀도우 (반/반 색)** = **두 개의 노드로 표현하기로 이미 결정**. 한 노드 반 가르기 안 함. 까먹지 말 것.
- **팔레트 (N 색)** = **대표 색 1개로 노출**. 노드 안 쪼개기 안 함. 디테일 시트에서 팔레트 grid 별도. 한계 인정 (2026-05-07 모기).
- **글리터·쉬머 (밑색 + 펄)** = 노드에 밑색 + 펄 overlay 표현 **가능하긴 함**. 다만:
  - 데이터 모델: `effect_color hex` + `effect_type enum` 컬럼 추가 필요
  - 입력 UX: 컬러 피커 듀얼 + enum 선택. 시드 노가다 부담 ↑
  - Render: CSS `radial-gradient` 또는 SVG `<pattern>` overlay layer. 비용 작음
  - Atlas visual chaos 우려: 솔리드 + overlay 노드 섞이면 패턴 인지 어려움
  - OKLCH 위치 계산 어떻게 할지 결정 필요 (밑색 기준? 평균?)
  - 코어 글리터 코덕 진짜 가치, 일반 유저는 부차적 → **코어 전용 feature 가능성**
- **결론**: 글리터 차별 표현은 **MVP 이후 plan**. 코어 합류 + 진짜 필요해지면 plan 으로 펼침. 지금은 단색 노드 통일.

---
## 비교 발색샷 = swatches 모델 재활용 (별 테이블 안 만듦)

> 모기모기 모드에서 자주 떠오르는 의문 (2026-05-05). 답을 박아둠.

### 우려

비교 발색샷 어디다 올려? Atlas 비교노트도 / 상세시트도 양쪽 다? 업로더 부담?

### 답: 데이터 모델은 이미 됨 — swatches + swatch_items 다대다

비교 발색샷의 본질 = **한 사진에 두 발색이 같이 찍힘** = `swatch + 2 swatch_items`.

| 시점 | 어디서 가져오나 | 어떻게 |
|---|---|---|
| 상세시트 (shade A) | 상세시트 본인 영역 | `swatch_items WHERE shade_id = A` → 단독·비교 모두 |
| Atlas 비교노트 (페어 A·B) | link 시트 안 새 섹션 | `swatches` JOIN `swatch_items` 에서 **두 shade 다 매핑된 swatch** 만 필터 |

→ **데이터는 한 번 INSERT, 양쪽에서 자동 fetch**. 사용자 부담 없음.

### 진입점 정책 (Option A 채택, 2026-05-05)

- **업로드 = 상세시트 한 곳**. Atlas 비교노트 시트 = 보기 전용.
- 비교 발색샷 = "필수" 의미 = (ii) "atlas 어딘가에 보여야 함" 이지 (i) "노트 작성 시 첨부 강제" 아님.
- comparison_notes 는 텍스트 노트 그대로 (D-J 정신 유지). nullable swatch_id FK 추가 안 함.

### 구현 (별 plan 거리, 지금 안 함)

Atlas link 시트 안 새 섹션 1개 추가:
```
"이 두 발색의 비교 발색 N건"
→ swatches JOIN swatch_items WHERE swatch_id IN (
     SELECT swatch_id FROM swatch_items
     WHERE shade_id IN (A_id, B_id)
     GROUP BY swatch_id
     HAVING COUNT(DISTINCT shade_id) = 2
   )
```

데이터 추가 안 함, fetch 한 줄 + UI 섹션 1개. Phase 2 후 별 plan (33_plan 후보).

### 지금 안 박는 이유

- 28_plan Phase 2 = 사용 검증 단계, 새 feature 추가는 후속
- 데이터 패턴 (얼마나 비교 발색샷 swatch 가 쌓이는지) 보고 UI 디자인 디테일 결정

---
## D44 (게스트 회수) vs 코어 author claim (자주 까먹음)

> 메커니즘 비슷해 보여서 헷갈림. 둘은 **시나리오와 매칭 키가 다름**. D44 로 코어 case 못 다룬다.

| 항목 | D44 (게스트 회수) | 코어 author claim (34_plan stub) |
|---|---|---|
| 누가 등록 | **본인** (게스트 상태) | **타인** (어드민 모기가 대신) |
| 누가 가입 | **본인** | 코어 본인 |
| 매칭 키 | `swatches.created_by` = anon user.id | `swatches.author_handle` = 트위터 핸들 |
| 회수 방식 | `auth.updateUser({ email })` → user.id 유지 → 자동 보존 | self-claim 또는 어드민 검증 → handle 매칭 |
| 누구의 트윗 | 본인 트윗 | 코어 본인 트윗 (모기는 등록자) |
| 결정 상태 | D44 확정 (2026-04-28) | D-063·D-064 lock (2026-05-09) |

**핵심**: D44 케이스는 `created_by` 만으로 회수 충분. 본 case (모기 케이스) = `created_by = 모기 user.id`, `author_handle = '@cosmetic_JJUA'` → **`created_by` 매칭 0** → 트위터 핸들 매칭 흐름 별 필요.

**왜 헷갈리나**: 둘 다 "내가 만든 거 → 내 마이페이지" 라는 의도는 같음. 근데 "내가 만든" 의 정의가 다름 (등록자 vs 작성자).

### claim(회수)이 정확히 뭐냐 — 같은 기기 vs 다른 기기 (2026-06-30)

> "claim 은 다른 기기에서만 쓰는 보조경로?!" 또 헷갈려서 적어둠. **claim = `swatches.created_by` 를 지금 로그인한 내 uid 로 갈아끼우는 회수 작업.**

전제: 게스트 = Supabase 익명 로그인(anon-auth) = **임시 계정 uid 가 처음부터 있음**. swatch 만들면 `created_by` = 그 임시 uid.

- **같은 기기 (claim 0건)**: 폰에서 게스트(uid `aaa`) → 발색 `created_by=aaa`. 같은 폰에서 이메일 넣어 전환(`auth.updateUser({email})`) → Supabase 가 uid `aaa` **그대로 유지** → 발색 자동 보존. 옮길 게 없어서 claim 안 함.
- **다른 기기 (claim 필요 = 유일한 생존 이유)**: 폰에서 게스트(uid `aaa`)로 발색 만듦. 근데 노트북에서 매직링크 클릭 → 노트북은 별개 uid `bbb`. 폰 발색은 `aaa` 에 묶여있어 `bbb` 로 로그인하면 **안 보임**(주인 uid 가 다름). → 폰의 기기쪽지(`swatches.device_id`)를 노트북에 입력 → `claim_anon_swatches(device_id)` 가 그 쪽지 가진 주인없는 발색 `created_by` 를 `bbb`(지금 나)로 옮김 = 회수.

왜 "legacy fallback" 이라 부르나: 메인 흐름(같은 기기)엔 아예 안 쓰임. 다른 기기에서 수동 import 하는 한 케이스 때문에만 살아있음. **SSOT = D-044 본문 "구현 시 변경 (PR #44)" 절** (claim 자동호출 폐기 + anon-auth 보존). 정합 정리 = `.planning/threads/phase3-guest-claim-inventory-rpc-gap.md`.

**한 줄: 같은 기기 = uid 안 갈라짐 → 자동 보존, claim 0. 다른 기기 = uid 갈라짐 → device_id 쪽지로 수동 회수 = claim 의 유일 용도.**

---
## 발색샷 등록 ↔ 비교 노트 등록 통합 (37_plan stub)

> 모기 의문 (2026-05-11): "발색 등록할 때 비교 노트 어떻게 같이 등록? Atlas 에도 연결?"

본문 = git history 의 옛 `docs/strategy/37_plan_2026-05-11_발색샷_진입점_brainstorm.md` 참고. 현재 작업트리에는 없음 — 시나리오 4 분리 (S1/S2/S3/S4) + 가설 G-A~G-E (junction 정공 + S2/S4 폐기 + 사후 CTA + evidence c + 양방향 노출) + Phase 1~5 흐름.

**한 줄 핵심**:
- **데이터 모델 통합 (`comparison_note_swatches` junction) + UI 진입점 분리 (S1 + S3)** = 28_plan A4 lock 의 mirror pattern.
- lock 안 박음 — prototype 박아보고 번복 가능. 30_plan 본격 후 active 전환.

**2026-05-18 모기모기 모드 정리 — S3 v0 범위**:
- 중심은 **발색샷 등록**이 아니라 **비교노트**. Atlas 는 두 shade 사이의 관계를 보는 곳이고, 비교노트는 그 관계에 대한 판단, 발색샷은 그 판단의 근거.
- 안티패턴 위험: 비교노트 작성 중 갑자기 발색 등록/관리까지 요구하거나, 사용자가 의도하지 않은 새 게시가 상세시트에 생기는 흐름.
- 안전한 framing: **비교노트가 기존 발색샷을 근거로 참조한다. 발색샷 자체를 새로 게시하거나 복제하지 않는다.**
- v0 = S3만. Atlas 비교노트 작성 중 기존 swatch evidence 1개를 연결. `SwatchContributionSheet` 재사용 / 새 발색샷 등록 / S1 사후 CTA / 사진 직접 업로드는 제외.
- "Atlas 보다가 이 두 shade 비교발색샷 올려야지" 니즈는 유효. 다만 v0에 넣으면 과함. v1에서 보조 진입점으로 처리: Atlas 가 이미 알고 있는 subject/object shade 를 발색 등록 시트에 prefill 해주고, 등록 완료 후 비교노트 evidence 로 연결.
- 결론: 두 과정을 합치지 말고 **link** 한다. 발색샷은 발색샷으로 존재하고, 비교노트는 그 발색샷을 근거로 참조한다. 상세시트는 "이 발색샷이 어떤 비교노트의 근거로 쓰였는지"를 나중에 보여준다.

**2026-05-19 추가 기준 — 발색샷은 관찰 기록, 비교노트는 판단 기록**:

| 대상 | 역할 | 자동 생성/승격 룰 |
|---|---|---|
| `swatches` | 사용자가 올린 **관찰 기록**. 사진·출처·shade 매핑 | 상세시트/갤러리/evidence 후보에 쓴다 |
| shade 대표사진 | 한 shade 를 카드/상세 상단에서 대표하는 **표지 이미지** | 단독 shade swatch 우선. multi-shade swatch 는 단독 사진 없을 때 fallback 또는 admin override |
| `comparison_note_swatches` | 비교노트가 참조하는 **근거 사진 연결** | 두 shade 를 모두 포함한 기존 swatch 만 evidence 후보 |
| `comparison_notes` | 두 shade 사이에 대한 사람의 **판단 기록** | 발색샷만으로 자동 생성하지 않는다. 사용자가 명시적으로 비교노트를 쓸 때만 생성 |
| dupe | 비교노트보다 더 강한 **큐레이션 판단** | 발색샷/비교노트 존재만으로 자동 dupe 처리하지 않는다 |

대표사진 규칙:
- 5개 shade 비교발색샷처럼 multi-shade swatch 가 새 shade 5개에 모두 매핑될 수 있음. 이 사진은 관찰/evidence 로는 좋지만 각 shade 의 대표사진으로는 어색할 수 있다.
- 따라서 대표사진 자동 선택은 **single-shade swatch 1순위**. multi-shade swatch 는 fallback.
- admin 대표사진 지정 기능은 후속 후보. 지금 v0 문제를 막기 위해 필수는 아님.

Atlas/상세시트 규칙:
- 상세시트에서 두 shade 가 같이 들어간 발색샷을 올려도, 그것만으로 Atlas 비교노트가 자동 생성되면 안 됨.
- "같이 찍힌 발색샷 있음"은 관찰 신호. "A 가 B 보다 더 탁함"은 판단 신호.
- Atlas 에서는 나중에 `비교노트 있음`과 `같이 찍힌 발색샷 있음`을 다른 강도로 보여줄 수 있음. 예: 비교노트는 기존 note row/관계, 같이 찍힌 발색샷은 약한 힌트나 evidence 후보.
- 업로드 직후 "비교노트 추가할래요?" 모달은 흐름 끊길 가능성 큼. 모달보다 저장 완료 후 작은 CTA/토스트/하단 버튼이 낫다. 무시 가능해야 함.

**한 줄: 발색샷 = 관찰, 비교노트 = 판단, dupe = 강한 판단. 자동으로 서로 승격시키지 말고 필요할 때만 연결한다.**

**2026-05-19 추가 lock — 데이터 흐름 방향**:

- 비교노트에서는 **기존 발색샷 가져오기만** 가능하다.
- 비교노트 안에서 새 발색샷을 등록하지 않는다.
- evidence 사진은 여러 개 연결 가능. 단, 모두 기존 `swatches` 참조.
- 새 발색샷을 추가하고 싶으면 별도 발색 등록 진입점으로 이동한다. 비교노트 시트 안에서 등록 flow 를 열지 않는다.
- 상세시트 → 비교노트 방향으로 데이터 insert/update 되는 흐름은 만들지 않는다.
- 비교노트 → 상세시트 방향으로는 영향 가능. 예: 상세시트에서 "이 shade/발색샷이 비교노트 근거로 쓰였음"을 보여줄 수 있다.

**상세시트 노출 원칙**:
- 상세시트는 이미 정보가 많으므로 비교노트 전문을 크게 추가하지 않는다.
- v1 후보: 발색샷/후기 근처에 작게 "비교 근거로 쓰인 기록 N개" 정도. 기본 접힘.
- 펼치면 "A와 비교한 노트" 같은 1줄 목록만. 전문 소비/작성은 Atlas/link sheet 로 이동.
- 상세시트는 관찰 기록의 집, Atlas/비교노트는 판단 기록의 집. 상세시트에서 판단 기록을 만들지 않는다.

---
## 상세시트 파도타기 — 진입점 정리 (2026-06-11 정리 · 같은 날 코드 확인 정정)

> 고민 출발: "상세시트 UI 가 발색 파도타기에 적합하지 않다". 위 절의 역할 분리 (상세시트 = 관찰의 집 / Atlas = 판단의 집) 는 유지하되, 상세시트 안에 "다음 발색으로 옆걸음" 하는 진입점만 둔다. 파도타기 = "**이것과** 비슷한 다음 것" 으로 좁게 옆걸음하는 것 — 이 shade 기준 페어/이웃 신호만 자격 있음.
>
> **단 전제 자체가 절반 틀렸음 (같은 날 코드 확인)**: 파도타기 인프라는 이미 코드의 1급 개념 — `waveToShade` / `waveBack` / `shadeHistory` 뒤로가기 스택 (`app/src/features/shade-detail/DetailSheet.tsx:69-90,209-216`). 진짜 병목은 경로 부재가 아니라 **데이터 sparse + 발견성**.

### 이미 있는 파도 경로 (코드 확인 2026-06-11 — 까먹지 말 것)

| 경로 | 어디 | 상태 |
|---|---|---|
| **칩 탭 → TagFilterBlock** (범주 파도) | 카테고리·톤·피니시·컬러패밀리·텍스처 칩 전부 탭 가능 → 시트 안에 매칭 shade 최대 24개 inline 노출, 탭하면 `waveToShade` (`DetailSheet.tsx:261-276`, `:456-480`) | **동작 중** — 만든 팀 본인들이 존재를 잊고 "칩 탭 일부러 뺐다" 고 잘못 기억함. affordance (눌리는 것처럼 보이나) QA 후보 |
| **비교발색샷 내 shade 클릭** (페어 파도) | swatch 카드의 다른 shade → `OtherShadesList.tsx:60` → `onJumpShade = waveToShade` | **동작 중** (코드 확인) |
| **하단 dupe related 가로 스트립** | 시트 맨 아래 카드 스트립 (`DetailSheet.tsx:366-389`) | **존재** — 단 dupe 데이터 sparse 라 `related.length === 0` 이면 안 렌더 → "그 아래엔 뭐가 없네" 로 보였던 원인 |

### 보강할 갈래 2개 (lock 아님 — 구현은 버그리포트 큐 정리 후)

| 갈래 | 신호 | 강점 | 한계 | 상태 |
|---|---|---|---|---|
| **비교노트 페어 노출** | 사회 필터 (D60 — 비교노트 존재 = 약한 유사) | 사진 없이도 쌓임 → 누적 싸고 빠름. "색 유사" 파도 연료로 최적 | 전문 소비/작성은 Atlas 로 — 기본 접힘 1줄 목록 (위 "상세시트 노출 원칙" 의 v1 후보 그대로) | TODO 큐 "dupe 외 노출 정책" 미정 항목과 같은 자리. 미정 → 이 방향으로 기움 |
| **자매라인 합류** | 같은 product_line | **신규 UI 아님** — 기존 하단 related 스트립에 same_line shade 합류 (또는 인접 섹션). `product_line_id` 쿼리로 충분 | 색 유사 아님 — "제품 축" 파도. dupe (강신호) 와 같은 줄에 섞을지 분리할지 열린 결정 | `.planning/todos/pending/detail-sheet-same-line-strip.md`. 2026-05-08 "별 라우트 분리" lock 의 번복 — 단 별 라우트와 배타 아님 (공존 가능) |

### ~~컬러패밀리 칩 탭은 일부러 뺐다~~ → 정정 (2026-06-11 코드 확인)

~~컬러패밀리 = 굵은 범주 → 칩 탭 = 홈 탭 가는 shortcut 일 뿐, 새 가치 작음. 의도적 제외.~~

**사실과 다름 — 코드 안 보고 기억으로 적은 문장.** 칩 탭은 이미 동작하고, 홈 탭 점프가 아니라 시트 내 TagFilterBlock (위 표) 으로 이어짐. "뺐다" 는 기억 자체가 잘못. 남는 질문은 "넣을까" 가 아니라 칩의 탭 가능 affordance 와 TagFilterBlock 발견성.

### 위치 주의 — 4축 분포도 문제와 맞물림

파도 경로 (TagFilterBlock·발색샷·related 스트립) 가 전부 4축 분포도 아래라, 분포도가 화면을 과점하면 파도 경로 전체가 fold 아래로 밀림 (`.planning/todos/pending/detail-sheet-axis-scatter-ui-consolidation.md`). 파도타기는 다음 파도가 *보여야* 탄다 — 분포도 축소가 사실상 파도타기 발견성 작업.

**한 줄: 파도 인프라 (wave 스택 + 칩 범주 파도 + multi-shade 점프 + dupe 스트립) 는 이미 있다. 보강 = 비교노트 페어 + 자매라인 합류. 진짜 병목 = 데이터 sparse (dupe·비교노트 채우기) + 발견성 (분포도 축소·칩 affordance).**

---
## 리뉴얼/단종 계보 + 탁기 한 스푼 수요 (2026-05-20 dogfood 메모)

### 리뉴얼 / 단종 / 이름 바뀐 재출시 제품

상황:

- 리뉴얼되어 재출시됐고 제품명까지 바뀐 경우가 있음.
- 데이터 입력은 **다른 행으로 INSERT**할 예정.
- 고민: 둘이 강한 연관이 있다는 것을 어떻게 남길지. 예: "구 A 제품의 리뉴얼", "단종 후 B 이름으로 재출시", "공식명은 다르지만 사용자가 같은 계보로 인식".

현재 원칙:

- **새 DB 컬럼 / 새 대형 기능 추가는 하지 않는다.**
- dogfood 안정화 모드 유지.

~~가능한 임시 처리 (2026-05-20 — 아래 2026-06-11 정정으로 supersede):~~

- ~~비교노트에 "구버전/리뉴얼 버전 관계"를 자연어로 남긴다.~~ → 정정됨. 색 내용 없는 계보 사실은 비교노트에 쓰지 않는다 (아래)
- Atlas pair 관계나 comparison note 기반으로 둘을 강하게 연결해둔다. → pair 관계 쪽이 맞는 방향으로 정리됨
- 제품명 / 라인명 / finish / category를 최대한 정확히 넣고, 운영 메모로 TODO만 둔다. → 유지

#### 2026-06-11 정정 — 계보는 노트가 아니라 페어 관계 (단위 대조)

**비교노트의 계약 = "이 두 발색, 색이 어떻게 다른가"** 에 대한 판단 기록이지, 계보 정체성 서술이 아니다.

| 입력 | 판정 | 어디로 |
|---|---|---|
| "리뉴얼되고 살짝 탁해짐" | 색 차이를 말함 → **정당한 비교노트** (오염 아님) | `comparison_notes` 그대로 |
| "단종 후 B 이름으로 재출시" / "공식명 다르지만 같은 계보" | 색 내용 없는 순수 정체성 사실 | 비교노트 금지 — todo 의 계보 페어 메모에 기록 |
| "이 shade 단종됨" | shade 단위 사실 (페어 아님) | `shades.availability='discontinued'` — 이미 있음, 어드민에서 찍으면 끝 (마이그 0) |

근거 = 단위 대조 (관계 vs 노트 표 그대로 대입):

- "A 는 B 의 리뉴얼이다" = **페어당 정확히 1개인 분류 사실** → `comparison_pairs` 줄 (is_dupe 와 같은 줄). 노트 (페어당 N행 코멘트) 가 아님.
- free_text `[계보]` 마커 방식은 단위 불일치라 폐기 — 어느 노트에 붙이나? 그 노트 삭제되면 계보 사실도 증발하나?
- "리뉴얼 여부" 를 shades 컬럼으로 넣는 안도 단위 불일치 — 상대 (누구의 리뉴얼인지) 를 가리킬 수 없음. 단종 = 단항 (shade), 계보 = 이항 (pair) 으로 분담.

실행 상태 = `.planning/todos/pending/lineage-pair-relation-renewal-discontinued.md`. 순수 계보 사실은 거기 "계보 페어 메모" 절에 페어 (shade ID 쌍) 로 누적 → 나중에 `comparison_pairs` 확장 (is_lineage 류) 마이그 시 backfill 목록이 됨. 스키마는 지금 안 만짐 — 실제 데이터 10~20건 넣어보며 패턴 본 후 결정 (dogfood 원칙 유지).

#### 2026-06-12 메모 — 리미티드 에디션 색 추가 = 같은 라인 + `availability='limited'` (비용 0)

케이스: 구찌 글로우 하이라이터 (프로스티드 라일락 등) 에 "글로우 하이라이터 리미티드 에디션 아르틱 핑크" 처럼 **아예 다른 색의 한정판 shade** 가 따로 나옴. 계보 (리뉴얼) 아님 — 한정판은 계보와 무관한 판매 상태 (lineage todo "availability 는 페어 테이블이 생겨도 대체 안 됨" 절 케이스 3).

처리:

- **같은 `product_line` 의 shade 로 등록** + 어드민에서 판매 상태 `limited`. 별도 라인으로 만들지 않는다.
- 이유: 상세시트 자매라인 출력이 `product_line_id` 로만 묶임 (`app/src/data/supabaseAdapter.ts:139-200`) — 별 라인이면 자매라인에 안 나옴.
- 비용 0 (컬럼·마이그·코드 전부 불필요): `shades.availability` 존재 (`supabase/migrations/20260416063901_init_core.sql:124`) + 어드민 select 존재 (`app/src/features/admin/routes/AdminPage.tsx:207`) + 프런트 limited 통과 (`supabaseAdapter.ts:238`).
- D-069 라인 정의 ("같은 라인 = 패키지+제형까지 같음") 의 예외 한 줄: **한정판 색 추가는 같은 라인으로 본다. 한정 여부는 availability 가 받는다.** 원 정의의 의도는 제형 차이 (홀리카 마이페이브 케이스) 분리였음.
- 안 남는 것: "리미티드 에디션" 공식 명칭 문자열 (라인명 검색에 안 잡힘). 실제 검색 수요가 보이면 그때 검토 — 지금 컬럼 추가 안 함.

### "어떤 제품보다 탁기 한 스푼 들어간 거" 수요

사용자 수요:

- "A보다 조금 더 탁한 색"
- "B보다 탁기 한 스푼"
- "비슷한데 더 뮤트한 것"

현재 가설:

- 새 검색 기능이나 새 컬럼보다 **비교노트 기반**으로 일부 충족 가능.

쓸 수 있는 기존 자산:

- `comparison_notes.axis = cloudiness`
- `comparison_notes.direction`
- `comparison_notes.free_text` 안의 자연어 비교
- Atlas pair / comparison_note edge

지금 당장 할 일:

- 데이터 채우면서 "탁기", "뮤트", "회끼", "흰끼", "채도 낮음" 같은 표현이 실제 비교노트에 얼마나 자주 나오는지 본다.
- UI 기능으로 키우지 말고, 먼저 좋은 비교노트 예시를 쌓는다.

원칙:

- **이 이상 새로운 기능이나 DB 컬럼 추가 없음.**
- 필요하면 기존 comparison note와 Atlas 흐름 안에서 해결 가능한지 먼저 확인.

---
