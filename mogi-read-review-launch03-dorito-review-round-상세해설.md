---
type: personal
status: active
owner: samkimpepper
created: 2026-07-03
topic: LAUNCH-03 도리토 코드리뷰 라운드 — 상세 해설 (요약 카드의 확장판, jargon 허용)
guide: guide-mogi-read-cards.md
parent: mogi-read-review-launch03-dorito-review-round.md
---

# LAUNCH-03 도리토 코드리뷰 라운드 — 상세 해설

> 이건 **요약 카드**(`mogi-read-review-launch03-dorito-review-round.md`)가 너무 짧아서 안 와닿을 때 보는 확장판.
> 요약 카드 = 승인용(짧게). 이 파일 = 이해용(길게, jargon 살림).
> 원문 마이그: `supabase/migrations/20260703010000_launch03_table_rls_lockdown.sql`

---

## 0. 먼저 깔고 갈 3개 개념

이거 3개만 잡으면 7개 코멘트가 다 읽혀.

### (1) RLS 는 문이 두 겹이다 — GRANT 층 + POLICY 층

Postgres 에서 어떤 role(anon/authenticated 등)이 테이블에 쓰기를 하려면 **두 관문**을 다 통과해야 한다.

| 층 | 이름 | 무엇을 보나 | 예 |
|---|---|---|---|
| 1층 | 테이블 GRANT | "이 role 이 이 테이블에 INSERT 를 *시도라도* 할 수 있나" | `GRANT INSERT ON t TO anon` |
| 2층 | RLS POLICY | "그 role 이 *어떤 row* 를 넣을 수 있나" | `CREATE POLICY ... WITH CHECK (조건)` |

- 1층 GRANT 가 없으면 → 아예 `permission denied for table`(grant 레벨 거절).
- 1층은 통과했는데 2층 POLICY 가 막으면 → `new row violates row-level security policy`(RLS 거절).
- **RLS 가 켜져 있는데(ENABLE) 해당 동작(INSERT)에 POLICY 가 하나도 없으면 → 전부 거절**(deny-by-default). 이게 이번 레거시 18종 잠금의 원리.

> 도리토 코멘트 절반이 "이 두 층을 짝 맞춰서 잠갔냐"를 본 거야. POLICY 만 지우고 GRANT 를 안 지우면, 나중에 RLS 가 꺼졌을 때 1층이 열려 있어서 다시 뚫림.

### (2) SECURITY DEFINER vs INVOKER — 함수가 "누구 권한으로" 도나

RPC(함수)를 만들 때 두 모드가 있다.

| 모드 | 함수 안의 SQL 이 도는 권한 | RLS 를 타나 |
|---|---|---|
| SECURITY DEFINER | **함수를 만든 사람(주로 postgres/service_role)** 권한 | 안 탐 (권한 높아서 정책 우회) |
| SECURITY INVOKER | **함수를 호출한 사람**(그 유저) 권한 | 탐 (호출자 정책 적용) |

- DEFINER = "신분증 빌려주는 대리인". 호출자가 게스트여도 함수 안에서는 관리자 권한으로 돈다. 그래서 DEFINER 함수는 **함수 본문 안에 직접 로그인/게스트 가드를 넣어야** 한다(안 그러면 아무나 관리자 동작).
- INVOKER = "호출자 신분 그대로". 함수 안 SQL 도 그 유저의 RLS 를 탄다.
- **이번 F2, 그리고 L27 훼방 시나리오가 다 이 DEFINER/INVOKER 차이에서 나와.**

### (3) shade_is_published() — 이번 PR 의 심장

게시 판정 = "이 shade 에 발색(swatch_items)이 하나라도 연결됐나". 연결 경로가 **두 개**다:

```sql
JOIN swatch_items si ON si.shade_id = sh.id   OR   si.shade_slug = sh.slug
```

- `shade_id` 연결(정식 FK-스러운 참조) **또는** `shade_slug` 연결(느슨한 문자열 참조) 중 하나라도 있으면 "게시됨".
- 이 이중 참조가 F1(앞 카드)의 근본 원인이고, L27·L36 도 다 여기서 파생돼.

---

## 1. 바로 반영한 안전장치 3건 (커밋 47d7dd4)

### L43 — shade_is_published 에 GRANT 명시

