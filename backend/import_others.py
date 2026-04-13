import os
import django
import csv
from datetime import datetime, time
from django.utils import timezone

# Setup Django
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "ojt_backend.settings")
django.setup()

from attendance.models import Attendance, Intern

FILE_PATH = "intern_data/dtr - Sheet1.csv"

def parse_time(time_str):
    if not time_str or time_str.strip() in ["", "-", "None"]:
        return None
    try:
        time_str = time_str.replace('\u202f', ' ').replace('\xa0', ' ').strip()
        if time_str.count(':') >= 2: return None
        return datetime.strptime(time_str, "%I:%M %p").time()
    except:
        try: return datetime.strptime(time_str.replace(" ", ""), "%I:%M%p").time()
        except: return None

def import_others():
    targets = [
        {"id": "22-0008", "name": "FERNANDEZ, ROSCEL D.", "offset": 1},
        {"id": "22-0009", "name": "CANAYA, KYLA B.", "offset": 1},
    ]
    
    with open(FILE_PATH, mode='r', encoding='utf-8') as f:
        reader = csv.reader(f)
        rows = list(reader)

    # Step 1: Find row indices for these names
    positions = []
    for idx, row in enumerate(rows):
        for t in targets:
            # Check col 1/2 for last name
            last_name = t["name"].split(',')[0].strip()
            for c_idx in [1, 2]:
                if len(row) > c_idx and last_name in row[c_idx].upper():
                    positions.append({"id": t["id"], "name": t["name"], "index": idx, "offset": c_idx-1})

    print(f"📊 Found {len(positions)} intern blocks for remainder.")

    for p in positions:
        print(f"🎯 Importing for {p['name']}...")
        intern = Intern.objects.get(student_id=p["id"])
        Attendance.objects.filter(student_id=intern.student_id).delete()
        
        # Scan 40 rows from the name start
        for r_idx in range(p["index"], p["index"] + 40):
            if r_idx >= len(rows): break
            row = rows[r_idx]
            offset = p["offset"]
            
            GROUPS = [
                {"m": 1, "d": 1, "ai": 2, "ao": 3, "pi": 4, "po": 5},
                {"m": 2, "d": 8, "ai": 9, "ao": 10, "pi": 11, "po": 12},
                {"m": 3, "d": 15, "ai": 16, "ao": 17, "pi": 18, "po": 19},
                {"m": 4, "d": 22, "ai": 23, "ao": 24, "pi": 25, "po": 26},
            ]

            for mg in GROUPS:
                d_idx = mg["d"] + offset
                if len(row) > d_idx and row[d_idx].strip().isdigit():
                    day = int(row[d_idx].strip())
                    try:
                        date_obj = datetime(2026, mg["m"], day).date()
                    except: continue
                    
                    t_ia = parse_time(row[mg["ai"] + offset])
                    t_oa = parse_time(row[mg["ao"] + offset])
                    t_ip = parse_time(row[mg["pi"] + offset])
                    t_op = parse_time(row[mg["po"] + offset])

                    if not any([t_ia, t_oa, t_ip, t_op]): continue

                    def mk_aware(d, t):
                        if not t: return None
                        return timezone.make_aware(datetime.combine(d, t))

                    Attendance.objects.update_or_create(
                        student_id=intern.student_id,
                        date=date_obj,
                        defaults={
                            "am_time_in": mk_aware(date_obj, t_ia),
                            "am_time_out": mk_aware(date_obj, t_oa),
                            "pm_time_in": mk_aware(date_obj, t_ip),
                            "pm_time_out": mk_aware(date_obj, t_op),
                        }
                    )
        
        intern.refresh_from_db()
        print(f"✨ Done! {p['name']} Total Hours: {intern.total_hours}")

if __name__ == "__main__":
    import_others()
