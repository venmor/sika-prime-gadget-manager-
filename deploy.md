# Deployment Guide for Sika Prime Gadget Manager

This document provides high‑level instructions for deploying the Sika Prime Gadget Manager web application to a production environment such as Heroku or a self‑managed VPS. The project consists of a Node.js/Express backend, a MySQL database, and static frontend assets.

## Prerequisites

* **Node.js** (version 14 or newer) and **npm** installed on the server.
* **MySQL** database server. You can use a managed MySQL service (e.g., Amazon RDS, ClearDB on Heroku) or install MySQL locally.
* Access to environment variables or a mechanism to configure them securely in your hosting platform.

## Environment Configuration

1. Clone the repository and navigate into the project directory:

   ```bash
   git clone https://your-repo-url/sika-prime-gadget-manager.git
   cd sika-prime-gadget-manager/backend
   ```

2. Copy `.env.example` to `.env` and set the following variables:

   * `DB_HOST`, `DB_USER`, `DB_PASS`, `DB_NAME`: MySQL connection details.
   * `PORT`: Port for the Express server (use Heroku’s `PORT` environment variable on Heroku).
   * `SESSION_SECRET`: A long, random string used to sign session cookies.
   * `ADMIN_USERNAME`: The administrator’s login name.
   * `ADMIN_PASSWORD_HASH`: A bcrypt hash of the administrator’s password. Use a Node REPL or online bcrypt generator to produce this hash. Example:

     ```js
     // In a Node REPL
     const bcrypt = require('bcryptjs');
     bcrypt.hash('your-password', 10).then(hash => console.log(hash));
     ```

3. Install backend dependencies:

   ```bash
   npm install
   ```

4. Set up the database:

   * Create a database using your MySQL client (`CREATE DATABASE sikaprime;`).
   * Run the SQL migration script located in `database/migrations/create_tables.sql` to create the necessary tables. For example:

     ```bash
     mysql -u youruser -p sikaprime < ../database/migrations/create_tables.sql
     ```

5. (Optional) Seed the database by adding SQL scripts into the `database/seeds` folder and running them via `mysql`.

## Running Locally

To run the application locally for testing:

```bash
cd backend
node server.js
```

Visit `http://localhost:3000/login.html` to log in with your admin credentials. After logging in you can access the inventory, add gadgets, generate advertisement cards, record sales and view the sales report.

## Deploying to Heroku

1. Create a new Heroku app:

   ```bash
   heroku create sika-prime-gadget-manager
   ```

2. Add a MySQL add‑on such as ClearDB or JawsDB:

   ```bash
   heroku addons:create cleardb:ignite
   ```

   Note the connection URL returned by Heroku and parse it into your `.env` variables (host, user, password, database name).

3. Set your environment variables on Heroku:

   ```bash
   heroku config:set SESSION_SECRET=your-session-secret
   heroku config:set ADMIN_USERNAME=admin
   heroku config:set ADMIN_PASSWORD_HASH=your-bcrypt-hash
   heroku config:set DB_HOST=... DB_USER=... DB_PASS=... DB_NAME=...
   ```

4. Commit a `Procfile` to define how Heroku runs the app. In the project root (`sika-prime-gadget-manager`) create a file named `Procfile` with the following content:

   ```
   web: node backend/server.js
   ```

5. Push your code to Heroku:

   ```bash
   git push heroku master
   ```

6. Run your migrations on the Heroku database. You can execute the SQL script using the MySQL client installed on your machine:

   ```bash
   heroku config:get CLEARDB_DATABASE_URL  # Use credentials from here
   # Then connect via mysql and run the migration file
   mysql -h host -u user -p password database < database/migrations/create_tables.sql
   ```

7. Navigate to `https://sika-prime-gadget-manager.herokuapp.com/login.html` to log in and use the application.

## Deploying to a VPS

1. Provision a VPS with Node.js and MySQL installed.
2. Clone the repository and follow the environment configuration steps above.
3. Use a process manager such as **PM2** or **systemd** to run `node backend/server.js` as a service.
4. Configure a web server such as **nginx** to proxy requests to your Node.js application and serve static assets. Example nginx configuration:

   ```nginx
   server {
     listen 80;
     server_name your-domain.com;
     root /path/to/sika-prime-gadget-manager/frontend/public;

     location /api/ {
       proxy_pass http://localhost:3000/api/;
       proxy_http_version 1.1;
       proxy_set_header Upgrade $http_upgrade;
       proxy_set_header Connection 'upgrade';
       proxy_set_header Host $host;
       proxy_cache_bypass $http_upgrade;
     }

     location / {
       try_files $uri $uri/ /index.html;
     }
   }
   ```

5. Obtain an SSL certificate using Let’s Encrypt and configure nginx to serve HTTPS traffic.

## Security Considerations

* Always use HTTPS in production; set the `secure` flag on session cookies.
* Store sensitive configuration (database credentials, session secret, admin password hash) in environment variables, not in version control.
* Restrict direct access to the backend server by using a reverse proxy (e.g., nginx) and firewall rules.

Follow these steps and adapt them to the specifics of your hosting environment. For more details on deploying Node.js and MySQL applications, consult the documentation of your chosen platform.