**리뷰 전 코드**: 함수를 만들기만 하고 `GRANT`/`REVOKE` 를 안 적음.

```sql
CREATE OR REPLACE FUNCTION shade_is_published(p_shade_id bigint) ...
-- (GRANT 없음)
```

**도리토가 본 것**: Supabase 는 public 스키마에 새 함수를 만들면 `anon`·`authenticated` 에게 EXECUTE 를 **default privilege 로 직접 grant** 한다(우리 문서 `supabase-rpc-anon-grant-gotcha.md`). 즉 GRANT 를 안 적어도 anon 이 이미 실행 가능. 그런데 **바로 어제**(`20260702010000`) "새 함수는 anon EXECUTE 가 자동으로 붙는다"를 정리하고 쓰기·admin 함수 anon EXECUTE 를 전수 `REVOKE` 했잖아. 이 헬퍼는 그 감사에서 GRANT/REVOKE 가 없어서 **"기본값에 조용히 기대는"** 상태.

**왜 실구멍이 아니라 하드닝인가**: 이 함수가 노출하는 건 "이 shade 가 게시됐냐"는 boolean 하나. 민감정보 유출이 없어서 anon 이 실행해도 무해. 문제는 보안이 아니라 **감사 일관성** — 다음에 누가 grant 목록을 훑을 때 "얘는 왜 default 에 기대고 있지? 회수 대상인가?" 하고 헷갈림.

**반영**:
```sql
-- 읽기 전용 판정이라 anon 포함 의도적 공개 (default 에 기대지 않고 명시)
GRANT EXECUTE ON FUNCTION shade_is_published(bigint) TO anon, authenticated;
```
실측: `has_function_privilege('anon', 'shade_is_published(bigint)', 'EXECUTE') = t`.

### L56 — comparison_notes 직접 INSERT 이중 잠금

**리뷰 전 코드**: 직접 INSERT 정책만 삭제.

```sql
DROP POLICY IF EXISTS anon_insert ON comparison_notes;
-- (REVOKE 없음)
```

여기서 `anon_insert` 정책은 `WITH CHECK (true)` 에 대상이 `{anon, authenticated}` 였음 → **아무나 테이블에 직접 비교노트를 INSERT** 할 수 있었고, `author_user_id` 칸에 남의 uuid 를 적는 **사칭**도 가능했음. 그래서 정책을 지우고 쓰기는 RPC(`add_comparison_note`, 내부에 D-084 로그인·게스트 가드 있음)만 통과하게 함.

**도리토가 본 것**: 정책(2층)을 지우면 지금은 "RLS 켜짐 + INSERT 정책 0개 = deny-by-default"로 막힌다. **하지만 1층 테이블 GRANT INSERT 는 그대로 남아 있다.** 만약 나중에 누가 실수로 이 테이블 RLS 를 끄면(`DISABLE ROW LEVEL SECURITY`), 2층이 사라지고 1층 GRANT 만 남아서 INSERT 가 **조용히 다시 열린다**. 게다가 같은 테이블 UPDATE 를 정리한 옛 마이그(`20260613001000`)에선 `DROP POLICY` + `REVOKE UPDATE` 를 **짝으로** 뒀는데 여기선 INSERT 만 짝이 안 맞음.

**반영**:
```sql
DROP POLICY IF EXISTS anon_insert ON comparison_notes;
REVOKE INSERT ON comparison_notes FROM anon, authenticated;  -- 1층도 회수
```
이제 2층(RLS)이 무너져도 1층(GRANT)에서 막힘. 실측: member 직접 INSERT 가 "RLS 거절"에서 "grant 레벨 거절"로 바뀜(둘 다 거절이지만 방어선이 하나 더 깊어짐).

### L101 — 원격에 없는 테이블 skip 시 로그

**리뷰 전 코드**: 레거시 18종 잠금 루프의 `to_regclass` 가드.

```sql
IF to_regclass(format('public.%I', t)) IS NOT NULL THEN
  EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
  EXECUTE format('REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON public.%I FROM anon, authenticated', t);
END IF;  -- ELSE 없음 = 조용한 skip
```

`to_regclass('public.foo')` 는 그 테이블이 있으면 oid, 없으면 NULL 을 리턴. 원격에 이미 없는 테이블이 있어도 push 가 안 깨지게 skip 하는 안전장치.

