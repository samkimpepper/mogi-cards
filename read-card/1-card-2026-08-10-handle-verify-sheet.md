---
merge_ready: false
---

# 모기 리드 카드 — 핸들 검증 요청 시트 + 자동 해제 트리거 (PR #493): "저장이 곧 요청"이던 동선에 상태를 입히기

> 종류: FEAT Read Card. 원문 SSOT = PR #493 본문 + swatch-ops `contracts/2026-08-10-author-verify-lane.md` + launch gate 재실측 §2.4·§2.5.
> 작성: 2026-08-10 냐옹이 (Gen 2). 워커 = opus-5 레인. 이해 체크 H1~H2 = 이 브랜치 Review Gate Quiz.
> **주의: 아직 머지 게이트 미완** — 워커 최종 READY 보고와 마스터 codex 교차 리뷰가 남았다. 카드는 먼저 읽되, 머지는 그 둘 확인 후. (완료되면 이 줄과 frontmatter 를 냐옹이가 갱신한다.)

## Auth 용어 미니 정리

| 말 | DB 입장 | 뜻 |
|---|---|---|
| anon | role = anon | 세션 없는 호출자 |
| member | role = authenticated | 일반 로그인 사용자 |
| service_role / DEFINER RPC | RLS 미적용 경로 | 정책(WITH CHECK)이 안 지켜주는 쓰기 경로 |

## 1. 뭐가 생겼나 `[READ]` (launch gate AUTHOR-02·04, 네 결정 10으로 Phase 6 편입분)

- `[READ]` **시트 (AUTHOR-02)**: 지금까지는 프로필에서 핸들을 저장하면 그게 곧 암묵적 검증 요청이었다 — 시트도, 상태 안내도 없이. 이제 `HandleVerifyRequestSheet`가 상태 3종을 보여준다: 미요청(핸들 없음) / 검증 대기(`handle_verified=false`) / 검증 완료(true). 저장 로직은 기존 `upsertTwitterHandle` 재사용, 새 테이블·RPC 없음.
- `[READ]` **트리거 (AUTHOR-04)**: 핸들을 바꾸면 검증이 자동으로 풀린다(`handle_verified=false`). 지금까지 이 불변식은 RLS `WITH CHECK`로만 성립했는데, 그건 **클라 경로에만** 걸린다 — 미래의 DEFINER RPC나 service_role 직접 UPDATE는 안 막혔다. BEFORE UPDATE 트리거는 모든 쓰기 경로에 공통 적용된다.

## 2. 설계에서 배울 것 `[READ]`

- `[READ]` **왜 RLS가 아니라 트리거인가**: RLS WITH CHECK는 NEW 값만 검증할 수 있어 "핸들이 *바뀌었는지*"(OLD와 비교)를 볼 수 없다. 트리거는 `IS DISTINCT FROM`으로 실제 변경만 잡는다 — 그래서 어드민의 `verify_twitter_handle`(검증 승인: handle_verified만 토글, 핸들은 안 건드림)은 자연히 안 걸린다. 기존 `protect_is_core`/`protect_axes` 트리거와 같은 패턴.
- `[READ]` **권한 표면 점검 동봉**: 신설 트리거 함수는 직접 호출이 불가해서(`trigger functions can only be called as triggers`, anon 실측) EXECUTE 회수 대상이 아니다 — postmortem 067(default ACL 사고) 후속 규약대로 proacl baseline까지 마이그 주석에 실측 기록돼 있다.

## 3. 덤 수정 `[READ] 숨은 변경`

- 플레이크 테스트 2건 수정(NewProductSheet·SwatchContributionSheet funnel — 부하 타임아웃, sw-rht와 같은 계열) + 시트 자체의 레이스 버그 1건(시트 열린 뒤 도착한 프로필이 입력 중 핸들을 지우던 문제) 수정. 셋 다 사용자 저장·권한 동작 변경 아님 — 계약 조항("그 외 실패는 전부 고친다")의 산물.

## 4. 이해 체크 (주관식, 이 브랜치 1회)

- **H1.** 이 불변식("핸들 바꾸면 검증 풀림")을 RLS WITH CHECK만으로 둘 때 뚫리는 경로는 뭐고, 왜 트리거는 어드민 검증 승인까지 풀어버리지 않나? (힌트: OLD/NEW 비교 · IS DISTINCT FROM → 읽을 대목: 2절 첫째, 마이그 주석)
- **H2.** 시트의 상태 3종을 각각 어떤 데이터 조합이 만드나? 그리고 검증 대기 중 핸들을 고치면 무슨 일이 생기나? (읽을 대목: 1절 첫째 + 트리거)
