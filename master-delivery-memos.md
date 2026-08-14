# 마스터 전달용 메모 (단일 수신함)

과외 세션 발견물을 한곳에 누적하는 마스터 전달용 단일 수신함이다. 메모는 리드 카드나 다른 파일로 옮기지 않고 이 파일에만 append한 뒤 커밋한다.

운영 규칙 (모기 확정 2026-08-14): 마스터가 메모를 확인·처리할 때마다 이 파일을 비운다. 처리 내역은 비움 표식 한 단락으로 남기고, 원문은 git 이력이 보존한다.

(비어 있음 — 2026-08-14 마스터 4차 비움. 처리분 1건 라우팅 내역: PR #515 마감 후보 문구의 발생/포착 시점 혼동 (유효) → 머지 전 문구 수리로 워커에 즉시 지시(terminal send). 같은 턴에 모기의 교차 저장소 포인터 일반 정책 질문 → sw-8vh 등록(상대경로 금지·저장소명+이름·D-ADR 승격 기준). 원문 = git 이력.)

## sw-u4r의 swatch 19 완전 유실 처리를 `lost` 보존에서 발색 전체 삭제로 변경

근거: `../swatch-ops/docs/decisions/2026-08-14-swatch-media-self-preservation.md:11`, `../swatch-ops/docs/decisions/2026-08-14-swatch-media-self-preservation.md:19` + 2026-08-14 QA 읽기 전용 실측(`swatches.id=19`: 사진 2장 전부 유실, `swatch_items` 1행, 비교 근거 사용 0행, `shade_images` URL 참조 0행) + 2026-08-14 과외 세션 모기 재결정

기존 결정은 발색 행을 남기고 유실된 두 사진을 `swatch_media.status='lost'`로 기록하지만, 모기는 백지 재검토에서 사진이 발색의 성립 조건이므로 두 장이 모두 유실된 `swatches.id=19`와 그 종속 `swatch_items`를 통째로 삭제한다고 판단했다. A레인 계약 전에 결정문·카드의 기존 선택을 현재 판단으로 다시 확정해야 하며, 이번 판단은 완전 유실 행에 한정되고 일부 사진만 유실된 일반 규칙은 아직 확정되지 않았다.

## sw-u4r의 삭제 기준을 일부 사진 영구 유실까지 확대하고 일시 실패와 분리

근거: `../swatch-ops/docs/decisions/2026-08-14-swatch-media-self-preservation.md:19`, `../swatch-ops/docs/decisions/2026-08-14-swatch-media-self-preservation.md:30` + 2026-08-14 과외 세션 모기 재결정

모기는 사진 묶음 전체가 발색의 성립 조건이므로 여러 장 중 한 장만 영구 유실돼도 `swatches` 행 전체를 삭제 대상으로 본다고 확정했다. 단, 등록 직후 복사 실패나 일시적 원본 장애는 기존 `pending` 재시도로 보호하고 복구 불가능 판정 뒤에만 삭제해야 하므로, A레인 계약에는 영구 유실 확정 조건과 삭제 전 사용자 경험을 별도 경계로 잠가야 한다.

## sw-u4r의 단일 `pending` 상태로는 안전한 원본 폴백과 공개 격리를 구분할 수 없다

근거: `../swatch-ops/docs/decisions/2026-08-14-swatch-media-self-preservation.md:30`, `../swatch-ops/docs/decisions/2026-08-14-swatch-media-self-preservation.md:33`

현재 설계의 `pending`은 원본 다운로드 실패와 자체 스토리지 업로드 실패를 구분하지 않지만, 원본이 살아 있는 후자는 `source_url`로 정상 표시할 수 있고 원본 자체가 안 열리는 전자는 깨진 발색을 공개하지 않도록 격리해야 한다. A레인 데이터 모델이나 서버 복사 결과에 실패 단계·원인 또는 그와 동등한 파생 상태를 남겨야 B레인이 공개 여부와 원작자용 재시도 안내를 정직하게 결정할 수 있다.

## sw-u4r의 배치 재시도 시점과 영구 유실 확정 조건이 비어 있다

근거: `../swatch-ops/docs/decisions/2026-08-14-swatch-media-self-preservation.md:30`, `../swatch-ops/docs/decisions/2026-08-14-swatch-media-self-preservation.md:33`

결정문은 등록 직후 동기 복사 실패를 `pending`으로 남겨 배치 재시도한다고만 정하고, 실행 주체·첫 재시도 시점·간격·상한·앱 종료 뒤 보장·수동 재시도 여부를 정하지 않았다. 영구 유실 판정 뒤 발색 전체를 삭제하는 현재 모기 결정에서는 이 공백이 일시 장애의 오삭제나 무한 `pending`으로 직결되므로, A레인 계약 전에 재시도 수명주기와 `lost` 전환 증거를 잠가야 한다.

## sw-u4r 재시도 UX는 실패 때만 노출하고 등록 당시 사진 묶음을 보존해야 한다

근거: `../swatch-ops/docs/decisions/2026-08-14-swatch-media-self-preservation.md:18`, `../swatch-ops/docs/decisions/2026-08-14-swatch-media-self-preservation.md:30`, `../swatch-v2/app/src/shared/lib/tweetPreview.ts:33`, X 공식 도움말 `https://help.x.com/en/using-x/edit-post` + 2026-08-14 과외 세션 모기 확정

모기는 정상·짧은 자동 재시도에는 아무 상태도 노출하지 않고 자동 복구가 계속 실패했을 때만 원작자에게 `사진 다시 가져오기`를 보여주는 UX로 확정했다. X Premium은 게시 후 1시간 동안 미디어 순서를 포함한 편집을 허용하므로 버튼이 현재 게시물을 다시 해석해 사진 묶음을 교체하면 등록 당시 `idx` 의미가 바뀔 수 있고, 등록 당시 저장한 사진별 원본 URL과 순서를 그대로 재시도한 뒤 그 사본을 못 얻을 때만 영구 유실 규칙으로 보내야 한다.

## sw-u4r B레인 전에 D-099·D-118 대표사진 정책을 함께 재결정해야 한다

근거: `../swatch-v2/docs/wiki/decisions/D-099.md:110`, `../swatch-v2/docs/wiki/decisions/D-099.md:122`, `../swatch-v2/docs/wiki/decisions/D-118.md:92`, `../swatch-v2/docs/wiki/decisions/D-118.md:101`, `../swatch-v2/supabase/migrations/20260814060000_revoke_public_copies_on_hide_or_delete.sql:34` + 2026-08-14 QA 읽기 전용 실측(shade 247개, primary 대표 97개 = 비교 fallback 77·자동 단독 15·팔레트 5, 무대표 150개, primary 97개 전부 swatch URL과 일치)

D-118은 개인 홈에서 내 발색샷을 우선하고 없으면 공용 대표를 쓰되 탐색은 공용 위키로 유지하는 반면, D-099의 공용 대표는 첫 사용자 발색을 first-come으로 고정하고 원작자 숨김·삭제 때 현행 트리거가 회수한 뒤 재선정하지 않는다. `shade_images.media_id` FK만 추가하면 이 불안정한 정책을 구조화할 뿐이므로, B레인 전에 개인 홈의 공용 fallback 필요성·공용 탐색 대표의 선정과 자동 대체·사진 소유자의 회수권·사진별 shade 관계를 한 결정으로 다시 잠가야 한다.

## 개인 홈은 공용 대표사진을 쓰되 `내 발색 없음`을 명시한다

근거: `../swatch-v2/docs/wiki/decisions/D-118.md:96`, `../swatch-v2/docs/wiki/decisions/D-118.md:101`, `../swatch-v2/docs/wiki/decisions/D-118.md:104` + 2026-08-14 과외 세션 모기 확정

모기는 개인 홈의 시각 아카이브 기능을 약화시키지 않기 위해 `내 화장품` 카드에서 내 발색샷이 없으면 공용 대표사진을 제품 식별용으로 보여주되 `내 발색 없음`을 명시하고, 공용 대표도 없으면 색상칩과 같은 표식을 쓰기로 했다. `내 발색샷` 층은 내 사진만 보여주고 공용 사진으로 빈자리를 채우지 않아야 하므로, 홈 fallback과 공용 탐색 대표 선정은 서로 다른 화면 계약으로 구현해야 한다.
