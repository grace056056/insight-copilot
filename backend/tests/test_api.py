"""End-to-end API flow in mock mode: upload -> roles -> evidence -> insights."""

import io


def test_health(client):
    assert client.get("/api/health").status_code == 200


def test_insights_require_a_dataset(client):
    assert client.post("/api/insights").status_code == 400
    assert client.post("/api/evidence").status_code == 400


def test_rejects_unsupported_file_type(client):
    r = client.post("/api/upload", files={"file": ("notes.txt", b"hello", "text/plain")})
    assert r.status_code == 400


def test_rejects_empty_file(client):
    r = client.post("/api/upload", files={"file": ("empty.csv", b"", "text/csv")})
    assert r.status_code == 400


def test_full_pipeline_on_uploaded_csv(client, sample_bytes):
    r = client.post("/api/upload", files={"file": ("orders.csv", io.BytesIO(sample_bytes), "text/csv")})
    assert r.status_code == 200
    roles = {c["name"]: c["semantic_role"] for c in r.json()["profile"]["columns"]}
    assert roles["total_amount"] == "revenue"
    assert roles["order_date"] == "date"

    evidence = client.post("/api/evidence").json()
    assert evidence["template_count"] == 5

    body = client.post("/api/insights").json()
    assert body["insight_count"] > 0
    for ins in body["insights"]:
        # Every insight carries the evidence that produced it
        assert ins["evidence"]["template_used"] == ins["category"]
        assert ins["evidence"]["data"]


def test_manual_role_override(client):
    client.get("/api/sample-dataset")
    r = client.post(
        "/api/update-roles",
        json={"overrides": [{"name": "region", "semantic_role": "other"}]},
    )
    assert r.status_code == 200
    region = next(c for c in r.json()["profile"]["columns"] if c["name"] == "region")
    assert region["semantic_role"] == "other"
    assert region["is_dimension"] is False
