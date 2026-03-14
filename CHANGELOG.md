# Changelog

All notable changes to this project will be documented in this file. The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/) and this file is updated after each development section.

## [Section 1] – Project structure and database schema
### Added

* Initial folder layout for the project including separate `backend`, `frontend`, `database`, `docs`, and `scripts` directories.
* `README.md` describing the project, prerequisites, structure, database setup, installation and run instructions, and environment variables.
* `database/migrations/create_tables.sql` containing SQL scripts to create the `gadgets`, `laptop_specs`, `phone_specs`, and `sales` tables with foreign keys and indexes.
* Created empty placeholder folders for controllers, models, routes, middleware, public assets, views, etc.

## [Section 2] – Backend server and configuration
### Added

* Initialized a Node.js project in the `backend` folder and populated `package.json` with the necessary dependencies (`express`, `mysql2`, `multer`, `dotenv`, `cors`).
* Created `backend/server.js` which sets up an Express server, loads environment variables, configures CORS and body parsing middleware, serves static files from `frontend/public`, and defines a basic health check route.
* Added `backend/config/db.js` to create a MySQL connection pool using `mysql2/promise` and environment variables.
* Added `backend/middleware/upload.js` configuring Multer to upload images into `frontend/public/uploads` with timestamp‑prefixed filenames and basic file filtering.
* Added `backend/.env.example` providing sample environment variables for database credentials and server port.
* Added `.gitignore` to exclude `node_modules`, environment files and uploaded images from version control.
* Added `frontend/public/uploads/.gitkeep` to ensure the uploads directory is tracked even though it is empty.

### Changed

* Updated `backend/package.json` with project metadata and dependency declarations.

## [Section 3] – Database models
### Added

* Implemented `backend/models/Gadget.js` with functions to create, query, update and delete gadgets, including optional filtering and joining specification tables.
* Added `backend/models/LaptopSpec.js` providing methods to insert and update laptop specifications.
* Added `backend/models/PhoneSpec.js` providing methods to insert and update phone specifications.
* Added `backend/models/Sale.js` with functionality to record a sale, compute profit by subtracting the gadget's cost price from the selling price, and update the gadget's status to `sold`.

