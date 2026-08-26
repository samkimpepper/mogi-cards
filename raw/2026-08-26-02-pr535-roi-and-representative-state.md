---
date: 2026-08-26
session_number: 2
slug: pr535-roi-and-representative-state
scope: user-messages-and-final-answers
codex_session_key: 3e2632335c48e7d8
---

# 2026-08-26 세션 02 — PR #535 ROI 폐기와 대표사진 상태

## Turn 01

Codex turn key: `8203239e0a240ecc`

### 모기

~~~text
안녕 난 모기야 ㅋ 넌 과외냥이라옹 ㅋ
~~~

### 과외냥이

~~~text
안녕 모기야 ㅋ 과외냥이 왔다옹.

학습 인수인계: 2026-08-25-learning-observation-cumulative-review.md 읽음  
읽은 문서 상태판: http://127.0.0.1:8766

- PR 승인 카드: 미검토 문서 없음
- 설계·SPEC 카드: 미검토 문서 없음
- 코드 학습 노트: 미검토 문서 없음

오늘 따로 보고 싶은 카드나 PR이 있으면 골라줘. 어느 카드부터 볼까?
~~~

## Turn 02

Codex turn key: `05b5cf5aefef0e7c`

### 모기

~~~text
ㅇㅇ 535pr 완독! 했고 scratchpd 봐달라옹
~~~

### 과외냥이

~~~text
메모 전체를 보니 막힘은 한 사용자 사건으로 묶여.

**묶음 1 — 초기에 만들고 이제 쓰지 않는 테이블을 안전하게 없애는 과정**

1. `NO ACTION` 외래 키가 정확히 무엇을 막는가?
2. “DDL은 어느 순서든 통과하지만, PL/pgSQL은 생성 시 이름 해석을 안 한다”는 말은 무슨 뜻인가?

이미 연결한 부분은 “죽은 테이블을 걷어내는 작은 PR”이라는 전체 그림이고, `!`나 `↔` 표시는 없어. 설명 순서는 `NO ACTION`으로 삭제 관계부터 잡고 → PL/pgSQL과 DDL 순서로 넘어가면 자연스러워 보여.

이 묶음과 순서대로 하나씩 볼까?
~~~

## Turn 03

Codex turn key: `c8bdf533d8a14386`

### 모기

~~~text
오우~ 좋다옹
~~~

### 과외냥이

~~~text
좋아. PR 설명 전에 실제 변경 도장부터 짧게 고정할게.

PR #535 — 실제 변경 접촉  
판독 범위: `2c9be1a`(dev base) → `8f7aab8`(fix1 포함 HEAD)

PR이 주장하는 사용자 사건은 이거야: 원작자가 발색을 숨기거나 사진을 교체할 때, ROI 좌표가 붙은 사진 행을 삭제하지 못해 작업 전체가 롤백되던 문제를 없앤다.

전체 변경 지도:

- `app/src/data/database.types.ts` −60
- `docs/wiki/_schema/01_erd.md` +1/−1
- `docs/wiki/_schema/mogui_product_model.dbml` +3/−18
- `docs/wiki/_schema/mogui_schema.dbml` +3/−18
- `supabase/POLICY-SNAPSHOT.md` −2
- `supabase/migrations/20260826100000_retire_swatch_regions_roi.sql` 새 파일 +188
- `supabase/seed.sql` +8/−2
- `supabase/tests/admin_manual_representative_fixture.sql` +133/−136
- `supabase/tests/admin_representative_race_concurrent.sh` −1
- `supabase/tests/swatch_items_relink_revocation_edges_fixture.sql` +33/−35

핵심 raw diff는 DB 타입에서 `swatch_regions.image_id → shade_images.id` 관계 자체가 사라진 부분이야.

