import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Cupa Mondiala 2026",
  description: "Pronosticuri Cupa Mondiala 2026",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ro">
      <body className="min-h-screen bg-slate-950 text-slate-100 antialiased">
        {children}
      </body>
    </html>
  );
}
