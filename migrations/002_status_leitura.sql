alter table livros
  add column if not exists status_leitura text not null default '';

create index if not exists livros_owner_status_idx on livros (owner_id, status_leitura);