**도리토가 본 것**: 없는 테이블을 건너뛰는 건 좋은데, **오타·rename** 으로 이름이 살짝 어긋난 테이블도 똑같이 조용히 skip 된다. 그러면 그 테이블은 RLS 가 안 걸린 채로 마이그는 "잠금 완료"로 끝나서, 원격에 잠금 누락(drift)이 생겨도 **아무 흔적이 안 남는다**.

**반영**: ELSE 에 경고 한 줄.
```sql
ELSE
  RAISE WARNING 'LAUNCH-03: 테이블 % 가 원격에 없어 건너뜀', t;
END IF;
```
이제 skip 되면 마이그 로그에 뜨니까 나중에 "얘 왜 안 잠겼지"를 로그에서 바로 찾음. 전체 멱등 재적용 통과.

---

## 2. 후속으로 뺀 4건

### L204 — 앱이 색군/텍스처 저장 실패를 삼킴 (가장 실질적)

**코드 위치**: `NewProductSheet.tsx:581-596`.
```js
// 정션(패밀리·텍스처) 실패는 swallow — create 흐름과 동일 패턴...
try { await upsertShadeColorFamilies(editTarget.shadeId, colorFamilySelections) } catch (e) { console.warn(e) }
try { await upsertShadeTextures(...) } catch (e) { ... console.warn(e) }
onEdited?.(...)   // ← 실패해도 무조건 성공 콜백
onClose()         // ← 실패해도 무조건 창 닫음
```

shade 본체(이름·색상)는 RPC 로 저장하고, 색군/텍스처(정션 테이블)는 그 뒤에 별도로 upsert 하는데, **정션 실패를 `console.warn` 만 찍고 삼킨다**(주석에 "어드민 backfill 로 보정 가능해서"라고 이유가 적혀 있음). 그래서 색군 저장이 거절돼도 유저 화면엔 창이 닫히면서 '저장됨'처럼 보임.
*모기질문*: 저거 구현했을때 왜 저렇게했는진 기억 안나지만.. shade본체랑 색군/텍스처(정션테이블) 저장을 나눠두는게 좋은 설계임? 뭐가 나은지 궁금.. 

*답 (Claude)*: "나눈다"를 두 가지로 갈라 봐야 해 — 하나는 맞고 하나는 아쉬워.
- **테이블을 나눈 것** = 정규화라 **당연하고 맞음**. shade 하나에 색군이 여러 개(뮤트+뉴트럴...), 텍스처도 여러 개 붙을 수 있어서 shade 한 행(row)에 다 못 담아. 그래서 `shade_color_families`·`shade_textures` 같은 **정션(중간) 테이블**로 빼는 건 관계형 DB 정석. 이건 바꿀 이유 없음.
- **저장 요청을 3방으로 나눈 것**(shade 본체 RPC + 색군 upsert + 텍스처 RPC 를 따로따로 호출) = 이게 도리토가 찝은 냄새. 셋이 **한 트랜잭션이 아니라 순차 3방**이라, 앞은 성공하고 뒤가 실패하면 **반쪽 저장**이 남아.
- 더 나은 설계 = 이 셋을 **하나의 DEFINER RPC** 로 묶어서 "다 성공 아니면 다 롤백"(원자성). `shade-edit-partial-save-silent-failure` todo 의 기대 동작 (2)가 정확히 이거야.
- 정리: 테이블 나눔 = O(정석), 저장 3방 나눔 = 개선 대상. 지금 코드는 나눠 저장하면서 실패를 삼키기까지 해서 이중으로 아쉬운 상태.

**도리토가 본 것**: 이번 PR 이 게이트를 조이면서(F1, 게시된 shade 는 색군/텍스처 쓰기 거절), 이 삼킴 경로가 **실제로 밟히게** 됐다. 게시된 shade 를 비어드민이 편집하면 색군 upsert 가 RLS 에 막히는데 → 유저는 '저장됨'으로 봄. F1 이랑 똑같은 모양(일부만 저장되고 조용히 증발).
*모기질문*: 게시된 shade는 편집 불가능하게 막아놓지않았어? 비어드민이 어떻게 편집한다는거임??? 아아닌가 내기억이잘못됐나. 

