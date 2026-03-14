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

## [Section 4] – Controllers and API routes
### Added

* Implemented `backend/controllers/gadgetController.js` with handlers to list all gadgets, retrieve a gadget by ID, create a new gadget (including handling image uploads and inserting the appropriate specs), update an existing gadget (with upsert semantics for specs), and delete a gadget.
* Implemented `backend/controllers/salesController.js` with handlers to record a sale (calculating profit and updating the gadget status) and optionally return a sales report with gadget details.
* Added `backend/routes/gadgetRoutes.js` defining RESTful routes for gadgets (GET, POST, PUT, DELETE) and wiring up the upload middleware.
* Added `backend/routes/salesRoutes.js` defining routes to create a sale and fetch sales reports.
* Updated `backend/server.js` to import and mount the new gadget and sales routes under `/api/gadgets` and `/api/sales`.

## [Section 5] – Frontend base HTML and CSS
### Added

* Created `frontend/views/index.html` providing the inventory list page with search and filter controls and a container for gadget cards.
* Created `frontend/views/add-gadget.html` containing a form for adding gadgets (name, type, brand, model, cost price, description, image) and a dynamic specification container.
* Created `frontend/views/gadget-detail.html` for showing a single gadget’s details and a placeholder for ad card generation.
* Added `frontend/public/css/main.css` defining global styles for layout, typography, forms, and responsive card container.
* Added `frontend/public/css/card.css` with styles for gadget cards and advertisement cards.
* Linked the CSS files in each HTML page and added placeholders for JavaScript files to be implemented in later sections.

## [Section 6] – Dynamic form handling
### Added

* Created `frontend/public/js/forms.js` to power the Add Gadget page. The script listens for changes on the type selector and dynamically generates appropriate specification fields (processor, RAM, storage, screen size, graphics for laptops; operating system, RAM, storage, screen size, camera, battery for phones).
* Implemented form submission logic in `forms.js` which collects all form data (including uploaded images) via `FormData`, sends a POST request to `/api/gadgets`, handles the response, and redirects back to the inventory page on success.
* Updated `add-gadget.html` to include the script (already linked in Section 5) which now provides dynamic behaviour.

## [Section 7] – Inventory listing and CRUD
### Added

* Implemented `frontend/public/js/main.js` which fetches gadgets from the backend, renders them as cards in the inventory page, and wires up edit and delete actions. It supports filtering by type, status and search text through query parameters.
* Added placeholder image handling in `main.js` and corresponding CSS for `.no-image` cards when gadgets have no uploaded image.
* Enhanced `frontend/public/js/forms.js` to support editing an existing gadget. The script now detects an `id` query parameter, fetches gadget details to prefill the form (including spec fields), and dynamically chooses between `POST` (create) and `PUT` (update) requests on submission.
* Added additional styling to `card.css` for `.no-image` placeholders.

## [Section 8] – Ad card generation
### Added

* Included the `html2canvas` CDN script in `frontend/views/gadget-detail.html` and wired up a placeholder button and container for advertisement card creation. The page now has a "Generate Ad Card" button and a hidden preview area ready to render an advertisement.
* Implemented `frontend/public/js/cardGenerator.js` which powers the gadget detail page. The script fetches a single gadget by ID, renders its details (image, brand, model, type, status, cost price, specifications and description) on the page, constructs a branded advertisement card preview using the gadget’s information, and employs `html2canvas` to capture the card as a PNG that can be downloaded by the user.

### Changed

* Updated `gadget-detail.html` to reference the new `cardGenerator.js` script and to place a card preview container with the appropriate classes for styling.

