# PRD: Mestre IA – Inteligência Artificial para Canteiro de Obras
## Fase: MVP (Foco em Projetos Arquitetônicos)

---

### 1. Visão do Produto
O **Mestre IA** é um aplicativo mobile nativo projetado para profissionais da construção civil. Nesta primeira fase (MVP), o produto foca exclusivamente na interpretação e tradução de **projetos arquitetônicos** (plantas baixas e cortes). O objetivo é permitir que mestres de obras e pedreiros compreendam com rapidez e clareza as especificações técnicas diretamente na tela do celular, garantindo precisão nas medidas, na locação de paredes e na paginação de esquadrias, reduzindo drasticamente retrabalhos e falhas de execução.

---

### 2. Público-Target
* **Primário:** Mestres de obras e pedreiros experientes, responsáveis pela marcação da alvenaria e condução diária da obra diretamente no canteiro, utilizando smartphones.
* **Secundário:** Pequenos empreiteiros e proprietários de obras residenciais de pequeno a médio porte (como casas e duplexes) que gerenciam ou acompanham a execução técnica.

---

### 3. Funcionalidades do MVP

#### 3.1. Gestão de Projetos e Upload (Exclusivo via PDF)
* **Upload Restrito a PDF:** Para mitigar falhas de interpretação, sombras, dobras de papel e garantir a assertividade da IA na leitura técnica de cotas, o aplicativo aceitará exclusivamente arquivos no formato PDF (vetoriais ou gerados diretamente por softwares de CAD/BIM). Não será permitido o uso de fotos.
* **Seletor de Arquivos Nativo:** Integração direta com o gerenciador de arquivos do sistema operacional (iCloud Files no iOS, Google Drive/Downloads no Android) ou através da função "Abrir com..." a partir de aplicativos como o WhatsApp.
* **Lista de Obras:** Painel simples listando os projetos carregados, indicando o status do processamento (*Processando* ou *Pronto para Consulta*).

#### 3.2. Análise e Resumo Automatizado por IA
* **Extração de Medidas Críticas:** Leitura imediata e estruturação das dimensões centrais de cada ambiente, espessuras de paredes informadas e recuos previstos na prancha.
* **Quadro de Esquadrias Digital:** Mapeamento inteligente de portas e janelas com suas respectivas dimensões técnicas (ex: "Janela J1: 1.50m x 1.20m, Peitoril: 1.00m"), formatado em uma lista direta e visual.
* **Guia Prático de Execução:** Geração de um resumo sequencial no estilo checklist com os pontos mais importantes para iniciar a locação e elevação da alvenaria descrita no arquivo.

#### 3.3. Interface de Suporte e Consulta (Chat de Texto e Toque)
* **Chat Baseado em Texto:** Linha de conversa tradicional onde o usuário digita termos ou perguntas específicas de forma direta e objetiva sobre o projeto aberto.
* **Botões de Atalho Rápido (*Quick Replies*):** Interface fortemente guiada por ações de um toque. O sistema gera automaticamente botões contextualizados com base na planta (ex: *"Ver medidas do Quarto 1"*, *"Quais as dimensões da cozinha?"*, *"Lista de portas"*), eliminando a necessidade de digitação constante no ambiente de obra.

---

### 4. Diretrizes de UX/UI (Design)
* **Navegação Nativa Fluida:** Estrutura simples utilizando barra de navegação inferior (*Bottom Navigation*) para acesso rápido entre a lista de projetos e o chat ativo.
* **Acessibilidade para Canteiros:** Botões generosos com áreas de toque ampliadas, fontes em escala aumentada (tipografia Inter) e alto contraste cromático para garantir legibilidade sob incidência direta de luz solar.
* **Paleta de Cores:** Foco em tons profissionais de **Azul Técnico** e **Ardósia (Slate)**, transmitindo segurança, sobriedade técnica e seriedade.

---

### 5. Arquitetura e Requisitos Técnicos
* **Frontend Mobile:** Construído em framework mobile moderno (como React Native), garantindo compilação nativa para Android e iOS, além de integração estável com as APIs locais de *Document Picker* (seleção de arquivos).
* **Backend & APIs:** Infraestrutura leve e de alto desempenho desenvolvida em **Python** com **FastAPI** para gerenciar a recepção de PDFs e estruturar os payloads enviados para a camada de inteligência.
* **Camada de IA (Engine):** Integração direta via **SDK do OpenRouter**. A escolha centraliza o gerenciamento de chamadas e o faturamento, permitindo alternar de forma dinâmica entre os melhores modelos multimodais de visão do mercado (ex: GPT-4o, Claude 3.5 Sonnet) para refinar a acurácia de leitura das cotas do projeto arquitetônico sem necessidade de refatorar o backend.

---

### 6. Métricas de Sucesso do MVP
1.  **Assertividade do Motor:** Percentual de acerto e consistência da IA ao ler e estruturar medidas, portas e janelas com base no PDF, mantendo a taxa de alucinação técnica próxima a zero.
2.  **Adoção dos Atalhos:** Taxa de cliques nos botões de atalho rápido em comparação com mensagens de texto digitadas manualmente no chat.
3.  **Retenção e Uso Prático:** Frequência com que o mestre de obras retorna e consulta o aplicativo para a mesma obra ao longo da semana de execução.