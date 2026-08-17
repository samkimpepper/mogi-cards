---
reviewed: false
merge_ready: false
---

# PR #520 fix1 — 실제 변경 지도와 raw diff 접촉

용도: 과외 중 에디터에 계속 열어두고 실제 변경 원문을 함께 보기 위한 판독 스냅샷. 제품·PR의 SSOT나 머지 판단 문서가 아니다.

- 대상 PR: https://github.com/baksohyeon/swatch-v2/pull/520
- 전체 PR 판독 범위: `545bf66bd1c49a6576adf1effff4e8895bd58fe5..9527c28ba012db24576f26156502d9331ece5c4f`
- fix1 판독 범위: `d256cdd79083be484b95899ef72d29c9e8ca6b59..9527c28ba012db24576f26156502d9331ece5c4f`
- 첫 핵심길 커밋: `d256cdd79083be484b95899ef72d29c9e8ca6b59..5cb3ad6155873eabba44e8ed3966a60190c1c810`
- 판독 시각: 2026-08-17 16:54:55 KST
- 판독 당시 상태: 카드에는 fix1 반영 중으로 적혀 있으나 GitHub HEAD에는 fix1 5커밋·발견물 8건 수리 설명이 반영된 상태. 머지 판단은 하지 않음.

## fix1 전체 변경 지도

`A`는 새 파일, `M`은 기존 파일 수정이다.

```text
M app/api/swatch-media-lifecycle.ts                         +1/-1
M app/api/swatch-media-retry.ts                            +15/-1
M app/server/swatchMediaLifecycle.test.ts                  +50/-5
M app/server/swatchMediaLifecycle.ts                       +37/-7
M app/server/swatchMediaService.ts                         +10/-3
M app/src/data/media/mediaAdapter.ts                       +18/-0
A app/src/data/repos/swatchMediaRepo.test.ts               +58/-0
M app/src/data/repos/swatchMediaRepo.ts                    +12/-7
A app/src/data/repos/swatchesRepo.blocked.test.ts          +96/-0
M app/src/data/repos/swatchesRepo.ts                       +10/-4
A app/src/data/supabase/supabaseAdapter.media.test.ts      +87/-0
M app/src/data/supabase/supabaseAdapter.ts                 +26/-3
M app/src/features/home/HomePage.tsx                       +36/-11
M app/src/locales/ko/pages.json                             +2/-1
A supabase/migrations/20260817030000_mark_stored_hidden_recheck.sql       +96/-0
A supabase/migrations/20260817040000_sync_insert_first_media_link.sql    +192/-0
A supabase/migrations/20260817050000_representative_media_swatch_scope.sql +248/-0
M supabase/tests/shade_representative_reselection_fixture.sql +103/-15
M supabase/tests/swatch_media_structure_verify.sql          +45/-1
```

## 핵심길 1 — 공용 대표사진도 자체 사본 어댑터 경유

교차 리뷰 발견물 1(높음)의 fix raw diff다. 설명 전에 실제 변경을 먼저 보기 위해 원문 hunk를 보존한다.

### 구현: `app/src/data/media/mediaAdapter.ts`

```diff
diff --git a/app/src/data/media/mediaAdapter.ts b/app/src/data/media/mediaAdapter.ts
index e9a5b631..638a69c2 100644
--- a/app/src/data/media/mediaAdapter.ts
+++ b/app/src/data/media/mediaAdapter.ts
@@ -62,6 +62,24 @@ export function resolveSwatchImages(
   })
 }
 
+/** 대표사진(shade_images) 경로가 참조하는 사본 요약 — media_id 로 조인해 온다. */
+export interface MediaRef {
+  objectKey: string | null
+  status: SwatchMediaRow['status']
+}
+
+/**
+ * 대표사진 한 장의 표시 URL (fix1 발견물 1 — 공용 대표도 어댑터 경유).
+ * media 관계가 있고 사본이 실재(stored)하면 자체 사본 public URL, 아니면
+ * shade_images.url 원문 폴백 — 발색 표시(resolveSwatchImages)와 같은 사다리다.
+ */
+export function resolveShadeImageUrl(rawUrl: string, media?: MediaRef | null): string {
+  if (media?.status === 'stored' && media.objectKey) {
+    return publicMediaUrl(media.objectKey)
+  }
+  return rawUrl
+}
+
 /**
  * 소유자·어드민 시야의 묶음 격리 판정 (D-126 §3). anon 시야에서는 RLS 가 격리
  * 발색의 행을 아예 감추므로 이 판정이 항상 false 다 — 공개 피드의 격리는
```

