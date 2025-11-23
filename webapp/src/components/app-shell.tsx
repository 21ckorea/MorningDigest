"use client";

import {
  LayoutDashboard,
  Menu,
  Settings,
  Tags,
  UserCircle,
  Users,
} from "lucide-react";
import Link from "next/link";
import { signIn, signOut, useSession } from "next-auth/react";
import { usePathname } from "next/navigation";
import { ReactNode, useMemo, useState } from "react";

import { cn } from "@/lib/utils";

const baseNavItems = [
  { label: "대시보드", href: "/dashboard", icon: LayoutDashboard },
  { label: "키워드", href: "/keywords", icon: Tags },
  { label: "설정", href: "/settings", icon: Settings },
];

interface AppShellProps {
  title: string;
  description?: string;
  action?: ReactNode;
  children: ReactNode;
}

export function AppShell({ title, description, action, children }: AppShellProps) {
  const pathname = usePathname();
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);
  const { data: session, status } = useSession();
  const user = session?.user;

  const userLabel = useMemo(() => {
    if (user?.name) return user.name;
    if (user?.email) return user.email;
    return "내 계정";
  }, [user?.name, user?.email]);

  const handleLogin = () => {
    void signIn("google", { callbackUrl: "/dashboard" });
  };

  const handleLogout = () => {
    void signOut({ callbackUrl: "/" });
  };

  const navItems = useMemo(() => {
    if (user?.role === "admin") {
      return [...baseNavItems, { label: "회원 관리", href: "/admin/users", icon: Users }];
    }
    return baseNavItems;
  }, [user?.role]);

  return (
    <div className="flex min-h-screen bg-slate-50">
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-30 w-64 border-r border-slate-200 bg-white p-6 transition-transform lg:static lg:translate-x-0",
          isMobileNavOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        )}
      >
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-400">
              Morning
            </p>
            <p className="text-2xl font-bold">Digest</p>
          </div>
          <button
            className="rounded border border-slate-200 p-1 lg:hidden"
            onClick={() => setIsMobileNavOpen(false)}
          >
            ✕
          </button>
        </div>
        <nav className="mt-8 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium",
                  isActive
                    ? "bg-slate-900 text-white"
                    : "text-slate-600 hover:bg-slate-100"
                )}
                onClick={() => setIsMobileNavOpen(false)}
              >
                <Icon className="h-4 w-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="mt-10 rounded-lg border border-slate-200 bg-slate-50 p-4 text-xs text-slate-600">
          <p className="font-semibold text-slate-900">무료 플랜</p>
          <p className="mt-1">월 3,000건 이메일 한도를 초과하면 업그레이드가 필요합니다.</p>
        </div>
      </aside>

      <div className="flex flex-1 flex-col">
        <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/90 px-4 py-3 backdrop-blur lg:px-8">
          <div className="flex items-center justify-between gap-3">
            <button
              className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 lg:hidden"
              onClick={() => setIsMobileNavOpen((prev) => !prev)}
            >
              <Menu className="h-4 w-4" /> 메뉴
            </button>
            <div className="flex flex-1 flex-col">
              <h1 className="text-xl font-semibold text-slate-900 lg:text-2xl">
                {title}
              </h1>
              {description ? (
                <p className="text-sm text-slate-500">{description}</p>
              ) : null}
            </div>
            <div className="flex items-center gap-3">
              {action}
              {status === "loading" ? (
                <div className="animate-pulse rounded-full border border-slate-200 bg-white px-3 py-2 text-sm text-slate-500">
                  계정 확인 중...
                </div>
              ) : user ? (
                <div className="flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-2 text-sm">
                  <UserCircle className="h-4 w-4 text-slate-500" />
                  <span className="font-medium text-slate-800">{userLabel}</span>
                  <button
                    onClick={handleLogout}
                    className="rounded-full bg-slate-900 px-2 py-1 text-xs font-semibold text-white"
                  >
                    로그아웃
                  </button>
                </div>
              ) : (
                <button
                  onClick={handleLogin}
                  className="flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700"
                >
                  <UserCircle className="h-4 w-4" />
                  Google 로그인
                </button>
              )}
            </div>
          </div>
        </header>
        <main className="flex-1 px-4 py-6 lg:px-8 lg:py-10">{children}</main>
      </div>
    </div>
  );
}
