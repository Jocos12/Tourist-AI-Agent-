from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.logging_config import get_logger, setup_logging

setup_logging(settings.log_level)
logger = get_logger("api")

app = FastAPI(
    title="Hodari Orchestrator",
    description="Multi-agent tourist assistant — FIFA World Cup 2026",
    version="0.1.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
async def health():
    return {"status": "ok"}


def _register_agent_routes() -> None:
    import asyncio
    from typing import Annotated

    from fastapi import File, UploadFile
    from fastapi.responses import StreamingResponse
    from pydantic import BaseModel

    from app.orchestrator.pipeline import execute_turn
    from app.schemas.requests import TurnRequest

    @app.post("/agent/turn")
    async def agent_turn(req: TurnRequest):
        async def event_stream():
            try:
                async for chunk in execute_turn(req):
                    yield chunk
                    await asyncio.sleep(0)
            except Exception as e:
                logger.exception("turn_error", error=str(e))
                yield f'event: error\ndata: {{"message": "{str(e)}"}}\n\n'

        return StreamingResponse(
            event_stream(),
            media_type="text/event-stream",
            headers={
                "Cache-Control": "no-cache",
                "Connection": "keep-alive",
                "X-Accel-Buffering": "no",
            },
        )

    class VoiceTranscript(BaseModel):
        text: str

    @app.post("/agent/voice", response_model=VoiceTranscript)
    async def agent_voice(
        user_id: Annotated[str, File()],
        session_id: Annotated[str, File()],
        audio: UploadFile = File(...),
    ):
        audio_bytes = await audio.read()
        logger.info("voice_received", user_id=user_id, session_id=session_id, bytes=len(audio_bytes))
        if settings.mock_agents or not settings.google_api_key:
            return VoiceTranscript(text="I have 4 hours before the game, find me something great to do")
        return VoiceTranscript(text="Transcribed speech placeholder")


_register_agent_routes()
