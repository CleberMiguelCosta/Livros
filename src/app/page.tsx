import { Suspense } from "react";
import { Acervo } from "@/components/acervo";
import { Skeleton } from "@/components/ui/skeleton";

export const metadata = {
  title: "Acervo",
};

export default function Page() {
  return (
    <Suspense
      fallback={
        <div className="grid gap-4">
          <Skeleton className="h-12 w-48" />
          <Skeleton className="h-40 w-full" />
        </div>
      }
    >
      <Acervo />
    </Suspense>
  );
}
