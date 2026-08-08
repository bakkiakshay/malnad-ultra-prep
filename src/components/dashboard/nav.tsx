"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { getDaysToRace } from "@/lib/config";

const links = [
  { href: "/", label: "Dashboard" },
  { href: "/log", label: "Log" },
  { href: "/plan", label: "Plan" },
];

export function Nav() {
  const pathname = usePathname();
  const days = getDaysToRace();

  return (
    <header className="border-b" style={{ borderColor: "#44403c", background: "#292524" }}>
      <div className="mx-auto flex h-14 max-w-6xl items-center gap-6 px-4">
        <Link href="/" className="font-bold tracking-tight" style={{ color: "#fbbf24" }}>
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
        <div className="ml-auto flex items-center gap-3">
          <span className="text-xs tabular-nums font-medium" style={{ color: "#fbbf24" }}>
            {days}d to race
          </span>
        </div>
      </div>
    </header>
  );
}
