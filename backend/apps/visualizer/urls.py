from django.urls import path
from . import views

urlpatterns = [
    path('execute', views.execute_code, name='execute_code'),
    path('result/<str:task_id>', views.get_result, name='get_result'),
] 