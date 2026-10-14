import logging
from email.message import EmailMessage

import aiosmtplib

from app.config import settings

logger = logging.getLogger(__name__)


async def send_alert_email(
    recipient: str,
    subject: str,
    body: str,
) -> bool:
    """Send an email alert and return whether delivery succeeded."""

    if not recipient or not recipient.strip():
        logger.warning("Email not sent: recipient address is missing")
        return False

    if not settings.SMTP_EMAIL or not settings.SMTP_PASSWORD:
        logger.error("Email not sent: SMTP credentials are not configured")
        return False

    message = EmailMessage()
    message["From"] = settings.SMTP_EMAIL
    message["To"] = recipient.strip()
    message["Subject"] = subject
    message.set_content(body)

    try:
        use_tls = settings.SMTP_PORT == 465

        await aiosmtplib.send(
            message,
            hostname=settings.SMTP_HOST,
            port=settings.SMTP_PORT,
            username=settings.SMTP_EMAIL,
            password=settings.SMTP_PASSWORD,
            start_tls=not use_tls,
            use_tls=use_tls,
            timeout=15,
        )

        logger.info("Alert email sent successfully to %s", recipient)
        return True

    except Exception:
        logger.exception("Failed to send alert email to %s", recipient)
        return False


async def send_critical_alert_email(
    recipient: str,
    device_name: str,
    alert_message: str,
) -> bool:
    """Send an email when a critical IoT alert is triggered."""

    return await send_alert_email(
        recipient=recipient,
        subject=f"CRITICAL IoT Alert - {device_name}",
        body=(
            "A critical IoT device alert has been detected.\n\n"
            f"Device: {device_name}\n"
            f"Details: {alert_message}\n"
            "Severity: CRITICAL\n\n"
            "Please investigate this device immediately."
        ),
    )


async def send_high_risk_email(
    recipient: str,
    device_name: str,
    risk_score: float,
) -> bool:
    """Send an email when a device has a high maintenance risk."""

    return await send_alert_email(
        recipient=recipient,
        subject=f"High Maintenance Risk - {device_name}",
        body=(
            "A device has been identified as having high maintenance risk.\n\n"
            f"Device: {device_name}\n"
            f"Maintenance risk score: {risk_score}/100\n\n"
            "Please inspect this device and schedule maintenance."
        ),
    )