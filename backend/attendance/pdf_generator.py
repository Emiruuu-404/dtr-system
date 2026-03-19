import io
from reportlab.lib.pagesizes import letter
from reportlab.lib import colors
from reportlab.lib.units import inch
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from django.utils import timezone

def generate_dtr_pdf(records, user, month_str, day_type, supervisor, is_first_half):
    buffer = io.BytesIO()
    
    # Portrait with narrow margins to fit two copies natively without spilling over.
    doc = SimpleDocTemplate(buffer, pagesize=letter, rightMargin=0.5*inch, leftMargin=0.5*inch, topMargin=0.3*inch, bottomMargin=0.3*inch)
    
    elements = []
    styles = getSampleStyleSheet()
    
    title_style = ParagraphStyle(name='TitleStyle', parent=styles['Normal'], fontName='Helvetica-Bold', fontSize=9, alignment=0, spaceAfter=2)
    header_style = ParagraphStyle(name='HeaderStyle', parent=styles['Normal'], fontName='Helvetica-Bold', fontSize=12, alignment=1, spaceAfter=6)
    normal_center = ParagraphStyle(name='NormalCenter', parent=styles['Normal'], fontName='Helvetica', fontSize=8, alignment=1)
    normal_left = ParagraphStyle(name='NormalLeft', parent=styles['Normal'], fontName='Helvetica', fontSize=8, alignment=0)
    
    shifts_by_day = {}
    for r in records:
        day = r.date.day
        if day not in shifts_by_day:
            shifts_by_day[day] = []
        shifts_by_day[day].append(r)
        
    start_day = 1 if is_first_half else 16
    end_day = 15 if is_first_half else 31

    def create_form():
        form_elements = []
        form_elements.append(Paragraph("CIVIL SERVICE FORM No. 48", title_style))
        form_elements.append(Paragraph("DAILY TIME RECORD", header_style))
        form_elements.append(Paragraph("—" * 50, normal_center))
        form_elements.append(Spacer(1, 0.05 * inch))
        
        name_str = f"<b>{user.name.upper()}</b>"
        form_elements.append(Paragraph(f"NAME: <u>{name_str}</u>", normal_center))
        form_elements.append(Spacer(1, 0.05 * inch))
        form_elements.append(Paragraph(f"For the month of: <u><b>{month_str.upper()}</b></u>", normal_center))
        form_elements.append(Paragraph(f"Official hours for arrival and departure: <b><u>{day_type.upper()}</u></b>", normal_center))
        form_elements.append(Spacer(1, 0.05 * inch))
        
        # Table Header
        data = [
            ['Day', 'AM IN', 'AM OUT', 'PM IN', 'PM OUT']
        ]
        
        for day in range(1, 32):
            am_in, am_out, pm_in, pm_out = "", "", "", ""
            if start_day <= day <= end_day:
                if day in shifts_by_day:
                    rec = shifts_by_day[day][0]
                    if rec.am_time_in: am_in = timezone.localtime(rec.am_time_in).strftime("%I:%M")
                    if rec.am_time_out: am_out = timezone.localtime(rec.am_time_out).strftime("%I:%M")
                    if rec.pm_time_in: pm_in = timezone.localtime(rec.pm_time_in).strftime("%I:%M")
                    if rec.pm_time_out: pm_out = timezone.localtime(rec.pm_time_out).strftime("%I:%M")
            else:
                am_in, am_out, pm_in, pm_out = "-", "-", "-", "-"
            
            data.append([str(day), am_in, am_out, pm_in, pm_out])
            
        table = Table(data, colWidths=[0.4*inch, 0.7*inch, 0.7*inch, 0.7*inch, 0.7*inch])
        table.setStyle(TableStyle([
            ('FONTNAME', (0,0), (-1,-1), 'Helvetica'),
            ('FONTSIZE', (0,0), (-1,-1), 8),
            ('ALIGN', (0,0), (-1,-1), 'CENTER'),
            ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
            ('INNERGRID', (0,0), (-1,-1), 0.5, colors.black),
            ('BOX', (0,0), (-1,-1), 1, colors.black),
            ('BACKGROUND', (0,0), (-1,0), colors.lightgrey),
            ('FONTNAME', (0,0), (-1,0), 'Helvetica-Bold'),
            ('BOTTOMPADDING', (0,0), (-1,-1), 1),
            ('TOPPADDING', (0,0), (-1,-1), 1),
        ]))
        
        form_elements.append(table)
        form_elements.append(Spacer(1, 0.1 * inch))
        
        cert_text = "I CERTIFY on my honor that the above is a true and correct report of the hours of work performed, record of which was made daily at the time of arrival and departure from office."
        form_elements.append(Paragraph(cert_text, ParagraphStyle(name='Cert', parent=normal_left, fontSize=7, leading=8)))
        
        form_elements.append(Spacer(1, 0.2 * inch))
        form_elements.append(Paragraph("___________________________________", normal_center))
        form_elements.append(Paragraph("Signature over Printed Name", normal_center))
        
        form_elements.append(Spacer(1, 0.2 * inch))
        form_elements.append(Paragraph("VERIFIED as to the prescribed office hours:", normal_left))
        
        form_elements.append(Spacer(1, 0.2 * inch))
        sup_text = supervisor.upper() if supervisor else "___________________________________"
        form_elements.append(Paragraph(f"<b><u>{sup_text}</u></b>", normal_center))
        form_elements.append(Paragraph("In-Charge / Supervisor", normal_center))
        
        return form_elements

    # Generate Two independent tables inside a parent 1x2 horizontal table to look exactly like standard DTR prints.
    # We create them and put them into a master Platypus Table with 2 columns.
    
    left_form = create_form()
    right_form = create_form()
    
    master_table = Table([[left_form, right_form]], colWidths=[3.6*inch, 3.6*inch])
    master_table.setStyle(TableStyle([
        ('VALIGN', (0,0), (-1,-1), 'TOP'),
        ('ALIGN', (0,0), (-1,-1), 'CENTER'),
        ('LEFTPADDING', (0,0), (-1,-1), 10),
        ('RIGHTPADDING', (0,0), (-1,-1), 10)
    ]))
    
    elements.append(master_table)

    doc.build(elements)
    buffer.seek(0)
    return buffer
