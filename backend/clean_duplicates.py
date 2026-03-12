import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'ojt_backend.settings')
django.setup()

from attendance.models import Attendance

records = Attendance.objects.all().order_by('date')
seen = set()
duplicates = []

for r in records:
    key = (r.student_id, r.date)
    if key in seen:
        print(f"Duplicate found: ID {r.id} for {r.student_id} on {r.date}")
        duplicates.append(r)
    else:
        seen.add(key)

print(f"Found {len(duplicates)} duplicates. Deleting them...")
for d in duplicates:
    d.delete()
print("Done.")
