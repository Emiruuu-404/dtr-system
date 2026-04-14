import json
import mimetypes
import re, pdfplumber
from django.shortcuts import get_object_or_404
from django.http import JsonResponse, FileResponse, HttpResponse, Http404
from django.views.decorators.csrf import csrf_exempt
from django.utils import timezone
from .models import Intern, Attendance, AccomplishmentReport, AccomplishmentImage, get_effective_hours, Holiday, EmailLog
from django.contrib.auth.hashers import make_password, check_password
import io
from datetime import datetime, time, timedelta
import math
import uuid
import threading
from rest_framework.decorators import api_view, permission_classes, authentication_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from django.db.models import Q
from collections import defaultdict
from datetime import date as date_type

# 2026 Philippine Holidays (Hardcoded as fallback)
PH_HOLIDAYS_HARDCODED = {
    date_type(2026, 1, 1),   # New Year's Day
    date_type(2026, 2, 17),  # Chinese New Year
    date_type(2026, 4, 2),   # Maundy Thursday
    date_type(2026, 4, 3),   # Good Friday
    date_type(2026, 4, 4),   # Black Saturday
    date_type(2026, 4, 9),   # Araw ng Kagitingan
    date_type(2026, 5, 1),   # Labor Day
    date_type(2026, 6, 12),  # Independence Day
    date_type(2026, 8, 21),  # Ninoy Aquino Day
    date_type(2026, 8, 31),  # National Heroes Day
    date_type(2026, 11, 1),  # All Saints' Day
    date_type(2026, 11, 2),  # All Souls' Day
    date_type(2026, 11, 30), # Bonifacio Day
    date_type(2026, 12, 8),  # Immaculate Conception
    date_type(2026, 12, 24), # Christmas Eve
    date_type(2026, 12, 25), # Christmas Day
    date_type(2026, 12, 30), # Rizal Day
    date_type(2026, 12, 31), # Last Day of the Year
}

def get_all_holidays():
    """Returns a set of all holiday dates from both database and hardcoded list."""
    db_holidays = set(Holiday.objects.values_list('date', flat=True))
    return PH_HOLIDAYS_HARDCODED.union(db_holidays)


def format_hrs_mins(decimal_hours):
    if decimal_hours <= 0:
        return "0 h 0 min"
    hrs = int(decimal_hours)
    mins = int(round((decimal_hours - hrs) * 60))
    if mins == 60:
        hrs += 1
        mins = 0
    if hrs > 0 and mins > 0:
        return f"{hrs} h {mins} min"
    elif hrs > 0:
        return f"{hrs} h 0 min"
    else:
        return f"0 h {mins} min"


def normalize_shift_times(am_in_obj, am_out_obj, pm_in_obj, pm_out_obj):
    noon = time(12, 0)
    one_pm = time(13, 0)

    # Only split if PM session does not exist
    if am_out_obj and am_out_obj > noon and not pm_out_obj:
        pm_out_obj = am_out_obj
        am_out_obj = noon

        if not pm_in_obj:
            pm_in_obj = one_pm

    # If PM exists but AM out missing
    if (pm_in_obj or pm_out_obj) and not am_out_obj:
        am_out_obj = noon

    # Ensure PM IN exists if PM OUT exists
    if pm_out_obj and not pm_in_obj:
        pm_in_obj = one_pm

    return am_in_obj, am_out_obj, pm_in_obj, pm_out_obj

from rest_framework_simplejwt.tokens import RefreshToken
from django.contrib.auth import authenticate
from rest_framework.permissions import AllowAny

@api_view(['POST'])
@permission_classes([AllowAny])
@authentication_classes([])
def login_view(request):
    try:
        data = request.data
        student_id = data.get("studentId") or data.get("student_id")
        password = data.get("password")

        if not student_id or not password:
            return Response({"error": "Missing fields"}, status=400)

        student_id = str(student_id).strip()
        if "@" not in student_id:
            student_id = student_id.lower()

        # Automatically create the default admin if it doesn't exist
        if student_id == "admin":
            if not Intern.objects.filter(student_id="admin").exists():
                admin_user = Intern.objects.create_user(
                    student_id="admin",
                    email="admin@dtr.com",
                    name="System Administrator",
                    password="admin"
                )
                admin_user.is_staff = True
                admin_user.save()

        try:
            if "@" in student_id:
                user_obj = Intern.objects.defer('profile_picture_blob').get(email__iexact=student_id)
            else:
                user_obj = Intern.objects.defer('profile_picture_blob').get(student_id=student_id)
            actual_id = user_obj.student_id
        except Intern.DoesNotExist:
            print(f"LOGIN FAILED: User {student_id} not found")
            return Response({"error": f"User '{student_id}' not found. Please register first or check your ID."}, status=401)

        if not user_obj.is_active:
            return Response({"error": "Your account has been deactivated. Please contact the administrator."}, status=403)

        # Use 'username' keyword as it is the standard way to pass the login identifier to authenticate()
        # even when using a custom user model with a different USERNAME_FIELD.
        user = authenticate(request, username=actual_id, password=password)
        
        if user is not None:
            token = RefreshToken.for_user(user)
            return Response({
                "message": "Login successful",
                "student_id": user.student_id,
                "name": user.name,
                "is_staff": user.is_staff,
                "session_token": str(token.access_token)
            })
        else:
            return Response({"error": "Invalid login credentials. Please check your password."}, status=401)
    except Exception as e:
        import traceback
        print(f"LOGIN ERROR: {str(e)}")
        traceback.print_exc()
        return Response({"error": f"Backend Error: {str(e)}"}, status=500)

@api_view(['GET'])
@permission_classes([AllowAny])
def verify_session(request):
    # JWT authentication handles validation via request.user automatically
    if request.user and request.user.is_authenticated:
        return Response({"valid": True})
        
    # Fallback to check token explicitly if necessary
    token = request.GET.get("token")
    if not token:
        return Response({"valid": False, "error": "Missing token"}, status=400)
    
    try:
        from rest_framework_simplejwt.authentication import JWTAuthentication
        jwt_auth = JWTAuthentication()
        validated_token = jwt_auth.get_validated_token(token)
        user = jwt_auth.get_user(validated_token)
        if user:
            return Response({"valid": True})
    except Exception:
        pass
        
    return Response({"valid": False, "error": "Session expired or invalid token"}, status=401)

@api_view(['POST'])
@permission_classes([AllowAny])
def register(request):
    try:
        data = request.data
    except Exception:
        return Response({"error": "Invalid JSON"}, status=400)

    name = data.get("name")
    student_id = data.get("student_id")
    email = data.get("email")
    password = data.get("password")

    if not all([name, student_id, email, password]):
        return Response({"error": "Missing fields"}, status=400)

    # validate student id format XX-XXXX
    if not re.match(r"^\d{2}-\d{4}$", student_id):
        return Response({"error": "Student ID format must be XX-XXXX"}, status=400)

    if Intern.objects.filter(student_id=student_id).exists():
        return Response({"error": "Student ID already registered"}, status=400)

    user = Intern.objects.create_user(
        name=name,
        student_id=str(student_id).strip().lower(),
        email=email,
        password=password
    )
    
    return Response({"message": "Account created successfully"})

# verify_session is replaced by SimpleJWT token verification natively

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def time_in(request):
    student_id = request.user.student_id

    now = timezone.localtime()
    today = now.date()
    current_hour = now.hour

    # Block if past 5 PM (17:00)
    if current_hour >= 17:
        return Response({
            "error": "OJT hours has already ended."
        }, status=400)

    # Check existing record today
    existing = Attendance.objects.filter(
        student_id=student_id,
        date=today
    ).first()

    # 🚫 Block if already timed in today
    if existing and existing.am_time_in:
        return Response({
            "error": "You have already timed in for today."
        }, status=400)

    # If no record today → create new
    if not existing:
        Attendance.objects.create(
            student_id=student_id,
            date=today,
            am_time_in=now
        )
    else:
        # If record exists but no time_in yet
        if not existing.am_time_in:
            existing.am_time_in = now
            existing.save()

    return Response({
        "message": "Time in recorded"
    })

@csrf_exempt
def time_out(request):
    if request.method != "POST":
        return JsonResponse({"error": "POST request required"}, status=405)

    try:
        data = json.loads(request.body)
    except:
        return JsonResponse({"error": "Invalid JSON"}, status=400)

    student_id = data.get("student_id")
    if not student_id:
        return JsonResponse({"error": "Missing student_id"}, status=400)

    try:
        intern = Intern.objects.get(student_id=student_id)
    except Intern.DoesNotExist:
        return JsonResponse({"error": "Intern not found"}, status=404)

    now = timezone.localtime()
    if now.hour >= 17:
        return JsonResponse({
            "error": "OJT hours has already ended."
        }, status=400)

    # In our new logic, time-out is not really used because we default hours,
    # but we still block it if needed.
    return JsonResponse({"error": "Time Out is automatically handled by the system today."}, status=400)




