# 모기 마이그레이션 노트 — 2026-07-16 (PR #371 D-108 resolved_finishes)

> `supabase/migrations/20260716000000_d108_resolved_finishes.sql` 을 한 줄씩 읽으며 물어본 것을 기록한다. Java·Spring·MSSQL 비교와 함께 남긴다.

## 왜 "constraint trigger 라 기존 row 를 소급하지 않는다"인가 (:16 주석)

제약조건과 트리거의 근본 차이다.

### MSSQL 감각으로 번역

- MSSQL 에서 `ALTER TABLE ... WITH CHECK ADD CONSTRAINT CK_xxx CHECK (...)` 를 실행하면 그 순간 **테이블에 이미 있는 row 전부를 검사**한다. 위반 row 가 있으면 ALTER 자체가 실패한다.
- **트리거**는 다르다. 트리거는 "앞으로 발생하는 INSERT/UPDATE/DELETE 이벤트"에만 발동하는 코드다. 트리거를 새로 만들거나 본문을 고쳐도, **이미 테이블에 있는 row 에는 아무 일도 일어나지 않는다.** 그 row 들은 이벤트를 일으킨 적이 없기 때문이다.

### 이 마이그에 적용하면

- 이 마이그의 검증 로직(`validate_shade_traits_state`)은 CHECK 제약이 아니라 **트리거로 실행되는 함수**다.
- Postgres 의 constraint trigger 는 이름에 "constraint" 가 있지만 본질은 트리거다. 일반 트리거와의 차이는 커밋 시점까지 실행을 미룰 수 있다는 것(DEFERRABLE)뿐이다.
- 따라서 "소급하지 않는다" = **검증 함수를 이번에 강화해도, 기존 데이터 중 새 규칙을 위반하는 row (예: shade 에 finish 2개)가 있으면 그대로 조용히 살아남는다**는 뜻이다.

### 그래서 (2)번 DO 블록이 존재한다

- 마이그 시점에 기존 데이터를 **수동으로 한 번 전체 검사**해서, 위반이 있으면 `RAISE EXCEPTION` 으로 트랜잭션 전체를 실패시킨다.
- MSSQL 감각: 트리거는 과거를 안 보는 점이 `WITH NOCHECK` 제약과 비슷하므로, `WITH CHECK` 가 해주는 "기존 데이터 검사"를 DO 블록으로 직접 구현한 것이다.

### 주석의 "NOT VALID constraint 대신"

- Postgres 의 `NOT VALID` 는 "제약을 추가하되 기존 row 검사는 건너뛴다"는 옵션 — MSSQL `WITH NOCHECK` 에 해당한다.
- 이 마이그는 그 경로(나중에 `VALIDATE CONSTRAINT` 로 소급 검사) 대신, 마이그 시점에 사전 진단 블록으로 정합을 바로 보장하는 쪽을 택했다.

### 요약 대응표

| 개념 | MSSQL | Postgres (이 마이그) |
| --- | --- | --- |
| 제약 추가 + 기존 row 검사 | `WITH CHECK ADD CONSTRAINT` | `ADD CONSTRAINT` (기본) |
| 제약 추가 + 기존 row 건너뜀 | `WITH NOCHECK` | `NOT VALID` |
| 새 이벤트에만 발동, 과거 무시 | 트리거 | 트리거 (constraint trigger 포함) |
| 트리거 강화 시 기존 데이터 정합 | 직접 검사 쿼리 필요 | (2)번 DO 블록 사전 진단 |

## proacl 리셋 — 왜 CREATE OR REPLACE 만 쓰나 (:21 주석)

MSSQL 로 치면 "DROP PROCEDURE 후 재생성하면 GRANT 가 전부 날아가는 문제"다.

### proacl 이 무엇인가

- Postgres 는 함수의 권한(누가 EXECUTE 할 수 있나)을 시스템 카탈로그 `pg_proc` 의 `proacl` 컬럼에 저장한다. ACL = Access Control List.
- MSSQL 의 `sys.database_permissions` 에 해당하는 정보다.

### DROP + CREATE vs CREATE OR REPLACE

- `DROP FUNCTION` + `CREATE FUNCTION` = **새 객체**를 만드는 것. 그동안 GRANT/REVOKE 로 쌓은 권한이 전부 초기화된다. MSSQL 에서 프로시저 DROP 후 재생성하면 GRANT 를 다시 해야 하는 것과 같다.
- `CREATE OR REPLACE FUNCTION` = **같은 객체를 유지하며 본문만 교체** (MSSQL `ALTER PROCEDURE` 에 해당). 권한이 그대로 보존된다.

