---
reviewed: false
merge_ready: false
---

# PR 카드 — #513 원작자 직접권 + 비공개 + 삭제 잠금 해제 + admin_users (A레인)

작성: 냐옹이 Gen 7, 2026-08-14. **fix1 검증 완주 전 선배달** — 수리 8건 구현은 끝났고 최종 게이트 카운트·스냅샷 코멘트 갱신본만 READY 재보고 후 이 카드에 갱신한다. 그 전까지 merge_ready: false가 사실이다.

## 원문 포인터

1. PR: https://github.com/baksohyeon/swatch-v2/pull/513 — **정책 스냅샷 사람말 코멘트(제도 첫 실전)부터 읽기 추천**
2. [설계 결정문 + 부록 A](../../swatch-ops/docs/decisions/2026-08-13-owner-direct-rights-admin-roles.md) — 설계 정본
3. 계약 2장: [A레인](../../swatch-ops/contracts/2026-08-14-owner-direct-rights-db.md) · [fix1](../../swatch-ops/contracts/2026-08-14-pr513-fix1.md)
4. [교차 리뷰 판정](../../swatch-ops/contracts/2026-08-14-pr513-codex-review.md) — 높음 2건이 왜 "결정문이 안 덮은 파생물 영역"인지
5. 설계 이해는 [계약·디스패치 카드](../plan-cards/2026-08-14-owner-direct-rights-db-contract.md)가 전편 (결정 로그 2건 포함)

## 이 PR이 하는 것 (골격)

- **§1** 수정·삭제권 판정 created_by → owner_uid (swatches + swatch_items), 인용 자격 = 검증 확정 원작자 + 자기등록 예외
- **§2** hidden_at 비공개 토글 + 공개 읽기 필터 (본인·어드민 예외)
- **§3** 인용 잠금(RESTRICT) 제거 — 원작자 삭제 무조건 통과, 원자 정리, removal 요청 동선 통째 폐기
- **§4** admin_users 역할 테이블 — is_admin() 이메일 하드코딩 폐지
- **fix1 (교차 리뷰 8건)**: 핵심 2건 = 사진의 **모든 사본 경로**까지 노출 종료 관철 — ①대표사진 승격 복사본(shade_images) 회수 + 승격 RPC에 공개 조건 ②어드민 업로드 버킷 원본 정리(공개 URL 404 프로브 검증, 바이트는 고아로 남는 경계 명시). 나머지: 숨김 자식 노출 차단, invariant 양방향 가드, QA 2행 보존 검증, 문서·사문·whitespace 정리.

## AskUserQuestion Decision Log

1. **질문**: 교차 리뷰 높음 2건(사진 사본 잔존) — fix1 수리 범위는? / **선택지**: ①전부 머지 전 ②높음+계약준수만 머지 전, 나머지 부채 ③머지 후 전부 후속 / **모기 선택**: 전부 머지 전 / **당시 맥락**: "삭제/숨김 = 사진 노출 종료" 결정의 관철 범위를 정하는 질문.

(§1 인용 자격 예외·레인 분할 결정 로그는 전편 계약 카드에 있음 — 중복 기재 안 함)

## 이해 체크 골격 (전편 5문항에 더해)

- 대표사진으로 승격된 사진은 왜 hidden_at만으로는 안 숨겨졌었나 (복사본에는 원본 연결이 없다)
- 버킷 정리가 보장하는 것과 안 하는 것 (공개 서빙 차단 vs 물리 바이트)
- BEFORE DELETE 트리거의 NULL 반환 사고 — "정리는 됐는데 발색은 안 지워진" 상태가 왜 생기고 AFTER DELETE는 왜 안전한가
- 이번 PR 머지 후 원격 적용 절차에서 확인해야 할 것 (PR 본문의 원격 재검증 절)

## READY 후 갱신란

- 게이트 카운트: (READY 재보고 대기)
- 스냅샷 코멘트 갱신본: (대기)
- 수리 8건 커밋 해시: (대기)
