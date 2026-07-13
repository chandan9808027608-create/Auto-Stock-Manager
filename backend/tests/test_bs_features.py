"""Tests for BS date system and accounting summary features"""
import pytest
import requests
import os

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "").rstrip("/")

@pytest.fixture(scope="module")
def auth_token():
    resp = requests.post(f"{BASE_URL}/api/auth/login", json={"username": "admin", "password": "admin123"})
    if resp.status_code == 200:
        return resp.json().get("token")
    pytest.skip(f"Auth failed: {resp.status_code} {resp.text[:200]}")

@pytest.fixture(scope="module")
def client(auth_token):
    s = requests.Session()
    s.headers.update({"Authorization": f"Bearer {auth_token}", "Content-Type": "application/json"})
    return s

@pytest.fixture(scope="module")
def test_vehicle_id(client):
    """Create a test vehicle with BS 2083 Jestha 15 (AD: 2026-05-29)"""
    payload = {
        "brand": "Honda", "model": "TEST_Dio_BS",
        "year": 2020, "engine_cc": 110,
        "fuel_type": "Petrol", "ownership_number": 1,
        "purchase_price": 150000, "purchase_date": "2026-05-29",
        "purchase_source": "Individual", "condition": "Good",
        "registration_number": "TEST-BSFEAT-001",
        "status": "available",
        "bluebook_status": "pending", "insurance_status": "pending",
        "tax_clearance_status": "pending", "transfer_status": "pending"
    }
    resp = client.post(f"{BASE_URL}/api/vehicles", json=payload)
    assert resp.status_code == 200, f"Vehicle creation failed: {resp.text}"
    vid = resp.json().get("id")
    yield vid
    # cleanup
    client.delete(f"{BASE_URL}/api/vehicles/{vid}")

class TestAccountingSummary:
    """Accounting summary endpoint tests"""

    def test_accounting_summary_today(self, client):
        today = "2026-06-04"
        resp = client.get(f"{BASE_URL}/api/reports/accounting-summary?start_date={today}&end_date={today}")
        assert resp.status_code == 200, f"Failed: {resp.text}"
        data = resp.json()
        assert "total_cost" in data
        assert "total_sales" in data
        assert "net_profit" in data
        assert "purchase_count" in data
        assert "sold_count" in data
        print(f"Today summary: {data}")

    def test_accounting_summary_this_month_bs(self, client):
        # BS Jestha 2083: AD 2026-05-15 to 2026-06-14
        resp = client.get(f"{BASE_URL}/api/reports/accounting-summary?start_date=2026-05-15&end_date=2026-06-14")
        assert resp.status_code == 200, f"Failed: {resp.text}"
        data = resp.json()
        assert "total_cost" in data
        print(f"This month (Jestha 2083) summary: {data}")

    def test_accounting_summary_this_year_bs(self, client):
        # BS 2083: AD ~2026-04-14 to 2027-04-13
        resp = client.get(f"{BASE_URL}/api/reports/accounting-summary?start_date=2026-04-14&end_date=2027-04-13")
        assert resp.status_code == 200, f"Failed: {resp.text}"
        data = resp.json()
        assert "total_cost" in data
        print(f"This year 2083 summary: {data}")

    def test_accounting_summary_reflects_vehicle_purchase(self, client, test_vehicle_id):
        """After adding a vehicle with purchase_date=2026-05-29, monthly summary should show it"""
        resp = client.get(f"{BASE_URL}/api/reports/accounting-summary?start_date=2026-05-15&end_date=2026-06-14")
        assert resp.status_code == 200
        data = resp.json()
        assert data["purchase_count"] >= 1, "Vehicle not reflected in monthly accounting"
        assert data["total_cost"] >= 150000, f"Total cost should include test vehicle. Got: {data['total_cost']}"
        print(f"Monthly summary with test vehicle: {data}")

class TestVehicleCreation:
    """Vehicle creation and BS date display"""

    def test_vehicle_list(self, client):
        resp = client.get(f"{BASE_URL}/api/vehicles")
        assert resp.status_code == 200
        data = resp.json()
        assert isinstance(data, list)
        print(f"Total vehicles: {len(data)}")

    def test_vehicle_purchase_date_stored_as_ad(self, client, test_vehicle_id):
        resp = client.get(f"{BASE_URL}/api/vehicles/{test_vehicle_id}")
        assert resp.status_code == 200
        data = resp.json()
        assert data["purchase_date"] == "2026-05-29", f"Expected AD date 2026-05-29, got: {data['purchase_date']}"
        print(f"Vehicle purchase_date stored as: {data['purchase_date']}")
