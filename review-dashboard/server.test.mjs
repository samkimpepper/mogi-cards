import assert from "node:assert/strict";
import { mkdtemp, mkdir, readFile, rm, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { afterEach, beforeEach, test } from "node:test";

import {
  ReviewStatusError,
  inspectDocument,
  listUnreviewedDocuments,
  markDocumentReviewed,
  startReviewServer,
} from "./server.mjs";
import { dashboardIsHealthy, ensureDashboard } from "./start.mjs";

let repoRoot;

function markdown({ reviewed = "false", title = "테스트 문서", body = "본문" } = {}) {
  return `---\nreviewed: ${reviewed}\nmerge_ready: false\n---\n\n# ${title}\n\n${body}\n`;
}

async function write(relativePath, content) {
  const fullPath = join(repoRoot, relativePath);
  await mkdir(dirname(fullPath), { recursive: true });
  await writeFile(fullPath, content, "utf8");
}

beforeEach(async () => {
  repoRoot = await mkdtemp(join(tmpdir(), "mogi-review-dashboard-"));
  for (const directory of ["pr-cards", "plan-cards", "code-diff-notes"]) {
    for (const repository of ["mogi-productivity", "swatch-v2"]) {
      await mkdir(join(repoRoot, directory, repository), { recursive: true });
    }
  }
});

afterEach(async () => {
  await rm(repoRoot, { recursive: true, force: true });
});

test("등록된 레포별로 바로 아래 reviewed: false 문서만 모은다", async () => {
  await write("pr-cards/mogi-productivity/2026-08-24-new.md", markdown({ title: "새 PR" }));
  await write("pr-cards/mogi-productivity/2026-08-23-done.md", markdown({ reviewed: "true", title: "읽은 PR" }));
  await write("plan-cards/mogi-productivity/legacy.md", "# 상태 없는 레거시\n");
  await write("code-diff-notes/mogi-productivity/temp/ignored.md", markdown({ title: "임시 워크북" }));

  await write("pr-cards/swatch-v2/2026-08-24-new.md", markdown({ title: "swatch PR" }));
  await write("pr-cards/2026-08-24-root.md", markdown({ title: "이전 구조" }));
  await write("pr-cards/unknown/2026-08-24-other.md", markdown());
  await write("pr-cards/swatch-v2/archive/ignored.md", markdown());

  const result = await listUnreviewedDocuments(repoRoot);

  assert.equal(result.total, 2);
  assert.equal(result.groups.length, 6);
  assert.deepEqual(result.groups.map((group) => group.repository), [
    "mogi-productivity", "mogi-productivity", "mogi-productivity",
    "swatch-v2", "swatch-v2", "swatch-v2",
  ]);
  assert.deepEqual(result.groups[3].documents, [
    { path: "pr-cards/swatch-v2/2026-08-24-new.md", title: "swatch PR" },
  ]);
  assert.deepEqual(result.groups[0].documents, [
    { path: "pr-cards/mogi-productivity/2026-08-24-new.md", title: "새 PR" },
  ]);
  assert.equal(result.groups[1].documents.length, 0);
  assert.equal(result.groups[2].documents.length, 0);
});

test("frontmatter의 reviewed 값만 false에서 true로 바꾼다", async () => {
  const relativePath = "code-diff-notes/mogi-productivity/2026-08-24-flow.md";
  await write(relativePath, markdown({ body: "본문의 reviewed: false 문장은 그대로 둔다." }));

  const swatchPath = relativePath.replace("mogi-productivity", "swatch-v2");
  const swatchOriginal = markdown({ body: "다른 제품의 같은 파일명" });
  await write(swatchPath, swatchOriginal);

  const result = await markDocumentReviewed(repoRoot, relativePath);
  assert.equal(await readFile(join(repoRoot, swatchPath), "utf8"), swatchOriginal);
  const updated = await readFile(join(repoRoot, relativePath), "utf8");

  assert.equal(result.reviewed, true);
  assert.match(updated, /^reviewed: true$/m);
  assert.match(updated, /본문의 reviewed: false 문장은 그대로 둔다\./);
});

test("temp와 경로 이탈은 거부한다", async () => {
  await assert.rejects(
    markDocumentReviewed(repoRoot, "code-diff-notes/mogi-productivity/temp/ignored.md"),
    (error) => error instanceof ReviewStatusError && error.status === 400,
  );
  await assert.rejects(
    markDocumentReviewed(repoRoot, "../README.md"),
    (error) => error instanceof ReviewStatusError && error.status === 400,
  );
});

test("이미 true인 문서는 다시 쓰지 않는다", async () => {
  const relativePath = "plan-cards/mogi-productivity/2026-08-24-done.md";
  await write(relativePath, markdown({ reviewed: "true" }));

  await assert.rejects(
    markDocumentReviewed(repoRoot, relativePath),
    (error) => error instanceof ReviewStatusError && error.status === 409,
  );
});

test("reviewed 상태가 중복되면 모호한 변경을 거부한다", () => {
  assert.throws(
    () => inspectDocument("---\nreviewed: false\nreviewed: true\n---\n# 중복\n", "duplicate.md"),
    (error) => error instanceof ReviewStatusError && error.status === 409,
  );
});

test("HTTP API로 목록을 읽고 체크를 반영한다", async (context) => {
  const relativePath = "pr-cards/mogi-productivity/2026-08-24-http.md";
  await write(relativePath, markdown({ title: "HTTP 확인" }));
  const server = await startReviewServer({ repoRoot, port: 0 });
  context.after(() => new Promise((resolveClose) => server.close(resolveClose)));
  const address = server.address();
  const baseUrl = `http://127.0.0.1:${address.port}`;

  const dashboardHtml = await fetch(`${baseUrl}/`).then((response) => response.text());
  assert.match(dashboardHtml, /읽은 문서 상태판/);

  assert.equal(await dashboardIsHealthy(address.port, repoRoot), true);
  assert.equal(await dashboardIsHealthy(address.port), false);
  const health = await fetch(`${baseUrl}/api/health`).then((response) => response.json());
  assert.equal(health.repoRoot, repoRoot);
  assert.equal(health.version, 2);

  const listed = await fetch(`${baseUrl}/api/documents`).then((response) => response.json());
  assert.equal(listed.total, 1);

  const response = await fetch(`${baseUrl}/api/review`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ path: relativePath }),
  });
  assert.equal(response.status, 200);

  const updated = await readFile(join(repoRoot, relativePath), "utf8");
  assert.match(updated, /^reviewed: true$/m);
});

