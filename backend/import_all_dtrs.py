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
        
        # If it's a duration like "8:00:00" or has 2 colons, skip it for log times
        if time_str.count(':') >= 2:
            return None
            
        return datetime.strptime(time_str, "%I:%M %p").time()
    except Exception:
        try:
             # Try without space
             return datetime.strptime(time_str.replace(" ", ""), "%I:%M%p").time()
        except Exception:
            try:
                # Try simple H:MM
                return datetime.strptime(time_str, "%H:%M").time()
            except:
                return None

def import_all_interns_robustly():
    print("🚀 Starting Robust DTR Import (Multi-Pass & Wide Scanning)...")
    
    with open(FILE_PATH, mode='r', encoding='utf-8') as f:
        reader = csv.reader(f)
        rows = list(reader)

    # Step 1: Find all intern names and their row indices
    intern_positions = []
    for idx, row in enumerate(rows):
        potential_name = ""
        # Check col 1, col 2 for names
        for col_idx in [1, 2]:
            if len(row) > col_idx and row[col_idx] and "," in row[col_idx] and not row[col_idx].strip().replace(".","").replace(":","").isdigit():
                name_str = row[col_idx].strip().upper()
                last_name = name_str.split(',')[0].strip()
                intern = Intern.objects.filter(name__icontains=last_name).first()
                if intern:
                    intern_positions.append({"index": idx, "intern": intern, "offset": col_idx - 1})
                    break
    
    if not intern_positions:
        print("❌ No interns found in CSV.")
        return

    print(f"📊 Identified {len(intern_positions)} intern blocks.")

    # Step 2: Process the file row by row, attributing to the correct intern
    for row_idx, row in enumerate(rows):
        # Determine which intern this row belongs to
        # Logic: find the intern whose name is closest to this row
        # But for the first intern, it can be rows above them.
        
        target_intern_info = None
        for i in range(len(intern_positions)):
            curr = intern_positions[i]
            next_pos = intern_positions[i+1]["index"] if i+1 < len(intern_positions) else 99999
            
            # If it's the first intern, rows 0 to next_pos belong to them
            if i == 0 and row_idx < next_pos:
                target_intern_info = curr
                break
            # For others, rows from their name to next_pos
            elif row_idx >= curr["index"] and row_idx < next_pos:
                target_intern_info = curr
                break

        if not target_intern_info:
            continue
            
        intern = target_intern_info["intern"]
        offset = target_intern_info["offset"]

        # MONTH Group indices (d, ai, ao, pi, po)
        # These are standard across all blocks
        MONTH_GROUPS = [
            {"m": 1, "d": 1, "ai": 2, "ao": 3, "pi": 4, "po": 5},
            {"m": 2, "d": 8, "ai": 9, "ao": 10, "pi": 11, "po": 12},
            {"m": 3, "d": 15, "ai": 16, "ao": 17, "pi": 18, "po": 19},
            {"m": 4, "d": 22, "ai": 23, "ao": 24, "pi": 25, "po": 26},
        ]

        for mg in MONTH_GROUPS:
            d_idx = mg["d"] + offset
            if len(row) > d_idx and row[d_idx].strip().isdigit():
                day = int(row[d_idx].strip())
                month = mg["m"]
                date_obj = None
                try:
                    date_obj = datetime(2026, month, day).date()
                except:
                    continue
                
                # Extract times
                t_in_am = parse_time(row[mg["ai"] + offset])
                t_out_am = parse_time(row[mg["ao"] + offset])
                t_in_pm = parse_time(row[mg["pi"] + offset])
                t_out_pm = parse_time(row[mg["po"] + offset])

                if not any([t_in_am, t_out_am, t_in_pm, t_out_pm]):
                    continue

                def mk_aware(d, t):
                    if not t: return None
                    return timezone.make_aware(datetime.combine(d, t))

                Attendance.objects.update_or_create(
                    student_id=intern.student_id,
                    date=date_obj,
                    defaults={
                        "am_time_in": mk_aware(date_obj, t_in_am),
                        "am_time_out": mk_aware(date_obj, t_out_am),
                        "pm_time_in": mk_aware(date_obj, t_in_pm),
                        "pm_time_out": mk_aware(date_obj, t_out_pm),
                    }
                )

    print("✅ Full Sync Complete!")

if __name__ == "__main__":
    import_all_interns_robustly()
