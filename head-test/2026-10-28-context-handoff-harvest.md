---
reviewed: false
status: draft
---

# 과외 인계 맥락 수확 — 2026-10-20~28

모기가 다음 세션에서도 같은 배경을 다시 설명하지 않아도 되도록, 원문에 남긴 선택과 현재 인계를 대조했다. **사용자 메시지의 저장 누락은 확인되지 않았지만, 최근 선호를 시작 인계에 연결하는 공백과 뒤늦은 결정의 상태 갱신 공백은 있었다.** 이 둘을 compaction의 의미 손실로 단정하지 않는다.

모기 요청은 “인계 넘기면서 빠진 중요한맥락 없는지”, 범위 답변은 “10월 20일 이후 세션만ㅋ”다. [제품의 수확 절차](../../mogi-productivity/runtime/harvest/README.md)를 읽고 여섯 구분을 공책에 적용했다. 제품 Runtime 담당 역할을 시작하거나 제품 파일을 수정한 것은 아니다. 이 문서는 수확 **초안**이며, 지침·훅·파일럿·최신 누적 검토에는 반영하지 않았다.

## 판독 범위와 방법

- 10/20에 이어진 10/19 시작 세션부터 10/28 현재 세션의 **Turn 35까지**, raw 8개를 대상으로 했다. 첫 파일의 10/19 발화는 경계 맥락으로 읽었으며 10/20 이후의 새 결정으로 세지 않았다. 수확 요청 Turn 36 이후와 감사 도중의 compaction은 집계에서 제외했다.
- 8개 파일의 **사용자 블록 339개를 전부 읽고**, 관련 최종 답변·도구 근거, 연결된 종료 기록 9개와 최신 10/22 누적 검토를 대조했다. 339개에는 자동 수신 알림과 붙여넣은 외부 글도 포함된다. 339개의 독립 선택·사람의 발화라는 뜻은 아니다.
- raw의 최종 답변은 338개다. S6 T52는 native에도 최종 답변 없이 중간 진행 메시지만 있어, raw의 보존 범위에 따른 차이로 확인했다. 전체 도구 출력 약 20MB와 모든 기술 설명 문장을 다시 의미 판독한 것은 아니다. 여기서 전수는 사용자 발화 전수와 native compaction 이벤트 전수다.
- `codex_session_key`와 native session ID의 SHA-256 앞 16자를 대조해 8개 원본을 연결했다. 모든 사용자 블록을 native 메시지에 매핑한 뒤, 각 compaction의 `replacement_history`에 **앞선 사용자 메시지의 전체 content 배열**이 동일하게 있는지 canonical JSON 해시로 비교했다. 이미지가 든 S3 T03도 텍스트 일부가 아닌 전체 배열을 비교했다.
- 현재 인계 비교 대상은 AGENTS·두 가이드·최신 누적 검토, 종료 기록, 실제 노트·파일럿, 관련 마스터 메모다. “Runtime과 다른 것”은 이 공책의 이 자료들을 뜻한다. 제품 진행 상태는 관련 작업만 읽기 전용으로 확인했다. 개인 일정·할 일의 완료를 추측할 질문은 만들지 않았다.

### Compaction에서 실제로 확인한 것

압축 뒤 에이전트가 과거 발화를 활용할 수 있는지 확인하려면, 먼저 저장 자체가 남았는지와 그 의미를 제대로 인수했는지를 나눠야 한다. 아래는 **저장 대조 결과**다.

| native compaction 시각(KST) | 원문 | 앞선 사용자 메시지 / 동일하게 보존된 메시지 |
|---|---|---|
| 10/20 14:01:46 | S1 · native 941행 | 33 / 33 |
| 10/20 17:42:59 | S1 · native 2132행 | 77 / 77 |
| 10/21 15:38:02 | S2 · native 797행 | 18 / 18 |
| 10/22 12:56:30 | S3 · native 1057행 | 27 / 27 |
| 10/23 15:19:19 | S5 · native 1006행 | 30 / 30 |
| 10/26 15:37:01 | S6 · native 1203행 | 38 / 38 |
| 10/27 19:06:06 | S7 · native 1387행 | 48 / 48 |
| 10/28 12:08:05 | S8 · native 771행 | 20 / 20 |

**8/8 이벤트에서 대조한 사용자 content 배열의 누락은 없었다.** 같은 세션의 두 압축은 앞선 발화를 중복 포함하므로 위 숫자를 고유 발화 수로 더하지 않는다. 8개 세션 중 7개에서 압축이 있었고, 한 세션의 최댓값은 2번이다. “한 세션에서 8번 압축해도 괜찮다”는 자료가 아니다.

8개 native 이벤트의 compaction 본문은 암호화된 항목으로 남아 있고 사람이 읽을 수 있는 `message`는 비어 있었다. 따라서 압축 요약의 의미 보존, 내부 주의·활용, 도구·답변 맥락 전체의 보존은 이 검사로 증명할 수 없다. 이번 자료로 새 세션 전환 횟수 기준이나 compaction과 설명 실수 사이의 인과를 정하지 않는다.

## 1. 모기가 확정한 것

단순한 “다음 가자”는 각 독해 진행 신호로 읽었다. 지속되는 선택·범위·운영 결정을 아래에 모았고, 뒤에 바뀐 선택은 함께 표시한다. 출처의 주체는 별도 표시가 없으면 **모기**다. 채택 여부는 반응의 강도가 아니라 실제 요청·선택으로 구분한다.

