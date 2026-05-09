/**
 * Pretty-print helpers for the stateless dialog-flow example scripts only.
 * Not part of the API integration — safe to omit when copying `fetch` code elsewhere.
 */

/** `JSON.stringify` with fixed indentation for terminal / logs. */
export function prettyJsonStringify(value: unknown): string {
  return JSON.stringify(value, null, 2);
}

export function printPrettyJson(value: unknown): void {
  console.log(prettyJsonStringify(value));
}

/**
 * SSE `data:` lines are usually JSON; when they are not, show the raw string.
 */
export function sseDataAsJsonOrRaw(raw: string): unknown {
  try {
    return JSON.parse(raw) as unknown;
  } catch {
    return raw;
  }
}

/** Pretty-print stream chunks without adding newlines between frames. */
function writeStdoutChunk(s: string): void {
  try {
    const w = (
      globalThis as unknown as { process?: { stdout?: { write: (chunk: string) => void } } }
    ).process?.stdout;
    if (w) w.write(s);
    else console.log(s);
  } catch {
    console.log(s);
  }
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" ? (value as Record<string, unknown>) : null;
}

// --- JSON example: default terminal summary (tables + node blocks) ------------

function safeJsonParse(value: string): unknown | null {
  try {
    return JSON.parse(value) as unknown;
  } catch {
    return null;
  }
}

function stripTechnicalDetailsForSummary(value: unknown): unknown {
  if (!value || typeof value !== "object") return value;
  const vAny = value as Record<string, unknown>;
  const nodeResults = vAny.nodeResults;
  if (!Array.isArray(nodeResults)) return value;
  return {
    ...vAny,
    nodeResults: nodeResults.map((nr: any) => {
      const technicalDetails = nr?.nodeExecutionResults?.technicalDetails;
      if (!technicalDetails) return nr;
      return {
        ...nr,
        nodeExecutionResults: {
          ...nr.nodeExecutionResults,
          technicalDetails: undefined,
        },
      };
    }),
  };
}

function shortenId(value: string, head = 8, tail = 6): string {
  if (!value) return value;
  if (value.length <= head + tail + 1) return value;
  return `${value.slice(0, head)}…${value.slice(-tail)}`;
}

function stringifyForDisplay(value: unknown): string {
  if (value === null || value === undefined) return "";
  if (typeof value === "object") {
    return JSON.stringify(value, null, 2);
  }
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) return "";
    const parsed = safeJsonParse(trimmed);
    if (parsed !== null) {
      return JSON.stringify(parsed, null, 2);
    }
    return value;
  }
  return String(value);
}

function printIndented(label: string, body: string, indent = "      ") {
  if (!body) return;
  console.log(`${label}`);
  for (const line of body.split("\n")) {
    console.log(`${indent}${line}`);
  }
}

function stdoutIsTTY(): boolean {
  try {
    const p = (globalThis as unknown as { process?: { stdout?: { isTTY?: boolean } } }).process;
    return Boolean(p?.stdout?.isTTY);
  } catch {
    return false;
  }
}

function stylize(text: string, kind: "bold" | "dim"): string {
  if (!stdoutIsTTY()) return text;
  if (kind === "bold") return `\x1b[1m${text}\x1b[0m`;
  return `\x1b[2m${text}\x1b[0m`;
}

function humanizeNodeType(type: string): string {
  if (!type || type === "unknown") return type;
  return type
    .replace(/[-_]+/g, " ")
    .split(" ")
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(" ");
}

const NODE_HEADER_RULE = `  ${"─".repeat(66)}`;

function printMissingFactsUnderNode(missingFactDefinitions: unknown[]): void {
  if (missingFactDefinitions.length === 0) return;
  console.log("");
  console.log(`  ${stylize("Missing facts (awaiting input)", "dim")}`);
  const rows = missingFactDefinitions.map((raw, j) => {
    const def = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
    return {
      i: j,
      label: typeof def.label === "string" ? def.label : "",
      dataType: def.dataType != null ? String(def.dataType) : "",
      required: def.required === true ? "yes" : def.required === false ? "no" : "",
    };
  });
  console.table(rows, ["i", "label", "dataType", "required"]);

  for (let j = 0; j < missingFactDefinitions.length; j++) {
    const raw = missingFactDefinitions[j];
    const def = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
    const factLabel = typeof def.label === "string" ? def.label : `fact ${j}`;
    if (typeof def.instructions === "string" && def.instructions.trim()) {
      printIndented(
        `      ${stylize(`${factLabel} — instructions`, "dim")}`,
        stringifyForDisplay(def.instructions),
        "        ",
      );
    }
    if (Array.isArray(def.customEnumValues) && def.customEnumValues.length > 0) {
      console.log(
        `        ${stylize("allowed values", "dim")}  ${(def.customEnumValues as unknown[]).map(String).join(", ")}`,
      );
    }
  }
}

