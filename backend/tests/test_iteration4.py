"""Backend API tests for iteration 4 - Code Quality Refactoring verification"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

@pytest.fixture
def auth_token():
    resp = requests.post(f"{BASE_URL}/api/auth/login", json={"username": "admin", "password": "admin123"})
    assert resp.status_code == 200, f"Login failed: {resp.text}"
    return resp.json().get("token") or resp.json().get("access_token")

@pytest.fixture
def headers(auth_token):
    return {"Authorization": f"Bearer {auth_token}"}

# Dashboard API
def test_dashboard_api(headers):
    resp = requests.get(f"{BASE_URL}/api/reports/dashboard", headers=headers)
    assert resp.status_code == 200, f"Dashboard API failed: {resp.text}"
    data = resp.json()
    assert "dead_stock_count" in data, f"Missing dead_stock_count: {data.keys()}"
    assert "slow_moving_count" in data, f"Missing slow_moving_count: {data.keys()}"
    assert "total_vendor_due" in data, f"Missing total_vendor_due: {data.keys()}"
    print(f"Dashboard API OK: dead_stock={data['dead_stock_count']}, slow_moving={data['slow_moving_count']}, vendor_due={data['total_vendor_due']}")

# Finance Summary API
def test_finance_summary_api(headers):
    resp = requests.get(f"{BASE_URL}/api/finance/summary", headers=headers)
    assert resp.status_code == 200, f"Finance summary failed: {resp.text}"
    data = resp.json()
    assert "inventory_value" in data, f"Missing inventory_value: {data.keys()}"
    assert "total_revenue" in data, f"Missing total_revenue: {data.keys()}"
    assert "gross_profit" in data, f"Missing gross_profit: {data.keys()}"
    assert "vendor_payables" in data, f"Missing vendor_payables: {data.keys()}"
    print(f"Finance summary OK: revenue={data['total_revenue']}, profit={data['gross_profit']}")

# Inventory API
def test_inventory_list(headers):
    resp = requests.get(f"{BASE_URL}/api/vehicles", headers=headers)
    assert resp.status_code == 200
    data = resp.json()
    assert isinstance(data, list)
    print(f"Inventory: {len(data)} vehicles")

# Finance transactions - uses /api/finance/summary
def test_finance_page_data(headers):
    resp = requests.get(f"{BASE_URL}/api/finance/summary", headers=headers)
    assert resp.status_code == 200
    data = resp.json()
    # Charts need these fields
    assert "inventory_value" in data
    assert "vendor_payables" in data
    print(f"Finance page data OK")

# Reports API - field names as returned by API
def test_reports_api(headers):
    resp = requests.get(f"{BASE_URL}/api/reports/dashboard", headers=headers)
    assert resp.status_code == 200
    data = resp.json()
    # Check all required dashboard fields using actual field names
    required_fields = ["total_vehicles", "available", "dead_stock_count", 
                       "slow_moving_count", "total_vendor_due"]
    for field in required_fields:
        assert field in data, f"Missing field: {field}. Available: {list(data.keys())}"
    print(f"Reports dashboard fields OK: {list(data.keys())}")
