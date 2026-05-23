# Mestre IA — Frontend

App mobile em **React Native + Expo (Expo Router)** para mestres de obra
consultarem projetos arquitetônicos analisados pela IA.

## Stack

- Expo SDK 52, Expo Router 4
- TypeScript estrito
- `expo-document-picker` para upload do PDF
- `react-native-svg` para os ícones do design system
- `@expo-google-fonts/inter` + `@expo-google-fonts/jetbrains-mono`
- `@react-native-async-storage/async-storage` para persistir o projeto atual

## Estrutura

```
app/
  _layout.tsx              # carrega fontes + provider global
  (tabs)/
    _layout.tsx            # bottom tab bar (Dashboard / Upload / Resumo / Chat)
    index.tsx              # Dashboard (Main screen)
    upload.tsx             # Enviar Projeto (PDF only, per PRD)
    summary.tsx            # Resumo do Projeto
    chat.tsx               # Chat com a IA, com quick replies
src/
  components/              # Botões, cards, chips, ícones, headers
  services/api.ts          # cliente HTTP do backend FastAPI
  store/AppContext.tsx     # estado global (projetos + projeto atual)
  theme/index.ts           # tokens (colors, typography, spacing, radius)
  types/api.ts             # tipos compartilhados com o backend
```

## Rodando

```bash
cd frontend
npm install     # ou pnpm install / yarn
cp .env.example .env
# ajuste EXPO_PUBLIC_API_BASE_URL para o IP correto do backend
npx expo start
```

- **iOS simulator**: `http://localhost:8000`
- **Android emulator**: `http://10.0.2.2:8000`
- **Dispositivo físico**: use o IP da sua máquina na rede local

## Design System

Os tokens vivem em `src/theme/index.ts` e são derivados do `DESIGN.md` na
raiz do repositório. Toda nova tela deve usar `colors`, `typography`,
`spacing` e `radius` desse módulo — nunca cores ou tamanhos hard-coded.
