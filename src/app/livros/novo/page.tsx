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
          Busque a ficha pelo título ou pelo ISBN, ajuste autor e editora, e guarde o livro na estante.
          Autor e editora são o que os filtros do acervo usam.
        </p>
      </div>
      <BookForm mode="create" />
    </div>
  );
}
