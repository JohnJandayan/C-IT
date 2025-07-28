# C-It Deployment Guide

This guide provides step-by-step instructions for deploying the C-It algorithm visualizer to various platforms.

## 🚀 Vercel Deployment (Recommended)

### Prerequisites
- Node.js installed (for Vercel CLI)
- Git repository set up
- Vercel account

### Step 1: Install Vercel CLI
```bash
npm install -g vercel
```

### Step 2: Login to Vercel
```bash
vercel login
```

### Step 3: Configure Environment Variables
Create a `.env` file in your project root:
```env
DEBUG=False
SECRET_KEY=your-production-secret-key-here
DJANGO_SETTINGS_MODULE=c_it_project.settings
```

### Step 4: Deploy to Vercel
```bash
vercel --prod
```

### Step 5: Set Environment Variables in Vercel Dashboard
1. Go to your Vercel dashboard
2. Select your project
3. Go to Settings > Environment Variables
4. Add the following variables:
   - `DEBUG`: `False`
   - `SECRET_KEY`: Your production secret key
   - `DJANGO_SETTINGS_MODULE`: `c_it_project.settings`

### Step 6: Configure Custom Domain (Optional)
1. In Vercel dashboard, go to Settings > Domains
2. Add your custom domain
3. Follow the DNS configuration instructions

## 🌐 Alternative Deployment Options

### Heroku Deployment

#### Step 1: Install Heroku CLI
```bash
# macOS
brew install heroku/brew/heroku

# Windows
# Download from https://devcenter.heroku.com/articles/heroku-cli
```

#### Step 2: Login to Heroku
```bash
heroku login
```

#### Step 3: Create Heroku App
```bash
heroku create your-app-name
```

#### Step 4: Add Buildpacks
```bash
heroku buildpacks:add heroku/python
```

#### Step 5: Set Environment Variables
```bash
heroku config:set DEBUG=False
heroku config:set SECRET_KEY=your-secret-key
heroku config:set DJANGO_SETTINGS_MODULE=c_it_project.settings
```

#### Step 6: Deploy
```bash
git push heroku main
```

### Railway Deployment

#### Step 1: Install Railway CLI
```bash
npm install -g @railway/cli
```

#### Step 2: Login to Railway
```bash
railway login
```

#### Step 3: Initialize Project
```bash
railway init
```

#### Step 4: Set Environment Variables
```bash
railway variables set DEBUG=False
railway variables set SECRET_KEY=your-secret-key
railway variables set DJANGO_SETTINGS_MODULE=c_it_project.settings
```

#### Step 5: Deploy
```bash
railway up
```

### DigitalOcean App Platform

#### Step 1: Create App
1. Go to DigitalOcean App Platform
2. Connect your GitHub repository
3. Select the repository

#### Step 2: Configure Build Settings
- **Build Command**: `pip install -r requirements.txt && python manage.py collectstatic --noinput`
- **Run Command**: `gunicorn c_it_project.wsgi:application`

#### Step 3: Set Environment Variables
- `DEBUG`: `False`
- `SECRET_KEY`: Your production secret key
- `DJANGO_SETTINGS_MODULE`: `c_it_project.settings`

#### Step 4: Deploy
Click "Create Resources" to deploy your app.

## 🔧 Production Configuration

### Security Settings
Ensure these settings for production:

```python
# settings.py
DEBUG = False
SECURE_SSL_REDIRECT = True
SECURE_BROWSER_XSS_FILTER = True
SECURE_CONTENT_TYPE_NOSNIFF = True
X_FRAME_OPTIONS = 'DENY'
```

### Static Files
Make sure static files are properly configured:

```python
# settings.py
STATIC_URL = '/static/'
STATIC_ROOT = BASE_DIR / 'staticfiles'
STATICFILES_STORAGE = 'whitenoise.storage.CompressedManifestStaticFilesStorage'
```

### Database Configuration
For production, consider using a managed database:

```python
# PostgreSQL example
DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.postgresql',
        'NAME': os.environ.get('DB_NAME'),
        'USER': os.environ.get('DB_USER'),
        'PASSWORD': os.environ.get('DB_PASSWORD'),
        'HOST': os.environ.get('DB_HOST'),
        'PORT': os.environ.get('DB_PORT', '5432'),
    }
}
```

## 📊 Monitoring and Analytics

### Vercel Analytics
Enable Vercel Analytics in your dashboard for performance monitoring.

### Error Tracking
Consider adding Sentry for error tracking:

```bash
pip install sentry-sdk
```

```python
# settings.py
import sentry_sdk
from sentry_sdk.integrations.django import DjangoIntegration

sentry_sdk.init(
    dsn="your-sentry-dsn",
    integrations=[DjangoIntegration()],
    traces_sample_rate=1.0,
    send_default_pii=True
)
```

## 🔍 Troubleshooting

### Common Issues

#### 1. Static Files Not Loading
```bash
python manage.py collectstatic --noinput
```

#### 2. Database Migration Issues
```bash
python manage.py migrate
```

#### 3. Environment Variables Not Set
Check your platform's environment variable configuration.

#### 4. Build Failures
- Check Python version compatibility
- Ensure all dependencies are in requirements.txt
- Verify build commands

### Debug Mode
For troubleshooting, temporarily enable debug mode:
```env
DEBUG=True
```

## 🚀 Performance Optimization

### 1. Enable Caching
```python
# settings.py
CACHES = {
    'default': {
        'BACKEND': 'django.core.cache.backends.redis.RedisCache',
        'LOCATION': 'redis://127.0.0.1:6379/1',
    }
}
```

### 2. CDN Configuration
Configure a CDN for static files:
```python
STATIC_URL = 'https://your-cdn.com/static/'
```

### 3. Database Optimization
- Use database connection pooling
- Implement query optimization
- Consider read replicas for high traffic

## 📈 Scaling Considerations

### Horizontal Scaling
- Use load balancers
- Implement session storage (Redis)
- Consider microservices architecture

### Vertical Scaling
- Increase server resources
- Optimize database queries
- Implement caching strategies

## 🔐 Security Checklist

- [ ] HTTPS enabled
- [ ] Environment variables secured
- [ ] Debug mode disabled
- [ ] Secret key changed
- [ ] CORS configured properly
- [ ] Security headers set
- [ ] Database credentials secured
- [ ] Regular security updates

## 📞 Support

For deployment issues:
1. Check platform-specific documentation
2. Review error logs
3. Contact platform support
4. Open an issue in the GitHub repository

## 🎯 Next Steps

After successful deployment:
1. Test all functionality
2. Set up monitoring
3. Configure backups
4. Plan scaling strategy
5. Document deployment process

---

**Happy Deploying! 🚀**

*C-It: Making algorithm learning beautiful and interactive* 