"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Toggle } from "@/components/ui/Toggle";
import { Btn } from "@/components/ui/Btn";
import { Icon } from "@/components/ui/Icon";
import { useLanguage } from "@/context/LanguageContext";
import { useAuth } from "@/context/AuthContext";
import { MOCK_DOMAINS, MOCK_KEYWORDS, MOCK_SOURCES } from "@/data/mockData";
import { saveKeywords } from "@/services/keywordsService";
import { uploadLawFiles } from "@/services/lawsService";
import type { DomainConfig, WatchSource } from "@/types";

const TOTAL_STEPS = 4;

export default function OnboardingPage() {
  const { t } = useLanguage();
  const { login, register, token } = useAuth();
  const router = useRouter();

  const [step, setStep] = useState(1);

  // Step 1 — auth
  const [authMode, setAuthMode] = useState<"signin" | "signup">("signin");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [jobTitle, setJobTitle] = useState("");
  const [authError, setAuthError] = useState("");
  const [authLoading, setAuthLoading] = useState(false);

  // Steps 2-4 — setup (same as before, shifted +1)
  const [domains, setDomains] = useState<DomainConfig[]>(MOCK_DOMAINS);
  const [keywords, setKeywords] = useState<string[]>(MOCK_KEYWORDS.slice(0, 4));
  const [newKw, setNewKw] = useState("");
  const [sources, setSources] = useState<WatchSource[]>(MOCK_SOURCES);
  const [channels, setChannels] = useState<Set<number>>(new Set([0]));

  // Step 4 — law file uploads
  interface UploadFileEntry {
    file: File;
    status: "pending" | "uploading" | "success" | "error";
    error?: string;
  }
  const [uploadFiles, setUploadFiles] = useState<UploadFileEntry[]>([]);
  const [dragActive, setDragActive] = useState(false);
  const [uploadRunning, setUploadRunning] = useState(false);
  const [invalidFileCount, setInvalidFileCount] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dragDepthRef = useRef(0);
  const uploadFilesRef = useRef(uploadFiles);
  useEffect(() => { uploadFilesRef.current = uploadFiles; }, [uploadFiles]);

  const stepMeta = [
    { name: t("onboarding.steps.1.name"), sub: t("onboarding.steps.1.sub") },
    { name: t("onboarding.steps.2.name"), sub: t("onboarding.steps.2.sub") },
    { name: t("onboarding.steps.3.name"), sub: t("onboarding.steps.3.sub") },
    { name: t("onboarding.steps.4.name"), sub: t("onboarding.steps.4.sub") },
  ];

  async function handleAuth() {
    setAuthError("");
    setAuthLoading(true);
    try {
      if (authMode === "signup") {
        await register(email, password, jobTitle, firstName, lastName);
      } else {
        await login(email, password);
      }
      setStep(2);
    } catch (err: unknown) {
      setAuthError(err instanceof Error ? err.message : t("onboarding.auth.error"));
    } finally {
      setAuthLoading(false);
    }
  }

  function addKeyword() {
    const kw = newKw.trim();
    if (kw && !keywords.includes(kw)) setKeywords([...keywords, kw]);
    setNewKw("");
  }

  const channelLabels = [
    t("onboarding.channel.email"),
    t("onboarding.channel.mobile"),
    t("onboarding.channel.slack"),
    t("onboarding.channel.teams"),
  ];

  const toggleChannel = (idx: number) => {
    const next = new Set(channels);
    if (next.has(idx)) { next.delete(idx); } else { next.add(idx); }
    setChannels(next);
  };

  // ── Step 4 — file upload helpers ──────────────────────────────────────────

  const ACCEPTED_TYPES = [".html", ".htm"];

  /** Add files to the list, filtering out non-HTML. */
  const addFiles = useCallback((incoming: FileList | File[]) => {
    const entries: UploadFileEntry[] = [];
    let invalidCount = 0;
    for (const f of Array.from(incoming)) {
      const ext = f.name.split(".").pop()?.toLowerCase();
      if (ext === "html" || ext === "htm" || f.type === "text/html") {
        entries.push({ file: f, status: "pending" });
      } else {
        invalidCount += 1;
      }
    }
    setInvalidFileCount(invalidCount);
    if (entries.length) {
      setUploadFiles((prev) => {
        const existing = new Set(prev.map((e) => `${e.file.name}-${e.file.size}`));
        return [...prev, ...entries.filter((e) => !existing.has(`${e.file.name}-${e.file.size}`))];
      });
    }
  }, []);

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDragIn = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragDepthRef.current += 1;
    setDragActive(true);
  }, []);

  const handleDragOut = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragDepthRef.current = Math.max(0, dragDepthRef.current - 1);
    if (dragDepthRef.current === 0) setDragActive(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragDepthRef.current = 0;
    setDragActive(false);
    if (e.dataTransfer.files?.length) {
      addFiles(e.dataTransfer.files);
    }
  }, [addFiles]);

  const handleBrowse = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.length) {
      addFiles(e.target.files);
      // Reset so the same file can be re-selected
      e.target.value = "";
    }
  }, [addFiles]);

  const removeFile = useCallback((index: number) => {
    setUploadFiles((prev) => prev.filter((_, i) => i !== index));
  }, []);

  /** Upload all pending files sequentially. */
  const handleUploadAll = useCallback(async () => {
    if (!token || uploadRunning) return;
    const files = uploadFilesRef.current;
    const pending = files.filter((f) => f.status === "pending");
    if (!pending.length) return;

    setUploadRunning(true);

    // Mark all pending as uploading
    setUploadFiles((prev) =>
      prev.map((e) => (e.status === "pending" ? { ...e, status: "uploading" as const } : e)),
    );

    await uploadLawFiles(
      token,
      pending.map((e) => e.file),
      (filename, status, error) => {
        setUploadFiles((prev) => {
          // Match by name (find first uploading/pending entry)
          const idx = prev.findIndex(
            (e) =>
              e.file.name === filename &&
              (e.status === "uploading" || e.status === "pending"),
          );
          if (idx === -1) return prev;
          const next = [...prev];
          next[idx] = { ...next[idx], status: status as UploadFileEntry["status"], error };
          return next;
        });
      },
    );
    setUploadRunning(false);
  }, [token, uploadRunning]);

  return (
    <div className="min-h-screen bg-ink-50 flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-2xl bg-white rounded-2xl shadow-pop overflow-hidden animate-fade-in">

        {/* Header */}
        <div className="px-8 pt-8 pb-6 border-b border-ink-100">
          <div className="flex items-center justify-between mb-4">
            <div className="text-[11px] font-semibold tracking-[0.08em] uppercase text-ink-400">
              {t("onboarding.stepLabel", { current: step, total: TOTAL_STEPS })}
            </div>
            <button
              onClick={() => router.push("/dashboard")}
              className="text-[11.5px] text-ink-400 hover:text-ink-700"
            >
              {t("onboarding.skip")}
            </button>
          </div>

          {/* Step indicators */}
          <div className="flex items-center gap-1.5 mb-5 flex-wrap">
            {stepMeta.map((s, i) => {
              const n = i + 1;
              const done = n < step;
              const active = n === step;
              return (
                <div key={n} className="flex items-center gap-1.5">
                  <div className={`flex items-center gap-1.5 px-2 py-1 rounded-full text-[10.5px] font-medium transition-colors ${
                    active ? "bg-brand-700 text-white" : done ? "bg-brand-100 text-brand-700" : "bg-ink-100 text-ink-400"
                  }`}>
                    <span className="w-3.5 h-3.5 rounded-full bg-white/20 grid place-items-center text-[9px] font-bold shrink-0">
                      {done ? <Icon name="check" className="w-2.5 h-2.5" /> : n}
                    </span>
                    <span>{s.name}</span>
                  </div>
                  {i < TOTAL_STEPS - 1 && (
                    <div className={`h-px w-4 shrink-0 ${done ? "bg-brand-300" : "bg-ink-200"}`} />
                  )}
                </div>
              );
            })}
          </div>

          <h1 className="text-[20px] font-bold tracking-tight text-ink-900">
            {t(`onboarding.titles.${step}`)}
          </h1>
        </div>

        {/* Body */}
        <div className="px-8 py-6 min-h-[340px]">

          {/* ── Step 1: Auth ── */}
          {step === 1 && (
            <div className="flex flex-col gap-4 max-w-sm mx-auto">
              {/* Mode toggle */}
              <div className="flex gap-1 p-1 bg-ink-100 rounded-lg">
                {(["signin", "signup"] as const).map((mode) => (
                  <button
                    key={mode}
                    onClick={() => { setAuthMode(mode); setAuthError(""); }}
                    className={`flex-1 py-1.5 rounded-md text-[12px] font-semibold transition-colors ${
                      authMode === mode ? "bg-white text-ink-900 shadow-soft" : "text-ink-500"
                    }`}
                  >
                    {t(`onboarding.auth.${mode === "signin" ? "signIn" : "signUp"}`)}
                  </button>
                ))}
              </div>

              <div className="flex flex-col gap-3">
                {authMode === "signup" && (
                  <div className="flex gap-2">
                    <div className="flex-1">
                      <label className="block text-[11px] font-semibold text-ink-600 mb-1">
                        {t("onboarding.auth.firstName")}
                      </label>
                      <input
                        type="text"
                        value={firstName}
                        onChange={(e) => setFirstName(e.target.value)}
                        className="w-full px-3 py-2 rounded-md ring-1 ring-ink-200 text-[13px] focus:outline-none focus:ring-brand-400 bg-white"
                      />
                    </div>
                    <div className="flex-1">
                      <label className="block text-[11px] font-semibold text-ink-600 mb-1">
                        {t("onboarding.auth.lastName")}
                      </label>
                      <input
                        type="text"
                        value={lastName}
                        onChange={(e) => setLastName(e.target.value)}
                        className="w-full px-3 py-2 rounded-md ring-1 ring-ink-200 text-[13px] focus:outline-none focus:ring-brand-400 bg-white"
                      />
                    </div>
                  </div>
                )}

                <div>
                  <label className="block text-[11px] font-semibold text-ink-600 mb-1">
                    {t("onboarding.auth.email")}
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleAuth()}
                    className="w-full px-3 py-2 rounded-md ring-1 ring-ink-200 text-[13px] focus:outline-none focus:ring-brand-400 bg-white"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-ink-600 mb-1">
                    {t("onboarding.auth.password")}
                  </label>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleAuth()}
                    className="w-full px-3 py-2 rounded-md ring-1 ring-ink-200 text-[13px] focus:outline-none focus:ring-brand-400 bg-white"
                  />
                </div>

                {authMode === "signup" && (
                  <div>
                    <label className="block text-[11px] font-semibold text-ink-600 mb-1">
                      {t("onboarding.auth.jobTitle")}
                    </label>
                    <input
                      type="text"
                      value={jobTitle}
                      onChange={(e) => setJobTitle(e.target.value)}
                      placeholder={t("onboarding.auth.jobTitlePlaceholder")}
                      className="w-full px-3 py-2 rounded-md ring-1 ring-ink-200 text-[13px] focus:outline-none focus:ring-brand-400 bg-white placeholder:text-ink-400"
                    />
                  </div>
                )}
              </div>

              {authError && (
                <div className="text-[11.5px] text-red-600 bg-red-50 ring-1 ring-red-200 rounded-md px-3 py-2">
                  {authError}
                </div>
              )}
            </div>
          )}

          {/* ── Step 2: Domains & keywords ── */}
          {step === 2 && (
            <div className="flex flex-col gap-6">
              <div className="grid grid-cols-2 gap-2">
                {domains.map((d) => (
                  <div
                    key={d.id}
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-md ring-1 cursor-pointer transition-colors ${
                      d.on ? "bg-brand-50/40 ring-brand-200" : "bg-ink-50 ring-ink-100"
                    }`}
                    onClick={() => setDomains(domains.map((x) => (x.id === d.id ? { ...x, on: !x.on } : x)))}
                  >
                    <span className={`w-2 h-2 rounded-full shrink-0 ${d.dotCls}`} />
                    <div className="flex-1 min-w-0">
                      <div className="text-[12px] font-medium text-ink-900">{d.name}</div>
                      <div className="text-[10.5px] text-ink-500">{d.sub}</div>
                    </div>
                    <Toggle on={d.on} onChange={(v) => setDomains(domains.map((x) => (x.id === d.id ? { ...x, on: v } : x)))} />
                  </div>
                ))}
              </div>

              <div>
                <div className="text-[11px] font-semibold text-ink-600 mb-2">{t("onboarding.keywordsLabel")}</div>
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {keywords.map((kw) => (
                    <span key={kw} className="inline-flex items-center gap-1 px-2.5 py-1 bg-ink-100 rounded-full text-[11px] text-ink-700">
                      {kw}
                      <button onClick={() => setKeywords(keywords.filter((k) => k !== kw))} className="text-ink-400 hover:text-ink-700 leading-none">×</button>
                    </span>
                  ))}
                </div>
                <div className="flex gap-2">
                  <input
                    value={newKw}
                    onChange={(e) => setNewKw(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && addKeyword()}
                    placeholder={t("onboarding.keywordsAdd")}
                    className="flex-1 px-3 py-1.5 rounded-md ring-1 ring-ink-200 text-[12px] focus:outline-none focus:ring-brand-400 bg-white"
                  />
                  <Btn onClick={addKeyword}>{t("onboarding.keywordsAdd")}</Btn>
                </div>
              </div>
            </div>
          )}

          {/* ── Step 3: Sources ── */}
          {step === 3 && (
            <div className="flex flex-col gap-2">
              {sources.map((s, i) => (
                <div key={s.name} className="flex items-center gap-3 px-3 py-2.5 bg-ink-50 rounded-md ring-1 ring-ink-100">
                  <div className="w-7 h-7 rounded-md bg-white ring-1 ring-ink-200 grid place-items-center text-ink-500">
                    <Icon name={s.icon as "building" | "shield" | "rss"} className="w-3.5 h-3.5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-[12px] font-medium text-ink-900">{s.name}</div>
                    <div className="text-[10.5px] text-ink-400 font-mono truncate">{s.url}</div>
                  </div>
                  <Toggle on={s.on} onChange={(v) => setSources(sources.map((x, j) => j === i ? { ...x, on: v } : x))} />
                </div>
              ))}
            </div>
          )}

          {/* ── Step 4: Law upload & alerts ── */}
          {step === 4 && (
            <div className="flex flex-col gap-6">
              {!token ? (
                /* No token — prompt to sign in first */
                <div className="rounded-xl bg-amber-50 ring-1 ring-amber-200 px-4 py-3 text-[12px] text-amber-800">
                  {t("onboarding.upload.noToken")}
                </div>
              ) : (
                <>
                  {/* Dropzone */}
                  <div
                    onDragEnter={handleDragIn}
                    onDragLeave={handleDragOut}
                    onDragOver={handleDrag}
                    onDrop={handleDrop}
                    className={[
                      "border-2 border-dashed rounded-xl px-6 py-8 flex flex-col items-center gap-3 text-center transition-colors",
                      dragActive
                        ? "border-brand-400 bg-brand-50/40"
                        : "border-ink-200 hover:border-ink-300 hover:bg-ink-50/40",
                    ].join(" ")}
                  >
                    <div className="w-10 h-10 rounded-full bg-ink-100 grid place-items-center text-ink-500">
                      <Icon name="upload" className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="text-[13px] font-semibold text-ink-900">
                        {dragActive ? t("onboarding.upload.dropzoneActive") : t("onboarding.upload.dropzone")}
                      </div>
                      <div className="text-[11px] text-ink-500 mt-0.5">{t("onboarding.upload.subtitle")}</div>
                    </div>
                    <Btn type="button" onClick={handleBrowse}>{t("onboarding.upload.browse")}</Btn>
                    <div className="text-[10px] text-ink-400">{t("onboarding.upload.htmlOnly")}</div>
                  </div>

                  {/* Hidden file input */}
                  <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    accept={ACCEPTED_TYPES.join(",")}
                    onChange={handleFileChange}
                    className="hidden"
                  />

                  {invalidFileCount > 0 && (
                    <div className="text-[11px] text-amber-700 bg-amber-50 ring-1 ring-amber-200 rounded-md px-3 py-2" role="status">
                      {t("onboarding.upload.invalid", { count: invalidFileCount })}
                    </div>
                  )}

                  {/* File list */}
                  {uploadFiles.length > 0 && (
                    <div aria-live="polite">
                      <div className="text-[11px] font-semibold text-ink-600 mb-2 flex items-center justify-between">
                        <span>{t("onboarding.upload.selected", { count: uploadFiles.length })}</span>
                        {uploadFiles.some((f) => f.status === "pending") && (
                          <Btn
                            size="sm"
                            variant="primary"
                            onClick={handleUploadAll}
                            disabled={uploadRunning}
                          >
                            {uploadRunning ? "…" : t("onboarding.upload.uploadAll")}
                          </Btn>
                        )}
                      </div>
                      <div className="flex flex-col gap-1.5 max-h-48 overflow-y-auto">
                        {uploadFiles.map((entry, i) => (
                          <div
                            key={`${entry.file.name}-${entry.file.size}`}
                            className="flex items-center gap-2 px-3 py-2 rounded-md bg-ink-50 ring-1 ring-ink-100"
                          >
                            <Icon name="fileText" className="w-3.5 h-3.5 shrink-0 text-ink-400" />
                            <span className="flex-1 min-w-0 text-[12px] text-ink-800 truncate">
                              {entry.file.name}
                            </span>
                            <span className="shrink-0 text-[10.5px] font-medium">
                              {entry.status === "pending" && (
                                <span className="text-ink-400">{t("onboarding.upload.status.pending")}</span>
                              )}
                              {entry.status === "uploading" && (
                                <span className="text-brand-600 animate-pulse">{t("onboarding.upload.status.uploading")}</span>
                              )}
                              {entry.status === "success" && (
                                <span className="text-green-600">{t("onboarding.upload.status.success")}</span>
                              )}
                              {entry.status === "error" && (
                                <span className="text-red-600" title={entry.error}>
                                  {t("onboarding.upload.status.error")}
                                </span>
                              )}
                            </span>
                            {entry.status === "pending" && (
                              <button
                                onClick={() => removeFile(i)}
                                className="text-ink-400 hover:text-red-600 transition-colors"
                                aria-label="Remove file"
                              >
                                <Icon name="close" className="w-3 h-3" />
                              </button>
                            )}
                          </div>
                        ))}
                      </div>
                      {uploadFiles.some((f) => f.status === "error") && (
                        <div className="mt-2 text-[11px] text-red-600 bg-red-50 ring-1 ring-red-200 rounded-md px-3 py-2">
                          {t("onboarding.upload.errorGeneric")}
                        </div>
                      )}
                    </div>
                  )}
                </>
              )}

              {/* Alert channels */}
              <div>
                <div className="text-[11px] font-semibold text-ink-600 mb-2">{t("onboarding.alertsBy")}</div>
                <div className="flex flex-wrap gap-2">
                  {channelLabels.map((label, i) => (
                    <button
                      key={label}
                      onClick={() => toggleChannel(i)}
                      className={`px-3 py-1.5 rounded-full text-[12px] font-medium ring-1 transition-colors ${
                        channels.has(i) ? "bg-brand-700 text-white ring-brand-700" : "bg-white text-ink-600 ring-ink-200 hover:ring-ink-400"
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-8 py-5 border-t border-ink-100 bg-ink-50/40 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {(["canlii", "journals", "gov"] as const).map((key) => (
              <span key={key} className="flex items-center gap-1 text-[10.5px] text-ink-500">
                <Icon name="shield" className="w-3 h-3 text-brand-500" />
                {t(`onboarding.trust.${key}`)}
              </span>
            ))}
          </div>

          <div className="flex items-center gap-2">
            {step > 1 && (
              <Btn onClick={() => setStep(step - 1)}>{t("onboarding.prev")}</Btn>
            )}
            {step === 1 ? (
              <Btn variant="primary" onClick={handleAuth} disabled={authLoading || !email || !password}>
                {authLoading ? "…" : t(`onboarding.auth.${authMode === "signin" ? "signInBtn" : "signUpBtn"}`)}
                <Icon name="arrowRight" className="w-3.5 h-3.5" />
              </Btn>
            ) : step < TOTAL_STEPS ? (
              <Btn variant="primary" onClick={() => setStep(step + 1)}>
                {t("onboarding.next")}
                <Icon name="arrowRight" className="w-3.5 h-3.5" />
              </Btn>
            ) : (
              <Btn variant="primary" onClick={async () => {
                // Persist keywords best-effort before leaving onboarding.
                if (token) await saveKeywords(token, keywords);
                router.push("/dashboard");
              }}>
                {t("onboarding.finish")}
                <Icon name="check" className="w-3.5 h-3.5" />
              </Btn>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
