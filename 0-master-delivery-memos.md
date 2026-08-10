# 마스터 전달용 메모 (임시)

리드 카드에 아직 귀속하지 않은 과외 세션 발견물을 임시로 모아둔다. 관련 리드 카드가 생기거나 정해지면 해당 카드의 `## 마스터 전달용 메모`로 옮긴다.

## 삭제 요청 즉시 비공개 상태 검토

- 근거: `../swatch-v2/supabase/migrations/20260810100000_swatch_owner_uid_attribution.sql:310`, `../swatch-v2/app/src/features/admin/routes/AdminPage.tsx:334`
- 현재 동선은 요청 시각 기록과 어드민 필터만 제공해, 처리 전까지 원작자가 원치 않는 사진이 계속 공개될 수 있다.
- 직접 완전삭제권은 보류하더라도 요청 즉시 공개를 중단하고 어드민이 후속 정리하는 2단계 동선이 민감 사용자의 통제권을 더 잘 보호한다.

## 원작자 직접 수정·삭제권 재검토

- 근거: `../swatch-v2/.planning/threads/handle-attribution-owner-uid-20260810.md:21`, `../swatch-v2/supabase/migrations/20260803100000_retire_anon_null_owner_rls_branches.sql:93`
- 대리등록자는 초기 씨드 자료를 채우기 위한 예외에 가깝다. 검증으로 원작자가 확정된 뒤에도 `created_by`가 수정·삭제권을 유지하고 `owner_uid` 본인은 요청만 할 수 있는 현재 모델은 사용자의 자연스러운 소유권 기대와 어긋난다.
- `created_by`는 입력 이력과 검증 취소 시 원복 근거로 보존하되, 검증 이전 후에는 최소한 `owner_uid` 본인에게도 직접 수정·삭제권을 부여하는 방향으로 SPEC 결정 3과 RLS 기준을 재검토한다. 대리등록자의 기존 권한을 함께 유지할지는 별도 명시가 필요하다.

## 판정 단일화는 질문별 정본으로 명시

- 근거: `read-card/1-card-2026-08-10-rls-cost-reduction-track.md:30`, `../swatch-v2/supabase/migrations/20260810100000_swatch_owner_uid_attribution.sql:399`
- #496의 최신 설계는 "내 발색 목록"은 `owner_uid`, "근거 인용 자격"과 "공개 프로필 기여"는 `owner_uid OR created_by`로 일부러 다르게 판정한다. 모든 용도를 하나의 범용 `is_mine` 함수로 합치면 이 승인된 의미 차이를 다시 없앨 위험이 있다.
- sw-tw7의 판정 함수 단일화는 "모든 질문에 함수 하나"가 아니라 "뜻이 같은 질문마다 정본 함수 하나"로 명시하고, 호출부가 판정식을 복사하지 못하게 한다. 소유·인용·기여·수정 권한을 각각 이름 붙인 뒤 어떤 화면과 RPC가 어느 정본을 쓰는지 표로 고정하는 편이 안전하다.
