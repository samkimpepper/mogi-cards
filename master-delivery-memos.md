# 마스터 전달용 메모 (단일 수신함)

과외 세션 발견물을 한곳에 누적하는 마스터 전달용 단일 수신함이다. 메모는 리드 카드나 다른 파일로 옮기지 않고 이 파일에만 append한 뒤 커밋한다.

운영 규칙 (모기 확정 2026-08-14): 마스터가 메모를 확인·처리할 때마다 이 파일을 비운다. 처리 내역은 비움 표식 한 단락으로 남기고, 원문은 git 이력이 보존한다.

(비어 있음 — 2026-08-25 마스터 16차 비움(냐옹이 Gen 14). 처리분 2건.
① **sw-ber ROI 폐기 방향(모기 결정 08-21)** — 판독 도장 PR #524 HEAD da672a05 기준 결정문. 트래커 sw-ber 노트로 등재(원칙: 사진 정체성과 대표 포인터 분리, 대표 교체=포인터 변경). 코드 변경 없음, 착수는 계약 단계에서 소유자 확인.
② **인터뷰 보충 리허설 2회차 완료** — swatch-ops docs/interview/2026-08-25-rehearsal-2.md로 전사(실수 4개 → 실전 체크리스트), sw-hwr 닫음, sw-5ca ③ 완료 표시. 제품 SHA·운영 이슈 라우팅 해당 없음(과외 자기 판정과 일치).
원문 = git 이력.)

## `sw-ber` delta — ROI 폐기 뒤에도 비대표 `shade_images`·`extraImgs` 모델이 독립적으로 남음

- **기존 이슈:** `sw-ber` (open, PR #535로 ROI 폐기 수리 중). 같은 구조 원인의 새 이슈로 복제하지 않고, ROI 폐기 뒤 남는 독립 영향만 연결한다.
- **근거:** PR #535 HEAD `8f7aab8`의 `supabase/migrations/20260826100000_retire_swatch_regions_roi.sql:27-45,63-85`(옛 대표는 항상 삭제하지만 `extraImgs` 소비처는 무변경), `app/src/data/supabase/supabaseAdapter.ts:212-218`(`is_primary=true`가 없으면 첫 행을 대표 fallback으로 쓰고 나머지는 `extraImgs`로 노출), `app/src/data/database.types.ts:1458-1494`(여전히 발색당 여러 행과 `is_primary=false`를 허용), `supabase/migrations/20260824120000_swatch_items_drop_shade_slug.sql:183-188,305-312,465-467`(현행 대표 생성 경로는 `is_primary=true`만 INSERT). 2026-08-26 원격 QA 읽기 전용 실측은 `shade_images` 97행 전부 `is_primary=true`, 비대표 0행, 여러 행을 가진 shade 0개였다.
- **왜 문제인지:** PR #535 뒤 현재 동작과 데이터는 `shade_images`를 사실상 발색별 현재 대표 한 행으로 쓰지만, 스키마와 앱은 출처·생성 책임이 없는 비대표 갤러리 행을 계속 유효한 상태로 해석한다. 이 때문에 사진 이력의 주인인 `swatch_media`와 현재 대표 상태의 경계가 흐리고, 향후 직접 쓰기나 마이그가 `is_primary=false` 행을 만들면 대표가 없을 때는 그 행이 대표처럼 보이고 대표가 있을 때는 추가 사진으로 노출된다.
- **모기 제안과 다음 판단:** `swatch_media`를 사진 이력으로 두고 `shade_images`는 현재고처럼 현재 대표만 보유하는 모델을 검토한다. 채택한다면 발색당 최대 한 행을 구조로 강제하고 `is_primary`·`extraImgs` 비대표 갈래를 제거할지, 또는 추가 공식 사진이라는 별도 제품 요구가 실제로 있는지를 계약 단계에서 먼저 확인한다. `shades`에 포인터를 직접 둘지 별도 현재 대표 표를 둘지는 이 메모에서 잠그지 않는다.
- **모기 후속 확인(2026-08-26):** `shade_images`를 “현재 대표 하나의 상태”로 본다는 방향에 동의했다. 홈의 내 사진은 사용자마다 달라지는 표시 결과라 전역 대표 행을 하나 더 만드는 대상이 아니며, 현행처럼 `swatches.owner_uid`·`swatch_items.shade_id`·사진 원장에서 사용자의 해당 발색 사진을 골라 쓰고 탐색만 전역 대표를 읽는 경계를 다음 계약에서 보존할지 확인한다. 사용자가 홈 사진을 직접 고르는 요구가 생길 때만 `(user_id, shade_id) → media_id` 개인 포인터를 별도 판단한다.
- **판독 시점 커밋 SHA:** PR #535 HEAD `8f7aab80df93dd8a0b2daa7735a000bc52006367`.