function printNodeExecutionBlockHeader(opts: {
  index: number;
  total: number;
  type: string;
  label: string;
  status: string;
}) {
  const { index, total, type, label, status } = opts;
  const typeLine = humanizeNodeType(type);
  console.log("");
  console.log(NODE_HEADER_RULE);
  console.log(
    `  ${stylize(`Node ${index + 1} of ${total}`, "bold")}    ${stylize(typeLine, "bold")}    ${status}`,
  );
  if (label) {
    console.log(`  ${stylize("Label", "dim")}  ${label}`);
  }
  console.log(NODE_HEADER_RULE);
}

/** Strips `technicalDetails` and prints facts/nodes tables plus per-node output blocks. */
export function printStatelessSummaryForTerminal(value: unknown): void {
  const filtered = stripTechnicalDetailsForSummary(value) as any;

  const status = filtered?.status ?? "unknown";
  const executionId = filtered?.executionId ?? "(none)";
  const nodeResults = Array.isArray(filtered?.nodeResults) ? filtered.nodeResults : [];
  const totals =
    typeof filtered?.totalTokens === "number" ? `tokens=${filtered.totalTokens}` : "";

  console.log(`status=${status} exec=${executionId}${totals ? ` ${totals}` : ""}`);

  const facts = filtered?.facts && typeof filtered.facts === "object" ? filtered.facts : null;
  if (facts && Object.keys(facts).length > 0) {
    const factEntries = Object.entries<any>(facts);
    const factRows = factEntries.map(([id, v], i) => ({
      i,
      id: shortenId(id, 10, 8),
      label: v?.label ?? "",
      prediction:
        typeof v?.prediction === "string"
          ? v.prediction
          : v?.prediction != null
            ? JSON.stringify(v.prediction)
            : "",
      probability: v?.probability ?? "",
      dataType: v?.dataType ?? "",
    }));
    console.log("\nfacts:");
    console.table(factRows, ["i", "id", "label", "prediction", "probability", "dataType"]);
  }

  if (nodeResults.length > 0) {
    const nodeRows = nodeResults.map((nr: any, i: number) => ({
      i,
      type: nr?.nodeConfig?.type ?? "unknown",
      label: nr?.nodeConfig?.label ?? "",
      id: shortenId(nr?.nodeConfig?.id ?? "unknown", 10, 8),
      status: nr?.nodeExecutionResults?.status ?? "unknown",
    }));
    console.log("\nnodes:");
    console.table(nodeRows, ["i", "type", "label", "id", "status"]);

    const nodeTotal = nodeResults.length;
    for (let i = 0; i < nodeTotal; i++) {
      const nr = nodeResults[i];
      const id = nr?.nodeConfig?.id ?? "unknown";
      const type = nr?.nodeConfig?.type ?? "unknown";
      const label = nr?.nodeConfig?.label ?? "";
      const st = nr?.nodeExecutionResults?.status ?? "unknown";
      const output = nr?.nodeExecutionResults?.output;
      const error = nr?.nodeExecutionResults?.error;

      printNodeExecutionBlockHeader({
        index: i,
        total: nodeTotal,
        type,
        label,
        status: st,
      });
      console.log(`  ${stylize("ID", "dim")}   ${id}`);

      const dialogFlowExecutionId = nr?.nodeExecutionResults?.dialogFlowExecutionId;
      if (typeof dialogFlowExecutionId === "string" && dialogFlowExecutionId.length > 0) {
        console.log(`  ${stylize("dialogFlowExecutionId", "dim")}   ${dialogFlowExecutionId}`);
      }

      const missingDefs = nr?.nodeExecutionResults?.missingFactDefinitions;
      if (Array.isArray(missingDefs) && missingDefs.length > 0) {
        printMissingFactsUnderNode(missingDefs);
      }

      if (output !== null && output !== undefined && output !== "") {
        const formatted = stringifyForDisplay(output);
        if (formatted) printIndented("      output:", formatted);
      }
      if (typeof error === "string" && error.length > 0) {
        printIndented("      error:", stringifyForDisplay(error));
      }
    }
  }

  if (status === "awaiting-input") {
    console.log("");
    console.log(
      `  ${stylize(
        "Stateless run: execution cannot be resumed here. Rerun the dialog flow and supply the missing information in your next request.",
        "dim",
      )}`,
    );
  }
}

/** Base indent (2 spaces); nested step under each node headline (6 spaces from column 0). */
const SSE_G = "  ";
const SSE_INDENT = "      ";

