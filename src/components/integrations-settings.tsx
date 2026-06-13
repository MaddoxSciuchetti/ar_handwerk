"use client";

import { useCallback, useEffect, useState } from "react";
import { Plus } from "lucide-react";
import type { GoogleConnectionStatus } from "@/lib/integrations/types";
import {
  CONNECTED_STORAGE_KEY,
  DEFAULT_INTEGRATION_PREFERENCES,
  INTEGRATIONS,
  INTEGRATION_STORAGE_KEY,
  type IntegrationCategory,
  type IntegrationConnections,
  type IntegrationDefinition,
  type IntegrationId,
  type IntegrationPreferences,
} from "@/lib/integrations/catalog";
import { IntegrationToggle } from "@/components/integration-toggle";

type IntegrationsSettingsProps = {
  title: string;
  description: string;
  category: IntegrationCategory;
  googleConnected?: boolean;
  googleError?: string | null;
};

type CustomIntegration = {
  id: string;
  name: string;
  description: string;
  category: IntegrationCategory;
  signUpUrl: string;
  brandColor: string;
  brandLabel: string;
};

type DisplayIntegration = IntegrationDefinition | CustomIntegration;

const CUSTOM_INTEGRATIONS_KEY = "field:custom-integrations";
const CUSTOM_CONNECTIONS_KEY = "field:custom-integration-connections";
const CUSTOM_PREFERENCES_KEY = "field:custom-integration-preferences";

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

function readCustomIntegrations(): CustomIntegration[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(CUSTOM_INTEGRATIONS_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as CustomIntegration[];
  } catch {
    return [];
  }
}

function writeCustomIntegrations(integrations: CustomIntegration[]) {
  window.localStorage.setItem(CUSTOM_INTEGRATIONS_KEY, JSON.stringify(integrations));
}

function readCustomConnections(): Record<string, boolean> {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(CUSTOM_CONNECTIONS_KEY);
    if (!raw) return {};
    return JSON.parse(raw) as Record<string, boolean>;
  } catch {
    return {};
  }
}

function writeCustomConnections(connections: Record<string, boolean>) {
  window.localStorage.setItem(CUSTOM_CONNECTIONS_KEY, JSON.stringify(connections));
}

function readCustomPreferences(): Record<string, boolean> {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(CUSTOM_PREFERENCES_KEY);
    if (!raw) return {};
    return JSON.parse(raw) as Record<string, boolean>;
  } catch {
    return {};
  }
}

function writeCustomPreferences(preferences: Record<string, boolean>) {
  window.localStorage.setItem(CUSTOM_PREFERENCES_KEY, JSON.stringify(preferences));
}

function isGoogleIntegration(id: IntegrationId) {
  return id === "gmail" || id === "google-calendar";
}

function isCatalogIntegration(integration: DisplayIntegration): integration is IntegrationDefinition {
  return !integration.id.startsWith("custom:");
}

function customBrandLabel(name: string) {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return "+";
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return `${words[0][0] ?? ""}${words[1][0] ?? ""}`.toUpperCase();
}

