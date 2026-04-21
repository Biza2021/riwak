"use client";

import { useEffect, useState, useTransition } from "react";

import { fr } from "@/content/fr";
import { requestCustomerStampAction } from "@/lib/actions";
import { formatDateTime } from "@/lib/format";
import { Card, Notice, PrimaryButton } from "./ui";

type PendingStampRequestState = {
  id: string;
  createdAt: string;
} | null;

export function CustomerStampRequestCard({
  initialPendingRequest,
}: {
  initialPendingRequest: PendingStampRequestState;
}) {
  const [pendingRequest, setPendingRequest] = useState(initialPendingRequest);
  const [feedback, setFeedback] = useState<{
    tone: "green" | "red";
    message: string;
  } | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    setPendingRequest(initialPendingRequest);
  }, [initialPendingRequest]);

  useEffect(() => {
    if (!feedback) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      setFeedback(null);
    }, 2500);

    return () => window.clearTimeout(timeoutId);
  }, [feedback]);

  function handleRequestStamp() {
    if (pendingRequest || isPending) {
      return;
    }

    setFeedback(null);

    startTransition(async () => {
      try {
        const result = await requestCustomerStampAction();

        if (!result.ok) {
          setFeedback({
            tone: "red",
            message:
              result.error === "NOT_FOUND"
                ? fr.errors.NOT_FOUND
                : fr.errors.UNKNOWN,
          });
          return;
        }

        setPendingRequest(result.request);
        setFeedback({
          tone: "green",
          message:
            result.status === "CREATED"
              ? fr.rewards.stampRequestSent
              : fr.rewards.stampRequestAlreadyPending,
        });
      } catch {
        setFeedback({
          tone: "red",
          message: fr.errors.UNKNOWN,
        });
      }
    });
  }

  return (
    <Card className="space-y-4 p-5">
      <div className="space-y-2">
        <p className="text-sm font-semibold text-[#8c6239]">
          {fr.rewards.stampRequestTitle}
        </p>
        <p className="text-sm leading-6 text-[#6d5644]">
          {fr.rewards.stampRequestBody}
        </p>
      </div>

      {pendingRequest ? (
        <Notice tone="blue">
          {fr.rewards.stampRequestPending(formatDateTime(pendingRequest.createdAt))}
        </Notice>
      ) : null}

      {feedback ? <Notice tone={feedback.tone}>{feedback.message}</Notice> : null}

      <PrimaryButton
        type="button"
        className="w-full"
        disabled={Boolean(pendingRequest) || isPending}
        onClick={handleRequestStamp}
      >
        <span className="inline-flex items-center gap-2">
          {isPending ? (
            <span
              aria-hidden="true"
              className="size-4 animate-spin rounded-full border-2 border-current border-r-transparent"
            />
          ) : null}
          <span>
            {pendingRequest
              ? fr.rewards.stampRequestSentLabel
              : isPending
                ? fr.common.loading
                : fr.rewards.stampRequestAction}
          </span>
        </span>
      </PrimaryButton>
    </Card>
  );
}
