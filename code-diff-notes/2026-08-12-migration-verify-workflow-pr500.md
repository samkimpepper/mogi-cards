---
reviewed: false
---

# 모기 code diff note — `migration-verify.yml` 읽기

날짜: 2026-08-12

재료: swatch-v2 PR #500 · 브랜치 `samkimpepper/rls-ci-harness` · 커밋 `1df2014` · `.github/workflows/migration-verify.yml`

## 한 줄 결론

이 워크플로는 DB 관련 파일이 바뀐 PR마다 GitHub 러너 안에 임시 Supabase를 만들고, **마이그레이션 전체와 seed를 적용한 최종 로컬 DB 상태**에서 SQL 검증 스크립트를 실행한다.

초록불이 뜻하는 것은 아래뿐이다.

> 빈 로컬 DB에 현재 저장소의 마이그레이션과 seed를 처음부터 적용할 수 있었고, 그 결과에서 `supabase/tests/*.sql` 검증이 모두 통과했다.

실제 앱 동선, 프로덕션 기존 데이터, CI에서 제외된 동시성 검증까지 안전하다는 뜻은 아니다.

## 전체 실행 순서

```text
DB 관련 파일이 바뀐 PR
→ 저장소 checkout
→ Supabase CLI 설치
→ 임시 로컬 Supabase 시작
→ 로컬 DB reset
→ 마이그레이션 전량 적용
→ seed.sql 적용
→ SQL 검증 스크립트 전량 실행
→ 하나라도 실패하면 GitHub 체크를 빨간불로 종료
```

`supabase start`는 마이그레이션보다 먼저 실행되지만, `seed.sql`은 마이그레이션보다 먼저 깔리는 바탕이 아니다. 이 워크플로의 `db reset`에서는 마이그레이션 전체가 적용된 **뒤** seed가 실행된다.

## 주니어 백엔드 개발자로서 볼 부분

### 1. 언제 실행되는가 — `on.pull_request.paths` (17~29줄)

```yaml
on:
  pull_request:
    paths:
      - "supabase/migrations/**"
      - "supabase/tests/**"
      - "supabase/config.toml"
      - "supabase/seed.sql"
      - ".github/workflows/migration-verify.yml"
```

중요한 질문은 “DB 최종 결과에 영향을 주는 입력이 트리거에서 빠졌나?”다.

- migrations: DB 변경 이력
- tests: 검증 코드 자체
- config: reset과 seed 실행 방식에 영향
- seed: 데이터뿐 아니라 권한에도 영향
- workflow: CI 구현 자체

워크플로 파일도 트리거에 넣지 않으면 워크플로를 고친 바로 그 PR에서 새 동작을 실측하지 못한다.

### 2. 어떤 DB를 검사하는가 — `supabase start`와 `db reset` (60~67줄)

```yaml
- name: Start local stack
  run: supabase start -x studio,imgproxy,edge-runtime,inbucket

- name: Reset database (migrations + seed)
  run: supabase db reset
```

GitHub 러너 안에서 생겼다가 사라지는 로컬 DB다. 프로덕션 자격증명은 쓰지 않는다.

`db reset`이 확인하는 것은 “지금 내 컴퓨터 DB에서 되나?”보다 더 구체적이다.

> 과거 마이그레이션부터 현재 마이그레이션까지 전부 다시 재생해서 빈 DB를 만들 수 있는가?

하지만 프로덕션의 실제 행과 데이터 분포는 없으므로, 프로덕션 데이터에만 의존하는 오류는 이 잡이 증명하지 못한다.

### 3. SQL 오류가 진짜 빨간불이 되는가 — `ON_ERROR_STOP` (69~112줄)

```bash
docker exec -i "$DB_CONTAINER" psql -U postgres -d postgres \
  -v ON_ERROR_STOP=1 -f - < "$f"
```

SQL에서 오류나 `RAISE EXCEPTION`이 발생해도 `psql`의 종료 코드가 성공으로 남으면 GitHub는 초록불로 볼 수 있다. `-v ON_ERROR_STOP=1`은 SQL 오류가 발생했을 때 `psql`도 실패 코드로 끝나게 연결한다.

그 뒤 워크플로는 모든 SQL 파일을 순회한다.

```text
각 SQL 실행
→ 성공 수와 실패 파일을 기록
→ 실패 파일이 하나라도 있으면 exit 1
→ GitHub 체크 빨간불
```

여기서 읽어야 하는 핵심은 **SQL 단언 실패 → psql 실패 코드 → 셸 `exit 1` → CI 실패**라는 실패 전파 사슬이다.

