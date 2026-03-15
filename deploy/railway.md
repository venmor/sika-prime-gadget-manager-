# GitHub Preview Deployment with Railway

This is the best temporary team-preview setup for this project.

Why this path:

- GitHub Pages is for static sites, but this app needs a Node backend, MySQL, sessions, uploads, and Playwright-powered ad export.
- Railway can deploy directly from your GitHub repo, give you a public `*.up.railway.app` URL, and provision MySQL in the same project.

## What you need

- A GitHub repo for this project
- A Railway account linked to GitHub
- The ability to add one MySQL service in Railway

## Repo files already prepared

These files are now in the repo to support Railway deployment:

- `Dockerfile`
- `.dockerignore`
- `railway.json`

The backend also now supports:

- Railway-style MySQL env vars
- configurable upload/session directories for mounted volumes

## 1. Push the current code to GitHub

From your machine:

```bash
cd /home/charlie/sika-prime-gadget-manager
git status
git add .
git commit -m "Prepare Railway preview deployment"
git push origin main
```

If your default branch is not `main`, push your active branch instead.

## 2. Create a new Railway project from GitHub

In Railway:

1. Click `New Project`
2. Choose `Deploy from GitHub repo`
3. Select `venmor/sika-prime-gadget-manager-`
4. Railway will detect the `Dockerfile` and build the app from it

## 3. Add a MySQL service

In the same Railway project:

1. Click `+ New`
2. Choose `Database`
3. Choose `MySQL`

Leave it in the same environment as the web service.

## 4. Add the web service variables

Open the deployed app service and go to `Variables`.

Add these:

```env
DB_HOST=${{MySQL.MYSQLHOST}}
DB_PORT=${{MySQL.MYSQLPORT}}
DB_USER=${{MySQL.MYSQLUSER}}
DB_PASS=${{MySQL.MYSQLPASSWORD}}
DB_NAME=${{MySQL.MYSQLDATABASE}}
DB_CONNECTION_LIMIT=10
SESSION_SECRET=replace-with-a-long-random-string
ADMIN_USERNAME=admin
ADMIN_EMAIL=admin@example.com
ADMIN_PASSWORD_HASH=replace-with-a-bcrypt-hash
```

If your MySQL service is not literally named `MySQL`, replace `MySQL` in those references with the actual Railway service name.

Generate the password hash locally:

```bash
cd /home/charlie/sika-prime-gadget-manager/backend
node -e "require('bcryptjs').hash('replace-with-admin-password', 10).then(console.log)"
```

Generate the session secret locally:

```bash
cd /home/charlie/sika-prime-gadget-manager/backend
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

## 5. Optional but recommended: attach a volume

Without a volume:

- uploaded images can disappear on redeploy
- file-based sessions can reset on redeploy

To persist them:

1. Open the app service
2. Go to `Volumes`
3. Add a volume and mount it at `/data`

Then add these service variables:

```env
UPLOADS_DIR=${{RAILWAY_VOLUME_MOUNT_PATH}}/uploads
SESSIONS_DIR=${{RAILWAY_VOLUME_MOUNT_PATH}}/sessions
```

## 6. Generate a public preview URL

In the app service:

1. Open `Settings`
2. Open `Networking`
3. Click `Generate Domain`

Railway will give you a public URL like:

```text
https://your-service-name.up.railway.app
```

Your team can use:

```text
https://your-service-name.up.railway.app/login.html
```

## 7. Run the database migrations

The app will not work until the tables exist.

Use the Railway MySQL service credentials plus its TCP proxy/public connection details, then run from your local machine:

```bash
mariadb -h YOUR_TCP_PROXY_DOMAIN -P YOUR_TCP_PROXY_PORT -u YOUR_MYSQL_USER -p YOUR_MYSQL_DATABASE < database/migrations/create_tables.sql
mariadb -h YOUR_TCP_PROXY_DOMAIN -P YOUR_TCP_PROXY_PORT -u YOUR_MYSQL_USER -p YOUR_MYSQL_DATABASE < database/migrations/20260314_add_list_price.sql
```

How to get those values:

- From the MySQL service `Variables` tab: `MYSQLUSER`, `MYSQLPASSWORD`, `MYSQLDATABASE`
- From the MySQL service `Networking` or TCP Proxy settings: public proxy domain and port

If your database is brand new, the first migration is the important one. The second is only needed for older database states.

## 8. Redeploy after variables and migrations

In Railway:

1. Open the app service
2. Trigger `Redeploy`

Or push a new commit to GitHub and Railway will redeploy automatically.

## 9. Verify the preview

Check:

```text
https://your-service-name.up.railway.app/api/health
https://your-service-name.up.railway.app/api/health/db
https://your-service-name.up.railway.app/login.html
```

Expected:

- `/api/health` returns `status: ok`
- `/api/health/db` returns `database: connected`
- login page loads

## 10. Notes for your team preview

- This is a good temporary test URL before buying a domain.
- The app is already set up to work behind Railway's HTTPS domain.
- Once you buy a real domain later, you can attach it in Railway without reworking the app.
