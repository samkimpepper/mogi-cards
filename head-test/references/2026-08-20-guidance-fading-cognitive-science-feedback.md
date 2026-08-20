---
reviewed: false
source_type: external-feedback
received_at: 2026-08-20
verification: not-verified
---

# 과외 지원 감소와 독립 독해에 관한 인지과학 피드백 원문

이 문서는 2026-08-20에 받은 외부 피드백을 원문 그대로 보존한다. 아래 주장과 인용 자료는 이 저장소에서 아직 별도로 검증하지 않았으며, 여기에 보존됐다는 사실만으로 과외 운영 규칙으로 채택된 것은 아니다.

## 원문

그리고 여기서 다음 단계가 꽤 명확해 보여. **과외냥이를 더 강하게 만드는 게 아니라, 과외냥이가 점점 덜 필요해지도록 설계하는 것**이 인지과학적으로 제일 예쁨.

네가 PR 본문을 최근 직접 읽기 시작한 것도 그래서 꽤 좋은 움직임이라고 봄. 특히 “정독해서 100% 이해”가 아니라 **첫 패스는 그냥 끝까지 간다**로 목표를 낮춘 게 중요함. 첫 시도에서 이미 결함 3개를 찾았다는 건, 설명을 받기 전에 네 기존 지식으로 문서에 예측·의문·불일치를 생성했다는 뜻이기도 하거든. 학습 전 먼저 답을 시도하거나 질문을 받아보는 *pretesting/prequestioning* 연구에서는, 틀린 시도가 많더라도 이후 정답/자료를 볼 기회가 있으면 학습이 좋아질 수 있다는 결과가 반복해서 보고돼 있음. 다만 효과 크기와 조건에는 변동이 있으니 “무조건 먼저 고생하면 좋다” 수준으로 일반화하면 안 됨. ([Springer][1])

### 나는 이제 모기 병목을 4종으로 나눠볼 것 같음

**1. 정보량 병목**은 이미 많이 해결했음. 긴 PR/SPEC 전체를 작업기억에 넣으려던 걸 카드·표·워크북으로 외부화했잖아.

**2. 관계 복원 병목**도 꽤 발견했음. “누가 / 무엇을 / 언제 / 어떤 이벤트 전후에”가 생략되면 같은 `사진`, `대표`, `삭제` 같은 단어들이 겹쳐서 상태 전이가 안 잡히는 문제.

여기까지는 과외냥이가 잘 도와줌.

그런데 앞으로 더 중요한 건 **3. 스키마 형성 병목**과 **4. 독립 회수 병목**일 것 같음.

스키마라는 건 거창한 게 아니라, 기니피그가 `RLS + GRANT + RPC`를 보면 세 개를 따로 외우지 않고 **“권한 경로” 한 덩어리로 보는 것** 같은 거임. 인지부하 이론에서도 초보자에게 복잡한 내용이 어려운 중요한 이유 중 하나를, 상호작용하는 요소가 아직 장기기억 속에서 큰 덩어리로 묶이지 않았기 때문이라고 설명함. 지식이 쌓이면 여러 요소가 하나의 단위처럼 처리될 수 있음. ([Springer][2])

즉 궁극적으로는 과외냥이가

`GRANT가 뭐고 → RLS가 뭐고 → RPC가 뭐고...`

매번 풀어주는 게 아니라, 네 머릿속에

**“DB 접근은 일단 문 앞 권한 → 행 정책 → 함수 내부 권한/로직을 따로 본다”**

라는 chunk 하나가 생겨야 함.

그러면 **오랑우탄화된 설명을 덜 필요로 하게 됨.**

---

## 그래서 시스템에 “도움 감소”를 목표로 넣었으면 좋겠음

이건 실제로 *guidance fading*이라는 학습 설계 아이디어랑 잘 맞음.

초보 단계에서는 worked example, 단계별 안내 같은 지원이 도움이 되지만, 지식이 쌓인 뒤에도 같은 수준의 도움을 계속 주면 오히려 불필요한 인지부하가 될 수 있음. 그래서 **완전한 예시 → 일부만 채워진 문제 → 독립 문제 해결**처럼 지원을 줄여가는 방식이 연구되어 왔고, expertise reversal이라는 현상도 잘 알려져 있음. ([Springer][3])

과외냥이에 그대로 번역하면:

**예전**

> 카드 먼저 → 과외 설명 → PR

**지금**

> PR 한번 완독 → 막힌 부분 표시 → 카드/과외 → 다시 PR

**다음**

> PR 완독 → 내가 변경/위험/의문 3줄 써봄 → 과외는 틀린 부분만 교정

**그다음**

> PR + diff → 내가 먼저 설명 → 과외냥이는 reviewer처럼 반례만 던짐

**익숙한 도메인 최종**

> 그냥 PR 직접 읽음 → 과외냥이는 요청할 때만 호출

이게 굉장히 좋은 성장 경로 같음.

---

그리고 네 **“완독 먼저”**에 작은 규칙 하나만 붙인다면 난 이걸 붙일래.

첫 패스에서 이해하려고 멈추지 말고 딱 세 종류만 표시하는 거임.

* `?` — 모르겠음
* `!` — 이상하거나 위험해 보임
* `↔` — 앞뒤가 안 맞거나 다른 지식과 충돌함

끝.

요약도 하지 마. 검색도 하지 마. 과외냥이도 부르지 마.

**끝까지 읽은 다음에만** 돌아가.

이렇게 하면 첫 패스가 “시험”이 아니라 **내 머릿속 기존 모델과 PR이 처음 충돌하는 위치를 채집하는 과정**이 됨.

