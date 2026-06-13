"use client";

import { useCallback, useEffect, useState } from "react";
import type { GoogleConnectionStatus } from "@/lib/integrations/types";
import {
  CONNECTED_STORAGE_KEY,
  DEFAULT_INTEGRATION_PREFERENCES,
  INTEGRATIONS,
  INTEGRATION_STORAGE_KEY,
  type IntegrationConnections,
  type IntegrationDefinition,
  type IntegrationId,
  type IntegrationPreferences,
} from "@/lib/integrations/catalog";
import { IntegrationToggle } from "@/components/integration-toggle";

type IntegrationsSettingsProps = {
  googleConnected?: boolean;
  googleError?: string | null;
};

function readPreferences(): IntegrationPreferences {
  if (typeof window === "undefined") return DEFAULT_INTEGRATION_PREFERENCES;
  try {
    const raw = window.localStorage.getItem(INTEGRATION_STORAGE_KEY);
    if (!raw) return DEFAULT_INTEGRATION_PREFERENCES;
    return { ...DEFAULT_INTEGRATION_PREFERENCES, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_INTEGRATION_PREFERENCES;
  }
}

function writePreferences(preferences: IntegrationPreferences) {
  window.localStorage.setItem(INTEGRATION_STORAGE_KEY, JSON.stringify(preferences));
}

function readConnections(): IntegrationConnections {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(CONNECTED_STORAGE_KEY);
    if (!raw) return {};
    return JSON.parse(raw) as IntegrationConnections;
  } catch {
    return {};
  }
}

function writeConnections(connections: IntegrationConnections) {
  window.localStorage.setItem(CONNECTED_STORAGE_KEY, JSON.stringify(connections));
}

function isGoogleIntegration(id: IntegrationId) {
  return id === "gmail" || id === "google-calendar";
}

