"use client";

import type { ReactNode } from "react";
import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  Calendar,
  Glasses,
  LayoutDashboard,
  MessageCircle,
  PanelLeftClose,
  PanelLeftOpen,
  Send,
  Ticket,
  Truck,
  Upload,
  User,
} from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { GmailView } from "@/components/gmail-view";
import { CalendarView } from "@/components/calendar-view";
import { UploadView } from "@/components/upload-view";
import { TasksView } from "@/components/tasks-view";
import { SettingsView } from "@/components/settings-view";
import { ProfileSettingsView } from "@/components/profile-settings-view";
import { LoginView } from "@/components/login-view";
import { ProfileMenu, profileUserFromSession } from "@/components/profile-menu";
import { DeviceView } from "@/components/device-view";
import { type Task } from "@/lib/tasks";

type MainTab =
  | "upload"
  | "device"
  | "tasks"
  | "mail"
  | "calendar"
  | "workspace"
  | "messaging"
  | "suppliers";
type SettingsSection = "profile";
type Tab = MainTab | "settings";

type SessionUser = {
  id: string;
  email: string;
  name: string;
};

const NAV_ICON = { size: 14, strokeWidth: 1.75, "aria-hidden": true as const };

const CORE_NAV: { id: MainTab; label: string; icon: ReactNode }[] = [
  { id: "upload", label: "Upload", icon: <Upload {...NAV_ICON} /> },
  { id: "device", label: "Device", icon: <Glasses {...NAV_ICON} /> },
  { id: "tasks", label: "Tasks", icon: <Ticket {...NAV_ICON} /> },
  { id: "calendar", label: "Calendar", icon: <Calendar {...NAV_ICON} /> },
  { id: "mail", label: "Mail", icon: <Send {...NAV_ICON} /> },
];

const INTEGRATIONS_NAV: { id: MainTab; label: string; icon: ReactNode }[] = [
  { id: "workspace", label: "Workspace", icon: <LayoutDashboard {...NAV_ICON} /> },
  { id: "messaging", label: "Messaging", icon: <MessageCircle {...NAV_ICON} /> },
  { id: "suppliers", label: "Suppliers", icon: <Truck {...NAV_ICON} /> },
];

const SETTINGS_NAV: { id: SettingsSection; label: string; icon: ReactNode }[] = [
  { id: "profile", label: "Profile", icon: <User {...NAV_ICON} /> },
];

const SIDEBAR_COLLAPSED_KEY = "sidebar-collapsed";

const MAIN_TABS: MainTab[] = [
  "upload",
  "device",
  "tasks",
  "mail",
  "calendar",
  "workspace",
  "messaging",
  "suppliers",
];

function isMainTab(value: string): value is MainTab {
  return MAIN_TABS.includes(value as MainTab);
}

function resolveTab(params: Pick<URLSearchParams, "get">): Tab {
  const tab = params.get("tab");
  const settings = params.get("settings");

  if (tab === "settings") return "settings";
  if (tab && isMainTab(tab)) return tab;
  if (settings === "profile") return "settings";
  if (settings === "integrations") return "workspace";
  if (settings === "workspace" || settings === "messaging" || settings === "suppliers") {
    return settings;
  }
  return "upload";
}

function buildTabHref(tab: Tab, settingsSection: SettingsSection = "profile"): string {
  if (tab === "settings") {
    return `/?tab=settings&settings=${settingsSection}`;
  }
  return `/?tab=${tab}`;
}

function readSidebarCollapsed(): boolean {
  if (typeof window === "undefined") return false;
  return localStorage.getItem(SIDEBAR_COLLAPSED_KEY) === "true";
}

export function AppShell() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [allClear, setAllClear] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [user, setUser] = useState<SessionUser | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [googleConnected, setGoogleConnected] = useState(false);

  useEffect(() => {
    setCollapsed(readSidebarCollapsed());
  }, []);

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
  }, [refreshGoogleStatus]);

  const handleAnalysisComplete = useCallback((newTasks: Task[]) => {
    setTasks((prev) => {
      const next = newTasks.length > 0 ? [...newTasks, ...prev] : prev;
      setAllClear(next.length === 0);
      return next;
    });
  }, []);

  const handleTaskUpdate = useCallback((updated: Task) => {
    setTasks((prev) => prev.map((task) => (task.id === updated.id ? updated : task)));
  }, []);

  const handleSignOut = useCallback(async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    setUser(null);
    setGoogleConnected(false);
    setTasks([]);
    setAllClear(false);
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

  return (
    <Suspense
      fallback={
        <div className="flex h-full items-center justify-center bg-[var(--shell-bg)] text-[13px] text-zinc-500">
          Loading…
        </div>
      }
    >
      <AppShellLayout
        user={user}
        tasks={tasks}
        allClear={allClear}
        collapsed={collapsed}
        googleConnected={googleConnected}
        onCollapsedChange={setCollapsed}
        onAnalysisComplete={handleAnalysisComplete}
        onTaskUpdate={handleTaskUpdate}
        onSignOut={() => void handleSignOut()}
        onGoogleStatusRefresh={refreshGoogleStatus}
      />
    </Suspense>
  );
}

type AppShellLayoutProps = {
  user: SessionUser;
  tasks: Task[];
  allClear: boolean;
  collapsed: boolean;
  googleConnected: boolean;
  onCollapsedChange: (collapsed: boolean) => void;
  onAnalysisComplete: (tasks: Task[]) => void;
  onTaskUpdate: (task: Task) => void;
  onSignOut: () => void;
  onGoogleStatusRefresh: () => void;
};

