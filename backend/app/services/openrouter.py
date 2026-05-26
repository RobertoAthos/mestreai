import asyncio
import json
import logging
import re
from pathlib import Path
from typing import AsyncIterator, Optional

from json_repair import repair_json
from openai import AsyncOpenAI
from pydantic import ValidationError

from app.config import get_settings
from app.models.schemas import ChatMessage, ChatRole, ProjectSummary
from app.services.pdf_processor import extract_text, render_page_as_base64_png

logger = logging.getLogger(__name__)


class LLMParseError(RuntimeError):
    """Raised when the LLM response cannot be coerced into the expected schema."""


SYSTEM_PROMPT_SUMMARY = """Você é o Mestre IA, um assistente especialista em interpretar projetos arquitetônicos
para mestres de obras e pedreiros brasileiros. Sua tarefa é ler o PDF de uma planta baixa e
devolver um JSON estruturado com as medidas dos cômodos, esquadrias e um checklist prático
de execução. Seja preciso, objetivo e use unidades em metros. Não invente medidas: se uma
informação não estiver clara na planta, deixe o campo vazio ou null. Responda exclusivamente
em JSON válido conforme o esquema solicitado, sem texto adicional."""

SYSTEM_PROMPT_CHAT = """Você é o Mestre IA, um assistente prático para mestres de obras no canteiro.
Use o resumo estruturado do projeto fornecido como contexto e responda em português brasileiro,
de forma direta, curta e usando vocabulário comum de obra (alvenaria, contramarco, peitoril,
prumada, etc). Quando citar medidas, sempre informe a unidade. Se a informação não estiver
no projeto, diga que não está na planta — não invente.
Após responder, sugira de 2 a 4 perguntas curtas de acompanhamento que façam sentido no
contexto da obra (botões de atalho). Devolva sua resposta no seguinte JSON estrito:
{"answer": "...", "quick_replies": ["...", "..."]}"""

# Plain-text variant used by stream_chat. Quick replies come from a separate
# follow-up call so the main answer can stream as natural prose without JSON
# scaffolding bleeding into the UI.
SYSTEM_PROMPT_CHAT_TEXT = """Você é o Mestre IA, um assistente prático para mestres de obras no canteiro.

Você terá três fontes de contexto, em ordem de prioridade:
1. O RESUMO ESTRUTURADO do projeto (medidas, esquadrias, paredes, checklist).
2. A MEMÓRIA DA CONVERSA (resumo das mensagens mais antigas, se existir).
3. O HISTÓRICO RECENTE de mensagens trocadas com o usuário.

REGRAS DE CONTINUIDADE:
- Sempre considere o que já foi dito antes. Se o usuário pergunta "e a outra?" ou "e
  esse?", interprete usando a última coisa que ele perguntou ou que você respondeu.
- Quando o usuário citar algo discutido antes (um cômodo, uma porta, uma medida),
  amarre sua resposta ao que vocês já trataram.
- Se a memória da conversa contiver um fato relevante, use-o sem repetir tudo.
- Se faltar contexto para entender a pergunta, pergunte de volta em vez de inventar.

Responda em português brasileiro, de forma direta, curta e usando vocabulário comum
de obra (alvenaria, contramarco, peitoril, prumada etc). Quando citar medidas,
sempre informe a unidade. Se a informação não estiver no projeto, diga que não está
na planta — não invente. Responda APENAS com o texto da resposta, sem JSON, sem
markdown extra, sem rótulos como 'Resposta:'."""


SYSTEM_PROMPT_HISTORY_SUMMARY = """Você é um assistente que comprime conversas técnicas de
obra em uma memória curta e factual. Receberá uma sequência de mensagens entre um
mestre de obras (USER) e o Mestre IA (ASSISTANT). Devolva um único parágrafo em
português brasileiro descrevendo:
- quais assuntos já foram tratados (cômodos, esquadrias, paredes, materiais);
- decisões ou confirmações que o usuário deu;
- dúvidas que ficaram em aberto.
Sem listas, sem markdown, sem citar números de mensagem. Máximo 6 frases."""


SUMMARY_JSON_SCHEMA_HINT = """Esquema esperado:
{
  "rooms": [{"name": str, "width_m": float|null, "length_m": float|null, "area_m2": float|null, "notes": str|null}],
  "doors": [{"code": str, "width_m": float, "height_m": float, "room": str|null, "notes": str|null}],
  "windows": [{"code": str, "width_m": float, "height_m": float, "sill_height_m": float|null, "room": str|null, "notes": str|null}],
  "walls": [{"type": str, "thickness_cm": float, "notes": str|null}],
  "execution_checklist": [str, str, ...],
  "general_notes": str|null
}"""


