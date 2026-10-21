---
reviewed: true
---

# PR #33 해설 — 오늘 생긴 반복 할 일을 저녁으로 옮기기

모기가 고른 반복 할 일에서 오늘 할 일이 생기면, 기존 아침 실행이 그 할 일을 This Evening으로 옮긴다. 반복 원본의 일정을 새로 만들거나 바꾸는 작업은 아니다.

판독: [PR #33](https://github.com/samkimpepper/mogi-productivity/pull/33), base `2689cbb5dfe242b2b63c9d1e0f8ebd05fc5faa9f` → HEAD `4357947234ae557737f43e1ed46a059d38c13820`. 종료 시 후속 HEAD `493589bcbfd36ca3737efec80c762f4713fcad44`를 확인했으나 아래는 과외 당시 소스의 해설이다.

## 1. 어떤 반복을 옮길지 고르기

> 모기: “이 아이디 적는건 투두냥이가하는건가?”

투두냥이 반복 원본의 ID를 찾아줄 수 있고 실제 대상 등록은 소유자 확인을 거치는 단계다. 기기별 `integrations/routine/config.machine.json`의 `eveningRepeatTemplateIds`에 원본 ID를 넣으며, 오늘 할 일의 ID를 넣는 것이 아니다.

가상 원본 `RepeatA`에서 오늘 `TaskToday`, 내일 `TaskTomorrow`가 생기면 두 할 일은 각기 다른 ID를 가지면서 같은 원본을 가리킨다. 아침 명령은 `integrations/routine/src/config.js`의 `loadLocalRoutineConfig()`로 이 Mac의 원본 목록을 읽고, `integrations/things/src/evening.js`의 `findTodayInstance()`로 각 원본에서 오늘 생긴 열린 할 일을 찾는다. 공용 휴일 설정과 이 Mac의 실제 대상 목록은 분리되어 있다.

> [!note] 모기 박스
> 힌트 키워드: 원본 ID / 오늘 ID / 공용 설정 / 기기별 목록
> 다시 볼 때 남기고 싶은 생각을 자유롭게 적어도 돼.
>
> 모기 메모:

## 2. 아침 실행과 실패 결과

> 모기: “그러면 pnpm routine이라고 이름 바꿔야하지않나? 헷갈리잖아 ㅋ”

> 모기: “한쪽 실패(holiday, evening) 해도 나머지 하나는 정상적으로 리턴된다는거 테스트코드는 만들었겠지..?!?! ㅋ”

`integrations/routine/bin/holiday-routine.js`는 휴일 단계와 저녁 단계를 각각 `settle()`로 감싸 호출하고 `{holiday, evening}`을 출력한다. 저녁 단계는 평일에도 실행되므로 기존 명령 이름의 범위가 실제 동작보다 좁게 읽힌다는 피드백이 나왔다.

| 확인한 것 | 과외 당시 근거 |
|---|---|
| 단계 하나가 예외를 던져도 다음 단계 호출을 이어감 | CLI의 `settle()`과 두 단계 호출 코드 |
| 저녁 대상 A 실패 뒤 B를 계속 처리함 | `integrations/routine/test/evening.test.js`의 직접 시험 |
| 휴일·저녁 두 단계 사이 실패 조합의 직접 시험 | 판독한 시험 파일에서는 찾지 못함. 모기는 설명 뒤 현 시험 범위를 수용함 |

예약 설정을 만드는 `integrations/routine/src/launchd.js`는 `pnpm`을 거치지 않고 Node로 `holiday-routine.js --apply`를 직접 호출한다. 따라서 실행 파일 경로를 유지한 채 `pnpm` 별칭만 추가·변경하는 일은 이 설정의 재설치를 요구하지 않는다. 실제 명령 변경 여부는 제품 담당 경로의 판단 대상이다.

> [!note] 모기 박스
> 힌트 키워드: 두 단계 / 대상 A·B / 출력 결과 / 예약의 실행 경로
> 동작이나 시험 범위에서 다시 찾고 싶은 점을 적어도 돼.
>
> 모기 메모:

## 3. 이동 확인과 반복 규칙의 의미

> 모기: “내부 이름 열 이름 바뀌면 그럼 로그라도 남길수 있게 해야하려나?”

이동 전 DB 조회가 실패하면 `integrations/routine/src/evening.js`의 `runEveningStep()`은 `unavailable`, `ok: false`를 반환한다. 이동 요청 뒤 읽기 확인에 실패하면 Things 연동 파일의 `verifyEvening()`이 `unverified`를 반환한다. 예약 설정상 이 결과 JSON은 `~/Library/Logs/mogi-productivity/holiday-routine.log`로 가며, DB 조회 실패의 원래 열 이름 오류까지 보존하지는 않는다.

| 궁금한 것 | 확인 방법·경계 |
|---|---|
| 오늘 할 일이 저녁으로 이동했나? | 이동 요청 뒤 날짜·열린 상태·저녁 여부·원본 연결을 다시 읽음 |
| 이동하면서 원본의 반복 규칙이 바뀌었나? | 원본 행 `TMTask.rt1_recurrenceRule`의 전후 비교용 요약값을 비교 |
| 원래 규칙이 매일·일정 기준인가? | 저장값의 의미 해석이 필요함. 현재 코드는 그 해석을 하지 않음 |

의미도 Things의 저장된 규칙 안에 들어 있다. 우리 프로그램이 그 의미를 해석하지 않고 이동 전후 동일성을 확인하는 것이다. 실제 설정의 소유자는 Things이고, 기기별 JSON은 이동 대상 ID만 고른다.

> 모기: “만약 내가 특정 조건에만 밤 루틴을 하려고 한다면.. 그때는 규칙값의 의미 해석이 필요해서 조건별 분기를 해야한다는걸 나중에 구현할 에이전트가 알게하고싶다옹ㅋ”

이 요청과 설정 의도 기록 제안은 [마스터 전달용 메모](../../master-delivery-memos.md)의 PR #33 항목으로 인계했다. 조건부 확장에서는 판단할 조건과 정보의 출처를 먼저 정해야 한다. 규칙 불변 비교만으로 오늘 조건 충족을 증명할 수 없으며, Things가 이미 해당 날짜의 생성 여부를 결정한다면 오늘 인스턴스의 존재로 충분할 수도 있다.

> [!note] 모기 박스
> 힌트 키워드: 전후 동일성 / 규칙의 뜻 / 오늘 조건 / 확인 불가
> 나중에 확장할 때 다시 확인하고 싶은 것을 적어도 돼.
>
> 모기 메모:

## 판독 범위와 검증의 경계

작성자가 보고한 전체 시험은 290개 통과다. 과외에서 별도로 실행한 것은 고정 HEAD의 config 시험 3개이며, 실제 사용자 반복의 설정 변경·첫 오전 9시 실행은 수행하지 않았다. 종료 시 모기는 투두냥과 수정 워커 작업이 끝났다고 보고했다. 새 HEAD 전체를 다시 검증하거나 머지 판단을 한 것은 아니다.

아래는 고정 base→HEAD의 변경 파일 전체다. 이 해설에는 raw hunk를 수록하지 않았으며, 파일 전체 diff 완독을 완료했다는 목록이 아니다. 위 흐름에서 설정·CLI·저녁 이동·예약 함수 및 관련 시험을 근거로 참조했다.

<details>
<summary>변경 파일 16개</summary>

- `.gitignore`
- `integrations/routine/README.md`
- `integrations/routine/bin/holiday-routine.js`
- `integrations/routine/config.machine.example.json`
- `integrations/routine/src/config.js`
- `integrations/routine/src/evening.js`
- `integrations/routine/test/config.test.js`
- `integrations/routine/test/evening.test.js`
- `integrations/things/CALL_PATHS_TEMP.md`
- `integrations/things/README.md`
- `integrations/things/bin/things-add.js`
- `integrations/things/scripts/reminder.swift`
- `integrations/things/src/evening.js`
- `integrations/things/src/write-verification.js`
- `integrations/things/src/write.js`
- `integrations/things/test/evening.test.js`

</details>

## 종료 후 반영 확인 — 2026-10-16

투두냥의 처리 완료 회신 뒤 최종 HEAD `493589bcbfd36ca3737efec80c762f4713fcad44`의 package.json과 README를 직접 확인했다. 명령은 `pnpm routine`·`pnpm routine:schedule`로 바뀌었고 기존 JS 실행 파일 경로를 유지해 예약 재설치가 필요하지 않다고 안내한다. [최종 README](https://github.com/samkimpepper/mogi-productivity/blob/493589bcbfd36ca3737efec80c762f4713fcad44/integrations/routine/README.md)의 「반복 설정은 Things가 정합니다」·「나중에 조건부 저녁 루틴을 만들 때 주의」 절에 설정 의도와 후속 구현 시 주의가 반영됐다.

PR #33은 머지 커밋 `6496490695c314ec5b37d592dfc36b61570b4925`로 MERGED임을 확인했다. 위 본문의 옛 명령 이름과 미확인 상태는 과외 당시의 기록이며, 최종 변경의 실제 앱 동작까지 재시험한 것은 아니다. 전달 메모는 처리 표식으로 정리했고 원문은 Git 이력에 보존했다.
