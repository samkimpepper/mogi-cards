## 결론

**지금 부족한 건 하네스 개수가 아니라, 산출물을 사람이 소비·승인하는 방식이야.**

이미 `code-review-graph`, `.agent`, GSD phase 문서, 코드/PLAN 리뷰 가이드까지 충분히 많아. 여기에 비슷한 스킬을 더 얹으면 품질보다 문서 부채와 stale 가능성이 커질 수 있어. 네 치트시트도 이미 “새 시스템을 또 만들기 전에 기존 체계를 확인하라”, “기억으로 설계하지 말고 코드로 확인하라”고 같은 문제를 기록하고 있어.  

그리고 솔직히 말하면 현재 가장 위험한 흐름은 이거야.

> 에이전트가 긴 PLAN을 만듦 → 모기는 대충 승인 → 구현 중 실측이 PLAN을 뒤집음 → 다른 에이전트가 다시 검토 → 문서를 더 추가함

이걸 해결하려고 **문서를 더 잘 읽는 의지**에만 기대면 안 돼. 읽는 연습은 필요하지만, 정확성이 네가 매번 수천 줄을 성실하게 읽는지에 의존하면 시스템 설계가 잘못된 거야.

---

# 필요한 것 1: 사람용 `Review Packet`

긴 SPEC·PLAN·SUMMARY는 에이전트와 감사 기록용으로 유지해. 대신 모기가 승인할 때 반드시 읽는 **한 화면짜리 요약**을 별도로 생성해야 해.

```md
## 모기 승인용 — 3분

목표:
- 무엇을 바꾸는가

잠긴 불변식:
- 절대로 바뀌면 안 되는 것 1~3개

실측 완료:
- 어떤 가정을 어떤 명령/테스트로 확인했는가

계획과 달라진 점:
- 없음 / 무엇이 왜 달라졌는가

데이터·권한 영향:
- 없음 / 구체적인 영향

남은 위험:
- 무엇이 아직 검증되지 않았는가

롤백:
- 코드 롤백 가능 여부
- 데이터 롤백 가능 여부

모기가 결정할 것:
- A / B / 중단
```

규칙은 단순하게:

* 최대 12~15줄
* `FYI`와 `결정 필요`를 분리
* “PASS”보다 **무슨 근거로 PASS인지** 표시
* 긴 본문은 링크로만 연결
* 권한·마이그·데이터 손실 가능성이 있으면 해당 줄을 직접 읽기 전 승인 금지

모기가 모든 산출물을 읽을 필요는 없어. 다만 **목표, 불변식, deviation, 데이터·권한 영향, 남은 위험** 다섯 가지는 직접 읽어야 해.

고위험 변경에서는 승인 답변도 단순 `ㅇㅋ` 대신 한 줄 teach-back으로 하는 게 좋아.

```text
공식 is_dupe는 assessment 저장으로 바뀌지 않고,
legacy writer는 cutover 때 닫는 것으로 이해함. 진행.
```

이 한 줄이 체크박스 열 개보다 실제 이해 여부를 잘 드러내.

---

# 필요한 것 2: PLAN의 모든 가정을 `실측 대상`으로 만들기

42-03에서 틀린 것은 세부 구현보다 **PLAN에 사실처럼 적힌 가정**이었어.

* `is_dupe` 기본값이 false일 것
* 함수 EXECUTE가 anon에 기본 부여되지 않을 것
* 로컬 Supabase 환경을 사용할 수 있을 것

Travelog이 잘 보여준 핵심도 “추론을 더 정교하게 하자”가 아니라 **가정을 빨리 실측하자**야.

PLAN마다 이 표를 의무화하는 게 가장 효과적이야.

```md
## Assumption / Evidence

| 가정 | 위험 | 구현 전 확인 방법 | 결과 | 실패 시 행동 |
|---|---|---|---|---|
| is_dupe default=false | 공식 관계 오염 | catalog/migration 조회 | true | 명시 INSERT + default hardening |
| anon EXECUTE 없음 | 권한 노출 | role_routine_grants 조회 | 있음 | 명시 REVOKE |
| local Supabase 사용 가능 | 검증 불가 | runtime profile 확인 | 불가 | cloud-safe 경로 사용 |
```

핵심은:

* high-risk 가정은 **코드 작성 전에** 확인
* 확인 불가능하면 `unknown`으로 표시
* unknown인데도 PLAN 본문에서 사실처럼 쓰지 않기
* 예상과 다르면 계획을 조용히 고치지 말고 deviation으로 남기기

현재 프로젝트는 로컬 Supabase를 쓰지 않고 공유 클라우드와 `db push`를 사용한다고 이미 적혀 있어. 그런데 PLAN이 로컬 Docker를 기본 전제로 삼았다는 건 지식이 없어서가 아니라 **운영 사실이 실행 가능한 제약으로 변환되지 않았기 때문**이야. 

---

# 필요한 것 3: 운영 환경을 prose가 아니라 기계가 읽는 계약으로 만들기

Memory나 cheatsheet의 문장을 에이전트가 매번 올바르게 해석하길 기대하지 말고, 하나의 구조화된 파일로 고정하는 게 좋아.

예:

```yaml
# .agent/project-runtime.yaml

database:
  provider: supabase
  mode: shared-cloud
  local_instance: false
  push_command: supabase db push
  push_owner: mogi
  destructive_actions_require_human: true

git:
  pull_request_base: dev
  agent_may_push_branch: true
  agent_may_create_pr: false

verification:
  sql_editor_notices_visible: false
  generated_types_source: remote
```

그다음 PLAN 생성기나 hook이 다음을 잡게 해.

