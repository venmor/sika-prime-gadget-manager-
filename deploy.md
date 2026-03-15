# VPS Deployment Guide

This project is best deployed on a single VPS with:

- Node.js 18+
- MariaDB or MySQL
- PM2
- nginx
- HTTPS via Let's Encrypt

The frontend does not need a separate build step. Express serves the HTML, CSS, JS, images, uploads, and API from the same app.

## 1. Prepare the server

These commands assume Ubuntu 22.04 or a similar Debian-based server.

```bash
sudo apt update
sudo apt install -y nginx mariadb-server mariadb-client
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs
sudo npm install -g pm2
sudo apt install -y certbot python3-certbot-nginx
```

Check versions:

```bash
node -v
npm -v
mariadb --version
nginx -v
pm2 -v
```

## 2. Create the app directory

```bash
cd /var/www
sudo mkdir -p /var/www/sika-prime-gadget-manager
sudo chown -R $USER:$USER /var/www/sika-prime-gadget-manager
git clone <your-repo-url> /var/www/sika-prime-gadget-manager
cd /var/www/sika-prime-gadget-manager
```

## 3. Create the database

Open MariaDB:

```bash
sudo mariadb
```

Run:

```sql
CREATE DATABASE sikaprime CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'sikaprime'@'localhost' IDENTIFIED BY 'replace-with-a-strong-password';
GRANT ALL PRIVILEGES ON sikaprime.* TO 'sikaprime'@'localhost';
FLUSH PRIVILEGES;
EXIT;
```

Run the migrations:

```bash
mariadb -u sikaprime -p sikaprime < database/migrations/create_tables.sql
mariadb -u sikaprime -p sikaprime < database/migrations/20260314_add_list_price.sql
```

If the second file is not needed for your database state, you can skip it.

## 4. Install backend dependencies

```bash
cd /var/www/sika-prime-gadget-manager/backend
npm install
npx playwright install --with-deps chromium
```

`Playwright` is required for the ad export feature. Without Chromium installed, poster export will fail.

## 5. Create production environment variables

Copy the example file:

```bash
cd /var/www/sika-prime-gadget-manager/backend
cp .env.example .env
```

Edit `backend/.env` and set:

```env
DB_HOST=localhost
DB_PORT=3306
DB_USER=sikaprime
DB_PASS=replace-with-your-db-password
DB_NAME=sikaprime
DB_CONNECTION_LIMIT=10
PORT=3000
SESSION_SECRET=replace-with-a-long-random-string
ADMIN_USERNAME=admin
ADMIN_EMAIL=admin@example.com
ADMIN_PASSWORD_HASH=replace-with-a-bcrypt-hash
```

Generate a bcrypt password hash:

```bash
cd /var/www/sika-prime-gadget-manager/backend
node -e "require('bcryptjs').hash('replace-with-admin-password', 10).then(console.log)"
```

Generate a session secret:

```bash
cd /var/www/sika-prime-gadget-manager/backend
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

## 6. Verify the app before starting PM2

```bash
cd /var/www/sika-prime-gadget-manager/backend
npm run db:check
NODE_ENV=production npm start
```

If the app starts, stop it with `Ctrl+C` and continue.

## 7. Start the app with PM2

From the repo root:

```bash
cd /var/www/sika-prime-gadget-manager
pm2 start ecosystem.config.js
pm2 save
pm2 startup
```

When `pm2 startup` prints a command, run that command too.

Useful PM2 commands:

```bash
pm2 status
pm2 logs sika-prime-gadget-manager
pm2 restart sika-prime-gadget-manager
pm2 stop sika-prime-gadget-manager
```

## 8. Configure nginx

Copy the example config from:

[`deploy/nginx/sika-prime-gadget-manager.conf.example`](/home/charlie/sika-prime-gadget-manager/deploy/nginx/sika-prime-gadget-manager.conf.example)

Install it:

```bash
sudo cp /var/www/sika-prime-gadget-manager/deploy/nginx/sika-prime-gadget-manager.conf.example /etc/nginx/sites-available/sika-prime-gadget-manager
sudo nano /etc/nginx/sites-available/sika-prime-gadget-manager
```

Change `server_name` to your real domain.

Enable the site:

```bash
sudo ln -s /etc/nginx/sites-available/sika-prime-gadget-manager /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

## 9. Enable HTTPS

```bash
sudo certbot --nginx -d your-domain.com -d www.your-domain.com
```

Then test auto-renew:

```bash
sudo certbot renew --dry-run
```

## 10. Verify the deployment

Health checks:

```bash
curl http://127.0.0.1:3000/api/health
curl http://127.0.0.1:3000/api/health/db
curl https://your-domain.com/api/health
curl https://your-domain.com/api/health/db
```

Browser URL:

```text
https://your-domain.com/login.html
```

## 11. Important runtime notes

- Sessions are stored on disk in `backend/.sessions`.
- Uploaded gadget images are stored on disk in `frontend/public/uploads`.
- Keep the app on one VPS unless you later move sessions and uploads to shared storage.
- In production, the app sets secure cookies when `NODE_ENV=production`, so HTTPS is required.

## 12. Updating the app later

```bash
cd /var/www/sika-prime-gadget-manager
git pull
cd backend
npm install
npx playwright install chromium
npm run db:check
cd ..
pm2 restart sika-prime-gadget-manager
```

If a new migration is added, run it before restarting PM2.
