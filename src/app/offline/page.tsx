import Link from "next/link";

import { Screen, SectionHeader, SecondaryButton } from "@/components/ui";

export const metadata = {
  title: "Hors ligne",
};

export default function OfflinePage() {
  return (
    <Screen className="justify-center">
      <div className="space-y-6">
        <SectionHeader
          eyebrow="Mode hors ligne"
          title="Riwak n’est pas connecté"
          description="La dernière version consultée peut parfois rester visible. Reconnectez-vous pour rafraîchir les commandes et les récompenses."
        />

        <div className="flex gap-3">
          <Link href="/">
            <SecondaryButton type="button">Retour à l’accueil</SecondaryButton>
          </Link>
        </div>
      </div>
    </Screen>
  );
}
