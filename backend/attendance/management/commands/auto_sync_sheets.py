from django.core.management.base import BaseCommand
from django.utils import timezone
from attendance.models import Attendance, Intern
from datetime import datetime
import gspread
from google.oauth2.service_account import Credentials
import os

class Command(BaseCommand):
    help = 'Auto-syncs attendance records directly from Google Sheets API'

    def parse_time(self, time_str):
        if not time_str or time_str.strip() in ["", "-", "None"]:
            return None
        try:
            time_str = time_str.replace('\u202f', ' ').replace('\xa0', ' ').strip()
            if time_str.count(':') >= 2: return None
            return datetime.strptime(time_str, "%I:%M %p").time()
        except:
            try: return datetime.strptime(time_str.replace(" ", ""), "%I:%M%p").time()
            except: return None

    def get_or_create_intern(self, name_str):
        if not name_str or len(name_str) < 5: return None
        if ',' in name_str:
            last, first = name_str.split(',', 1)
            last_name = last.strip().title()
            formatted_name = f"{first.strip().title()} {last_name}"
            raw_first = first.strip().split()[0].title()
        else:
            parts = name_str.split()
            last_name = parts[-1].title()
            formatted_name = name_str.title()
            raw_first = parts[0].title()

        from django.db.models import Q
        existing = Intern.objects.filter(name__icontains=raw_first).filter(name__icontains=last_name).order_by('id').first()
        if existing:
            return existing

        student_id = f"22-{last_name[:3].upper()}{len(name_str)}"
        email = f"{student_id.lower()}@cbsua.edu.ph"
        intern, created = Intern.objects.get_or_create(
            name=formatted_name,
            defaults={"student_id": student_id, "email": email, "is_active": True}
        )
        return intern

    def handle(self, *args, **kwargs):
        self.stdout.write("🚀 Starting Auto-Sync with Google Sheets API...")
        scopes = ["https://www.googleapis.com/auth/spreadsheets.readonly"]
        
        try:
            if os.environ.get("GOOGLE_CREDENTIALS_JSON"):
                import json
                creds_dict = json.loads(os.environ.get("GOOGLE_CREDENTIALS_JSON"))
                creds = Credentials.from_service_account_info(creds_dict, scopes=scopes)
            else:
                creds_path = os.path.abspath(os.path.join(os.path.dirname(__file__), '../../../ojt_backend/google_credentials.json'))
                creds = Credentials.from_service_account_file(creds_path, scopes=scopes)
            client = gspread.authorize(creds)
        except Exception as e:
            self.stderr.write(f"❌ Credentials Error: {e}")
            return

        spreadsheet_id = "1ls22e9YR8yH6EfNfYXRuztGwcoItJEM_NEKqNT3wcB0"
        
        try:
            sheet = client.open_by_key(spreadsheet_id).worksheet("Sheet1")
            data = sheet.get_all_values()
            self.stdout.write(f"📉 Fetched {len(data)} rows successfully!")
        except Exception as e:
            self.stderr.write(f"❌ API Error: {e}")
            return

        rows = data
        current_intern = None
        fallback_block = []
        blocks = {}
        
        # Parse logic based on the exported TSV formats mapped to 2D lists
        for row in rows:
            name_candidate = None
            for i in range(min(3, len(row))):
                val = str(row[i]).strip()
                if ',' in val and len(val) > 10 and "PROGRESS" not in val and "TOTAL" not in val and not val.replace('.','').isdigit():
                    name_candidate = val
                    break
            
            if name_candidate:
                current_intern = self.get_or_create_intern(name_candidate)
                if current_intern not in blocks:
                    blocks[current_intern] = []
                blocks[current_intern].extend(fallback_block)
                fallback_block = []
            else:
                if current_intern: blocks[current_intern].append(row)
                else: fallback_block.append(row)

        new_entries = 0
        updated_entries = 0

        # Strict absolute indices based on Google Sheets API raw response
        MONTH_GROUPS = [
            {"m": 1, "d": 1,   "ai": 2,  "ao": 3,  "pi": 4,  "po": 5},
            {"m": 2, "d": 8,   "ai": 9,  "ao": 10, "pi": 11, "po": 12},
            {"m": 3, "d": 15,  "ai": 16, "ao": 17, "pi": 18, "po": 19},
            {"m": 4, "d": 22,  "ai": 23, "ao": 24, "pi": 25, "po": 26},
        ]

        for intern, block in blocks.items():
            self.stdout.write(f"Processing sheet block for {intern.name}...")
            clean_block = block  # Do not modify columns with pop() because indices are absolute
            
            for row in clean_block:
                for mg in MONTH_GROUPS:
                    if len(row) > mg["d"] and str(row[mg["d"]]).strip().isdigit():
                        day = int(str(row[mg["d"]]).strip())
                        try: date_obj = datetime(2026, mg["m"], day).date()
                        except: continue
                        
                        t_ia = self.parse_time(row[mg["ai"]]) if len(row) > mg["ai"] else None
                        t_oa = self.parse_time(row[mg["ao"]]) if len(row) > mg["ao"] else None
                        t_ip = self.parse_time(row[mg["pi"]]) if len(row) > mg["pi"] else None
                        t_op = self.parse_time(row[mg["po"]]) if len(row) > mg["po"] else None

                        if not any([t_ia, t_oa, t_ip, t_op]): continue

                        def mk_aware(d, t):
                            if not t: return None
                            return timezone.make_aware(datetime.combine(d, t))

                        # Safely insert or update existing without losing historical data
                        obj, created = Attendance.objects.update_or_create(
                            student_id=intern.student_id,
                            date=date_obj,
                            defaults={
                                "am_time_in": mk_aware(date_obj, t_ia),
                                "am_time_out": mk_aware(date_obj, t_oa),
                                "pm_time_in": mk_aware(date_obj, t_ip),
                                "pm_time_out": mk_aware(date_obj, t_op),
                            }
                        )
                        if created:
                            new_entries += 1
                        else:
                            updated_entries += 1
            intern.refresh_from_db()
        
        self.stdout.write(self.style.SUCCESS(f"✅ Sync Complete! New Entries: {new_entries} | Updated Records: {updated_entries}"))