*답 (Claude)*: **네 기억 맞아.** 게시된 shade 의 이름·색상 편집은 v2 RPC 가 `shade_already_published` 로 먼저 끊어서 "이미 게시돼 수정할 수 없어요" 뜨고, 색군 저장 지점까진 **안 가**. 그럼 이 삼킴이 대체 언제 실제로 터지냐 — 정상 편집이 아니라 두 개의 좁은 틈이야:
- **(핵심 틈) 저장 3방의 시점이 달라서 생기는 race.** v2 는 "지금 게시됐나"를 v2 실행 *그 순간*에 보고, 색군 upsert 는 그 뒤 자기 실행 *순간*에 게시 게이트를 **또** 본다. 유저가 편집을 시작할 땐 미게시라 v2 통과 → 그런데 그 **찰나에 누가 그 shade 에 발색을 붙이면**(바로 아래 L27 시나리오!) 색군 쓰기 시점엔 게시로 바뀌어서 색군만 거절 → 삼킴.
- **(F1, 지금은 닫힘) 판정 어긋남.** 이 PR *전*엔 v2 가 shade_id 만 세고 색군 게이트는 slug 까지 봐서, slug-연결 게시 shade 는 "v2 는 통과·색군은 거절". 이게 F1 이고 이번 헬퍼 통일로 막았어.
- 그래서 todo 검증문의 "게시된 shade 를 비어드민이 편집" 은 **문구가 좀 헐거운 거**야 — 정확히는 "미게시로 알고 편집을 시작했는데 저장 시점에 게시로 바뀌어 색군만 막히는 경우". 정상 플로우가 게시 shade 를 편집하게 열어주는 게 아님. **네 기억이 틀린 게 아니라 todo 문장이 느슨함** (원하면 그 todo 검증문을 정확한 표현으로 고쳐줄게).

**추가 위험**(`adminColorFamilyRepo.ts:118`): 색군 upsert 가 DELETE 후 INSERT **두 번의 개별 요청**(한 트랜잭션 아님).
```js
await supabase.from('shade_color_families').delete().eq('shade_id', shadeId)  // 먼저 다 지움
// ... 이 사이에 shade 가 게시되면 ...
await supabase.from('shade_color_families').insert(rows)  // INSERT 는 RLS 에 막힘 → 색군 통째로 빔
```

**왜 후속인가**: 이건 SQL 이 아니라 **앱 코드**라 이 PR(SQL) 범위 밖. → `shade-edit-partial-save-silent-failure.md`. 기대 동작: (1) 실패를 유저에게 표시하고 '저장됨'처럼 닫지 않기, (2) 색군 upsert 를 `set_shade_texture_traits` 처럼 DEFINER RPC 하나로 묶어 DELETE+INSERT 를 원자화.

### L27 — 남의 shade 를 '게시됨'으로 만드는 훼방 (가장 날카로움)

**시나리오**:
1. `shade_is_published(X)` = "swatch_items 에 shade X 를 가리키는 row 가 있나". 즉 **누가 shade X 에 발색을 등록하면 X 는 자동으로 '게시됨'** 이 된다.
2. `create_swatch` 는 **SECURITY INVOKER**(실측 `prosecdef=f`) → 게스트(authenticated)도 호출 가능.
3. swatch_items INSERT 정책 `insert_parent_owner` 는 "네가 부모 swatch 를 소유했나"만 보고, **그 발색이 어느 shade 를 가리키는지는 안 막는다**.
4. 그래서 세션만 있으면 **아무 shade 의 slug** 로 발색을 등록 → 그 shade 를 '게시됨'으로 만들 수 있다.
5. 게시되면 그 shade 주인의 **미게시 초안 편집**(색군 수정·라인 rename)이 게이트에 막힌다.
*모기질문*: 아 욕나온다 그냥.. 그냥 shade 수정 할수있게 해야되나?ㅋㅋㅋㅋㅋㅋㅋㅋㅋㅋㅋㅋㅋㅋㅋㅋㅋㅋㅋㅋ 아 이거 예시 들어서 다시 설명 부탁.. shade A, B 뭐 이렇게. 아 이거 너무 어렵다;

