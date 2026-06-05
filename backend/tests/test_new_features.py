"""Backend tests for new features: vendor search, AI endpoints, pages loading"""
import pytest
import requests
import os

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "").rstrip("/")

@pytest.fixture(scope="module")
def auth_token():
    r = requests.post(f"{BASE_URL}/api/auth/login", json={"username": "admin", "password": "admin123"})
    assert r.status_code == 200, f"Login failed: {r.text}"
    return r.json()["token"]

@pytest.fixture(scope="module")
def headers(auth_token):
    return {"Authorization": f"Bearer {auth_token}", "Content-Type": "application/json"}


# Vendor search endpoint
def test_vendor_search_returns_array(headers):
    r = requests.get(f"{BASE_URL}/api/vendors/search?q=test", headers=headers)
    assert r.status_code == 200
    assert isinstance(r.json(), list)
    print(f"Vendor search: {r.json()}")

def test_vendor_search_empty_q(headers):
    r = requests.get(f"{BASE_URL}/api/vendors/search?q=", headers=headers)
    assert r.status_code == 200
    assert isinstance(r.json(), list)

# AI pricing
def test_ai_price_suggestion(headers):
    payload = {"vehicle": {"brand": "Honda", "model": "CB Shine", "year": 2020, "engine_cc": 125, "fuel_type": "Petrol", "condition": "Good", "ownership_number": 1, "kilometer_run": 15000, "purchase_price": 150000}}
    r = requests.post(f"{BASE_URL}/api/ai/price-suggestion", json=payload, headers=headers, timeout=30)
    assert r.status_code == 200, f"AI pricing failed: {r.text}"
    data = r.json()
    assert "suggestion" in data
    print(f"AI pricing suggestion snippet: {data['suggestion'][:100]}")

# Festival intelligence
def test_ai_festival_intelligence(headers):
    r = requests.get(f"{BASE_URL}/api/ai/festival-intelligence", headers=headers, timeout=30)
    assert r.status_code == 200, f"Festival intel failed: {r.text}"
    data = r.json()
    assert "intelligence" in data
    print(f"Festival intelligence snippet: {data['intelligence'][:100]}")

# Chatbot
def test_ai_chatbot(headers):
    payload = {"message": "What bikes do you have available?", "session_id": "test-session-001"}
    r = requests.post(f"{BASE_URL}/api/ai/chatbot", json=payload, headers=headers, timeout=30)
    assert r.status_code == 200, f"Chatbot failed: {r.text}"
    data = r.json()
    assert "reply" in data
    assert "session_id" in data
    print(f"Chatbot reply snippet: {data['reply'][:100]}")
