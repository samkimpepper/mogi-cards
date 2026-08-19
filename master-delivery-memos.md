# 마스터 전달용 메모 (단일 수신함)

과외 세션 발견물을 한곳에 누적하는 마스터 전달용 단일 수신함이다. 메모는 리드 카드나 다른 파일로 옮기지 않고 이 파일에만 append한 뒤 커밋한다.

운영 규칙 (모기 확정 2026-08-14): 마스터가 메모를 확인·처리할 때마다 이 파일을 비운다. 처리 내역은 비움 표식 한 단락으로 남기고, 원문은 git 이력이 보존한다.

(비어 있음 — 2026-08-19 마스터 12차 비움. 처리분 2건, 판독 도장 `8e62d32` = swatch-v2 dev HEAD 당시 최신 → 판독 유효(단, 워커 브랜치 `sw-djc-rep-curation`에 신규 커밋 `ac26c7b`이 판독 이후 존재 — 두 발견물 모두 기존 dev 코드·계약 문안에 대한 것이라 판독 유효성에 영향 없음, 마스터 실측 재확인 완료).
① **manual 대표 회수 정책 분열** — 마스터가 `20260817070000` 실물로 재확인: manual 대표는 연결만 끊고 남긴다(주석 명시)가 결정문 §2와 반대, 숨김 경로(20260814060000)와도 비대칭. 모기 판정(정상 수정 경로에서 사진 주인의 제거 > manual 핀 → 회수 + 같은 작업 단위 재선정)을 **계약 개정 1 항목 2**로 반영, URL 폴백 추정 갈래 확장 금지 조건 부가. 음성 대조 ④ 추가.
② **manual 후보 풀 좁힘** — 모기 fail-closed 판정(distinct shade 매핑 == 1 && 그 shade == 대상, 공개 사진만)을 **계약 개정 1 항목 1**로 반영(기존 "등록 전체 사진" 대체). 음성 대조 ⑤ 추가. plan card에도 동일 개정 절 반영.
라우팅: 계약 `../swatch-ops/contracts/2026-08-19-sw-djc-representative-manual-curation.md` 개정 1 · plan card 개정 절 · 트래커 sw-djc 코멘트. 워커(PR #524, CI 대기 중)에는 worker_done 처리 시 개정 1을 후속 태스크로 전달 예정. 원문 = git 이력.)

## 신규 어드민 RPC ACL에 authenticated 명시 GRANT가 빠짐

- 근거: 현 계약 `../swatch-ops/contracts/2026-08-19-sw-djc-representative-manual-curation.md:25`은 신규 함수의 `SECURITY DEFINER`·고정 `search_path`·`REVOKE ... FROM PUBLIC, anon`·내부 `is_admin()`만 요구하고, 어드민 브라우저가 쓰는 `authenticated` 롤에 대한 명시적 `GRANT EXECUTE`는 적지 않았다. 제품의 기존 정본 관례는 `../swatch-v2/supabase/migrations/20260810100000_swatch_owner_uid_attribution.sql:628-634`처럼 `PUBLIC·anon` 회수와 `authenticated` 명시 허용을 한 묶음으로 두고, 어드민도 브라우저에서는 authenticated이므로 함수 본문 `is_admin()`으로 다시 가른다고 설명한다.
- 왜 문제인지: 기본 PUBLIC 실행권을 회수한 뒤 authenticated에 실행권을 명시적으로 주지 않으면 정상 어드민 클라이언트도 RPC 입구에 도달하지 못할 수 있다. 반대로 default ACL에 기대면 환경별 권한 상태가 계약 밖에 남으므로, 두 신규 RPC 모두 `REVOKE ... FROM PUBLIC, anon` + `GRANT EXECUTE ... TO authenticated` + 내부 `is_admin()` 음성 대조를 명시해야 한다.
- 판독 시점 커밋 SHA: swatch-v2 `8e62d32`, swatch-ops `1e0fd1f`
