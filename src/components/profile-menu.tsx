"use client";

import { Menu } from "@base-ui-components/react/menu";
import { ChevronDown } from "lucide-react";

export const PROFILE_IMAGE_SRC = "/maddox.jpeg";

export type ProfileUser = {
  name: string;
  role: string;
  initials: string;
};

type ProfileMenuProps = {
  collapsed: boolean;
  user: ProfileUser;
  onOpenSettings?: () => void;
  onSignOut?: () => void;
};

export function ProfileMenu({ collapsed, user, onOpenSettings, onSignOut }: ProfileMenuProps) {
  return (
    <Menu.Root modal={false}>
      <Menu.Trigger
        title={collapsed ? user.name : undefined}
        className={`btn-ghost focus-ring group flex w-full items-center rounded-md hover:bg-black/[0.03] ${
          collapsed ? "justify-center p-1.5" : "gap-2 px-2 py-1.5"
        }`}
      >
        <ProfileAvatar alt={user.name} showStatus />
        {!collapsed && (
          <>
            <span className="min-w-0 flex-1 text-left">
              <span className="block truncate text-[12px] font-medium leading-tight text-zinc-900">
                {user.name}
              </span>
            </span>
            <ChevronDown
              size={12}
              strokeWidth={2}
              aria-hidden
              className="shrink-0 text-zinc-400 transition-transform duration-150 group-hover:text-zinc-500 group-data-[popup-open]:rotate-180"
            />
          </>
        )}
      </Menu.Trigger>

      <Menu.Portal>
        <Menu.Positioner side="bottom" align="start" sideOffset={6} className="z-50">
          <Menu.Popup className="min-w-[180px] origin-top-left rounded-xl border border-zinc-200/80 bg-white p-1 shadow-lg shadow-zinc-900/8 outline-none">
            <Menu.Group>
              <Menu.GroupLabel className="px-2.5 py-1.5 text-[11px] font-medium uppercase tracking-wide text-zinc-400">
                Account
              </Menu.GroupLabel>
              <MenuItem label="Settings" onClick={onOpenSettings}>
                Settings
              </MenuItem>
            </Menu.Group>
            <Menu.Separator className="my-1 h-px bg-zinc-100" />
            <MenuItem
              label="Sign out"
              onClick={onSignOut}
              className="text-red-600 data-highlighted:bg-red-50/70"
            >
              Sign out
            </MenuItem>
          </Menu.Popup>
        </Menu.Positioner>
      </Menu.Portal>
    </Menu.Root>
  );
}

function MenuItem({
  children,
  label,
  className = "",
  onClick,
}: {
  children: React.ReactNode;
  label: string;
  className?: string;
  onClick?: () => void;
}) {
  return (
    <Menu.Item
      label={label}
      onClick={onClick}
      className={`menu-item focus-ring rounded-md px-2 py-1 text-[12px] text-zinc-700 outline-none ${className}`}
    >
      {children}
    </Menu.Item>
  );
}

export function profileUserFromSession(user: { name: string; email: string }): ProfileUser {
  const parts = user.name.trim().split(/\s+/);
  const initials =
    parts.length >= 2
      ? `${parts[0][0] ?? ""}${parts[1][0] ?? ""}`.toUpperCase()
      : (user.name.slice(0, 2) || user.email.slice(0, 2)).toUpperCase();

  return {
    name: user.name,
    role: "Demo account",
    initials,
  };
}

export function ProfileAvatar({
  alt,
  size = "sm",
  showStatus = false,
}: {
  alt: string;
  size?: "sm" | "lg";
  showStatus?: boolean;
}) {
  const sizeClass = size === "lg" ? "h-12 w-12" : "h-6 w-6";

  return (
    <span
      className={`relative flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-zinc-100 ring-1 ring-zinc-200/80 ${sizeClass}`}
    >
      <img src={PROFILE_IMAGE_SRC} alt={alt} className="h-full w-full object-cover" />
      {showStatus ? (
        <span className="absolute -bottom-0.5 -right-0.5 h-2 w-2 rounded-full border-2 border-white bg-emerald-500" />
      ) : null}
    </span>
  );
}
