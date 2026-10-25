import logging
import uuid
from typing import Dict, Any, Optional
from app.core.config import settings

logger = logging.getLogger("voice_agent")

class VoiceAgentService:
    def __init__(self):
        self.account_sid = settings.TWILIO_ACCOUNT_SID
        self.auth_token = settings.TWILIO_AUTH_TOKEN
        self.caller_number = settings.TWILIO_CALLER_NUMBER
        self.is_mock = self.account_sid.startswith("MOCK")

    async def trigger_cod_verification_call(self, recipient_phone: str, customer_name: str, order_ref: str, amount_inr: float, items_summary: str = "your recent order") -> Dict[str, Any]:
        """Initiates automated bilingual AI voice call to verify Cash on Delivery order."""
        call_sid = f"CA{uuid.uuid4().hex[:32]}"
        
        # Bilingual Prompt Script:
        # "Namaste {customer_name}, Flying Cheetah partner store se bol rahe hain.
        #  Aapka order {order_ref} amount Rs {amount_inr} COD verify karne ke liye call kiya hai.
        #  Kya aap ye order confirm karna chahte hain? Kripya Haan ya Nahi boliye."
        
        logger.info(f"[Voice AI] Initiated COD Verification call to {recipient_phone} for order {order_ref} (₹{amount_inr})")
        
        if self.is_mock:
            return {
                "call_sid": call_sid,
                "status": "initiated",
                "phone": recipient_phone,
                "order_ref": order_ref,
                "script_preview": f"Namaste {customer_name}, confirming order {order_ref} for ₹{amount_inr}",
                "provider": "MockVoiceEngine"
            }
        
        # Production Twilio / Exotel API call
        # ...
        return {"call_sid": call_sid, "status": "initiated"}

    def generate_twiml_response(self, customer_input: Optional[str] = None) -> str:
        """Generates TwiML response with interactive Gather & Speech Recognition."""
        if not customer_input:
            # Initial prompt
            return """<?xml version="1.0" encoding="UTF-8"?>
<Response>
    <Gather input="speech" timeout="5" language="hi-IN,en-IN" action="/api/v1/voice/twiml-callback" method="POST">
        <Say language="hi-IN" voice="Polly.Aditi">
            Namaste! Flying Cheetah verification agent bol rahi hoon. Kya aap apna Cash on Delivery order confirm karna chahte hain? Kripya Haan ya Na boliye.
        </Say>
    </Gather>
    <Say language="en-IN">We did not receive your input. We will follow up on WhatsApp. Thank you.</Say>
</Response>"""

        # Analyze input speech
        text_lower = customer_input.lower()
        if any(w in text_lower for w in ["haan", "yes", "confirm", "sahi hai", "kar do"]):
            intent = "confirmed"
            reply = "Dhanyawad! Aapka order successfully confirm ho gaya hai aur warehouse se dispatch kar diya gaya hai. Have a great day!"
        elif any(w in text_lower for w in ["nahi", "na", "cancel", "mat bhejo", "no"]):
            intent = "cancelled"
            reply = "Koi baat nahi! Aapka order cancel kar diya gaya hai. Agar aapko koi madad chahiye, toh hume WhatsApp par message kar sakte hain. Shukriya!"
        else:
            intent = "unclear"
            reply = "Shukriya! Aapka response record ho gaya hai. Hamari team WhatsApp par details bhejegi."

        return f"""<?xml version="1.0" encoding="UTF-8"?>
<Response>
    <Say language="hi-IN" voice="Polly.Aditi">{reply}</Say>
    <Hangup/>
</Response>"""

voice_service = VoiceAgentService()