/**
 * Stateful SSE pretty-printer: groups work by node, resolves progress lines to labels,
 * dedupes consecutive progress pings, and labels assistant streams before structured summary.
 */
export function createStatelessSsePrettySession(): {
  consume: (event: string, data: unknown) => void;
  finish: () => void;
} {
  let streamEndedWithoutNewline = false;
  /** Consecutive duplicate progress (same node + message) suppressed. */
  let lastProgressKey = "";
  const nodesById = new Map<string, { label: string; kind: string }>();

  let outcomeAssistantBannerPending = false;
  /** Indent / break so assistant chunks stay grouped after progress interrupts. */
  let assistantNextChunkLead = "";

  function flushAssistantStreamHardBreak() {
    if (streamEndedWithoutNewline) {
      console.log();
      streamEndedWithoutNewline = false;
      if (assistantNextChunkLead === "") assistantNextChunkLead = `\n${SSE_INDENT}`;
    }
  }

  function resetProgressDedupe() {
    lastProgressKey = "";
  }

  function headlessNode(nc: Record<string, unknown> | null): string {
    if (!nc) return "(node)";
    const lab = typeof nc.label === "string" ? nc.label : "";
    if (lab) return lab;
    const t = typeof nc.type === "string" ? nc.type : "";
    return humanizeNodeType(t || "node");
  }

  function consume(event: string, data: unknown): void {
    if (event === "heartbeat") return;

    if (event !== "message") flushAssistantStreamHardBreak();

    switch (event) {
      case "message": {
        const r = asRecord(data);
        if (!r || typeof r.text !== "string") {
          console.log(`${SSE_G}${stylize("message", "dim")}`);
          printPrettyJson(data);
          return;
        }
        if (outcomeAssistantBannerPending) {
          console.log("");
          console.log(
            `${SSE_INDENT}${stylize("Assistant reply", "bold")}  ${stylize("(streaming)", "dim")}`,
          );
          outcomeAssistantBannerPending = false;
          assistantNextChunkLead = `\n${SSE_INDENT}`;
        }
        if (assistantNextChunkLead) {
          writeStdoutChunk(assistantNextChunkLead);
          assistantNextChunkLead = "";
        }
        writeStdoutChunk(r.text);
        streamEndedWithoutNewline = true;
        return;
      }
      case "execution-started": {
        const r = asRecord(data);
        const execId =
          typeof r?.executionId === "string" ? shortenId(r.executionId, 12, 6) : "?";
        const dfId =
          typeof r?.dialogFlowId === "string" ? shortenId(r.dialogFlowId, 14, 6) : "?";
        console.log("");
        console.log(
          `${SSE_G}${stylize("▸ Run", "bold")}   ${stylize(`execution ${execId}`, "dim")}   ${stylize("·", "dim")}   ${stylize(`dialog flow ${dfId}`, "dim")}`,
        );
        return;
      }
      case "node-started": {
        resetProgressDedupe();
        const r = asRecord(data);
        const nc = asRecord(r?.nodeConfig);
        const labelRaw = typeof nc?.label === "string" ? nc.label.trim() : "";
        const kind = typeof nc?.type === "string" ? nc.type : "";
        const typeLabel = humanizeNodeType(kind || "unknown");
        const title = labelRaw || typeLabel;
        const typeFragment =
          labelRaw && labelRaw.toLowerCase() !== typeLabel.toLowerCase()
            ? `${stylize(" · ", "dim")}${stylize(typeLabel, "dim")}`
            : "";
        const id = typeof nc?.id === "string" ? nc.id : "";
        if (id) nodesById.set(id, { label: labelRaw || typeLabel, kind });

        if (kind === "outcome") outcomeAssistantBannerPending = true;

        console.log("");
        console.log(
          `${SSE_G}${stylize("▸ ", "bold")}${stylize(title, "bold")}${typeFragment}${stylize("  →  ", "dim")}${stylize("started", "dim")}`,
        );
        return;
      }
      case "node-result": {
        resetProgressDedupe();
        const r = asRecord(data);
        const ner = asRecord(r?.nodeExecutionResults);
        const nc = asRecord(r?.nodeConfig);
        const labelRaw = typeof nc?.label === "string" ? nc.label.trim() : "";
        const kind = typeof nc?.type === "string" ? nc.type : "";
        const typeLabel = humanizeNodeType(kind || "unknown");
        const head = labelRaw || typeLabel;
        const status = typeof ner?.status === "string" ? ner.status : "unknown";

        if (kind === "outcome") outcomeAssistantBannerPending = false;

        const okDone = status === "completed";
        const awaitingPause = status === "awaiting-input";
        const warn = status === "failed";
        const mark = warn
          ? stylize("✗", "bold")
          : awaitingPause
            ? stylize("⏸", "bold")
            : stylize(okDone ? "✓" : "●", okDone ? "bold" : "dim");

        console.log(
          `${SSE_INDENT}${mark}  ${stylize(head, "bold")}  ${stylize("·", "dim")}  ${stylize(status, warn ? "bold" : "dim")}`,
        );
        if (ner && typeof ner.error === "string" && ner.error.length > 0) {
          console.log(`${SSE_INDENT}   ${stylize("error", "dim")}  ${ner.error}`);
        }
        return;
      }
      case "awaiting-user-input": {
        resetProgressDedupe();
        const payload = asRecord(data);
        const ner = asRecord(payload?.nodeExecutionResults);
        const nc = asRecord(payload?.nodeConfig);
        const missing = ner?.missingFactDefinitions;
        let facts = "(provide facts in next /run)";
        if (Array.isArray(missing)) {
          const labels = missing.map((m) => {
            const mr = asRecord(m);
            return typeof mr?.label === "string" ? mr.label : null;
          });
          const parts = labels.filter((x): x is string => Boolean(x));
          if (parts.length) facts = parts.join(", ");
        }
        console.log("");
        console.log(
          `${SSE_INDENT}${stylize("⏸ Pause · needs input", "bold")}   ${stylize(headlessNode(nc), "dim")}`,
        );
        console.log(`${SSE_INDENT}   ${stylize(facts, "dim")}`);
        return;
      }
      case "node-paused": {
        resetProgressDedupe();
        const payload = asRecord(data);
        const nc = asRecord(payload?.nodeConfig);
        console.log(
          `${SSE_INDENT}${stylize("⏸", "bold")}  ${stylize(headlessNode(nc), "bold")}  ${stylize("· paused mid-node", "dim")}`,
        );
        return;
      }
      case "progress-update": {
        const r = asRecord(data);
        const nid = typeof r?.nodeId === "string" ? r.nodeId : "";
        const rawMsg =
          typeof r?.message === "string" ? r.message : stringifyForDisplay(data);
        const msg = rawMsg.replace(/\s+/g, " ").trim();
        if (!nid && !msg) return;
        const dedupeKey = `${nid}|${msg}`;
        if (dedupeKey === lastProgressKey && msg !== "") return;
        lastProgressKey = dedupeKey;

        const meta = nid ? nodesById.get(nid) : undefined;
        const hint = meta?.label ?? (nid.length > 0 ? shortenId(nid, 8, 6) : "node");
        const line = nid ? `${hint} · ${msg}` : msg;
        console.log(`${SSE_INDENT}${stylize(`│ ${line}`, "dim")}`);
        return;
      }
      case "execution-completed": {
        const r = asRecord(data);
        const fo = r?.finalOutput;
        let preview =
          typeof fo === "string" ? fo : fo != null ? stringifyForDisplay(fo) : "";
        preview = preview.replace(/\s+/g, " ").trim();
        if (preview.length > 140) preview = `${preview.slice(0, 140)}…`;

        console.log("");
        console.log(`${SSE_G}${stylize("◎ Result shown to caller", "bold")}`);
        if (preview.length > 0) console.log(`${SSE_INDENT}${preview}`);
        return;
      }
      case "result": {
        outcomeAssistantBannerPending = false;
        console.log("");
        console.log(`${SSE_G}${stylize("──────────────── structured summary ────────────────", "dim")}`);
        console.log("");
        console.log(`${SSE_G}${stylize("Structured result", "bold")}  ${stylize("(POST …/run shape)", "dim")}`);
        console.log("");
        printStatelessSummaryForTerminal(data);
        return;
      }
      case "done": {
        outcomeAssistantBannerPending = false;
        const r = asRecord(data);
        const msg = typeof r?.message === "string" ? r.message : "Stream finished.";
        console.log("");
        console.log(`${SSE_G}${stylize("Done", "dim")}   ${stylize(msg, "dim")}`);
        return;
      }
      case "error": {
        outcomeAssistantBannerPending = false;
        const r = asRecord(data);
        const errMsg =
          r && typeof r.error === "string" ? r.error : stringifyForDisplay(data);
        console.error(`${SSE_G}${stylize("Error", "bold")}  ${errMsg}`);
        return;
      }
      default: {
        console.log(`${SSE_G}${stylize(`· ${event}`, "dim")}`);
        printPrettyJson(data);
      }
    }
  }

  function finish(): void {
    if (streamEndedWithoutNewline) console.log();
  }

  return { consume, finish };
}
