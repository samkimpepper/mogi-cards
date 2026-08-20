---
reviewed: false
---

# PR #524 코드 독해 — 사진 관계 확정과 URL 폴백 추정은 왜 다르게 처리되는가

날짜: 2026-08-21

대상 PR: [#524](https://github.com/baksohyeon/swatch-v2/pull/524)

최종 PR 판독 범위: `8e62d328248dd46476d5ae581f59c9164082869f..da672a05a9eb36cc158d0f120b2f9f673ba39ec0`

이번 질문의 fix 범위: `ac26c7b1a719a6ee28ca93460d20a865f7e5e5dd..25de3b13b4d6765a6bf5dc8bd5564b3493a8032e`

후속 커밋 `4c1d053f`, `da672a05`가 더 있지만, 이번에 읽는
`20260819010000_manual_representative_revocation_parity.sql`의 동작은 최종 HEAD까지
다시 바뀌지 않았다.

이 문서는 정식 Review Gate Quiz 답안지가 아니다. PR 첫 완독 뒤
`SCRATCHPAD.md`에 남긴 아래 질문을 실제 fix와 테스트에 연결하는 코드 학습 노트다.

> 사진 교체 / 사본 행 단독 삭제에서 왜 수리 전에는 manual 보존이고,
> 수리 후에는 변경 없음인가?

## 1. 먼저 결론 아닌 지도

PR 표의 `사진 교체 / 사본 행 단독 삭제`는 한 사건처럼 보이지만, 코드에서는
대표사진과 삭제되는 사진의 관계를 알아내는 방법이 둘이다.

| 갈래 | 확인하는 값 | 그 값이 말해주는 것 |
|---|---|---|
| 관계 갈래 `(a)` | `shade_images.media_id = OLD.id` | 이 대표가 삭제되는 바로 그 `swatch_media` 사진 행을 가리킨다는 확정 관계 |
| URL 폴백 갈래 `(b)` | `media_id IS NULL`이고 `shade_images.url = OLD.source_url` | UUID 관계는 없고 사진 URL 문자열만 같다는 추정 |

따라서 PR 표의 두 줄은 이렇게 읽어야 한다.

```text
사진 교체 / 사본 삭제 — 관계 갈래
수리 전: manual을 잘못 보존함
수리 후: manual도 회수하고 재선정함

사진 교체 / 사본 삭제 — URL 폴백 추정 갈래
수리 전: manual 보존
수리 후: 변경 없음
```

`manual 보존 → 변경 없음`은 “문제를 발견했는데 아무것도 안 고쳤다”는 뜻이 아니다.
이번에 고친 대상은 **관계가 확정된 첫 번째 갈래**이고, URL만 같은 두 번째 갈래의
manual 보존은 일부러 유지했다는 뜻이다.

## 2. 판독 범위와 전체 변경 지도

PR #524 최종 변경 파일은 10개, 총 `+2785/-1`이다.

| 상태 | 파일 | 규모 |
|---|---|---:|
| 추가 | `app/src/data/repos/adminRepresentativeRepo.test.ts` | `+270/-0` |
| 추가 | `app/src/data/repos/adminRepresentativeRepo.ts` | `+440/-0` |
| 수정 | `app/src/features/admin/routes/AdminPage.tsx` | `+4/-0` |
| 추가 | `app/src/features/admin/routes/AdminRepresentativeCuration.tsx` | `+357/-0` |
| 수정 | `supabase/POLICY-SNAPSHOT.md` | `+4/-1` |
| 추가 | `supabase/migrations/20260819000000_admin_manual_shade_representative.sql` | `+440/-0` |
| 추가 | `supabase/migrations/20260819010000_manual_representative_revocation_parity.sql` | `+179/-0` |
| 추가 | `supabase/migrations/20260820000000_demoted_roi_revocation_parity.sql` | `+119/-0` |
| 추가 | `supabase/tests/admin_manual_representative_fixture.sql` | `+789/-0` |
| 추가 | `supabase/tests/admin_representative_race_concurrent.sh` | `+183/-0` |

이번 질문을 처음 수리한 fix 범위는 6개 파일, `+442/-34`다.

| 상태 | 파일 | 규모 |
|---|---|---:|
| 수정 | `app/src/data/repos/adminRepresentativeRepo.test.ts` | `+41/-0` |
| 수정 | `app/src/data/repos/adminRepresentativeRepo.ts` | `+60/-3` |
| 수정 | `app/src/features/admin/routes/AdminRepresentativeCuration.tsx` | `+12/-2` |
| 수정 | `supabase/migrations/20260819000000_admin_manual_shade_representative.sql` | `+47/-13` |
| 추가 | `supabase/migrations/20260819010000_manual_representative_revocation_parity.sql` | `+179/-0` |
| 수정 | `supabase/tests/admin_manual_representative_fixture.sql` | `+103/-16` |

이번 핵심길에서는 새 회수 마이그레이션과 검증 픽스처만 직접 본다.

## 3. 핵심 raw diff — manual 예외의 위치가 갈라진다

아래는 fix 직전 함수 본문과 fix가 넣은 대체 함수 본문을 실제 blob끼리 비교한 diff다.

```diff
diff --git a/supabase/migrations/20260817070000_deadline_refund_and_url_serialization.sql b/supabase/migrations/20260819010000_manual_representative_revocation_parity.sql
index 8cbe222..2646214 100644
--- a/supabase/migrations/20260817070000_deadline_refund_and_url_serialization.sql
+++ b/supabase/migrations/20260819010000_manual_representative_revocation_parity.sql
@@
   UPDATE shade_images SET media_id = NULL
    WHERE media_id = OLD.id
-     AND (NOT is_primary OR representative_source = 'manual');
+     AND NOT is_primary;
@@
   FOR r IN
     DELETE FROM shade_images si
      WHERE si.is_primary
-       AND si.representative_source <> 'manual'   -- D-099 (위 주석)
        AND (
          -- (a) 관계 기반 — 이 대표가 바로 이 사본을 가리킨다. 사본이 사라지면
          --     죽은 참조가 확정이라 스코프 조건도 잠금도 필요 없다.
          si.media_id = OLD.id
          -- (b) URL 폴백 안전망 — 관계가 끊긴(NULL) 대표를 URL 로 잇는 **추정**이다.
          OR (
            si.media_id IS NULL
+           -- manual 은 폴백 추정 갈래에 넣지 않는다 (D-099 · 계약 개정 1 이 명시적으로
+           -- 확장을 금지). 관계로 확정된 (a) 와 달리 여기는 URL 문자열 추정이라,
+           -- 틀리면 어드민이 손으로 세운 자리가 근거 없이 사라진다.
+           AND si.representative_source <> 'manual'
            AND si.url = OLD.source_url
            AND v_url_fallback_due
```

### 모기가 먼저 볼 지점

`representative_source <> 'manual'`이 사라진 게 아니라 **위치가 바뀌었다**.

- 변경 전: `DELETE` 전체 바깥에 있어서 관계 갈래 `(a)`와 폴백 갈래 `(b)` 모두에서 manual을 제외한다.
- 변경 후: 폴백 갈래 `(b)` 안에만 있어서 관계 갈래 `(a)`에는 manual도 들어간다.

그리고 앞의 `UPDATE`에서도 manual이 빠졌다. 삭제되는 사진과 `media_id`로 연결된
manual 대표의 관계를 먼저 `NULL`로 끊어버리면, 바로 뒤의
`si.media_id = OLD.id`가 그 대표를 찾을 수 없기 때문이다. 이 함수에서는 실행 순서가
곧 의미다.

## 4. 여기서 `OLD`와 `source_url`의 주인은 누구인가

이 함수는 `swatch_media` 사진 사본 행이 삭제되기 직전에 도는 트리거 함수다.

```text
OLD.id
= 지금 삭제되는 swatch_media 행의 UUID

OLD.source_url
= 그 사진 한 장의 원본 X CDN 주소
```

여기서 `OLD.source_url`은 `swatches.source_url`과 이름만 같다.

| 테이블·컬럼 | 주인 | 뜻 |
|---|---|---|
| `swatches.source_url` | 발색 등록 행 | 발색이 온 원본 게시물 주소. 같은 게시물 중복 등록 판정에도 사용 |
| `swatch_media.source_url` | 사진 한 장의 사본 대장 행 | 그 사진을 다시 복사할 때 쓰는 원본 X CDN 주소 |

이번 함수의 `OLD`는 `swatch_media` 행이므로 두 번째 뜻이다.

## 5. 관계 갈래 `(a)` — 삭제 사실이 확정된 경우

예시 상태는 이렇다.

```text
swatch_media
  id = media-p1
  swatch_id = 발색-10
  source_url = p1.jpg

shade_images
  shade_id = 호수-A
  is_primary = true
  representative_source = manual
  media_id = media-p1
  url = p1.jpg
```

사진 주인이 발색-10에서 `p1.jpg`를 빼면 `swatch_media.id=media-p1` 행이 삭제된다.
이때 `shade_images.media_id = OLD.id`가 참이므로, 호수-A의 manual 대표가 바로
삭제되는 사진을 가리킨다는 것이 UUID 관계로 확정된다.

변경 전에는 다음 순서였다.

```text
1. manual 대표의 media_id를 NULL로 바꿈
2. DELETE는 manual 전체를 제외함
3. 결과: manual / p1.jpg는 남지만, 근거 사진 행과의 관계만 사라짐
```

변경 후에는 다음 순서다.

```text
1. 대표가 아닌 갤러리 행만 media_id를 NULL로 바꿈
2. media_id = OLD.id인 대표 행은 manual이어도 삭제함
3. 삭제된 shade_id를 받아 같은 문장 안에서 자동 재선정함
```

여기서는 사진 주인이 실제 사진을 제거했다는 사실이 어드민의 과거 manual 지정보다
앞선다. “살아 있는 manual을 자동 후보가 덮지 않는다”와 “manual이 가리키는 사진
자체가 사라졌다”는 서로 다른 사건이다.

## 6. URL 폴백 갈래 `(b)` — 문자열만 같아서 추정하는 경우

폴백 갈래의 시작 상태는 다르다.

```text
shade_images.media_id = NULL
shade_images.url = OLD.source_url
```

이미 UUID 관계가 없으므로 DB가 확실히 아는 것은 두 URL 문자열이 같다는 것뿐이다.
같은 사진 URL이 비교 단체샷처럼 여러 발색에서 정상적으로 쓰일 수 있어서,
지금 삭제되는 `OLD` 행이 이 manual 대표의 진짜 근거였다고 단정할 수 없다.

이 추정이 틀렸는데 manual까지 회수하면 다음 일이 생긴다.

```text
실제로는 다른 발색의 살아 있는 사진을 어드민이 manual로 지정함
→ 우연히 URL이 같은 OLD 사본 하나가 삭제됨
→ 문자열만 보고 manual 지정까지 없애버림
```

그래서 URL 폴백 갈래 안에는 최종 HEAD에서도
`si.representative_source <> 'manual'`이 남는다. 확정 관계에서는 죽은 manual을
회수하지만, 문자열 추정만으로 어드민의 sticky 지정을 걷지는 않는 경계다.

즉 이 갈래의 `수리 후 변경 없음`은 의도된 범위 제한이다. 실제로 죽은 manual URL을
남길 가능성보다, 불확실한 추정으로 살아 있는 manual 지정을 지우는 손해를 더 크게
본 선택이다.

## 7. 연결된 테스트 raw diff — 성공 조건이 뒤집힌다

fix는 테스트 (15)의 실패 조건도 반대로 바꿨다.

```diff
diff --git a/supabase/tests/admin_manual_representative_fixture.sql b/supabase/tests/admin_manual_representative_fixture.sql
index 70cea94..f9c5e7f 100644
--- a/supabase/tests/admin_manual_representative_fixture.sql
+++ b/supabase/tests/admin_manual_representative_fixture.sql
@@
-  -- ── (15) 어드민이 세운 manual 을 사진 교체 회수가 못 걷는다 (D-099) ─────
+  -- ── (15) 사진 교체 회수가 어드민 manual 핀을 걷고 재선정한다 (개정 1) ──
@@
-    IF v_row.representative_source IS DISTINCT FROM 'manual' THEN
-      RAISE EXCEPTION 'FAIL(15): 사진 교체 회수가 어드민 manual 핀을 걷었다 (현재 % / %) — 자동이 명시 지정을 덮었다 (D-099)',
-        v_row.url, v_row.representative_source;
+    IF v_row.representative_source = 'manual' THEN
+      RAISE EXCEPTION 'FAIL(15): 사본이 사라졌는데 manual 대표가 남았다 (url %) — D-127 §2 와 반대, 숨김 경로와 비대칭', v_row.url;
     END IF;
-    IF v_row.url IS DISTINCT FROM 'https://djc-verify.invalid/p1.jpg' THEN
-      RAISE EXCEPTION 'FAIL(15): manual 대표 URL 이 % 로 바뀌었다 — p1 유지 기대', v_row.url;
+    IF v_row.url = 'https://djc-verify.invalid/p1.jpg' THEN
+      RAISE EXCEPTION 'FAIL(15): 대표가 사라진 사본의 URL 을 여전히 가리킨다 — 죽은 대표 잔류';
     END IF;
-    IF v_row.media_id IS NOT NULL THEN
-      RAISE EXCEPTION 'FAIL(15): 사라진 사본을 manual 대표가 여전히 참조한다 — 연결은 끊겨야 한다';
+    IF v_row.url IS NULL THEN
+      RAISE EXCEPTION 'FAIL(15): 회수는 됐는데 재선정이 안 돌았다 — 후보가 있는데 자리가 비었다';
     END IF;
+    IF v_row.representative_source NOT IN ('auto_single', 'auto_comparison_fallback') THEN
+      RAISE EXCEPTION 'FAIL(15): 재선정 등급이 % — 자동 등급 기대', v_row.representative_source;
+    END IF;
```

테스트에서 `IF ... RAISE EXCEPTION`은 원하는 결과가 아니라 **나오면 실패할 상태**다.
최종 성공 조건은 다음 네 가지다.

```text
대표 source가 manual이 아님
대표 URL이 삭제된 p1.jpg가 아님
대표 URL이 NULL도 아님
대표 source가 auto_single 또는 auto_comparison_fallback임
```

이 테스트는 `media_id`로 연결된 관계 갈래를 증명한다. URL 폴백 추정 갈래의 manual
보존까지 바뀌었다고 증명하지는 않는다. 그 갈래는 함수 안에 남은
`representative_source <> 'manual'` 조건으로 별도로 경계가 유지된다.

## 8. 한 줄로 다시 읽는 PR 표

```text
사진 교체라는 이벤트는 같아도,
삭제 사진과 대표가 UUID로 연결돼 있으면 확정 사실이라 manual을 회수하고,
URL 문자열만 같으면 추정이라 manual을 보존한다.
```

## 9. 아직 직접 보지 않은 파일

이번 핵심길에서 raw hunk를 싣지 않은 PR 파일은 아래와 같다. 샛길을 보고 싶다면
모기가 여기서 하나를 고른다.

- `app/src/data/repos/adminRepresentativeRepo.test.ts`
- `app/src/data/repos/adminRepresentativeRepo.ts`
- `app/src/features/admin/routes/AdminPage.tsx`
- `app/src/features/admin/routes/AdminRepresentativeCuration.tsx`
- `supabase/POLICY-SNAPSHOT.md`
- `supabase/migrations/20260819000000_admin_manual_shade_representative.sql`
- `supabase/migrations/20260820000000_demoted_roi_revocation_parity.sql`
- `supabase/tests/admin_representative_race_concurrent.sh`

## 가벼운 확인

`shade_images.media_id`는 `NULL`이고 URL 문자열만 같은 manual 대표라면, DB가 아직
확정하지 못한 사실은 무엇일까?
