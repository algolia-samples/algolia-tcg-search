"""Run with: python -m unittest test_card_checks"""

import unittest

from card_checks import check_card, normalize_name

# Trimmed stand-ins for TCGdex's /sets/{id} "cards" list.
CARDS = [
    {"localId": "038", "name": "Cinderace ex"},
    {"localId": "228", "name": "Yanmega ex"},
    {"localId": "174", "name": "Team Rocket's Giovanni"},
    {"localId": "SWSH001", "name": "Promo Card"},
]


class NormalizeName(unittest.TestCase):
    def test_ignores_case_padding_and_apostrophe_style(self):
        self.assertEqual(normalize_name("  Team Rocket’s  Giovanni "), normalize_name("team rocket's giovanni"))

    def test_different_cards_stay_different(self):
        self.assertNotEqual(normalize_name("Pikachu"), normalize_name("Pikachu ex"))


class CheckCard(unittest.TestCase):
    def kinds(self, name, number, official=217):
        return [kind for kind, _ in check_card(name, number, CARDS, official)]

    def test_clean_row_has_no_findings(self):
        self.assertEqual(self.kinds("Cinderace ex", "038/217"), [])

    def test_accepts_unpadded_and_denominator_less_numbers(self):
        self.assertEqual(self.kinds("Cinderace ex", "38"), [])

    def test_wrong_number_for_name(self):
        # The Giovanni row that was numbered 228 (Yanmega's number).
        self.assertEqual(self.kinds("Team Rocket's Giovanni", "228/182", official=182), ["name"])

    def test_denominator_from_another_set(self):
        # Shrouded Fable's /064 on an Ascended Heroes (217) tab.
        self.assertIn("denominator", self.kinds("Cinderace ex", "038/064"))

    def test_number_not_in_set(self):
        self.assertEqual(self.kinds("Oricorio ex", "999/217"), ["missing"])

    def test_non_numeric_local_ids_match_exactly(self):
        self.assertEqual(self.kinds("Promo Card", "SWSH001", official=None), [])

    def test_unresolved_set_is_not_checked(self):
        self.assertEqual(check_card("Anything", "1/10", [], None), [])

    def test_missing_official_count_skips_denominator_check(self):
        self.assertEqual(self.kinds("Cinderace ex", "038/064", official=None), [])


if __name__ == "__main__":
    unittest.main()
