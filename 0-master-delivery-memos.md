# 마스터 전달용 메모 (임시)

과외 세션 발견물을 한곳에 누적하는 마스터 전달용 단일 수신함이다. 메모는 리드 카드나 다른 파일로 옮기지 않고 이 파일에만 append한 뒤 커밋한다.

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

## `owner_bound_handle` 값이 원복 판정에 쓰이지 않음

- 근거: `../swatch-v2/supabase/migrations/20260810100000_swatch_owner_uid_attribution.sql:299`, `../swatch-v2/supabase/migrations/20260810100000_swatch_owner_uid_attribution.sql:315`
- verify 때 `lower(핸들)`을 저장하지만 un-verify 대상은 `owner_uid = p_user_id AND owner_bound_handle IS NOT NULL`로만 골라 실제 핸들값을 비교하지 않는다. 같은 행 집합을 이미 `owner_bound_at IS NOT NULL`로 식별할 수 있어 현재 동작만 보면 신설 문자열 컬럼이 원복 정확도를 추가하지 않는다.
- 의도가 유저의 과거 검증 고정분 전부 원복이라면 핸들값은 감사 기록용임을 명시하고 기존 시각 표식으로 부족한 이유를 남겨야 한다. 특정 검증 이벤트가 만든 귀속만 원복하려는 의도라면 저장한 핸들값 또는 별도 이벤트 식별자를 실제 대상 판정에 사용해야 한다.

## 특정 옛 핸들 취소를 지정할 입력이 없음

- 근거: `../swatch-v2/supabase/migrations/20260810100000_swatch_owner_uid_attribution.sql:235`, `../swatch-v2/supabase/migrations/20260810100000_swatch_owner_uid_attribution.sql:310`
- `verify_twitter_handle`은 `p_user_id`와 `p_verified`만 받고, 핸들 변경 뒤 `user_profiles`에는 새 핸들만 남으므로 어드민이 어떤 옛 핸들 승인을 취소하려는지 함수에 전달할 방법이 없다. `swatches.owner_bound_handle`에 옛 값들이 남아 있어도 한 유저에게 여러 값이 있으면 DB가 취소 대상을 스스로 고를 수 없다.
- 따라서 현재 un-verify는 특정 핸들 검증분을 정확히 취소하는 동작이 아니라 해당 `owner_uid`에 검증으로 고정된 과거 행 전부를 원복하는 동작이다. 카드·SPEC에서 이 사용자 단위 전량 취소를 의도로 명시하거나, 특정 승인만 취소하려면 어드민 선택 동선과 `p_bound_handle` 또는 검증 이벤트 id 입력을 추가해야 한다.

## 과외 관찰 — 모기의 집요한 질문이 입력 공백을 발견함

- 근거: 과외 세션의 `owner_bound_handle` 문답 + `../swatch-v2/supabase/migrations/20260810100000_swatch_owner_uid_attribution.sql:235`
- 과외냥이가 테이블과 원복 흐름을 여러 번 설명했지만 모기는 이해되지 않는 상태를 넘기지 않고 "이미 프로필은 새 핸들인데 옛 핸들을 어디서 알아내나", "취소할 `mogi_old`를 어디서 입력받나"를 반복해서 물었다. 그 질문을 코드 입력까지 추적한 결과 RPC에 특정 옛 핸들이나 검증 이벤트를 지정할 인자가 없고, 실제 동작은 사용자 단위 전량 원복이라는 설계·카드 문구 차이가 드러났다.
- 어려운 용어를 이해한 척 통과하지 않고 데이터가 어디서 들어와 어디에 쓰이는지를 끝까지 확인한 모기의 태도가 이번 발견의 직접 원인이다. 리뷰가 이미 READY로 판정한 뒤에도 사용자 관점의 단순한 질문이 구현 전제를 깨뜨릴 수 있음을 보여주는 좋은 사례다.

## 특정 핸들 승인 취소 비지원 확정과 `owner_bound_handle` 제거 검토

- 근거: `../swatch-v2/supabase/migrations/20260810100000_swatch_owner_uid_attribution.sql:299`, `../swatch-v2/supabase/migrations/20260810100000_swatch_owner_uid_attribution.sql:315`
- 모기 결정은 "한 Swatch 사용자에게 계속 이어지는 트위터 정체성 하나"이며 핸들 변경은 그 계정의 이름 변경일 뿐이다. 어드민 un-verify는 사용자 단위 전량 원복으로 닫고, 특정 과거 핸들 승인만 취소하는 기능과 계정 이전은 현재 지원 범위에서 제거한다.
- 이 결정이면 `owner_bound_handle` 값은 현재 판정에 쓰이지 않고 미래 이벤트 단위 취소 발판도 불필요하다. 검증 고정 여부는 이미 `owner_bound_at IS NOT NULL`로 구분할 수 있고 원본 핸들은 `author_handle`에 남으므로, 원격 적용 전 `owner_bound_handle` 컬럼·타입·테스트·문서 제거와 un-verify 술어의 `owner_bound_at IS NOT NULL` 교체를 검토한다.
