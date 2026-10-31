import logging
import asyncio
import smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
import httpx
from datetime import datetime, timezone
from typing import Dict, Any, List, Optional
from app.core.config import settings

logger = logging.getLogger("email_service")

class EmailNotificationService:
    def __init__(self):
        self.recipient = settings.OFFICIAL_ADMIN_EMAIL
        self.n8n_url = settings.N8N_WEBHOOK_URL
        self.smtp_host = settings.SMTP_HOST
        self.smtp_port = settings.SMTP_PORT
        self.smtp_user = settings.SMTP_USER
        self.smtp_password = settings.SMTP_PASSWORD
        self.smtp_from_name = getattr(settings, "SMTP_FROM_NAME", "Flying Cheetah Security")

    def _send_smtp_email_sync(self, to_email: str, subject: str, html_body: str, text_body: str) -> bool:
        """Synchronous SMTP mail dispatcher via STARTTLS."""
        if not self.smtp_user or not self.smtp_password or self.smtp_password == "your-google-app-password":
            logger.warning("[EmailService] SMTP credentials not configured. Skipping real dispatch.")
            return False

        try:
            msg = MIMEMultipart("alternative")
            msg["Subject"] = subject
            msg["From"] = f"{self.smtp_from_name} <{self.smtp_user}>"
            msg["To"] = to_email

            msg.attach(MIMEText(text_body, "plain"))
            msg.attach(MIMEText(html_body, "html"))

            with smtplib.SMTP(self.smtp_host, self.smtp_port, timeout=12) as server:
                server.starttls()
                server.login(self.smtp_user, self.smtp_password)
                server.sendmail(self.smtp_user, to_email, msg.as_string())

            logger.info(f"[EmailService] Real email successfully delivered to {to_email} via SMTP ({self.smtp_host})")
            return True
        except Exception as e:
            logger.error(f"[EmailService] Failed to send email to {to_email}: {e}")
            return False

    async def send_otp_email(self, to_email: str, otp_code: str, action: str = "Password Reset") -> bool:
        """Sends a branded 6-digit verification OTP email to user inbox asynchronously."""
        subject = f"Flying Cheetah Verification Code: {otp_code}"
        text_body = f"Your Flying Cheetah security code for {action} is: {otp_code}\n\nThis code will expire in 10 minutes.\nIf you did not request this, please review your account settings."
        
        html_body = f"""
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body {{ font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; margin: 0; padding: 24px; }}
    .container {{ max-width: 480px; margin: 0 auto; background: #ffffff; border-radius: 24px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 10px 25px rgba(0,0,0,0.06); }}
    .header {{ background: #0f172a; padding: 28px 20px; text-align: center; }}
    .logo {{ font-size: 22px; font-weight: 900; color: #ffffff; letter-spacing: -0.5px; text-transform: uppercase; }}
    .logo span {{ color: #f97316; }}
    .content {{ padding: 36px 30px; text-align: center; }}
    .badge {{ display: inline-block; padding: 4px 12px; background: #fff7ed; border: 1px solid #ffedd5; border-radius: 9999px; color: #ea580c; font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 12px; }}
    .title {{ font-size: 20px; font-weight: 900; color: #0f172a; margin-bottom: 8px; }}
    .subtitle {{ font-size: 13px; color: #64748b; line-height: 1.5; margin-bottom: 24px; }}
    .otp-box {{ display: inline-block; background: #fff7ed; border: 2px dashed #f97316; border-radius: 16px; padding: 14px 32px; font-size: 32px; font-weight: 900; letter-spacing: 8px; color: #ea580c; font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; margin-bottom: 24px; }}
    .security-notice {{ font-size: 11px; color: #94a3b8; line-height: 1.5; margin: 0; padding: 12px; background: #f8fafc; border-radius: 12px; }}
    .footer {{ background: #f8fafc; padding: 20px; text-align: center; font-size: 11px; color: #94a3b8; border-top: 1px solid #f1f5f9; }}
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="logo">FLYING <span>CHEETAH</span></div>
    </div>
    <div class="content">
      <div class="badge">Security Verification</div>
      <div class="title">{action} Verification</div>
      <div class="subtitle">Use the one-time security code below to complete your {action.lower()}. This code is valid for <strong>10 minutes</strong>.</div>
      <div class="otp-box">{otp_code}</div>
      <div class="security-notice">
        If you did not initiate this request, you can safely ignore this email. Never share this OTP with anyone.
      </div>
    </div>
    <div class="footer">
      &copy; 2026 Flying Cheetah Labs. All rights reserved.<br>Enterprise Commerce Automation & Hyperlocal Logistics.
    </div>
  </div>
</body>
</html>
"""
        return await asyncio.to_thread(self._send_smtp_email_sync, to_email, subject, html_body, text_body)

    async def send_lead_alert(self, lead_data: Dict[str, Any]) -> bool:
        """Sends instant transactional alert to agency email and fires n8n webhook."""
        timestamp = datetime.now(timezone.utc).strftime("%d %b %Y, %I:%M %p (UTC)")
        logger.info(f"[Email Alert] New lead from {lead_data.get('name')} ({lead_data.get('phone')}) dispatched to {self.recipient}")
        
        # Fire n8n webhook if configured
        if self.n8n_url:
            try:
                async with httpx.AsyncClient(timeout=5.0) as client:
                    await client.post(self.n8n_url, json={
                        "event": "lead_created",
                        "lead": lead_data,
                        "timestamp": timestamp
                    })
                    logger.info("[n8n] Successfully triggered lead webhook")
            except Exception as e:
                logger.warning(f"[n8n] Webhook delivery failed: {e}")

        return True

    async def send_demo_alert(self, name: str, email: str, phone: str, company: str, modules: List[str], scheduled_time: str) -> bool:
        """Sends demo booking notification to flyingcheetah.agency@gmail.com and triggers n8n."""
        logger.info(f"[Demo Alert] New Demo booked by {name} ({company}) for {scheduled_time} dispatched to {self.recipient}")
        if self.n8n_url:
            try:
                async with httpx.AsyncClient(timeout=5.0) as client:
                    await client.post(self.n8n_url, json={
                        "event": "demo_booked",
                        "name": name,
                        "email": email,
                        "phone": phone,
                        "company": company,
                        "modules": modules,
                        "scheduled_time": scheduled_time
                    })
            except Exception as e:
                logger.warning(f"[n8n] Demo webhook failed: {e}")
        return True

email_service = EmailNotificationService()
