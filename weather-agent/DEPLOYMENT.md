# Deployment & Launch Guide

## 🚀 Quick Start

### 1. Local Development

```bash
# Install dependencies
npm install

# Set environment variables
# Create .env file with:
VITE_OPENROUTER_API_KEY=your_key
VITE_WEATHER_API_KEY=your_key
VITE_NEWS_API_KEY=your_key

# Start dev server
npm run dev

# Open browser
http://localhost:5173
```

### 2. Production Build

```bash
# Build
npm run build

# Test build locally
npm run preview

# Deploy dist/ folder to hosting
```

## 🌐 Deployment Options

### Option 1: Vercel (Recommended)

**Easiest** - Perfect for Vite projects

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel

# Configure environment variables in dashboard
# Settings > Environment Variables
# Add: VITE_OPENROUTER_API_KEY, VITE_WEATHER_API_KEY, VITE_NEWS_API_KEY
```

**Benefits**:

- ✅ Free tier available
- ✅ Automatic deploys on git push
- ✅ Built-in optimizations
- ✅ Edge functions support
- ✅ Analytics included

### Option 2: Netlify

**Simple** - Great for React apps

```bash
# Install Netlify CLI
npm i -g netlify-cli

# Deploy
netlify deploy

# Or connect GitHub for auto-deploys
```

**Steps**:

1. Go to netlify.com
2. Click "New site from Git"
3. Connect GitHub repository
4. Add build command: `npm run build`
5. Add publish directory: `dist`
6. Set environment variables
7. Deploy

### Option 3: GitHub Pages

**Free** - For static sites

```bash
# Update vite.config.ts
export default {
  base: '/weather-agent/',
  // ...
}

# Build
npm run build

# Deploy to gh-pages branch
npm install -g gh-pages
gh-pages -d dist
```

### Option 4: AWS S3 + CloudFront

**Scalable** - Professional setup

```bash
# Build
npm run build

# Upload to S3
aws s3 sync dist/ s3://your-bucket-name

# Set CloudFront distribution
# Point to S3 bucket
# Configure cache behaviors
# Add custom domain (optional)
```

### Option 5: Railway

**Developer-friendly** - Easy configuration

1. Go to railway.app
2. Click "New Project"
3. Select GitHub repository
4. Add environment variables
5. Deploy (automatic on git push)

### Option 6: Docker (Advanced)

**Self-hosted** - Full control

```dockerfile
# Dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build

FROM node:18-alpine
WORKDIR /app
RUN npm install -g serve
COPY --from=0 /app/dist ./dist
EXPOSE 3000
CMD ["serve", "-s", "dist"]
```

```bash
# Build and run
docker build -t weather-agent .
docker run -p 3000:3000 -e VITE_OPENROUTER_API_KEY=xxx weather-agent
```

## ⚙️ Environment Setup

### Required Environment Variables

```env
# .env (local development)
VITE_OPENROUTER_API_KEY=sk-or-v1-xxxxx
VITE_WEATHER_API_KEY=xxxxx
VITE_NEWS_API_KEY=xxxxx
```

### Get API Keys

**OpenRouter**

1. Go to https://openrouter.ai
2. Sign up
3. Create API key
4. Copy and add to .env

**OpenWeatherMap**

1. Go to https://openweathermap.org/api
2. Sign up
3. Select "Free" plan
4. Generate API key
5. Add to .env

**NewsAPI**

1. Go to https://newsapi.org
2. Sign up
3. Get API key
4. Add to .env

## 🔍 Pre-Deployment Checklist

### Code Quality

- [ ] No console errors or warnings
- [ ] TypeScript compilation successful
- [ ] ESLint checks pass (`npm run lint`)
- [ ] All imports resolved
- [ ] No unused variables
- [ ] Code is DRY (Don't Repeat Yourself)

### Functionality

- [ ] Send messages works
- [ ] Edit message and regenerate works
- [ ] Delete message works
- [ ] Copy message works
- [ ] Weather tool works
- [ ] News tool works
- [ ] Calculator tool works
- [ ] Stop generation works (no error shown)
- [ ] Chat history saves to localStorage
- [ ] Titles auto-generate
- [ ] Sidebar menu works
- [ ] Rename chat works
- [ ] All responsive breakpoints work

### Mobile Testing

- [ ] Works on iPhone/Safari
- [ ] Works on Android/Chrome
- [ ] Touch interactions work
- [ ] Sidebar drawer opens/closes
- [ ] Keyboard doesn't cover input
- [ ] Text is readable (not too small)
- [ ] Buttons are touch-friendly (44x44px+)

### Desktop Testing

- [ ] Works on Chrome
- [ ] Works on Firefox
- [ ] Works on Safari
- [ ] Works on Edge
- [ ] Responsive to window resize
- [ ] Keyboard shortcuts work (Shift+Enter)

### Performance

- [ ] Build completes without warnings
- [ ] Lighthouse score > 85
- [ ] Load time < 3 seconds
- [ ] Streaming feels responsive
- [ ] No memory leaks
- [ ] Smooth animations (60 FPS)

### Security

- [ ] No API keys in client code
- [ ] Environment variables configured
- [ ] localStorage usage is safe
- [ ] XSS protection verified
- [ ] CORS configured properly
- [ ] Error messages don't leak sensitive data

## 📊 Performance Optimization

### Build Optimization

```bash
# Check bundle size
npm install -D vite-plugin-visualizer

