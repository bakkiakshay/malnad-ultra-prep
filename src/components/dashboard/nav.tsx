"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const links = [
  { href: "/", label: "Dashboard" },
  { href: "/log", label: "Log" },
  { href: "/plan", label: "Plan" },
];

export function Nav() {
  const pathname = usePathname();

  return (
    <header className="border-b border-border bg-card">
      <div className="mx-auto flex h-14 max-w-6xl items-center gap-6 px-4">
        <Link href="/" className="font-semibold tracking-tight text-foreground">
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
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                )}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>
        <div className="ml-auto text-xs text-muted-foreground">
          Akshay&apos;s Training
        </div>
      </div>
    </header>
  );
}
