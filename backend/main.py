import os
import smtplib
import json
import urllib.request
import urllib.error
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from email.mime.image import MIMEImage
from typing import Optional, Tuple

from dotenv import load_dotenv

# Load .env safely
try:
    env_path = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'frontend', '.env'))
    if os.path.exists(env_path):
        load_dotenv(dotenv_path=env_path, override=True)
    else:
        load_dotenv(override=True) # Fallback to default
except Exception as e:
    print(f"[startup] Warning: Could not load .env file: {e}")

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from enum import Enum

# ── Config ───────────────────────────────────────────────────────
EMAIL_PROVIDER   = os.getenv('EMAIL_PROVIDER', 'both').lower()   # resend | smtp | both
RESEND_API_KEY   = os.getenv('RESEND_API_KEY', '')
RESEND_FROM      = os.getenv('RESEND_FROM', 'onboarding@resend.dev')
SMTP_HOST        = os.getenv('SMTP_HOST', 'smtp.zoho.in')
SMTP_USER        = os.getenv('SMTP_USER', '')
SMTP_PASSWORD    = os.getenv('SMTP_PASSWORD', '')

print(f"[startup] EMAIL_PROVIDER={EMAIL_PROVIDER}")
print(f"[startup] RESEND_API_KEY={'set' if RESEND_API_KEY and not RESEND_API_KEY.startswith('re_PASTE') else 'NOT SET'}")
print(f"[startup] SMTP_USER={SMTP_USER or 'NOT SET'}")

# ── App ───────────────────────────────────────────────────────────
app = FastAPI(title="Executive Workshop Email Service")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "https://executive-workshop.vercel.app",
        "https://executive-workshop-backend.vercel.app",
        "http://localhost:5173"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Schemas ───────────────────────────────────────────────────────
class EmailPayload(BaseModel):
    to: str
    subject: str = "Notification from Executive Workshop"
    html: str = "<p>No content provided.</p>"
    admin: Optional[bool] = False

class Decision(str, Enum):
    approved = "approved"
    rejected = "rejected"

class AdminDecisionPayload(BaseModel):
    to: str
    decision: Decision
    name: Optional[str] = None

# ── Senders ───────────────────────────────────────────────────────

def send_via_resend(to: str, subject: str, html: str, inline_image_path: str = None) -> Tuple[bool, Optional[str]]:
    """Send email using Resend REST API (no extra packages needed)."""
    if not RESEND_API_KEY or RESEND_API_KEY.startswith('re_PASTE'):
        return False, "Resend API key not configured"
    try:
        data = {
            "from": RESEND_FROM,
            "to": [to],
            "subject": subject,
            "html": html,
        }
        
        if inline_image_path and os.path.exists(inline_image_path):
            import base64
            with open(inline_image_path, "rb") as img_file:
                b64_content = base64.b64encode(img_file.read()).decode("utf-8")
            data["attachments"] = [
                {
                    "filename": "scanner.jpeg",
                    "content": b64_content,
                    "content_id": "scanner_img"
                }
            ]

        payload = json.dumps(data).encode("utf-8")

        req = urllib.request.Request(
            "https://api.resend.com/emails",
            data=payload,
            headers={
                "Authorization": f"Bearer {RESEND_API_KEY}",
                "Content-Type": "application/json",
                "User-Agent": "ExecutiveWorkshop/1.0",
            },
            method="POST",
        )
        with urllib.request.urlopen(req, timeout=15) as resp:
            body = resp.read().decode()
            print(f"[resend] SUCCESS sent to {to} | response: {body}")
            return True, None
    except urllib.error.HTTPError as e:
        err = e.read().decode()
        print(f"[resend] FAIL HTTP {e.code}: {err}")
        return False, f"Resend HTTP {e.code}: {err}"
    except Exception as exc:
        print(f"[resend] FAIL Exception: {exc}")
        return False, str(exc)


def send_via_smtp(to: str, subject: str, html: str, inline_image_path: str = None) -> Tuple[bool, Optional[str]]:
    """Send email using SMTP over SSL (port 465)."""
    if not SMTP_USER or not SMTP_PASSWORD:
        return False, "SMTP credentials not configured"
    try:
        msg = MIMEMultipart("related")
        msg["Subject"] = subject
        msg["From"]    = f"Executive Workshop <{SMTP_USER}>"
        msg["To"]      = to
        
        alt = MIMEMultipart("alternative")
        msg.attach(alt)
        alt.attach(MIMEText(html, "html"))
        
        if inline_image_path and os.path.exists(inline_image_path):
            with open(inline_image_path, "rb") as img_file:
                img_data = img_file.read()
                
                # Inline image for HTML tag
                img_inline = MIMEImage(img_data)
                img_inline.add_header("Content-ID", "<scanner_img>")
                img_inline.add_header("Content-Disposition", "inline", filename="scanner.jpeg")
                msg.attach(img_inline)
                
                # Standard attachment as fallback
                img_attach = MIMEImage(img_data)
                img_attach.add_header("Content-Disposition", "attachment", filename="QR_Scanner_To_Pay.jpeg")
                msg.attach(img_attach)

        with smtplib.SMTP_SSL(SMTP_HOST, 465) as server:
            server.login(SMTP_USER, SMTP_PASSWORD)
            server.sendmail(SMTP_USER, to, msg.as_string())

        print(f"[smtp] SUCCESS sent to {to}")
        return True, None
    except Exception as exc:
        print(f"[smtp] FAIL {exc}")
        return False, str(exc)


