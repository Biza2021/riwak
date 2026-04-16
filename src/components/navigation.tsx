import Link from "next/link";

import { Badge, Card } from "./ui";

type NavItem = {
  href: string;
  label: string;
  active?: boolean;
};

export function CustomerBottomNav({ items }: { items: NavItem[] }) {
  return (
    <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-[#e5d4bf] bg-[#fbf7f0]/95 px-3 pb-[calc(env(safe-area-inset-bottom)+0.75rem)] pt-2 backdrop-blur">
      <div className="mx-auto grid max-w-md grid-cols-4 gap-2">
        {items.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={`rounded-2xl px-2 py-2 text-center text-[0.78rem] font-semibold transition ${
              item.active
                ? "bg-[#8c6239] text-white"
                : "bg-white text-[#5c4637] shadow-sm"
            }`}
          >
            {item.label}
          </Link>
        ))}
      </div>
    </nav>
  );
}

export function StaffTopNav({ items }: { items: NavItem[] }) {
  return (
    <Card className="sticky top-3 z-20 mb-4 p-2">
      <div className="grid grid-cols-4 gap-2">
        {items.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={`rounded-2xl px-3 py-3 text-center text-sm font-semibold transition ${
              item.active
                ? "bg-[#2d1b12] text-white"
                : "bg-[#f3eadf] text-[#53402e]"
            }`}
          >
            {item.label}
          </Link>
        ))}
      </div>
    </Card>
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
