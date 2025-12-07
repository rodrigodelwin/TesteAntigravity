# Kanban App - Integração com Supabase

## Configuração do Supabase

### 1. Criar Projeto no Supabase

1. Acesse [supabase.com](https://supabase.com)
2. Crie uma conta ou faça login
3. Clique em "New Project"
4. Preencha os dados e aguarde a criação

### 2. Criar Tabela de Tarefas

No **SQL Editor** do Supabase, execute este script:

```sql
-- Criar tabela de tarefas
create table tasks (
  id uuid default gen_random_uuid() primary key,
  title text not null,
  description text,
  status text default 'todo' check (status in ('todo', 'inprogress', 'done')),
  priority text default 'medium' check (priority in ('low', 'medium', 'high')),
  due_date date,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Habilitar Row Level Security (RLS)
alter table tasks enable row level security;

-- Criar política de acesso público (apenas para desenvolvimento/teste)
create policy "Enable all access for all users" on tasks
  for all
  using (true)
  with check (true);
```

### 3. Configurar Variáveis de Ambiente

1. No dashboard do Supabase, vá em **Settings** > **API**
2. Copie:
   - **Project URL** (ex: `https://xxxxx.supabase.co`)
   - **anon/public key** (começa com `eyJ...`)

3. Edite o arquivo `.env` na raiz do projeto e substitua:

```env
VITE_SUPABASE_URL=https://seu-projeto.supabase.co
VITE_SUPABASE_ANON_KEY=sua_anon_key_aqui
```

### 4. Rodar o Projeto

```bash
npm install
npm run dev
```

## Estrutura da Tabela

| Coluna       | Tipo      | Descrição                          |
|--------------|-----------|------------------------------------|
| id           | uuid      | ID único da tarefa                 |
| title        | text      | Título da tarefa                   |
| description  | text      | Descrição detalhada (opcional)     |
| status       | text      | todo, inprogress, done             |
| priority     | text      | low, medium, high                  |
| due_date     | date      | Data de entrega (opcional)         |
| created_at   | timestamp | Data de criação (automática)       |

## Funcionalidades

- ✅ Criar, editar e excluir tarefas
- ✅ Drag & drop entre colunas
- ✅ Prioridades (Alta, Média, Baixa)
- ✅ Datas de entrega com alertas de atraso
- ✅ Persistência em tempo real com Supabase