def get_leaderboards(request):
    # Performance Optimization: Use cached total_hours instead of recalculating in a loop
    interns = Intern.objects.filter(is_staff=False, is_active=True).order_by('-total_hours').defer('profile_picture_blob')
    
    leaderboard_data = []
    for intern in interns:
        total_hours = round(intern.total_hours, 2)
        
        profile_picture_url = None
        if intern.profile_picture_blob:
            profile_picture_url = request.build_absolute_uri(f"/api/profile-picture/{intern.student_id}/")
        elif intern.profile_picture:
            profile_picture_url = request.build_absolute_uri(intern.profile_picture.url)

        leaderboard_data.append({
            "id": intern.id,
            "student_id": intern.student_id,
            "name": intern.name,
            "hours": total_hours,
            "formatted_hours": format_hrs_mins(total_hours),
            "profile_picture": profile_picture_url
        })
        
    # Sort by descending hours
    leaderboard_data.sort(key=lambda x: x['hours'], reverse=True)
    
    # Assign ranks
    for index, item in enumerate(leaderboard_data):
        item['rank'] = index + 1
        
    return JsonResponse({
        "leaderboard": leaderboard_data
    })

def get_status(request):
    student_id = str(request.GET.get("student_id", "")).strip().lower()
    if not student_id:
        return JsonResponse({"error": "Missing student_id"}, status=400)

    try:
        user = Intern.objects.defer('profile_picture_blob').get(student_id=student_id)
    except Intern.DoesNotExist:
        return JsonResponse({"error": "Intern not found"}, status=404)

    today = timezone.localdate()

    record = Attendance.objects.filter(
        student_id=student_id,
        date=today
    ).first()

    # ===== STATUS =====
    if not record:
        status = "Not Timed In"
    elif record.am_time_in and not record.am_time_out:
        status = "AM IN"
    elif record.am_time_out and not record.pm_time_in:
        status = "AM OUT"
    elif record.pm_time_in and not record.pm_time_out:
        status = "PM IN"
    elif record.pm_time_out:
        status = "PM OUT"
    else:
        status = "Not Timed In"

    # ===== LAST TIME IN =====
    last_record = Attendance.objects.filter(
        student_id=student_id
    ).order_by('-date').first()

    if last_record and last_record.am_time_in:
        last_time = timezone.localtime(last_record.am_time_in)
        last_time_in = last_time.strftime("%I:%M %p")
    else:
        last_time_in = "--:--"
    
    # ===== TOTAL HOURS =====
    total_hours = round(user.total_hours, 2)
    
    # ===== MONTHLY HOURS (Optional filtering) =====
    requested_month = request.GET.get("month")
    requested_year = request.GET.get("year")
    monthly_hours = None
    formatted_monthly_hours = None
    
    if requested_month and requested_year:
        try:
            m = int(requested_month)
            y = int(requested_year)
            records = Attendance.objects.filter(student_id=student_id, date__month=m, date__year=y)
            monthly_total = 0
            for r in records:
                monthly_total += get_effective_hours(r.am_time_in, r.am_time_out)
                monthly_total += get_effective_hours(r.pm_time_in, r.pm_time_out)
            monthly_hours = round(monthly_total, 2)
            formatted_monthly_hours = format_hrs_mins(monthly_hours)
        except (ValueError, TypeError):
            pass

    # ===== TODAY LOGS =====
    def fmt(t):
        return timezone.localtime(t).strftime("%I:%M %p") if t else "--:--"

    if record:
        today_logs = [
            {
                "in": fmt(record.am_time_in),
                "out": fmt(record.am_time_out),
                "in_label": "AM IN",
                "out_label": "AM OUT"
            },
            {
                "in": fmt(record.pm_time_in),
                "out": fmt(record.pm_time_out),
                "in_label": "PM IN",
                "out_label": "PM OUT"
            }
        ]
    else:
        today_logs = [
            {"in": "--:--", "out": "--:--", "in_label": "AM IN", "out_label": "AM OUT"},
            {"in": "--:--", "out": "--:--", "in_label": "PM IN", "out_label": "PM OUT"}
        ]

    has_saturday = Attendance.objects.filter(student_id=student_id, date__week_day=7).exists()
    has_sunday = Attendance.objects.filter(student_id=student_id, date__week_day=1).exists()

    # ===== ESTIMATED END DATE =====
    total_required = user.required_hours
    remaining_hours = max(total_required - total_hours, 0)
    
    if remaining_hours == 0:
        est_date_str = "Completed"
    else:
        # Use average hours per working day from actual attendance history
        days_worked = Attendance.objects.filter(
            student_id=student_id
        ).filter(
            Q(am_time_in__isnull=False) | Q(pm_time_in__isnull=False)
        ).count()
        
        avg_hours_per_day = (total_hours / days_worked) if days_worked > 0 else 8
        avg_hours_per_day = max(min(avg_hours_per_day, 12), 1)  # Clamp between 1-12
        
        remaining_days = math.ceil(remaining_hours / avg_hours_per_day)
        
        all_holidays = get_all_holidays()
        # Check if today is a working day (not a holiday)
        is_today_workday = (
            today not in all_holidays and (
                today.weekday() < 5 or
                (today.weekday() == 5 and has_saturday) or
                (today.weekday() == 6 and has_sunday)
            )
        )
        
        # Include today as one of the remaining working days
        est = today
        added_days = 1 if is_today_workday else 0
        
        while added_days < remaining_days:
            est += timedelta(days=1)
            if est in all_holidays:
                continue  # Skip holidays
            if est.weekday() < 5 or (est.weekday() == 5 and has_saturday) or (est.weekday() == 6 and has_sunday):
                added_days += 1
        est_date_str = est.strftime("%b %d, %Y")

    profile_picture_url = None
    if user.profile_picture_blob:
        profile_picture_url = request.build_absolute_uri(f"/api/profile-picture/{user.student_id}/")
    elif user.profile_picture:
        profile_picture_url = request.build_absolute_uri(user.profile_picture.url)

    return JsonResponse({
        "name": user.name.split()[0],
        "status": status,
        "last_time_in": last_time_in,
        "today_logs": today_logs,
        "total_hours": total_hours,
        "formatted_total_hours": format_hrs_mins(total_hours),
        "monthly_hours": monthly_hours,
        "formatted_monthly_hours": formatted_monthly_hours,
        "total_required": total_required,
        "est_end_date": est_date_str,
        "profile_picture": profile_picture_url
    })



def fmt(t):
    return timezone.localtime(t).strftime("%I:%M %p") if t else "--:--"

def get_history(request):
    student_id = str(request.GET.get("student_id", "")).strip().lower()
    if not student_id:
        return JsonResponse({"error": "Missing student_id"}, status=400)

    records = Attendance.objects.filter(
        student_id=student_id
    )

    month = request.GET.get("month")
    year = request.GET.get("year")
    if month and year:
        try:
            records = records.filter(date__month=int(month), date__year=int(year))
        except (ValueError, TypeError):
            pass

    records = records.order_by('-date')

    history = []

    for r in records:
        # Calculate hours
        total_hours = 0
        total_hours += get_effective_hours(r.am_time_in, r.am_time_out)
        total_hours += get_effective_hours(r.pm_time_in, r.pm_time_out)
        total_hours = round(total_hours, 2)

        # Determine first in and last out
        first_in = fmt(r.am_time_in) if r.am_time_in else fmt(r.pm_time_in)
        last_out = fmt(r.pm_time_out) if r.pm_time_out else fmt(r.am_time_out)

        # Status
        am_complete = bool(r.am_time_in and r.am_time_out)
        pm_complete = bool(r.pm_time_in and r.pm_time_out)
        
        if am_complete and pm_complete:
            status = "Completed"
        elif (am_complete and not r.pm_time_in and not r.pm_time_out) or \
             (pm_complete and not r.am_time_in and not r.am_time_out):
            status = "Half Day"
        elif r.am_time_in or r.pm_time_in:
            status = "Incomplete"
        else:
            status = "No Data"

        history.append({
            "id": r.id,
            "date": r.date.strftime("%b %d, %Y"),
            "am_in": fmt(r.am_time_in),
            "am_out": fmt(r.am_time_out),
            "pm_in": fmt(r.pm_time_in),
            "pm_out": fmt(r.pm_time_out),
            "in": first_in,
            "out": last_out,
            "hours": total_hours,
            "formatted_hours": format_hrs_mins(total_hours),
            "status": status,
        })

    return JsonResponse({"records": history})

