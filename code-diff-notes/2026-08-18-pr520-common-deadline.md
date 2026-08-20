---
reviewed: false
---

# PR #520 code diff note — 공통 마감은 어떻게 코드 안으로 들어갔나

날짜: 2026-08-18

대상 PR: #520

판독한 핵심 커밋:

- fix2 `cdfb1b3` — Storage 요청 상한 + 두 작업의 공통 마감
- fix3 `b5a4cad` — 남은 마감을 사진 다운로드·업로드 안쪽까지 전달
- fix4 `2262da5` — 수명주기 작업의 Storage 요청마다 남은 시간을 다시 계산

이 문서는 정식 Review Gate Quiz 답안지가 아니다.

모기가 fix2 한줄읽기 공책에서 남긴 질문을 실제 diff와 연결한 학습 노트다.

> 처음에는 그냥 0.1초 남아도 10초가 된 건 아니니까 시작시켜버린 건데, 지금은 요청이 1.2초 내에 끝나게 감시한다는 거지?

## 먼저 답

fix2만 놓고 보면 거의 맞다.

```text
작업 시작 전: 예산이 남았는지 확인
+ 시작된 수명주기 Storage 요청: 최대 1.2초 뒤 중단
+ 두 작업: 같은 9초 결승선을 기준으로 남은 시간 계산
```

다만 fix2의 1.2초는 고정값이었다.

공통 마감까지 0.1초밖에 안 남아도 수명주기 Storage 요청이 1.2초 상한으로 시작할 여지가 있었다.

사진 다운로드·업로드도 이미 시작한 뒤에는 fix2의 공통 마감을 끝까지 보지 못했다.

그래서 최종 모양은 세 단계로 완성됐다.

```text
fix2: 모두가 볼 공통 결승선을 만든다
fix3: 사진 다운로드·업로드가 그 결승선을 직접 본다
fix4: 숨김·복구·삭제의 각 Storage 요청도 매번 결승선까지 남은 시간을 다시 본다
```

- [ ] fix2에서 공통 마감의 기준을 만들었다.
- [ ] 이미 시작한 모든 요청을 그 마감 안에 가두는 일은 fix3·fix4까지 이어졌다.

---

## 1. 전체 변경 지도

### fix2 `cdfb1b3`

```text
app/api/swatch-media-lifecycle.ts              +20/-3
app/api/swatch-media-retry.ts                  +36/-6
app/server/swatchMediaLifecycle.test.ts         +51/-0
app/server/swatchMediaLifecycle.ts              +25/-3
app/server/swatchMediaService.budget.test.ts    +81/-0
app/server/swatchMediaService.ts                +56/-1
```

### fix3 `b5a4cad`

```text
app/api/swatch-media-retry.ts                  +75/-13
app/server/swatchMediaCopy.test.ts              +55/-0
app/server/swatchMediaCopy.ts                   +51/-2
app/server/swatchMediaService.ts                +91/-12
```

### fix4 `2262da5`

```text
app/api/swatch-media-lifecycle.ts                +6/-5
app/server/swatchMediaLifecycle.test.ts          +51/-2
app/server/swatchMediaLifecycle.ts               +24/-10
```

생성·삭제·이름 변경 파일은 없다.

fix2에서 새로 생성된 테스트 파일은 `app/server/swatchMediaService.budget.test.ts`다.

---

## 2. fix2 — 공통 결승선을 한 개 만든다

### 변경 전

수명주기 소비와 사진 재시도는 각자 자기 시작 시각부터 예산을 셌다.

```text
함수 시작
→ 수명주기 최대 4초
→ 사진 재시도가 새 시계를 시작해 최대 8초
→ 합계 최대 12초
```

함수 전체 실행 상한은 10초로 계산하고 있었으므로 둘을 그대로 더할 수 없었다.

### 실제 raw diff — 공통으로 남은 시간

파일: `app/api/swatch-media-retry.ts`

```diff
+/** 이 호출이 끝나 있어야 하는 시각까지 남은 ms (fix2 발견물 1 (b)). */
+function remainingMs(startedAt: number): number {
+  return FUNCTION_LIMIT_MS - RUNTIME_RESERVE_MS - (Date.now() - startedAt)
+}
```

한 줄씩 풀면 이렇다.

```text
FUNCTION_LIMIT_MS
= 함수 전체 상한 10,000ms

RUNTIME_RESERVE_MS
= 응답·로그·정리용으로 남기는 1,000ms

Date.now() - startedAt
= 함수가 시작된 뒤 이미 사용한 시간
```

