# Sika Prime Gadget Manager

This project is a simple inventory management system for a gadget shop. It allows you to keep track of laptops and phones, store their specifications, upload product images, mark items as sold and calculate profits. A small client side module also generates branded advertisement cards that can be downloaded as PNG files.

## Table of contents

1. [Prerequisites](#prerequisites)
2. [Project structure](#project-structure)
3. [Database setup](#database-setup)
4. [Installation](#installation)
5. [Running the application](#running-the-application)
6. [Environment variables](#environment-variables)

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

## Running the application

1. Copy the provided `.env.example` file to `.env` in the `backend` folder and fill in your database connection details and desired port:

   ```env
   DB_HOST=localhost
   DB_USER=root
   DB_PASS=yourpassword
   DB_NAME=sikaprime
   PORT=3000
   ```

2. Start the server:

   ```bash
   cd backend
   node server.js
   ```

3. Open your browser to `http://localhost:3000` to access the web interface.

## Environment variables

The application expects the following environment variables in a `.env` file within the `backend` directory:

* **DB_HOST** – MySQL host (e.g. `localhost`).
* **DB_USER** – MySQL user.
* **DB_PASS** – MySQL password.
* **DB_NAME** – MySQL database name.
* **PORT** – Port for the Express server (default: 3000).

These variables are loaded using `dotenv` and used to configure the database connection and server port.