*답 (Claude)*: 예시로 풀게. 등장인물 = **갑**(로그인만 한 아무나 / 장난꾼), **을**(피해자 코덕).
1. 을이 shade **B** "코랄뮤트" 를 **미게시 초안**으로 만들어둠. 아직 발색은 안 붙였고, 오타 고치려고 편집 가능한 상태.
2. 갑이 자기 발색(swatch)을 하나 등록하면서, 그 발색이 가리키는 shade 를 **을의 B 의 slug** 로 넣음. (`create_swatch` 는 INVOKER 라 갑 권한으로 돌고, swatch_items 정책은 "갑이 자기 부모 swatch 를 소유했나"만 볼 뿐 **그 발색이 어느 shade 를 가리키는지는 안 막음**.)
3. 이제 swatch_items 에 "B 를 가리키는 행" 이 생김 → `shade_is_published(B)` = true → **B 가 '게시됨'으로 승격**.
4. 을이 B 의 오타를 고치러 편집 → v2 가 `shade_already_published` 로 거절 → **을은 자기 초안을 못 고침**.
5. 갑은 을의 데이터를 읽거나 바꾼 적 없음(탈취 X). 그냥 을의 작업을 막은 것(**훼방** O).
- "그냥 shade 수정 가능하게 하면 되지 않나?" → 그것도 한 방법(게시돼도 원 작성자는 편집 허용). 근데 그건 "게시 = 편집 잠금" 규칙 자체를 바꾸는 거라 **제품 결정**이야. 다른 선택지도 있어: (a) 미게시 초안엔 남이 발색 못 붙이게, (b) 붙여도 원 작성자 편집은 유지, (c) 게시 판정에서 "남이 붙인 발색" 은 제외. 그래서 코드로 급히 막을 게 아니라 **어느 규칙으로 갈지 골라야** 하는 거. (Q4 답에 이어짐.)

권한을 탈취(남의 데이터 열람/변조)하는 게 아니라 **훼방**(남의 정상 작업을 막음)이라 성격이 다르다.

**왜 이번에 안 고쳤나**: "누구나 아무 shade 에 발색을 등록할 수 있다"는 것 자체가 **원래 제품 설계**(D-042/D-045, 집단 기여). 그래서 이건 순수 버그가 아니라, **"미게시 초안에 남이 발색을 붙일 수 있어야 하나"**를 정해야 하는 **제품 결정**이다. → `rpc-missing-auth-guards.md` "남은 것 3" 으로 기록, Phase 3 의 작성자 확인(shades 에 auth uid 작성자 칼럼 추가) 작업과 같이 다룸. 실측으로 시나리오 성립 확인, 놓친 방어선 없음.
*모기의문*: 미게시 shade 초안에 당연히 발색 붙일수있어야하지않음? 그게 제품설계아님??? 내가이해를못했나.

*답 (Claude)*: **네 이해 맞아.** "shade 에 발색 붙이기 = 집단 기여" 는 D-042/D-045 설계 그대로야. 헷갈릴 게 하나 있는데, 제품 결정 대상은 **그 전체가 아니라 딱 한 조각**이야:
- 열린 질문 = "**남의 미게시 초안**에 발색을 붙이면 → 그 초안이 게시로 승격 → 원 작성자가 편집 잠김" 이라는 **부작용**을 허용할 거냐.
- 즉 "발색 붙이기" 자체가 문제가 아니라, 그게 **남의 초안을 잠그는 결과**를 내도 되냐가 질문. 선택지는 위 Q3 답의 (a)/(b)/(c).
- 게다가 실무적으론 위험이 낮아: **미게시 초안은 UI 에 노출이 안 돼서** 갑이 을의 초안 slug 를 알아낼 방법이 사실상 없음(그래서 todo 도 "미게시 초안 = 노출 안 되는 데이터라 실위험 낮음 → Phase 3"). 그래서 "성립은 하지만 급하진 않은 제품 결정"으로 간 거야.
- 결론: **너가 이해 못 한 게 아니라**, 한 덩어리로 보이는 걸 "발색 붙이기(=설계 O)" 와 "그게 남 초안을 잠금(=열린 질문)" 두 조각으로 쪼개야 하는 건데 카드가 뭉뚱그려서 그래.

### L25 — set_shade_texture_traits 도 헬퍼로 통일