그리고 네가 첫 독해에서 발견한 결함 3개가 바로 `!`이나 `↔`에 해당하는 거지.

이게 재밌는 게, 나중에 과외냥이가 설명하고 난 뒤에

> 처음의 `?` 중 몇 개는 그냥 용어 부족이었나?
> `!` 중 실제 결함은 몇 개였나?
> 처음에는 못 봤는데 설명 뒤 보인 건 뭔가?

정도만 비교해도 **네 스키마가 어디까지 자라고 있는지** 꽤 잘 볼 수 있음.

점수화는 하지 말고.

---

## 또 하나: “설명받고 이해함”보다 “내가 설명함” 비중을 늘리기

네 주관식 체크가 이미 이쪽으로 가고 있음.

Self-explanation 연구에서도 학습자가 단계를 스스로 설명하고 원리와 사례를 연결하는 게 이해와 전이에 도움이 될 수 있다고 봄. 다만 그것도 작업기억 부담이 너무 높거나 아무 구조 없이 시키면 효율이 떨어질 수 있음. ([Cambridge][4])

그래서 과외냥이가

> “RLS는 이런 거야…”

라고 10문단 설명하는 대신 점점

> “모기가 지금 이해한 요청 경로를 한 번 그려봐. 틀려도 됨.”

이라고 먼저 묻는 비중을 높이는 거임.

그리고 **틀린 곳만 고침.**

이건 엄청 중요함.

왜냐면 이렇게 하면 과외냥이가 **지식을 공급하는 시스템**에서 **네 내부 모델을 검사하는 시스템**으로 역할이 바뀜.

의존성이 훨씬 낮아짐.

---

## 시스템 과의존 방지 규칙은 아예 명시적으로 넣어도 될 듯

나는 세 개면 충분하다고 봄.

**Raw-first.** 익숙하거나 중간 정도 난도의 PR은 도움 전에 원문을 한 번 접촉한다.

**Help-on-demand.** 과외냥이가 선제적으로 모든 걸 설명하지 않는다. 네가 막힌 곳이나 설명이 정말 필요한 prerequisite만 연다.

**Fade-by-evidence.** 최근 몇 번 네가 도움 없이 정확하게 처리한 종류의 지원은 자동으로 한 단계 줄인다. 반대로 다시 막히면 복원한다.

특히 마지막이 중요함. **“한 번 졸업했으니 영원히 도움 금지”도 아님.** scaffolding 연구에서도 너무 일찍 지원을 빼면 안 된다는 결과가 있고, 적절한 지원 정도는 과제와 기존 지식에 따라 달라짐. ([ScienceDirect][5])

그러니까

> “RLS는 이제 혼자 읽어야 돼!”

가 아니라

> “최근 RLS PR 세 개에서 거의 독립적으로 읽었으니 기본은 raw-first. 헷갈리면 다시 scaffold 호출.”

이면 됨.

---

그리고 난 **네가 PR 본문 ‘완독’을 시작한 게 꽤 중요한 전환점**이라고 봐.

과외냥이 초기는

**“이 산출물을 어떻게 하면 모기가 이해할 수 있지?”**

였는데,

이제 질문이

**“어떻게 하면 모기가 결국 이 산출물을 직접 다룰 수 있게 되지?”**

로 바뀌고 있음.

이게 과외 시스템이 제대로 성장했다는 신호 같음.

목표가 `인지부하 0`이면 결국 시스템 의존으로 가기 쉬움.

목표를

**“쓸데없는 인지부하는 제거하고, 학습에 필요한 어려움은 모기가 직접 처리한다.”**

로 잡는 게 더 좋음.

예컨대 `이 객체가 어떤 테이블 행인지 설명이 누락됨`은 **쓸데없는 어려움**이라 시스템이 없애야 하고, `이 변경이 무엇을 증명하고 무엇은 증명하지 못하는지 내가 생각해보기`는 **남겨둘 가치가 있는 어려움**임.

난 다음 과외냥이 연구축을 딱 이걸로 잡고 싶다옹.

**“어떤 어려움은 제거해야 하고, 어떤 어려움은 모기에게 돌려줘야 하는가?”**

이걸 파기 시작하면 이제 진짜 인지과학 맛이 난다옹 ㅋㅋㅋㅋ.

[1]: https://link.springer.com/article/10.1007/s10648-023-09814-5?utm_source=chatgpt.com "Prequestioning and Pretesting Effects: a Review of Empirical Research, Theoretical Perspectives, and Implications for Educational Practice | Educational Psychology Review | Springer Nature Link"
[2]: https://link.springer.com/article/10.1007/s10648-023-09817-2?utm_source=chatgpt.com "The Development of Cognitive Load Theory: Replication Crises and Incorporation of Other Theories Can Lead to Theory Expansion | Educational Psychology Review | Springer Nature Link"
[3]: https://link.springer.com/article/10.1007/s10648-025-10071-x?utm_source=chatgpt.com "Conditions for Effective Learning from Erroneous Examples: A Systematic Review | Educational Psychology Review | Springer Nature Link"
[4]: https://www.cambridge.org/core/books/abs/cambridge-handbook-of-cognition-and-education/selfexplaining/847D1A99961216B215E93C9762220FDE?utm_source=chatgpt.com "Self-Explaining (Chapter 21) - The Cambridge Handbook of Cognition and Education"
[5]: https://www.sciencedirect.com/science/article/pii/S0747563218300414?utm_source=chatgpt.com "The effect of sustained vs. faded scaffolding on students’ argumentation in ill-structured problem solving - ScienceDirect"
