#!/usr/bin/env node

import { spawn } from "node:child_process";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const SERVER_PATH = resolve(HERE, "server.mjs");
const DEFAULT_PORT = 8766;

function delay(milliseconds) {
  return new Promise((accept) => setTimeout(accept, milliseconds));
}

export async function dashboardIsHealthy(port = DEFAULT_PORT) {
  try {
    const response = await fetch(`http://127.0.0.1:${port}/api/health`, {
      cache: "no-store",
      signal: AbortSignal.timeout(400),
    });
    if (!response.ok) return false;
    const body = await response.json();
    return body.service === "mogi-review-dashboard" && body.version === 1;
  } catch {
    return false;
  }
}

export async function ensureDashboard({ port = DEFAULT_PORT } = {}) {
  const url = `http://127.0.0.1:${port}`;
  if (await dashboardIsHealthy(port)) return { status: "already-running", url };

  const child = spawn(process.execPath, [SERVER_PATH, `--port=${port}`], {
    cwd: resolve(HERE, ".."),
    detached: true,
    stdio: "ignore",
  });
  child.unref();

  for (let attempt = 0; attempt < 20; attempt += 1) {
    await delay(75);
    if (await dashboardIsHealthy(port)) return { status: "started", url };
  }
  throw new Error(`상태판이 ${url}에서 시작되지 않았어`);
}

const invokedPath = process.argv[1] ? resolve(process.argv[1]) : "";
if (invokedPath === fileURLToPath(import.meta.url)) {
  try {
    const result = await ensureDashboard();
    const statusLabel = result.status === "started" ? "자동 시작 완료" : "기존 서버 사용 중";
    console.log(`${result.url} (${statusLabel})`);
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
