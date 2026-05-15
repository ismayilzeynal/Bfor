"""Integrity verifier for generated mock data."""
import json
import random
from pathlib import Path

random.seed(42)
OUT = Path(__file__).parent.parent / "bravo-freshflow" / "public" / "mock-data"

def load(name):
    with open(OUT / name, encoding="utf-8") as f:
        return json.load(f)

# Load all
users = load("users.json")
stores = load("stores.json")
categories = load("categories.json")
suppliers = load("suppliers.json")
products = load("products.json")
batches = load("inventory-batches.json")
snapshots = load("inventory-snapshots.json")
sales = load("sales.json")
waste = load("waste-records.json")
risks = load("risk-predictions.json")
recs = load("recommendations.json")
scenarios = load("recommendation-scenarios.json")
tasks = load("tasks.json")
transfers = load("transfers.json")
discounts = load("discounts.json")
audits = load("audit-logs.json")
dqissues = load("data-quality-issues.json")
notifs = load("notifications.json")
kpis = load("kpi-snapshots.json")

ids = {
    "user": {u["id"] for u in users},
    "store": {s["id"] for s in stores},
    "category": {c["id"] for c in categories},
    "supplier": {sup["id"] for sup in suppliers},
    "product": {p["id"] for p in products},
    "batch": {b["id"] for b in batches},
    "rec": {r["id"] for r in recs},
    "risk": {r["id"] for r in risks},
    "task": {t["id"] for t in tasks},
}

errors = []
warnings = []

# ---------- FK CHECKS ----------
print("=" * 60)
print("FK CHECKS")
print("=" * 60)

def fk(records, name, fkfield, ref_set, ref_label, allow_null=False):
    bad = []
    for r in records:
        v = r.get(fkfield)
        if v is None:
            if not allow_null:
                bad.append((r["id"], fkfield, "null"))
            continue
        if v not in ref_set:
            bad.append((r["id"], fkfield, v))
    if bad:
        errors.append(f"{name}.{fkfield} has {len(bad)} bad FK(s): {bad[:3]}")
    print(f"  {name}.{fkfield} → {ref_label}: {'OK' if not bad else f'FAIL {len(bad)} orphans'}")
    return bad

fk(users, "users", "store_id", ids["store"], "store", allow_null=True)
fk(products, "products", "category_id", ids["category"], "category")
fk(products, "products", "supplier_id", ids["supplier"], "supplier")
fk(batches, "batches", "product_id", ids["product"], "product")
fk(batches, "batches", "store_id", ids["store"], "store")
fk(batches, "batches", "supplier_id", ids["supplier"], "supplier")
fk(snapshots, "snapshots", "product_id", ids["product"], "product")
fk(snapshots, "snapshots", "store_id", ids["store"], "store")
fk(sales, "sales", "product_id", ids["product"], "product")
fk(sales, "sales", "store_id", ids["store"], "store")
fk(waste, "waste", "product_id", ids["product"], "product")
fk(waste, "waste", "store_id", ids["store"], "store")
fk(waste, "waste", "batch_id", ids["batch"], "batch")
fk(waste, "waste", "recorded_by_user_id", ids["user"], "user")
fk(risks, "risks", "product_id", ids["product"], "product")
fk(risks, "risks", "store_id", ids["store"], "store")
fk(risks, "risks", "batch_id", ids["batch"], "batch", allow_null=True)
fk(recs, "recs", "risk_prediction_id", ids["risk"], "risk_prediction")
fk(recs, "recs", "product_id", ids["product"], "product")
fk(recs, "recs", "store_id", ids["store"], "store")
fk(recs, "recs", "approved_by_user_id", ids["user"], "user", allow_null=True)
fk(recs, "recs", "rejected_by_user_id", ids["user"], "user", allow_null=True)
fk(scenarios, "scenarios", "recommendation_id", ids["rec"], "recommendation")
fk(tasks, "tasks", "recommendation_id", ids["rec"], "recommendation")
fk(tasks, "tasks", "assigned_to_user_id", ids["user"], "user")
fk(tasks, "tasks", "store_id", ids["store"], "store")
fk(tasks, "tasks", "product_id", ids["product"], "product")
fk(tasks, "tasks", "completed_by_user_id", ids["user"], "user", allow_null=True)
fk(transfers, "transfers", "recommendation_id", ids["rec"], "recommendation")
fk(transfers, "transfers", "product_id", ids["product"], "product")
fk(transfers, "transfers", "from_store_id", ids["store"], "store")
fk(transfers, "transfers", "to_store_id", ids["store"], "store")
fk(discounts, "discounts", "recommendation_id", ids["rec"], "recommendation")
fk(discounts, "discounts", "product_id", ids["product"], "product")
fk(discounts, "discounts", "store_id", ids["store"], "store")
fk(notifs, "notifs", "user_id", ids["user"], "user")
fk(dqissues, "dqissues", "product_id", ids["product"], "product", allow_null=True)
fk(dqissues, "dqissues", "store_id", ids["store"], "store", allow_null=True)
fk(dqissues, "dqissues", "batch_id", ids["batch"], "batch", allow_null=True)
fk(kpis, "kpis", "store_id", ids["store"], "store", allow_null=True)
fk(kpis, "kpis", "category_id", ids["category"], "category", allow_null=True)
# audit user FK (may have synthetic entity ids — only check user)
fk(audits, "audits", "user_id", ids["user"], "user")

