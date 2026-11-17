import { Suspense } from "react";
import { PricePage } from "@/components/price-page";

export const metadata = {
  title: "Preços",
};

export default function Page() {
  return (
    <Suspense fallback={<p className="text-sm text-muted-foreground">Abrindo a busca de preços…</p>}>
      <PricePage />
    </Suspense>
  );
}
