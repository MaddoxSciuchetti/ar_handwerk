"use client";

import { IntegrationsSettings } from "@/components/integrations-settings";

type SettingsViewProps = {
  googleConnected?: boolean;
  googleError?: string | null;
};

export function SettingsView({ googleConnected, googleError }: SettingsViewProps) {
  return (
    <div className="flex w-full max-w-5xl flex-col gap-3">
      <div>
        <h1 className="page-title">Integrations</h1>
        <p className="page-desc">Connect Gmail, Calendar, messaging apps, and SHK suppliers.</p>
      </div>

      <IntegrationsSettings
        googleConnected={googleConnected}
        googleError={googleError}
      />
    </div>
  );
}