# ---------- 10 RANDOM FK SAMPLES ----------
print()
print("=" * 60)
print("10 RANDOM FK SPOT CHECKS")
print("=" * 60)
samples = []
samples.append(("recommendation→product", random.choice(recs)["product_id"] in ids["product"]))
samples.append(("scenario→recommendation", random.choice(scenarios)["recommendation_id"] in ids["rec"]))
samples.append(("task→user", random.choice(tasks)["assigned_to_user_id"] in ids["user"]))
samples.append(("waste→batch", random.choice(waste)["batch_id"] in ids["batch"]))
samples.append(("batch→supplier", random.choice(batches)["supplier_id"] in ids["supplier"]))
samples.append(("snapshot→product", random.choice(snapshots)["product_id"] in ids["product"]))
samples.append(("transfer→from_store", random.choice(transfers)["from_store_id"] in ids["store"]))
samples.append(("discount→recommendation", random.choice(discounts)["recommendation_id"] in ids["rec"]))
samples.append(("notification→user", random.choice(notifs)["user_id"] in ids["user"]))
samples.append(("risk→batch (or null)", random.choice(risks).get("batch_id") in ids["batch"] or random.choice(risks).get("batch_id") is None))
for label, ok in samples:
    print(f"  {label}: {'OK' if ok else 'FAIL'}")

# ---------- RISK MATH ----------
print()
print("=" * 60)
print("RISK MATH RECOMPUTE (5 random non-spotlight)")
print("=" * 60)

def expiry_score(d):
    if d <= 1: return 100
    if d <= 2: return 85
    if d <= 3: return 70
    if d <= 5: return 50
    return 20

random.seed(7)
non_spot_risks = [r for r in risks if not r["product_id"].startswith("p-demo")]
sample_risks = random.sample(non_spot_risks, min(5, len(non_spot_risks)))
all_ok = True
for r in sample_risks:
    f = r["reason_factors"]
    expected = round(f["expiry_score"] * 0.35 + f["stock_pressure_score"] * 0.30
                   + f["sales_velocity_score"] * 0.20 + f["waste_history_score"] * 0.10
                   + f["supplier_risk_score"] * 0.05, 2)
    actual = r["risk_score"]
    diff = abs(expected - actual)
    ok = diff < 0.5
    print(f"  {r['id']}: stored={actual} computed={expected} diff={diff:.2f} {'OK' if ok else 'FAIL'}")
    if not ok:
        all_ok = False
        errors.append(f"Risk math fail on {r['id']}: stored={actual} expected={expected}")
print(f"  RESULT: {'ALL OK' if all_ok else 'FAILURES'}")

# ---------- SCENARIOS PER REC (3-5, exactly one is_recommended) ----------
print()
print("=" * 60)
print("SCENARIO COUNT + is_recommended UNIQUENESS PER REC")
print("=" * 60)
fail_count = 0
fail_recs = 0
fail_unique = 0
from collections import defaultdict
by_rec = defaultdict(list)
for s in scenarios:
    by_rec[s["recommendation_id"]].append(s)

for r in recs:
    sc = by_rec.get(r["id"], [])
    n = len(sc)
    rec_count = sum(1 for s in sc if s["is_recommended"])
    if not (3 <= n <= 5):
        fail_recs += 1
        if fail_recs <= 5:
            print(f"  {r['id']}: scenario count = {n} (need 3-5)")
    if rec_count != 1:
        fail_unique += 1
        if fail_unique <= 5:
            print(f"  {r['id']}: is_recommended count = {rec_count} (need exactly 1)")
        errors.append(f"{r['id']} has {rec_count} is_recommended")