| 확정한 내용과 현재 범위 | 원문·시각 |
|---|---|
| 루틴의 오완료와 취소·삭제는 복구 부담이 다르다. 처음 말한 “둘 다 중단”은 최종 선택으로 고정하지 않는다. 뒤 문답에서 어제 취소 실패와 오늘 등록을 분리하는 방향으로 정정했고 담당자에게 전달했다. 구현 완료 판정은 이 발화만으로 하지 않는다. | [S1 T50](../raw/2026-10-19-01-routine-launcher-and-todo-ops-pr7.md#turn-50)（10/20 15:54 KST）・[S1 T58](../raw/2026-10-19-01-routine-launcher-and-todo-ops-pr7.md#turn-58)（10/20 16:08 KST）・[S1 T63](../raw/2026-10-19-01-routine-launcher-and-todo-ops-pr7.md#turn-63)（10/20 16:15 KST）・[S1 T65](../raw/2026-10-19-01-routine-launcher-and-todo-ops-pr7.md#turn-65)（10/20 16:18 KST）・[S1 T66](../raw/2026-10-19-01-routine-launcher-and-todo-ops-pr7.md#turn-66)（10/20 16:22 KST） |
| PR #39는 긴 배경보다 최종 동작·비교·검증이 드러난 축약 본문을 긍정 평가했다. 중요한 문제라고 설명도 무조건 길어야 하는 것은 아니다. | [S1 T70](../raw/2026-10-19-01-routine-launcher-and-todo-ops-pr7.md#turn-70)（10/20 17:16 KST）・[S1 T74](../raw/2026-10-19-01-routine-launcher-and-todo-ops-pr7.md#turn-74)（10/20 17:25 KST） |
| 설명 깊이 선택과 파일럿 누락 문제는 말로만 약속하지 않고 당시 한시 시험·관리 장치로 남기라고 요청했다. 현재 해당 파일럿 상태를 따르며 무한 연장하지 않는다. | [S1 T75](../raw/2026-10-19-01-routine-launcher-and-todo-ops-pr7.md#turn-75)（10/20 17:27 KST）・[S1 T76](../raw/2026-10-19-01-routine-launcher-and-todo-ops-pr7.md#turn-76)（10/20 17:30 KST）・[S1 T77](../raw/2026-10-19-01-routine-launcher-and-todo-ops-pr7.md#turn-77)（10/20 17:40 KST）・[S1 T80](../raw/2026-10-19-01-routine-launcher-and-todo-ops-pr7.md#turn-80)（10/20 17:47 KST） |
| 복잡한 관계 구간에는 코드와 대응 설명·그림을 옆에 두되 모든 코드에 강제하지 않는다. Markdown에서 읽기 어려우면 HTML을 허용했다. | [S2 T18](../raw/2026-10-21-01-todo-ops-pr8-hooks-and-code-visualization.md#turn-18)（10/21 15:21 KST） |
| Python Tutor 적용본은 맞지 않아 중단하고 다음 독해로 넘겼다. 이것은 시각화 전체 거부가 아니다. | [S2 T19](../raw/2026-10-21-01-todo-ops-pr8-hooks-and-code-visualization.md#turn-19)（10/21 15:39 KST）・[S2 T20](../raw/2026-10-21-01-todo-ops-pr8-hooks-and-code-visualization.md#turn-20)（10/21 16:15 KST） |
| PR #8의 실행 시점·입력 출처를 가까이 밝히라고 정정했고, 긴 노트 대신 짧은 문답 방식으로 다시 시도했다. | [S3 T09](../raw/2026-10-21-02-pr8-inline-reference-visuals.md#turn-09)（10/21 18:20 KST）・[S3 T10](../raw/2026-10-21-02-pr8-inline-reference-visuals.md#turn-10)（10/21 18:25 KST）・[S3 T11](../raw/2026-10-21-02-pr8-inline-reference-visuals.md#turn-11)（10/21 18:27 KST）・[S3 T15](../raw/2026-10-21-02-pr8-inline-reference-visuals.md#turn-15)（10/22 11:53 KST） |
| 빈 줄에 따라 키워드 수집 범위가 달라지는 문제와 에이전트가 쓰는 문서의 형식 검사를 전달했다. 파서 수정과 별도 lint를 구분한다. | [S3 T16](../raw/2026-10-21-02-pr8-inline-reference-visuals.md#turn-16)（10/22 11:56 KST）・[S3 T21](../raw/2026-10-21-02-pr8-inline-reference-visuals.md#turn-21)（10/22 12:29 KST）・[S3 T22](../raw/2026-10-21-02-pr8-inline-reference-visuals.md#turn-22)（10/22 12:35 KST）・[S3 T24](../raw/2026-10-21-02-pr8-inline-reference-visuals.md#turn-24)（10/22 12:37 KST） |
| whiteboard 관련 활성 설정을 없애고 공책에서 진행하도록 요청했다. 현재는 과거 근거를 읽는 저장소이며 그곳의 역할·통신 절차를 새로 시작하지 않는다. | [S3 T28](../raw/2026-10-21-02-pr8-inline-reference-visuals.md#turn-28)（10/22 12:58 KST）・[S3 T29](../raw/2026-10-21-02-pr8-inline-reference-visuals.md#turn-29)（10/22 13:01 KST） |
| PR #8 노트는 더 읽지 않고 종료했다. `reviewed: false`를 근거로 독해 재개를 자동 배정하지 않는다. | [S4 T02](../raw/2026-10-22-01-pr44-things-call-paths-and-verification.md#turn-02)（10/22 13:53 KST） |
| PR #45 커밋 메시지 읽기는 유용했다고 보고했다. replay 구상은 즉시 구현 금지였고, 여러 커밋의 변경 장면 그림만 한시 시험을 요청했다. | [S4 T17](../raw/2026-10-22-01-pr44-things-call-paths-and-verification.md#turn-17)（10/22 17:06 KST）・[S4 T19](../raw/2026-10-22-01-pr44-things-call-paths-and-verification.md#turn-19)（10/22 17:10 KST）・[S4 T20](../raw/2026-10-22-01-pr44-things-call-paths-and-verification.md#turn-20)（10/22 17:11 KST）・[S4 T21](../raw/2026-10-22-01-pr44-things-call-paths-and-verification.md#turn-21)（10/22 17:12 KST） |
| 최신 누적 개수 안내 장치만 만들고 누적 검토를 수행한 뒤, 당분간 새 하네스·설명 도구를 늘리지 말라고 정했다. 현재 감사 요청은 이 제한을 일반적으로 해제하지 않는다. | [S5 T04](../raw/2026-10-22-02-pr11-story-first-and-reader-ab.md#turn-04)（10/22 17:42 KST）・[S5 T06](../raw/2026-10-22-02-pr11-story-first-and-reader-ab.md#turn-06)（10/22 17:58 KST）・[S5 T07](../raw/2026-10-22-02-pr11-story-first-and-reader-ab.md#turn-07)（10/22 18:23 KST） |
| story-first를 최우선으로 고쳤다. 사용자 요청에서 기대하는 결과와 이번 변경·시험의 뜻을 먼저 잇는다. `sent:true` 사례의 특정 문구·순서를 모든 설명에 강제하는 규칙은 아니다. | [S5 T10](../raw/2026-10-22-02-pr11-story-first-and-reader-ab.md#turn-10)（10/23 14:02 KST）・[S5 T11](../raw/2026-10-22-02-pr11-story-first-and-reader-ab.md#turn-11)（10/23 14:04 KST）・[S5 T12](../raw/2026-10-22-02-pr11-story-first-and-reader-ab.md#turn-12)（10/23 14:06 KST）・[S5 T20](../raw/2026-10-22-02-pr11-story-first-and-reader-ab.md#turn-20)（10/23 14:44 KST）・[S5 T21](../raw/2026-10-22-02-pr11-story-first-and-reader-ab.md#turn-21)（10/23 14:47 KST） |
| 본문 독자에게 없는 맥락을 찾는 제한 독자 A/B를 실험으로 전달했다. 버전 2 선호는 관찰됐지만 “코드를 못 읽는 워커가 더 낫다”는 가설은 확인되지 않았다. | [S5 T18](../raw/2026-10-22-02-pr11-story-first-and-reader-ab.md#turn-18)（10/23 14:15 KST）・[S5 T19](../raw/2026-10-22-02-pr11-story-first-and-reader-ab.md#turn-19)（10/23 14:16 KST）・[S5 T22](../raw/2026-10-22-02-pr11-story-first-and-reader-ab.md#turn-22)（10/23 14:52 KST）・[S5 T23](../raw/2026-10-22-02-pr11-story-first-and-reader-ab.md#turn-23)（10/23 14:53 KST） |
| 세션 종료에는 공책 push까지 포함하라고 명시했다. 실제 종료 전의 카드 전환·compaction은 종료가 아니다. | [S5 T29](../raw/2026-10-22-02-pr11-story-first-and-reader-ab.md#turn-29)（10/23 15:08 KST）・[S5 T30](../raw/2026-10-22-02-pr11-story-first-and-reader-ab.md#turn-30)（10/23 15:16 KST） |
| 넓은 호출 구조는 트리 하나에 전부 넣지 않고 몇 단계로 나눠 보도록 요청했다. 단계별 트리와 두 흐름 나란히 비교에 긍정 반응 후 IDE 직접 추적을 선택했다. | [S6 T28](../raw/2026-10-26-01-pr49-pr51-and-claim-check.md#turn-28)（10/26 14:34 KST）・[S6 T29](../raw/2026-10-26-01-pr49-pr51-and-claim-check.md#turn-29)（10/26 14:35 KST）・[S6 T30](../raw/2026-10-26-01-pr49-pr51-and-claim-check.md#turn-30)（10/26 14:36 KST）・[S6 T31](../raw/2026-10-26-01-pr49-pr51-and-claim-check.md#turn-31)（10/26 14:39 KST）・[S6 T32](../raw/2026-10-26-01-pr49-pr51-and-claim-check.md#turn-32)（10/26 14:43 KST）・[S6 T34](../raw/2026-10-26-01-pr49-pr51-and-claim-check.md#turn-34)（10/26 14:52 KST） |
| 시험은 사용자가 호출하는 외부 경계를 보면서 잘못된 검증을 잡아야 한다고 질문했다. 서비스 내부 호출을 시험에서 그대로 복제하는 방식과 변경 후 시험이 의미를 유지하는지를 구분했다. | [S6 T35](../raw/2026-10-26-01-pr49-pr51-and-claim-check.md#turn-35)（10/26 15:04 KST）・[S6 T36](../raw/2026-10-26-01-pr49-pr51-and-claim-check.md#turn-36)（10/26 15:06 KST）・[S6 T37](../raw/2026-10-26-01-pr49-pr51-and-claim-check.md#turn-37)（10/26 15:07 KST） |
| PR #51 노트를 만들고, 그 노트의 자유 메모는 요청한 퀴즈로 바꿨다. 해당 노트의 선택이며 모든 모기 박스를 퀴즈로 바꾸라는 요청은 아니다. | [S6 T38](../raw/2026-10-26-01-pr49-pr51-and-claim-check.md#turn-38)（10/26 15:24 KST）・[S6 T40](../raw/2026-10-26-01-pr49-pr51-and-claim-check.md#turn-40)（10/26 15:45 KST） |
| PR #51 노트는 처음 커밋에서 제외했다가 다음 세션 말미 포함해 커밋·push하라고 변경했다. 실제 노트·답안 커밋 `cec1c0a`도 확인했다. | [S6 T39](../raw/2026-10-26-01-pr49-pr51-and-claim-check.md#turn-39)（10/26 15:37 KST） → [S7 T59](../raw/2026-10-27-01-todo-ops-pr18-stop-and-sandbox.md#turn-59)（10/28 08:44 KST） |
| PR #49·후속 독해에서는 별도 퀴즈 없이 마쳤고 PR #53에서는 3~4개를 요청했다. 퀴즈는 매 PR의 필수 절차도, 영구 폐지도 아니다. | [S6 T60](../raw/2026-10-26-01-pr49-pr51-and-claim-check.md#turn-60)（10/26 18:41 KST） / [S8 T15](../raw/2026-10-28-01-pr53-launcher-signing-and-tests.md#turn-15)（10/28 09:23 KST） |
| 과외는 모기가 제품을 어떻게 사용할지 검토하는 자리이기도 하다. STOP 파일을 누가 만드는지 등 실제 운영을 이해하는 질문을 단순 작업 지시로 밀어내지 않는다. | [S7 T13](../raw/2026-10-27-01-todo-ops-pr18-stop-and-sandbox.md#turn-13)（10/27 11:40 KST） |
| copywork는 설명 전체를 자동 복제하는 대신 모기가 이해하고 인상 깊은 부분을 직접 골라 Bear로 보내는 방식이다. | [S7 T38](../raw/2026-10-27-01-todo-ops-pr18-stop-and-sandbox.md#turn-38)（10/27 12:59 KST） |
| 개별 셸 예외를 계속 직접 구현하기보다 Anthropic·OpenAI의 공식 설계·공개 구현을 참고·재사용할 범위를 조사하고 전달하라고 요청했다. 특정 구현의 도입 성공까지 확정한 것은 아니다. | [S7 T52](../raw/2026-10-27-01-todo-ops-pr18-stop-and-sandbox.md#turn-52)（10/27 19:14 KST）・[S7 T55](../raw/2026-10-27-01-todo-ops-pr18-stop-and-sandbox.md#turn-55)（10/27 19:20 KST） |
| 제품 최신화를 포기하거나 매번 수동 명령으로 바꾸기로 정하지 않았다. 공식 구현 검토와 별도 최신화 경로가 후속 작업으로 기록돼 진행 중이라는 맥락이다. | [S7 T53](../raw/2026-10-27-01-todo-ops-pr18-stop-and-sandbox.md#turn-53)（10/27 19:17 KST）・[S7 T54](../raw/2026-10-27-01-todo-ops-pr18-stop-and-sandbox.md#turn-54)（10/27 19:18 KST）・[S7 T57](../raw/2026-10-27-01-todo-ops-pr18-stop-and-sandbox.md#turn-57)（10/27 19:28 KST）・[S7 T58](../raw/2026-10-27-01-todo-ops-pr18-stop-and-sandbox.md#turn-58)（10/28 08:40 KST） |
| 동결 전후 보고서를 요청했고, 문서 정리는 먼저 조사한 뒤 archive 이동 제안을 채택했다. 사용자 참여·선택 보존의 가치와 AI 요약문만 남은 자료의 부담을 구분했다. | [S8 T18](../raw/2026-10-28-01-pr53-launcher-signing-and-tests.md#turn-18)（10/28 11:32 KST）・[S8 T19](../raw/2026-10-28-01-pr53-launcher-signing-and-tests.md#turn-19)（10/28 11:48 KST）・[S8 T20](../raw/2026-10-28-01-pr53-launcher-signing-and-tests.md#turn-20)（10/28 11:53 KST） |
| Things에는 정확한 제목·Area·ID보다 키워드로 요청한다. 이 사용 방식을 유지하면서 대상 선택을 검토할 문제를 전달하라고 요청했다. | [S8 T24](../raw/2026-10-28-01-pr53-launcher-signing-and-tests.md#turn-24)（10/28 12:37 KST）・[S8 T32](../raw/2026-10-28-01-pr53-launcher-signing-and-tests.md#turn-32)（10/28 13:20 KST） |
| Things 검색 범위와 preview ID를 apply에 넘기지 않는 문제는 다음 PR에서 고치기로 했다고 알렸다. 사용자 보고된 결정이며 구현·머지 확인과는 구분한다. | [S8 T34](../raw/2026-10-28-01-pr53-launcher-signing-and-tests.md#turn-34)（10/28 13:28 KST） |

## 2. 진행 중·미루는 것

기존 진행 사항을 새 “재확인 과제”로 낮추거나 모두 다시 질문하지 않는다. 아래 상태는 **10/28 감사 시점 조회**이며 작업 기록의 보고와 독립 검증을 구분한다.

| 항목 | 현재 남길 상태·근거 |
|---|---|
| Things 후보 검색 범위·preview/apply 대상 연결 | 모기는 다음 PR 수정 결정으로 보고했다(S8 T34, 10/28 13:28 KST). 정확한 후속 PR 번호·구현·실제 앱 검증은 이 수확에서 미확인. 마스터 메모 마지막 상태는 이 발화 직전의 미결 상태라 후속 갱신이 필요하다. |
| playbook 키워드 파서·형식 lint | `bd --readonly show td-34w td-j33 --json`으로 둘 다 OPEN 확인. 수집 범위 제한을 먼저, 형식 lint를 그 뒤에 하는 기존 결정이다. 새로 린트 도입 여부를 묻지 않는다. |
| Things 구조 분리 PR #45 | `td-0fd`는 CLOSED이며 PR #45 merge 보고와 통합 명령 결과 계약이 기록돼 있다. 옛 노트의 리팩토링 제안을 아직 착수 전으로 승계하지 않는다. 실제 앱 경로 시험의 과거 미확인 범위와 구현 완료는 별개다. |
| 전체 프로세스 격리·relay | `td-xfp.4` IN_PROGRESS. 10/28 작업 노트는 srt fork 구현 후 다음 투두냥 세대 인계와 함께 MogiRelay를 쓰고 그 전까지 Things/Calendar 직접 호출을 유지하는 계획으로 보고한다. 모기의 이 공책 직접 발화와 다른 출처인 **담당 작업 기록**이다. |
| 고정 제품 최신화 명령 | `td-xfp.5` OPEN. main pull·runtime ff 경로 분리 계획이며 투두냥만 실행하도록 강제할 방법은 미정이다. 최신화 자동화 폐기로 바꾸지 않는다. |
| 셸 차분 시험·파서 교체 | `td-xfp`의 기존 방향 변경에 따라 `.2`·`.3`은 보류다. 예전 제안을 근거로 바로 실험·구현하지 않는다. |
| 설명 깊이·커밋 장면·참조 완전성·native compaction 파일럿 | 각각 원문에 기록된 awaiting-review·횟수를 따른다. 커밋 장면은 현재 1/1이며, 감사 중 상태를 바꾸거나 추가 시행하지 않았다. |
| A/B 독자 실험 | S5 T23의 “몇 번 더”는 추가 관찰 의향이다. 횟수·후속 성공을 지어내거나 상설 워커 구조로 취급하지 않는다. |
| 이미 종료한 독해·미관찰 | PR #8 독해 종료, 피로로 남겨둔 과거 독해, 별도 새 사례·지연 적용 미관찰은 자동 복습 과제가 아니다. PR #53 네 답을 모두 독립 정답으로 기록하지 않는다. 마지막 문제는 도움을 받은 뒤 별도 재시험을 하지 않았다. |

관련 비교 자료: [마스터 메모](../master-delivery-memos.md), [현재 커밋 장면 파일럿](../harness/pilots/2026-10-22-commit-change-scenes.md). 제품·운영 저장소에는 쓰지 않았고 조회를 새 작업 승인으로 해석하지 않았다.

## 3. 모기의 의미·선호

- story-first는 설명 맨 앞에 행동 한 줄을 장식으로 붙이는 것이 아니라, 뒤의 값·코드·시험이 그 사건에서 왜 필요한지 이어주는 것이다. 현재 지침에 반영돼 있다. **모기** · [S5 T10](../raw/2026-10-22-02-pr11-story-first-and-reader-ab.md#turn-10)（10/23 14:02 KST）・[S5 T11](../raw/2026-10-22-02-pr11-story-first-and-reader-ab.md#turn-11)（10/23 14:04 KST）・[S5 T12](../raw/2026-10-22-02-pr11-story-first-and-reader-ab.md#turn-12)（10/23 14:06 KST）
- 모든 낯선 용어를 그때마다 공부할지 모기가 판단하는 부담을 줄이고 싶다. 중요도·긴 설명·diff 완독은 같은 선택이 아니다. **모기** · [S1 T74](../raw/2026-10-19-01-routine-launcher-and-todo-ops-pr7.md#turn-74)（10/20 17:25 KST）
- 한꺼번에 큰 호출 트리를 보이는 것보다 큰 갈래 → 필요한 갈래 → 함수 안으로 내려가고 현재 위치를 유지하는 설명이 이번 PR #51에서 잘 맞았다. 모든 짧은 질문의 고정 양식은 아니다. **모기** · [S6 T29](../raw/2026-10-26-01-pr49-pr51-and-claim-check.md#turn-29)（10/26 14:35 KST）・[S6 T30](../raw/2026-10-26-01-pr49-pr51-and-claim-check.md#turn-30)（10/26 14:36 KST）・[S6 T31](../raw/2026-10-26-01-pr49-pr51-and-claim-check.md#turn-31)（10/26 14:39 KST）
- 표·정적 글자 트리·원문 보존도 충분히 유용할 수 있다. Python Tutor 실패를 “그림 싫음”으로, PNG 긍정을 “모든 내용 이해”로 일반화하지 않는다. **모기** · [S2 T20](../raw/2026-10-21-01-todo-ops-pr8-hooks-and-code-visualization.md#turn-20)（10/21 16:15 KST） / [S4 T20](../raw/2026-10-22-01-pr44-things-call-paths-and-verification.md#turn-20)（10/22 17:11 KST）
- 실제 사용 조건을 따져 보는 것은 과외 목적의 일부다. 사용자에게 왜 위험할지·편리할지 같이 읽되, 제품 작업 지시·우선순위·머지 판단은 마스터의 경계로 남긴다. **모기** · [S7 T13](../raw/2026-10-27-01-todo-ops-pr18-stop-and-sandbox.md#turn-13)（10/27 11:40 KST）
- 직접 고른 copywork·답안·메모의 보존 가치가 크다. 그렇다고 모기가 직접 요청해 저장한 AI 답변까지 일괄 폐기하지 않는다. 현재 archive 정리도 삭제가 아닌 선택 이력을 남기는 방식이다. **모기** · [S7 T38](../raw/2026-10-27-01-todo-ops-pr18-stop-and-sandbox.md#turn-38)（10/27 12:59 KST） / [S8 T19](../raw/2026-10-28-01-pr53-launcher-signing-and-tests.md#turn-19)（10/28 11:48 KST）・[S8 T20](../raw/2026-10-28-01-pr53-launcher-signing-and-tests.md#turn-20)（10/28 11:53 KST）
- 자바·Spring 경험이 비유의 출발점이다. HTTP·Unix socket까지 이미 안다고 가정하지 않는다. HikariCP 비교는 이 문답에서 요청한 간략 비교다. **모기** · [S8 T26](../raw/2026-10-28-01-pr53-launcher-signing-and-tests.md#turn-26)（10/28 12:56 KST）・[S8 T29](../raw/2026-10-28-01-pr53-launcher-signing-and-tests.md#turn-29)（10/28 13:13 KST）・[S8 T30](../raw/2026-10-28-01-pr53-launcher-signing-and-tests.md#turn-30)（10/28 13:17 KST）
- Things에서 제목·ID를 기계적으로 정확히 말하도록 요구하면 원래 자연어 사용 방식과 어긋난다. 검색의 편리함과 실제 변경 대상 확정을 나눠 생각한다. **모기** · [S8 T24](../raw/2026-10-28-01-pr53-launcher-signing-and-tests.md#turn-24)（10/28 12:37 KST）
- “내가 요즘 날카로워진 느낌”은 모기의 자기평가다. 질문이 설계 구멍·시험 경계를 드러낸 사례는 기록하되 일반 능력 변화나 인지 원인의 측정으로 바꾸지 않는다. **모기** · [S8 T17](../raw/2026-10-28-01-pr53-launcher-signing-and-tests.md#turn-17)（10/28 11:28 KST）

## 4. 냥이 제안 — 채택과 미채택 구분

| 제안·해석 | 출처와 판정 |
|---|---|
| 단계별 호출 트리, 나란한 경로 비교 | 과외냥이의 설명 방식 제안 뒤 S6 T30·T32가 직접 요청했고 T31·T33에 반응했다. **해당 설명에서 채택**. 모든 답에 적용하는 일반 프로토콜 승격은 아님. |
| 생성·수정을 분리하거나 Area·ID를 필수화하는 방향 | 과외냥이가 S8 T23~24 주변에서 제안했으나 기존 T44의 전체 검색·재사용 선택을 먼저 확인하지 못했다. **미채택**. 이후 현재 메모에서 정정했다. S8 T34의 다음 PR 결정은 두 문제의 수정 결정이지 이 후보 설계 전체의 승인으로 읽지 않는다. |
| 범용 도구·시각화 추천 | S2 T17·S3 T02·T14에는 붙여넣은 외부 GPT 설명이 섞여 있다. **외부 제안**을 모기의 모든 문장·현재 정책·인지 사실로 등록하지 않는다. 직접 요청한 적용과 중단만 구분한다. |
| 제한 독자가 맥락을 못 이해하는 부분을 보충하는 A/B | 모기 발안(S5 T18), 전달·실험 요청(T19), 이후 원하는 조건과 실제 버전이 달랐다는 정정(T23)이 있다. **시험 채택, 효용 가설 미확정**. “버전 2가 좋음”을 제한 독자 승리로 바꾸지 않는다. |
| 전체 프로세스 sandbox·VM·고정 최신화 경로 | 조사 후보와 담당자의 후속 계획을 구분한다. S7 T55는 공식 설계·공개 구현 참고 요청. 개별 후보의 안전·호환성·실제 제품 적용 성공은 이 요청만으로 확정되지 않는다. |
| compaction 1~2번 또는 특정 milestone에서 새 세션 | S8 T35는 모기의 기존 습관과 연구 질문이며, 과외냥이 답변의 운영 조언도 **검증된 횟수 기준·사용자 채택 아님**. 감사 표로 새 임계값을 만들지 않는다. |

## 5. Runtime과 다른 것 — 모기에게 보여줄 차이

원문 자체는 남아 있어도 다음 시작에 연결되지 않으면 같은 요청을 다시 받아야 한다. 아래 1~3은 **인계 연결 후보**, 4~5는 **확인된 후속 상태**다. 기존 지침을 자동 수정하지 않았다.

| 번호 | 현재 문구·연결 상태 ↔ 원문 | 수확할 차이·범위 |
|---|---|---|
| 1 | 최신 10/22 누적 검토는 질문에 맞는 호출 트리를 고르라고 한다. S6 T29~34(10/26 14:35~14:52 KST)는 더 구체적으로 몇 단계로 나누고 현재 위치를 유지하는 방식을 요청·긍정했다. 10/26 종료 기록과 PR #51 노트에는 남아 있다. | 저장 소실 아님. **큰 코드 흐름에는 단계별 트리**라는 후속 선호가 통상 시작 인계에 덜 연결돼 있다. 짧은 질문까지 강제하지 않는다. |
| 2 | 프리앰블 역할·범위는 설명·학습을 강조한다. S7 T13(10/27 11:40 KST)은 “내가 어떻게 사용할지 검토”가 과외 목적이라고 명시한다. 종료 기록에는 보존돼 있다. | 사용 조건을 이해·검토하는 질문도 함께 다룬다는 의미를 인계할 가치가 있다. 제품 수정·우선순위 판단 권한을 확대하는 뜻은 아니다. |
| 3 | 최신 누적 검토는 보조물 선택·원문 보존을 다루지만, S7 T38(10/27 12:59 KST)의 **직접 선택한 copywork**와 S8 T19~20(10/28 11:48~11:53 KST)의 자료 보존 고민은 그 뒤다. archive README에는 이번 정리 기준이 남아 있다. | 직접 고른 메모·답안·인상 깊은 부분을 남기는 방식이라는 의미를 인계 후보로 둔다. 자동 Bear 저장·자동 퀴즈·AI 설명 일괄 삭제는 승인되지 않았다. |
| 4 | 마스터 메모의 Things 마지막 상태는 회신 수신 뒤 정책 변경·구현 착수 없음이다. S8 T34(10/28 13:28 KST)는 두 문제를 **다음 PR에서 고치기로 했다**는 후속 사용자 보고다. | 옛 미결 상태만 승계하면 결정이 누락된다. 수정 결정은 사용자 보고로 확정 보존하고 후속 PR·구현·머지 여부는 미확인으로 둔다. 수확 초안 밖의 상태 메모에는 아직 append하지 않았다. |
| 5 | 10/26·10/28 종료 기록은 당시 PR #51 노트가 커밋 제외 상태였다고 적었다. S7 T59(10/28 08:44 KST)는 포함해 커밋·push하라고 뒤집었고 실제 `cec1c0a`가 있다. | **노트 제외는 해제됐다.** 옛 종료 기록을 현재의 영구 제외 지시로 읽지 않는다. 역사 기록 자체를 덮어쓰지 않는다. |

### 이미 잘 보존돼 새 누락으로 세지 않은 것

- story-first 우선, 사건별 2~3턴 설명, 주어·시점·출처를 가까이 놓기, 자유 문답·요청형 퀴즈, 상태 체크는 모기가 직접 하기, 종료 push는 현재 가이드에 있다.
- 10/22 이후 새 도구를 늘리지 말라는 요청은 최신 누적 검토의 다음 적용 절에 있다. 이번 감사 때문에 새 상시 기억 장치·훅을 만들지 않았다.
- “같은 제목 시험은 잡음”이라는 과거 표현은 반복 템플릿 ID 문맥이었다. 현재 일반 Things add의 같은 제목 오선택 질문을 불필요하다고 폐기할 근거가 아니다.
- 기존 worker-reap, Notes 선택(T40), Things 제목 재사용(T44)을 늦게 확인한 설명 실수는 과거 근거를 먼저 확인할 교훈이다. 저장된 원문이 없었다거나 compaction 때문이라는 인과는 확인되지 않았다.
- STOP 생성 주체·실제 경로를 확인하지 않고 운영을 가정한 경우는 설명 입력·근거 확인 문제다. 모기의 기억·이해 문제로 귀속하지 않는다.

## 6. 모기만 아는 질문

**이번 초안에서 새로 물을 질문은 없다.** 이미 명시한 선택을 다시 승인받는 질문으로 복제하지 않는다. 후속 PR 번호·제품 적용 여부는 담당 작업·PR에서 확인할 사항이며, 이번 감사의 의미를 위해 모기가 답해야 할 질문은 아니다.

다만 5절의 1~3을 시작 인계에 어떤 문구로 연결할지에 대한 **수확 초안 검토는 아직 미확인**이다. 침묵을 승인으로 보지 않으며 이 이유로 확정된 원래 발화를 미정으로 낮추지 않는다. 4~5는 새 제안이 아니라 후속 원문·커밋에 따른 상태 정정이다.

## 모기 확인

- 범위 답변 원문: “10월 20일 이후 세션만ㅋ”.
- 차이 목록에 대한 확인·정정: 아직 받지 않음. 답하지 않은 번호는 유지한다.
- 이번 작업으로 반영한 것: 이 초안 파일만 작성. 운영 지침·누적 검토·마스터 메모·제품 Runtime 변경 없음. 메시지 발송·실제 Things 쓰기·추가 파일럿·세션 종료 처리 없음.

## 원문 목록과 무결성 도장

해시는 raw의 **감사 시점 첫 N바이트**를 대상으로 한 SHA-256이다. 현재 세션 이후 append와 과거 세션 말미 추가 기록이 있어도 당시 판독 범위를 재검사할 수 있다. native 행 번호는 그 세션 JSONL의 이벤트 행이며, native 본문·개인 메모를 이 문서에 복제하지 않았다. raw는 고치지 않았다.

| 기호 | 원문·판독 턴 수 | prefix 바이트 | SHA-256 |
|---|---|---:|---|
| S1 | [2026-10-19-01-routine-launcher-and-todo-ops-pr7.md](../raw/2026-10-19-01-routine-launcher-and-todo-ops-pr7.md) · 83턴 | 2446677 | `966f011ea4455454110a047fad758b8b32fc6394997fd5a057814fe29b0aed0b` |
| S2 | [2026-10-21-01-todo-ops-pr8-hooks-and-code-visualization.md](../raw/2026-10-21-01-todo-ops-pr8-hooks-and-code-visualization.md) · 20턴 | 2682702 | `f7dc1af3befcd37b4d8655487d42aaad151059e79333d1279af63bcfe1292e99` |
| S3 | [2026-10-21-02-pr8-inline-reference-visuals.md](../raw/2026-10-21-02-pr8-inline-reference-visuals.md) · 29턴 | 4119206 | `0c1fe1a9b424370aec1ba6730e650e0654716277d37ff818538b2bfdb46a62fd` |
| S4 | [2026-10-22-01-pr44-things-call-paths-and-verification.md](../raw/2026-10-22-01-pr44-things-call-paths-and-verification.md) · 22턴 | 1002958 | `186ddb6b9d0d9b14e2ca92e4d2b59426b65ada680e81e9893c4ffa7f0f444a08` |
| S5 | [2026-10-22-02-pr11-story-first-and-reader-ab.md](../raw/2026-10-22-02-pr11-story-first-and-reader-ab.md) · 30턴 | 1080225 | `a91a631276168b91d74303c41687f647dcb5f3f4cbf222d792b7e74ad7b3bf2b` |
| S6 | [2026-10-26-01-pr49-pr51-and-claim-check.md](../raw/2026-10-26-01-pr49-pr51-and-claim-check.md) · 61턴 | 2032616 | `204bfb322837ded18427d371a3458d9078770f6c5c5d99d55400e564d7f9d190` |
| S7 | [2026-10-27-01-todo-ops-pr18-stop-and-sandbox.md](../raw/2026-10-27-01-todo-ops-pr18-stop-and-sandbox.md) · 59턴 | 1861069 | `82277037cd38e46580384ff280fb8412b269e9cb5be0a715bc3f2f8a4501d3cf` |
| S8 | [2026-10-28-01-pr53-launcher-signing-and-tests.md](../raw/2026-10-28-01-pr53-launcher-signing-and-tests.md) · 35턴 | 2091663 | `1ebe205baf7e7fb6e0000fa4724060a0fed74ec322b8ff9a0cc16fd84b72cad3` |

### 대조한 종료 기록 9개

- [2026-10-20-routine-launcher-and-todo-ops-pr7-session-end-analysis.md](./2026-10-20-routine-launcher-and-todo-ops-pr7-session-end-analysis.md)
- [2026-10-20-pr39-tdd-and-pilot-routing-session-end-analysis.md](./2026-10-20-pr39-tdd-and-pilot-routing-session-end-analysis.md)
- [2026-10-21-todo-ops-pr8-hooks-and-code-visualization-session-end-analysis.md](./2026-10-21-todo-ops-pr8-hooks-and-code-visualization-session-end-analysis.md)
- [2026-10-22-pr8-focused-parser-tutoring-session-end-analysis.md](./2026-10-22-pr8-focused-parser-tutoring-session-end-analysis.md)
- [2026-10-22-pr44-things-call-paths-and-verification-session-end-analysis.md](./2026-10-22-pr44-things-call-paths-and-verification-session-end-analysis.md)
- [2026-10-22-pr45-commit-reading-and-replay-session-end-analysis.md](./2026-10-22-pr45-commit-reading-and-replay-session-end-analysis.md)
- [2026-10-23-pr11-story-first-and-reader-ab-session-end-analysis.md](./2026-10-23-pr11-story-first-and-reader-ab-session-end-analysis.md)
- [2026-10-26-pr49-pr51-and-claim-check-session-end-analysis.md](./2026-10-26-pr49-pr51-and-claim-check-session-end-analysis.md)
- [2026-10-28-todo-ops-pr18-stop-and-sandbox-session-end-analysis.md](./2026-10-28-todo-ops-pr18-stop-and-sandbox-session-end-analysis.md)

종료 기록 9개는 파일 수이며 독립 세션 9회가 아니다.

### 인계 비교 자료

- [최신 누적 검토](./2026-10-22-learning-observation-cumulative-review.md) · [AGENTS](../AGENTS.md) · [과외 가이드](../guide-tutor-preamble.md) · [관찰 가이드](../guide-mogi-head-test.md)
- [PR #51 노트](../code-diff-notes/mogi-productivity/2026-10-26-pr51-upcoming-call-flow-and-test-boundaries.md) · [archive 방침](../archive/README.md) · [마스터 메모](../master-delivery-memos.md)의 관련 항목