따라서 식은 다음과 같다.

```text
남은 시간
= 10초
- 마무리 여유 1초
- 이미 사용한 시간
```

함수가 시작한 지 3초가 지났다면:

```text
10초 - 1초 - 3초 = 6초
```

모기가 답한 `6초`가 정확하다.

- [ ] `remainingMs()`는 사용한 시간이 아니라 앞으로 남은 시간을 돌려준다.
- [ ] 10초를 작업으로 꽉 채우지 않고 마지막 1초를 응답과 정리에 남긴다.

### 실제 raw diff — 시계를 한 번만 시작

파일: `app/api/swatch-media-retry.ts`

```diff
+  // 두 예산이 나눠 쓰는 공통 데드라인의 기준점 (fix2 발견물 1 (b)).
+  const handlerStartedAt = Date.now()
```

`handlerStartedAt`은 수명주기 작업이 끝난 뒤 다시 만들지 않는다.

함수 진입 시각 하나를 끝까지 보존한다.

```text
함수 진입: handlerStartedAt 기록
→ 수명주기 소비
→ 사진 재시도
→ 둘 다 같은 handlerStartedAt을 기준으로 남은 시간을 계산
```

- [ ] 공통 마감의 핵심은 두 번째 작업이 시계를 0초로 다시 시작하지 않는 것이다.

### 실제 raw diff — 수명주기와 사진 예산을 남은 시간으로 자르기

파일: `app/api/swatch-media-retry.ts`

```diff
-      const summary = await consumeLifecycleQueue(makeLifecycleDeps(service), {
+      const summary = await consumeLifecycleQueue(makeLifecycleDeps(lifecycleClient), {
         limit: LIFECYCLE_CONSUME_LIMIT,
-        budgetMs: LIFECYCLE_BUDGET_MS,
+        budgetMs: Math.min(LIFECYCLE_BUDGET_MS, remainingMs(handlerStartedAt)),
       })
```

```diff
     const startedAt = Date.now()
+    const photoBudgetMs = Math.min(SOFT_BUDGET_MS, remainingMs(handlerStartedAt))
     const results = []
     let skipped = 0

     for (const row of due) {
-      if (Date.now() - startedAt > SOFT_BUDGET_MS) {
+      if (Date.now() - startedAt > photoBudgetMs) {
         skipped = due.length - results.length
         break
       }
```

`Math.min()`은 둘 중 더 짧은 제한을 고른다.

수명주기에는 두 제한이 있다.

```text
자기 몫: 최대 4초
공통 마감까지 남은 시간: 예를 들어 2초

min(4초, 2초) = 2초
```

사진 재시도에도 두 제한이 있다.

```text
자기 몫: 최대 8초
공통 마감까지 남은 시간: 예를 들어 6초

min(8초, 6초) = 6초
```

- [ ] 각 작업은 자기 몫보다 오래 쓸 수 없다.
- [ ] 자기 몫이 남아 있어도 공통 마감이 먼저 오면 공통 마감을 따른다.

---

## 3. fix2 — 시작한 수명주기 요청을 1.2초 뒤 실제로 끊는다

### 변경 전 검사

예산 검사는 작업 시작 전에만 있었다.

```text
현재 3.9초
4초가 되지는 않았음
→ Storage move 시작
→ 요청이 20초 동안 매달림
```

`3.9 < 4`라는 판정은 출발 허가일 뿐이다.

도착 시간을 보장하지 않는다.

### 실제 raw diff — 요청에 AbortSignal 부착

파일: `app/server/swatchMediaService.ts`

```diff
-export function createServiceClient(env: ServiceEnv): SupabaseClient {
+export function createServiceClient(
+  env: ServiceEnv,
+  options: { requestTimeoutMs?: number } = {},
+): SupabaseClient {
+  const { requestTimeoutMs } = options
   return createClient(env.url, env.serviceRoleKey, {
     auth: { persistSession: false, autoRefreshToken: false },
+    ...(requestTimeoutMs
+      ? {
+          global: {
+            fetch: (input: RequestInfo | URL, init?: RequestInit) =>
+              fetch(input, { ...init, signal: AbortSignal.timeout(requestTimeoutMs) }),
+          },
+        }
+      : {}),
   })
 }
```

`AbortSignal.timeout(1_200)`이 붙으면 Promise만 포기하는 것이 아니라 실제 HTTP 요청을 중단한다.

