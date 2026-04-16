import os
import django
import gspread
from datetime import datetime, time
from django.utils import timezone
from google.oauth2.service_account import Credentials

# Setup Django
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "ojt_backend.settings")
django.setup()

from attendance.models import Attendance, Intern

def parse_time(time_str):
    if not time_str or str(time_str).strip() in ["", "-", "None"]:
        return None
    try:
        time_str = str(time_str).replace('\u202f', ' ').replace('\xa0', ' ').strip()
        if time_str.count(':') >= 2: return None
        return datetime.strptime(time_str, "%I:%M %p").time()
    except:
        try: return datetime.strptime(str(time_str).replace(" ", ""), "%I:%M%p").time()
        except: return None

def import_from_sheet():
    print("🚀 Connecting to Google Sheets API...")
    scopes = ["https://www.googleapis.com/auth/spreadsheets.readonly"]
    
    try:
        creds = Credentials.from_service_account_file('ojt_backend/google_credentials.json', scopes=scopes)
        client = gspread.authorize(creds)
    except Exception as e:
        print(f"❌ Error loading credentials: {e}")
        return

    # Use the spreadsheet ID from the URL in screenshot
    spreadsheet_id = "1ls22e9YR8yH6EfNfYXRuztGwcoitJEM_NEKqNT3wcB0"
    
    try:
        sheet = client.open_by_key(spreadsheet_id).worksheet("Sheet1")
        data = sheet.get_all_values()
    except gspread.exceptions.APIError as e:
        print(f"\n❌ API Error: {e}")
        print("💡 Did you share the Google Sheet with 'dtr-sheets-reader@dtr-system-493501.iam.gserviceaccount.com'?")
        print("Please click the 'Share' button on your Google Sheet and give the service account Viewer access.")
        return
    except Exception as e:
        print(f"❌ Error fetching sheet: {e}")
        return

    # Create Aleron if not exists
    student_id = "22-0001"
    intern, created = Intern.objects.get_or_create(
        student_id=student_id,
        defaults={"first_name": "Aleron Jay", "last_name": "Llenas", "email": "aleron@cbsua.edu.ph", "is_active": True}
    )
    if created:
        print(f"✅ Created Intern profile for {intern.first_name} {intern.last_name} ({student_id})")

    # Clear existing to be sure
    Attendance.objects.filter(student_id=intern.student_id).delete()
    print("🧹 Cleared old records for this intern...")

    processed_count = 0
    # Process the rows
    # Note: Using identical logic to import_aleron.py, but adjusting for 0-based index from list of lists
    # the indexes might need adjustment if hidden columns in sheets behave differently than CSV export.
    # From screenshot: 
    # Col B = Day (index 1), Col C = am_in (index 2), Col D = am_out (index 3), Col E = pm_in (index 4), Col F = pm_out (index 5)
    # Col J = Day (index 9), Col K = am_in (index 10), Col L = am_out (index 11), Col M = pm_in (index 12), Col N = pm_out (index 13)
    # Col P = Day (index 15), Col Q = am_in (index 16), Col R = am_out (index 17), Col S = pm_in (index 18), Col T = pm_out (index 19)
    # Col W = Day (index 22), Col X = am_in (index 23), Col Y = am_out (index 24), Col Z = pm_in (index 25), Col AA = pm_out (index 26)

    GROUPS = [
        {"m": 1, "d": 1, "ai": 2, "ao": 3, "pi": 4, "po": 5}, # Jan
        {"m": 2, "d": 9, "ai": 10, "ao": 11, "pi": 12, "po": 13}, # Feb
        {"m": 3, "d": 15, "ai": 16, "ao": 17, "pi": 18, "po": 19}, # Mar
        {"m": 4, "d": 22, "ai": 23, "ao": 24, "pi": 25, "po": 26}, # Apr
    ]

    for idx in range(3, min(34, len(data))): 
        row = data[idx]
        
        for mg in GROUPS:
            if len(row) > mg["d"] and row[mg["d"]].strip().isdigit():
                day = int(row[mg["d"]].strip())
                try:
                    date_obj = datetime(2026, mg["m"], day).date()
                except: continue
                
                t_ia = parse_time(row[mg["ai"]]) if len(row) > mg["ai"] else None
                t_oa = parse_time(row[mg["ao"]]) if len(row) > mg["ao"] else None
                t_ip = parse_time(row[mg["pi"]]) if len(row) > mg["pi"] else None
                t_op = parse_time(row[mg["po"]]) if len(row) > mg["po"] else None

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
                # print(f"  + Added record for {date_obj}")

    intern.refresh_from_db()
    print(f"\n✨ Success! Imported entries: {processed_count}")
    print(f"Total Cumulative Hours: {intern.total_hours}")

if __name__ == "__main__":
    import_from_sheet()
