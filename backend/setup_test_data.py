import os
import django

# Setup Django environment
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'ojt_backend.settings')
django.setup()

from attendance.models import Intern, Attendance
from django.utils import timezone
from datetime import timedelta, date

def setup():
    # Create test interns using create_user for proper hashing
    test_data = [
        {
            "student_id": "TEST-001",
            "name": "Kira Yamato (Test Intern)",
            "email": "kira@test.com",
            "password": "password123",
            "hours": 150
        },
        {
            "student_id": "TEST-002",
            "name": "Lacus Clyne (Test Intern)",
            "email": "lacus@test.com",
            "password": "password123",
            "hours": 320
        }
    ]

    for d in test_data:
        intern, created = Intern.objects.get_or_create(
            student_id=d["student_id"],
            defaults={
                'name': d["name"],
                'email': d["email"],
                'is_active': True
            }
        )
        if created:
            intern.set_password(d["password"])
            intern.save()
            print(f"Created test user: {d['student_id']}")
        else:
            intern.name = d["name"]
            intern.email = d["email"]
            intern.is_active = True
            intern.save()
            print(f"Updated test user: {d['student_id']}")

        # Add some attendance records to give them hours
        # We'll add one record for 'today' so they show up as 'Online' in the new dashboard
        today = timezone.localtime().date()
        Attendance.objects.get_or_create(
            student_id=d["student_id"],
            date=today,
            defaults={
                'am_time_in': timezone.now() - timedelta(hours=2)
                # am_time_out is null, so they are 'Timed In'
            }
        )
        print(f"Set {d['student_id']} as ONLINE for today.")

if __name__ == "__main__":
    setup()
