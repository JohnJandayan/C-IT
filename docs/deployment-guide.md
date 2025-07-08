# C-It Deployment Guide

## Production Deployment Instructions

### Prerequisites
- GitHub account
- Cloudflare account
- Render account
- Domain name (optional)

## Frontend Deployment (Cloudflare Pages)

### Step 1: Prepare Repository
1. Push your code to GitHub repository
2. Ensure `next.config.js` has `output: 'export'` for static export
3. Verify all dependencies are in `package.json`

### Step 2: Cloudflare Pages Setup
1. Log into Cloudflare Dashboard
2. Go to Pages → Create a project
3. Connect to Git → Select your GitHub repository
4. Configure build settings:
   ```
   Framework preset: Next.js (Static HTML Export)
   Build command: npm run build
   Build output directory: out
   Root directory: /
   ```

### Step 3: Environment Variables
Set these in Cloudflare Pages:
```
NODE_VERSION=18
NEXT_TELEMETRY_DISABLED=1
NEXT_PUBLIC_API_URL=https://your-backend-url.onrender.com/api/v1
```

### Step 4: Custom Domain (Optional)
1. In Cloudflare Pages → Custom domains
2. Add your domain
3. Update DNS records as instructed

### Step 5: Performance Optimization
Create `public/_headers` file:
```
/*
  X-Frame-Options: DENY
  X-Content-Type-Options: nosniff
  X-XSS-Protection: 1; mode=block
  Referrer-Policy: strict-origin-when-cross-origin
  Cache-Control: public, max-age=31536000, immutable

/_next/static/*
  Cache-Control: public, max-age=31536000, immutable

/static/*
  Cache-Control: public, max-age=31536000, immutable
```

## Backend Deployment (Render)

### Step 1: Prepare Django Backend
Create these files in your backend repository:

#### `render.yaml`
```yaml
services:
  - type: web
    name: c-it-api
    env: python
    buildCommand: "./build.sh"
    startCommand: "gunicorn core.wsgi:application --bind 0.0.0.0:$PORT"
    plan: starter
    envVars:
      - key: PYTHON_VERSION
        value: 3.11.0
      - key: DJANGO_SETTINGS_MODULE
        value: core.settings.production
      - key: SECRET_KEY
        generateValue: true
      - key: DEBUG
        value: False
      - key: ALLOWED_HOSTS
        value: "c-it-api.onrender.com,localhost"
      - key: CORS_ALLOWED_ORIGINS
        value: "https://c-it.pages.dev"
      - key: DATABASE_URL
        fromDatabase:
          name: c-it-db
          property: connectionString

databases:
  - name: c-it-db
    plan: starter
```

#### `build.sh`
```bash
#!/usr/bin/env bash
set -o errexit

pip install -r requirements.txt
python manage.py collectstatic --no-input
python manage.py migrate
```

#### `requirements.txt`
```
Django>=4.2.0
djangorestframework>=3.14.0
django-cors-headers>=4.0.0
gunicorn>=20.1.0
psycopg2-binary>=2.9.0
whitenoise>=6.4.0
python-decouple>=3.8
celery>=5.2.0
redis>=4.5.0
requests>=2.31.0
```

### Step 2: Django Settings Structure
```
backend/
├── core/
│   ├── settings/
│   │   ├── __init__.py
│   │   ├── base.py
│   │   ├── development.py
│   │   └── production.py
│   ├── urls.py
│   └── wsgi.py
```

#### `core/settings/production.py`
```python
from .base import *
import dj_database_url

DEBUG = False

DATABASES = {
    'default': dj_database_url.parse(os.environ.get('DATABASE_URL'))
}

CORS_ALLOWED_ORIGINS = [
    "https://c-it.pages.dev",
    "https://your-custom-domain.com",
]

SECURE_SSL_REDIRECT = True
SECURE_PROXY_SSL_HEADER = ('HTTP_X_FORWARDED_PROTO', 'https')
SECURE_HSTS_SECONDS = 31536000
SECURE_HSTS_INCLUDE_SUBDOMAINS = True
SECURE_HSTS_PRELOAD = True
SECURE_CONTENT_TYPE_NOSNIFF = True
SECURE_BROWSER_XSS_FILTER = True
SESSION_COOKIE_SECURE = True
CSRF_COOKIE_SECURE = True

STATICFILES_STORAGE = 'whitenoise.storage.CompressedManifestStaticFilesStorage'
```

### Step 3: Deploy to Render
1. Push backend code to GitHub
2. Connect Render to your GitHub repository
3. Render will automatically deploy using `render.yaml`

## API Endpoints Structure

### Core Endpoints
```python
# urls.py
from django.urls import path, include

urlpatterns = [
    path('api/v1/', include('visualizer.urls')),
    path('health/', health_check, name='health_check'),
]

# visualizer/urls.py
urlpatterns = [
    path('execute/', ExecuteCodeView.as_view(), name='execute_code'),
    path('parse/', ParseCodeView.as_view(), name='parse_code'),
    path('validate/', ValidateCodeView.as_view(), name='validate_code'),
    path('algorithms/', AlgorithmListView.as_view(), name='algorithm_list'),
]
```

