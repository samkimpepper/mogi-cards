#!/usr/bin/env node

// Warn once per context cycle when 40% or less of the Codex context remains.
// Codex hook payloads do not expose token usage directly, so this reads the
// most recent token_count event from the session transcript. The transcript
// format is not a stable public API; failures therefore exit silently.

const fs = require('fs');
const os = require('os');
const path = require('path');

const WARNING_REMAINING_PERCENT = 40;
const RESET_REMAINING_PERCENT = 55;
const MAX_TRANSCRIPT_TAIL_BYTES = 16 * 1024 * 1024;

function readInput() {
  return new Promise((resolve) => {
    let input = '';
    process.stdin.setEncoding('utf8');
    process.stdin.on('data', (chunk) => {
      input += chunk;
    });
    process.stdin.on('end', () => resolve(input));
  });
}

function latestTokenCount(transcriptPath) {
  const stat = fs.statSync(transcriptPath);
  const bytesToRead = Math.min(stat.size, MAX_TRANSCRIPT_TAIL_BYTES);
  const start = stat.size - bytesToRead;
  const buffer = Buffer.allocUnsafe(bytesToRead);
  const fd = fs.openSync(transcriptPath, 'r');

  try {
    fs.readSync(fd, buffer, 0, bytesToRead, start);
  } finally {
    fs.closeSync(fd);
  }

  const lines = buffer.toString('utf8').split('\n');
  if (start > 0) lines.shift();

  for (let index = lines.length - 1; index >= 0; index -= 1) {
    const line = lines[index].trim();
    if (!line.includes('"type":"token_count"')) continue;

    try {
      const event = JSON.parse(line);
      const payload = event?.type === 'event_msg' ? event.payload : null;
      const used = payload?.info?.last_token_usage?.total_tokens;
      const window = payload?.info?.model_context_window;

      if (
        payload?.type === 'token_count'
        && Number.isFinite(used)
        && Number.isFinite(window)
        && used >= 0
        && window > 0
      ) {
        return { used, window };
      }
    } catch {
      // Keep scanning older complete lines.
    }
  }

  return null;
}

function safeSessionId(value) {
  if (typeof value !== 'string' || value.length === 0) return null;
  if (/[/\\]|\.\./.test(value)) return null;
  return value.replace(/[^a-zA-Z0-9_-]/g, '_');
}

function readState(statePath) {
  try {
    return JSON.parse(fs.readFileSync(statePath, 'utf8'));
  } catch {
    return { warned40: false };
  }
}

function writeState(statePath, state) {
  fs.writeFileSync(statePath, JSON.stringify(state));
}

async function main() {
  try {
    const hook = JSON.parse(await readInput());
    const sessionId = safeSessionId(hook.session_id);
    const transcriptPath = hook.transcript_path;

    if (!sessionId || typeof transcriptPath !== 'string') return;
    if (!path.isAbsolute(transcriptPath)) return;

    const usage = latestTokenCount(transcriptPath);
    if (!usage) return;

    const remaining = Math.max(
      0,
      Math.min(100, ((usage.window - usage.used) / usage.window) * 100),
    );
    const statePath = path.join(
      os.tmpdir(),
      `mogi-cards-context-${sessionId}.json`,
    );
    const state = readState(statePath);

    if (remaining >= RESET_REMAINING_PERCENT) {
      if (state.warned40) writeState(statePath, { warned40: false });
      return;
    }

    if (remaining > WARNING_REMAINING_PERCENT || state.warned40) return;

    writeState(statePath, { warned40: true });

    const roundedRemaining = Math.round(remaining);
    const roundedUsed = Math.round(100 - remaining);
    const userMessage =
      `컨텍스트 약 ${roundedRemaining}% 남음(${roundedUsed}% 사용). `
      + '/status 확인 및 관찰일지·인수인계 체크포인트 권장.';
    const agentContext =
      `CONTEXT CHECKPOINT: approximately ${roundedRemaining}% remains. `
      + 'Tell Mogi immediately before starting more exploration. Prioritize a durable '
      + 'checkpoint or the tutoring session observation log if the current session has '
      + 'meaningful observations. Do not claim that /status itself was executed.';

    process.stdout.write(JSON.stringify({
      systemMessage: userMessage,
      hookSpecificOutput: {
        hookEventName: hook.hook_event_name || 'Stop',
        additionalContext: agentContext,
      },
    }));
  } catch {
    // A monitoring hook must never interrupt tutoring work.
  }
}

main();