* `local_instance: false`인데 `supabase migration up`을 필수 단계로 작성
* 에이전트가 `db push` 직접 실행
* PR base가 `main`
* 타입 재생성 없이 `as never`로 완료 처리
* 클라우드 DB 작업인데 rollback/transaction 설명 없음

이런 것은 LLM 기억력 문제가 아니라 **정적 검증 가능한 설정 오류**야.

---

# 필요한 것 4: 검증 강도를 등급으로 표시하기

`grep 통과`, `tsc 통과`, 실제 DB 권한 검증은 서로 다른 증거인데 SUMMARY에서는 모두 “PASS”로 뭉개지기 쉬워.

다음 정도로만 나눠도 좋아.

| 등급 | 의미        | 예                               |
| -- | --------- | ------------------------------- |
| E0 | 문서·문자열 확인 | grep, 파일 존재                     |
| E1 | 정적 검증     | typecheck, lint, build          |
| E2 | 동작 검증     | unit/integration/SQL test       |
| E3 | 실제 환경 검증  | shared DB, 브라우저 UAT, 실제 권한 role |

규칙:

* DB migration·RLS·RPC 권한은 E0/E1만으로 PASS 금지
* UI state transition은 문자열 grep만으로 PASS 금지
* “기존 값이 안 바뀐다”는 before/after 검증 필요
* `as any`, `as never`가 있으면 타입 계약 E1 미달
* 사람 UAT가 남으면 `complete`와 `operationally verified`를 분리

이 정도면 수학적 증명처럼 무겁지는 않으면서, “무엇을 실제로 확인했는가”는 분명해져.

---

# 필요한 것 5: 실행 중 중단 조건

에이전트가 계획과 다른 사실을 발견했을 때 계속 임기응변으로 전진하지 못하게 해야 해.

```md
## Stop Conditions

다음 중 하나면 구현을 멈추고 진단한다.

- 실제 스키마/default/grant가 PLAN과 다름
- 동일한 실패가 두 번 반복됨
- 보호 대상 데이터가 예상과 다르게 변경됨
- migration/backfill에서 예상 밖 legacy row 발견
- blocking checkpoint를 cast나 skip으로 우회해야 함
- 코드와 데이터 rollback 가능 범위가 달라짐
```

특히:

> **같은 실패가 두 번 나오면 다음 수정 전에 진단 쿼리부터**

이건 Travelog에서 가장 재사용 가치가 큰 규칙이야.

---

# Travelog의 올바른 역할

Travelog은 괜찮은 장치지만 **품질 보증 도구가 아니라 관찰·학습 도구**야.

좋은 점:

* 어떤 외부 규칙이 행동을 강제했는지
* 어떤 가정이 실측으로 깨졌는지
* 사용자의 개입이 경로를 어떻게 바꿨는지
* 사용하지 않은 도구가 무엇인지

를 남길 수 있어.

하지만 매 작업마다 길게 만들면 다음 문제가 생겨.

* 모기가 안 읽음
* 회고 문서가 실제 테스트보다 많아짐
* 결과를 사후에 그럴듯하게 설명하는 “과정 연출”이 될 수 있음
* 중요한 교훈이 긴 로그에 묻힘

따라서 아래 경우에만 생성하는 게 좋아.

```text
- PLAN 가정이 실측으로 깨짐
- 동일 오류가 두 번 이상 반복됨
- 권한·데이터 마이그·공유 DB 작업
- 사용자 개입으로 실행 경로가 바뀜
- 디버깅이 예상보다 크게 길어짐
- hook/memory/skill이 결과를 실제로 바꿈
```

그리고 Travelog 끝에는 반드시 이것만 따로 출력해야 해.

```md
## Promotion

- 일회성 사건: 기록만
- 반복 패턴: guide 추가
- 자동 검출 가능: test/lint/hook 추가
- 도메인 결정 변경: ADR 후보
- stale 규칙 발견: 삭제 후보
```

**Travelog 전문은 모기가 안 읽어도 돼. Promotion 5줄만 읽으면 돼.**

---

# ADHD를 고려한 실제 읽기 방식

“긴 글을 더 열심히 읽어야지”는 보조 목표로는 맞지만 주 전략으로 삼지 마.

모기에게 필요한 건 **정독 능력보다 선택적 정독 프로토콜**이야.

### 3회전 읽기

1. **60초:** frontmatter, objective, must-have, verdict만 본다.
2. **3분:** assumptions, deviations, risks, human actions만 본다.
3. **필요한 경우에만:** 위험한 migration/RPC/diff를 깊게 본다.

그리고 문서 안에 다음 표식을 사용해.

```text
[READ] 모기가 반드시 읽을 부분
[DECIDE] 모기가 결정할 부분
[EVIDENCE] 에이전트가 증명한 부분
[DETAIL] 읽지 않아도 되는 구현 세부
```

즉, 긴 문서를 안 읽는 자신을 자책해서 전부 읽으려 하기보다 **무엇을 안 읽어도 되는지 시스템이 명시하게 해야 해.**

다만 냉정하게 하나는 말해야 해.

> 승인권을 가진 이상, `[READ]`와 `[DECIDE]`까지 건너뛰는 습관은 고쳐야 해.

에이전트 검토를 여러 번 받더라도, 도메인 의미와 운영 위험의 최종 책임은 모델끼리 서로 넘길 수 없어.

---

# 모기가 실제로 길러야 할 능력

하네스 구현 능력을 팀원 수준으로 따라잡는 게 최우선은 아니야. 다음 세 가지가 더 중요해.

### 1. 불변식 찾기

```text
이번 변경으로 절대 바뀌면 안 되는 값은 무엇인가?
```

예: 개인 claim 저장으로 공식 `is_dupe`가 바뀌면 안 됨.

### 2. 증거 강도 구분하기

```text
grep이 증명한 것과 SQL integration test가 증명한 것은 무엇이 다른가?
```