function AppShellLayout({
  user,
  tasks,
  allClear,
  collapsed,
  googleConnected,
  onCollapsedChange,
  onAnalysisComplete,
  onTaskUpdate,
  onSignOut,
  onGoogleStatusRefresh,
}: AppShellLayoutProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const tab = useMemo(() => resolveTab(searchParams), [searchParams]);
  const settingsSection: SettingsSection = "profile";
  const [returnTab, setReturnTab] = useState<MainTab>("upload");

  const googleConnectedParam = searchParams.get("google_connected");
  const googleErrorParam = searchParams.get("google_error");

  const navigateToTab = useCallback(
    (next: Tab, options?: { settings?: SettingsSection; keepOAuth?: boolean }) => {
      const params = new URLSearchParams(
        buildTabHref(next, options?.settings ?? "profile").slice(2),
      );

      if (options?.keepOAuth) {
        if (searchParams.get("google_connected")) {
          params.set("google_connected", "1");
        }
        const googleError = searchParams.get("google_error");
        if (googleError) {
          params.set("google_error", googleError);
        }
      }

      router.replace(`/?${params.toString()}`);
    },
    [router, searchParams],
  );

  useEffect(() => {
    const tabParam = searchParams.get("tab");
    const settingsParam = searchParams.get("settings");

    if (settingsParam === "integrations" && tabParam !== "workspace") {
      navigateToTab("workspace", { keepOAuth: true });
      return;
    }

    if (settingsParam === "profile" && tabParam !== "settings") {
      if (tabParam && isMainTab(tabParam)) {
        navigateToTab(tabParam);
        return;
      }
      navigateToTab("settings", { settings: "profile" });
      return;
    }

    if (
      (settingsParam === "workspace" ||
        settingsParam === "messaging" ||
        settingsParam === "suppliers") &&
      tabParam !== settingsParam
    ) {
      navigateToTab(settingsParam, { keepOAuth: true });
    }
  }, [navigateToTab, searchParams]);

  useEffect(() => {
    onGoogleStatusRefresh();
  }, [googleConnectedParam, onGoogleStatusRefresh]);

  const handlePipelineComplete = useCallback(
    (newTasks: Task[]) => {
      onAnalysisComplete(newTasks);
      navigateToTab("tasks");
    },
    [navigateToTab, onAnalysisComplete],
  );

  const handleOpenSettings = useCallback(() => {
    if (tab !== "settings" && isMainTab(tab)) {
      setReturnTab(tab);
    }
    navigateToTab("settings", { settings: "profile" });
  }, [navigateToTab, tab]);

  const toggleSidebar = useCallback(() => {
    onCollapsedChange(!collapsed);
    localStorage.setItem(SIDEBAR_COLLAPSED_KEY, String(!collapsed));
  }, [collapsed, onCollapsedChange]);

  const handleExitSettings = useCallback(() => {
    navigateToTab(returnTab);
  }, [navigateToTab, returnTab]);

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
              <ArrowLeft {...NAV_ICON} />
              {!collapsed && <span className="text-[12px] font-medium">Home</span>}
            </button>
          ) : (
            <ProfileMenu
              collapsed={collapsed}
              user={profile}
              onOpenSettings={handleOpenSettings}
              onSignOut={onSignOut}
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
                    onClick={() => navigateToTab("settings", { settings: item.id })}
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
            <>
              {CORE_NAV.map((item) => {
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
                    onClick={() => navigateToTab(item.id)}
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
              })}

              {!collapsed ? (
                <div className="px-2 pb-1 pt-2">
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400">
                    Integrations
                  </span>
                </div>
              ) : (
                <div className="mx-2 my-1 border-t border-zinc-100" aria-hidden />
              )}

              {INTEGRATIONS_NAV.map((item) => {
                const active = tab === item.id;

                return (
                  <button
                    key={item.id}
                    type="button"
                    title={collapsed ? item.label : undefined}
                    aria-label={item.label}
                    aria-current={active ? "page" : undefined}
                    onClick={() => navigateToTab(item.id)}
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
            {collapsed ? (
              <PanelLeftOpen {...NAV_ICON} />
            ) : (
              <PanelLeftClose {...NAV_ICON} />
            )}
            {!collapsed && <span className="text-[11px]">Collapse</span>}
          </button>
        </div>
      </aside>

      <main className="min-h-0 min-w-0 flex-1 overflow-hidden rounded-2xl bg-white shadow-[0_0_0_0.5px_rgba(0,0,0,0.04),0_1px_3px_rgba(0,0,0,0.04)]">
        <div className="h-full overflow-y-auto overscroll-contain px-4 py-4 md:px-5 md:py-5">
        {tab === "upload" ? (
          <UploadView userName={user.name} onAnalysisComplete={handlePipelineComplete} />
        ) : tab === "device" ? (
          <DeviceView onAnalysisComplete={handlePipelineComplete} />
        ) : tab === "tasks" ? (
          <TasksView
            tasks={tasks}
            allClear={allClear}
            googleConnected={googleConnected}
            onTaskUpdate={onTaskUpdate}
          />
        ) : tab === "mail" ? (
          <GmailView googleConnected={googleConnected} />
        ) : tab === "calendar" ? (
          <CalendarView tasks={tasks} googleConnected={googleConnected} />
        ) : tab === "workspace" ? (
          <SettingsView
            section="workspace"
            googleConnected={Boolean(googleConnectedParam)}
            googleError={googleErrorParam}
          />
        ) : tab === "messaging" ? (
          <SettingsView section="messaging" />
        ) : tab === "suppliers" ? (
          <SettingsView section="suppliers" />
        ) : (
          <ProfileSettingsView
            user={profile}
            email={user.email}
            onSignOut={onSignOut}
          />
        )}
        </div>
      </main>
    </div>
  );
}
