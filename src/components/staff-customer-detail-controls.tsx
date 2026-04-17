"use client";

import { useState } from "react";

import { SubmitButton } from "@/components/submit-button";
import { Card, FieldLabel, SelectField, TextField } from "@/components/ui";
import { fr } from "@/content/fr";
import { adjustLoyaltyAction, updateTrustAction } from "@/lib/actions";
import type { CustomerType } from "@/lib/domain";

type TrustActionValue = "TRUST" | "LIMIT" | "CLEAR";

function defaultTrustAction(customerType: CustomerType): TrustActionValue {
  if (customerType === "LIMITED") {
    return "CLEAR";
  }

  return "TRUST";
}

export function StaffCustomerDetailControls({
  customerId,
  currentPath,
  customerType,
}: {
  customerId: string;
  currentPath: string;
  customerType: CustomerType;
}) {
  const [trustAction, setTrustAction] = useState<TrustActionValue>(
    defaultTrustAction(customerType),
  );

  return (
    <>
      <Card className="space-y-4 p-5">
        <p className="text-sm font-semibold text-[#8c6239]">
          {fr.staff.trustTitle}
        </p>
        <form action={updateTrustAction} className="space-y-3">
          <input type="hidden" name="customerId" value={customerId} />
          <input type="hidden" name="returnTo" value={currentPath} />

          <div>
            <FieldLabel>Action</FieldLabel>
            <SelectField
              name="action"
              value={trustAction}
              onChange={(event) => setTrustAction(event.target.value as TrustActionValue)}
            >
              <option value="TRUST">{fr.trustActions.trusted}</option>
              <option value="LIMIT">{fr.trustActions.limited}</option>
              {customerType === "LIMITED" ? (
                <option value="CLEAR">{fr.trustActions.clearLimit}</option>
              ) : null}
            </SelectField>
          </div>

          {trustAction === "LIMIT" ? (
            <div>
              <FieldLabel>Durée de limitation (heures)</FieldLabel>
              <TextField
                name="limitHours"
                type="number"
                min={1}
                max={720}
                defaultValue={72}
              />
            </div>
          ) : null}

          <SubmitButton className="w-full">{fr.actions.save}</SubmitButton>
        </form>
      </Card>

      <Card className="space-y-4 p-5">
        <p className="text-sm font-semibold text-[#8c6239]">Ajuster la fidélité</p>
        <form action={adjustLoyaltyAction} className="space-y-3">
          <input type="hidden" name="customerId" value={customerId} />
          <input type="hidden" name="returnTo" value={currentPath} />

          <div>
            <FieldLabel>Delta de tampons</FieldLabel>
            <TextField name="delta" type="number" min={-10} max={10} defaultValue={1} />
          </div>

          <SubmitButton className="w-full">Appliquer</SubmitButton>
        </form>
      </Card>
    </>
  );
}
