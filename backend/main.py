import os
import smtplib
import json
import urllib.request
import urllib.error
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
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

# ── Senders ───────────────────────────────────────────────────────

def send_via_resend(to: str, subject: str, html: str) -> Tuple[bool, Optional[str]]:
    """Send email using Resend REST API (no extra packages needed)."""
    if not RESEND_API_KEY or RESEND_API_KEY.startswith('re_PASTE'):
        return False, "Resend API key not configured"
    try:
        payload = json.dumps({
            "from": RESEND_FROM,
            "to": [to],
            "subject": subject,
            "html": html,
        }).encode("utf-8")

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


def send_via_smtp(to: str, subject: str, html: str) -> Tuple[bool, Optional[str]]:
    """Send email using SMTP over SSL (port 465)."""
    if not SMTP_USER or not SMTP_PASSWORD:
        return False, "SMTP credentials not configured"
    try:
        msg = MIMEMultipart("alternative")
        msg["Subject"] = subject
        msg["From"]    = f"Executive Workshop <{SMTP_USER}>"
        msg["To"]      = to
        msg.attach(MIMEText(html, "html"))

        with smtplib.SMTP_SSL(SMTP_HOST, 465) as server:
            server.login(SMTP_USER, SMTP_PASSWORD)
            server.sendmail(SMTP_USER, to, msg.as_string())

        print(f"[smtp] SUCCESS sent to {to}")
        return True, None
    except Exception as exc:
        print(f"[smtp] FAIL {exc}")
        return False, str(exc)


def send_email(to: str, subject: str, html: str) -> Tuple[bool, str]:
    """
    Route email based on EMAIL_PROVIDER:
      resend → Resend only
      smtp   → Gmail SMTP only
      both   → Resend first, fall back to Gmail SMTP
    """
    errors: list[str] = []

    if EMAIL_PROVIDER in ("resend", "both"):
        ok, err = send_via_resend(to, subject, html)
        if ok:
            return True, "resend"
        errors.append(f"Resend: {err}")

    if EMAIL_PROVIDER in ("smtp", "both"):
        ok, err = send_via_smtp(to, subject, html)
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
        "smtp_configured": bool(GMAIL_USER and GMAIL_APP_PASSWORD),
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
        subject = "🎉 Your Seat is Confirmed!"
        html = """
        <div style="font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; max-width: 600px; margin: 40px auto; background-color: #0b0f1a; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 24px rgba(0,0,0,0.4); border: 1px solid #1e293b;">
            <div style="background: linear-gradient(90deg, #101828 0%, #1e293b 100%); padding: 32px 40px; text-align: center; border-bottom: 1px solid #334155;">
                <h1 style="color: #ffffff; margin: 0; font-size: 24px; font-weight: 600; letter-spacing: 1px; text-transform: uppercase;">Executive Workshop</h1>
                <p style="color: #94a3b8; font-size: 13px; margin: 8px 0 0 0; letter-spacing: 2px; text-transform: uppercase;">Curated Roundtables</p>
            </div>
            <div style="padding: 48px 40px; background-color: #0b0f1a;">
                <h2 style="color: #10b981; margin: 0 0 20px 0; font-size: 22px; font-weight: 600;">🎉 Seat Confirmed</h2>
                <p style="color: #e2e8f0; font-size: 16px; line-height: 1.6; margin: 0 0 24px 0;">
                    Congratulations! Your application has been approved and your seat for the <strong style="color: #ffffff;">Executive Workshop</strong> has been officially confirmed.
                </p>
                <div style="background-color: #1e293b; border-left: 4px solid #10b981; padding: 20px; border-radius: 4px; margin-bottom: 24px;">
                    <p style="color: #e2e8f0; font-size: 15px; line-height: 1.5; margin: 0;">
                        We look forward to hosting you for an insightful session. Payment instructions and schedule details will follow in a separate communication.
                    </p>
                </div>
                <p style="color: #94a3b8; font-size: 14px; margin: 0;">
                    Best regards,<br>
                    <span style="color: #cbd5e1; font-weight: 500;">The Executive Workshop Team</span>
                </p>
            </div>
            <div style="background-color: #080b13; padding: 24px 40px; text-align: center; border-top: 1px solid #1e293b;">
                <p style="color: #64748b; font-size: 12px; margin: 0;">
                    © 2026 Executive Roundtables. All rights reserved.
                </p>
            </div>
        </div>
        """
    else:
        subject = "Update on Your Workshop Application"
        html = """
        <div style="font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; max-width: 600px; margin: 40px auto; background-color: #0b0f1a; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 24px rgba(0,0,0,0.4); border: 1px solid #1e293b;">
            <div style="background: linear-gradient(90deg, #101828 0%, #1e293b 100%); padding: 32px 40px; text-align: center; border-bottom: 1px solid #334155;">
                <h1 style="color: #ffffff; margin: 0; font-size: 24px; font-weight: 600; letter-spacing: 1px; text-transform: uppercase;">Executive Workshop</h1>
                <p style="color: #94a3b8; font-size: 13px; margin: 8px 0 0 0; letter-spacing: 2px; text-transform: uppercase;">Curated Roundtables</p>
            </div>
            <div style="padding: 48px 40px; background-color: #0b0f1a;">
                <h2 style="color: #f43f5e; margin: 0 0 20px 0; font-size: 22px; font-weight: 600;">Application Update</h2>
                <p style="color: #e2e8f0; font-size: 16px; line-height: 1.6; margin: 0 0 24px 0;">
                    Thank you for your interest in the <strong style="color: #ffffff;">Executive Workshop</strong>.
                </p>
                <p style="color: #cbd5e1; font-size: 15px; line-height: 1.6; margin: 0 0 24px 0;">
                    Due to the curated nature of our roundtables and limited seating, we regret to inform you that we cannot accommodate your request at this time. 
                </p>
                <p style="color: #94a3b8; font-size: 15px; line-height: 1.6; margin: 0 0 32px 0;">
                    We appreciate your application and hope to welcome you to future sessions.
                </p>
                <p style="color: #94a3b8; font-size: 14px; margin: 0;">
                    Best regards,<br>
                    <span style="color: #cbd5e1; font-weight: 500;">The Executive Workshop Team</span>
                </p>
            </div>
            <div style="background-color: #080b13; padding: 24px 40px; text-align: center; border-top: 1px solid #1e293b;">
                <p style="color: #64748b; font-size: 12px; margin: 0;">
                    © 2026 Executive Roundtables. All rights reserved.
                </p>
            </div>
        </div>
        """

    ok, via_or_err = send_email(payload.to, subject, html)
    if not ok:
        raise HTTPException(status_code=500, detail=f"All providers failed: {via_or_err}")
    return {"message": f"Decision email sent via {via_or_err}", "decision": payload.decision}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="127.0.0.1", port=8000, reload=True)