### 중간 연결: `app/src/data/supabase/supabaseAdapter.ts`

`shadeImageUrl`이라는 로컬 함수가 `shade_images.url`·`media_id`를 꺼내 `mediaAdapter.resolveShadeImageUrl`에 넘기는 hunk다.

```diff
diff --git a/app/src/data/supabase/supabaseAdapter.ts b/app/src/data/supabase/supabaseAdapter.ts
index e6d03b2a..9da5b498 100644
--- a/app/src/data/supabase/supabaseAdapter.ts
+++ b/app/src/data/supabase/supabaseAdapter.ts
@@ -85,6 +91,22 @@ export async function loadFromSupabase(): Promise<AdaptedSeed | null> {
       imagesByShade.set(img.shade_id as number, list)
     }

+    // [fix1 발견물 1] media_id → 사본 요약. shade_images.url 원문 대신 자체 사본
+    // public URL 을 서빙하는 유일한 변환은 mediaAdapter 가 한다.
+    const mediaById = new Map<string, MediaRef>()
+    for (const m of mediaRows ?? []) {
+      mediaById.set(String(m.id), {
+        objectKey: (m.object_key as string | null) ?? null,
+        status: m.status as MediaRef['status'],
+      })
+    }
+    const shadeImageUrl = (img: Record<string, unknown> | undefined): string | null => {
+      const raw = (img?.url as string) ?? null
+      if (!raw) return null
+      const mediaId = img?.media_id as string | null | undefined
+      return resolveShadeImageUrl(raw, mediaId ? mediaById.get(String(mediaId)) : null)
+    }
+
     // tweetIdMap for tweet lookup
     const tweetIdMap = new Map<number, string>()
     for (const t of tweets ?? []) {
```

### 최종 연결: `app/src/data/supabase/supabaseAdapter.ts`

```diff
diff --git a/app/src/data/supabase/supabaseAdapter.ts b/app/src/data/supabase/supabaseAdapter.ts
index e6d03b2a..9da5b498 100644
--- a/app/src/data/supabase/supabaseAdapter.ts
+++ b/app/src/data/supabase/supabaseAdapter.ts
@@ -185,14 +207,15 @@ export async function loadFromSupabase(): Promise<AdaptedSeed | null> {
       // 라인 단위 표시(LinePage)용 line scope 원본 — shade override 를 섞지 않는다.
       const lineFinishes = traitsOfType(pl?.line_traits, s.shade_traits)
 
-      // Images
+      // Images — 표시 URL 은 전부 어댑터 경유 (fix1 발견물 1: 공용 대표 서빙 전환).
       const images = imagesByShade.get(shadeId) ?? []
       const primary = images.find((img) => img.is_primary) ?? images[0]
-      const swatchImgUrl = (primary?.url as string) ?? null
+      const swatchImgUrl = shadeImageUrl(primary)
       const swatchImgSource = (primary?.representative_source as Product['swatchImgSource']) ?? null
       const extraImgs = images
         .filter((img) => img !== primary && img.url)
-        .map((img) => img.url as string)
+        .map((img) => shadeImageUrl(img))
+        .filter((url): url is string => Boolean(url))
 
       // Dupes — 메모는 별도 경로라 이 어댑터에서는 채우지 않는다 (WR-05, 위 :119 참조).
       const dupeIds = (dupeMap.get(shadeId) ?? [])
```

### 연결 테스트: `app/src/data/supabase/supabaseAdapter.media.test.ts`

