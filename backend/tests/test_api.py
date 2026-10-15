from datetime import date

import pytest
from fastapi.testclient import TestClient

from app.main import app


@pytest.fixture
def client(tmp_path, monkeypatch):
    monkeypatch.setenv(
        "APPLYWISE_DATABASE_PATH",
        str(tmp_path / "test_applywise.db"),
    )
    with TestClient(app) as test_client:
        yield test_client


def test_health_check(client):
    response = client.get("/")

    assert response.status_code == 200
    assert response.json()["status"] == "ok"


def test_application_crud_and_persistence(client):
    created = client.post(
        "/applications",
        json={
            "company": "  Acme Labs ",
            "role": "Backend Intern",
            "job_url": "https://example.com/jobs/1",
            "deadline": "2026-11-10",
        },
    )

    assert created.status_code == 201
    application = created.json()
    assert application["company"] == "Acme Labs"
    assert application["status"] == "Saved"
    assert application["deadline"] == date(2026, 11, 10).isoformat()

    listed = client.get("/applications")
    assert len(listed.json()) == 1
    assert listed.json()[0]["id"] == application["id"]

    updated = client.patch(
        f"/applications/{application['id']}/status",
        json={"status": "Interview"},
    )
    assert updated.status_code == 200
    assert updated.json()["status"] == "Interview"

    deleted = client.delete(f"/applications/{application['id']}")
    assert deleted.status_code == 204
    assert client.get("/applications").json() == []


def test_application_survives_application_restart(tmp_path, monkeypatch):
    monkeypatch.setenv(
        "APPLYWISE_DATABASE_PATH",
        str(tmp_path / "persistent_applywise.db"),
    )
    with TestClient(app) as first_client:
        created = first_client.post(
            "/applications",
            json={"company": "Persistent Co", "role": "Intern"},
        )
        assert created.status_code == 201
        application_id = created.json()["id"]

    with TestClient(app) as restarted_client:
        applications = restarted_client.get("/applications").json()

    assert len(applications) == 1
    assert applications[0]["id"] == application_id
    assert applications[0]["company"] == "Persistent Co"


@pytest.mark.parametrize(
    "payload",
    [
        {"company": " ", "role": "Intern"},
        {"company": "Acme", "role": "\t"},
        {"company": "Acme"},
        {"company": "Acme", "role": "Intern", "status": "Pending"},
        {"company": "Acme", "role": "Intern", "deadline": "not-a-date"},
    ],
)
def test_invalid_application_is_rejected(client, payload):
    assert client.post("/applications", json=payload).status_code == 422


def test_missing_application_returns_not_found(client):
    assert client.patch(
        "/applications/999/status",
        json={"status": "Applied"},
    ).status_code == 404
    assert client.delete("/applications/999").status_code == 404


def test_analyze_endpoint(client):
    response = client.post(
        "/analyze",
        json={"job_description": "Build APIs with Python, FastAPI, and React."},
    )

    assert response.status_code == 200
    assert response.json() == {
        "matched_skills": ["Python", "FastAPI", "React"],
        "missing_skills": ["SQL", "Machine Learning", "Docker", "Git", "REST APIs"],
        "match_percentage": 38,
    }


@pytest.mark.parametrize("description", ["", "   "])
def test_analyzer_rejects_empty_description(client, description):
    assert client.post(
        "/analyze",
        json={"job_description": description},
    ).status_code == 422