```diff
diff --git a/app/src/data/database.types.ts b/app/src/data/database.types.ts
index 9165ae1..2747804 100644
--- a/app/src/data/database.types.ts
+++ b/app/src/data/database.types.ts
@@ -2125,66 +2125,6 @@ export type Database = {
         }
         Relationships: []
       }
-      swatch_regions: {
-        Row: {
-          created_at: string | null
-          extracted_color_hex: string | null
-          extracted_lab_a: number | null
-          extracted_lab_b: number | null
-          extracted_lab_l: number | null
-          h: number
-          id: number
-          image_id: number
-          shade_id: number
-          w: number
-          x: number
-          y: number
-        }
-        Insert: {
-          created_at?: string | null
-          extracted_color_hex?: string | null
-          extracted_lab_a?: number | null
-          extracted_lab_b?: number | null
-          extracted_lab_l?: number | null
-          h: number
-          id?: number
-          image_id: number
-          shade_id: number
-          w: number
-          x: number
-          y: number
-        }
-        Update: {
-          created_at?: string | null
-          extracted_color_hex?: string | null
-          extracted_lab_a?: number | null
-          extracted_lab_b?: number | null
-          extracted_lab_l?: number | null
-          h?: number
-          id?: number
-          image_id?: number
-          shade_id?: number
-          w?: number
-          x?: number
-          y?: number
-        }
-        Relationships: [
-          {
-            foreignKeyName: "swatch_regions_image_id_fkey"
-            columns: ["image_id"]
-            isOneToOne: false
-            referencedRelation: "shade_images"
-            referencedColumns: ["id"]
-          },
-          {
-            foreignKeyName: "swatch_regions_shade_id_fkey"
-            columns: ["shade_id"]
-            isOneToOne: false
-            referencedRelation: "shades"
-            referencedColumns: ["id"]
-          },
-        ]
-      }
       swatches: {
```

연결된 테스트 지도도 실제로 이렇게 바뀌었어.

```diff
@@ -24,10 +24,10 @@
---   (18) **swatch_regions(ROI)가 있는 DB 상태**에서 — 지정이 좌표를 안 옮기고(데모트 +
---        새 행), 회수 3경로가 그 상태에서도 같은 결과를 낸다 (계약 개정 2 · fix 2)
---   (19) **ROI 를 물고 있는 데모트 행이 달린 그 발색 자체**를 원작자가 숨기거나 지울 때
---        FK 로 안 죽는다 (계약 개정 3 · fix 4 — (18) 이 피했던 바로 그 경로)
+--   (18) 대표 교체는 제자리 갱신이 아니라 **자리 비우기 + 새 행**이고, 비운 자리는
+--        잔행을 안 남긴다 — 옛 대표가 extraImgs 로 새지 않는다 (sw-ber 재목적화)
+--   (19) **사용자 경로 재현 3종** — P1 발색 숨김 · P2 사진 교체(자동 대표) ·
+--        P3 사진 교체(레거시 manual 대표) 가 23503 없이 끝난다 (sw-ber)
```

이 두 hunk에서 모기 눈에는 “예전 관계와 검증 대상이 이제 무엇으로 바뀌었다”고 보여?
~~~

## Turn 04

Codex turn key: `92002e1b3197a758`

### 모기

~~~text
ㅇㅇ 좋아 네가 출력해준 거 너무 맘에든다옹. 근데 그 파란색, 초록색으로 출력해준 문장들은 jargon이 좀 있다고해야하나 문장이 잘 이해가 않간다옹
~~~

### 과외냥이

~~~text
맞아. 색깔 문장은 코드의 실제 주석이라 설명용으로 압축된 jargon이 많아.

- `-`로 시작하는 파란색 문장: PR 적용 전 설명
- `+`로 시작하는 초록색 문장: PR 적용 후 설명

사람 말로 다시 쓰면 이거야.

**변경 전:** 대표 사진을 바꿔도 예전 대표 사진의 DB 행을 지우지 않고 남겨뒀어. ROI 좌표가 그 행을 가리키고 있었기 때문이야.

**변경 후:** 쓰지 않는 ROI 표를 없앴으니 예전 대표 사진 행을 그냥 삭제해. 그리고 옛 사진 행이 갤러리에 남지 않았는지, 발색 숨김이나 사진 교체도 오류 없이 끝나는지를 테스트해.

용어를 대응하면:

