---
reviewed: false
---
# PR #524 코드 독해 — manual 대표 지정에서 해제·자동 복귀까지

날짜: 2026-08-21

대상 PR: [#524](https://github.com/baksohyeon/swatch-v2/pull/524)

최종 PR 판독 범위: `8e62d328248dd46476d5ae581f59c9164082869f..da672a05a9eb36cc158d0f120b2f9f673ba39ec0`

판독한 최종 HEAD: `da672a05a9eb36cc158d0f120b2f9f673ba39ec0`

이 문서는 정식 Review Gate Quiz 답안지가 아니다. 사진 교체·사본 삭제 때 manual
대표를 회수하는 경로를 본 다음, PR #524의 본체인 아래 흐름을 실제 코드에 연결하는
학습 노트다.

```text
어드민이 후보 사진을 manual 대표로 지정
→ 기존 대표 자리를 비움
→ 새 manual 대표 행을 넣음
→ 어드민이 manual 지정을 해제
→ manual 대표 자리를 비움
→ 같은 트랜잭션에서 자동 사다리가 다음 대표를 고름
```

## 1. 먼저 행과 값의 주인을 고정한다

이번 흐름에서 “사진”이나 “대표”라는 말만 쓰면 서로 다른 행이 섞인다.


| 테이블·행                                | 값의 주인               | 이번 흐름에서 맡는 일                              |
| ------------------------------------ | ------------------- | ----------------------------------------- |
| `swatch_media` 사진 사본 행               | 사용자가 등록한 발색의 사진 한 장 | 어드민이 고를 후보 사진의 UUID `media_id`와 사진 URL 제공 |
| `swatch_items` 발색-호수 매핑 행            | 발색 등록 하나            | 후보 사진의 부모 발색이 대상 shade에 연결됐는지 증명          |
| `shade_images`의 `is_primary=true` 행  | 제품 카탈로그의 shade 하나   | 탐색 화면에 현재 대표로 보일 사진 자리                    |
| `shade_images.representative_source` | 현재 대표를 세운 규칙        | `manual`이면 어드민 지정, `auto_*`이면 자동 사다리 결과   |
| `shade_images.media_id`              | 현재 대표와 사진 사본의 관계    | 대표가 어느 `swatch_media.id` 사진을 근거로 삼았는지 연결  |


여기서 어드민이 선택하는 것은 기존 `shade_images` 행의 내용물을 직접 고치는 일이
아니다. 입력은 **대상 shade의 ID와 후보 `swatch_media` 사진의 UUID** 두 개다.

> [!note] 모기 박스
> 힌트 키워드: `swatch_media` / `shade_images` / 후보 사진 / 화면 대표
> 이 절에서 이해한 관계, 아직 헷갈리는 대상, 떠오른 질문 중 아무거나 자유롭게 적어도 돼.
>
> 모기 메모: 어흐흑..어흑..

## 2. 판독 범위와 전체 변경 지도

PR #524 최종 변경은 10개 파일, 총 `+2785/-1`이다.


| 상태  | 파일                                                                               |
| --- | -------------------------------------------------------------------------------- |
| 추가  | `app/src/data/repos/adminRepresentativeRepo.test.ts`                             |
| 추가  | `app/src/data/repos/adminRepresentativeRepo.ts`                                  |
| 수정  | `app/src/features/admin/routes/AdminPage.tsx`                                    |
| 추가  | `app/src/features/admin/routes/AdminRepresentativeCuration.tsx`                  |
| 수정  | `supabase/POLICY-SNAPSHOT.md`                                                    |
| 추가  | `supabase/migrations/20260819000000_admin_manual_shade_representative.sql`       |
| 추가  | `supabase/migrations/20260819010000_manual_representative_revocation_parity.sql` |
| 추가  | `supabase/migrations/20260820000000_demoted_roi_revocation_parity.sql`           |
| 추가  | `supabase/tests/admin_manual_representative_fixture.sql`                         |
| 추가  | `supabase/tests/admin_representative_race_concurrent.sh`                         |


이번 핵심길에서는 아래 네 파일의 연결된 hunk만 직접 본다.

```text
20260819000000_admin_manual_shade_representative.sql
  admin_set_shade_representative(p_shade_id, p_media_id)는
  shade_images에서 shade_id=p_shade_id이고 is_primary=true인 기존 행을 비운 뒤,
  is_primary=true·representative_source=manual·media_id=p_media_id인 새 행을 넣는다.
  admin_clear_shade_representative(p_shade_id)는 별도 호출이며,
  같은 조건의 현재 행이 manual일 때 그 행을 비운 뒤 같은 트랜잭션에서
  reselect_shade_representative(p_shade_id)를 부른다.

adminRepresentativeRepo.ts
  setShadeRepresentative(shadeId, mediaId)는 지정 RPC를 호출하고 action·url을 반환한다.
  clearShadeRepresentative(shadeId)는 해제 RPC를 호출하고
  action·reselected·representativeSource를 반환한다.

AdminRepresentativeCuration.tsx
  onPick(candidate)는 선택한 shade ID와 candidate.mediaId를 지정 함수에 넘긴다.
  onClear()는 해제 결과의 action·reselected로 안내 문구를 고른다.
  두 이벤트 모두 끝나면 refresh()가 fetchRepresentativeCuration()을 다시 호출한다.

admin_manual_representative_fixture.sql
  지정 뒤에는 shade_images에서 shade_id=v_a이고 is_primary=true인 행이
  a2.jpg·manual·v_m_a2인지 검증한다.
  해제 뒤에는 RPC 결과가 cleared·reselected=true이고, 다시 조회한 primary 행이
  자동 사다리가 고른 a1.jpg·auto_single인지 검증한다.
```

> [!note] 모기 박스
> 힌트 키워드: UI 이벤트 / repo / RPC / DB 행
> 네가 파악한 파일 연결 순서나, 설명에서 이름이 빠져 보이는 대상을 자유롭게 적어도 돼.
>
> 모기 메모:

## 3. 예시 시작 상태 — 자동 대표가 이미 있는 shade

아래 값은 흐름을 읽기 위한 작은 예시다. 실제 픽스처 UUID를 복사한 것은 아니다.

```text
swatch_media
  id = media-new
  swatch_id = 발색-20
  source_url = new.jpg

swatch_items
  swatch_id = 발색-20
  shade_id = 호수-A

shade_images
  id = image-old
  shade_id = 호수-A
  is_primary = true
  representative_source = auto_single
  media_id = media-old
  url = old.jpg

swatch_regions
  image_id = image-old인 행 없음
```

이 예시는 `swatch_regions`가 `image-old`를 참조하지 않는 상태다. 따라서 아래 지정
흐름에서 `vacate_shade_primary_image(image-old)`는 `image-old`를 삭제한다. ROI 행이
참조하는 예시라면 삭제하지 않고 `image-old.is_primary`를 `false`로 바꾼다.

어드민이 `호수-A`의 새 대표로 `media-new`를 선택한다. RPC 입력은 다음 두 값이다.

```text
p_shade_id = 호수-A
p_media_id = media-new
```

> [!note] 모기 박스
> 힌트 키워드: `image-old` / 제자리 UPDATE / 새 manual 행 / 포인터
> 지정 뒤 바뀔 것 같은 행, 확실하지 않은 조건, 예상한 다음 상태를 자유롭게 적어도 돼.
>
> 모기 메모:

## 4. 지정 raw hunk — 옛 자리를 먼저 비우고 새 manual 행을 넣는다

`20260819000000_admin_manual_shade_representative.sql`은 PR에서 새로 추가된 파일이라
아래 `+` 줄 전체가 실제 PR 추가분이다. 후보 사진의 공개 상태·소속·단독 shade 매핑
검사를 통과한 다음 실행되는 교체 본문이다.

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
+
+  RETURN jsonb_build_object(
+    'action',   v_action,
+    'shade_id', p_shade_id,
+    'media_id', p_media_id,
+    'url',      v_media.source_url,
+    'previous', v_prev
+  );
```

> [!note] 모기 박스
> 힌트 키워드: SELECT 기존 대표 / vacate / INSERT / 순서
> 이 코드 순서에서 이해한 점이나 이상해 보이는 점을 자유롭게 적어도 돼.
>
> 모기 메모:

코드의 순서는 다음 뜻이다.

1. `shade_images`에서 호수-A의 현재 `is_primary=true` 행을 찾고 잠근다.
2. 현재 대표가 있으면 `vacate_shade_primary_image(image-old)`로 그 **자리**를 비운다.
3. 선택한 `media-new`를 가리키는 **새 `shade_images` 행**을 `manual` 대표로 넣는다.
4. 이 전부가 같은 트랜잭션이므로 다른 세션은 중간의 빈 대표 자리를 보지 않는다.

`vacate_shade_primary_image()`는 기존 행에 ROI 참조가 없으면 삭제하고, ROI 참조가
있으면 `is_primary=false`로 내린다. 어느 갈래든 기존 행은 대표 자리에서 빠진다.

제자리 `UPDATE`로 `image-old.url`과 `image-old.media_id`만 새 사진 값으로 갈아끼우지
않는 이유는, 그 행을 가리키는 ROI 좌표가 있다면 옛 사진 기준 좌표가 새 사진에 붙기
때문이다. 모기가 지난 세션 끝에서 말한 “내용물이 아니라 포인터를 바꿔야 한다”가
이 `vacate → INSERT` 순서에 해당한다.

## 5. 지정 전 검증 — 아무 사진이나 sticky manual로 세우지 않는다

교체 본문 전에 서버는 선택된 `swatch_media` 행을 기준으로 다음을 확인한다.

```text
호출자가 admin인가
→ shade와 media가 실제로 존재하는가
→ 부모 발색이 숨김 상태가 아닌가
→ 사진 상태가 공개 가능한가
→ 발색 사진 묶음이 격리되지 않았는가
→ revoke/delete 회수 대기 중이 아닌가
→ 그 발색이 대상 shade에 실제로 매핑됐는가
→ 그 발색의 해석 가능한 distinct shade가 정확히 하나인가
```

마지막 검사는 사진별 shade 관계가 없기 때문에 필요하다. 발색 하나가 호수-A와
호수-B에 함께 연결돼 있고 사진이 세 장이어도, DB는 그중 어느 사진이 어느 호수의
단독샷인지 모른다. 잘못 세운 manual 대표는 자동 사다리가 못 덮으므로 이 RPC는
다중-shade 발색을 추측하지 않고 거부한다.

> [!note] 모기 박스
> 힌트 키워드: 발색 단위 매핑 / 사진별 관계 없음 / 다중-shade / sticky manual
> 서버가 사진을 허용하거나 거부하는 기준에서 떠오른 생각이나 질문을 자유롭게 적어도 돼.
>
> 모기 메모:

## 6. 해제 raw hunk — manual 자리만 비우고 자동 사다리를 다시 부른다

`admin_clear_shade_representative(p_shade_id)`는 `shade_images`에서
`shade_id=p_shade_id AND is_primary=true`인 행을 읽는다. 그 행이 없거나
`representative_source`가 이미 `auto_*`이면 `action='noop'`을 반환한다. 현재 행이
`manual`일 때만 그 행을 비우고 `reselect_shade_representative(p_shade_id)`를 호출한다.

```diff
+  SELECT id, representative_source
+    INTO v_existing
+    FROM shade_images
+   WHERE shade_id = p_shade_id AND is_primary
+   ORDER BY id
+   LIMIT 1
+     FOR UPDATE;
+
+  IF v_existing.id IS NULL THEN
+    RETURN jsonb_build_object('action', 'noop', 'reason', 'no_primary', 'shade_id', p_shade_id);
+  END IF;
+
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
+
+  RETURN jsonb_build_object(
+    'action',                'cleared',
+    'shade_id',              p_shade_id,
+    'previous',              v_prev,
+    'reselected',            v_after.url IS NOT NULL,
+    'url',                   v_after.url,
+    'representative_source', v_after.representative_source,
+    'media_id',              v_after.media_id
+  );
```

> [!note] 모기 박스
> 힌트 키워드: `admin_clear_shade_representative` / manual 확인 / 재선정 / 후보 0
> 해제 흐름에서 이해한 상태 변화나 아직 애매한 반환값을 자유롭게 적어도 돼.
>
> 모기 메모:

manual 행을 해제한 결과가 `action='cleared'`, `reselected=false`라면 재선정 함수를
호출하지 않았다는 뜻이 아니다. `reselect_shade_representative(p_shade_id)`는 호출됐지만
살아 있는 자동 후보가 없어 `shade_id=p_shade_id AND is_primary=true`인 새 행을 만들지
못했다는 뜻이다. 그때 화면은 대표 이미지 대신 색상칩을 보여준다.

자동 후보가 있다면 같은 트랜잭션 안에서 다음 순서가 끝난다.

```text
manual 대표 자리 비움
→ #520의 기존 reselect_shade_representative 호출
→ 기존 자동 사다리가 후보와 등급을 판정
→ 새 auto_* 대표가 생김
→ RPC가 그 최종 행을 읽어 화면에 반환
```

해제 RPC 안에 자동 사다리 규칙을 다시 복사하지 않는다. 후보 등급이나 동급
first-come 규칙의 정본은 기존 재선정 함수 하나에만 둔다.

## 7. repo와 화면 연결 — 브라우저는 표를 직접 쓰지 않는다

두 파일 모두 PR에서 새로 추가됐다. 아래는 최종 HEAD의 실제 함수 본문이다. repo의
쓰기 함수는 선택한 두 값을 RPC 인자로 넘기고 결과만 해석한다.

```ts
export async function setShadeRepresentative(
  shadeId: number,
  mediaId: string,
): Promise<SetRepresentativeResult> {
  const { data, error } = await supabase.rpc('admin_set_shade_representative', {
    p_shade_id: shadeId,
    p_media_id: mediaId,
  })
  if (error) throw translateRpcError(error)
  const row = (data ?? {}) as Record<string, unknown>
  return {
    action: (row.action as SetRepresentativeResult['action']) ?? 'updated',
    url: String(row.url ?? ''),
  }
}

export async function clearShadeRepresentative(shadeId: number): Promise<ClearRepresentativeResult> {
  const { data, error } = await supabase.rpc('admin_clear_shade_representative', {
    p_shade_id: shadeId,
  })
  if (error) throw translateRpcError(error)
  const row = (data ?? {}) as Record<string, unknown>
  return {
    action: (row.action as ClearRepresentativeResult['action']) ?? 'noop',
    reselected: row.reselected === true,
    representativeSource: (row.representative_source as RepresentativeSource | null) ?? null,
  }
}
```

화면 이벤트는 RPC가 끝난 뒤 안내 문구를 고르고 목록을 다시 읽는다.

```ts
async function onPick(candidate: RepresentativeCandidate) {
  if (busy || selectedShadeId == null) return
  setBusy(true)
  setError(null)
  setNotice(null)
  try {
    await setShadeRepresentative(selectedShadeId, candidate.mediaId)
    setNotice(`대표사진을 지정했어요 — 발색 ${candidate.swatchId}번의 ${candidate.idx + 1}번째 사진.`)
    await refresh()
  } catch (e) {
    setError(adminErrorMessage(e))
  } finally {
    setBusy(false)
  }
}

async function onClear() {
  if (busy || selectedShadeId == null) return
  setBusy(true)
  setError(null)
  setNotice(null)
  try {
    const result = await clearShadeRepresentative(selectedShadeId)
    if (result.action === 'noop') {
      setNotice('이미 자동 선정 상태예요 — 해제할 수동 지정이 없어요.')
    } else if (result.reselected) {
      setNotice('수동 지정을 해제했어요. 자동 사다리가 바로 다음 대표를 골랐어요.')
    } else {
      setNotice('수동 지정을 해제했어요. 후보가 없어 대표 자리는 비어 있어요 (화면은 색상칩).')
    }
    await refresh()
  } catch (e) {
    setError(adminErrorMessage(e))
  } finally {
    setBusy(false)
  }
}
```

> [!note] 모기 박스
> 힌트 키워드: 버튼 / RPC / 반환값 / refresh
> 화면 코드와 DB 사이의 역할 구분에서 이해한 점이나 질문을 자유롭게 적어도 돼.
>
> 모기 메모:

DB가 후보 검증·대표 교체·자동 재선정을 끝낸 뒤 결과를 반환하므로, 화면은 중간 행
상태를 조립하지 않는다. `refresh()`는 `fetchRepresentativeCuration()`을 호출하고,
그 함수는 `shade_images`에서 `is_primary=true`인 행의 `shade_id`·`url`·
`representative_source`·`media_id`를 다시 읽어 화면의 `representativeUrl`과
`representativeSource`를 맞춘다.

## 8. 연결된 테스트 raw hunk — 지정과 해제의 최종 행을 본다

픽스처의 지정 성공 검사는 첫 사진이 아닌 `a2`도 manual 후보가 될 수 있고, 최종
대표 행이 선택한 `swatch_media` UUID와 연결됐는지 확인한다. 픽스처도 PR에서 새로
추가된 파일이라 아래 `+` 줄은 실제 PR 추가분이다.

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
+  IF v_row.media_id IS DISTINCT FROM v_m_a2 THEN
+    RAISE EXCEPTION 'FAIL(2): media 관계가 지정한 사본이 아님';
+  END IF;
```

픽스처의 PASS(10) 해제 검사는 `admin_clear_shade_representative(v_a)`를 호출한다.
그 호출이 manual `a2`를 걷은 뒤 기존 자동 사다리가 더 오래된 발색의 첫 사진 `a1`을
`auto_single`로 다시 골랐는지 확인한다.

```diff
+  v_res := admin_clear_shade_representative(v_a);
+  IF v_res->>'action' IS DISTINCT FROM 'cleared' THEN
+    RAISE EXCEPTION 'FAIL(10): 해제 반환이 % — cleared 기대', v_res;
+  END IF;
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

> [!note] 모기 박스
> 힌트 키워드: `admin_clear_shade_representative(v_a)` / `IF` / 실패 조건 / 최종 대표 행
> 테스트가 확인하는 상태나 읽다가 헷갈린 조건을 자유롭게 적어도 돼.
>
> 모기 메모:

테스트의 `IF ... RAISE EXCEPTION` 안은 원하는 결과가 아니라 **나오면 실패할 상태**다.
이 테스트가 증명하는 최종 흐름은 다음과 같다.


| 시점               | 현재 대표 URL  | source        | 연결된 사진        |
| ---------------- | ---------- | ------------- | ------------- |
| 지정 전             | 자동으로 뽑힌 사진 | `auto_*`      | 기존 후보 사진      |
| `a2` manual 지정 후 | `a2.jpg`   | `manual`      | `v_m_a2`      |
| manual 해제 후      | `a1.jpg`   | `auto_single` | 자동 사다리가 고른 사진 |


## 9. 한 줄로 이어 읽기

```text
onPick(candidate)는 선택한 shade ID와 candidate.mediaId를 setShadeRepresentative()에 넘기고,
admin_set_shade_representative()는 기존 primary 행을 비운 뒤 새 manual primary 행을 넣는다.
onClear()가 clearShadeRepresentative()를 호출하면 admin_clear_shade_representative()는
현재 manual primary 행을 비우고 같은 트랜잭션에서 reselect_shade_representative()를 부른다.
```

> [!note] 모기 박스
> 힌트 키워드: 지정 입력 / 대표 자리 / manual 행 / 자동 복귀
> 지금까지 이어진 흐름에서 남기고 싶은 이해, 의문, 짧은 요약을 자유롭게 적어도 돼.
>
> 모기 메모:

## 10. 아직 직접 보지 않은 파일

이번 핵심길에서 raw hunk를 싣지 않았거나 일부만 본 PR 파일은 아래와 같다. 샛길을
보고 싶다면 모기가 여기서 하나를 직접 고른다.

- `app/src/data/repos/adminRepresentativeRepo.test.ts` — RPC 호출 테스트 일부만 봄
- `app/src/features/admin/routes/AdminPage.tsx`
- `supabase/POLICY-SNAPSHOT.md`
- `supabase/migrations/20260819010000_manual_representative_revocation_parity.sql` — 앞선 노트에서 사진 교체·삭제 핵심길을 봄
- `supabase/migrations/20260820000000_demoted_roi_revocation_parity.sql`
- `supabase/tests/admin_manual_representative_fixture.sql` — 지정·해제 성공 hunk만 봄
- `supabase/tests/admin_representative_race_concurrent.sh`

> [!note] 모기 박스
> 힌트 키워드: 샛길 파일 / 더 보고 싶은 코드 / 지금은 건너뛰기
> 다음에 보고 싶은 파일, 지금은 넘기고 싶은 부분, 궁금한 이유를 자유롭게 적어도 돼.
>
> 모기 메모:
