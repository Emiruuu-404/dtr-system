from django.contrib import admin
from django.urls import path
from django.conf import settings
from django.conf.urls.static import static
from django.http import HttpResponse
from attendance.views import register, login_view, time_in, time_out, get_status, get_history, add_past_record, edit_record, delete_record, download_dtr, get_leaderboards, save_today_record


def home(request):
    return HttpResponse("DTR Backend Running 🚀")


urlpatterns = [
    path('', home),
    path('admin/', admin.site.urls),
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
]

urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)