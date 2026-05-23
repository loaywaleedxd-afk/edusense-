# EduSense — Hostinger VPS Deployment Guide

## Prerequisites
- Hostinger VPS (Ubuntu 22.04 LTS recommended)
- A domain pointed at the VPS IP (e.g. `edusense.com`)
- Wildcard DNS `*.edusense.com` for multi-tenancy

---

## 1. Initial VPS Setup

```bash
apt update && apt upgrade -y
apt install -y python3.10 python3.10-venv python3-pip postgresql nginx certbot python3-certbot-nginx git
```

---

## 2. PostgreSQL Setup

```bash
# Start PostgreSQL
systemctl enable postgresql
systemctl start postgresql

# Run the init script (as postgres superuser)
sudo -u postgres psql -f /opt/edusense/backend/migrations/init_postgres.sql
```

Edit `/etc/postgresql/*/main/pg_hba.conf` to allow local password auth:
```
host    edusense    edusense    127.0.0.1/32    md5
```

Restart PostgreSQL:
```bash
systemctl restart postgresql
```

---

## 3. Application Setup

```bash
# Clone or upload your project
git clone https://github.com/yourorg/edusense.git /opt/edusense
cd /opt/edusense/emotion_system/backend

# Create virtualenv
python3.10 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
```

---

## 4. Environment Variables

Create `/opt/edusense/emotion_system/backend/.env`:

```env
DATABASE_URL=postgresql://edusense:your-strong-password@localhost:5432/edusense
JWT_SECRET=generate-a-long-random-string-here
ALLOWED_ORIGINS=https://edusense.com,https://schoola.edusense.com
SMTP_USER=your-gmail@gmail.com
SMTP_PASS=your-gmail-app-password
PAYMOB_HMAC_SECRET=your-paymob-hmac-secret
```

Generate a strong secret:
```bash
python3 -c "import secrets; print(secrets.token_hex(32))"
```

---

## 5. systemd Service — Backend

Create `/etc/systemd/system/edusense-backend.service`:

```ini
[Unit]
Description=EduSense FastAPI Backend
After=network.target postgresql.service

[Service]
User=www-data
Group=www-data
WorkingDirectory=/opt/edusense/emotion_system/backend
EnvironmentFile=/opt/edusense/emotion_system/backend/.env
ExecStart=/opt/edusense/emotion_system/backend/venv/bin/uvicorn main:app --host 127.0.0.1 --port 8000 --workers 4
Restart=on-failure
RestartSec=5s

[Install]
WantedBy=multi-user.target
```

Enable and start:
```bash
systemctl daemon-reload
systemctl enable edusense-backend
systemctl start edusense-backend
systemctl status edusense-backend
```

---

## 6. systemd Service — Face Recognition Server

Create `/etc/systemd/system/edusense-face.service`:

```ini
[Unit]
Description=EduSense Face Recognition Server
After=network.target

[Service]
User=www-data
Group=www-data
WorkingDirectory=/opt/edusense
EnvironmentFile=/opt/edusense/emotion_system/backend/.env
ExecStart=/opt/edusense/emotion_system/backend/venv/bin/python face_server.py
Restart=on-failure
RestartSec=5s

[Install]
WantedBy=multi-user.target
```

```bash
systemctl daemon-reload
systemctl enable edusense-face
systemctl start edusense-face
```

---

## 7. Nginx Configuration

Create `/etc/nginx/sites-available/edusense`:

```nginx
# Backend API — main domain and all subdomains
server {
    listen 80;
    server_name edusense.com *.edusense.com;

    # Frontend static files
    root /opt/edusense/Ddownloadedusense-web/dist;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    # Backend API proxy
    location /api/ {
        proxy_pass         http://127.0.0.1:8000;
        proxy_http_version 1.1;
        proxy_set_header   Host              $host;
        proxy_set_header   X-Real-IP         $remote_addr;
        proxy_set_header   X-Forwarded-For   $proxy_add_x_forwarded_for;
        proxy_set_header   Upgrade           $http_upgrade;
        proxy_set_header   Connection        "upgrade";
        proxy_read_timeout 120s;
    }

    # WebSocket
    location /ws/ {
        proxy_pass         http://127.0.0.1:8000;
        proxy_http_version 1.1;
        proxy_set_header   Upgrade    $http_upgrade;
        proxy_set_header   Connection "upgrade";
        proxy_set_header   Host       $host;
    }

    # Student photos
    location /photos/ {
        alias /opt/edusense/student_photos/;
        expires 7d;
    }
}
```

Enable the site:
```bash
ln -s /etc/nginx/sites-available/edusense /etc/nginx/sites-enabled/
nginx -t
systemctl reload nginx
```

---

## 8. SSL with Let's Encrypt

```bash
certbot --nginx -d edusense.com -d '*.edusense.com'
```

For wildcard certs you need DNS challenge:
```bash
certbot certonly --manual --preferred-challenges dns \
  -d edusense.com -d '*.edusense.com'
```

Follow the instructions to add TXT records in Hostinger DNS panel.

Auto-renewal is handled by the certbot systemd timer (verify with `systemctl status certbot.timer`).

---

## 9. Multi-Tenancy: Adding a New School

When a new school `schoolb` signs up at `schoolb.edusense.com`:

1. Add a DNS A-record `schoolb.edusense.com` pointing to the VPS IP.
2. Register the tenant in the database:

```sql
INSERT INTO public.tenants (schema_name, name, domain)
VALUES ('schoolb', 'School B University', 'schoolb.edusense.com');
```

3. Create the schema via the Python init function:

```python
# one-off script or admin endpoint
import asyncio, asyncpg, os
from database import init_tenant_schema

async def main():
    pool = await asyncpg.create_pool(os.getenv("DATABASE_URL"))
    await init_tenant_schema(pool, "schoolb")
    await pool.close()

asyncio.run(main())
```

That school's data is now isolated in the `schoolb` PostgreSQL schema.

---

## 10. Useful Commands

```bash
# View backend logs
journalctl -u edusense-backend -f

# Restart backend after code update
systemctl restart edusense-backend

# Check PostgreSQL connections
sudo -u postgres psql -c "SELECT * FROM pg_stat_activity WHERE datname='edusense';"

# Backup database
pg_dump -U edusense -h localhost edusense > backup_$(date +%Y%m%d).sql

# Restore database
psql -U edusense -h localhost edusense < backup_20260101.sql
```
