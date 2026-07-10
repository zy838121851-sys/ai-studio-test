import { useEffect, useRef, useState } from "react";
import type { SessionDto } from "@ai-studio/contracts";
import { ChevronDown, FolderKanban, Gem, Home, LayoutGrid, LogOut, Sparkles } from "lucide-react";

interface HomeHeaderProps {
  session: SessionDto | null | undefined;
  onOpenAuth: () => void;
  onLogout: () => void;
}

export function HomeHeader({ session, onOpenAuth, onLogout }: HomeHeaderProps) {
  const [accountOpen, setAccountOpen] = useState(false);
  const accountRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!accountOpen) return;
    const close = (event: PointerEvent) => {
      if (!accountRef.current?.contains(event.target as Node)) setAccountOpen(false);
    };
    window.addEventListener("pointerdown", close);
    return () => window.removeEventListener("pointerdown", close);
  }, [accountOpen]);

  return (
    <header className="home-header">
      <a className="home-brand" href="/" aria-label="AI Studio 首页">
        <span className="home-brand__mark">D</span>
      </a>

      <div className="home-account" ref={accountRef}>
        {session ? (
          <>
            <span className="credit-pill" title="可用积分">
              <Gem className="ui-icon" size={16} strokeWidth={2} aria-hidden="true" />
              {session.credits.available}
            </span>
            <button
              className="account-trigger"
              type="button"
              aria-label="账户菜单"
              aria-expanded={accountOpen}
              aria-haspopup="menu"
              onClick={() => setAccountOpen((value) => !value)}
            >
              <span className="account-trigger__avatar">
                {session.user.displayName.slice(0, 1).toUpperCase()}
              </span>
              <span className="account-trigger__name">{session.user.displayName}</span>
              <ChevronDown className="ui-icon" size={16} strokeWidth={2} aria-hidden="true" />
            </button>
            {accountOpen ? (
              <div className="account-menu" role="menu">
                <div className="account-menu__identity">
                  <strong>{session.user.displayName}</strong>
                  <span>{session.user.email}</span>
                </div>
                <div className="account-menu__balance">
                  <span>积分余额</span>
                  <strong>{session.credits.balance}</strong>
                </div>
                <button type="button" role="menuitem" onClick={onLogout}>
                  <LogOut className="ui-icon" size={16} strokeWidth={2} aria-hidden="true" />
                  退出登录
                </button>
              </div>
            ) : null}
          </>
        ) : (
          <button className="auth-entry" type="button" onClick={onOpenAuth}>
            登录
          </button>
        )}
      </div>
    </header>
  );
}

export function HomeSideRail() {
  return (
    <nav className="home-side-rail" aria-label="工作区导航">
      <a className="is-active" href="#create" title="首页" aria-label="首页">
        <Home className="ui-icon" size={20} strokeWidth={2} aria-hidden="true" />
      </a>
      <a href="#projects" title="项目" aria-label="项目">
        <FolderKanban className="ui-icon" size={20} strokeWidth={2} aria-hidden="true" />
      </a>
      <a href="#inspiration" title="灵感" aria-label="灵感">
        <Sparkles className="ui-icon" size={20} strokeWidth={2} aria-hidden="true" />
      </a>
      <a href="#inspiration" title="频道" aria-label="频道">
        <LayoutGrid className="ui-icon" size={20} strokeWidth={2} aria-hidden="true" />
      </a>
    </nav>
  );
}
