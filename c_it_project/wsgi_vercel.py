"""
WSGI config for c_it_project project for Vercel deployment.
"""

import os
import sys
from pathlib import Path

# Add the project directory to the Python path
project_dir = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(project_dir))

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'c_it_project.settings')

from django.core.wsgi import get_wsgi_application
application = get_wsgi_application() 