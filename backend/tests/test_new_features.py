"""Tests for new features: spare parts, vehicle photos, legal documents, website sync"""
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
def auth(token):
    s = requests.Session()
    s.headers.update({"Authorization": f"Bearer {token}", "Content-Type": "application/json"})
    return s

@pytest.fixture(scope="module")
def vehicle_id(auth):
    """Get or create a test vehicle"""
    r = auth.get(f"{BASE_URL}/api/vehicles")
    if r.status_code == 200 and r.json():
        return r.json()[0]["id"]
    r = auth.post(f"{BASE_URL}/api/vehicles", json={
        "brand": "Honda", "model": "Activa", "year": 2022, "engine_cc": 110,
        "purchase_price": 100000, "purchase_date": "2024-01-01"
    })
    assert r.status_code in [200, 201]
    return r.json()["id"]

# ── Spare Parts Tests ──────────────────────────────────────────────────

class TestSpareParts:
    """Spare parts CRUD endpoints"""

    def test_get_spare_parts_returns_array(self, auth):
        r = auth.get(f"{BASE_URL}/api/spare-parts")
        assert r.status_code == 200
        assert isinstance(r.json(), list)
        print("GET /spare-parts OK")

    def test_get_spare_parts_summary(self, auth):
        r = auth.get(f"{BASE_URL}/api/spare-parts/summary")
        assert r.status_code == 200, f"Summary failed: {r.status_code} {r.text}"
        data = r.json()
        assert "total_parts" in data
        assert "total_value" in data
        assert "low_stock_count" in data
        print(f"GET /spare-parts/summary OK: {data}")

    def test_create_spare_part(self, auth):
        r = auth.post(f"{BASE_URL}/api/spare-parts", json={
            "name": "TEST_Brake Pad", "category": "Brakes", "quantity": 10, "unit_cost": 850
        })
        assert r.status_code == 200, f"Create failed: {r.text}"
        data = r.json()
        assert data["name"] == "TEST_Brake Pad"
        assert data["category"] == "Brakes"
        assert data["quantity"] == 10
        assert data["unit_cost"] == 850
        assert "id" in data
        print(f"POST /spare-parts OK: {data['id']}")

    def test_create_and_verify_persistence(self, auth):
        r = auth.post(f"{BASE_URL}/api/spare-parts", json={
            "name": "TEST_Oil Filter", "category": "Filters", "quantity": 5, "unit_cost": 450
        })
        assert r.status_code == 200
        part_id = r.json()["id"]
        list_r = auth.get(f"{BASE_URL}/api/spare-parts")
        assert list_r.status_code == 200
        ids = [p["id"] for p in list_r.json()]
        assert part_id in ids
        print("Create+persist OK")

    def test_update_spare_part(self, auth):
        r = auth.post(f"{BASE_URL}/api/spare-parts", json={"name": "TEST_Chain", "category": "Chain & Sprocket", "quantity": 3, "unit_cost": 500})
        pid = r.json()["id"]
        u = auth.put(f"{BASE_URL}/api/spare-parts/{pid}", json={"quantity": 7, "unit_cost": 600})
        assert u.status_code == 200, f"Update failed: {u.text}"
        assert u.json()["quantity"] == 7
        print("PUT /spare-parts/{id} OK")

    def test_adjust_stock(self, auth):
        r = auth.post(f"{BASE_URL}/api/spare-parts", json={"name": "TEST_Spark Plug", "category": "Engine", "quantity": 5, "unit_cost": 200})
        pid = r.json()["id"]
        u = auth.post(f"{BASE_URL}/api/spare-parts/{pid}/adjust-stock", json={"delta": 3})
        assert u.status_code == 200
        assert u.json()["quantity"] == 8
        d = auth.post(f"{BASE_URL}/api/spare-parts/{pid}/adjust-stock", json={"delta": -2})
        assert d.status_code == 200
        assert d.json()["quantity"] == 6
        print("Adjust stock OK")

    def test_delete_spare_part(self, auth):
        r = auth.post(f"{BASE_URL}/api/spare-parts", json={"name": "TEST_Delete Me", "category": "Other", "quantity": 1, "unit_cost": 100})
        pid = r.json()["id"]
        d = auth.delete(f"{BASE_URL}/api/spare-parts/{pid}")
        assert d.status_code == 200
        print("DELETE /spare-parts/{id} OK")

    def test_low_stock_indicator(self, auth):
        r = auth.post(f"{BASE_URL}/api/spare-parts", json={"name": "TEST_Low Stock Part", "category": "General", "quantity": 1, "unit_cost": 100, "min_stock_alert": 5})
        pid = r.json()["id"]
        parts = auth.get(f"{BASE_URL}/api/spare-parts").json()
        p = next((x for x in parts if x["id"] == pid), None)
        assert p is not None
        assert p["low_stock"] == True
        print("Low stock indicator OK")


# ── Vehicle Photos Tests ───────────────────────────────────────────────

class TestVehiclePhotos:
    """Vehicle photo upload endpoints"""

    def test_get_vehicle_photos(self, auth, vehicle_id):
        r = auth.get(f"{BASE_URL}/api/vehicles/{vehicle_id}/photos")
        assert r.status_code == 200
        assert isinstance(r.json(), list)
        print("GET photos OK")

    def test_upload_vehicle_photo(self, auth, vehicle_id):
        import struct, zlib
        def make_png():
            def chunk(name, data):
                c = name + data
                return struct.pack('>I', len(data)) + c + struct.pack('>I', zlib.crc32(c) & 0xffffffff)
            sig = b'\x89PNG\r\n\x1a\n'
            ihdr = chunk(b'IHDR', struct.pack('>IIBBBBB', 1, 1, 8, 2, 0, 0, 0))
            raw = b'\x00\xff\xff\xff'
            idat = chunk(b'IDAT', zlib.compress(raw))
            iend = chunk(b'IEND', b'')
            return sig + ihdr + idat + iend
        img = make_png()
        tok = auth.headers["Authorization"].split(" ")[1]
        files = {"file": ("test.png", img, "image/png")}
        r = requests.post(f"{BASE_URL}/api/vehicles/{vehicle_id}/photos",
                          files=files, headers={"Authorization": f"Bearer {tok}"})
        assert r.status_code == 200, f"Upload failed: {r.text}"
        data = r.json()
        assert "id" in data
        assert "url" in data
        print(f"Photo upload OK: {data['url']}")


# ── Website Sync Tests ─────────────────────────────────────────────────

class TestWebsiteSync:
    """Website sync export/push endpoints"""

    def test_sync_export(self, auth):
        r = auth.get(f"{BASE_URL}/api/sync/export")
        assert r.status_code == 200, f"Sync export failed: {r.text}"
        data = r.json()
        assert "count" in data
        assert "listings" in data
        assert isinstance(data["listings"], list)
        print(f"GET /sync/export OK: {data['count']} listings")

    def test_sync_push(self, auth):
        r = auth.post(f"{BASE_URL}/api/sync/push")
        assert r.status_code == 200, f"Sync push failed: {r.text}"
        data = r.json()
        assert "status" in data
        assert "count" in data
        print(f"POST /sync/push OK: {data}")


# ── Cleanup ────────────────────────────────────────────────────────────

def test_cleanup_test_parts(auth):
    """Delete TEST_ prefixed parts"""
    parts = auth.get(f"{BASE_URL}/api/spare-parts").json()
    deleted = 0
    for p in parts:
        if p["name"].startswith("TEST_"):
            auth.delete(f"{BASE_URL}/api/spare-parts/{p['id']}")
            deleted += 1
    print(f"Cleaned up {deleted} TEST_ parts")
