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
        # Standardize spaces - handles narrow no-break space \u202f and others
        time_str = time_str.replace('\u202f', ' ').replace('\xa0', ' ').strip()
        
        # If it's a duration like "8:00:00", we don't want it for time in/out
        if time_str.count(':') == 2:
            return None
            
        return datetime.strptime(time_str, "%I:%M %p").time()
    except Exception:
        try:
             # Try without space
             return datetime.strptime(time_str.replace(" ", ""), "%I:%M%p").time()
        except Exception:
            return None

def import_dtr():
    print("🚀 Starting Smart DTR Import (Detecting Column Shifts)...")
    
    with open(FILE_PATH, mode='r', encoding='utf-8') as f:
        reader = csv.reader(f)
        rows = list(reader)

    current_intern = None
    offset = 0 # Dynamic offset for columns
    
    for row_idx, row in enumerate(rows):
        # Identify Intern Name in row and set offset
        potential_name = ""
        potential_offset = 0
        
        if len(row) > 1 and row[1] and "," in row[1] and not row[1].strip().replace(".","").isdigit():
            potential_name = row[1].strip().upper()
            potential_offset = 0
        elif len(row) > 2 and row[2] and "," in row[2] and not row[2].strip().replace(".","").isdigit():
            potential_name = row[2].strip().upper()
            potential_offset = 1 # Shifted by 1 extra column
        
        if potential_name:
            last_name = potential_name.split(',')[0].strip()
            intern = Intern.objects.filter(name__icontains=last_name).first()
            if intern:
                current_intern = intern
                offset = potential_offset
                print(f"📍 Found intern block for: {current_intern.name} ({current_intern.student_id}) with Offset: {offset}")
            else:
                print(f"⚠️ Warning: Detected name '{potential_name}' but no matching intern in DB.")
        
        if not current_intern:
            continue
            
        # Standard month positions (based on 1-empty-column at start)
        # We add 'offset' to each column index
        MONTHS = [
            {"name": "Jan", "m": 1, "d": 1, "ai": 2, "ao": 3, "pi": 4, "po": 5},
            {"name": "Feb", "m": 2, "d": 8, "ai": 9, "ao": 10, "pi": 11, "po": 12},
            {"name": "Mar", "m": 3, "d": 15, "ai": 16, "ao": 17, "pi": 18, "po": 19},
            {"name": "Apr", "m": 4, "d": 22, "ai": 23, "ao": 24, "pi": 25, "po": 26},
        ]

        for m_data in MONTHS:
            d_col = m_data["d"] + offset
            if len(row) > d_col and row[d_col].strip().isdigit():
                day = int(row[d_col].strip())
                month = m_data["m"]
                year = 2026
                
                try:
                    date_obj = datetime(year, month, day).date()
                except ValueError:
                    continue
                
                am_in_t = parse_time(row[m_data["ai"] + offset])
                am_out_t = parse_time(row[m_data["ao"] + offset])
                pm_in_t = parse_time(row[m_data["pi"] + offset])
                pm_out_t = parse_time(row[m_data["po"] + offset])
                
                if not any([am_in_t, am_out_t, pm_in_t, pm_out_t]):
                    continue
                
                def combine(d, t):
                    if not t: return None
                    from django.utils import timezone
                    dt = datetime.combine(d, t)
                    return timezone.make_aware(dt)

                am_in_dt = combine(date_obj, am_in_t)
                am_out_dt = combine(date_obj, am_out_t)
                pm_in_dt = combine(date_obj, pm_in_t)
                pm_out_dt = combine(date_obj, pm_out_t)

                Attendance.objects.update_or_create(
                    student_id=current_intern.student_id,
                    date=date_obj,
                    defaults={
                        "am_time_in": am_in_dt,
                        "am_time_out": am_out_dt,
                        "pm_time_in": pm_in_dt,
                        "pm_time_out": pm_out_dt,
                    }
                )

    print("✅ Smart Transfer Complete!")

if __name__ == "__main__":
    import_dtr()
