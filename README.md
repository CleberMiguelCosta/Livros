# Estante

Biblioteca pessoal para cadastrar livros, filtrar por autor e editora, e comparar preços.

## O que dá para fazer

- Cadastrar um livro à mão ou a partir de uma ficha (Open Library, Google Books, BrasilAPI e ISBNdb).
- Filtrar o acervo por autor e por editora, e buscar por título ou ISBN.
- Comparar preços no estilo Buscapé (Amazon.com.br e, com token, Mercado Livre).
- Trazer um conjunto de clássicos brasileiros para experimentar os filtros.

Os dados ficam no seu computador, na pasta `data/`, enquanto você roda o sistema localmente. Na versão publicada, cada pessoa vê só a própria estante.

## Rodar no Windows

Na pasta `C:\Cleber\Cursor`:

```bat
git clone https://github.com/CleberMiguelCosta/Livros.git
cd Livros
npm install
npm run dev
```

Abra [http://localhost:4317](http://localhost:4317) (ou a porta que o `npm run dev` mostrar).

Para uma instalação que já está nessa pasta, entre em `C:\Cleber\Cursor\Livros` e rode `npm install` e `npm run dev`.

É preciso ter o Node.js 20 ou mais novo.

## Preços e fichas

- **Ficha do livro:** [Open Library](https://openlibrary.org/developers/api), [Google Books](https://developers.google.com/books/docs/v1/using), e, no ISBN, [BrasilAPI](https://brasilapi.com.br/docs#tag/ISBN). Com chave: [ISBNdb](https://isbndb.com/isbndb-api-documentation-v2).
- **Preços:** Amazon.com.br. Com token OAuth: [Mercado Livre](https://developers.mercadolivre.com.br/) (`MLB`, categoria Livros).

Copie `.env.example` para `.env.local` se quiser as chaves opcionais:

```bat
copy .env.example .env.local
```

| Variável | Para quê |
| --- | --- |
| `GOOGLE_BOOKS_API_KEY` | Cota maior na Google Books (a busca funciona sem chave) |
| `ISBNDB_API_KEY` | Fichas e capas no ISBNdb |
| `MERCADO_LIVRE_ACCESS_TOKEN` | Anúncios de livros no Mercado Livre |

Sem essas chaves, Open Library, BrasilAPI, Google Books (sem chave) e Amazon continuam funcionando.
