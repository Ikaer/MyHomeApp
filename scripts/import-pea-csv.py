import csv, json, re
from datetime import date
from pathlib import Path

csv_path = Path(r"e:\Workspace\MyHomeApp\data\savings\Suivi PEA - Actions PEA.csv")
out_path = Path(r"e:\Workspace\MyHomeApp\data\savings\transactions\pea-main.json")

month_map = {
    "janv": 1,
    "janv.": 1,
    "févr": 2,
    "févr.": 2,
    "fevr": 2,
    "fevr.": 2,
    "mars": 3,
    "avr": 4,
    "avr.": 4,
    "mai": 5,
    "juin": 6,
    "juil": 7,
    "juil.": 7,
    "août": 8,
    "aout": 8,
    "sept": 9,
    "sept.": 9,
    "oct": 10,
    "oct.": 10,
    "nov": 11,
    "nov.": 11,
    "déc": 12,
    "déc.": 12,
    "dec": 12,
    "dec.": 12,
}

type_map = {
    "Achat": "Buy",
    "Vente": "Sell",
    "Dividende": "Dividend",
    "Frais": "Fee",
}

num_re = re.compile(r"[^0-9,\-]")

def parse_eur(val: str) -> float:
    if val is None:
        return 0.0
    s = str(val).strip()
    if not s:
        return 0.0
    s = num_re.sub("", s)
    s = s.replace(",", ".")
    try:
        return float(s)
    except ValueError:
        return 0.0

def parse_date(s: str) -> str:
    s = s.strip()
    if not s:
        return ""
    parts = s.split("-")
    if len(parts) != 3:
        return s
    day = int(parts[0])
    month_str = parts[1].strip().lower()
    year = int(parts[2])
    month = month_map.get(month_str)
    if not month:
        return s
    return date(year, month, day).isoformat()

rows = []
with csv_path.open("r", encoding="utf-8") as f:
    reader = csv.DictReader(f)
    for i, row in enumerate(reader, start=1):
        tx_type_fr = (row.get("Type d'opération") or "").strip()
        tx_type = type_map.get(tx_type_fr, tx_type_fr)
        transaction = {
            "id": str(i),
            "date": parse_date(row.get("Date de l'opération", "")),
            "type": tx_type,
            "assetName": (row.get("Nom de l'action/ETF") or "").strip(),
            "isin": (row.get("Code ISIN") or "").strip(),
            "ticker": (row.get("Ticker") or "").strip(),
            "quantity": float(str(row.get("Nombre de parts") or "0").replace(",", ".")),
            "unitPrice": parse_eur(row.get("Prix unitaire")),
            "fees": parse_eur(row.get("Frais de courtage")),
            "ttf": parse_eur(row.get("TTF")),
            "totalAmount": parse_eur(row.get("Montant total de l operation")),
        }
        rows.append(transaction)

out_path.parent.mkdir(parents=True, exist_ok=True)
with out_path.open("w", encoding="utf-8") as f:
    json.dump(rows, f, ensure_ascii=False, indent=2)

print(f"Wrote {len(rows)} transactions to {out_path}")
