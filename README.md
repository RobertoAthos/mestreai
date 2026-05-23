# Mestre IA

Inteligência artificial para canteiro de obras — interpretação de projetos
arquitetônicos em PDF com extração estruturada de medidas, esquadrias e
checklist de execução.

> Veja [`PRD.md`](./PRD.md) para o escopo do MVP e [`DESIGN.md`](./DESIGN.md)
> para o design system.

## Estrutura do repositório

```
mestreai/
├── backend/        # FastAPI + OpenRouter (Python 3.12, Docker)
├── frontend/       # React Native + Expo Router (TypeScript)
├── PRD.md
└── DESIGN.md
```

## Rodando ponta a ponta

### 1. Backend

```bash
cd backend
cp .env.example .env             # MOCK_AI=true (default) usa respostas pré-fabricadas
docker compose up --build
# → http://localhost:8000/docs   Swagger / OpenAPI
```

Quando a chave real do OpenRouter for adicionada, basta editar `.env`:

```bash
OPENROUTER_API_KEY=sk-or-v1-...
MOCK_AI=false
```

### 2. Frontend

```bash
cd frontend
npm install
cp .env.example .env             # ajuste EXPO_PUBLIC_API_BASE_URL
npx expo start
```

Abra com **Expo Go** no seu celular ou no simulador iOS/Android.

## Fluxo do usuário

1. **Dashboard** lista os projetos e oferece CTA "Novo Projeto".
2. **Upload** aceita exclusivamente PDFs (PRD §3.1). Após o envio, o backend
   processa em background e atualiza o status do projeto.
3. **Resumo** exibe medidas dos ambientes, quadro de portas/janelas,
   especificação das paredes e o guia de execução em estilo checklist.
4. **Chat** responde perguntas com base no resumo estruturado e sugere
   *quick replies* contextuais.

## API resumida

| Método | Rota | Para que serve |
| --- | --- | --- |
| `GET` | `/health` | status + flag de mock |
| `GET` | `/projects` | lista de projetos |
| `POST` | `/projects` | upload de PDF (multipart) |
| `GET` | `/projects/{id}` | detalhe + resumo estruturado |
| `DELETE` | `/projects/{id}` | remove o projeto |
| `GET` | `/chat/{project_id}` | histórico do chat |
| `POST` | `/chat` | envia `{project_id, message}` |
| `DELETE` | `/chat/{project_id}` | limpa o histórico |

## Notas

- O backend roda em modo mock por padrão para que o frontend possa ser
  desenvolvido sem queimar créditos do OpenRouter. A chave real é
  adicionada manualmente no `.env`.
- Os ícones do app são SVGs próprios em `frontend/src/components/Icon.tsx`
  para preservar o estilo "engenheiro" do DESIGN.md e evitar dependências
  de fontes de ícones externas.
