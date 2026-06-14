"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Check, Glasses, Loader2, Play, Trash2, X } from "lucide-react";
import { SUPPORTED_DEVICES } from "@/lib/devices/catalog";
import type { DeviceRecord, DeviceSetupInput, DeviceType, SyncPreference } from "@/lib/devices/types";
import type { Task } from "@/lib/tasks";

type DeviceVideo = {
  id: string;
  title: string;
  recordedAt: string;
  durationSec: number | null;
  playbackUrl: string;
  thumbnailUrl: string | null;
};

type ViewState = "loading" | "select" | "setup" | "gallery";

type AnalyzeStatus = "idle" | "running" | "done" | "error";
type AnalyzeStage = "transcribe" | "pioneer" | "plan";

const DEFAULT_DEVICE_TYPE: DeviceType = "meta-ray-ban";

const ANALYSIS_STAGES: { id: AnalyzeStage; label: string }[] = [
  { id: "transcribe", label: "Transcribing with Gemini" },
  { id: "pioneer", label: "Extracting tasks with Pioneer" },
  { id: "plan", label: "Planning follow-up actions" },
];

function formatDate(value: string): string {
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function formatDuration(seconds: number | null): string {
  if (!seconds) return "—";
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

export function DeviceView({
  onAnalysisComplete,
}: {
  onAnalysisComplete: (tasks: Task[], sourceTranscript?: string) => void;
}) {
  const supportedDevice = SUPPORTED_DEVICES[0];
  const [viewState, setViewState] = useState<ViewState>("loading");
  const [device, setDevice] = useState<DeviceRecord | null>(null);
  const [videos, setVideos] = useState<DeviceVideo[]>([]);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [loadingVideos, setLoadingVideos] = useState(false);
  const [activeVideo, setActiveVideo] = useState<DeviceVideo | null>(null);
  const [selectedVideoIds, setSelectedVideoIds] = useState<Set<string>>(new Set());
  const [analyzeStatus, setAnalyzeStatus] = useState<AnalyzeStatus>("idle");
  const [analyzeProgress, setAnalyzeProgress] = useState("");
  const [analyzeStage, setAnalyzeStage] = useState<AnalyzeStage>("transcribe");
  const [demoVideoMode, setDemoVideoMode] = useState(false);
  const analyzeStageTimersRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  const [tasksCreated, setTasksCreated] = useState(0);
  const [deletingVideoIds, setDeletingVideoIds] = useState<Set<string>>(new Set());

  const [deviceName, setDeviceName] = useState("");
  const [serialNumber, setSerialNumber] = useState("");
  const [firmwareVersion, setFirmwareVersion] = useState(supportedDevice.defaultFirmware);
  const [syncPreference, setSyncPreference] = useState<SyncPreference>("auto");

  const loadVideos = useCallback(async () => {
    setLoadingVideos(true);
    setError("");
    try {
      const response = await fetch("/api/devices/videos");
      const data = (await response.json()) as {
        videos?: DeviceVideo[];
        error?: string;
      };
      if (!response.ok) {
        throw new Error(data.error ?? "Failed to load videos");
      }
      setVideos(data.videos ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load videos");
      setVideos([]);
    } finally {
      setLoadingVideos(false);
    }
  }, []);

  const loadDevice = useCallback(async () => {
    setViewState("loading");
    setError("");
    try {
      const response = await fetch("/api/devices");
      const data = (await response.json()) as {
        device?: DeviceRecord | null;
        error?: string;
      };
      if (!response.ok) {
        throw new Error(data.error ?? "Failed to load device");
      }

      if (data.device) {
        setDevice(data.device);
        setDeviceName(data.device.deviceName);
        setSerialNumber(data.device.serialNumber);
        setFirmwareVersion(data.device.firmwareVersion);
        setSyncPreference(data.device.syncPreference);
        setViewState("gallery");
        await loadVideos();
      } else {
        setDevice(null);
        setViewState("select");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load device");
      setViewState("select");
    }
  }, [loadVideos]);

  useEffect(() => {
    void loadDevice();
  }, [loadDevice]);

  useEffect(() => {
    async function loadDemoConfig() {
      try {
        const response = await fetch("/api/demo/config");
        if (!response.ok) return;
        const data = (await response.json()) as { demoVideoMode?: boolean };
        setDemoVideoMode(Boolean(data.demoVideoMode));
      } catch {
        // Demo mode stays off if config cannot be loaded.
      }
    }

    void loadDemoConfig();
  }, []);

  const clearAnalyzeStageTimer = useCallback(() => {
    for (const timer of analyzeStageTimersRef.current) {
      clearTimeout(timer);
    }
    analyzeStageTimersRef.current = [];
  }, []);

  const startAnalyzeStageProgress = useCallback(
    (videoTitle: string, videoIndex: number, totalVideos: number) => {
      clearAnalyzeStageTimer();
      setAnalyzeStage("transcribe");
      setAnalyzeProgress(
        demoVideoMode
          ? `Video ${videoIndex + 1} of ${totalVideos}: ${videoTitle}`
          : `Analyzing ${videoIndex + 1} of ${totalVideos}: ${videoTitle}`,
      );

      if (!demoVideoMode) return;

      analyzeStageTimersRef.current = [
        setTimeout(() => setAnalyzeStage("pioneer"), 12_000),
        setTimeout(() => setAnalyzeStage("plan"), 16_000),
      ];
    },
    [clearAnalyzeStageTimer, demoVideoMode],
  );

  useEffect(() => () => clearAnalyzeStageTimer(), [clearAnalyzeStageTimer]);

  useEffect(() => {
    if (!activeVideo) return;

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setActiveVideo(null);
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [activeVideo]);

  const startSetup = useCallback(() => {
    setDeviceName("");
    setSerialNumber("");
    setFirmwareVersion(supportedDevice.defaultFirmware);
    setSyncPreference("auto");
    setError("");
    setViewState("setup");
  }, [supportedDevice.defaultFirmware]);

  const saveDevice = useCallback(async () => {
    if (!deviceName.trim() || !serialNumber.trim() || !firmwareVersion.trim()) {
      setError("Please fill in all required fields.");
      return;
    }

    setSaving(true);
    setError("");
    try {
      const payload: DeviceSetupInput = {
        deviceType: DEFAULT_DEVICE_TYPE,
        deviceName: deviceName.trim(),
        serialNumber: serialNumber.trim(),
        firmwareVersion: firmwareVersion.trim(),
        syncPreference,
      };

      const response = await fetch("/api/devices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = (await response.json()) as {
        device?: DeviceRecord;
        error?: string;
      };

      if (!response.ok || !data.device) {
        throw new Error(data.error ?? "Failed to connect device");
      }

      setDevice(data.device);
      setViewState("gallery");
      await loadVideos();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to connect device");
    } finally {
      setSaving(false);
    }
  }, [deviceName, firmwareVersion, loadVideos, serialNumber, syncPreference]);

  const disconnectDevice = useCallback(async () => {
    setSaving(true);
    setError("");
    try {
      const response = await fetch("/api/devices", { method: "DELETE" });
      if (!response.ok) {
        const data = (await response.json()) as { error?: string };
        throw new Error(data.error ?? "Failed to disconnect device");
      }
      setDevice(null);
      setVideos([]);
      setActiveVideo(null);
      setSelectedVideoIds(new Set());
      setViewState("select");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to disconnect device");
    } finally {
      setSaving(false);
    }
  }, []);

  const isDeleting = deletingVideoIds.size > 0;
  const selectedVideos = useMemo(
    () => videos.filter((video) => selectedVideoIds.has(video.id)),
    [videos, selectedVideoIds]
  );

  const toggleVideoSelection = useCallback((videoId: string) => {
    setSelectedVideoIds((current) => {
      const next = new Set(current);
      if (next.has(videoId)) {
        next.delete(videoId);
      } else {
        next.add(videoId);
      }
      return next;
    });
  }, []);

  const deleteVideos = useCallback(
    async (videoIds: string[]) => {
      if (videoIds.length === 0 || deletingVideoIds.size > 0) return;

      const label =
        videoIds.length === 1
          ? "Delete this video? This cannot be undone."
          : `Delete ${videoIds.length} videos? This cannot be undone.`;
      if (!window.confirm(label)) return;

      setDeletingVideoIds(new Set(videoIds));
      setError("");

      const deletedIds: string[] = [];

      try {
        for (const videoId of videoIds) {
          const response = await fetch("/api/devices/videos", {
            method: "DELETE",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ key: videoId }),
          });
          const data = (await response.json()) as { error?: string };
          if (!response.ok) {
            throw new Error(data.error ?? "Failed to delete video");
          }
          deletedIds.push(videoId);
        }

        setVideos((current) => current.filter((video) => !deletedIds.includes(video.id)));
        setSelectedVideoIds((current) => {
          const next = new Set(current);
          deletedIds.forEach((id) => next.delete(id));
          return next;
        });
        if (activeVideo && deletedIds.includes(activeVideo.id)) {
          setActiveVideo(null);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to delete video");
      } finally {
        setDeletingVideoIds(new Set());
      }
    },
    [activeVideo, deletingVideoIds.size]
  );

  const deleteVideo = useCallback(
    async (videoId: string) => {
      await deleteVideos([videoId]);
    },
    [deleteVideos]
  );

  const analyzeSelectedVideos = useCallback(async () => {
    if (selectedVideos.length === 0 || analyzeStatus === "running") return;

    setAnalyzeStatus("running");
    setError("");
    setTasksCreated(0);
    setAnalyzeStage("transcribe");

    const allTasks: Task[] = [];

    try {
      for (let index = 0; index < selectedVideos.length; index += 1) {
        const video = selectedVideos[index];
        startAnalyzeStageProgress(video.title, index, selectedVideos.length);

        const response = await fetch("/api/devices/videos/analyze", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ key: video.id, demoIndex: index }),
        });
        const data = (await response.json()) as {
          tasks?: Task[];
          error?: string;
        };

        if (!response.ok) {
          throw new Error(data.error ?? `Failed to analyze ${video.title}`);
        }

        allTasks.push(...(data.tasks ?? []));
      }

      clearAnalyzeStageTimer();
      setTasksCreated(allTasks.length);
      setAnalyzeStatus("done");
      setAnalyzeProgress("");
      setSelectedVideoIds(new Set());
      onAnalysisComplete(allTasks);
    } catch (err) {
      clearAnalyzeStageTimer();
      setAnalyzeStatus("error");
      setAnalyzeProgress("");
      setError(err instanceof Error ? err.message : "Failed to analyze selected videos");
      if (allTasks.length > 0) {
        setTasksCreated(allTasks.length);
        onAnalysisComplete(allTasks);
      }
    }
  }, [
    analyzeStatus,
    clearAnalyzeStageTimer,
    onAnalysisComplete,
    selectedVideos,
    startAnalyzeStageProgress,
  ]);

  if (viewState === "loading") {
    return (
      <div className="flex min-h-[calc(100vh-3rem)] items-center justify-center">
        <p className="body-sm text-zinc-400">Loading device…</p>
      </div>
    );
  }

  if (viewState === "select") {
    return (
      <div className="flex min-h-[calc(100vh-3rem)] flex-col">
        <div className="shrink-0">
          <h1 className="page-title">Device</h1>
          <p className="page-desc">Connect smart glasses to sync field videos.</p>
        </div>

        <div className="flex flex-1 items-center justify-center px-2 py-6">
          <div className="widget-card w-full max-w-md p-6 text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-zinc-100 text-zinc-600">
              <Glasses size={28} strokeWidth={1.75} aria-hidden />
            </div>
            <h2 className="section-title">{supportedDevice.label}</h2>
            <p className="body-sm mt-1 text-zinc-500">{supportedDevice.description}</p>
            <button
              type="button"
              onClick={startSetup}
              className="btn-primary focus-ring mt-5 w-full"
            >
              Connect device
            </button>
            {error ? <p className="callout callout-error mt-4">{error}</p> : null}
          </div>
        </div>
      </div>
    );
  }

  if (viewState === "setup") {
    return (
      <div className="flex min-h-[calc(100vh-3rem)] flex-col">
        <div className="shrink-0">
          <h1 className="page-title">Connect {supportedDevice.label}</h1>
          <p className="page-desc">Enter your device details to finish setup.</p>
        </div>

        <div className="flex flex-1 items-center justify-center px-2 py-6">
          <div className="widget-card w-full max-w-md p-5">
            <div className="flex flex-col gap-3">
              <label className="flex flex-col gap-1">
                <span className="text-[11px] font-medium text-zinc-500">Device name</span>
                <input
                  className="input-field"
                  value={deviceName}
                  onChange={(event) => setDeviceName(event.target.value)}
                  placeholder="Maddox's Ray-Ban Meta"
                />
              </label>

              <label className="flex flex-col gap-1">
                <span className="text-[11px] font-medium text-zinc-500">Serial number</span>
                <input
                  className="input-field"
                  value={serialNumber}
                  onChange={(event) => setSerialNumber(event.target.value)}
                  placeholder="RB-META-0042"
                />
              </label>

              <label className="flex flex-col gap-1">
                <span className="text-[11px] font-medium text-zinc-500">Firmware version</span>
                <input
                  className="input-field"
                  value={firmwareVersion}
                  onChange={(event) => setFirmwareVersion(event.target.value)}
                />
              </label>

              <label className="flex flex-col gap-1">
                <span className="text-[11px] font-medium text-zinc-500">Sync preference</span>
                <select
                  className="input-field"
                  value={syncPreference}
                  onChange={(event) => setSyncPreference(event.target.value as SyncPreference)}
                >
                  <option value="auto">Auto-sync when charging</option>
                  <option value="manual">Manual sync only</option>
                </select>
              </label>
            </div>

            {error ? <p className="callout callout-error mt-4">{error}</p> : null}

            <div className="mt-5 flex gap-2">
              <button
                type="button"
                onClick={() => setViewState(device ? "gallery" : "select")}
                className="btn-secondary focus-ring flex-1"
                disabled={saving}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => void saveDevice()}
                className="btn-primary focus-ring flex-1"
                disabled={saving}
              >
                {saving ? "Saving…" : "Save & connect"}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-[calc(100vh-3rem)] flex-col gap-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="page-title">{device?.deviceName ?? "Device"}</h1>
          <p className="page-desc">
            {supportedDevice.label} · {device?.serialNumber}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-medium text-emerald-700">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
            Connected
          </span>
          <button
            type="button"
            onClick={() => setViewState("setup")}
            className="btn-secondary focus-ring"
            disabled={saving}
          >
            Edit
          </button>
          <button
            type="button"
            onClick={() => void disconnectDevice()}
            className="btn-text focus-ring text-zinc-500"
            disabled={saving}
          >
            Disconnect
          </button>
        </div>
      </div>

      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="section-title">Synced videos</h2>
          <p className="section-desc">
            Select videos from your glasses, then upload them for task scanning.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() =>
              setSelectedVideoIds(
                selectedVideoIds.size === videos.length
                  ? new Set()
                  : new Set(videos.map((video) => video.id))
              )
            }
            className="btn-secondary focus-ring"
            disabled={videos.length === 0 || analyzeStatus === "running" || isDeleting}
          >
            {selectedVideoIds.size === videos.length ? "Clear selection" : "Select all"}
          </button>
          {selectedVideos.length > 0 ? (
            <button
              type="button"
              onClick={() => void deleteVideos(selectedVideos.map((video) => video.id))}
              className="btn-secondary focus-ring text-red-600"
              disabled={analyzeStatus === "running" || isDeleting}
            >
              {isDeleting ? "Deleting…" : `Delete (${selectedVideos.length})`}
            </button>
          ) : null}
          <button
            type="button"
            onClick={() => void analyzeSelectedVideos()}
            className="btn-primary focus-ring"
            disabled={selectedVideos.length === 0 || analyzeStatus === "running" || isDeleting}
          >
            {analyzeStatus === "running"
              ? "Scanning…"
              : `Upload & scan${selectedVideos.length > 0 ? ` (${selectedVideos.length})` : ""}`}
          </button>
        </div>
      </div>

      {analyzeStatus === "running" ? (
        <AnalysisProgressPanel
          demoVideoMode={demoVideoMode}
          stage={analyzeStage}
          progressLabel={analyzeProgress}
        />
      ) : null}

      {analyzeStatus === "done" && tasksCreated > 0 ? (
        <p className="callout callout-success">
          {tasksCreated} {tasksCreated === 1 ? "task" : "tasks"} created — switched to Tasks.
        </p>
      ) : null}

      {analyzeStatus === "done" && tasksCreated === 0 ? (
        <p className="callout callout-success">All clear — no tasks found in selected videos.</p>
      ) : null}

      {loadingVideos ? (
        <p className="body-sm text-zinc-400">Loading videos…</p>
      ) : error ? null : videos.length === 0 ? (
        <div className="widget-card p-6 text-center">
          <p className="body-md text-zinc-600">No videos synced yet.</p>
          <p className="body-sm mt-1 text-zinc-400">
            Record on your glasses — they will appear here after sync.
          </p>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {videos.map((video) => {
            const isSelected = selectedVideoIds.has(video.id);
            const isVideoDeleting = deletingVideoIds.has(video.id);
            return (
              <div
                key={video.id}
                className={`widget-card overflow-hidden p-0 transition-shadow ${
                  isSelected ? "ring-2 ring-zinc-900 ring-offset-2" : ""
                } ${isVideoDeleting ? "opacity-60" : ""}`}
              >
                <div className="relative aspect-video bg-zinc-950">
                  <button
                    type="button"
                    onClick={() => setActiveVideo(video)}
                    className="focus-ring group absolute inset-0"
                    aria-label={`Play ${video.title}`}
                    disabled={isVideoDeleting}
                  >
                    <video
                      src={video.thumbnailUrl ?? video.playbackUrl}
                      muted
                      playsInline
                      preload="metadata"
                      className="h-full w-full object-cover"
                    />
                    <span className="absolute inset-0 flex items-center justify-center bg-black/25 opacity-0 transition-opacity group-hover:opacity-100">
                      <span className="flex h-8 w-8 items-center justify-center rounded-full bg-white/90 text-zinc-900">
                        <Play size={14} fill="currentColor" strokeWidth={0} aria-hidden />
                      </span>
                    </span>
                  </button>
                  <label className="absolute left-2 top-2 flex cursor-pointer items-center gap-1.5 rounded-full bg-white/95 px-2 py-1 text-[11px] font-medium text-zinc-700 shadow-sm">
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => toggleVideoSelection(video.id)}
                      disabled={analyzeStatus === "running" || isVideoDeleting}
                      className="h-3.5 w-3.5 rounded border-zinc-300"
                    />
                    Select
                  </label>
                  <button
                    type="button"
                    onClick={() => void deleteVideo(video.id)}
                    className="focus-ring absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-full bg-white/95 text-zinc-600 shadow-sm transition-colors hover:bg-white hover:text-red-600"
                    aria-label={`Delete ${video.title}`}
                    disabled={analyzeStatus === "running" || isVideoDeleting}
                  >
                    <Trash2 size={13} strokeWidth={1.75} aria-hidden />
                  </button>
                </div>
                <div className="p-3">
                  <p className="truncate text-[13px] font-medium text-zinc-900">{video.title}</p>
                  <p className="body-sm text-zinc-400">
                    {formatDate(video.recordedAt)} · {formatDuration(video.durationSec)}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {error ? <p className="callout callout-error">{error}</p> : null}

      {activeVideo ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
          onClick={() => setActiveVideo(null)}
        >
          <div
            className="relative w-full max-w-4xl overflow-hidden rounded-2xl bg-black shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setActiveVideo(null)}
              className="focus-ring absolute right-3 top-3 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-black/60 text-white"
              aria-label="Close video"
            >
              <X size={16} strokeWidth={1.75} aria-hidden />
            </button>
            <video
              src={activeVideo.playbackUrl}
              controls
              autoPlay
              playsInline
              className="max-h-[80vh] w-full"
            />
            <div className="border-t border-white/10 px-4 py-3">
              <p className="text-[13px] font-medium text-white">{activeVideo.title}</p>
              <p className="text-[11px] text-zinc-400">
                {formatDate(activeVideo.recordedAt)} · {formatDuration(activeVideo.durationSec)}
              </p>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function AnalysisProgressPanel({
  demoVideoMode,
  stage,
  progressLabel,
}: {
  demoVideoMode: boolean;
  stage: AnalyzeStage;
  progressLabel: string;
}) {
  const stageIndex = ANALYSIS_STAGES.findIndex((item) => item.id === stage);

  return (
    <div className="widget-card p-4">
      <div className="flex items-start gap-3">
        <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-zinc-100">
          <Loader2 size={16} strokeWidth={2} className="animate-spin text-zinc-600" aria-hidden />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[13px] font-medium text-zinc-900">
            {demoVideoMode ? "Scanning selected videos…" : "Analyzing selected videos…"}
          </p>
          {progressLabel ? <p className="body-sm mt-0.5 text-zinc-500">{progressLabel}</p> : null}
          {demoVideoMode ? (
            <ul className="mt-3 flex flex-col gap-2">
              {ANALYSIS_STAGES.map((item, index) => {
                const isDone = index < stageIndex;
                const isActive = item.id === stage;
                return (
                  <li
                    key={item.id}
                    className={`flex items-center gap-2 text-[12px] ${
                      isActive ? "font-medium text-zinc-900" : isDone ? "text-emerald-700" : "text-zinc-400"
                    }`}
                  >
                    {isDone ? (
                      <Check size={14} strokeWidth={2} className="shrink-0 text-emerald-600" aria-hidden />
                    ) : isActive ? (
                      <Loader2 size={14} strokeWidth={2} className="shrink-0 animate-spin" aria-hidden />
                    ) : (
                      <span className="inline-flex h-3.5 w-3.5 shrink-0 rounded-full border border-zinc-300" />
                    )}
                    {item.label}
                    {isActive && item.id === "transcribe" ? "…" : ""}
                  </li>
                );
              })}
            </ul>
          ) : null}
        </div>
      </div>
    </div>
  );
}
