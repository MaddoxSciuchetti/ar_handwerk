"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Progress } from "@base-ui-components/react/progress";
import { parsePioneerTasks } from "@/lib/tasks";
import type { Task } from "@/lib/tasks";

type StageStatus = "idle" | "active" | "done" | "error";

const ACCEPTED = "video/*";

export function UploadView({
  onAnalysisComplete,
}: {
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

  const pickFile = useCallback(
    (next: File | null) => {
      reset();
      setFile(next);
    },
    [reset],
  );

  const runPipeline = useCallback(async () => {
    if (!file) return;
    reset();

    setTranscribeStatus("active");
    let transcriptText = "";
    try {
      const form = new FormData();
      form.append("video", file);
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
  }, [file, onAnalysisComplete, reset]);

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
    error ||
    done ||
    (transcriptSource && transcribeStatus === "done") ||
    (transcribeStatus === "done" && transcriptionPrompt) ||
    (transcribeStatus === "done" && transcriptPreview);

  return (
    <div className="flex min-h-[calc(100vh-3rem)] flex-col">
      <div className="flex flex-1 flex-col items-center justify-center px-2 py-6">
        <div className="flex w-full max-w-md flex-col items-center gap-4">
          <button
            type="button"
            onDragOver={(e) => {
              e.preventDefault();
              setDragging(true);
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={onDrop}
            onClick={() => inputRef.current?.click()}
            className={`group upload-dropzone focus-ring flex w-full flex-col items-center gap-3 rounded-2xl border-2 border-dashed px-8 py-10 text-center transition-all duration-150 ${
              dragging
                ? "border-zinc-400 bg-zinc-50/90 shadow-[inset_0_0_0_1px_rgba(0,0,0,0.04)]"
                : "border-zinc-300 bg-white/40 hover:border-zinc-400 hover:bg-white/70 active:border-zinc-500 active:bg-zinc-50 active:shadow-[inset_0_0_0_1px_rgba(0,0,0,0.06)]"
            }`}
          >
            <input
              ref={inputRef}
              type="file"
              accept={ACCEPTED}
              className="hidden"
              onChange={(e) => pickFile(e.target.files?.[0] ?? null)}
            />
            <div
              className="flex h-14 w-14 items-center justify-center rounded-xl bg-zinc-100 text-zinc-500 transition-all duration-150 group-hover:bg-zinc-200/80 group-hover:text-zinc-600 group-active:scale-[1.04] group-active:bg-zinc-200 group-active:text-zinc-700 group-active:shadow-[inset_0_1px_2px_rgba(0,0,0,0.06)]"
            >
              <DocumentIcon />
            </div>
            {file ? (
              <>
                <p className="text-[13px] font-medium text-zinc-900">{file.name}</p>
                <p className="body-sm text-zinc-400">
                  {(file.size / 1024 / 1024).toFixed(1)} MB · click to replace
                </p>
              </>
            ) : (
              <>
                <p className="text-[13px] font-medium text-zinc-900">Upload video</p>
                <p className="body-sm text-zinc-400">Drop a file here or click to browse</p>
                <p className="text-[11px] text-zinc-300">MP4, MOV, or WebM</p>
              </>
            )}
          </button>

          {previewUrl ? (
            <div className="widget-card w-full overflow-hidden">
              <video
                src={previewUrl}
                controls
                playsInline
                className="aspect-video w-full bg-zinc-950 object-contain"
              />
            </div>
          ) : null}

          <button
            type="button"
            disabled={!file || running}
            onClick={runPipeline}
            className="btn-primary focus-ring w-full max-w-xs"
          >
            {running ? "Processing…" : "Analyze"}
          </button>
        </div>
      </div>

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
