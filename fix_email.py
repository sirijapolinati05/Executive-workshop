import re

with open('backend/main.py', 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Add MIMEImage import
content = content.replace(
    'from email.mime.multipart import MIMEMultipart',
    'from email.mime.multipart import MIMEMultipart\nfrom email.mime.image import MIMEImage'
)

# 2. Update send_via_resend
resend_old = """def send_via_resend(to: str, subject: str, html: str) -> Tuple[bool, Optional[str]]:
    \"\"\"Send email using Resend REST API (no extra packages needed).\"\"\"
    if not RESEND_API_KEY or RESEND_API_KEY.startswith('re_PASTE'):
        return False, "Resend API key not configured"
    try:
        payload = json.dumps({
            "from": RESEND_FROM,
            "to": [to],
            "subject": subject,
            "html": html,
        }).encode("utf-8")"""

resend_new = """def send_via_resend(to: str, subject: str, html: str, inline_image_path: str = None) -> Tuple[bool, Optional[str]]:
    \"\"\"Send email using Resend REST API (no extra packages needed).\"\"\"
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

        payload = json.dumps(data).encode("utf-8")"""

content = content.replace(resend_old, resend_new)

# 3. Update send_via_smtp
smtp_old = """def send_via_smtp(to: str, subject: str, html: str) -> Tuple[bool, Optional[str]]:
    \"\"\"Send email using SMTP over SSL (port 465).\"\"\"
    if not SMTP_USER or not SMTP_PASSWORD:
        return False, "SMTP credentials not configured"
    try:
        msg = MIMEMultipart("alternative")
        msg["Subject"] = subject
        msg["From"]    = f"Executive Workshop <{SMTP_USER}>"
        msg["To"]      = to
        msg.attach(MIMEText(html, "html"))"""

smtp_new = """def send_via_smtp(to: str, subject: str, html: str, inline_image_path: str = None) -> Tuple[bool, Optional[str]]:
    \"\"\"Send email using SMTP over SSL (port 465).\"\"\"
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
                img = MIMEImage(img_file.read())
                img.add_header("Content-ID", "<scanner_img>")
                img.add_header("Content-Disposition", "inline", filename="scanner.jpeg")
                msg.attach(img)"""

content = content.replace(smtp_old, smtp_new)

# 4. Update send_email
send_email_old = """def send_email(to: str, subject: str, html: str) -> Tuple[bool, str]:"""
send_email_new = """def send_email(to: str, subject: str, html: str, inline_image_path: str = None) -> Tuple[bool, str]:"""
content = content.replace(send_email_old, send_email_new)

content = content.replace('ok, err = send_via_resend(to, subject, html)', 'ok, err = send_via_resend(to, subject, html, inline_image_path)')
content = content.replace('ok, err = send_via_smtp(to, subject, html)', 'ok, err = send_via_smtp(to, subject, html, inline_image_path)')

# 5. Update api_admin_decision to use CID
decision_old = """        import base64
        import os
        scanner_path = os.path.join(os.path.dirname(__file__), "../frontend/src/assets/scanner.jpeg")
        scanner_b64 = ""
        try:
            with open(scanner_path, "rb") as f:
                scanner_b64 = base64.b64encode(f.read()).decode('utf-8')
        except Exception as e:
            print("Could not load scanner.jpeg:", e)"""

decision_new = """        import os
        scanner_path = os.path.join(os.path.dirname(__file__), "../frontend/src/assets/scanner.jpeg")"""

content = content.replace(decision_old, decision_new)

content = content.replace('src="data:image/jpeg;base64,{scanner_b64}"', 'src="cid:scanner_img"')

content = content.replace('ok, via_or_err = send_email(payload.to, subject, html)', 'ok, via_or_err = send_email(payload.to, subject, html, scanner_path)')

with open('backend/main.py', 'w', encoding='utf-8') as f:
    f.write(content)