| 원문 표현 | 실제 뜻 |
|---|---|
| 대표 자리 비우기 | 현재 대표 사진인 `shade_images` 행 삭제 |
| 새 행 | 새 대표 사진을 위한 `shade_images` 행 생성 |
| 데모트 | 옛 대표 행을 삭제하지 않고 `대표 아님`으로 바꿔 남김 |
| 잔행 | 그렇게 DB에 남은 옛 대표 사진 행 |
| `extraImgs`로 샌다 | 남은 행이 상세 화면의 추가 사진 목록에 나타남 |
| 회수 | 숨기거나 교체한 발색에서 파생된 공개 사진 행을 삭제함 |
| P1·P2·P3 | 발색 숨김, 자동 대표 사진 교체, 수동 대표 사진 교체라는 테스트 이름 |
| `23503` | 외래 키 때문에 삭제가 거절됐다는 PostgreSQL 오류 번호 |

그리고 첫 질문이었던 `NO ACTION FK`는 이렇게 보면 돼.

```text
shade_images
id = 10             ← 지우려는 대표 사진 행

swatch_regions
image_id = 10       ← 그 사진의 ROI 좌표 행
```

`swatch_regions.image_id`는 `shade_images.id`를 가리켜. 실제 최초 정의도 다음 모양이야.

```sql
image_id bigint NOT NULL REFERENCES shade_images(id)
```

별도로 `ON DELETE CASCADE` 같은 행동을 지정하지 않았기 때문에 기본값이 `NO ACTION`이야. [`20260416063901_init_core.sql`](/home/mogi/code/swatch/swatch-v2/supabase/migrations/20260416063901_init_core.sql:170)

여기서 `NO ACTION`은 **“아무것도 안 하고 삭제를 허용한다”가 아니야.**

> DB가 연결된 `swatch_regions` 행을 자동으로 지우거나 수정하지 않는다.  
> 그런데 참조 대상인 `shade_images` 행만 지우면 관계가 깨지므로, 그 삭제 자체를 거부한다.

그래서 대표 사진 `id=10`을 지우려 하면:

1. `swatch_regions.image_id=10`이 아직 남아 있음
2. DB는 그 좌표 행을 자동 정리하지 않음
3. 대표 사진 삭제를 `23503`으로 거부함
4. 같은 트랜잭션의 발색 숨김·사진 교체도 전부 롤백됨

PR #535는 사용하지 않는 `swatch_regions` 표와 그 FK를 함께 없앴어. 이제 사진 행을 가리키는 좌표 행이 없으므로 대표 사진 삭제를 막을 관계도 없어졌고, 테스트는 세 사용자 동작이 삭제와 새 대표 선정까지 끝나는지 확인해. 근거는 PR HEAD의 마이그레이션 `11~25`, `141~148`행과 테스트 `643~650`행이야.

그럼 이 예시에서 `NO ACTION` 때문에 DB가 대표 사진 행 삭제를 거부한 이유를 모기 말로 한번 표현해볼래?
~~~

## Turn 05

Codex turn key: `29ba6e2974ba9017`

### 모기

~~~text
오오오 대박. 네 설명방식 아주 맘에드는구만!! 일단 질문에 답하면.. 이게 그 fk 정책이 on delete cascade 여야, 자식?행도 같이 포함해서, 삭제하려던 행 삭제가 가능함. 근데 no action이어가지고.. 걍.. 머.. 삭제 안되게 막아둔거임. 초반 설계라서 대충 정의했나봐ㅠ 그리고 모기 거슬리는거 shade_images 이거 흠... 아 또 내가 예전에 이거헷갈려했었는데 shade_images 테이블이 무슨역할을 하는지...? 흠.. 그냥 대표사진,만 의미하는 테이블인가? 흠..
~~~

### 과외냥이

~~~text
응, `NO ACTION` 이해는 거의 맞아. 한 가지만 교정하면:

> `CASCADE`여야만 부모 행을 지울 수 있는 건 아니야.  
> 자식 행을 먼저 직접 지운 뒤 부모를 지워도 돼.

가능한 정책은 대략 이래.

