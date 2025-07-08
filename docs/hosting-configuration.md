# Hosting Configuration Guide

## Frontend Deployment (Cloudflare Pages)

### Build Settings
```
Build command: npm run build
Build output directory: out
Root directory: /
```

### Environment Variables
```
NODE_VERSION=18
NEXT_TELEMETRY_DISABLED=1
```

### Custom Domain Configuration
1. Add your domain in Cloudflare Pages Dashboard
2. Configure DNS records:
   - Type: CNAME
   - Name: @ (or your subdomain)
   - Target: your-project.pages.dev

### Cloudflare Pages Configuration File
Create `_headers` file in the `public` directory:

```
/*
  X-Frame-Options: DENY
  X-Content-Type-Options: nosniff
  X-XSS-Protection: 1; mode=block
  Referrer-Policy: strict-origin-when-cross-origin
  Permissions-Policy: geolocation=(), microphone=(), camera=()

/static/*
  Cache-Control: public, max-age=31536000, immutable

/_next/static/*
  Cache-Control: public, max-age=31536000, immutable
```

### Build Commands
```bash
# Local development
npm run dev

# Production build
npm run build

# Preview production build
npm run start
```

## Backend Deployment (Render)

### Django Service Configuration

#### render.yaml
```yaml
services:
  - type: web
    name: c-visualizer-api
    env: python
    buildCommand: "./build.sh"
    startCommand: "gunicorn core.wsgi:application"
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
        value: "c-visualizer-api.onrender.com,localhost,127.0.0.1"
      - key: CORS_ALLOWED_ORIGINS
        value: "https://your-frontend-domain.pages.dev"
      - key: DATABASE_URL
        fromDatabase:
          name: c-visualizer-db
          property: connectionString

databases:
  - name: c-visualizer-db
    plan: starter
```

#### build.sh
```bash
#!/usr/bin/env bash
# exit on error
set -o errexit

pip install -r requirements.txt
python manage.py collectstatic --no-input
python manage.py migrate
```

#### requirements.txt
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
```

### Django Settings Structure
```
core/
├── settings/
│   ├── __init__.py
│   ├── base.py
│   ├── development.py
│   └── production.py
```

#### base.py
```python
import os
from decouple import config

BASE_DIR = Path(__file__).resolve().parent.parent.parent

SECRET_KEY = config('SECRET_KEY')
DEBUG = config('DEBUG', default=False, cast=bool)

ALLOWED_HOSTS = config('ALLOWED_HOSTS', default='').split(',')

INSTALLED_APPS = [
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',
    'rest_framework',
    'corsheaders',
    'visualizer',  # Your app
]

MIDDLEWARE = [
    'corsheaders.middleware.CorsMiddleware',
    'django.middleware.security.SecurityMiddleware',
    'whitenoise.middleware.WhiteNoiseMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
]

ROOT_URLCONF = 'core.urls'

DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.postgresql',
        'URL': config('DATABASE_URL')
    }
}

STATIC_URL = '/static/'
STATIC_ROOT = os.path.join(BASE_DIR, 'staticfiles')
STATICFILES_STORAGE = 'whitenoise.storage.CompressedManifestStaticFilesStorage'
```

#### production.py
```python
from .base import *

DEBUG = False

CORS_ALLOWED_ORIGINS = config('CORS_ALLOWED_ORIGINS', default='').split(',')

SECURE_SSL_REDIRECT = True
SECURE_PROXY_SSL_HEADER = ('HTTP_X_FORWARDED_PROTO', 'https')
SECURE_HSTS_SECONDS = 31536000
SECURE_HSTS_INCLUDE_SUBDOMAINS = True
SECURE_HSTS_PRELOAD = True
SECURE_CONTENT_TYPE_NOSNIFF = True
SECURE_BROWSER_XSS_FILTER = True
SESSION_COOKIE_SECURE = True
CSRF_COOKIE_SECURE = True
```

### API Endpoints Structure
```
/api/v1/
├── execute/          # POST - Execute C code
├── parse/            # POST - Parse C code for visualization
├── validate/         # POST - Validate C syntax
└── algorithms/       # GET - List available algorithms
```

## Development Workflow

### Local Development Setup
```bash
# Frontend
npm install
npm run dev

# Backend (in separate terminal)
cd backend
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
python manage.py migrate
python manage.py runserver 8000
```

### Environment Variables

#### Frontend (.env.local)
```
NEXT_PUBLIC_API_URL=http://localhost:8000/api/v1
NEXT_PUBLIC_ENVIRONMENT=development
```

#### Backend (.env)
```
SECRET_KEY=your-secret-key-here
DEBUG=True
DATABASE_URL=sqlite:///db.sqlite3
CORS_ALLOWED_ORIGINS=http://localhost:3000
```

### Deployment Commands

#### Frontend to Cloudflare
```bash
npm run build
# Push to GitHub - Cloudflare Pages will auto-deploy
```

#### Backend to Render
```bash
git push origin main
# Render will auto-deploy from GitHub
```

## Monitoring and Performance

### Cloudflare Analytics
- Enable Web Analytics in Cloudflare dashboard
- Monitor Core Web Vitals
- Set up alerts for downtime

### Render Monitoring
- Built-in metrics and logs
- Set up health checks: `/health/`
- Configure alerts for high response times

### Performance Optimizations
- Enable Cloudflare caching
- Use CDN for static assets
- Implement Redis caching for API responses
- Database query optimization
- Image optimization with Next.js Image component