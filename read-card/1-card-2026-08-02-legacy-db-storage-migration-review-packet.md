# 리뷰 패킷 — ② 레거시 DB 경로 완결 + ⑤ storage 버킷 마이그화

**날짜**: 2026-08-02 · **작성**: Gen-2 마스터 · **브랜치 2개, PR 미생성 (지시 대기)**

## 0. 한 줄 요약

레거시 device_id 쓰기 경로와 comparison_notes 잔재를 DB·클라 양쪽에서 걷어냈고 (②), swatch-images 버킷·정책을 마이그로 고정해 db reset 증발을 끝냈다 (⑤). 3표 리뷰 통과, 단 **②의 원격 적용은 다음 릴리즈 후**라는 순서 조건이 붙는다.

## 1. 브랜치·커밋

| 브랜치 | 커밋 | 내용 |
|---|---|---|
| `chore/legacy-db-path-retire` | 5개 (HEAD `0849186`) | 마이그 2본 + 클라 정리 + types 재생성 + todo 이동 |
| `chore/storage-bucket-migration` | 2개 (HEAD `1468432`) | 마이그 1본 + todo 이동 |

**마이그 3본**: `20260802000000` (set_device_id DROP + create_swatch 9-인자 재생성 + grant 복원) · `20260802010000` (notes 테이블 2종·RPC 4종 DROP) · `20260802020000` (버킷+정책 2건, 원격 실측 미러·멱등)

## 2. 3표 리뷰 결과

| 렌즈 | 리뷰어 | 판정 | 핵심 |
|---|---|---|---|
| 일반 정합 | Claude | FIX_FIRST→해소 | P1: "storage 정책 DDL 은 postgres 권한 불가" → **실측 반증**: 머지 상태 재현해 `supabase db reset` 풀 실행 완주, 종단 상태 전부 확인. 원격도 Studio(=postgres SQL) 생성 전례가 증거 |
| 회귀 반증 | Claude | SHIP | 반증 시나리오 8개 전부 실측, 코드 회귀 0. **P2 배포 순서 조건** (§3) |
| 계약·범위 | Codex gpt-5.6-sol | SHIP | 계약 a~g 전부 PASS (RLS 무수정·옛 마이그 무수정·장부 무수정·범위 혼입 0). P3 주석 경로 1건 → 정정 커밋 완료 (델타 = 주석 1줄씩) |

## 3. 위험 — 읽고 넘어가면 안 되는 것 하나

**배포 순서 창**: dev·main 의 현재 번들은 `create_swatch` 호출에 `p_device_id` 를 무조건 싣는다 (main 실측 `swatchesRepo.ts:140`). PostgREST 는 인자 이름으로 함수를 찾으므로, **② 마이그를 원격에 먼저 적용하면 라이브의 발색 등록이 전부 PGRST202 로 죽는다**. 역순은 안전 (새 클라 → 옛 함수 OK).

→ **② 의 원격 db push 는 다음 릴리즈(main 머지 + Vercel 배포) 후에만.** ⑥ 릴리즈 정렬이 자연스럽게 선행이 된다. ⑤ 는 계약 변경이 없어 언제든 push 가능.

## 4. 검증 증거 (전부 실측, 명령·출력 보존)

- psql: set_device_id 0 · note RPC 0 · 테이블 2종 부재 · create_swatch 9-인자 단일 · anon EXECUTE 0
- `supabase db reset` 풀 실행 (머지 상태 재현) → migration head `20260802020000`, 버킷 1, 정책 2
- 멱등: ⑤ 파일 2회 연속 실행 → 에러 0
- typecheck exit 0 · vitest 50파일/498테스트 통과 (마스터 재실행)
- create_swatch 신·구 본문 diff = device_id 3개소 제거뿐 (워커 바이트 대조 + 렌즈1 재대조)
- 재grep: device_id 계열 active 0건 · comparison_note 잔존은 D-122 잠금 이벤트명·이력 주석뿐

## 5. 열린 질문 4건 (워커 제기) + 마스터 권고

1. `device_swatches_claimed` 이벤트명 개명? → **보류 권고** (METRICS-01 잠금, 주석 정정으로 충분)
2. `swatches.device_id` 컬럼 자체 drop? → **D-045 보안 세션으로 이관 권고** (owner 정책 GUC 분기와 한 몸)
3. 스키마 문서 (dbml·ERD·overview) 에 드롭된 테이블 서술 잔존 → **별도 docs 커밋 권고** (승인 시 처리)
4. `docs/raw/study/cheatsheet.md` 성격 판단 → **손 안 대기 권고** (역사 영역)

## 6. 승인하면 일어나는 일

- "PR 올려" → 두 브랜치 각각 dev 로 PR 생성
- 머지는 모기가 GitHub 에서 직접
- 머지 후: ⑤ 는 바로 원격 db push 가능, **② 는 릴리즈 후 push** (§3)

---

# Review Gate Quiz (주관식 3문항)

**Q1** (읽을 대목: `20260802000000` 마이그 헤더 16~18줄) — create_swatch 를 고칠 때 `CREATE OR REPLACE` 를 안 쓰고 굳이 옛 시그니처를 `DROP` 부터 한 이유가 뭐야?

**Q2** (읽을 대목: 이 패킷 §3) — ② 마이그가 머지된 다음날 아침, 릴리즈 없이 원격에 db push 를 먼저 하면 라이브 사이트에서 무슨 일이 벌어져?

**Q3** (읽을 대목: `20260802020000` 마이그 하단 멱등 구조 — `ON CONFLICT DO NOTHING`·`DROP POLICY IF EXISTS` 두 곳) — 원격 QA 에는 버킷·정책이 이미 있는데 이 마이그가 거기서 또 실행돼도 안전한 이유는?