### 4. 테스트를 실행하는 것과 제대로 검사하는 것은 다르다

워크플로가 어떤 SQL 파일을 실행해도, 그 파일이 값만 출력하고 틀린 상태에서 `EXCEPTION`을 내지 않으면 영원히 초록일 수 있다.

PR #500 전의 `events_rls_verify.sql`이 그 사례였다. 파일은 실행됐지만 판정 단언이 없었다. PR #500에서 단언 16개를 넣어, 권한이 어긋나면 스크립트 자체가 실패하도록 바꿨다.

수리 전 파일은 이런 조회를 실행했다.

```sql
SELECT has_function_privilege(
  'anon',
  'public.touch_last_seen()',
  'EXECUTE'
) AS anon_can_execute;
```

기대값은 `false`지만 실제 결과가 `true`여도 `SELECT` 문장은 정상 실행된 것이다. 사람은 출력표를 보고 잘못됐다고 알아낼 수 있지만, CI는 출력의 뜻을 읽지 않는다.

자바로 비유하면 수리 전은 아래에 가깝다.

```java
System.out.println(anonCanExecute);
```

PR #500에서는 조회 결과를 기대값과 비교하는 자기 판정을 붙였다.

```sql
IF has_function_privilege(
  'anon',
  'public.touch_last_seen()',
  'EXECUTE'
) THEN
  RAISE EXCEPTION 'FAIL: anon 에 touch_last_seen EXECUTE 잔존';
END IF;
```

자바로 치면 다음과 같다.

```java
assertFalse(anonCanExecute);
assertEquals(Set.of("INSERT", "SELECT"), authenticatedPrivileges);
```

수리된 단언은 다음 같은 계약을 검사한다.

- `events` RLS 정책은 정해진 2개뿐이고 UPDATE·DELETE 정책은 없음
- 클라이언트 역할에 UPDATE·DELETE·TRUNCATE·REFERENCES·TRIGGER 권한 없음
- 실효 권한은 `authenticated = {INSERT, SELECT}`, `anon = {}`와 정확히 같음
- `created_at` 강제 트리거는 정확히 하나이고 활성 상태
- `touch_last_seen`은 `SECURITY DEFINER`이고 `search_path=public` 고정
- 함수 실행권은 `anon`에게 없고 `authenticated`에게 있음

### 4-1. `RAISE EXCEPTION`만으로는 왜 부족한가

실패는 아래 세 층을 모두 건너야 CI 빨간불이 된다.

```text
PostgreSQL 문장
→ psql 프로세스
→ GitHub Actions
```

`RAISE EXCEPTION`은 PostgreSQL 안의 현재 SQL 문장을 실패시킨다. 그러나 기본 `psql`은 오류를 출력한 뒤 다음 문장을 계속 실행하고, 파일 끝에서 성공 종료 코드 `0`을 돌려줄 수 있다.

자바 비유:

```java
try {
    runSql();
} catch (SQLException e) {
    e.printStackTrace();
    // 다시 throw하지 않음
}
System.exit(0);
```

그러면 GitHub Actions는 빨간 `ERROR` 로그의 의미가 아니라 프로세스 종료 코드 `0`을 보고 초록으로 판정한다.

`-v ON_ERROR_STOP=1`을 주면 SQL 오류가 난 즉시 `psql`도 실패 코드로 종료한다. PR #500의 실측은 플래그 없이 `exit 0`, 플래그를 주면 `exit 3`이었다.

```text
잘못된 DB 상태
→ IF 단언이 RAISE EXCEPTION
→ ON_ERROR_STOP이 psql을 실패 코드로 종료
→ 워크플로가 실패 파일을 기록
→ 마지막 exit 1
→ GitHub Actions 빨간불
```

즉 다음 셋은 서로 다른 사건이고, 연결을 코드로 만들어야 한다.

```text
오류 메시지가 출력됨
≠ 프로그램이 실패 코드로 종료됨
≠ CI가 실패함
```

따라서 CI 리뷰에서는 두 질문을 분리한다.

```text
1. 테스트 파일이 실행되는가?
2. 틀린 상태를 넣었을 때 테스트 파일이 실제로 실패하는가?
```

### 5. 의도적으로 빠진 검증은 무엇인가 — 73줄

루프는 `supabase/tests/*.sql`만 실행한다. 여러 DB 세션을 동시에 띄우는 동시성 재현용 `.sh` 두 개는 제외한다.

