import json
from fastapi import APIRouter
from langchain_core.messages import HumanMessage, AIMessage, ToolMessage
from app.agent.graph import graph
from app.schemas import AgentInvokeRequest, AgentInvokeResponse, ToolCall

router = APIRouter(prefix="/agent", tags=["agent"])


def _build_user_message(req: AgentInvokeRequest) -> str:
    if req.mode == "form" and req.form_data:
        return (
            "FORM_SUBMIT: The user submitted a structured form. "
            "Call log_interaction directly with these fields and do not ask follow-up questions.\n"
            f"Fields: {json.dumps(req.form_data, default=str)}"
        )
    return req.message


@router.post("/invoke", response_model=AgentInvokeResponse)
def invoke(req: AgentInvokeRequest) -> AgentInvokeResponse:
    user_text = _build_user_message(req)
    state = {"messages": [HumanMessage(content=user_text)], "session_id": req.session_id}
    result = graph.invoke(state)

    tool_calls: list[ToolCall] = []
    final_text = ""
    pending: dict[str, dict] = {}

    for msg in result["messages"]:
        if isinstance(msg, AIMessage):
            for tc in (msg.tool_calls or []):
                pending[tc["id"]] = {"name": tc["name"], "args": tc["args"]}
            if msg.content:
                final_text = msg.content
        elif isinstance(msg, ToolMessage):
            base = pending.pop(msg.tool_call_id, {"name": msg.name, "args": {}})
            tool_calls.append(ToolCall(
                name=base["name"],
                args=base["args"],
                result=_safe_parse(msg.content),
            ))

    for tc_id, info in pending.items():
        tool_calls.append(ToolCall(name=info["name"], args=info["args"], result=None))

    return AgentInvokeResponse(final_text=final_text, tool_calls=tool_calls)


def _safe_parse(content):
    if not isinstance(content, str):
        return content
    try:
        return json.loads(content)
    except (json.JSONDecodeError, TypeError):
        return content
