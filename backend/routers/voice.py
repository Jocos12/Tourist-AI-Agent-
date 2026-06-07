from __future__ import annotations

import os
import uuid

import google.generativeai as genai
from fastapi import APIRouter, File, HTTPException, UploadFile
from pydantic import BaseModel

from utils.logger import get_logger, log_error


router = APIRouter(prefix="/agent", tags=["agent"])
logger = get_logger(__name__)
MAX_AUDIO_BYTES = 10 * 1024 * 1024
SUPPORTED_AUDIO_TYPES = {"audio/webm", "audio/wav", "audio/mpeg", "audio/mp3", "audio/ogg"}


class VoiceResponse(BaseModel):
    transcription: str
    session_id: str


@router.post("/voice", response_model=VoiceResponse)
async def voice(audio: UploadFile = File(...)) -> VoiceResponse:
    content_type = audio.content_type or "application/octet-stream"
    if content_type not in SUPPORTED_AUDIO_TYPES:
        raise HTTPException(status_code=415, detail=f"Unsupported audio format: {content_type}")

    audio_bytes = await audio.read()
    if len(audio_bytes) > MAX_AUDIO_BYTES:
        raise HTTPException(status_code=413, detail="Audio file is too large. Maximum size is 10MB.")

    session_id = f"ses_{uuid.uuid4().hex}"
    try:
        transcription = await _transcribe_with_gemini(audio_bytes, content_type)
    except Exception as gemini_error:
        logger.warning("gemini_audio_transcription_failed", error=str(gemini_error), filename=audio.filename)
        try:
            transcription = await _transcribe_with_google_speech(audio_bytes, content_type)
        except Exception as fallback_error:
            log_error("", session_id, type(fallback_error).__name__, str(fallback_error), "voice")
            raise HTTPException(status_code=502, detail="Audio transcription failed.") from fallback_error

    logger.info(
        "voice_transcribed",
        user_id="",
        session_id=session_id,
        agent="voice",
        duration_ms=None,
        filename=audio.filename,
        content_type=content_type,
        byte_count=len(audio_bytes),
        transcription_preview=transcription[:160],
    )
    return VoiceResponse(transcription=transcription, session_id=session_id)


async def _transcribe_with_gemini(audio_bytes: bytes, content_type: str) -> str:
    api_key = os.getenv("GEMINI_API_KEY") or os.getenv("GOOGLE_API_KEY")
    if not api_key:
        raise RuntimeError("GEMINI_API_KEY is not configured")
    genai.configure(api_key=api_key)
    model = genai.GenerativeModel(os.getenv("GEMINI_MODEL", "gemini-1.5-pro"))
    response = await model.generate_content_async(
        [
            "Transcribe this audio. Return only the spoken text, no commentary.",
            {"mime_type": content_type, "data": audio_bytes},
        ]
    )
    transcription = (response.text or "").strip()
    if not transcription:
        raise RuntimeError("Gemini returned an empty transcription")
    return transcription


async def _transcribe_with_google_speech(audio_bytes: bytes, content_type: str) -> str:
    try:
        from google.cloud import speech_v1p1beta1 as speech
    except Exception as exc:
        raise RuntimeError("Google Speech-to-Text fallback is not installed") from exc

    encoding = speech.RecognitionConfig.AudioEncoding.WEBM_OPUS
    if content_type in {"audio/wav"}:
        encoding = speech.RecognitionConfig.AudioEncoding.LINEAR16
    elif content_type in {"audio/mpeg", "audio/mp3"}:
        encoding = speech.RecognitionConfig.AudioEncoding.MP3

    client = speech.SpeechAsyncClient()
    response = await client.recognize(
        config=speech.RecognitionConfig(
            encoding=encoding,
            language_code="en-US",
            alternative_language_codes=["fr-FR", "es-US"],
            enable_automatic_punctuation=True,
        ),
        audio=speech.RecognitionAudio(content=audio_bytes),
    )
    return " ".join(result.alternatives[0].transcript for result in response.results if result.alternatives).strip()
