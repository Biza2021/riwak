import {
  Screen,
  Card,
  SectionHeader,
  Badge,
  TextField,
  TextAreaField,
  FieldLabel,
  Notice,
} from "@/components/ui";
import { BrandLogo } from "@/components/brand-logo";
import { StaffTopNav } from "@/components/navigation";
import { SubmitButton } from "@/components/submit-button";
import { fr } from "@/content/fr";
import { getSettingsPanelData } from "@/lib/queries";
import { requireStaffSession } from "@/lib/session";
import {
  saveMenuItemAction,
  saveSettingsAction,
  toggleMenuItemAction,
} from "@/lib/actions";
import { formatCurrency } from "@/lib/format";
import { getErrorMessage, getSuccessMessage } from "@/lib/messages";

export const dynamic = "force-dynamic";

export default async function StaffSettingsPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requireStaffSession();
  const params = (await searchParams) ?? {};
  const { settings, menuItems } = await getSettingsPanelData();
  const error = getErrorMessage(params.error);
  const success = getSuccessMessage(params.success);

  return (
    <>
      <Screen className="pb-40">
        <div className="space-y-5">
          <BrandLogo variant="navbar" priority className="w-[116px] sm:w-[124px]" />
          <SectionHeader
            title={fr.settings.title}
            description={fr.settings.subtitle}
          />

          {error ? <Notice tone="red">{error}</Notice> : null}
          {success ? <Notice tone="green">{success}</Notice> : null}

          <Card className="space-y-4 p-5">
            <p className="text-sm font-semibold text-[#8c6239]">{fr.settings.rulesTitle}</p>
            <form action={saveSettingsAction} className="space-y-4">
              <div>
                <FieldLabel>Nom du magasin</FieldLabel>
                <TextField name="storeName" defaultValue={settings.storeName} required />
              </div>
              <div>
                <FieldLabel>{fr.common.pickupAddress}</FieldLabel>
                <TextAreaField
                  name="pickupAddress"
                  defaultValue={settings.pickupAddress}
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <FieldLabel>Limite de commandes</FieldLabel>
                  <TextField
                    name="activeOrderLimitPerCustomer"
                    type="number"
                    min={1}
                    max={5}
                    defaultValue={settings.activeOrderLimitPerCustomer}
                  />
                </div>
                <div>
                  <FieldLabel>Expiration impayée (min)</FieldLabel>
                  <TextField
                    name="unpaidOrderExpiryMinutes"
                    type="number"
                    min={5}
                    max={240}
                    defaultValue={settings.unpaidOrderExpiryMinutes}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <FieldLabel>Max nouveaux clients</FieldLabel>
                  <TextField
                    name="newCustomerMaxItems"
                    type="number"
                    min={1}
                    max={10}
                    defaultValue={settings.newCustomerMaxItems}
                  />
                </div>
                <label className="flex min-h-12 items-center gap-3 rounded-2xl border border-[#dcc6ad] bg-white px-4 text-sm font-semibold text-[#533728]">
                  <input
                    type="checkbox"
                    name="enableTrustedRegularFlag"
                    value="true"
                    defaultChecked={settings.enableTrustedRegularFlag}
                  />
                  Clients de confiance
                </label>
              </div>
              <SubmitButton className="w-full">
                {fr.actions.save}
              </SubmitButton>
            </form>
          </Card>

          <Card className="space-y-4 p-5">
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm font-semibold text-[#8c6239]">{fr.settings.menuTitle}</p>
              <Badge tone="gold">{menuItems.length} articles</Badge>
            </div>

            <form action={saveMenuItemAction} className="space-y-4 border-b border-[#e6d4bd] pb-5">
              <p className="text-sm font-semibold text-[#2d1b12]">Ajouter un article</p>
              <input type="hidden" name="id" value="" />
              <div>
                <FieldLabel>Nom</FieldLabel>
                <TextField name="name" placeholder={fr.forms.storeNamePlaceholder} required />
              </div>
              <div>
                <FieldLabel>Description</FieldLabel>
                <TextAreaField name="description" placeholder="Description simple" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <FieldLabel>{fr.common.price}</FieldLabel>
                  <TextField
                    name="price"
                    type="number"
                    min={0}
                    step="0.5"
                    placeholder="12"
                    required
                  />
                </div>
                <div>
                  <FieldLabel>Ordre</FieldLabel>
                  <TextField name="displayOrder" type="number" min={0} defaultValue={0} />
                </div>
              </div>
              <div className="flex flex-wrap gap-3">
                <label className="flex items-center gap-2 text-sm font-semibold text-[#533728]">
                  <input type="checkbox" name="isActive" value="true" defaultChecked />
                  Actif
                </label>
                <label className="flex items-center gap-2 text-sm font-semibold text-[#533728]">
                  <input type="checkbox" name="isQualifying" value="true" defaultChecked />
                  {fr.labels.qualifying}
                </label>
                <label className="flex items-center gap-2 text-sm font-semibold text-[#533728]">
                  <input type="checkbox" name="notesRequired" value="true" />
                  Notes requises
                </label>
              </div>
              <SubmitButton className="w-full">
                {fr.actions.add}
              </SubmitButton>
            </form>

            <div className="space-y-4">
              {menuItems.map((item) => (
                <Card key={item.id} className="space-y-3 p-4">
                  <form action={saveMenuItemAction} className="space-y-3">
                    <input type="hidden" name="id" value={item.id} />
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-semibold text-[#2d1b12]">{item.name}</p>
                        <p className="mt-1 text-sm text-[#6d5644]">
                          {formatCurrency(item.price)}
                        </p>
                      </div>
                      <Badge tone={item.isActive ? "green" : "red"}>
                        {item.isActive ? fr.common.active : fr.common.inactive}
                      </Badge>
                    </div>

                    <div>
                      <FieldLabel>Nom</FieldLabel>
                      <TextField name="name" defaultValue={item.name} required />
                    </div>
                    <div>
                      <FieldLabel>Description</FieldLabel>
                      <TextAreaField name="description" defaultValue={item.description ?? ""} />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <FieldLabel>{fr.common.price}</FieldLabel>
                        <TextField
                          name="price"
                          type="number"
                          step="0.5"
                          min={0}
                          defaultValue={Number(item.price)}
                          required
                        />
                      </div>
                      <div>
                        <FieldLabel>Ordre</FieldLabel>
                        <TextField
                          name="displayOrder"
                          type="number"
                          min={0}
                          defaultValue={item.displayOrder}
                        />
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-3">
                      <label className="flex items-center gap-2 text-sm font-semibold text-[#533728]">
                        <input
                          type="checkbox"
                          name="isActive"
                          value="true"
                          defaultChecked={item.isActive}
                        />
                        Actif
                      </label>
                      <label className="flex items-center gap-2 text-sm font-semibold text-[#533728]">
                        <input
                          type="checkbox"
                          name="isQualifying"
                          value="true"
                          defaultChecked={item.isQualifying}
                        />
                        {fr.labels.qualifying}
                      </label>
                      <label className="flex items-center gap-2 text-sm font-semibold text-[#533728]">
                        <input
                          type="checkbox"
                          name="notesRequired"
                          value="true"
                          defaultChecked={item.notesRequired}
                        />
                        Notes requises
                      </label>
                    </div>
                    <SubmitButton className="w-full">
                      {fr.actions.save}
                    </SubmitButton>
                  </form>

                  <form action={toggleMenuItemAction}>
                    <input type="hidden" name="id" value={item.id} />
                    <input type="hidden" name="isActive" value={String(!item.isActive)} />
                    <SubmitButton variant="secondary" className="w-full">
                      {item.isActive ? "Masquer" : "Réactiver"}
                    </SubmitButton>
                  </form>
                </Card>
              ))}
            </div>
          </Card>
        </div>
      </Screen>
      <StaffTopNav
        items={[
          { href: "/staff/orders", label: fr.navStaff.orders },
          { href: "/staff/customers", label: fr.navStaff.customers },
          { href: "/staff/settings", label: fr.navStaff.settings, active: true },
        ]}
      />
    </>
  );
}
