/**
 * Stateless dialog flow — SSE stream (POST .../run/stream)
 *
 * Quick start:
 *   export BASE_URL="http://localhost:4000"
 *   export API_KEY="nap_..."
 *   export DIALOG_FLOW_ID="<uuid>"
 *   npx tsx scripts/examples/dialog-flow-stateless-sse.ts -m "Hi"
 *
 * Each SSE frame yields `event` + parsed `data`.
 * By default: hierarchical stream trace (runs → nodes → progress → assistant text), duplicate
 * progress lines collapsed, heartbeat skipped; final `result` uses the same table summary as
 * `dialog-flow-stateless-json.ts`. Use `--verbose` / `-v` for `{ event, data }` JSON per frame.
 * The `result` event’s `data` matches the aggregate JSON from POST .../run (executionId,
 * awaiting-input / dialogFlowExecutionId, etc.). Stateless /run/stream does not persist state:
 * awaiting-input runs cannot be resumed here — rerun the stream with messages that supply the
 * missing information. Only executions started via POST /dialog-flow-executions support DB resume.
 *
 * Optional: MODEL (default gpt-4o-mini). Required flag: --message / -m. Optional: --verbose, -v. --help for env + flags.
 * Requires Node 18+ (global fetch).
 */

import {
  createStatelessSsePrettySession,
  printPrettyJson,
  sseDataAsJsonOrRaw,
} from "./dialog-flow-stateless-pretty-print.ts";

// Avoid `import process from "node:process"` — root workspace has no @types/node for loose scripts.
type MiniProcess = {
  env: Record<string, string | undefined>;
  argv: string[];
  exit: (code?: number) => never;
};

function nodeProcess(): MiniProcess {
  const p = (globalThis as unknown as { process?: MiniProcess }).process;
  if (!p) throw new Error("This script must run under Node.js");
  return p;
}

// -----------------------------------------------------------------------------
// Everything you need to call the API (copy readSseEvents + the fetch below)
// POST {baseUrl}/dialog-flow-executions/run/stream
// Headers: Content-Type, Accept: text/event-stream, Authorization: Bearer nap_...
// -----------------------------------------------------------------------------

type RunStatelessBody = {
  dialogFlowId: string;
  messages: Array<{ content: string; fileIds?: string[] }>;
  model?: string;
};

const DEFAULT_MODEL = "gpt-4o-mini";

function authHeader(apiKey: string): string {
  return apiKey.startsWith("nap_") ? `Bearer ${apiKey}` : `Bearer nap_${apiKey}`;
}

type SseEvent = { event: string; data: string };

async function postStatelessDialogFlowStream(
  baseUrl: string,
  apiKey: string,
  body: RunStatelessBody,
): Promise<Response> {
  const res = await fetch(`${baseUrl.replace(/\/$/, "")}/dialog-flow-executions/run/stream`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "text/event-stream",
      Authorization: authHeader(apiKey),
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`HTTP ${res.status} ${res.statusText}\n${text}`);
  }

  return res;
}

/** Yield one object per SSE frame (`data` joined if the server sent multiple data: lines). */
async function* readSseEvents(response: Response): AsyncGenerator<SseEvent> {
  if (!response.body) throw new Error("Response has no body (stream unavailable)");

  const reader = response.body.getReader();
  const decoder = new TextDecoder("utf-8");

  let buf = "";
  let eventName = "message";
  let dataLines: string[] = [];

  const flush = (): SseEvent | null => {
    if (dataLines.length === 0) return null;
    const ev: SseEvent = { event: eventName, data: dataLines.join("\n") };
    eventName = "message";
    dataLines = [];
    return ev;
  };

  while (true) {
    const { value, done } = await reader.read();
    buf += value ? decoder.decode(value, { stream: true }) : "";
    if (done) break;

    while (true) {
      const idx = buf.indexOf("\n\n");
      if (idx === -1) break;

      const frame = buf.slice(0, idx);
      buf = buf.slice(idx + 2);

      for (const line of frame.split(/\r?\n/)) {
        if (line.startsWith("event:")) {
          eventName = line.slice("event:".length).trim() || "message";
        } else if (line.startsWith("data:")) {
          dataLines.push(line.slice("data:".length).trimStart());
        }
      }

      const ev = flush();
      if (ev) yield ev;
    }
  }

  const trailing = flush();
  if (trailing) yield trailing;
}

// -----------------------------------------------------------------------------
// Tiny CLI
// -----------------------------------------------------------------------------

function requiredEnv(name: string): string {
  const v = nodeProcess().env[name];
  if (!v) throw new Error(`Missing required env var: ${name}`);
  return v;
}

/** Next-arg or `--flag=value` form; skips other flags as values. */
function cliStringFlag(long: string, short?: string): string | undefined {
  const argv = nodeProcess().argv;
  const eqLong = `${long}=`;
  const eqShort = short ? `${short}=` : "";

  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === long || (short && a === short)) {
      const next = argv[i + 1];
      if (next !== undefined && !next.startsWith("-")) return next;
      return undefined;
    }
    if (a.startsWith(eqLong)) return a.slice(eqLong.length);
    if (eqShort && a.startsWith(eqShort)) return a.slice(eqShort.length);
  }
  return undefined;
}

function usage(): string {
  return [
    "Usage: npx tsx scripts/examples/dialog-flow-stateless-sse.ts --message|-m \"<text>\" [--verbose|-v]",
    "",
    "Required env:",
    '  BASE_URL="http://localhost:4000"',
    '  API_KEY="nap_..."',
    '  DIALOG_FLOW_ID="<uuid>"',
    "",
    "Optional env:",
    `  MODEL="${DEFAULT_MODEL}"`,
    "",
    "Flags:",
    "  --message, -m   User message (required). Also accepts --message=... or -m=....",
    "  --verbose, -v   One JSON object per SSE frame. Default: hierarchical stream + summary.",
  ].join("\n");
}

async function main() {
  if (nodeProcess().argv.includes("--help") || nodeProcess().argv.includes("-h")) {
    console.log(usage());
    nodeProcess().exit(0);
  }

  const verbose =
    nodeProcess().argv.includes("--verbose") || nodeProcess().argv.includes("-v");

  const messageOpt = cliStringFlag("--message", "-m");
  if (!messageOpt) {
    console.error("Missing required flag: --message / -m (see --help)");
    nodeProcess().exit(1);
    throw new Error("unreachable");
  }
  const message = messageOpt;

  const baseUrl = requiredEnv("BASE_URL").replace(/\/$/, "");
  const apiKey = requiredEnv("API_KEY");
  const dialogFlowId = requiredEnv("DIALOG_FLOW_ID");
  const model = nodeProcess().env.MODEL ?? DEFAULT_MODEL;

  const body: RunStatelessBody = {
    dialogFlowId,
    messages: [{ content: message }],
    model,
  };

  const res = await postStatelessDialogFlowStream(baseUrl, apiKey, body);

  const ssePretty = verbose ? null : createStatelessSsePrettySession();
  for await (const ev of readSseEvents(res)) {
    const data = sseDataAsJsonOrRaw(ev.data);
    if (verbose) {
      printPrettyJson({ event: ev.event, data });
    } else if (ssePretty) {
      ssePretty.consume(ev.event, data);
    }
    if (ev.event === "done" || ev.event === "error") break;
  }

  ssePretty?.finish();
}

main().catch((err) => {
  console.error(err instanceof Error ? err.stack ?? err.message : err);
  nodeProcess().exit(1);
});

export {};