@api_view(['POST'])
@csrf_exempt
def add_past_record(request):
    if request.method != "POST":
        return JsonResponse({"error": "POST required"}, status=405)

    try:
        data = json.loads(request.body)
    except:
        return JsonResponse({"error": "Invalid JSON"}, status=400)

    student_id = str(data.get("student_id", "")).strip().lower()
    date_str = data.get("date")
    am_in_str = data.get("am_in")
    am_out_str = data.get("am_out")
    pm_in_str = data.get("pm_in")
    pm_out_str = data.get("pm_out")

    if not all([student_id, date_str]):
        return JsonResponse({"error": "Missing student_id or date"}, status=400)
    
    if not any([am_in_str, am_out_str, pm_in_str, pm_out_str]):
         return JsonResponse({"error": "Provide at least one time punch"}, status=400)

    try:
        intern = Intern.objects.get(student_id=student_id)
    except Intern.DoesNotExist:
        return JsonResponse({"error": "Intern not found"}, status=404)

    try:
        from datetime import datetime
        
        # Parse strings (expecting YYYY-MM-DD and HH:MM)
        date_obj = datetime.strptime(date_str, "%Y-%m-%d").date()
        
        am_in_obj = datetime.strptime(am_in_str, "%H:%M").time() if am_in_str else None
        am_out_obj = datetime.strptime(am_out_str, "%H:%M").time() if am_out_str else None
        pm_in_obj = datetime.strptime(pm_in_str, "%H:%M").time() if pm_in_str else None
        pm_out_obj = datetime.strptime(pm_out_str, "%H:%M").time() if pm_out_str else None
        am_in_obj, am_out_obj, pm_in_obj, pm_out_obj = normalize_shift_times(
            am_in_obj, am_out_obj, pm_in_obj, pm_out_obj
        )

        # Determine time_in and time_out bounds for calculating hours and sorting
        aware_time_in = None
        if am_in_obj:
            aware_time_in = timezone.make_aware(datetime.combine(date_obj, am_in_obj))
        elif pm_in_obj:
            aware_time_in = timezone.make_aware(datetime.combine(date_obj, pm_in_obj))
            
        aware_time_out = None
        if pm_out_obj:
            aware_time_out = timezone.make_aware(datetime.combine(date_obj, pm_out_obj))
        elif am_out_obj:
            aware_time_out = timezone.make_aware(datetime.combine(date_obj, am_out_obj))

        record, _ = Attendance.objects.get_or_create(
            student_id=student_id,
            date=date_obj
        )
        
        if am_in_obj:
            record.am_time_in = timezone.make_aware(datetime.combine(date_obj, am_in_obj))
        if am_out_obj:
            record.am_time_out = timezone.make_aware(datetime.combine(date_obj, am_out_obj))
        if pm_in_obj:
            record.pm_time_in = timezone.make_aware(datetime.combine(date_obj, pm_in_obj))
        if pm_out_obj:
            record.pm_time_out = timezone.make_aware(datetime.combine(date_obj, pm_out_obj))
            
        record.save()

        return JsonResponse({"message": "Past record added successfully"})
    except Exception as e:
        return JsonResponse({"error": f"Error parsing datetime: {str(e)}"}, status=400)


@csrf_exempt
def save_today_record(request):
    if request.method != "POST":
        return JsonResponse({"error": "POST required"}, status=405)

    try:
        data = json.loads(request.body)
    except:
        return JsonResponse({"error": "Invalid JSON"}, status=400)

    student_id = str(data.get("student_id", "")).strip().lower()
    if not student_id:
        return JsonResponse({"error": "Missing student_id"}, status=400)

    am_in_str = data.get("am_in")
    am_out_str = data.get("am_out")
    pm_in_str = data.get("pm_in")
    pm_out_str = data.get("pm_out")

    try:
        intern = Intern.objects.get(student_id=student_id)
    except Intern.DoesNotExist:
        return JsonResponse({"error": "Intern not found"}, status=404)

    try:
        from datetime import datetime
        
        today = timezone.localtime().date()

        # Helper to safely parse or set to None
        def parse_time(time_str):
            if not time_str or time_str == "--:--":
                return None
            if "AM" in time_str.upper() or "PM" in time_str.upper():
                 try:
                     return datetime.strptime(time_str, "%I:%M %p").time()
                 except ValueError:
                     pass
            try:
                return datetime.strptime(time_str, "%H:%M").time()
            except ValueError:
                return None

        am_in_obj = parse_time(am_in_str)
        am_out_obj = parse_time(am_out_str)
        pm_in_obj = parse_time(pm_in_str)
        pm_out_obj = parse_time(pm_out_str)
        am_in_obj, am_out_obj, pm_in_obj, pm_out_obj = normalize_shift_times(
            am_in_obj, am_out_obj, pm_in_obj, pm_out_obj
        )

        aware_time_in = None
        if am_in_obj:
            aware_time_in = timezone.make_aware(datetime.combine(today, am_in_obj))
        elif pm_in_obj:
            aware_time_in = timezone.make_aware(datetime.combine(today, pm_in_obj))
            
        aware_time_out = None
        if pm_out_obj:
            aware_time_out = timezone.make_aware(datetime.combine(today, pm_out_obj))
        elif am_out_obj:
            aware_time_out = timezone.make_aware(datetime.combine(today, am_out_obj))

        # Check existing record today
        existing = Attendance.objects.filter(
            student_id=student_id,
            date=today
        ).first()

        if not existing:
            # Maybe there's a record for today based on am_time_in
            existing = Attendance.objects.filter(
                student_id=student_id,
                am_time_in__date=today
            ).first()

        if existing:
            existing.am_time_in = timezone.make_aware(datetime.combine(today, am_in_obj)) if am_in_obj else existing.am_time_in
            existing.am_time_out = timezone.make_aware(datetime.combine(today, am_out_obj)) if am_out_obj else existing.am_time_out
            existing.pm_time_in = timezone.make_aware(datetime.combine(today, pm_in_obj)) if pm_in_obj else existing.pm_time_in
            existing.pm_time_out = timezone.make_aware(datetime.combine(today, pm_out_obj)) if pm_out_obj else existing.pm_time_out
            existing.save()
        else:
            Attendance.objects.create(
                student_id=student_id,
                date=today,
                am_time_in=timezone.make_aware(datetime.combine(today, am_in_obj)) if am_in_obj else None,
                am_time_out=timezone.make_aware(datetime.combine(today, am_out_obj)) if am_out_obj else None,
                pm_time_in=timezone.make_aware(datetime.combine(today, pm_in_obj)) if pm_in_obj else None,
                pm_time_out=timezone.make_aware(datetime.combine(today, pm_out_obj)) if pm_out_obj else None,
            )

        return JsonResponse({"message": "Today's record updated successfully"})
    except Exception as e:
        return JsonResponse({"error": f"Error updating record: {str(e)}"}, status=400)