### Postgres 가 MSSQL 보다 위험한 이유

- MSSQL 은 프로시저를 새로 만들면 권한이 "아무도 없음" 상태다. 실수해도 접근이 막히는 안전한 방향으로 틀어진다.
- Postgres 함수는 기본값이 반대다 — **새로 만든 함수는 PUBLIC (모든 롤) 에게 EXECUTE 가 자동 부여**된다. 즉 DROP 후 CREATE 하면 "권한 없음"이 아니라 **"아무나 실행 가능"으로 열린다.**

### 이 repo 의 사고 맥락

- `20260702010000` / `20260708090000` 마이그가 일부 함수의 PUBLIC EXECUTE 를 REVOKE (회수) 했다.
- 이후 마이그가 그 함수를 DROP 후 CREATE 하면 proacl 리셋으로 기본값(PUBLIC EXECUTE)이 되살아나 회수가 조용히 무효화된다.
- 그래서 `20260713000000:376` 에 "함수 재정의는 반드시 CREATE OR REPLACE 로" 규칙이 있고, 이 마이그의 (3)번 `validate_shade_traits_state` 재정의가 그 규칙을 따른다.

### 요약 대응표

| 개념 | MSSQL | Postgres |
| --- | --- | --- |
| 권한 저장 위치 | `sys.database_permissions` | `pg_proc.proacl` |
| 본문만 교체 (권한 보존) | `ALTER PROCEDURE` | `CREATE OR REPLACE FUNCTION` |
| 재생성 시 권한 | 아무도 없음 (닫히는 방향) | PUBLIC EXECUTE 자동 부여 (열리는 방향) |

## line_traits 변경 시 shade 재검증 트리거를 왜 안 넣었나 (:25 주석)

### 무슨 구멍인가

검증 트리거는 `shade_traits` 에 쓰기가 일어날 때만 발동한다. 그런데 `resolved_finishes` 결과는 `line_traits` 에도 의존한다 (상속 분기). 그래서 이 시나리오가 뚫린다.

1. line 에 finish=글로시, shade 는 override 없음 → resolved = 글로시
2. shade 에 finish_detail=유리알광 (parent=글로시) 저장 → 검증 통과, 정상
3. 에디터가 **line 쪽에서** 글로시를 삭제·교체 → shade 의 resolved 집합에서 글로시가 사라짐 → 유리알광의 parent 가 사라짐
4. 3번은 `line_traits` 이벤트라 shade 검증 트리거가 안 돈다 → 모순 데이터가 조용히 살아남는다

"트리거는 이벤트가 없으면 안 본다"는 :16 과 같은 원리다. 이벤트가 다른 테이블에서 일어나기 때문이다.

MSSQL 감각: FK 제약이었으면 부모 삭제 시도 자체가 거부돼 양방향으로 지켜졌을 관계를, 트리거 기반 soft 검증으로 만들어서 **자식(shade) 쓰기 방향만 지켜지는** 상태다.

### 왜 이번 PR 범위 밖인가

1. **새로 생긴 구멍이 아니라 원래 있던 구멍** — 기존 검증도 shade 쓰기 시점에만 돌았고 line 변경 시 재검증은 예전부터 없었다. 이 PR 은 기존 동작 유지 (`260716-c3a-PLAN.md:71`). 이 quick 의 위협 모델도 shade_traits 쓰기로 한정.
2. **비용이 다른 급** — line finish 하나를 바꾸면 그 line 의 모든 shade 를 재검증해야 한다 (fan-out). `validate_line_traits_state` 를 건드려야 하는데 D-108 todo 가 명시적으로 "하지 않을 것"에 넣은 항목.
3. **수용 위험으로 문서화됨** — `260716-c3a-SECURITY.md:68` R-1 항목 + SUMMARY "남은 것" (`:124`) 에 후속으로 기록. 몰래 뺀 게 아니라 문서화된 결정.

### 현재의 실질 방어 = 운영 절차

DB 가 이 방향을 안 지켜주는 동안의 방어는 운영 규칙이다.