**상황**: 이번 PR 이 게시 판정을 `shade_is_published()` 헬퍼 하나로 통일했다(정책 4곳 + v2 + line_in_use). 그런데 **텍스처 저장 RPC `set_shade_texture_traits`(20260702020000)에는 아직 자기만의 inline 게시 판정이 따로 남아 있다** — 헬퍼를 안 부르고 직접 조건을 적어둠.

**도리토가 본 것**: 지금은 두 판정이 의미가 같아서 문제없다. 하지만 나중에 slug 경로를 정리하면 **한쪽(헬퍼)만 바뀌고 이 RPC 는 안 바뀌어** 다시 어긋난다 — 정확히 F1 이 터졌던 방식. 판정이 두 곳에 복사돼 있는 구조 자체가 리스크.

**왜 후속인가**: 그 RPC 파일은 이 PR diff 밖. 의미 동일한 리팩터라 급하지 않음. → 이미 PR 후속 목록. 정비 때 그 inline 조건을 `shade_is_published()` 호출로 교체(정의를 1곳으로).

### L36 — OR 조인 성능

**코드**: 헬퍼의 조인이 `si.shade_id = sh.id OR si.shade_slug = sh.slug`.

**도리토가 본 것**: **OR 조인은 옵티마이저가 단일 인덱스로 타기 어렵다**(각 조건이 다른 컬럼·다른 인덱스라, 보통 두 번 스캔 후 합침). swatch_items 가 커지면 이 헬퍼가 느려질 수 있는데, 헬퍼는 **정책마다** 불리고 `line_in_use` 에선 **라인당 shade 수만큼 반복** 호출돼서 배수로 늘어남.

**왜 후속인가**: MVP 규모(수백 row)에선 전혀 문제 없음. 그리고 근본 해결은 인덱스 튜닝이 아니라 **이중 참조 자체를 없애는 것** — slug-only 행에 shade_id 를 backfill 하고 slug 조인을 폐기하면 OR 이 사라짐. → `swatch-items-shade-slug-backfill.md`(이게 L27·L36·F1 을 한꺼번에 뿌리 뽑는 todo).

---

## 3. 후속 todo 5종이 각각 어디서 나왔나 (매핑)

| todo | 나온 코멘트 | 성격 |
|---|---|---|
| `shade-edit-partial-save-silent-failure.md` | L204 | 앱 코드 — 저장 실패 표시 + 색군 upsert 원자화 |
| `rpc-missing-auth-guards.md` (남은 것 3) | L27 | 제품 결정 — 미게시 초안에 남이 발색 붙이기 허용? |
| `swatch-items-shade-slug-backfill.md` | L36 (+ F1 근본) | 데이터 정리 — 이중 참조 제거, slug 폐기 |
| `mirror-trait-trigger-definer-review.md` | F2 후속 | 권한 검토 — mirror 트리거 DEFINER 전환 검토 |
| `legacy-tables-drop-cleanup.md` | 감사 발견 | 레거시 18종 잠금 완료 → DROP 은 실측 후 |
| `legacy-anon-owner-null-rls-branches.md` | 감사 발견 | 폐기된 anon/device_id INSERT 분기 제거 |

> `mirror-trait-trigger-definer-review` 는 도리토 코멘트 7건이 아니라 **F2(앞 카드)의 후속**이야 — F2 에서 어드민 텍스처 정책을 복원한 게 임시방편이라, 근본은 mirror 트리거를 DEFINER 로 바꾸는 거냐를 따로 검토하는 것. 헷갈리기 쉬워서 표에 같이 넣어둠.

---

## 4. 한 문단 정리

도리토 리뷰 7건 = **실구멍 0**. 3건(L43·L56·L101)은 "지금은 안 뚫려도 미래 실수에 대비하는 두 번째 자물쇠"라 커밋 47d7dd4 로 바로 넣음. 4건은 실구멍이 아니라 앱 코드(L204)·제품 결정(L27)·중복 정의(L25)·성능(L36)이라 후속 todo. 이 중 L204(저장 실패 삼킴)가 유저에게 가장 실질적이고, L27(훼방)이 가장 리뷰어급 날카로운 지적인데 둘 다 "이 SQL PR 에서 고칠 게 아니다"로 갈렸다.