```diff
diff --git a/app/src/data/supabase/supabaseAdapter.media.test.ts b/app/src/data/supabase/supabaseAdapter.media.test.ts
new file mode 100644
index 00000000..0a28d36c
--- /dev/null
+++ b/app/src/data/supabase/supabaseAdapter.media.test.ts
@@ -0,0 +1,87 @@
+import { describe, it, expect, vi, beforeEach } from 'vitest'
+import { publicMediaUrl } from '../media/mediaAdapter'
+
+/**
+ * 공용 대표사진 서빙 전환 (fix1 발견물 1).
+ *
+ * 탐색·홈·상세의 카드 얼굴은 이 어댑터가 만든 Product.swatchImgUrl 하나로
+ * 그려진다 — 여기가 생 URL 을 그대로 흘리면 화면 몇 개를 고쳐도 공용 대표는
+ * 영영 원본 CDN 서빙이다. media 관계가 있으면 자체 사본 public URL, 없으면
+ * 원문 폴백(전환기)임을 고정한다.
+ */
+
+const state = vi.hoisted(() => ({
+  tables: {} as Record<string, unknown[]>,
+}))
+
+vi.mock('./supabaseClient', () => ({
+  supabase: {
+    from: (table: string) => {
+      const builder: Record<string, unknown> = {}
+      const chain = () => builder
+      builder.select = chain
+      builder.eq = chain
+      builder.order = chain
+      builder.then = <T1, T2>(
+        onFulfilled?: ((value: unknown) => T1 | PromiseLike<T1>) | null,
+        onRejected?: ((reason: unknown) => T2 | PromiseLike<T2>) | null,
+      ) =>
+        Promise.resolve({ data: state.tables[table] ?? [], error: null }).then(
+          onFulfilled,
+          onRejected,
+        )
+      return builder
+    },
+  },
+}))
+
+import { loadFromSupabase } from './supabaseAdapter'
+
+const RAW_PRIMARY = 'https://pbs.twimg.com/media/primary.jpg'
+const RAW_EXTRA = 'https://pbs.twimg.com/media/extra.jpg'
+const MEDIA_ID = '11111111-1111-4111-8111-111111111111'
+
+beforeEach(() => {
+  state.tables = {
+    brands: [{ id: 1, slug: 'brand', name_kr: '브랜드' }],
+    categories: [{ id: 1, slug: 'lipstick', label_kr: '립스틱', label_en: 'lipstick' }],
+    product_lines: [{ id: 1, brand_id: 1, category_id: 1, name: '라인', slug: 'brand__line' }],
+    shades: [{ id: 10, product_line_id: 1, slug: 'brand__shade', name: '셰이드', color_hex: '#aa3355' }],
+    shade_images: [
+      {
+        id: 100, shade_id: 10, url: RAW_PRIMARY, is_primary: true,
+        representative_source: 'auto_single', media_id: MEDIA_ID,
+      },
+      { id: 101, shade_id: 10, url: RAW_EXTRA, is_primary: false, media_id: null },
+    ],
+    comparison_pairs: [],
+    tweets: [],
+    color_families: [],
+    shade_color_families: [],
+    swatch_media: [{ id: MEDIA_ID, object_key: 'swatch/1/m0.jpg', status: 'stored' }],
+  }
+})
+
+describe('loadFromSupabase — 대표사진 media 경유 서빙', () => {
+  it('media 관계가 stored 면 swatchImgUrl 이 자체 사본 public URL 이다', async () => {
+    const seed = await loadFromSupabase()
+    const product = seed?.products.find((p) => p.id === 'brand__shade')
+    expect(product?.swatchImgUrl).toBe(publicMediaUrl('swatch/1/m0.jpg'))
+    // media 관계 없는 갤러리 행은 원문 폴백 (전환기).
+    expect(product?.extraImgs).toEqual([RAW_EXTRA])
+  })
+
+  it('media 행이 안 보이면(레거시·RLS) 원문 URL 폴백 — 화면이 비지 않는다', async () => {
+    state.tables.swatch_media = []
+    const seed = await loadFromSupabase()
+    const product = seed?.products.find((p) => p.id === 'brand__shade')
+    expect(product?.swatchImgUrl).toBe(RAW_PRIMARY)
+  })
+
+  it('사본이 아직 없는 상태(pending_upload)는 원문 폴백이다 — 없는 객체를 가리키지 않는다', async () => {
+    state.tables.swatch_media = [{ id: MEDIA_ID, object_key: null, status: 'pending_upload' }]
+    const seed = await loadFromSupabase()
+    const product = seed?.products.find((p) => p.id === 'brand__shade')
+    expect(product?.swatchImgUrl).toBe(RAW_PRIMARY)
+  })
+})
```

## 샛길 1 — 복사 완료 시점 숨김 재검사