- 모기 본인 규칙: finish/texture/form 어휘는 에이전트와 상의 없이 즉흥 삭제하지 않는다 (2026-07-16 결심).
- D-110 vocab-snapshot: 어휘·룰 마스터를 읽기전용 코드 미러 (`app/src/data/vocab-snapshot.md`) 로 떠서 문서·DB drift 를 대조할 수 있게 한 절차. 아직 수동 커맨드 기반이라 약하지만, line 어휘를 지우기 전에 스냅샷과 대조하는 습관이 위 구멍의 현재 완충재다.
- 후속 트리거가 생기기 전까지는 "line finish 삭제·교체 = 딸린 shade 의 finish_detail 고아화 가능"을 기억하고 삭제 전에 확인한다.

## "부모 trait 지울 때 자식도 cascade 처리하면 되지 않나?" — 층 구분

직감은 맞지만, "지운다"가 두 층에서 일어나고 cascade 로 풀리는 것은 한 층뿐이다.

### 층 1 — traits 마스터에서 어휘 자체를 지우는 경우 (FK 가 이미 처리)

`20260619000000_trait_schema_mirror.sql` 기준:

- `traits.parent_trait_id REFERENCES traits(id)` (:12) — ON DELETE 절 없음 = NO ACTION. 자식 finish_detail 어휘가 남아 있으면 부모 finish 어휘 삭제가 **FK 에러로 거부**된다. MSSQL FK 기본값과 같다.
- `line_traits.trait_id` / `shade_traits.trait_id` → `ON DELETE CASCADE` (:42, :61). 어휘 마스터를 지우면 그 어휘를 쓰던 **배정 row 들은 같이 삭제**된다.

"부모를 지우면 자식도 처리"는 이 층에서 이미 작동한다. 방식이 CASCADE 가 아니라 "자식 먼저 정리 안 하면 거부"인데, 이것이 어휘 즉흥 삭제 금지 규칙과 맞는 방향이다 — DB 가 강제로 한 번 멈춰 세운다.

### 층 2 — R-1 구멍은 마스터 삭제가 아니다

R-1 시나리오에서는 traits 에서 아무것도 지워지지 않는다. 에디터가 지우는 것은 `line_traits` 의 배정 row 하나다 ("이 라인에서 글로시를 뺀다"). 이때:

- 글로시 어휘도, 유리알광 어휘도, shade 의 유리알광 배정 row 도 전부 존재
- 모든 FK 가 완벽하게 만족된 상태
- 깨진 것은 오직 **계산된 관계** — "shade 의 finish_detail parent 는 `resolved_finishes(shade)` 집합 안에 있어야 한다"

FK cascade 는 "row A 가 row B 를 직접 참조"할 때만 선언할 수 있다. 이 관계는 두 테이블(shade_traits/line_traits)에 override 우선 로직까지 낀 **계산 결과**라서 FK 로 표현이 안 된다. 그래서 이 검증이 제약이 아니라 트리거이고, R-1 후속도 "트리거 추가"로 적혀 있다.

### 정확히 뭐가 FK 고 뭐가 아닌가

- **FK 로 표현되는 것 (이미 있음)**: "유리알광의 부모는 글로시다" — 어휘 사전 레벨의 부모 관계. `traits.parent_trait_id REFERENCES traits(id)`.
- **FK 로 표현 안 되는 것 (그래서 트리거)**: "**이 shade 에서** 유리알광을 쓰는 게 유효한가" — parent 글로시가 그 shade 의 resolved 집합 안에 있는가.

FK 가 말할 수 있는 것은 "이 컬럼 값은 **저 테이블의 저 컬럼**에 존재해야 한다" 하나뿐이다. 우리가 원하는 조건은 "이 값은 **`resolved_finishes(이 shade)` 라는 쿼리 결과** 안에 존재해야 한다"인데, FK 는 고정된 테이블·컬럼만 가리킬 수 있고 함수나 쿼리 결과는 못 가리킨다. resolved 집합은 shade 마다 다르고(override 유무로 분기) line_traits 가 바뀌면 내용이 변한다. MSSQL 도 동일 — 이런 조건은 FK·CHECK 로 안 되고 트리거로 간다.

한 줄 요약: **"부모가 누구냐"는 FK, "그 부모가 이 shade 에서 켜져 있냐"는 계산이라 트리거.**

### 후속 트리거의 두 가지 방식

line finish 배정 삭제 시:

