# 모기 리드 리뷰 — PR #331 쓰기 RPC PUBLIC EXECUTE 전수 회수

## Auth 용어 미니 정리

| 말 | DB 입장 | 뜻 |
|---|---|---|
| anon | role = anon | 세션 없는 호출자 |
| guest | role = authenticated, is_anonymous=true | 익명 로그인 세션이 있는 사용자 |
| member | role = authenticated, is_anonymous=false | 일반 로그인 사용자 |

> UI 가 안 보여주는 것과 서버가 막는 것은 다른 문제다.
> anon = 세션 없음, guest = authenticated + is_anonymous=true.

## 1. 승인용 요약

- `[READ]` Postgres 는 함수를 만들면 **PUBLIC(모든 역할)에 실행권을 기본으로 준다.** launch03 은 anon 이름 앞으로 나간 초대장만 회수해서, 세션 없는 호출자가 PUBLIC 문으로 쓰기 RPC 27종을 계속 호출할 수 있었다 — launch03 의 anon 차단 의도가 no-op 이었던 것.
- `[READ]` 이 PR 은 같은 함수 목록에 `REVOKE FROM PUBLIC` 을 전수 적용해 그 문을 닫는다. 게스트·유저는 authenticated role 이라 **앱 기능 무영향**.

## 2. 직접 봐야 할 불변식

- authenticated 실행권 유지 — 게스트 포함 모든 로그인 플로우 무영향.
- anon read 유지 9종 (explore_list, universal_search 등) 은 목록 밖 — 비로그인 탐색·검색 안 깨짐.
- **이 PR 이 못 막는 것**: 내부 auth 가드 없는 실구멍 3종 (`set_shade_texture_traits` 등) 의 *authenticated* 호출. 세션 없는 호출만 닫히고, 내부 가드 보강은 별도 후속.

## 3. 증거 `[EVIDENCE]`

- 로컬 DB rollback 실측: 목록 함수의 PUBLIC EXECUTE **26 → 0** (aclexplode grantee=0 기준) / `create_swatch` authenticated=t·anon=f / `set_shade_texture_traits` anon=f.
- 주의: `proacl LIKE '%=X%'` 텍스트 매칭은 authenticated 항목도 세는 가짜 양성 — 검증은 마이그 주석의 aclexplode 쿼리로.

## 4. 모기가 해야 할 일 `[DECIDE]`

- [ ] **#330 머지·push 후에** 이 PR 머지 → `supabase db push` (순서 바뀌면 #330 push 가 out-of-order 거부됨)
- [ ] push 후 마이그 주석의 검증 쿼리 실행 → **0 rows** 확인

## 5. 판정

- `[STOP]` 없음. `[FOLLOW-UP]` 실구멍 3종 내부 auth 가드 보강 (`rpc-missing-auth-guards` todo 와 같은 결).

`[DETAIL]` 안 읽어도 되는 것: DO-loop SQL 문법, 함수 27종 전체 이름 목록.

---

<details>
<summary>Appendix B. 이해 체크 (주관식 — 답은 세션에서)</summary>

**B1. 막는 것/못 막는 것** — 이 마이그가 적용된 뒤, 로그인한 유저가 `set_shade_texture_traits` 를 API 로 직접 호출하면 어떻게 될까? 이 PR 이 그걸 막아줄까?
(힌트: §2 세 번째 줄 → 어디 보면: 마이그 헤더 주석 10-13행)

**B2. 가짜 리뷰 댓글 반박** — 다음 댓글에 반박해봐: *"이거 적용되면 비로그인으로 구경만 하는 유저가 explore 목록을 못 불러올 텐데요? anon 이 실행할 수 있는 걸 다 회수하잖아요."*
(→ 어디 보면: 마이그 주석 "anon read 유지 9종" + 위 Auth 미니표)

채점은 답하면 세션에서: 정답 / 부분 이해 / 다시 보기.

</details>

## Appendix A. 승인 중 생긴 질문 (2026-07-08, 모기 → Claude 답)

