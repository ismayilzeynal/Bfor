"""Bravo FreshFlow AI - synthetic mock data generator.
Generates 19 JSON files into ../bravo-freshflow/public/mock-data/
matching schemas in BRAVO_FRESHFLOW_SPEC.md sections 7, 8, 11.
TODAY = 2026-05-15. Deterministic via fixed seed.
"""
import json
import os
import random
from datetime import datetime, timedelta, date
from pathlib import Path

random.seed(20260515)

OUT = Path(__file__).parent.parent / "bravo-freshflow" / "public" / "mock-data"
OUT.mkdir(parents=True, exist_ok=True)

TODAY = date(2026, 5, 15)
NOW = datetime(2026, 5, 15, 10, 30, 0)

def iso_d(d):
    return d.strftime("%Y-%m-%d")

def iso_dt(dt):
    return dt.strftime("%Y-%m-%dT%H:%M:%SZ")

def write_json(name, data):
    path = OUT / name
    with open(path, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
    print(f"  {name}: {len(data)} records")

# ---------- RISK FORMULA (section 4) ----------
def expiry_score(days):
    if days <= 1: return 100
    if days <= 2: return 85
    if days <= 3: return 70
    if days <= 5: return 50
    return 20

def stock_pressure_score(unsold_ratio):
    if unsold_ratio <= 0: return 0
    if unsold_ratio <= 0.20: return 30
    if unsold_ratio <= 0.40: return 55
    if unsold_ratio <= 0.60: return 75
    return 95

SALES_VELOCITY_SCORE = {"rising": 20, "stable": 40, "declining": 75, "very_weak": 90}
WASTE_HISTORY_SCORE = {"none": 10, "low": 35, "medium": 60, "high": 85}

def compute_risk_score(es, sps, svs, whs, srs):
    return round(es*0.35 + sps*0.30 + svs*0.20 + whs*0.10 + srs*0.05, 2)

def risk_level_from(score):
    if score <= 30: return "low"
    if score <= 60: return "medium"
    if score <= 80: return "high"
    return "critical"

# ---------- WHAT-IF FORMULAS (section 5) ----------
DISCOUNT_UPLIFT = {0.10: 1.3, 0.15: 1.6, 0.20: 1.9, 0.25: 2.1, 0.30: 2.4, 0.40: 2.8, 0.50: 3.2}

def scenario_no_action(stock, sales, days, sale_price, cost_price):
    expected_sold = sales * days
    expected_unsold = max(0, stock - expected_sold)
    expected_loss = expected_unsold * cost_price
    recovered = expected_sold * sale_price
    return {
        "expected_sold": round(expected_sold, 2),
        "recovered_value": round(recovered, 2),
        "discount_cost": 0.0,
        "transfer_cost": 0.0,
        "operational_cost": 0.0,
        "net_saved": 0.0,
        "expected_loss": round(expected_loss, 2),
    }

def scenario_discount(stock, sales, days, sale_price, cost_price, dpct, min_margin):
    uplift = DISCOUNT_UPLIFT.get(round(dpct, 2), 1.0)
    eff_v = sales * uplift
    expected_sold = min(stock, eff_v * days)
    discounted = sale_price * (1 - dpct)
    gross = expected_sold * discounted
    dcost = expected_sold * sale_price * dpct
    op = 2.0 * (expected_sold / 100.0)
    baseline = sales * days * sale_price
    net = (gross - dcost - op) - baseline
    margin_breached = ((discounted - cost_price) / discounted) < min_margin if discounted > 0 else True
    return {
        "expected_sold": round(expected_sold, 2),
        "recovered_value": round(gross, 2),
        "discount_cost": round(dcost, 2),
        "transfer_cost": 0.0,
        "operational_cost": round(op, 2),
        "net_saved": round(net, 2),
        "margin_breached": margin_breached,
        "discounted_price": round(discounted, 2),
    }

def scenario_transfer(stock, sales, days, sale_price, qty, target_v):
    expected_sold_target = min(qty, target_v * days)
    gross = expected_sold_target * sale_price
    tcost = 8.0 + 0.05 * qty
    op = 3.0
    baseline_local = min(qty, sales * days) * sale_price
    net = (gross - tcost - op) - baseline_local
    return {
        "expected_sold": round(expected_sold_target, 2),
        "recovered_value": round(gross, 2),
        "discount_cost": 0.0,
        "transfer_cost": round(tcost, 2),
        "operational_cost": round(op, 2),
        "net_saved": round(net, 2),
    }

def scenario_bundle(stock, sales, days, sale_price, bdpct):
    uplift = 1.4
    expected_sold = min(stock, sales * uplift * days)
    discounted = sale_price * (1 - bdpct)
    gross = expected_sold * discounted
    dcost = expected_sold * sale_price * bdpct * 0.5
    op = 1.5
    baseline = sales * days * sale_price
    net = (gross - dcost - op) - baseline
    return {
        "expected_sold": round(expected_sold, 2),
        "recovered_value": round(gross, 2),
        "discount_cost": round(dcost, 2),
        "transfer_cost": 0.0,
        "operational_cost": round(op, 2),
        "net_saved": round(net, 2),
    }

def scenario_shelf(stock, sales, days, sale_price):
    uplift = 1.2
    expected_sold = min(stock, sales * uplift * days)
    gross = expected_sold * sale_price
    op = 1.0
    baseline = sales * days * sale_price
    net = (gross - op) - baseline
    return {
        "expected_sold": round(expected_sold, 2),
        "recovered_value": round(gross, 2),
        "discount_cost": 0.0,
        "transfer_cost": 0.0,
        "operational_cost": round(op, 2),
        "net_saved": round(net, 2),
    }

def scenario_combined(stock, sales, days, sale_price, cost_price, dpct, min_margin, qty, target_v):
    transfer_part = scenario_transfer(stock, sales, days, sale_price, qty, target_v)
    remaining = max(0, stock - qty)
    uplift = DISCOUNT_UPLIFT.get(round(dpct, 2), 1.0)
    eff_v = sales * uplift
    expected_sold_local = min(remaining, eff_v * days)
    discounted = sale_price * (1 - dpct)
    gross_local = expected_sold_local * discounted
    dcost_local = expected_sold_local * sale_price * dpct
    op_local = 2.0 * (expected_sold_local / 100.0)
    baseline_local = sales * days * sale_price * (remaining / max(stock, 1))
    net_local = (gross_local - dcost_local - op_local) - baseline_local
    return {
        "expected_sold": round(transfer_part["expected_sold"] + expected_sold_local, 2),
        "recovered_value": round(transfer_part["recovered_value"] + gross_local, 2),
        "discount_cost": round(dcost_local, 2),
        "transfer_cost": transfer_part["transfer_cost"],
        "operational_cost": round(transfer_part["operational_cost"] + op_local, 2),
        "net_saved": round(transfer_part["net_saved"] + net_local, 2),
    }

def confidence_score(data_conf, action_type):
    base_rates = {
        "discount": 88, "transfer": 78, "bundle": 75, "shelf_visibility": 82,
        "combined": 85, "no_action": 90, "monitor": 80, "stock_check": 90,
        "reorder_reduce": 78, "reorder_increase": 75, "supplier_review": 70,
        "return_to_supplier": 72, "campaign_add": 70,
    }
    hist = base_rates.get(action_type, 80)
    return round(0.6 * data_conf + 0.4 * hist, 2)

# ---------- STORES (section 8) ----------
STORES_SPEC = [
    ("s-001", "Bravo Nərimanov",  "BR-NRM", "Nərimanov rayonu, Atatürk pr. 12",       "Bakı",     40.4093, 49.8671, "supermarket", 950,  4200),
    ("s-002", "Bravo Gənclik",    "BR-GNC", "Gənclik metrosu, Mətbuat pr. 28",        "Bakı",     40.4022, 49.8493, "hypermarket", 2200, 7800),
    ("s-003", "Bravo 28 May",     "BR-28M", "28 May metrosu, Səməd Vurğun küç. 5",    "Bakı",     40.3795, 49.8451, "supermarket", 1100, 5600),
    ("s-004", "Bravo Elmlər",     "BR-ELM", "Elmlər Akademiyası, H.Cavid pr. 41",     "Bakı",     40.3753, 49.8104, "supermarket", 880,  3900),
    ("s-005", "Bravo Yasamal",    "BR-YSM", "Yasamal rayonu, Şərifzadə küç. 192",     "Bakı",     40.3892, 49.8146, "supermarket", 1050, 4500),
    ("s-006", "Bravo Xətai",      "BR-XTI", "Xətai rayonu, Babək pr. 87",             "Bakı",     40.3792, 49.9182, "express",     420,  2100),
    ("s-007", "Bravo Sumqayıt",   "BR-SMG", "Sumqayıt şəhəri, Süleyman Rüstəm 14",    "Sumqayıt", 40.5895, 49.6686, "hypermarket", 2400, 8100),
    ("s-008", "Bravo Əhmədli",    "BR-AHM", "Əhmədli, Telman Hacıyev küç. 24",        "Bakı",     40.4011, 49.9402, "express",     380,  1900),
]

stores = []
for sid, name, code, addr, region, lat, lng, stype, sqm, cust in STORES_SPEC:
    stores.append({
        "id": sid, "name": name, "code": code, "address": addr, "region": region,
        "latitude": lat, "longitude": lng, "store_type": stype, "size_sqm": sqm,
        "avg_daily_customers": cust, "is_active": True,
    })

# ---------- CATEGORIES (section 8) ----------
CATEGORIES_SPEC = [
    ("c-001", "Süd məhsulları",          None, 0.85, True,  "Milk"),
    ("c-002", "Ət və toyuq",             None, 0.90, True,  "Beef"),
    ("c-003", "Meyvə-tərəvəz",           None, 0.80, True,  "Apple"),
    ("c-004", "Çörək və un məmulatları", None, 0.65, True,  "Croissant"),
    ("c-005", "Hazır yeməklər",          None, 0.88, True,  "Salad"),
    ("c-006", "Dondurulmuş məhsullar",   None, 0.55, True,  "Snowflake"),
    ("c-007", "İçkilər",                 None, 0.30, False, "CupSoda"),
    ("c-008", "Qənnadı məhsulları",      None, 0.40, False, "Cookie"),
    ("c-009", "Tərəvəz konservləri",     None, 0.25, False, "Box"),
    ("c-010", "Quru ərzaq",              None, 0.20, False, "Wheat"),
]

categories = []
for cid, name, parent, rw, perish, icon in CATEGORIES_SPEC:
    categories.append({
        "id": cid, "name": name, "parent_category_id": parent,
        "risk_weight": rw, "is_perishable_category": perish, "icon": icon,
    })

# ---------- SUPPLIERS ----------
SUPPLIER_NAMES = [
    ("Atena Süd İstehsalı MMC",  "Aysel Hüseynova", "+994 50 234 11 22", "low"),
    ("Bakı Ət Kombinatı ASC",    "Rəşad Quliyev",   "+994 51 345 22 33", "medium"),
    ("Yaşıl Bağ Tərəvəzçilik",   "Nigar İsmayılova","+994 55 456 33 44", "low"),
    ("Bərəkət Çörək MMC",        "Elnur Cəfərov",   "+994 70 567 44 55", "low"),
    ("Aspara Hazır Yeməklər",    "Lalə Məmmədova",  "+994 77 678 55 66", "high"),
    ("Şimal Donduruculu Sex",    "Rüfət Əliyev",    "+994 50 789 66 77", "medium"),
    ("Coca-Cola Azerbaijan",     "Səbinə Rəhimli",  "+994 12 890 77 88", "low"),
    ("Şirvan Şərab Zavodu",      "Vüqar Nəsibli",   "+994 51 901 88 99", "low"),
    ("Şəkər Dünyası MMC",        "Türkan Hacıyeva", "+994 55 112 33 44", "medium"),
    ("Konserva Pro İstehsal",    "Rəhim Babayev",   "+994 70 223 44 55", "low"),
    ("Anadolu Ərzaq İdxalı",     "Kamran Süleymanov","+994 77 334 55 66", "medium"),
    ("Qarabağ Süd Sənayesi",     "Ülviyyə Kərimli", "+994 50 445 66 77", "high"),
    ("Quba Bağları MMC",         "Pərviz Mustafa",  "+994 51 556 77 88", "low"),
    ("Lənkəran Toyuq Fabriki",   "Cəmilə Orucova",  "+994 55 667 88 99", "medium"),
]

RISK_SCORE_BY_TIER = {"low": (15, 35), "medium": (40, 65), "high": (70, 90)}

suppliers = []
for i, (name, contact, phone, tier) in enumerate(SUPPLIER_NAMES, 1):
    sid = f"sup-{i:03d}"
    rs_min, rs_max = RISK_SCORE_BY_TIER[tier]
    risk = random.randint(rs_min, rs_max)
    suppliers.append({
        "id": sid,
        "name": name,
        "contact_person": contact,
        "phone": phone,
        "email": f"info@{name.split()[0].lower().replace('ə','e').replace('ş','s').replace('ç','c').replace('ğ','g').replace('ı','i').replace('ö','o').replace('ü','u')}.az",
        "return_policy": random.choice(["full", "partial", "partial", "none"]),
        "avg_delivery_days": random.choice([1, 1, 2, 2, 3, 4, 5]),
        "damage_rate_pct": round(random.uniform(0.5, 4.5), 2),
        "expiry_issue_rate_pct": round(random.uniform(0.3, 6.5), 2),
        "on_time_delivery_pct": round(random.uniform(82, 99), 2),
        "supplier_risk_score": risk,
        "is_active": True,
    })

# ---------- USERS (section 8) ----------
USERS_SPEC = [
    ("u-001", "Aysel Məmmədova",    "aysel.m@bravo.az",    "ceo",               None,    "Executive"),
    ("u-002", "Rəşad Hüseynov",     "rashad.h@bravo.az",   "coo",               None,    "Operations"),
    ("u-003", "Nigar Quliyeva",     "nigar.q@bravo.az",    "cfo",               None,    "Finance"),
    ("u-004", "Elnur Babayev",      "elnur.b@bravo.az",    "cio",               None,    "IT"),
    ("u-005", "Lalə İsmayılova",    "lale.i@bravo.az",     "category_manager",  None,    "Category Management"),
    ("u-006", "Rüfət Əliyev",       "rufat.a@bravo.az",    "purchase_manager",  None,    "Purchasing"),
    ("u-007", "Səbinə Cəfərova",    "sabina.c@bravo.az",   "logistics_manager", None,    "Logistics"),
    ("u-008", "Vüqar Rəhimov",      "vuqar.r@bravo.az",    "store_manager",     "s-001", "Store Operations"),
    ("u-009", "Türkan Nəsibova",    "turkan.n@bravo.az",   "store_manager",     "s-002", "Store Operations"),
    ("u-010", "Rəhim Süleymanov",   "rahim.s@bravo.az",    "supervisor",        "s-001", "Store Operations"),
    ("u-011", "Kamran Hacıyev",     "kamran.h@bravo.az",   "employee",          "s-001", "Store Operations"),
    ("u-012", "Ülviyyə Orucova",    "ulviyye.o@bravo.az",  "employee",          "s-002", "Store Operations"),
]

users = []
for uid, full_name, email, role, store_id, dept in USERS_SPEC:
    users.append({
        "id": uid, "full_name": full_name, "email": email, "role": role,
        "store_id": store_id, "department": dept,
        "avatar_url": f"https://api.dicebear.com/7.x/avataaars/svg?seed={uid}",
        "is_active": True,
    })

# ---------- PRODUCTS ----------
# Spotlight products first (section 8)
SPOTLIGHTS = {
    "p-demo-yogurt":  ("Qatıq 500q",       "c-001", 1.20, 1.80, 0.15, "pack",  "chilled", 7,  "DairyA"),
    "p-demo-chicken": ("Toyuq Filesi",     "c-002", 5.50, 8.00, 0.20, "kg",    "chilled", 4,  "MeatA"),
    "p-demo-banana":  ("Banan",            "c-003", 0.85, 1.40, 0.18, "kg",    "ambient", 6,  "FruitA"),
    "p-demo-salad":   ("Hazır Salat",      "c-005", 2.10, 3.50, 0.20, "pack",  "chilled", 2,  "ReadyA"),
    "p-demo-milk":    ("Süd 1L",           "c-001", 1.00, 1.50, 0.15, "pack",  "chilled", 10, "DairyB"),
}

products = []
spotlight_supplier_map = {
    "p-demo-yogurt":  "sup-001",
    "p-demo-chicken": "sup-014",
    "p-demo-banana":  "sup-013",
    "p-demo-salad":   "sup-005",
    "p-demo-milk":    "sup-012",
}

for pid, (name, cid, cp, sp, mm, unit, storage, shelf, brand) in SPOTLIGHTS.items():
    products.append({
        "id": pid,
        "sku": f"SKU-{pid.upper().replace('-', '')[:14]}",
        "barcode": f"480{random.randint(1000000000, 9999999999)}",
        "name": name,
        "category_id": cid,
        "supplier_id": spotlight_supplier_map[pid],
        "brand": brand,
        "unit": unit,
        "shelf_life_days": shelf,
        "storage_type": storage,
        "cost_price": cp,
        "sale_price": sp,
        "minimum_margin_pct": mm,
        "is_perishable": True,
        "image_url": f"https://images.bravo.az/{pid}.jpg",
        "is_active": True,
    })

# Generate ~95 more products
NAME_TEMPLATES = {
    "c-001": [("Süd 2L", "pack", "chilled", 10, 1.80, 2.60, 0.15),
              ("Pendir 200q", "pack", "chilled", 14, 3.20, 4.80, 0.20),
              ("Kəsmik 250q", "pack", "chilled", 7, 1.50, 2.30, 0.18),
              ("Ayran 500ml", "pack", "chilled", 7, 0.60, 1.00, 0.20),
              ("Smetana 400q", "pack", "chilled", 14, 2.00, 3.10, 0.18),
              ("Krem Pendir 150q", "pack", "chilled", 21, 2.40, 3.80, 0.20),
              ("Qaymaq 250q", "pack", "chilled", 10, 1.80, 2.80, 0.18),
              ("Süzmə 300q", "pack", "chilled", 7, 1.20, 2.00, 0.20),
              ("Motal Pendiri", "kg", "chilled", 30, 8.00, 12.00, 0.20),
              ("Şor 500q", "pack", "chilled", 5, 1.40, 2.20, 0.18)],
    "c-002": [("Mal Əti 1kg", "kg", "chilled", 5, 9.00, 13.50, 0.18),
              ("Toyuq Bud", "kg", "chilled", 4, 4.20, 6.50, 0.20),
              ("Toyuq Qanadları", "kg", "chilled", 4, 3.80, 5.90, 0.20),
              ("Qoyun Əti 1kg", "kg", "chilled", 5, 11.00, 16.00, 0.18),
              ("Hindquşu Filesi", "kg", "chilled", 4, 7.50, 11.00, 0.20),
              ("Sosiska Süqar", "pack", "chilled", 14, 2.80, 4.20, 0.20),
              ("Kolbasa 300q", "pack", "chilled", 21, 3.50, 5.50, 0.20),
              ("Quş Çiyəri", "kg", "chilled", 3, 2.20, 3.60, 0.20)],
    "c-003": [("Alma Qızıl", "kg", "ambient", 14, 1.20, 1.90, 0.18),
              ("Pomidor", "kg", "ambient", 7, 1.10, 1.80, 0.20),
              ("Xiyar", "kg", "ambient", 7, 0.95, 1.60, 0.20),
              ("Üzüm Sultani", "kg", "ambient", 5, 2.20, 3.40, 0.18),
              ("Albalı", "kg", "ambient", 4, 3.50, 5.20, 0.18),
              ("Kartof", "kg", "ambient", 30, 0.55, 0.95, 0.18),
              ("Soğan", "kg", "ambient", 30, 0.45, 0.80, 0.18),
              ("Kələm", "kg", "ambient", 14, 0.65, 1.10, 0.20),
              ("Kivi", "kg", "ambient", 10, 2.80, 4.20, 0.18),
              ("Limon", "kg", "ambient", 21, 2.10, 3.30, 0.20),
              ("Portağal", "kg", "ambient", 14, 1.40, 2.20, 0.18),
              ("Çiyələk 500q", "pack", "ambient", 4, 2.80, 4.50, 0.18)],
    "c-004": [("Çörək Boxça", "piece", "ambient", 3, 0.40, 0.70, 0.20),
              ("Lavaş", "piece", "ambient", 3, 0.30, 0.60, 0.25),
              ("Tort 1kg", "piece", "chilled", 5, 8.00, 14.00, 0.25),
              ("Pəxlavə 500q", "pack", "ambient", 14, 4.50, 7.50, 0.25),
              ("Krruassan", "piece", "ambient", 5, 0.80, 1.50, 0.30),
              ("Bulka", "piece", "ambient", 4, 0.35, 0.65, 0.25),
              ("Şəkərbura 1kg", "pack", "ambient", 21, 6.00, 10.50, 0.25)],
    "c-005": [("Olivier Salatı 500q", "pack", "chilled", 3, 2.50, 4.20, 0.20),
              ("Mantı 500q", "pack", "frozen", 60, 4.00, 6.50, 0.20),
              ("Düşbərə 500q", "pack", "frozen", 60, 3.50, 5.80, 0.20),
              ("Hazır Plov 1 porsiya", "pack", "chilled", 2, 4.50, 7.50, 0.20),
              ("Şor Qoğal 6 ədəd", "pack", "ambient", 5, 2.20, 3.80, 0.22),
              ("Pizza Margherita", "piece", "chilled", 3, 5.50, 9.00, 0.22)],
    "c-006": [("Dondurma Vanil 1L", "pack", "frozen", 180, 3.20, 5.50, 0.22),
              ("Pelmenə 1kg", "pack", "frozen", 90, 5.00, 8.00, 0.20),
              ("Donmuş Tərəvəz Qarışığı", "pack", "frozen", 365, 2.80, 4.50, 0.22),
              ("Donmuş Karides 500q", "pack", "frozen", 180, 8.00, 13.00, 0.20),
              ("Donmuş Balıq Filesi", "pack", "frozen", 120, 6.50, 10.00, 0.20)],
    "c-007": [("Mineral Su 1.5L", "pack", "ambient", 365, 0.45, 0.85, 0.30),
              ("Coca-Cola 1L", "pack", "ambient", 180, 1.00, 1.80, 0.30),
              ("Apelsin Şirəsi 1L", "pack", "ambient", 180, 1.40, 2.30, 0.25),
              ("Nəbati Çay 100q", "pack", "ambient", 730, 2.00, 3.50, 0.30),
              ("Kofe Növü Lavazza 250q", "pack", "ambient", 365, 7.50, 12.00, 0.25)],
    "c-008": [("Şokolad Plitka 100q", "piece", "ambient", 365, 1.80, 3.00, 0.25),
              ("Konfet Assorti 500q", "pack", "ambient", 180, 4.20, 7.00, 0.25),
              ("Peçenye 200q", "pack", "ambient", 180, 1.20, 2.00, 0.25),
              ("Halva 500q", "pack", "ambient", 365, 3.50, 5.50, 0.25)],
    "c-009": [("Qıyma Pomidor 720ml", "pack", "ambient", 730, 1.50, 2.50, 0.25),
              ("Marinad Xiyar 500ml", "pack", "ambient", 730, 1.80, 3.00, 0.25),
              ("Tunella Konservi", "pack", "ambient", 1095, 2.20, 3.80, 0.25),
              ("Lobya Konservi", "pack", "ambient", 730, 1.10, 2.00, 0.25)],
    "c-010": [("Düyü 1kg", "pack", "ambient", 365, 1.80, 2.80, 0.20),
              ("Un 2kg", "pack", "ambient", 365, 1.50, 2.40, 0.20),
              ("Şəkər 1kg", "pack", "ambient", 730, 1.20, 1.90, 0.20),
              ("Duz 1kg", "pack", "ambient", 1095, 0.30, 0.55, 0.30),
              ("Yağ Günəbaxan 1L", "pack", "ambient", 365, 2.50, 3.80, 0.20),
              ("Spagetti 500q", "pack", "ambient", 730, 1.20, 2.00, 0.22),
              ("Mərci 1kg", "pack", "ambient", 730, 2.20, 3.60, 0.22),
              ("Noxud 1kg", "pack", "ambient", 730, 1.80, 2.90, 0.22),
              ("Qara Çay 200q", "pack", "ambient", 730, 3.20, 5.20, 0.25),
              ("Konfet Şokoladlı 250q", "pack", "ambient", 180, 2.40, 4.00, 0.25),
              ("Vermisel 400q", "pack", "ambient", 730, 0.95, 1.60, 0.22),
              ("Bal 500q", "pack", "ambient", 730, 6.50, 10.50, 0.22),
              ("Sirkə 1L", "pack", "ambient", 1095, 1.20, 2.10, 0.25),
              ("Soya Sosu 250ml", "pack", "ambient", 730, 2.80, 4.50, 0.25)],
}

BRANDS_BY_CAT = {
    "c-001": ["DairyA", "DairyB", "DairyC", "Atena", "Aysu"],
    "c-002": ["MeatA", "MeatB", "Bakı Ət", "Lənkəran"],
    "c-003": ["FruitA", "FreshFarm", "Yaşıl Bağ", "Quba Bağ"],
    "c-004": ["BreadCo", "Bərəkət", "Çörək Evi"],
    "c-005": ["ReadyA", "Aspara", "Lezzet"],
    "c-006": ["Şimal Frost", "İceCo", "FrostPro"],
    "c-007": ["Coca-Cola", "Sirab", "Pepsi", "Aqua"],
    "c-008": ["Nestlé", "Şəkər Dünyası", "Konfet+"],
    "c-009": ["Konserva Pro", "Anadolu", "GoodCan"],
    "c-010": ["Anadolu", "GoldGrain", "FreshMill"],
}

CAT_TO_SUPPLIERS = {
    "c-001": ["sup-001", "sup-012"],
    "c-002": ["sup-002", "sup-014"],
    "c-003": ["sup-003", "sup-013"],
    "c-004": ["sup-004"],
    "c-005": ["sup-005"],
    "c-006": ["sup-006"],
    "c-007": ["sup-007"],
    "c-008": ["sup-009"],
    "c-009": ["sup-010"],
    "c-010": ["sup-011"],
}

PERISHABLE_CATS = {"c-001","c-002","c-003","c-004","c-005","c-006"}

next_pid = 1
for cid, items in NAME_TEMPLATES.items():
    for name, unit, storage, shelf, cp, sp, mm in items:
        pid = f"p-{next_pid:04d}"
        next_pid += 1
        supplier = random.choice(CAT_TO_SUPPLIERS[cid])
        brand = random.choice(BRANDS_BY_CAT[cid])
        products.append({
            "id": pid,
            "sku": f"SKU-{cid.upper().replace('-','')}-{next_pid:04d}",
            "barcode": f"480{random.randint(1000000000, 9999999999)}",
            "name": name,
            "category_id": cid,
            "supplier_id": supplier,
            "brand": brand,
            "unit": unit,
            "shelf_life_days": shelf,
            "storage_type": storage,
            "cost_price": cp,
            "sale_price": sp,
            "minimum_margin_pct": mm,
            "is_perishable": cid in PERISHABLE_CATS,
            "image_url": None,
            "is_active": True,
        })

print(f"Total products: {len(products)}")

# ---------- INVENTORY BATCHES + SNAPSHOTS ----------
# Spotlight specs (section 8)
SPOTLIGHT_INV = {
    "p-demo-yogurt":  ("s-001", 120, date(2026, 5, 18)),
    "p-demo-chicken": ("s-003",  45, date(2026, 5, 16)),
    "p-demo-banana":  ("s-005",  90, date(2026, 5, 17)),
    "p-demo-salad":   ("s-002",  60, date(2026, 5, 16)),
    "p-demo-milk":    ("s-004", 200, date(2026, 5, 19)),
}

batches = []
snapshots = []
batch_seq = 1
snap_seq = 1

product_index = {p["id"]: p for p in products}

# Spotlight batches & snapshots
for pid, (sid, stock, exp) in SPOTLIGHT_INV.items():
    p = product_index[pid]
    received = exp - timedelta(days=p["shelf_life_days"])
    bid = f"b-{batch_seq:05d}"
    batch_seq += 1
    batches.append({
        "id": bid,
        "product_id": pid,
        "store_id": sid,
        "supplier_id": p["supplier_id"],
        "batch_code": f"BTC-{pid[-6:].upper()}-{exp.strftime('%y%m%d')}",
        "received_date": iso_d(received),
        "expiry_date": iso_d(exp),
        "received_quantity": int(stock * 1.4),
        "remaining_quantity": stock,
        "cost_price": p["cost_price"],
        "status": "active",
    })
    snapshots.append({
        "id": f"snap-{snap_seq:05d}",
        "product_id": pid,
        "store_id": sid,
        "current_stock": stock,
        "reserved_stock": 0,
        "available_stock": stock,
        "snapshot_datetime": iso_dt(NOW),
        "source_system": "pos",
        "confidence_score": 92,
    })
    snap_seq += 1

# Distribute non-spotlight products across stores
non_spot_products = [p for p in products if not p["id"].startswith("p-demo")]

# Each store gets ~50-70 product placements
product_store_pairs = []
for sid, *_ in [(s["id"],) for s in stores]:
    placement_count = random.randint(50, 70)
    selected = random.sample(non_spot_products, min(placement_count, len(non_spot_products)))
    for p in selected:
        product_store_pairs.append((p, sid))

print(f"Product-store placements: {len(product_store_pairs)}")

target_batches = random.randint(220, 280)  # 200-400 range
batch_pairs_for_batches = product_store_pairs[:target_batches] if len(product_store_pairs) >= target_batches else product_store_pairs

target_snapshots = min(len(product_store_pairs), random.randint(330, 420))  # 300-500 range

# Generate batches for first N pairs (some products will get multiple batches)
for idx, (p, sid) in enumerate(batch_pairs_for_batches):
    pid = p["id"]
    shelf = p["shelf_life_days"]
    # Generate 1 batch per pair, for some perishables generate 2
    n_batches = 2 if (p["is_perishable"] and random.random() < 0.3) else 1
    for _ in range(n_batches):
        if shelf <= 7:
            days_offset = random.randint(-2, 5)
        elif shelf <= 30:
            days_offset = random.randint(-15, shelf - 1)
        else:
            days_offset = random.randint(-60, shelf - 5)
        exp = TODAY + timedelta(days=days_offset)
        received = exp - timedelta(days=shelf)
        if received >= TODAY:
            received = TODAY - timedelta(days=1)
        recv_qty = random.randint(20, 200)
        # remaining = recv_qty - random portion sold
        sold_pct = random.uniform(0.1, 0.85)
        remaining = max(0, int(recv_qty * (1 - sold_pct)))
        if exp < TODAY:
            status = "expired" if remaining > 0 else "depleted"
        elif remaining == 0:
            status = "depleted"
        else:
            status = "active"
        bid = f"b-{batch_seq:05d}"
        batch_seq += 1
        batches.append({
            "id": bid,
            "product_id": pid,
            "store_id": sid,
            "supplier_id": p["supplier_id"],
            "batch_code": f"BTC-{pid[-6:].upper()}-{exp.strftime('%y%m%d')}",
            "received_date": iso_d(received),
            "expiry_date": iso_d(exp),
            "received_quantity": recv_qty,
            "remaining_quantity": remaining,
            "cost_price": p["cost_price"],
            "status": status,
        })

print(f"Batches: {len(batches)}")

# Generate snapshots from product-store pairs (one per pair, capped)
seen_ps_pairs = set()
for p, sid in product_store_pairs:
    key = (p["id"], sid)
    if key in seen_ps_pairs:
        continue
    seen_ps_pairs.add(key)
    if len(snapshots) >= target_snapshots:
        break
    # current stock = sum of remaining for active batches of this pair
    pair_remaining = sum(b["remaining_quantity"] for b in batches
                         if b["product_id"] == p["id"] and b["store_id"] == sid and b["status"] == "active")
    if pair_remaining == 0:
        pair_remaining = random.randint(5, 80)
    reserved = random.randint(0, max(1, int(pair_remaining * 0.1)))
    snapshots.append({
        "id": f"snap-{snap_seq:05d}",
        "product_id": p["id"],
        "store_id": sid,
        "current_stock": pair_remaining,
        "reserved_stock": reserved,
        "available_stock": pair_remaining - reserved,
        "snapshot_datetime": iso_dt(NOW - timedelta(minutes=random.randint(5, 240))),
        "source_system": random.choice(["pos", "pos", "pos", "erp", "manual"]),
        "confidence_score": random.randint(55, 99),
    })
    snap_seq += 1

print(f"Snapshots: {len(snapshots)}")

# ---------- SALES (last 30 days, daily aggregates per product-store) ----------
# Spotlight sales averages
SPOTLIGHT_SALES = {
    "p-demo-yogurt":  (22, "declining", "s-001"),
    "p-demo-chicken": (12, "stable",    "s-003"),
    "p-demo-banana":  (28, "stable",    "s-005"),
    "p-demo-salad":   (18, "stable",    "s-002"),
    "p-demo-milk":    (35, "stable",    "s-004"),
}

sales_records = []
sales_seq = 1
days_window = 30

# Generate spotlight sales (30 days each)
for pid, (avg, trend, sid) in SPOTLIGHT_SALES.items():
    p = product_index[pid]
    for d_offset in range(days_window, 0, -1):
        d = TODAY - timedelta(days=d_offset)
        if trend == "declining":
            factor = 1.0 + (d_offset / 30.0) * 0.5  # higher in past
        elif trend == "rising":
            factor = 1.0 - (d_offset / 30.0) * 0.4
        else:
            factor = 1.0
        qty = max(1, int(round(avg * factor * random.uniform(0.7, 1.3))))
        price = p["sale_price"]
        sales_records.append({
            "id": f"sale-{sales_seq:06d}",
            "product_id": pid,
            "store_id": sid,
            "date": iso_d(d),
            "quantity_sold": qty,
            "avg_unit_price": price,
            "total_amount": round(qty * price, 2),
            "transactions_count": max(1, int(qty / random.uniform(1.2, 2.5))),
        })
        sales_seq += 1

# Generate sales for other product-store pairs (last 30 days, but sparser)
target_sales = random.randint(2300, 3200)  # 2000-3500 range
remaining_capacity = target_sales - len(sales_records)
# How many days of history per pair to fill?
pairs_for_sales = list(seen_ps_pairs)
random.shuffle(pairs_for_sales)
days_per_pair = max(5, remaining_capacity // max(1, len(pairs_for_sales)))

for pid, sid in pairs_for_sales:
    if len(sales_records) >= target_sales:
        break
    p = product_index[pid]
    cat_velocity = {
        "c-001": (8, 35), "c-002": (5, 25), "c-003": (10, 40), "c-004": (15, 50),
        "c-005": (3, 15), "c-006": (2, 12), "c-007": (5, 30), "c-008": (3, 20),
        "c-009": (1, 8),  "c-010": (3, 18),
    }
    lo, hi = cat_velocity.get(p["category_id"], (3, 20))
    base_avg = random.randint(lo, hi)
    n_days = min(days_per_pair, days_window)
    chosen_days = sorted(random.sample(range(1, days_window + 1), n_days))
    trend_choice = random.choices(["rising", "stable", "declining", "very_weak"], weights=[20, 50, 20, 10])[0]
    for d_offset in chosen_days:
        d = TODAY - timedelta(days=d_offset)
        if trend_choice == "declining":
            factor = 1.0 + (d_offset / 30.0) * 0.4
        elif trend_choice == "rising":
            factor = 1.0 - (d_offset / 30.0) * 0.3
        elif trend_choice == "very_weak":
            factor = 0.3
        else:
            factor = 1.0
        qty = max(0, int(round(base_avg * factor * random.uniform(0.6, 1.4))))
        if qty == 0:
            continue
        price = p["sale_price"] * random.uniform(0.95, 1.0)
        sales_records.append({
            "id": f"sale-{sales_seq:06d}",
            "product_id": pid,
            "store_id": sid,
            "date": iso_d(d),
            "quantity_sold": qty,
            "avg_unit_price": round(price, 2),
            "total_amount": round(qty * price, 2),
            "transactions_count": max(1, int(qty / random.uniform(1.2, 2.5))),
        })
        sales_seq += 1
        if len(sales_records) >= target_sales:
            break

print(f"Sales: {len(sales_records)}")

# ---------- WASTE RECORDS ----------
waste_records = []
waste_seq = 1
target_waste = random.randint(95, 130)  # 80-150

# Pick batches that are expired or had losses
candidate_batches = [b for b in batches if b["status"] in ("expired",) or (b["status"] == "active" and b["remaining_quantity"] > 50)]
random.shuffle(candidate_batches)

waste_user_ids = ["u-008", "u-009", "u-010", "u-011", "u-012"]

REASON_NOTES = {
    "expired": "Son istifadə tarixi keçdi, məhsul rəfdən götürüldü",
    "damaged": "Daşınma zamanı qablaşdırma zədələndi",
    "spoiled": "Soyuducu nasazlığı səbəbindən xarab oldu",
    "shrinkage": "Sayım nəticəsində uyğunsuzluq aşkarlandı",
    "supplier_return": "Tədarükçüyə qaytarıldı, keyfiyyət problemi",
    "other": "Daxili audit nəticəsində silindi",
}

for b in candidate_batches[:target_waste]:
    p = product_index[b["product_id"]]
    qty = random.randint(1, max(2, b["remaining_quantity"] // 2 if b["remaining_quantity"] > 0 else b["received_quantity"] // 4))
    if b["status"] == "expired":
        reason = "expired"
    else:
        reason = random.choices(["expired", "damaged", "spoiled", "shrinkage", "supplier_return", "other"],
                                weights=[40, 20, 15, 15, 5, 5])[0]
    rec_at = NOW - timedelta(days=random.randint(0, 60), hours=random.randint(0, 23))
    waste_records.append({
        "id": f"waste-{waste_seq:05d}",
        "product_id": b["product_id"],
        "store_id": b["store_id"],
        "batch_id": b["id"],
        "quantity": qty,
        "reason": reason,
        "value": round(qty * b["cost_price"], 2),
        "recorded_by_user_id": random.choice(waste_user_ids),
        "recorded_at": iso_dt(rec_at),
        "note": REASON_NOTES[reason],
    })
    waste_seq += 1

print(f"Waste records: {len(waste_records)}")

# Build waste history per product (for risk calculation)
waste_count_by_product = {}
for w in waste_records:
    waste_count_by_product[w["product_id"]] = waste_count_by_product.get(w["product_id"], 0) + 1

def waste_history_label(pid):
    n = waste_count_by_product.get(pid, 0)
    if n == 0: return "none"
    if n <= 2: return "low"
    if n <= 5: return "medium"
    return "high"

# ---------- RISK PREDICTIONS ----------
# Spotlight predictions
SPOTLIGHT_RISK = {
    # pid: (risk_score, risk_level, predicted_unsold, days_to_expiry, current_stock, avg_sales, sales_trend, main_reason, factors_override)
    "p-demo-yogurt": (
        82, "high", 75, 3, 120, 22, "declining",
        "Stok satış sürətindən 5x yüksəkdir və son istifadə tarixinə 3 gün qalıb. Eyni məhsul Bravo Gənclik filialında daha sürətli satılır.",
        {"expiry_score": 70, "stock_pressure_score": 95, "sales_velocity_score": 75, "waste_history_score": 85, "supplier_risk_score": 70},
    ),
    "p-demo-chicken": (
        94, "critical", 38, 1, 45, 12, "stable",
        "Son istifadə tarixinə yalnız 1 gün qalıb. Stokun 84%-i bu gün satıla bilməyəcək — təcili tədbir tələb olunur.",
        {"expiry_score": 100, "stock_pressure_score": 95, "sales_velocity_score": 40, "waste_history_score": 85, "supplier_risk_score": 80},
    ),
    "p-demo-banana": (
        76, "high", 35, 2, 90, 28, "stable",
        "Meyvə-tərəvəz qrupu üzrə yüksək risk. 2 gündə bütün stoku satmaq üçün gündəlik satış sürəti kifayət deyil.",
        {"expiry_score": 85, "stock_pressure_score": 55, "sales_velocity_score": 40, "waste_history_score": 85, "supplier_risk_score": 80},
    ),
    "p-demo-salad": (
        91, "critical", 42, 1, 60, 18, "stable",
        "Hazır yemək qrupunda 1 gün qalıb. Stokun 70%-i bu gün satılmazsa atılacaq.",
        {"expiry_score": 100, "stock_pressure_score": 95, "sales_velocity_score": 40, "waste_history_score": 85, "supplier_risk_score": 70},
    ),
    "p-demo-milk": (
        68, "high", 60, 4, 200, 35, "stable",
        "4 gün ərzində 200 ədəd süd satılması mümkün deyil. Bravo Sumqayıt filialına transfer tövsiyə olunur.",
        {"expiry_score": 50, "stock_pressure_score": 75, "sales_velocity_score": 40, "waste_history_score": 60, "supplier_risk_score": 80},
    ),
}

# For random ones, we will compute strictly from formula
risk_predictions = []
recommendations = []
scenarios = []
risk_seq = 1
rec_seq = 1
scen_seq = 1

# Build helper: for each product-store snapshot, compute days_to_expiry from earliest active batch
def get_earliest_batch(pid, sid):
    relevant = [b for b in batches if b["product_id"] == pid and b["store_id"] == sid and b["status"] == "active"]
    if not relevant:
        return None
    return min(relevant, key=lambda x: x["expiry_date"])

# Build avg_daily_sales 7d helper
def avg_daily_sales_7d(pid, sid):
    cutoff = TODAY - timedelta(days=7)
    relevant = [s for s in sales_records if s["product_id"] == pid and s["store_id"] == sid
                and datetime.strptime(s["date"], "%Y-%m-%d").date() >= cutoff]
    if not relevant:
        return 0
    return sum(s["quantity_sold"] for s in relevant) / 7.0

# Assemble main_reasons templates
MAIN_REASON_TEMPLATES = [
    "Stok satış sürətindən {ratio}x yüksəkdir və son istifadə tarixinə {days} gün qalıb.",
    "Son {days} gündə satış azalıb, anbar yığılıb. Risk yüksəkdir.",
    "Tədarükçü gecikmiş çatdırılma səbəbindən qısa raf ömrü ilə təhvil verib.",
    "Eyni məhsul digər filiallarda daha sürətli satılır — transfer mümkün ola bilər.",
    "Mövsüm sonu səbəbindən tələbat azalıb, stok artıq vəziyyətdədir.",
    "Yüksək itki tarixçəsi olan məhsul, son istifadə tarixinə yaxınlaşır.",
]

# Generate spotlight risk predictions
for pid, (rs, rlvl, unsold, days, stock, avg, trend, reason, factors) in SPOTLIGHT_RISK.items():
    sid, _, exp = SPOTLIGHT_INV[pid]
    p = product_index[pid]
    pred_loss = round(unsold * p["cost_price"], 2)
    risk_predictions.append({
        "id": f"rp-{risk_seq:05d}",
        "product_id": pid,
        "store_id": sid,
        "batch_id": next((b["id"] for b in batches if b["product_id"] == pid and b["store_id"] == sid), None),
        "risk_score": rs,
        "risk_level": rlvl,
        "predicted_unsold_quantity": unsold,
        "predicted_loss_value": pred_loss,
        "main_reason": reason,
        "reason_factors": factors,
        "data_confidence_score": 92,
        "days_to_expiry": days,
        "current_stock": stock,
        "avg_daily_sales_7d": avg,
        "sales_trend": trend,
        "created_at": iso_dt(NOW - timedelta(hours=2)),
    })
    risk_seq += 1

# Now generate ~45 more risk predictions from the actual product/store/batch state
# Pick snapshots with active batches that have <=10 days to expiry OR high stock
candidates = []
for snap in snapshots:
    pid = snap["product_id"]
    sid = snap["store_id"]
    if pid.startswith("p-demo"):
        continue
    eb = get_earliest_batch(pid, sid)
    if not eb:
        continue
    exp_d = datetime.strptime(eb["expiry_date"], "%Y-%m-%d").date()
    days = (exp_d - TODAY).days
    if days < 0:
        continue
    if days <= 7 or snap["current_stock"] >= 80:
        candidates.append((snap, eb, days))

random.shuffle(candidates)
target_risks = random.randint(40, 55) - len(SPOTLIGHT_RISK)
for snap, eb, days in candidates[:target_risks]:
    pid = snap["product_id"]
    sid = snap["store_id"]
    p = product_index[pid]
    stock = snap["current_stock"]
    avg = avg_daily_sales_7d(pid, sid)
    if avg == 0:
        avg = round(random.uniform(0.5, 5.0), 1)
    expected_sold = avg * days
    predicted_unsold = max(0, int(round(stock - expected_sold)))
    unsold_ratio = predicted_unsold / stock if stock > 0 else 0
    es = expiry_score(days)
    sps = stock_pressure_score(unsold_ratio)
    trend = random.choices(["rising", "stable", "declining", "very_weak"], weights=[15, 45, 30, 10])[0]
    svs = SALES_VELOCITY_SCORE[trend]
    whs = WASTE_HISTORY_SCORE[waste_history_label(pid)]
    sup = next((s for s in suppliers if s["id"] == p["supplier_id"]), None)
    srs = sup["supplier_risk_score"] if sup else 50
    rs = compute_risk_score(es, sps, svs, whs, srs)
    rlvl = risk_level_from(rs)
    pred_loss = round(predicted_unsold * p["cost_price"], 2)
    ratio_text = round(stock / max(avg, 0.5), 1)
    reason = random.choice(MAIN_REASON_TEMPLATES).format(ratio=ratio_text, days=days)
    risk_predictions.append({
        "id": f"rp-{risk_seq:05d}",
        "product_id": pid,
        "store_id": sid,
        "batch_id": eb["id"],
        "risk_score": rs,
        "risk_level": rlvl,
        "predicted_unsold_quantity": predicted_unsold,
        "predicted_loss_value": pred_loss,
        "main_reason": reason,
        "reason_factors": {
            "expiry_score": es,
            "stock_pressure_score": sps,
            "sales_velocity_score": svs,
            "waste_history_score": whs,
            "supplier_risk_score": srs,
        },
        "data_confidence_score": snap["confidence_score"],
        "days_to_expiry": days,
        "current_stock": stock,
        "avg_daily_sales_7d": round(avg, 2),
        "sales_trend": trend,
        "created_at": iso_dt(NOW - timedelta(hours=random.randint(1, 48))),
    })
    risk_seq += 1

print(f"Risk predictions: {len(risk_predictions)}")

# ---------- RECOMMENDATIONS + SCENARIOS ----------

# Spotlight recommendations (with hand-tuned content)
SPOTLIGHT_REC = {
    "p-demo-yogurt": {
        "type": "transfer",  # combined recommended scenario; rec type chosen for spec match
        "text": "20% endirim tətbiq et və 30 ədədi Bravo Gənclik filialına transfer et. Birləşmiş aksiya ən yüksək xilas dəyəri verir.",
        "reason": "Stok satış sürətindən 5x yüksəkdir, lakin Gənclik filialında tələbat var. Endirim + transfer birlikdə ən qazanclı seçimdir.",
        "approver": "store_manager",
        "scenarios_plan": [
            ("no_action", {}, False),
            ("discount", {"discount_pct": 0.20}, False),
            ("transfer", {"transfer_qty": 30, "target_store_id": "s-002", "target_velocity": 18}, False),
            ("shelf_visibility", {}, False),
            ("combined", {"discount_pct": 0.20, "transfer_qty": 30, "target_store_id": "s-002", "target_velocity": 18}, True),
        ],
    },
    "p-demo-chicken": {
        "type": "discount",
        "text": "Təcili 30% endirim tətbiq et. Son istifadə tarixinə 1 gün qaldığı üçün transfer mümkün deyil.",
        "reason": "1 gün ərzində 45 ədədin satılması üçün aqressiv endirim lazımdır. Margin hələ də müsbət qalır.",
        "approver": "category_manager",
        "scenarios_plan": [
            ("no_action", {}, False),
            ("discount", {"discount_pct": 0.30}, True),
            ("bundle", {"bundle_discount_pct": 0.15}, False),
            ("shelf_visibility", {}, False),
        ],
    },
    "p-demo-banana": {
        "type": "bundle",
        "text": "Kivi və ya qatıqla birlikdə paket aksiyası yarat və rəf görünüşünü artır.",
        "reason": "Bundle + shelf visibility birlikdə tələbatı artırır. Daşıma xərci olmadan optimal həll.",
        "approver": "store_manager",
        "scenarios_plan": [
            ("no_action", {}, False),
            ("discount", {"discount_pct": 0.20}, False),
            ("bundle", {"bundle_discount_pct": 0.10}, True),
            ("shelf_visibility", {}, False),
        ],
    },
    "p-demo-salad": {
        "type": "discount",
        "text": "Dərhal 25% endirim tətbiq et. 1 gün qalıb, stok yüksəkdir.",
        "reason": "Hazır salat sabaha qalmır. 25% endirim margin sərhədindən yuxarıdadır və tələbatı 2x artırır.",
        "approver": "category_manager",
        "scenarios_plan": [
            ("no_action", {}, False),
            ("discount", {"discount_pct": 0.25}, True),
            ("bundle", {"bundle_discount_pct": 0.15}, False),
            ("shelf_visibility", {}, False),
        ],
    },
    "p-demo-milk": {
        "type": "transfer",
        "text": "80 ədədi Bravo Sumqayıt filialına transfer et və növbəti sifarişdə miqdarı azalt.",
        "reason": "Sumqayıt filialında süd tələbatı yüksəkdir. Transfer + reorder reduce uzunmüddətli həll verir.",
        "approver": "store_manager",
        "scenarios_plan": [
            ("no_action", {}, False),
            ("discount", {"discount_pct": 0.15}, False),
            ("transfer", {"transfer_qty": 80, "target_store_id": "s-007", "target_velocity": 50}, True),
            ("shelf_visibility", {}, False),
            ("combined", {"discount_pct": 0.10, "transfer_qty": 60, "target_store_id": "s-007", "target_velocity": 50}, False),
        ],
    },
}

# Maps
APPROVAL_BY_TYPE = {
    "shelf_visibility": None, "stock_check": None, "monitor": None, "no_action": None,
    "discount": "store_manager",  # >10% category_manager (handled per case)
    "transfer": "store_manager",
    "bundle": "store_manager",
    "reorder_reduce": "purchase_manager",
    "reorder_increase": "purchase_manager",
    "supplier_review": "category_manager",
    "return_to_supplier": "category_manager",
    "campaign_add": "category_manager",
}

REC_TEXT_TEMPLATES = {
    "discount": "Bu məhsula {pct}% endirim tətbiq et. Stok son istifadə tarixinə yaxınlaşır.",
    "transfer": "{qty} ədədi {target} filialına transfer et. Orada tələbat daha yüksəkdir.",
    "bundle": "Tamamlayıcı məhsul ilə paket təklifi yarat. Tələbatı artıracaq.",
    "shelf_visibility": "Məhsulu daha görünən rəfə yerləşdir, qiymət etiketini yenilə.",
    "no_action": "Hazırda hərəkət tələb olunmur, satış normal sürətdədir.",
    "monitor": "Növbəti 24 saat ərzində satış sürətini izlə.",
    "stock_check": "Fiziki sayım keçir, stok məlumatları köhnəlmiş ola bilər.",
    "reorder_reduce": "Növbəti sifariş miqdarını azalt, davamlı yığılma müşahidə olunur.",
    "reorder_increase": "Tələbat artır, növbəti sifarişi artır.",
    "supplier_review": "Tədarükçü performansı yoxlanılmalıdır, ardıcıl gecikmələr var.",
    "return_to_supplier": "Tədarükçüyə qaytar, qaytarma siyasəti tətbiq olunur.",
    "campaign_add": "Mövcud kampaniyaya əlavə et, görünürlük yüksəlsin.",
    "combined": "Endirim və transferi birləşdir: bir hissəsi yerli endirimlə, qalan hissəsi digər filiala transfer.",
}

REC_REASON_TEMPLATES = {
    "discount": "Endirim sürətli satışı təmin edir, itkidən qoruyur.",
    "transfer": "Filiallar arası tələb fərqi mövcuddur.",
    "bundle": "Paket təklifləri tələbatı artırmaq üçün effektivdir.",
    "shelf_visibility": "Görünürlük artımı orta hesabla 20% satış artırır.",
    "no_action": "Mövcud satış sürəti riski örtür.",
    "monitor": "Risk hələ kritik deyil, lakin müşahidə tələb olunur.",
    "stock_check": "Məlumat keyfiyyəti aşağıdır, qərar üçün dəqiq stok lazımdır.",
    "reorder_reduce": "Sifariş optimallaşdırılmalı, anbar yığılması var.",
    "reorder_increase": "Yüksək tələbat səviyyəsi mövcuddur.",
    "supplier_review": "Tədarükçü ilə danışıq lazımdır.",
    "return_to_supplier": "Tədarükçü qaytarma müqaviləsi var.",
    "campaign_add": "Kampaniya effektivliyini artırır.",
    "combined": "Birləşmiş aksiya tək həllin verə bilməyəcəyi yüksək xilas dəyəri yaradır.",
}

PRIORITY_BY_RISK = {"low": "low", "medium": "medium", "high": "high", "critical": "critical"}

# Generate recommendations: one per risk_prediction
status_distribution = ["pending_approval"] * 50 + ["approved"] * 12 + ["converted_to_task"] * 13 + ["rejected"] * 15 + ["completed"] * 10
random.shuffle(status_distribution)

# Spotlight first
def make_scenario_record(rec_id, rid, scen_type, params, is_recommended, baseline):
    stock = baseline["stock"]
    sales = baseline["sales"]
    days = baseline["days"]
    sale_price = baseline["sale_price"]
    cost_price = baseline["cost_price"]
    min_margin = baseline["min_margin"]
    data_conf = baseline["data_conf"]

    if scen_type == "no_action":
        m = scenario_no_action(stock, sales, days, sale_price, cost_price)
    elif scen_type == "discount":
        m = scenario_discount(stock, sales, days, sale_price, cost_price, params["discount_pct"], min_margin)
    elif scen_type == "transfer":
        m = scenario_transfer(stock, sales, days, sale_price, params["transfer_qty"], params.get("target_velocity", 10))
    elif scen_type == "bundle":
        m = scenario_bundle(stock, sales, days, sale_price, params["bundle_discount_pct"])
    elif scen_type == "shelf_visibility":
        m = scenario_shelf(stock, sales, days, sale_price)
    elif scen_type == "combined":
        m = scenario_combined(stock, sales, days, sale_price, cost_price,
                              params["discount_pct"], min_margin,
                              params["transfer_qty"], params.get("target_velocity", 10))
    else:
        m = scenario_no_action(stock, sales, days, sale_price, cost_price)

    return {
        "id": rid,
        "recommendation_id": rec_id,
        "scenario_type": scen_type,
        "parameters": params,
        "expected_sold_quantity": m["expected_sold"],
        "expected_recovered_value": m["recovered_value"],
        "discount_cost": m["discount_cost"],
        "transfer_cost": m["transfer_cost"],
        "operational_cost": m["operational_cost"],
        "net_saved_value": m["net_saved"],
        "confidence_score": confidence_score(data_conf, scen_type),
        "is_recommended": is_recommended,
    }

# Process spotlight recs
spotlight_rec_ids = {}
for pid, plan in SPOTLIGHT_REC.items():
    rp = next(r for r in risk_predictions if r["product_id"] == pid)
    p = product_index[pid]
    rec_id = f"rec-{rec_seq:05d}"
    rec_seq += 1
    spotlight_rec_ids[pid] = rec_id

    baseline = {
        "stock": rp["current_stock"],
        "sales": rp["avg_daily_sales_7d"],
        "days": rp["days_to_expiry"],
        "sale_price": p["sale_price"],
        "cost_price": p["cost_price"],
        "min_margin": p["minimum_margin_pct"],
        "data_conf": rp["data_confidence_score"],
    }

    # Build scenarios first to compute expected_recovered/cost/net_saved on chosen one
    rec_scenarios = []
    chosen = None
    for stype, params, is_rec in plan["scenarios_plan"]:
        sid_ = f"scen-{scen_seq:05d}"
        scen_seq += 1
        sc = make_scenario_record(rec_id, sid_, stype, params, is_rec, baseline)
        rec_scenarios.append(sc)
        if is_rec:
            chosen = sc

    scenarios.extend(rec_scenarios)

    approver = plan["approver"]
    # If discount > 10% override approver
    if plan["type"] == "discount" and any(s.get("parameters", {}).get("discount_pct", 0) > 0.10 for s in rec_scenarios if s["scenario_type"] == "discount"):
        approver = "category_manager"

    recommendations.append({
        "id": rec_id,
        "risk_prediction_id": rp["id"],
        "product_id": pid,
        "store_id": rp["store_id"],
        "recommendation_type": plan["type"],
        "recommendation_text": plan["text"],
        "reason_text": plan["reason"],
        "expected_recovered_value": chosen["expected_recovered_value"],
        "expected_cost": round(chosen["discount_cost"] + chosen["transfer_cost"] + chosen["operational_cost"], 2),
        "net_saved_value": chosen["net_saved_value"],
        "confidence_score": chosen["confidence_score"],
        "priority": PRIORITY_BY_RISK[rp["risk_level"]],
        "status": "pending_approval",
        "requires_approval_by_role": approver,
        "approved_by_user_id": None,
        "approved_at": None,
        "rejected_by_user_id": None,
        "rejected_at": None,
        "rejection_reason": None,
        "created_at": rp["created_at"],
    })

# Now non-spotlight recs
non_spot_rps = [r for r in risk_predictions if not r["product_id"].startswith("p-demo")]

for idx, rp in enumerate(non_spot_rps):
    p = product_index[rp["product_id"]]
    days = rp["days_to_expiry"]
    stock = rp["current_stock"]
    sales = rp["avg_daily_sales_7d"] or 1
    rs = rp["risk_score"]
    data_conf = rp["data_confidence_score"]

    baseline = {
        "stock": stock, "sales": sales, "days": days,
        "sale_price": p["sale_price"], "cost_price": p["cost_price"],
        "min_margin": p["minimum_margin_pct"], "data_conf": data_conf,
    }

    # Decision rules (section 6)
    if data_conf < 50:
        rec_type = "stock_check"
        scen_plan = [("no_action", {}, True)]  # only one scenario = baseline → mark as recommended
        scen_plan = [("no_action", {}, False), ("shelf_visibility", {}, True), ("discount", {"discount_pct": 0.10}, False)]
    elif rs < 30:
        rec_type = random.choice(["no_action", "monitor"])
        scen_plan = [("no_action", {}, True), ("shelf_visibility", {}, False), ("discount", {"discount_pct": 0.10}, False)]
    elif days <= 1:
        rec_type = random.choice(["discount", "bundle"])
        scen_plan = [("no_action", {}, False),
                     ("discount", {"discount_pct": 0.30}, rec_type == "discount"),
                     ("bundle", {"bundle_discount_pct": 0.15}, rec_type == "bundle"),
                     ("shelf_visibility", {}, False)]
    else:
        # General: discount, transfer, bundle, shelf, combined
        # Find a target store with higher sales (mock)
        other_stores = [s["id"] for s in stores if s["id"] != rp["store_id"]]
        target_sid = random.choice(other_stores)
        target_v = max(1, int(sales * random.uniform(1.2, 2.0)))
        transfer_qty = min(stock // 2, max(10, int(target_v * days)))
        rec_type = random.choices(["discount", "transfer", "bundle", "shelf_visibility", "combined"],
                                  weights=[35, 20, 15, 15, 15])[0]
        # Build candidate list, pick rec_type as recommended
        candidate_scenarios = [
            ("no_action", {}),
            ("discount", {"discount_pct": random.choice([0.10, 0.15, 0.20, 0.25])}),
        ]
        if days > 1 and target_v > 0:
            candidate_scenarios.append(("transfer", {"transfer_qty": transfer_qty, "target_store_id": target_sid, "target_velocity": target_v}))
        candidate_scenarios.append(("bundle", {"bundle_discount_pct": 0.10}))
        candidate_scenarios.append(("shelf_visibility", {}))
        if days > 1 and target_v > 0 and rec_type == "combined":
            candidate_scenarios.append(("combined", {"discount_pct": 0.15, "transfer_qty": transfer_qty, "target_store_id": target_sid, "target_velocity": target_v}))

        # Make sure exactly one is_recommended
        # Choose the candidate matching rec_type if available, else first non-no_action
        scen_plan = []
        chosen_idx = None
        for i, (stype, params) in enumerate(candidate_scenarios):
            if chosen_idx is None and stype == rec_type:
                chosen_idx = i
        if chosen_idx is None:
            # fall back: pick first non-no_action
            for i, (stype, _) in enumerate(candidate_scenarios):
                if stype != "no_action":
                    chosen_idx = i
                    rec_type = stype
                    break
            if chosen_idx is None:
                chosen_idx = 0
                rec_type = "no_action"
        for i, (stype, params) in enumerate(candidate_scenarios):
            scen_plan.append((stype, params, i == chosen_idx))

    rec_id = f"rec-{rec_seq:05d}"
    rec_seq += 1
    rec_scenarios = []
    chosen = None
    for stype, params, is_rec in scen_plan[:5]:  # cap at 5
        sid_ = f"scen-{scen_seq:05d}"
        scen_seq += 1
        sc = make_scenario_record(rec_id, sid_, stype, params, is_rec, baseline)
        rec_scenarios.append(sc)
        if is_rec:
            chosen = sc
    if not chosen:
        chosen = rec_scenarios[0]
        rec_scenarios[0]["is_recommended"] = True

    # Ensure 3-5 scenarios
    if len(rec_scenarios) < 3:
        for fill_type in ["no_action", "shelf_visibility", "discount"]:
            if len(rec_scenarios) >= 3:
                break
            if not any(s["scenario_type"] == fill_type for s in rec_scenarios):
                params = {} if fill_type != "discount" else {"discount_pct": 0.10}
                sid_ = f"scen-{scen_seq:05d}"
                scen_seq += 1
                sc = make_scenario_record(rec_id, sid_, fill_type, params, False, baseline)
                rec_scenarios.append(sc)

    scenarios.extend(rec_scenarios)

    # Approver
    if rec_type == "discount":
        # Find chosen scenario discount_pct
        dpct = chosen.get("parameters", {}).get("discount_pct", 0.10)
        approver = "category_manager" if dpct > 0.10 else "store_manager"
    elif rec_type == "transfer":
        approver = "store_manager"
    else:
        approver = APPROVAL_BY_TYPE.get(rec_type, "store_manager")

    status = status_distribution[idx % len(status_distribution)]
    approved_by = None
    approved_at = None
    rejected_by = None
    rejected_at = None
    rejection_reason = None

    approver_user = next((u["id"] for u in users if u["role"] == approver), None) if approver else None
    if status in ("approved", "converted_to_task", "completed"):
        approved_by = approver_user
        approved_at = iso_dt(NOW - timedelta(hours=random.randint(1, 24)))
    elif status == "rejected":
        rejected_by = approver_user
        rejected_at = iso_dt(NOW - timedelta(hours=random.randint(1, 24)))
        rejection_reason = random.choice([
            "Artıq satılıb, ehtiyac yoxdur",
            "Endirim həddindən aqressivdir",
            "Transfer mümkün deyil, logistik problem",
            "Manual idarə olunacaq",
        ])

    recommendations.append({
        "id": rec_id,
        "risk_prediction_id": rp["id"],
        "product_id": rp["product_id"],
        "store_id": rp["store_id"],
        "recommendation_type": rec_type,
        "recommendation_text": REC_TEXT_TEMPLATES[rec_type].format(
            pct=int(chosen.get("parameters", {}).get("discount_pct", 0.15) * 100) if rec_type == "discount" else 0,
            qty=chosen.get("parameters", {}).get("transfer_qty", 0),
            target=next((s["name"] for s in stores if s["id"] == chosen.get("parameters", {}).get("target_store_id", "")), "digər filial"),
        ),
        "reason_text": REC_REASON_TEMPLATES[rec_type],
        "expected_recovered_value": chosen["expected_recovered_value"],
        "expected_cost": round(chosen["discount_cost"] + chosen["transfer_cost"] + chosen["operational_cost"], 2),
        "net_saved_value": chosen["net_saved_value"],
        "confidence_score": chosen["confidence_score"],
        "priority": PRIORITY_BY_RISK[rp["risk_level"]],
        "status": status,
        "requires_approval_by_role": approver,
        "approved_by_user_id": approved_by,
        "approved_at": approved_at,
        "rejected_by_user_id": rejected_by,
        "rejected_at": rejected_at,
        "rejection_reason": rejection_reason,
        "created_at": rp["created_at"],
    })

print(f"Recommendations: {len(recommendations)}")
print(f"Scenarios: {len(scenarios)}")

# ---------- TASKS ----------
tasks = []
task_seq = 1

TASK_TYPE_MAP = {
    "discount": "apply_discount",
    "transfer": "prepare_transfer",
    "stock_check": "stock_check",
    "shelf_visibility": "shelf_action",
    "bundle": "create_bundle",
    "no_action": "stock_check",
    "monitor": "stock_check",
    "reorder_reduce": "stock_check",
    "reorder_increase": "stock_check",
    "supplier_review": "supplier_followup",
    "return_to_supplier": "supplier_followup",
    "campaign_add": "shelf_action",
}

TASK_TITLE_TEMPLATES = {
    "apply_discount": "Endirimi rəfdə tətbiq et: {name}",
    "prepare_transfer": "Transfer hazırla: {name} ({qty} ədəd)",
    "stock_check": "Fiziki sayım keçir: {name}",
    "shelf_action": "Rəf yerləşdirməsini yenilə: {name}",
    "create_bundle": "Paket aksiyası qur: {name}",
    "record_waste": "İtkini qeydə al: {name}",
    "supplier_followup": "Tədarükçü ilə əlaqə saxla: {name}",
}

TASK_DESC_TEMPLATES = {
    "apply_discount": "Yeni qiymət etiketini çap et və rəfə yapışdır. POS-a endirimin daxil olduğunu yoxla.",
    "prepare_transfer": "Məhsulu hazırla, qablaşdır və logistika tərəfindən götürülməsi üçün hazırla.",
    "stock_check": "Mövcud stoku fiziki sayım yolu ilə yoxla, sapmaları sistemdə qeyd et.",
    "shelf_action": "Məhsulu daha görünən yerə yerləşdir, qiymət etiketini təzələ.",
    "create_bundle": "Komplementar məhsulu seç, qablaşdırma və qiymət etiketi hazırla.",
    "record_waste": "İtkinin səbəbini və miqdarını sistemdə qeyd et.",
    "supplier_followup": "Tədarükçü ilə əlaqə saxla, problemi həll et.",
}

# Tasks generated for converted/approved/completed recs
task_status_dist = ["pending"] * 30 + ["in_progress"] * 25 + ["completed"] * 30 + ["expired"] * 10 + ["cancelled"] * 5

actionable_recs = [r for r in recommendations if r["status"] in ("approved", "converted_to_task", "completed")
                   and r["recommendation_type"] not in ("no_action", "monitor")]

# Also create tasks for some pending recs (advance preparation)
extra_pending = [r for r in recommendations if r["status"] == "pending_approval"
                 and r["recommendation_type"] in ("discount", "transfer", "bundle", "shelf_visibility", "combined", "stock_check")]
actionable_recs += extra_pending

# Spotlight recs always get tasks
for pid, rid in spotlight_rec_ids.items():
    rec = next(r for r in recommendations if r["id"] == rid)
    if rec not in actionable_recs:
        actionable_recs.append(rec)

target_tasks = random.randint(75, 95)
random.shuffle(actionable_recs)

employee_users = [u["id"] for u in users if u["role"] in ("employee", "supervisor", "store_manager")]
employee_by_store = {}
for u in users:
    if u["role"] in ("employee", "supervisor") and u["store_id"]:
        employee_by_store.setdefault(u["store_id"], []).append(u["id"])

def assign_user_for_store(sid):
    if sid in employee_by_store and employee_by_store[sid]:
        return random.choice(employee_by_store[sid])
    # fall back to store manager of that store
    sm = next((u["id"] for u in users if u["role"] == "store_manager" and u["store_id"] == sid), None)
    return sm or random.choice(employee_users)

for i, rec in enumerate(actionable_recs):
    if len(tasks) >= target_tasks:
        break
    p = product_index[rec["product_id"]]
    task_type = TASK_TYPE_MAP.get(rec["recommendation_type"], "stock_check")
    if rec["recommendation_type"] in ("transfer", "combined"):
        n_tasks = 3  # prepare + handover + receive
    elif rec["recommendation_type"] in ("discount", "bundle"):
        n_tasks = 2  # apply + verify
    else:
        n_tasks = 1
    for tn in range(n_tasks):
        if len(tasks) >= target_tasks:
            break
        # Pick assignee
        if task_type == "prepare_transfer" and tn == 1:
            # Second task: at target store
            target_sid = rec["store_id"]  # destination might differ; not stored on rec, use rec.store_id as fallback
            assignee = assign_user_for_store(target_sid)
        else:
            assignee = assign_user_for_store(rec["store_id"])

        if rec["status"] == "completed":
            tstatus = "completed"
        elif rec["status"] == "approved":
            tstatus = random.choice(["pending", "in_progress"])
        elif rec["status"] == "converted_to_task":
            tstatus = task_status_dist[i % len(task_status_dist)]
        else:
            tstatus = "pending"

        deadline = NOW + timedelta(hours=random.randint(2, 72))
        if tstatus == "expired":
            deadline = NOW - timedelta(hours=random.randint(1, 24))

        completed_at = None
        completed_by = None
        completion_note = None
        if tstatus == "completed":
            completed_at = iso_dt(NOW - timedelta(hours=random.randint(1, 48)))
            completed_by = assignee
            completion_note = random.choice([
                "Tamamlandı, foto əlavə olundu.",
                "Endirim tətbiq olundu, etiketlər yeniləndi.",
                "Transfer hazırlandı və göndərildi.",
                "Sayım nəticəsi sistemə qeyd olundu.",
            ])

        title = TASK_TITLE_TEMPLATES[task_type].format(name=p["name"], qty=p.get("transfer_qty", random.randint(10, 40)))
        desc = TASK_DESC_TEMPLATES[task_type]
        priority = rec["priority"]

        tasks.append({
            "id": f"t-{task_seq:05d}",
            "recommendation_id": rec["id"],
            "assigned_to_user_id": assignee,
            "store_id": rec["store_id"],
            "product_id": rec["product_id"],
            "title": title,
            "description": desc,
            "task_type": task_type,
            "priority": priority,
            "status": tstatus,
            "deadline": iso_dt(deadline),
            "completed_at": completed_at,
            "completed_by_user_id": completed_by,
            "completion_note": completion_note,
            "proof_image_url": f"https://images.bravo.az/proof/{task_seq:05d}.jpg" if tstatus == "completed" else None,
            "created_at": iso_dt(NOW - timedelta(hours=random.randint(1, 60))),
        })
        task_seq += 1

print(f"Tasks: {len(tasks)}")

# ---------- TRANSFERS ----------
transfers = []
transfer_seq = 1
target_transfers = random.randint(17, 22)

# Spotlight transfers from yogurt + milk
spotlight_transfers = [
    {
        "rec_id": spotlight_rec_ids["p-demo-yogurt"],
        "pid": "p-demo-yogurt", "from": "s-001", "to": "s-002", "qty": 30,
    },
    {
        "rec_id": spotlight_rec_ids["p-demo-milk"],
        "pid": "p-demo-milk", "from": "s-004", "to": "s-007", "qty": 80,
    },
]

for st in spotlight_transfers:
    p = product_index[st["pid"]]
    target_v = 18 if st["pid"] == "p-demo-yogurt" else 50
    days = next(r["days_to_expiry"] for r in risk_predictions if r["product_id"] == st["pid"])
    sales = next(r["avg_daily_sales_7d"] for r in risk_predictions if r["product_id"] == st["pid"])
    stock = next(r["current_stock"] for r in risk_predictions if r["product_id"] == st["pid"])
    m = scenario_transfer(stock, sales, days, p["sale_price"], st["qty"], target_v)
    transfers.append({
        "id": f"tr-{transfer_seq:04d}",
        "recommendation_id": st["rec_id"],
        "product_id": st["pid"],
        "from_store_id": st["from"],
        "to_store_id": st["to"],
        "quantity": st["qty"],
        "transfer_cost": m["transfer_cost"],
        "expected_sales_value": m["recovered_value"],
        "net_saved_value": m["net_saved"],
        "status": "suggested",
        "created_at": iso_dt(NOW - timedelta(hours=2)),
        "completed_at": None,
    })
    transfer_seq += 1

# Other transfers from transfer recs
transfer_recs = [r for r in recommendations if r["recommendation_type"] in ("transfer", "combined", "discount")
                 and r["id"] not in spotlight_rec_ids.values()]
# also pull from any rec whose chosen scenario was transfer
transfer_chosen_recs = []
for r in recommendations:
    if r["id"] in spotlight_rec_ids.values():
        continue
    chosen = next((s for s in scenarios if s["recommendation_id"] == r["id"] and s["is_recommended"]), None)
    if chosen and chosen["scenario_type"] in ("transfer", "combined") and r not in transfer_recs:
        transfer_chosen_recs.append(r)
transfer_recs = transfer_recs + transfer_chosen_recs
random.shuffle(transfer_recs)
transfer_status_dist = ["suggested"] * 5 + ["approved"] * 3 + ["preparing"] * 3 + ["in_transit"] * 2 + ["received"] * 2 + ["completed"] * 4 + ["cancelled"] * 1

for i, rec in enumerate(transfer_recs):
    if len(transfers) >= target_transfers:
        break
    p = product_index[rec["product_id"]]
    rp = next(r for r in risk_predictions if r["id"] == rec["risk_prediction_id"])
    other_stores = [s["id"] for s in stores if s["id"] != rec["store_id"]]
    to_sid = random.choice(other_stores)
    qty = max(10, min(rp["current_stock"] // 2, random.randint(15, 60)))
    target_v = max(2, rp["avg_daily_sales_7d"] * random.uniform(1.3, 2.0))
    m = scenario_transfer(rp["current_stock"], rp["avg_daily_sales_7d"], rp["days_to_expiry"], p["sale_price"], qty, target_v)
    status = transfer_status_dist[i % len(transfer_status_dist)]
    completed_at = iso_dt(NOW - timedelta(hours=random.randint(1, 36))) if status == "completed" else None
    transfers.append({
        "id": f"tr-{transfer_seq:04d}",
        "recommendation_id": rec["id"],
        "product_id": rec["product_id"],
        "from_store_id": rec["store_id"],
        "to_store_id": to_sid,
        "quantity": qty,
        "transfer_cost": m["transfer_cost"],
        "expected_sales_value": m["recovered_value"],
        "net_saved_value": m["net_saved"],
        "status": status,
        "created_at": iso_dt(NOW - timedelta(hours=random.randint(2, 72))),
        "completed_at": completed_at,
    })
    transfer_seq += 1

print(f"Transfers: {len(transfers)}")

# ---------- DISCOUNTS ----------
discounts = []
discount_seq = 1
target_discounts = random.randint(22, 32)

discount_recs = [r for r in recommendations if r["recommendation_type"] in ("discount", "bundle", "combined")]
discount_status_dist = ["suggested"] * 9 + ["approved"] * 6 + ["active"] * 6 + ["completed"] * 7 + ["rejected"] * 2 + ["expired"] * 1

# Spotlight discounts (chicken + salad always)
spotlight_disc = [
    ("p-demo-chicken", spotlight_rec_ids["p-demo-chicken"], 0.30),
    ("p-demo-salad",   spotlight_rec_ids["p-demo-salad"],   0.25),
]

for pid, rid, dpct in spotlight_disc:
    p = product_index[pid]
    discounted = p["sale_price"] * (1 - dpct)
    margin = (discounted - p["cost_price"]) / discounted if discounted > 0 else 0
    sid = next(r["store_id"] for r in recommendations if r["id"] == rid)
    discounts.append({
        "id": f"d-{discount_seq:04d}",
        "recommendation_id": rid,
        "product_id": pid,
        "store_id": sid,
        "discount_pct": dpct,
        "start_datetime": iso_dt(NOW),
        "end_datetime": iso_dt(NOW + timedelta(days=2)),
        "expected_sales_uplift_pct": int((DISCOUNT_UPLIFT[round(dpct, 2)] - 1) * 100),
        "minimum_margin_checked": True,
        "current_margin_after_discount_pct": round(margin, 4),
        "status": "suggested",
    })
    discount_seq += 1

random.shuffle(discount_recs)
for i, rec in enumerate(discount_recs):
    if rec["id"] in spotlight_rec_ids.values():
        continue
    if len(discounts) >= target_discounts:
        break
    p = product_index[rec["product_id"]]
    chosen_scen = next((s for s in scenarios if s["recommendation_id"] == rec["id"] and s["is_recommended"]), None)
    if not chosen_scen:
        continue
    # For combined/bundle, fall back to discount portion
    dpct = chosen_scen.get("parameters", {}).get("discount_pct",
            chosen_scen.get("parameters", {}).get("bundle_discount_pct", 0.15))
    if dpct == 0 or dpct is None:
        dpct = 0.15
    discounted = p["sale_price"] * (1 - dpct)
    margin = (discounted - p["cost_price"]) / discounted if discounted > 0 else 0
    status = discount_status_dist[i % len(discount_status_dist)]
    start_offset = random.randint(-2, 1)
    discounts.append({
        "id": f"d-{discount_seq:04d}",
        "recommendation_id": rec["id"],
        "product_id": rec["product_id"],
        "store_id": rec["store_id"],
        "discount_pct": dpct,
        "start_datetime": iso_dt(NOW + timedelta(days=start_offset)),
        "end_datetime": iso_dt(NOW + timedelta(days=start_offset + random.randint(1, 4))),
        "expected_sales_uplift_pct": int((DISCOUNT_UPLIFT.get(round(dpct, 2), 1.5) - 1) * 100),
        "minimum_margin_checked": margin >= p["minimum_margin_pct"],
        "current_margin_after_discount_pct": round(margin, 4),
        "status": status,
    })
    discount_seq += 1

print(f"Discounts: {len(discounts)}")

# ---------- AUDIT LOGS ----------
audit_logs = []
audit_seq = 1
target_audits = random.randint(240, 320)

ACTIONS = [
    ("created", "recommendation"),
    ("approved", "recommendation"),
    ("rejected", "recommendation"),
    ("converted_to_task", "recommendation"),
    ("completed", "task"),
    ("status_changed", "task"),
    ("reassigned", "task"),
    ("approved", "transfer"),
    ("status_changed", "transfer"),
    ("activated", "discount"),
    ("created", "discount"),
    ("resolved", "data_issue"),
    ("created", "data_issue"),
    ("updated", "product"),
]

# Audit each spotlight rec creation
for pid, rid in spotlight_rec_ids.items():
    rec = next(r for r in recommendations if r["id"] == rid)
    audit_logs.append({
        "id": f"aud-{audit_seq:05d}",
        "user_id": "u-001",
        "action": "created",
        "entity_type": "recommendation",
        "entity_id": rid,
        "old_value": None,
        "new_value": {"status": "pending_approval", "type": rec["recommendation_type"]},
        "created_at": rec["created_at"],
        "ip_address": f"10.0.{random.randint(1, 200)}.{random.randint(1, 200)}",
    })
    audit_seq += 1

# Generate audits for all approved/rejected recommendations
for rec in recommendations:
    if rec["status"] in ("approved", "converted_to_task", "completed", "rejected"):
        action = "approved" if rec["approved_by_user_id"] else "rejected"
        user = rec["approved_by_user_id"] or rec["rejected_by_user_id"]
        audit_logs.append({
            "id": f"aud-{audit_seq:05d}",
            "user_id": user or "u-005",
            "action": action,
            "entity_type": "recommendation",
            "entity_id": rec["id"],
            "old_value": {"status": "pending_approval"},
            "new_value": {"status": rec["status"]},
            "created_at": rec["approved_at"] or rec["rejected_at"] or rec["created_at"],
            "ip_address": f"10.0.{random.randint(1, 200)}.{random.randint(1, 200)}",
        })
        audit_seq += 1

# Generate audits for completed tasks
for t in tasks:
    if t["status"] == "completed":
        audit_logs.append({
            "id": f"aud-{audit_seq:05d}",
            "user_id": t["completed_by_user_id"] or t["assigned_to_user_id"],
            "action": "completed",
            "entity_type": "task",
            "entity_id": t["id"],
            "old_value": {"status": "in_progress"},
            "new_value": {"status": "completed"},
            "created_at": t["completed_at"],
            "ip_address": f"10.0.{random.randint(1, 200)}.{random.randint(1, 200)}",
        })
        audit_seq += 1

# Pad with random audits
while len(audit_logs) < target_audits:
    action, entity = random.choice(ACTIONS)
    user = random.choice(users)["id"]
    audit_logs.append({
        "id": f"aud-{audit_seq:05d}",
        "user_id": user,
        "action": action,
        "entity_type": entity,
        "entity_id": f"x-{random.randint(1, 999):03d}",
        "old_value": {"status": "old"} if action != "created" else None,
        "new_value": {"status": "new"},
        "created_at": iso_dt(NOW - timedelta(hours=random.randint(1, 720))),
        "ip_address": f"10.0.{random.randint(1, 200)}.{random.randint(1, 200)}",
    })
    audit_seq += 1

print(f"Audit logs: {len(audit_logs)}")

# ---------- DATA QUALITY ISSUES ----------
data_issues = []
issue_seq = 1
target_issues = random.randint(14, 18)

ISSUE_TYPES = [
    ("missing_expiry",          "Bu məhsul üçün son istifadə tarixi sistemdə qeyd olunmayıb."),
    ("stock_mismatch",          "Fiziki sayım ilə sistem stoku arasında uyğunsuzluq aşkarlandı."),
    ("stale_inventory",         "Stok məlumatı 24 saatdan çoxdur ki, yenilənməyib."),
    ("no_sales_high_stock",     "Yüksək stok olmasına baxmayaraq son 7 gündə satış qeyd olunmayıb."),
    ("inconsistent_batch",      "Batch kodu və ya tarixi uyğunsuzluq göstərir."),
    ("low_confidence_recommendation", "Tövsiyə aşağı etibarlılıq göstəricisi ilə yaradıldı."),
]

for _ in range(target_issues):
    itype, desc = random.choice(ISSUE_TYPES)
    sev = random.choices(["low", "medium", "high"], weights=[40, 40, 20])[0]
    p = random.choice(products)
    sid = random.choice(stores)["id"]
    rel_batch = next((b["id"] for b in batches if b["product_id"] == p["id"] and b["store_id"] == sid), None)
    status = random.choices(["open", "investigating", "resolved", "ignored"], weights=[40, 25, 30, 5])[0]
    created = NOW - timedelta(hours=random.randint(1, 240))
    resolved = iso_dt(created + timedelta(hours=random.randint(2, 48))) if status == "resolved" else None
    data_issues.append({
        "id": f"di-{issue_seq:04d}",
        "issue_type": itype,
        "severity": sev,
        "product_id": p["id"],
        "store_id": sid,
        "batch_id": rel_batch,
        "description": desc,
        "status": status,
        "created_at": iso_dt(created),
        "resolved_at": resolved,
    })
    issue_seq += 1

print(f"Data quality issues: {len(data_issues)}")

# ---------- NOTIFICATIONS ----------
notifications = []
notif_seq = 1
target_notifs = random.randint(35, 45)

NOTIF_TEMPLATES = {
    "critical_risk": ("Kritik risk: {name}", "{name} məhsulu üçün risk skoru kritik səviyyəyə çatdı."),
    "approval_needed": ("Təsdiq gözləyir: {name}", "{name} üçün AI tövsiyəsi sizin təsdiqinizi gözləyir."),
    "task_assigned": ("Yeni tapşırıq: {name}", "Sizə yeni tapşırıq təyin edildi — {name}."),
    "task_deadline_approaching": ("Son müddət yaxınlaşır", "{name} tapşırığının son müddəti 2 saatdan az qalıb."),
    "task_expired": ("Tapşırıq vaxtı keçdi", "{name} tapşırığı son müddətdən keçdi."),
    "transfer_pending": ("Transfer gözləyir", "{name} üçün transfer əməliyyatı təsdiq gözləyir."),
    "stock_mismatch": ("Stok uyğunsuzluğu", "{name} üçün fiziki sayım fərqi aşkarlandı."),
    "low_data_confidence": ("Aşağı etibarlılıq", "{name} üçün AI tövsiyəsi aşağı etibarlılıqla yaradıldı."),
    "supplier_issue": ("Tədarükçü problemi", "{name} tədarükçüsü ilə bağlı problem aşkarlandı."),
    "result_ready": ("Nəticə hazırdır", "{name} üçün AI tövsiyəsinin real nəticəsi hesablandı."),
}

NOTIF_BY_ROLE = {
    "ceo":               ["critical_risk", "result_ready"],
    "coo":               ["critical_risk", "result_ready", "task_expired"],
    "cfo":               ["result_ready"],
    "cio":               ["low_data_confidence", "stock_mismatch"],
    "category_manager":  ["approval_needed", "supplier_issue", "critical_risk"],
    "purchase_manager":  ["approval_needed", "supplier_issue"],
    "logistics_manager": ["transfer_pending", "task_assigned"],
    "store_manager":     ["approval_needed", "task_deadline_approaching", "stock_mismatch", "critical_risk"],
    "supervisor":        ["task_assigned", "task_deadline_approaching"],
    "employee":          ["task_assigned", "task_deadline_approaching", "task_expired"],
}

# Make sure each user has 2-5 notifications
for u in users:
    n_notifs = random.randint(2, 5)
    types_for_role = NOTIF_BY_ROLE.get(u["role"], ["critical_risk"])
    for _ in range(n_notifs):
        if len(notifications) >= target_notifs:
            break
        ntype = random.choice(types_for_role)
        title_t, msg_t = NOTIF_TEMPLATES[ntype]
        # Pick a related entity
        if ntype in ("critical_risk", "approval_needed", "result_ready", "low_data_confidence"):
            ent_type = "recommendation"
            rec = random.choice(recommendations)
            ent_id = rec["id"]
            name = product_index[rec["product_id"]]["name"]
        elif ntype in ("task_assigned", "task_deadline_approaching", "task_expired"):
            ent_type = "task"
            user_tasks = [t for t in tasks if t["assigned_to_user_id"] == u["id"]]
            t = random.choice(user_tasks) if user_tasks else random.choice(tasks)
            ent_id = t["id"]
            name = product_index[t["product_id"]]["name"]
        elif ntype == "transfer_pending":
            ent_type = "transfer"
            tr = random.choice(transfers) if transfers else None
            ent_id = tr["id"] if tr else None
            name = product_index[tr["product_id"]]["name"] if tr else "Məhsul"
        elif ntype == "stock_mismatch":
            ent_type = "data_issue"
            di = random.choice(data_issues) if data_issues else None
            ent_id = di["id"] if di else None
            p = product_index[di["product_id"]] if di else random.choice(products)
            name = p["name"]
        else:
            ent_type = "supplier"
            sup = random.choice(suppliers)
            ent_id = sup["id"]
            name = sup["name"]

        priority = "critical" if ntype == "critical_risk" else random.choice(["low", "medium", "high"])
        notifications.append({
            "id": f"n-{notif_seq:04d}",
            "user_id": u["id"],
            "type": ntype,
            "priority": priority,
            "title": title_t.format(name=name),
            "message": msg_t.format(name=name),
            "entity_type": ent_type,
            "entity_id": ent_id,
            "is_read": random.random() < 0.4,
            "created_at": iso_dt(NOW - timedelta(hours=random.randint(0, 96))),
        })
        notif_seq += 1
    if len(notifications) >= target_notifs:
        break

print(f"Notifications: {len(notifications)}")

# ---------- KPI SNAPSHOTS ----------
kpi_snaps = []
kpi_seq = 1
# Generate per-store-per-day for last 30 days = 8 stores * 30 days = 240 + 30 network-wide = 270
for d_offset in range(30, 0, -1):
    d = TODAY - timedelta(days=d_offset)
    # Network-wide
    pot = random.randint(8000, 18000)
    actual = random.randint(2000, 6000)
    rec_val = random.randint(3500, 9500)
    net = rec_val - random.randint(500, 1500)
    kpi_snaps.append({
        "id": f"kpi-{kpi_seq:05d}",
        "date": iso_d(d),
        "store_id": None,
        "category_id": None,
        "potential_loss": float(pot),
        "actual_loss": float(actual),
        "recovered_value": float(rec_val),
        "net_saved_value": float(net),
        "waste_kg": round(random.uniform(80, 220), 1),
        "recommendations_generated": random.randint(15, 40),
        "recommendations_accepted": random.randint(8, 25),
        "recommendations_rejected": random.randint(2, 8),
        "tasks_created": random.randint(12, 35),
        "tasks_completed": random.randint(8, 28),
        "tasks_expired": random.randint(0, 4),
        "transfers_completed": random.randint(0, 5),
        "discounts_applied": random.randint(2, 12),
        "avg_data_confidence": round(random.uniform(72, 92), 2),
        "avg_stock_accuracy_pct": round(random.uniform(82, 96), 2),
    })
    kpi_seq += 1

# Per-store-per-day
for s in stores:
    for d_offset in range(30, 0, -1):
        d = TODAY - timedelta(days=d_offset)
        pot = random.randint(800, 3000)
        actual = random.randint(150, 800)
        rec_val = random.randint(400, 1600)
        net = rec_val - random.randint(50, 300)
        kpi_snaps.append({
            "id": f"kpi-{kpi_seq:05d}",
            "date": iso_d(d),
            "store_id": s["id"],
            "category_id": None,
            "potential_loss": float(pot),
            "actual_loss": float(actual),
            "recovered_value": float(rec_val),
            "net_saved_value": float(net),
            "waste_kg": round(random.uniform(8, 35), 1),
            "recommendations_generated": random.randint(2, 8),
            "recommendations_accepted": random.randint(1, 5),
            "recommendations_rejected": random.randint(0, 2),
            "tasks_created": random.randint(2, 7),
            "tasks_completed": random.randint(1, 6),
            "tasks_expired": random.randint(0, 1),
            "transfers_completed": random.randint(0, 2),
            "discounts_applied": random.randint(0, 3),
            "avg_data_confidence": round(random.uniform(68, 95), 2),
            "avg_stock_accuracy_pct": round(random.uniform(78, 97), 2),
        })
        kpi_seq += 1

print(f"KPI snapshots: {len(kpi_snaps)}")

# ---------- WRITE ALL FILES ----------
write_json("users.json",                     users)
write_json("stores.json",                    stores)
write_json("categories.json",                categories)
write_json("suppliers.json",                 suppliers)
write_json("products.json",                  products)
write_json("inventory-batches.json",         batches)
write_json("inventory-snapshots.json",       snapshots)
write_json("sales.json",                     sales_records)
write_json("waste-records.json",             waste_records)
write_json("risk-predictions.json",          risk_predictions)
write_json("recommendations.json",           recommendations)
write_json("recommendation-scenarios.json",  scenarios)
write_json("tasks.json",                     tasks)
write_json("transfers.json",                 transfers)
write_json("discounts.json",                 discounts)
write_json("audit-logs.json",                audit_logs)
write_json("data-quality-issues.json",       data_issues)
write_json("notifications.json",             notifications)
write_json("kpi-snapshots.json",             kpi_snaps)

# ---------- META + README ----------
counts = {
    "users": len(users),
    "stores": len(stores),
    "categories": len(categories),
    "suppliers": len(suppliers),
    "products": len(products),
    "inventory-batches": len(batches),
    "inventory-snapshots": len(snapshots),
    "sales": len(sales_records),
    "waste-records": len(waste_records),
    "risk-predictions": len(risk_predictions),
    "recommendations": len(recommendations),
    "recommendation-scenarios": len(scenarios),
    "tasks": len(tasks),
    "transfers": len(transfers),
    "discounts": len(discounts),
    "audit-logs": len(audit_logs),
    "data-quality-issues": len(data_issues),
    "notifications": len(notifications),
    "kpi-snapshots": len(kpi_snaps),
}

meta = {
    "version": "1.0.0",
    "generated_at": "2026-05-15",
    "source": "synthetic-v1",
    "counts": counts,
}

with open(OUT / "_meta.json", "w", encoding="utf-8") as f:
    json.dump(meta, f, ensure_ascii=False, indent=2)

readme_lines = [
    "# Bravo FreshFlow AI — Mock Data",
    "",
    "Synthetic data for the hackathon demo. Generated on 2026-05-15 from `bravo-data/generate.py`.",
    "All schemas conform to BRAVO_FRESHFLOW_SPEC.md section 7.",
    "",
    "| File | Records | Description |",
    "|---|---|---|",
    f"| users.json | {len(users)} | 12 demo users covering all 10 roles, Azerbaijani names |",
    f"| stores.json | {len(stores)} | 8 Bravo stores (7 in Bakı, 1 in Sumqayıt) with lat/lng |",
    f"| categories.json | {len(categories)} | 10 product categories, first 6 perishable |",
    f"| suppliers.json | {len(suppliers)} | Suppliers with risk scores 15–90 |",
    f"| products.json | {len(products)} | Includes 5 spotlight products (Qatıq 500q, Toyuq Filesi, Banan, Hazır Salat, Süd 1L) |",
    f"| inventory-batches.json | {len(batches)} | Active/depleted/expired batches across stores |",
    f"| inventory-snapshots.json | {len(snapshots)} | Latest stock state per product × store |",
    f"| sales.json | {len(sales_records)} | Daily aggregates for last 30 days |",
    f"| waste-records.json | {len(waste_records)} | Historical waste with reason + recorded_by |",
    f"| risk-predictions.json | {len(risk_predictions)} | Risk-scored product × store records (formula-verified) |",
    f"| recommendations.json | {len(recommendations)} | AI recommendations, mixed status distribution |",
    f"| recommendation-scenarios.json | {len(scenarios)} | 3–5 scenarios per recommendation, exactly one is_recommended |",
    f"| tasks.json | {len(tasks)} | Manager + employee tasks, mixed statuses |",
    f"| transfers.json | {len(transfers)} | Inter-store transfer suggestions and history |",
    f"| discounts.json | {len(discounts)} | Discount campaigns with margin checks |",
    f"| audit-logs.json | {len(audit_logs)} | Action history for recommendations/tasks/transfers/discounts |",
    f"| data-quality-issues.json | {len(data_issues)} | Open and resolved data integrity issues |",
    f"| notifications.json | {len(notifications)} | Per-user notification feed |",
    f"| kpi-snapshots.json | {len(kpi_snaps)} | Daily KPI rollups (network-wide + per-store) |",
    "",
    "## Spotlight demo products",
    "All five spotlight products from spec section 8 exist with the exact specs:",
    "- `p-demo-yogurt`  Qatıq 500q     @ Bravo Nərimanov (s-001) — combined recommendation",
    "- `p-demo-chicken` Toyuq Filesi   @ Bravo 28 May    (s-003) — urgent 30% discount",
    "- `p-demo-banana`  Banan          @ Bravo Yasamal   (s-005) — bundle + shelf",
    "- `p-demo-salad`   Hazır Salat    @ Bravo Gənclik   (s-002) — 25% discount",
    "- `p-demo-milk`    Süd 1L         @ Bravo Elmlər    (s-004) — transfer to Sumqayıt",
    "",
    "## Regenerate",
    "From `bravo-data/`: `python generate.py` (deterministic seed = 20260515).",
    "",
]
with open(OUT / "README.md", "w", encoding="utf-8") as f:
    f.write("\n".join(readme_lines))

print("\n_meta.json + README.md written.")
print("\nDONE.")
