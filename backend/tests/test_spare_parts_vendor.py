"""Tests for Spare Parts vendor_id integration and vendor combobox backend"""
import pytest
import requests
import os
import uuid

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

@pytest.fixture(scope="module")
def auth_token():
    r = requests.post(f"{BASE_URL}/api/auth/login", json={"username": "admin", "password": "admin123"})
    if r.status_code != 200:
        pytest.skip(f"Auth failed: {r.status_code} {r.text}")
    data = r.json()
    return data.get("token") or data.get("access_token")

@pytest.fixture(scope="module")
def client(auth_token):
    s = requests.Session()
    s.headers.update({"Authorization": f"Bearer {auth_token}", "Content-Type": "application/json"})
    return s

# Test: GET /vendors/search returns all vendors when q is empty
def test_vendors_search_empty_query(client):
    r = client.get(f"{BASE_URL}/api/vendors/search")
    assert r.status_code == 200
    data = r.json()
    assert isinstance(data, list)
    print(f"vendors/search (no q) returned {len(data)} vendors")

def test_vendors_search_with_query(client):
    r = client.get(f"{BASE_URL}/api/vendors/search?q=honda")
    assert r.status_code == 200
    data = r.json()
    assert isinstance(data, list)
    print(f"vendors/search?q=honda returned {len(data)} vendors")

# Test: Create vendor, create spare part with vendor_id, verify GET returns vendor_name
def test_spare_part_vendor_flow(client):
    # Create a test vendor
    vendor_name = f"TEST_Vendor_{uuid.uuid4().hex[:6]}"
    r = client.post(f"{BASE_URL}/api/vendors", json={"name": vendor_name, "phone": "9800000099", "address": "Test Addr"})
    assert r.status_code == 200
    vendor = r.json()
    vendor_id = vendor["id"]
    assert vendor["name"] == vendor_name
    print(f"Created vendor: {vendor_id}")

    # Create spare part with vendor_id
    part_name = f"TEST_Part_{uuid.uuid4().hex[:6]}"
    r2 = client.post(f"{BASE_URL}/api/spare-parts", json={
        "name": part_name, "category": "Engine", "quantity": 5,
        "unit_cost": 100, "vendor_id": vendor_id
    })
    assert r2.status_code == 200
    part = r2.json()
    part_id = part["id"]
    assert part["vendor_id"] == vendor_id
    print(f"Created part: {part_id}")

    # GET spare-parts and check vendor_name is enriched
    r3 = client.get(f"{BASE_URL}/api/spare-parts")
    assert r3.status_code == 200
    parts = r3.json()
    found = next((p for p in parts if p["id"] == part_id), None)
    assert found is not None, "Part not found in list"
    assert found.get("vendor_name") == vendor_name, f"vendor_name mismatch: {found.get('vendor_name')} != {vendor_name}"
    print(f"vendor_name enriched correctly: {found['vendor_name']}")

    # Cleanup
    client.delete(f"{BASE_URL}/api/spare-parts/{part_id}")
    client.delete(f"{BASE_URL}/api/vendors/{vendor_id}")

# Test: Part without vendor_id has no vendor_name (returns None or missing)
def test_spare_part_no_vendor(client):
    part_name = f"TEST_NoVendor_{uuid.uuid4().hex[:6]}"
    r = client.post(f"{BASE_URL}/api/spare-parts", json={
        "name": part_name, "category": "Engine", "quantity": 2, "unit_cost": 50
    })
    assert r.status_code == 200
    part = r.json()
    part_id = part["id"]

    r2 = client.get(f"{BASE_URL}/api/spare-parts")
    parts = r2.json()
    found = next((p for p in parts if p["id"] == part_id), None)
    assert found is not None
    # vendor_name should be None or not present for parts without vendor_id
    assert not found.get("vendor_name"), f"Expected no vendor_name but got: {found.get('vendor_name')}"
    print("No vendor_name for part without vendor_id - correct")

    client.delete(f"{BASE_URL}/api/spare-parts/{part_id}")

# Test: Update part to add vendor_id
def test_update_spare_part_vendor_id(client):
    # Create vendor and part
    vendor_name = f"TEST_UpdVendor_{uuid.uuid4().hex[:6]}"
    vr = client.post(f"{BASE_URL}/api/vendors", json={"name": vendor_name, "phone": "9800000098", "address": "Addr"})
    vendor_id = vr.json()["id"]

    r = client.post(f"{BASE_URL}/api/spare-parts", json={
        "name": f"TEST_UpdPart_{uuid.uuid4().hex[:6]}", "category": "Brake", "quantity": 3, "unit_cost": 200
    })
    part_id = r.json()["id"]

    # Update with vendor_id
    ur = client.put(f"{BASE_URL}/api/spare-parts/{part_id}", json={"vendor_id": vendor_id})
    assert ur.status_code == 200

    # Verify in GET
    r3 = client.get(f"{BASE_URL}/api/spare-parts")
    found = next((p for p in r3.json() if p["id"] == part_id), None)
    assert found and found.get("vendor_name") == vendor_name
    print(f"vendor_name after update: {found['vendor_name']}")

    client.delete(f"{BASE_URL}/api/spare-parts/{part_id}")
    client.delete(f"{BASE_URL}/api/vendors/{vendor_id}")