### 3. 경계 diff 읽기

전체 코드를 읽기보다 다음 경계를 읽는 연습:

```text
DB → RPC → Repo → UI
```

각 PR마다 직접 세 문장만 적어도 돼.

```text
도메인 불변식:
가장 위험한 경계:
그걸 증명한 테스트:
```

이게 쌓이면 LLM 산출물을 “느낌상 괜찮음”이 아니라 구조적으로 판단할 수 있게 돼.

---

# 당장 적용할 최소 변경

새 가이드를 또 하나 만들기보다는 기존 workflow/template에 아래 네 가지만 넣는 게 좋겠어.

1. PLAN에 `Assumption / Evidence`와 `Stop Conditions` 필수화
2. `.agent/project-runtime.yaml` 같은 기계 판독 운영 계약 추가
3. 모든 완료 시 `모기 승인용 Review Packet` 자동 생성
4. Travelog은 조건부 생성하고 마지막 `Promotion`만 사람에게 노출

그리고 medium/high-risk 작업만:

```text
작성·실행 에이전트
→ 독립 검증 에이전트
→ 모기 Review Packet 승인
```

작은 카피 수정까지 이 절차를 돌리면 과해. DB·RLS·migration·대형 상태 전환에만 적용해야 해.

**한 문장으로 요약하면: 더 많은 사고 기록이 아니라, 가정을 실측으로 바꾸고 모기가 읽어야 할 10줄만 강제로 압축하는 실행 제어면이 필요해.**

---

응, 참고 많이 됐고 결론이 하나 더 선명해졌어.

**너한테 필요한 건 PLAN 리뷰보다 한 단계 앞의 ‘문제 분류 게이트’야.**

두 회고의 반복 패턴은 이거임.

| 반복된 일                       | 실제 문제                                       |
| --------------------------- | ------------------------------------------- |
| 화면에 안 보임 → 구현 누락·스키마 문제로 해석 | 데이터·read path·UI wiring 중 어느 층이 비었는지 구분 안 함 |
| 하이라이터가 기존 모델에 안 맞는다고 느낌     | 기존 M:N 모델이 이미 표현 가능했고 어휘·라벨만 부족             |
| 자동선택을 구현했다가 번복              | 구현 전에 활성 UX 원칙과 충돌 확인 안 함                   |
| 비슷한 고민을 별개 문제로 시작           | 같은 도메인 뿌리인지 묶어보는 단계 없음                      |
| 안 익은 thread를 revert         | 보류와 폐기를 구분하지 않음                             |
| “어렵겠지”라고 비용 추정              | 실제 호출부·스키마·기존 컴포넌트를 안 보고 감으로 판단             |

이건 코드 작성 능력 부족보다 **문제를 어느 층의 문제인지 잘못 분류하는 경향**에 가까워. PLAN 리뷰는 잘못 분류된 문제를 매우 꼼꼼하게 구현하도록 도와줄 수도 있어서, 그것만으로는 부족함.

## PLAN 전에 5분짜리 Reality Check

새 가이드를 또 길게 만들기보다 `/scope`나 `discuss-phase` 앞부분에 이 블록을 의무화하는 게 좋아.

```md
## Reality Check

### 1. 관찰된 사실
- 사용자가 실제로 본 것:
- 아직 확인하지 않은 해석:

### 2. 기대 동작
- 사용자가 원하는 결과:

### 3. 레이어 상태

| 레이어 | 상태 | 근거 |
|---|---|---|
| schema | 있음 / 없음 / 모름 | |
| seed·실데이터 | 있음 / 없음 / 모름 | |
| write path | 연결 / 미연결 / 모름 | |
| read path | 연결 / 미연결 / 모름 | |
| UI render | 연결 / 미연결 / 모름 | |
| 활성 제품 원칙 | 허용 / 충돌 / 모름 | |

### 4. 기존 모델이 표현하지 못하는 정확한 사실
- 현재 구조로 저장하거나 표현할 수 없는 것은:

### 5. 기존 primitive 후보
- 이미 있는 테이블·정션·RPC·컴포넌트:

### 6. 최신 결정 충돌
- 관련 ADR/SPEC/guide:
- 제안 동작과 충돌 여부:

### 7. 가장 싼 실측
- grep:
- SQL:
- 브라우저 확인:

### 8. 분류
- bug / missing wiring / data·seed / copy·vocabulary /
  policy decision / genuine model gap
```

강제 규칙은 네 개면 충분해.

```text
- 4번이 비어 있으면 신규 스키마 설계 금지.
- read/UI만 비었으면 DB 버그라고 부르지 않기.
- 활성 결정과 충돌하면 구현 전에 사람 결정.
- unknown이 2개 이상이면 PLAN을 ready로 만들지 않기.
```

첫 번째 회고에서는 이 표만 있었어도:

```text
group_slug:
schema ✅ / seed ✅ / read ❌ / UI ❌ / scope상 의도된 미구현

default_selected:
schema ✅ / seed ✅ / read ❌ / UI ❌ / "자동선택 금지" 원칙과 충돌
```

로 바로 끝났을 거야.

## “구조 문제인가?”를 판별하는 질문

새 모델이나 컬럼 얘기가 나오면 에이전트가 반드시 이렇게 물어야 해.

```text
현재 모델로 표현할 수 없는 실제 사례 하나를 데이터 행으로 보여줘.
```

예를 들어 하이라이터 고민에서:

```text
글리터리 + 핑크펄 + 투명밑색
```

이게 기존 texture M:N으로 이미 표현된다면 구조 문제는 아님. 후보는 어휘 부족, 라벨 부족, picker 필터, UI grouping으로 좁혀짐.

따라서 신규 모델 전 체크는 이것만 보면 돼.

