# Estante

Biblioteca pessoal para cadastrar livros, filtrar por autor e editora, e comparar preços.

## O que dá para fazer

- Cadastrar um livro à mão ou a partir de uma ficha (Open Library; ISBN também consulta a BrasilAPI).
- Filtrar o acervo por autor e por editora, e buscar por título ou ISBN.
- Ver preços atuais de livros na busca pública da Amazon.com.br.
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

Abra [http://localhost:4317](http://localhost:4317).

Para uma instalação que já está nessa pasta, entre em `C:\Cleber\Cursor\Livros` e rode `npm install` e `npm run dev`.

É preciso ter o Node.js 20 ou mais novo.

## Preços e fichas

- **Ficha do livro:** [Open Library](https://openlibrary.org/developers/api) e, quando a busca é um ISBN, [BrasilAPI](https://brasilapi.com.br/docs#tag/ISBN).
- **Preços:** busca pública de livros da Amazon.com.br. O Mercado Livre não devolve a pesquisa sem um token de acesso, então os preços mostrados são os anúncios da Amazon.

Nenhuma chave é necessária para essas consultas.
