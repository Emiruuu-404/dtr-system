"""
HTML email templates for the OJT DTR System reminders.
"""


def get_reminder_html(intern_name, reminder_type, date_str):
    """Generate a professionally styled HTML email for time-in/out reminders."""

    if reminder_type == "morning":
        greeting = "Good morning"
        icon = "🌅"
        action = "TIME IN"
        action_color = "#15803d"  # green-700
        message = "Don't forget to record your morning shift!"
        badge_bg = "#dcfce7"  # green-100
        badge_border = "#166534"  # green-900
    else:
        greeting = "Good afternoon"
        icon = "🌇"
        action = "TIME OUT"
        action_color = "#b91c1c"  # red-700
        message = "Make sure your PM shift is properly recorded before you leave!"
        badge_bg = "#fee2e2"  # red-100
        badge_border = "#991b1b"  # red-900

    html = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="margin:0;padding:0;background-color:#f3f4f6;font-family:'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color:#f3f4f6;padding:32px 16px;">
            <tr>
                <td align="center">
                    <table role="presentation" width="520" cellspacing="0" cellpadding="0" style="background-color:#ffffff;border:3px solid #166534;max-width:520px;width:100%;">
                        
                        <!-- Header -->
                        <tr>
                            <td style="background-color:#166534;padding:24px 32px;text-align:center;">
                                <h1 style="margin:0;color:#ffffff;font-size:22px;font-weight:800;letter-spacing:2px;text-transform:uppercase;">
                                    ⏰ OJT DTR System
                                </h1>
                            </td>
                        </tr>

                        <!-- Badge -->
                        <tr>
                            <td style="padding:24px 32px 0 32px;text-align:center;">
                                <table role="presentation" cellspacing="0" cellpadding="0" style="margin:0 auto;">
                                    <tr>
                                        <td style="background-color:{badge_bg};border:2px solid {badge_border};padding:8px 24px;font-size:14px;font-weight:800;color:{action_color};letter-spacing:3px;text-transform:uppercase;">
                                            {icon} {action} REMINDER
                                        </td>
                                    </tr>
                                </table>
                            </td>
                        </tr>

                        <!-- Body -->
                        <tr>
                            <td style="padding:24px 32px;">
                                <p style="margin:0 0 16px 0;font-size:17px;color:#1f2937;line-height:1.6;">
                                    {greeting}, <strong>{intern_name}</strong>! 👋
                                </p>
                                <p style="margin:0 0 20px 0;font-size:15px;color:#4b5563;line-height:1.6;">
                                    This is a friendly reminder to <strong style="color:{action_color};">{action}</strong> for your OJT today.
                                </p>

                                <!-- Date Card -->
                                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin:0 0 20px 0;">
                                    <tr>
                                        <td style="background-color:#f0fdf4;border-left:4px solid #166534;padding:16px 20px;">
                                            <p style="margin:0 0 4px 0;font-size:12px;color:#6b7280;font-weight:700;text-transform:uppercase;letter-spacing:1px;">
                                                📅 Date
                                            </p>
                                            <p style="margin:0;font-size:16px;color:#166534;font-weight:800;">
                                                {date_str}
                                            </p>
                                        </td>
                                    </tr>
                                </table>

                                <p style="margin:0 0 24px 0;font-size:14px;color:#6b7280;line-height:1.6;">
                                    {message}
                                </p>

                                <!-- CTA Button -->
                                <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                                    <tr>
                                        <td align="center">
                                            <a href="https://ojtdtr.systemproj.com" 
                                               style="display:inline-block;background-color:#166534;color:#ffffff;padding:14px 36px;font-size:14px;font-weight:800;text-decoration:none;text-transform:uppercase;letter-spacing:2px;border:2px solid #14532d;">
                                                🕐 Log Attendance Now
                                            </a>
                                        </td>
                                    </tr>
                                </table>
                            </td>
                        </tr>

                        <!-- Footer -->
                        <tr>
                            <td style="background-color:#f9fafb;border-top:2px solid #e5e7eb;padding:20px 32px;text-align:center;">
                                <p style="margin:0 0 4px 0;font-size:12px;color:#9ca3af;font-weight:600;">
                                    OJT Daily Time Record System
                                </p>
                                <p style="margin:0;font-size:11px;color:#d1d5db;">
                                    This is an automated reminder. Please do not reply to this email.
                                </p>
                            </td>
                        </tr>

                    </table>
                </td>
            </tr>
        </table>
    </body>
    </html>
    """
    return html