MOCK_SUMMARY = ProjectSummary(
    rooms=[
        {"name": "Sala de Estar", "width_m": 4.20, "length_m": 5.50, "area_m2": 23.10, "notes": "Integrada com a cozinha"},
        {"name": "Cozinha", "width_m": 3.10, "length_m": 4.20, "area_m2": 13.02, "notes": "Bancada em L"},
        {"name": "Quarto 1 (Suíte)", "width_m": 3.50, "length_m": 4.00, "area_m2": 14.00, "notes": "Suíte com banheiro"},
        {"name": "Quarto 2", "width_m": 3.00, "length_m": 3.50, "area_m2": 10.50, "notes": None},
        {"name": "Banheiro Social", "width_m": 1.50, "length_m": 2.40, "area_m2": 3.60, "notes": None},
        {"name": "Banheiro Suíte", "width_m": 1.50, "length_m": 2.20, "area_m2": 3.30, "notes": "Box 0.90x1.20"},
        {"name": "Área de Serviço", "width_m": 1.80, "length_m": 2.20, "area_m2": 3.96, "notes": None},
    ],
    doors=[
        {"code": "P1", "width_m": 0.90, "height_m": 2.10, "room": "Entrada principal", "notes": "Folha de madeira maciça"},
        {"code": "P2", "width_m": 0.80, "height_m": 2.10, "room": "Quarto 1", "notes": None},
        {"code": "P3", "width_m": 0.80, "height_m": 2.10, "room": "Quarto 2", "notes": None},
        {"code": "P4", "width_m": 0.70, "height_m": 2.10, "room": "Banheiro Social", "notes": None},
        {"code": "P5", "width_m": 0.70, "height_m": 2.10, "room": "Banheiro Suíte", "notes": None},
        {"code": "P6", "width_m": 0.80, "height_m": 2.10, "room": "Cozinha", "notes": "Porta de correr"},
    ],
    windows=[
        {"code": "J1", "width_m": 1.50, "height_m": 1.20, "sill_height_m": 1.00, "room": "Sala", "notes": "2 folhas de correr"},
        {"code": "J2", "width_m": 1.20, "height_m": 1.20, "sill_height_m": 1.00, "room": "Quarto 1", "notes": None},
        {"code": "J3", "width_m": 1.20, "height_m": 1.20, "sill_height_m": 1.00, "room": "Quarto 2", "notes": None},
        {"code": "J4", "width_m": 0.60, "height_m": 0.60, "sill_height_m": 1.80, "room": "Banheiro Social", "notes": "Basculante"},
        {"code": "J5", "width_m": 0.60, "height_m": 0.60, "sill_height_m": 1.80, "room": "Banheiro Suíte", "notes": "Basculante"},
        {"code": "J6", "width_m": 1.00, "height_m": 1.00, "sill_height_m": 1.20, "room": "Cozinha", "notes": None},
    ],
    walls=[
        {"type": "Alvenaria externa", "thickness_cm": 19.0, "notes": "Bloco cerâmico 14x19x39 + reboco 2.5cm cada lado"},
        {"type": "Alvenaria interna", "thickness_cm": 14.0, "notes": "Bloco cerâmico 9x19x19 + reboco"},
        {"type": "Divisória de gesso", "thickness_cm": 10.0, "notes": "Apenas closet"},
    ],
    execution_checklist=[
        "Conferir esquadro e nível do baldrame antes de iniciar a 1ª fiada.",
        "Marcar locação dos cômodos com linha e cal, validando medidas externas (12.40m x 9.80m).",
        "Posicionar contramarcos das portas P1 a P6 conforme largura indicada.",
        "Locar peitoris das janelas J1 a J6 a 1.00m do piso (banheiros a 1.80m).",
        "Subir alvenaria externa (19cm) primeiro, depois divisórias internas (14cm).",
        "Deixar vãos para esquadrias com folga de 1.5cm em cada lado para chumbamento.",
        "Conferir prumadas hidráulicas dos banheiros antes de fechar a alvenaria.",
    ],
    general_notes="Projeto residencial térreo de aproximadamente 72m². Atenção especial à locação da suíte, que tem desnível de 2cm em relação ao corredor.",
)


