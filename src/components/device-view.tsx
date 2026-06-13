"use client";

import { useCallback, useEffect, useState } from "react";
import { SUPPORTED_DEVICES } from "@/lib/devices/catalog";
import type { DeviceRecord, DeviceSetupInput, DeviceType, SyncPreference } from "@/lib/devices/types";

type DeviceVideo = {
  id: string;
  title: string;
  recordedAt: string;
  durationSec: number | null;
  playbackUrl: string;
  thumbnailUrl: string | null;
};

type ViewState = "loading" | "select" | "setup" | "gallery";

const DEFAULT_DEVICE_TYPE: DeviceType = "meta-ray-ban";

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

export function DeviceView() {
  const supportedDevice = SUPPORTED_DEVICES[0];
  const [viewState, setViewState] = useState<ViewState>("loading");
  const [device, setDevice] = useState<DeviceRecord | null>(null);
  const [videos, setVideos] = useState<DeviceVideo[]>([]);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [loadingVideos, setLoadingVideos] = useState(false);
  const [activeVideo, setActiveVideo] = useState<DeviceVideo | null>(null);

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
      setViewState("select");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to disconnect device");
    } finally {
      setSaving(false);
    }
  }, []);

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
              <GlassesIcon />
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

      <div>
        <h2 className="section-title">Synced videos</h2>
        <p className="section-desc">Videos captured on your glasses and stored in Cloudflare R2.</p>
      </div>

      {loadingVideos ? (
        <p className="body-sm text-zinc-400">Loading videos…</p>
      ) : videos.length === 0 ? (
        <div className="widget-card p-6 text-center">
          <p className="body-md text-zinc-600">No videos synced yet.</p>
          <p className="body-sm mt-1 text-zinc-400">
            Record on your glasses — they will appear here after sync.
          </p>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {videos.map((video) => (
            <button
              key={video.id}
              type="button"
              onClick={() => setActiveVideo(video)}
              className="focus-ring group widget-card overflow-hidden p-0 text-left"
            >
              <div className="relative aspect-video bg-zinc-950">
                {video.thumbnailUrl ? (
                  <video
                    src={video.thumbnailUrl}
                    muted
                    playsInline
                    preload="metadata"
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <video
                    src={video.playbackUrl}
                    muted
                    playsInline
                    preload="metadata"
                    className="h-full w-full object-cover"
                  />
                )}
                <span className="absolute inset-0 flex items-center justify-center bg-black/25 opacity-0 transition-opacity group-hover:opacity-100">
                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-white/90 text-zinc-900">
                    <PlayIcon />
                  </span>
                </span>
              </div>
              <div className="p-3">
                <p className="truncate text-[13px] font-medium text-zinc-900">{video.title}</p>
                <p className="body-sm text-zinc-400">
                  {formatDate(video.recordedAt)} · {formatDuration(video.durationSec)}
                </p>
              </div>
            </button>
          ))}
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
              <CloseIcon />
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

function GlassesIcon() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M2 12a4 4 0 014-4h2a4 4 0 014 4 4 4 0 014-4h2a4 4 0 014 4"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
      />
      <path d="M6 12h12" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
    </svg>
  );
}

function PlayIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M8 5v14l11-7L8 5z"
        fill="currentColor"
      />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M18 6L6 18M6 6l12 12"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
      />
    </svg>
  );
}
