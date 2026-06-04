from fastapi import FastAPI, APIRouter, HTTPException, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from passlib.context import CryptContext
from typing import Optional, List
from datetime import datetime, timezone, timedelta
from pathlib import Path
import os, logging, jwt, uuid, json
from pydantic import BaseModel
from emergentintegrations.llm.chat import LlmChat, UserMessage

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

JWT_SECRET = os.environ.get('JWT_SECRET', 'hamro-gng-2024')
EMERGENT_LLM_KEY = os.environ.get('EMERGENT_LLM_KEY')

app = FastAPI()
api_router = APIRouter(prefix="/api")
security = HTTPBearer()
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# ── Auth Helpers ──────────────────────────────────────────────────────
def hash_pw(pw: str) -> str: return pwd_context.hash(pw)
def verify_pw(pw: str, hashed: str) -> bool: return pwd_context.verify(pw, hashed)

def create_token(user_id: str, username: str, role: str = "admin") -> str:
    return jwt.encode(
        {"user_id": user_id, "username": username, "role": role,
         "exp": datetime.now(timezone.utc) + timedelta(days=7)},
        JWT_SECRET, algorithm="HS256"
    )

async def get_current_user(creds: HTTPAuthorizationCredentials = Depends(security)):
    try:
        return jwt.decode(creds.credentials, JWT_SECRET, algorithms=["HS256"])
    except jwt.ExpiredSignatureError:
        raise HTTPException(401, "Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(401, "Invalid token")

def stock_aging(purchase_date_str: str) -> dict:
    try:
        s = str(purchase_date_str)
        d = datetime.fromisoformat(s.replace('Z', '+00:00')) if 'T' in s else datetime.strptime(s, '%Y-%m-%d').replace(tzinfo=timezone.utc)
        days = (datetime.now(timezone.utc) - d).days
    except:
        days = 0
    if days <= 30:   return {"days": days, "category": "fresh",  "label": "Fresh Stock"}
    elif days <= 45: return {"days": days, "category": "normal", "label": "Normal"}
    elif days <= 60: return {"days": days, "category": "slow",   "label": "Slow Moving"}
    else:            return {"days": days, "category": "dead",   "label": "Dead Stock Alert"}

async def enrich_vehicle(v: dict) -> dict:
    v["aging"] = stock_aging(v.get("purchase_date", ""))
    exps = await db.expenses.find({"vehicle_id": v["id"]}, {"_id": 0}).to_list(200)
    total_exp = sum(e["amount"] for e in exps)
    v["total_expenses"] = total_exp
    v["total_investment"] = v.get("purchase_price", 0) + total_exp + v.get("accessories_cost", 0)
    sp = v.get("selling_price") or 0
    if sp > 0:
        v["expected_profit"] = sp - v["total_investment"]
        v["profit_margin"] = round((v["expected_profit"] / sp) * 100, 2)
        v["low_margin"] = v["profit_margin"] < 8
    else:
        v["expected_profit"] = None; v["profit_margin"] = None; v["low_margin"] = False
    return v

# ── Models ────────────────────────────────────────────────────────────
class LoginRequest(BaseModel):
    username: str; password: str

class RegisterRequest(BaseModel):
    username: str; password: str; name: str
    role: str = "sales_staff"

class ChangePasswordRequest(BaseModel):
    current_password: str; new_password: str

class VehicleCreate(BaseModel):
    brand: str; model: str
    variant: Optional[str] = None
    year: int; engine_cc: int
    fuel_type: str = "Petrol"
    ownership_number: int = 1
    chassis_number: Optional[str] = None
    engine_number: Optional[str] = None
    kilometer_run: Optional[int] = None
    condition: str = "Good"
    condition_rating: int = 7
    color: Optional[str] = None
    registration_number: Optional[str] = None
    purchase_price: float
    accessories_cost: float = 0
    purchase_date: str
    purchase_source: str
    vendor_id: Optional[str] = None
    purchase_from: Optional[str] = None
    selling_price: Optional[float] = None
    minimum_selling_price: Optional[float] = None
    notes: Optional[str] = None
    status: str = "available"
    bluebook_status: str = "pending"
    insurance_status: str = "pending"
    tax_clearance_status: str = "pending"
    transfer_status: str = "pending"

class VehicleUpdate(BaseModel):
    brand: Optional[str] = None; model: Optional[str] = None
    variant: Optional[str] = None; year: Optional[int] = None
    engine_cc: Optional[int] = None; fuel_type: Optional[str] = None
    ownership_number: Optional[int] = None
    chassis_number: Optional[str] = None; engine_number: Optional[str] = None
    kilometer_run: Optional[int] = None
    condition: Optional[str] = None; condition_rating: Optional[int] = None
    color: Optional[str] = None; registration_number: Optional[str] = None
    purchase_price: Optional[float] = None; accessories_cost: Optional[float] = None
    purchase_date: Optional[str] = None; purchase_source: Optional[str] = None
    vendor_id: Optional[str] = None; purchase_from: Optional[str] = None
    selling_price: Optional[float] = None; minimum_selling_price: Optional[float] = None
    notes: Optional[str] = None; status: Optional[str] = None
    sold_date: Optional[str] = None; customer_id: Optional[str] = None
    salesperson_id: Optional[str] = None; salesperson_name: Optional[str] = None
    discount: Optional[float] = None
    bluebook_status: Optional[str] = None; insurance_status: Optional[str] = None
    tax_clearance_status: Optional[str] = None; transfer_status: Optional[str] = None

class ExpenseCreate(BaseModel):
    vehicle_id: str; category: str; amount: float
    description: Optional[str] = None; date: Optional[str] = None

class JobCardCreate(BaseModel):
    vehicle_id: str; work_description: str
    mechanic_id: Optional[str] = None; mechanic_name: str
    estimated_cost: float; notes: Optional[str] = None

class JobCardUpdate(BaseModel):
    work_description: Optional[str] = None; mechanic_name: Optional[str] = None
    estimated_cost: Optional[float] = None; actual_cost: Optional[float] = None
    status: Optional[str] = None; notes: Optional[str] = None

class CustomerCreate(BaseModel):
    name: str; contact_number: str
    address: Optional[str] = None
    occupation: Optional[str] = None
    budget_min: Optional[float] = None
    budget_max: Optional[float] = None
    interested_brands: Optional[str] = None
    notes: Optional[str] = None

class TeamMemberCreate(BaseModel):
    name: str; role: str
    contact: Optional[str] = None
    specialization: Optional[str] = None
    commission_rate: Optional[float] = None
    joining_date: Optional[str] = None

class PartnerCreate(BaseModel):
    name: str; capital_contribution: float
    stake_percentage: float; contact: Optional[str] = None

class VendorCreate(BaseModel):
    name: str; phone: str
    address: Optional[str] = None
    notes: Optional[str] = None

class VendorPaymentCreate(BaseModel):
    vendor_id: str; amount: float
    vehicle_id: Optional[str] = None
    payment_date: Optional[str] = None
    notes: Optional[str] = None

class MarketingRequest(BaseModel):
    vehicle_id: str
    platforms: List[str]
    additional_info: Optional[str] = None

class EMICreate(BaseModel):
    customer_id: str; vehicle_id: str
    loan_amount: float; down_payment: float
    interest_rate: float; tenure_months: int
    start_date: str
    financer_name: Optional[str] = None
    notes: Optional[str] = None

class EMIPaymentCreate(BaseModel):
    emi_id: str; amount: float
    payment_date: Optional[str] = None
    notes: Optional[str] = None

class AIRequest(BaseModel):
    context_type: str; additional_context: Optional[str] = None

# ── AUTH ──────────────────────────────────────────────────────────────
@api_router.post("/auth/login")
async def login(req: LoginRequest):
    user = await db.users.find_one({"username": req.username})
    if not user or not verify_pw(req.password, user["password_hash"]):
        raise HTTPException(401, "Invalid credentials")
    token = create_token(user.get("id", ""), user["username"], user.get("role", "admin"))
    return {"token": token, "username": user["username"], "name": user.get("name", user["username"]), "role": user.get("role", "admin")}

@api_router.get("/auth/me")
async def me(cu: dict = Depends(get_current_user)):
    user = await db.users.find_one({"username": cu["username"]}, {"_id": 0, "password_hash": 0})
    return user

@api_router.post("/auth/change-password")
async def change_password(req: ChangePasswordRequest, cu: dict = Depends(get_current_user)):
    user = await db.users.find_one({"username": cu["username"]})
    if not user or not verify_pw(req.current_password, user["password_hash"]):
        raise HTTPException(400, "Current password incorrect")
    await db.users.update_one({"username": cu["username"]}, {"$set": {"password_hash": hash_pw(req.new_password)}})
    return {"message": "Password changed successfully"}

@api_router.get("/auth/users")
async def list_users(cu: dict = Depends(get_current_user)):
    users = await db.users.find({}, {"_id": 0, "password_hash": 0}).to_list(100)
    return users

@api_router.post("/auth/register")
async def register(req: RegisterRequest, cu: dict = Depends(get_current_user)):
    if cu.get("role") != "admin":
        raise HTTPException(403, "Only admin can register users")
    existing = await db.users.find_one({"username": req.username})
    if existing:
        raise HTTPException(400, "Username already exists")
    user = {"id": str(uuid.uuid4()), "username": req.username,
            "password_hash": hash_pw(req.password), "name": req.name, "role": req.role,
            "created_at": datetime.now(timezone.utc).isoformat()}
    await db.users.insert_one(user)
    user.pop("_id", None); user.pop("password_hash", None)
    return user

# ── VEHICLES ──────────────────────────────────────────────────────────
@api_router.get("/vehicles")
async def get_vehicles(status: Optional[str] = None, brand: Optional[str] = None, cu: dict = Depends(get_current_user)):
    q = {}
    if status and status != "all": q["status"] = status
    if brand and brand != "all": q["brand"] = brand
    vehicles = await db.vehicles.find(q, {"_id": 0}).sort("created_at", -1).to_list(1000)
    return [await enrich_vehicle(v) for v in vehicles]

@api_router.post("/vehicles")
async def create_vehicle(vehicle: VehicleCreate, cu: dict = Depends(get_current_user)):
    v = vehicle.model_dump()
    v["id"] = str(uuid.uuid4())
    v["created_at"] = datetime.now(timezone.utc).isoformat()
    v["updated_at"] = datetime.now(timezone.utc).isoformat()
    v["sold_date"] = None; v["customer_id"] = None
    v["salesperson_id"] = None; v["salesperson_name"] = None; v["discount"] = 0
    v["created_by"] = cu["username"]
    # Audit log
    await db.audit_logs.insert_one({"action": "vehicle_created", "vehicle_id": v["id"],
        "user": cu["username"], "timestamp": datetime.now(timezone.utc).isoformat(),
        "details": f"Added {v['brand']} {v['model']} {v['year']}"})
    await db.vehicles.insert_one(v)
    v.pop("_id", None)
    return v

@api_router.get("/vehicles/{vid}")
async def get_vehicle(vid: str, cu: dict = Depends(get_current_user)):
    v = await db.vehicles.find_one({"id": vid}, {"_id": 0})
    if not v: raise HTTPException(404, "Vehicle not found")
    v = await enrich_vehicle(v)
    v["expenses"] = await db.expenses.find({"vehicle_id": vid}, {"_id": 0}).to_list(200)
    v["job_cards"] = await db.job_cards.find({"vehicle_id": vid}, {"_id": 0}).to_list(100)
    return v

@api_router.put("/vehicles/{vid}")
async def update_vehicle(vid: str, vehicle: VehicleUpdate, cu: dict = Depends(get_current_user)):
    upd = {k: val for k, val in vehicle.model_dump().items() if val is not None}
    upd["updated_at"] = datetime.now(timezone.utc).isoformat()
    if upd.get("status") == "sold" and "sold_date" not in upd:
        upd["sold_date"] = datetime.now(timezone.utc).date().isoformat()
    r = await db.vehicles.update_one({"id": vid}, {"$set": upd})
    if r.matched_count == 0: raise HTTPException(404, "Vehicle not found")
    await db.audit_logs.insert_one({"action": "vehicle_updated", "vehicle_id": vid,
        "user": cu["username"], "timestamp": datetime.now(timezone.utc).isoformat(),
        "details": f"Updated fields: {list(upd.keys())}"})
    return await db.vehicles.find_one({"id": vid}, {"_id": 0})

@api_router.delete("/vehicles/{vid}")
async def delete_vehicle(vid: str, cu: dict = Depends(get_current_user)):
    r = await db.vehicles.delete_one({"id": vid})
    if r.deleted_count == 0: raise HTTPException(404, "Vehicle not found")
    await db.expenses.delete_many({"vehicle_id": vid})
    await db.job_cards.delete_many({"vehicle_id": vid})
    return {"message": "Deleted"}

@api_router.get("/vehicles/{vid}/qr-data")
async def get_vehicle_qr(vid: str):
    v = await db.vehicles.find_one({"id": vid}, {"_id": 0})
    if not v: raise HTTPException(404, "Not found")
    return {"id": v["id"], "brand": v.get("brand"), "model": v.get("model"),
            "variant": v.get("variant"), "year": v.get("year"),
            "engine_cc": v.get("engine_cc"), "fuel_type": v.get("fuel_type"),
            "color": v.get("color"), "ownership_number": v.get("ownership_number"),
            "kilometer_run": v.get("kilometer_run"), "condition": v.get("condition"),
            "selling_price": v.get("selling_price"), "minimum_selling_price": v.get("minimum_selling_price"),
            "registration_number": v.get("registration_number"), "status": v.get("status"),
            "contact": "Hamro G&G Auto Enterprises"}

# ── EXPENSES ──────────────────────────────────────────────────────────
@api_router.get("/vehicles/{vid}/expenses")
async def get_expenses(vid: str, cu: dict = Depends(get_current_user)):
    return await db.expenses.find({"vehicle_id": vid}, {"_id": 0}).to_list(200)

@api_router.post("/expenses")
async def create_expense(exp: ExpenseCreate, cu: dict = Depends(get_current_user)):
    e = exp.model_dump()
    e["id"] = str(uuid.uuid4())
    e["date"] = e.get("date") or datetime.now(timezone.utc).date().isoformat()
    e["added_by"] = cu["username"]
    e["created_at"] = datetime.now(timezone.utc).isoformat()
    await db.expenses.insert_one(e)
    e.pop("_id", None)
    return e

@api_router.delete("/expenses/{eid}")
async def delete_expense(eid: str, cu: dict = Depends(get_current_user)):
    r = await db.expenses.delete_one({"id": eid})
    if r.deleted_count == 0: raise HTTPException(404, "Expense not found")
    return {"message": "Deleted"}

# ── JOB CARDS ─────────────────────────────────────────────────────────
@api_router.get("/jobs")
async def get_jobs(status: Optional[str] = None, vehicle_id: Optional[str] = None, cu: dict = Depends(get_current_user)):
    q = {}
    if status and status != "all": q["status"] = status
    if vehicle_id: q["vehicle_id"] = vehicle_id
    return await db.job_cards.find(q, {"_id": 0}).sort("created_at", -1).to_list(1000)

@api_router.post("/jobs")
async def create_job(job: JobCardCreate, cu: dict = Depends(get_current_user)):
    count = await db.job_cards.count_documents({})
    jc = job.model_dump()
    jc["id"] = str(uuid.uuid4())
    jc["job_number"] = f"JC-{datetime.now(timezone.utc).year}-{str(count + 1).zfill(3)}"
    jc["status"] = "pending"; jc["actual_cost"] = None
    jc["created_at"] = datetime.now(timezone.utc).isoformat()
    jc["completed_at"] = None; jc["created_by"] = cu["username"]
    v = await db.vehicles.find_one({"id": job.vehicle_id}, {"_id": 0})
    if v:
        jc["vehicle_brand"] = v.get("brand"); jc["vehicle_model"] = v.get("model")
        jc["vehicle_year"] = v.get("year"); jc["registration_number"] = v.get("registration_number")
    await db.job_cards.insert_one(jc)
    jc.pop("_id", None)
    return jc

@api_router.put("/jobs/{jid}")
async def update_job(jid: str, job: JobCardUpdate, cu: dict = Depends(get_current_user)):
    upd = {k: v for k, v in job.model_dump().items() if v is not None}
    if upd.get("status") == "completed":
        upd["completed_at"] = datetime.now(timezone.utc).isoformat()
    upd["updated_at"] = datetime.now(timezone.utc).isoformat()
    r = await db.job_cards.update_one({"id": jid}, {"$set": upd})
    if r.matched_count == 0: raise HTTPException(404, "Job not found")
    return await db.job_cards.find_one({"id": jid}, {"_id": 0})

@api_router.delete("/jobs/{jid}")
async def delete_job(jid: str, cu: dict = Depends(get_current_user)):
    r = await db.job_cards.delete_one({"id": jid})
    if r.deleted_count == 0: raise HTTPException(404, "Job not found")
    return {"message": "Deleted"}

# ── CUSTOMERS ─────────────────────────────────────────────────────────
@api_router.get("/customers")
async def get_customers(cu: dict = Depends(get_current_user)):
    customers = await db.customers.find({}, {"_id": 0}).sort("created_at", -1).to_list(1000)
    for c in customers:
        cnt = await db.vehicles.count_documents({"customer_id": c["id"]})
        c["purchase_count"] = cnt; c["is_repeat_customer"] = cnt > 1
    return customers

@api_router.post("/customers")
async def create_customer(cust: CustomerCreate, cu: dict = Depends(get_current_user)):
    c = cust.model_dump()
    c["id"] = str(uuid.uuid4())
    c["created_at"] = datetime.now(timezone.utc).isoformat()
    await db.customers.insert_one(c)
    c.pop("_id", None)
    return c

@api_router.get("/customers/{cid}")
async def get_customer(cid: str, cu: dict = Depends(get_current_user)):
    c = await db.customers.find_one({"id": cid}, {"_id": 0})
    if not c: raise HTTPException(404, "Not found")
    purchases = await db.vehicles.find({"customer_id": cid}, {"_id": 0}).to_list(100)
    c["purchases"] = purchases; c["purchase_count"] = len(purchases)
    c["is_repeat_customer"] = len(purchases) > 1
    return c

@api_router.put("/customers/{cid}")
async def update_customer(cid: str, cust: CustomerCreate, cu: dict = Depends(get_current_user)):
    r = await db.customers.update_one({"id": cid}, {"$set": cust.model_dump()})
    if r.matched_count == 0: raise HTTPException(404, "Not found")
    return await db.customers.find_one({"id": cid}, {"_id": 0})

@api_router.delete("/customers/{cid}")
async def delete_customer(cid: str, cu: dict = Depends(get_current_user)):
    r = await db.customers.delete_one({"id": cid})
    if r.deleted_count == 0: raise HTTPException(404, "Not found")
    return {"message": "Deleted"}

# ── TEAM ──────────────────────────────────────────────────────────────
@api_router.get("/team")
async def get_team(cu: dict = Depends(get_current_user)):
    members = await db.team_members.find({}, {"_id": 0}).to_list(100)
    for m in members:
        if m.get("role") == "mechanic":
            m["total_jobs"] = await db.job_cards.count_documents({"mechanic_id": m["id"]})
            m["completed_jobs"] = await db.job_cards.count_documents({"mechanic_id": m["id"], "status": "completed"})
            m["completion_rate"] = round(m["completed_jobs"] / m["total_jobs"] * 100) if m["total_jobs"] > 0 else 0
    return members

@api_router.get("/team/leaderboard")
async def get_leaderboard(cu: dict = Depends(get_current_user)):
    sales_staff = await db.team_members.find({"role": "sales"}, {"_id": 0}).to_list(50)
    sales_board = []
    for s in sales_staff:
        sold = await db.vehicles.find({"salesperson_id": s["id"]}, {"_id": 0}).to_list(500)
        revenue = sum((v.get("selling_price") or 0) for v in sold)
        sales_board.append({**s, "vehicles_sold": len(sold), "revenue_generated": revenue})
    sales_board.sort(key=lambda x: x["vehicles_sold"], reverse=True)

    mechanics = await db.team_members.find({"role": "mechanic"}, {"_id": 0}).to_list(50)
    mech_board = []
    for m in mechanics:
        total = await db.job_cards.count_documents({"mechanic_id": m["id"]})
        done = await db.job_cards.count_documents({"mechanic_id": m["id"], "status": "completed"})
        mech_board.append({**m, "total_jobs": total, "completed_jobs": done,
                           "completion_rate": round(done/total*100) if total > 0 else 0})
    mech_board.sort(key=lambda x: x["completed_jobs"], reverse=True)
    return {"sales_leaderboard": sales_board, "mechanics_leaderboard": mech_board}

@api_router.post("/team")
async def create_team_member(member: TeamMemberCreate, cu: dict = Depends(get_current_user)):
    m = member.model_dump()
    m["id"] = str(uuid.uuid4()); m["is_active"] = True
    m["joining_date"] = m.get("joining_date") or datetime.now(timezone.utc).date().isoformat()
    m["created_at"] = datetime.now(timezone.utc).isoformat()
    await db.team_members.insert_one(m)
    m.pop("_id", None)
    return m

@api_router.put("/team/{mid}")
async def update_team_member(mid: str, member: TeamMemberCreate, cu: dict = Depends(get_current_user)):
    r = await db.team_members.update_one({"id": mid}, {"$set": member.model_dump()})
    if r.matched_count == 0: raise HTTPException(404, "Not found")
    return await db.team_members.find_one({"id": mid}, {"_id": 0})

@api_router.delete("/team/{mid}")
async def delete_team_member(mid: str, cu: dict = Depends(get_current_user)):
    r = await db.team_members.delete_one({"id": mid})
    if r.deleted_count == 0: raise HTTPException(404, "Not found")
    return {"message": "Deleted"}

# ── PARTNERS ──────────────────────────────────────────────────────────
@api_router.get("/partners")
async def get_partners(cu: dict = Depends(get_current_user)):
    return await db.partners.find({}, {"_id": 0}).to_list(100)

@api_router.post("/partners")
async def create_partner(partner: PartnerCreate, cu: dict = Depends(get_current_user)):
    p = partner.model_dump()
    p["id"] = str(uuid.uuid4()); p["created_at"] = datetime.now(timezone.utc).isoformat()
    await db.partners.insert_one(p)
    p.pop("_id", None)
    return p

@api_router.put("/partners/{pid}")
async def update_partner(pid: str, partner: PartnerCreate, cu: dict = Depends(get_current_user)):
    r = await db.partners.update_one({"id": pid}, {"$set": partner.model_dump()})
    if r.matched_count == 0: raise HTTPException(404, "Not found")
    return await db.partners.find_one({"id": pid}, {"_id": 0})

@api_router.delete("/partners/{pid}")
async def delete_partner(pid: str, cu: dict = Depends(get_current_user)):
    r = await db.partners.delete_one({"id": pid})
    if r.deleted_count == 0: raise HTTPException(404, "Not found")
    return {"message": "Deleted"}

# ── VENDORS ───────────────────────────────────────────────────────────
@api_router.get("/vendors")
async def get_vendors(cu: dict = Depends(get_current_user)):
    vendors = await db.vendors.find({}, {"_id": 0}).to_list(200)
    for v in vendors:
        vehicles = await db.vehicles.find({"vendor_id": v["id"]}, {"_id": 0}).to_list(200)
        total_owed = sum(vh.get("purchase_price", 0) for vh in vehicles)
        payments = await db.vendor_payments.find({"vendor_id": v["id"]}, {"_id": 0}).to_list(500)
        total_paid = sum(p["amount"] for p in payments)
        v["total_purchased"] = total_owed; v["total_paid"] = total_paid
        v["remaining_due"] = max(0, total_owed - total_paid)
        v["vehicle_count"] = len(vehicles)
        v["overdue"] = v["remaining_due"] > 0
    return vendors

@api_router.post("/vendors")
async def create_vendor(vendor: VendorCreate, cu: dict = Depends(get_current_user)):
    v = vendor.model_dump()
    v["id"] = str(uuid.uuid4()); v["created_at"] = datetime.now(timezone.utc).isoformat()
    await db.vendors.insert_one(v)
    v.pop("_id", None)
    return v

@api_router.put("/vendors/{vid}")
async def update_vendor(vid: str, vendor: VendorCreate, cu: dict = Depends(get_current_user)):
    r = await db.vendors.update_one({"id": vid}, {"$set": vendor.model_dump()})
    if r.matched_count == 0: raise HTTPException(404, "Not found")
    return await db.vendors.find_one({"id": vid}, {"_id": 0})

@api_router.delete("/vendors/{vid}")
async def delete_vendor(vid: str, cu: dict = Depends(get_current_user)):
    r = await db.vendors.delete_one({"id": vid})
    if r.deleted_count == 0: raise HTTPException(404, "Not found")
    return {"message": "Deleted"}

@api_router.get("/vendors/{vid}/payments")
async def get_vendor_payments(vid: str, cu: dict = Depends(get_current_user)):
    payments = await db.vendor_payments.find({"vendor_id": vid}, {"_id": 0}).sort("payment_date", -1).to_list(500)
    vehicles = await db.vehicles.find({"vendor_id": vid}, {"_id": 0}).to_list(200)
    total_owed = sum(v.get("purchase_price", 0) for v in vehicles)
    total_paid = sum(p["amount"] for p in payments)
    return {"payments": payments, "total_paid": total_paid,
            "total_owed": total_owed, "remaining_due": max(0, total_owed - total_paid),
            "vehicles": vehicles}

@api_router.post("/vendor-payments")
async def create_vendor_payment(payment: VendorPaymentCreate, cu: dict = Depends(get_current_user)):
    p = payment.model_dump()
    p["id"] = str(uuid.uuid4())
    p["payment_date"] = p.get("payment_date") or datetime.now(timezone.utc).date().isoformat()
    p["recorded_by"] = cu["username"]
    p["created_at"] = datetime.now(timezone.utc).isoformat()
    await db.vendor_payments.insert_one(p)
    p.pop("_id", None)
    return p

@api_router.delete("/vendor-payments/{pid}")
async def delete_vendor_payment(pid: str, cu: dict = Depends(get_current_user)):
    r = await db.vendor_payments.delete_one({"id": pid})
    if r.deleted_count == 0: raise HTTPException(404, "Not found")
    return {"message": "Deleted"}

# ── EMI ───────────────────────────────────────────────────────────────
@api_router.get("/emi")
async def get_emi_list(cu: dict = Depends(get_current_user)):
    emis = await db.emi_records.find({}, {"_id": 0}).to_list(500)
    for e in emis:
        payments = await db.emi_payments.find({"emi_id": e["id"]}, {"_id": 0}).to_list(200)
        paid = sum(p["amount"] for p in payments)
        e["total_paid"] = paid
        e["remaining_balance"] = max(0, e.get("loan_amount", 0) - paid)
        e["payments_made"] = len(payments)
        e["is_active"] = e["remaining_balance"] > 0
    return emis

@api_router.post("/emi")
async def create_emi(emi: EMICreate, cu: dict = Depends(get_current_user)):
    e = emi.model_dump()
    e["id"] = str(uuid.uuid4())
    # Calculate monthly installment: EMI = P * r * (1+r)^n / ((1+r)^n - 1)
    p_val = e["loan_amount"]
    r = e["interest_rate"] / 100 / 12
    n = e["tenure_months"]
    if r > 0:
        monthly = p_val * r * ((1 + r) ** n) / (((1 + r) ** n) - 1)
    else:
        monthly = p_val / n
    e["monthly_installment"] = round(monthly, 2)
    e["total_payable"] = round(monthly * n, 2)
    e["total_interest"] = round(monthly * n - p_val, 2)
    e["status"] = "active"
    e["created_at"] = datetime.now(timezone.utc).isoformat()
    # Get customer info
    customer = await db.customers.find_one({"id": emi.customer_id}, {"_id": 0})
    if customer:
        e["customer_name"] = customer.get("name")
        e["customer_phone"] = customer.get("contact_number")
    # Get vehicle info
    vehicle = await db.vehicles.find_one({"id": emi.vehicle_id}, {"_id": 0})
    if vehicle:
        e["vehicle_name"] = f"{vehicle.get('brand')} {vehicle.get('model')} {vehicle.get('year')}"
    await db.emi_records.insert_one(e)
    e.pop("_id", None)
    return e

@api_router.post("/emi-payments")
async def add_emi_payment(payment: EMIPaymentCreate, cu: dict = Depends(get_current_user)):
    p = payment.model_dump()
    p["id"] = str(uuid.uuid4())
    p["payment_date"] = p.get("payment_date") or datetime.now(timezone.utc).date().isoformat()
    p["recorded_by"] = cu["username"]
    p["created_at"] = datetime.now(timezone.utc).isoformat()
    await db.emi_payments.insert_one(p)
    p.pop("_id", None)
    return p

# ── FINANCE ───────────────────────────────────────────────────────────
@api_router.get("/finance/summary")
async def finance_summary(cu: dict = Depends(get_current_user)):
    avail = await db.vehicles.find({"status": "available"}, {"_id": 0}).to_list(1000)
    inventory_value = 0
    for v in avail:
        exps = await db.expenses.find({"vehicle_id": v["id"]}, {"_id": 0}).to_list(200)
        inventory_value += v.get("purchase_price", 0) + v.get("accessories_cost", 0) + sum(e["amount"] for e in exps)

    sold = await db.vehicles.find({"status": "sold"}, {"_id": 0}).to_list(1000)
    total_revenue, total_cogs = 0, 0
    for v in sold:
        exps = await db.expenses.find({"vehicle_id": v["id"]}, {"_id": 0}).to_list(200)
        inv = v.get("purchase_price", 0) + v.get("accessories_cost", 0) + sum(e["amount"] for e in exps)
        total_revenue += v.get("selling_price") or 0
        total_cogs += inv

    gross_profit = total_revenue - total_cogs

    # Vendor payables
    vendors = await db.vendors.find({}, {"_id": 0}).to_list(100)
    vendor_payables = 0
    for vendor in vendors:
        veh = await db.vehicles.find({"vendor_id": vendor["id"]}, {"_id": 0}).to_list(200)
        owed = sum(v.get("purchase_price", 0) for v in veh)
        pmts = await db.vendor_payments.find({"vendor_id": vendor["id"]}, {"_id": 0}).to_list(200)
        paid = sum(p["amount"] for p in pmts)
        vendor_payables += max(0, owed - paid)

    # EMI receivables
    emis = await db.emi_records.find({"status": "active"}, {"_id": 0}).to_list(200)
    emi_receivables = 0
    for e in emis:
        pmts = await db.emi_payments.find({"emi_id": e["id"]}, {"_id": 0}).to_list(200)
        paid = sum(p["amount"] for p in pmts)
        emi_receivables += max(0, e.get("loan_amount", 0) - paid)

    partners = await db.partners.find({}, {"_id": 0}).to_list(100)
    total_capital = sum(p.get("capital_contribution", 0) for p in partners)

    return {
        "inventory_value": inventory_value,
        "total_revenue": total_revenue,
        "total_cogs": total_cogs,
        "gross_profit": gross_profit,
        "profit_margin_pct": round((gross_profit / total_revenue * 100), 2) if total_revenue > 0 else 0,
        "vendor_payables": vendor_payables,
        "emi_receivables": emi_receivables,
        "total_partner_capital": total_capital,
        "vehicles_in_stock": len(avail),
        "vehicles_sold": len(sold),
    }

# ── MARKETING AI ─────────────────────────────────────────────────────
@api_router.post("/marketing/generate")
async def generate_marketing(req: MarketingRequest, cu: dict = Depends(get_current_user)):
    if not EMERGENT_LLM_KEY:
        raise HTTPException(500, "AI not configured")
    v = await db.vehicles.find_one({"id": req.vehicle_id}, {"_id": 0})
    if not v: raise HTTPException(404, "Vehicle not found")

    vehicle_info = {
        "brand": v.get("brand"), "model": v.get("model"),
        "variant": v.get("variant"), "year": v.get("year"),
        "engine_cc": v.get("engine_cc"), "fuel_type": v.get("fuel_type"),
        "color": v.get("color"), "condition": v.get("condition"),
        "kilometer_run": v.get("kilometer_run"),
        "ownership": f"{v.get('ownership_number', 1)} owner",
        "selling_price_NPR": v.get("selling_price"),
        "registration_number": v.get("registration_number"),
        "additional_info": req.additional_info
    }
    platforms_str = ", ".join(req.platforms)
    system_msg = """You are a marketing expert for Hamro G&G Auto Enterprises in Kathmandu, Nepal.
Create compelling, platform-specific social media marketing posts in English for motorcycle/scooter resale.
Use Nepali context (neighborhoods, festivals, local references). Include emojis, hashtags, and strong CTAs.
Clearly label each platform section."""
    prompt = f"""Create marketing content for: {platforms_str}

Vehicle: {json.dumps(vehicle_info, indent=2)}

For each platform requested, generate:
- FACEBOOK: Detailed 3-4 sentence post + specs + price + hashtags + CTA
- HAMROBAZAR: Professional listing title + full description + specs table
- INSTAGRAM: Short punchy 2-3 line caption + 10-15 hashtags
- TIKTOK: Hook line + 3 video tips + caption + hashtags

Price in NPR. Include: 'Call/WhatsApp: 9841XXXXXX | Visit: Hamro G&G Auto, Kathmandu'"""

    try:
        chat = LlmChat(api_key=EMERGENT_LLM_KEY, session_id=str(uuid.uuid4()),
                       system_message=system_msg).with_model("gemini", "gemini-3-flash-preview")
        response = await chat.send_message(UserMessage(text=prompt))
        return {"content": response, "vehicle": vehicle_info, "platforms": req.platforms}
    except Exception as e:
        logger.error(f"Marketing AI: {e}")
        raise HTTPException(500, f"AI error: {str(e)}")

# ── REPORTS ───────────────────────────────────────────────────────────
@api_router.get("/reports/dashboard")
async def dashboard_stats(cu: dict = Depends(get_current_user)):
    total = await db.vehicles.count_documents({})
    available = await db.vehicles.count_documents({"status": "available"})
    sold = await db.vehicles.count_documents({"status": "sold"})
    reserved = await db.vehicles.count_documents({"status": "reserved"})
    in_repair = await db.vehicles.count_documents({"status": "in_repair"})

    avail_v = await db.vehicles.find({"status": "available"}, {"_id": 0}).to_list(1000)
    locked_capital, dead_cnt, slow_cnt, normal_cnt, fresh_cnt = 0, 0, 0, 0, 0
    for v in avail_v:
        exps = await db.expenses.find({"vehicle_id": v["id"]}, {"_id": 0}).to_list(200)
        locked_capital += v.get("purchase_price", 0) + v.get("accessories_cost", 0) + sum(e["amount"] for e in exps)
        ag = stock_aging(v.get("purchase_date", ""))
        if ag["category"] == "dead": dead_cnt += 1
        elif ag["category"] == "slow": slow_cnt += 1
        elif ag["category"] == "normal": normal_cnt += 1
        else: fresh_cnt += 1

    sold_v = await db.vehicles.find({"status": "sold"}, {"_id": 0}).to_list(1000)
    total_profit = 0
    for v in sold_v:
        exps = await db.expenses.find({"vehicle_id": v["id"]}, {"_id": 0}).to_list(200)
        inv = v.get("purchase_price", 0) + v.get("accessories_cost", 0) + sum(e["amount"] for e in exps)
        total_profit += (v.get("selling_price") or 0) - inv

    # Vendor dues alert
    vendors = await db.vendors.find({}, {"_id": 0}).to_list(100)
    total_vendor_due = 0
    for vendor in vendors:
        veh = await db.vehicles.find({"vendor_id": vendor["id"]}, {"_id": 0}).to_list(200)
        owed = sum(v.get("purchase_price", 0) for v in veh)
        pmts = await db.vendor_payments.find({"vendor_id": vendor["id"]}, {"_id": 0}).to_list(200)
        paid = sum(p["amount"] for p in pmts)
        total_vendor_due += max(0, owed - paid)

    return {
        "total_vehicles": total, "available": available, "sold": sold,
        "reserved": reserved, "in_repair": in_repair,
        "locked_capital": locked_capital, "total_realized_profit": total_profit,
        "dead_stock_count": dead_cnt, "slow_moving_count": slow_cnt,
        "normal_count": normal_cnt, "fresh_count": fresh_cnt,
        "pending_jobs": await db.job_cards.count_documents({"status": "pending"}),
        "in_progress_jobs": await db.job_cards.count_documents({"status": "in_progress"}),
        "total_customers": await db.customers.count_documents({}),
        "total_vendor_due": total_vendor_due,
        "total_vendors": await db.vendors.count_documents({}),
    }

@api_router.get("/reports/inventory")
async def inventory_report(cu: dict = Depends(get_current_user)):
    vehicles = await db.vehicles.find({}, {"_id": 0}).to_list(1000)
    report = {"by_brand": {}, "by_status": {}, "by_aging": {"fresh": 0, "normal": 0, "slow": 0, "dead": 0},
              "by_source": {}, "slow_moving": [], "dead_stock": [], "by_fuel": {}}
    for v in vehicles:
        brand = v.get("brand", "Unknown")
        report["by_brand"][brand] = report["by_brand"].get(brand, 0) + 1
        st = v.get("status", "available")
        report["by_status"][st] = report["by_status"].get(st, 0) + 1
        src = v.get("purchase_source", "Unknown")
        if src not in report["by_source"]: report["by_source"][src] = {"count": 0}
        report["by_source"][src]["count"] += 1
        fuel = v.get("fuel_type", "Petrol")
        report["by_fuel"][fuel] = report["by_fuel"].get(fuel, 0) + 1
        if v.get("status") == "available":
            ag = stock_aging(v.get("purchase_date", ""))
            cat = ag["category"]
            if cat in report["by_aging"]: report["by_aging"][cat] += 1
            item = {"id": v["id"], "brand": v.get("brand"), "model": v.get("model"),
                    "year": v.get("year"), "days": ag["days"],
                    "purchase_price": v.get("purchase_price"), "selling_price": v.get("selling_price")}
            if cat == "slow": report["slow_moving"].append(item)
            elif cat == "dead": report["dead_stock"].append(item)
    return report

@api_router.get("/reports/financial")
async def financial_report(cu: dict = Depends(get_current_user)):
    sold = await db.vehicles.find({"status": "sold"}, {"_id": 0}).to_list(1000)
    monthly = {}
    for v in sold:
        sd = v.get("sold_date") or v.get("updated_at", "")
        month = sd[:7] if sd else "unknown"
        if month not in monthly: monthly[month] = {"revenue": 0, "investment": 0, "profit": 0, "count": 0}
        exps = await db.expenses.find({"vehicle_id": v["id"]}, {"_id": 0}).to_list(200)
        inv = v.get("purchase_price", 0) + v.get("accessories_cost", 0) + sum(e["amount"] for e in exps)
        sp = v.get("selling_price") or 0
        monthly[month]["revenue"] += sp
        monthly[month]["investment"] += inv
        monthly[month]["profit"] += sp - inv
        monthly[month]["count"] += 1
    partners = await db.partners.find({}, {"_id": 0}).to_list(100)
    total_profit = sum(m["profit"] for m in monthly.values())
    partner_shares = [{"name": p["name"], "stake": p["stake_percentage"],
                       "capital": p["capital_contribution"],
                       "profit_share": round(total_profit * p["stake_percentage"] / 100, 2)} for p in partners]
    return {"monthly_breakdown": monthly, "total_profit": total_profit, "partner_shares": partner_shares}

# ── AI SUGGESTIONS ────────────────────────────────────────────────────
@api_router.post("/ai/suggestions")
async def ai_suggestions(req: AIRequest, cu: dict = Depends(get_current_user)):
    if not EMERGENT_LLM_KEY:
        raise HTTPException(500, "AI not configured")
    ctx = {}
    if req.context_type == "inventory":
        vehicles = await db.vehicles.find({"status": "available"}, {"_id": 0}).to_list(50)
        slow_list = []
        for v in vehicles:
            ag = stock_aging(v.get("purchase_date", ""))
            if ag["category"] in ["slow", "dead"]:
                exps = await db.expenses.find({"vehicle_id": v["id"]}, {"_id": 0}).to_list(50)
                slow_list.append({"brand": v.get("brand"), "model": v.get("model"),
                                   "days": ag["days"], "category": ag["category"],
                                   "purchase_price": v.get("purchase_price"), "selling_price": v.get("selling_price"),
                                   "total_investment": v.get("purchase_price", 0) + sum(e["amount"] for e in exps)})
        ctx = {"available_count": len(vehicles), "slow_and_dead_stock": slow_list[:6]}
    elif req.context_type == "finance":
        avail = await db.vehicles.find({"status": "available"}, {"_id": 0}).to_list(500)
        locked = sum(v.get("purchase_price", 0) for v in avail)
        ctx = {"locked_capital_NPR": locked, "total_vehicles": await db.vehicles.count_documents({}),
               "sold_vehicles": await db.vehicles.count_documents({"status": "sold"})}
    elif req.context_type == "customer":
        custs = await db.customers.find({}, {"_id": 0}).to_list(20)
        ctx = {"total_customers": len(custs), "customers": [{"name": c["name"], "contact": c.get("contact_number")} for c in custs[:8]]}
    elif req.context_type == "festival":
        avail = await db.vehicles.find({"status": "available"}, {"_id": 0}).to_list(50)
        ctx = {"available_stock": len(avail), "vehicles": [{"brand": v.get("brand"), "model": v.get("model"), "price": v.get("selling_price")} for v in avail[:10]]}
    elif req.context_type == "vendor":
        vendors = await db.vendors.find({}, {"_id": 0}).to_list(20)
        ctx = {"total_vendors": len(vendors), "vendors_with_due": sum(1 for v in vendors)}
    if req.additional_context:
        ctx["user_note"] = req.additional_context
    system_msg = """You are an expert business advisor for Hamro G&G Auto Enterprises, Kathmandu, Nepal.
Give 4-5 specific, actionable recommendations. Use NPR for money. Be direct and practical.
Consider Nepal market: Dashain/Tihar festival demand, fuel price sensitivity, 125cc popularity, financing trends.
Format as numbered list with bold headings."""
    prompt = f"Context: {req.context_type}\nData: {json.dumps(ctx, indent=2)}\n\nProvide recommendations:"
    try:
        chat = LlmChat(api_key=EMERGENT_LLM_KEY, session_id=str(uuid.uuid4()),
                       system_message=system_msg).with_model("gemini", "gemini-3-flash-preview")
        response = await chat.send_message(UserMessage(text=prompt))
        return {"suggestions": response, "context_type": req.context_type}
    except Exception as e:
        logger.error(f"AI error: {e}")
        raise HTTPException(500, f"AI error: {str(e)}")

# ── AUDIT LOGS ────────────────────────────────────────────────────────
@api_router.get("/audit-logs")
async def get_audit_logs(cu: dict = Depends(get_current_user)):
    logs = await db.audit_logs.find({}, {"_id": 0}).sort("timestamp", -1).to_list(200)
    return logs

# ── STARTUP ───────────────────────────────────────────────────────────
@app.on_event("startup")
async def startup():
    if not await db.users.find_one({"username": "admin"}):
        await db.users.insert_one({
            "id": str(uuid.uuid4()), "username": "admin",
            "password_hash": hash_pw("admin123"), "name": "Admin User", "role": "admin",
            "created_at": datetime.now(timezone.utc).isoformat()
        })
        logger.info("Default admin created: admin / admin123")
    if await db.partners.count_documents({}) == 0:
        now = datetime.now(timezone.utc).isoformat()
        await db.partners.insert_many([
            {"id": str(uuid.uuid4()), "name": "Partner A", "capital_contribution": 500000, "stake_percentage": 33.33, "contact": "", "created_at": now},
            {"id": str(uuid.uuid4()), "name": "Partner B", "capital_contribution": 500000, "stake_percentage": 33.33, "contact": "", "created_at": now},
            {"id": str(uuid.uuid4()), "name": "You (Owner)", "capital_contribution": 500000, "stake_percentage": 33.34, "contact": "", "created_at": now},
        ])

app.include_router(api_router)
app.add_middleware(CORSMiddleware, allow_credentials=True,
                   allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
                   allow_methods=["*"], allow_headers=["*"])

@app.on_event("shutdown")
async def shutdown(): client.close()