@csrf_exempt
def edit_record(request):
    if request.method != "POST":
        return JsonResponse({"error": "POST required"}, status=405)

    try:
        data = json.loads(request.body)
    except:
        return JsonResponse({"error": "Invalid JSON"}, status=400)

    student_id = str(data.get("student_id", "")).strip().lower()
    record_id = data.get("record_id")
    
    if not all([student_id, record_id]):
        return JsonResponse({"error": "Missing student_id or record_id"}, status=400)

    am_in_str = data.get("am_in")
    am_out_str = data.get("am_out")
    pm_in_str = data.get("pm_in")
    pm_out_str = data.get("pm_out")

    try:
        record = Attendance.objects.get(id=record_id, student_id=student_id)
    except Attendance.DoesNotExist:
        return JsonResponse({"error": "Record not found"}, status=404)

    try:
        from datetime import datetime
        
        # Helper to safely parse or set to None
        def parse_time(time_str):
            if not time_str or time_str == "--:--":
                return None
            
            # Also handle time values containing AM/PM if they come from UI
            if "AM" in time_str.upper() or "PM" in time_str.upper():
                 try:
                     return datetime.strptime(time_str, "%I:%M %p").time()
                 except ValueError:
                     pass
            
            try:
                return datetime.strptime(time_str, "%H:%M").time()
            except ValueError:
                return None

        am_in_obj = parse_time(am_in_str)
        am_out_obj = parse_time(am_out_str)
        pm_in_obj = parse_time(pm_in_str)
        pm_out_obj = parse_time(pm_out_str)
        am_in_obj, am_out_obj, pm_in_obj, pm_out_obj = normalize_shift_times(
            am_in_obj, am_out_obj, pm_in_obj, pm_out_obj
        )

        date_obj = record.date
        if not date_obj and record.am_time_in:
             date_obj = timezone.localtime(record.am_time_in).date()
             
        if not date_obj:
             date_obj = timezone.localtime().date() # Fallback

        # Determine time_in and time_out bounds for calculating hours
        aware_time_in = None
        if am_in_obj:
            aware_time_in = timezone.make_aware(datetime.combine(date_obj, am_in_obj))
        elif pm_in_obj:
            aware_time_in = timezone.make_aware(datetime.combine(date_obj, pm_in_obj))
            
        aware_time_out = None
        if pm_out_obj:
            aware_time_out = timezone.make_aware(datetime.combine(date_obj, pm_out_obj))
        elif am_out_obj:
            aware_time_out = timezone.make_aware(datetime.combine(date_obj, am_out_obj))

        # Get existing values
        old_am_in = record.am_time_in
        old_am_out = record.am_time_out
        old_pm_in = record.pm_time_in
        old_pm_out = record.pm_time_out

        # Update if a valid new objects exists, else if explicitly empty string from form update to None, 
        # but keep existing if not passed.
        if "am_in" in data:
            record.am_time_in = timezone.make_aware(datetime.combine(date_obj, am_in_obj)) if am_in_obj else None
        if "am_out" in data:
            record.am_time_out = timezone.make_aware(datetime.combine(date_obj, am_out_obj)) if am_out_obj else None
        if "pm_in" in data:
            record.pm_time_in = timezone.make_aware(datetime.combine(date_obj, pm_in_obj)) if pm_in_obj else None
        if "pm_out" in data:
            record.pm_time_out = timezone.make_aware(datetime.combine(date_obj, pm_out_obj)) if pm_out_obj else None
        record.save()

        return JsonResponse({"message": "Record updated successfully"})
    except Exception as e:
        return JsonResponse({"error": f"Error updating record: {str(e)}"}, status=400)


@csrf_exempt
def delete_record(request):
    if request.method != "POST":
        return JsonResponse({"error": "POST required"}, status=405)

    try:
        data = json.loads(request.body)
    except:
        return JsonResponse({"error": "Invalid JSON"}, status=400)

    student_id = data.get("student_id")
    record_id = data.get("record_id")

    if not all([student_id, record_id]):
        return JsonResponse({"error": "Missing required fields"}, status=400)

    try:
        record = Attendance.objects.get(id=record_id, student_id=student_id)
        record.delete()
        return JsonResponse({"message": "Record deleted successfully"})
    except Attendance.DoesNotExist:
        return JsonResponse({"error": "Record not found"}, status=404)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def download_dtr(request):
    from datetime import datetime
    import calendar
    import os
    from django.conf import settings

    # SECURED: Fetch ID from token instead of URL params, but allow admins to override
    student_id = request.user.student_id  
    user = request.user

    # Allow admins to download for specific students
    if getattr(user, 'is_staff', False) and request.GET.get('admin_student_id'):
        try:
            target_id = request.GET.get('admin_student_id')
            user = Intern.objects.get(student_id=target_id)
            student_id = target_id
        except Intern.DoesNotExist:
            pass

    day_type = request.GET.get("day_type", "Regular")
    supervisor = request.GET.get("supervisor", "").strip()
    period = request.GET.get("period", "auto").strip()

    # Use month and year from params or fallback to current
    now = timezone.localtime()
    try:
        month = int(request.GET.get("month", now.month))
        year = int(request.GET.get("year", now.year))
    except (ValueError, TypeError):
        month = now.month
        year = now.year

    # Validation: month must be 1-12
    if month < 1 or month > 12:
        month = now.month

    month_name = calendar.month_name[month]
    
    # 15th/End of Month Cutoff Logic
    if period == "1st_half":
        period_suffix = "1st_Half"
    elif period == "2nd_half":
        period_suffix = "2nd_Half"
    elif period == "full":
        period_suffix = "Full_Month"
    else:
        # Fallback to full if invalid
        period = "full"
        period_suffix = "Full_Month"

    month_str = f"{month_name} {year} ({period_suffix.replace('_', ' ')})"

    # PDF Generator
    from attendance.pdf_generator import generate_dtr_pdf
    
    # Query Database
    if period == "1st_half":
        records = Attendance.objects.filter(
            student_id=student_id, 
            date__year=year, 
            date__month=month,
            date__day__lte=15
        ).order_by('date')
    elif period == "2nd_half":
        records = Attendance.objects.filter(
            student_id=student_id, 
            date__year=year, 
            date__month=month,
            date__day__gte=16
        ).order_by('date')
    else:  # full
        records = Attendance.objects.filter(
            student_id=student_id, 
            date__year=year, 
            date__month=month
        ).order_by('date')

    # Create PDF Buffer using new pure-python lab module
    buffer = generate_dtr_pdf(records, user, month_str, day_type, supervisor, period)
    
    # File Response
    filename = f"DTR_{user.name.replace(' ', '_')}_{month_name}_{year}_{period_suffix}.pdf"
    response = FileResponse(buffer, as_attachment=True, filename=filename, content_type='application/pdf')
    return response

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_intern_dashboard_data(request):
    from django.utils import timezone
    from datetime import datetime
    
    intern = request.user
    today = timezone.localtime().date()
    
    # Current user status
    status = "Not Timed In"
    try:
        record = Attendance.objects.get(student_id=intern.student_id, date=today)
        if record.pm_time_in and not record.pm_time_out:
            status = "In (PM)"
        elif record.am_time_in and not record.am_time_out:
            status = "In (AM)"
        elif record.pm_time_out:
            status = "Timed Out (Full Day)"
        elif record.am_time_out:
            status = "Timed Out (AM)"
    except Attendance.DoesNotExist:
        pass

    # Total hours (Use cached field for performance)
    total_hours = round(intern.total_hours, 2)
    
    return Response({
        "name": intern.name,
        "student_id": intern.student_id,
        "status": status,
        "total_hours": total_hours,
        "formatted_hours": format_hrs_mins(total_hours)
    })



@csrf_exempt
def forgot_password(request):
    if request.method != "POST":
        return JsonResponse({"error": "POST request required"}, status=405)

    try:
        data = json.loads(request.body)
    except:
        return JsonResponse({"error": "Invalid JSON"}, status=400)

    student_id = data.get("student_id")
    email = data.get("email")
    new_password = data.get("new_password")

    if not all([student_id, email, new_password]):
        return JsonResponse({"error": "All fields are required"}, status=400)

    if len(new_password) < 8:
        return JsonResponse({"error": "Password must be at least 8 characters"}, status=400)

    try:
        user = Intern.objects.get(student_id=student_id, email=email)
        user.password = make_password(new_password)
        user.save()
        return JsonResponse({"message": "Password reset successfully"})
    except Intern.DoesNotExist:
        return JsonResponse({"error": "No account found with that Student ID and Email"}, status=404)


@csrf_exempt
def change_password(request):
    if request.method != "POST":
        return JsonResponse({"error": "POST request required"}, status=405)

    try:
        data = json.loads(request.body)
    except:
        return JsonResponse({"error": "Invalid JSON"}, status=400)

    student_id = data.get("student_id")
    current_password = data.get("current_password")
    new_password = data.get("new_password")

    if not all([student_id, current_password, new_password]):
        return JsonResponse({"error": "All fields are required"}, status=400)

    if len(new_password) < 8:
        return JsonResponse({"error": "New password must be at least 8 characters"}, status=400)

    try:
        user = Intern.objects.get(student_id=student_id)
        if not check_password(current_password, user.password):
            return JsonResponse({"error": "Current password is incorrect"}, status=401)

        user.password = make_password(new_password)
        user.save()
        return JsonResponse({"message": "Password changed successfully"})
    except Intern.DoesNotExist:
        return JsonResponse({"error": "Account not found"}, status=404)


@csrf_exempt
def update_profile(request):
    if request.method != "POST":
        return JsonResponse({"error": "POST request required"}, status=405)

    try:
        data = json.loads(request.body)
    except:
        return JsonResponse({"error": "Invalid JSON"}, status=400)

    student_id = data.get("student_id")
    name = data.get("name")
    email = data.get("email")

    if not student_id:
        return JsonResponse({"error": "Missing student_id"}, status=400)

    try:
        user = Intern.objects.defer('profile_picture_blob').get(student_id=student_id)

        if name:
            user.name = name
        if email:
            # Check if email is already taken by another user
            existing = Intern.objects.filter(email=email).exclude(student_id=student_id).first()
            if existing:
                return JsonResponse({"error": "Email is already in use"}, status=400)
            user.email = email

        user.save()
        return JsonResponse({"message": "Profile updated successfully", "name": user.name, "email": user.email})
    except Intern.DoesNotExist:
        return JsonResponse({"error": "Account not found"}, status=404)

