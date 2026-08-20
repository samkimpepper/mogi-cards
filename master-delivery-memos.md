# 마스터 전달용 메모 (단일 수신함)

과외 세션 발견물을 한곳에 누적하는 마스터 전달용 단일 수신함이다. 메모는 리드 카드나 다른 파일로 옮기지 않고 이 파일에만 append한 뒤 커밋한다.

운영 규칙 (모기 확정 2026-08-14): 마스터가 메모를 확인·처리할 때마다 이 파일을 비운다. 처리 내역은 비움 표식 한 단락으로 남기고, 원문은 git 이력이 보존한다.

(비어 있음 — 2026-08-19 마스터 12차 비움. 처리분 2건, 판독 도장 `8e62d32` = swatch-v2 dev HEAD 당시 최신 → 판독 유효(단, 워커 브랜치 `sw-djc-rep-curation`에 신규 커밋 `ac26c7b`이 판독 이후 존재 — 두 발견물 모두 기존 dev 코드·계약 문안에 대한 것이라 판독 유효성에 영향 없음, 마스터 실측 재확인 완료).
① **manual 대표 회수 정책 분열** — 마스터가 `20260817070000` 실물로 재확인: manual 대표는 연결만 끊고 남긴다(주석 명시)가 결정문 §2와 반대, 숨김 경로(20260814060000)와도 비대칭. 모기 판정(정상 수정 경로에서 사진 주인의 제거 > manual 핀 → 회수 + 같은 작업 단위 재선정)을 **계약 개정 1 항목 2**로 반영, URL 폴백 추정 갈래 확장 금지 조건 부가. 음성 대조 ④ 추가.
② **manual 후보 풀 좁힘** — 모기 fail-closed 판정(distinct shade 매핑 == 1 && 그 shade == 대상, 공개 사진만)을 **계약 개정 1 항목 1**로 반영(기존 "등록 전체 사진" 대체). 음성 대조 ⑤ 추가. plan card에도 동일 개정 절 반영.
라우팅: 계약 `../swatch-ops/contracts/2026-08-19-sw-djc-representative-manual-curation.md` 개정 1 · plan card 개정 절 · 트래커 sw-djc 코멘트. 워커(PR #524, CI 대기 중)에는 worker_done 처리 시 개정 1을 후속 태스크로 전달 예정. 원문 = git 이력.)

(13차 비움 — 2026-08-19. 처리분 1건, 판독 도장 swatch-v2 `8e62d32`·swatch-ops `1e0fd1f` 대조: 계약은 당시 최신, 코드는 판독 후 워커 커밋 `25de3b13`이 존재.
① **신규 RPC ACL의 authenticated 명시 GRANT 공백** — 지적은 **계약 문구**에 대해 유효(REVOKE만 요구하고 GRANT 누락). 구현 실물은 이미 정합 — 워커가 저장소 관례(20260810100000:628-634)를 따라 `20260819000000:311-314`에 REVOKE+GRANT 쌍을 넣었다(마스터 실측). 계약 개정 2에 ACL 문구 보강으로 반영, 코드 변경 없음.
라우팅: 계약 개정 2. 원문 = git 이력.)

(14차 비움 — 2026-08-19. 처리분 1건, 판독 도장 swatch-v2 dev `8e62d32`(PR #524 HEAD `25de3b13` 대조) 유효.
① **swatch_items shade ID·slug 이중 참조 폐기 검토** — 소유자 판단(2026-08-19): 지금 해결할 이슈 아님. **트래커 부채로 승격 등재: sw-hrt (P3)** — 과외 원격 실측(201행 중 NULL 3·불일치 0)과 폐기 순서 후보를 이슈 본문에 그대로 옮김. #524 수리 범위에 불포함 명시. 착수 시점은 소유자 별도 결정.
부수 처리: plan card의 미커밋 편집(reviewed: true)이 낡은 사본 기준이라 개정 1 절을 실수로 지운 것을 발견 — reviewed: true 유지 + 개정 1 복원으로 병합(마스터). 원문 = git 이력.)

## 2026-08-20 과외 발견물 — self-thread 사진 중복 정책·URL 이름 경계 (지금 변경 아님)

① **self-thread의 부모 사진이 서로 다른 발색 등록에 겹칠 수 있는 정책 공백**

근거: `app/api/tweet-preview.ts:171-190`은 입력한 답글의 같은 작성자 부모 체인을 따라가며 부모 사진도 `images`에 합치고, `app/src/features/shade-detail/SwatchContributionSheet.tsx:454-465`는 선택된 사진 배열과 현재 입력 status URL을 한 `swatches` 행으로 발행한다. `app/src/data/repos/swatchesRepo.ts:116-149`와 `supabase/migrations/20260428000000_swatch_device_id_source_unique.sql:17-28`의 중복 방지는 X status URL 단위라, 같은 self-thread의 부모 status와 답글 status를 각각 등록하면 서로 다른 `swatches.source_url` 아래 같은 사진 URL이 중복될 수 있다.

왜 문제인지: 타래로 발색샷을 추가하는 계정이 실제 제품 입력 대상이라, 부모·답글을 한 발색으로 묶을지 각각 허용할지, 겹친 사진을 어느 등록의 것으로 볼지 제품 정책이 필요하다. 2026-08-20 원격 QA 읽기 전용 실측에서는 `swatches.image_urls`와 `swatch_media.source_url`의 교차 발색 중복 URL이 각각 0건이었으므로 현재 데이터 수리가 아니라 도달 가능한 미래 경계이며, 모기는 “다음에 정책으로 판단, 지금 변경 아님”으로 명시했다.

판독 시점 커밋 SHA: `8e62d32`

② **`source_url` 이름이 서로 다른 값의 주인을 가리키는 학습·유지보수 혼동**

근거: `app/src/data/repos/swatchesRepo.ts:133-139`의 `swatches.source_url`은 X 게시물 주소이고, `supabase/migrations/20260814110000_swatch_media_model.sql:248-363`의 `swatch_media.source_url`은 `swatches.image_urls` 원소 한 장의 사진 URL이다. 같은 마이그의 동기화 함수는 `swatches.image_urls`를 목록·순서 정본으로 읽어 사진마다 `swatch_media` 행을 만들고, 그 한 장의 원본 URL을 다시 `swatch_media.source_url`에 적는다.

왜 문제인지: 같은 `source_url`이라는 이름이 게시물 출처와 사진 원본이라는 서로 다른 대상을 가리켜 PR 본문과 과외에서 실제 혼동이 발생했다. 모기는 이름이 마음에 들지 않지만 지금 바꾸자는 요청은 아니라고 명시했으므로, 즉시 rename이 아니라 이후 스키마·용어 정리 시 호환 비용과 함께 판단할 부채로만 전달한다.

판독 시점 커밋 SHA: `8e62d32`
