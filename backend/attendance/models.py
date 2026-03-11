from django.db import models


class Student(models.Model):
    student_id = models.CharField(max_length=50, unique=True)
    name = models.CharField(max_length=100)
    course = models.CharField(max_length=100)
    school = models.CharField(max_length=150)

    def __str__(self):
        return self.name



class Intern(models.Model):
    student_id = models.CharField(max_length=20, unique=True)
    name = models.CharField(max_length=100)
    email = models.EmailField(unique=True)
    password = models.CharField(max_length=255)

    def __str__(self):
        return f"{self.student_id} - {self.name}"

class Attendance(models.Model):
    student_id = models.CharField(max_length=20)
    date = models.DateField()

    am_time_in = models.DateTimeField(null=True, blank=True)
    am_time_out = models.DateTimeField(null=True, blank=True)
    pm_time_in = models.DateTimeField(null=True, blank=True)
    pm_time_out = models.DateTimeField(null=True, blank=True)

    def __str__(self):
        return f"{self.student_id} - {self.date}"