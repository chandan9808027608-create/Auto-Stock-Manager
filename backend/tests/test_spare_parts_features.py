"""
Tests for Spare Parts stock-out, transaction history, and Job Card parts deduction
"""
import pytest
import requests
import os

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "").rstrip("/")

@pytest.fixture(scope="module")
def token():
    r = requests.post(f"{BASE_URL}/api/auth/login", json={"username": "admin", "password": "admin123"})
    assert r.status_code == 200, f"Login failed: {r.text}"
    return r.json()["token"]

@pytest.fixture(scope="module")
def auth(token):
    s = requests.Session()
    s.headers.update({"Authorization": f"Bearer {token}", "Content-Type": "application/json"})
    return s

@pytest.fixture(scope="module")
def test_part_id(auth):
    """Get first available spare part with qty > 0"""
    r = auth.get(f"{BASE_URL}/api/spare-parts")
    assert r.status_code == 200
    parts = r.json()
    available = [p for p in parts if p.get("quantity", 0) > 0]
    assert len(available) > 0, "No spare parts with stock available"
    return available[0]["id"], available[0]["quantity"], available[0]["name"]


class TestStockOut:
    """Tests for POST /api/spare-parts/{pid}/stock-out"""

    def test_stock_out_success(self, auth, test_part_id):
        pid, initial_qty, name = test_part_id
        r = auth.post(f"{BASE_URL}/api/spare-parts/{pid}/stock-out", json={
            "quantity": 1, "reason": "Sale", "notes": "TEST_sale"
        })
        assert r.status_code == 200, f"Stock out failed: {r.text}"
        data = r.json()
        assert data["quantity"] == initial_qty - 1
        assert "transaction" in data
        assert data["transaction"]["reason"] == "Sale"

    def test_stock_out_quantity_deducted_in_db(self, auth, test_part_id):
        pid, initial_qty, name = test_part_id
        r = auth.get(f"{BASE_URL}/api/spare-parts")
        parts = r.json()
        part = next((p for p in parts if p["id"] == pid), None)
        assert part is not None
        # quantity should now be initial_qty - 1 (from previous test)
        assert part["quantity"] == initial_qty - 1

    def test_stock_out_insufficient_stock(self, auth, test_part_id):
        pid, initial_qty, name = test_part_id
        r = auth.post(f"{BASE_URL}/api/spare-parts/{pid}/stock-out", json={
            "quantity": 99999, "reason": "Sale"
        })
        assert r.status_code == 400

    def test_stock_out_invalid_qty(self, auth, test_part_id):
        pid, _, _ = test_part_id
        r = auth.post(f"{BASE_URL}/api/spare-parts/{pid}/stock-out", json={
            "quantity": 0, "reason": "Sale"
        })
        assert r.status_code == 400


class TestTransactionHistory:
    """Tests for GET /api/spare-parts/{pid}/transactions"""

    def test_get_transactions(self, auth, test_part_id):
        pid, _, _ = test_part_id
        r = auth.get(f"{BASE_URL}/api/spare-parts/{pid}/transactions")
        assert r.status_code == 200
        txns = r.json()
        assert isinstance(txns, list)
        assert len(txns) > 0, "Expected at least one transaction from stock-out test"

    def test_transaction_has_correct_fields(self, auth, test_part_id):
        pid, _, _ = test_part_id
        r = auth.get(f"{BASE_URL}/api/spare-parts/{pid}/transactions")
        txns = r.json()
        txn = txns[0]
        for field in ["id", "part_id", "type", "quantity", "reason", "date", "created_at"]:
            assert field in txn, f"Missing field: {field}"

    def test_transaction_matches_stock_out(self, auth, test_part_id):
        pid, _, _ = test_part_id
        r = auth.get(f"{BASE_URL}/api/spare-parts/{pid}/transactions")
        txns = r.json()
        # The most recent should be our "Sale" from TEST_sale
        sale_txn = next((t for t in txns if t.get("notes") == "TEST_sale"), None)
        assert sale_txn is not None, "Could not find TEST_sale transaction"
        assert sale_txn["quantity"] == 1
        assert sale_txn["reason"] == "Sale"


class TestJobCardPartsDeduction:
    """Tests for POST /api/jobs - parts deduction"""

    def test_job_card_creates_and_deducts_parts(self, auth, test_part_id):
        pid, current_qty, name = test_part_id
        # get actual current qty
        r = auth.get(f"{BASE_URL}/api/spare-parts")
        parts = r.json()
        part = next((p for p in parts if p["id"] == pid), None)
        assert part is not None
        qty_before = part["quantity"]

        # Get a vehicle in the Repair stage (job cards can only be created for these)
        rv = auth.get(f"{BASE_URL}/api/vehicles?status=in_repair")
        assert rv.status_code == 200
        vehicles = rv.json()
        if not vehicles:
            pytest.skip("No in_repair vehicles for job card test")
        vehicle_id = vehicles[0]["id"]

        # Create job card with 1 part
        r = auth.post(f"{BASE_URL}/api/jobs", json={
            "vehicle_id": vehicle_id,
            "work_description": "TEST_job_card_parts_deduction",
            "mechanic_name": "TEST_Mechanic",
            "estimated_cost": 500,
            "coupon_no": 1,
            "job_date": "2026-07-20",
            "parts": [{"part_id": pid, "part_name": name, "quantity": 1, "unit_cost": 100}]
        })
        assert r.status_code == 200, f"Job creation failed: {r.text}"
        job = r.json()
        job_id = job["id"]

        # Verify parts deducted
        r2 = auth.get(f"{BASE_URL}/api/spare-parts")
        parts2 = r2.json()
        part_after = next((p for p in parts2 if p["id"] == pid), None)
        assert part_after["quantity"] == qty_before - 1, "Part quantity not deducted"

        # Verify transaction logged
        rt = auth.get(f"{BASE_URL}/api/spare-parts/{pid}/transactions")
        txns = rt.json()
        job_txn = next((t for t in txns if t.get("job_id") == job_id), None)
        assert job_txn is not None, "Job card transaction not logged"
        assert job_txn["reason"] == "Used in Job Card"

        # Cleanup
        auth.delete(f"{BASE_URL}/api/jobs/{job_id}")
