---
reviewed: false
merge_ready: false
---

# 카드 — PR #540 홈탭 발색샷을 그 자리에서 수정·삭제·비공개 전환 (sw-ypn, 예쁜필기노트TDD 2호)

**최종 READY — HEAD `ea0b53b`(커밋 8). 교차 리뷰 3라운드 + cubic 스레드 2건 종결(미해결 0), 소유자 UAT 완료·삭제 실물 재확인 통과. 델타3 리뷰 종결(필수 0). 머지해도 된다 — 모기 직접, dev 대상 squash.** 판정문: `../../swatch-ops/contracts/2026-09-02-sw-ypn-cross-review-verdict.md`

작성: 냐옹이 Gen 18, 2026-09-02. 머지 게이트 등급: **② UAT 필수** (UI). 원문 = PR 본문(첫 절이 필기노트 N1~N5 통과 표). 계약 swatch-ops `contracts/2026-09-02-sw-ypn-home-manage.md`, 목업 https://claude.ai/code/artifact/3c21a875-3e1d-49df-ae77-96077fcd9855

## 결정 목록

- 설계 A(모기 승인): 상세 시트 오너 바에 **수정** 버튼 + 홈 그리드 **비공개 배지·디밍**. 삭제 반영은 이미 되던 동작 → 테스트로 고정.
- 조건부 '저장 후 상세 복귀' **포함**(7줄, 새 store 상태 없음).
- 지름길·과거 발색샷 펼치기·위계는 이 PR 밖(인터뷰 후 / sw-ykw).

## 직접 눌러볼 것 (2분)

```
gh pr checkout 540 -b preview-540
# localhost:5173 → 홈탭 → 내 발색샷
```
1. 사진 탭 → 상세 시트 내 발색 카드 아래 바에 [비공개 토글] [수정] … [삭제] 보이나
2. 수정 → 등록 시트 수정 모드 → 저장 → **같은 상세로 돌아오나** (N2)
3. 비공개 토글 → 홈으로 나가면 셀이 남아 있고 흐려지며 '비공개' 배지 붙나 (N4)
4. 복귀: `git switch dev && git branch -D preview-540`

## 모기 판단 대기 (PR 본문 마지막 절)

- 상세 복귀 때 `swatchViewed` 계측이 한 번 더 나간다 — 집계상 괜찮나?
- (범위 밖) 삭제 직후 홈 섹션 카운트 `내 발색샷 · N`이 재조회 전까지 1 과다 — 별도 이슈로 뺄지.

## 상태

- 1차 워커 opus 5: RED 0baa426 → GREEN 14dc5cd. 교차 리뷰 1차: 머지 전 필수 2(상세 수정이 프로필과 다른 제약을 받음 / 수정 버튼 오터치 가드 없음).
- fix1 워커 opus 5: RED b5eab67 → GREEN 31e46b2 — `returnToDetail` 표식 분리, 수정 버튼 tapGuard, 순서 단언. 마스터 재실측 vitest 932/932 · tsc 0. PR head = 31e46b2(커밋 4).
- UAT(09-02): A 흐름 통과. 발견 2건 → fix2(b446f68): 상세 시트 안 삭제 확인창 클릭 복구(sw-ol8, 기존 결함) + 삭제 후 헤더 개수 동기화(sw-dgy). 델타2 리뷰 필수 0.
- 마지막 실물 확인 1개: 사진 탭 → 🗑 → 확인창에서 **취소/삭제가 탭으로 눌리나**. 되면 머지(모기 직접, dev 대상). 머지 뒤 마스터 체크아웃 정리는 냐옹이가 한다.
- A/B 가벼운 회차 종결: 심판 A 31 : B 33(B 근소), 실사용자 UAT는 A('관리' 토글 부자연). 비교표 swatch-ops `contracts/2026-09-02-sw-ypn-ab-comparison.md`.
