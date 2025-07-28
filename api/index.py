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

try:
    # Import Django and create application
    import django
    django.setup()

    from django.core.wsgi import get_wsgi_application

    # Create the WSGI application
    application = get_wsgi_application()

    # Vercel expects a handler function
    def handler(request, context):
        try:
            return application(request, context)
        except Exception as e:
            print(f"Error in handler: {e}")
            # Return a simple error response
            return {
                'statusCode': 500,
                'body': 'Internal Server Error',
                'headers': {
                    'Content-Type': 'text/plain'
                }
            }

except Exception as e:
    print(f"Error setting up Django: {e}")
    
    # Fallback handler
    def handler(request, context):
        return {
            'statusCode': 500,
            'body': 'Django setup failed',
            'headers': {
                'Content-Type': 'text/plain'
            }
        } 