- 선택 이유: 주니어 백엔드가 비동기 작업 중 상태 변경, 완료 시점 재검사, 같은 트랜잭션의 outbox 기록, 함수 권한 재잠금을 한 파일에서 보기 좋음.
- 판독 범위: `5cb3ad6155873eabba44e8ed3966a60190c1c810..43f983b1ce1061535a8970a18b8048fb4851262c`
- 파일: `supabase/migrations/20260817030000_mark_stored_hidden_recheck.sql`

```diff
diff --git a/supabase/migrations/20260817030000_mark_stored_hidden_recheck.sql b/supabase/migrations/20260817030000_mark_stored_hidden_recheck.sql
new file mode 100644
index 00000000..2415e509
--- /dev/null
+++ b/supabase/migrations/20260817030000_mark_stored_hidden_recheck.sql
@@ -0,0 +1,96 @@
+-- =============================================================================
+-- 복사 완료 시점 숨김 재검사 — pending 중 숨김 잔존 차단 (PR #520 fix1 발견물 2)
+-- =============================================================================
+-- 구멍 (교차 리뷰 [높음], 마스터 실측 확정): 숨김 트리거
+-- queue_swatch_media_on_hidden_change (20260814110000)는 `object_key IS NOT NULL`
+-- 인 행만 revoke 를 큐잉한다 — 복사가 **아직 안 끝난**(pending, object_key NULL)
+-- 사진은 큐에 안 실린다. 그 뒤 복사가 완료되면 mark_stored 가 객체를 공개 버킷에
+-- 둔 채 stored 로 적고 끝난다 → 숨긴 발색의 사진이 공개 URL 로 잔류한다.
+--
+-- 수리: mark_stored 가 성공 기록 직후 **소속 발색의 숨김 여부를 재검사**하고,
+-- 숨김 상태면 그 자리에서 revoke 를 큐잉한다. 같은 트랜잭션이라 "stored 인데
+-- 회수 근거가 없는" 중간 상태가 존재하지 않고, 이 행이 그 객체의 첫 큐 행이라
+-- (이전에는 object_key 가 없어 어떤 트리거도 큐잉하지 못했다) claim 의 객체별
+-- 순서 보장과도 충돌하지 않는다.
+--
+-- mark_failed 는 재검사가 필요 없다 — 실패 경로는 공개 버킷에 객체를 만들지
+-- 않는다 (download 실패 = 받은 것 없음, upload 실패 = 올라간 것 없음. 업로드
+-- 성공 후 실패로 기록되는 경로는 없다 — copyOne 은 업로드 성공 시 mark_stored
+-- 만 부른다). 삭제와 복사가 겹친 경우는 기존 P0002 + queue_orphan 경로가 맡는다.
+--
+-- **이 파일이 신규 마이그레이션인 이유**: 원 정의가 있는 20260814110000 은 원격
+-- 기적용이라 수정 금지 — 재정의는 CREATE OR REPLACE 로만 한다 (#518 관례).
+-- =============================================================================
+
+BEGIN;
+
+-- 본문 출처 = 20260814110000 (6-d). 변경 = 숨김 재검사 블록 추가 하나.
+-- 보안 속성(SECURITY DEFINER + search_path 고정)·오류 코드·0행 P0002 는 그대로다.
+CREATE OR REPLACE FUNCTION swatch_media_mark_stored(
+  p_id           uuid,
+  p_object_key   text,
+  p_content_type text,
+  p_bytes        bigint
+)
+RETURNS void
+LANGUAGE plpgsql
+SECURITY DEFINER
+SET search_path = public
+AS $$
+DECLARE
+  v_swatch_id bigint;
+  v_hidden    boolean;
+BEGIN
+  IF p_object_key IS NULL OR p_object_key = '' THEN
+    RAISE EXCEPTION 'object_key required for stored media' USING ERRCODE = '22023';
+  END IF;
+
+  UPDATE swatch_media
+     SET status          = 'stored',
+         object_key      = p_object_key,
+         content_type    = p_content_type,
+         bytes           = p_bytes,
+         last_attempt_at = now()
+   WHERE id = p_id
+  RETURNING swatch_id INTO v_swatch_id;
+
+  IF NOT FOUND THEN
+    RAISE EXCEPTION 'swatch_media row % is gone — uploaded object % is orphaned',
+      p_id, p_object_key
+      USING ERRCODE = 'P0002';
+  END IF;
+
+  -- [fix1 발견물 2] 복사가 도는 사이 발색이 숨겨졌으면, 숨김 트리거가 이 행을
+  -- 못 봤다(당시 object_key NULL). 완료 시점에 재검사해 revoke 를 큐잉한다 —
+  -- 소비자가 집으면 방금 올라간 공개 객체가 private 으로 이사한다.
+  SELECT s.hidden_at IS NOT NULL INTO v_hidden
+    FROM swatches s
+   WHERE s.id = v_swatch_id;
+
+  IF COALESCE(v_hidden, false) THEN
+    INSERT INTO swatch_media_lifecycle_queue
+      (swatch_id, media_id, object_key, action, reason)
+    VALUES (v_swatch_id, p_id, p_object_key, 'revoke', 'stored_while_hidden');
+  END IF;
+END;
+$$;
+
+COMMENT ON FUNCTION swatch_media_mark_stored(uuid, text, text, bigint) IS
+  '복사 성공 기록. 대상 행이 사라졌으면 P0002 로 던진다(호출자가 수명주기 큐로 보낸다). 완료 시점에 소속 발색의 숨김 여부를 재검사해 숨김이면 revoke 를 큐잉한다 — 복사 중 숨긴 발색의 객체가 공개 버킷에 잔류하지 않게 (fix1 발견물 2). retry_count 는 남겨 둔다.';
+
+-- 권한 상태 보존 (repo 규칙: 재정의 때마다 명시 반복 — CREATE OR REPLACE 는
+-- ACL 을 유지하지만, seed 재-회수 목록과 같은 모양을 눈에 보이게 남긴다).
+REVOKE ALL ON FUNCTION swatch_media_mark_stored(uuid, text, text, bigint) FROM PUBLIC, anon, authenticated;
+GRANT EXECUTE ON FUNCTION swatch_media_mark_stored(uuid, text, text, bigint) TO service_role;
+
+COMMIT;
+
+-- ── 검증 (원격 재실행용, 읽기 전용) ─────────────────────────────────────────
+-- 1. 재검사 블록이 들어갔다.
+--    SELECT prosrc LIKE '%stored_while_hidden%' FROM pg_proc
+--     WHERE proname='swatch_media_mark_stored';                          -- 기대: t
+-- 2. 보안 속성·EXECUTE 는 그대로 service_role 전용 (구조 검증 (7) 블록이 함께 본다).
+--    SELECT prosecdef, proacl::text FROM pg_proc WHERE proname='swatch_media_mark_stored';
+--    기대: t, anon·authenticated 없음 + service_role=X
+-- 3. 운영 관찰 — 이 경로로 큐잉된 건수 (복사 중 숨김이 드물어 0 근처가 정상).
+--    SELECT count(*) FROM swatch_media_lifecycle_queue WHERE reason='stored_while_hidden';
```