### Sample API Views
```python
# visualizer/views.py
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status

class ExecuteCodeView(APIView):
    def post(self, request):
        code = request.data.get('code')
        input_data = request.data.get('input', '')
        
        # Process C code execution
        result = execute_c_code(code, input_data)
        
        return Response({
            'success': True,
            'data': result,
            'meta': {
                'execution_time': result.get('execution_time', 0),
                'memory_usage': result.get('memory_usage', 0)
            }
        })

class ParseCodeView(APIView):
    def post(self, request):
        code = request.data.get('code')
        
        # Parse C code for visualization
        parsed_data = parse_c_code(code)
        
        return Response({
            'success': True,
            'data': parsed_data
        })
```

## Security Configuration

### CORS Settings
```python
# settings/base.py
CORS_ALLOWED_ORIGINS = [
    "https://c-it.pages.dev",
    "https://your-custom-domain.com",
]

CORS_ALLOW_CREDENTIALS = True
CORS_ALLOW_ALL_ORIGINS = False  # Never set to True in production
```

### Rate Limiting
```python
# Install django-ratelimit
# pip install django-ratelimit

from django_ratelimit.decorators import ratelimit

@ratelimit(key='ip', rate='100/h', method='POST')
def execute_code_view(request):
    # Your view logic
    pass
```

## Monitoring & Health Checks

### Health Check Endpoint
```python
# views.py
from django.http import JsonResponse
from django.db import connection

def health_check(request):
    try:
        # Check database connection
        with connection.cursor() as cursor:
            cursor.execute("SELECT 1")
        
        return JsonResponse({
            'status': 'healthy',
            'database': 'connected',
            'timestamp': timezone.now().isoformat()
        })
    except Exception as e:
        return JsonResponse({
            'status': 'unhealthy',
            'error': str(e)
        }, status=500)
```

### Logging Configuration
```python
# settings/production.py
LOGGING = {
    'version': 1,
    'disable_existing_loggers': False,
    'handlers': {
        'console': {
            'class': 'logging.StreamHandler',
        },
    },
    'root': {
        'handlers': ['console'],
        'level': 'INFO',
    },
    'loggers': {
        'django': {
            'handlers': ['console'],
            'level': 'INFO',
            'propagate': False,
        },
    },
}
```

## Performance Optimization

### Frontend Optimizations
1. **Code Splitting**: Implemented with Next.js dynamic imports
2. **Image Optimization**: Using Next.js Image component
3. **Caching**: Cloudflare CDN caching
4. **Bundle Analysis**: Run `npm run build` to analyze bundle size

### Backend Optimizations
1. **Database Indexing**: Add indexes for frequently queried fields
2. **Caching**: Implement Redis caching for API responses
3. **Connection Pooling**: Configure database connection pooling
4. **Static Files**: Use WhiteNoise for static file serving

## Testing Before Deployment

### Frontend Testing
```bash
# Build and test locally
npm run build
npm run start

# Test production build
npm run lint
npm run type-check  # if you have TypeScript checking
```

### Backend Testing
```bash
# Run tests
python manage.py test

# Check for security issues
python manage.py check --deploy

# Test with production settings
DJANGO_SETTINGS_MODULE=core.settings.production python manage.py runserver
```

## Post-Deployment Checklist

### Frontend (Cloudflare)
- [ ] Site loads correctly
- [ ] All pages are accessible
- [ ] Dark/light mode works
- [ ] Mobile responsiveness
- [ ] Performance metrics in Cloudflare Analytics

### Backend (Render)
- [ ] API endpoints respond correctly
- [ ] Database migrations completed
- [ ] Health check endpoint returns 200
- [ ] CORS headers configured correctly
- [ ] SSL certificate active

### Integration Testing
- [ ] Frontend can communicate with backend
- [ ] Code execution works
- [ ] Algorithm templates load correctly
- [ ] Error handling works properly

## Troubleshooting

### Common Issues

#### Build Failures
- Check Node.js version compatibility
- Verify all dependencies are installed
- Check for TypeScript errors

#### CORS Issues
- Verify CORS_ALLOWED_ORIGINS includes your frontend domain
- Check that credentials are handled correctly

#### Database Connection Issues
- Verify DATABASE_URL environment variable
- Check database service status in Render

#### Performance Issues
- Monitor Cloudflare Analytics
- Check Render metrics
- Optimize database queries
- Implement caching where needed

## Maintenance

### Regular Tasks
1. **Security Updates**: Keep dependencies updated
2. **Performance Monitoring**: Check metrics weekly
3. **Backup Strategy**: Ensure database backups are working
4. **Log Monitoring**: Review error logs regularly

### Scaling Considerations
- **Frontend**: Cloudflare automatically scales
- **Backend**: Upgrade Render plan as needed
- **Database**: Monitor usage and upgrade when necessary

This deployment guide ensures your C-It application is production-ready with proper security, performance, and monitoring configurations.