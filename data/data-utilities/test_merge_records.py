"""Run with: python -m unittest test_merge_records"""

import unittest

from merge_records import merge_records


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


if __name__ == "__main__":
    unittest.main()
