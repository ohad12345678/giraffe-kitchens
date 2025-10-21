"""
Services package for business logic and external integrations.
"""
from app.services.email import send_email, send_audit_completion_email

__all__ = ["send_email", "send_audit_completion_email"]
