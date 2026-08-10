# 리드 카드 — PR #496 fix 패스 (owner_uid 귀속 고정, 8건 수리)

> 얇은 카드 (card-thin-mode). 살은 과외냥이가 붙인다.
> 원문: PR #496 (head `be17d63`) + swatch-ops `contracts/2026-08-10-pr496-fix-pass-report.md` (워커 완료 보고, UAT 쿼리 전문 포함) + 리뷰 증류본 `contracts/2026-08-10-pr496-codex-review.md`.
> 상태: READY — 4조건 실측 충족. 머지는 모기 몫.

## 핵심 결정 (이미 판정됨)

1. 주인이 바뀌면 삭제 요청은 사라진다 (전 주인 의사표시의 둔갑 방지).
2. `owner_bound_handle` = 고정 시점 핸들 스탬프 → un-verify 원복이 핸들 변경 후에도 정확 (spec 편차 3).
3. B′ 인용 자격 = `owner_uid OR created_by` / "내 발색" 목록 = `owner_uid` 단일 — **두 판정이 다른 게 의도**.

## 모기가 결정할 것 2건 (워커 판단 지점 — 보고서 §판단 지점)

- [ ] 공개 프로필(`contributions_by_handle`)에 `created_by` 절 유지했는데(등록자 가시성 회귀 방지), "공개 프로필도 owner_uid 단일"을 원하면 한 줄 변경.
- [ ] `removal_requested_at`을 authenticated는 여전히 읽음(게스트도 익명 로그인 = authenticated). 더 숨기려면 뷰/어드민 RPC 필요 — 지금 범위 밖 처리 동의?

## 마스터 전달용 메모

### 원작자 직접 수정·삭제권을 머지 전에 재확인

- 근거: `.planning/threads/handle-attribution-owner-uid-20260810.md:21`, `supabase/migrations/20260803100000_retire_anon_null_owner_rls_branches.sql:93`
- 모기 판단으로 대리등록은 초기 씨드 자료를 채우기 위한 예외에 가깝고, 원작자 검증 뒤에도 `created_by`만 직접 수정·삭제할 수 있으며 `owner_uid` 본인은 요청만 가능한 현재 모델은 사용자 기대와 어긋난다.
- `created_by`는 입력 이력·원복 근거로 보존하되 `owner_uid` 본인에게 직접 수정·삭제권을 줄지, 귀속 이전 뒤 대리등록자의 기존 관리권은 유지할지를 PR #496 머지 전에 명시적으로 다시 결정해야 한다. 현재 카드의 "모기가 결정할 것 2건"은 이 권한 결정을 포함하지 않는다.
- **결정됨 (2026-08-10 모기)**: spec 결정 3 재확인 — #496은 권한 변경 없이 머지 진행, 직접권 재설계는 별도 레인 sw-c2p(브레인스토밍 선행)로.

## 머지 후 UAT 체크리스트 (모기 실측)

- [ ] 원격 db push 후 backfill 쿼리 실행 — transferred ≈ 15건 (쿼리 전문 = 보고서 §UAT ①)
- [ ] 검증 동선: verify 승인 → 발색 귀속 + 고정 표식 (보고서 §UAT ②)
- [ ] 삭제 요청 동선: 본인만 세팅, 타인 42501, 어드민 필터 (보고서 §UAT ③)
- [ ] 경고 카피 소멸: 핸들 검증 시트에 "이전 핸들 발색 빠질 수 있어요" 없음 (보고서 §UAT ④)

## 이해 체크 (주관식, 과외냥이가 진행)

- A1. 왜 소유자 이전 시 삭제 요청을 지우는 게 안전한가 — 안 지우면 생기는 사고 시나리오는?
- A2. `owner_bound_handle` 없이 "현재 프로필 핸들"로 원복하면 어떤 케이스가 깨지나?
- A3. B′ 가드와 "내 발색" 목록의 판정이 왜 달라야 하나?
