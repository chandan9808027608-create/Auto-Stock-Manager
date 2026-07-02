import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

@pytest.fixture(scope="module")
def token():
    r = requests.post(f"{BASE_URL}/api/auth/login", json={"username": "admin", "password": "admin123"})
    assert r.status_code == 200, f"Login failed: {r.text}"
    return r.json()["token"]

def test_health():
    r = requests.get(f"{BASE_URL}/api/health")
    assert r.status_code == 200
    assert r.json().get("status") == "ok"
    print("Health check: OK")

def test_login():
    r = requests.post(f"{BASE_URL}/api/auth/login", json={"username": "admin", "password": "admin123"})
    assert r.status_code == 200
    data = r.json()
    assert "token" in data
    assert len(data["token"]) > 0
    print("Login: OK")

def test_vehicles(token):
    r = requests.get(f"{BASE_URL}/api/vehicles", headers={"Authorization": f"Bearer {token}"})
    assert r.status_code == 200
    data = r.json()
    assert isinstance(data, list)
    print(f"Vehicles: {len(data)} items")

def test_dashboard(token):
    r = requests.get(f"{BASE_URL}/api/reports/dashboard", headers={"Authorization": f"Bearer {token}"})
    assert r.status_code == 200
    data = r.json()
    assert isinstance(data, dict)
    print(f"Dashboard keys: {list(data.keys())}")

def test_finance_summary(token):
    r = requests.get(f"{BASE_URL}/api/finance/summary", headers={"Authorization": f"Bearer {token}"})
    assert r.status_code == 200
    data = r.json()
    assert isinstance(data, dict)
    print(f"Finance summary keys: {list(data.keys())}")
