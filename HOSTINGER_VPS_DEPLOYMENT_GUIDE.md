# KANAB Motors — Production Deployment & Maintenance Guide

**Target Domain:** [https://kanab.skylinkict.com](https://kanab.skylinkict.com)  
**Target Server:** Hostinger VPS `srv1058798.hstgr.cloud` (Ubuntu 25.04)  
**Hostinger Public IPv4:** `69.62.109.18`  
**Deploy Path on Server:** `/opt/kanab-motors`  
**Docker Hub Registry:** `poggab/kanab-backend:latest` & `poggab/kanab-frontend:latest`

---

## 1. Production Architecture Overview

The application runs in isolated Docker containers orchestrated via Docker Compose, fronted by the Hostinger host-level Nginx reverse proxy with automated Let's Encrypt SSL:

```
 Internet (Browser HTTPS Traffic)
                │
                ▼
   ┌───────────────────────────────────────────────┐
   │ Host Nginx Reverse Proxy (Ports 80 & 443)     │
   │ Domain: kanab.skylinkict.com (Let's Encrypt)  │
   └──────────────────────┬────────────────────────┘
                          │ proxy_pass http://127.0.0.1:5173
                          ▼
   ┌───────────────────────────────────────────────┐
   │ kanab_frontend (Nginx 1.25 Alpine)            │
   │ Host Port: 5173 -> Container Port: 80         │
   │ • Serves compiled Vite/React SPA              │
   │ • Proxies /api/ requests to kanab_backend     │
   └──────────────────────┬────────────────────────┘
                          │ internal docker network (kanab_net)
                          ▼
   ┌───────────────────────────────────────────────┐
   │ kanab_backend (Node 20 / NestJS API Engine)   │
   │ Port: 3000 (Internal)                         │
   │ • Automatic TypeORM migrations on startup     │
   │ • JWT RBAC Auth & Business Logic              │
   └──────────────────────┬────────────────────────┘
                          │ internal docker network (kanab_net)
                          ▼
   ┌───────────────────────────────────────────────┐
   │ kanab_postgres (PostgreSQL 16 Alpine)         │
   │ Port: 5432 (Internal)                         │
   │ • Volume: kanab_pgdata                        │
   │ • Database: kanab_motors                      │
   └───────────────────────────────────────────────┘
```

---

## 2. Server Configuration Files (Live on VPS)

### Location: `/opt/kanab-motors/docker-compose.yml`
```yaml
services:
  postgres:
    image: postgres:16-alpine
    container_name: kanab_postgres
    restart: always
    environment:
      POSTGRES_USER: kanab_admin
      POSTGRES_PASSWORD: kanab_secure_prod_2026
      POSTGRES_DB: kanab_motors
    volumes:
      - kanab_pgdata:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U kanab_admin -d kanab_motors"]
      interval: 5s
      timeout: 5s
      retries: 5
    networks:
      - kanab_net

  backend:
    image: poggab/kanab-backend:latest
    container_name: kanab_backend
    restart: always
    depends_on:
      postgres:
        condition: service_healthy
    environment:
      NODE_ENV: production
      PORT: 3000
      DB_HOST: postgres
      DB_PORT: 5432
      DB_USER: kanab_admin
      DB_PASSWORD: kanab_secure_prod_2026
      DB_NAME: kanab_motors
      JWT_SECRET: kanab_motors_super_secret_jwt_key_2026_prod
      JWT_EXPIRATION: 86400s
    volumes:
      - kanab_uploads:/app/uploads
    networks:
      - kanab_net

  frontend:
    image: poggab/kanab-frontend:latest
    container_name: kanab_frontend
    restart: always
    depends_on:
      - backend
    ports:
      - "5173:80"
    networks:
      - kanab_net

volumes:
  kanab_pgdata:
    name: kanab_pgdata
  kanab_uploads:
    name: kanab_uploads

networks:
  kanab_net:
    name: kanab_net
    driver: bridge
```

### Host Nginx Configuration: `/etc/nginx/sites-available/kanab.skylinkict.com.conf`
*(Auto-managed by Certbot for SSL renewal)*:
```nginx
server {
    server_name kanab.skylinkict.com www.kanab.skylinkict.com;
    client_max_body_size 50M;

    location / {
        proxy_pass http://127.0.0.1:5173;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    listen 443 ssl; # managed by Certbot
    ssl_certificate /etc/letsencrypt/live/kanab.skylinkict.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/kanab.skylinkict.com/privkey.pem;
    include /etc/letsencrypt/options-ssl-nginx.conf;
    ssl_dhparam /etc/letsencrypt/ssl-dhparams.pem;
}

server {
    if ($host = www.kanab.skylinkict.com) {
        return 301 https://$host$request_uri;
    }
    if ($host = kanab.skylinkict.com) {
        return 301 https://$host$request_uri;
    }
    listen 80;
    server_name kanab.skylinkict.com www.kanab.skylinkict.com;
    return 404;
}
```

---

## 3. Seeded Accounts & Login Credentials

All users have been initialized with hashed bcrypt passwords:

| Role | Username | Password | Purpose |
| :--- | :--- | :--- | :--- |
| **System Administrator** | `admin` | `Admin@123` | Full Master Access (All permissions, RBAC, Settings) |
| **Sales Manager** | `sales` | `Sales@123` | Customers, Bookings, Quotes, Allocations |
| **Finance Manager** | `finance` | `Finance@123` | Payments, Approvals, Customer Ledger, Refunds |
| **Procurement & Import** | `procurement` | `Procure@123` | Purchase Orders, Shipments, Landed Costs |
| **Inventory & Yard** | `inventory` | `Inventory@123` | Stock Receipts, Vehicle Intake, Chassis / VINs |

---

## 4. How to Update / Deploy New Changes

Whenever you make changes to the frontend or backend in your local code, follow this standard 2-step workflow:

### Step A: Build and Push from Local Machine (Windows)
Open PowerShell in `D:\kanab` and run:

```powershell
# 1. Build and push backend
docker build -t poggab/kanab-backend:latest ./backend
docker push poggab/kanab-backend:latest

# 2. Build and push frontend
docker build -t poggab/kanab-frontend:latest ./frontend
docker push poggab/kanab-frontend:latest
```

### Step B: Update and Restart on the VPS
In your VPS terminal (`/opt/kanab-motors`), run:

```bash
docker compose pull
docker compose up -d
```
*(Docker will pull the new image layers and restart only the updated containers without dropping database data or connections).*

---

## 5. Operations & Database Maintenance Cheat Sheet

Run all commands inside `/opt/kanab-motors` on the VPS:

### Monitoring & Status
```bash
# Check status of containers
docker compose ps

# View live backend logs
docker compose logs -f backend

# View live database logs
docker compose logs -f postgres

# View live frontend proxy logs
docker compose logs -f frontend
```

### Database Operations
```bash
# Connect to PostgreSQL CLI
docker exec -it kanab_postgres psql -U kanab_admin -d kanab_motors

# Run database migrations / seed manually
docker exec -it kanab_backend node dist/database/seed.js

# Remove demo customer & demo vehicle products (if needed)
docker exec -i kanab_postgres psql -U kanab_admin -d kanab_motors -c "DELETE FROM customer WHERE mobile_number = '+251911223344'; ALTER SEQUENCE customer_code_seq RESTART WITH 1; DELETE FROM product_item WHERE item_code IN ('KB-MC-BOXER150', 'KB-3W-MAXIMA-Z', 'KB-3W-TVS-KING');"

# Create a full database backup (.sql)
docker exec -t kanab_postgres pg_dump -U kanab_admin kanab_motors > /opt/kanab-motors/backup_$(date +%F).sql

# Restore a database backup
cat /opt/kanab-motors/backup_2026-09-30.sql | docker exec -i kanab_postgres psql -U kanab_admin -d kanab_motors
```

### SSL Certificate Renewal
Certbot automatically renews certificates, but you can test or manually renew with:
```bash
certbot renew --dry-run
```
