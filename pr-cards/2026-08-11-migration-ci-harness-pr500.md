---
reviewed: true
merge_ready: true
---

# 카드 — 마이그레이션 CI 하네스 (PR #500, samkimpepper/rls-ci-harness → dev)

작성: 냐옹이 Gen 5, 2026-08-11. 원문 SSOT: PR #500 + 계약 2장·교차 리뷰 문서(swatch-ops/contracts/). 계획 카드([RLS 절감 계획](../plan-cards/2026-08-11-rls-relief-plan-sw-tw7.md))의 산출물 ① 이행분.

## 1. 반드시 읽을 결정

- supabase 스키마(마이그·테스트·config·seed·워크플로 자신)를 건드리는 PR마다 CI가: 러너 안 로컬 DB에 **마이그레이션 147개 전량 적용 → 검증 스크립트 20개 완주** (2분 48초, 프로덕션 자격증명 0 — 네 확정 결정 이행).
- 오늘 P0 회귀(`to_jsonb` 42501)의 **재발 감시선이 CI에 들어갔다** — 그 회귀를 일부러 심으면 빨간불이 뜨는 것까지 재현 확인됨.
- 하네스가 도입 즉시 **선재 빨간불 1건을 잡았다**: comparison_assessments 스크립트가 예전 PR 2개(#466 errcode 분리, #496 귀속)를 못 따라가 fresh DB에서 죽는 상태였다. 같은 PR에서 수리.
- **교차 리뷰(codex)가 구멍 4건을 찾았고 전부 수리됐다.** 핵심 2건: seed 파일이 CI 트리거에서 빠져 있었음(seed만 바꾸는 PR은 잡이 안 돎), 스크립트 20개 중 1개(events)가 판정 없이 출력만 해서 영원히 초록이었음 → 단언 16개로 자기-판정화. 가드 재현 2건 포함.

## 2. 네가 결정할 것

- **머지 여부** (과외냥이 퀴즈 통과 후, 늘 그렇듯 머지는 네 손).
- **머지 후: CI 필수 체크화** — migration-verify를 branch protection 필수 체크로 박을지. 저장소 설정이라 네 손 필요. 마스터 추천 = 필수화. 원하면 절차 안내함.

## 3. 위험한 가정

- CI는 **마이그레이션의 성질**만 검사한다. 프로덕션의 현재 데이터 상태·실제 앱 동선은 여전히 db push 절차(런북 신설됨)와 사람 몫.
- 구조 검증의 "SELECT 컬럼 19개" 같은 기대값은 하드코딩이다 — 컬럼을 의도적으로 늘리는 PR은 **같은 PR에서 기대값도 갱신**해야 한다 (에러 메시지에 그렇게 적혀 있음).
- 워커 판단 이탈 중 하나: update_swatch의 search_path 미고정은 선재 위생 항목이라 FAIL이 아니라 NOTICE로만 남김 (고치는 쪽이 개선이므로 CI로 안 막음).

## 4. 증명된 증거 (마스터 독립 재측정 포함)

- 체크 rollup 타입별 판독: pending 0, 새 잡 SUCCESS(자기 PR에서 실제 트리거, 원+fix 두 커밋 다), MERGEABLE, 리뷰 스레드 0/0, 내 측정 시각 이후 새 리뷰 0.
- diff 4파일 마스터 정독 + fix 4건 실물 재확인 (paths의 seed 줄, events 단언 16개, 이름별 판정, README 플래그).
- 로컬 실측(워커): reset 51초·20/20 PASS. 차단 재현 총 4건(합성 실패·P0 심기·정책 DROP·개명+오버로드) — 전부 빨간불 확인 후 원복.
- 교차 리뷰 전문: swatch-ops/contracts/2026-08-11-pr500-codex-review.md (VERDICT: findings → 4/4 수리).

## 5. 이해 체크 골격 (과외냥이 몫)

- 이 CI는 뭘 보장하고 뭘 보장 못 하나? (구조 vs 동선)
- events 스크립트는 왜 "영원한 초록불"이었나? 수리 전후의 차이는?
- comparison_assessments는 왜 빨간불이었고, 수리가 검증 의도를 약화시키지 않았다는 근거는?
- seed 파일이 트리거에 빠지면 어떤 사고가 CI를 통과하나?

## 6. 안 읽어도 되는 세부

- 워크플로 러너 구성·SHA 핀·타임아웃, ON_ERROR_STOP 실측 근거, psql exit code 의미 — PR diff와 계약에 있음.

---

## Appendix A. 과외 이해 체크 기록 (2026-08-12)

### 판정

**통과.** 카드의 이해 체크 4개를 자기 말로 설명했다. 이 판정은 과외 이해 확인이며 `reviewed` 종료나 PR `merge_ready` 판정은 아니다.

### 모기가 설명한 핵심

- `20/20 PASS`는 프로덕션·앱 전체가 안전하다는 뜻이 아니라, 마이그레이션과 seed를 적용한 로컬 DB에서 SQL 검증 20개가 통과했다는 뜻이다.
- CI가 초록이어도 실행 대상에서 제외된 동시성 `.sh` 테스트의 race condition은 남을 수 있다.
- `seed.sql`은 마이그레이션 뒤에 실행되며 blanket `GRANT`로 회수한 권한을 되살릴 수 있다. 최종 권한은 마이그레이션만이 아니라 seed까지 적용된 DB 상태에서 판단해야 한다.
- `to_jsonb(swatches.*)` 42501 회귀는 전체 행 SELECT 요구와 컬럼 단위 GRANT가 충돌한 사건이다. 현재 `create_swatch`·`update_swatch`는 authenticated 공개 컬럼 집합과 RPC 반환 JSON 키 집합을 비교하는 테스트로 잠겨 있다.
- `comparison_assessments.sql`의 선재 실패는 제품 규칙이 틀린 것이 아니라 테스트가 새 커스텀 에러코드(P0403·P0405)와 `owner_uid` 소유권 모델을 못 따라간 것이었다. 에러 기대값과 레거시 픽스처 생성법만 고쳤고 검증 의도는 유지됐다.
- 워크플로 `paths`는 CI 결과를 바꿀 수 있는 입력 목록이다. `seed.sql`이나 워크플로 자신이 빠지면 해당 파일만 바꾼 PR에서 잡이 아예 실행되지 않는다.
- 수리 전 `events_rls_verify.sql`은 결과를 출력만 해서 자바의 `System.out.println()`에 가까웠다. 수리 후 `RAISE EXCEPTION` 단언은 `assertFalse`·`assertEquals` 역할을 한다.
- CI는 오류 문구를 읽지 않고 종료 코드를 본다. `RAISE EXCEPTION`이 SQL 문장을 실패시켜도 기본 `psql`이 계속 실행해 `0`으로 끝날 수 있으므로, `ON_ERROR_STOP=1`로 PostgreSQL 오류 → psql 실패 → GitHub Actions 빨간불을 연결한다.

### 헷갈렸다가 교정된 지점

- 처음에는 `seed.sql`이 마이그레이션보다 먼저 실행된다고 생각했으나, 이 `db reset` 흐름에서는 마이그레이션 전체 뒤에 적용된다는 점을 확인했다.
- 처음에는 RPC의 입력 인자와 반환값을 비교한다고 표현했으나, 실제 비교 대상은 authenticated의 SELECT 허용 컬럼과 RPC 반환 JSON 키다.
- 처음에는 공개 컬럼을 RPC가 빠뜨리면 RPC 자체가 권한 오류를 낸다고 보았으나, 이 경우 RPC는 성공할 수 있고 계약 비교 테스트가 집합 불일치로 실패시킨다는 점을 구분했다.
- 일반적인 미처리 exception처럼 `RAISE EXCEPTION`만으로 프로세스가 실패 종료할 것으로 예상했으나, `psql`의 기본 계속 실행 동작과 `ON_ERROR_STOP`의 역할을 구분했다.

자세한 코드 해설: [PR #500 migration workflow code diff note](../code-diff-notes/2026-08-12-migration-verify-workflow-pr500.md)
