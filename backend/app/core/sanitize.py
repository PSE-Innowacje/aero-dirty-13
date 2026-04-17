"""HTML sanitization helpers for user-submitted input."""

import bleach


def strip_html(v: str) -> str:
    """Strip all HTML tags from a string, returning plain text."""
    return bleach.clean(v, tags=[], strip=True)