test("HTTP 변경 API는 JSON이 아닌 요청을 거부한다", async (context) => {
  const server = await startReviewServer({ repoRoot, port: 0 });
  context.after(() => new Promise((resolveClose) => server.close(resolveClose)));
  const address = server.address();

  const response = await fetch(`http://127.0.0.1:${address.port}/api/review`, {
    method: "POST",
    body: JSON.stringify({ path: "pr-cards/mogi-productivity/example.md" }),
  });

  assert.equal(response.status, 415);
});

test("HTTP 변경 API는 문서 경로가 없는 JSON을 거부한다", async (context) => {
  const server = await startReviewServer({ repoRoot, port: 0 });
  context.after(() => new Promise((resolveClose) => server.close(resolveClose)));
  const address = server.address();

  const response = await fetch(`http://127.0.0.1:${address.port}/api/review`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: "null",
  });

  assert.equal(response.status, 400);
});

test("현재 공책을 가리키는 서버는 재사용한다", async (context) => {
  const server = await startReviewServer({ port: 0 });
  context.after(() => new Promise((close) => server.close(close)));
  const { port } = server.address();
  assert.equal(await dashboardIsHealthy(port), true);
  assert.deepEqual(await ensureDashboard({ port }), {
    status: "already-running", url: `http://127.0.0.1:${port}`,
  });
});

test("미등록 레포와 추가 경로는 변경할 수 없다", async () => {
  for (const path of [
    "pr-cards/unknown/test.md", "pr-cards/test.md",
    "pr-cards/../test.md", "pr-cards/mogi-productivity/../test.md",
    "pr-cards/swatch-v2/temp/test.md", "pr-cards/swatch-v2/..",
    "pr-cards/swatch-v2/test.md/extra.md", "pr-cards\\swatch-v2\\test.md",
  ]) {
    await assert.rejects(markDocumentReviewed(repoRoot, path),
      (error) => error instanceof ReviewStatusError && error.status === 400, path);
  }
});

test("레포 폴더와 문서의 심볼릭 링크를 따라 쓰지 않는다", async () => {
  const targetPath = "pr-cards/swatch-v2/2026-10-15-target.md";
  const original = markdown();
  await write(targetPath, original);
  await symlink(join(repoRoot, targetPath), join(repoRoot, "pr-cards/mogi-productivity/linked.md"));
  await assert.rejects(markDocumentReviewed(repoRoot, "pr-cards/mogi-productivity/linked.md"),
    (error) => error instanceof ReviewStatusError && error.status === 409);
  await rm(join(repoRoot, "pr-cards/mogi-productivity"), { recursive: true });
  await symlink(join(repoRoot, "pr-cards/swatch-v2"), join(repoRoot, "pr-cards/mogi-productivity"));
  await assert.rejects(markDocumentReviewed(repoRoot, "pr-cards/mogi-productivity/2026-10-15-target.md"),
    (error) => error instanceof ReviewStatusError && error.status === 400);
  assert.equal(await readFile(join(repoRoot, targetPath), "utf8"), original);
});

test("아직 없는 제품 폴더는 빈 목록으로 표시한다", async () => {
  await rm(join(repoRoot, "plan-cards/mogi-productivity"), { recursive: true });
  const result = await listUnreviewedDocuments(repoRoot);
  assert.equal(result.groups[1].documents.length, 0);
  assert.equal(result.total, 0);
});
