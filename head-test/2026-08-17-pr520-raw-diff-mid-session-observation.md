# 중간 이해 관찰 — PR #520 fix1 raw diff 접촉

날짜: 2026-08-17

상태: **세션 진행 중 압축 전 체크포인트. 종료 분석 아님.** 정확한 wall-clock은 미측정. 모기가 컨텍스트 압축 가능성을 걱정해 중간 기록을 요청했으며, 이는 이해 실패나 컨디션 저하 사례로 세지 않는다.

## 판독 범위와 현재 재료

- 대상 PR: #520 이미지 자체 사본 서빙 전환 B레인.
- 전체 PR: `545bf66..9527c28`.
- fix1: `d256cdd..9527c28`(5커밋, 19파일).
- 첫 핵심길: `d256cdd..5cb3ad6` — 공용 대표사진의 자체 사본 어댑터 경유.
- 모기가 고른 샛길: `5cb3ad6..43f983b`, `20260817030000_mark_stored_hidden_recheck.sql`.
- 계속 열어둔 외부화: [`code-diff-notes/2026-08-17-pr520-fix1-raw-diff-map.md`](../code-diff-notes/2026-08-17-pr520-fix1-raw-diff-map.md).
- 카드에는 fix1 진행 중으로 적혀 있었지만 판독 시 GitHub HEAD에는 fix1 8건 수리와 검증 설명이 반영돼 있었다. 머지 판단은 하지 않았다.

## 1. 원문 수집

이 절은 해석하지 않는다. 사용자 발화를 원문 그대로 보존한다.

### C1. 변경 지도의 보존 방식

> 오! 이 지도 너무 맘에드는구먼. 근데 프롬프트에 출력해두면 유실될수가있어갖고. 이거 파일에다가 저장해두고 내가 그거 켜두면서 너랑 얘기하고싶은데 흠 방법없나

### C2. 자체 사본 URL과 `shade_images.url`

> ㅇㅇ 지금 보는중!! 근데 질문있음 자체사본 url이랑 shade_images의 원문 url? 이거 두개가 다른거야? 후자가 뭘말하는건지 헷갈린다옹

> shade_images.url에다가 일단 트위터 cdn링크 저장해놓고 나서! storage api 써서 사본만드는거니까. 둘이 갈라지는일이 있는거구나?냐옹? 흠흠. 일단 네 퀴즈에 답하면.. stored이면 화면이 storage에 있는 url 쓸것같다옹. 아 그러니까 swatch_media 테이블의 object_key 맞나 ? 아헷갈려. pending_upload일땐 걍 x cdn... 그러니까 shade_images.url?인가?냥 ㅠㅠ

> 사본 저장이 이미 끝나서 stored니까. 그대로라옹! storage에 저장해둔 사본사진보인다옹

### C3. 어댑터 두 층의 이름

> 아맞아 거기 봤거든 근데 shadeImageUrl이 함수가 MediaAdapter에 있는 함수인거야? 냥. 원래는 shade_images.url에 있는거 그대로 쓰다가 어댑터로 갈아끼운것같긴함

> supabaseAdapter가 뭐 repository 같은거네 냐옹. media_id없으면 resolve할게없지않나? 걍 그 x cdn raw url아님? 흠.

> 어우 방금 너무좋다 어우. 방금 설명 방식 완전 최고라옹!!!!!!!!!!!!!! 암튼 퀴즈 답. x cdn 그 원본 url이라옹

### C4. 샛길 선택과 아직 답하지 않은 관찰

> 오오 좋아. 마이그 세 파일 중에서 뭘 보면좋을라나 주니어백엔드개발자가 공부하기좋은거없냐옹?

> 보자옹!!!!!

## 2. 짧은 관찰

- **처음 막힌 지점:** `shade_images.url`, `swatch_media.object_key`, `object_key`로 조립한 자체 Storage URL을 모두 “사진 URL”이라는 말로 부를 때 값과 역할이 겹쳤다. `shadeImageUrl`과 `resolveShadeImageUrl`도 이름이 비슷해 함수의 소유 파일과 호출 층을 재확인했다.
- **설명·외부화 뒤 달라진 점:** 테이블별 실제 값 예시와 `supabaseAdapter.shadeImageUrl → mediaAdapter.resolveShadeImageUrl → stored면 publicMediaUrl, 아니면 rawUrl` 호출 사슬을 외부화한 뒤, `stored`·`pending_upload`·media 행 RLS 미가시 각각의 표시 주소를 맞게 적용했다.
- **아직 모르거나 다음에 확인할 점:** 샛길 마이그의 raw 96줄은 파일에 저장했지만 모기의 첫 해석은 아직 받지 않았다. 비동기 복사 도중 숨김 경쟁 조건과 완료 시점 재검사에 대한 이해, 새 사례 전이 성공 여부는 현재 **미관찰**이다.

## 3. 어떤 외부화가 도움이 됐나

1. fix1 19파일의 `A/M + 추가/삭제 줄 수` 전체 지도를 파일로 고정한 방식은 모기가 직접 “너무 맘에든다”고 평가했다. 이는 주관적 사용성 평가이며 이해 향상의 객관적 측정으로 확대하지 않는다.
2. `shade_images` 행과 `swatch_media` 행을 실제 예시 값으로 나란히 둔 뒤 시간순으로 `pending_upload → stored`를 보인 방식에서 같은 사례 적용이 이어졌다.
3. repository·adapter의 추상적 정의만 말하지 않고, 로컬 함수와 공개 함수의 실제 호출 사슬을 코드 그대로 펼친 직후 모기가 설명 방식을 명시적으로 긍정했다. 어느 요소가 효과를 냈는지는 분리 측정하지 않았다.
4. 프롬프트가 아니라 `code-diff-notes` 파일을 화면 밖 작업기억으로 사용한 것이 이번 파일럿의 핵심 사용성 발견이다. 압축 뒤에도 SHA·파일 지도·raw hunk·안 본 파일 목록을 그대로 회수할 수 있다.

## 4. 현재 판정 경계

- 같은 사례 안의 상태 적용: 관찰됨. `stored`면 자체 사본, `pending_upload`면 `shade_images.url`, media 행을 RLS로 못 읽어도 raw fallback이라고 답했다.
- 새로운 이름·값을 넣은 별도 사례 전이: 미관찰.
- 선택한 마이그의 경쟁 조건 해석: 미관찰.
- 샛길에서 새 결함 발견 여부: 미관찰.
- 질문 수·오타·재확인을 실패 점수로 쓰지 않는다. 이번 질문은 실제로 raw 노트에서 빠졌던 `supabaseAdapter` 중간 연결 hunk를 찾아 추가하게 했다.

## 5. 압축 뒤 이어갈 정확한 지점

1. [`raw diff 노트: 샛길 1`](../code-diff-notes/2026-08-17-pr520-fix1-raw-diff-map.md#샛길-1--복사-완료-시점-숨김-재검사)을 연다.
2. 문제 설명은 노트 249줄 부근, 함수 시작 282줄, `swatch_media` UPDATE 301줄, 숨김 재검사 319줄, revoke 큐 기록 324줄이다.
3. 아직 답하지 않은 질문: **“이 파일에서 `swatch_media`의 어느 행이 언제 바뀌고, 그 사이 사용자가 무엇을 하면 공개 사본이 남는 것 같아?”**
4. 모기의 첫 관찰을 받은 뒤에만 행의 주인·이벤트 전후·같은 트랜잭션의 큐 기록을 설명한다.
