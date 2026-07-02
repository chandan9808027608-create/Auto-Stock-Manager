"""Iteration 8 - Verify pymongo/motor upgrade didn't break core API flows"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

@pytest.fixture
def auth_token():
    resp = requests.post(f"{BASE_URL}/api/auth/login", json={"username": "admin", "password": "admin123"})
    assert resp.status_code == 200, f"Login failed: {resp.text}"
    return resp.json().get("token") or resp.json().get("access_token")

def test_health_check():
    resp = requests.get(f"{BASE_URL}/api/health")
    assert resp.status_code == 200
    data = resp.json()
    assert data.get("status") == "ok" or "ok" in str(data).lower()
    print(f"Health check passed: {data}")

def test_login():
    resp = requests.post(f"{BASE_URL}/api/auth/login", json={"username": "admin", "password": "admin123"})
    assert resp.status_code == 200
    data = resp.json()
    token = data.get("token") or data.get("access_token")
    assert token, f"No token in response: {data}"
    print(f"Login passed, token received")

def test_get_vehicles(auth_token):
    headers = {"Authorization": f"Bearer {auth_token}"}
    resp = requests.get(f"{BASE_URL}/api/vehicles", headers=headers)
    assert resp.status_code == 200
    data = resp.json()
    assert isinstance(data, list) or isinstance(data, dict)
    print(f"Vehicles endpoint passed: {len(data) if isinstance(data, list) else data}")

def test_dashboard(auth_token):
    headers = {"Authorization": f"Bearer {auth_token}"}
    resp = requests.get(f"{BASE_URL}/api/reports/dashboard", headers=headers)
    assert resp.status_code == 200
    data = resp.json()
    print(f"Dashboard passed: {data}")
