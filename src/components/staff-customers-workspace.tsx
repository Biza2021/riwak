"use client";

import { useRouter } from "next/navigation";
import {
  type KeyboardEvent,
  type SyntheticEvent,
  useDeferredValue,
  useEffect,
  useMemo,
  useState,
  useTransition,
} from "react";

import {
  quickAddCustomerStampsAction,
  quickRedeemCustomerRewardAction,
} from "@/lib/actions";
import { BrandLogo } from "@/components/brand-logo";
import { fr } from "@/content/fr";
import { filterStaffCustomers } from "@/lib/customer-lookup";
import { applyLoyaltyPurchase, redeemRewardState } from "@/lib/domain";
import { formatDateTime, formatMemberId } from "@/lib/format";
import {
  customerTypeLabel,
  customerTypeTone,
} from "@/lib/presentation";
import type { StaffCustomerCardSnapshot } from "@/lib/staff-customers";
import {
  Badge,
  Card,
  EmptyState,
  Notice,
  PrimaryButton,
  SecondaryButton,
  SectionHeader,
  TextField,
} from "./ui";

function InlineActionLabel({
  pending,
  label,
}: {
  pending: boolean;
  label: string;
}) {
  return (
    <span className="inline-flex items-center gap-2">
      {pending ? (
        <span
          aria-hidden="true"
          className="size-4 animate-spin rounded-full border-2 border-current border-r-transparent"
        />
      ) : null}
      <span>{label}</span>
    </span>
  );
}

function applyServerSnapshot(
  customer: StaffCustomerCardSnapshot,
  nextState: {
    currentStampCount: number;
    lifetimeStampCount: number;
    availableFreeDrinks: number;
  },
) {
  return {
    ...customer,
    currentStampCount: nextState.currentStampCount,
    lifetimeStampCount: nextState.lifetimeStampCount,
    availableFreeDrinks: nextState.availableFreeDrinks,
  };
}

