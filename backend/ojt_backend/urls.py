from django.contrib import admin
from django.urls import path, re_path, include
from django.conf import settings
from django.conf.urls.static import static
from django.views.static import serve
from django.http import HttpResponse
from django.shortcuts import redirect

# Dito inayos yung import, pinalitan ang 'views' ng 'upload_dtr' sa dulo
from attendance.views import register, login_view, time_in, time_out, get_status, get_history, add_past_record, edit_record, delete_record, download_dtr, get_leaderboards, save_today_record, forgot_password, change_password, update_profile, get_profile, submit_report, get_reports, edit_report, delete_report, get_report_image, upload_dtr

def home(request):
    return redirect('/login/')

urlpatterns =[
    path('', home),
    path('admin/', admin.site.urls),
    path('login/', login_view),  
    path('api/register/', register),
    path('api/login/', login_view),
    path('api/time-in/', time_in),
    path('api/time-out/', time_out),
    path('api/status/', get_status),
    path('api/history/', get_history),
    path('api/add-past-record/', add_past_record),
    path('api/delete-record/', delete_record),
    path('api/edit-record/', edit_record),
    path('api/leaderboards/', get_leaderboards),
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
    
    # Inayos ang path na ito (tinanggal ang views.)
    path('api/upload-dtr/', upload_dtr, name='upload_dtr'),
]

urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)

urlpatterns +=[
    re_path(r'^media/(?P<path>.*)$', serve, {'document_root': settings.MEDIA_ROOT}),
]