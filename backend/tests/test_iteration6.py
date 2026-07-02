"""Iteration 6: Verify trimmed requirements.txt didn't break any APIs"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

def test_health():
    """Health check"""
    r = requests.get(f"{BASE_URL}/api/health")
    assert r.status_code == 200
    assert r.json().get("status") == "ok"

def test_login():
    """Login returns JWT token"""
    r = requests.post(f"{BASE_URL}/api/auth/login", json={"username": "admin", "password": "admin123"})
    assert r.status_code == 200
    data = r.json()
    assert "token" in data

def get_token():
    r = requests.post(f"{BASE_URL}/api/auth/login", json={"username": "admin", "password": "admin123"})
    return r.json().get("token")

def test_vehicles():
    """GET /api/vehicles returns list"""
    token = get_token()
    r = requests.get(f"{BASE_URL}/api/vehicles", headers={"Authorization": f"Bearer {token}"})
    assert r.status_code == 200
    assert isinstance(r.json(), list)

def test_dashboard():
    """GET /api/reports/dashboard returns stats"""
    token = get_token()
    r = requests.get(f"{BASE_URL}/api/reports/dashboard", headers={"Authorization": f"Bearer {token}"})
    assert r.status_code == 200
    data = r.json()
    assert isinstance(data, dict)

def test_finance_summary():
    """GET /api/finance/summary returns data"""
    token = get_token()
    r = requests.get(f"{BASE_URL}/api/finance/summary", headers={"Authorization": f"Bearer {token}"})
    assert r.status_code == 200
