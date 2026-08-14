# 마스터 전달용 메모 (단일 수신함)

과외 세션 발견물을 한곳에 누적하는 마스터 전달용 단일 수신함이다. 메모는 리드 카드나 다른 파일로 옮기지 않고 이 파일에만 append한 뒤 커밋한다.

운영 규칙 (모기 확정 2026-08-14): 마스터가 메모를 확인·처리할 때마다 이 파일을 비운다. 처리 내역은 비움 표식 한 단락으로 남기고, 원문은 git 이력이 보존한다.

(비어 있음 — 2026-08-14 마스터 2차 비움. 처리분 2건 라우팅 내역: ①D-124 자체 Storage 서빙 전환 시점 당김(모기 확정) + ②Kotlin Spring 이식성 제약(모기 확정) → 한 트랙으로 묶어 **sw-u4r(이미지 자체 보존 트랙)** 등록 — #513 머지 직후 독립 PR/phase, sw-4ha 자가등록 개방의 선행 조건으로 순서 제약 기록. #513 범위는 확정대로 안 키움. 원문 = git 이력.)

## 2026-08-14 — #513 Storage 객체 SQL 삭제는 공식 비지원·고아 생성 경로 (새 발견)

- **대상:** PR #513 fix1 커밋 `0b3a7bd`, `supabase/migrations/20260814070000_swatch_storage_object_cleanup.sql`. `cleanup_swatch_storage_objects()`가 내부 GUC `storage.allow_delete_query`를 세우고 `DELETE FROM storage.objects`를 직접 실행한다.
- **실제 보장:** 메타데이터 행 삭제로 Storage API 공개 URL이 404가 되므로 즉시 공개 노출 차단과 swatch DELETE의 같은 DB 트랜잭션 실패 폐쇄는 달성한다.
- **간극:** Supabase 공식 문서는 `storage` 스키마 행을 SQL에서 read-only로 취급하고 업로드·이동·삭제를 전부 Storage API로 수행하라고 명시한다. 특히 SQL로 `storage.objects`를 삭제하면 실제 객체가 삭제되지 않아 고아가 되며 계속 과금될 수 있다고 경고한다. 이번 구현은 그 금지 사례를 의도적으로 사용하고 내부 보호 GUC까지 우회하므로, 장기 계약으로는 충분하지 않고 향후 Storage 업데이트 호환성 위험도 있다.
- **공식 근거:** https://supabase.com/docs/guides/storage/schema/design · https://supabase.com/docs/guides/storage/management/delete-objects
- **검토 요청:** #513 머지 판단은 마스터 소관. 선택지를 재평가해 ①머지 전 공식 Storage API 기반 삭제로 교체하거나 ②공개 차단용 임시 조치임을 명시하고 sw-u4r에서 즉시 제거·물리 GC하는 후속 계약을 잠가야 한다. 최종 정상형은 공개/비공개 판정을 먼저 차단한 뒤 신뢰 서버가 Storage API `remove()`를 호출하고, 실패는 `cleanup_pending`/outbox로 기록해 재시도·주기적 고아 대조를 하는 방식이다. DB와 객체 저장소를 억지로 한 SQL 트랜잭션처럼 만들지 않는다.
- **숨김 주의:** 현재 #513 함수는 DELETE에만 붙고 `hidden_at`에는 실행되지 않는다. 공개 버킷은 다운로드 시 접근 제어를 우회하므로 이미 URL을 아는 사람은 숨김 뒤에도 접근 가능하다. sw-u4r의 “숨김 시 실제 이미지 노출 종료” 요구에는 private bucket + 짧은 수명의 인증/서명 URL 또는 별도 서빙 게이트가 필요하다. 공식 근거: https://supabase.com/docs/guides/storage/buckets/fundamentals · https://supabase.com/docs/guides/storage/serving/downloads
