import re
from typing import Optional

def sanitize_phone(phone: Optional[str]) -> Optional[str]:
    """
    Sanitizes any phone string into strict E.164 format (+<country_code><number>).
    - Strips spaces, dashes, parentheses, dots.
    - Strips national trunk (0) notation e.g. +91 (0) 98200 12345 or +44 (0) 7911 123456.
    - Converts leading '00' to '+'.
    - Handles leading zero on 11-digit numbers (assumes +91 for Indian local numbers).
    - Automatically prepends +91 for 10-digit Indian mobile numbers.
    - Strips national trunk 0 on +910... numbers to normalize to canonical +91...
    - Prepends '+' for 12-digit Indian numbers starting with 91.
    - Strips leading zeros for country-code formatted numbers.
    """
    if not phone or not isinstance(phone, str):
        return None

    cleaned = phone.strip()
    # Strip trunk prefix notation like (0)
    cleaned = re.sub(r"\(\s*0\s*\)", "", cleaned)
    # Remove whitespace, hyphens, parentheses, and dots
    cleaned = re.sub(r"[\s\-\(\)\.]+", "", cleaned)
    if not cleaned:
        return None

    # Handle international prefixes
    if cleaned.startswith("00"):
        cleaned = "+" + cleaned[2:]

    # If it starts with '+', keep '+' and all remaining digits
    if cleaned.startswith("+"):
        digits = re.sub(r"[^\d]", "", cleaned[1:])
        if not digits:
            return None
        # Handle Indian numbers with national trunk 0: +9109820012345 -> +919820012345
        if digits.startswith("910") and len(digits) == 13:
            digits = "91" + digits[3:]
        return f"+{digits}"

    # If starts with '0' and has 11 digits (e.g., 09820012345 in India)
    if cleaned.startswith("0") and len(cleaned) == 11 and cleaned.isdigit():
        return f"+91{cleaned[1:]}"

    # If standard 10-digit Indian mobile number
    if len(cleaned) == 10 and cleaned.isdigit():
        return f"+91{cleaned}"

    # If 12 digits starting with 91 (e.g. 919820012345)
    if len(cleaned) == 12 and cleaned.startswith("91") and cleaned.isdigit():
        return f"+{cleaned}"

    # If 13 digits starting with 091 (e.g. 0919820012345)
    if len(cleaned) == 13 and cleaned.startswith("091") and cleaned.isdigit():
        return f"+{cleaned[1:]}"

    # If 13 digits starting with 910 (e.g. 9109820012345)
    if len(cleaned) == 13 and cleaned.startswith("910") and cleaned.isdigit():
        return f"+91{cleaned[3:]}"

    # Default fallback: if all digits
    digits_only = re.sub(r"[^\d]", "", cleaned)
    if digits_only:
        return f"+{digits_only}"

    return None

def validate_phone(phone: Optional[str]) -> bool:
    """
    Validates that a phone number adheres to international E.164 specifications.
    Must start with '+' followed by 7 to 15 digits.
    For Indian numbers (+91), enforces 10 digits starting with 6, 7, 8, or 9.
    """
    if not phone:
        return False
    sanitized = sanitize_phone(phone)
    if not sanitized:
        return False
    # If Indian number (+91), must have 10 digits starting with 6, 7, 8, or 9
    if sanitized.startswith("+91"):
        return bool(re.match(r"^\+91[6-9]\d{9}$", sanitized))
    # International E.164: '+' followed by 7 to 15 digits
    return bool(re.match(r"^\+[1-9]\d{6,14}$", sanitized))

def format_phone_display(phone: Optional[str]) -> str:
    """
    Formats an E.164 phone number into a clean, human-readable display string.
    Example: +919820012345 -> +91 98200 12345
    """
    sanitized = sanitize_phone(phone)
    if not sanitized:
        return ""
    if sanitized.startswith("+91") and len(sanitized) == 13:
        # +91 XXXXX XXXXX
        return f"+91 {sanitized[3:8]} {sanitized[8:]}"
    elif sanitized.startswith("+1") and len(sanitized) == 12:
        # +1 (XXX) XXX-XXXX
        return f"+1 ({sanitized[2:5]}) {sanitized[5:8]}-{sanitized[8:]}"
    elif sanitized.startswith("+44") and len(sanitized) == 13:
        # +44 XXXX XXXXXX
        return f"+44 {sanitized[3:7]} {sanitized[7:]}"
    return sanitized