| 방식 | 동작 | 판단 |
| --- | --- | --- |
| restrict 방식 | 딸린 shade finish_detail 이 있으면 line finish 삭제를 거부 → 에디터가 shade 쪽 먼저 정리 | **추천** |
| cascade 방식 | shade 의 finish_detail 배정을 자동 삭제 | 비추천 |

cascade 는 에디터가 line 을 만지는데 shade 레벨 데이터가 조용히 사라진다 — 이 마이그의 운영 철학("애매하면 비워둔다", 조용한 데이터 소실 경계, :151 주석)과 정면 충돌. restrict 의 tradeoff 는 에디터 손이 한 번 더 가는 것.

## "parent 트리 매칭이 기계적이다" — 그 위화감은 이미 결정에 반영돼 있다

읽다가 든 느낌: line 에 parent 글로시, shade 에 자식 유리알광을 매칭시키는 구조가 코덕 언어의 자연스러움이 아니라 사전 트리를 강제하는 형식 검사 같다. "finish_detail 설계를 대충했나?"

판정: 대충한 게 아니라, 그 위화감을 이미 한 번 감지하고 회수했다. 그게 D-109 대개정 (2026-07-11) 이다.

### 시간순

1. **D-108 원판 (6월)**: 유리알광·탱글광을 정식 어휘로 넣되 parent 강제 — "독립 피니시가 아니라 상위 피니시를 전제로 하는 세부 표현"이라 조합 오류(매트+유리알광)를 막으려는 것. 트리 자체는 논리적으로 맞는 설계.
2. **위화감의 실체**: 광 표현은 마케팅·유저 언어라 경계가 흐릿한데 통제된 사전 트리에 욱여넣으면 기계적이다.
3. **D-109 대개정**: 정확히 그 이유로 finish_detail 정식 확장을 **보류**하고 유리알광류는 user keyword / 발색 의견 descriptor 로 내림 (`D-109.md:186`). 정식 어휘 승격은 립 dogfood 에서 반복성·탐색 가치가 증명될 때만 (`D-109.md:343`).

### 현재 구조 = 이층

- **승격된 어휘 (finish 8종 등)**: 기계적인 트리·검증 적용 — 필터·추천이 기대는 층
- **살아 있는 코덕 언어 (유리알광·꿀광·매트펄 등)**: user keyword / 발색 의견 — 자유롭게 쌓이는 층

이번 마이그의 finish_detail 검증은 지금 기능 보호가 아니라 "미래에 승격할 때의 규칙 고정"이다.

### 설계 대안 비교 (트리가 나쁜 선택이 아닌 이유)

| 대안 | 결과 |
| --- | --- |
| 자유 키워드만 | 자유롭지만 필터·추천에서 "무슨 계열 광인지" 못 씀 — 현재 D-109 의 기본층 |
| 평평한 독립 어휘 | 매트+유리알광 같은 모순 조합이 그대로 저장됨 |
| parent 트리 (D-108) | 검증 가능하지만 기계적 — 승격된 어휘에만 쓸 가치 |

열린 질문은 하나로 좁혀져 있다: dogfood 에서 어떤 광 표현이 승격 기준을 넘느냐 (`D-109.md:327`).

## 매트펄 태클 — 열었다가 스스로 닫음 (2026-07-16)

읽다가 든 태클: "line=매트, shade=매트펄 구조가 부자연스럽다. 매트랑 매트펄을 분리해야 하나?" — 그런데 이건 2026-07-12 에 이미 tradeoff 표까지 만들고 닫은 질문이었다 (`domain-review-20260712.md:74` D 부속 판정).

### 판정 요지 (2026-07-12, 모기)

- 티르티르 MP 계열 canonical finish = **matte 지정** (매트 바탕 + 펄 = 매트 계열).
- 반복 니즈 확인 시 새 canonical finish 가 아니라 **matte 하위 finish_detail 로 승격** (D-108 모델, D-109 절차).
- "매트펄도 매트로 치는 사람들이 있다" — 태클 걸며 다시 떠올린 이 문장이 바로 판정 당시의 핵심 근거였다. 분리하면 매트 필터에서 MP 팬이 아예 안 보인다.

### "부자연스럽다"는 반은 오해 — 세 층이 따로 논다