### Q1. anon 이 세션 없는 호출자 아니었어? launch03 에서 그럼 뭘 한 거지. 게스트 세션이 anon 이 아니라 authenticated 였나?

- 답: 헷갈린 두 축을 분리하면 풀려.
  - **게스트 = authenticated 맞아.** 익명 로그인이라도 세션이 생기는 순간 role 은 authenticated 야. anon 은 "세션 자체가 없는 호출자" (예: 로그인 없이 API 만 직접 두드리는 스크립트). 네 마지막 문장이 정답.
  - **launch03 이 한 일**: 함수 실행권을 문 2개로 생각해 — ① anon 이름 앞으로 나간 개인 초대장, ② PUBLIC 이라는 "아무나 입장" 공용문. launch03 은 ①만 회수했어. 방향은 맞았는데, Postgres 가 함수 만들 때 ②를 기본으로 열어놓는다는 걸 놓쳐서 세션 없는 호출자가 공용문으로 계속 들어올 수 있었던 것. 그래서 "의도는 맞고 실효가 없던(no-op)" 수리였고, 이번 PR 이 ②를 닫는 거야.
- blocker 여부: 아님 (이해 질문 — 다만 이 축이 권한 카드마다 나오니 Auth 미니표를 계속 상단 고정).

## Appendix B-채점. 이해 체크 답안 채점 (2026-07-08, Claude)

### B1 — "이 PR 로 못 막는대, 후속 작업으로 해야 된대"

- **판정: 정답.** 핵심 맞음 — 이 PR 은 세션 없는 호출자의 문만 닫고, 로그인 유저의 `set_shade_texture_traits` 직접 호출은 못 막는다. 내부 가드 보강이 후속.
- 보충 두 가지:
  - "못 막는다" 의 실제 의미까지 잡아두자: 그 호출은 **실제로 성공해서 데이터가 써져.** 함수에 내부 auth 가드가 없고 definer 권한으로 돌거든 — 그래서 "실구멍"이라고 부르는 거야.
  - 게스트도 authenticated 라서 **게스트 세션으로도 호출 가능**해. 후속 가드를 만들 때 "로그인 유저만" 이 아니라 "어떤 유저에게 허용할지" 를 정해야 하는 이유.

### B2 — "게스트 세션이면 anon 이 아니라 authenticated 일걸"

- **판정: 부분 이해.** 말한 사실 자체는 맞아 (게스트 = authenticated — Q1 과 같은 축). 그런데 가짜 댓글의 핵심 반박으로는 과녁이 살짝 옆이야.
- 빠진 핵심: 가짜 댓글의 "비로그인 구경 유저" 는 세션이 아예 없을 수 있어 — 즉 진짜 anon. 그런 유저도 explore 가 되는 이유는 게스트 논리가 아니라, **회수 목록이 쓰기·admin·내부 RPC 만이고 `explore_list`·`universal_search` 같은 anon read 9종은 목록 밖 (불변)** 이기 때문이야. 이게 1순위 반박이고, "게스트는 어차피 authenticated" 는 2순위 보강.
- 위험한 오해로 번질 지점: "구경 유저도 다 authenticated" 로 기억하면, 나중에 anon read 함수를 회수 목록에 잘못 넣어도 "괜찮겠지" 하고 넘어가게 됨 — 그때 진짜로 비로그인 탐색이 깨져.

### 총평

- 정답 1 / 부분 이해 1 / 다시 보기 0. anon vs 게스트 축은 Q1 답으로 닫혔고, B2 의 빠진 핵심 (anon read 9종 유지) 이 이 카드의 다시 볼 [READ] — §2 두 번째 줄.
- 다음 [READ] 후보: "회수 목록에 뭐가 들어가고 뭐가 절대 들어가면 안 되는지" (read 9종 목록) — 다음 권한 카드에 표로 고정.
- 승인 관점: 두 카드 이해 체크 완료 (330: 정답 2 · 331: 정답 1 + 부분 이해 1, 오해 정정됨). [DECIDE] 체크박스 (머지 순서 · db push · UAT) 만 남음.