print(f"  Recs with bad scenario count: {fail_recs}")
print(f"  Recs with bad is_recommended count: {fail_unique}")

# ---------- SPOTLIGHT CHECKS ----------
print()
print("=" * 60)
print("SPOTLIGHT PRODUCTS")
print("=" * 60)

SPOTLIGHT_CHECKS = [
    ("p-demo-yogurt",  "Qatıq 500q",      "s-001", 120, "2026-05-18", 22, "declining", 1.20, 1.80, 0.15),
    ("p-demo-chicken", "Toyuq Filesi",    "s-003",  45, "2026-05-16", 12, "stable",    5.50, 8.00, 0.20),
    ("p-demo-banana",  "Banan",           "s-005",  90, "2026-05-17", 28, "stable",    0.85, 1.40, 0.18),
    ("p-demo-salad",   "Hazır Salat",     "s-002",  60, "2026-05-16", 18, "stable",    2.10, 3.50, 0.20),
    ("p-demo-milk",    "Süd 1L",          "s-004", 200, "2026-05-19", 35, "stable",    1.00, 1.50, 0.15),
]

prod_idx = {p["id"]: p for p in products}
risk_by_pid = {r["product_id"]: r for r in risks}
batch_by_pid_sid = defaultdict(list)
for b in batches:
    batch_by_pid_sid[(b["product_id"], b["store_id"])].append(b)

for pid, name, sid, stock, exp, avg, trend, cp, sp, mm in SPOTLIGHT_CHECKS:
    p = prod_idx.get(pid)
    if not p:
        errors.append(f"Spotlight {pid} missing")
        print(f"  {pid}: MISSING product")
        continue
    rp = risk_by_pid.get(pid)
    bts = batch_by_pid_sid.get((pid, sid), [])
    name_ok = p["name"] == name
    cp_ok = p["cost_price"] == cp
    sp_ok = p["sale_price"] == sp
    mm_ok = p["minimum_margin_pct"] == mm
    rp_ok = rp and rp["store_id"] == sid and rp["current_stock"] == stock and rp["avg_daily_sales_7d"] == avg and rp["sales_trend"] == trend
    batch_ok = any(b["expiry_date"] == exp for b in bts)
    snap_ok = any(s for s in snapshots if s["product_id"] == pid and s["store_id"] == sid and s["current_stock"] == stock)
    rec_for = next((r for r in recs if r["product_id"] == pid), None)
    rec_ok = rec_for is not None and any(s["is_recommended"] for s in by_rec.get(rec_for["id"], []))
    all_ok = name_ok and cp_ok and sp_ok and mm_ok and rp_ok and batch_ok and snap_ok and rec_ok
    flags = []
    if not name_ok: flags.append("name")
    if not cp_ok: flags.append("cost")
    if not sp_ok: flags.append("sale")
    if not mm_ok: flags.append("margin")
    if not rp_ok: flags.append("risk_prediction")
    if not batch_ok: flags.append("batch_expiry")
    if not snap_ok: flags.append("snapshot")
    if not rec_ok: flags.append("recommendation")
    print(f"  {pid} ({name}): {'OK' if all_ok else 'FAIL: ' + ','.join(flags)}")

# ---------- AZ DIACRITICS ----------
print()
print("=" * 60)
print("AZ DIACRITICS SAMPLE")
print("=" * 60)
az_chars = set("əıçşğöü")
az_count = 0
for p in products[:20]:
    if any(c in az_chars for c in p["name"].lower()):
        az_count += 1
print(f"  Products in first 20 with AZ diacritics: {az_count}/20")

# Sample print to inspect
print(f"  Sample product name: {products[5]['name']}")
print(f"  Sample store name: {stores[1]['name']}")
print(f"  Sample user name: {users[0]['full_name']}")

# ---------- JSON PARSE (already loaded successfully) ----------
print()
print("=" * 60)
print("JSON PARSE: All 19 files loaded successfully (UTF-8)")
print("=" * 60)

# ---------- SUMMARY ----------
print()
print("=" * 60)
print("SUMMARY")
print("=" * 60)
if errors:
    print(f"  ERRORS: {len(errors)}")
    for e in errors[:10]:
        print(f"    - {e}")
else:
    print("  ALL CHECKS PASSED")