1. 저장이 불가능한가?
2. 저장은 되는데 조회가 불가능한가?
3. 조회는 되는데 화면에서 안 쓰는가?
4. 표현은 되는데 적절한 어휘가 없는가?

1번일 때만 스키마 논의를 시작하는 게 맞아.

## 결정 충돌 검사는 자동화 가치가 큼

특히 다음 동작이 나오면 관련 결정을 자동 검색하게 하면 좋아.

```text
자동 선택
기본값
숨기기
강제 입력
권한 확대
데이터 자동 승격
기존 기록 변환
삭제
```

에이전트 출력은 짧게:

```md
## Decision Collision

제안:
- 립틴트 form을 liquid로 자동 선택

관련 활성 원칙:
- 자동 선택 금지, 추천만 제공

판정:
- 충돌. 구현 전에 제품 결정 필요.
```

이건 긴 PLAN 검토보다 훨씬 싼 시점에 번복을 막아줌.

## thread는 revert보다 `parked`

두 번째 회고에서 가장 아까운 부분은 안 익은 질문을 없앴다가 바로 다시 복원한 거야.

미성숙한 질문은 다음 상태로 남기는 게 낫다.

```yaml
status: parked
```

```md
## 현재 가설
- 기존 모델로 흡수 가능할 가능성이 큼

## 아직 부족한 증거
- 실제 하이라이터 데이터 10건
- picker에서 필요한 어휘 목록

## 다시 열 조건
- 현재 M:N으로 표현 안 되는 사례 3건 발견
```

구분은 이렇게:

* **superseded**: 더 최신 결론이 생김
* **rejected**: 근거를 갖고 폐기함
* **parked**: 아직 판단할 증거가 부족함

“아직 안 익음”은 rejected가 아니야.

## 같은 뿌리인지 확인하는 장치

최근 7~14일 안에 같은 테이블, 컴포넌트, decision cluster를 건드린 고민이 있으면 새 thread 전에 관련 문서를 먼저 보여주게 해.

```text
새 고민: 하이라이터 4축
최근 관련 항목:
- shade textures → attributes
- picker category scope
- texture 어휘 확장

질문:
- 별도 문제인가, 같은 표현력 문제의 다른 사례인가?
```

복잡한 새 시스템까지 만들 필요 없이 `tags`, `code_refs`, `decision_cluster` 기반 검색만 해도 충분함.

## Travelog은 유용하지만 검증기는 아님

Travelog의 역할은 좋음.

* 어떤 규칙이 행동을 바꿨는지
* 어떤 가정이 깨졌는지
* 어떤 사용자 개입이 분기를 만들었는지
* 왜 특정 도구를 안 썼는지

를 볼 수 있으니까.

다만 **그럴듯한 사후 설명이 만들어질 위험**은 있음. 에이전트가 결과를 보고 자신의 과거 판단을 매끄럽게 설명할 수 있기 때문이야.

따라서 Travelog의 각 핵심 판단은 증거와 연결하는 게 좋아.

```md
[판단] is_dupe default를 의심함
근거:
- 형제 RPC가 false를 명시하는 코드
- 실제 migration line
- catalog query 결과
```

그리고 원칙:

> Travelog은 “왜 그렇게 행동했는가”를 설명한다.
> 테스트·SQL·UAT만 “그 행동이 맞았는가”를 증명한다.

고위험 작업에서는 실행 에이전트가 쓴 Travelog을 같은 에이전트의 PASS 근거로 사용하지 말고, 독립 리뷰어는 **Travelog보다 diff·query·test 결과를 우선**해야 해.

## 회고에서 무엇을 어디로 승격할지

회고 전문을 cheatsheet나 guide에 계속 복사하면 네가 안 읽게 됨. 다음 파이프라인이 좋아.

| 발견               | 남길 곳            |
| ---------------- | --------------- |
| 구체적인 사건과 타임라인    | postmortem      |
| 반복 가능한 일반 질문     | guide           |
| 자동 검출 가능한 조건     | hook/test/lint  |
| 도메인 의미가 바뀐 결론    | ADR             |
| 자주 보는 한 줄 경고     | cheatsheet 상단   |
| 한 번뿐이고 반복 가능성 낮음 | postmortem에만 보존 |

이번 두 회고에서 승격할 것은 네 줄이면 충분해.

```md
- 화면에 안 보인다고 스키마 누락으로 단정하지 않는다.
  schema → data → write → read → UI 순으로 확인한다.

- 모델 재설계 전에 현재 모델로 표현 불가능한 실제 사례를 한 행으로 제시한다.

- 자동선택·기본값·숨김은 활성 제품 원칙과 먼저 충돌 검사한다.

- 안 익은 질문은 revert하지 않고 parked 상태와 재개 조건을 남긴다.
```

## 자학 제목은 분석에는 별 도움 없음

`모기의 죄`, `등신짓` 같은 표현이 기억에는 남을 수 있지만, 운영 규칙으로 변환할 때는 별 도움이 없어. 특히 긴 문서를 피하는 경향이 있다면 죄책감이 붙은 문서는 다시 열기 더 싫어질 수도 있음.

개인적인 농담으로 제목에 남기는 건 상관없지만, 본문 분류는 이렇게 중립적으로 두는 편이 좋아.

```text
반복 오판 패턴
트리거
잘못된 분류
실측 결과
다음부터의 중단 조건
자동화 가능 여부
```

사람의 성격 문제가 아니라 **어떤 정보가 없는 상태에서 어떤 지름길을 택했는지**가 중요함.

## 네가 직접 길러야 할 부분

하네스를 팀원만큼 잘 만드는 것이 우선은 아니야. 네가 직접 담당해야 할 건 세 가지임.

1. **관찰과 해석 분리**

