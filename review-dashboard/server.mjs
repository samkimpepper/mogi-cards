#!/usr/bin/env node

import { randomUUID } from "node:crypto";
import { lstat, readFile, readdir, rename, unlink, writeFile } from "node:fs/promises";
import { createServer } from "node:http";
import { basename, dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const DEFAULT_REPO_ROOT = resolve(HERE, "..");
const DASHBOARD_HTML = resolve(HERE, "index.html");
const MAX_REQUEST_BYTES = 8 * 1024;

export const ACTIVE_GROUPS = [
  { directory: "pr-cards", label: "PR 카드" },
  { directory: "plan-cards", label: "설계 카드" },
  { directory: "code-diff-notes", label: "코드 학습 노트" },
];

export class ReviewStatusError extends Error {
  constructor(message, status = 400) {
    super(message);
    this.name = "ReviewStatusError";
    this.status = status;
  }
}

function resolveActiveDocument(repoRoot, relativePath) {
  if (typeof relativePath !== "string" || relativePath.includes("\\")) {
    throw new ReviewStatusError("문서 경로 형식이 올바르지 않아");
  }

  const parts = relativePath.split("/");
  const allowedDirectory = ACTIVE_GROUPS.some((group) => group.directory === parts[0]);
  const filename = parts[1];
  if (
    parts.length !== 2 ||
    !allowedDirectory ||
    !filename ||
    filename === "." ||
    filename === ".." ||
    !filename.endsWith(".md")
  ) {
    throw new ReviewStatusError("활성 폴더 바로 아래의 Markdown 문서만 바꿀 수 있어");
  }

  const directoryPath = resolve(repoRoot, parts[0]);
  const documentPath = resolve(directoryPath, filename);
  if (dirname(documentPath) !== directoryPath) {
    throw new ReviewStatusError("활성 폴더 밖의 문서는 바꿀 수 없어");
  }
  return documentPath;
}

export function inspectDocument(content, relativePath = "문서") {
  const frontmatter = content.match(/^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/);
  if (!frontmatter) {
    throw new ReviewStatusError(`${relativePath}: YAML frontmatter를 찾지 못했어`, 409);
  }

  const block = frontmatter[1];
  const statusMatches = [...block.matchAll(/^reviewed:[ \t]*(true|false)[ \t]*\r?$/gm)];
  if (statusMatches.length !== 1) {
    throw new ReviewStatusError(`${relativePath}: reviewed 상태가 정확히 하나 있어야 해`, 409);
  }

  const statusMatch = statusMatches[0];
  const valueOffsetInBlock = statusMatch.index + statusMatch[0].indexOf(statusMatch[1]);
  const blockOffset = frontmatter[0].indexOf(block);
  const valueStart = blockOffset + valueOffsetInBlock;
  const titleMatch = content.match(/^#[ \t]+(.+?)\r?$/m);

  return {
    reviewed: statusMatch[1] === "true",
    title: titleMatch ? titleMatch[1].trim() : basename(relativePath, ".md"),
    valueStart,
    valueEnd: valueStart + statusMatch[1].length,
  };
}

export async function listUnreviewedDocuments(repoRoot = DEFAULT_REPO_ROOT) {
  const groups = [];

  for (const group of ACTIVE_GROUPS) {
    const directoryPath = resolve(repoRoot, group.directory);
    const entries = await readdir(directoryPath, { withFileTypes: true });
    const documents = [];

    for (const entry of entries) {
      if (!entry.isFile() || !entry.name.endsWith(".md")) continue;
      const relativePath = `${group.directory}/${entry.name}`;
      const documentPath = resolveActiveDocument(repoRoot, relativePath);
      const content = await readFile(documentPath, "utf8");
      let inspected;
      try {
        inspected = inspectDocument(content, relativePath);
      } catch (error) {
        if (error instanceof ReviewStatusError) continue;
        throw error;
      }
      if (!inspected.reviewed) {
        documents.push({ path: relativePath, title: inspected.title });
      }
    }

    documents.sort((left, right) => right.path.localeCompare(left.path, "ko"));
    groups.push({ ...group, documents });
  }

  return {
    groups,
    total: groups.reduce((sum, group) => sum + group.documents.length, 0),
  };
}

export async function markDocumentReviewed(repoRoot, relativePath) {
  const documentPath = resolveActiveDocument(repoRoot, relativePath);
  let documentStat;
  let content;
  try {
    documentStat = await lstat(documentPath);
    if (!documentStat.isFile()) {
      throw new ReviewStatusError("일반 Markdown 파일만 바꿀 수 있어", 409);
    }
    content = await readFile(documentPath, "utf8");
  } catch (error) {
    if (error && error.code === "ENOENT") {
      throw new ReviewStatusError("문서를 찾지 못했어. 목록을 새로고침해줘", 404);
    }
    throw error;
  }

  const inspected = inspectDocument(content, relativePath);
  if (inspected.reviewed) {
    throw new ReviewStatusError("이미 reviewed: true인 문서야", 409);
  }

  const updated = `${content.slice(0, inspected.valueStart)}true${content.slice(inspected.valueEnd)}`;
  const temporaryPath = resolve(
    dirname(documentPath),
    `.${basename(documentPath)}.reviewed-${process.pid}-${randomUUID()}.tmp`,
  );

  try {
    await writeFile(temporaryPath, updated, {
      encoding: "utf8",
      flag: "wx",
      mode: documentStat.mode,
    });
    await rename(temporaryPath, documentPath);
  } catch (error) {
    await unlink(temporaryPath).catch(() => {});
    throw error;
  }

  return { path: relativePath, title: inspected.title, reviewed: true };
}

function sendJson(response, status, body) {
  response.writeHead(status, {
    "Cache-Control": "no-store",
    "Content-Type": "application/json; charset=utf-8",
    "X-Content-Type-Options": "nosniff",
  });
  response.end(JSON.stringify(body));
}

async function readJsonBody(request) {
  let size = 0;
  const chunks = [];
  for await (const chunk of request) {
    size += chunk.length;
    if (size > MAX_REQUEST_BYTES) {
      throw new ReviewStatusError("요청이 너무 커", 413);
    }
    chunks.push(chunk);
  }

  try {
    return JSON.parse(Buffer.concat(chunks).toString("utf8"));
  } catch {
    throw new ReviewStatusError("JSON 요청을 읽지 못했어");
  }
}

function assertSafeMutationRequest(request) {
  const contentType = request.headers["content-type"] || "";
  if (!contentType.toLowerCase().startsWith("application/json")) {
    throw new ReviewStatusError("application/json 요청만 받을 수 있어", 415);
  }

  const origin = request.headers.origin;
  if (!origin) return;
  let originUrl;
  try {
    originUrl = new URL(origin);
  } catch {
    throw new ReviewStatusError("요청 출처를 확인할 수 없어", 403);
  }
  if (originUrl.hostname !== "127.0.0.1" || originUrl.host !== request.headers.host) {
    throw new ReviewStatusError("상태판과 같은 로컬 주소에서 온 요청만 받을 수 있어", 403);
  }
}

export function createReviewServer({ repoRoot = DEFAULT_REPO_ROOT } = {}) {
  const resolvedRoot = resolve(repoRoot);

  return createServer(async (request, response) => {
    const url = new URL(request.url || "/", "http://127.0.0.1");
    try {
      if (request.method === "GET" && url.pathname === "/") {
        const html = await readFile(DASHBOARD_HTML, "utf8");
        response.writeHead(200, {
          "Cache-Control": "no-store",
          "Content-Security-Policy": "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; connect-src 'self'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'",
          "Content-Type": "text/html; charset=utf-8",
          "X-Content-Type-Options": "nosniff",
        });
        response.end(html);
        return;
      }

      if (request.method === "GET" && url.pathname === "/api/documents") {
        sendJson(response, 200, await listUnreviewedDocuments(resolvedRoot));
        return;
      }

      if (request.method === "GET" && url.pathname === "/api/health") {
        sendJson(response, 200, { service: "mogi-review-dashboard", version: 1 });
        return;
      }

      if (request.method === "POST" && url.pathname === "/api/review") {
        assertSafeMutationRequest(request);
        const body = await readJsonBody(request);
        if (!body || typeof body !== "object" || Array.isArray(body)) {
          throw new ReviewStatusError("문서 경로가 든 JSON 객체가 필요해");
        }
        sendJson(response, 200, await markDocumentReviewed(resolvedRoot, body.path));
        return;
      }

      sendJson(response, 404, { error: "없는 경로야" });
    } catch (error) {
      const status = error instanceof ReviewStatusError ? error.status : 500;
      const message = error instanceof ReviewStatusError ? error.message : "상태판 서버에서 오류가 났어";
      if (status === 500) console.error(error);
      sendJson(response, status, { error: message });
    }
  });
}

export async function startReviewServer({ repoRoot = DEFAULT_REPO_ROOT, port = 8766 } = {}) {
  const server = createReviewServer({ repoRoot });
  await new Promise((accept, reject) => {
    server.once("error", reject);
    server.listen(port, "127.0.0.1", accept);
  });
  return server;
}

function parsePort(argumentsList) {
  const portArgument = argumentsList.find((argument) => argument.startsWith("--port="));
  if (!portArgument) return 8766;
  const port = Number(portArgument.slice("--port=".length));
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error("--port는 1~65535 사이 정수여야 해");
  }
  return port;
}

const invokedPath = process.argv[1] ? resolve(process.argv[1]) : "";
if (invokedPath === fileURLToPath(import.meta.url)) {
  const port = parsePort(process.argv.slice(2));
  const server = await startReviewServer({ port });
  console.log(`읽은 문서 상태판: http://127.0.0.1:${port}`);
  console.log("종료하려면 Ctrl+C");

  const stop = () => server.close(() => process.exit(0));
  process.once("SIGINT", stop);
  process.once("SIGTERM", stop);
}