따라서 `20/20 PASS`여도 다음은 남을 수 있다.

- 여러 요청이 동시에 들어올 때만 발생하는 race condition
- 프로덕션의 기존 데이터 때문에 발생하는 오류
- 실제 앱이 RPC를 잘못 호출하는 오류
- 테스트 파일에 단언 자체가 빠진 오류

모기가 “CI가 모두 초록이어도 앱 오류가 날 수 있는 예”로 **동시성 관련 오류**를 바로 찾아냈다.

## `seed.sql` 권한 함정

모기가 처음 예상한 순서는 “seed가 먼저, 마이그레이션이 나중”이었지만 이 로컬 reset 흐름은 반대다.

```text
마이그레이션: 위험한 권한 REVOKE
→ seed.sql: blanket GRANT
→ 앞에서 회수한 권한이 다시 열릴 수 있음
→ seed.sql 아래쪽: 필요한 권한을 다시 REVOKE
```

현재 브랜치의 `supabase/seed.sql:303~304`에는 아래와 같은 넓은 권한 부여가 있다.

```sql
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated, service_role;
```

그래서 같은 파일 아래쪽에서 다시 세밀하게 권한을 회수한다. 예를 들면:

- `events`는 `SELECT`, `INSERT`만 다시 부여
- 소유권 테이블 5개는 `anon`의 `INSERT`, `UPDATE`, `DELETE` 회수
- 클라이언트 역할의 `TRUNCATE`, `REFERENCES`, `TRIGGER` 회수
- `anon`의 시퀀스 권한 회수
- `swatches.removal_requested_at`을 제외한 컬럼만 읽도록 재부여
- `shade_images`의 `anon` 쓰기 권한 회수

따라서 `seed.sql`은 이 저장소에서 단순 샘플 데이터 파일이 아니다. **최종 유효 권한(effective privileges)을 결정하는 보안 코드**이기도 하다.

권한 부분은 수정 금지 구역은 아니지만 다음처럼 취급해야 한다.

```text
마이그레이션의 권한 의도 확인
→ seed의 blanket GRANT 영향 확인
→ 필요한 재-REVOKE를 함께 수정
→ db reset
→ 권한 검증 SQL 실행
```

마이그레이션에 `REVOKE`가 적혀 있다는 사실은 의도와 변경 이력의 증거다. 실제 권한이 닫혔다는 증거는 마이그레이션과 seed가 모두 적용된 DB의 최종 상태에서 얻어야 한다.

## 실행 시간이 약 3분인 이유

매번 컨테이너를 시작하고, 마이그레이션 147개와 seed를 적용하고, SQL 검증 스크립트 20개를 실행한다. PR #500 카드의 실제 측정은 전체 약 2분 48초다.

비용을 줄이기 위해 다음 장치가 있다.

- DB 관련 경로가 바뀐 PR에서만 실행
- Studio, imgproxy 등 스키마 검증에 불필요한 서비스 제외
- 같은 PR에 새 커밋이 오면 이전 실행 취소
- 20분 timeout으로 멈춘 실행 제한

즉 모든 PR마다 약 3분을 쓰는 것이 아니라, DB 최종 상태에 영향을 줄 수 있는 PR에만 쓴다.

## YAML 밖에 있는 머지 게이트

이 워크플로는 실패했을 때 빨간 체크를 만드는 역할을 한다. 빨간 체크가 있는 PR의 머지 버튼을 실제로 잠그는 것은 GitHub branch protection의 required check 설정이다.

```text
워크플로
→ 성공 또는 실패 판정 생성

branch protection
→ 그 판정을 머지 필수 조건으로 사용할지 결정
```

따라서 워크플로가 존재하는 것과 실패 시 머지가 금지되는 것은 서로 다른 설정이다.

## 다음에 CI YAML을 읽는 순서

1. `on`: 어떤 변경에서 실행되고 무엇이 빠졌는가?
2. `permissions`: 필요 이상 권한을 갖는가?
3. 환경 준비: 어떤 서비스와 버전을 사용하는가?
4. 상태 준비: 테스트 전에 DB를 어떤 순서로 만드는가?
5. 검증 범위: 어떤 테스트 파일을 포함하고 제외하는가?
6. 실패 전파: 내부 오류가 최종 `exit 1`까지 연결되는가?
7. 외부 게이트: 실패 체크가 실제 머지를 막도록 저장소가 설정됐는가?

셸 문법을 전부 외우는 것보다 이 일곱 경계를 읽는 것이 백엔드 CI 리뷰에서 더 중요하다.
