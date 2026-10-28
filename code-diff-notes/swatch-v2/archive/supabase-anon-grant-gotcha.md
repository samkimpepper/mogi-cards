# Supabase 함수 권한 함정 — anon EXECUTE 는 default 직접 grant

> 발견 맥락: 42-03 assessment 모델 RPC SQL integration test 의 `FAIL[P1]` (2026-06-25).

## 한 줄

Supabase 는 public 스키마에 새로 만든 함수에 **`anon` / `authenticated` 에게 EXECUTE 를 default 로 *직접* grant** 한다(`ALTER DEFAULT PRIVILEGES` 설정). 그래서 `GRANT EXECUTE ... TO authenticated` 만 해도 **anon 이 이미 EXECUTE 권한을 가진다.** anon 을 막으려면 `REVOKE EXECUTE ... FROM anon` 을 **명시**해야 한다.

## 왜 헷갈리나

- PostgreSQL 순정: `CREATE FUNCTION` → PUBLIC 에 EXECUTE default. 이건 `REVOKE FROM PUBLIC` 으로 지운다.
- 그런데 Supabase 는 그 위에 anon/authenticated 에게 **직접** grant 까지 건다. 이건 PUBLIC 멤버십 경유가 아니라 role 직접 grant 라서, `REVOKE FROM PUBLIC` 으로는 **안 지워진다.**
- 결과: `REVOKE FROM PUBLIC` 만 하면 `has_function_privilege('anon', fn, 'EXECUTE')` 가 여전히 true.

## 진단 SQL

```sql
-- anon 이 grantee 로 직접 있는지 확인
SELECT grantee, privilege_type
FROM information_schema.role_routine_grants
WHERE routine_name = '<함수명>'
ORDER BY grantee;
-- anon 이 grantee 로 나오면 = 직접 grant. REVOKE FROM anon 필요.
```

42-03 에서 실측 결과: `anon / authenticated / postgres / service_role` 넷 다 EXECUTE grantee 였음.

## fix 패턴 (새 SECURITY DEFINER RPC 만들 때마다)

```sql
-- 함수 생성 후
REVOKE EXECUTE ON FUNCTION <함수명>(<인자 타입들>) FROM anon;
GRANT  EXECUTE ON FUNCTION <함수명>(<인자 타입들>) TO authenticated;
-- authenticated 는 정상 호출자라 유지. service_role/postgres 도 유지.
-- (REVOKE FROM PUBLIC 은 사실상 무효였음 — anon 직접 grant 라서.)
```

- 실제 우회는 함수 내부 `auth.uid() IS NULL / is_anonymous → 42501` 가드로도 막히지만,
  anon 의 **함수 진입 자체**를 막는 게 defense-in-depth + SPEC 요구(42-03-SPEC "anon/public EXECUTE revoke").

## 영향 범위 (점검 후보)

- 이 default grant 는 **모든** public 스키마 SECURITY DEFINER RPC 에 적용된다.
- 즉 기존 RPC 들(`create_dupe_pair`, `toggle_dupe_pair`, `add_comparison_note`,
  `update/delete_comparison_note`, `verify_twitter_handle`, ...)도 **anon EXECUTE 가 열려 있을 가능성이 높다.**
  내부 auth 가드로 방어되고 있을 뿐, EXECUTE 권한 자체는 회수 안 됐을 것.
- 전수 점검 쿼리:
  ```sql
  SELECT routine_name
  FROM information_schema.role_routine_grants
  WHERE grantee = 'anon' AND privilege_type = 'EXECUTE'
    AND specific_schema = 'public'
  ORDER BY routine_name;
  ```

## 42-03 에서 한 조치

- `20260625000300_..._revoke_public.sql` — REVOKE FROM PUBLIC (효과 없었음, 진단 전 추측 fix).
- `20260625000400_..._revoke_anon.sql` — REVOKE FROM anon (실제 fix).
- 다음에 비슷한 RPC 마이그를 처음부터 쓸 때는 `REVOKE FROM anon` 을 GRANT 옆에 바로 둘 것.
