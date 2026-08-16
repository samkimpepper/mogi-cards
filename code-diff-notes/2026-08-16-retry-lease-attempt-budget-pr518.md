---
reviewed: false
merge_ready: false
---

# 모기 code diff note — 재시도 횟수와 lease를 분리하는 이유

날짜: 2026-08-16

재료: swatch-v2 PR #518 · `app/api/swatch-media-retry.ts` · `app/server/swatchMediaService.ts` · `supabase/migrations/20260814100000_swatch_media_model.sql`

## 모기의 질문

> `retry_count`랑 또 다른 변수 하나를 더 써야 한다는 거지? 그리고 몇 장씩 나눠서 시도해야 하나?

## 한 줄 결론

`retry_count`는 **실제로 복사를 시작한 횟수**, lease는 **어느 워커가 잠시 맡았는지**를 기록해야 한다. 여러 사진의 횟수를 먼저 차감한 뒤 순차 처리하지 말고, 소수 워커가 한 장씩 lease해 함수의 실행시간 안에서만 처리해야 서버가 중간에 죽어도 미시도 사진이 재시도 기회를 잃지 않는다.

이 문서의 개선 코드는 원리를 보여주는 축약 예제다. PR #518 fix의 최종 SQL·함수 이름을 미리 정하는 SSOT나 그대로 붙여 넣는 완성 구현은 아니다.

## 현재 PR #518에서 생기는 일

현재 서버 코드는 먼저 due 행을 한꺼번에 가져온 뒤 한 장씩 처리한다.

```ts
const due = await claimDue(service, limit)

for (const row of due) {
  await copyOne(row.swatchId, row, deps)
}
```

기본 `limit`은 50이고 최대 200이다.

```ts
const DEFAULT_LIMIT = 50
const MAX_LIMIT = 200
```

문제는 `claimDue`가 반환하기 전에 선택된 모든 행의 횟수를 먼저 올린다는 점이다.

```sql
UPDATE swatch_media m
   SET retry_count     = m.retry_count + 1,
       last_attempt_at = now()
  FROM due
 WHERE m.id = due.id
RETURNING m.id, m.swatch_id, m.idx, m.source_url, m.retry_count;
```

사진당 네트워크 타임아웃이 최대 30초이므로 50장을 순차 처리하는 최악 실행시간은 25분이다. PR이 전제한 Vercel Hobby의 함수 실행 한도보다 길다. 공식 한도 문서: `https://vercel.com/docs/functions/configuring-functions/duration`.

## 실패 시나리오

50장이 모두 첫 자동 재시도 시점에 도달했다고 가정한다.

```text
시작 전
사진 1~50: retry_count = 0

claim 직후
사진 1~50: retry_count = 1

서버가 순차 처리
사진 1~10: 실제 다운로드 시도
사진 11~50: 아직 미시도

함수 실행 한도 도달
사진 11~50도 retry_count = 1인 채 종료
```

같은 일이 반복되면 일부 사진은 실제 다운로드를 한 번도 시작하지 않았는데 `retry_count = 4`가 되어 자동 재시도 대상에서 빠질 수 있다.

```text
첫 배치:  50장 선차감 → 10장 처리 → 40장 미처리
둘째 배치: 40장 선차감 → 10장 처리 → 30장 미처리
셋째 배치: 30장 선차감 → 10장 처리 → 20장 미처리
넷째 배치: 20장 선차감 → 10장 처리 → 10장 미처리·상한 소진
```

더 단순하게는 claim 직후 프로세스가 죽을 수도 있다.

```text
50장 횟수 차감
실제 시도 0장
```

데이터가 자동 삭제되지는 않지만 자동 복구가 조기에 멈추고, 정상적으로 복구될 사진이 원작자의 `사진 다시 가져오기` 작업으로 밀린다.

## 두 개념을 분리한다

| 값 | 뜻 | 언제 바뀌나 |
|---|---|---|
| `retry_count` | 실제 복사를 시작한 횟수 | 네트워크 작업을 시작하기 직전 |
| `lease_until` | 현재 워커가 이 사진을 맡을 수 있는 만료 시각 | claim할 때 설정, 성공·실패 때 해제 |
| `lease_token` | 현재 lease의 번호표 | claim할 때 새 값, 결과 기록 때 소유권 확인 |

`lease_until`만 두면 만료 뒤 새 워커가 사진을 다시 잡았을 때 늦게 살아난 옛 워커가 새 결과를 덮을 수 있다. `lease_token`까지 확인하면 옛 워커의 성공·실패 기록은 0행 update로 거부된다.

## 1. lease 컬럼 예제

```sql
ALTER TABLE swatch_media
  ADD COLUMN lease_token uuid,
  ADD COLUMN lease_until timestamptz;
```

## 2. 사진 한 장을 잠시 빌리는 예제

claim은 맡았다는 표시만 하고 `retry_count`를 올리지 않는다.

