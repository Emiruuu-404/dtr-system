import io
import os
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import mm
from reportlab.pdfgen import canvas
from pypdf import PdfReader, PdfWriter
from django.utils import timezone
from django.conf import settings


def generate_dtr_pdf(records, user, month_str, day_type, supervisor, is_first_half):
    """
    Generate a DTR PDF by overlaying attendance data onto the official
    DTR_Template.pdf (Civil Service Form No. 48).
    
    The template has two side-by-side copies (left and right).
    We overlay the same data on both copies.
    """
    
    # --- Locate template ---
    template_path = os.path.join(settings.BASE_DIR, 'template', 'DTR_Template.pdf')
    if not os.path.exists(template_path):
        template_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'template', 'DTR_Template.pdf')
    
    # --- Organize records by day ---
    shifts_by_day = {}
    for r in records:
        day = r.date.day
        if day not in shifts_by_day:
            shifts_by_day[day] = r

    start_day = 1 if is_first_half else 16
    end_day = 15 if is_first_half else 31
    
    # --- Calculate total hours ---
    total_hours = 0
    for r in records:
        total_hours += _get_effective_hours(r.am_time_in, r.am_time_out)
        total_hours += _get_effective_hours(r.pm_time_in, r.pm_time_out)
    total_hours = round(total_hours, 2)
    
    # --- PDF page dimensions (A4 in points) ---
    page_width = 595.303937
    page_height = 841.889764
    
    # ============================================================
    # COORDINATE MAPPING (from pdfplumber analysis of template)
    # pdfplumber: top-left origin (Y goes down)
    # reportlab: bottom-left origin (Y goes up)
    # Convert: reportlab_y = page_height - pdfplumber_y
    # ============================================================
    
    # --- Row vertical centers (pdfplumber Y, calculated from grid lines) ---
    # Each row center = midpoint between the horizontal grid line above and below
    row_centers_pdf = {
        1: 193.85,  2: 207.10,  3: 220.35,  4: 233.35,  5: 246.55,
        6: 259.75,  7: 272.75,  8: 286.00,  9: 299.25, 10: 312.25,
       11: 325.45, 12: 338.65, 13: 351.65, 14: 364.90, 15: 378.15,
       16: 391.15, 17: 404.35, 18: 417.55, 19: 430.55, 20: 443.80,
       21: 457.05, 22: 470.05, 23: 483.25, 24: 496.45, 25: 509.45,
       26: 522.70, 27: 535.95, 28: 548.95, 29: 562.15, 30: 575.35,
       31: 588.35
    }
    total_row_center_pdf = 602.25
    
    # --- Column centers (explicit for both copies, from vertical grid lines) ---
    # LEFT copy vertical lines: 70.10 | 101.50 | 140.40 | 171.80 | 210.70 | 250.10
    left_cols = {
        'am_in':  85.80,   # (70.10 + 101.50) / 2
        'am_out': 120.95,  # (101.50 + 140.40) / 2
        'pm_in':  156.10,  # (140.40 + 171.80) / 2
        'pm_out': 191.25,  # (171.80 + 210.70) / 2
    }
    
    # RIGHT copy vertical lines: 349.70 | 381.20 | 420.00 | 451.50 | 490.40 | 529.70
    right_cols = {
        'am_in':  365.45,  # (349.70 + 381.20) / 2
        'am_out': 400.60,  # (381.20 + 420.00) / 2
        'pm_in':  435.75,  # (420.00 + 451.50) / 2
        'pm_out': 470.95,  # (451.50 + 490.40) / 2
    }
    
    # UNDERTIME/TOTAL column centers
    left_total_x = (210.70 + 285.80) / 2   # ~248.25 center of undertime area
    right_total_x = (490.40 + 565.40) / 2  # ~527.90 center of undertime area
    
    # Name field (on the underline after "NAME:")
    name_y_pdf = 97.7
    # Underline spans: left x0=72.46 to x1=277.46, right x0=352.11 to x1=557.11
    name_center_left = (72.46 + 277.46) / 2   # ~174.96
    name_center_right = (352.11 + 557.11) / 2  # ~454.61
    
    # Month field (on the underline after "For the month of")
    month_y_pdf = 111.6
    # Underline spans: left x0=111.05 to x1=276.05, right x0=390.70 to x1=555.70
    month_center_left = (111.05 + 276.05) / 2   # ~193.55
    month_center_right = (390.70 + 555.70) / 2  # ~473.20
    
    # Regular days checkmark position (on the underline after "days")
    # Left: underline x0=242.90 x1=272.90, top=130.01
    regular_check_y_pdf = 130.01
    regular_check_x_left = (242.90 + 272.90) / 2   # ~257.90
    regular_check_x_right = (522.55 + 552.55) / 2  # ~537.55
    
    # Saturdays checkmark position (on the underline after "Saturdays")
    # Left: underline x0=229.87 x1=274.87, top=141.56
    saturday_check_y_pdf = 141.56
    saturday_check_x_left = (229.87 + 274.87) / 2   # ~252.37
    saturday_check_x_right = (509.52 + 554.52) / 2  # ~532.02
    
    # Supervisor name position (on the line above "In-Charge")
    supervisor_y_pdf = 740.0
    supervisor_x_left = 158.0
    supervisor_x_right = 437.7
    
    # Signature line position (above "Signature over Printed Name")
    signature_y_pdf = 685.0
    signature_x_left = 158.0
    signature_x_right = 437.7
    
    # ============================================================
    # CREATE OVERLAY PDF WITH REPORTLAB
    # ============================================================
    overlay_buffer = io.BytesIO()
    c = canvas.Canvas(overlay_buffer, pagesize=(page_width, page_height))
    
    TIME_FONT_SIZE = 7
    
    def to_rl_y(pdfplumber_y):
        """Convert pdfplumber Y (top-left origin) to reportlab Y (bottom-left origin)."""
        return page_height - pdfplumber_y
    
    def draw_centered(x_center, rl_y, text):
        """Draw text horizontally centered at x_center, vertically centered at rl_y."""
        text_width = c.stringWidth(text, c._fontname, c._fontsize)
        # Adjust for vertical centering: shift down by half of font ascent
        c.drawString(x_center - text_width / 2, rl_y - c._fontsize * 0.35, text)
    
    # --- Draw Name (centered on underline, on both copies) ---
    name_text = user.name.upper()
    c.setFont("Helvetica-Bold", 9)
    name_rl_y = to_rl_y(name_y_pdf)
    draw_centered(name_center_left, name_rl_y, name_text)
    draw_centered(name_center_right, name_rl_y, name_text)
    
    # --- Draw Month (centered on underline, on both copies) ---
    c.setFont("Helvetica-Bold", 8)
    month_rl_y = to_rl_y(month_y_pdf)
    draw_centered(month_center_left, month_rl_y, month_str.upper())
    draw_centered(month_center_right, month_rl_y, month_str.upper())
    
    # --- Draw Checkmark on Regular days or Saturdays ---
    # Use ZapfDingbats font: char '4' = ✓ checkmark
    c.setFont("ZapfDingbats", 10)
    checkmark = "4"  # ZapfDingbats '4' = ✓
    if day_type == "Regular":
        check_rl_y = to_rl_y(regular_check_y_pdf)
        draw_centered(regular_check_x_left, check_rl_y, checkmark)
        draw_centered(regular_check_x_right, check_rl_y, checkmark)
    elif day_type == "Saturdays":
        check_rl_y = to_rl_y(saturday_check_y_pdf)
        draw_centered(saturday_check_x_left, check_rl_y, checkmark)
        draw_centered(saturday_check_x_right, check_rl_y, checkmark)
    
    # --- Draw Attendance Data ---
    c.setFont("Helvetica", TIME_FONT_SIZE)
    
    for day in range(1, 32):
        if day not in row_centers_pdf:
            continue
        
        row_rl_y = to_rl_y(row_centers_pdf[day])
        
        if start_day <= day <= end_day and day in shifts_by_day:
            rec = shifts_by_day[day]
            
            am_in = timezone.localtime(rec.am_time_in).strftime("%I:%M") if rec.am_time_in else ""
            am_out = timezone.localtime(rec.am_time_out).strftime("%I:%M") if rec.am_time_out else ""
            pm_in = timezone.localtime(rec.pm_time_in).strftime("%I:%M") if rec.pm_time_in else ""
            pm_out = timezone.localtime(rec.pm_time_out).strftime("%I:%M") if rec.pm_time_out else ""
            
            # LEFT copy
            if am_in:
                draw_centered(left_cols['am_in'], row_rl_y, am_in)
            if am_out:
                draw_centered(left_cols['am_out'], row_rl_y, am_out)
            if pm_in:
                draw_centered(left_cols['pm_in'], row_rl_y, pm_in)
            if pm_out:
                draw_centered(left_cols['pm_out'], row_rl_y, pm_out)
            
            # RIGHT copy
            if am_in:
                draw_centered(right_cols['am_in'], row_rl_y, am_in)
            if am_out:
                draw_centered(right_cols['am_out'], row_rl_y, am_out)
            if pm_in:
                draw_centered(right_cols['pm_in'], row_rl_y, pm_in)
            if pm_out:
                draw_centered(right_cols['pm_out'], row_rl_y, pm_out)
    
    # --- Draw Total Hours ---
    total_text = _format_hrs_mins(total_hours)
    total_rl_y = to_rl_y(total_row_center_pdf)
    c.setFont("Helvetica-Bold", 7)
    draw_centered(left_total_x, total_rl_y, total_text)
    draw_centered(right_total_x, total_rl_y, total_text)
    
    # --- Draw Supervisor Name ---
    if supervisor:
        sup_text = supervisor.upper()
        sup_rl_y = to_rl_y(supervisor_y_pdf)
        c.setFont("Helvetica-Bold", 8)
        draw_centered(supervisor_x_left, sup_rl_y, sup_text)
        draw_centered(supervisor_x_right, sup_rl_y, sup_text)
    
    c.save()
    overlay_buffer.seek(0)
    
    # ============================================================
    # MERGE: Template + Overlay
    # ============================================================
    reader_base = PdfReader(template_path)
    reader_overlay = PdfReader(overlay_buffer)
    
    writer = PdfWriter()
    
    base_page = reader_base.pages[0]
    overlay_page = reader_overlay.pages[0]
    
    base_page.merge_page(overlay_page)
    writer.add_page(base_page)
    
    output_buffer = io.BytesIO()
    writer.write(output_buffer)
    output_buffer.seek(0)
    
    return output_buffer


