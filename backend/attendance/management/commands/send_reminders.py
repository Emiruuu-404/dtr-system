"""
Management command to send email reminders to interns.

Usage:
    python manage.py send_reminders --type morning    # Time-in reminder
    python manage.py send_reminders --type afternoon   # Time-out reminder  
    python manage.py send_reminders                    # Auto-detect based on time
"""
from django.core.management.base import BaseCommand
from django.core.mail import send_mass_mail
from django.utils import timezone
from django.conf import settings
from attendance.models import Intern, Attendance


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
        reminder_type = options.get('type')

        # Auto-detect based on current time
        if not reminder_type:
            reminder_type = 'morning' if now.hour < 12 else 'afternoon'

        active_interns = Intern.objects.filter(is_staff=False, is_active=True)
        messages = []
        sent_to = []

        for intern in active_interns:
            if not intern.email:
                continue

            record = Attendance.objects.filter(
                student_id=intern.student_id,
                date=today
            ).first()

            if reminder_type == 'morning':
                # Skip if already timed in
                if record and record.am_time_in:
                    continue

                subject = '⏰ OJT Time-In Reminder'
                body = (
                    f"Good morning, {intern.name}!\n\n"
                    f"This is a friendly reminder to TIME IN for your OJT today.\n\n"
                    f"📅 Date: {today.strftime('%B %d, %Y')}\n"
                    f"🕐 Please log your attendance at: https://ojtdtr.systemproj.com\n\n"
                    f"Don't forget to record your morning shift!\n\n"
                    f"— OJT DTR System"
                )
            else:
                # Skip if already timed out
                if record and record.pm_time_out:
                    continue
                # Only remind those who timed in
                if not record or not record.am_time_in:
                    continue

                subject = '⏰ OJT Time-Out Reminder'
                body = (
                    f"Good afternoon, {intern.name}!\n\n"
                    f"This is a friendly reminder to TIME OUT before you leave.\n\n"
                    f"📅 Date: {today.strftime('%B %d, %Y')}\n"
                    f"🕐 Please log your attendance at: https://ojtdtr.systemproj.com\n\n"
                    f"Make sure your PM shift is properly recorded!\n\n"
                    f"— OJT DTR System"
                )

            messages.append((
                subject,
                body,
                settings.DEFAULT_FROM_EMAIL,
                [intern.email]
            ))
            sent_to.append(f"{intern.name} ({intern.email})")

        if not messages:
            self.stdout.write(self.style.WARNING(
                f'No {reminder_type} reminders to send. All interns have already logged.'
            ))
            return

        try:
            count = send_mass_mail(messages, fail_silently=False)
            self.stdout.write(self.style.SUCCESS(
                f'Successfully sent {count} {reminder_type} reminder(s) to:\n' +
                '\n'.join(f'  → {name}' for name in sent_to)
            ))
        except Exception as e:
            self.stderr.write(self.style.ERROR(f'Failed to send emails: {str(e)}'))