```text
관찰: 화면에 group이 안 보인다.
해석: group_slug가 구현 안 됐다.
```

두 번째 문장은 확인 전에는 사실이 아님.

2. **도메인 의미와 구현 비용 분리**

네 회고대로 도메인 의미 판단은 네 직감이 유용한 편이고, 구현 비용 추정은 코드 실측이 필요해.

```text
이 구분이 제품에 필요한가? → 모기 판단
이 변경이 얼마나 큰가? → 코드·그래프·migration 실측
```

3. **최종 승인용 짧은 문장을 직접 쓰기**

```text
이번 작업은 스키마 추가가 아니라 기존 group_slug의 read/UI wiring이다.
자동선택은 하지 않고 추천 노출만 한다.
```

이 두 문장을 네가 못 쓰겠으면 아직 승인할 단계가 아닌 거야.

## 최소 적용안

시스템을 더 키우지 않고 다음만 반영하는 게 좋아.

1. `/scope` 또는 phase discuss에 `Reality Check` 8항목 추가
2. PLAN template에 layer matrix 결과 링크 추가
3. 자동선택·기본값·권한·migration 키워드에 decision collision 검사
4. thread lifecycle에 `parked` 추가
5. postmortem 끝에 `Promotion` 5줄 추가
6. 사람 승인 문서는 항상 10~15줄 Review Packet으로 별도 출력

한 문장으로 정리하면:

> 지금 필요한 건 더 정교한 구현 에이전트가 아니라, **잘못 프레이밍한 문제를 PLAN으로 키우기 전에 멈추는 얇은 진단 단계**야.

---

응. **매 PR마다 사람용 `REVIEW-PACKET.md` 하나를 두는 게 제일 나아.**

단, 내용을 또 복붙한 새 SSOT가 아니라 **“무엇을 왜 봐야 하는지 알려주는 목차 + 승인 기록”**이어야 해. 지금 42-04 PLAN에도 objective, must-have, threat model, UAT가 모두 있지만 긴 문서 곳곳에 흩어져 있어서 사람이 승인하기 어렵거든. 

추천 위치:

```text
.planning/workstreams/.../42-04-REVIEW-PACKET.md
```

또는 PR 본문을 이 파일에서 그대로 생성해도 돼.

```md
# PR Review Packet — Phase 42-04

## [READ] 30초 요약
- 무엇을 바꿈:
- 사용자에게 달라지는 것:
- 절대로 바뀌면 안 되는 것:

## [DECIDE] 모기가 결정할 것
- [ ] 없음
- [ ] A/B 중 선택:
- [ ] 남은 위험을 감수하고 머지:

## [READ] 계획과 달라진 점
- 없음
- 또는:
  - 원래:
  - 실제:
  - 바꾼 이유:
  - 영향:

## [READ] 위험한 변경
| 영역 | 위험 | 방어 근거 |
|---|---|---|
| 권한 | 개인 claim이 공식 dupe를 변경할 수 있음 | SQL test 링크 |
| 데이터 | 마지막 삭제 후 ghost edge | RPC test 링크 |
| UI | legacy NULL 판단이 변조될 수 있음 | UAT 항목 링크 |

## 직접 봐야 할 파일
1. [D-112](...)  
   - 볼 대목: `dupe_claim ↔ is_dupe 분리`
   - 확인 질문: 개인 판단 저장이 공식 관계에 영향을 주지 않는가?

2. [42-04 SUMMARY](...)
   - 볼 대목: `Deviations`, `후속/미해결`
   - 확인 질문: PLAN과 달라진 것이 납득되는가?

3. [핵심 diff](...)
   - 볼 파일: `AtlasExploreView.tsx`
   - 볼 대목: 공식 dupe 토글과 개인 claim composer가 분리된 부분

## [EVIDENCE] 에이전트가 확인한 것
- [x] typecheck
- [x] production build
- [x] SQL integration test
- [ ] 실제 브라우저 UAT
- 증거 링크:

## [READ] 모기가 직접 확인할 UAT
- [ ] 일반 유저가 dupe claim을 저장해도 공식 edge가 안 생김
- [ ] 사진 2장 + 축 2개가 카드 하나로 보임
- [ ] 편집 후 기존 legacy 의미가 바뀌지 않음
- [ ] 마지막 기록 삭제 후 ghost edge가 안 남음

## 롤백
- 코드 롤백:
- 데이터 롤백:
- 자동 복구 불가능한 것:

## 읽지 않아도 되는 상세
- 전체 구현 순서: PLAN
- 도구 호출 로그: Travelog
- 세부 SQL 전문: migration/test 파일

## 승인
내가 이해한 핵심:
> ______________________________________

- [ ] 머지 승인
- [ ] 수정 후 재검토
```

핵심 규칙은 네 개만 두면 돼.

1. **최대 한 화면~두 화면.**
2. 링크만 걸지 말고 반드시 **“어느 대목을 왜 볼지”** 적기.
3. `PLAN`, `SUMMARY`, `Travelog` 내용을 다시 복사하지 말기.
4. 권한·데이터·도메인 불변식은 네가 한 줄로 다시 써야 승인 완료.

특히 링크는 이런 식이어야 해.

```md
❌ 42-04-PLAN.md 참고
⭕ 42-04-PLAN.md → `must_haves.truths` 3~5번 확인:
   개인 dupe_claim과 공식 is_dupe가 다른 RPC인지 볼 것
```

그리고 **모든 파일을 읽으려고 하지 않아도 돼.**

```text
REVIEW PACKET      사람이 반드시 읽음
PLAN / SUMMARY     특정 대목만 링크로 이동
diff / test 결과   위험 항목만 직접 확인
Travelog           문제 발생·가정 번복 때만 Promotion 절 확인
```

