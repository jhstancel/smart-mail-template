import re, html
from typing import Tuple

SUBJ_PREFIX = re.compile(r'^(re|fwd|fw)\s*:\s*', re.I)

# Split before common forward/quote headers
FWD_SPLIT = re.compile(r'(?im)^(?:[-_]{2,}\s*forwarded message\s*[-_]{2,}|from:\s|sent:\s|subject:\s|to:\s|cc:\s)')

def normalize_subject(s: str) -> str:
    s = s or ""
    # strip common prefixes repeatedly (Re:, Fwd:, FW:)
    prev = None
    while prev != s:
        prev = s
        s = SUBJ_PREFIX.sub("", s.strip())
    return s.strip()

def strip_quoted(body: str) -> str:
    if not body:
        return ""
    txt = body
    # keep only the newest block (before forwarded/quoted header)
    parts = FWD_SPLIT.split(txt, maxsplit=1)
    txt = parts[0]
    # drop lines that are quotes ("> foo")
    txt = re.sub(r'(?m)^\s*>\s.*$', '', txt)
    # collapse excessive whitespace
    txt = re.sub(r'\r', '\n', txt)
    txt = re.sub(r'\n{3,}', '\n\n', txt)
    return txt.strip()

def html_to_text(s: str) -> str:
    # quick-and-dirty HTML to text without extra deps
    if not s:
        return ""
    # remove scripts/styles
    s = re.sub(r'(?is)<(script|style).*?>.*?(</\1>)', '', s)
    # replace breaks/paragraphs with newlines
    s = re.sub(r'(?i)<br\s*/?>', '\n', s)
    s = re.sub(r'(?i)</p>', '\n\n', s)
    # strip tags
    s = re.sub(r'(?s)<.*?>', '', s)
    s = html.unescape(s)
    return s.strip()

def clean_subject_body(subject: str, body: str, is_html: bool=False) -> Tuple[str, str]:
    subject = normalize_subject(subject or "")
    body = html_to_text(body) if is_html else (body or "")
    body = strip_quoted(body)
    return subject, body

def canon_text(subject: str, body: str) -> str:
    # canonical string used for deduping
    s = f"{normalize_subject(subject)}\n\n{strip_quoted(body)}".lower()
    s = re.sub(r'\s+', ' ', s).strip()
    return s

