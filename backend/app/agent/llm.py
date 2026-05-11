from langchain_groq import ChatGroq
from app.config import settings

LONG_CONTEXT_THRESHOLD_CHARS = 24000  # ~6k tokens at 4 chars/token


def get_llm(messages_text: str = "", with_tools: list | None = None) -> ChatGroq:
    model = settings.groq_model
    if len(messages_text) > LONG_CONTEXT_THRESHOLD_CHARS:
        model = settings.groq_fallback_model
    llm = ChatGroq(
        model=model,
        temperature=0.2,
        api_key=settings.groq_api_key,
    )
    if with_tools:
        llm = llm.bind_tools(with_tools)
    return llm


def quick_completion(prompt: str) -> str:
    """Single-shot LLM call for tool-internal summaries (no agent loop)."""
    llm = get_llm(prompt)
    return llm.invoke(prompt).content
