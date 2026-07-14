# 모기 리드 카드 — Phase 47 gstack 리뷰 + 수정 (커밋 게이트)

> 종류: REVIEW + FIX Read Card. 원문 SSOT = PR #364 작업 트리 diff + `deferred-items.md` (3·4절 신규) + `TRAVELOG-15`.
> 작성: 2026-07-14 Claude 세션. 직전 카드 = `1-card-2026-07-14-phase47-4703-migration-ship.md` (그 카드의 D1~D3 은 답 완료 — 이 카드는 그 뒤에 돌린 **리뷰와 수정** 이야기).
> 이 카드의 이해 체크 = **커밋 게이트 퀴즈** (Review Gate Quiz 대체). 이번엔 공부용으로 실제 코드도 같이 넣었다.

## 1. 무슨 일이 있었나 `[READ]`

- `[READ]` **리뷰 부대 8개를 병렬로 돌렸다.** 체크리스트 전문가 6명(테스트·유지보수·보안·성능·데이터마이그·디자인) + 자유 탐색 "악역" 2명(Claude 1 + 다른 회사 모델인 Codex 1). 악역은 체크리스트 없이 "이 코드가 어떻게 망가질지" 만 찾는다.
- `[READ]` **서로 모르는 두 악역이 같은 버그에 도착했다.** 전문가 6명이 전부 놓친 건데, 악역 둘이 각자 찾았다: **어드민이 질감 하나를 "사용 중지" 하면, 그 질감이 붙어 있는 shade 는 이름·가격만 고쳐도 저장이 거부된다.** 왜냐면 저장할 때 앱이 "지금 붙어 있는 질감 목록 전체"를 DB 함수로 다시 보내는데, DB 쪽 slug→id 변환 함수가 **활성(is_active=true) 어휘만** 찾아주기 때문. 앱 코드는 "이미 연결된 비활성 어휘는 통과"라고 적어놨는데 DB 가 거부하는 모순이었다 (2절 코드 참고).
- `[READ]` **모기가 객관식 3개로 방향을 정했고, 전부 적용했다.** (1) DB 함수가 "이미 그 라인/shade 에 연결돼 있던" 어휘는 비활성이어도 통과시키게 수정 — 신규 추가는 계속 차단. (2) 작은 수정 5건 (아래). (3) 마이그 하드닝 + 운영 문서.
- `[READ]` **하드닝 한 줄이 더 큰 걸 찾아냈다.** "검사와 삭제 사이에 다른 접속이 끼어들지 못하게 LOCK 을 걸자"는 권고를 넣고 로컬 재적용을 돌렸더니 `LOCK TABLE can only be used in transaction blocks` 에러. 뜻: **supabase CLI 는 마이그레이션 파일을 하나의 트랜잭션(전부 성공 아니면 전부 취소 묶음)으로 감싸지 않고, 문장 하나하나 즉시 확정(autocommit)으로 실행한다.** 즉 원래 파일의 "검사·삭제·사후검증이 같은 트랜잭션이라 안전" 주석은 **참이었던 적이 없다** — 사후검증(7단계)이 실패해도 삭제는 이미 확정된 상태였던 것. 파일에 `BEGIN;`/`COMMIT;` 을 직접 넣어서 이제 진짜 한 묶음이 됐다.
- `[READ]` **검증 전부 다시 통과.** 앱 테스트 148/148 (새 테스트 5개 포함) · 타입 검사 0 에러 · 로컬 DB 처음부터 재적용 성공 · 역할 행동 검사 SQL 전체 통과 (비활성 어휘 재저장 케이스 D5b 신규 추가).

## 2. 코드로 보기 (공부용)

**모순이었던 두 코드.** DB 쪽 변환 함수는 활성만 찾는다:

```sql
-- trait_id_for (20260619010000) — slug 로 trait id 찾기
SELECT id FROM traits
WHERE type = p_type AND slug = p_slug
  AND is_active = true   -- ← 비활성이면 여기서 NULL
LIMIT 1;
```

그런데 앱은 이렇게 약속하고 있었다:

```ts
// adminTextureRepo.ts — 비활성이어도 "이미 연결돼 있으면" 보내준다
if (!option.isActive && !existingSlugs.has(selection.slug)) {
  throw new Error(`사용 중지된 texture 는 새로 추가할 수 없습니다: ...`)
}
// → 기존 연결은 통과시켜서 RPC 로 보냄. 그런데 RPC 가 위 함수로 NULL 을 받고
//   RAISE EXCEPTION 'invalid_texture' — 앱의 약속을 DB 가 깨는 상태.
```

