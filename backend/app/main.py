from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.routers import hcps, agent, interactions

app = FastAPI(title="AIVOA HCP CRM")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(hcps.router)
app.include_router(agent.router)
app.include_router(interactions.router)


@app.get("/healthz")
def healthz():
    return {"status": "ok"}