@csrf_exempt
def update_id(request):
    if request.method != "POST":
        return JsonResponse({"error": "POST request required"}, status=405)

    try:
        data = json.loads(request.body)
        old_id = data.get("old_id")
        new_id = str(data.get("new_id", "")).strip().lower()

        if not old_id or not new_id:
            return JsonResponse({"error": "Missing old_id or new_id"}, status=400)

        # Check if new ID already exists
        if Intern.objects.filter(student_id=new_id).exists():
            return JsonResponse({"error": "ID na itong gamit ng iba"}, status=400)

        try:
            user = Intern.objects.get(student_id=old_id)
            
            # Manual update for all linked tables because they use CharField instead of FK
            Attendance.objects.filter(student_id=old_id).update(student_id=new_id)
            AccomplishmentReport.objects.filter(student_id=old_id).update(student_id=new_id)
            HistoryRecord.objects.filter(student_id=old_id).update(student_id=new_id)
            
            # Update the main user record
            user.student_id = new_id
            user.save()

            return JsonResponse({
                "message": "ID updated successfully",
                "new_id": new_id
            })
        except Intern.DoesNotExist:
            return JsonResponse({"error": "Account not found"}, status=404)

    except Exception as e:
        return JsonResponse({"error": f"Server Error: {str(e)}"}, status=500)


def get_profile(request):
    student_id = str(request.GET.get("student_id", "")).strip().lower()
    if not student_id:
        return JsonResponse({"error": "Missing student_id"}, status=400)

    try:
        user = Intern.objects.defer('profile_picture_blob').get(student_id=student_id)
        profile_picture_url = None
        if user.profile_picture_blob:
            profile_picture_url = request.build_absolute_uri(f"/api/profile-picture/{user.student_id}/")
        elif user.profile_picture:
            profile_picture_url = request.build_absolute_uri(user.profile_picture.url)
            
        # Get extra info from Student master list if it exists
        from .models import Student
        course = ""
        school = ""
        try:
            student_info = Student.objects.get(student_id__iexact=student_id)
            course = student_info.course
            school = student_info.school
        except Student.DoesNotExist:
            pass

        return JsonResponse({
            "name": user.name,
            "email": user.email,
            "student_id": user.student_id,
            "profile_picture": profile_picture_url,
            "course": course,
            "school": school,
            "total_hours": round(user.total_hours, 2),
            "formatted_total_hours": format_hrs_mins(user.total_hours)
        })
    except Intern.DoesNotExist:
        return JsonResponse({"error": "Account not found"}, status=404)


@csrf_exempt
def upload_profile_picture(request):
    if request.method != "POST":
        return JsonResponse({"error": "POST request required"}, status=405)

    student_id = str(request.POST.get("student_id", "")).strip().lower()
    image = request.FILES.get("image")

    if not student_id or not image:
        return JsonResponse({"error": "Missing student_id or image"}, status=400)

    try:
        user = Intern.objects.get(student_id=student_id)
        
        from PIL import Image
        import io
        
        # Open and process image
        img = Image.open(image)
        
        # Convert to RGB if necessary (rgba/p to rgb)
        if img.mode in ("RGBA", "P"):
            img = img.convert("RGB")
        
        # Resize - thumbnails maintain aspect ratio
        # Profile pics don't need to be huge
        img.thumbnail((300, 300))
        
        # Save to buffer
        output = io.BytesIO()
        img.save(output, format="JPEG", quality=85, optimize=True)
        image_bytes = output.getvalue()

        # Update user fields
        user.profile_picture_content_type = "image/jpeg"
        user.profile_picture_blob = image_bytes
        user.save()
        
        profile_picture_url = request.build_absolute_uri(f"/api/profile-picture/{user.student_id}/")

        return JsonResponse({
            "message": "Profile picture updated and optimized",
            "profile_picture": profile_picture_url
        })
    except Intern.DoesNotExist:
        return JsonResponse({"error": "Account not found"}, status=404)
    except Exception as e:
        return JsonResponse({"error": f"Error processing image: {str(e)}"}, status=500)
@api_view(['GET'])
@permission_classes([AllowAny])
def get_profile_picture_view(request, student_id):
    try:
        user = Intern.objects.get(student_id=student_id)
    except Intern.DoesNotExist:
        raise Http404("Account not found")

    from PIL import Image
    import io

    # OPTIMIZATION: If we have a blob, check if it's too large (>200KB)
    # If it is, compress it on the fly and save it back to prevent future slow loads
    if user.profile_picture_blob:
        blob_size = len(user.profile_picture_blob)
        
        if blob_size > 200 * 1024:  # 200KB limit for auto-compression
            try:
                img = Image.open(io.BytesIO(user.profile_picture_blob))
                if img.mode in ("RGBA", "P"):
                    img = img.convert("RGB")
                img.thumbnail((300, 300))
                output = io.BytesIO()
                img.save(output, format="JPEG", quality=85, optimize=True)
                compressed_blob = output.getvalue()
                
                # Save optimized version back to DB
                user.profile_picture_blob = compressed_blob
                user.profile_picture_content_type = "image/jpeg"
                user.save(update_fields=['profile_picture_blob', 'profile_picture_content_type'])
                
                return HttpResponse(compressed_blob, content_type="image/jpeg")
            except Exception:
                pass # Fallback to original if compression fails
                
        return HttpResponse(bytes(user.profile_picture_blob), content_type=user.profile_picture_content_type or "image/jpeg")

    # MIGRATION: If we only have the file field, migrate it to compressed blob
    # This is critical for Render (ephemeral storage)
    if user.profile_picture:
        try:
            with user.profile_picture.open("rb") as f:
                img = Image.open(f)
                if img.mode in ("RGBA", "P"):
                    img = img.convert("RGB")
                img.thumbnail((300, 300))
                output = io.BytesIO()
                img.save(output, format="JPEG", quality=85, optimize=True)
                compressed_blob = output.getvalue()
                
                user.profile_picture_blob = compressed_blob
                user.profile_picture_content_type = "image/jpeg"
                user.save(update_fields=['profile_picture_blob', 'profile_picture_content_type'])
                
                return HttpResponse(compressed_blob, content_type="image/jpeg")
        except Exception:
             raise Http404("Internal image file not found")
        
    raise Http404("No profile picture found")

@csrf_exempt
def submit_report(request):
    if request.method != "POST":
        return JsonResponse({"error": "POST request required"}, status=405)

    student_id = request.POST.get("student_id")
    notes = request.POST.get("notes")
    images = request.FILES.getlist("images")

    if not student_id or not notes:
        return JsonResponse({"error": "Student ID and notes are required"}, status=400)

    try:
        intern = Intern.objects.get(student_id=student_id)
        
        # Create Report
        report = AccomplishmentReport.objects.create(student_id=student_id, notes=notes)
        
        # Save Images: keep file storage for compatibility, and persist bytes in DB for durability.
        for image in images:
            content_type = getattr(image, "content_type", "") or "application/octet-stream"
            file_name = getattr(image, "name", "") or "upload"
            image_bytes = image.read()
            image.seek(0)

            AccomplishmentImage.objects.create(
                report=report,
                image=image,
                image_file_name=file_name,
                image_content_type=content_type,
                image_blob=image_bytes,
            )
        
        return JsonResponse({"message": "Report submitted successfully!", "report_id": report.id})
    except Intern.DoesNotExist:
        return JsonResponse({"error": "Account not found"}, status=404)
    except Exception as e:
        return JsonResponse({"error": str(e)}, status=500)


@csrf_exempt
def edit_report(request):
    if request.method != "POST":
        return JsonResponse({"error": "POST request required"}, status=405)

    try:
        data = json.loads(request.body)
    except Exception:
        return JsonResponse({"error": "Invalid JSON"}, status=400)

    student_id = data.get("student_id")
    report_id = data.get("report_id")
    notes = (data.get("notes") or "").strip()

    if not student_id or not report_id:
        return JsonResponse({"error": "student_id and report_id are required"}, status=400)
    if not notes:
        return JsonResponse({"error": "Notes cannot be empty"}, status=400)

    try:
        report = AccomplishmentReport.objects.get(id=report_id, student_id=student_id)
    except AccomplishmentReport.DoesNotExist:
        return JsonResponse({"error": "Report not found"}, status=404)

    report.notes = notes
    report.save(update_fields=["notes"])

    return JsonResponse({
        "message": "Report updated successfully",
        "report": {
            "id": report.id,
            "notes": report.notes,
        },
    })


