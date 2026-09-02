---
reviewed: false
merge_ready: false
# UAT 통과 (2026-09-02 모기: "굵은 폰트들 뭔가 예쁘게 바뀜") — 머지 대기
---

# 카드 — PR #541 Pretendard 가변 웹폰트 실제 로드 (sw-oqfc)

작성: 냐옹이 Gen 18, 2026-09-02. 머지 게이트 등급: **② UAT 필수** (앱 전역 글꼴). 원문 = PR 본문. 계약 swatch-ops `contracts/2026-09-02-sw-oqfc-pretendard.md`.

## 결정 목록

- 모기 결정(09-02): "1번이지 당연" — Pretendard 실제 로드. 워커는 jsdelivr 가변 + dynamic-subset(1파일) 채택, Noto 링크는 폴백으로 유지(다운로드 0건 실측).
- 변경 2파일(index.html 링크 2줄, index.css 스택 1줄). 커밋 a27dcb5. 교차 리뷰는 소형이라 생략, 게이트 3종(vitest·tsc·vite build) 마스터 재실행 일치.

## 직접 눌러볼 것 (1분)

```
cd ~/code/swatch/swatch-v2 && gh pr checkout 541 -b preview-541
cd ~/code/swatch/swatch-v2 && pnpm --filter app dev
```
1. 홈탭 아무 화면 — 굵은 글자가 뭉개지지 않고 선명한가 (before는 faux bold)
2. 발색 기여 시트(등록 시트)를 열어보기 — 굵기 차이가 가장 큰 화면
3. 복귀: `git switch dev && git branch -D preview-541`

맘에 들면 머지(모기 직접, dev). 마스터 체크아웃/서버 정리는 냐옹이가.
