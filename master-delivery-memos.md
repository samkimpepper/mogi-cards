# 마스터 전달용 메모 (단일 수신함)

과외 세션 발견물을 한곳에 누적하는 마스터 전달용 단일 수신함이다. 메모는 리드 카드나 다른 파일로 옮기지 않고 이 파일에만 append한 뒤 커밋한다.

운영 규칙 (모기 확정 2026-08-14): 마스터가 메모를 확인·처리할 때마다 이 파일을 비운다. 처리 내역은 비움 표식 한 단락으로 남기고, 원문은 git 이력이 보존한다.

(비어 있음 — 2026-08-14 마스터 6차 비움. 처리분 1건 라우팅 내역: sw-u4r 개정 2 재시도 수치·게이트 해제가 모기 미확인이라는 이의 — 기록 충돌로 판정(마스터 세션에는 수치 명시 제안 + 모기 '나머지 ㅇㅋ' 승인 기록 존재, 과외 세션 대화와 상충). 마스터가 충돌을 모기에게 그대로 제시 → 모기가 수치·lost 결합 조건을 명시 재확인(선택지 3안 중 '채택 확인') → 개정 2 유지, A레인 계속, 결정문 개정 3에 재확인 사실 기록. 메모에 실린 과외 세션 추가 확정 2건(지속 실패 시 복구 알림 1개, 죽은 카드 일반 탐색·내 발색샷 비노출)은 결정문 §3에 반영 — B레인 화면 계약 재료. 원문 = git 이력.)

## sw-u4r 과외용 plan card와 PR #518 전달 카드가 현재 정본을 따라오지 못했다

근거: `plan-cards/2026-08-14-swatch-media-self-preservation-design.md:8`, `plan-cards/2026-08-14-swatch-media-self-preservation-design.md:16`, `../swatch-ops/docs/decisions/2026-08-14-swatch-media-self-preservation.md:72`, `../swatch-ops/docs/decisions/2026-08-14-swatch-media-self-preservation.md:95`, `../swatch-ops/docs/decisions/2026-08-14-swatch-media-self-preservation.md:96` + 2026-08-15 GitHub 실측(PR #518 OPEN, CI 필수 실행 성공) + `pr-cards/`에 #518 카드 없음

정본 결정문은 개정 3에서 모기 재확인을 기록해 A레인을 열고 개정 4에서 PR #518 교차 리뷰와 fix1까지 기록했지만, 과외용 plan card는 아직 `개정 1`·`A레인 재확인 후`·미결정 4건으로 남아 다음 세션이 해결된 질문을 다시 열 수 있다. plan card를 현재 정본에 맞춰 갱신하고, PR #518이 모기 승인 단계라면 원문 SSOT 포인터와 현재 체크·교차 리뷰 수리를 담은 PR 카드를 전달해야 한다.

## 정정: PR #518은 별도 PR 카드 없이 PR 본문을 승인 재료로 쓴다

근거: 2026-08-15 과외 세션 모기 전달

바로 위 메모의 `pr-cards/`에 #518 카드가 없다는 사실은 운영 누락이 아니며, #518은 PR 본문이 승인 카드 역할을 대신하므로 새 PR 카드를 만들거나 전달할 필요가 없다. 위 메모에서는 과외용 plan card가 정본 개정 3·4와 게이트 상태를 따라오지 못한 문제만 유효하다.

## PR #518 HEAD에는 결정문 개정 4가 완료로 기록한 CASCADE 폐지 fix1이 아직 없다

근거: GitHub PR #518 HEAD `supabase/migrations/20260814100000_swatch_media_model.sql:45`의 `swatch_id bigint NOT NULL REFERENCES swatches(id) ON DELETE CASCADE`, PR 변경 파일 목록에 수명주기 outbox 신설 없음, `../swatch-ops/docs/decisions/2026-08-14-swatch-media-self-preservation.md:96` + 2026-08-15 원격 읽기 실측

결정문 개정 4는 교차리뷰 전건 수리와 함께 A레인에서 outbox 큐를 먼저 신설하고 `swatch_media` CASCADE를 폐지했다고 기록했지만, 현재 PR HEAD와 본문은 여전히 CASCADE 모델이다. 이 상태로 머지하면 swatch 삭제 순간 object_key를 가진 media 행이 먼저 사라져 B레인 수명주기 소비자가 스토리지 정리 근거를 잃으므로, fix1 실제 커밋·PR 본문 갱신·해당 삭제 순서 검증이 반영되기 전에는 #518을 머지하면 안 된다.