def _get_effective_hours(start_dt, end_dt):
    """Calculate effective work hours excluding lunch break (12:00-1:00 PM)."""
    from datetime import time, datetime
    
    if not start_dt or not end_dt:
        return 0
    
    local_start = timezone.localtime(start_dt)
    local_end = timezone.localtime(end_dt)
    sec = (local_end - local_start).total_seconds()
    if sec <= 0:
        return 0
    
    lunch_start = timezone.make_aware(datetime.combine(local_start.date(), time(12, 0)))
    lunch_end = timezone.make_aware(datetime.combine(local_start.date(), time(13, 0)))
    
    overlap_start = max(local_start, lunch_start)
    overlap_end = min(local_end, lunch_end)
    
    if overlap_start < overlap_end:
        sec -= (overlap_end - overlap_start).total_seconds()
    
    return sec / 3600


def _format_hrs_mins(decimal_hours):
    """Format decimal hours into a readable string."""
    if decimal_hours <= 0:
        return "0 HRS"
    hrs = int(decimal_hours)
    mins = int(round((decimal_hours - hrs) * 60))
    if hrs > 0 and mins > 0:
        return f"{hrs} hrs {mins} mins"
    elif hrs > 0:
        return f"{hrs} hrs"
    else:
        return f"{mins} mins"