| 층 | 값 | 역할 |
| --- | --- | --- |
| 공식 갈래명 "매트펄" | 별도 nullable 값으로 보존 (D-107:102) | 상세 화면 탭 기준 (E 판정) — 매트펄 탭은 화면에 살아 있음 |
| canonical finish = matte | 검색 필터 백본 | 필터 결과 포함 여부만 결정 |
| finish_detail 승격 | 미래 (니즈 확인 시) | matte 하위로 |

기계적인 트리는 검색 백본에만 있고, 코덕이 보는 화면은 브랜드 언어(매트펄)를 유지한다.

### 분리(새 canonical)의 비용 — 판정 때 이미 계산됨

- coarse 8종 전체 경계 재판정 유발 (쉬머펄은? 글리터펄은?)
- 강등 시 duochrome 류 미지정 추락 문제 재생산
- 매트펄 탭은 갈래명으로 어차피 유지 — 분리로 얻는 화면상 이득 없음

### 재검토 장치

인터뷰 질문이 이미 걸려 있다 (`trait-model-product-dogfood/README.md:400`): "매트펄이 매트 탭 안에 있으면 자연스러운가, 따로 보이길 기대하는가." 반례가 일관되게 나오면 그때 다시 연다.

### 교훈

니즈가 충분해야 구조 복잡해지는 것을 감수하고 어휘를 추가한다. 어휘는 공짜가 아니다 — canonical 에 들어오는 순간 필터·경계 판정·검증 비용을 계속 문다. 즉흥 아이디어 → 기존 판정·근거 대조 → 룰 유지, 이 흐름이 vocab 절차가 작동한 사례.

## 매트펄을 finish_detail 로 승격하면 R-1 재검증 구멍은 어떻게 되나

결론: **승격이 그 "후속" 트리거를 "선행 조건"으로 끌어올린다.** 승격하는 순간 R-1 이 이론에서 실전이 된다.

### 배치별로 갈린다

| 배치 | 구조 | R-1 노출 |
| --- | --- | --- |
| 혼합 라인 (에어슬릭 유형) | line finish 비움 + shade finish=matte(override) + shade detail=매트펄 — parent 가 같은 shade scope | 안전 — resolved 가 자기 override 라 line 변경에 안 흔들림. 이번 마이그 트리거가 이미 지킴 |
| 라인 전체 매트 + 일부 shade 만 매트펄 | line finish=matte + shade 는 detail 만 두고 parent 를 line 에서 상속 | **직격** — line 의 matte 를 교체·삭제하면 shade 의 매트펄이 소리 없이 고아화 |

### 핵심 발견

- D-108 원문(`D-108.md:98`)은 이미 이 재검증을 **요구**한다: "parent finish 를 변경·삭제할 때 resolved_finishes 가 바뀌면 영향받는 finish_detail 의 정합성을 다시 검증". 결정문은 트리거를 원하고 구현만 미룬 상태.
- 미뤄도 안전했던 이유 = D-109 보류로 finish_detail 이 잠자는 층이라 고아화될 데이터가 없어서 (마이그 사전 진단 (2-3) 통과가 방증).
- 따라서 승격 = 어휘 한 줄 추가가 아니라 **잠자던 검증 요구사항이 같이 깨어나는 것.** "니즈가 충분해야 구조 복잡화를 감수한다"의 복잡화 비용에 이 트리거가 포함된다.

### 기록 위치

`.planning/threads/trait-generalization/d109-followups.md` §C 에 "finish_detail 승격 시 선행: line_traits 재검증 트리거 (restrict 방식)" 체크리스트로 추가 (2026-07-16).

## 등록된 line/shade 의 finish 는 누가 바꿀 수 있나

기억이 맞았다 — 어드민 중심이고, 일반 유저는 미게시 상태까지만.

- **직접 테이블 쓰기 = 어드민 전용.** `line_traits`/`shade_traits` RLS = `anon_read` + `admin_insert/update/delete` 만 (`20260619000000_trait_schema_mirror.sql:50-76`).
- **일반 유저는 RPC 경유 + 미게시 게이트.** `set_line_traits` 입구의 F1 게이트: `NOT is_admin()` 이고 그 라인에 발행된 swatch 가 하나라도 붙어 있으면 `line_in_use` 예외 (`20260713000000:399-408`). shade 쪽도 동일 결 (`set_shade_texture_traits` 같은 게이트, `update_inline_product_shade_v2` 는 `shade_already_published`).
- **R-1 과의 연결**: R-1 시나리오(발색·detail 쌓인 라인의 finish 교체)는 정의상 발행 swatch 가 붙은 라인이라, 밟을 수 있는 손이 사실상 어드민(모기·도리토)뿐. "어휘 즉흥 삭제 안 함" 운영 규칙이 실질 방어로 성립하는 이유 — 위험 행위자와 규칙 적용 대상이 같은 사람이다.

