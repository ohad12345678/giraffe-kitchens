"""
Email service for sending notifications.
"""
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from typing import List
from app.core.config import settings


def send_email(
    to_emails: List[str],
    subject: str,
    html_content: str,
    text_content: str = None
) -> bool:
    """
    Send an email to one or more recipients.

    Args:
        to_emails: List of recipient email addresses
        subject: Email subject
        html_content: HTML content of the email
        text_content: Plain text content (optional, fallback for non-HTML clients)

    Returns:
        True if email was sent successfully, False otherwise
    """
    # Check if email is configured
    if not settings.SMTP_USER or not settings.SMTP_PASSWORD:
        print("⚠️  Email not configured - skipping email send")
        return False

    try:
        # Create message
        message = MIMEMultipart("alternative")
        message["Subject"] = subject
        message["From"] = f"{settings.SMTP_FROM_NAME} <{settings.SMTP_FROM_EMAIL or settings.SMTP_USER}>"
        message["To"] = ", ".join(to_emails)

        # Add plain text part if provided
        if text_content:
            part1 = MIMEText(text_content, "plain", "utf-8")
            message.attach(part1)

        # Add HTML part
        part2 = MIMEText(html_content, "html", "utf-8")
        message.attach(part2)

        # Connect to SMTP server and send
        print(f"📧 Sending email to {len(to_emails)} recipient(s)...")
        with smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT) as server:
            server.starttls()
            server.login(settings.SMTP_USER, settings.SMTP_PASSWORD)
            server.sendmail(
                settings.SMTP_FROM_EMAIL or settings.SMTP_USER,
                to_emails,
                message.as_string()
            )

        print(f"✅ Email sent successfully to: {', '.join(to_emails)}")
        return True

    except Exception as e:
        print(f"❌ Failed to send email: {str(e)}")
        return False


def send_audit_completion_email(
    audit_data: dict,
    summary: str,
    to_emails: List[str]
) -> bool:
    """
    Send an email notification when a sanitation audit is completed.

    Args:
        audit_data: Dictionary containing audit information
        summary: AI-generated audit summary
        to_emails: List of recipient email addresses

    Returns:
        True if email was sent successfully, False otherwise
    """
    subject = f"ביקורת תברואה הושלמה - {audit_data['branch_name']} ({audit_data['audit_date']})"

    # Create HTML email content
    html_content = f"""
<!DOCTYPE html>
<html dir="rtl" lang="he">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <style>
        body {{
            font-family: Arial, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 800px;
            margin: 0 auto;
            padding: 20px;
            background-color: #f5f5f5;
        }}
        .container {{
            background-color: white;
            border-radius: 8px;
            padding: 30px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }}
        .header {{
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 20px;
            border-radius: 8px 8px 0 0;
            margin: -30px -30px 30px -30px;
        }}
        h1 {{
            margin: 0;
            font-size: 24px;
        }}
        .score-box {{
            background-color: #f8f9fa;
            border-right: 4px solid {audit_data['score_color']};
            padding: 15px;
            margin: 20px 0;
            border-radius: 4px;
        }}
        .score {{
            font-size: 36px;
            font-weight: bold;
            color: {audit_data['score_color']};
            margin: 0;
        }}
        .info-grid {{
            display: grid;
            grid-template-columns: repeat(2, 1fr);
            gap: 15px;
            margin: 20px 0;
        }}
        .info-item {{
            padding: 10px;
            background-color: #f8f9fa;
            border-radius: 4px;
        }}
        .info-label {{
            font-weight: bold;
            color: #666;
            font-size: 14px;
        }}
        .info-value {{
            color: #333;
            font-size: 16px;
            margin-top: 5px;
        }}
        .summary {{
            background-color: #f8f9fa;
            padding: 20px;
            border-radius: 8px;
            margin: 20px 0;
            white-space: pre-wrap;
            font-size: 14px;
            line-height: 1.8;
        }}
        .footer {{
            text-align: center;
            margin-top: 30px;
            padding-top: 20px;
            border-top: 1px solid #eee;
            color: #666;
            font-size: 12px;
        }}
        .button {{
            display: inline-block;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 12px 30px;
            text-decoration: none;
            border-radius: 6px;
            margin-top: 20px;
            font-weight: bold;
        }}
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🦒 ביקורת תברואה הושלמה</h1>
        </div>

        <div class="score-box">
            <div style="font-size: 14px; color: #666; margin-bottom: 5px;">ציון כולל</div>
            <p class="score">{audit_data['total_score']}/100</p>
        </div>

        <div class="info-grid">
            <div class="info-item">
                <div class="info-label">סניף</div>
                <div class="info-value">{audit_data['branch_name']}</div>
            </div>
            <div class="info-item">
                <div class="info-label">תאריך ביקורת</div>
                <div class="info-value">{audit_data['audit_date']}</div>
            </div>
            <div class="info-item">
                <div class="info-label">מבצע הביקורת</div>
                <div class="info-value">{audit_data['auditor_name']}</div>
            </div>
            <div class="info-item">
                <div class="info-label">מלווה</div>
                <div class="info-value">{audit_data['accompanist_name'] or 'לא צוין'}</div>
            </div>
        </div>

        <h2>📊 סיכום הביקורת</h2>
        <div class="summary">{summary}</div>

        <div style="text-align: center;">
            <a href="{audit_data['audit_url']}" class="button">צפייה בדוח המלא</a>
        </div>

        <div class="footer">
            <p>מייל זה נשלח אוטומטית ממערכת Giraffe Kitchens</p>
            <p>© 2025 Giraffe Kitchens - All rights reserved</p>
        </div>
    </div>
</body>
</html>
"""

    # Create plain text version as fallback
    text_content = f"""
ביקורת תברואה הושלמה

סניף: {audit_data['branch_name']}
תאריך ביקורת: {audit_data['audit_date']}
מבצע הביקורת: {audit_data['auditor_name']}
מלווה: {audit_data['accompanist_name'] or 'לא צוין'}

ציון כולל: {audit_data['total_score']}/100

סיכום הביקורת:
{summary}

לצפייה בדוח המלא: {audit_data['audit_url']}

---
מייל זה נשלח אוטומטית ממערכת Giraffe Kitchens
"""

    return send_email(to_emails, subject, html_content, text_content)
