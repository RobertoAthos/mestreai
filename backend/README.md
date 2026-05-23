# Mestre IA — Backend

FastAPI service que recebe PDFs de plantas arquitetônicas, chama a camada de IA
via **OpenRouter** (SDK compatível com OpenAI) e devolve um resumo estruturado
+ chat de consulta com botões de atalho.

## Endpoints

| Método | Rota | Descrição |
| --- | --- | --- |
| GET | `/health` | Status do serviço e flag de mock |
| GET | `/projects` | Lista de projetos carregados |
| POST | `/projects` | Upload de PDF (multipart `file` + opcional `name`) |
| GET | `/projects/{id}` | Detalhe + resumo estruturado |
| DELETE | `/projects/{id}` | Remove o projeto |
| GET | `/chat/{project_id}` | Histórico do chat (auto-cria mensagem inicial) |
| POST | `/chat` | Envia mensagem `{project_id, message}` |
| DELETE | `/chat/{project_id}` | Limpa o histórico do chat |

## Persistência

- **Postgres** (via SQLAlchemy 2.0 async + asyncpg) guarda projetos,
  resumo estruturado (JSONB) e histórico de chat.
- **PDFs em disco** sob `storage/{project_id}/source.pdf` — não vale a
  pena trafegar blobs pelo asyncpg no MVP; quando subir pra cloud,
  basta plugar S3 sem mexer no schema.
- **Alembic** controla as migrations em `alembic/versions/`.

## Rodando localmente (sem Docker)

```bash
cd backend
uv venv .venv --python 3.12
uv pip install --python .venv/bin/python -r requirements.txt
cp .env.example .env       # ajuste DATABASE_URL pro seu Postgres local
./.venv/bin/alembic upgrade head
./.venv/bin/uvicorn app.main:app --reload --port 8000
```

Acesse `http://localhost:8000/docs` para o Swagger.

## Rodando via Docker (Postgres + API juntos)

```bash
cd backend
cp .env.example .env       # ajuste OPENROUTER_API_KEY quando tiver a chave real
docker compose up --build
```

O serviço `api` espera o Postgres ficar saudável, roda `alembic upgrade head`
e em seguida sobe o uvicorn. Para apontar pra um Postgres gerenciado na cloud,
basta sobrescrever `DATABASE_URL` no `.env` (formato
`postgresql+asyncpg://user:pass@host:5432/dbname`).

## Migrations

```bash
# Criar uma nova migration depois de mexer nos modelos
./.venv/bin/alembic revision --autogenerate -m "add foo column"

# Aplicar pendentes
./.venv/bin/alembic upgrade head

# Reverter a última
./.venv/bin/alembic downgrade -1
```

## Modo Mock

Enquanto `MOCK_AI=true` (ou a chave começar com `mock-`), o backend devolve um
resumo e respostas de chat pré-fabricados. Isso permite desenvolver o frontend
sem queimar créditos do OpenRouter. Basta trocar a env quando a chave real for
adicionada.
