---
reviewed: false
---

# PR #44 — Someday 호출 흐름과 설정 위치

전체 읽었어. **지금 궁금한 건 “Someday가 지원된다”에서 한 단계 내려가서, 내 요청이 어느 파일을 거쳐 Things까지 가느냐는 거네.** 이건 바뀐 diff에 기존 호출 경로가 다 나오지 않아서, 주변 코드까지 같이 봐야 보여.

순서는 **① 호출 흐름·설정 위치 → ② Notes·체크리스트·알림의 경로 차이 → ③ 고장 심은 시험**으로 잡을게. 이번엔 ①부터.

모기가 “회사건검 Someday에 넣어줘”라고 하면, 투두냥이 제목과 목록을 명령 인자로 전달해. 브릿지—이 저장소에서 Things를 읽고 바꾸는 코드—는 같은 제목의 열린 할 일을 찾고, 있으면 그 항목을 옮기고 없으면 새로 만들어.

아래는 PR #44 HEAD **`5e0abf9`**의 코드 흐름이야. 예시는 **같은 제목의 할 일이 Anytime에 하나 있는 경우**로 잡을게. 실제 실행 관찰이 아니라 코드를 따라간 설명이야.

```sh
pnpm things:add --title "회사 건강검진 예약하기" --when someday --apply
```

파일 경로는 아래에서 모두 `integrations/things/` 기준이야.

```text
package.json
│  things:add를 어떤 파일로 실행할지 지정
│
└─ bin/things-add.js
   │  명령 인자를 읽음
   │  title = "회사 건강검진 예약하기"
   │  when = "someday"
   │  apply = true
   │
   ├─ validateTodo()                    src/write.js
   │  제목·일정 등 입력을 검사
   │
   └─ upsertTodo()                      src/write.js
      │
      ├─ planReminder()                 src/reminder.js
      │  └─ osascript read-reminder-target.applescript
      │     Things에서 같은 제목의 열린 할 일을 찾음
      │     → 하나 발견: 그 항목의 ID를 재사용하기로 결정
      │
      ├─ prepareNotesVerification()     src/write-verification.js
      │  └─ osascript read-todo-values.applescript
      │     Notes를 생략했으므로 기존 Notes를 읽어둠
      │     → 나중에 그대로 보존됐는지 비교할 기준
      │
      ├─ osascript upsert-todo.applescript
      │  같은 제목 검색 결과가 그대로인지 다시 확인
      │  → 찾았던 ID의 할 일을 Someday로 옮김
      │  → "updated + 그 항목의 ID"를 반환
      │
      └─ verifyTodoValues()             src/write-verification.js
         └─ osascript read-todo-values.applescript
            같은 ID의 날짜·Notes·Someday 소속 등을 다시 읽음
            → 기대한 상태와 비교해 결과 반환

bin/things-add.js가 최종 결과를 터미널에 출력
```

`osascript`는 **macOS가 제공하는 AppleScript 실행 프로그램**이야. 여기서는 JavaScript가 이 프로그램을 실행하고, AppleScript가 Things 앱에 조회·변경을 요청해. 이 Someday 경로에서는 Things 내부 DB에 직접 쓰지 않아.

핵심 연결을 실제 원문으로 보면 더 짧아.

[`bin/things-add.js:34`](/Users/leechaerim/orca/workspaces/mogi-productivity/things-someday/integrations/things/bin/things-add.js:34)는 인자를 읽은 뒤 전체 작업을 맡겨.

```js
const result = await upsertTodo({
  scriptPath: path.join(integrationDirectory, "scripts", "upsert-todo.applescript"),
  todo,
  apply: Boolean(args.apply),
});
```

여기서 `todo.when`에 들어 있는 `"someday"`가 [`src/write.js:126`](/Users/leechaerim/orca/workspaces/mogi-productivity/things-someday/integrations/things/src/write.js:126)을 거쳐 AppleScript의 `scheduleMode` 인자로 전달돼. 그러면 [`scripts/upsert-todo.applescript:74`](/Users/leechaerim/orca/workspaces/mogi-productivity/things-someday/integrations/things/scripts/upsert-todo.applescript:74)의 이 분기가 실행돼.

```applescript
else if scheduleMode is "someday" then
    move targetToDo to list "Someday"
```

여기서 **`targetToDo`는 앞에서 같은 제목으로 찾은 그 ID의 할 일**이야. 새 항목을 하나 더 만드는 게 아니라 그 항목의 목록을 바꾸는 거지.

“설정은 어디서 담당하냐”는 이렇게 나뉘어.

| 정하는 내용 | 담당 위치 |
|---|---|
| `things:add`가 어느 프로그램을 실행하는가 | 루트 [`package.json:18`](/Users/leechaerim/orca/workspaces/mogi-productivity/things-someday/package.json:18) |
| 이번 할 일의 제목·Someday 여부·실제 적용 여부 | 투두냥이 명령에 넣는 `--title`, `--when`, `--apply` |
| `someday`를 허용하고 어느 경로로 보낼 것인가 | [`src/write.js:29`](/Users/leechaerim/orca/workspaces/mogi-productivity/things-someday/integrations/things/src/write.js:29)의 입력 검사와 `upsertTodo()` |
| Things에서 실제로 어떻게 옮길 것인가 | `scripts/upsert-todo.applescript`의 위 분기 |

즉, **이번 Someday 추가는 설정 파일에 목록 하나를 등록한 변경이야? → 코드에 허용값과 이동 동작을 추가한 변경이야.** 별도의 `config.json`도 있지만, 자주 쓰는 Area 목록·개발공부 Area 같은 설정을 맡고 있어. 이 `things:add` 실행 경로는 그 파일을 읽지 않아.

그리고 메모에 적은 Notes는 **이미 `--notes`로 지원돼.** 다음에는 지금 나무에서 Notes·체크리스트·알림을 붙이면 어느 가지가 달라지는지 이어서 보면 돼.
