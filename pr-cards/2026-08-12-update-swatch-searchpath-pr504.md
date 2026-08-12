---
reviewed: false
merge_ready: false
---

# 카드 — update_swatch search_path 고정 (PR #504, 소형 위생 마이그레이션)

작성: 냐옹이 Gen 5, 2026-08-12. 원문 SSOT: PR #504 + 계약(swatch-ops/contracts/2026-08-12-update-swatch-searchpath.md). 2파일짜리 소형이라 카드도 얇게. 교차 리뷰는 규모 미달로 생략(마스터 판단).

## 1. 반드시 읽을 결정

- DB 함수 `update_swatch`에 **"public 폴더만 봐라"**(`SET search_path = public`)를 못 박는다 — 쓰기 함수 3형제 중 얘만 안 박혀 있었다(2026-06 원 정의부터). 위험도는 낮지만(권한 상승형 아님) 함수가 뭘 읽고 쓸지가 호출자 손에 있는 상태 자체가 위생 결함.
- 방식이 배울 거리다: 함수를 재정의(CREATE OR REPLACE)하지 않고 **속성만 바꿈**(ALTER FUNCTION) — 재정의하면 같은 본문의 세 번째 사본이 생기고, "사본끼리 조용히 갈라지는 것"이 지난 P0의 사고 유형이었다. 마이그레이션 주석에 이 판단 근거 전문 + 롤백 한 줄이 있다.
- 구조 검증 승격: 이제 세 함수 중 **하나라도 고정이 풀리면 CI가 죽는다** (기존엔 update_swatch만 NOTICE 관찰).

## 2. 네가 결정할 것 + 할 일

- 머지 여부 (퀴즈 후, 네 손).
- **머지 후 원격 db push — 런북 첫 실사용이다** (swatch-ops/docs/runbooks/remote-db-apply.md). 순서 요약: ① 이 PR CI 초록 확인(됨) ② `supabase db push --dry-run`으로 적용 목록이 이 마이그 1개인지 대조 ③ push (출력 보존) ④ **PR 본문의 "원격 재실행 검증" 쿼리 실행** — 셋 다 `search_path=public` 나오면 성공 ⑤ 결과 나한테 알려주면 기록. 막히면 언제든 호출.

## 3. 위험한 가정

- 이 변경은 정책 스냅샷 표에 **안 뜬다** — 스냅샷 4절은 SECURITY DEFINER 함수만 다루는데 update_swatch는 INVOKER라서. 회귀 감시는 승격된 하드 판정이 맡는다(워커 정직 보고, 스냅샷 확장은 별도 검토거리로 남김).
- 롤백은 마이그레이션 주석의 `RESET search_path` 한 줄 — 되돌릴 수 있는 변경이다.

## 4. 증명된 증거 (마스터 독립 재측정 포함)

- 체크 6개 전부 결론(pending 0)·스레드 0·MERGEABLE CLEAN·migration-verify SUCCESS — 마스터 재측정. 마이그·검증 diff 전문 정독.
- 워커 실측: reset 후 스위트 20/20 PASS, 차단 재현 1회(고정 해제 → EXCEPTION → 원복). 정직 보고 2건(스위트 20개 — 계약의 21은 마스터 산수 오류 / 스냅샷 비표시와 근거).

## 5. 이해 체크 골격 (과외냥이 몫)

- search_path를 고정 안 하면 무슨 일이 가능한가? 왜 update_swatch는 위험도가 "낮다"고 하나?
- 왜 CREATE OR REPLACE가 아니라 ALTER FUNCTION인가 — 지난 P0와 무슨 관계?