PR이 작으면 이 파일을 만들 필요 없이 PR 본문 10줄로 충분하고, 다음 중 하나라도 있으면 packet을 의무화하면 돼.

```text
DB migration
RLS/RPC 권한
backfill/cutover
도메인 의미 변경
여러 PLAN에 걸친 작업
데이터 rollback 불가
큰 UI 상태 전환
```

즉 **“하나의 파일에 전부 모은다”보다 “하나의 파일에서 읽어야 할 곳을 정확히 라우팅한다”**가 맞아. 이 파일은 문서 저장소가 아니라 네 승인용 대시보드야.

---

응. **반영하는 게 좋지만, 한 번에 새 시스템처럼 만들지는 말고 기존 템플릿 4곳만 얇게 수정**하는 게 맞아.

우선순위는 이거야.

### 지금 바로 반영

1. `/scope` 또는 phase discuss 템플릿에 `Reality Check`
2. PLAN 템플릿에 Reality Check 결과 링크
3. thread lifecycle에 `parked`
4. postmortem 템플릿 끝에 `Promotion`

### 조금 뒤에 반영

5. decision collision 검사는 우선 에이전트 질문 단계로 운영
   키워드 hook 자동화는 실제로 2~3번 더 반복될 때 추가

리뷰 패킷은 이미 완료했으니 그대로 두면 돼.

---

## 1. Reality Check는 모든 작업에 8항목 강제하지 말기

다음 상황에서만 발동시키는 게 좋아.

```text
- 새 테이블·컬럼·도메인 모델 제안
- "화면에 안 보인다"를 버그로 해석한 작업
- 기존 기능이 있는데 새로 설계하려는 작업
- 자동선택·기본값·강제입력·숨김
- 권한 변경
- migration/backfill/cutover
- 최근에 revert했던 영역 재논의
```

작은 카피나 명확한 버그에는 생략.

`/scope` 결과에는 긴 8항목 대신 이것만 먼저 보여줘도 돼.

```md
## Reality Check

- 관찰된 사실:
- 아직 확인하지 않은 해석:
- 현재 비어 있는 레이어:
  schema / data / write / read / UI / policy
- 기존 모델로 표현 불가능한 실제 사례:
- 관련 활성 결정과 충돌:
- 가장 싼 실측:
- 분류:
  bug / missing wiring / data / copy·vocabulary /
  policy decision / model gap
```

**“기존 모델로 표현 불가능한 실제 사례”가 비어 있으면 신규 스키마 PLAN 금지**가 핵심 규칙이야.

---

## 2. PLAN에는 matrix 전체를 복사하지 말고 링크만

PLAN 템플릿에 다음 정도만 추가해.

```md
<problem_validation>
Reality Check:
- source: <thread/discuss 문서 링크>
- classification: missing wiring / model gap / ...
- missing layer: read + UI
- confirmed model gap: yes / no
- decision collision: none / <결정 링크>
</problem_validation>
```

이렇게 해야 Reality Check가 또 하나의 장문 SSOT가 되지 않아.

PLAN의 역할은:

```text
문제가 정말 무엇인지 증명 → Reality Check
어떤 순서로 구현할지 → PLAN
```

으로 분리하면 돼.

---

## 3. decision collision은 아직 hook으로 만들지 말기

키워드만 보고 자동 검색하면 노이즈가 클 가능성이 높아.

예를 들어 `default`, `permission`, `delete`는 코드 어디에나 나오니까 에이전트가 문서 수십 개를 쏟아낼 수 있어.

우선 `/scope`나 discuss workflow에 이 질문만 추가해.

```md
## Decision Collision

다음 행동이 포함되는가?
- 자동 선택
- 기본값 변경
- 입력 강제
- 데이터 자동 승격·변환
- 숨김·삭제
- 권한 확대·축소
- migration/backfill

포함된다면:
- 관련 active ADR/guide:
- 충돌 여부:
- 충돌 시 구현 전 사용자 결정 필요:
```

그리고 실제 반복이 쌓이면 그때 자동화를 추가해.

```text
1단계: 에이전트가 명시적으로 검색
2단계: 검색 helper/script
3단계: 충분히 정밀할 때 hook
```

처음부터 hook으로 만들면 “검사했다”는 안심만 주고 실제 결정 충돌은 못 잡을 수 있어.

---

## 4. `parked`는 바로 추가해도 됨

비용이 거의 없고 회고에서 실제 필요성이 확인됐어.

thread lifecycle은 최소 이렇게 구분하면 돼.

```text
active       현재 논의·실행 중
parked       증거가 부족해서 보류. 재개 조건 존재
resolved     결론이 다른 문서로 승격됨
rejected     근거를 갖고 폐기함
superseded   더 최신 thread/결정으로 대체됨
```

`parked` 문서는 아래 필드를 필수로 해.

```md
## 현재 가설
- ...

## 아직 부족한 증거
- ...

## 다시 열 조건
- 실제 표현 불가능 사례 3건 발견
- 사용자 입력 데이터 20건 축적
- 관련 선행 phase 완료

## 마지막 확인일
- YYYY-MM-DD
```

“안 익어서 잠시 멈춤”과 “틀려서 폐기”가 확실히 갈려.

---

## 5. postmortem의 Promotion은 꼭 추가 추천

이건 회고를 실제 시스템 개선으로 연결하는 마지막 단계라서 고효율이야.

```md
## Promotion

- 사건 기록만 유지:
- guide에 승격:
- ADR 후보:
- test/lint/hook 자동화 후보:
- stale 규칙 삭제·수정 후보:
```

각 줄은 없으면 `없음`이라고 쓰게 해.

중요한 점:

> postmortem을 썼다는 사실이 개선이 아니라, Promotion 중 실제로 반영한 항목이 개선이다.

