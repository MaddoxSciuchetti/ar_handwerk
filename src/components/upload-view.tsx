"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Progress } from "@base-ui-components/react/progress";
import { parsePioneerTasks } from "@/lib/tasks";
import type { Task } from "@/lib/tasks";

type StageStatus = "idle" | "active" | "done" | "error";

const ACCEPTED = "video/*";

export function UploadView({
  userName,
  onAnalysisComplete,
}: {
  userName: string;
  onAnalysisComplete: (tasks: Task[]) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [dragging, setDragging] = useState(false);
  const [transcribeStatus, setTranscribeStatus] = useState<StageStatus>("idle");
  const [pioneerStatus, setPioneerStatus] = useState<StageStatus>("idle");
  const [planStatus, setPlanStatus] = useState<StageStatus>("idle");
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);
  const [tasksCreated, setTasksCreated] = useState(0);
  const [transcriptSource, setTranscriptSource] = useState("");
  const [transcriptionPrompt, setTranscriptionPrompt] = useState("");
  const [transcriptPreview, setTranscriptPreview] = useState("");
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [videoFullscreenOpen, setVideoFullscreenOpen] = useState(false);

  const running =
    transcribeStatus === "active" ||
    pioneerStatus === "active" ||
    planStatus === "active";

  useEffect(() => {
    if (!file) {
      setPreviewUrl(null);
      return;
    }
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  useEffect(() => {
    if (!videoFullscreenOpen) return;

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setVideoFullscreenOpen(false);
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [videoFullscreenOpen]);

  const reset = useCallback(() => {
    setTranscribeStatus("idle");
    setPioneerStatus("idle");
    setPlanStatus("idle");
    setError("");
    setDone(false);
    setTasksCreated(0);
    setTranscriptSource("");
    setTranscriptionPrompt("");
    setTranscriptPreview("");
  }, []);

  const runPipeline = useCallback(async (videoFile: File) => {
    reset();

    setTranscribeStatus("active");
    let transcriptText = "";
    try {
      const form = new FormData();
      form.append("video", videoFile);
      const res = await fetch("/api/transcribe", { method: "POST", body: form });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Transcription failed");
      transcriptText = json.transcript ?? "";
      setTranscriptSource(json.source ?? "");
      setTranscriptionPrompt(json.transcriptionPrompt ?? "");
      setTranscriptPreview(transcriptText);
      if (json.source === "stub") {
        setTranscribeStatus("error");
        setError(
          "Your video was not transcribed — no transcription API is configured. Add GEMINI_API_KEY to .env.local and restart the dev server.",
        );
        return;
      }
      setTranscribeStatus("done");
    } catch (err) {
      setTranscribeStatus("error");
      setError(err instanceof Error ? err.message : "Transcription failed");
      return;
    }

    setPioneerStatus("active");
    try {
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ transcript: transcriptText }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Analysis failed");

      const tasks = parsePioneerTasks(json.data);
      setPioneerStatus("done");

      setPlanStatus("active");
      try {
        const planRes = await fetch("/api/tasks/plan", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ tasks, transcript: transcriptText }),
        });
        const planJson = await planRes.json();
        if (!planRes.ok) throw new Error(planJson.error ?? "Action planning failed");

        const plannedTasks = (planJson.tasks ?? tasks) as Task[];
        setTasksCreated(plannedTasks.length);
        setPlanStatus("done");
        setDone(true);
        onAnalysisComplete(plannedTasks);
      } catch (planErr) {
        setPlanStatus("error");
        setTasksCreated(tasks.length);
        setDone(true);
        onAnalysisComplete(tasks);
        setError(
          planErr instanceof Error
            ? `${planErr.message} — tasks created without planned actions.`
            : "Action planning failed — tasks created without planned actions.",
        );
      }
    } catch (err) {
      setPioneerStatus("error");
      setError(err instanceof Error ? err.message : "Analysis failed");
    }
  }, [onAnalysisComplete, reset]);

  const pickFile = useCallback(
    (next: File | null) => {
      if (running) return;
      if (!next) {
        reset();
        setFile(null);
        setVideoFullscreenOpen(false);
        return;
      }
      setFile(next);
      void runPipeline(next);
    },
    [reset, running, runPipeline],
  );

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragging(false);
      const dropped = e.dataTransfer.files?.[0];
      if (dropped?.type.startsWith("video/")) pickFile(dropped);
    },
    [pickFile],
  );

  const showProgressFooter =
    transcribeStatus !== "idle" ||
    pioneerStatus !== "idle" ||
    planStatus !== "idle" ||
    Boolean(error) ||
    done ||
    Boolean(transcriptSource) ||
    Boolean(transcriptionPrompt) ||
    Boolean(transcriptPreview);

  return (
    <div className="flex min-h-[calc(100vh-3rem)] flex-col">
      <h1 className="page-title shrink-0">Hallo {userName}</h1>

      <div className="flex flex-1 flex-col items-center justify-center px-2 py-6">
        <div className="flex w-full max-w-md flex-col items-center">
          <div
            onDragOver={(e) => {
              e.preventDefault();
              if (!running) setDragging(true);
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={onDrop}
            className={`upload-dropzone w-full rounded-2xl border-2 border-dashed transition-all duration-150 ${
              dragging
                ? "border-zinc-400 bg-zinc-50/90 shadow-[inset_0_0_0_1px_rgba(0,0,0,0.04)]"
                : "border-zinc-300 bg-white/40 hover:border-zinc-400 hover:bg-white/70"
            } ${file ? "px-4 py-4" : "px-8 py-10 text-center"}`}
          >
            <input
              ref={inputRef}
              type="file"
              accept={ACCEPTED}
              className="hidden"
              onChange={(e) => pickFile(e.target.files?.[0] ?? null)}
            />
            {!file ? (
              <button
                type="button"
                disabled={running}
                onClick={() => {
                  if (!running) inputRef.current?.click();
                }}
                className="focus-ring group flex w-full flex-col items-center gap-3 disabled:cursor-not-allowed disabled:opacity-70"
              >
                <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-zinc-100 text-zinc-500 transition-all duration-150 group-hover:bg-zinc-200/80 group-hover:text-zinc-600 group-active:scale-[1.04] group-active:bg-zinc-200 group-active:text-zinc-700 group-active:shadow-[inset_0_1px_2px_rgba(0,0,0,0.06)]">
                  <DocumentIcon />
                </div>
                <div>
                  <p className="text-[13px] font-medium text-zinc-900">Upload video</p>
                  <p className="body-sm text-zinc-400">Drop a file here or click to browse</p>
                  <p className="text-[11px] text-zinc-300">MP4, MOV, or WebM</p>
                </div>
              </button>
            ) : (
              <div className="flex w-full flex-col gap-3">
                <p className="text-[11px] font-medium uppercase tracking-wide text-zinc-400">
                  Uploaded video
                </p>
                <ul className="flex w-full flex-col gap-1.5">
                  <li>
                    <button
                      type="button"
                      onClick={() => setVideoFullscreenOpen(true)}
                      className="focus-ring group flex w-full items-center gap-3 rounded-xl border border-zinc-200/80 bg-white/90 px-2.5 py-2 text-left shadow-sm transition-colors hover:border-zinc-300 hover:bg-white"
                    >
                      <div className="relative h-11 w-11 shrink-0 overflow-hidden rounded-lg bg-zinc-950">
                        {previewUrl ? (
                          <video
                            src={previewUrl}
                            muted
                            playsInline
                            preload="metadata"
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center text-zinc-500">
                            <VideoIcon />
                          </div>
                        )}
                        <span className="absolute inset-0 flex items-center justify-center bg-black/25 opacity-0 transition-opacity group-hover:opacity-100">
                          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-white/90 text-zinc-900">
                            <ExpandIcon />
                          </span>
                        </span>
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[13px] font-medium text-zinc-900">{file.name}</p>
                        <p className="body-sm text-zinc-400">
                          {(file.size / 1024 / 1024).toFixed(1)} MB
                          {running ? " · analyzing…" : " · tap to play"}
                        </p>
                      </div>
                      <ExpandIcon className="shrink-0 text-zinc-400 group-hover:text-zinc-600" />
                    </button>
                  </li>
                </ul>
                {!running ? (
                  <button
                    type="button"
                    onClick={() => inputRef.current?.click()}
                    className="focus-ring self-center text-[11px] font-medium text-zinc-400 transition-colors hover:text-zinc-600"
                  >
                    Replace video
                  </button>
                ) : null}
              </div>
            )}
          </div>
        </div>
      </div>

      {videoFullscreenOpen && previewUrl && file ? (
        <VideoFullscreenOverlay
          url={previewUrl}
          fileName={file.name}
          onClose={() => setVideoFullscreenOpen(false)}
        />
      ) : null}

      {showProgressFooter ? (
        <div className="mx-auto w-full max-w-md shrink-0 flex flex-col gap-3 pb-2">
          {(transcribeStatus !== "idle" || pioneerStatus !== "idle" || planStatus !== "idle") && (
            <ul className="flex flex-col gap-1.5">
              <StatusRow label="Transcribing" status={transcribeStatus} />
              <StatusRow label="Extracting tasks" status={pioneerStatus} />
              <StatusRow label="Planning actions" status={planStatus} />
            </ul>
          )}

          {transcriptSource && transcribeStatus === "done" ? (
            <p className="text-center body-sm text-zinc-400">
              Transcribed via {transcriptSource}
              {transcriptSource === "stub" ? " (add GEMINI_API_KEY to .env.local)" : ""}
            </p>
          ) : null}

          {transcribeStatus === "done" && transcriptionPrompt ? (
            <details className="widget-card">
              <summary className="cursor-pointer text-[11px] font-medium text-zinc-600">
                Gemini transcription prompt (debug)
              </summary>
              <pre className="mt-2 max-h-48 overflow-auto whitespace-pre-wrap rounded-md bg-zinc-950 p-2.5 text-[10px] leading-relaxed text-emerald-300">
                {transcriptionPrompt}
              </pre>
            </details>
          ) : null}

          {transcribeStatus === "done" && transcriptPreview ? (
            <details className="widget-card">
              <summary className="cursor-pointer text-[11px] font-medium text-zinc-600">
                Transcript output (debug)
              </summary>
              <pre className="mt-2 max-h-48 overflow-auto whitespace-pre-wrap rounded-md bg-zinc-950 p-2.5 text-[10px] leading-relaxed text-zinc-300">
                {transcriptPreview}
              </pre>
            </details>
          ) : null}

          {error ? <p className="callout callout-error">{error}</p> : null}

          {done && tasksCreated > 0 ? (
            <p className="text-center body-sm font-medium text-emerald-600">
              Created {tasksCreated} {tasksCreated === 1 ? "task" : "tasks"} — open Tasks tab
            </p>
          ) : done && tasksCreated === 0 ? (
            <p className="text-center body-sm font-medium text-emerald-600">
              All clear — nothing to do today
            </p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

function DocumentIcon() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8l-6-6z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <path
        d="M14 2v6h6"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <path
        d="M9 13h6M9 17h4"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

function VideoIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 7h8a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2V9a2 2 0 012-2z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function ExpandIcon({ className = "" }: { className?: string }) {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden
      className={className}
    >
      <path
        d="M8 3H5a2 2 0 00-2 2v3M16 3h3a2 2 0 012 2v3M8 21H5a2 2 0 01-2-2v-3M16 21h3a2 2 0 002-2v-3"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M18 6L6 18M6 6l12 12"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
      />
    </svg>
  );
}

function VideoFullscreenOverlay({
  url,
  fileName,
  onClose,
}: {
  url: string;
  fileName: string;
  onClose: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex flex-col bg-black/95"
      role="dialog"
      aria-modal="true"
      aria-label={`Video preview: ${fileName}`}
    >
      <div className="flex items-center justify-between gap-3 px-4 py-3">
        <p className="min-w-0 truncate text-[13px] font-medium text-white/90">{fileName}</p>
        <button
          type="button"
          onClick={onClose}
          className="focus-ring flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-white/80 transition-colors hover:bg-white/10 hover:text-white"
          aria-label="Close video"
        >
          <CloseIcon />
        </button>
      </div>
      <div className="flex min-h-0 flex-1 items-center justify-center px-4 pb-4">
        <video
          src={url}
          controls
          autoPlay
          playsInline
          className="max-h-full max-w-full rounded-lg bg-black object-contain"
        />
      </div>
    </div>
  );
}

function StatusRow({ label, status }: { label: string; status: StageStatus }) {
  return (
    <li className="flex items-center justify-between rounded-md bg-white/70 px-2.5 py-1.5 body-sm">
      <span className="text-zinc-600">{label}</span>
      {status === "active" ? (
        <Progress.Root value={null} className="w-14">
          <Progress.Track className="block h-1 overflow-hidden rounded-full bg-zinc-200">
            <Progress.Indicator className="block h-full w-full animate-pulse rounded-full bg-zinc-900" />
          </Progress.Track>
        </Progress.Root>
      ) : status === "done" ? (
        <span className="font-medium text-emerald-600">Done</span>
      ) : status === "error" ? (
        <span className="text-red-500">Failed</span>
      ) : (
        <span className="text-zinc-300">—</span>
      )}
    </li>
  );
}
