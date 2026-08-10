---
id: guide-operator-notification-links
title: "운영자 알림 링크 절차 — 코어에게 보낼 땐 &src= 붙이기"
type: guide
created_at: 2026-08-10
created_by: 냐옹이 (Gen 2)
status: active
tags: [guide, operator, metrics, notification]
---

# 운영자 알림 링크 절차 — 코어에게 보낼 땐 &src= 붙이기

> 배경: PR #491 (알림 src 계측) + 과외냥이 발견 sw-w1w. 앱에는 이 링크를 만들어주는 버튼이 없어서, 절차가 곧 도구다. 모기 결정(2026-08-10): 최소안 = 이 문서.

## 한 줄

모기가 코어에게 DM·메일·슬랙으로 제품 링크를 보낼 때, **링크 끝에 `&src=dm`(메일 `&src=mail`, 슬랙 `&src=slack`)을 손으로 붙인다.**

## 예시

- 공유 버튼이 복사해준 링크: `https://…/?shade=abc123`
- DM으로 보낼 때 고쳐서: `https://…/?shade=abc123&src=dm`

## 왜

앱 공유 버튼은 `?shade=`까지만 만든다. src가 없으면 네 발송도 코덕끼리 공유(`shared_link`)로 섞여서, METRICS-05 가드레일이 운영자 발송(`notification`)을 구분 못 한다. 판정은 src가 shade보다 먼저다 (`analytics.ts:530` 실측).

## 규칙 3개

1. **까먹어도 큰일은 아니다** — src 없는 링크도 외부 유입으론 잡힌다. 구분만 안 될 뿐. 습관 들이면 된다.
2. **오타 걱정 없다** — src 값은 비어있지만 않으면 전부 notification으로 잡힌다 (`&src=DM`도 OK). 다만 위 3종으로 통일하자 — 나중에 채널별 구분을 켤 수도 있으니.
3. **코덕에게 공유를 "권할" 때는 붙이지 마라** — src는 네가 직접 보내는 링크 전용이다. 코덕이 눌러서 만드는 공유 링크에 섞이면 계측이 거꾸로 오염된다.

## 언제부터

지금부터 습관. **Phase 6 알림 대량 발송 시작 전까지는 반드시** — 발송 시작 후엔 과거 유입을 소급 분류할 수 없다.
