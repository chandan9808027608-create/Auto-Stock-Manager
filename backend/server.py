from fastapi import FastAPI, APIRouter, HTTPException, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from passlib.context import CryptContext
from typing import Optional
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

# ── Helpers ──────────────────────────────────────────────────────────
def hash_pw(pw: str) -> str: return pwd_context.hash(pw)
def verify_pw(pw: str, hashed: str) -> bool: return pwd_context.verify(pw, hashed)

def create_token(user_id: str, username: str) -> str:
    return jwt.encode(
        {"user_id": user_id, "username": username, "exp": datetime.now(timezone.utc) + timedelta(days=7)},
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
        if 'T' in str(purchase_date_str):
            d = datetime.fromisoformat(str(purchase_date_str).replace('Z', '+00:00'))
        else:
            d = datetime.strptime(str(purchase_date_str), '%Y-%m-%d').replace(tzinfo=timezone.utc)
        days = (datetime.now(timezone.utc) - d).days
    except:
        days = 0
    if days <= 30:   return {"days": days, "category": "fresh",  "label": "Fresh Stock"}
    elif days <= 45: return {"days": days, "category": "normal", "label": "Normal"}
    elif days <= 60: return {"days": days, "category": "slow",   "label": "Slow Moving"}
    else:            return {"days": days, "category": "dead",   "label": "Dead Stock Alert"}

# ── Models ────────────────────────────────────────────────────────────
class LoginRequest(BaseModel):
    username: str
    password: str

class VehicleCreate(BaseModel):
    brand: str
    model: str
    year: int
    engine_cc: int
    fuel_type: str = "Petrol"
    ownership_number: int = 1
    purchase_price: float
    purchase_date: str
    purchase_source: str
    purchase_from: Optional[str] = None
    condition: str = "Good"
    color: Optional[str] = None
    registration_number: Optional[str] = None
    selling_price: Optional[float] = None
    notes: Optional[str] = None
    status: str = "available"
    bluebook_status: str = "pending"
    insurance_status: str = "pending"
    tax_clearance_status: str = "pending"
    transfer_status: str = "pending"

class VehicleUpdate(BaseModel):
    brand: Optional[str] = None
    model: Optional[str] = None
    year: Optional[int] = None
    engine_cc: Optional[int] = None
    fuel_type: Optional[str] = None
    ownership_number: Optional[int] = None
    purchase_price: Optional[float] = None
    purchase_date: Optional[str] = None
    purchase_source: Optional[str] = None
    purchase_from: Optional[str] = None
    condition: Optional[str] = None
    color: Optional[str] = None
    registration_number: Optional[str] = None
    selling_price: Optional[float] = None
    notes: Optional[str] = None
    status: Optional[str] = None
    sold_date: Optional[str] = None
    customer_id: Optional[str] = None
    bluebook_status: Optional[str] = None
    insurance_status: Optional[str] = None
    tax_clearance_status: Optional[str] = None
    transfer_status: Optional[str] = None

class ExpenseCreate(BaseModel):
    vehicle_id: str
    category: str
    amount: float
    description: Optional[str] = None
    date: Optional[str] = None

class JobCardCreate(BaseModel):
    vehicle_id: str
    work_description: str
    mechanic_id: Optional[str] = None
    mechanic_name: str
    estimated_cost: float
    notes: Optional[str] = None

class JobCardUpdate(BaseModel):
    work_description: Optional[str] = None
    mechanic_name: Optional[str] = None
    estimated_cost: Optional[float] = None
    actual_cost: Optional[float] = None
    status: Optional[str] = None
    notes: Optional[str] = None

class CustomerCreate(BaseModel):
    name: str
    contact_number: str
    address: Optional[str] = None
    notes: Optional[str] = None

class TeamMemberCreate(BaseModel):
    name: str
    role: str
    contact: Optional[str] = None
    specialization: Optional[str] = None
    commission_rate: Optional[float] = None
    joining_date: Optional[str] = None

class PartnerCreate(BaseModel):
    name: str
    capital_contribution: float
    stake_percentage: float
    contact: Optional[str] = None

class AIRequest(BaseModel):
    context_type: str
    additional_context: Optional[str] = None

class ChangePasswordRequest(BaseModel):
    current_password: str
    new_password: str

# ── AUTH ──────────────────────────────────────────────────────────────
@api_router.post("/auth/login")
async def login(req: LoginRequest):
    user = await db.users.find_one({"username": req.username})
    if not user or not verify_pw(req.password, user["password_hash"]):
        raise HTTPException(401, "Invalid credentials")
    token = create_token(user.get("id", ""), user["username"])
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

# ── VEHICLES ──────────────────────────────────────────────────────────
async def enrich_vehicle(v: dict) -> dict:
    v["aging"] = stock_aging(v.get("purchase_date", ""))
    exps = await db.expenses.find({"vehicle_id": v["id"]}, {"_id": 0}).to_list(200)
    v["total_expenses"] = sum(e["amount"] for e in exps)
    v["total_investment"] = v.get("purchase_price", 0) + v["total_expenses"]
    sp = v.get("selling_price") or 0
    if sp > 0:
        v["expected_profit"] = sp - v["total_investment"]
        v["profit_margin"] = round((v["expected_profit"] / sp) * 100, 2)
        v["low_margin"] = v["profit_margin"] < 8
    else:
        v["expected_profit"] = None
        v["profit_margin"] = None
        v["low_margin"] = False
    return v

@api_router.get("/vehicles")
async def get_vehicles(status: Optional[str] = None, brand: Optional[str] = None, cu: dict = Depends(get_current_user)):
    query = {}
    if status: query["status"] = status
    if brand: query["brand"] = brand
    vehicles = await db.vehicles.find(query, {"_id": 0}).to_list(1000)
    return [await enrich_vehicle(v) for v in vehicles]

@api_router.post("/vehicles")
async def create_vehicle(vehicle: VehicleCreate, cu: dict = Depends(get_current_user)):
    v = vehicle.model_dump()
    v["id"] = str(uuid.uuid4())
    v["created_at"] = datetime.now(timezone.utc).isoformat()
    v["updated_at"] = datetime.now(timezone.utc).isoformat()
    v["sold_date"] = None
    v["customer_id"] = None
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
    upd = {k: v for k, v in vehicle.model_dump().items() if v is not None}
    upd["updated_at"] = datetime.now(timezone.utc).isoformat()
    r = await db.vehicles.update_one({"id": vid}, {"$set": upd})
    if r.matched_count == 0: raise HTTPException(404, "Vehicle not found")
    return await db.vehicles.find_one({"id": vid}, {"_id": 0})

@api_router.delete("/vehicles/{vid}")
async def delete_vehicle(vid: str, cu: dict = Depends(get_current_user)):
    r = await db.vehicles.delete_one({"id": vid})
    if r.deleted_count == 0: raise HTTPException(404, "Vehicle not found")
    await db.expenses.delete_many({"vehicle_id": vid})
    await db.job_cards.delete_many({"vehicle_id": vid})
    return {"message": "Deleted"}

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
    if status: q["status"] = status
    if vehicle_id: q["vehicle_id"] = vehicle_id
    return await db.job_cards.find(q, {"_id": 0}).to_list(1000)

@api_router.post("/jobs")
async def create_job(job: JobCardCreate, cu: dict = Depends(get_current_user)):
    count = await db.job_cards.count_documents({})
    jc = job.model_dump()
    jc["id"] = str(uuid.uuid4())
    jc["job_number"] = f"JC-{datetime.now(timezone.utc).year}-{str(count + 1).zfill(3)}"
    jc["status"] = "pending"
    jc["actual_cost"] = None
    jc["created_at"] = datetime.now(timezone.utc).isoformat()
    jc["completed_at"] = None
    jc["created_by"] = cu["username"]
    v = await db.vehicles.find_one({"id": job.vehicle_id}, {"_id": 0})
    if v:
        jc["vehicle_brand"] = v.get("brand")
        jc["vehicle_model"] = v.get("model")
        jc["vehicle_year"] = v.get("year")
        jc["registration_number"] = v.get("registration_number")
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
    customers = await db.customers.find({}, {"_id": 0}).to_list(1000)
    for c in customers:
        cnt = await db.vehicles.count_documents({"customer_id": c["id"]})
        c["purchase_count"] = cnt
        c["is_repeat_customer"] = cnt > 1
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
    if not c: raise HTTPException(404, "Customer not found")
    purchases = await db.vehicles.find({"customer_id": cid}, {"_id": 0}).to_list(100)
    c["purchases"] = purchases
    c["purchase_count"] = len(purchases)
    c["is_repeat_customer"] = len(purchases) > 1
    return c

@api_router.put("/customers/{cid}")
async def update_customer(cid: str, cust: CustomerCreate, cu: dict = Depends(get_current_user)):
    r = await db.customers.update_one({"id": cid}, {"$set": cust.model_dump()})
    if r.matched_count == 0: raise HTTPException(404, "Customer not found")
    return await db.customers.find_one({"id": cid}, {"_id": 0})

@api_router.delete("/customers/{cid}")
async def delete_customer(cid: str, cu: dict = Depends(get_current_user)):
    r = await db.customers.delete_one({"id": cid})
    if r.deleted_count == 0: raise HTTPException(404, "Customer not found")
    return {"message": "Deleted"}

# ── TEAM ──────────────────────────────────────────────────────────────
@api_router.get("/team")
async def get_team(cu: dict = Depends(get_current_user)):
    members = await db.team_members.find({}, {"_id": 0}).to_list(100)
    for m in members:
        if m.get("role") == "mechanic":
            m["total_jobs"] = await db.job_cards.count_documents({"mechanic_id": m["id"]})
            m["completed_jobs"] = await db.job_cards.count_documents({"mechanic_id": m["id"], "status": "completed"})
    return members

@api_router.post("/team")
async def create_team_member(member: TeamMemberCreate, cu: dict = Depends(get_current_user)):
    m = member.model_dump()
    m["id"] = str(uuid.uuid4())
    m["is_active"] = True
    m["joining_date"] = m.get("joining_date") or datetime.now(timezone.utc).date().isoformat()
    m["created_at"] = datetime.now(timezone.utc).isoformat()
    await db.team_members.insert_one(m)
    m.pop("_id", None)
    return m

@api_router.put("/team/{mid}")
async def update_team_member(mid: str, member: TeamMemberCreate, cu: dict = Depends(get_current_user)):
    r = await db.team_members.update_one({"id": mid}, {"$set": member.model_dump()})
    if r.matched_count == 0: raise HTTPException(404, "Member not found")
    return await db.team_members.find_one({"id": mid}, {"_id": 0})

@api_router.delete("/team/{mid}")
async def delete_team_member(mid: str, cu: dict = Depends(get_current_user)):
    r = await db.team_members.delete_one({"id": mid})
    if r.deleted_count == 0: raise HTTPException(404, "Member not found")
    return {"message": "Deleted"}

# ── PARTNERS ──────────────────────────────────────────────────────────
@api_router.get("/partners")
async def get_partners(cu: dict = Depends(get_current_user)):
    return await db.partners.find({}, {"_id": 0}).to_list(100)

@api_router.post("/partners")
async def create_partner(partner: PartnerCreate, cu: dict = Depends(get_current_user)):
    p = partner.model_dump()
    p["id"] = str(uuid.uuid4())
    p["created_at"] = datetime.now(timezone.utc).isoformat()
    await db.partners.insert_one(p)
    p.pop("_id", None)
    return p

@api_router.put("/partners/{pid}")
async def update_partner(pid: str, partner: PartnerCreate, cu: dict = Depends(get_current_user)):
    r = await db.partners.update_one({"id": pid}, {"$set": partner.model_dump()})
    if r.matched_count == 0: raise HTTPException(404, "Partner not found")
    return await db.partners.find_one({"id": pid}, {"_id": 0})

@api_router.delete("/partners/{pid}")
async def delete_partner(pid: str, cu: dict = Depends(get_current_user)):
    r = await db.partners.delete_one({"id": pid})
    if r.deleted_count == 0: raise HTTPException(404, "Partner not found")
    return {"message": "Deleted"}

# ── REPORTS ───────────────────────────────────────────────────────────
@api_router.get("/reports/dashboard")
async def dashboard_stats(cu: dict = Depends(get_current_user)):
    total = await db.vehicles.count_documents({})
    available = await db.vehicles.count_documents({"status": "available"})
    sold = await db.vehicles.count_documents({"status": "sold"})
    reserved = await db.vehicles.count_documents({"status": "reserved"})

    avail_vehicles = await db.vehicles.find({"status": "available"}, {"_id": 0}).to_list(1000)
    locked_capital, dead_cnt, slow_cnt, normal_cnt, fresh_cnt = 0, 0, 0, 0, 0
    for v in avail_vehicles:
        exps = await db.expenses.find({"vehicle_id": v["id"]}, {"_id": 0}).to_list(200)
        locked_capital += v.get("purchase_price", 0) + sum(e["amount"] for e in exps)
        ag = stock_aging(v.get("purchase_date", ""))
        if ag["category"] == "dead": dead_cnt += 1
        elif ag["category"] == "slow": slow_cnt += 1
        elif ag["category"] == "normal": normal_cnt += 1
        else: fresh_cnt += 1

    sold_vehicles = await db.vehicles.find({"status": "sold"}, {"_id": 0}).to_list(1000)
    total_profit = 0
    for v in sold_vehicles:
        exps = await db.expenses.find({"vehicle_id": v["id"]}, {"_id": 0}).to_list(200)
        inv = v.get("purchase_price", 0) + sum(e["amount"] for e in exps)
        total_profit += (v.get("selling_price") or 0) - inv

    return {
        "total_vehicles": total, "available": available, "sold": sold, "reserved": reserved,
        "locked_capital": locked_capital, "total_realized_profit": total_profit,
        "dead_stock_count": dead_cnt, "slow_moving_count": slow_cnt,
        "normal_count": normal_cnt, "fresh_count": fresh_cnt,
        "pending_jobs": await db.job_cards.count_documents({"status": "pending"}),
        "in_progress_jobs": await db.job_cards.count_documents({"status": "in_progress"}),
        "total_customers": await db.customers.count_documents({})
    }

@api_router.get("/reports/inventory")
async def inventory_report(cu: dict = Depends(get_current_user)):
    vehicles = await db.vehicles.find({}, {"_id": 0}).to_list(1000)
    report = {"by_brand": {}, "by_status": {"available": 0, "sold": 0, "reserved": 0},
              "by_aging": {"fresh": 0, "normal": 0, "slow": 0, "dead": 0},
              "by_source": {}, "slow_moving": [], "dead_stock": [], "low_margin": []}
    for v in vehicles:
        brand = v.get("brand", "Unknown")
        report["by_brand"][brand] = report["by_brand"].get(brand, 0) + 1
        st = v.get("status", "available")
        if st in report["by_status"]: report["by_status"][st] += 1
        src = v.get("purchase_source", "Unknown")
        if src not in report["by_source"]: report["by_source"][src] = {"count": 0}
        report["by_source"][src]["count"] += 1
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
        inv = v.get("purchase_price", 0) + sum(e["amount"] for e in exps)
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

# ── AI ────────────────────────────────────────────────────────────────
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
                slow_list.append({"brand": v.get("brand"), "model": v.get("model"), "year": v.get("year"),
                                   "days": ag["days"], "category": ag["category"],
                                   "purchase_price": v.get("purchase_price"), "selling_price": v.get("selling_price"),
                                   "total_investment": v.get("purchase_price", 0) + sum(e["amount"] for e in exps)})
        ctx = {"available_count": len(vehicles), "slow_and_dead_stock": slow_list[:6]}
    elif req.context_type == "finance":
        avail = await db.vehicles.find({"status": "available"}, {"_id": 0}).to_list(500)
        locked = sum(v.get("purchase_price", 0) for v in avail)
        ctx = {"locked_capital_NPR": locked, "total_vehicles": await db.vehicles.count_documents({}),
               "sold_vehicles": await db.vehicles.count_documents({"status": "sold"}),
               "available_vehicles": len(avail)}
    elif req.context_type == "customer":
        custs = await db.customers.find({}, {"_id": 0}).to_list(20)
        ctx = {"total_customers": len(custs), "customers_sample": [{"name": c["name"], "contact": c.get("contact_number")} for c in custs[:5]]}
    elif req.context_type == "festival":
        avail = await db.vehicles.find({"status": "available"}, {"_id": 0}).to_list(50)
        ctx = {"available_stock": len(avail), "vehicles": [{"brand": v.get("brand"), "model": v.get("model"), "price": v.get("selling_price")} for v in avail[:10]]}
    if req.additional_context:
        ctx["user_note"] = req.additional_context

    system_msg = """You are an expert business advisor for Hamro G n G Auto, a motorcycle and scooter resale shop in Kathmandu, Nepal.
Give 4-5 specific, actionable business recommendations. Use NPR (Nepali Rupees) for all monetary values.
Be direct and practical. Consider local market conditions, Nepali festivals, and typical profit margins.
Format as a numbered list with clear headings for each recommendation."""

    prompt = f"Context type: {req.context_type}\nBusiness data: {json.dumps(ctx, indent=2)}\n\nProvide specific business recommendations:"
    try:
        chat = LlmChat(api_key=EMERGENT_LLM_KEY, session_id=str(uuid.uuid4()),
                       system_message=system_msg).with_model("gemini", "gemini-3-flash-preview")
        response = await chat.send_message(UserMessage(text=prompt))
        return {"suggestions": response, "context_type": req.context_type}
    except Exception as e:
        logger.error(f"AI error: {e}")
        raise HTTPException(500, f"AI error: {str(e)}")

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
        logger.info("Default partners created")

app.include_router(api_router)
app.add_middleware(CORSMiddleware, allow_credentials=True,
                   allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
                   allow_methods=["*"], allow_headers=["*"])

@app.on_event("shutdown")
async def shutdown(): client.close()
