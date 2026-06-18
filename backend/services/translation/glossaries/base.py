class BaseGlossary:
    """
    Base class for all document-type glossaries.
    Subclasses define `terms` and `keywords`.
    """

    @property
    def terms(self) -> dict[str, str]:
        """Dict of {vietnamese_phrase: standard_english_equivalent}"""
        return {}

    @property
    def keywords(self) -> list[str]:
        """Distinctive keywords used to identify this document type."""
        return []

    def apply(self, text: str) -> tuple[str, dict]:
        """
        Replace Vietnamese glossary terms with unique placeholders.
        Returns (processed_text, placeholder_map).
        The translator won't touch the placeholders.
        """
        result = text
        placeholder_map: dict[str, str] = {}
        counter = 0

        # Sort by length descending so longer phrases match before sub-phrases
        for vi_term, en_term in sorted(self.terms.items(), key=lambda x: len(x[0]), reverse=True):
            if vi_term.lower() in result.lower():
                placeholder = f"__GL{counter:03d}__"
                # Case-insensitive replacement
                import re
                result = re.sub(re.escape(vi_term), placeholder, result, flags=re.IGNORECASE)
                placeholder_map[placeholder] = en_term
                counter += 1

        return result, placeholder_map

    def restore(self, text: str, placeholder_map: dict[str, str]) -> str:
        """Restore placeholders with their English equivalents."""
        for placeholder, en_term in placeholder_map.items():
            text = text.replace(placeholder, en_term)
        return text
