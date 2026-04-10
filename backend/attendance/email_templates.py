"""
HTML email templates for the OJT DTR System reminders.
"""


def get_reminder_html(intern_name, reminder_type, date_str):
    """Generate a professionally styled HTML email for time-in/out reminders."""

    # Colors from the system
    dark_green = "#064e3b"  # green-900
    mid_green = "#166534"   # green-800
    bg_gray = "#f3f4f6"
    
    # Design Tokens
    dark_green = "#064e3b"
    accent_red = "#991b1b"
    accent_green = "#15803d"
    bg_color = "#f3f4f6"

    if reminder_type == "morning":
        indicator = f"background-color:{accent_green};"
        status_label = "MORNING SHIFT"
        action_text = "TIME IN"
        accent = accent_green
        footer_note = "Start your day right! Record your arrival in the system."
    else:
        indicator = f"background-color:{accent_red};"
        status_label = "AFTERNOON SHIFT"
        action_text = "TIME OUT"
        accent = accent_red
        footer_note = "Ensure your PM shift is properly recorded before you leave."

    html = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="margin:0;padding:0;background-color:{bg_color};font-family:'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color:{bg_color};padding:50px 20px;">
            <tr>
                <td align="center">
                    
                    <!-- Main Card -->
                    <table role="presentation" width="550" cellspacing="0" cellpadding="0" style="background-color:#ffffff; border:4px solid {dark_green}; box-shadow: 12px 12px 0px 0px {dark_green}; max-width:550px; width:100%;">
                        
                        <!-- Top Accent Bar -->
                        <tr>
                            <td height="8" style="{indicator} font-size:1px; line-height:1px;">&nbsp;</td>
                        </tr>

                        <!-- Brand Header -->
                        <tr>
                            <td style="padding:25px 35px; border-bottom:2px solid {dark_green};">
                                <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                                    <tr>
                                        <td style="font-size:14px; font-weight:900; color:{dark_green}; letter-spacing:4px; text-transform:uppercase;">
                                            OJT DTR SYSTEM
                                        </td>
                                        <td align="right" style="font-size:10px; font-weight:900; color:{dark_green}; letter-spacing:1px; text-transform:uppercase; background-color:{bg_color}; padding:5px 12px; border:2px solid {dark_green};">
                                            OFFICIAL
                                        </td>
                                    </tr>
                                </table>
                            </td>
                        </tr>

                        <!-- Content Area -->
                        <tr>
                            <td style="padding:45px 40px;">
                                <h1 style="margin:0 0 15px 0; font-size:32px; font-weight:900; color:{dark_green}; letter-spacing:-1px; text-transform:uppercase; line-height:1;">
                                    {reminder_type}<br/>REMINDER
                                </h1>
                                
                                <p style="margin:0 0 35px 0; font-size:16px; font-weight:700; color:#4b5563;">
                                    Hello, <span style="color:{dark_green}; border-bottom:2px solid {dark_green};">{intern_name}</span>.
                                </p>

                                <!-- Professional Notice Box -->
                                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin-bottom:35px;">
                                    <tr>
                                        <td style="border-left:8px solid {accent}; background-color:#f9fafb; padding:25px; border-top:2px solid #e5e7eb; border-right:2px solid #e5e7eb; border-bottom:2px solid #e5e7eb;">
                                            <p style="margin:0; font-size:15px; color:#1f2937; line-height:1.6; font-weight:600;">
                                                This is an automated operational notice to record your <strong style="color:{accent};">{action_text}</strong>. Failure to log may affect your total rendering hours.
                                            </p>
                                        </td>
                                    </tr>
                                </table>

                                <!-- Data Grid -->
                                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin-bottom:40px;">
                                    <tr>
                                        <td width="50%" style="padding-right:12px;">
                                            <div style="border:2px solid #e5e7eb; padding:15px;">
                                                <p style="margin:0; font-size:10px; font-weight:900; color:#9ca3af; text-transform:uppercase; letter-spacing:1px;">Date Range</p>
                                                <p style="margin:6px 0 0 0; font-size:14px; font-weight:800; color:{dark_green};">{date_str}</p>
                                            </div>
                                        </td>
                                        <td width="50%" style="padding-left:12px;">
                                            <div style="border:2px solid #e5e7eb; padding:15px;">
                                                <p style="margin:0; font-size:10px; font-weight:900; color:#9ca3af; text-transform:uppercase; letter-spacing:1px;">Action Required</p>
                                                <p style="margin:6px 0 0 0; font-size:14px; font-weight:800; color:{accent};">{status_label}</p>
                                            </div>
                                        </td>
                                    </tr>
                                </table>

                                <!-- CTA -->
                                <table role="presentation" cellspacing="0" cellpadding="0">
                                    <tr>
                                        <td style="background-color:{dark_green}; border:2px solid {dark_green}; box-shadow: 6px 6px 0px 0px #14532d;">
                                            <a href="https://ojtdtr.systemproj.com" 
                                               style="display:inline-block; padding:18px 45px; color:#ffffff; font-size:14px; font-weight:900; text-decoration:none; text-transform:uppercase; letter-spacing:3px;">
                                                MANAGE ATTENDANCE
                                            </a>
                                        </td>
                                    </tr>
                                </table>
                            </td>
                        </tr>

                        <!-- Footer -->
                        <tr>
                            <td style="padding:30px 40px; background-color:{bg_color}; text-align:left; border-top:2px solid {dark_green};">
                                <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                                    <tr>
                                        <td style="font-size:11px; font-weight:800; color:{dark_green}; text-transform:uppercase; letter-spacing:1px;">
                                            OJT Administration Division
                                        </td>
                                    </tr>
                                    <tr>
                                        <td style="padding-top:5px; font-size:10px; color:#9ca3af; font-weight:600; line-height:1.4;">
                                            {footer_note}<br/>
                                            Secure access guaranteed via systemproj.com
                                        </td>
                                    </tr>
                                </table>
                            </td>
                        </tr>
                    </table>

                    <p style="margin-top:30px; font-size:10px; color:#9ca3af; font-weight:700; text-transform:uppercase; letter-spacing:2px;">
                        Automated Notification Module v2.0
                    </p>

                </td>
            </tr>
        </table>
    </body>
    </html>
    """
    return html

    return html

    return html
