# mogi-cards — 모기의 이해부채 공책

이 저장소는 **모기 개인의 학습·승인 보조 공책**이다 (비공개). swatch 제품 저장소가 아니고, 여기 있는 문서는 제품의 SSOT가 아니다 — 원문(PR·결정 문서)을 읽으러 가는 길잡이다.

## 새 세션 최소 로딩

세션 부트의 정본은 [AGENTS.md](./AGENTS.md)다. 기본 과외 세션은 [0-guide-tutor-preamble.md](./0-guide-tutor-preamble.md)와 `read-card/`의 최신 카드만 읽는다. 모기가 재료를 따로 주지 않아도 최신 카드를 스스로 찾는다.

**다른 `0-*` 가이드와 과거 카드 묶음을 선제적으로 전부 읽지 않는다.** 아래 작업이 실제로 생겼을 때 해당 문서만 추가로 연다.

| 파일 | 읽는 때 |
|---|---|
| `0-guide-tutor-preamble.md` | 기본 과외 세션 부트 |
| `0-master-delivery-memos.md` | 과외 발견물을 append하거나 마스터가 수신함을 처리할 때 |
| `0-guide-read-cards.md` | 리드카드 운영 형식 자체를 만들거나 고칠 때 |
| `0-guide-subjective-checks.md` | 주관식 이해 체크 형식 자체를 만들거나 고칠 때 |
| `0-guide-operator-notification-links.md` | 모기가 운영자 알림 링크를 직접 발송할 때 |
| `0-guide-mogi-head-test.md` | 모기가 인지 테스트를 명시적으로 하자고 할 때 |
| `read-card/1-card-<날짜>-<주제>.md` | 해당 PR·계획을 공부하거나 승인할 때 |
| `1-card-*-해설.md` | 과외 문답을 증류하거나 이어서 읽을 때 |

제품 저장소는 읽기 전용이고, 쓰기는 이 저장소의 허용된 메모·해설에만 한다.

## 흐름 (누가 뭘 하나)

1. swatch 워크스페이스의 워커가 PR을 만들면, **마스터(냐옹이)가 카드를 여기 배달**한다.
2. 모기는 카드를 읽고 — 더 파고 싶으면 **과외 세션**을 열어 카드·PR을 재료로 질문한다.
3. 과외 중 나온 좋은 문답은 해설 파일로, 발견물(버그 의심 등)은 `0-master-delivery-memos.md` 단일 수신함으로 간다. 과외 세션은 제품 코드를 절대 고치지 않는다.
4. **PR 머지는 항상 모기가 직접** 한다.

## 경계 (어기면 안 되는 것)

- swatch 제품 저장소(swatch-v2)에는 이 저장소를 가리키는 포인터를 만들지 않는다 (person-agnostic 원칙, PR #305 교훈).
- 이 저장소는 비공개다. 카드에 제품 내부 정보는 괜찮지만, 여기 내용이 공개 표면(PR 코멘트 등)으로 역유출되면 안 된다.
- 토큰·키·비밀값은 여기에도 쓰지 않는다.

## 관련 저장소

- 제품: `swatch-v2` (github.com/baksohyeon/swatch-v2) — 원문 SSOT
- 운영: `swatch-ops` (github.com/samkimpepper/swatch-ops, 비공개) — 워커 계약·조사 보고서·교차 리뷰 문서