Travelog에도 동일한 Promotion 블록을 재사용해도 좋아.

---

## 실제 수정 위치 추천

새 guide를 또 만들기보다 기존 구조에 흡수해.

| 변경                     | 넣을 곳                                           |
| ---------------------- | ---------------------------------------------- |
| Reality Check 발동 조건·절차 | 현재 `/scope` workflow 또는 phase discuss workflow |
| PLAN 결과 링크             | GSD PLAN template                              |
| `parked` lifecycle     | `.planning/README.md` + thread template        |
| Promotion              | postmortem template + Travelog template        |
| decision collision 질문  | `/scope`/discuss workflow                      |
| 사람 승인                  | 이미 만든 `guide-mogi-review-packet`               |

즉 `docs/wiki/guides/`에는 운영 이유를 설명하는 문서가 이미 충분하고, **실제로 에이전트가 행동하도록 만드는 내용은 workflow/template에 들어가야 해.**

---

## 적용 순서

```text
1. thread에 parked 추가
2. postmortem/Travelog에 Promotion 추가
3. /scope·discuss에 Reality Check 추가
4. PLAN template에 결과 포인터 추가
5. 2~3개 작업에서 dogfood
6. decision collision 자동화 필요성 재평가
```

처음 네 개는 적용해도 시스템이 크게 무거워지지 않아.

decision collision만 당장은 **반자동 질문**으로 두는 게 좋아. 완전 자동 hook까지 지금 만드는 건 과할 가능성이 커.

결론은 **리뷰 패킷 외 네 항목은 지금 반영, decision collision은 workflow 질문까지만 반영**이 적절해.

---

응, 1~5번은 전부 네 실제 패턴에서 나온 거 맞아. 요약하면 **“문제 분류 → PLAN 계약 → 결정 충돌 → 보류 방식 → 회고 승격”** 순서로 생긴 처방이야.

## 1. Reality Check

**출처 패턴: 관찰을 바로 구조 문제로 해석하는 경향**

이건 제일 직접적으로는 네가 보낸 두 회고에서 나왔어.

D-104 회고에서는 `group_slug`와 `default_selected` 둘 다 “DB에 데이터는 있음” 상태였는데, 실제로는 화면 read path나 UI wiring이 없는 상태였지. 즉 문제는 “스키마가 없음”이 아니라:

```text
schema 있음
seed 있음
read path 없음
UI render 없음
제품 원칙과 충돌 가능
```

이런 레이어 분류 문제였어.

하이라이터 4축/attributes 회고도 거의 같은 패턴이야. 처음에는 “하이라이터는 4축 모델이 안 맞으니 모델 재설계?”처럼 보였는데, 실제로는 기존 `textures` 마스터 + M:N + picker category 접근으로 상당 부분 표현 가능했고, 답은 구조 재설계가 아니라 어휘·라벨·picker 범위 쪽이었지. 네 치트시트에도 “본인 도메인 모델도 코드 확인 전에 기억으로 판단하면 이미 있는 걸 다시 설계하려 한다”, “모델 재설계로 보이면 현재 모델이 못 받는 게 뭔지 분해하고 grep으로 인프라 확인하라”는 패턴이 이미 적혀 있어. 

그래서 Reality Check를 넣자고 한 거야. 목적은 PLAN을 잘 쓰기 전 단계에서:

```text
이게 bug인가?
missing wiring인가?
data/seed 문제인가?
copy/vocabulary 문제인가?
policy decision인가?
진짜 model gap인가?
```

를 먼저 가르는 것.

**막으려는 실패:**
“화면에 안 보임 → 새 모델 필요”로 바로 점프하는 것.

---

## 2. PLAN template에 layer matrix 결과 링크

**출처 패턴: PLAN이 길어질수록 DB/RPC/repo/UI 계약이 서로 drift하는 문제**

이건 42-03/42-04에서 나온 거야.

42-03은 DB 토대, RPC, backfill, repo를 만들고 UI 와이어링은 42-04로 넘기는 구조였어. 42-03 PLAN도 output이 신규 테이블/RPC/backfill/repo이고 composer UI는 42-04라고 명시했지. 

그런데 42-04 PLAN은 42-03 repo의 최종 타입과 write 계약을 이미 소비한다고 가정했어. 예를 들어 42-04 쪽은 `ComparisonAssessment`, `evidenceImages`, `subjectSlug`, `createComparisonAssessment`, `updateComparisonAssessment`, `deleteComparisonAssessment` 같은 계약을 전제로 composer와 렌더를 바꾸려 했고, 기존 `LinkDraft`/`comparisonNotes` 소비자를 대체해야 했어. 

내가 이전에 지적한 “42-03과 42-04의 repo 계약이 다르다”, “update가 patch인지 replacement인지 모호하다”, “fan-out 카드에서 pair 상대를 알 수 없다” 같은 피드백은 전부 이 레이어 경계 문제였어.

그래서 PLAN 안에 matrix 자체를 길게 복붙하자는 게 아니라, Reality Check에서 확인한 결과를 PLAN에 짧게 링크하자고 한 거야.

```md
Reality Check:
- classification: missing wiring
- missing layer: read + UI
- confirmed model gap: no
- decision collision: D-104 자동선택 원칙
```

**막으려는 실패:**
앞 문서는 A 타입을 만들었는데, 뒤 문서는 B 타입이 있다고 믿고 구현하는 것.

---

## 3. decision collision 검사

**출처 패턴: 구현 가능한 기능이지만 이미 잠긴 제품 원칙과 충돌하는 경우**

이건 D-104 `default_selected` 자동선택 번복 사례가 거의 원형이야.

