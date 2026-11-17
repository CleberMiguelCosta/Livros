import { BookForm } from "@/components/book-form";

export const metadata = {
  title: "Cadastrar livro",
};

export default function Page() {
  return (
    <div className="grid gap-6">
      <div>
        <h1 className="font-heading text-4xl tracking-tight">Cadastrar livro</h1>
        <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
          Busque nas APIs pelo título ou ISBN para trazer ficha e capa, salve direto do resultado ou
          ajuste autor e editora antes de guardar. Autor e editora alimentam os filtros do acervo.
        </p>
      </div>
      <BookForm mode="create" />
    </div>
  );
}
