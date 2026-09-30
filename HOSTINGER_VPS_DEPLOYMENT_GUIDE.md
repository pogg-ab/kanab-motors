# KANAB Motors - Hostinger VPS Docker Deployment Guide
**Target Server:** `srv1058798.hstgr.cloud` (Ubuntu 25.04)  
**Hostinger Public IPv4:** `69.62.109.18`  
**SSH User:** `root` (`ssh root@69.62.109.18`)

---

## 1. Production Architecture Overview

The system runs on the VPS as 3 isolated, orchestrating Docker containers:

```
                  ┌────────────────────────────────────────┐
                  │    Hostinger VPS (69.62.109.18)        │
                  │                                        │
Browser Traffic   │   ┌────────────────────────────────┐   │
─────────────────►│:80│      Frontend (Nginx)          │   │
                  │   │   • Serves React SPA           │   │
                  │   │   • Proxies /api/ ────────┐    │   │
                  │   └───────────────────────────│────┘   │
                  │                               │        │
                  │                   Docker Net  ▼        │
                  │   ┌────────────────────────────────┐   │
                  │   │      Backend (NestJS)          │   │
                  │   │   • Port 3000 (Internal)       │   │
                  │   │   • Auto-runs migrations       │   │
                  │   └───────────────┬────────────────┘   │
                  │                   │                    │
                  │                   ▼                    │
                  │   ┌────────────────────────────────┐   │
                  │   │   PostgreSQL 16 Engine         │   │
                  │   │   • Volume: kanab_pgdata       │   │
                  │   └────────────────────────────────┘   │
                  └────────────────────────────────────────┘
```

---

## 2. Step-by-Step Deployment Instructions

### STEP 1: Build and Push Images to Docker Hub (On Your Local Machine)

1. Make sure **Docker Desktop** is running on your computer.
2. Open PowerShell or Command Prompt in `D:\kanab` and run:

```cmd
.\build-and-push.bat <your-dockerhub-username>
```

*(Alternatively, you can run the commands manually):*
```bash
# 1. Login to Docker Hub
docker login

# 2. Build Backend image
docker build -t <your-dockerhub-username>/kanab-backend:latest ./backend

# 3. Build Frontend image
docker build -t <your-dockerhub-username>/kanab-frontend:latest ./frontend

# 4. Push to Docker Hub
docker push <your-dockerhub-username>/kanab-backend:latest
docker push <your-dockerhub-username>/kanab-frontend:latest
```

---

### STEP 2: Connect to Your Hostinger VPS via SSH

From PowerShell, Terminal, or PuTTY:
```bash
ssh root@69.62.109.18
```
*(Enter your root password when prompted)*

---

### STEP 3: Setup the Directory and Files on the VPS

Run the following commands on the VPS:

```bash
# 1. Create directory for KANAB Motors
mkdir -p /opt/kanab-motors
cd /opt/kanab-motors

# 2. Install Docker & Docker Compose plugin (if not already installed)
curl -fsSL https://get.docker.com | sh
apt-get install -y docker-compose-plugin
```

Now, create the `docker-compose.yml` file on your VPS:
```bash
nano docker-compose.yml
```
*(Paste the contents of [docker-compose.prod.yml](file:///d:/kanab/docker-compose.prod.yml) into the file, save and exit with `Ctrl + O`, `Enter`, then `Ctrl + X`)*

Next, create the `.env` file with your configuration:
```bash
nano .env
```
Paste the following (replace `<your-dockerhub-username>` with your actual username):
```env
DOCKER_IMAGE_BACKEND=<your-dockerhub-username>/kanab-backend:latest
DOCKER_IMAGE_FRONTEND=<your-dockerhub-username>/kanab-frontend:latest
DB_USER=kanab_admin
DB_PASSWORD=KanabSecurePass2026!
DB_NAME=kanab_motors
JWT_SECRET=kanab_motors_enterprise_secret_jwt_key_2026_x89
JWT_EXPIRATION=86400s
```
*(Save and exit with `Ctrl + O`, `Enter`, then `Ctrl + X`)*

---

### STEP 4: Pull and Start the Application

On the VPS, simply run:
```bash
# Pull the images from Docker Hub
docker compose pull

# Start all services in the background
docker compose up -d
```

Check that all 3 containers are healthy and running:
```bash
docker compose ps
```

You should see:
- `kanab_postgres` (Up, healthy)
- `kanab_backend` (Up)
- `kanab_frontend` (Up, 0.0.0.0:80->80/tcp)

---

### STEP 5: Access KANAB Motors

Open your browser and navigate to:
```
http://69.62.109.18
```

- **Frontend Web App:** `http://69.62.109.18`
- **Backend API:** `http://69.62.109.18/api`
- **Swagger Documentation:** `http://69.62.109.18/api/docs`

---

## 3. Useful VPS Management Commands

| Operation | Command (run inside `/opt/kanab-motors`) |
| :--- | :--- |
| **View Live Logs** | `docker compose logs -f` |
| **View Backend Logs** | `docker compose logs -f backend` |
| **View Database Logs** | `docker compose logs -f postgres` |
| **Restart Stack** | `docker compose restart` |
| **Stop Stack** | `docker compose down` |
| **Update to New Version** | `docker compose pull && docker compose up -d` |
| **Database Backup** | `docker exec -t kanab_postgres pg_dump -U kanab_admin kanab_motors > backup_$(date +%F).sql` |
| **Restore Database** | `cat backup.sql \| docker exec -i kanab_postgres psql -U kanab_admin kanab_motors` |