### 실제 raw diff — 수명주기 전용 클라이언트

파일: `app/api/swatch-media-retry.ts`

```diff
+      const lifecycleClient = createServiceClient(env, {
+        requestTimeoutMs: STORAGE_REQUEST_TIMEOUT_MS,
+      })
+      const summary = await consumeLifecycleQueue(makeLifecycleDeps(lifecycleClient), {
```

```ts
export const STORAGE_REQUEST_TIMEOUT_MS = 1_200
```

중요한 경계:

```text
1.2초 제한이 붙는 것
= public↔private 이동·존재 확인 같은 수명주기 Storage 요청

fix2에서 이 제한이 붙지 않는 것
= 일반 사진 다운로드·업로드
```

일반 사진 복사는 수백 ms보다 오래 걸릴 수 있으므로 무조건 1.2초로 자르면 정상 사진까지 실패한다.

- [ ] fix2의 1.2초 제한은 사진 복사 전체가 아니라 수명주기 Storage 호출 전용이다.
- [ ] 시작 전 검사와 요청 중단 신호는 서로 다른 장치다.

### fix2의 남은 구멍

fix2의 `for` 검사는 사진 하나를 시작하기 전에만 돈다.

사진 다운로드를 시작한 뒤 30초가 걸리면 공통 9초 마감을 넘어갈 수 있었다.

수명주기 요청도 공통 마감까지 0.1초 남았는데 고정 1.2초 상한으로 시작하면 마감을 넘길 여지가 있었다.

- [ ] `1.2초 상한이 생김`과 `공통 마감을 절대 넘지 않음`은 같은 말이 아니다.

---

## 4. fix3 — 사진 복사 안쪽까지 남은 시간을 전달한다

### 실제 raw diff — 매 순간 남은 시간 계산

파일: `app/api/swatch-media-retry.ts`

```diff
     const photoBudgetMs = Math.min(SOFT_BUDGET_MS, remainingMs(handlerStartedAt))
+    const copyRemainingMs = () =>
+      Math.min(photoBudgetMs - (Date.now() - startedAt), remainingMs(handlerStartedAt))
+    const copyClient = createServiceClient(env, { requestTimeoutMs: copyRemainingMs })
+    const deps = makeCopyDeps(copyClient, env, { remainingMs: copyRemainingMs })
```

`copyRemainingMs`가 함수인 이유가 중요하다.

숫자를 한 번 계산해 저장하면 시간은 계속 흐르는데 값은 낡는다.

함수로 두면 다운로드 직전과 업로드 직전에 각각 그 순간의 남은 시간을 다시 계산할 수 있다.

- [ ] 남은 시간은 고정 숫자가 아니라 호출할 때마다 줄어드는 값이다.

### 실제 raw diff — 시작할 최소 시간

파일: `app/server/swatchMediaCopy.ts`

```diff
+const MIN_SLICE_MS = 1_500
```

```diff
+    const downloadBudget = downloadBudgetMs(deps.remainingMs)
+    if (downloadBudget < MIN_SLICE_MS) {
+      return { id: target.id, outcome: 'deadline', reason: `no_time_to_download:${downloadBudget}` }
+    }
+
+    const got = await download(url, deps.fetchImpl, downloadBudget)
```

0.1초밖에 안 남았다면 이제 사진 다운로드를 시작하지 않는다.

```text
남은 시간 100ms
필요한 최소 조각 1,500ms
→ 시작하지 않음
→ deadline 결과로 스스로 종료
```

### 실제 raw diff — 다운로드 타이머도 남은 시간 사용

```diff
 async function download(
   url: string,
   fetchImpl: typeof fetch,
+  budgetMs: number = FETCH_TIMEOUT_MS,
 ) {
   const controller = new AbortController()
-  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS)
+  const timer = setTimeout(() => controller.abort(), Math.max(1, budgetMs))
```

예전에는 다운로드 자체 상한 30초만 봤다.

fix3부터는 30초와 공통 마감까지 남은 시간 중 짧은 값을 사용한다.

```text
다운로드 자체 상한 30초
공통 마감까지 4초
→ 4초를 사용
```

- [ ] fix3부터 이미 시작한 사진 다운로드도 남은 마감 시간에 맞춰 중단할 수 있다.

### 왜 `deadline`이라는 별도 결과가 필요한가

시간이 부족해서 중단한 것은 사진이 고장 났다는 판정이 아니다.