- `ON DELETE CASCADE`: 사진 행을 지우면 그 사진의 ROI 행도 DB가 자동 삭제
- `NO ACTION`: ROI 행이 남아 있으면 사진 행 삭제를 거부
- 직접 정리: 앱이나 DB 함수가 ROI 행을 먼저 삭제한 뒤 사진 행 삭제

그리고 “초기라 대충 정의했다”는 건 가능성은 있지만, 근거가 없어서 확정할 수는 없어. 실제로 확인되는 사실은 `ON DELETE ...`를 생략해 기본값인 `NO ACTION`이 됐다는 것뿐이야. [`20260416063901_init_core.sql`](/home/mogi/code/swatch/swatch-v2/supabase/migrations/20260416063901_init_core.sql:168)

`shade_images`는 **대표 사진만 저장하는 표는 아니야.** 더 정확히 말하면:

> 각 발색(`shades` 한 행)을 화면에서 어떤 사진으로 보여줄지 기록하는 표야.  
> 그중 `is_primary=true`인 최대 한 행이 대표 사진이고, 나머지 행은 추가 발색 사진이 될 수 있어.

사진 관련 세 표를 나누면 이래.

| 표 | 행 하나의 뜻 |
|---|---|
| `swatches` | 사용자가 등록한 발색 게시물 하나. 여러 사진 URL을 가질 수 있음 |
| `swatch_media` | 그 게시물에 든 개별 사진 하나의 정체성과 저장 상태 |
| `shade_images` | 특정 제품 발색 화면에 어떤 사진을 보여줄지 정한 행 |

예를 들어:

```text
사용자 발색 등록 S100
├─ swatch_media M1 = 첫 번째 사진
└─ swatch_media M2 = 두 번째 사진

제품 발색 “루비 레드”
└─ shade_images I10
   ├─ shade_id = 루비 레드
   ├─ media_id = M2
   ├─ url = M2를 표시할 주소
   ├─ is_primary = true
   └─ representative_source = 왜 대표가 됐는지
```

즉 `M2`는 **등록 게시물에 속한 실제 사진의 정체성**이고, `I10`은 **그 사진을 루비 레드의 대표로 쓰겠다는 화면 표시 기록**이야.

`shade_images`의 핵심 컬럼도 이 역할을 그대로 보여줘. [`database.types.ts`](/home/mogi/code/swatch/swatch-v2/app/src/data/database.types.ts:1458)

- `shade_id`: 어느 제품 발색 화면에 속하는가
- `media_id`: 원래 어느 개별 등록 사진에서 왔는가
- `url`: 화면에 표시할 사진 주소
- `is_primary`: 이 발색의 대표 사진인가
- `representative_source`: 수동 지정인지, 자동 선정인지
- `order_idx`: 여러 장이라면 표시 순서는 무엇인지

한 발색에 `is_primary=true`인 행은 최대 하나만 허용해. [`20260428220000_shade_images_primary_unique.sql`](/home/mogi/code/swatch/swatch-v2/supabase/migrations/20260428220000_shade_images_primary_unique.sql:21)

화면에서는 실제로:

1. `is_primary=true` 행을 대표 사진으로 고르고
2. 나머지 `shade_images` 행을 `extraImgs`로 만들어
3. 상세 화면 사진 목록에 추가해.

[`supabaseAdapter.ts`](/home/mogi/code/swatch/swatch-v2/app/src/data/supabase/supabaseAdapter.ts:212)  
[`DetailSheet.tsx`](/home/mogi/code/swatch/swatch-v2/app/src/features/shade-detail/DetailSheet.tsx:132)

그래서 앞서 나온 “옛 대표 행이 `extraImgs`로 샌다”는 말은:

> 대표 사진을 바꿨는데 옛 `shade_images` 행을 삭제하지 않고 `is_primary=false`로만 바꾸면, 화면은 그 행을 추가 사진으로 읽어서 옛 대표 사진까지 갤러리에 보여준다.

라는 뜻이야.

한 줄로 접으면:

> `swatch_media`는 등록된 개별 사진의 신분증이고, `shade_images`는 그 사진을 어느 제품 발색 화면에서 대표 또는 추가 사진으로 보여줄지 적은 표시 기록이야.

