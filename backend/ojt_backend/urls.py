from django.contrib import admin
from django.urls import path, re_path, include
from django.conf import settings
from django.conf.urls.static import static
from django.views.static import serve
from django.http import HttpResponse
from django.shortcuts import redirect
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView

from attendance.views import (
    register, login_view, admin_login_view, time_in, time_out, get_status, 
    get_history, add_past_record, edit_record, delete_record, download_dtr, 
    get_leaderboards, save_today_record, forgot_password, change_password, 
    update_profile, get_profile, submit_report, get_reports, edit_report, 
    delete_report, get_report_image, upload_dtr, verify_session, 
    get_admin_dashboard, admin_intern_actions, admin_export_csv, 
    upload_profile_picture, get_profile_picture_view, get_intern_dashboard_data,
    ping_view, send_reminder_emails, cron_send_reminders,
    get_holidays, add_holiday, delete_holiday, get_email_logs
)

def home(request):
    html_content = """
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>OJT DTR Backend Status</title>
        <style>
            @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;700;900&display=swap');
            body { 
                font-family: 'Inter', sans-serif; 
                background-color: #f0f0f0; 
                display: flex; 
                justify-content: center; 
                align-items: center; 
                height: 100vh; 
                margin: 0;
                color: #064e3b;
            }
            .container {
                background: white;
                padding: 3rem;
                border: 4px solid #064e3b;
                box-shadow: 10px 10px 0px #064e3b;
                max-width: 500px;
                text-align: center;
                position: relative;
            }
            .container::before {
                content: '';
                position: absolute;
                top: -10px;
                left: -10px;
                right: -10px;
                bottom: -10px;
                border: 1px solid #064e3b;
                z-index: -1;
            }
            h1 { font-weight: 900; font-size: 2.5rem; margin-bottom: 1rem; text-transform: uppercase; letter-spacing: -1px; }
            .status { 
                display: inline-block;
                background-color: #d1fae5;
                padding: 0.5rem 1rem;
                border: 2px solid #064e3b;
                font-weight: 700;
                margin-top: 1rem;
            }
            .dot {
                height: 12px;
                width: 12px;
                background-color: #10b981;
                border-radius: 50%;
                display: inline-block;
                margin-right: 8px;
                animation: pulse 1.5s infinite;
            }
            @keyframes pulse {
                0% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(16, 185, 129, 0.7); }
                70% { transform: scale(1); box-shadow: 0 0 0 10px rgba(16, 185, 129, 0); }
                100% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(16, 185, 129, 0); }
            }
            p { font-weight: 700; opacity: 0.8; }
        </style>
    </head>
    <body>
        <div class="container">
            <h1>OJT DTR</h1>
            <p>API Service Layer</p>
            <div class="status">
                <span class="dot"></span>
                SYSTEM OPERATIONAL
            </div>
            <p style="margin-top: 2rem; font-size: 0.8rem; text-transform: uppercase; letter-spacing: 1px;">
                CONNECTED TO SUPABASE DATABASE
            </p>
        </div>
    </body>
    </html>
    """
    return HttpResponse(html_content)

urlpatterns =[
    path('', home),
    path('login/', home), # Redirect /login/ to status page too
    path('admin/', admin.site.urls),
    path('api/login/', login_view),
    path('api/admin-login/', admin_login_view),
    path('api/token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path('api/register/', register),
    path('api/time-in/', time_in),
    path('api/time-out/', time_out),
    path('api/status/', get_status),
    path('api/history/', get_history),
    path('api/add-past-record/', add_past_record),
    path('api/delete-record/', delete_record),
    path('api/edit-record/', edit_record),
    path('api/leaderboards/', get_leaderboards),
    path('api/admin-dashboard/', get_admin_dashboard),
    path('api/admin-actions/', admin_intern_actions),
    path('api/admin-export/', admin_export_csv),
    path('api/save-today-record/', save_today_record),
    path('api/download-dtr/', download_dtr),
    path('api/forgot-password/', forgot_password),
    path('api/change-password/', change_password),
    path('api/update-profile/', update_profile),
    path('api/profile/', get_profile),
    path('api/submit-report/', submit_report),
    path('api/edit-report/', edit_report),
    path('api/delete-report/', delete_report),
    path('api/reports/', get_reports),
    path('api/report-image/<int:image_id>/', get_report_image),
    path('api/upload-profile-picture/', upload_profile_picture),
    path('api/profile-picture/<str:student_id>/', get_profile_picture_view),
    
    path('api/upload-dtr/', upload_dtr, name='upload_dtr'),
    path('api/verify-session/', verify_session),
    path('api/dashboard-data/', get_intern_dashboard_data),
    path('api/ping/', ping_view),
    path('api/send-reminders/', send_reminder_emails),
    path('api/cron-reminders/', cron_send_reminders),
    
    # Holiday & Logs management
    path('api/holidays/', get_holidays),
    path('api/holidays/add/', add_holiday),
    path('api/holidays/delete/<int:holiday_id>/', delete_holiday),
    path('api/admin/email-logs/', get_email_logs),

]

urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)

urlpatterns +=[
    re_path(r'^media/(?P<path>.*)$', serve, {'document_root': settings.MEDIA_ROOT}),
]