# Add to vite.config.ts
import { visualizer } from "vite-plugin-visualizer";
export default {
  plugins: [visualizer()],
}

# Build and analyze
npm run build
# Opens visualization in browser
```

### Metrics to Monitor

- Bundle size < 300KB (uncompressed)
- Gzipped size < 100KB
- First paint < 1s
- Interactive time < 3s
- API response time < 500ms
- Streaming latency < 100ms

### Optimization Techniques

1. **Code Splitting** - Vite does automatically
2. **Tree Shaking** - Remove unused code
3. **Image Compression** - Use WebP format
4. **Caching** - Set proper headers
5. **CDN** - Use Vercel/Netlify CDN
6. **Lazy Loading** - Load components on demand

## 🔗 Custom Domain Setup

### With Vercel

1. Go to project settings
2. Domains
3. Add custom domain
4. Update DNS at registrar
5. Verify domain

### With Netlify

1. Go to Domain settings
2. Custom domains
3. Add domain
4. Update DNS
5. Automatic HTTPS via Let's Encrypt

### DNS Configuration

```
A Record: 76.76.19.165 (Vercel)
CNAME: xxx.vercel.app
```

Check with registrar for specific instructions.

## 🆘 Troubleshooting Deployment

### Issue: Build fails

```bash
# Clear node_modules and reinstall
rm -rf node_modules
npm install

# Try building again
npm run build
```

### Issue: Environment variables not loading

```bash
# Vercel - add to project settings
# Netlify - add in Build & deploy > Environment
# Local - create .env file in root

# Make sure to restart dev server after adding vars
```

### Issue: API returns 401

```bash
# Check API key is correct
# Check API key is active
# Check API rate limits
# Check CORS headers
```

### Issue: White screen on production

```
1. Open browser console (F12)
2. Check for errors
3. Check Network tab for failed requests
4. Verify API keys are set
5. Check if CORS is blocking requests
```

### Issue: Slow performance

```
1. Check bundle size (npm run build)
2. Check network latency
3. Check API response time
4. Check streaming delay (5ms default)
5. Clear browser cache
```

## 📈 Monitoring & Analytics

### Setup Error Tracking

```typescript
// Example: Sentry integration
import * as Sentry from "@sentry/react";

Sentry.init({
  dsn: "your-sentry-dsn",
  environment: "production",
});
```

### Monitor Metrics

- User count
- Active users
- API response times
- Error rate
- Error types
- Feature usage
- Performance metrics

### Recommended Services

- **Sentry** - Error tracking
- **Datadog** - Full monitoring
- **LogRocket** - Session replay
- **Mixpanel** - Event analytics
- **Google Analytics** - Traffic analysis

## 🔄 Continuous Deployment

### GitHub Actions Example

```yaml
name: Deploy
on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - uses: actions/setup-node@v2
        with:
          node-version: "18"
      - run: npm install
      - run: npm run build
      - uses: peaceiris/actions-gh-pages@v3
        with:
          github_token: ${{ secrets.GITHUB_TOKEN }}
          publish_dir: ./dist
```

## 🎯 Launch Checklist

Before going live:

### 1 Week Before

- [ ] Complete all development
- [ ] Run full test suite
- [ ] Get security review
- [ ] Prepare monitoring setup
- [ ] Brief stakeholders

### 1 Day Before

- [ ] Final testing on all devices
- [ ] Verify all API keys work
- [ ] Test edge cases
- [ ] Backup any important data
- [ ] Prepare rollback plan

### Launch Day

- [ ] Deploy to staging first
- [ ] Run smoke tests
- [ ] Deploy to production
- [ ] Monitor errors/performance
- [ ] Be available for support

### Post-Launch

- [ ] Monitor for 24 hours
- [ ] Check error reports
- [ ] Verify performance metrics
- [ ] Gather user feedback
- [ ] Plan improvements

## 📞 Rollback Plan

If issues occur:

```bash
# Revert to previous deployment
# Vercel - click "Rollback" in deployment history

# Netlify - deploy previous successful build

# Manual - rebuild from previous git commit
git checkout <previous-commit>
npm run build
# Re-deploy

# Monitor after rollback
# Check error logs
# Identify root cause
# Fix and deploy again
```

## 📚 Additional Resources

- [Vite Documentation](https://vitejs.dev)
- [Deployment Guides](https://vitejs.dev/guide/ssr.html)
- [React Best Practices](https://react.dev)
- [Tailwind CSS Docs](https://tailwindcss.com)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)

## 🎉 Success Metrics

After deployment, measure:

- ✅ Zero critical errors
- ✅ API response < 500ms
- ✅ Lighthouse score > 85
- ✅ User adoption rate
- ✅ Daily active users
- ✅ Feature usage
- ✅ User satisfaction
