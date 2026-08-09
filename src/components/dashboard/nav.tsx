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

function FlipUnit({ value, label }: { value: number; label: string }) {
  const display = String(value).padStart(label === "DAYS" ? 3 : 2, "0");

  return (
    <div className="flex flex-col items-center">
      <div
        className="relative overflow-hidden rounded-md"
        style={{
          background: "linear-gradient(to bottom, #3a3532 0%, #3a3532 49.5%, #44403c 49.5%, #44403c 50.5%, #2c2825 50.5%, #2c2825 100%)",
          boxShadow: "0 2px 6px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.06)",
        }}
      >
        <span
          className="block px-2 py-1 text-xl font-bold tabular-nums leading-none font-heading"
          style={{ color: "#fbbf24", textShadow: "0 1px 2px rgba(0,0,0,0.5)" }}
        >
          {display}
        </span>
      </div>
      <span
        className="mt-0.5 text-[7px] font-semibold uppercase tracking-widest"
        style={{ color: "#78716c" }}
      >
        {label}
      </span>
    </div>
  );
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
        <div className="ml-auto flex items-center gap-1.5">
          <FlipUnit value={days} label="DAYS" />
          <span className="text-sm font-bold pb-3" style={{ color: "#fbbf24" }}>:</span>
          <FlipUnit value={hours} label="HRS" />
          <span className="text-sm font-bold pb-3" style={{ color: "#fbbf24" }}>:</span>
          <FlipUnit value={minutes} label="MIN" />
          <span className="text-sm font-bold pb-3" style={{ color: "#fbbf24" }}>:</span>
          <FlipUnit value={seconds} label="SEC" />
        </div>
      </div>
    </header>
  );
}
