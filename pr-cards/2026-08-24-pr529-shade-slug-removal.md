---
reviewed: true
merge_ready: false
---
# 리드 카드 — PR #529: swatch_items.shade_slug 근절 (sw-5m6 중형)

작성: 냐옹이(Gen 13), 2026-08-24. **최종 READY — HEAD `6ab9902`, 리뷰 2라운드 종결(필수 0·후가능 0).** 판정문: `../../swatch-ops/contracts/2026-08-24-pr529-cross-review-verdict.md` → `-delta-verdict.md`. 검증: 마이그 증분+fresh·SQL 27·하네스 6 전량 초록·음성 대조 3종·마스터 독립 재실측 매 라운드.

## 정체 확인 (머지 인계 최소선)

1. **뭔지**: 네가 #527 완독에서 판정한 결함("shade_id 비워도 slug로 읽힘")의 근치 — 매핑 표의 **이중 정체성(shade_id + slug 캐시)을 컬럼 제거로 근절**. 네 결정 두 개가 뼈대다: "당연 3행 업데이트인 중형" + "FK인데 nullable 되냐"는 질문이 만든 NOT NULL 복원.
2. **마이그 1장 순서 = 안전 순서**: 백필(3행, 실패 시 전체 중단) → 함수 9개 OR 해석 제거 → 회수 트리거 단순화 → slug 컬럼·트리거·인덱스 DROP → NOT NULL 복원. 전체 단일 트랜잭션 — 중간에 뭐 하나 어긋나면 통째로 롤백이라 반쯤 적용된 상태가 없다.
3. **효과**: 오늘 조사의 구멍 5종 전부 폐쇄(직접 INSERT·유니크 무력화 포함) + "게시됨인데 발색 0개" 모순 근절 + 동시성 재설계(sw-kya) 전제 단순화.

## 주관식 퀴즈 (등급 ③ — 머지 전 채팅으로 답해달라)

1. 이 마이그가 원격에서 **백필 대상 행을 하나라도 못 채우면** 무슨 일이 일어나나? (한 줄)
  1. 모기답: 롤백되나? 아예마이그실행이않되나? 흠냐 
2. shade_id를 NOT NULL로 되돌려도 안전하다고 판단한 **실측 근거** 두 가지는? (원격 수치 하나 + 코드 조사 하나)
  1. 호곡. 모름 헤헤
3. 머지 후 남는 유일한 DB 절차는 뭔가?
  1. db push 아님 ? 냥ㅋㅋ 

## 결정 골격 (원문 포인터)

- 결정문: `../../swatch-ops/docs/decisions/2026-08-24-swatch-items-slug-removal.md` · 조사표·원격 창: `contracts/2026-08-24-sw-5m6-slug-survey-report.md`·`-remote-window-report.md`
- 계약 2부: `-sw-5m6-slug-removal.md`(+추가 조항 2-b) + `-pr529-fix1.md` · 리뷰 2부: `-pr529-cross-review-verdict.md` → `-delta-verdict.md`
- 이월: write-skew(sw-kya — 하네스 보존됨)·source_url rename(sw-g5t, 다음 swatch_media 창)·잔여 이중 정체성 2곳(sw-d7h)

## 머지 후

**원격 적용 창 1건**: 마이그 `20260824120000` push + 하단 읽기 전용 검증 절 재실행 + `--linked` 타입 재생성. 소유자 승인 후 마스터 실행. 이 창이 끝나면 원격의 slug-only 3행이 정식 매핑으로 승격되고 판이 닫힌다.