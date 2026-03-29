import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'ojt_backend.settings')
django.setup()

from attendance.models import Intern, Attendance, get_effective_hours

def sync_all_hours():
    print("Starting hours synchronization...")
    interns = Intern.objects.all()
    for intern in interns:
        print(f"Updating {intern.name} ({intern.student_id})...")
        records = Attendance.objects.filter(student_id=intern.student_id)
        total = 0
        for r in records:
            total += get_effective_hours(r.am_time_in, r.am_time_out)
            total += get_effective_hours(r.pm_time_in, r.pm_time_out)
        intern.total_hours = total
        intern.save(update_fields=['total_hours'])
        print(f"  Total hours: {total}")
    print("Done!")

if __name__ == "__main__":
    sync_all_hours()
