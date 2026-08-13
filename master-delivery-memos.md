# 마스터 전달용 메모 (단일 수신함)

과외 세션 발견물을 한곳에 누적하는 마스터 전달용 단일 수신함이다. 메모는 리드 카드나 다른 파일로 옮기지 않고 이 파일에만 append한 뒤 커밋한다.

(비어 있음 — 2026-08-11 마스터 비움. 처리분 7건 라우팅 내역: 삭제 요청 즉시 비공개·원작자 직접권 → sw-c2p / 판정 정본 표 → sw-tw7 / owner_bound_handle 계열 3건 → #496 문서 정합 + "감사 기록으로 유지" 확정으로 종결 / 상태 모델 재점검 → 마스터 전이표 검토로 종결. 최종 확정 스펙 = `pr-cards/2026-08-10-pr496-fix-pass.md`.)

## `create_swatch`가 클라이언트 제공 `author_handle`을 신뢰해 귀속 위조 가능

**[처리 완료 2026-08-12, 마스터 실측]** PR #498(dev 머지 07ba976, '등록 서버 게이트 — 귀속 위조 차단 + 대리등록 어드민 한정')이 해소: P0406=미검증 차단, P0407=타인 핸들 차단, is_admin() 예외. UAT 4/4 통과, errcode 존치는 PR #500 CI 구조 검증 (3)이 상시 감시.


- 근거: `../swatch-v2/app/src/features/shade-detail/SwatchContributionSheet.tsx:422`, `../swatch-v2/supabase/migrations/20260802000000_retire_device_id_write_path.sql:45`, `../swatch-v2/supabase/migrations/20260810100000_swatch_owner_uid_attribution.sql:155`
- 정상 UI는 서버의 트윗 미리보기에서 받은 실제 작성자 핸들을 `create_swatch`에 보내지만, RPC는 클라이언트가 전달한 `p_author_handle`과 `p_source_url`의 관계를 서버에서 재검증하지 않고 그대로 INSERT한다. 인증 사용자가 UI를 우회해 검증된 타인의 핸들을 임의로 넣으면 INSERT 트리거가 그 타인의 `owner_uid`로 즉시 배정해 가짜 발색을 상대의 "내 발색"에 붙일 수 있다.
- 핸들을 검증 이벤트의 귀속 단서로 사용할 때는 그 단서 자체가 신뢰 경계 안에서 확인돼야 한다. 트윗 메타데이터를 쓰기 서버에서 다시 조회하거나 서명된 미리보기 결과를 검증하는 등 `source_url → author_handle` 결합을 서버가 보장하고, 그 전에는 클라이언트 제공 핸들만으로 verified 유저에게 자동 이전하지 않도록 해야 한다.

## 대리등록은 어드민 전용 — 현재 일반 사용자 등록 경로가 제품 결정 위반

**[처리 완료 2026-08-12, 마스터 실측]** PR #498(dev 머지 07ba976, '등록 서버 게이트 — 귀속 위조 차단 + 대리등록 어드민 한정')이 해소: P0406=미검증 차단, P0407=타인 핸들 차단, is_admin() 예외. UAT 4/4 통과, errcode 존치는 PR #500 CI 구조 검증 (3)이 상시 감시.


- 근거: `../swatch-v2/app/src/features/shade-detail/SwatchContributionSheet.tsx:422`, `../swatch-v2/app/src/features/shade-detail/SwatchContributionSheet.tsx:454`, `../swatch-v2/supabase/migrations/20260802000000_retire_device_id_write_path.sql:45`
- 모기가 확정한 제품 규칙은 일반 사용자는 자기 트윗의 발색만 등록할 수 있고, 다른 사람 트윗의 대리등록은 초기 씨드·운영을 위한 어드민 예외로만 허용한다는 것이다. 현재 화면은 일반 사용자가 임의의 트윗 URL을 미리보기한 뒤 발행할 수 있고 `create_swatch`도 작성자 핸들이 호출자 본인인지 또는 호출자가 어드민인지 검사하지 않아 이 규칙을 위반한다.
- 일반 사용자 요청은 서버에서 신뢰할 수 있게 확인한 트윗 작성자와 호출자의 본인 핸들이 일치할 때만 허용하고, 불일치 등록은 어드민에게만 열어야 한다. 화면 차단만으로는 RPC 직접 호출을 막지 못하므로 이 구분은 반드시 쓰기 서버 또는 RPC에서 강제해야 하며, 미검증 사용자의 자기 트윗 등록을 허용하려면 클라이언트 입력과 별개의 본인 확인 방법도 함께 정해야 한다.

## 출시판은 미검증 일반 사용자의 발색 등록을 서버에서 차단

**[처리 완료 2026-08-12, 마스터 실측]** PR #498(dev 머지 07ba976, '등록 서버 게이트 — 귀속 위조 차단 + 대리등록 어드민 한정')이 해소: P0406=미검증 차단, P0407=타인 핸들 차단, is_admin() 예외. UAT 4/4 통과, errcode 존치는 PR #500 CI 구조 검증 (3)이 상시 감시.


- 근거: `../swatch-v2/app/src/features/shade-detail/SwatchContributionSheet.tsx:454`, `../swatch-v2/supabase/migrations/20260802000000_retire_device_id_write_path.sql:45`
- 모기는 출시판에서 핸들이 검증되지 않은 일반 사용자의 발색 등록을 하드 게이트로 차단하고, 어드민만 운영상 예외로 허용하기로 확정했다. 검증 전에는 트윗 불러오기와 폼 작성 같은 화면 경험을 제공할 수 있지만 공개 등록과 `owner_uid` 부여는 서버가 거부해야 하며, 이후 실제 이탈이 문제일 때 작성 내용 보존 후 검증을 거쳐 등록을 재개하는 UX를 별도 개선한다.

## 정책 스냅샷 자동화만으로는 모기의 실제 검토를 보장하지 못함

- 근거: `plan-cards/2026-08-11-rls-relief-plan-sw-tw7.md:16`, `plan-cards/2026-08-11-rls-relief-plan-sw-tw7.md:29`, `plan-cards/2026-08-11-rls-relief-plan-sw-tw7.md:35`
- 스냅샷 생성과 낡음 검출을 자동화해도 CI가 보장하는 것은 파일이 현재 정책과 같다는 사실뿐이며, 모기가 정책 diff를 실제로 읽었다는 사실이나 변경 의도를 승인했다는 사실은 보장하지 못한다. 모기는 나중에 귀찮아서 검토를 건너뛸 가능성을 직접 위험으로 제기했으므로, 의지에 기대지 않게 변경 행만 요약한 짧은 판정 표면과 독립 리뷰 또는 명시적 승인 게이트 중 무엇을 둘지 계약 작성 전에 결정해야 한다.
- 모기 확인(2026-08-11): 긴 정책표의 기술 검증은 자동화와 독립 리뷰가 맡고, 모기는 "누가 어느 테이블에서 무엇을 할 수 있게 또는 없게 됐는지"를 사람말로 바꾼 한두 줄만 확인하는 방식이면 괜찮다.

## mogi-cards를 읽는 목적별 폴더로 재분류하고 일회용 UAT 자료 제거

**[처리 완료 2026-08-12, 마스터]** 재분류·삭제·부트 문서 갱신 실행됨. 규칙은 guide-read-cards.md '일회용 자료 운영' 절로 명문화.

- 근거: `AGENTS.md:8`, `README.md:5`, `read-card/2026-08-11-uat-briefing.md:1`, `2026-08-11-attribution-saga-timeline.md:1`
- 현재 세션 부트가 날짜만으로 최신 카드를 나열해 PR 승인 카드·착수 전 설계 카드·코드 학습 노트를 한꺼번에 보여주므로, 모기가 첫 화면에서 읽을거리가 너무 많고 목적을 구분하기 어렵다. 모기 결정(2026-08-11)은 7월까지의 자료를 `archive/`로 보내고 8월 자료를 `pr-cards/`·`plan-cards/`·`code-diff-notes/`로 분류하되, PR 번호가 있어도 내용이 설계·SPEC이면 `plan-cards/`에 두며 세션 시작에는 각 활성 폴더의 최신 문서 1개씩만 보여주는 것이다.
- 현재 `read-card/2026-08-11-uat-briefing.md`와 `2026-08-11-attribution-saga-timeline.md`는 삭제한다. 앞으로 UAT 브리핑 같은 일회용 안내장은 생성 → 읽기·실행 → 결과를 PR 카드나 원문에 반영 → 삭제 흐름으로 운영하고 영구 카드 목록에는 남기지 않는다.

## 직접권 설계 카드의 현행 설명에 폐기된 비교 노트 CASCADE가 섞여 있음

- 근거: `plan-cards/2026-08-13-owner-direct-rights-admin-roles-design.md:14`, `../swatch-v2/app/src/data/database.types.ts:547`, `../swatch-v2/supabase/migrations/20260802010000_drop_legacy_comparison_notes.sql:21`, `../swatch-v2/supabase/migrations/20260802010000_drop_legacy_comparison_notes.sql:43`
- 현행 `comparison_assessments.evidence_swatch_id`의 `ON DELETE RESTRICT`와 달리, `ON DELETE CASCADE`였던 `comparison_note_swatches`는 2026-08-02에 `comparison_notes`와 함께 삭제됐고 현재 생성 타입에도 존재하지 않아 두 규칙이 동시에 살아 있는 것처럼 읽히는 카드 문장은 사실과 어긋난다. 카드의 현행 실물에서는 옛 CASCADE 설명을 제거하거나 역사적 대비라고 명시하고, 현재는 assessment가 근거로 참조한 발색의 삭제가 차단된다는 동작만 남겨야 모기가 삭제 정책을 잘못 판단하지 않는다.

## 원작자 발색 삭제 뒤 비교평가 텍스트는 보존하고 사진 근거만 제거

- 근거: `plan-cards/2026-08-13-owner-direct-rights-admin-roles-design.md:34`, `plan-cards/2026-08-13-owner-direct-rights-admin-roles-design.md:36`, `../swatch-v2/app/src/data/database.types.ts:524`, `../swatch-v2/app/src/data/database.types.ts:547`
- 모기 확정(2026-08-13): 원작자가 발색을 삭제해도 타인이 작성한 비교평가의 텍스트·판단 데이터는 보존하되, `evidence_swatch_id`와 사진 번호 연결은 제거하고 평가 화면에는 근거 사진이 삭제됐다는 사실을 표시한다. 사진까지 계속 노출하면 원작자의 삭제 의사가 무효가 되고 평가 전체를 지우면 타인 작성 데이터까지 대신 삭제하므로, 사진 근거와 텍스트 판단을 분리해야 두 데이터 주인의 권리를 함께 보존할 수 있다.

## 등록자와 원작자가 다른 현행 발색은 모두 어드민 등록 — 역할 회수 뒤 created_by 권한 잔존을 막아야 함

- 근거: `../swatch-v2/supabase/migrations/20260811000000_create_swatch_author_handle_gate.sql:10`, `../swatch-v2/supabase/migrations/20260811000000_create_swatch_author_handle_gate.sql:134`, QA 읽기 전용 실측(2026-08-13): `owner_uid IS DISTINCT FROM created_by AND owner_uid IS NOT NULL` 15행 중 현재 어드민 등록 15행·일반 사용자 등록 0행
- 새 정상 쓰기에서는 일반 사용자가 자기 검증 핸들의 발색만 등록할 수 있고 QA의 이전된 발색도 전부 어드민 등록이므로, §1에서 일반 비어드민 등록자가 원작자와 갈라지는 경우를 주된 현행 시나리오처럼 강조할 필요는 없다. 그래도 수정·삭제 판정을 `owner_uid`로 바꿔야 어드민 역할 행을 제거한 뒤 전직 어드민이 `created_by`를 근거로 관리권을 영구 보유하지 않으며, 현직 어드민의 권한은 별도 override에서만 나오게 할 수 있다.
- 모기 확정(2026-08-13): 어드민 역할을 회수한 뒤에는 그 사람이 과거에 대리등록한 발색에 수정·삭제·비공개 행 열람을 포함한 어떤 관리 권한도 남지 않아야 한다. `created_by`는 대리등록의 역사·감사 기록일 뿐 권한 근거가 아니며, 원작자가 사진과 연결 정보를 개인정보로 여길 수 있으므로 현재 역할이 없는 전직 운영자의 접근을 허용하지 않는다.

## hidden_at을 swatches 읽기에만 적용하면 swatch_items 자식 데이터가 계속 공개됨

- 근거: `plan-cards/2026-08-13-owner-direct-rights-admin-roles-design.md:34`, `../swatch-v2/supabase/migrations/20260421000000_restructure_swatches.sql:95`, `../swatch-v2/supabase/migrations/20260421000000_restructure_swatches.sql:96`, `../swatch-v2/app/src/data/database.types.ts:1974`
- 설계안처럼 `swatches`의 공개 SELECT에만 `hidden_at IS NULL`을 넣으면 부모의 사진·출처 행은 숨지만, `swatch_items`의 독립 `anon_read USING (true)`가 남아 직접 API 조회에서 비공개 발색의 `swatch_id`·연결 색상·메모가 계속 노출된다. 비공개를 발색 단위의 접근 차단으로 보장하려면 `swatch_items` SELECT도 부모 `swatches`의 공개·원작자·현직 어드민 판정을 따르게 하고, `SECURITY DEFINER` RPC·뷰를 포함한 모든 발색 읽기 표면에 같은 필터가 적용되는지 계약에서 열거해 검증해야 한다.

## 대리등록을 타인 발색의 비교평가 근거 자격으로 인정하는 현행 규칙 재검토

- 근거: `plan-cards/2026-08-13-owner-direct-rights-admin-roles-design.md:16`, `plan-cards/2026-08-13-owner-direct-rights-admin-roles-design.md:28`, `../swatch-v2/supabase/migrations/20260810100000_swatch_owner_uid_attribution.sql:441`, QA 읽기 전용 실측(2026-08-13): 근거 발색이 있는 `comparison_assessments` 12행 중 현재 원작자 작성 10행·원작자가 아닌 등록자 작성 2행·둘 다 아닌 제3자 작성 0행
- 모기는 다른 사람의 발색샷을 자기 비교판단의 근거로 쓰는 제품 동작 자체가 이상하다고 제기했다. 현행 `is_own_observation_swatch`가 원작자뿐 아니라 등록자도 허용하므로 어드민 대리등록을 자기 관찰로 간주하는데, 대리등록은 데이터 입력·운영 행위이지 사진 원작자의 관찰 권한을 넘겨받는 사건이 아니므로 근거 자격을 `owner_uid` 본인으로 좁힐지 계약 전에 다시 결정해야 한다. 좁힌다면 QA의 기존 2행은 평가 전체 삭제·사진 근거 연결만 제거·별도 예외 보존 중 어떤 전환을 할지도 함께 정해야 한다.
- 모기 확정(2026-08-13): 타인의 사진으로 데이터를 생성하는 데 원작자가 불쾌감을 느낄 수 있다는 사진 사용 권리와, 직접 관찰하지 않은 사람이 비교판단을 작성하면 신뢰성 문제를 제기받는다는 두 이유 모두 때문에 대리등록자는 근거 자격을 얻지 않는다. 단 `owner_uid = 평가 작성자`만으로 좁혀도 미검증 원작자의 사진을 어드민이 먼저 대리등록한 동안 `owner_uid = created_by`로 임시 배정되는 구멍이 있으므로, 근거 자격은 원작자 핸들 검증으로 귀속이 확정된 행(`owner_bound_at IS NOT NULL`)이면서 `owner_uid = auth.uid()`인 경우로 한정해야 한다; 미확정 대리등록 발색은 누구도 비교평가 근거로 쓰지 못한다.
- 기존 QA 2행 예외 확정(2026-08-13): 모기가 원작자인 코덕 지인들에게 허락받은 트윗을 보고 테스트·시드 비교판단으로 대신 등록한 데이터라 평가와 사진 근거를 모두 보존한다. 이것은 모기 계정이나 어드민 역할에 앞으로도 타인 사진을 자유롭게 인용할 일반 권한을 주는 예외가 아니라, 제품 소유자가 원작자 허락을 확인한 기존 2행만 승인한 역사적 시드 예외다; 신규 일반 쓰기는 위의 검증된 원작자 본인 규칙을 그대로 적용하고, 원작자가 이후 비공개·삭제를 선택하면 시드 사진도 그 의사를 따라야 한다.

## 비교평가 사진 근거가 원작자의 발색 삭제를 잠그는 경우를 제거

- 근거: `plan-cards/2026-08-13-owner-direct-rights-admin-roles-design.md:14`, `plan-cards/2026-08-13-owner-direct-rights-admin-roles-design.md:41`, `../swatch-v2/supabase/migrations/20260625000000_comparison_assessments_tables.sql:24`, QA 읽기 전용 FK 실측(2026-08-13): `swatches`를 참조하는 현행 FK는 `comparison_assessments.evidence_swatch_id ON DELETE RESTRICT`와 `swatch_items.swatch_id ON DELETE CASCADE` 두 개뿐
- 모기 확정(2026-08-13): 비교평가가 사진을 근거로 인용하고 있어도 원작자의 삭제를 막지 않으며, 삭제 시 사진 근거 연결과 선택 사진 번호 행은 자동 제거하고 비교평가의 텍스트·축별 판단만 남긴다. 따라서 `RESTRICT` 때문에 "비공개 전환 + 어드민 정리 요청"으로 우회하는 경우 자체를 없애고, 이 용도만 남는다고 설계한 `request_swatch_removal`과 어드민 큐도 폐기 대상으로 돌려야 한다; 구현 계약은 `evidence_swatch_id = NULL`과 `comparison_assessment_evidence_images` 정리를 같은 트랜잭션에서 보장해 근거 없는 사진 번호가 남지 않게 해야 한다.
