---
reviewed: false
---

# 리드 카드 — PR #524: shade 대표사진 수동 큐레이션 (sw-djc)

작성: 냐옹이(Gen 11), 2026-08-19. 워커 READY HEAD `25de3b13`. 교차 리뷰 진행 중(결과: `../../swatch-ops/contracts/2026-08-19-pr524-cross-review.md`).

## 정체 확인 (머지 인계 최소선)

1. **뭔지**: manual 대표사진의 잃어버린 입구를 어드민 전용으로 재건 — RPC 2종(지정/해제) + 어드민 '대표사진' 탭. 덤으로 **기존 결함 수리 1건**: 삭제 경로가 manual 대표를 결정문 §2와 반대로 남겨두던 비대칭(숨김 경로와도 어긋남)을 회수+재선정으로 정합.
2. **왜 지금**: #523이 유일한 수동 입구를 지웠고, 탐색 탭 첫인상이 자동 사다리(미관 무관심)에 전적으로 좌우되는 상태라서. 네가 발견했고 상시 운영 기능으로 확정했다.
3. **안 하면**: 출시 후에도 대표사진을 이쁘게 고를 방법이 없다 — 첫인상은 등록 순서가 정한다. 그리고 manual 회수 비대칭 결함이 코드에 계속 남는다.

## 결정 골격 (원문 포인터)

- 설계 A안 + 개정 1(후보 풀 fail-closed·회수 정합): plan card `../plan-cards/2026-08-19-shade-representative-manual-curation-design.md` · 계약 `../../swatch-ops/contracts/2026-08-19-sw-djc-representative-manual-curation.md`
- 정책 정본: `../../swatch-ops/docs/decisions/2026-08-17-representative-photo-policy.md` (D-127)
- 구현 실물: 마이그 `20260819000000`(RPC 2종) · `20260819010000`(회수 정합 수리) · `adminRepresentativeRepo.ts` · `AdminRepresentativeCuration.tsx` — 원문은 PR #524 diff.
- 검증 주장(워커 보고): 게이트 로컬 12/12 · CI 4/4 · 신규 감시선 17/17 · 음성 대조 5/5(빨간불 확인). 3경로(숨김·삭제·교체) 대칭 표는 PR 본문.
- 후속: sw-hrh(전환기 안내 문구 제거 — C레인 백필 완료 후).

## 머지 게이트

- **UI 게이트 = 네 실물 확인**: PR 본문의 미리보기 명령으로 `localhost:5173/admin` → 대표사진 탭에서 ①후보 골라 지정 → 탐색 대표 변경 ②해제 → 자동 선정 복귀 확인.
- 교차 리뷰 발견물 처리 후 머지(머지는 네 몫).

## 개방형 확인 질문

manual로 지정한 대표사진의 **원본 사진을 주인이 자기 발색에서 빼면** 무슨 일이 일어나야 하고, 그 근거는 뭐였지? (이번 PR의 수리 지점)
