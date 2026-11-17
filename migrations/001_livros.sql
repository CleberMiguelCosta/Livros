create table if not exists livros (
  id text primary key,
  owner_id text not null,
  titulo text not null,
  autor text not null,
  editora text not null default '',
  isbn text not null default '',
  ano integer,
  paginas integer,
  sinopse text not null default '',
  capa_url text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists livros_owner_idx on livros (owner_id);
create index if not exists livros_owner_autor_idx on livros (owner_id, autor);
create index if not exists livros_owner_editora_idx on livros (owner_id, editora);
