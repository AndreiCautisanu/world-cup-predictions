"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { href: "/clasament", label: "Clasament", icon: TrophyIcon },
  { href: "/pronosticuri", label: "Pronosticuri", icon: BallIcon },
  { href: "/meciuri", label: "Meciuri", icon: CalendarIcon },
  { href: "/profil", label: "Profil", icon: UserIcon },
];

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-slate-800/80 bg-slate-950/85 backdrop-blur supports-[backdrop-filter]:bg-slate-950/70">
      <ul className="mx-auto flex max-w-3xl justify-around">
        {TABS.map((tab) => {
          const active = pathname.startsWith(tab.href);
          const Icon = tab.icon;
          return (
            <li key={tab.href} className="flex-1">
              <Link
                href={tab.href}
                className={`group relative flex flex-col items-center gap-1 py-2.5 transition ${
                  active ? "text-emerald-300" : "text-slate-500 hover:text-slate-300"
                }`}
              >
                <span
                  aria-hidden
                  className={`absolute inset-x-6 top-0 h-[2px] rounded-full transition ${
                    active ? "bg-emerald-400" : "bg-transparent"
                  }`}
                />
                <Icon active={active} />
                <span className="text-[10px] font-semibold uppercase tracking-[0.16em]">
                  {tab.label}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

type IconProps = { active: boolean };

function TrophyIcon({ active }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden className="h-5 w-5 fill-current">
      <path d="M19 5h-2V3H7v2H5a2 2 0 0 0-2 2v2a4 4 0 0 0 4 4 5 5 0 0 0 4 4v2H8v2h8v-2h-3v-2a5 5 0 0 0 4-4 4 4 0 0 0 4-4V7a2 2 0 0 0-2-2ZM5 9V7h2v4a2 2 0 0 1-2-2Zm14 0a2 2 0 0 1-2 2V7h2v2Z" opacity={active ? 1 : 0.85} />
    </svg>
  );
}

function BallIcon({ active }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden className="h-5 w-5 fill-current">
      <path d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20Zm0 2c1.13 0 2.21.21 3.2.6L12 6 8.8 4.6A8 8 0 0 1 12 4Zm-5.6 1.86 3.3 1.43.6 3.5L8 13.6l-3.6-.8a8 8 0 0 1 2-7Zm0 12.28a8 8 0 0 1-2-5.04l3.1.69 2 2.65L8.4 18.4l-2 -.26Zm5.6 1.86c-1.13 0-2.21-.21-3.2-.6l.4-2.6h5.6l.4 2.6a8 8 0 0 1-3.2.6Zm5.6-1.86-2-.26-1.1-2.66 2-2.65 3.1-.69a8 8 0 0 1-2 6.26Zm.5-8.34L15 13.6l-2.3-2.81.6-3.5 3.3-1.43a8 8 0 0 1 2.5 5.84Z" opacity={active ? 1 : 0.85} />
    </svg>
  );
}

function CalendarIcon({ active }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden className="h-5 w-5 fill-current">
      <path d="M7 2v2H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2h-2V2h-2v2H9V2H7Zm-2 8h14v10H5V10Z" opacity={active ? 1 : 0.85} />
    </svg>
  );
}

function UserIcon({ active }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden className="h-5 w-5 fill-current">
      <path d="M12 12a5 5 0 1 0 0-10 5 5 0 0 0 0 10Zm0 2c-4.42 0-8 2.69-8 6v2h16v-2c0-3.31-3.58-6-8-6Z" opacity={active ? 1 : 0.85} />
    </svg>
  );
}
