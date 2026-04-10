"""
Management command to send email reminders to interns.

Usage:
    python manage.py send_reminders --type morning    # Time-in reminder
    python manage.py send_reminders --type afternoon   # Time-out reminder  
    python manage.py send_reminders                    # Auto-detect based on time
"""
from django.core.management.base import BaseCommand
from django.core.mail import EmailMultiAlternatives, get_connection
from django.utils import timezone
from django.conf import settings
from attendance.models import Intern, Attendance
from attendance.email_templates import get_reminder_html


class Command(BaseCommand):
    help = 'Send email reminders to active interns to time in/out'

    def add_arguments(self, parser):
        parser.add_argument(
            '--type',
            type=str,
            choices=['morning', 'afternoon'],
            help='Type of reminder: morning (time-in) or afternoon (time-out). Auto-detects if not specified.'
        )

    def handle(self, *args, **options):
        if not settings.EMAIL_HOST_USER:
            self.stderr.write(self.style.ERROR(
                'EMAIL_HOST_USER is not configured. Set it in environment variables.'
            ))
            return

        now = timezone.localtime()
        today = now.date()
        date_str = today.strftime('%B %d, %Y')
        reminder_type = options.get('type')

        if not reminder_type:
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
            msg = EmailMultiAlternatives(
                subject=subject,
                body=plain_body,
                from_email=settings.DEFAULT_FROM_EMAIL,
                to=[intern.email]
            )
            msg.attach_alternative(html_body, "text/html")
            email_messages.append(msg)
            sent_to.append(f"{intern.name} ({intern.email})")

        if not email_messages:
            self.stdout.write(self.style.WARNING(
                f'No {reminder_type} reminders to send. All interns have already logged.'
            ))
            return

        try:
            connection = get_connection()
            count = connection.send_messages(email_messages)
            self.stdout.write(self.style.SUCCESS(
                f'Successfully sent {count} {reminder_type} reminder(s) to:\n' +
                '\n'.join(f'  → {name}' for name in sent_to)
            ))
        except Exception as e:
            self.stderr.write(self.style.ERROR(f'Failed to send emails: {str(e)}'))
