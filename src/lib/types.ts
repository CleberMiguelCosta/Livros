export type Livro = {
  id: string;
  titulo: string;
  autor: string;
  editora: string;
  isbn: string;
  ano: number | null;
  paginas: number | null;
  sinopse: string;
  capaUrl: string;
  createdAt: string;
  updatedAt: string;
};

export type Ficha = {
  titulo: string;
  autor: string;
  editora: string;
  isbn: string;
  ano: number | null;
  paginas: number | null;
  sinopse: string;
  capaUrl: string;
  fonte: string;
};

export type Oferta = {
  titulo: string;
  preco: number;
  url: string;
  imagem: string | null;
  fonte: "Amazon.com.br";
};

export type AcervoResponse = {
  livros: Livro[];
  autores: string[];
  editoras: string[];
  total: number;
  filtrados: number;
};
