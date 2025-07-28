"""
Vercel API handler for Django application
"""

import os
import sys
from pathlib import Path

# Add the project directory to the Python path
project_dir = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(project_dir))

# Set Django settings
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'c_it_project.settings')

# Import Django and create application
import django
django.setup()

from django.core.wsgi import get_wsgi_application
from django.contrib.staticfiles.handlers import StaticFilesHandler

# Create the WSGI application
application = get_wsgi_application()

# Wrap with StaticFilesHandler for Vercel
app = StaticFilesHandler(application)

# Vercel expects a handler function
def handler(request, context):
    return app(request, context) 