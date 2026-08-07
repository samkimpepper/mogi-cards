---
merge_ready: false
---

# 모기 리드 카드 — release v0.8.0: 한 달치 dev 가 라이브로 나가는 릴리즈 PR (#477)

> 종류: RELEASE Read Card. 원문 SSOT = PR #477 본문 + swatch-ops `contracts/2026-08-06-qa-db-parity-REPORT.md` + `.github/workflows/deploy.yml` 헤더.
> 작성: 2026-08-07 집냥이 (Gen-3, 냐옹이 레인 임시 인수 중). 직전 카드 = `1-card-2026-08-02-legacy-db-storage-migration-review-packet.md`.
> 브랜치 `release/v0.8.0` (push 완료, PR #477 OPEN). **머지는 기니피그가 직접** — 이 카드는 머지 전에 읽는 용도. 카드의 이해 체크 R1~R3 = 이 브랜치 Review Gate Quiz.

## 1. 이 PR 이 뭔가 `[READ]`

- `[READ]` v0.7.0 (7/11) 이후 dev 에 쌓인 **132커밋을 main 으로 보내는 릴리즈**다. 새 코드를 쓴 PR 이 아니라, 이미 dev 에서 개별 PR 리뷰를 거친 것들을 묶어 내보내는 포장 작업.
- `[READ]` 구성은 전례 (#344, v0.7.0) 와 똑같다: dev 에서 `release/v0.8.0` 브랜치를 따고, main 을 back-merge 한 커밋 하나를 얹었다. 버전은 파일이 아니라 **git 태그**로 관리되니까 (v0.2.1~v0.7.0 전부 태그), 머지 후 머지 커밋에 `v0.8.0` 태그를 달면 끝.
- `[READ]` 내용 4갈래: 홈=내 아카이브 전환 (D-118 계열), Atlas 개편 (Phase 53~56), DB 보안 하드닝 (부채 장부 P1~P2 — 소유권 가드·anon 권한 전량 회수·경쟁 조건 잠금), 운영 (콜드 백업 스크립트, .agent 팩 재구조화, 저작권 이미지 제거 #475).

## 2. 왜 "그냥 눌러도 되는" 상태인가 `[READ]`

- `[READ]` **충돌 0의 구조적 이유**: main 이 dev 보다 앞서 가진 커밋 4개는 전부 릴리즈 절차용 머지 커밋이고, 실제 내용은 이미 dev 조상에 들어 있다. 그래서 back-merge 가 실질적으로 흡수한 건 whitespace 정리 2파일뿐이다 (`git diff origin/dev release/v0.8.0` 이 그 2파일만 보여줌).
- `[READ]` **DB 는 이미 준비돼 있다**: 이 릴리즈에 마이그레이션 36개가 타고 있는데, 원격 DB (moguming-wiki = QA 이자 라이브) 는 8/6 읽기 전용 검증에서 **142/142 전수 일치**가 확인됐다. 즉 스키마는 이미 dev 기준이고, 이 머지는 코드가 스키마를 따라잡는 방향이라 DB 쪽 장애 시나리오가 없다.
- `[READ]` **release 브랜치에서 재검증 완료**: pnpm build PASS, vitest 521/521 PASS, wiki:lint exit 0, verify-agent-ssot PASS. (wiki:lint 경고 4건은 dev 에 원래 있던 stale 날짜·dangling ref 로 이번 범위 밖.)

## 3. 머지 버튼을 누르면 무슨 일이 일어나나 `[READ]`

- `[READ]` main push → **GH Actions `deploy.yml` 이 프로덕션 배포를 실행**한다. Vercel git 자동배포는 7/11 에 disconnect 됐고 (#346~#349), 그때 같이 제거된 `vercel.json` 의 `ignoreCommand` 는 죽은 설정 정리라 의도된 변경이다 — 워커가 히스토리 실측으로 확인했다 (근거 커밋 4bd5d0e, deploy.yml 헤더 주석).
- `[READ]` 즉 이 머지는 코드 정리가 아니라 **한 달치 작업이 한 번에 사이트에 보이게 되는 이벤트**다. 출시 게이트 안건 (Phase 6 재실측, 알림 src 계측) 과는 별개니, "지금 라이브에 보여도 되는가" 의 시점 판단은 모기·기니피그 몫.

## 4. 열린 질문 (이번에 결정 안 해도 됨) `[READ]`

- `[READ]` **whitespace 되감기 루프**: v0.7.0 back-merge 도 이번과 똑같은 2파일을 흡수했다. main→dev 역머지가 절차에 없어서 릴리즈마다 반복된다. 다음 릴리즈 전에 "머지 후 main→dev back-merge 1회" 를 절차에 넣을지 결정 필요.
- `[READ]` **ignoreCommand 문서 잔재 3곳**: `.agent/workflows/release.md:33`, `docs/wiki/architecture/overview.md:241`, `docs/wiki/guides/branching-and-prs.md:332` 이 아직 Vercel 게이트가 살아 있는 것처럼 서술한다. dev 기존 drift 라 릴리즈와 무관 — 후속 docs 픽스로 잡아둠.

## 5. 이해 체크 (Review Gate Quiz — 주관식, 이 브랜치 1회)

- **R1.** 132커밋짜리 PR 인데 release 브랜치와 dev 의 diff 가 파일 2개뿐인 이유는? (읽을 대목: 2절 첫 항목)
- **R2.** 이 머지가 눌리는 순간 배포는 어떤 경로로 나가고, Vercel git 연동이 아닌 근거 커밋은 뭔가? (읽을 대목: 3절 첫 항목)
- **R3.** "마이그 36개가 같이 나가는데 왜 DB 장애 걱정이 없다" 는 논리를 네 말로 한 줄 설명하면? (읽을 대목: 2절 둘째 항목)

## 모기 답변 — 과외 중 구술 정리

- **R1.** main 이 dev 보다 따로 가진 것은 과거 릴리즈를 남긴 머지 기록이다. 그 실제 변경 내용은 이미 dev 계보에 들어가 있어서, main 을 되가져온 release 브랜치와 dev 의 내용 차이는 whitespace 정리 2파일뿐이다.
- **R2.** main 에 머지하면 `deploy.yml`에 적힌 GitHub Actions가 실행되고 Vercel CLI로 production 배포한다. 예전 Vercel Git 자동배포는 커밋 작성자의 팀 권한과 유료 좌석 문제 때문에 끊었다.
- **R3.** dev 와 main 이 같은 원격 QA·라이브 DB를 쓰고, dev 작업 중 마이그레이션이 이미 그 DB에 적용됐다. 원격과 저장소의 마이그레이션도 142/142 일치하므로, 이번 머지는 DB를 새로 바꾸는 게 아니라 main 코드가 이미 준비된 DB를 따라가는 방향이다.

## Appendix — 배포·릴리즈 브랜치·태그는 각각 무엇인가

> 모기: 보통 main 배포할 때마다 릴리즈 태그 같은 걸 붙이는 게 관행이야? 태그는 그냥 꼬리표 같은 거 아닌가?

- **태그는 꼬리표가 맞다.** `v0.8.0`처럼 특정 커밋에 붙이는 고정 이름표라서, 나중에 그 버전의 코드 위치를 찾거나 비교·롤백할 때 기준점이 된다. 태그 자체가 반드시 배포를 실행하는 것은 아니다.
- **이 저장소의 배포 방아쇠는 태그가 아니라 push다.** `.github/workflows/deploy.yml`은 `main`과 `dev`의 push를 감시한다. `main` push는 production, `dev` push는 preview 대상으로 보낸다. 따라서 `v0.8.0` 태그를 빠뜨려도 main 머지 직후 production 배포는 실행된다.
- **release 브랜치는 임시 최종 점검대다.** 여러 dev 변경을 `release/v0.8.0`에 모아 검증한 뒤 main으로 보내고, 머지된 커밋에 버전 태그를 붙인다.
- 모든 팀이 main 배포마다 태그를 붙이는 것은 아니다. 이 저장소는 여러 dev 변경을 묶어 production에 내보내는 릴리즈 시점에 버전 태그를 남기는 방식을 쓴다.

```text
dev의 한 달치 변경
→ release/v0.8.0에서 최종 검증
→ main에 머지
→ main push로 production 배포
→ 머지 커밋에 v0.8.0 태그 부착
```
