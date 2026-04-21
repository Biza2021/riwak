import { forwardRef, type InputHTMLAttributes, type ReactNode, type TextareaHTMLAttributes } from "react";

import { cn } from "@/lib/utils";

export type ButtonVariant = "primary" | "secondary";

export function Screen({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <main
      className={cn(
        "mx-auto flex min-h-dvh w-full max-w-3xl flex-1 flex-col px-4 pb-40 pt-5 sm:px-6",
        className,
      )}
    >
      {children}
    </main>
  );
}

export function Card({
  children,
  className,
  ...props
}: React.HTMLAttributes<HTMLElement> & {
  children: ReactNode;
}) {
  return (
    <section
      {...props}
      className={cn(
        "rounded-[1.5rem] border border-[#d6c3aa] bg-white/80 p-4 shadow-[0_12px_40px_rgba(88,62,33,0.08)] backdrop-blur",
        className,
      )}
    >
      {children}
    </section>
  );
}

export function SectionHeader({
  eyebrow,
  title,
  description,
  className,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  className?: string;
}) {
  return (
    <header className={cn("space-y-1.5", className)}>
      {eyebrow ? (
        <p className="text-[0.72rem] font-semibold uppercase tracking-[0.22em] text-[#8c6239]">
          {eyebrow}
        </p>
      ) : null}
      <h1 className="text-2xl font-semibold tracking-tight text-[#2d1b12]">
        {title}
      </h1>
      {description ? (
        <p className="text-sm leading-6 text-[#6d5644]">{description}</p>
      ) : null}
    </header>
  );
}

export function Badge({
  children,
  tone = "neutral",
  className,
}: {
  children: ReactNode;
  tone?: "neutral" | "gold" | "green" | "red" | "blue";
  className?: string;
}) {
  const tones: Record<typeof tone, string> = {
    neutral: "bg-[#f3eadf] text-[#5f4634]",
    gold: "bg-[#f8dca4] text-[#7a4d13]",
    green: "bg-[#d9f0d3] text-[#2f6f2e]",
    red: "bg-[#f7d4ce] text-[#8b2a1b]",
    blue: "bg-[#d9e6fb] text-[#224a84]",
  } as const;

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold",
        tones[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}

export function PrimaryButton({
  children,
  className,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      {...props}
      className={buttonClassName("primary", className)}
    >
      {children}
    </button>
  );
}

export function SecondaryButton({
  children,
  className,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      {...props}
      className={buttonClassName("secondary", className)}
    >
      {children}
    </button>
  );
}

export function buttonClassName(variant: ButtonVariant, className?: string) {
  const styles: Record<ButtonVariant, string> = {
    primary:
      "inline-flex min-h-12 appearance-none select-none items-center justify-center rounded-full bg-[#8c6239] px-4 text-sm font-semibold text-white shadow-sm outline-none transition [webkit-tap-highlight-color:transparent] active:scale-[0.99] active:bg-[#76502d] focus-visible:ring-2 focus-visible:ring-[#d8b36f]/30 disabled:cursor-not-allowed disabled:bg-[#8c6239] disabled:text-white disabled:opacity-70 disabled:shadow-none",
    secondary:
      "inline-flex min-h-12 appearance-none select-none items-center justify-center rounded-full border border-[#d7c0a7] bg-white px-4 text-sm font-semibold text-[#4a3323] shadow-sm outline-none transition [webkit-tap-highlight-color:transparent] active:scale-[0.99] active:bg-[#f3eadf] focus-visible:ring-2 focus-visible:ring-[#d8b36f]/30 disabled:cursor-not-allowed disabled:border-[#d7c0a7] disabled:bg-white disabled:text-[#4a3323] disabled:opacity-70 disabled:shadow-none",
  };

  return cn(styles[variant], className);
}

export const TextField = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  function TextField({ className, ...props }, ref) {
    return (
      <input
        {...props}
        ref={ref}
        className={cn(
          "min-h-12 w-full rounded-2xl border border-[#dcc6ad] bg-white px-4 text-sm text-[#2d1b12] outline-none placeholder:text-[#a28770] focus:border-[#8c6239] focus:ring-2 focus:ring-[#d8b36f]/30",
          className,
        )}
      />
    );
  },
);

TextField.displayName = "TextField";

export function TextAreaField({
  className,
  ...props
}: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      {...props}
      className={cn(
        "min-h-28 w-full rounded-2xl border border-[#dcc6ad] bg-white px-4 py-3 text-sm text-[#2d1b12] outline-none placeholder:text-[#a28770] focus:border-[#8c6239] focus:ring-2 focus:ring-[#d8b36f]/30",
        className,
      )}
    />
  );
}

export function SelectField({
  className,
  ...props
}: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      {...props}
      className={cn(
        "min-h-12 w-full rounded-2xl border border-[#dcc6ad] bg-white px-4 text-sm text-[#2d1b12] outline-none focus:border-[#8c6239] focus:ring-2 focus:ring-[#d8b36f]/30",
        className,
      )}
    />
  );
}

export function FieldLabel({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <label className="mb-1.5 block text-sm font-semibold text-[#533728]">
      {children}
    </label>
  );
}

export function FieldHint({
  children,
}: {
  children: ReactNode;
}) {
  return <p className="mt-1.5 text-xs leading-5 text-[#7c6654]">{children}</p>;
}

export function Notice({
  tone = "neutral",
  title,
  children,
}: {
  tone?: "neutral" | "gold" | "green" | "red" | "blue";
  title?: string;
  children: ReactNode;
}) {
  const tones: Record<typeof tone, string> = {
    neutral: "bg-[#f7f1e7] text-[#53402e]",
    gold: "bg-[#fff1cc] text-[#7d560d]",
    green: "bg-[#e4f4db] text-[#2d5d2b]",
    red: "bg-[#fae0dc] text-[#8c2c20]",
    blue: "bg-[#dbe7fb] text-[#234674]",
  } as const;

  return (
    <div className={cn("rounded-2xl px-4 py-3 text-sm", tones[tone])}>
      {title ? <p className="mb-1 font-semibold">{title}</p> : null}
      <div className="leading-6">{children}</div>
    </div>
  );
}

export function MetricCard({
  title,
  value,
  detail,
  tone = "neutral",
}: {
  title: string;
  value: ReactNode;
  detail?: string;
  tone?: "neutral" | "gold" | "green" | "red" | "blue";
}) {
  const tones: Record<typeof tone, string> = {
    neutral: "bg-[#fffaf2]",
    gold: "bg-[#fff3d6]",
    green: "bg-[#eef9ea]",
    red: "bg-[#faece8]",
    blue: "bg-[#eef4ff]",
  } as const;

  return (
    <Card className={cn("p-4", tones[tone])}>
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#8b6b4c]">
        {title}
      </p>
      <p className="mt-2 text-2xl font-semibold text-[#2d1b12]">{value}</p>
      {detail ? <p className="mt-1 text-sm text-[#6d5644]">{detail}</p> : null}
    </Card>
  );
}

export function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <Card className="p-6 text-center">
      <p className="text-base font-semibold text-[#2d1b12]">{title}</p>
      {description ? (
        <p className="mt-2 text-sm leading-6 text-[#6d5644]">{description}</p>
      ) : null}
      {action ? <div className="mt-4 flex justify-center">{action}</div> : null}
    </Card>
  );
}
