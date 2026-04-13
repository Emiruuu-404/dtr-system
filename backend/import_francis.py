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
        # Standardize spaces
        time_str = time_str.replace('\u202f', ' ').replace('\xa0', ' ').strip()
        if time_str.count(':') >= 2: return None
        return datetime.strptime(time_str, "%I:%M %p").time()
    except:
        try: return datetime.strptime(time_str.replace(" ", ""), "%I:%M%p").time()
        except: return None

def import_francis():
    print("🎯 Importing specifically for Noche, Francis C. ...")
    intern = Intern.objects.get(student_id="22-0003")
    
    # Clear existing to be sure
    Attendance.objects.filter(student_id=intern.student_id).delete()
    
    with open(FILE_PATH, mode='r', encoding='utf-8') as f:
        reader = csv.reader(f)
        rows = list(reader)

    # For Francis, his block is roughly rows 81 to 114
    processed_count = 0
    for idx in range(80, 115): 
        row = rows[idx]
        
        offset = 0 
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

                Attendance.objects.create(
                    student_id=intern.student_id,
                    date=date_obj,
                    am_time_in=mk_aware(date_obj, t_ia),
                    am_time_out=mk_aware(date_obj, t_oa),
                    pm_time_in=mk_aware(date_obj, t_ip),
                    pm_time_out=mk_aware(date_obj, t_op),
                )
                processed_count += 1

    # Final check
    intern.refresh_from_db()
    print(f"\n✨ Done! Francis Total Hours: {intern.total_hours}")
    print(f"Total entries: {processed_count}")

if __name__ == "__main__":
    import_francis()