function CustomerActionCard({
  customer,
  onUpdate,
}: {
  customer: StaffCustomerCardSnapshot;
  onUpdate: (
    customerId: string,
    updater: (current: StaffCustomerCardSnapshot) => StaffCustomerCardSnapshot,
  ) => void;
}) {
  const [isPending, startTransition] = useTransition();
  const [pendingAction, setPendingAction] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{
    tone: "green" | "red";
    message: string;
  } | null>(null);
  const router = useRouter();
  const detailHref = `/staff/customers/${customer.id}`;

  useEffect(() => {
    if (!feedback) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      setFeedback(null);
    }, 2500);

    return () => window.clearTimeout(timeoutId);
  }, [feedback]);

  function runStampAction(delta: 1 | 2) {
    const previousCustomer = customer;
    const optimisticState = applyLoyaltyPurchase({
      currentStampCount: customer.currentStampCount,
      lifetimeStampCount: customer.lifetimeStampCount,
      availableFreeDrinks: customer.availableFreeDrinks,
      stampsEarned: delta,
    });

    onUpdate(customer.id, (current) => applyServerSnapshot(current, optimisticState));
    setPendingAction(`stamp-${delta}`);
    setFeedback(null);

    startTransition(async () => {
      try {
        const result = await quickAddCustomerStampsAction({
          customerId: customer.id,
          delta,
        });

        if (!result.ok) {
          onUpdate(customer.id, () => previousCustomer);
          setFeedback({
            tone: "red",
            message: result.error === "NOT_FOUND" ? fr.errors.NOT_FOUND : fr.errors.UNKNOWN,
          });
          setPendingAction(null);
          return;
        }

        onUpdate(customer.id, (current) =>
          applyServerSnapshot(current, {
            currentStampCount: result.currentStampCount,
            lifetimeStampCount: result.lifetimeStampCount,
            availableFreeDrinks: result.availableFreeDrinks,
          }),
        );
        setFeedback({
          tone: "green",
          message: result.message,
        });
      } catch {
        onUpdate(customer.id, () => previousCustomer);
        setFeedback({
          tone: "red",
          message: fr.errors.UNKNOWN,
        });
      }
      setPendingAction(null);
    });
  }

  function runRewardAction() {
    const previousCustomer = customer;
    const optimisticState = redeemRewardState({
      currentStampCount: customer.currentStampCount,
      lifetimeStampCount: customer.lifetimeStampCount,
      availableFreeDrinks: customer.availableFreeDrinks,
    });

    if (!optimisticState) {
      setFeedback({
        tone: "red",
        message: fr.errors.NO_REWARD,
      });
      return;
    }

    onUpdate(customer.id, (current) => applyServerSnapshot(current, optimisticState));
    setPendingAction("reward");
    setFeedback(null);

    startTransition(async () => {
      try {
        const result = await quickRedeemCustomerRewardAction({
          customerId: customer.id,
        });

        if (!result.ok) {
          onUpdate(customer.id, () => previousCustomer);
          setFeedback({
            tone: "red",
            message:
              result.error === "NO_REWARD"
                ? fr.errors.NO_REWARD
                : result.error === "NOT_FOUND"
                  ? fr.errors.NOT_FOUND
                  : fr.errors.UNKNOWN,
          });
          setPendingAction(null);
          return;
        }

        onUpdate(customer.id, (current) =>
          applyServerSnapshot(current, {
            currentStampCount: result.currentStampCount,
            lifetimeStampCount: result.lifetimeStampCount,
            availableFreeDrinks: result.availableFreeDrinks,
          }),
        );
        setFeedback({
          tone: "green",
          message: result.message,
        });
      } catch {
        onUpdate(customer.id, () => previousCustomer);
        setFeedback({
          tone: "red",
          message: fr.errors.UNKNOWN,
        });
      }
      setPendingAction(null);
    });
  }

  function stopCardNavigation(event: SyntheticEvent<HTMLElement>) {
    event.stopPropagation();
  }

  function openDetails() {
    router.push(detailHref);
  }

  function handleCardKeyDown(event: KeyboardEvent<HTMLElement>) {
    if (event.key !== "Enter" && event.key !== " ") {
      return;
    }

    event.preventDefault();
    openDetails();
  }

  const rewardDisabled = customer.availableFreeDrinks <= 0 || isPending;

  return (
    <Card
      role="link"
      tabIndex={0}
      aria-label={`Ouvrir la fiche de ${customer.fullName}`}
      onClick={openDetails}
      onKeyDown={handleCardKeyDown}
      className="cursor-pointer space-y-4 p-5 transition hover:border-[#c9ad8d] focus-visible:ring-2 focus-visible:ring-[#d8b36f]/30"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#8c6239]">
            {fr.common.memberId}
          </p>
          <p className="mt-1 text-sm font-semibold text-[#6d5644]">
            {formatMemberId(customer.memberId)}
          </p>
          <p className="mt-2 text-lg font-semibold text-[#2d1b12]">{customer.fullName}</p>
          <p className="mt-1 text-sm text-[#6d5644]">{customer.phoneNumber}</p>
        </div>
        <div className="flex flex-col items-end gap-2">
          <Badge tone={customerTypeTone(customer.customerType)}>
            {customerTypeLabel(customer.customerType)}
          </Badge>
          <span className="rounded-full bg-[#f3eadf] px-3 py-1.5 text-sm font-semibold text-[#8c6239]">
            {fr.actions.viewProfile}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-2xl bg-[#f8f1e7] px-4 py-3 text-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#8b6b4c]">
            Tampons
          </p>
          <p className="mt-2 font-semibold text-[#2d1b12]">
            {customer.currentStampCount}/5
          </p>
        </div>
        <div className="rounded-2xl bg-[#f8f1e7] px-4 py-3 text-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#8b6b4c]">
            Récompenses
          </p>
          <p className="mt-2 font-semibold text-[#2d1b12]">
            {customer.availableFreeDrinks}
          </p>
        </div>
      </div>

      <p className="text-sm leading-6 text-[#6d5644]">
        {customer.lastOrderAt
          ? `Dernière commande: ${formatDateTime(customer.lastOrderAt)}`
          : fr.empty.noOrderYet}
      </p>

      <div
        className="space-y-3"
        onClick={stopCardNavigation}
        onPointerDown={stopCardNavigation}
        onKeyDown={stopCardNavigation}
      >
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          <SecondaryButton
            type="button"
            disabled={isPending}
            onClick={() => runStampAction(1)}
            className="w-full"
          >
            <InlineActionLabel
              pending={pendingAction === "stamp-1"}
              label={fr.actions.addOneStamp}
            />
          </SecondaryButton>
          <PrimaryButton
            type="button"
            disabled={rewardDisabled}
            onClick={runRewardAction}
            className="w-full"
          >
            <InlineActionLabel
              pending={pendingAction === "reward"}
              label={fr.actions.useReward}
            />
          </PrimaryButton>
        </div>

        {feedback ? <Notice tone={feedback.tone}>{feedback.message}</Notice> : null}
      </div>
    </Card>
  );
}

export function StaffCustomersWorkspace({
  initialCustomers,
}: {
  initialCustomers: StaffCustomerCardSnapshot[];
}) {
  const [customers, setCustomers] = useState(initialCustomers);
  const [query, setQuery] = useState("");
  const deferredQuery = useDeferredValue(query);

  useEffect(() => {
    setCustomers(initialCustomers);
  }, [initialCustomers]);

  const filteredCustomers = useMemo(
    () => filterStaffCustomers(customers, deferredQuery),
    [customers, deferredQuery],
  );

  function updateCustomer(
    customerId: string,
    updater: (current: StaffCustomerCardSnapshot) => StaffCustomerCardSnapshot,
  ) {
    setCustomers((currentCustomers) =>
      currentCustomers.map((customer) =>
        customer.id === customerId ? updater(customer) : customer,
      ),
    );
  }

  return (
    <div className="space-y-5">
      <BrandLogo variant="navbar" priority className="w-[116px] sm:w-[124px]" />
      <SectionHeader
        title={fr.staff.customerTitle}
        description="Vue rapide du niveau client, de la fidélité et des derniers passages."
      />

      <Card className="space-y-3 p-4">
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm font-semibold text-[#8c6239]">
            {fr.staff.customerSearchTitle}
          </p>
          <Badge tone="blue">{filteredCustomers.length}</Badge>
        </div>
        <TextField
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder={fr.forms.customerSearchPlaceholder}
          aria-label={fr.staff.customerSearchTitle}
        />
      </Card>

      {filteredCustomers.length ? (
        <div className="space-y-3">
          {filteredCustomers.map((customer) => (
            <CustomerActionCard
              key={customer.id}
              customer={customer}
              onUpdate={updateCustomer}
            />
          ))}
        </div>
      ) : (
        <EmptyState title={fr.staff.customerSearchEmpty} />
      )}
    </div>
  );
}
