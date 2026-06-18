from .base import BaseGlossary
from .general_legal import GeneralLegalGlossary
from .employment import EmploymentGlossary
from .marriage_cert import MarriageCertGlossary
from .school_transcript import SchoolTranscriptGlossary
from .birth_cert import BirthCertGlossary, PowerOfAttorneyGlossary
from .consular import ConsularGlossary

__all__ = [
    "BaseGlossary",
    "GeneralLegalGlossary",
    "EmploymentGlossary",
    "MarriageCertGlossary",
    "SchoolTranscriptGlossary",
    "BirthCertGlossary",
    "PowerOfAttorneyGlossary",
    "ConsularGlossary",
    "get_glossary_for_type",
]

_GLOSSARY_MAP: dict[str, type[BaseGlossary]] = {
    "employment":        EmploymentGlossary,
    "marriage_cert":     MarriageCertGlossary,
    "school_transcript": SchoolTranscriptGlossary,
    "birth_cert":        BirthCertGlossary,
    "power_of_attorney": PowerOfAttorneyGlossary,
    "consular":          ConsularGlossary,
    "general":           GeneralLegalGlossary,
}


def get_glossary_for_type(doc_type: str) -> BaseGlossary:
    """
    Factory: returns the appropriate glossary instance for a document type.
    Falls back to GeneralLegalGlossary for unknown types.

    To add a new document type:
      1. Create  glossaries/your_type.py  extending GeneralLegalGlossary
      2. Add entry: "your_type": YourGlossary  to _GLOSSARY_MAP below
      3. Add keywords to document_detector.py DETECTION_RULES
    """
    cls = _GLOSSARY_MAP.get(doc_type, GeneralLegalGlossary)
    return cls()
