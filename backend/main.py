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
    env_path = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '.env'))
    if os.path.exists(env_path):
        load_dotenv(dotenv_path=env_path)
    else:
        load_dotenv() # Fallback to default
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
GMAIL_USER       = os.getenv('GMAIL_USER', '')
GMAIL_APP_PASSWORD = os.getenv('GMAIL_APP_PASSWORD', '')

print(f"[startup] EMAIL_PROVIDER={EMAIL_PROVIDER}")
print(f"[startup] RESEND_API_KEY={'set' if RESEND_API_KEY and not RESEND_API_KEY.startswith('re_PASTE') else 'NOT SET'}")
print(f"[startup] GMAIL_USER={GMAIL_USER or 'NOT SET'}")

# ── App ───────────────────────────────────────────────────────────
app = FastAPI(title="Executive Workshop Email Service")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["https://executive-workshop.vercel.app", "https://executive-workshop-backend.vercel.app"],
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
    """Send email using Gmail SMTP over SSL (port 465)."""
    if not GMAIL_USER or not GMAIL_APP_PASSWORD:
        return False, "Gmail credentials not configured"
    try:
        msg = MIMEMultipart("alternative")
        msg["Subject"] = subject
        msg["From"]    = GMAIL_USER
        msg["To"]      = to
        msg.attach(MIMEText(html, "html"))

        with smtplib.SMTP_SSL("smtp.gmail.com", 465) as server:
            server.login(GMAIL_USER, GMAIL_APP_PASSWORD)
            server.sendmail(GMAIL_USER, to, msg.as_string())

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
        <div style="font-family:Arial,sans-serif;max-width:600px;margin:auto;padding:32px;
                    background:#f9fafb;border-radius:12px;border:1px solid #e5e7eb;">
          <h2 style="color:#059669;">🎉 Congratulations!</h2>
          <p style="color:#374151;font-size:16px;">
            Your seat for the <strong>Executive Workshop</strong> has been <strong>confirmed</strong>.
          </p>
          <p style="color:#374151;">We look forward to seeing you at the session. Payment instructions will follow shortly.</p>
          <p style="color:#6b7280;font-size:13px;">Thank you for registering!</p>
        </div>"""
    else:
        subject = "Update on Your Workshop Application"
        html = """
        <div style="font-family:Arial,sans-serif;max-width:600px;margin:auto;padding:32px;
                    background:#f9fafb;border-radius:12px;border:1px solid #e5e7eb;">
          <h2 style="color:#dc2626;">Update on Your Application</h2>
          <p style="color:#374151;font-size:16px;">
            We regret to inform you that your seat request for the <strong>Executive Workshop</strong>
            has been <strong>rejected</strong> at this time.
          </p>
          <p style="color:#6b7280;font-size:13px;">Thank you for your interest. We hope to see you in future sessions.</p>
        </div>"""

    ok, via_or_err = send_email(payload.to, subject, html)
    if not ok:
        raise HTTPException(status_code=500, detail=f"All providers failed: {via_or_err}")
    return {"message": f"Decision email sent via {via_or_err}", "decision": payload.decision}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="127.0.0.1", port=8000, reload=True)
