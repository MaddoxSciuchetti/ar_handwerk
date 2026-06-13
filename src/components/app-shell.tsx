"use client";

import type { ReactNode } from "react";
import { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { GmailView } from "@/components/gmail-view";
import { CalendarView } from "@/components/calendar-view";
import { UploadView } from "@/components/upload-view";
import { TasksView } from "@/components/tasks-view";
import { SettingsView } from "@/components/settings-view";
import { ProfileSettingsView } from "@/components/profile-settings-view";
import { LoginView } from "@/components/login-view";
import { ProfileMenu, profileUserFromSession } from "@/components/profile-menu";
import { type Task } from "@/lib/tasks";

type MainTab = "upload" | "tasks" | "mail" | "calendar";
type SettingsSection = "integrations" | "profile";
type Tab = MainTab | "settings";

type SessionUser = {
  id: string;
  email: string;
  name: string;
};

function UploadIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M7 17v1a2 2 0 002 2h6a2 2 0 002-2v-1M12 13V4m0 0L8 8m4-4 4 4"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function TasksIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M9 6h11M9 12h11M9 18h11M4 6h.01M4 12h.01M4 18h.01"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
      />
    </svg>
  );
}

function MailIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M4 6h16a2 2 0 012 2v8a2 2 0 01-2 2H4a2 2 0 01-2-2V8a2 2 0 012-2z"
        stroke="currentColor"
        strokeWidth="1.75"
      />
      <path
        d="M4 8l8 5 8-5"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function CalendarIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M7 3v3M17 3v3M4 8h16M6 6h12a2 2 0 012 2v12a2 2 0 01-2 2H6a2 2 0 01-2-2V8a2 2 0 012-2z"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function ProfileIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M20 21a8 8 0 00-16 0M12 11a4 4 0 100-8 4 4 0 000 8z"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function IntegrationsIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M12 22v-5M9 17h6M8 7V2m8 5V2M5 7h14a2 2 0 012 2v4a2 2 0 01-2 2H5a2 2 0 01-2-2V9a2 2 0 012-2z"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function BackIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M19 12H5M12 19l-7-7 7-7"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function CollapseIcon({ collapsed }: { collapsed: boolean }) {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden>
      {collapsed ? (
        <>
          <rect x="3" y="3" width="18" height="18" rx="4" stroke="currentColor" strokeWidth="1.75" />
          <path d="M9 3v18M14 12H19M16.5 9.5L19 12l-2.5 2.5" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
        </>
      ) : (
        <>
          <rect x="3" y="3" width="18" height="18" rx="4" stroke="currentColor" strokeWidth="1.75" />
          <path d="M9 3v18M14 12H10M11.5 9.5L9 12l2.5 2.5" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
        </>
      )}
    </svg>
  );
}

const MAIN_NAV: { id: MainTab; label: string; icon: ReactNode }[] = [
  { id: "upload", label: "Upload", icon: <UploadIcon /> },
  { id: "tasks", label: "Tasks", icon: <TasksIcon /> },
  { id: "calendar", label: "Calendar", icon: <CalendarIcon /> },
  { id: "mail", label: "Mail", icon: <MailIcon /> },
];

const SETTINGS_NAV: { id: SettingsSection; label: string; icon: ReactNode }[] = [
  { id: "integrations", label: "Integrations", icon: <IntegrationsIcon /> },
  { id: "profile", label: "Profile", icon: <ProfileIcon /> },
];

const SIDEBAR_COLLAPSED_KEY = "sidebar-collapsed";

function readSidebarCollapsed(): boolean {
  if (typeof window === "undefined") return false;
  return localStorage.getItem(SIDEBAR_COLLAPSED_KEY) === "true";
}