```sql
-- 이해용 축약 예제
CREATE FUNCTION swatch_media_claim_one()
RETURNS TABLE (
  id uuid,
  source_url text,
  lease_token uuid
)
AS $$
DECLARE
  new_token uuid := gen_random_uuid();
BEGIN
  RETURN QUERY
  WITH candidate AS (
    SELECT m.id
      FROM swatch_media m
     WHERE m.status IN ('pending_upload', 'pending_download')
       AND m.retry_count < 4
       AND (m.lease_until IS NULL OR m.lease_until < now())
     ORDER BY m.last_attempt_at
     FOR UPDATE SKIP LOCKED
     LIMIT 1
  )
  UPDATE swatch_media m
     SET lease_token = new_token,
         lease_until = now() + interval '2 minutes'
    FROM candidate c
   WHERE m.id = c.id
  RETURNING m.id, m.source_url, m.lease_token;
END;
$$ LANGUAGE plpgsql;
```

claim 뒤 실제 작업 전에 서버가 죽으면 `retry_count`는 그대로다. 2분 뒤 lease가 만료되면 다른 워커가 다시 잡을 수 있다.

## 3. 실제 시도 직전에만 횟수를 올리는 예제

```sql
-- 이해용 축약 예제
CREATE FUNCTION swatch_media_begin_attempt(
  p_id uuid,
  p_lease_token uuid
)
RETURNS boolean
AS $$
  UPDATE swatch_media
     SET retry_count = retry_count + 1,
         last_attempt_at = now()
   WHERE id = p_id
     AND lease_token = p_lease_token
     AND lease_until > now()
     AND retry_count < 4
  RETURNING true;
$$ LANGUAGE sql;
```

이 RPC까지 통과한 뒤 서버가 죽으면 횟수 하나를 쓰는 것이 맞다. 실제 네트워크 시도를 시작했기 때문이다.

## 4. 성공·실패 결과는 같은 token만 기록한다

성공 예제:

```sql
UPDATE swatch_media
   SET status = 'stored',
       object_key = p_object_key,
       lease_token = NULL,
       lease_until = NULL
 WHERE id = p_id
   AND lease_token = p_lease_token;
```

실패 예제:

```sql
UPDATE swatch_media
   SET status = p_failure_status,
       lease_token = NULL,
       lease_until = NULL
 WHERE id = p_id
   AND lease_token = p_lease_token;
```

lease가 만료되어 새 워커가 새 token을 받은 뒤라면 옛 token의 update는 0행이므로 최신 상태를 덮지 않는다.

## 5. 50장을 선점하지 않는 서버 예제

고정된 10장을 먼저 잡는 방식도 안전하지 않다. 사진당 30초라면 10장 순차 처리만으로 5분이고 DB·업로드·응답 시간을 위한 여유가 없다.

대신 소수 워커가 한 장씩 빌리고, 함수 종료 전에는 새 사진을 잡지 않는다.

```ts
const STOP_CLAIMING_AT = Date.now() + 4 * 60_000

async function retryWorker() {
  while (Date.now() < STOP_CLAIMING_AT) {
    const row = await claimOne()
    if (!row) return

    const started = await beginAttempt(row.id, row.leaseToken)
    if (!started) continue

    try {
      const copied = await copyImage(row.sourceUrl)

      await markStored({
        id: row.id,
        leaseToken: row.leaseToken,
        objectKey: copied.objectKey,
      })
    } catch (error) {
      await markFailed({
        id: row.id,
        leaseToken: row.leaseToken,
        stage: classifyFailure(error),
      })
    }
  }
}

await Promise.all([
  retryWorker(),
  retryWorker(),
  retryWorker(),
])
```

이 예제는 동시에 최대 세 장만 lease한다. 이미 빌린 사진을 끝낼 시간까지 감안해 `STOP_CLAIMING_AT`은 함수의 절대 종료 시각보다 앞에 둔다.

## before / after

```text
before
50장 선차감
→ 순차 처리
→ 함수 종료
→ 미시도 사진도 횟수 손실

after
최대 3장만 lease
→ 실제 시작 직전에만 횟수 차감
→ 완료하면 lease 해제
→ 서버가 죽으면 미시도 lease는 만료 뒤 회수
```

## fix가 증명해야 하는 것

최종 구현의 함수명과 배치 크기는 달라질 수 있지만 아래 행동은 테스트로 고정해야 한다.

1. claim 후 실제 시도 전 크래시: `retry_count`가 늘지 않고 lease 만료 뒤 다시 잡힌다.
2. 실제 시도 시작 후 크래시: 횟수는 한 번만 늘고, 만료·재시도 간격 뒤 다시 잡힌다.
3. 옛 `lease_token`: 새 워커의 성공·실패 결과를 덮지 못한다.
4. 함수 종료 직전: 새 행을 과다 claim하지 않는다.
5. 여러 워커 동시 실행: 같은 media 행을 동시에 처리하지 않는다.
6. 상한 4회: 실제 시작된 시도만 센다.

## 기억할 문장

> lease는 “누가 잠시 맡았나”, retry count는 “실제로 몇 번 해봤나”다. 둘을 한 숫자로 표현하면 워커 장애가 사용자 사진의 재시도 기회를 먹는다.
