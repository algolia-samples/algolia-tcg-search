#!/usr/bin/env python3
"""
Validate CSV/XLSX data files before ingestion.
Checks column structure, required fields, and data types.
Exits with code 1 if any file fails validation.
"""

import os
import sys
import re
from pathlib import Path
import pandas as pd

from dotenv import load_dotenv
load_dotenv(Path(__file__).parent.parent / ".env")

ALGOLIA_EVENT_ID = os.getenv("ALGOLIA_EVENT_ID")
if not ALGOLIA_EVENT_ID:
    print("ERROR: ALGOLIA_EVENT_ID is not set. Set it in data/.env or export it before running.")
    sys.exit(1)

DATA_DIR = Path(__file__).parent.parent / "data-files" / ALGOLIA_EVENT_ID

EXPECTED_COLUMNS = {
    "Pokemon Name",
    "Number",
    "Card Type",
    "# in Machine",
    "Estimated Value",
    "Is Chase Card?",
    "Is top 10 chase card?",
    "Is classic Pokemon?",
    "Is Full Art?",
}

BOOLEAN_COLUMNS = ["Is Chase Card?", "Is top 10 chase card?", "Is classic Pokemon?", "Is Full Art?"]
VALID_BOOLEANS = {"TRUE", "FALSE"}


def is_valid_boolean(cell) -> bool:
    if isinstance(cell, bool) or pd.isna(cell):
        return True
    if isinstance(cell, (int, float)):
        return cell in (0, 1)
    return str(cell).strip().upper() in VALID_BOOLEANS


def validate_dataframe(df: pd.DataFrame) -> list[str]:
    """Validate a dataframe of card rows. Returns list of error strings."""
    errors = []

    missing = EXPECTED_COLUMNS - set(df.columns)
    if missing:
        errors.append(f"Missing columns: {missing}")
        return errors  # Can't proceed without required columns

    for idx, row in df.iterrows():
        row_num = idx + 2  # +2 for header and 0-indexing

        # Skip blank/summary rows (same logic as ingest.py)
        name = str(row["Pokemon Name"]).strip()
        if not name or name.lower() == "nan":
            continue

        # Number required and numeric
        raw_number = row["Number"]
        if pd.isna(raw_number):
            errors.append(f"Row {row_num} ({name}): Missing Number")
        else:
            try:
                int(float(str(raw_number).strip()))
            except ValueError:
                errors.append(f"Row {row_num} ({name}): Non-numeric Number '{raw_number}'")

        # Machine quantity: NaN means not in machine (will be skipped at ingest)
        qty = row["# in Machine"]
        if not pd.isna(qty):
            try:
                qty_int = int(float(str(qty).strip()))
                if qty_int < 0:
                    errors.append(f"Row {row_num} ({name}): Negative machine quantity {qty_int}")
            except ValueError:
                errors.append(f"Row {row_num} ({name}): Non-numeric machine quantity '{qty}'")

        # Estimated Value: optional but must be parseable if present
        val = row["Estimated Value"]
        if not pd.isna(val) and str(val).strip():
            try:
                float(str(val).replace("$", "").strip())
            except ValueError:
                errors.append(f"Row {row_num} ({name}): Unparseable Estimated Value '{val}'")

        # Boolean columns — handle native bool, 0/1 int (XLSX), or TRUE/FALSE string (CSV)
        for col in BOOLEAN_COLUMNS:
            if not is_valid_boolean(row[col]):
                errors.append(f"Row {row_num} ({name}): Invalid boolean '{row[col]}' in '{col}'")

    return errors


def validate_file(file_path: Path) -> list[str]:
    """Return list of error strings, empty if valid."""
    try:
        df = pd.read_csv(file_path)
        df.columns = df.columns.str.strip()
    except Exception as e:
        return [f"Could not read file: {e}"]

    return validate_dataframe(df)


def validate_xlsx_file(file_path: Path) -> dict[str, list[str]]:
    """Returns {sheet_name: [errors]} for all non-(OLD) sheets."""
    results = {}

    try:
        xl = pd.ExcelFile(file_path)
    except Exception as e:
        return {"(file)": [f"Could not read XLSX: {e}"]}

    for sheet_name in xl.sheet_names:
        if sheet_name.strip().upper().startswith("(OLD)"):
            continue

        try:
            df = pd.read_excel(xl, sheet_name=sheet_name)
            df.columns = df.columns.str.strip()
        except Exception as e:
            results[sheet_name] = [f"Could not read sheet: {e}"]
            continue

        results[sheet_name] = validate_dataframe(df)

    if not results:
        results["(file)"] = ["No sheets to validate — all sheets are marked (OLD)"]

    return results


def main():
    csv_files = sorted(DATA_DIR.glob("*.csv"))

    if csv_files:
        all_valid = True
        for file_path in csv_files:
            errors = validate_file(file_path)
            if errors:
                print(f"✗ {file_path.name}")
                for err in errors:
                    print(f"    {err}")
                all_valid = False
            else:
                df = pd.read_csv(file_path)
                print(f"✓ {file_path.name} ({len(df)} rows)")
    else:
        xlsx_files = sorted(DATA_DIR.glob("*.xlsx"))
        if not xlsx_files:
            print(f"No CSV or XLSX files found in {DATA_DIR}")
            sys.exit(1)

        all_valid = True
        for file_path in xlsx_files:
            sheet_results = validate_xlsx_file(file_path)
            print(f"\n{file_path.name}")
            for sheet_name, errors in sheet_results.items():
                if errors:
                    print(f"  ✗ {sheet_name}")
                    for err in errors:
                        print(f"      {err}")
                    all_valid = False
                else:
                    print(f"  ✓ {sheet_name}")

    if all_valid:
        print("\nAll files valid.")
        sys.exit(0)
    else:
        print("\nValidation failed.")
        sys.exit(1)


if __name__ == "__main__":
    main()