@csrf_exempt
def delete_report(request):
    if request.method != "POST":
        return JsonResponse({"error": "POST request required"}, status=405)

    try:
        data = json.loads(request.body)
    except Exception:
        return JsonResponse({"error": "Invalid JSON"}, status=400)

    student_id = data.get("student_id")
    report_id = data.get("report_id")

    if not student_id or not report_id:
        return JsonResponse({"error": "student_id and report_id are required"}, status=400)

    try:
        report = AccomplishmentReport.objects.get(id=report_id, student_id=student_id)
    except AccomplishmentReport.DoesNotExist:
        return JsonResponse({"error": "Report not found"}, status=404)

    for image in report.images.all():
        if image.image:
            image.image.delete(save=False)

    report.delete()
    return JsonResponse({"message": "Report deleted successfully"})


def get_reports(request):
    student_id = request.GET.get("student_id")
    if not student_id:
        return JsonResponse({"error": "Missing student_id"}, status=400)

    try:
        reports = AccomplishmentReport.objects.filter(student_id=student_id).order_by("-created_at")
        
        results = []
        for r in reports:
            image_urls = [request.build_absolute_uri(f"/api/report-image/{img.id}/") for img in r.images.all().defer('image_blob')]
            results.append({
                "id": r.id,
                "date": r.date.strftime("%b %d, %Y"),
                "time": timezone.localtime(r.created_at).strftime("%I:%M %p"),
                "notes": r.notes,
                "images": len(image_urls),
                "image_urls": image_urls
            })
            
        return JsonResponse({"reports": results})
    except Exception as e:
        return JsonResponse({"error": str(e)}, status=500)


def get_report_image(request, image_id):
    try:
        image = AccomplishmentImage.objects.get(id=image_id)
    except AccomplishmentImage.DoesNotExist:
        raise Http404("Image not found")

    if image.image_blob:
        content_type = image.image_content_type or "application/octet-stream"
        return HttpResponse(bytes(image.image_blob), content_type=content_type)

    if image.image:
        inferred = mimetypes.guess_type(image.image.name)[0] or "application/octet-stream"
        try:
            return FileResponse(image.image.open("rb"), content_type=inferred)
        except FileNotFoundError:
            raise Http404("Image file not found")

    raise Http404("Image data unavailable")

@csrf_exempt
def upload_dtr(request):
    if request.method == 'POST':
        student_id = request.POST.get('student_id')
        uploaded_file = request.FILES.get('file')

        try:
            records_saved = 0

            with pdfplumber.open(uploaded_file) as pdf:
                page = pdf.pages[0]

                width = page.width
                height = page.height

                # 👉 CUT LEFT SIDE (dito yung actual data)
                left_side = page.crop((0, 0, width / 2, height))

                table = left_side.extract_table()

                if not table:
                    return JsonResponse({'error': 'No table found'}, status=400)

                for row in table:
                    day_str = str(row[0]).strip() if row[0] else ""

                    if not day_str.isdigit():
                        continue

                    # 👉 skip kung walang kahit anong time
                    if not any([row[1], row[2], row[3], row[4]]):
                        continue

                    formatted_date = f"March {day_str.zfill(2)}, 2026"
                    date_obj = datetime.strptime(formatted_date, "%B %d, %Y").date()

                    def parse_time(t):
                        if not t or t == "--:--":   
                            return None
                        try:
                            return datetime.strptime(str(t).strip(), "%H:%M").time()
                        except:
                            return None

                    am_in_obj = parse_time(row[1])
                    am_out_obj = parse_time(row[2]) 
                    pm_in_obj = parse_time(row[3])
                    pm_out_obj = parse_time(row[4])
                    if pm_in_obj and pm_in_obj.hour < 12:
                        pm_in_obj = (datetime.combine(date_obj, pm_in_obj) + timedelta(hours=12)).time()

                    if pm_out_obj and pm_out_obj.hour < 12:
                        pm_out_obj = (datetime.combine(date_obj, pm_out_obj) + timedelta(hours=12)).time()

                    if Attendance.objects.filter(student_id=student_id, date=date_obj).exists():
                        continue

                    Attendance.objects.create(
                        student_id=student_id,
                        date=date_obj,
                        am_time_in=timezone.make_aware(datetime.combine(date_obj, am_in_obj)) if am_in_obj else None,
                        am_time_out=timezone.make_aware(datetime.combine(date_obj, am_out_obj)) if am_out_obj else None,
                        pm_time_in=timezone.make_aware(datetime.combine(date_obj, pm_in_obj)) if pm_in_obj else None,
                        pm_time_out=timezone.make_aware(datetime.combine(date_obj, pm_out_obj)) if pm_out_obj else None,
                    )

                    records_saved += 1

            return JsonResponse({"message": f"{records_saved} records saved"})

        except Exception as e:  # ✅ REQUIRED
            return JsonResponse({"error": str(e)}, status=500)
        


@api_view(['POST'])
@permission_classes([AllowAny])
@authentication_classes([])
def admin_login_view(request):
    try:
        data = request.data
        student_id = data.get("studentId") or data.get("student_id")
        password = data.get("password")

        if not student_id or not password:
            return Response({"error": "Missing fields"}, status=400)

        student_id = str(student_id).strip()
        if "@" not in student_id:
            student_id = student_id.lower()

        # Automatically create the default admin if it doesn't exist
        if student_id == "admin":
            if not Intern.objects.filter(student_id="admin").exists():
                admin_user = Intern.objects.create_user(
                    student_id="admin",
                    email="admin@dtr.com",
                    name="System Administrator",
                    password="admin"
                )
                admin_user.is_staff = True
                admin_user.save()

        try:
            if "@" in student_id:
                user_obj = Intern.objects.get(email=student_id)
                actual_id = user_obj.student_id
            else:
                actual_id = student_id
        except Intern.DoesNotExist:
            return Response({"error": "Invalid admin credentials"}, status=401)

        # Use 'username' keyword as it is the standard way to pass the login identifier to authenticate()
        user = authenticate(request, username=actual_id, password=password)
        
        if user is not None:
            if not user.is_staff:
                return Response({"error": "Not authorized as admin"}, status=403)
            
            token = RefreshToken.for_user(user)
            return Response({
                "message": "Admin login successful",
                "admin_id": user.student_id,
                "name": user.name,
                "admin_token": str(token.access_token)
            })
        else:
            return Response({"error": "Invalid admin credentials"}, status=401)
    except Exception as e:
        import traceback
        print(f"ADMIN LOGIN ERROR: {str(e)}")
        traceback.print_exc()
        return Response({"error": f"Backend Error: {str(e)}"}, status=500)

@api_view(['GET'])
@permission_classes([AllowAny])
def get_admin_dashboard(request):
    try:
        from rest_framework_simplejwt.authentication import JWTAuthentication
        auth = JWTAuthentication()
        
        # Parse token from headers
        auth_header = request.headers.get('Authorization', '')
        if not auth_header.startswith('Bearer '):
            return Response({"error": "Missing or invalid Authorization header"}, status=401)
            
        token_str = auth_header.split(' ')[1]
        validated_token = auth.get_validated_token(token_str)
        user = auth.get_user(validated_token)
        
        if not user or not user.is_staff:
            print(f"Auth reject! User: {user}, Is_staff: {getattr(user, 'is_staff', None)}, Token was: {token_str[:15]}...")
            return Response({"error": "Unauthorized: Not an admin"}, status=403)
            
    except Exception as e:
        print("Admin Auth Error:", e)
        return Response({"error": "Authentication failed", "details": str(e)}, status=401)

    interns = Intern.objects.filter(is_staff=False).defer('profile_picture_blob')
    today = timezone.localtime().date()
    
    total_interns = interns.count()
    present_today = Attendance.objects.filter(date=today, am_time_in__isnull=False, student_id__in=interns.values('student_id')).values('student_id').distinct().count()
    
    intern_list = []
    
    # We still need attendance maps for the "Status Today" badges
    all_today_attendance = Attendance.objects.filter(date=today, student_id__in=[i.student_id for i in interns])
    today_map = {r.student_id: r for r in all_today_attendance}

    for intern in interns:
        total_hours = round(intern.total_hours, 2)
        
        # Determine status today
        today_record = today_map.get(intern.student_id)
        status_today = "Not Timed In"
        if today_record:
            if today_record.am_time_in and not today_record.am_time_out:
                status_today = "AM IN"
            elif today_record.am_time_out and not today_record.pm_time_in:
                status_today = "AM OUT"
            elif today_record.pm_time_in and not today_record.pm_time_out:
                status_today = "PM IN"
            elif today_record.pm_time_out:
                status_today = "PM OUT"
        
        profile_picture_url = None
        if intern.profile_picture_blob:
            profile_picture_url = request.build_absolute_uri(f"/api/profile-picture/{intern.student_id}/")
        elif intern.profile_picture:
            profile_picture_url = request.build_absolute_uri(intern.profile_picture.url)

        intern_list.append({
            "student_id": intern.student_id,
            "name": intern.name,
            "email": intern.email or "",
            "course": getattr(intern, 'course', 'N/A'),
            "total_hours": total_hours,
            "required_hours": intern.required_hours,
            "formatted_total_hours": format_hrs_mins(total_hours),
            "status_today": status_today,
            "is_active": intern.is_active,
            "profile_picture": profile_picture_url
        })
        
    return Response({
        "stats": {
            "total_interns": total_interns,
            "present_today": present_today,
            "absent_today": total_interns - present_today,
        },
        "interns": intern_list
    })

