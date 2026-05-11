from typing import Annotated, TypedDict
from langgraph.graph import StateGraph, START, END
from langgraph.graph.message import add_messages
from langgraph.prebuilt import ToolNode
from langchain_core.messages import BaseMessage, SystemMessage
from app.agent.llm import get_llm
from app.agent.prompts import SYSTEM_PROMPT
from app.agent.tools import (
    log_interaction,
    edit_interaction,
    search_interactions,
    summarize_hcp_history,
    suggest_follow_ups,
)


TOOLS = [
    log_interaction,
    edit_interaction,
    search_interactions,
    summarize_hcp_history,
    suggest_follow_ups,
]


class AgentState(TypedDict):
    messages: Annotated[list[BaseMessage], add_messages]
    session_id: str


def _agent_node(state: AgentState) -> dict:
    messages_text = "\n".join(getattr(m, "content", "") or "" for m in state["messages"])
    llm = get_llm(messages_text=messages_text, with_tools=TOOLS)
    msgs = [SystemMessage(content=SYSTEM_PROMPT)] + state["messages"]
    response = llm.invoke(msgs)
    return {"messages": [response]}


def _route_tools(state: AgentState) -> str:
    last = state["messages"][-1]
    if getattr(last, "tool_calls", None):
        return "tools"
    return END


def build_graph():
    g = StateGraph(AgentState)
    g.add_node("agent", _agent_node)
    g.add_node("tools", ToolNode(TOOLS))
    g.add_edge(START, "agent")
    g.add_conditional_edges("agent", _route_tools, {"tools": "tools", END: END})
    g.add_edge("tools", "agent")
    return g.compile()


graph = build_graph()
