import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'ojt_backend.settings')
django.setup()

from attendance.models import Attendance

records = Attendance.objects.all().order_by('date')
for r in records:
    print(r.id, r.date, r.student_id)