## 두 번째 매트펄 태클 — "R-1 별거 아니면 바로 추가해도 되지 않나?" (기각)

R-1 노출이 어드민으로 좁다는 확인 직후 나온 생각. 기각 이유: **R-1 은 애초에 매트펄을 미룬 이유가 아니다.** 승격 앞의 게이트는 두 개고 서로 독립이다.

| 게이트 | 내용 | 상태 |
| --- | --- | --- |
| 기술 (R-1 트리거) | D-108:98 이 요구하는 재검증. 어드민 한정 노출로 확률은 낮아졌지만 구멍 자체는 존재 | 싸졌지만 필요 — 트리거 하나면 닫힘 |
| 결정 (D-109 승격 기준) | "사용자 불만·반복 니즈가 확인되면 그때 승격" (`domain-review-20260712.md:74`). 확인 장치 = 인터뷰 질문 | **안 열림** — 인터뷰 전, 니즈 증거 0 |

"어드민만 밟을 수 있으니 안전"이 약한 위안인 이유: balm 누락, #199 squash 후 push, vocab-snapshot 을 만든 동기 전부 **어드민 본인의 실수**를 막으려는 것이었다. 위험 행위자가 어드민이라는 것은 확률 낮음이지 구멍 없음이 아니다.

승격이 R-1 말고 끌고 오는 복잡화: finish_detail picker/등록 UX 부활 (D-109 §4 가 내려둔 것), shade 예외 편집 UI todo 미완, 클라 미러에 finish_detail 소비처 없음, M1 출시 안정화 우선 구간.

결론: 판정 유지. R-1 논의의 가치는 승격 앞당기기가 아니라 **승격 phase 의 비용표를 미리 정확하게 만들어둔 것.** 다음 액션은 인터뷰 답 얻기 — 니즈가 증명되면 트리거+승격을 한 phase 로 묶는다.

### 이 세션의 패턴 메모

같은 날 태클 두 번 모두 "새 정보"가 아니라 이미 판정 때 저울에 올렸던 무게였고, 둘 다 기존 판정·근거 대조로 닫혔다. 이게 절차가 작동하는 모습이다 — 태클이 나쁜 게 아니라, 태클을 열 때마다 원문 대조를 거쳐 닫히는 흐름이 정상 상태.

## `array_agg(DISTINCT x ORDER BY x) INTO 변수` 문법 (:114)

사전 진단 DO 블록 안의 이 줄은 윈도우 함수가 아니라 **집계 함수 괄호 안에 ORDER BY 를 넣는 문법**이다.

```sql
SELECT array_agg(DISTINCT detail.shade_id ORDER BY detail.shade_id) INTO v_bad_detail
```

| 조각 | 뜻 | MSSQL 대응 |
| --- | --- | --- |
| `array_agg(x)` | 여러 row 값을 배열 하나로 모으는 집계 | `STRING_AGG` 의 배열 버전 (직접 대응물 없음) |
| 괄호 안 `ORDER BY` | 배열에 담기는 원소 순서 지정 | `STRING_AGG(...) WITHIN GROUP (ORDER BY ...)` |
| `DISTINCT` | 같은 값 한 번만 담음 | `COUNT(DISTINCT x)` 와 같은 원리 |
| `INTO v_bad_detail` | 결과를 PL/pgSQL 변수에 담음 | `SELECT @var = ...` |

- 윈도우 함수 구분 기준: **`OVER` 가 있으면 윈도우** (row 유지 + 각 row 에 계산값), **없으면 집계** (row 가 하나로 접힘). 여기는 OVER 없음 → 배열 하나로 접힘.
- COUNT 가 아니라 배열로 모으는 이유: 실패 시 에러 메시지에 `shade_ids=%` 로 어떤 row 가 문제인지 바로 보여주려고. 정렬은 사람이 읽기 편하라고.
- 위반 없으면 `array_agg` 결과가 NULL → `IF ... IS NOT NULL` 통과. 있으면 `RAISE EXCEPTION` → BEGIN/COMMIT 안이라 마이그 전체 롤백.
- `DO $d108$ ... $d108$` = 이름 없는 일회용 프로시저 실행 (T-SQL 익명 배치 + 변수 선언 가능 버전).

