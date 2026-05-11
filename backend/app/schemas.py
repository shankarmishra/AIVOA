from datetime import datetime
from uuid import UUID
from pydantic import BaseModel, ConfigDict
from app.models import Sentiment


class HCPOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: UUID
    name: str
    specialty: str | None = None
    institution: str | None = None


class InteractionOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: UUID
    hcp_id: UUID
    interaction_type: str
    occurred_at: datetime
    attendees: str | None = None
    topics_discussed: str | None = None
    materials_shared: list | None = None
    samples_distributed: list | None = None
    sentiment: Sentiment | None = None
    outcomes: str | None = None
    follow_up_actions: str | None = None
    ai_summary: str | None = None
    ai_suggestions: list | None = None
    created_at: datetime
    updated_at: datetime


class AgentInvokeRequest(BaseModel):
    session_id: str
    message: str
    mode: str = "chat"  # "chat" | "form"
    form_data: dict | None = None


class ToolCall(BaseModel):
    name: str
    args: dict
    result: dict | list | str | None = None


class AgentInvokeResponse(BaseModel):
    final_text: str
    tool_calls: list[ToolCall]
