# 모기 code diff note — `.sh` 셸 스크립트 읽기

날짜: 2026-08-06

재료: swatch-v2 PR #474 · `.claude/hooks/memory-pack-router.sh`

> 아 요즘 너무 ai로 하다보니까. 이런것도 좀 봐야할것같아서 물어봤다옹.

## 모기 질문

> sh파일 내가 보는데 흠흠 신기하다 이거 쉘스크립트인건가? 예전에 자바스프링웹서버 배포할때 썼던것같기도..

## 결론

맞다. `.sh`는 보통 셸이 실행하는 스크립트 파일이고, PR #474 파일은 첫 줄이 `#!/bin/bash`이므로 Bash 스크립트다. Spring 서버 배포 때 `git pull`, `gradlew`, `java -jar` 같은 명령을 순서대로 실행하던 파일과 같은 종류다.

이번 파일은 서버를 배포하지 않고 Claude Code가 특정 순간에 호출하는 안내기로 쓰인다.

```text
Spring 배포 스크립트
→ 빌드하고 서버 프로세스를 시작·종료

PR #474 hook 스크립트
→ Claude Code의 입력을 검사하고 관련 Memory 팩 안내를 출력
```

## 첫 줄부터 읽기

```bash
#!/bin/bash
```

- `#!` 뒤의 프로그램으로 이 파일을 실행하라는 뜻이다.
- 여기서는 Bash가 파일 전체의 바깥 실행을 맡는다.
- `.sh` 확장자보다 이 첫 줄이 실제 실행 프로그램을 더 직접적으로 알려준다.

```bash
set -uo pipefail
```

- `-u`: 선언되지 않은 변수를 사용하면 오류로 본다.
- `pipefail`: 파이프 중간 명령이 실패해도 전체 실패로 잡는다.
- `-e`는 없다. 이 hook은 안내기라 일부 오류가 생겨도 사용자 작업을 막지 않는 `fail-open` 정책을 따르기 때문이다.

## 입력을 받는 부분

```bash
INPUT=$(cat)
```

Claude Code가 표준입력으로 보낸 JSON 전체를 읽어 `INPUT` 변수에 담는다. Spring 배포 스크립트가 명령줄 인자나 환경변수로 서버 주소·프로필을 받았다면, 여기서는 Claude Code의 사건 정보가 입력이다.

입력에는 다음 같은 값이 들어온다.

```json
{
  "hook_event_name": "UserPromptSubmit",
  "session_id": "example-session",
  "prompt": "마이그레이션 만들어줘"
}
```

파일 수정 직전이라면 `prompt` 대신 수정 대상 `file_path`가 들어간다.

## Bash 안에서 Python을 실행하는 부분

```bash
"$PYTHON3" - <<'PY'
import fnmatch
import json
...
PY
```

파일 바깥은 Bash지만 `<<'PY'`부터 마지막 `PY`까지는 Python 코드다. 이 문법은 여러 줄의 글을 어떤 명령의 입력으로 넘기는 방식이고, 여기서는 Python 프로그램 본문을 `python3`에 전달한다.

역할이 다음처럼 나뉜다.

```text
Bash
├─ Claude Code 입력 받기
├─ 저장소와 routing.json 위치 확인
├─ 실행 가능한 Python 찾기
└─ Python 코드 실행

Python
├─ JSON 해석
├─ 파일 경로·프롬프트 키워드 비교
├─ 같은 세션에서 이미 안내한 팩인지 확인
└─ Claude Code가 받을 JSON 출력
```

JSON, 정규식, 경로 패턴, 집합 처리는 Bash만으로도 가능하지만 코드가 복잡해진다. 그래서 셸은 실행 환경 연결을 맡고 Python은 데이터 처리와 판단을 맡는다.

## 출력이 하는 일

Python은 관련 팩을 찾으면 다음 모양의 JSON을 출력한다.

```json
{
  "hookSpecificOutput": {
    "hookEventName": "UserPromptSubmit",
    "additionalContext": "진행 전에 db-migration.md를 읽어라"
  }
}
```

Claude Code는 `additionalContext`를 추가 안내로 받아들인다. 이 스크립트가 Memory 팩 전문을 직접 읽어 넣는 것은 아니고, Claude에게 어떤 팩을 읽어야 하는지만 알려준다.

## 다음에 `.sh` 파일을 볼 때 읽는 순서

1. 첫 줄 `#!`에서 어떤 프로그램이 실행하는지 본다.
2. `set` 옵션에서 오류 처리 태도를 본다.
3. 입력이 명령줄 인자, 환경변수, 표준입력 중 어디서 오는지 찾는다.
4. 다른 프로그램을 호출하는 지점을 찾는다.
5. 무엇을 출력하고 어떤 종료 코드로 끝나는지 본다.
6. 파일·프로세스·네트워크처럼 바깥 상태를 바꾸는 명령이 있는지 확인한다.

## 이번에 연결된 기억

예전에 Spring 웹서버를 배포할 때 쓴 `.sh`와 이번 Claude Code hook은 목적만 다르고 기본 원리는 같다. 사람이 터미널에서 반복할 명령이나 프로그램 사이의 연결 절차를 파일에 적어 자동으로 실행한다.
