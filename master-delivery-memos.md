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

## swatch_items.shade_slug 이중 참조 폐기 후보를 활성 부채로 승격 검토

- 근거: 초기 마이그 `../swatch-v2/supabase/migrations/20260421120001_swatch_items_slug.sql:1-16`는 클라이언트 slug→bigint 조회 비용을 피하려 `shade_slug`를 추가하고 `shade_id` NOT NULL을 풀었다. 현재 `create_swatch`/`update_swatch`는 RPC 안에서 slug로 `shades.id`를 조회한 뒤 ID와 slug를 둘 다 저장하며(`app/src/data/repos/swatchesRepo.ts:100-143`, `supabase/migrations/20260814050000_write_rpc_returning_hidden_at.sql:214-236`), 2026-08-19 원격 QA 읽기 전용 실측은 `swatch_items` 201행 중 `shade_id IS NULL` 3행·전건 slug로 복구 가능·ID/slug 불일치 0·해석 불가 0이다. `archive/2026-07-03-table-rls.md:128`에도 근본 해결은 slug-only 행 ID 백필 후 slug 참조 폐기라고 todo 후보로 남아 있다.
- 왜 문제인지: 같은 shade를 ID와 slug 두 컬럼이 동시에 표현하면 모든 판정·조인이 두 경로를 해석해야 하고, #524처럼 정상 ID·slug 중복과 죽은 slug를 별도로 방어해야 한다. #524 수리 범위를 키우지 말고, 별도 정리로 QA 3행 ID 백필 → `shade_id NOT NULL` 복구 → 현행 함수·조회의 slug fallback 제거 → `shade_slug` 컬럼·인덱스 폐기 → 타입 재생성 경로를 활성 트래커로 승격할지 판단이 필요하다.
- 판독 시점 커밋 SHA: swatch-v2 dev `8e62d32` (PR #524 HEAD `25de3b13` 대조)