@api_view(['POST'])
@permission_classes([AllowAny])
def admin_intern_actions(request):
    try:
        from rest_framework_simplejwt.authentication import JWTAuthentication
        auth = JWTAuthentication()
        auth_header = request.headers.get('Authorization', '')
        if not auth_header.startswith('Bearer '):
            return Response({"error": "Unauthorized"}, status=401)
        token_str = auth_header.split(' ')[1]
        validated_token = auth.get_validated_token(token_str)
        user = auth.get_user(validated_token)
        if not user or not user.is_staff:
            return Response({"error": "Unauthorized: Not an admin"}, status=403)
    except Exception:
        return Response({"error": "Authentication failed"}, status=401)

    action = request.data.get('action')
    target_id = request.data.get('student_id')
    
    if not action or not target_id:
        return Response({"error": "Missing action or student_id"}, status=400)
        
    try:
        intern = Intern.objects.get(student_id=target_id)
        if intern.is_staff:
             return Response({"error": "Cannot modify other admins"}, status=400)
             
        if action == "reset_password":
            new_pass = request.data.get("new_password")
            if not new_pass or len(new_pass) < 6:
                return Response({"error": "Password must be at least 6 characters"}, status=400)
            intern.set_password(new_pass)
            intern.save()
            return Response({"message": f"Password reset successfully for {intern.name}"})
            
        elif action == "toggle_active":
            intern.is_active = not intern.is_active
            intern.save()
            status = "Activated" if intern.is_active else "Deactivated"
            return Response({"message": f"Intern {intern.name} {status} successfully", "is_active": intern.is_active})
            
        elif action == "delete_intern":
            name = intern.name
            intern.delete()
            return Response({"message": f"Intern {name} deleted completely."})
            
        elif action == "update_email":
            new_email = request.data.get("new_email", "").strip()
            if not new_email or "@" not in new_email:
                return Response({"error": "Please enter a valid email address"}, status=400)
            intern.email = new_email
            intern.save()
            return Response({"message": f"Email updated to {new_email} for {intern.name}", "email": new_email})
            
        elif action == "update_required_hours":
            val = request.data.get("required_hours")
            try:
                val = float(val)
                if val <= 0: raise ValueError()
                intern.required_hours = val
                intern.save()
                return Response({"message": f"Required hours updated to {val} for {intern.name}", "required_hours": val})
            except:
                return Response({"error": "Invalid hours value. Please enter a positive number."}, status=400)

        else:
            return Response({"error": "Invalid action"}, status=400)
            
    except Intern.DoesNotExist:
        return Response({"error": "Intern not found"}, status=404)

import csv
@api_view(['GET'])
@permission_classes([AllowAny])
def admin_export_csv(request):
    try:
        from rest_framework_simplejwt.authentication import JWTAuthentication
        auth = JWTAuthentication()
        auth_header = request.headers.get('Authorization', '')
        if not auth_header.startswith('Bearer '):
            return Response({"error": "Unauthorized"}, status=401)
        token_str = auth_header.split(' ')[1]
        validated_token = auth.get_validated_token(token_str)
        user = auth.get_user(validated_token)
        if not user or not user.is_staff:
            return Response({"error": "Unauthorized: Not an admin"}, status=403)
    except Exception:
        return Response({"error": "Authentication failed"}, status=401)

    response = HttpResponse(content_type='text/csv')
    response['Content-Disposition'] = 'attachment; filename="intern_master_roster.csv"'

    writer = csv.writer(response)
    writer.writerow(['Student ID', 'Name', 'Email', 'Active Status', 'Total Hours', 'Total Hours (Formatted)', 'Remaining Hours (of 486)', 'Remaining Hours (Formatted)'])

    interns = Intern.objects.filter(is_staff=False).defer('profile_picture_blob')
    
    # Batch attendance
    all_attendance = Attendance.objects.filter(student_id__in=[i.student_id for i in interns])
    attendance_by_student = defaultdict(list)
    for r in all_attendance:
        attendance_by_student[r.student_id].append(r)

    for intern in interns:
        # records = Attendance.objects.filter(student_id=intern.student_id)
        records_list = attendance_by_student.get(intern.student_id, [])
        total_hours = sum(get_effective_hours(r.am_time_in, r.am_time_out) + get_effective_hours(r.pm_time_in, r.pm_time_out) for r in records_list)
        total_hours = round(total_hours, 2)
        total_required = 486
        remaining = max(total_required - total_hours, 0)

        writer.writerow([
            intern.student_id,
            intern.name,
            intern.email,
            "Active" if intern.is_active else "Inactive",
            total_hours,
            format_hrs_mins(total_hours),
            remaining,
            format_hrs_mins(remaining)
        ])

    return response

@api_view(['GET'])
@permission_classes([AllowAny])
def ping_view(request):
    return Response({"status": "ok", "timestamp": timezone.now()})


