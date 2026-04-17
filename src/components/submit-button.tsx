"use client";

import type { ButtonHTMLAttributes, ReactNode } from "react";
import { useFormStatus } from "react-dom";

import { fr } from "@/content/fr";
import { ButtonVariant, buttonClassName } from "./ui";

export function SubmitButton({
  children,
  className,
  variant = "primary",
  pendingLabel = fr.common.loading,
  disabled,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  children: ReactNode;
  variant?: ButtonVariant;
  pendingLabel?: string;
}) {
  const { pending } = useFormStatus();
  const isDisabled = disabled || pending;

  return (
    <button
      {...props}
      type={props.type ?? "submit"}
      disabled={isDisabled}
      aria-busy={pending}
      className={buttonClassName(variant, className)}
    >
      <span className="inline-flex items-center gap-2">
        {pending ? (
          <span
            aria-hidden="true"
            className="size-4 animate-spin rounded-full border-2 border-current border-r-transparent"
          />
        ) : null}
        <span>{pending ? pendingLabel : children}</span>
      </span>
    </button>
  );
}