def send_email(to: str, subject: str, html: str, inline_image_path: str = None) -> Tuple[bool, str]:
    """
    Route email based on EMAIL_PROVIDER:
      resend → Resend only
      smtp   → Gmail SMTP only
      both   → Resend first, fall back to Gmail SMTP
    """
    errors: list[str] = []

    if EMAIL_PROVIDER in ("resend", "both"):
        ok, err = send_via_resend(to, subject, html, inline_image_path)
        if ok:
            return True, "resend"
        errors.append(f"Resend: {err}")

    if EMAIL_PROVIDER in ("smtp", "both"):
        ok, err = send_via_smtp(to, subject, html, inline_image_path)
        if ok:
            return True, "smtp"
        errors.append(f"SMTP: {err}")

    return False, " | ".join(errors)

# ── Routes ────────────────────────────────────────────────────────

@app.get("/")
def health():
    return {
        "status": "ok",
        "email_provider": EMAIL_PROVIDER,
        "resend_configured": bool(RESEND_API_KEY and not RESEND_API_KEY.startswith('re_PASTE')),
        "smtp_configured": bool(SMTP_USER and SMTP_PASSWORD),
    }

@app.post("/send-email")
async def api_send_email(payload: EmailPayload):
    ok, via_or_err = send_email(payload.to, payload.subject, payload.html)
    if not ok:
        raise HTTPException(status_code=500, detail=f"All providers failed: {via_or_err}")
    return {"message": f"Email sent via {via_or_err}", "to": payload.to}

@app.post("/admin-decision")
async def api_admin_decision(payload: AdminDecisionPayload):
    if payload.decision == Decision.approved:
        subject = "Your Registration is Confirmed"
        import os
        scanner_path = os.path.join(os.path.dirname(__file__), "scanner.jpeg")

        applicant_name = payload.name if payload.name else "Participant"

        html = f"""
        <div style="font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; max-width: 600px; margin: auto; padding: 40px; background-color: #ffffff; border: 1px solid #e5e7eb; border-radius: 16px; color: #1f2937;">
            <p style="font-size: 16px; margin-bottom: 16px;">Dear {applicant_name},</p>
            <p style="font-size: 16px; margin-bottom: 24px; line-height: 1.6;">Thank you for registering for <strong>The Leadership Blind-Spot: The Hidden Cost of Bad Decisions</strong>.</p>
            <p style="font-size: 16px; margin-bottom: 24px; line-height: 1.6;">We are pleased to confirm your participation in the workshop. Please find the payment details below:</p>
            
            <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; padding: 24px; border-radius: 12px; margin-bottom: 24px;">
                <table style="width: 100%; font-size: 15px; border-collapse: collapse;">
                    <tr><td style="padding: 6px 0; color: #64748b; width: 40%;">Bank Name:</td><td style="padding: 6px 0; font-weight: 600; color: #0f172a;">Axis Bank</td></tr>
                    <tr><td style="padding: 6px 0; color: #64748b;">Account Name:</td><td style="padding: 6px 0; font-weight: 600; color: #0f172a;">Tejas Events</td></tr>
                    <tr><td style="padding: 6px 0; color: #64748b;">Account Number:</td><td style="padding: 6px 0; font-weight: 600; color: #0f172a;">923020047638503</td></tr>
                    <tr><td style="padding: 6px 0; color: #64748b;">IFSC Code:</td><td style="padding: 6px 0; font-weight: 600; color: #0f172a;">UTIB0000425</td></tr>
                    <tr><td style="padding: 6px 0; color: #64748b;">UPI ID:</td><td style="padding: 6px 0; font-weight: 600; color: #0f172a;"></td></tr>
                    <tr><td style="padding: 6px 0; color: #64748b;">Program Fee:</td><td style="padding: 6px 0; font-weight: 600; color: #0f172a;">₹7,500 + 18% GST</td></tr>
                    <tr><td style="padding: 6px 0; color: #64748b; border-top: 1px solid #e2e8f0; padding-top: 12px; margin-top: 6px;">Total amount:</td><td style="padding: 6px 0; font-weight: 700; color: #0f172a; border-top: 1px solid #e2e8f0; padding-top: 12px; margin-top: 6px; font-size: 16px;">₹8850</td></tr>
                </table>
            </div>
            
            <p style="font-size: 16px; margin-bottom: 24px; line-height: 1.6;">Kindly complete the payment at your earliest convenience and share the payment confirmation with us once done.</p>
            
            <div style="text-align: center; margin: 32px 0;">
                <p style="font-size: 15px; color: #475569; margin-bottom: 16px; font-weight: 600;">Scan to Pay via UPI:</p>
                <img src="cid:scanner_img" alt="UPI Scanner" style="max-width: 220px; height: auto; border: 1px solid #e2e8f0; border-radius: 12px; padding: 12px; background-color: #ffffff; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);" />
            </div>

            <p style="font-size: 16px; margin-bottom: 32px; line-height: 1.6;">We look forward to welcoming you to the session.</p>
            
            <p style="font-size: 16px; margin-bottom: 0; color: #475569;">Warm regards,<br/><strong style="color: #1f2937;">Rajesh</strong></p>
        </div>
        """
        ok, via_or_err = send_email(payload.to, subject, html, scanner_path)
        if not ok:
            raise HTTPException(status_code=500, detail=f"All providers failed: {via_or_err}")
        return {"message": f"Decision email sent via {via_or_err}", "decision": payload.decision}
    else:
        # User requested NO emails except for 'approved'.
        return {"message": "Application rejected. No email sent.", "decision": payload.decision}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="127.0.0.1", port=8000, reload=True)
