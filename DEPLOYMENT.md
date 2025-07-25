# C-It Deployment Guide

This guide provides detailed instructions for deploying the C-It algorithm visualizer to CloudFlare.

## 🚀 Prerequisites

1. **CloudFlare Account**
   - Sign up at [cloudflare.com](https://cloudflare.com)
   - Verify your account and add a domain

2. **Node.js 18+**
   - Download from [nodejs.org](https://nodejs.org)

3. **Wrangler CLI**
   ```bash
   npm install -g wrangler
   ```

## 📋 Step-by-Step Deployment

### 1. Project Setup

```bash
# Clone the repository
git clone https://github.com/your-username/c-it.git
cd c-it

# Install dependencies
npm install
cd workers && npm install && cd ..
```

### 2. CloudFlare Configuration

#### A. Login to CloudFlare

```bash
wrangler login
```

#### B. Create KV Namespace

```bash
# Create KV namespace for production
wrangler kv:namespace create "C_IT_KV" --preview

# Note the IDs from the output and update wrangler.toml
```

#### C. Create R2 Bucket

```bash
# Create R2 bucket for assets
wrangler r2 bucket create c-it-assets
```

### 3. Environment Configuration

#### A. Update wrangler.toml

Replace the placeholder values in `workers/wrangler.toml`:

```toml
name = "c-it-backend"
main = "src/index.ts"
compatibility_date = "2024-01-01"

[env.production]
name = "c-it-backend-prod"

[[env.production.kv_namespaces]]
binding = "C_IT_KV"
id = "your-actual-kv-namespace-id"
preview_id = "your-actual-preview-kv-namespace-id"

[env.production.r2_buckets]
binding = "C_IT_BUCKET"
bucket_name = "c-it-assets"

[env.production.vars]
ENVIRONMENT = "production"
```

#### B. Create Environment Files

Create `.env.local` in the root directory:

```env
NEXT_PUBLIC_API_URL=https://your-workers-domain.workers.dev
NEXT_PUBLIC_ENVIRONMENT=production
```

### 4. Backend Deployment (CloudFlare Workers)

#### A. Deploy to Staging

```bash
cd workers
wrangler deploy --env staging
```

#### B. Test the API

```bash
# Test the API endpoint
curl https://your-staging-workers-domain.workers.dev/api/algorithms
```

#### C. Deploy to Production

```bash
wrangler deploy --env production
```

### 5. Frontend Deployment (CloudFlare Pages)

#### A. Build the Application

```bash
# From the root directory
npm run build
```

#### B. Deploy to CloudFlare Pages

```bash
# Deploy to Pages
wrangler pages deploy out --project-name c-it

# Or use the CloudFlare Dashboard:
# 1. Go to Pages in your CloudFlare dashboard
# 2. Create a new project
# 3. Connect your GitHub repository
# 4. Set build settings:
#    - Build command: npm run build
#    - Build output directory: out
#    - Root directory: /
```

### 6. Domain Configuration

#### A. Custom Domain (Optional)

1. Go to your CloudFlare Pages project
2. Navigate to "Custom domains"
3. Add your domain (e.g., `c-it.yourdomain.com`)
4. Update DNS records if needed

#### B. Environment Variables in Pages

Set these in your CloudFlare Pages project settings:

```env
NEXT_PUBLIC_API_URL=https://your-workers-domain.workers.dev
NEXT_PUBLIC_ENVIRONMENT=production
```

## 🔧 Configuration Details

### CloudFlare Workers Environment Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `ENVIRONMENT` | Deployment environment | `production` |
| `CLOUDFLARE_ACCOUNT_ID` | Your CloudFlare account ID | `1234567890abcdef` |

### CloudFlare Pages Environment Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `NEXT_PUBLIC_API_URL` | Workers API URL | `https://c-it-backend.your-subdomain.workers.dev` |
| `NEXT_PUBLIC_ENVIRONMENT` | Frontend environment | `production` |

## 🧪 Testing Deployment

### 1. Test Frontend

Visit your deployed Pages URL and verify:
- ✅ Homepage loads correctly
- ✅ Algorithm selector works
- ✅ Code editor displays
- ✅ Visualization runs

### 2. Test Backend API

```bash
# Test algorithms endpoint
curl https://your-workers-domain.workers.dev/api/algorithms

# Test visualization endpoint
curl -X POST https://your-workers-domain.workers.dev/api/visualize \
  -H "Content-Type: application/json" \
  -d '{"algorithmId":"bubble-sort","inputArray":[3,1,4,1,5]}'
```

### 3. Test CORS

Verify that the frontend can communicate with the backend:
- Open browser developer tools
- Check for CORS errors in the console
- Test API calls from the frontend

## 🔄 Continuous Deployment

### GitHub Actions (Optional)

Create `.github/workflows/deploy.yml`:

```yaml
name: Deploy to CloudFlare

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
          
      - name: Install dependencies
        run: |
          npm install
          cd workers && npm install
          
      - name: Deploy Workers
        run: |
          cd workers
          wrangler deploy --env production
        env:
          CLOUDFLARE_API_TOKEN: ${{ secrets.CLOUDFLARE_API_TOKEN }}
          
      - name: Build and deploy Pages
        run: |
          npm run build
          wrangler pages deploy out --project-name c-it
        env:
          CLOUDFLARE_API_TOKEN: ${{ secrets.CLOUDFLARE_API_TOKEN }}
```

## 🚨 Troubleshooting

### Common Issues

#### 1. CORS Errors
- Verify CORS headers in Workers
- Check API URL configuration
- Ensure proper environment variables

#### 2. Build Failures
- Check Node.js version (18+)
- Verify all dependencies installed
- Check TypeScript compilation errors

#### 3. KV/R2 Access Issues
- Verify namespace/bucket IDs in wrangler.toml
- Check API token permissions
- Ensure proper binding names

#### 4. Pages Deployment Issues
- Verify build output directory
- Check build command
- Review build logs in CloudFlare dashboard

### Debug Commands

```bash
# Test Workers locally
cd workers
wrangler dev

# Check Workers logs
wrangler tail

# Verify KV namespace
wrangler kv:namespace list

# Check R2 bucket
wrangler r2 bucket list
```

## 📊 Monitoring

### CloudFlare Analytics

1. **Workers Analytics**
   - Go to Workers dashboard
   - View request metrics
   - Monitor error rates

2. **Pages Analytics**
   - Go to Pages dashboard
   - View deployment status
   - Monitor performance

### Performance Monitoring

- Use CloudFlare's built-in analytics
- Monitor Core Web Vitals
- Track API response times

## 🔒 Security Considerations

1. **API Token Security**
   - Use least privilege principle
   - Rotate tokens regularly
   - Store securely in CI/CD

2. **CORS Configuration**
   - Restrict origins in production
   - Use specific domains instead of wildcards

3. **Environment Variables**
   - Never commit sensitive data
   - Use CloudFlare's secret management

## 📞 Support

If you encounter issues:

1. Check the [CloudFlare documentation](https://developers.cloudflare.com/)
2. Review the [Wrangler documentation](https://developers.cloudflare.com/workers/wrangler/)
3. Check the project's [GitHub issues](https://github.com/your-username/c-it/issues)
4. Contact the developer through the portfolio website

---

**Happy Deploying! 🚀** 