def _strip_code_fences(text: str) -> str:
    fenced = re.search(r"```(?:json)?\s*(\{.*?\})\s*```", text, re.DOTALL)
    if fenced:
        return fenced.group(1)
    return text.strip()


def _parse_json(text: str) -> dict:
    """Best-effort parse of an LLM JSON response.

    Tries strict json.loads first; on failure, runs json-repair to fix common
    truncation/quoting issues (missing commas, unclosed arrays, trailing commas,
    etc). Raises LLMParseError if the result still isn't a dict.
    """
    cleaned = _strip_code_fences(text)
    try:
        parsed = json.loads(cleaned)
    except json.JSONDecodeError as exc:
        logger.warning("Strict JSON parse failed (%s); attempting json-repair.", exc)
        repaired = repair_json(cleaned, return_objects=True)
        if not repaired:
            raise LLMParseError("Resposta da IA veio vazia ou irrecuperável.") from exc
        parsed = repaired
    if not isinstance(parsed, dict):
        raise LLMParseError("Resposta da IA não é um objeto JSON.")
    return parsed


class OpenRouterClient:
    def __init__(self) -> None:
        settings = get_settings()
        self.settings = settings
        self.client = AsyncOpenAI(
            api_key=settings.openrouter_api_key,
            base_url=settings.openrouter_base_url,
            default_headers={
                "HTTP-Referer": "https://mestreia.app",
                "X-Title": "Mestre IA",
            },
        )

    @property
    def is_mocked(self) -> bool:
        return self.settings.mock_ai or self.settings.openrouter_api_key.startswith("mock-")

    def _build_summary_messages(self, pdf_path: Path) -> list[dict]:
        text = extract_text(pdf_path)
        image_b64 = render_page_as_base64_png(pdf_path, page_index=0)

        user_content: list[dict] = [
            {
                "type": "text",
                "text": (
                    "Analise o PDF da planta arquitetônica a seguir e devolva o JSON "
                    "estruturado conforme o esquema abaixo.\n\n"
                    f"{SUMMARY_JSON_SCHEMA_HINT}\n\n"
                    "Texto extraído do PDF:\n"
                    f"{text or '(sem texto vetorial)'}"
                ),
            }
        ]
        if image_b64:
            user_content.append(
                {
                    "type": "image_url",
                    "image_url": {"url": f"data:image/png;base64,{image_b64}"},
                }
            )

        return [
            {"role": "system", "content": SYSTEM_PROMPT_SUMMARY},
            {"role": "user", "content": user_content},
        ]

    async def summarize_project(self, pdf_path: Path) -> ProjectSummary:
        if self.is_mocked:
            return MOCK_SUMMARY.model_copy(deep=True)

        messages = self._build_summary_messages(pdf_path)
        raw = await self._complete_json(messages, temperature=0.1)
        try:
            payload = _parse_json(raw)
            return ProjectSummary.model_validate(payload)
        except (LLMParseError, ValidationError) as exc:
            logger.warning("First summary parse/validation failed (%s); retrying once.", exc)

        # Retry once asking the model to re-emit strict JSON. Common cause is
        # truncation at max_tokens or a single stray comma.
        repair_messages = messages + [
            {"role": "assistant", "content": raw},
            {
                "role": "user",
                "content": (
                    "Sua resposta anterior não é JSON estritamente válido conforme o "
                    "esquema. Reenvie APENAS o JSON, sem texto fora dele, sem markdown, "
                    "fechando todas as listas e chaves."
                ),
            },
        ]
        raw_retry = await self._complete_json(repair_messages, temperature=0.0)
        try:
            payload = _parse_json(raw_retry)
            return ProjectSummary.model_validate(payload)
        except (LLMParseError, ValidationError) as exc:
            logger.exception("Summary parse failed after retry. Raw responses logged below.")
            logger.error("First raw response: %s", raw)
            logger.error("Retry raw response: %s", raw_retry)
            raise LLMParseError("Não foi possível interpretar a resposta da IA.") from exc

    async def _complete_json(self, messages: list[dict], temperature: float) -> str:
        completion = await self.client.chat.completions.create(
            model=self.settings.openrouter_model,
            messages=messages,
            temperature=temperature,
            max_tokens=self.settings.openrouter_max_tokens,
            response_format={"type": "json_object"},
        )
        return completion.choices[0].message.content or "{}"

    async def stream_summary(self, pdf_path: Path) -> AsyncIterator[dict]:
        """Stream the analysis. Yields dicts:

        - {"type": "token", "delta": str, "buffer": str} for each LLM chunk.
        - {"type": "done", "summary": ProjectSummary} when the JSON parses.
        - {"type": "error", "message": str} on failure.

        Mocked mode emits MOCK_SUMMARY in pseudo-chunks so the UI can be tested
        end-to-end without an API key.
        """
        if self.is_mocked:
            async for ev in _mock_stream_summary():
                yield ev
            return

        messages = self._build_summary_messages(pdf_path)
        buffer = ""
        try:
            stream = await self.client.chat.completions.create(
                model=self.settings.openrouter_model,
                messages=messages,
                temperature=0.1,
                max_tokens=self.settings.openrouter_max_tokens,
                response_format={"type": "json_object"},
                stream=True,
            )
            async for chunk in stream:
                if not chunk.choices:
                    continue
                delta = chunk.choices[0].delta.content or ""
                if not delta:
                    continue
                buffer += delta
                yield {"type": "token", "delta": delta, "buffer": buffer}
        except Exception as exc:
            logger.exception("Streaming LLM call failed.")
            yield {"type": "error", "message": f"Falha na chamada da IA: {exc}"}
            return

        try:
            payload = _parse_json(buffer)
            summary = ProjectSummary.model_validate(payload)
        except (LLMParseError, ValidationError) as exc:
            logger.warning("Stream summary parse failed (%s); attempting one repair call.", exc)
            repair_messages = messages + [
                {"role": "assistant", "content": buffer},
                {
                    "role": "user",
                    "content": (
                        "Sua resposta anterior não é JSON estritamente válido conforme o "
                        "esquema. Reenvie APENAS o JSON, sem texto fora dele, sem markdown, "
                        "fechando todas as listas e chaves."
                    ),
                },
            ]
            try:
                raw_retry = await self._complete_json(repair_messages, temperature=0.0)
                payload = _parse_json(raw_retry)
                summary = ProjectSummary.model_validate(payload)
            except (LLMParseError, ValidationError) as retry_exc:
                logger.exception("Repair call also failed.")
                yield {"type": "error", "message": "Não foi possível interpretar a resposta da IA."}
                return

        yield {"type": "done", "summary": summary}

    async def stream_chat(
        self,
        question: str,
        summary: Optional[ProjectSummary],
        history: list[ChatMessage],
        chat_memory: Optional[str] = None,
    ) -> AsyncIterator[dict]:
        """Stream a chat answer as plain text, then emit quick_replies.

        Yields:
        - {"type": "token", "delta": str} as the assistant types.
        - {"type": "done", "answer": str, "quick_replies": [str]} at the end.
        - {"type": "error", "message": str} on failure.
        """
        if self.is_mocked:
            answer, replies = _mock_chat(question, summary)
            async for ev in _stream_text_pieces(answer):
                yield ev
            yield {"type": "done", "answer": answer, "quick_replies": replies}
            return

        messages = self._build_chat_messages(question, summary, history, chat_memory)

        answer_buffer = ""
        try:
            stream = await self.client.chat.completions.create(
                model=self.settings.openrouter_model,
                messages=messages,
                temperature=0.2,
                max_tokens=self.settings.openrouter_max_tokens,
                stream=True,
            )
            async for chunk in stream:
                if not chunk.choices:
                    continue
                delta = chunk.choices[0].delta.content or ""
                if not delta:
                    continue
                answer_buffer += delta
                yield {"type": "token", "delta": delta}
        except Exception as exc:
            logger.exception("Streaming chat call failed.")
            yield {"type": "error", "message": f"Falha na chamada da IA: {exc}"}
            return

        answer_text = answer_buffer.strip() or "(sem resposta)"
        replies = await self._suggest_quick_replies(question, answer_text, summary)
        yield {"type": "done", "answer": answer_text, "quick_replies": replies}

    async def _suggest_quick_replies(
        self,
        question: str,
        answer: str,
        summary: Optional[ProjectSummary],
    ) -> list[str]:
        """Second short LLM call (non-streaming, ~50 tokens) for follow-up chips.

        Kept tiny so the user doesn't perceive latency after the answer streams.
        Returns an empty list on any failure — frontend has its own fallbacks.
        """
        context = summary.model_dump_json(indent=2) if summary else "(sem projeto)"
        try:
            completion = await self.client.chat.completions.create(
                model=self.settings.openrouter_model,
                messages=[
                    {
                        "role": "system",
                        "content": (
                            "Você sugere de 2 a 4 perguntas curtas de acompanhamento para um "
                            "mestre de obras, em português brasileiro. Devolva APENAS um array "
                            "JSON de strings curtas (máx 35 chars cada). Sem texto fora do array."
                        ),
                    },
                    {
                        "role": "user",
                        "content": (
                            f"Contexto do projeto:\n{context}\n\n"
                            f"Pergunta do usuário: {question}\n\n"
                            f"Resposta dada:\n{answer}\n\n"
                            "Liste perguntas-atalho úteis agora."
                        ),
                    },
                ],
                temperature=0.4,
                max_tokens=200,
            )
            raw = (completion.choices[0].message.content or "").strip()
            cleaned = _strip_code_fences(raw)
            parsed = json.loads(cleaned) if cleaned.startswith("[") else repair_json(cleaned, return_objects=True)
            if isinstance(parsed, list):
                return [str(x).strip() for x in parsed if str(x).strip()][:4]
        except Exception:
            logger.warning("quick_replies suggestion failed; returning [].")
        return []

    async def chat(
        self,
        question: str,
        summary: Optional[ProjectSummary],
        history: list[ChatMessage],
        chat_memory: Optional[str] = None,
    ) -> tuple[str, list[str]]:
        if self.is_mocked:
            return _mock_chat(question, summary)

        # JSON-mode path uses the older prompt that asks for {answer, quick_replies}
        # in a single shot. Memory + history are stitched into a single user-side
        # context block so the schema instructions stay clean.
        messages = self._build_chat_messages(
            question, summary, history, chat_memory, system_prompt=SYSTEM_PROMPT_CHAT,
        )

        raw = await self._complete_json(messages, temperature=0.2)
        try:
            payload = _parse_json(raw)
        except LLMParseError:
            logger.warning("Chat response was unparseable JSON; returning raw text.")
            return raw, []
        answer = str(payload.get("answer", raw)).strip()
        replies = [str(q).strip() for q in payload.get("quick_replies", []) if str(q).strip()]
        return answer, replies[:4]

    def _build_chat_messages(
        self,
        question: str,
        summary: Optional[ProjectSummary],
        history: list[ChatMessage],
        chat_memory: Optional[str],
        system_prompt: str = SYSTEM_PROMPT_CHAT_TEXT,
    ) -> list[dict]:
        """Assemble the message list passed to the LLM, including all three
        memory layers: project summary, rolling chat_memory, and the last N
        raw turns."""
        context_blocks: list[str] = []
        if summary:
            context_blocks.append(
                "RESUMO ESTRUTURADO DO PROJETO:\n" + summary.model_dump_json(indent=2)
            )
        else:
            context_blocks.append("RESUMO ESTRUTURADO DO PROJETO: (nenhum projeto carregado)")
        if chat_memory:
            context_blocks.append(
                "MEMÓRIA DA CONVERSA (mensagens mais antigas, resumidas):\n" + chat_memory
            )
        context = "\n\n".join(context_blocks)

        messages: list[dict] = [
            {"role": "system", "content": system_prompt},
            {"role": "system", "content": context},
        ]
        window = max(1, self.settings.chat_history_window)
        for msg in history[-window:]:
            messages.append({"role": msg.role.value, "content": msg.content})
        messages.append({"role": "user", "content": question})
        return messages

    async def summarize_chat_history(self, messages: list[ChatMessage]) -> Optional[str]:
        """Compress a list of chat messages into a short memory paragraph.

        Returns None when there's nothing useful to compress or on any LLM
        failure — caller treats that as "keep using the previous memory".
        """
        if not messages:
            return None
        if self.is_mocked:
            # Deterministic mock memory so the threshold logic can be tested.
            return (
                "Conversa anterior cobriu " + str(len(messages)) +
                " mensagens sobre o projeto (medidas, esquadrias e checklist)."
            )

        transcript_lines = []
        for m in messages:
            role = "USER" if m.role == ChatRole.USER else "ASSISTANT"
            transcript_lines.append(f"{role}: {m.content}")
        transcript = "\n".join(transcript_lines)

        try:
            completion = await self.client.chat.completions.create(
                model=self.settings.openrouter_model,
                messages=[
                    {"role": "system", "content": SYSTEM_PROMPT_HISTORY_SUMMARY},
                    {"role": "user", "content": transcript},
                ],
                temperature=0.2,
                max_tokens=self.settings.chat_memory_max_tokens,
            )
            text = (completion.choices[0].message.content or "").strip()
            return text or None
        except Exception:
            logger.exception("Chat history summarization failed.")
            return None


