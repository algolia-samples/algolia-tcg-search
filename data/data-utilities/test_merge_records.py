"""Run with: python -m unittest test_merge_records"""

import unittest

from merge_records import apply_claims, merge_records


def card(object_id, name, qty, chase=False, top10=False, **extra):
    return {
        "objectID": object_id,
        "pokemon_name": name,
        "machine_quantity": qty,
        "initial_quantity": qty,
        "is_chase_card": chase,
        "is_top_10_chase_card": top10,
        **extra,
    }


class MergeRecords(unittest.TestCase):
    def test_cards_in_one_source_pass_through(self):
        merged, problems, summed = merge_records([
            ("a.xlsx", [card("s-1", "Pikachu", 2)]),
            ("b.xlsx", [card("s-2", "Mew", 1)]),
        ])
        self.assertEqual([r["objectID"] for r in merged], ["s-1", "s-2"])
        self.assertEqual((problems, summed), ([], []))

    def test_overlap_sums_both_quantities(self):
        merged, problems, summed = merge_records([
            ("a.xlsx", [card("s-1", "Mega Meganium ex", 4)]),
            ("b.xlsx", [card("s-1", "Mega Meganium ex", 1)]),
        ])
        self.assertEqual(len(merged), 1)
        self.assertEqual((merged[0]["machine_quantity"], merged[0]["initial_quantity"]), (5, 5))
        self.assertEqual(summed, [("s-1", "Mega Meganium ex", [4, 1])])
        self.assertEqual(problems, [])

    def test_first_source_wins_other_fields(self):
        merged, _, _ = merge_records([
            ("a.xlsx", [card("s-1", "Pikachu", 1, estimated_value=5.0, image_small="a.jpg")]),
            ("b.xlsx", [card("s-1", "Pikachu", 1, estimated_value=9.0, image_small="b.jpg")]),
        ])
        self.assertEqual((merged[0]["estimated_value"], merged[0]["image_small"]), (5.0, "a.jpg"))

    def test_chase_flag_is_or_ed(self):
        merged, _, _ = merge_records([
            ("a.xlsx", [card("s-1", "Pikachu", 1, chase=False)]),
            ("b.xlsx", [card("s-1", "Pikachu", 1, chase=True)]),
        ])
        self.assertTrue(merged[0]["is_chase_card"])

    def test_top_10_comes_from_the_first_source_only(self):
        merged, _, _ = merge_records([
            ("a.xlsx", [card("s-1", "Pikachu", 1, top10=True), card("s-2", "Mew", 1)]),
            ("b.xlsx", [card("s-1", "Pikachu", 1), card("s-2", "Mew", 1, top10=True),
                        card("s-3", "Eevee", 1, top10=True)]),
        ])
        flags = {r["objectID"]: r["is_top_10_chase_card"] for r in merged}
        self.assertEqual(flags, {"s-1": True, "s-2": False, "s-3": False})

    def test_name_match_ignores_case_and_padding(self):
        _, problems, _ = merge_records([
            ("a.xlsx", [card("s-1", "Dragapult ex", 1)]),
            ("b.xlsx", [card("s-1", " Dragapult Ex ", 3)]),
        ])
        self.assertEqual(problems, [])

    def test_different_names_for_one_objectid_is_a_problem(self):
        merged, problems, _ = merge_records([
            ("a.xlsx", [card("s-38", "Cinderace ex", 2)]),
            ("b.xlsx", [card("s-38", "Fezandipiti ex", 3)]),
        ])
        self.assertEqual(len(problems), 1)
        self.assertIn("Cinderace ex", problems[0])
        self.assertIn("Fezandipiti ex", problems[0])
        self.assertEqual(merged[0]["machine_quantity"], 2)  # not summed

    def test_duplicate_within_one_source_is_a_problem_not_a_sum(self):
        # Giovanni and Yanmega both numbered 228 in the same sheet.
        merged, problems, summed = merge_records([
            ("a.xlsx", [card("s-228", "Yanmega ex", 1), card("s-228", "Giovanni", 1)]),
        ])
        self.assertEqual(len(problems), 1)
        self.assertEqual(merged[0]["machine_quantity"], 1)
        self.assertEqual(summed, [])

    def test_inputs_are_not_mutated(self):
        first = card("s-1", "Pikachu", 1)
        merge_records([("a.xlsx", [first]), ("b.xlsx", [card("s-1", "Pikachu", 2)])])
        self.assertEqual(first["machine_quantity"], 1)


class ApplyClaims(unittest.TestCase):
    def test_claim_takes_one_off_the_machine_and_keeps_initial(self):
        records = [card("s-1", "Pikachu", 2)]
        applied, skipped, problems = apply_claims(records, [{"card_id": "s-1", "pokemon_name": "Pikachu"}])
        self.assertEqual((records[0]["machine_quantity"], records[0]["initial_quantity"]), (1, 2))
        self.assertEqual(applied, [("s-1", "Pikachu", 2, 1)])
        self.assertEqual((skipped, problems), ([], []))

    def test_two_claims_on_one_card_take_two(self):
        records = [card("s-1", "Pikachu", 3)]
        claim = {"card_id": "s-1", "pokemon_name": "Pikachu"}
        apply_claims(records, [claim, claim])
        self.assertEqual(records[0]["machine_quantity"], 1)

    def test_claim_for_a_card_that_changed_is_skipped_not_applied(self):
        # Fezandipiti was claimed as me02.5-038; that objectID is now Cinderace.
        records = [card("me02.5-038", "Cinderace ex", 2)]
        applied, skipped, problems = apply_claims(records, [{"card_id": "me02.5-038", "pokemon_name": "Fezandipiti ex"}])
        self.assertEqual(records[0]["machine_quantity"], 2)
        self.assertEqual(applied, [])
        self.assertEqual(len(skipped), 1)
        self.assertIn("Cinderace ex", skipped[0])

    def test_claim_for_a_missing_card_is_skipped(self):
        _, skipped, problems = apply_claims([card("s-1", "Pikachu", 1)], [{"card_id": "s-9", "pokemon_name": "Mew"}])
        self.assertEqual((len(skipped), problems), (1, []))

    def test_claim_on_an_empty_card_is_a_problem(self):
        records = [card("s-1", "Pikachu", 0)]
        _, _, problems = apply_claims(records, [{"card_id": "s-1", "pokemon_name": "Pikachu"}])
        self.assertEqual(len(problems), 1)
        self.assertEqual(records[0]["machine_quantity"], 0)

    def test_name_match_ignores_case_and_padding(self):
        records = [card("s-1", "Dragapult ex", 2)]
        applied, skipped, _ = apply_claims(records, [{"card_id": "s-1", "pokemon_name": " Dragapult Ex "}])
        self.assertEqual((len(applied), skipped), (1, []))


if __name__ == "__main__":
    unittest.main()
