---
reviewed: false
---

# PR #524 해설 — manual 대표는 언제 보호되고 언제 회수되는가

날짜: 2026-08-20

대상 PR: #524

판독한 HEAD: `25de3b13`

이 문서는 정식 Review Gate Quiz 답안지가 아니다. PR #524 과외에서 모기가 질문하며 구분한 정책과 실제 테스트 판독법을 짧게 보존한 학습 노트다.

## 1. 결론 — manual은 사진이 살아 있는 동안에만 최상위다

두 사건을 분리해야 한다.

```text
살아 있는 manual 대표 + 새 자동 후보 등장
→ manual 유지

manual 대표가 가리키는 원본 사진 자체가 발색에서 제거됨
→ manual 회수
→ 같은 작업 단위에서 자동 재선정
```

사진 주인이 `swatches.image_urls`에서 사진을 뺐다는 사실이 어드민의 과거 manual 핀보다 우선한다. 발색 행은 남아 있고 사진 하나만 빠지는 정상 수정 경로도 이 규칙을 따른다.

## 2. 변경 전에는 왜 죽은 URL이 남았나

변경 전 `revoke_shade_images_on_media_delete()`는 삭제된 `swatch_media`를 가리키던 manual 대표에서 `media_id` 관계만 끊었다.

```text
representative_source = manual
url                   = 삭제된 p1.jpg
media_id              = NULL
```

당시 구현은 “자동 규칙이 manual을 덮지 않는다”를 사진 자체가 사라진 경우까지 넓혀 적용했다. 그러나 정책 정본은 살아 있는 manual을 자동 후보가 덮는 것만 막고, 그 사진 자체가 회수되면 재선정을 돌리도록 구분한다.

## 3. 테스트의 IF는 실패 조건이다

SQL 픽스처의 다음 코드는 원하는 상태가 아니라 나오면 테스트를 터뜨릴 상태를 적는다.

```sql
IF v_row.representative_source = 'manual' THEN
  RAISE EXCEPTION 'FAIL';
END IF;
```

따라서 성공 조건은 반대인 `representative_source <> 'manual'`이다.

PR #524 fix 뒤 테스트 (15)의 성공 조건은 다음과 같다.

```text
source가 manual이 아님
URL이 삭제된 p1이 아님
URL이 NULL도 아님
source가 auto_single 또는 auto_comparison_fallback임
```

즉 회수만 하고 대표를 비워두는 것도 실패이며, 살아 있는 후보를 자동 정책으로 다시 골라야 성공이다.

## 4. 다중-shade 발색은 manual 후보에서 제외한다

`swatch_media`는 사진별 shade 관계 없이 부모 `swatch_id`만 가진다. 한 발색이 A와 B shade를 함께 매핑하고 사진도 여러 장이면 DB는 어느 사진이 A 것인지 구분하지 못한다.

그래서 manual 후보는 다음을 모두 만족해야 한다.

```text
부모 발색의 distinct shade 매핑 수 = 1
그 하나의 shade = 지정하려는 대상 shade
```

다중-shade 발색 안의 좋은 단독사진을 놓칠 수 있지만, B 사진을 A의 자동으로 덮이지 않는 manual 대표로 박는 오매핑 손해를 더 크게 본 결정이다. 자동 비교사진 fallback은 기존대로 남는다.

## 5. v_mapped와 v_unresolved

- `v_mapped`: 해당 발색에서 정상적으로 해석된 서로 다른 shade ID 수.
- `v_unresolved`: `shade_id`와 레거시 slug 어느 쪽으로도 shade ID를 찾지 못한 매핑 행 수.

`COUNT(DISTINCT ...)`는 `NULL`을 세지 않으므로, 정상 A 한 개와 깨진 slug 한 개가 함께 있으면 `v_mapped=1`, `v_unresolved=1`이다. `v_mapped=1`만 검사하면 실제로 단일 shade인지 확정할 수 없어 `v_unresolved > 0`도 함께 거부한다.

별도 정리 후보는 `swatch_items.shade_slug`의 중복 참조를 폐기하고 `shade_id NOT NULL`로 수렴하는 것이다. 이 정리가 끝나도 단일-shade 후보 규칙 자체는 남지만 slug 폴백과 `v_unresolved` 갈래는 사라질 수 있다.

## 6. 교차 리뷰의 ROI 오염은 현재 미사용 스키마의 미래 정합 문제다

현재 구현은 대표사진을 바꿀 때 기존 `shade_images` 행의 `url`과 `media_id`를 제자리 갱신한다. 그런데 `swatch_regions.image_id`가 그 행을 가리키면 옛 사진 위의 `x/y/w/h` 좌표가 새 사진에 붙는다.

```text
변경 전: shade_images id=10 = A 사진
         swatch_regions.image_id=10 = A 위의 좌표

제자리 갱신 뒤: shade_images id=10 = B 사진
                같은 좌표가 B에 잘못 연결
```

수리 방향은 A 행을 삭제하거나 내용을 초기화하는 대신 대표 자리에서만 내리고(`is_primary=false`), B 사진을 새 대표 행으로 넣는 것이다. 그러면 A 좌표는 A 행과 함께 보존된다.

2026-08-20 판독 시 앱 코드의 `swatch_regions` 소비처는 없고 원격 QA 행 수도 0이었다. 따라서 현재 화면에서 재현되는 사용자 버그라기보다, 미래 데이터가 생겼을 때 의미가 틀어지는 것을 막는 정합 수정이다. 테이블 자체를 계속 둘지는 별도 스키마 정리 판단이다.
