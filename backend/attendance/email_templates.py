"""
HTML email templates for the OJT DTR System reminders.
"""


def get_reminder_html(intern_name, reminder_type, date_str):
    """Generate a professionally styled HTML email for time-in/out reminders."""

    # Colors from the system
    dark_green = "#064e3b"  # green-900
    mid_green = "#166534"   # green-800
    bg_gray = "#f3f4f6"
    
    # Base64 SVG Line-art Icon (Clock)
    clock_svg = f"""<svg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24' fill='none' stroke='{dark_green}' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'><circle cx='12' cy='12' r='10'/><polyline points='12 6 12 12 16 14'/></svg>"""
    import base64
    clock_icon = f"data:image/svg+xml;base64,{base64.b64encode(clock_svg.encode()).decode()}"

    if reminder_type == "morning":
        icon_text = "AM SHIFT"
        action = "TIME IN"
        accent_color = "#15803d"
        message = "Start your day right! Record your arrival in the system."
    else:
        icon_text = "PM SHIFT"
        action = "TIME OUT"
        accent_color = "#b91c1c"
        message = "Ensure your PM shift is properly recorded before you leave."

    html = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="margin:0;padding:0;background-color:{bg_gray};font-family:'Inter', 'Segoe UI', Arial, sans-serif;-webkit-font-smoothing:antialiased;">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color:{bg_gray};padding:40px 20px;">
            <tr>
                <td align="center">
                    
                    <!-- Main Card with Neo-Brutalist Shadow -->
                    <table role="presentation" width="550" cellspacing="0" cellpadding="0" style="background-color:#ffffff; border:4px solid {dark_green}; box-shadow: 10px 10px 0px 0px {dark_green}; max-width:550px; width:100%; text-align:left;">
                        
                        <!-- Header Bar -->
                        <tr>
                            <td style="background-color:{dark_green}; padding:18px 30px;">
                                <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                                    <tr>
                                        <td style="font-size:16px; color:#ffffff; font-weight:900; letter-spacing:3px; text-transform:uppercase; vertical-align:middle;">
                                            OJT DTR SYSTEM
                                        </td>
                                        <td align="right" style="vertical-align:middle;">
                                            <table role="presentation" cellspacing="0" cellpadding="0">
                                                <tr>
                                                    <td style="background-color:#ffffff; border:2px solid {dark_green}; padding:4px 10px; font-size:10px; font-weight:900; letter-spacing:1px; color:{dark_green}; text-transform:uppercase;">
                                                        {icon_text}
                                                    </td>
                                                </tr>
                                            </table>
                                        </td>
                                    </tr>
                                </table>
                            </td>
                        </tr>

                        <!-- Content Area -->
                        <tr>
                            <td style="padding:40px 35px;">
                                <table role="presentation" cellspacing="0" cellpadding="0" style="margin-bottom:15px;">
                                    <tr>
                                        <td style="padding-right:10px; vertical-align:middle;">
                                            <img src="{clock_icon}" width="24" height="24" alt="Icon" style="display:block;">
                                        </td>
                                        <td style="vertical-align:middle;">
                                            <h2 style="margin:0; font-size:24px; font-weight:900; color:{dark_green}; text-transform:uppercase; letter-spacing:-0.5px;">
                                                {reminder_type} Reminder
                                            </h2>
                                        </td>
                                    </tr>
                                </table>

                                <p style="margin:0 0 25px 0; font-size:16px; font-weight:600; color:#4b5563;">
                                    Hello, <span style="color:{dark_green}; text-decoration:underline;">{intern_name}</span>!
                                </p>
                                
                                <!-- Message Box -->
                                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin-bottom:30px;">
                                    <tr>
                                        <td style="background-color:#f9fafb; border:2px solid {dark_green}; padding:20px; font-size:15px; color:#374151; line-height:1.6; font-weight:500;">
                                            This is a formal reminder to <strong style="color:{accent_color};">{action}</strong> for your OJT attendance today.
                                        </td>
                                    </tr>
                                </table>

                                <!-- Details Table -->
                                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin-bottom:35px;">
                                    <tr>
                                        <td width="50%" style="padding-right:10px;">
                                            <div style="border:2px solid {dark_green}; padding:15px; background-color:#ffffff;">
                                                <p style="margin:0; font-size:10px; font-weight:900; color:#9ca3af; text-transform:uppercase; letter-spacing:1px;">📅 OJT Date</p>
                                                <p style="margin:6px 0 0 0; font-size:14px; font-weight:800; color:{dark_green};">{date_str}</p>
                                            </div>
                                        </td>
                                        <td width="50%" style="padding-left:10px;">
                                            <div style="border:2px solid {dark_green}; padding:15px; background-color:#ffffff;">
                                                <p style="margin:0; font-size:10px; font-weight:900; color:#9ca3af; text-transform:uppercase; letter-spacing:1px;">🔖 Request Status</p>
                                                <p style="margin:6px 0 0 0; font-size:14px; font-weight:800; color:{accent_color}; uppercase">{action} PENDING</p>
                                            </div>
                                        </td>
                                    </tr>
                                </table>

                                <p style="margin:0 0 30px 0; font-size:13px; color:#6b7280; font-weight:600; font-style:italic;">
                                    {message}
                                </p>

                                <!-- Professional CTA Button -->
                                <table role="presentation" cellspacing="0" cellpadding="0">
                                    <tr>
                                        <td style="background-color:{dark_green}; border:2px solid {dark_green}; box-shadow: 4px 4px 0px 0px #14532d;">
                                            <a href="https://ojtdtr.systemproj.com" 
                                               style="display:inline-block; padding:16px 35px; color:#ffffff; font-size:13px; font-weight:900; text-decoration:none; text-transform:uppercase; letter-spacing:2px;">
                                                LOG ATTENDANCE NOW
                                            </a>
                                        </td>
                                    </tr>
                                </table>
                            </td>
                        </tr>

                        <!-- Footer Area -->
                        <tr>
                            <td style="padding:25px 35px; background-color:#f9fafb; border-top:2px solid #e5e7eb; text-align:center;">
                                <p style="margin:0 0 5px 0; font-size:11px; font-weight:800; color:#9ca3af; text-transform:uppercase; letter-spacing:1px;">
                                    OJT Daily Time Record System
                                </p>
                                <p style="margin:0; font-size:10px; color:#d1d5db; font-weight:600;">
                                    This is an automated operational notification.
                                </p>
                            </td>
                        </tr>
                    </table>
                    
                    <!-- External Link -->
                    <p style="margin-top:20px; font-size:11px; color:#9ca3af; font-weight:700; text-transform:uppercase; letter-spacing:1px;">
                        Access System at <a href="https://ojtdtr.systemproj.com" style="color:{dark_green}; text-decoration:none;">ojtdtr.systemproj.com</a>
                    </p>

                </td>
            </tr>
        </table>
    </body>
    </html>
    """
    return html

    return html
