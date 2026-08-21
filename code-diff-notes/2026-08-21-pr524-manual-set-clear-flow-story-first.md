---
reviewed: false
---
# PR #524 코드 독해 비교본 — 대표사진을 고르고 자동 선정으로 돌아가기

날짜: 2026-08-21

대상 PR: [#524](https://github.com/baksohyeon/swatch-v2/pull/524)

원본 노트: [`2026-08-21-pr524-manual-set-clear-flow.md`](./2026-08-21-pr524-manual-set-clear-flow.md)

이 문서는 원본을 지우지 않고 설명 순서만 비교하기 위해 만든 모기용 버전이다. 같은
구현 근거를 먼저 **사용자에게 일어난 일**로 읽고, 정확한 함수명과 raw diff는 뒤에서
확인한다.

## 0. 판독 도장과 전체 변경 파일 — 지금 외울 필요 없음

판독 범위: `8e62d328248dd46476d5ae581f59c9164082869f..da672a05a9eb36cc158d0f120b2f9f673ba39ec0`

판독 HEAD: `da672a05a9eb36cc158d0f120b2f9f673ba39ec0`

PR 전체 변경은 10개 파일, 총 `+2785/-1`이다. 아래 목록은 raw diff 판독 범위를
고정하는 도장이다. 핵심 이야기를 이해하기 위해 파일명을 먼저 외울 필요는 없다.

### 변경 파일 전체 목록

지금은 이 목록을 건너뛰고 바로 1번으로 가도 된다.

- `app/src/data/repos/adminRepresentativeRepo.test.ts`
- `app/src/data/repos/adminRepresentativeRepo.ts`
- `app/src/features/admin/routes/AdminPage.tsx`
- `app/src/features/admin/routes/AdminRepresentativeCuration.tsx`
- `supabase/POLICY-SNAPSHOT.md`
- `supabase/migrations/20260819000000_admin_manual_shade_representative.sql`
- `supabase/migrations/20260819010000_manual_representative_revocation_parity.sql`
- `supabase/migrations/20260820000000_demoted_roi_revocation_parity.sql`
- `supabase/tests/admin_manual_representative_fixture.sql`
- `supabase/tests/admin_representative_race_concurrent.sh`

## 1. 오늘 기억할 사건

어드민이 `a2.jpg`를 대표사진으로 고르면 화면 대표가 `a2.jpg`로 바뀐다.
어드민이 그 수동 지정을 해제하면 시스템이 자동 선정 규칙을 다시 실행하고,
이 예시에서는 `a1.jpg`를 대표로 고른다.

```text
수동 지정 뒤              수동 해제 뒤
a2.jpg                    a1.jpg
어드민이 직접 선택         시스템이 다시 자동 선정
```

여기서 해제는 과거 값을 저장해 두었다가 `a1.jpg`로 되감는 동작이 아니다. 살아 있는
후보를 그 시점에 다시 계산했고, 자동 규칙의 결과가 `a1.jpg`였던 것이다.

> [!note] 모기 박스
> 힌트 키워드: `a2` 수동 지정 / 해제 / 후보 재계산 / `a1` 자동 선정
> 이 두 시점에서 이해한 변화나 아직 헷갈리는 대상을 자유롭게 적어도 돼.
>
> 모기 메모: 와맞아. 이거기억난다옹ㅋㅋ 머 b1.jpg가 원래 대표였는데 a2.jpg로 바꾸고, 그뒤에 a2.jpg가 해제될걸 고려해서 b1.jpg를 따로 어디에 캐싱해두는거? 완전 극혐별로설계라옹. 깨끗한 자동화로직에다가 맡기는게 유지보수성에도 좋은것같다옹. 클린한것같긔 ㅋ 

## 2. 화면에서 일어나는 두 가지 흐름

### 수동으로 `a2.jpg`를 고를 때

1. 어드민이 대상 호수에서 `a2.jpg`를 누른다.
2. 서버는 그 사진이 이 호수의 공개 가능한 후보인지 검사한다.
3. 서버는 현재 대표 자리를 비운다.
4. `a2.jpg`를 가리키는 새 대표 행을 만들고 `manual`이라고 표시한다.
5. 화면이 현재 대표를 다시 조회하면 `a2.jpg`가 보인다.

수동 대표는 어드민의 판단을 보존하는 자리라서, 평소의 자동 선정이 임의로 덮지 않는다.

### 수동 지정을 해제할 때

1. 어드민이 수동 지정 해제를 누른다.
2. 서버는 현재 대표가 정말 `manual`인지 확인한다.
3. 서버는 그 수동 대표 자리를 비운다.
4. 같은 작업 안에서 기존 자동 선정 규칙을 다시 실행한다.
5. 이 예시에서는 자동 규칙이 `a1.jpg`를 새 대표로 고른다.
6. 화면이 다시 조회하면 `a1.jpg`가 보인다.

자동 후보가 하나도 없다면 5번에서 새 대표 행이 생기지 않는다. 이때 해제 자체는
성공했지만 화면에는 대표사진 대신 색상칩이 보인다. 반대로 현재 대표가 이미 자동
선정 상태이거나 대표가 없다면, 해제할 수동 지정이 없으므로 아무것도 바꾸지 않는다.

> [!note] 모기 박스
> 힌트 키워드: 사용자가 누른 것 / 서버 검사 / 대표 자리 / 화면 재조회
> 두 흐름 중 하나를 골라 이해한 순서나 떠오른 질문을 자유롭게 적어도 돼.
>
> 모기 메모: 수동으로 a2.jpg 고를때, 3번에서, 서버가 현재 대표 자리 비운다는거는 그 대표 swatch_images 그 행의 is_primary=false로 바꾼다는거 맞겠지냥? 좋다옹. 이거 바뀐 설명 맘에들긴하는데 이거 중요한.부분인 경우에는 어떤테이블 어떤컬럼인지 괄호치고 부연해주면 좋을것같기는하다옹! 

## 3. 어떤 행이 바뀌는가

화면에 보이는 사진 파일과 “이 사진이 현재 대표다”라는 관계는 서로 다른 행이다.


| 대상                                   | 값의 주인                            | 이번 흐름에서 맡는 일                             |
| ------------------------------------ | -------------------------------- | ---------------------------------------- |
| `swatch_media`의 사진 사본 행              | 사용자가 등록한 사진 한 장                  | 어드민이 고른 `a2.jpg`와 그 UUID를 제공함            |
| `swatch_items`의 발색-호수 매핑 행           | 발색 등록 하나                         | 선택한 사진의 부모 발색이 대상 호수에 속하는지 증명함           |
| `shade_images`의 `is_primary=true` 행  | 제품 카탈로그의 호수 하나                   | 화면에 현재 대표로 보일 사진을 기록함                    |
| `shade_images.representative_source` | 현재 `is_primary=true` 대표 행을 고른 규칙 | `manual`은 어드민 선택, `auto_single`은 자동 선택임  |
| `shade_images.media_id`              | 대표 행과 사진 사본의 관계                  | 현재 대표가 어느 `swatch_media` 사진을 근거로 삼는지 연결함 |


### 지정 전후

```text
변경 전
  호수 A의 현재 대표 행이 있으면 그 자리
  (지정 테스트 hunk는 이때의 URL·선정 방식을 따로 확인하지 않음)

변경
  현재 대표 자리를 비움
  + a2.jpg를 가리키는 새 shade_images 행을 만듦

변경 후
  shade_id = 호수 A
  is_primary = true
  representative_source = manual
  media_id = a2.jpg의 swatch_media UUID
```

기존 대표 행을 제자리에서 `a2.jpg`로 갈아끼우지는 않는다. 기존 행에 사진의 특정
영역을 표시한 좌표가 붙어 있을 수 있기 때문이다. 제자리에서 사진만 바꾸면 옛 사진의
좌표가 새 사진에 붙는다.

- `swatch_regions.image_id`가 기존 `shade_images.id`를 참조하지 않으면 기존 대표 행을 삭제한다.
- 참조하면 기존 대표 행은 남기고 `shade_images.is_primary=false`로 내린다.
- 어느 갈래든 `a2.jpg`의 수동 대표는 새 행으로 만든다.

### 해제 전후

```text
변경 전
  호수 A의 현재 대표 행 → a2.jpg / manual

변경
  a2.jpg의 manual 대표 자리를 비움
  + 기존 자동 선정 규칙을 다시 실행함

변경 후
  호수 A의 현재 대표 행 → a1.jpg / auto_single
```

자리 비우기와 자동 재선정은 같은 DB 트랜잭션에서 끝난다. 다른 사용자는 그 사이의
“대표 자리가 잠깐 비어 있는 상태”를 따로 보지 않는다.

> [!note] 모기 박스
> 힌트 키워드: 사진 사본 행 / 대표 관계 행 / 새 행 / 좌표 보존
> 어느 행이 남고 사라지는지, 또는 사진과 대표 관계의 차이를 자유롭게 적어도 돼.
>
> 모기 메모: 위 표에서.. "선택한 사진의 부모 발색" 이게 뭐지. 이해못함. 발색샷에 부모라는개념이 있냐옹.? 그리고이건 혼잣말. shade_images 테이블이 진짜 내 이해에 너무큰 병목이 되는것같군. 대표 지정 관련 이벤트가 생길때 shade_images행을 만든다고하니까 이게 대표사진테이블같잖아. 참내 ㅡㅡ 그냥혼잣말임 빨리 다음 pr에서 고쳐야겟음 암튼 shade_images는 대표가된적이 있으면 저장이되는거고. 아오 진짜 거슬린다옹 

## 4. 왜 이 예시에서 다시 `a1.jpg`가 되는가

테스트의 호수 A에는 다음 자동 후보가 있다.


| 발색 등록     | 등록 시점 | 사진                 | 자동 선정에서 쓰는 사진 |
| --------- | ----- | ------------------ | ------------- |
| `9920001` | 더 오래됨 | `a1.jpg`, `a2.jpg` | 첫 사진 `a1.jpg` |
| `9920002` | 더 나중  | `b1.jpg`           | 첫 사진 `b1.jpg` |


어드민은 사람의 판단으로 첫 사진이 아닌 `a2.jpg`도 수동 대표로 고를 수 있다. 하지만
수동 지정을 해제하면 기존 자동 규칙이 다시 적용된다. 이 픽스처에서는 두 후보의 등급이
같아서 먼저 등록된 발색의 첫 사진인 `a1.jpg`가 선택된다.

따라서 `a2 → a1`은 “둘째 사진을 선택 취소하면 무조건 첫째 사진으로 간다”는 새 규칙이
아니다. 이 데이터에서 기존 자동 선정 규칙을 다시 실행한 결과다.

> [!note] 모기 박스
> 힌트 키워드: 수동 후보 / 자동 후보 / 첫 사진 / 먼저 등록됨
> `a1`이 선택된 이유나 일반 규칙으로 오해하기 쉬운 지점을 자유롭게 적어도 돼.
>
> 모기 메모: 이해했긔 ㅋ 

## 5. 여기부터 구현 근거

앞의 사용자 사건을 코드 이름에 연결하면 다음 네 파일이 한 줄씩 역할을 나눠 가진다.


| 층    | 코드의 역할                                                                                                   | 정확한 위치                                                                                |
| ---- | -------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------- |
| 화면   | 선택·해제 버튼 이벤트를 받고, 끝난 뒤 화면을 다시 조회함                                                                        | `AdminRepresentativeCuration.tsx`의 `onPick()`·`onClear()`·`refresh()`                 |
| repo | 지정 인자를 넘기고, 해제 결과의 `action`·`reselected`를 화면 안내 분기에 전달함                                                  | `adminRepresentativeRepo.ts`의 `setShadeRepresentative()`·`clearShadeRepresentative()` |
| DB   | `admin_set_shade_representative`는 새 manual 대표를 만들고, `admin_clear_shade_representative`는 해제 뒤 자동 재선정을 호출함 | `20260819000000_admin_manual_shade_representative.sql`                                |
| 테스트  | 지정 뒤 `a2/manual`, 해제 뒤 `a1/auto_single`인지 확인함                                                            | `admin_manual_representative_fixture.sql`의 PASS(2)·PASS(10)                           |


### 수동 지정의 실제 DB hunk

아래는 현재 대표 자리를 먼저 비운 다음, 선택한 사진을 가리키는 새 `manual` 행을 넣는
실제 추가분이다.

```diff
+  SELECT id INTO v_existing
+    FROM shade_images
+   WHERE shade_id = p_shade_id AND is_primary
+   ORDER BY id
+   LIMIT 1
+     FOR UPDATE;
+
+  IF v_existing IS NULL THEN
+    v_action := 'inserted';
+    v_prev   := NULL;
+  ELSE
+    v_action := 'updated';
+    v_prev   := vacate_shade_primary_image(v_existing);
+  END IF;
+
+  INSERT INTO shade_images (shade_id, url, is_primary, source_url, order_idx,
+                            representative_source, media_id)
+  VALUES (p_shade_id, v_media.source_url, true, v_post_url, 0, 'manual', p_media_id);
```

여기서 `p_shade_id`는 대상 호수, `p_media_id`는 어드민이 고른 사진 사본의 UUID다.
`vacate`가 옛 대표 자리를 비우고, `INSERT`가 새 수동 대표 관계를 만든다.

### 수동 해제의 실제 DB hunk

아래는 현재 대표가 `manual`일 때만 자리를 비우고, 기존 자동 선정 함수를 다시 부르는
실제 추가분이다.

```diff
+  IF v_existing.representative_source <> 'manual' THEN
+    RETURN jsonb_build_object('action', 'noop', 'reason', 'not_manual',
+                              'shade_id', p_shade_id,
+                              'representative_source', v_existing.representative_source);
+  END IF;
+
+  v_prev := vacate_shade_primary_image(v_existing.id);
+
+  PERFORM reselect_shade_representative(p_shade_id);
+
+  SELECT url, representative_source, media_id
+    INTO v_after
+    FROM shade_images
+   WHERE shade_id = p_shade_id AND is_primary;
```

`reselect_shade_representative()`가 “자동 사다리”의 실제 주인이다. 해제 RPC는 자동 규칙을
복사하지 않고 이 함수를 호출한 뒤, 새 `is_primary=true` 행이 생겼는지만 읽는다.

### 화면에서 DB까지의 이름 연결

```text
어드민이 사진 선택
→ onPick(candidate)
→ setShadeRepresentative(shadeId, candidate.mediaId)
→ admin_set_shade_representative(p_shade_id, p_media_id)
→ refresh()
→ fetchRepresentativeCuration()이 shade_images.is_primary=true 행을 다시 읽음

어드민이 수동 지정 해제
→ onClear()
→ clearShadeRepresentative(shadeId)
→ admin_clear_shade_representative(p_shade_id)
→ refresh()
→ fetchRepresentativeCuration()이 shade_images.is_primary=true 행을 다시 읽음
```

화면과 repo는 `shade_images`를 직접 고치지 않는다. 후보 검사, 대표 자리 교체, 자동
재선정은 DB가 한 번에 끝내고 결과를 돌려준다.

> [!note] 모기 박스
> 힌트 키워드: 화면 이벤트 / repo / RPC / 대표 행
> 앞의 사용자 사건과 여기의 코드 이름이 어떻게 연결되는지 자유롭게 적어도 돼.
>
> 모기 메모: 아힘들어 이해한듯ㅋ 

## 6. 테스트가 붙잡는 최종 상태

지정 검사는 첫 사진이 아닌 `a2.jpg`를 골라도 수동 대표가 되는지 확인한다.

```diff
+  v_res := admin_set_shade_representative(v_a, v_m_a2);
+
+  SELECT url, representative_source, media_id, source_url
+    INTO v_row
+    FROM shade_images WHERE shade_id = v_a AND is_primary;
+  IF v_row.url IS DISTINCT FROM 'https://djc-verify.invalid/a2.jpg' THEN
+    RAISE EXCEPTION 'FAIL(2): 대표 URL 이 % — a2(두 번째 사진) 기대. 수동 후보가 첫 사진으로 좁혀졌다', v_row.url;
+  END IF;
+  IF v_row.representative_source IS DISTINCT FROM 'manual' THEN
+    RAISE EXCEPTION 'FAIL(2): representative_source 가 % — manual 기대', v_row.representative_source;
+  END IF;
```

해제 검사는 자동 재선정이 실제로 실행됐고, 최종 대표 행이 `a1.jpg/auto_single`인지
확인한다.

```diff
+  v_res := admin_clear_shade_representative(v_a);
+  IF (v_res->>'reselected')::boolean IS NOT TRUE THEN
+    RAISE EXCEPTION 'FAIL(10): 해제가 재선정을 안 돌렸다 — 같은 트랜잭션 재선정 계약 위반';
+  END IF;
+
+  SELECT url, representative_source INTO v_row
+    FROM shade_images WHERE shade_id = v_a AND is_primary;
+  IF v_row.url IS DISTINCT FROM 'https://djc-verify.invalid/a1.jpg' THEN
+    RAISE EXCEPTION 'FAIL(10): 재선정 결과가 % — a1(사다리 first-come) 기대', v_row.url;
+  END IF;
+  IF v_row.representative_source IS DISTINCT FROM 'auto_single' THEN
+    RAISE EXCEPTION 'FAIL(10): 재선정 등급이 % — auto_single 기대', v_row.representative_source;
+  END IF;
```

`IF ... RAISE EXCEPTION` 안은 원하는 상태가 아니라 **나오면 테스트가 실패할 상태**다.


| 시점       | 화면 대표                   | 대표를 고른 주체    | DB 표시         |
| -------- | ----------------------- | ------------ | ------------- |
| 수동 지정 전  | 이 테스트 hunk에서 별도 확인하지 않음 | —            | —             |
| 어드민 지정 뒤 | `a2.jpg`                | 어드민          | `manual`      |
| 수동 해제 뒤  | `a1.jpg`                | 다시 실행된 자동 규칙 | `auto_single` |


> [!note] 모기 박스
> 힌트 키워드: 실패 조건 / 지정 뒤 / 해제 뒤 / 최종 대표
> 테스트가 증명하는 상태나 코드에서 다시 보고 싶은 줄을 자유롭게 적어도 돼.
>
> 모기 메모: 오 실제로 자동재선정 돌았는지 검증하는거 좋구만! 

## 7. 한 줄로 다시 접기

```text
어드민이 a2.jpg를 고르면 새 manual 대표가 되고,
그 수동 지정을 해제하면 기존 자동 규칙이 후보를 다시 계산해 이 예시에서는 a1.jpg를 대표로 고른다.
```

구현 이름까지 붙이면 다음 한 줄이다.

```text
onPick → admin_set_shade_representative → a2/manual
→ onClear → admin_clear_shade_representative → 자동 재선정 → a1/auto_single → refresh
```

> [!note] 모기 박스
> 힌트 키워드: 사용자 사건 / 상태 변화 / 구현 근거 / 남은 질문
> 지금 남기고 싶은 한 문장이나 의문을 자유롭게 적어도 돼.
>
> 모기 메모:

## 8. 이 비교본에서 직접 펼치지 않은 파일

이번 핵심길에서는 지정·해제 DB hunk와 PASS(2)·PASS(10) 테스트 hunk를 직접 봤다.
아래 파일은 전체 변경 목록에는 포함되지만 이 비교본에서 raw hunk를 펼치지 않았다.

- `app/src/data/repos/adminRepresentativeRepo.test.ts`
- `app/src/data/repos/adminRepresentativeRepo.ts` — 함수 이름과 역할만 연결함
- `app/src/features/admin/routes/AdminPage.tsx`
- `app/src/features/admin/routes/AdminRepresentativeCuration.tsx` — 이벤트 이름과 역할만 연결함
- `supabase/POLICY-SNAPSHOT.md`
- `supabase/migrations/20260819010000_manual_representative_revocation_parity.sql`
- `supabase/migrations/20260820000000_demoted_roi_revocation_parity.sql`
- `supabase/tests/admin_manual_representative_fixture.sql` — 지정·해제 성공 hunk만 펼침
- `supabase/tests/admin_representative_race_concurrent.sh`

원본과 비교할 때는 “빠진 구현 이름이 있는가”보다, **같은 사실을 어느 순서에서 만났을
때 핵심 사건이 먼저 잡히는가**를 보면 된다.

## 과외냥이 피드백

모기 메모의 큰 흐름은 맞다. 과거 대표를 따로 저장해 두었다가 되감지 않고, 수동
지정을 해제하는 시점에 살아 있는 후보를 대상으로 기존 자동 선정 규칙을 다시 실행한다.
다만 이 테스트는 수동 지정 전 대표가 `b1.jpg`였는지는 확인하지 않는다. 지정 전
대표의 URL과 선정 방식은 이 테스트 hunk의 판독 범위 밖이다.

`서버가 현재 대표 자리를 비운다`는 말은 항상 `is_primary=false`로 바꾼다는 뜻은
아니다. 대상 테이블은 `swatch_images`가 아니라 `shade_images`다. 기존
`shade_images` 행을 `swatch_regions.image_id`가 참조하면 좌표를 보존하기 위해
`is_primary=false`로 내리고, 참조하지 않으면 기존 행을 삭제한다
(`20260819000000_admin_manual_shade_representative.sql:115-121`). 어느 갈래든 새
수동 대표는 별도의 `shade_images` 행으로 만든다.

표의 `선택한 사진의 부모 발색`은 별도의 부모 계층을 뜻하지 않는다. 정확히는 선택한
`swatch_media` 사진 행의 `swatch_id`가 가리키는 `swatches` 발색 등록 행이다. 서버는
그 발색 등록의 `swatch_items` 행을 읽어 대상 호수와 연결되어 있는지 확인한다
(`database.types.ts:2006-2008`, `database.types.ts:2059`). 따라서 이 문장은
`선택한 사진이 속한 발색 등록이 대상 호수에 매핑됐는지 증명함`이라고 읽는 편이
정확하다.

마지막으로 `shade_images는 대표가 된 적이 있으면 저장된다`는 항상 성립하지 않는다.
새 대표 관계는 새 행으로 만들지만, 옛 대표 행은 좌표 참조가 있을 때만 남고 참조가
없으면 삭제된다. 이 테이블에서 현재 대표 관계와 좌표 때문에 보존된 비대표 이미지 행이
함께 보일 수 있다는 점이 이해를 어렵게 만드는 지점이다.
