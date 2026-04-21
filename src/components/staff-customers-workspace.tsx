"use client";

import { useRouter } from "next/navigation";
import {
  type KeyboardEvent as ReactKeyboardEvent,
  type MouseEvent,
  type RefObject,
  type SyntheticEvent,
  useDeferredValue,
  useEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
} from "react";

import { BrandLogo } from "@/components/brand-logo";
import { fr } from "@/content/fr";
import {
  approveStampRequestAction,
  createStaffCustomerAccessLinkAction,
  createStaffCustomerAction,
  quickAddCustomerStampsAction,
  quickRedeemCustomerRewardAction,
} from "@/lib/actions";
import { filterStaffCustomers } from "@/lib/customer-lookup";
import {
  applyLoyaltyPurchase,
  LOYALTY_STAMP_THRESHOLD,
  redeemRewardState,
} from "@/lib/domain";
import { formatDateTime, formatMemberId } from "@/lib/format";
import { customerTypeLabel, customerTypeTone } from "@/lib/presentation";
import type {
  StaffCustomerCardSnapshot,
  StaffStampRequestSnapshot,
} from "@/lib/staff-customers";
import { cn } from "@/lib/utils";
import {
  Badge,
  Card,
  EmptyState,
  FieldLabel,
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

type CreatedCustomerState = {
  id: string;
  memberId: number;
  fullName: string;
  phoneNumber: string;
};

function buildCustomerSmsMessage(
  createdCustomer: CreatedCustomerState,
  accessUrl: string,
) {
  return fr.staff.customerSmsMessage(createdCustomer.fullName, accessUrl);
}

function openCustomerSmsComposer(
  createdCustomer: CreatedCustomerState,
  accessUrl: string,
) {
  const message = encodeURIComponent(
    buildCustomerSmsMessage(createdCustomer, accessUrl),
  );
  window.location.href = `sms:${createdCustomer.phoneNumber}?body=${message}`;
}

function focusField(fieldRef: RefObject<HTMLInputElement | null>) {
  window.setTimeout(() => {
    fieldRef.current?.focus();
  }, 10);
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

  function handleCardKeyDown(event: ReactKeyboardEvent<HTMLElement>) {
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
            {customer.currentStampCount}/{LOYALTY_STAMP_THRESHOLD}
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

function PendingStampRequestRow({
  request,
  highlighted,
  onApprove,
  onOpen,
}: {
  request: StaffStampRequestSnapshot;
  highlighted: boolean;
  onApprove: (result: {
    requestId: string;
    customerId: string;
    currentStampCount: number;
    lifetimeStampCount: number;
    availableFreeDrinks: number;
  }) => void;
  onOpen: (request: StaffStampRequestSnapshot) => void;
}) {
  const [isPending, startTransition] = useTransition();
  const [feedback, setFeedback] = useState<{
    tone: "green" | "red";
    message: string;
  } | null>(null);

  useEffect(() => {
    if (!feedback) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      setFeedback(null);
    }, 2500);

    return () => window.clearTimeout(timeoutId);
  }, [feedback]);

  function handleApprove() {
    if (isPending) {
      return;
    }

    setFeedback(null);

    startTransition(async () => {
      try {
        const result = await approveStampRequestAction({
          requestId: request.id,
        });

        if (!result.ok) {
          setFeedback({
            tone: "red",
            message:
              result.error === "ALREADY_HANDLED"
                ? fr.staff.stampRequestHandled
                : result.error === "NOT_FOUND"
                  ? fr.errors.NOT_FOUND
                  : fr.errors.UNKNOWN,
          });
          return;
        }

        onApprove({
          requestId: result.requestId,
          customerId: result.customerId,
          currentStampCount: result.currentStampCount,
          lifetimeStampCount: result.lifetimeStampCount,
          availableFreeDrinks: result.availableFreeDrinks,
        });
        setFeedback({
          tone: "green",
          message: result.message,
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
    <div
      className={cn(
        "rounded-2xl border border-[#e4d2bb] bg-[#fff8ef] p-4 transition",
        highlighted ? "ring-2 ring-[#d8b36f]/35" : "",
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-1">
          <p className="font-semibold text-[#2d1b12]">{request.customerName}</p>
          <p className="text-sm text-[#6d5644]">{formatMemberId(request.memberId)}</p>
          <p className="text-xs text-[#7a6350]">{formatDateTime(request.createdAt)}</p>
        </div>
        <Badge tone="blue">{fr.staff.stampRequestPending}</Badge>
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        <PrimaryButton type="button" disabled={isPending} onClick={handleApprove}>
          <InlineActionLabel
            pending={isPending}
            label={fr.staff.stampRequestApprove}
          />
        </PrimaryButton>
        <SecondaryButton type="button" onClick={() => onOpen(request)}>
          {fr.staff.customerCreateDetailAction}
        </SecondaryButton>
      </div>

      {feedback ? <div className="mt-3"><Notice tone={feedback.tone}>{feedback.message}</Notice></div> : null}
    </div>
  );
}

export function StaffCustomersWorkspace({
  initialCustomers,
  initialPendingStampRequests,
  highlightedStampRequestId,
}: {
  initialCustomers: StaffCustomerCardSnapshot[];
  initialPendingStampRequests: StaffStampRequestSnapshot[];
  highlightedStampRequestId?: string;
}) {
  const router = useRouter();
  const [customers, setCustomers] = useState(initialCustomers);
  const [pendingStampRequests, setPendingStampRequests] = useState(
    initialPendingStampRequests,
  );
  const [query, setQuery] = useState("");
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [createValues, setCreateValues] = useState({
    fullName: "",
    phoneNumber: "",
  });
  const [createdCustomer, setCreatedCustomer] = useState<CreatedCustomerState | null>(
    null,
  );
  const [createFeedback, setCreateFeedback] = useState<{
    tone: "green" | "red";
    message: string;
  } | null>(null);
  const [isCreatePending, startCreateTransition] = useTransition();
  const [isSmsPending, startSmsTransition] = useTransition();
  const [smsFeedback, setSmsFeedback] = useState<{
    tone: "green" | "red";
    message: string;
  } | null>(null);
  const deferredQuery = useDeferredValue(query);
  const fullNameFieldRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    setCustomers(initialCustomers);
  }, [initialCustomers]);

  useEffect(() => {
    setPendingStampRequests(initialPendingStampRequests);
  }, [initialPendingStampRequests]);

  useEffect(() => {
    if (!showCreateForm) {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    focusField(fullNameFieldRef);

    const handleKeyDown = (event: globalThis.KeyboardEvent) => {
      if (event.key === "Escape" && !isCreatePending) {
        setShowCreateForm(false);
        setCreateFeedback(null);
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isCreatePending, showCreateForm]);

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

  function prependCustomer(customer: StaffCustomerCardSnapshot) {
    setCustomers((currentCustomers) => {
      const withoutExisting = currentCustomers.filter(
        (currentCustomer) => currentCustomer.id !== customer.id,
      );

      return [customer, ...withoutExisting];
    });
  }

  function removePendingStampRequest(requestId: string) {
    setPendingStampRequests((currentRequests) =>
      currentRequests.filter((request) => request.id !== requestId),
    );
  }

  function handleApprovePendingRequest(result: {
    requestId: string;
    customerId: string;
    currentStampCount: number;
    lifetimeStampCount: number;
    availableFreeDrinks: number;
  }) {
    removePendingStampRequest(result.requestId);
    router.replace("/staff/customers", { scroll: false });
    updateCustomer(result.customerId, (currentCustomer) => ({
      ...currentCustomer,
      currentStampCount: result.currentStampCount,
      lifetimeStampCount: result.lifetimeStampCount,
      availableFreeDrinks: result.availableFreeDrinks,
    }));
  }

  function openPendingRequest(request: StaffStampRequestSnapshot) {
    setQuery(String(request.memberId));
    router.push(`/staff/customers/${request.customerId}`);
  }

  function handleCreateCustomer() {
    if (isCreatePending) {
      return;
    }

    setCreateFeedback(null);

    startCreateTransition(async () => {
      try {
        const result = await createStaffCustomerAction(createValues);

        if (!result.ok) {
          const message =
            result.error === "BAD_PHONE"
              ? fr.errors.BAD_PHONE
              : result.error === "PHONE_EXISTS"
                ? fr.errors.PHONE_EXISTS
                : result.error === "BAD_FORM"
                  ? fr.errors.BAD_FORM
                  : fr.errors.UNKNOWN;

          setCreateFeedback({
            tone: "red",
            message,
          });
          return;
        }

        prependCustomer(result.customer);
        setQuery("");
        setShowCreateForm(false);
        setCreateValues({
          fullName: "",
          phoneNumber: "",
        });
        setCreatedCustomer({
          id: result.customer.id,
          memberId: result.customer.memberId,
          fullName: result.customer.fullName,
          phoneNumber: result.customer.phoneNumber,
        });
        setCreateFeedback(null);
        setSmsFeedback(null);
      } catch {
        setCreateFeedback({
          tone: "red",
          message: fr.errors.UNKNOWN,
        });
      }
    });
  }

  function openCreateCustomerModal() {
    setShowCreateForm(true);
    setCreateFeedback(null);
    setCreatedCustomer(null);
    setSmsFeedback(null);
  }

  function closeCreateCustomerModal() {
    if (isCreatePending) {
      return;
    }

    setShowCreateForm(false);
    setCreateFeedback(null);
  }

  function handleCreateModalBackdropClick(
    event: MouseEvent<HTMLDivElement>,
  ) {
    if (event.target !== event.currentTarget) {
      return;
    }

    closeCreateCustomerModal();
  }

  const createDisabled =
    isCreatePending ||
    !createValues.fullName.trim() ||
    !createValues.phoneNumber.trim();

  function prepareCustomerSms() {
    if (!createdCustomer || isSmsPending) {
      return;
    }

    setSmsFeedback(null);

    startSmsTransition(async () => {
      try {
        const result = await createStaffCustomerAccessLinkAction({
          customerId: createdCustomer.id,
        });

        if (!result.ok) {
          setSmsFeedback({
            tone: "red",
            message:
              result.error === "NOT_FOUND"
                ? fr.errors.NOT_FOUND
                : result.error === "BAD_FORM"
                  ? fr.errors.BAD_FORM
                  : fr.errors.UNKNOWN,
          });
          return;
        }

        openCustomerSmsComposer(
          createdCustomer,
          `${window.location.origin}${result.accessPath}`,
        );
      } catch {
        setSmsFeedback({
          tone: "red",
          message: fr.errors.UNKNOWN,
        });
      }
    });
  }

  return (
    <div className="space-y-5">
      <BrandLogo variant="navbar" priority className="w-[116px] sm:w-[124px]" />
      <SectionHeader
        title={fr.staff.customerTitle}
        description="Vue rapide du niveau client, de la fidélité et des derniers passages."
      />

      <Card className="space-y-3 p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm font-semibold text-[#8c6239]">
            {fr.staff.customerSearchTitle}
          </p>
          <div className="flex items-center gap-2">
            <Badge tone="blue">{filteredCustomers.length}</Badge>
            <PrimaryButton
              type="button"
              className="px-4"
              onClick={openCreateCustomerModal}
            >
              {fr.actions.addCustomer}
            </PrimaryButton>
          </div>
        </div>

        <TextField
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder={fr.forms.customerSearchPlaceholder}
          aria-label={fr.staff.customerSearchTitle}
        />
      </Card>

      {showCreateForm ? (
        <div
          className="fixed inset-0 z-50 flex items-end bg-[#2d1b12]/35 px-4 pb-4 pt-8 sm:items-center sm:justify-center sm:px-6"
          onClick={handleCreateModalBackdropClick}
          role="presentation"
        >
          <Card
            role="dialog"
            aria-modal="true"
            aria-labelledby="staff-create-customer-title"
            className="w-full max-w-lg space-y-4 p-5 sm:p-6"
          >
            <div className="space-y-1.5">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#8c6239]">
                {fr.actions.addCustomer}
              </p>
              <h2
                id="staff-create-customer-title"
                className="text-xl font-semibold text-[#2d1b12]"
              >
                {fr.staff.customerCreateTitle}
              </h2>
              <p className="text-sm leading-6 text-[#6d5644]">
                {fr.staff.customerCreateBody}
              </p>
            </div>

            <div className="space-y-4">
              <div>
                <FieldLabel>{fr.common.fullName}</FieldLabel>
                <TextField
                  ref={fullNameFieldRef}
                  value={createValues.fullName}
                  onChange={(event) =>
                    setCreateValues((current) => ({
                      ...current,
                      fullName: event.target.value,
                    }))
                  }
                  placeholder={fr.forms.namePlaceholder}
                  autoComplete="name"
                />
              </div>
              <div>
                <FieldLabel>{fr.common.phoneNumber}</FieldLabel>
                <TextField
                  type="tel"
                  inputMode="tel"
                  value={createValues.phoneNumber}
                  onChange={(event) =>
                    setCreateValues((current) => ({
                      ...current,
                      phoneNumber: event.target.value,
                    }))
                  }
                  placeholder={fr.forms.phonePlaceholder}
                  autoComplete="tel"
                />
              </div>
            </div>

            {createFeedback ? (
              <Notice tone={createFeedback.tone}>{createFeedback.message}</Notice>
            ) : null}

            <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
              <SecondaryButton
                type="button"
                disabled={isCreatePending}
                onClick={closeCreateCustomerModal}
                className="w-full sm:w-auto sm:min-w-32"
              >
                {fr.actions.cancel}
              </SecondaryButton>
              <PrimaryButton
                type="button"
                disabled={createDisabled}
                onClick={handleCreateCustomer}
                className="w-full sm:w-auto sm:min-w-32"
              >
                <InlineActionLabel
                  pending={isCreatePending}
                  label={fr.actions.create}
                />
              </PrimaryButton>
            </div>
          </Card>
        </div>
      ) : null}

      {pendingStampRequests.length ? (
        <Card className="space-y-4 p-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-[#8c6239]">
                {fr.staff.stampRequestTitle}
              </p>
              <p className="mt-1 text-sm leading-6 text-[#6d5644]">
                {fr.staff.stampRequestBody}
              </p>
            </div>
            <Badge tone="blue">{pendingStampRequests.length}</Badge>
          </div>

          <div className="space-y-3">
            {pendingStampRequests.map((request) => (
              <PendingStampRequestRow
                key={request.id}
                request={request}
                highlighted={request.id === highlightedStampRequestId}
                onApprove={handleApprovePendingRequest}
                onOpen={openPendingRequest}
              />
            ))}
          </div>
        </Card>
      ) : null}

      {createdCustomer ? (
        <Card className="space-y-4 p-4">
          <div className="space-y-1.5">
            <p className="text-sm font-semibold text-[#8c6239]">
              {fr.staff.customerCreateTitle}
            </p>
            <p className="text-sm leading-6 text-[#6d5644]">
              {fr.staff.customerCreateSmsHint}
            </p>
          </div>

          <Notice tone="green">
            {fr.staff.customerCreateSuccess(
              createdCustomer.fullName,
              formatMemberId(createdCustomer.memberId),
            )}
          </Notice>

          <div className="flex flex-wrap gap-2">
            <PrimaryButton
              type="button"
              disabled={isSmsPending}
              onClick={prepareCustomerSms}
            >
              <InlineActionLabel
                pending={isSmsPending}
                label={fr.actions.prepareSms}
              />
            </PrimaryButton>
            <SecondaryButton
              type="button"
              disabled={isSmsPending}
              onClick={() => {
                setQuery(String(createdCustomer.memberId));
                router.push(`/staff/customers/${createdCustomer.id}`);
              }}
            >
              {fr.staff.customerCreateDetailAction}
            </SecondaryButton>
            <SecondaryButton
              type="button"
              disabled={isSmsPending}
              onClick={() => {
                setCreatedCustomer(null);
                setSmsFeedback(null);
              }}
            >
              {fr.actions.dismiss}
            </SecondaryButton>
          </div>

          {smsFeedback ? <Notice tone={smsFeedback.tone}>{smsFeedback.message}</Notice> : null}
        </Card>
      ) : null}

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