## 사전 진단 (2-3) 이 잡는 불량 데이터는 어떻게 생기나 (:112)

finish_detail 은 혼자서는 뜻이 성립 안 되는 값이라, parent 가 resolved 집합에 없으면 모순이다. 핵심은 **한 번에 이상한 걸 넣는 게 아니라 멀쩡한 편집이 쌓여서 생긴다**는 것.

### 타임라인 예시 — 매트 섀도우 라인 + 매트펄 shade (finish_detail 승격 가정)

| 시점 | 편집 | 상태 |
| --- | --- | --- |
| t1 | 매트 섀도우 라인 등록, line finish = 매트 | 정상 |
| t2 | 07호가 매트 바탕 + 펄이라 shade 에 finish_detail = 매트펄 추가 | 정상 — override 없으니 resolved = {매트 (line 상속)}, parent 집합에 있음 |
| t3 | 발색 재확인: 07호는 사실 쉬머 → shade finish = 쉬머 override 추가 | **여기서 갈림** |
| t4 | t2 의 매트펄 지우는 걸 깜빡 | finish=쉬머 + detail=매트펄 — "쉬머인데 매트펄" 모순 |

- **옛 union 검증**: t3 통과 — parent 매트가 line 에 "어딘가" 있으니까. 모순 상태가 합법적으로 만들어짐.
- **새 resolved 검증**: t3 에서 `finish_detail_parent_missing` — override 순간 resolved = {쉬머} 가 되므로, 매트펄부터 정리해야 저장됨. 모순이 생기는 그 시점에 청소를 강제.
- 사전 진단 (2-3) = 옛 검증 시절 이미 앉아 있을 t4 형 데이터를 새 규칙 켜기 전에 색출. 지금은 finish_detail 이 D-109 보류로 잠자는 층이라 0행 통과가 예상값 (로컬 통과 확인).

### 도메인 교정 (모기)

처음 예시는 "립글로스 라인인데 한 shade 만 유리알광"이었는데 부자연스럽다 — 립에서 광 정도가 유독 유리알이면 그건 **라인 전체 특성**이라 scope 원칙대로 finish·detail 둘 다 line_traits 로 갈 일이다 (그러면 line 검증 소관). shade 단위로 finish 가 갈리는 건 섀도우·하이라이터 쪽이고, 매트 섀도우 + 매트펄이 현실적인 시나리오.

### R-1 과의 연결

매트펄 모순의 두 경로: **shade 쪽 (t3, override 변경)** = 이번 마이그 트리거가 막음 / **line 쪽 (라인 finish 교체 = R-1)** = 후속 트리거 몫. 승격 시 트리거가 선행 조건인 이유.

## shade_traits 에 sort_order 없고 is_primary 만 있는 것 — 안티패턴인가 (:36 주석)

처음엔 line_traits 와 컬럼이 어긋나는 게 일관성 깨진 안티패턴 같았는데, 납득한 결론:

**line 과 shade 는 특성이 다르다. line 은 shade 보다 흐릿한 객체고, shade 는 가리키는 게 명확하다. 그래서 line 은 순서(sort_order, 첫 번째=대표 칩), shade 는 명시 지정(is_primary)이 더 적합하다.**

- 이 프레임은 마이그 주석 :8-9 와 같은 말이다: line finish = "이 제품에 어떤 마감이 들어 있나" (구성물 나열 → 순서 리스트), shade finish = "이 색의 최종 마감은 결국 무엇인가" (단일 답 → 명시 지정).
- 일관성은 테이블 쌍이 아니라 scope 축에 있다: shade 옆 테이블은 전부 "최대 2 + is_primary 1" 패턴 (color_family D-054, texture), line 쪽은 순서 있는 칩 리스트 패턴.
- 다만 "비대칭은 위험하다"는 직감 자체는 실증됐다 — 이 PR 최초 구현이 존재하지 않는 `shade_traits.sort_order` 를 embed select 해서 실환경 42703 (mock 테스트는 통과, TRAVELOG-16). 처방은 컬럼 맞추기가 아니라 typed client (`post-mvp-supabase-generated-types-global-client-drift` todo) — 없는 컬럼 참조를 tsc 에서 잡는다.
