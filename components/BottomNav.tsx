"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { href: "/clasament", label: "Clasament", icon: "🏆" },
  { href: "/pronosticuri", label: "Pronosticuri", icon: "⚽" },
  { href: "/meciuri", label: "Meciuri", icon: "📅" },
  { href: "/profil", label: "Profil", icon: "👤" },
];

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-slate-900 border-t border-slate-800 z-50">
      <ul className="flex justify-around items-center">
        {TABS.map((tab) => {
          const active = pathname.startsWith(tab.href);
          return (
            <li key={tab.href} className="flex-1">
              <Link
                href={tab.href}
                className={`flex flex-col items-center py-2 ${
                  active ? "text-green-400" : "text-slate-400"
                }`}
              >
                <span className="text-xl">{tab.icon}</span>
                <span className="text-xs mt-1">{tab.label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