### 샛길 1 — 모기의 첫 관찰

> 이 파일에서 `swatch_media`의 어느 행이 언제 바뀌고, 그 사이 사용자가 무엇을 하면 공개 사본이 남는 것 같아?

## 아직 직접 보지 않은 fix1 파일

핵심길 1에서 `mediaAdapter.ts`, `supabaseAdapter.ts`, `supabaseAdapter.media.test.ts`를 봤고, 샛길 1에서 `20260817030000_mark_stored_hidden_recheck.sql`을 골랐다. 아래는 아직 직접 보지 않은 파일이다.

```text
app/api/swatch-media-lifecycle.ts
app/api/swatch-media-retry.ts
app/server/swatchMediaLifecycle.test.ts
app/server/swatchMediaLifecycle.ts
app/server/swatchMediaService.ts
app/src/data/repos/swatchMediaRepo.test.ts
app/src/data/repos/swatchMediaRepo.ts
app/src/data/repos/swatchesRepo.blocked.test.ts
app/src/data/repos/swatchesRepo.ts
app/src/features/home/HomePage.tsx
app/src/locales/ko/pages.json
supabase/migrations/20260817040000_sync_insert_first_media_link.sql
supabase/migrations/20260817050000_representative_media_swatch_scope.sql
supabase/tests/shade_representative_reselection_fixture.sql
supabase/tests/swatch_media_structure_verify.sql
```

## 모기의 첫 관찰

> 이 줄들에서 실제로 무엇이 달라진 것 같아?
