/**
 * Stateless dialog flow — JSON round-trip (POST .../run)
 *
 * Quick start:
 *   export BASE_URL="http://localhost:4000"
 *   export API_KEY="nap_..."
 *   export DIALOG_FLOW_ID="<uuid>"
 *
 *   npx tsx scripts/examples/dialog-flow-stateless-json.ts -m "Hi"
 *
 * When status is awaiting-input, the response may still include executionId (matching the last
 * node’s dialogFlowExecutionId), but POST .../run is stateless — nothing is written to the DB, so
 * there is no resume path for this execution. Send another POST .../run with messages that include
 * the missing information (facts / prompts in the default summary, or missingFactDefinitions in
 * --verbose JSON). Database-backed continuation is only for flows started via POST /dialog-flow-executions.
 *
 * Full API JSON (includes node technicalDetails):
 *   ... npx tsx scripts/examples/dialog-flow-stateless-json.ts -m "Hi" --verbose
 *
 * Optional: MODEL (default gpt-4o-mini). Required flag: --message / -m. Optional: --verbose, -v. --help for details.
 * Requires Node 18+ (global fetch).
 */

import {
  printPrettyJson,
  printStatelessSummaryForTerminal,
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
// Everything you need to call the API (copy into your own code)
// POST {baseUrl}/dialog-flow-executions/run
// Headers: Content-Type: application/json, Authorization: Bearer nap_...
// -----------------------------------------------------------------------------

type RunStatelessBody = {
  dialogFlowId: string;
  messages: Array<{ content: string; fileIds?: string[] }>;
  model?: string;
};

const DEFAULT_MODEL = "gpt-4o-mini";

const AVAILABLE_MODELS = [
  "gpt-5.4",
  "gpt-5.4-mini",
  "gpt-5.4-nano",
  "gpt-4o-mini",
  "claude-opus-4-6",
  "claude-sonnet-4-6",
  "claude-haiku-4-5",
  "bedrock-claude-opus-4-6",
  "bedrock-claude-sonnet-4-6",
  "bedrock-claude-haiku-4-5",
  "bedrock-mistral-large",
  "bedrock-minimax-m2.5",
  "bedrock-kimi-k2.5",
] as const;

function authHeader(apiKey: string): string {
  return apiKey.startsWith("nap_") ? `Bearer ${apiKey}` : `Bearer nap_${apiKey}`;
}

async function postStatelessDialogFlowRun(
  baseUrl: string,
  apiKey: string,
  body: RunStatelessBody,
): Promise<unknown> {
  const res = await fetch(`${baseUrl.replace(/\/$/, "")}/dialog-flow-executions/run`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: authHeader(apiKey),
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`HTTP ${res.status} ${res.statusText}\n${text}`);
  }

  return res.json() as Promise<unknown>;
}

// -----------------------------------------------------------------------------
// Tiny CLI so you can run this file without wiring your own main()
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
    "Usage: npx tsx scripts/examples/dialog-flow-stateless-json.ts --message|-m \"<text>\" [--verbose|-v]",
    "",
    "Required env:",
    '  BASE_URL="http://localhost:4000"',
    '  API_KEY="nap_..."',
    '  DIALOG_FLOW_ID="<uuid>"',
    "",
    "Optional env:",
    `  MODEL="${DEFAULT_MODEL}"`,
    "",
    "Model IDs:",
    ...AVAILABLE_MODELS.map((m) => `  - ${m}`),
    "",
    "Flags:",
    "  --message, -m   User message (required). Also accepts --message=... or -m=....",
    "  --verbose, -v   Print full JSON (API shape). Default: terminal summary (tables, no technicalDetails).",
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

  const data = await postStatelessDialogFlowRun(baseUrl, apiKey, body);

  if (verbose) {
    printPrettyJson(data);
  } else {
    printStatelessSummaryForTerminal(data);
  }
}

main().catch((err) => {
  console.error(err instanceof Error ? err.stack ?? err.message : err);
  nodeProcess().exit(1);
});

export {};
