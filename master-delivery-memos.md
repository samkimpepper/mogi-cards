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
