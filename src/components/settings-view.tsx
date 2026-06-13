"use client";

import type { IntegrationCategory } from "@/lib/integrations/catalog";
import { IntegrationsSettings } from "@/components/integrations-settings";

type IntegrationSection = Extract<IntegrationCategory, "productivity" | "messaging" | "suppliers">;

type SettingsViewProps = {
  section: "workspace" | "messaging" | "suppliers";
  googleConnected?: boolean;
  googleError?: string | null;
};

const SECTION_META: Record<
  SettingsViewProps["section"],
  { title: string; description: string; category: IntegrationSection }
> = {
  workspace: {
    title: "Workspace",
    description: "Connect Gmail and Calendar to sync email and scheduling with your tasks.",
    category: "productivity",
  },
  messaging: {
    title: "Messaging",
    description: "Choose where task updates and reminders are delivered.",
    category: "messaging",
  },
  suppliers: {
    title: "Suppliers",
    description:
      "SHK-Großhändler und Hersteller für die Materialbeschaffung. Verbinden Sie Ihre Lieferanten, um Preise und Kataloge in der Aufgabensuche zu nutzen.",
    category: "suppliers",
  },
};

export function SettingsView({ section, googleConnected, googleError }: SettingsViewProps) {
  const meta = SECTION_META[section];

  return (
    <div className="flex w-full max-w-3xl flex-col gap-3">
      <div>
        <h1 className="page-title">{meta.title}</h1>
        <p className="page-desc">{meta.description}</p>
      </div>

      <IntegrationsSettings
        category={meta.category}
        googleConnected={googleConnected}
        googleError={googleError}
      />
    </div>
  );
}
