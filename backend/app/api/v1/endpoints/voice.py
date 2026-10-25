import logging
from typing import List, Optional
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, status, Request, Response, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc

from app.core.database import get_db
from app.core.security import require_admin
from app.models.user import Profile
from app.models.voice import AIVoiceCall
from app.schemas.voice_schema import VoiceCallTrigger, VoiceCallResponse
from app.services.voice_agent import voice_service

logger = logging.getLogger("flyingcheetah.voice_api")
router = APIRouter()

@router.post("/trigger-cod-call", response_model=VoiceCallResponse, status_code=status.HTTP_201_CREATED)
async def trigger_cod_call(
    payload: VoiceCallTrigger,
    db: AsyncSession = Depends(get_db)
):
    """
    Triggers an automated bilingual AI voice call to verify Cash on Delivery orders.
    Uses Deepgram speech recognition, LLM intent reasoning, and ElevenLabs / Polly voice synthesis.
    """
    call_res = await voice_service.trigger_cod_verification_call(
        recipient_phone=payload.phone,
        customer_name=payload.customer_name,
        order_ref=payload.order_ref,
        amount_inr=payload.amount_inr or 0.0,
        items_summary=payload.items_summary or "your items"
    )

    voice_record = AIVoiceCall(
        call_sid=call_res["call_sid"],
        phone=payload.phone,
        call_type=payload.call_type,
        status="initiated",
        intent="unclear",
        duration_seconds=0,
        transcript=f"Call initiated for order {payload.order_ref}",
        customer_notes=f"Customer: {payload.customer_name}, Order: {payload.order_ref}"
    )

    db.add(voice_record)
    await db.commit()
    await db.refresh(voice_record)

    return voice_record

@router.post("/twiml-callback")
async def twiml_voice_callback(
    request: Request,
    db: AsyncSession = Depends(get_db)
):
    """
    Interactive TwiML Speech Recognition Callback.
    Receives SpeechResult from SIP trunk, detects customer intent (confirmed/cancelled),
    updates database record, and speaks back confirmation in Hindi/English.
    """
    form_data = await request.form()
    speech_result = form_data.get("SpeechResult", "")
    call_sid = form_data.get("CallSid", "")
    duration_str = form_data.get("CallDuration", "0")

    logger.info(f"[Voice Callback] CallSid: {call_sid}, SpeechResult: '{speech_result}'")

    intent = "unclear"
    if speech_result:
        lower_speech = speech_result.lower()
        if any(w in lower_speech for w in ["haan", "yes", "confirm", "sahi", "pakka"]):
            intent = "confirmed"
        elif any(w in lower_speech for w in ["nahi", "no", "cancel", "mat bhejo", "na"]):
            intent = "cancelled"

    # Update database record
    if call_sid:
        query = select(AIVoiceCall).where(AIVoiceCall.call_sid == call_sid)
        res = await db.execute(query)
        record = res.scalar_one_or_none()
        if record:
            record.status = "completed"
            record.intent = intent
            record.transcript = speech_result
            try:
                record.duration_seconds = int(duration_str)
            except ValueError:
                pass
            await db.commit()

    twiml_xml = voice_service.generate_twiml_response(customer_input=speech_result)
    return Response(content=twiml_xml, media_type="application/xml")

@router.get("/calls", response_model=List[VoiceCallResponse])
async def list_voice_calls(
    call_type: Optional[str] = Query(None),
    intent: Optional[str] = Query(None),
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    db: AsyncSession = Depends(get_db),
    admin_user: Profile = Depends(require_admin)
):
    """
    [Admin Guarded] Retrieve history of automated AI voice agent calls and verification transcripts.
    """
    query = select(AIVoiceCall).order_by(desc(AIVoiceCall.created_at)).offset(offset).limit(limit)
    if call_type:
        query = query.where(AIVoiceCall.call_type == call_type)
    if intent:
        query = query.where(AIVoiceCall.intent == intent)

    result = await db.execute(query)
    return result.scalars().all()
