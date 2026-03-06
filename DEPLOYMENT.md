# Deployment Guide

## Quick Deployment Options

### 1. Vercel (Recommended - Easiest)

**Advantages:**
- One-click deployment
- Automatic deployments from Git
- Serverless database support
- Free tier available
- Built for Next.js

**Steps:**
1. Push code to GitHub
2. Go to [vercel.com](https://vercel.com)
3. Click "New Project"
4. Import your GitHub repository
5. Set environment variables (optional)
6. Click Deploy
7. Done! Your app is live.

**Environment Variables:**
```
DATABASE_URL=/tmp/app.db  (or external database)
NODE_ENV=production
```

### 2. Docker + Your Server

**Dockerfile:**
```dockerfile
FROM node:18-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy source
COPY . .

# Build app
RUN npm run build

# Expose port
EXPOSE 3000

# Start app
CMD ["npm", "start"]
```

**Commands:**
```bash
# Build image
docker build -t bulk-price-editor .

# Run container
docker run -p 3000:3000 \
  -v /data:/app/data \
  -e DATABASE_URL=/app/data/app.db \
  bulk-price-editor

# With docker-compose
docker-compose up -d
```

### 3. Self-Hosted Linux Server

**Requirements:**
- Ubuntu 20.04 LTS or similar
- Node.js 18+
- Nginx (reverse proxy)
- SSL certificate (Let's Encrypt)

**Setup Steps:**

```bash
# 1. SSH into server
ssh user@your-server.com

# 2. Install Node.js
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# 3. Clone repository
git clone https://github.com/yourusername/bulk-price-editor
cd bulk-price-editor

# 4. Install dependencies
npm install

# 5. Initialize database
npm run db:init

# 6. Build for production
npm run build

# 7. Install PM2 for process management
npm install -g pm2

# 8. Start app with PM2
pm2 start "npm start" --name "bulk-price-editor"
pm2 save
pm2 startup

# 9. Configure nginx
sudo nano /etc/nginx/sites-available/bulk-price-editor
```

**Nginx Configuration:**
```nginx
upstream app {
  server127.0.0.1:3000;
}

server {
  listen 80;
  server_name yourdomain.com;
  
  # Redirect HTTP to HTTPS
  return 301 https://$server_name$request_uri;
}

server {
  listen 443 ssl http2;
  server_name yourdomain.com;
  
  # SSL certificates
  ssl_certificate /etc/letsencrypt/live/yourdomain.com/fullchain.pem;
  ssl_certificate_key /etc/letsencrypt/live/yourdomain.com/privkey.pem;
  
  # Security headers
  add_header Strict-Transport-Security "max-age=31536000" always;
  add_header X-Content-Type-Options "nosniff" always;
  add_header X-Frame-Options "DENY" always;
  
  # Proxy to Node.js app
  location / {
    proxy_pass http://app;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection 'upgrade';
    proxy_set_header Host $host;
    proxy_cache_bypass $http_upgrade;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
  }
}
```

**Enable Nginx:**
```bash
sudo ln -s /etc/nginx/sites-available/bulk-price-editor /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

**Setup SSL (Let's Encrypt):**
```bash
# Install Certbot
sudo apt-get install -y certbot python3-certbot-nginx

# Get certificate
sudo certbot certonly --nginx -d yourdomain.com

# Auto-renew
sudo systemctl enable certbot.timer
```

### 4. Render (Alternative PaaS)

1. Push to GitHub
2. Visit [render.com](https://render.com)
3. Create new Web Service
4. Connect GitHub repo
5. Set build command: `npm install && npm run build && npm run db:init`
6. Set start command: `npm start`
7. Set environment variables
8. Deploy

### 5. Railway (Another Option)

1. Connect GitHub
2. Create new project
3. Select repository
4. Add environment variables
5. Deploy automatically

---

## Environment Variables for Production

Create `.env.production` file:

```env
# Node environment
NODE_ENV=production

# Database
DATABASE_URL=/path/to/database/app.db

# App settings
NEXT_PUBLIC_APP_NAME="Bulk Price Editor"

# Optional: External database
# DATABASE_URL=postgresql://user:pass@host:5432/db
# DATABASE_URL=mysql://user:pass@host:3306/db
```

---

## Database Backup Strategy

### Automated Backups (Cron Job)

```bash
# Add to crontab (sudo crontab -e)

# Daily backup at 2 AM
0 2 * * * /home/user/backup-db.sh

# Weekly backup (Sunday at 3 AM)
0 3 * * 0 /home/user/backup-db-weekly.sh
```

**backup-db.sh:**
```bash
#!/bin/bash
BACKUP_DIR="/home/user/backups"
DB_FILE="/app/data/app.db"
DATE=$(date +%Y%m%d_%H%M%S)

mkdir -p $BACKUP_DIR
cp $DB_FILE $BACKUP_DIR/app_$DATE.db
gzip $BACKUP_DIR/app_$DATE.db

# Keep only last 30 days
find $BACKUP_DIR -name "*.gz" -mtime +30 -delete

# Optional: Upload to cloud storage
# aws s3 cp $BACKUP_DIR/app_$DATE.db.gz s3://your-bucket/
```

### Cloud Storage Backup

**AWS S3:**
```bash
# Install AWS CLI
pip install awscli

# Upload backup
aws s3 cp /app/data/app.db s3://your-bucket/backups/app-$(date +%Y%m%d).db --sse AES256
```

**Google Cloud Storage:**
```bash
# Install gcloud
curl https://sdk.cloud.google.com | bash

# Upload
gsutil cp /app/data/app.db gs://your-bucket/backups/
```

---

## Monitoring & Maintenance

### Health Checks

```bash
# Check if app is running
curl -f http://localhost:3000/api/settings || exit 1
```

### Logs

**PM2 Logs:**
```bash
pm2 logs bulk-price-editor
pm2 logs bulk-price-editor --tail 100
```

**Nginx Logs:**
```bash
tail -f /var/log/nginx/access.log
tail -f /var/log/nginx/error.log
```

### Database Maintenance

```bash
# Optimize SQLite database
sqlite3 data/app.db VACUUM;
```

### Performance Monitoring

**Check database size:**
```bash
du -h data/app.db
sqlite3 data/app.db "PRAGMA page_count;"
```

**Monitor server resources:**
```bash
# CPU and Memory
top

# Disk usage
df -h

# Application memory
ps aux | grep "npm start"
```

---

## Scaling Considerations

### For Growth

1. **External Database** (SQLite → PostgreSQL)
   - Update `DB_URL` to PostgreSQL
   - Better concurrency
   - Built-in replication

2. **Load Balancer**
   - Nginx stream
   - HAProxy
   - AWS ALB

3. **CDN Integration**
   - Cloudflare
   - AWS CloudFront
   - Bunny CDN

4. **Caching Layer**
   - Redis
   - Memcached
   - Cloudflare Cache

### Migration from SQLite to PostgreSQL

```javascript
// Update src/lib/db.ts
import { open } from "sqlite";
import postgres from "postgres";

const database = postgres(process.env.DATABASE_URL);
```

---

## Security Checklist for Production

- [ ] Use HTTPS/SSL
- [ ] Set strong database password
- [ ] Enable firewall rules
- [ ] Regularly backup database
- [ ] Update dependencies (`npm audit`)
- [ ] Use environment variables for secrets
- [ ] Enable API rate limiting
- [ ] Add authentication layer
- [ ] Monitor access logs
- [ ] Set up alerts/monitoring
- [ ] Use strong session secrets
- [ ] Enable CORS only for trusted domains

---

## Updating & Rollback

### Update Procedure

```bash
# 1. Pull latest code
git pull origin main

# 2. Install dependencies
npm install

# 3. Run migrations
npm run db:init

# 4. Build
npm run build

# 5. Test locally
npm run dev

# 6. Deploy
git push origin main  # If using auto-deploy
# OR
npm run build && pm2 restart bulk-price-editor
```

### Rollback Procedure

```bash
# If something breaks
git revert HEAD
npm install
npm run build
pm2 restart bulk-price-editor

# Or use PM2 save/restore
pm2 save
pm2 resurrect
```

---

## Support for Different Databases

### PostgreSQL

```env
DATABASE_URL=postgresql://user:password@localhost:5432/bulk_price_editor
```

### MySQL

```env
DATABASE_URL=mysql://user:password@localhost:3306/bulk_price_editor
```

### SQLite (Default)

```env
DATABASE_URL=/path/to/app.db
```

---

## Cost Estimation

| Platform | Monthly Cost | Best For |
|----------|-------------|----------|
| Vercel | Free - $20 | Small to medium |
| Railway | Free - $20 | Small to medium |
| Render | Free - $50 | Small to large |
| AWS EC2 | $5 - $50 | Large scale |
| DigitalOcean | $5 - $80 | Medium to large |
| Linode | $5 - $80 | Medium to large |

---

## Summary

**Choose deployment based on:**
- 🟢 **Just starting?** → Vercel (free)
- 🟡 **Small team?** → Railway or Render
- 🔴 **Enterprise?** → Self-hosted or AWS

**Steps to production:**
1. Choose deployment option
2. Set up environment variables
3. Configure database backups
4. Set up monitoring
5. Enable SSL/HTTPS
6. Deploy!

All done! Your Shopify Bulk Price Editor is now live! 🚀