export function IntegrationsSettings({
  title,
  description,
  category,
  googleConnected,
  googleError,
}: IntegrationsSettingsProps) {
  const [googleStatus, setGoogleStatus] = useState<GoogleConnectionStatus | null>(null);
  const [googleLoading, setGoogleLoading] = useState(category === "productivity");
  const [disconnecting, setDisconnecting] = useState(false);
  const [banner, setBanner] = useState<string | null>(googleError ?? null);
  const [preferences, setPreferences] = useState<IntegrationPreferences>(
    DEFAULT_INTEGRATION_PREFERENCES,
  );
  const [connections, setConnections] = useState<IntegrationConnections>({});
  const [customIntegrations, setCustomIntegrations] = useState<CustomIntegration[]>([]);
  const [customConnections, setCustomConnections] = useState<Record<string, boolean>>({});
  const [customPreferences, setCustomPreferences] = useState<Record<string, boolean>>({});
  const [connectingId, setConnectingId] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newIntegrationName, setNewIntegrationName] = useState("");

  const catalogIntegrations = INTEGRATIONS.filter((item) => item.category === category);
  const categoryCustomIntegrations = customIntegrations.filter((item) => item.category === category);
  const allIntegrations: DisplayIntegration[] = [
    ...catalogIntegrations,
    ...categoryCustomIntegrations,
  ];

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
    setCustomIntegrations(readCustomIntegrations());
    setCustomConnections(readCustomConnections());
    setCustomPreferences(readCustomPreferences());
    setShowAddForm(false);
    setNewIntegrationName("");
    setConnectingId(null);

    if (category === "productivity") {
      void loadGoogleStatus();
    }
  }, [category, loadGoogleStatus]);

  useEffect(() => {
    if (googleConnected) {
      setBanner("Google account connected successfully.");
      void loadGoogleStatus();
    }
  }, [googleConnected, loadGoogleStatus]);

  const googleAccountConnected = Boolean(googleStatus?.connected);

  function isServiceConnected(integration: DisplayIntegration) {
    if (isCatalogIntegration(integration)) {
      if (isGoogleIntegration(integration.id)) return googleAccountConnected;
      return Boolean(connections[integration.id]);
    }
    return Boolean(customConnections[integration.id]);
  }

  function isIntegrationEnabled(integration: DisplayIntegration) {
    if (isCatalogIntegration(integration)) return preferences[integration.id];
    return Boolean(customPreferences[integration.id]);
  }

  function handleToggle(integration: DisplayIntegration, enabled: boolean) {
    if (!isServiceConnected(integration)) {
      if (enabled) setConnectingId(integration.id);
      return;
    }

    if (isCatalogIntegration(integration)) {
      const next = { ...preferences, [integration.id]: enabled };
      setPreferences(next);
      writePreferences(next);
      return;
    }

    const next = { ...customPreferences, [integration.id]: enabled };
    setCustomPreferences(next);
    writeCustomPreferences(next);
  }

  function handleConnect(integration: DisplayIntegration) {
    if (isCatalogIntegration(integration) && isGoogleIntegration(integration.id)) {
      window.location.href = "/api/integrations/google/connect";
      return;
    }

    if (isCatalogIntegration(integration)) {
      const next = { ...connections, [integration.id]: true };
      setConnections(next);
      writeConnections(next);

      const nextPreferences = { ...preferences, [integration.id]: true };
      setPreferences(nextPreferences);
      writePreferences(nextPreferences);
    } else {
      const next = { ...customConnections, [integration.id]: true };
      setCustomConnections(next);
      writeCustomConnections(next);

      const nextPreferences = { ...customPreferences, [integration.id]: true };
      setCustomPreferences(nextPreferences);
      writeCustomPreferences(nextPreferences);
    }

    setConnectingId(null);
    setBanner(`${integration.name} connected.`);
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

  function handleDisconnect(integration: DisplayIntegration) {
    if (isCatalogIntegration(integration)) {
      const nextConnections = { ...connections, [integration.id]: false };
      setConnections(nextConnections);
      writeConnections(nextConnections);

      const nextPreferences = { ...preferences, [integration.id]: false };
      setPreferences(nextPreferences);
      writePreferences(nextPreferences);
    } else {
      const nextConnections = { ...customConnections, [integration.id]: false };
      setCustomConnections(nextConnections);
      writeCustomConnections(nextConnections);

      const nextPreferences = { ...customPreferences, [integration.id]: false };
      setCustomPreferences(nextPreferences);
      writeCustomPreferences(nextPreferences);
    }

    setConnectingId(null);
  }

  function handleRemoveCustom(integration: CustomIntegration) {
    const nextCustom = customIntegrations.filter((item) => item.id !== integration.id);
    setCustomIntegrations(nextCustom);
    writeCustomIntegrations(nextCustom);

    const nextConnections = { ...customConnections };
    delete nextConnections[integration.id];
    setCustomConnections(nextConnections);
    writeCustomConnections(nextConnections);

    const nextPreferences = { ...customPreferences };
    delete nextPreferences[integration.id];
    setCustomPreferences(nextPreferences);
    writeCustomPreferences(nextPreferences);

    if (connectingId === integration.id) setConnectingId(null);
  }

  function handleAddCustomIntegration() {
    const name = newIntegrationName.trim();
    if (!name) return;

    const integration: CustomIntegration = {
      id: `custom:${Date.now()}`,
      name,
      description: "Custom integration added by your team.",
      category,
      signUpUrl: "https://",
      brandColor: "#71717a",
      brandLabel: customBrandLabel(name),
    };

    const nextCustom = [...customIntegrations, integration];
    setCustomIntegrations(nextCustom);
    writeCustomIntegrations(nextCustom);
    setNewIntegrationName("");
    setShowAddForm(false);
    setConnectingId(integration.id);
  }

  const addControl = (
    <AddIntegrationControl
      showAddForm={showAddForm}
      newIntegrationName={newIntegrationName}
      onToggleForm={() => setShowAddForm((current) => !current)}
      onNameChange={setNewIntegrationName}
      onAdd={handleAddCustomIntegration}
      onCancel={() => {
        setShowAddForm(false);
        setNewIntegrationName("");
      }}
    />
  );

  return (
    <div className="flex w-full max-w-3xl flex-col gap-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="page-title">{title}</h1>
          <p className="page-desc">{description}</p>
        </div>
        <div className="shrink-0">{addControl}</div>
      </div>

      {banner ? (
        <p className="callout callout-neutral">{banner}</p>
      ) : null}

      <section className="widget-card min-w-0">
        {category === "productivity" ? (
          googleLoading ? (
            <p className="body-sm text-zinc-400">Loading Google status…</p>
          ) : !googleStatus?.configured ? (
            <p className="callout callout-warning">
              Google OAuth is not configured. Add GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, and
              GOOGLE_REDIRECT_URI to your environment.
            </p>
          ) : (
            <div className="flex flex-col">
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

              {allIntegrations.map((integration, index) => (
                <IntegrationRow
                  key={integration.id}
                  integration={integration}
                  enabled={isIntegrationEnabled(integration)}
                  connected={isServiceConnected(integration)}
                  showDivider={index > 0}
                  onToggle={(enabled) => handleToggle(integration, enabled)}
                  onConnect={() => handleConnect(integration)}
                  onDisconnect={
                    isServiceConnected(integration) &&
                    (!isCatalogIntegration(integration) || !isGoogleIntegration(integration.id))
                      ? () => handleDisconnect(integration)
                      : undefined
                  }
                  onRemove={
                    !isCatalogIntegration(integration)
                      ? () => handleRemoveCustom(integration)
                      : undefined
                  }
                  connecting={connectingId === integration.id}
                  onDismissConnect={() => setConnectingId(null)}
                />
              ))}
            </div>
          )
        ) : (
          <div className="flex flex-col">
            {allIntegrations.map((integration, index) => (
              <IntegrationRow
                key={integration.id}
                integration={integration}
                enabled={isIntegrationEnabled(integration)}
                connected={isServiceConnected(integration)}
                showDivider={index > 0}
                onToggle={(enabled) => handleToggle(integration, enabled)}
                onConnect={() => handleConnect(integration)}
                onDisconnect={
                  isServiceConnected(integration) ? () => handleDisconnect(integration) : undefined
                }
                onRemove={
                  !isCatalogIntegration(integration)
                    ? () => handleRemoveCustom(integration)
                    : undefined
                }
                connecting={connectingId === integration.id}
                onDismissConnect={() => setConnectingId(null)}
              />
            ))}
          </div>
        )}

        {category === "messaging" ? (
          <p className="mt-2 body-sm text-zinc-500">
            Sign up for a service before connecting it here.
          </p>
        ) : null}
      </section>
    </div>
  );
}