def _mock_chat(question: str, summary: Optional[ProjectSummary]) -> tuple[str, list[str]]:
    q = question.lower().strip()
    rooms = summary.rooms if summary else []
    doors = summary.doors if summary else []
    windows = summary.windows if summary else []

    def fmt_room(r) -> str:
        dims = f"{r.width_m:.2f}m x {r.length_m:.2f}m" if r.width_m and r.length_m else "medidas não informadas"
        area = f", área {r.area_m2:.2f}m²" if r.area_m2 else ""
        return f"• {r.name}: {dims}{area}"

    if any(k in q for k in ["porta", "portas"]):
        body = "Lista de portas do projeto:\n" + "\n".join(
            f"• {d.code} ({d.room or 's/ ambiente'}): {d.width_m:.2f}m x {d.height_m:.2f}m"
            for d in doors
        )
        return body, ["Ver janelas", "Medidas da sala", "Espessura das paredes", "Checklist de execução"]

    if any(k in q for k in ["janela", "janelas", "esquadria"]):
        body = "Quadro de janelas do projeto:\n" + "\n".join(
            f"• {w.code} ({w.room or 's/ ambiente'}): {w.width_m:.2f}m x {w.height_m:.2f}m, peitoril {w.sill_height_m or 1.0:.2f}m"
            for w in windows
        )
        return body, ["Lista de portas", "Medidas dos quartos", "Espessura das paredes", "Checklist de execução"]

    if any(k in q for k in ["parede", "paredes", "espessura", "alvenaria"]):
        if summary and summary.walls:
            body = "Especificações das paredes:\n" + "\n".join(
                f"• {w.type}: {w.thickness_cm:.0f}cm — {w.notes or ''}".rstrip(" —")
                for w in summary.walls
            )
        else:
            body = "Não há especificação de paredes no resumo deste projeto."
        return body, ["Lista de portas", "Lista de janelas", "Checklist de execução", "Medidas da cozinha"]

    if any(k in q for k in ["checklist", "execução", "passo a passo", "ordem"]):
        items = summary.execution_checklist if summary else []
        body = "Checklist de execução:\n" + "\n".join(f"{i + 1}. {item}" for i, item in enumerate(items))
        return body, ["Lista de portas", "Lista de janelas", "Medidas dos quartos", "Espessura das paredes"]

    for r in rooms:
        if r.name.lower() in q or any(token in r.name.lower() for token in q.split() if len(token) > 3):
            extra = f" Observação: {r.notes}." if r.notes else ""
            return (
                f"{r.name}: {r.width_m or 0:.2f}m x {r.length_m or 0:.2f}m, área de {r.area_m2 or 0:.2f}m².{extra}",
                ["Lista de portas", "Lista de janelas", "Espessura das paredes", "Checklist de execução"],
            )

    if rooms:
        body = "Medidas dos ambientes do projeto:\n" + "\n".join(fmt_room(r) for r in rooms)
    else:
        body = "Ainda não tenho informações estruturadas deste projeto. Envie um PDF para que eu possa analisar."
    return body, ["Lista de portas", "Lista de janelas", "Espessura das paredes", "Checklist de execução"]


async def _mock_stream_summary() -> AsyncIterator[dict]:
    """Replay MOCK_SUMMARY as a token stream so the streaming UI is exercised
    even when no real LLM key is configured."""
    summary = MOCK_SUMMARY.model_copy(deep=True)
    raw = summary.model_dump_json()
    # Emit ~80-char windows with a small delay so the partial-summary UI has
    # something to render frame by frame.
    chunk_size = 80
    buffer = ""
    for i in range(0, len(raw), chunk_size):
        delta = raw[i : i + chunk_size]
        buffer += delta
        yield {"type": "token", "delta": delta, "buffer": buffer}
        await asyncio.sleep(0.08)
    yield {"type": "done", "summary": summary}


async def _stream_text_pieces(text: str) -> AsyncIterator[dict]:
    """Emit `text` in small chunks for the mocked chat streaming path."""
    chunk = 12
    for i in range(0, len(text), chunk):
        yield {"type": "token", "delta": text[i : i + chunk]}
        await asyncio.sleep(0.04)


_client: Optional[OpenRouterClient] = None


def get_openrouter() -> OpenRouterClient:
    global _client
    if _client is None:
        _client = OpenRouterClient()
    return _client
