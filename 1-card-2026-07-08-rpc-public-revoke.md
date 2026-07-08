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