export function IntegrationsSettings({
  googleConnected,
  googleError,
}: IntegrationsSettingsProps) {
  const [googleStatus, setGoogleStatus] = useState<GoogleConnectionStatus | null>(null);
  const [googleLoading, setGoogleLoading] = useState(true);
  const [disconnecting, setDisconnecting] = useState(false);
  const [banner, setBanner] = useState<string | null>(googleError ?? null);
  const [preferences, setPreferences] = useState<IntegrationPreferences>(
    DEFAULT_INTEGRATION_PREFERENCES,
  );
  const [connections, setConnections] = useState<IntegrationConnections>({});
  const [connectingId, setConnectingId] = useState<IntegrationId | null>(null);

  const loadGoogleStatus = useCallback(async () => {
    setGoogleLoading(true);
    try {
      const response = await fetch("/api/integrations/google/status");
      if (response.ok) {
        setGoogleStatus((await response.json()) as GoogleConnectionStatus);
      }
    } finally {
      setGoogleLoading(false);
    }
  }, []);

  useEffect(() => {
    setPreferences(readPreferences());
    setConnections(readConnections());
    void loadGoogleStatus();
  }, [loadGoogleStatus]);

  useEffect(() => {
    if (googleConnected) {
      setBanner("Google account connected successfully.");
      void loadGoogleStatus();
    }
  }, [googleConnected, loadGoogleStatus]);

  const googleAccountConnected = Boolean(googleStatus?.connected);

  function isServiceConnected(id: IntegrationId) {
    if (isGoogleIntegration(id)) return googleAccountConnected;
    return Boolean(connections[id]);
  }

  function handleToggle(id: IntegrationId, enabled: boolean) {
    if (!isServiceConnected(id)) {
      if (enabled) setConnectingId(id);
      return;
    }

    const next = { ...preferences, [id]: enabled };
    setPreferences(next);
    writePreferences(next);
  }

  function handleConnect(id: IntegrationId) {
    if (isGoogleIntegration(id)) {
      window.location.href = "/api/integrations/google/connect";
      return;
    }

    const next = { ...connections, [id]: true };
    setConnections(next);
    writeConnections(next);
    setConnectingId(null);

    const nextPreferences = { ...preferences, [id]: true };
    setPreferences(nextPreferences);
    writePreferences(nextPreferences);
    setBanner(`${INTEGRATIONS.find((item) => item.id === id)?.name ?? "Service"} connected.`);
  }

  async function handleDisconnectGoogle() {
    setDisconnecting(true);
    try {
      await fetch("/api/integrations/google/status", { method: "DELETE" });
      await loadGoogleStatus();
      const next = {
        ...preferences,
        gmail: false,
        "google-calendar": false,
      };
      setPreferences(next);
      writePreferences(next);
      setBanner("Google account disconnected.");
    } finally {
      setDisconnecting(false);
    }
  }

  function handleDisconnectMessaging(id: IntegrationId) {
    const nextConnections = { ...connections, [id]: false };
    setConnections(nextConnections);
    writeConnections(nextConnections);

    const nextPreferences = { ...preferences, [id]: false };
    setPreferences(nextPreferences);
    writePreferences(nextPreferences);
    setConnectingId(null);
  }

  const productivity = INTEGRATIONS.filter((item) => item.category === "productivity");
  const messaging = INTEGRATIONS.filter((item) => item.category === "messaging");
  const suppliers = INTEGRATIONS.filter((item) => item.category === "suppliers");

  return (
    <div className="flex flex-col gap-3">
      {banner ? (
        <p className="callout callout-neutral">{banner}</p>
      ) : null}

      <div className="grid gap-3 lg:grid-cols-2 lg:items-start">
        <div className="flex min-w-0 flex-col gap-3">
          <section className="widget-card min-w-0">
            <h2 className="section-title">Productivity</h2>
            <p className="section-desc">
              Connect Gmail and Calendar to sync email and scheduling with your tasks.
            </p>

            {googleLoading ? (
              <p className="mt-2 body-sm text-zinc-400">Loading Google status…</p>
            ) : !googleStatus?.configured ? (
              <p className="callout callout-warning mt-2">
                Google OAuth is not configured. Add GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, and
                GOOGLE_REDIRECT_URI to your environment.
              </p>
            ) : (
              <div className="mt-2 flex flex-col">
                {googleAccountConnected ? (
                  <div className="mb-2 flex flex-col gap-1">
                    <div className="callout callout-success">
                      Google account connected as {googleStatus?.email ?? "your account"}
                    </div>
                    <button
                      type="button"
                      onClick={() => void handleDisconnectGoogle()}
                      disabled={disconnecting}
                      className="btn-text self-start disabled:opacity-50"
                    >
                      {disconnecting ? "Disconnecting…" : "Disconnect Google account"}
                    </button>
                  </div>
                ) : null}

                {productivity.map((integration, index) => (
                  <IntegrationRow
                    key={integration.id}
                    integration={integration}
                    enabled={preferences[integration.id]}
                    connected={isServiceConnected(integration.id)}
                    showDivider={index > 0}
                    onToggle={(enabled) => handleToggle(integration.id, enabled)}
                    onConnect={() => handleConnect(integration.id)}
                    connecting={connectingId === integration.id}
                    onDismissConnect={() => setConnectingId(null)}
                  />
                ))}
              </div>
            )}
          </section>

          <section className="widget-card min-w-0">
            <h2 className="section-title">Suppliers &amp; manufacturers</h2>
            <p className="section-desc">
              SHK-Großhändler und Hersteller für die Materialbeschaffung. Verbinden Sie Ihre
              Lieferanten, um Preise und Kataloge in der Aufgabensuche zu nutzen.
            </p>

            <div className="mt-2 flex flex-col">
              {suppliers.map((integration, index) => (
                <IntegrationRow
                  key={integration.id}
                  integration={integration}
                  enabled={preferences[integration.id]}
                  connected={isServiceConnected(integration.id)}
                  showDivider={index > 0}
                  onToggle={(enabled) => handleToggle(integration.id, enabled)}
                  onConnect={() => handleConnect(integration.id)}
                  onDisconnect={
                    isServiceConnected(integration.id)
                      ? () => handleDisconnectMessaging(integration.id)
                      : undefined
                  }
                  connecting={connectingId === integration.id}
                  onDismissConnect={() => setConnectingId(null)}
                />
              ))}
            </div>
          </section>
        </div>

        <section className="widget-card min-w-0">
          <h2 className="section-title">Messaging</h2>
          <p className="section-desc">
            Choose where task updates and reminders are delivered. Sign up for a service before
            connecting it here.
          </p>

          <div className="mt-2 flex flex-col">
            {messaging.map((integration, index) => (
              <IntegrationRow
                key={integration.id}
                integration={integration}
                enabled={preferences[integration.id]}
                connected={isServiceConnected(integration.id)}
                showDivider={index > 0}
                onToggle={(enabled) => handleToggle(integration.id, enabled)}
                onConnect={() => handleConnect(integration.id)}
                onDisconnect={
                  isServiceConnected(integration.id)
                    ? () => handleDisconnectMessaging(integration.id)
                    : undefined
                }
                connecting={connectingId === integration.id}
                onDismissConnect={() => setConnectingId(null)}
              />
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}

type IntegrationRowProps = {
  integration: IntegrationDefinition;
  enabled: boolean;
  connected: boolean;
  showDivider?: boolean;
  connecting?: boolean;
  disconnecting?: boolean;
  onToggle: (enabled: boolean) => void;
  onConnect: () => void;
  onDisconnect?: () => void;
  onDismissConnect: () => void;
};

function IntegrationRow({
  integration,
  enabled,
  connected,
  showDivider,
  connecting,
  disconnecting,
  onToggle,
  onConnect,
  onDisconnect,
  onDismissConnect,
}: IntegrationRowProps) {
  return (
    <div className={showDivider ? "mt-2 border-t border-zinc-100 pt-2" : ""}>
      <div className="flex items-start gap-2">
        <IntegrationIcon integration={integration} />
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="text-[12px] font-medium text-zinc-900">{integration.name}</p>
              <p className="mt-0.5 body-sm text-zinc-500">
                {integration.description}
              </p>
            </div>
            <IntegrationToggle
              checked={enabled && connected}
              label={`Toggle ${integration.name}`}
              onChange={onToggle}
            />
          </div>

          {!connected ? (
            <p className="callout callout-warning mt-1.5">
              You haven&apos;t signed up yet. Create an account with {integration.name}, then
              connect it here to enable this integration.
            </p>
          ) : enabled ? (
            <p className="mt-1.5 body-sm text-emerald-700">Enabled</p>
          ) : (
            <p className="mt-1.5 body-sm text-zinc-400">Connected — toggle on to enable</p>
          )}

          {connecting ? (
            <div className="mt-2 rounded-md border border-zinc-200 bg-zinc-50 p-2">
              <p className="body-sm font-medium text-zinc-800">
                Connect {integration.name}
              </p>
              <p className="mt-0.5 body-sm text-zinc-500">
                Sign up or sign in to {integration.name} first, then authorize Field to send
                task updates.
              </p>
              <div className="mt-2 flex flex-wrap items-center gap-1.5">
                <button
                  type="button"
                  onClick={onConnect}
                  className="btn-primary focus-ring"
                >
                  Connect {integration.name}
                </button>
                <a
                  href={integration.signUpUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn-secondary"
                >
                  Sign up
                </a>
                <button
                  type="button"
                  onClick={onDismissConnect}
                  className="btn-text"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : null}

          {connected && onDisconnect ? (
            <button
              type="button"
              onClick={onDisconnect}
              disabled={disconnecting}
              className="btn-text mt-1 disabled:opacity-50"
            >
              {disconnecting ? "Disconnecting…" : `Disconnect ${integration.name}`}
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function IntegrationIcon({ integration }: { integration: IntegrationDefinition }) {
  return (
    <span
      className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-[9px] font-bold text-white"
      style={{ backgroundColor: integration.brandColor }}
      aria-hidden
    >
      {integration.brandLabel}
    </span>
  );
}
