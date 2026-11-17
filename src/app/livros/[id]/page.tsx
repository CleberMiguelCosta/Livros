import { Suspense } from "react";
import { BookScreen } from "@/components/book-screen";
import { Skeleton } from "@/components/ui/skeleton";

export const metadata = {
  title: "Ficha do livro",
};

export default function Page() {
  return (
    <Suspense
      fallback={
        <div className="grid gap-4">
          <Skeleton className="h-10 w-64" />
          <Skeleton className="h-48 w-full" />
        </div>
      }
    >
      <BookScreen />
    </Suspense>
  );
}
