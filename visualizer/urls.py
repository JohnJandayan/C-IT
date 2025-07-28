from django.urls import path
from . import views

app_name = 'visualizer'

urlpatterns = [
    path('', views.home, name='home'),
    path('visualize/', views.visualize, name='visualize'),
    path('about/', views.about, name='about'),
] 