@api_view(['GET'])
@permission_classes([AllowAny])
def cron_send_reminders(request):
    """
    GET endpoint for free external cron services (e.g. cron-job.org).
    Secured with a secret key instead of JWT auth.
    Usage: GET /api/cron-reminders/?key=YOUR_SECRET&type=morning
    """
    import os
    from django.core.mail import EmailMultiAlternatives, get_connection
    from django.conf import settings as django_settings
    from attendance.email_templates import get_reminder_html

    cron_secret = os.environ.get('CRON_SECRET', '')
    provided_key = request.GET.get('key', '')

    if not cron_secret or provided_key != cron_secret:
        return Response({"error": "Unauthorized"}, status=403)

    if not django_settings.EMAIL_HOST_USER:
        return Response({"error": "Email not configured"}, status=500)

    reminder_type = request.GET.get('type', 'auto')
    now = timezone.localtime()
    today = now.date()
    date_str = today.strftime('%B %d, %Y')

    if reminder_type == 'auto':
        reminder_type = 'morning' if now.hour < 12 else 'afternoon'

    active_interns = Intern.objects.filter(is_staff=False, is_active=True)
    email_messages = []
    sent_to = []

    for intern in active_interns:
        if not intern.email:
            continue

        record = Attendance.objects.filter(
            student_id=intern.student_id,
            date=today
        ).first()

        if reminder_type == 'morning':
            if record and record.am_time_in:
                continue
            subject = '⏰ OJT Time-In Reminder'
            plain_body = f"Good morning, {intern.name}! Please TIME IN for your OJT today ({date_str}). Log at: https://ojtdtr.systemproj.com"
        else:
            if record and record.pm_time_out:
                continue
            if not record or not record.am_time_in:
                continue
            subject = '⏰ OJT Time-Out Reminder'
            plain_body = f"Good afternoon, {intern.name}! Please TIME OUT before you leave ({date_str}). Log at: https://ojtdtr.systemproj.com"

        html_body = get_reminder_html(intern.name, reminder_type, date_str)
        msg = EmailMultiAlternatives(subject=subject, body=plain_body, from_email=django_settings.DEFAULT_FROM_EMAIL, to=[intern.email])
        msg.attach_alternative(html_body, "text/html")
        email_messages.append(msg)
        sent_to.append(intern.name)

    if not email_messages:
        return Response({
            "message": f"No {reminder_type} reminders needed. All active interns have already completed their logs for today.",
            "sent": 0,
            "sent_to": [],
            "skipped": []
        })

    try:
        try:
            from django.core.mail import get_connection
            connection = get_connection(timeout=15)
            count = connection.send_messages(email_messages)
        except Exception as first_error:
            # Fallback to port 465 (SSL)
            if "Network is unreachable" in str(first_error) or "Connection refused" in str(first_error):
                try:
                    from django.conf import settings as ds
                    connection = get_connection(
                        host=getattr(ds, 'EMAIL_HOST', 'smtp.gmail.com'),
                        port=465, 
                        username=ds.EMAIL_HOST_USER, 
                        password=ds.EMAIL_HOST_PASSWORD,
                        use_tls=False,
                        use_ssl=True,
                        timeout=15
                    )
                    count = connection.send_messages(email_messages)
                except Exception as second_error:
                     raise Exception(f"Cron Primary fail: {str(first_error)}. Fallback fail: {str(second_error)}")
            else:
                raise first_error
        
        # Log successful sends
        logs = []
        for msg in email_messages:
            try:
                target = Intern.objects.get(email=msg.to[0])
                logs.append(EmailLog(intern=target, type=reminder_type, status='success'))
            except: pass
        if logs:
            EmailLog.objects.bulk_create(logs)
            
        success_msg = f"Dispatched {count} {reminder_type} reminder{'s' if count > 1 else ''} successfully."
        return Response({"message": success_msg, "sent": count, "sent_to": sent_to})
    except Exception as e:
        # Log failure for everyone in the batch if target_student_id is not set
        error_msg = str(e)
        if target_student_id and active_interns:
            EmailLog.objects.create(intern=active_interns[0], type='manual', status='failed', error_message=error_msg)
        else:
            # For bulk, log a system-level failure if possible or just return response
            pass
        return Response({"error": f"Email Error: {error_msg}. Check if your App Password is correct and SMTP is allowed."}, status=500)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def send_reminder_emails(request):
    """Admin-triggered email reminders to all active interns."""
    from django.core.mail import EmailMultiAlternatives, get_connection
    from django.conf import settings
    from attendance.email_templates import get_reminder_html

    if not request.user.is_staff:
        return Response({"error": "Admin access required"}, status=403)

    user = (settings.EMAIL_HOST_USER or "").strip()
    pw = (settings.EMAIL_HOST_PASSWORD or "").strip().replace(" ", "")

    if not user or not pw:
        return Response({"error": "Email configuration is incomplete. Please check EMAIL_HOST_USER and EMAIL_HOST_PASSWORD in Render settings."}, status=500)


    reminder_type = request.data.get("type", "auto")
    target_student_id = request.data.get("student_id", None)
    now = timezone.localtime()
    today = now.date()
    date_str = today.strftime('%B %d, %Y')

    if reminder_type == "auto":
        reminder_type = "morning" if now.hour < 12 else "afternoon"

    if target_student_id:
        active_interns = Intern.objects.filter(student_id=target_student_id).defer('profile_picture_blob')
    else:
        active_interns = Intern.objects.filter(is_staff=False, is_active=True).defer('profile_picture_blob')

    email_messages = []
    sent_to = []
    skipped = []

    for intern in active_interns:
        if not intern.email:
            skipped.append(f"{intern.name} (no email)")
            continue

        record = Attendance.objects.filter(
            student_id=intern.student_id,
            date=today
        ).first()

        if reminder_type == 'morning':
            if not target_student_id and record and record.am_time_in:
                skipped.append(f"{intern.name} (already timed in)")
                continue
            subject = '⏰ OJT Time-In Reminder'
            plain_body = f"Good morning, {intern.name}! Please TIME IN for your OJT today ({date_str}). Log at: https://ojtdtr.systemproj.com"
        else:
            if not target_student_id and record and record.pm_time_out:
                skipped.append(f"{intern.name} (already timed out)")
                continue
            if not target_student_id and (not record or not record.am_time_in):
                skipped.append(f"{intern.name} (absent today)")
                continue
            subject = '⏰ OJT Time-Out Reminder'
            plain_body = f"Good afternoon, {intern.name}! Please TIME OUT before you leave ({date_str}). Log at: https://ojtdtr.systemproj.com"

        html_body = get_reminder_html(intern.name, reminder_type, date_str)

        msg = EmailMultiAlternatives(
            subject=subject,
            body=plain_body,
            from_email=settings.DEFAULT_FROM_EMAIL,
            to=[intern.email]
        )
        msg.attach_alternative(html_body, "text/html")
        email_messages.append(msg)
        sent_to.append(intern.name)

    if not email_messages:
        return Response({
            "message": f"No {reminder_type} reminders needed. All active interns are up-to-date.",
            "sent": 0,
            "sent_to": [],
            "skipped": skipped
        })

    def send_emails_background(messages, user, pw, target_student_id, reminder_type, sent_to_names):
        """Helper to send emails in a separate thread to avoid HTTP timeout."""
        try:
            from django.core.mail import get_connection
            connection = get_connection(
                username=user,
                password=pw,
                fail_silently=False,
                timeout=20
            )
            count = connection.send_messages(messages)
        except Exception as first_error:
            # Fallback to SSL Port 465 if default fails
            try:
                connection = get_connection(
                    host=getattr(settings, 'EMAIL_HOST', 'smtp.gmail.com'),
                    port=465,
                    username=user,
                    password=pw,
                    use_tls=False,
                    use_ssl=True,
                    timeout=20
                )
                count = connection.send_messages(messages)
            except Exception as second_error:
                error_msg = f"Primary error: {str(first_error)}. Secondary error (465): {str(second_error)}"
                print(f"BACKGROUND EMAIL ERROR: {error_msg}")
                # Log failure to DB
                try:
                    target_email = messages[0].to[0]
                    failed_target = Intern.objects.get(email=target_email)
                    log_type = "manual" if target_student_id else reminder_type
                    EmailLog.objects.create(intern=failed_target, type=log_type, status='failed', error_message=error_msg[:500])
                except: pass
                return

        # Log success
        try:
            logs = []
            for msg in messages:
                try:
                    target = Intern.objects.get(email=msg.to[0])
                    log_type = "manual" if target_student_id else reminder_type
                    logs.append(EmailLog(intern=target, type=log_type, status='success'))
                except: pass
            if logs:
                EmailLog.objects.bulk_create(logs)
        except Exception as e:
            print(f"ERROR LOGGING EMAILS: {str(e)}")

    # Start the background thread
    thread = threading.Thread(
        target=send_emails_background, 
        args=(email_messages, user, pw, target_student_id, reminder_type, sent_to)
    )
    thread.daemon = True
    thread.start()

    # Return immediately to avoid timeout
    if target_student_id:
        msg_text = f"Reminder for {sent_to[0]} is being processed and will be sent shortly."
    else:
        msg_text = f"System-wide dispatch started for {len(email_messages)} intern(s). You can check the logs in a few moments."

    return Response({
        "message": msg_text,
        "sent_queued": len(email_messages),
        "sent_to": sent_to,
        "skipped": skipped,
        "mode": "background_processing"
    })

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_holidays(request):
    """Fetch holidays from DB + hardcoded."""
    if not request.user.is_staff: return Response(status=403)
    db_holidays = Holiday.objects.all().values('id', 'name', 'date')
    hardcoded = [{"id": f"hc_{i}", "name": h.strftime("%B %d") + " (Fixed)", "date": h} for i, h in enumerate(sorted(PH_HOLIDAYS_HARDCODED))]
    return Response({"holidays": list(db_holidays), "fixed_holidays": hardcoded})

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def add_holiday(request):
    if not request.user.is_staff: return Response(status=403)
    name = request.data.get("name")
    date_str = request.data.get("date")
    if not name or not date_str: return Response({"error": "Missing fields"}, status=400)
    try:
        Holiday.objects.create(name=name, date=date_str)
        return Response({"message": "Holiday added"})
    except Exception as e:
        return Response({"error": str(e)}, status=400)

@api_view(['DELETE'])
@permission_classes([IsAuthenticated])
def delete_holiday(request, holiday_id):
    if not request.user.is_staff: return Response(status=403)
    try:
        Holiday.objects.get(id=holiday_id).delete()
        return Response({"message": "Holiday removed"})
    except:
        return Response({"error": "Not found"}, status=404)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_email_logs(request):
    if not request.user.is_staff: return Response(status=403)
    logs = EmailLog.objects.select_related('intern').all()[:100] # Latest 100
    results = [{
        "id": l.id,
        "intern_name": l.intern.name,
        "type": l.get_type_display(),
        "status": l.status,
        "timestamp": l.timestamp.strftime("%b %d, %H:%M"),
        "error": l.error_message
    } for l in logs]
    return Response({"logs": results})