모기라면 `swatch_media`와 `shade_images`의 차이에 각각 어떤 한 줄 별명을 붙일 것 같아?
~~~

## Turn 06

Codex turn key: `05a25382c9edfaa7`

### 모기

~~~text
아아 이해했어. 모기 말로 이해하면 대표사진 후보들이 왔다갔다 하는 느낌이라옹. 그런데 흠~ 일단 첫번째로, shade_images 테이블 자체를 걍 shades에 두면 안되나? 라고 태클걸려고했는데 테이블구조보니까 그건 아닌것같다고 생각을 했다옹. 그리고 두번째로, extraImgs 말임.... 일단 이 pr에서 ROI테이블을 없앴으니까, is_primary=false인, 즉 옛 대표사진들이 생길 일은 없을것같긴 한데, 그냥 애초에 is_primary=true인 행만 남겨두고싶어. 대표가 아닌 사진은 그냥 shade_images테이블에 존재하지 않게 로직을 수정해야하지않나 그런생각이 들었다옹.. 내 업무를 예로 들면 현재고처럼. 현재고이력은 따로 있고, 현재고는 그냥 현재고 수량만 계속 실시간으로 업데이트되고 항상 최신이자나.
~~~

### 과외냥이

~~~text
결론부터 말하면, 모기 안이 현재 실제 동작과 더 잘 맞아. 특히 두 번째 생각이 핵심이야.

한 가지 표현만 바로잡으면:

> 대표사진 후보들이 `shade_images` 안에서 왔다 갔다 하는 게 아니야.  
> 후보들은 `swatches`·`swatch_media`에 있고, `shade_images`에는 그중 현재 뽑힌 승자만 있어도 돼.

현재고 비유로 바꾸면:

```text
swatches + swatch_media = 사진 원장·이력
shade_images            = 현재 대표사진 상태
```

실제로 QA를 읽어보니:

- `shade_images`: 총 97행
- `is_primary=true`: 97행
- `is_primary=false`: 0행
- 한 발색에 여러 `shade_images` 행이 있는 경우: 0개

현재 대표 생성 함수들도 전부 `is_primary=true` 행만 만들고, PR #535 뒤에는 옛 대표 행도 삭제해. 즉 실제 데이터는 이미 모기가 말한 현재고 모델로 움직여.

그런데 스키마와 화면 코드에는 옛 다중사진 모델이 남아 있어.

```ts
const primary = images.find((img) => img.is_primary) ?? images[0]
const extraImgs = images.filter((img) => img !== primary)
```

[`supabaseAdapter.ts`](/home/mogi/code/swatch/swatch-v2/app/src/data/supabase/supabaseAdapter.ts:212)

이 때문에 누가 나중에 실수로 `is_primary=false` 행을 만들면:

- 대표 행이 없을 때: 그 비대표 행이 대표처럼 표시됨
- 대표 행이 있을 때: 그 비대표 행이 추가 사진으로 표시됨

즉 DB에는 “비대표”라고 썼는데 화면이 임의로 의미를 부여해버려.

첫 번째 질문인 “그냥 `shades`에 두면 안 되나?”도 충분히 가능한 설계야.

```text
shades
├─ id
├─ name
└─ representative_media_id → swatch_media.id
```

그러면 대표 교체는 `shades.representative_media_id`만 다른 사진 ID로 바꾸는 일이 돼. 사진 자체의 이력과 수명은 `swatch_media`가 계속 맡고.

다만 별도 표를 유지하는 것도 틀리지는 않아. 대표사진에는 `대표가 된 이유`, 출처 주소, 연결된 사진 ID 같은 관계 자체의 정보가 여럿 있기 때문이야. 그 경우에는 현재 구조보다 이런 뜻이 더 선명해.

```text
shade_representatives
├─ shade_id PK
├─ media_id
├─ representative_source
└─ source_url
```

- 발색당 0행 또는 1행
- `is_primary` 불필요
- `extraImgs` 없음
- 사진 이력은 `swatch_media`
- 현재 대표만 이 표에 존재

그러니까 중요한 결정은 “`shades`에 합칠까, 별도 표일까?”보다 먼저 이거야.

