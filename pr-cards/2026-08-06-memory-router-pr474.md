# 카드 — memory 팩 라우터 hook (PR #474, feat/memory-router-hook → dev)

작성: 냐옹이, 2026-08-06. 원문 SSOT: PR #474. 짝: [1단계 분리 카드](./2026-08-06-memory-split-pr472.md)

## 1. 반드시 읽을 결정

- 1단계에서 "약속"이던 팩 로딩이 **기계가 됐다**: 라우터 스크립트 1개(`.claude/hooks/memory-pack-router.sh`)가 `routing.json`을 읽어, 관련 파일을 만지거나(PreToolUse) 관련 키워드가 뜨면(UserPromptSubmit) "이 팩 읽어라" 한 줄을 주입한다. 같은 세션에서 같은 팩은 1회만.
- Codex 쪽은 설계대로 hook 없음 (per-turn 주입 금지 룰) — 코어 라우팅 표 컨벤션으로 동작. 호스트 대칭 확인은 PR에 기록됨.
- 이 PR은 **인계 산출물**이다: 1차 워커가 API 사고로 죽어서 2차 워커가 부분 작업 3파일을 실측 평가 후 이어받았고, 그 과정에서 결함 3건(Windows 대소문자 매칭·죽은 notebook 분기·중복 판정 겹침)을 고쳤다. 판단 근거 단락이 PR 본문에 있다.

## 2. 네가 결정할 것

- 머지 여부. 이건 **모든 세션에 영향 주는 hook**이라 1단계보다 무거운 결정이다. 걱정하던 hook 스프롤은 설계대로 순증 1개로 막혔다.

## 3. 위험한 가정

- 라우팅 표의 매칭 패턴이 완벽하지 않을 수 있다 — 안 걸리면 팩을 안 읽고 지나간다 (1단계와 같은 수준으로 퇴보할 뿐, 더 나빠지진 않음). 과잉 발화 노이즈는 세션당 1회 제한이 막는다.

## 4. 증명된 증거 (마스터 독립 재현 포함)

- 워커 재현 3종(발화/무발화/중복없음) + **호스트 실소비 확인**(스크립트 출력이 아니라 실제 system-reminder 주입까지).
- 내가 워커와 별개로 직접 재현: 매칭 입력 발화 1회, 같은 세션 2회째 0바이트, 빈 입력 exit 0.
- 게이트: verify-agent-ssot OK 45/FAIL 0, wiki:lint 경고 순증 0, gitleaks 무검출, 스레드 0, MERGEABLE.

## 5. 안 읽어도 되는 세부

- 스크립트 내부 구현, routing.json 행 문법, 반증 매니페스트 M-010 등재 내역 (PR 본문에 있음).

## 모기 메모

### `PreToolUse`와 `UserPromptSubmit`은 무엇인가

> 관련 파일을 만지거나(PreToolUse) 관련 키워드가 뜨면(UserPromptSubmit) " <이거 원리가 궁금. 뭐 PreToolUse?라는 뭔가 개념인건가

둘 다 Claude Code가 실행 중 특정 시점에 외부 스크립트를 호출할 때 쓰는 이름이다.

- `UserPromptSubmit`: 모기가 메시지를 보낸 직후, Claude가 답변을 만들기 전에 발생한다. 라우터는 메시지 원문을 `routing.json`의 키워드 정규식과 비교한다.
- `PreToolUse`: Claude가 `Write`나 `Edit`로 파일을 실제 수정하기 직전에 발생한다. 라우터는 수정할 파일의 저장소 상대 경로를 `routing.json`의 경로 패턴과 비교한다.
- 일치하면 라우터는 팩 전문을 넣지 않고 `이 팩을 진행 전에 읽어라`는 짧은 `additionalContext`만 반환한다. 팩을 실제로 읽는 마지막 행동은 Claude가 한다.
- 같은 세션에서 이미 안내한 팩은 저장소 밖 임시 상태 파일에 기록해 다시 안내하지 않는다.

예시 흐름:

```text
모기: "마이그레이션 만들어줘"
→ UserPromptSubmit
→ "마이그레이션"이 DB 키워드와 일치
→ db-migration.md를 읽으라는 안내
→ Claude가 팩을 읽고 답변 시작
```

```text
Claude가 supabase/migrations/새파일.sql을 수정하려 함
→ 실제 수정 직전 PreToolUse
→ 경로가 supabase/migrations/**와 일치
→ db-migration.md를 읽으라는 안내
→ Claude가 팩을 읽은 뒤 수정 진행
```

### 무엇을 어떻게 검증했는가

> 근데 신기한게 있다옹.. 검증을 했다고 하는데 어떤 방식으로 테스트했는지가 궁금해

검증은 `스크립트 단독 동작`, `실제 Claude Code 연결`, `저장소 게이트`, `후속 행동 관찰`의 네 층으로 나뉜다.

1. **스크립트 단독 동작**: Claude Code가 보낼 형태의 JSON을 표준입력으로 직접 넣고 출력과 종료 코드를 확인했다.
2. **경우별 검사**: 관련 입력은 안내 1회, 무관한 입력은 무발화, 같은 세션의 같은 팩은 두 번째부터 무발화, 새 세션은 다시 안내, 빈 입력·라우팅 파일 누락은 작업을 막지 않고 종료하는지 확인했다.
3. **실제 Claude Code 연결**: 실제 사용자 메시지에서 `UserPromptSubmit` 안내가 뜨고, `.planning/` 파일 수정 직전 `PreToolUse` 안내가 `system-reminder`로 소비되는지 확인했다. 같은 세션의 두 번째 수정에는 안내가 나오지 않는 것도 확인했다.
4. **저장소 게이트**: `verify-agent-ssot`, `wiki:lint`, `git diff --check`, gitleaks와 라우팅 표·팩 파일 정합을 확인했다.

여기까지가 증명하는 것은 `라우터가 필요한 순간에 안내를 띄운다`까지다. 안내를 받은 Claude가 실제로 팩을 읽고 같은 실수를 줄이는지는 M-010에 따라 다음 DB·문서·리뷰 작업 3건에서 별도로 관찰한다.

### 과외 중 발견한 재현 로그 주의점

**PR #474 재현 로그의 입력 예시가 실행 가능한 JSON이 아님**

근거: PR #474 본문 `재현 로그 3종`, `.claude/hooks/memory-pack-router.sh:71`

본문의 `echo '{PreToolUse, Write, supabase/migrations/...}'`는 설명용 축약으로는 이해되지만 JSON 문법이 아니어서 그대로 실행하면 스크립트가 무발화로 종료한다. 실제 검증이 별도의 정상 JSON으로 수행됐더라도 독립 재현이 가능하려면 축약 표시를 붙이거나 실행 가능한 전체 입력을 제시해야 한다.