export function AppShell() {
  const searchParams = useSearchParams();
  const [tab, setTab] = useState<Tab>("upload");
  const [settingsSection, setSettingsSection] = useState<SettingsSection>("integrations");
  const [returnTab, setReturnTab] = useState<MainTab>("upload");
  const [tasks, setTasks] = useState<Task[]>([]);
  const [allClear, setAllClear] = useState(false);
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    setCollapsed(readSidebarCollapsed());
  }, []);
  const [user, setUser] = useState<SessionUser | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [googleConnected, setGoogleConnected] = useState(false);

  const googleConnectedParam = searchParams.get("google_connected");
  const googleErrorParam = searchParams.get("google_error");

  useEffect(() => {
    const requestedTab = searchParams.get("tab");
    if (requestedTab === "settings") {
      setTab("settings");
    } else if (
      requestedTab === "tasks" ||
      requestedTab === "upload" ||
      requestedTab === "mail" ||
      requestedTab === "calendar"
    ) {
      setTab(requestedTab);
    }

    const requestedSettings = searchParams.get("settings");
    if (requestedSettings === "integrations" || requestedSettings === "profile") {
      setSettingsSection(requestedSettings);
    }
  }, [searchParams]);

  useEffect(() => {
    async function loadSession() {
      try {
        const response = await fetch("/api/auth/login");
        if (response.ok) {
          const data = (await response.json()) as { user?: SessionUser | null };
          setUser(data.user ?? null);
        }
      } finally {
        setAuthLoading(false);
      }
    }
    void loadSession();
  }, []);

  const refreshGoogleStatus = useCallback(async () => {
    if (!user) return;
    const response = await fetch("/api/integrations/google/status");
    if (response.ok) {
      const data = (await response.json()) as { connected?: boolean };
      setGoogleConnected(Boolean(data.connected));
    }
  }, [user]);

  useEffect(() => {
    void refreshGoogleStatus();
  }, [refreshGoogleStatus, googleConnectedParam]);

  const handleAnalysisComplete = useCallback((newTasks: Task[]) => {
    setAllClear(newTasks.length === 0);
    if (newTasks.length > 0) {
      setTasks((prev) => [...newTasks, ...prev]);
    }
    setTab("tasks");
  }, []);

  const handleTaskUpdate = useCallback((updated: Task) => {
    setTasks((prev) => prev.map((task) => (task.id === updated.id ? updated : task)));
  }, []);

  const handleOpenSettings = useCallback(() => {
    setReturnTab(tab === "settings" ? returnTab : tab);
    setSettingsSection("profile");
    setTab("settings");
  }, [tab, returnTab]);

  const toggleSidebar = useCallback(() => {
    setCollapsed((current) => {
      const next = !current;
      localStorage.setItem(SIDEBAR_COLLAPSED_KEY, String(next));
      return next;
    });
  }, []);

  const handleExitSettings = useCallback(() => {
    setTab(returnTab);
  }, [returnTab]);

  const handleSignOut = useCallback(async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    setUser(null);
    setGoogleConnected(false);
  }, []);

  if (authLoading) {
    return (
      <div className="flex h-full items-center justify-center bg-[var(--shell-bg)] text-[13px] text-zinc-500">
        Loading…
      </div>
    );
  }

  if (!user) {
    return <LoginView onLogin={setUser} />;
  }

  const profile = profileUserFromSession(user);

  const calendarEventCount = tasks.filter(
    (task) => task.integrations?.calendarEventId || task.proposedActions?.some(
      (action) => action.type === "calendar" && action.status === "done",
    ),
  ).length;

  return (
    <div className="flex h-full min-h-0 w-full min-w-0 gap-2 bg-[var(--shell-bg)] p-2">
      <aside
        className={`flex shrink-0 flex-col overflow-hidden rounded-2xl bg-[var(--background)] shadow-[0_0_0_0.5px_rgba(0,0,0,0.04),0_1px_3px_rgba(0,0,0,0.04)] transition-[width] duration-200 ease-out ${
          collapsed ? "w-[52px]" : "w-44"
        }`}
      >
        <div
          className={`border-b border-zinc-100 ${
            collapsed ? "px-1.5 py-2" : "px-2 py-2"
          }`}
        >
          {tab === "settings" ? (
            <button
              type="button"
              onClick={handleExitSettings}
              title="Home"
              aria-label="Home"
              className={`sidebar-nav-item btn-ghost focus-ring w-full text-zinc-600 hover:text-zinc-900 ${
                collapsed ? "justify-center p-1.5" : "gap-2 px-2 py-1.5"
              }`}
            >
              <BackIcon />
              {!collapsed && <span className="text-[12px] font-medium">Home</span>}
            </button>
          ) : (
            <ProfileMenu
              collapsed={collapsed}
              user={profile}
              onOpenSettings={handleOpenSettings}
              onSignOut={() => void handleSignOut()}
            />
          )}
        </div>

        <nav className="flex flex-1 flex-col gap-0.5 p-1.5">
          {tab === "settings" ? (
            <>
              {!collapsed ? (
                <div className="px-2 pb-1 pt-0.5">
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400">
                    Settings
                  </span>
                </div>
              ) : null}
              {SETTINGS_NAV.map((item) => {
                const active = settingsSection === item.id;

                return (
                  <button
                    key={item.id}
                    type="button"
                    title={collapsed ? item.label : undefined}
                    aria-label={item.label}
                    aria-current={active ? "page" : undefined}
                    onClick={() => setSettingsSection(item.id)}
                    className={`sidebar-nav-item btn-ghost focus-ring ${
                      collapsed ? "justify-center p-1.5" : "gap-2 px-2 py-1.5"
                    }`}
                    data-active={active ? "true" : undefined}
                  >
                    <span className={active ? "text-zinc-900" : "text-zinc-400"}>
                      {item.icon}
                    </span>
                    {!collapsed && <span>{item.label}</span>}
                  </button>
                );
              })}
            </>
          ) : (
            MAIN_NAV.map((item) => {
                const active = tab === item.id;
                const badge =
                  item.id === "tasks" && tasks.length > 0
                    ? tasks.length
                    : item.id === "calendar" && calendarEventCount > 0
                      ? calendarEventCount
                      : null;

                return (
                  <button
                    key={item.id}
                    type="button"
                    title={collapsed ? item.label : undefined}
                    aria-label={item.label}
                    aria-current={active ? "page" : undefined}
                    onClick={() => setTab(item.id)}
                    className={`sidebar-nav-item btn-ghost focus-ring relative ${
                      collapsed ? "justify-center p-1.5" : "gap-2 px-2 py-1.5"
                    }`}
                    data-active={active ? "true" : undefined}
                  >
                    <span className={active ? "text-zinc-900" : "text-zinc-400"}>
                      {item.icon}
                    </span>
                    {!collapsed && (
                      <>
                        <span>{item.label}</span>
                        {badge ? (
                          <span className="ml-auto text-[11px] tabular-nums text-zinc-400">
                            {badge}
                          </span>
                        ) : null}
                      </>
                    )}
                    {collapsed && badge ? (
                      <span className="absolute right-1.5 top-1.5 h-1.5 w-1.5 rounded-full bg-zinc-400" />
                    ) : null}
                  </button>
                );
              })
          )}
        </nav>

        <div className="border-t border-zinc-100 p-1.5">
          <button
            type="button"
            onClick={toggleSidebar}
            title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            className={`sidebar-nav-item btn-ghost focus-ring w-full ${
              collapsed ? "justify-center p-1.5" : "gap-2 px-2 py-1.5"
            } text-zinc-400 hover:text-zinc-600`}
          >
            <CollapseIcon collapsed={collapsed} />
            {!collapsed && <span className="text-[11px]">Collapse</span>}
          </button>
        </div>
      </aside>

      <main className="min-h-0 min-w-0 flex-1 overflow-hidden rounded-2xl bg-white shadow-[0_0_0_0.5px_rgba(0,0,0,0.04),0_1px_3px_rgba(0,0,0,0.04)]">
        <div className="h-full overflow-y-auto overscroll-contain px-4 py-4 md:px-5 md:py-5">
        {tab === "upload" ? (
          <UploadView userName={user.name} onAnalysisComplete={handleAnalysisComplete} />
        ) : tab === "tasks" ? (
          <TasksView
            tasks={tasks}
            allClear={allClear}
            googleConnected={googleConnected}
            onTaskUpdate={handleTaskUpdate}
          />
        ) : tab === "mail" ? (
          <GmailView googleConnected={googleConnected} />
        ) : tab === "calendar" ? (
          <CalendarView tasks={tasks} googleConnected={googleConnected} />
        ) : settingsSection === "integrations" ? (
          <SettingsView
            googleConnected={Boolean(googleConnectedParam)}
            googleError={googleErrorParam}
          />
        ) : (
          <ProfileSettingsView
            user={profile}
            email={user.email}
            onSignOut={() => void handleSignOut()}
          />
        )}
        </div>
      </main>
    </div>
  );
}