> `shade_images`는 현재 대표 하나의 상태인가, 아니면 여러 공식 사진을 보관하는 갤러리인가?

현재 코드 생성 경로와 QA 데이터만 보면 답은 전자야. 후자를 원하는 별도 제품 요구는 아직 확인되지 않았어.

이 발견은 제품을 건드리지 않고 기존 `sw-ber`의 후속 판단 메모로 남겼고, 공책 커밋 `639e5d2`에 저장했어. [`master-delivery-memos.md`](/home/mogi/code/swatch/mogi-cards/master-delivery-memos.md:12)

추가 공식 사진 기능이 필요 없다고 가정하면, 모기는 `shades`에 대표사진 포인터를 직접 두는 쪽과 발색당 한 행인 별도 현재대표 표 중 어느 쪽이 더 읽기 좋다고 느껴?
~~~

## Turn 07

Codex turn key: `6b73ab99bceed5e9`

### 모기

~~~text
나(모기)도 동의함 현재 대표 하나의 상태라고봄 그리고 관련해서 하나만 더 확인하고싶어.. 대표사진이 홈탭이랑, 탐색탭에서 다르게 출력될거아냐. 홈탭에서는 내 사진이 올라가는거고. 그럼 .. 어떻게.. 테이블 설계를.. 해야하지 지금은 또 어떤 상태지
~~~

### 과외냥이

~~~text
결론은 **탐색 대표와 홈 사진을 같은 종류의 저장 상태로 보면 안 돼.**

- 탐색 대표: 모든 사용자에게 같은 전역 상태
- 홈 사진: 현재 로그인한 사용자의 사진 중 하나를 화면에서 고른 결과

그래서 테이블에는 화면별 결과를 두 개 저장하기보다, 사실과 전역 대표만 저장하고 홈에서 조합하는 게 맞아.

### 지금 실제 상태

```text
탐색 탭
shade
→ shade_images의 공용 대표
→ 모든 사용자에게 같은 사진
```

탐색 카드는 `shade_images`에서 만든 `swatchImgUrl`을 사용해. 정확히는 옛 로컬 이미지 → 공용 대표 → 추가 이미지 순서의 낡은 사다리가 아직 남아 있어. [`ShadeCardGrid.tsx`](/home/mogi/code/swatch/swatch-v2/app/src/features/explore/shade-feed/ShadeCardGrid.tsx:94) [`archive.ts`](/home/mogi/code/swatch/swatch-v2/app/src/shared/lib/archive.ts:20)

홈은 다르게 계산해.

```text
홈 탭의 내 화장품 카드
현재 사용자
→ 내가 등록한 swatch 목록
→ 해당 shade가 포함된 가장 최근 swatch
→ 그 swatch의 첫 사진
```

내 사진이 없으면:

```text
공용 대표사진
→ 이것도 없으면 색상칩
```

실제 우선순위도 이거야. [`homeCardVisual.ts`](/home/mogi/code/swatch/swatch-v2/app/src/features/home/homeCardVisual.ts:32)

```text
내 사진 > 공용 대표 > 색상칩
```

홈에서 내 사진을 고르는 값은 별도 DB 대표 행이 아니야. 현재 사용자의 기여 목록을 최신순으로 읽고, 발색별로 처음 만난 사진을 골라 그때그때 만든 인덱스야. [`mySwatchPhoto.ts`](/home/mogi/code/swatch/swatch-v2/app/src/shared/lib/mySwatchPhoto.ts:9) [`HomePage.tsx`](/home/mogi/code/swatch/swatch-v2/app/src/features/home/HomePage.tsx:175)

### 모기 현재고 비유로 다시 설계하면

```text
swatches
└─ 누가 올린 발색 기록인가

swatch_media
└─ 그 발색 기록에 속한 개별 사진 원장

swatch_items
└─ 그 발색 기록이 어느 shade와 연결되는가

shade 대표 상태
└─ 모든 사용자에게 보여줄 현재 공용 대표사진 하나

inventory
└─ 어느 사용자가 어느 shade를 보유·공병 처리했는가
```

화면은 이렇게 조합해.