```text
사진 실패
= 사진 URL이나 파일에 문제가 있음

deadline
= 이번 서버 실행에 시간이 부족했음
```

그래서 deadline으로 스스로 접은 사진은 재시도 횟수를 제한적으로 환불한다.

사진 잘못이 아닌데 자동 재시도 4회를 모두 잃지 않게 하기 위해서다.

- [ ] `deadline`은 사진 상태가 아니라 이번 함수에 남은 시간의 상태다.

---

## 5. fix4 — 수명주기 Storage 요청도 매번 남은 시간을 다시 본다

fix3에서는 수명주기 작업 하나가 시작할 때 요청 상한을 한 번 계산했다.

그런데 작업 하나가 Storage를 최대 세 번 호출할 수 있었다.

```text
move
→ 실패하면 목적지 exists
→ 출발지 exists
```

상한을 4초로 한 번 정해 세 요청이 각각 4초를 쓰면 총 12초가 된다.

### 실제 raw diff — 고정값 대신 계산 함수 전달

파일: `app/server/swatchMediaLifecycle.ts`

```diff
-  setRequestTimeoutMs?: (ms: number) => void
+  setRequestTimeoutResolver?: (resolve: () => number) => void
```

```diff
-      const remaining = budgetMs === undefined ? Infinity : budgetMs - (Date.now() - startedAt)
-      deps.setRequestTimeoutMs(opTimeoutFor(task.attempts ?? 0, remaining))
+      const attempts = task.attempts ?? 0
+      deps.setRequestTimeoutResolver(() =>
+        opTimeoutFor(
+          attempts,
+          budgetMs === undefined
+            ? Number.POSITIVE_INFINITY
+            : budgetMs - (Date.now() - startedAt),
+        ),
+      )
```

이제 각 요청이 출발하는 순간에 남은 시간을 새로 읽는다.

```text
작업 시작 때 남은 시간 4초

move가 3초 사용
→ exists 시작 시 다시 계산
→ 남은 시간 1초
→ exists 상한 최대 1초
```

- [ ] fix4부터 수명주기 작업 안의 두 번째·세 번째 요청도 낡은 상한을 재사용하지 않는다.
- [ ] 여러 Storage 요청의 총 체류 시간이 공통 예산을 몇 배로 초과하지 않게 됐다.

---

## 6. 모기의 처음 문장을 최종 형태로 다듬기

모기의 문장:

> 처음에는 그냥 0.1초 남아도, 10초가 된 건 아니니까 시작시켜버린 건데 지금은 요청이 1.2초 내에 끝나게 감시한다.

fix2 설명으로는 맞다.

최종 fix4까지 포함하면 이렇게 말할 수 있다.

> 처음에는 작업 시작 전에만 시간이 남았는지 봐서, 0.1초만 남아도 긴 요청을 시작할 수 있었다. fix2는 수명주기 Storage 요청 하나에 첫 1.2초 상한과 공통 9초 결승선을 만들었고, fix3·fix4는 다운로드·업로드와 연속 Storage 요청이 실행되는 중에도 매번 남은 시간을 다시 보게 했다.

- [ ] 위 문장에서 `공통 9초 결승선`의 주인은 서버 함수 실행 한 번이다.
- [ ] 위 문장에서 `1.2초`는 모든 작업의 영구 고정값이 아니라 수명주기 Storage 요청의 첫 상한이다.

## 7. 이해 확인용 작은 사례

서버 함수가 시작된 지 7초가 지났다.

```text
전체 상한 10초
마무리 여유 1초
이미 사용 7초
```

### 모기가 계산할 것

- [ ] 공통 마감까지 남은 작업 시간: ______초
- [ ] 사진 다운로드에 최소 1.5초가 필요하다면 새 다운로드를 시작할 수 있는가: ______
- [ ] 이때 시작하지 않는 이유는 사진이 고장 났기 때문인가, 서버 시간이 부족하기 때문인가: ______

> 모기 메모:
>

## 질문 주차장

### 질문 1

>

### 질문 2

>

## 원문 포인터

- fix2 계약: `../../swatch-ops/contracts/2026-08-17-pr520-fix2.md`
- fix3 계약: `../../swatch-ops/contracts/2026-08-17-pr520-fix3.md`
- fix4 계약: `../../swatch-ops/contracts/2026-08-17-pr520-fix4.md`
- fix2 한줄읽기 공책: `../temp/2026-08-18-pr520-fix2-line-by-line.md`
