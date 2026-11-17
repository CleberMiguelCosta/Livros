export type StatusLeitura = "quero_ler" | "lendo" | "lido" | "";

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
  statusLeitura: StatusLeitura;
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
  fonte: "Amazon.com.br" | "Mercado Livre";
};

export type AcervoResponse = {
  livros: Livro[];
  autores: string[];
  editoras: string[];
  total: number;
  filtrados: number;
  porStatus?: {
    quero_ler: number;
    lendo: number;
    lido: number;
    sem_meta: number;
  };
};