```text
탐색
shade → 공용 대표사진

홈
inventory(user, shade)
→ 같은 user가 올린 해당 shade의 사진 검색
→ 있으면 내 사진
→ 없으면 공용 대표
→ 둘 다 없으면 색상칩
```

따라서 `shade_images`에 이런 식으로 저장하면 안 돼.

```text
shade A
├─ 모기의 홈 대표
├─ 냐옹이의 홈 대표
└─ 탐색 공용 대표
```

그렇게 하면 전역 상태와 사용자별 상태가 한 표에 섞이고, 로그인한 사용자에 따라 어느 행이 대표인지 달라져버려.

### 추천되는 경계

공용 대표는 0개 또는 1개만 둬.

```text
shade_representatives
- shade_id              PK
- media_id              FK → swatch_media.id
- representative_source
- selected_at
```

홈 사진은 지금처럼 저장하지 않고 계산해도 돼.

```text
내 최신 발색 중 해당 shade에 연결된 것
→ 첫 사진
```

이 방식이면 홈에서 내 사진을 새로 올리거나 숨길 때 별도의 “홈 대표 갱신” 작업이 필요 없어. 사진 원장이 바뀌면 다음 조회에서 자연히 결과도 바뀌어.

단, 나중에 사용자가 **“내 홈에서는 이 사진을 고정할래”**라고 직접 선택할 수 있어야 한다면 그때만 개인 포인터가 필요해.

```text
user_shade_representatives
- user_id
- shade_id
- media_id
- UNIQUE(user_id, shade_id)
```

또는 보유 제품에만 적용한다면 이미 `(user_id, shade_id)`가 유일한 `inventory`에 `home_media_id`를 둘 수도 있어. 하지만 현재처럼 “가장 최근 내 발색을 자동 사용”하는 규칙이라면 이 표나 컬럼은 중복 저장이야.

한 줄로 접으면:

> `shade_images`는 탐색에서 모두가 공유하는 현재 대표 하나만 맡고, 홈의 내 사진은 `사용자 + shade + 내가 올린 사진` 관계에서 계산한다.

모기가 확정한 “현재 대표 하나”와 홈·탐색 경계는 기존 마스터 메모에 추가했고, 공책 커밋은 `e3d2dd0`이야. 제품 저장소는 건드리지 않았어.

이제 남은 진짜 설계 질문은 하나야. 홈에 내 사진이 여러 장이면, 지금처럼 **가장 최근 발색의 첫 사진을 자동 사용**할까, 아니면 **모기가 홈용 사진 하나를 직접 고르게** 하고 싶어?
~~~

## Turn 08

Codex turn key: `961d7f7af7b3061c`

### 모기

~~~text
이해함 홈탭에서는 shade_images테이블을 조회 안한다는거잖아옹. 그리고 네 질문은, 내가 마스터 냐옹이랑 정하겠다옹
~~~

### 과외냥이

~~~text
거의 맞아. 한 줄만 교정하면 **홈도 `shade_images`를 아예 안 읽는 건 아니야.**

현재 홈 카드 순서는:

1. 내 발색 사진이 있으면 그 사진 사용
2. 내 사진이 없으면 `shade_images`의 공용 대표 사용
3. 둘 다 없으면 색상칩

즉 내 사진이 있는 카드에서는 `shade_images` 결과를 무시하고, 없는 카드에서만 공용 대표 fallback으로 써. [`homeCardVisual.ts`](/home/mogi/code/swatch/swatch-v2/app/src/features/home/homeCardVisual.ts:37)

홈용 사진을 자동으로 할지 직접 고르게 할지는 마스터 냐옹이와 정하면 돼. 과외에서는 이 경계까지 잡힌 걸로 두고, 다음 `PL/pgSQL은 생성 시 이름 해석을 안 한다` 질문으로 넘어갈까?
~~~

## Turn 09

Codex turn key: `08798d7c7596e5b6`

### 모기

~~~text
근데 그건 약간.흠... 내가 과외냥이 경계를, 개인공부용으로는 쓰고싶지않아 그건 따로하고싶다옹. PL/pgSQL 이거 제품설계에 있어 알아야한다고 생각하냐옹? 그럼설명해달라옹
~~~