**수정: DB 함수에 "기존 연결" fallback.** 지우기 전에 원래 붙어 있던 id 들을 떠 두고, 활성 검색이 실패하면 그 목록 안에서만 한 번 더 찾는다:

```sql
-- set_shade_texture_traits 안 (set_line_traits 도 동일 패턴)
SELECT COALESCE(array_agg(st.trait_id), ARRAY[]::bigint[]) INTO v_existing
FROM shade_traits st WHERE st.shade_id = p_shade_id;   -- DELETE 전에 떠 둠

v_trait_id := trait_id_for('texture', btrim(v_slug));   -- 1차: 활성만
IF v_trait_id IS NULL THEN
  SELECT t.id INTO v_trait_id FROM traits t
  WHERE t.type = 'texture' AND t.slug = btrim(v_slug)
    AND t.id = ANY (v_existing);                        -- 2차: 원래 붙어 있던 것만
END IF;
IF v_trait_id IS NULL THEN
  RAISE EXCEPTION 'invalid_texture';                    -- 신규 비활성은 여전히 차단
END IF;
```

**트랜잭션 수정.** 파일 맨 앞뒤에 명시적으로:

```sql
BEGIN;
SET LOCAL lock_timeout = '5s';
LOCK TABLE forms, finishes, ... IN ACCESS EXCLUSIVE MODE;  -- 검사~삭제 사이 끼어들기 봉쇄
-- ... 검사 → 삭제 → 사후검증 전부 ...
COMMIT;   -- 여기 오기 전에 뭐든 실패하면 전부 취소
```

**작은 수정 5건 중 하나 더 (WR-02 후반부).** 카테고리 목록 조회가 잠깐 실패하면, 전엔 "카테고리 없음"과 구분이 안 돼서 category 없는 라인이 생길 수 있었다. 이제 실패는 실패로 구분해서 생성 자체를 멈춘다:

```ts
// resolveCategoryId — "조회 실패" 와 "매핑 없음" 을 다른 모양으로 반환
if (!cats) return { ok: false }              // 조회 실패 → 생성 중단
return { ok: true, id: exact?.id ?? null }   // 매핑 없음 → null 로 진행 (기존과 같음)
```

나머지: 어드민 질감 조회에 서버 필터 추가(응답이 1000행 넘으면 칩이 조용히 사라지는 문제 예방), 낡은 주석·죽은 코드 정리.

## 3. 새로 나온 말

| 말 | 쉬운 뜻 | 이번 예시 |
|---|---|---|
| autocommit | 문장 하나 실행할 때마다 즉시 확정 — 나중에 실패해도 앞엣것은 안 되돌아감 | supabase CLI 의 마이그 적용 방식 (실측으로 확인) |
| 트랜잭션 (BEGIN/COMMIT) | 여러 문장을 한 묶음으로 — 중간에 하나라도 실패하면 전부 취소 | 마이그 파일에 직접 넣어서 "실패 = 전부 취소" 를 진짜로 만듦 |
| fallback | 1차 방법이 실패했을 때만 쓰는 2차 방법 | 활성 검색 실패 → "원래 붙어 있던 목록" 안에서 재검색 |

## 4. 모기가 해야 할 일 `[DECIDE]`

