# 과외냥이 주소 등록

모기 요청(2026-10-15)으로 [화이트보드냥의 세션 시작 등록 절차](../../mogi-whiteboard/communication/README.md)를 이 공책에 가져왔다. 현재 대상은 로컬 Codex 과외 세션이다. 각 냥이는 자기 주소만 갱신하고 상대 주소는 읽기만 한다.

## 주소 위치

| 역할 | 정본 주소 파일 | 갱신하는 담당 |
|---|---|---|
| 과외냥이 `tutor` | 이 공책의 `.local/agent-registry/tutor.json` | 현재 과외냥이 |
| 투두냥 `todo` | `../mogi-productivity/.local/agent-address.json` | 소유자가 지정한 투두냥 |

파일에는 현재 `runtimeId`, `runId`, `consumerGeneration`, `terminalHandle`, `incarnationId`, `worktreeId`, `workspacePath`, `executionHostId`, `agentIdentity`, `registeredAt`을 저장한다. 고정 Run ID를 지침에 복사하지 않는다. `.local/`은 Git에서 제외한다.

투두냥의 실행 작업공간은 제품 checkout과 다를 수 있다. 주소 파일에 적힌 `workspacePath`와 현재 터미널 작업공간을 대조하며, `mogi-productivity`에서 실행 중일 것이라고 추측하지 않는다. 이 주소록은 같은 Mac의 협력 세션을 찾는 용도다.

## 세션 시작·resume 때 자기 주소 갱신

시작 인사 전에 에이전트가 다음 절차를 수행한다. `compact`로 시작 지침을 다시 받았을 때도 현재 연결을 재확인하되 유효한 Run은 재사용한다.

1. `orca-cli` 스킬로 이번 세션의 CLI 실행 파일을 선택하고 설치 버전 안내를 읽는다. 아래 `orca`는 기본 설치 예시다. 실제 호출은 선택한 동일 실행 파일을 계속 쓴다. Run 명령을 사용하기 전에 설치된 `orchestration` 스킬 안내와 필요하면 명령의 `--help`도 읽는다.
2. `ORCA_TERMINAL_HANDLE`로 자기 터미널을 특정하고 `orca terminal show --terminal <자기-handle> --json`과 `orca terminal list --json`으로 runtime·handle·incarnation·작업공간·host·agent·connected/writable을 확인한다. 목록이 잘렸으면 등록하지 않는다. 환경 변수가 없을 때 현재 CLI의 인자 없는 `terminal show`는 활성 창을 고를 수 있으므로 자기 주소라고 사용하지 않는다. 호출자를 증명할 수 없으면 기존 파일을 보존하고 미갱신 이유를 알린다.
3. `orca orchestration run-current --from <자기-handle> --json`으로 연결된 Run을 확인한다. 유효한 자기 Run이 있으면 그대로 사용한다. Run은 메시지를 받을 주소이며 다른 에이전트나 작업을 실행하지 않는다.
4. Run이 없다면 기존 자기 등록을 먼저 확인한다. 같은 대화의 Run임과 현재 연결 소유권이 확인된 resume은 `run-show --id <확인한-Run-ID>`로 대조한 뒤 `run-use --id <확인한-Run-ID> --from <자기-handle>`로 복구하고 `run-current`를 다시 확인한다. 확인되지 않은 상대 Run을 가져오지 않는다. 새 과외 담당으로 시작했고 복구할 자기 Run이 없다면 `orca orchestration run-create --objective '과외냥이 메시지 수신' --from <자기-handle> --json`으로 한 번 만든다. 생성 결과가 불명확하면 현재 연결을 재조회하며, 확인 없이 반복 생성하지 않는다.
5. 이 공책 루트에서 아래 두 명령을 순서대로 실행한다.

```sh
python3 scripts/agent-registry.py register tutor
python3 scripts/agent-registry.py resolve tutor
```

등록 스크립트는 자기 로컬 Codex 터미널의 작업공간과 실제 Run 연결을 대조하고 파일을 원자적으로 교체한다. resolve는 저장된 runtime·터미널 실행 세대·Run·consumerGeneration을 현재 Orca 상태와 다시 대조한다. 실패를 성공으로 기록하거나 Run ID를 수동으로 끼워 넣지 않는다.

기존 주소가 다른 터미널을 가리키면 register는 덮어쓰기를 거부한다. 모기가 이 세션을 새 담당으로 지정하거나 교체를 명시한 경우에만 `register tutor --replace`로 갱신하고 다시 resolve한다. 오래된 파일이나 `agentWait: null`만으로 다른 담당자의 종료를 추측하지 않는다.

## 상대 주소 확인과 통신 범위

투두냥과 실제 통신하기 직전에는 자기 주소와 상대 주소를 모두 확인한다.

```sh
python3 scripts/agent-registry.py resolve tutor
python3 scripts/agent-registry.py resolve todo
```

`resolve todo`는 상대 JSON과 Orca를 읽기만 하며 상대 등록 파일·Run 연결을 변경하지 않는다. 불일치하면 상대 담당자의 갱신을 기다리거나 모기에게 상태를 알리고, 다른 터미널로 추측 전송하지 않는다.

주소 등록 요청은 새 메시지 발송이나 자동 전달의 승인이 아니다. 모기가 전달을 요청했을 때 설치된 `orchestration` 스킬의 메시지 절차를 따라 확인한 상대 Run으로 한 번 보낸다. 전송 성공은 큐에 들어갔다는 뜻이며 읽음·인수·처리 완료는 실제 회신과 결과로 구분한다. 수신 알림이 오면 자기 수신함을 읽고 내용을 처리한 뒤 수신 확인한다.

이 절차의 범위는 자기 주소 등록·조회다. 주소 등록만으로 별도 lifecycle 훅·상시 polling·자동 인사·worker·자동 MAILBOX 전달을 추가하지 않는다. 과외냥이와 과외 하네스 개발·개선·파일럿은 2026-10-18 모기의 명시적 요청으로 재개했으며, [현재 운영 상태](../README.md#현재-운영-상태--2026-10-18-재개)를 따른다.
