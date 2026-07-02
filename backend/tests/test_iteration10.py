import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

def test_health():
    r = requests.get(f"{BASE_URL}/api/health", timeout=15)
    assert r.status_code == 200
    data = r.json()
    assert data.get("status") == "ok"
    print("Health check passed")

def test_login():
    r = requests.post(f"{BASE_URL}/api/auth/login", json={"username": "admin", "password": "admin123"}, timeout=15)
    assert r.status_code == 200
    data = r.json()
    assert "token" in data
    print("Login passed")

def get_token():
    r = requests.post(f"{BASE_URL}/api/auth/login", json={"username": "admin", "password": "admin123"}, timeout=15)
    return r.json()["token"]

def test_vehicles():
    token = get_token()
    r = requests.get(f"{BASE_URL}/api/vehicles", headers={"Authorization": f"Bearer {token}"}, timeout=15)
    assert r.status_code == 200
    print(f"Vehicles: {len(r.json())} items")

def test_dashboard():
    token = get_token()
    r = requests.get(f"{BASE_URL}/api/reports/dashboard", headers={"Authorization": f"Bearer {token}"}, timeout=15)
    assert r.status_code == 200
    print("Dashboard passed")
