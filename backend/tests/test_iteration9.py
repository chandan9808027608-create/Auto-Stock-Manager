"""Iteration 9: SSL fix verification - test all core endpoints after Dockerfile base image change"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

@pytest.fixture(scope="module")
def token():
    r = requests.post(f"{BASE_URL}/api/auth/login", json={"username": "admin", "password": "admin123"})
    assert r.status_code == 200, f"Login failed: {r.text}"
    return r.json()["token"]

@pytest.fixture(scope="module")
def auth_headers(token):
    return {"Authorization": f"Bearer {token}"}

def test_health():
    r = requests.get(f"{BASE_URL}/api/health")
    assert r.status_code == 200
    assert r.json()["status"] == "ok"
    print("Health check: OK")

def test_login():
    r = requests.post(f"{BASE_URL}/api/auth/login", json={"username": "admin", "password": "admin123"})
    assert r.status_code == 200
    data = r.json()
    assert "token" in data
    assert data["username"] == "admin"
    print(f"Login: OK, role={data.get('role')}")

def test_vehicles(auth_headers):
    r = requests.get(f"{BASE_URL}/api/vehicles", headers=auth_headers)
    assert r.status_code == 200
    data = r.json()
    assert isinstance(data, list)
    print(f"Vehicles: OK, count={len(data)}")
    if data:
        v = data[0]
        assert "aging" in v
        assert "total_investment" in v

def test_dashboard(auth_headers):
    r = requests.get(f"{BASE_URL}/api/reports/dashboard", headers=auth_headers)
    assert r.status_code == 200
    data = r.json()
    assert "total_vehicles" in data
    assert "available" in data
    print(f"Dashboard: OK, total_vehicles={data.get('total_vehicles')}")

def test_finance_summary(auth_headers):
    r = requests.get(f"{BASE_URL}/api/finance/summary", headers=auth_headers)
    assert r.status_code == 200
    data = r.json()
    assert "inventory_value" in data
    assert "gross_profit" in data
    print(f"Finance: OK, inventory_value={data.get('inventory_value')}")
