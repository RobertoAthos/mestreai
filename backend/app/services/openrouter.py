import json
import re
from pathlib import Path
from typing import Optional

from openai import AsyncOpenAI

from app.config import get_settings
from app.models.schemas import ChatMessage, ChatRole, ProjectSummary
from app.services.pdf_processor import extract_text, render_page_as_base64_png

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
    cleaned = _strip_code_fences(text)
    return json.loads(cleaned)


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

    async def summarize_project(self, pdf_path: Path) -> ProjectSummary:
        if self.is_mocked:
            return MOCK_SUMMARY.model_copy(deep=True)

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

        completion = await self.client.chat.completions.create(
            model=self.settings.openrouter_model,
            messages=[
                {"role": "system", "content": SYSTEM_PROMPT_SUMMARY},
                {"role": "user", "content": user_content},
            ],
            temperature=0.1,
            response_format={"type": "json_object"},
        )
        payload = _parse_json(completion.choices[0].message.content or "{}")
        return ProjectSummary.model_validate(payload)

    async def chat(
        self,
        question: str,
        summary: Optional[ProjectSummary],
        history: list[ChatMessage],
    ) -> tuple[str, list[str]]:
        if self.is_mocked:
            return _mock_chat(question, summary)

        context_lines: list[str] = []
        if summary:
            context_lines.append("Resumo estruturado do projeto:\n" + summary.model_dump_json(indent=2))
        context = "\n\n".join(context_lines) or "Nenhum projeto carregado."

        messages: list[dict] = [
            {"role": "system", "content": SYSTEM_PROMPT_CHAT},
            {"role": "system", "content": context},
        ]
        for msg in history[-10:]:
            messages.append({"role": msg.role.value, "content": msg.content})
        messages.append({"role": "user", "content": question})

        completion = await self.client.chat.completions.create(
            model=self.settings.openrouter_model,
            messages=messages,
            temperature=0.2,
            response_format={"type": "json_object"},
        )
        raw = completion.choices[0].message.content or "{}"
        try:
            payload = _parse_json(raw)
        except json.JSONDecodeError:
            return raw, []
        answer = str(payload.get("answer", raw)).strip()
        replies = [str(q).strip() for q in payload.get("quick_replies", []) if str(q).strip()]
        return answer, replies[:4]


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


_client: Optional[OpenRouterClient] = None


def get_openrouter() -> OpenRouterClient:
    global _client
    if _client is None:
        _client = OpenRouterClient()
    return _client
