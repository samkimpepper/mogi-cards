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

### 연결: `app/src/data/supabase/supabaseAdapter.ts`

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

## 아직 직접 보지 않은 fix1 파일

핵심길 1에서 직접 본 파일은 `mediaAdapter.ts`, `supabaseAdapter.ts`, `supabaseAdapter.media.test.ts`다. 아래에서 샛길 파일은 모기가 직접 하나 고른다.

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
supabase/migrations/20260817030000_mark_stored_hidden_recheck.sql
supabase/migrations/20260817040000_sync_insert_first_media_link.sql
supabase/migrations/20260817050000_representative_media_swatch_scope.sql
supabase/tests/shade_representative_reselection_fixture.sql
supabase/tests/swatch_media_structure_verify.sql
```

## 모기의 첫 관찰

> 이 줄들에서 실제로 무엇이 달라진 것 같아?
