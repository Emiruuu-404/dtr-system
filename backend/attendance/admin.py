from django.contrib import admin
from .models import Student, Attendance, Intern, ChatMessage

admin.site.register(Student)
admin.site.register(Intern)
admin.site.register(Attendance)
admin.site.register(ChatMessage)