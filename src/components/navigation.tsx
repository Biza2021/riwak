import Link from "next/link";

import { Badge } from "./ui";

type NavItem = {
  href: string;
  label: string;
  active?: boolean;
};

export function CustomerBottomNav({ items }: { items: NavItem[] }) {
  return (
    <nav className="fixed inset-x-0 bottom-3 z-30 px-3 pb-[env(safe-area-inset-bottom)]">
      <div className="mx-auto max-w-md rounded-[1.65rem] border border-[#e5d4bf] bg-[#fbf7f0]/96 p-2 shadow-[0_18px_40px_rgba(66,45,27,0.16)] backdrop-blur">
        <div className="grid grid-cols-4 gap-2">
          {items.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`flex min-h-14 items-center justify-center rounded-2xl px-2 py-3 text-center text-[0.82rem] font-semibold transition ${
                item.active
                  ? "bg-[#8c6239] text-white shadow-[0_10px_24px_rgba(140,98,57,0.28)]"
                  : "bg-white text-[#5c4637] shadow-sm"
              }`}
            >
              <span className="block whitespace-nowrap">{item.label}</span>
            </Link>
          ))}
        </div>
      </div>
    </nav>
  );
}

export function StaffTopNav({ items }: { items: NavItem[] }) {
  return (
    <nav className="fixed inset-x-0 bottom-3 z-30 px-3 pb-[env(safe-area-inset-bottom)]">
      <div className="mx-auto max-w-md rounded-[1.65rem] border border-[#d8c4ad] bg-[#fff8ef]/96 p-2 shadow-[0_18px_40px_rgba(45,27,18,0.18)] backdrop-blur">
        <div
          className="grid gap-2"
          style={{ gridTemplateColumns: `repeat(${items.length}, minmax(0, 1fr))` }}
        >
          {items.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`flex min-h-14 items-center justify-center rounded-2xl px-3 py-3 text-center text-sm font-semibold transition ${
                item.active
                  ? "bg-[#7b5637] text-[#fffaf4] shadow-[0_10px_24px_rgba(123,86,55,0.22)]"
                  : "bg-[#f3eadf] text-[#53402e]"
              }`}
            >
              <span className="block whitespace-nowrap">{item.label}</span>
            </Link>
          ))}
        </div>
      </div>
    </nav>
  );
}

export function TrustBadge({
  label,
  tone,
}: {
  label: string;
  tone: "neutral" | "gold" | "green" | "red" | "blue";
}) {
  return <Badge tone={tone}>{label}</Badge>;
}