너는 립틴트면 form을 liquid로 자동 선택하고 싶어 했고, 실제 wiring도 구현했다가 커밋 직전에 “자동 선택 금지, 추천만 하기” 원칙과 충돌해서 되돌렸지. 치트시트에도 현재 우선순위로 “finish/form/texture 경계 지키기, 자동 선택 금지, 추천만 하기”가 명시되어 있어. 

또 Atlas 42-03에서도 같은 부류가 있어. 일반 유저의 `dupe_claim`이 공식 `comparison_pairs.is_dupe`로 자동 승격되면 안 되고, 발색샷·assessment·공식 dupe는 서로 자동 생성·승격하지 않는다는 원칙이 잠겨 있었어. 

그래서 내가 특정 키워드에 decision collision 검사를 붙이자고 한 거야.

```text
자동 선택
기본값
강제 입력
숨김
삭제
권한 확대
자동 승격
migration/backfill
```

이 단어들은 구현 난이도보다 **제품 결정 충돌 가능성**이 높아. 코드로 가능하냐가 아니라 “해도 되는 동작이냐”를 먼저 봐야 함.

**막으려는 실패:**
“어? 쉽게 되네?” 하고 구현했는데, 이미 잠긴 원칙을 어겨서 커밋 직전에 번복하는 것.

---

## 4. thread lifecycle에 `parked` 추가

**출처 패턴: 안 익은 질문을 폐기했다가 곧 다시 복원하는 경우**

이건 네 하이라이터/attributes 회고에서 그대로 나왔어.

attributes thread를 만들었다가 당일 revert했고, 그런데 하이라이터 4축 고민으로 같은 뿌리 문제가 다시 돌아왔지. 회고 본문에서도 “안 익은 질문을 thread에서 내렸는데 24시간 안에 더 커져서 돌아왔다”, “thread는 열린 질문의 컨테이너라 유지 비용이 거의 0”이라고 정리했잖아.

여기서 내가 본 문제는 **rejected/superseded/parked가 구분되지 않았다는 것**이야.

* rejected: 근거를 갖고 틀렸다고 폐기
* superseded: 더 나은 최신 결론으로 대체
* parked: 아직 증거가 부족해서 보류

네 사례는 rejected가 아니라 parked였어. “안 익음”은 “틀림”이 아니니까.

그리고 이건 너만의 문제가 아니라 MOGUI 도메인 특성상 자주 생길 수 있어. 예를 들어 글리터·쉬머 노드 overlay, 조건부 추천, 계보 관계처럼 “필요할 수도 있지만 지금은 데이터가 부족한” 항목들이 많아. 치트시트에도 “지금 컬럼 추가 안 함”, “필요하면 기존 흐름에서 해결 가능한지 먼저 확인” 같은 parked 성격의 메모가 반복돼. 

**막으려는 실패:**
아직 판단 근거가 부족한 질문을 없앴다가, 며칠 뒤 같은 질문을 새 문제처럼 다시 시작하는 것.

---

## 5. postmortem 끝에 Promotion 5줄 추가

**출처 패턴: 회고는 잘 쓰는데, 교훈이 실제 시스템 개선으로 승격되지 않으면 다시 반복됨**

너 회고 퀄리티 자체는 좋아. 문제는 회고가 길어질수록 나중에 네가 안 읽을 가능성이 높고, “좋은 회고를 썼다”에서 끝나면 실제 방지책이 약하다는 점이야.

예를 들어 D-104 회고에서 뽑아야 할 승격은 이거였어.

```text
guide 승격: 데이터 있음과 UI wiring 있음 분리
workflow 승격: 자동선택/default는 decision collision 검사
```

하이라이터 회고에서 뽑아야 할 승격은 이거였고.

```text
guide 승격: 모델 재설계 전 기존 primitive 확인
thread lifecycle 승격: parked 도입
```

42-03 Travelog에서는:

```text
guide/test 승격: plan 가정은 실측으로 확인
automation 후보: anon EXECUTE grant 전수 점검
docs/_personal: Supabase RPC anon grant gotcha
```

실제로 42-03 쪽은 `is_dupe` 기본값, anon EXECUTE grant, 로컬 Supabase 전제 같은 PLAN 가정이 실측으로 깨졌고, 42-03 PLAN 자체도 grep verify와 blocking checkpoint만으로는 충분하지 않다는 게 드러났어. 42-03 PLAN에는 로컬 적용과 타입 재생성을 blocking checkpoint로 둔다고 했지만, 네 환경은 로컬 Supabase를 안 쓰는 구조라 실측 경로가 달라졌지.  그리고 치트시트에도 “로컬 Supabase 안 씀, 공유 클라우드 인스턴스 사용, db push는 모기가 직접”이라고 명시되어 있어. 

그래서 postmortem 끝에 Promotion을 넣자고 한 거야.

```md
## Promotion

- 사건 기록만 유지:
- guide에 승격:
- ADR 후보:
- test/lint/hook 자동화 후보:
- stale 규칙 삭제·수정 후보:
```

**막으려는 실패:**
회고가 감정 정리와 사건 기록으로는 좋은데, 다음 작업을 실제로 덜 위험하게 만드는 장치로 변환되지 않는 것.

---

## 한 줄로 다시 묶으면

1. **Reality Check**는 “문제 프레이밍 오류”에서 나왔고,
2. **PLAN layer matrix 링크**는 “레이어 계약 drift”에서 나왔고,
3. **decision collision**은 “구현했다가 원칙 충돌로 번복”에서 나왔고,
4. **parked**는 “안 익은 thread를 revert했다가 복원”에서 나왔고,
5. **Promotion**은 “좋은 회고가 시스템 개선으로 안 이어질 위험”에서 나왔어.

즉 이 5개는 새 문서 놀이가 아니라, 네 반복 패턴을 각각 하나씩 막는 얇은 안전장치야.
