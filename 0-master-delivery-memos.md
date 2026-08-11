# 마스터 전달용 메모 (단일 수신함)

과외 세션 발견물을 한곳에 누적하는 마스터 전달용 단일 수신함이다. 메모는 리드 카드나 다른 파일로 옮기지 않고 이 파일에만 append한 뒤 커밋한다.

(비어 있음 — 2026-08-11 마스터 비움. 처리분 7건 라우팅 내역: 삭제 요청 즉시 비공개·원작자 직접권 → sw-c2p / 판정 정본 표 → sw-tw7 / owner_bound_handle 계열 3건 → #496 문서 정합 + "감사 기록으로 유지" 확정으로 종결 / 상태 모델 재점검 → 마스터 전이표 검토로 종결. 최종 확정 스펙 = `read-card/1-card-2026-08-10-pr496-fix-pass.md`.)

## `create_swatch`가 클라이언트 제공 `author_handle`을 신뢰해 귀속 위조 가능

- 근거: `../swatch-v2/app/src/features/shade-detail/SwatchContributionSheet.tsx:422`, `../swatch-v2/supabase/migrations/20260802000000_retire_device_id_write_path.sql:45`, `../swatch-v2/supabase/migrations/20260810100000_swatch_owner_uid_attribution.sql:155`
- 정상 UI는 서버의 트윗 미리보기에서 받은 실제 작성자 핸들을 `create_swatch`에 보내지만, RPC는 클라이언트가 전달한 `p_author_handle`과 `p_source_url`의 관계를 서버에서 재검증하지 않고 그대로 INSERT한다. 인증 사용자가 UI를 우회해 검증된 타인의 핸들을 임의로 넣으면 INSERT 트리거가 그 타인의 `owner_uid`로 즉시 배정해 가짜 발색을 상대의 "내 발색"에 붙일 수 있다.
- 핸들을 검증 이벤트의 귀속 단서로 사용할 때는 그 단서 자체가 신뢰 경계 안에서 확인돼야 한다. 트윗 메타데이터를 쓰기 서버에서 다시 조회하거나 서명된 미리보기 결과를 검증하는 등 `source_url → author_handle` 결합을 서버가 보장하고, 그 전에는 클라이언트 제공 핸들만으로 verified 유저에게 자동 이전하지 않도록 해야 한다.
