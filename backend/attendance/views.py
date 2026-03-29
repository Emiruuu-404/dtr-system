import json
import mimetypes
import re, pdfplumber
from django.shortcuts import get_object_or_404
from django.http import JsonResponse, FileResponse, HttpResponse, Http404
from django.views.decorators.csrf import csrf_exempt
from django.utils import timezone
from .models import Intern, Attendance, AccomplishmentReport, AccomplishmentImage, get_effective_hours, ChatMessage
from django.contrib.auth.hashers import make_password, check_password
import io
from datetime import datetime, time, timedelta
import math
import uuid
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from django.db.models import Q
from collections import defaultdict


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
def login_view(request):
    data = request.data
    student_id = data.get("studentId") or data.get("student_id")
    password = data.get("password")

    if not student_id or not password:
        return Response({"error": "Missing fields"}, status=400)

    student_id = str(student_id).strip()
    if "@" not in student_id:
        student_id = student_id.lower()

    try:
        if "@" in student_id:
            user_obj = Intern.objects.get(email=student_id)
        else:
            user_obj = Intern.objects.get(student_id=student_id)
        actual_id = user_obj.student_id
    except Intern.DoesNotExist:
        return Response({"error": "This account does not exist or has been permanently deleted."}, status=401)

    if not user_obj.is_active:
        return Response({"error": "Your account has been deactivated. Please contact the administrator."}, status=403)

    user = authenticate(request, student_id=actual_id, password=password)
    
    if user is not None:
        token = RefreshToken.for_user(user)
        return Response({
            "message": "Login successful",
            "student_id": user.student_id,
            "name": user.name,
            "session_token": str(token.access_token)
        })
    else:
        return Response({"error": "Invalid login credentials. Please check your password."}, status=401)

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
    total_required = 486
    remaining_hours = max(total_required - total_hours, 0)
    
    if remaining_hours == 0:
        est_date_str = "Completed"
    else:
        remaining_days = math.ceil(remaining_hours / 8)
        est = today
        added_days = 0
        while added_days < remaining_days:
            est += timedelta(days=1)
            # Add day if it's a weekday, or if it's a weekend and the intern has a history of working on that day
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
    ).order_by('-date')

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

    # Use current month and year
    now = timezone.localtime()
    year = now.year
    month = now.month
    current_day = now.day
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
            
        return JsonResponse({
            "name": user.name,
            "email": user.email,
            "student_id": user.student_id,
            "profile_picture": profile_picture_url
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
        
        # PERSIST: save to file AND postgres blob fields
        user.profile_picture = image
        user.profile_picture_content_type = getattr(image, "content_type", "") or "image/jpeg"
        image_bytes = image.read()
        user.profile_picture_blob = image_bytes
        user.save()
        
        # Prefer generating a BLOB based URL that works everywhere (local/render)
        profile_picture_url = request.build_absolute_uri(f"/api/profile-picture/{user.student_id}/")

        return JsonResponse({
            "message": "Profile picture uploaded successfully",
            "profile_picture": profile_picture_url
        })
    except Intern.DoesNotExist:
        return JsonResponse({"error": "Account not found"}, status=404)
@api_view(['GET'])
@permission_classes([AllowAny])
def get_profile_picture_view(request, student_id):
    try:
        user = Intern.objects.get(student_id=student_id)
    except Intern.DoesNotExist:
        raise Http404("Account not found")

    if user.profile_picture_blob:
        content_type = user.profile_picture_content_type or "image/jpeg"
        return HttpResponse(bytes(user.profile_picture_blob), content_type=content_type)

    if user.profile_picture:
        try:
            inferred = mimetypes.guess_type(user.profile_picture.name)[0] or "image/jpeg"
            return FileResponse(user.profile_picture.open("rb"), content_type=inferred)
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
def admin_login_view(request):
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

    user = authenticate(request, student_id=actual_id, password=password)
    
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
            "course": getattr(intern, 'course', 'N/A'),
            "total_hours": total_hours,
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

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def admin_chat_send(request):
    try:
        data = request.data
        sender_id = "admin" if request.user.is_staff else str(request.user.student_id).strip().lower()
        receiver_id = str(data.get("receiver_id", "")).strip().lower()
        message = data.get("message")

        if not receiver_id or not message:
            return Response({"error": "Missing fields"}, status=400)

        # Simple restrict: if not staff, can only message 'admin'
        if not request.user.is_staff and receiver_id != "admin":
            return Response({"error": "Interns can only message admin"}, status=403)

        msg = ChatMessage.objects.create(
            sender_id=sender_id,
            receiver_id=receiver_id,
            message=message
        )
        return Response({"message": "Sent", "id": msg.id})
    except Exception as e:
        return Response({"error": str(e)}, status=500)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def admin_chat_history(request):
    try:
        peer_id = str(request.GET.get("peer_id", "")).strip().lower()
        if not peer_id:
            return Response({"error": "Missing peer_id"}, status=400)

        my_id = "admin" if request.user.is_staff else str(request.user.student_id).strip().lower()

        # Restrict: if not staff, can only get history with 'admin'
        if not request.user.is_staff and peer_id != "admin":
            return Response({"error": "Unauthorized"}, status=403)

        messages = ChatMessage.objects.filter(
            (Q(sender_id=my_id) & Q(receiver_id=peer_id)) |
            (Q(sender_id=peer_id) & Q(receiver_id=my_id))
        ).order_by('timestamp')

        # Optionally mark as read when fetching
        ChatMessage.objects.filter(receiver_id=my_id, sender_id=peer_id, is_read=False).update(is_read=True)

        data = [{
            "id": m.id,
            "sender": str(m.sender_id).strip().lower(),
            "content": m.message,
            "timestamp": m.timestamp.isoformat() if m.timestamp else None,
            "is_own": str(m.sender_id).strip().lower() == my_id
        } for m in messages]

        return Response({"messages": data})
    except Exception as e:
        return Response({"error": str(e)}, status=500)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def admin_chat_unread(request):
    try:
        my_id = "admin" if request.user.is_staff else str(request.user.student_id).strip().lower()
        count = ChatMessage.objects.filter(receiver_id=my_id, is_read=False).count()
        return Response({"unread_count": count})
    except Exception as e:
        return Response({"error": str(e)}, status=500)