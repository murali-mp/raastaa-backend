# Raastaa Backend - Deployment Guide

## Deployment Options

### Option 1: DigitalOcean App Platform (Recommended)

#### Prerequisites
- GitHub account with repository
- DigitalOcean account
- PostgreSQL database (DigitalOcean Managed Database)
- Redis instance

#### Steps

1. **Push code to GitHub**
```bash
git init
git add .
git commit -m "Initial commit"
git remote add origin your-repo-url
git push -u origin main
```

2. **Create PostgreSQL Database**
- Go to DigitalOcean > Databases
- Create PostgreSQL 15+ cluster
- Enable PostGIS extension
- Note connection string

3. **Create Redis Instance**
- DigitalOcean > Databases > Create Redis
- Note connection string

4. **Deploy App**
- DigitalOcean > Apps > Create App
- Connect GitHub repository
- Select branch: main
- Detect: Node.js
- Build Command: `npm install && npm run build && npm run prisma:generate`
- Run Command: `npm run prisma:migrate:prod && npm start`

5. **Configure Environment Variables**
Add in App Settings > Environment Variables:
```
NODE_ENV=production
DATABASE_URL=your-postgres-connection-string
REDIS_URL=your-redis-connection-string
JWT_SECRET=generate-secure-random-string
S3_BUCKET_NAME=your-bucket
S3_ACCESS_KEY=your-key
S3_SECRET_KEY=your-secret
APNS_KEY_PATH=/path/to/key
APNS_KEY_ID=your-key-id
APNS_TEAM_ID=your-team-id
APNS_BUNDLE_ID=com.raastaa.app
APNS_PRODUCTION=true
CORS_ORIGIN=raastaa://
```

6. **Deploy**
- Click "Deploy"
- Wait for build to complete
- Test health endpoint

#### Cost Estimate
- App: $12/month (Basic)
- PostgreSQL: $25/month (1GB)
- Redis: $15/month (512MB)
**Total: ~$52/month**

---

### Option 2: AWS Elastic Beanstalk

#### Prerequisites
- AWS account
- AWS CLI installed
- EB CLI installed

#### Steps

1. **Initialize EB**
```bash
eb init raastaa-backend --platform node.js --region us-east-1
```

2. **Create environment**
```bash
eb create raastaa-prod --instance-type t3.small
```

3. **Set environment variables**
```bash
eb setenv NODE_ENV=production DATABASE_URL=... REDIS_URL=...
```

4. **Deploy**
```bash
eb deploy
```

---

### Option 3: Docker + Any Cloud Provider

#### Create Dockerfile

```dockerfile
FROM node:18-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY prisma ./prisma/

# Install dependencies
RUN npm ci --only=production

# Copy source code
COPY . .

# Build TypeScript
RUN npm run build

# Generate Prisma client
RUN npm run prisma:generate

# Expose port
EXPOSE 3000

# Start server
CMD ["npm", "start"]
```

#### Build and run
```bash
docker build -t raastaa-backend .
docker run -p 3000:3000 --env-file .env raastaa-backend
```

---

## Post-Deployment Checklist

- [ ] Health check returns 200
- [ ] Database migrations applied
- [ ] Seed data loaded (optional)
- [ ] SSL certificate active (HTTPS)
- [ ] Environment variables set
- [ ] API accessible from iOS app
- [ ] CORS configured correctly
- [ ] Rate limiting working
- [ ] Logs accessible
- [ ] Monitoring set up
- [ ] Backup configured
- [ ] Error tracking (Sentry) active

---

## Database Setup

### Run Migrations

```bash
npm run prisma:migrate:prod
```

### Enable PostGIS

```bash
psql $DATABASE_URL -f prisma/extensions.sql
```

### Seed Data

```bash
npx ts-node prisma/seed.ts
```

---

## Monitoring

### Health Check
```bash
curl https://api.raastaa.com/health
```

### Logs
```bash
# DigitalOcean
doctl apps logs <app-id>

# AWS
eb logs

# Docker
docker logs <container-id>
```

---

## Troubleshooting

### Database Connection Issues
- Verify DATABASE_URL format
- Check firewall rules
- Ensure SSL mode is correct

### PostGIS Not Working
- Run extensions.sql manually
- Verify extensions are installed
- Check Prisma can connect

### High Memory Usage
- Increase instance size
- Check for memory leaks
- Review connection pooling

---

## Scaling

### Horizontal Scaling
- Add more app instances
- Use load balancer
- Ensure stateless design

### Database Scaling
- Upgrade to larger database
- Add read replicas
- Implement caching (Redis)

### CDN for Media
- Use CloudFlare R2 + CDN
- Cache static assets
- Optimize image sizes

---

## Backup & Recovery

### Automated Backups
- DigitalOcean: Automatic daily backups
- AWS RDS: Enable automated backups
- Point-in-time recovery: 7 days

### Manual Backup
```bash
pg_dump $DATABASE_URL > backup.sql
```

### Restore
```bash
psql $DATABASE_URL < backup.sql
```

---

## Security

### SSL/TLS
- Force HTTPS in production
- Use SSL for database connection
- Validate certificates

### Secrets Management
- Never commit .env to git
- Use environment variables
- Rotate secrets regularly

### Rate Limiting
- Monitor for abuse
- Adjust limits as needed
- Implement IP blacklisting

---

## Support

For deployment issues, check:
- [DigitalOcean Docs](https://docs.digitalocean.com)
- [Prisma Docs](https://www.prisma.io/docs)
- [PostGIS Docs](https://postgis.net/docs/)
