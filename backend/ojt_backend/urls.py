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
    ping_view, admin_chat_send, admin_chat_history, admin_chat_unread
)

def home(request):
    return redirect('/login/')

urlpatterns =[
    path('', home),
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
    path('api/chat/send/', admin_chat_send),
    path('api/chat/history/', admin_chat_history),
    path('api/chat/unread/', admin_chat_unread),
]

urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)

urlpatterns +=[
    re_path(r'^media/(?P<path>.*)$', serve, {'document_root': settings.MEDIA_ROOT}),
]