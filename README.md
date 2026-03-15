# Sika Prime Gadget Manager

This project is a simple inventory management system for a gadget shop. It allows you to keep track of laptops and phones, store their specifications, upload product images, mark items as sold and calculate profits. A small client side module also generates branded advertisement cards that can be downloaded as PNG files.

## Table of contents

1. [Prerequisites](#prerequisites)
2. [Project structure](#project-structure)
3. [Database setup](#database-setup)
4. [Installation](#installation)
5. [Local setup checklist](#local-setup-checklist)
6. [Running the application](#running-the-application)
7. [Environment variables](#environment-variables)
8. [Deployment](#deployment)

## Prerequisites

* **Node.js** (v18+ recommended) – used to run the backend server.
* **MySQL** (v8+) – database for storing gadget and sales data.
* **Git** – version control tool used throughout this project.

Make sure these are installed on your system before proceeding.

## Project structure

The repository is organised as follows:

```text
sika-prime-gadget-manager/
├── backend/             # Express server and API logic
│   ├── config/          # Database configuration
│   ├── controllers/     # Route handlers
│   ├── models/          # Data access logic for each table
│   ├── routes/          # Express routers
│   ├── middleware/      # Custom Express middleware (e.g. file upload)
│   └── utils/           # Helper functions (if needed)
├── frontend/            # Static assets and HTML views
│   ├── public/          # Public assets served by Express
│   │   ├── css/         # Stylesheets
│   │   ├── js/          # JavaScript files
│   │   └── images/      # Placeholder for uploaded images and logos
│   └── views/           # HTML templates/pages
├── database/            # Database scripts
│   ├── migrations/      # SQL scripts to create tables
│   └── seeds/           # (Optional) Seed data
├── docs/                # Project documentation
├── scripts/             # Utility scripts (if needed)
└── CHANGELOG.md         # Summary of changes per section
```

## Database setup

1. Create a MySQL database, e.g. `sikaprime`.
2. Execute the SQL script found in `database/migrations/create_tables.sql` to create the required tables. You can do this using the MySQL command line client:

   ```bash
   mysql -u <your_user> -p sikaprime < database/migrations/create_tables.sql
   ```

   Replace `<your_user>` with your MySQL username. You will be prompted for your password.
3. If your database already existed before the `list_price` field was introduced, also run:

   ```bash
   mysql -u <your_user> -p sikaprime < database/migrations/20260314_add_list_price.sql
   ```

## Installation

1. Clone the repository:

   ```bash
   git clone <repo-url> sika-prime-gadget-manager
   cd sika-prime-gadget-manager
   ```

2. Install backend dependencies:

   ```bash
   cd backend
   npm install
   ```

3. Install frontend dependencies (currently none; all front‑end code is vanilla HTML/CSS/JS).

## Local setup checklist

Use this sequence for a clean local setup:

1. Confirm MySQL is installed and running on your machine.
2. Create the `sikaprime` database.
3. Run `database/migrations/create_tables.sql`.
4. If you already had an older local database, run `database/migrations/20260314_add_list_price.sql`.
5. Copy `backend/.env.example` to `backend/.env`.
6. Fill in the database and admin credentials in `backend/.env`.
7. Run `cd backend && npm install`.
8. Run `cd backend && npm run db:check`.
9. Start the app with `cd backend && npm start`.

## Running the application

1. Copy the provided `.env.example` file to `.env` in the `backend` folder and fill in your database connection details, auth settings, and desired port:

   ```env
   DB_HOST=localhost
   DB_PORT=3306
   DB_USER=root
   DB_PASS=yourpassword
   DB_NAME=sikaprime
   DB_CONNECTION_LIMIT=10
   PORT=3000
   SESSION_SECRET=replace-with-a-long-random-string
   ADMIN_USERNAME=admin
   ADMIN_PASSWORD_HASH=replace-with-a-bcrypt-hash
   ```

   Generate the password hash with:

   ```bash
   cd backend
   node -e "require('bcryptjs').hash('your-password', 10).then(console.log)"
   ```

   Generate a session secret with:

   ```bash
   cd backend
   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
   ```

2. Start the server:

   ```bash
   cd backend
   npm run db:check
   npm start
   ```

3. Open your browser to `http://localhost:3000/login.html` to access the web interface.
4. Optional health checks:

   ```bash
   curl http://localhost:3000/api/health
   curl http://localhost:3000/api/health/db
   ```

## Environment variables

The application expects the following environment variables in a `.env` file within the `backend` directory:

* **DB_HOST** – MySQL host (e.g. `localhost`).
* **DB_PORT** – MySQL port (default: `3306`).
* **DB_USER** – MySQL user.
* **DB_PASS** – MySQL password.
* **DB_NAME** – MySQL database name.
* **DB_CONNECTION_LIMIT** – Maximum MySQL pool size (default: `10`).
* **PORT** – Port for the Express server (default: 3000).
* **SESSION_SECRET** – Secret used to sign session cookies.
* **ADMIN_USERNAME** – Username accepted by the login form.
* **ADMIN_PASSWORD_HASH** – bcrypt hash for the admin password.

These variables are loaded using `dotenv` and used to configure the database connection and server port.

If `npm run db:check` fails, fix the `.env` values first before starting the server.
`SESSION_SECRET` is required; the server will not start without it.

## Deployment

For deployment guides:

- VPS + PM2 + nginx: [`deploy.md`](/home/charlie/sika-prime-gadget-manager/deploy.md)
- GitHub-connected Railway preview deployment: [`deploy/railway.md`](/home/charlie/sika-prime-gadget-manager/deploy/railway.md)
