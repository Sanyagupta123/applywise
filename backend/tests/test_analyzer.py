from app.analyzer import analyze_job_description


def test_detects_canonical_skills_and_aliases():
    result = analyze_job_description(
        "Python, FastAPI, PostgreSQL, sklearn, React.js, Docker, "
        "GitHub, and RESTful API experience."
    )

    assert result["matched_skills"] == [
        "Python",
        "FastAPI",
        "SQL",
        "Machine Learning",
        "React",
        "Docker",
        "Git",
        "REST APIs",
    ]
    assert result["missing_skills"] == []
    assert result["match_percentage"] == 100


def test_does_not_match_skill_names_inside_other_words():
    result = analyze_job_description("We want a pythonic developer who likes dockerized tools.")

    assert result["matched_skills"] == []
    assert result["missing_skills"] == [
        "Python",
        "FastAPI",
        "SQL",
        "Machine Learning",
        "React",
        "Docker",
        "Git",
        "REST APIs",
    ]
    assert result["match_percentage"] == 0


def test_returns_partial_match_percentage():
    result = analyze_job_description("Python and SQLite")

    assert result["matched_skills"] == ["Python", "SQL"]
    assert result["match_percentage"] == 25