- [ ] **(지금)** 아래 이해 체크 D1~D3 답 → 커밋 승인 (이 브랜치에 commit+push, PR #364 에 반영됨)
- [ ] **(머지 후, push 직전)** 새로 생긴 절차 — **옛 테이블 7개 pg_dump 백업 한 번** (명령어는 `deferred-items.md` 3절에 그대로 있음)
- [ ] **(push 가 멈추면)** 자동 수정 없이 `deferred-items.md` 4절 복구 절차대로 — 어떤 행이 다른지 먼저 확인

## 5. 판정

- `[STOP]` push 전 어드민에서 어휘·규칙 편집 금지는 그대로. **shade 편집 화면의 "질감 새로 만들기" 버튼도 같은 금지에 포함** (이번 리뷰에서 발견된 숨은 경로).
- `[FOLLOW-UP]` 리뷰가 찾았지만 일부러 안 고친 것들(코드 중복 정리, 어드민 화면 과다 조회, 버튼 연타 가드 등) = 조언 수준이라 기록만 남김. 원하면 capture 로 보냄.
- `[FOLLOW-UP]` 미발행 라인 권한 구멍은 여전히 범위 밖 (기존 todo 그대로, main 공개 전).

`[DETAIL]` 안 읽어도 되는 것: specialist 별 세부 finding 목록(리뷰 로그에 있음), LOCK 대상 테이블 12개 이름, 테스트 mock 구조.

원문 위치:

- 작업 트리 diff (커밋 전) → 수정 7파일 전체
- `deferred-items.md` 3·4절 → push 백업·복구 runbook
- `docs/blog/agent-journey/milestone/TRAVELOG-15-phase47-review-army-cli-transaction.md` → 이 리뷰가 하네스적으로 어떻게 돌았나

---

<details>
<summary>이해 체크 (주관식 — 커밋 게이트)</summary>

**D1. 핵심 결정 — 비활성 어휘의 두 얼굴.** 수정 후, "사용 중지"된 질감을 DB 가 **통과시켜주는 경우**와 **여전히 거부하는 경우**는 각각 뭐야? (한 줄씩)
(→ 어디 보면: 이 카드 1절 세 번째 READ + 2절 fallback 코드의 주석)

**D2. 위험한 오해 — "마이그는 실패하면 알아서 전부 취소된다".** 이 말이 원래 왜 거짓이었고, 뭘 넣어서 참으로 만들었나?
(→ 어디 보면: 이 카드 1절 네 번째 READ + 2절 트랜잭션 코드)

**D3. 다음 액션 — push 직전에 새로 생긴 절차.** 머지 후 `supabase db push` 를 누르기 전에 이번 리뷰로 새로 추가된 "한 번 해야 하는 것"이 뭐고, 왜 필요해?
(→ 어디 보면: 이 카드 4절 두 번째 체크박스 + `deferred-items.md` 3절 첫 줄)

</details>

- D1. 통과시켜주는 경우는 사용중지된질감을 fk로 갖는 제품라인이나 쉐이드 조회할때인가?!(근데 이것도 고민 필요하다옹..ㅠ 어카지) 여전히 거부하는경우는 앞으로 이 질감을 제품라인, 쉐이드에 추가하는 거겠지.
- D2. 그기 supabase cli에서 마이그파일 실행할땐 아니래...ㄷㄷ 한줄한줄 오토커밋하는 것마냥 된다고 하네.. 그래서 앞에 begin, 끝에 commit 넣으래.
- D3.앞으로 맨날 해야되는거야? 헐.. 옛테이블 백업? 와 진짜 철저하다 

그외 읽으면서 생긴 모기 질문ㅋ 
## 무슨 일이 있었나 모기 질문

- 아 근데 나중에 운영 중에 질감 하나를 사용 중지해야할 때가 오면 어떡해? 설마. 없겠지?ㅠ 그럼 그냥 운영할땐 사용중지 자체를 어드민에서 막아야되는거아님? 그리고 이거.,. shade는 이름,가격만 고쳐도 < 어느 진입점에서 고침? 어드민 아니면 발색샷 등록 과정?
- 테이블 락은 트랜잭션 내에서만 사용할수있다고? 흠. 왜지. 아진짜? 그럼 마이그레이션파일을 원격에 적용할때도 그래? 암튼 begin, commit을 꼭 넣어야한다는거네.

## 코드로 보기 모기 질문

- 너도 잘 모르겠지만 왜 이런 모순적인 코드가 되었을까? ㅠㅠ 역시 한 사람이 코드를 짜는게 좋은건가… 흠..
- 활성 검색(is_active=true인거 찾는다는거겠지?)이 실패하면 2차로 원래 붙어 있던 것만 찾는다는건 무슨 소리야? 이해못함.
- 카테고리 목록 조회 실패하면 없다고 판단해서 카테고리 없는 라인.. 라인이란건 제품라인 말하는거야? 헐. 그러니까 클라이언트에서 카테고리아이디를 인자로 보내도 그럴수도 있다는거임??? 근데 이렇게하는것보다 걍 category_id 컬럼에 not null 하는건 별로인가? 냐옹.
- 어드민 질감 조회에 서버 필터 추가?는먼소리여.