### 과외냥이

~~~text
알겠어. 과외냥이 경계는 **현재 제품 설계·PR을 판단하는 데 필요한 개념만 설명**하고, 일반적인 개발 공부나 별도 연습은 여기서 하지 않는 걸로 잡을게.

`PL/pgSQL은 생성 시 이름 해석을 안 한다`는 내용은 PR #535를 판단하려면 최소한 알아둘 필요가 있어. PostgreSQL 내부 문법까지 공부할 필요는 없고, 이 한 문장만 알면 돼.

> DB가 함수 생성을 받아줬다고 해서, 함수 안에서 부르는 테이블이 실제로 존재한다는 뜻은 아니다.

PR 이전 함수는 대략 이런 동작이었어.

```sql
CREATE FUNCTION 대표_자리_비우기()
AS $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM swatch_regions
  ) THEN
    ...
  END IF;
END;
$$ LANGUAGE plpgsql;
```

함수 안의 `FROM swatch_regions`는 함수가 **실제로 호출되어 그 문장을 실행할 때** 테이블 이름을 찾는다고 보면 돼.

그래서 이런 잘못된 마이그레이션도 일단 적용될 수 있어.

```sql
BEGIN;

DROP TABLE swatch_regions;

-- swatch_regions를 읽는 옛 함수는 그대로 둠

COMMIT;
```

PostgreSQL이 마이그레이션 적용 순간에:

> “잠깐, 기존 PL/pgSQL 함수 안에 방금 삭제한 표 이름이 있는데?”

라고 반드시 막아주지 않아. PR #535에서도 이 동작을 로컬로 실측했어.

문제는 나중에 사용자가 발색을 숨기거나 사진을 교체할 때 발생해.

```text
사용자가 발색 숨김
→ DB 함수 실행
→ 함수가 swatch_regions 조회 시도
→ 그 표는 이미 삭제됨
→ 42P01: relation does not exist
→ 사용자 작업 전체 롤백
```

`42P01`은 “그 이름의 테이블이 없다”는 오류야.

그래서 PR #535는 다음 순서로 작성됐어.

```text
1. swatch_regions를 읽는 함수에서 그 문장을 먼저 제거
2. 관련된 다른 함수에서도 참조 제거
3. 마지막에 swatch_regions 표 삭제
```

다만 중요한 반전이 있어.

```sql
BEGIN;

DROP TABLE swatch_regions;
CREATE OR REPLACE FUNCTION ... -- 표를 더 이상 읽지 않는 새 함수

COMMIT;
```

이렇게 **표를 먼저 지우고 같은 트랜잭션 안에서 함수를 바로 고쳐도 최종 결과는 안전할 수 있어.** 다른 사용자는 `BEGIN`과 `COMMIT` 사이의 중간 상태를 보지 못하기 때문이야.

따라서 함수부터 고친 순서는 원자성을 만들기 위한 필수조건이 아니야. PR 설명대로 **작성·검토 규율**에 가까워.

> 삭제할 표를 읽는 함수들을 먼저 정리해놓고 마지막에 표를 지우면, 함수 하나를 빠뜨린 실수를 초안과 리뷰에서 발견하기 쉽다.

제품 설계에 필요한 결론만 접으면:

- 테이블 삭제가 성공했다고 관련 함수까지 안전한 것은 아니다.
- PL/pgSQL 함수 속 테이블 참조 누락을 DDL이 자동으로 잡아준다고 믿으면 안 된다.
- 표를 폐기할 때는 그 표를 읽는 함수·트리거를 전수 확인해야 한다.
- PR #535의 `함수 정리 → 표 삭제` 순서는 그 누락을 사람이 발견하기 쉽게 만든다.

이 정도면 PR #535의 설계 판단에는 충분하고, PL/pgSQL 내부 동작을 더 깊게 공부할 필요는 없어.
~~~

## Turn 10

Codex turn key: `b711f512577c0e8f`

### 모기

~~~text
아아 ㅇㅋㅇㅋ 이해함. 그럼 세션종료일지 쓰자옹
~~~
