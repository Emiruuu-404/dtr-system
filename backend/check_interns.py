import os
import django

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "ojt_backend.settings")
django.setup()

from attendance.models import Intern

print("List of Interns:")
for intern in Intern.objects.all():
    print(f"ID: {intern.student_id}, Name: {intern.name}, Email: {intern.email}, Active: {intern.is_active}")
