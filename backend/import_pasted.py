import os
import django
import csv
from datetime import datetime, time
from django.utils import timezone

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "ojt_backend.settings")
django.setup()

from attendance.models import Attendance, Intern

def parse_time(time_str):
    if not time_str or time_str.strip() in ["", "-", "None"]:
        return None
    try:
        time_str = time_str.replace('\u202f', ' ').replace('\xa0', ' ').strip()
        if time_str.count(':') >= 2: return None
        return datetime.strptime(time_str, "%I:%M %p").time()
    except Exception:
        try: return datetime.strptime(time_str.replace(" ", ""), "%I:%M%p").time()
        except: return None

def get_or_create_intern(name_str):
    if not name_str or len(name_str) < 5: return None
    # Example format: 'Llenas, Aleron Jay C.', 'NABOR, ALWYN D.', 'DELA CRUZ ,TRISTAN MARC P.'
    if ',' in name_str:
        last, first = name_str.split(',', 1)
        last_name = last.strip().title()
        formatted_name = f"{first.strip().title()} {last_name}"
    else:
        parts = name_str.split()
        last_name = parts[-1].title()
        formatted_name = name_str.title()

    student_id = f"22-{last_name[:3].upper()}{len(name_str)}"
    email = f"{student_id.lower()}@cbsua.edu.ph"
    intern, created = Intern.objects.get_or_create(
        name=formatted_name,
        defaults={"student_id": student_id, "email": email, "is_active": True}
    )
    return intern

def process_block(intern, block_rows):
    print(f"Processing {intern.name}...")
    
    # We will just iterate through the rows, looking for date numbers
    # Because of shifting in TSV, we'll scan row items for times and match them.
    month_map = {"JANUARY": 1, "FEBRUARY": 2, "MARCH": 3, "APRIL": 4}
    
    # We can use the column structure:
    # A typical row has chunks: [day, in, out, in, out, total] x 4 months.
    MONTH_GROUPS = [
        {"m": 1, "d": 0, "ai": 1, "ao": 2, "pi": 3, "po": 4},
        {"m": 2, "d": 6, "ai": 7, "ao": 8, "pi": 9, "po": 10},
        {"m": 3, "d": 12, "ai": 13, "ao": 14, "pi": 15, "po": 16},
        {"m": 4, "d": 18, "ai": 19, "ao": 20, "pi": 21, "po": 22},
    ]

    for row in block_rows:
        for mg in MONTH_GROUPS:
            if len(row) > mg["d"] and str(row[mg["d"]]).strip().isdigit():
                day = int(str(row[mg["d"]]).strip())
                try: date_obj = datetime(2026, mg["m"], day).date()
                except: continue
                
                t_ia = parse_time(row[mg["ai"]]) if len(row) > mg["ai"] else None
                t_oa = parse_time(row[mg["ao"]]) if len(row) > mg["ao"] else None
                t_ip = parse_time(row[mg["pi"]]) if len(row) > mg["pi"] else None
                t_op = parse_time(row[mg["po"]]) if len(row) > mg["po"] else None

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

def import_pasted():
    FILE_PATH = "pasted_data.tsv"
    with open(FILE_PATH, 'r', encoding='utf-8') as f:
        reader = csv.reader(f, delimiter='\t')
        rows = list(reader)

    current_intern = None
    intern_blocks = {}

    for row in rows:
        # Check if row has a name (look for comma and alphabetical characters in col 0, 1, or 2)
        found_name = False
        for i in range(min(3, len(row))):
            val = row[i].strip()
            # If it looks like a name: has comma (Format: LAST, FIRST)
            if ',' in val and len(val) > 10 and not val.replace('.','').isdigit() and "PROGRESS" not in val and "TOTAL" not in val:
                current_intern = get_or_create_intern(val)
                if current_intern:
                    if current_intern not in intern_blocks:
                        intern_blocks[current_intern] = []
                    found_name = True
                break
        
        # Also Emeir might not have a comma, "AMADO, EMEIR R." has. ALL DO.
        # So we just append row to current intern's block if valid
        if current_intern and not found_name:
            intern_blocks[current_intern].append(row)

    # Note: Aleron's block is at the very beginning, his name is below his records!
    # So we need to do a two-pass if necessary.
    # Actually, he is listed below. Let's just create an "Unknown" block first, then assign it.
    
    current_intern = None
    fallback_block = []
    blocks = {}
    
    for row in rows:
        name_candidate = None
        for i in range(min(3, len(row))):
            val = row[i].strip()
            if ',' in val and len(val) > 10 and "PROGRESS" not in val and "TOTAL" not in val:
                name_candidate = val
                break
        
        if name_candidate:
            current_intern = get_or_create_intern(name_candidate)
            if current_intern not in blocks:
                blocks[current_intern] = []
            # Prepend fallback block since Name appears after his table block
            blocks[current_intern].extend(fallback_block)
            fallback_block = []
        else:
            if current_intern: blocks[current_intern].append(row)
            else: fallback_block.append(row)

    for intern, block in blocks.items():
        # Let's standardize the row indices because sometimes there are empty columns at the beginning
        # We will shift left if the first item is empty
        clean_block = []
        for r in block:
            while len(r) > 0 and r[0].strip() == '':
                r.pop(0)
            if len(r) > 5:
                clean_block.append(r)
        
        process_block(intern, clean_block)
        intern.refresh_from_db()
        print(f"✅ Synced {intern.name} ({intern.total_hours} hrs)")

if __name__ == "__main__":
    import_pasted()
