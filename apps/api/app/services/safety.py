"""Deterministic safety net for Lexi's free-text chat.

Lexi is not a therapist and must never be the thing that decides whether a child is
safe. This module is a small, fast, keyword-based check that runs *before* any AI
provider sees a message. It cannot be talked out of by clever phrasing of the prompt
because it never reaches the prompt: a match short-circuits straight to a fixed,
non-negotiable response that points the child toward a trusted adult right now.
"""

import re

from app.providers.base import LexiContent

# Deliberately narrow and literal rather than "smart": a keyword net is auditable,
# cannot be argued with by an adversarial prompt, and a false positive (redirecting a
# child to a trusted adult when they didn't strictly need it) is a safe failure mode.
_CRISIS_PATTERNS = tuple(
    re.compile(pattern, re.IGNORECASE)
    for pattern in (
        r"\bkill myself\b",
        r"\bkill me\b",
        r"\bsuicid",
        r"\bwant to die\b",
        r"\bhurt myself\b",
        r"\bhurting myself\b",
        r"\bhurt me\b",
        r"\bself[\s-]?harm\b",
        r"\bend my life\b",
        r"\bno reason to live\b",
        r"\bcut(ting)? myself\b",
        r"\bbeing abused\b",
        r"\bsomeone (is )?hurting me\b",
        r"\btouch(ed|ing)? me\b.*\b(bad|wrong|secret)\b",
    )
)

SAFETY_RESPONSE = LexiContent(
    text=(
        "That sounds really important, and I'm not the right helper for it. "
        "Please tell a trusted adult — like a parent, teacher, or caregiver — "
        "right away. You deserve support from a real person who can help."
    ),
    suggested_tool=None,
)


def detect_crisis(message: str) -> bool:
    """Return True when free text plausibly describes a safety or self-harm concern."""

    if not message:
        return False
    return any(pattern.search(message) is not None for pattern in _CRISIS_PATTERNS)
