"""
Combine card records from several workbooks into one inventory.

Used by `ingest.py --merge` when an event's machine is stocked from more than one
sheet (e.g. leftovers from a previous event added to the main list). A card that
appears in several sheets has its quantities summed; a card in only one is kept as is.

Pure functions with no environment or network access, so they are importable
(ingest.py is not: it exits at import without ALGOLIA_EVENT_ID).
"""

from card_checks import normalize_name

SUMMED_FIELDS = ("machine_quantity", "initial_quantity")


def merge_records(sources: list) -> tuple:
    """
    sources is a list of (label, records) in priority order: when a card appears in
    more than one, the first source's fields (name, value, images, ...) win and only
    quantities and the chase flag are combined. The Top 10 carousel is curated by the
    first source alone: a later source's top-10 flags are dropped, so merging
    leftovers into an event can never grow the carousel past its list.

    Returns (merged, problems, summed):
      merged   records to upload, in first-seen order
      problems messages that must stop the ingest: the same objectID twice within one
               source (a typo, so summing would hide it), or one objectID carrying
               different card names across sources (a wrong number in one sheet)
      summed   (objectID, name, [per-source quantities]) for every card combined
    """
    merged: dict = {}
    origins: dict = {}
    problems: list = []
    quantities: dict = {}

    for position, (label, records) in enumerate(sources):
        seen_here: dict = {}
        for record in records:
            object_id = record["objectID"]
            name = record.get("pokemon_name", "")

            if object_id in seen_here:
                problems.append(
                    f"{label}: '{name}' and '{seen_here[object_id]}' share objectID {object_id}"
                )
                continue
            seen_here[object_id] = name

            if object_id not in merged:
                merged[object_id] = dict(record)
                if position > 0:
                    merged[object_id]["is_top_10_chase_card"] = False
                origins[object_id] = label
                quantities[object_id] = [record.get("machine_quantity", 0)]
                continue

            existing = merged[object_id]
            if normalize_name(existing.get("pokemon_name", "")) != normalize_name(name):
                problems.append(
                    f"{object_id}: '{existing.get('pokemon_name')}' in {origins[object_id]} "
                    f"but '{name}' in {label}"
                )
                continue

            for field in SUMMED_FIELDS:
                existing[field] = (existing.get(field) or 0) + (record.get(field) or 0)
            existing["is_chase_card"] = bool(existing.get("is_chase_card")) or bool(record.get("is_chase_card"))
            quantities[object_id].append(record.get("machine_quantity", 0))

    summed = [
        (object_id, merged[object_id].get("pokemon_name", ""), qty)
        for object_id, qty in quantities.items()
        if len(qty) > 1
    ]
    return list(merged.values()), problems, summed
