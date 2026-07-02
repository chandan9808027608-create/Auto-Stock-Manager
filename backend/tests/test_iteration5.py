"""Backend API tests for iteration 5 - Dockerfile reorganization verification"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

@pytest.fixture
def auth_token():
    resp = requests.post(f"{BASE_URL}/api/auth/login", json={"username": "admin", "password": "admin123"})
    assert resp.status_code == 200, f"Login failed: {resp.text}"
    data = resp.json()
    return data.get("token") or data.get("access_token")

@pytest.fixture
def headers(auth_token):
    return {"Authorization": f"Bearer {auth_token}"}

def test_health_check():
    resp = requests.get(f"{BASE_URL}/api/health")
    assert resp.status_code == 200
    data = resp.json()
    assert data.get("status") == "ok"
    print(f"Health check OK: {data}")

def test_login_returns_token():
    resp = requests.post(f"{BASE_URL}/api/auth/login", json={"username": "admin", "password": "admin123"})
    assert resp.status_code == 200
    data = resp.json()
    token = data.get("token") or data.get("access_token")
    assert token and len(token) > 0, f"No token in response: {data}"
    print(f"Login OK, token length={len(token)}")

def test_vehicles_list_with_fields(headers):
    resp = requests.get(f"{BASE_URL}/api/vehicles", headers=headers)
    assert resp.status_code == 200
    data = resp.json()
    assert isinstance(data, list)
    if data:
        v = data[0]
        # Check aging and financial fields
        assert "total_expenses" in v or "total_investment" in v or "expected_profit" in v or "days_in_stock" in v, \
            f"Missing financial/aging fields. Keys: {list(v.keys())}"
        print(f"Vehicles OK: {len(data)} vehicles, sample keys: {list(v.keys())}")
    else:
        print("Vehicles list empty - OK")

def test_dashboard_stats(headers):
    resp = requests.get(f"{BASE_URL}/api/reports/dashboard", headers=headers)
    assert resp.status_code == 200
    data = resp.json()
    for field in ["total_vehicles", "available"]:
        assert field in data, f"Missing {field}. Keys: {list(data.keys())}"
    print(f"Dashboard OK: total={data['total_vehicles']}, available={data['available']}")

def test_finance_summary(headers):
    resp = requests.get(f"{BASE_URL}/api/finance/summary", headers=headers)
    assert resp.status_code == 200
    data = resp.json()
    for field in ["inventory_value", "total_revenue", "gross_profit"]:
        assert field in data, f"Missing {field}. Keys: {list(data.keys())}"
    print(f"Finance summary OK: revenue={data['total_revenue']}, profit={data['gross_profit']}")
