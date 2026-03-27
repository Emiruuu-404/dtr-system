from django.db import models


class Student(models.Model):
    student_id = models.CharField(max_length=50, unique=True)
    name = models.CharField(max_length=100)
    course = models.CharField(max_length=100)
    school = models.CharField(max_length=150)

    def __str__(self):
        return self.name


from django.contrib.auth.models import AbstractBaseUser, BaseUserManager, PermissionsMixin

class InternManager(BaseUserManager):
    def create_user(self, student_id, email, name, password=None, **extra_fields):
        if not student_id:
            raise ValueError('The Student ID field must be set')
        email = self.normalize_email(email)
        user = self.model(student_id=student_id, email=email, name=name, **extra_fields)
        user.set_password(password)
        user.save(using=self._db)
        return user

    def create_superuser(self, student_id, email, name, password=None, **extra_fields):
        extra_fields.setdefault('is_staff', True)
        extra_fields.setdefault('is_superuser', True)
        return self.create_user(student_id, email, name, password, **extra_fields)

class Intern(AbstractBaseUser, PermissionsMixin):
    student_id = models.CharField(max_length=20, unique=True)
    name = models.CharField(max_length=100)
    email = models.EmailField(unique=True)
    
    is_active = models.BooleanField(default=True)
    is_staff = models.BooleanField(default=False)
    profile_picture = models.ImageField(upload_to="profiles/", null=True, blank=True)
    
    objects = InternManager()

    USERNAME_FIELD = 'student_id'
    REQUIRED_FIELDS = ['email', 'name']

    def __str__(self):
        return f"{self.student_id} - {self.name}"

class Attendance(models.Model):
    student_id = models.CharField(max_length=50)
    date = models.DateField()

    am_time_in = models.DateTimeField(null=True, blank=True)
    am_time_out = models.DateTimeField(null=True, blank=True)
    pm_time_in = models.DateTimeField(null=True, blank=True)
    pm_time_out = models.DateTimeField(null=True, blank=True)

    def __str__(self):
        return f"{self.student_id} - {self.date}"


class AccomplishmentReport(models.Model):
    student_id = models.CharField(max_length=50)
    date = models.DateField(auto_now_add=True)
    notes = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Report {self.id} - {self.student_id} ({self.date})"


class AccomplishmentImage(models.Model):
    report = models.ForeignKey(AccomplishmentReport, on_delete=models.CASCADE, related_name="images")
    image = models.ImageField(upload_to="accomplishments/", null=True, blank=True)
    image_file_name = models.CharField(max_length=255, blank=True, default="")
    image_content_type = models.CharField(max_length=100, blank=True, default="")
    image_blob = models.BinaryField(null=True, blank=True)
    uploaded_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Image for Report {self.report.id}"
    
class HistoryRecord(models.Model):
    student_id = models.CharField(max_length=50)
    date = models.CharField(max_length=100)  # Halimbawa: "October 25, 2023"
    
    # AM Shift
    am_in = models.CharField(max_length=20, null=True, blank=True)
    am_out = models.CharField(max_length=20, null=True, blank=True)
    
    # PM Shift
    pm_in = models.CharField(max_length=20, null=True, blank=True)
    pm_out = models.CharField(max_length=20, null=True, blank=True)
    
    # Main Display (ito yung 'in' at 'out' sa history card)
    time_in = models.CharField(max_length=20, null=True, blank=True)
    time_out = models.CharField(max_length=20, null=True, blank=True)
    
    hours = models.FloatField(default=0.0)
    status = models.CharField(max_length=50, default="Completed")
    created_at = models.DateTimeField(auto_now_add=True)