type AddIntegrationControlProps = {
  showAddForm: boolean;
  newIntegrationName: string;
  onToggleForm: () => void;
  onNameChange: (value: string) => void;
  onAdd: () => void;
  onCancel: () => void;
};

function AddIntegrationControl({
  showAddForm,
  newIntegrationName,
  onToggleForm,
  onNameChange,
  onAdd,
  onCancel,
}: AddIntegrationControlProps) {
  if (showAddForm) {
    return (
      <div className="flex w-52 flex-col items-end gap-1.5">
        <input
          type="text"
          value={newIntegrationName}
          onChange={(event) => onNameChange(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") onAdd();
            if (event.key === "Escape") onCancel();
          }}
          placeholder="Integration name"
          className="focus-ring w-full rounded-md border border-zinc-200 px-2 py-1.5 text-[12px] text-zinc-900 outline-none"
          autoFocus
        />
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={onAdd}
            disabled={!newIntegrationName.trim()}
            className="btn-primary focus-ring disabled:opacity-50"
          >
            Add
          </button>
          <button type="button" onClick={onCancel} className="btn-text">
            Cancel
          </button>
        </div>
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={onToggleForm}
      title="Add integration"
      aria-label="Add integration"
      className="focus-ring flex h-7 w-7 items-center justify-center rounded-md border border-dashed border-zinc-300 text-zinc-500 transition-colors hover:border-zinc-400 hover:bg-zinc-50 hover:text-zinc-700"
    >
      <Plus size={12} strokeWidth={2} aria-hidden />
    </button>
  );
}

type IntegrationRowProps = {
  integration: DisplayIntegration;
  enabled: boolean;
  connected: boolean;
  showDivider?: boolean;
  connecting?: boolean;
  disconnecting?: boolean;
  onToggle: (enabled: boolean) => void;
  onConnect: () => void;
  onDisconnect?: () => void;
  onRemove?: () => void;
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
  onRemove,
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
                {integration.signUpUrl !== "https://" ? (
                  <a
                    href={integration.signUpUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn-secondary"
                  >
                    Sign up
                  </a>
                ) : null}
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

          {onRemove ? (
            <button type="button" onClick={onRemove} className="btn-text mt-1 text-zinc-500">
              Remove
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function IntegrationIcon({ integration }: { integration: DisplayIntegration }) {
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
