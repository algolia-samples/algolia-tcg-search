"""
Sanity-check spreadsheet rows against the TCGdex set they were resolved to.

The set sheets are maintained by hand, and ingest looks cards up by number alone,
so a wrong number or a card on the wrong tab silently picks up another card's image
and types. These checks are warn-only: they report, they never drop a row.

Pure functions with no environment or network access, so they are importable
(ingest.py is not: it exits at import without ALGOLIA_EVENT_ID).
"""

import re
from typing import Optional


def normalize_name(name) -> str:
    """Lowercase, unify apostrophes, drop other punctuation, collapse whitespace.

    The gender symbols are spelled out first: Nidoran♀ and Nidoran♂ are different
    cards that would otherwise both normalize to "nidoran".
    """
    text = str(name).replace("’", "'").replace("ʼ", "'").lower()
    text = text.replace("'", "").replace("♀", " female").replace("♂", " male")
    text = re.sub(r"[^a-z0-9\s]", " ", text)
    return " ".join(text.split())


def _local_key(value) -> str:
    """Compare card numbers regardless of zero padding ('038' == '38')."""
    text = str(value).strip()
    return text.lstrip("0") or "0" if text.isdigit() else text.upper()


def check_card(name, raw_number, tcgdex_cards: list, official_count: Optional[int]) -> list:
    """
    Compare one sheet row against its resolved TCGdex set.

    raw_number is the sheet's Number cell ("038/064", "24", ...). Returns a list of
    (kind, message) findings, empty when the row looks right. Returns nothing when
    the set could not be resolved (tcgdex_cards empty): there is nothing to compare.
    """
    if not tcgdex_cards or raw_number is None:
        return []

    # XLSX numeric cells arrive as floats (38.0); ingest converts them the same way.
    if isinstance(raw_number, float) and raw_number.is_integer():
        raw_number = int(raw_number)

    number, _, denominator = str(raw_number).strip().partition("/")
    number, denominator = number.strip(), denominator.strip()
    findings = []

    if denominator.isdigit() and official_count and int(denominator) != int(official_count):
        findings.append((
            "denominator",
            f"denominator /{denominator} does not match the set's {official_count} cards "
            f"— card may be on the wrong tab",
        ))

    match = next(
        (c for c in tcgdex_cards if _local_key(c.get("localId", "")) == _local_key(number)),
        None,
    )
    if match is None:
        findings.append(("missing", f"no card #{number} in the TCGdex set"))
    elif normalize_name(match.get("name", "")) != normalize_name(name):
        findings.append((
            "name",
            f"TCGdex has #{number} as '{match.get('name')}', not '{str(name).strip()}'",
        ))

    return findings
