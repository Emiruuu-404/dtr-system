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
        # Fallback: try relative
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
    # Template is A4: 595.3 x 841.9 pts
    page_width = 595.3
    page_height = 841.9
    
    # ============================================================
    # COORDINATE MAPPING (from pdfplumber analysis of template)
    # pdfplumber uses top-left origin; reportlab uses bottom-left.
    # Convert: reportlab_y = page_height - pdfplumber_y
    # ============================================================
    
    # --- Row Y positions (pdfplumber top values for each day) ---
    # Day 1 top=189.1, Day 2 top=202.1, etc.
    # Row height pattern: days 1-2 ~13pt, then groups of 3 with ~13pt spacing
    day_y_positions_pdf = {
        1: 189.1, 2: 202.1, 3: 215.6, 4: 228.6, 5: 241.6,
        6: 255.0, 7: 268.0, 8: 281.0, 9: 294.5, 10: 307.5,
        11: 320.5, 12: 333.9, 13: 346.9, 14: 359.9, 15: 373.4,
        16: 386.4, 17: 399.4, 18: 412.8, 19: 425.8, 20: 438.8,
        21: 452.3, 22: 465.3, 23: 478.3, 24: 491.7, 25: 504.7,
        26: 517.7, 27: 531.2, 28: 544.2, 29: 557.2, 30: 570.6,
        31: 583.6
    }
    
    # TOTAL row
    total_row_y_pdf = 596.7
    
    # Column centers (x midpoints) for LEFT copy
    # Vertical lines: 30.6 | 70.1 | 101.5 | 140.4 | 171.8 | 210.7 | 250.1 | 285.8
    # Columns: Day | AM Arrival | AM Departure | PM Arrival | PM Departure | UNDERTIME
    left_cols = {
        'am_in':  (70.1 + 101.5) / 2,    # ~85.8
        'am_out': (101.5 + 140.4) / 2,   # ~120.95
        'pm_in':  (140.4 + 171.8) / 2,   # ~156.1
        'pm_out': (171.8 + 210.7) / 2,   # ~191.25
    }
    
    # RIGHT copy: offset ~279.7 from left
    right_offset = 279.7
    right_cols = {k: v + right_offset for k, v in left_cols.items()}
    
    # Name field position (pdfplumber: NAME: at x=36.1, y=97.7; underline starts at x=72.5)
    name_y_pdf = 97.7
    name_x_left = 73.0
    name_x_right = 352.5
    
    # Month field (pdfplumber: "For the month of" at y=111.6; underline starts at ~111)
    month_y_pdf = 111.6
    month_x_left = 112.0
    month_x_right = 391.5
    
    # Supervisor name position (below "Verified as the prescribed office hours")
    # Signature lines at y=742.3, In-Charge at y=751.5
    supervisor_y_pdf = 740.0
    supervisor_x_left = 158.0
    supervisor_x_right = 437.7
    
    # ============================================================
    # CREATE OVERLAY PDF WITH REPORTLAB
    # ============================================================
    overlay_buffer = io.BytesIO()
    c = canvas.Canvas(overlay_buffer, pagesize=(page_width, page_height))
    
    font_size = 8
    c.setFont("Helvetica", font_size)
    
    def pdf_y(pdfplumber_top):
        """Convert pdfplumber Y (top-left origin) to reportlab Y (bottom-left origin)."""
        return page_height - pdfplumber_top
    
    def draw_text_centered(x_center, y_reportlab, text, font_size_override=None):
        """Draw text centered at x_center."""
        if font_size_override:
            c.setFont("Helvetica", font_size_override)
        text_width = c.stringWidth(text, c._fontname, c._fontsize)
        c.drawString(x_center - text_width / 2, y_reportlab, text)
        if font_size_override:
            c.setFont("Helvetica", font_size)
    
    def draw_on_both_copies(draw_func):
        """Execute drawing for both left and right copies."""
        draw_func('left')
        draw_func('right')
    
    # --- Draw Name ---
    name_text = user.name.upper()
    def draw_name(side):
        x = name_x_left if side == 'left' else name_x_right
        y = pdf_y(name_y_pdf) - 2  # slight offset to sit on line
        c.setFont("Helvetica-Bold", 9)
        c.drawString(x, y, name_text)
        c.setFont("Helvetica", font_size)
    draw_on_both_copies(draw_name)
    
    # --- Draw Month ---
    def draw_month(side):
        x = month_x_left if side == 'left' else month_x_right
        y = pdf_y(month_y_pdf) - 2
        c.setFont("Helvetica-Bold", 8)
        c.drawString(x, y, month_str.upper())
        c.setFont("Helvetica", font_size)
    draw_on_both_copies(draw_month)
    
    # --- Draw Attendance Data ---
    for day in range(1, 32):
        if day not in day_y_positions_pdf:
            continue
            
        row_y_pdf = day_y_positions_pdf[day]
        # Text baseline: roughly middle of the row cell
        # Row height is ~13pt, text is 8pt, so offset ~3pt from top
        text_y = pdf_y(row_y_pdf) - 2
        
        if start_day <= day <= end_day and day in shifts_by_day:
            rec = shifts_by_day[day]
            
            am_in = timezone.localtime(rec.am_time_in).strftime("%I:%M") if rec.am_time_in else ""
            am_out = timezone.localtime(rec.am_time_out).strftime("%I:%M") if rec.am_time_out else ""
            pm_in = timezone.localtime(rec.pm_time_in).strftime("%I:%M") if rec.pm_time_in else ""
            pm_out = timezone.localtime(rec.pm_time_out).strftime("%I:%M") if rec.pm_time_out else ""
            
            c.setFont("Helvetica", 7)
            
            # Draw on LEFT copy
            if am_in:
                draw_text_centered(left_cols['am_in'], text_y, am_in)
            if am_out:
                draw_text_centered(left_cols['am_out'], text_y, am_out)
            if pm_in:
                draw_text_centered(left_cols['pm_in'], text_y, pm_in)
            if pm_out:
                draw_text_centered(left_cols['pm_out'], text_y, pm_out)
            
            # Draw on RIGHT copy
            if am_in:
                draw_text_centered(right_cols['am_in'], text_y, am_in)
            if am_out:
                draw_text_centered(right_cols['am_out'], text_y, am_out)
            if pm_in:
                draw_text_centered(right_cols['pm_in'], text_y, pm_in)
            if pm_out:
                draw_text_centered(right_cols['pm_out'], text_y, pm_out)
            
            c.setFont("Helvetica", font_size)
    
    # --- Draw Total Hours ---
    # TOTAL row: undertime column area, but we'll put total hours text
    # Using the UNDERTIME column area (between 210.7 and 250.1 for left)
    total_text = _format_hrs_mins(total_hours)
    total_text_y = pdf_y(total_row_y_pdf) - 2
    
    left_total_x = (210.7 + 250.1) / 2
    right_total_x = left_total_x + right_offset
    
    c.setFont("Helvetica-Bold", 7)
    draw_text_centered(left_total_x, total_text_y, total_text)
    draw_text_centered(right_total_x, total_text_y, total_text)
    c.setFont("Helvetica", font_size)
    
    # --- Draw Supervisor Name ---
    if supervisor:
        sup_text = supervisor.upper()
        sup_y = pdf_y(supervisor_y_pdf) - 2
        c.setFont("Helvetica-Bold", 8)
        draw_text_centered(supervisor_x_left, sup_y, sup_text)
        draw_text_centered(supervisor_x_right, sup_y, sup_text)
        c.setFont("Helvetica", font_size)
    
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
