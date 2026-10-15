"""Rule-based job-description skill analysis."""

import re

SKILL_PATTERNS: tuple[tuple[str, re.Pattern[str]], ...] = (
    ("Python", re.compile(r"\bpython(?:\s*[23])?\b", re.IGNORECASE)),
    ("FastAPI", re.compile(r"\bfast\s*-?\s*api\b", re.IGNORECASE)),
    (
        "SQL",
        re.compile(
            r"\b(?:sql|sqlite|postgres(?:ql)?|mysql|mariadb|sql\s*server)\b",
            re.IGNORECASE,
        ),
    ),
    (
        "Machine Learning",
        re.compile(
            r"\b(?:machine\s+learning|ml|scikit[\s-]?learn|sklearn)\b",
            re.IGNORECASE,
        ),
    ),
    ("React", re.compile(r"\breact(?:\.?js)?\b", re.IGNORECASE)),
    ("Docker", re.compile(r"\bdocker\b", re.IGNORECASE)),
    ("Git", re.compile(r"\bgit(?:hub|lab)?\b", re.IGNORECASE)),
    (
        "REST APIs",
        re.compile(r"\brest(?:ful)?\s+apis?\b", re.IGNORECASE),
    ),
)


def analyze_job_description(job_description: str) -> dict[str, object]:
    """Return detected and missing skills in a stable order."""
    matched = [
        skill
        for skill, pattern in SKILL_PATTERNS
        if pattern.search(job_description)
    ]
    missing = [
        skill for skill, _pattern in SKILL_PATTERNS if skill not in matched
    ]
    match_percentage = round(len(matched) / len(SKILL_PATTERNS) * 100)
    return {
        "matched_skills": matched,
        "missing_skills": missing,
        "match_percentage": match_percentage,
    }
