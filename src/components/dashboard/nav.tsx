"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { RACE } from "@/lib/config";

const links = [
  { href: "/", label: "Dashboard" },
  { href: "/log", label: "Log" },
  { href: "/plan", label: "Plan" },
];

function useCountdown() {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  const race = new Date(RACE.date + "T06:00:00+05:30");
  const diff = Math.max(0, race.getTime() - now.getTime());

  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((diff % (1000 * 60)) / 1000);

  return { days, hours, minutes, seconds };
}

export function Nav() {
  const pathname = usePathname();
  const { days, hours, minutes, seconds } = useCountdown();

  return (
    <header className="border-b" style={{ borderColor: "#44403c", background: "#292524" }}>
      <div className="mx-auto flex h-14 max-w-6xl items-center gap-6 px-4">
        <Link href="/" className="font-bold tracking-tight font-heading" style={{ color: "#fbbf24" }}>
          Malnad Ultra Prep
        </Link>
        <nav className="flex gap-1">
          {links.map((link) => {
            const active =
              link.href === "/"
                ? pathname === "/"
                : pathname.startsWith(link.href);
            return (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  "rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
                  active
                    ? "text-[#1c1917]"
                    : "text-[#a8a29e] hover:text-[#e7e5e4] hover:bg-[#44403c]"
                )}
                style={active ? { background: "#fbbf24" } : undefined}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>
        <div className="ml-auto flex items-center gap-1 tabular-nums" style={{ color: "#fbbf24" }}>
          <span className="text-lg font-bold">{days}</span>
          <span className="text-[10px] text-muted-foreground mr-1">d</span>
          <span className="text-sm font-semibold">{String(hours).padStart(2, "0")}</span>
          <span className="text-[10px] text-muted-foreground">h</span>
          <span className="text-sm font-semibold">{String(minutes).padStart(2, "0")}</span>
          <span className="text-[10px] text-muted-foreground">m</span>
          <span className="text-sm font-semibold">{String(seconds).padStart(2, "0")}</span>
          <span className="text-[10px] text-muted-foreground">s</span>
        </div>
      </div>
    </header>
  );
}
