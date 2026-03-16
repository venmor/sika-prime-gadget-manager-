# Sika Prime Gadget Manager

Sika Prime Gadget Manager is a multi-page inventory app for Sika Prime Loans. It tracks gadgets from intake to sale, supports branded poster export, keeps deleted-item history, and includes team user management with role-based access.

This README is intentionally maintenance-focused.

- It does not include installation or environment setup steps.
- It is meant to help new developers understand the codebase quickly.
- Use it as a map for where features live and where to start when making changes.

## What The App Does

- Authenticates users with server-side sessions
- Manages gadget inventory for laptops, phones, and other devices
- Stores typed specs for laptop and phone records
- Lets staff edit gadgets, mark items as sold, and restore deleted records
- Builds poster previews and exports poster PNGs
- Tracks sales, recovery targets, and profit/loss
- Manages users, roles, password resets, and theme preferences

## App Outline

### 1. Login

- URL: `/login.html`
- Purpose: sign in and establish a session
- Main files:
  - `frontend/views/login.html`
  - `frontend/public/js/login.js`
  - `frontend/public/css/login.css`
  - `backend/controllers/authController.js`

### 2. Inventory

- URL: `/index.html`
- Purpose: list gadgets, filter them, open details, edit, or delete
- Main files:
  - `frontend/views/index.html`
  - `frontend/public/js/main.js`
  - `frontend/public/css/inventory.css`
  - `backend/routes/gadgetRoutes.js`
  - `backend/controllers/gadgetController.js`
  - `backend/models/Gadget.js`

### 3. Add Gadget / Edit Gadget

- URL: `/add-gadget.html`
- Purpose: create or update gadget records and type-specific specs
- Main files:
  - `frontend/views/add-gadget.html`
  - `frontend/public/js/forms.js`
  - `frontend/public/css/add-gadget.css`
  - `backend/controllers/gadgetController.js`
  - `backend/models/Gadget.js`
  - `backend/models/LaptopSpec.js`
  - `backend/models/PhoneSpec.js`
  - `backend/middleware/upload.js`

### 4. Gadget Detail / Poster / Sale

- URL: `/gadget-detail.html?id=<gadgetId>`
- Purpose: view a single gadget, build poster preview, export PNG, and record a sale
- Main files:
  - `frontend/views/gadget-detail.html`
  - `frontend/public/js/cardGenerator.js`
  - `frontend/public/js/adCard.js`
  - `frontend/public/css/gadget-detail.css`
  - `backend/routes/adExportRoutes.js`
  - `backend/controllers/adExportController.js`
  - `backend/services/adExportService.js`
  - `backend/routes/salesRoutes.js`
  - `backend/controllers/salesController.js`
  - `backend/models/Sale.js`

### 5. Sales Report / Deleted History

- URL: `/sales-report.html`
- Purpose: review sales totals, profit/loss, and restore deleted gadgets
- Main files:
  - `frontend/views/sales-report.html`
  - `frontend/public/js/salesReport.js`
  - `frontend/public/css/sales-report.css`
  - `backend/controllers/salesController.js`
  - `backend/controllers/gadgetController.js`
  - `backend/models/Sale.js`
  - `backend/models/Gadget.js`

### 6. Users / Passwords / Theme

- URL: `/users.html`
- Purpose: view current account, change password, manage users, reset passwords, update roles, and change theme
- Main files:
  - `frontend/views/users.html`
  - `frontend/public/js/users.js`
  - `frontend/public/js/theme.js`
  - `frontend/public/css/users.css`
  - `frontend/public/css/theme.css`
  - `backend/routes/userRoutes.js`
  - `backend/controllers/userController.js`
  - `backend/models/User.js`
  - `backend/middleware/auth.js`

## How The App Is Put Together

The app is a server-rendered static multi-page frontend with an authenticated JSON API behind it.

Request flow:

1. A page in `frontend/views/` is served by Express.
2. That page loads its script from `frontend/public/js/`.
3. The script calls an authenticated API route under `/api/...`.
4. The route forwards to a controller.
5. The controller uses models and services to read or write MySQL data.
6. The frontend updates the page from the JSON response.

## Repository Map

### Frontend

- `frontend/views/`
  - HTML entry points for each page
- `frontend/public/js/`
  - page logic and shared browser helpers
- `frontend/public/css/`
  - shared theme styles and page-specific layouts
- `frontend/public/images/`
  - logos and static image assets
- `frontend/public/uploads/`
  - uploaded gadget photos, served at `/uploads`

### Backend

- `backend/server.js`
  - startup entry point
- `backend/app.js`
  - Express app composition, static file serving, sessions, route mounting
- `backend/routes/`
  - API route definitions
- `backend/controllers/`
  - request handling and validation
- `backend/models/`
  - database access
- `backend/services/`
  - higher-level backend logic like session hydration and ad export
- `backend/middleware/`
  - auth and upload middleware
- `backend/utils/`
  - controller/shared helper utilities

### Database

- `database/migrations/`
  - schema changes and table creation SQL
- `backend/config/db.js`
  - MySQL pool and DB health checks

### Tests

- `backend/tests/`
  - controller-level automated tests

## Key Shared Files New Devs Should Know First

### Shared frontend helpers

- `frontend/public/js/appUtils.js`
  - shared formatting, message helpers, search normalization, and response error parsing

### Shared auth/session helpers

- `frontend/public/js/auth.js`
  - authenticated fetch wrapper, session lookup, logout, and mobile viewport helpers
- `backend/middleware/auth.js`
  - route protection and admin-only access
- `backend/services/sessionUserService.js`
  - keeps session user data fresh
- `backend/services/userBootstrapService.js`
  - bootstraps the admin account at startup

### Shared UI theme

- `frontend/public/css/theme.css`
  - global surfaces, buttons, header/nav styles, dark mode styling, and theme-setting UI
- `frontend/public/js/theme.js`
  - light/dark/system preference handling and quick theme toggle behavior

### Shared backend controller helpers

- `backend/utils/controllerHelpers.js`
  - validation error builder, ID parsing, text normalization, and consistent error responses

## API Outline

### Auth

- `POST /api/login`
- `POST /api/logout`
- `GET /api/session`

Files:

- `backend/controllers/authController.js`
- `backend/middleware/auth.js`

### Gadgets

- `GET /api/gadgets`
- `GET /api/gadgets/deleted-history`
- `GET /api/gadgets/:id`
- `POST /api/gadgets`
- `PUT /api/gadgets/:id`
- `DELETE /api/gadgets/:id`
- `POST /api/gadgets/:id/restore`

Files:

- `backend/routes/gadgetRoutes.js`
- `backend/controllers/gadgetController.js`
- `backend/models/Gadget.js`
- `backend/models/LaptopSpec.js`
- `backend/models/PhoneSpec.js`

### Sales

- `POST /api/sales`
- `GET /api/sales`

Files:

- `backend/routes/salesRoutes.js`
- `backend/controllers/salesController.js`
- `backend/models/Sale.js`

### Poster export

- `POST /api/ads/export`

Files:

- `backend/routes/adExportRoutes.js`
- `backend/controllers/adExportController.js`
- `backend/services/adExportService.js`
- `frontend/public/js/adCard.js`
- `frontend/public/js/cardGenerator.js`

### Users

- `GET /api/users`
- `POST /api/users`
- `POST /api/users/change-password`
- `PATCH /api/users/:id/role`
- `POST /api/users/:id/reset-password`

Files:

- `backend/routes/userRoutes.js`
- `backend/controllers/userController.js`
- `backend/models/User.js`

## Where To Change Things

### If you need to change page structure

Start in:

- `frontend/views/*.html`

Then check:

- matching page script in `frontend/public/js/`
- matching page stylesheet in `frontend/public/css/`

### If you need to change visual styling across the whole app

Start in:

- `frontend/public/css/theme.css`

Then check:

- `frontend/public/css/<page>.css` for page-specific overrides
- `frontend/public/js/theme.js` if the change affects theme switching

### If you need to change inventory cards or filters

Start in:

- `frontend/public/js/main.js`
- `frontend/public/css/inventory.css`

Backend data comes from:

- `backend/controllers/gadgetController.js`
- `backend/models/Gadget.js`

### If you need to change gadget form fields or validation

Start in:

- `frontend/public/js/forms.js`
- `frontend/views/add-gadget.html`

Then check:

- `backend/controllers/gadgetController.js`
- `backend/models/Gadget.js`
- `backend/models/LaptopSpec.js`
- `backend/models/PhoneSpec.js`
- `database/migrations/` if schema changes are needed

### If you need to change poster layout or export behavior

Preview markup and browser-side rendering:

- `frontend/public/js/adCard.js`
- `frontend/public/js/cardGenerator.js`
- `frontend/public/css/gadget-detail.css`

Backend export pipeline:

- `backend/controllers/adExportController.js`
- `backend/services/adExportService.js`

### If you need to change sale rules or profit/loss handling

Start in:

- `frontend/public/js/cardGenerator.js`
- `backend/controllers/salesController.js`
- `backend/models/Sale.js`

Also review:

- `frontend/public/js/salesReport.js`

### If you need to change user roles, password flows, or access rules

Start in:

- `frontend/public/js/users.js`
- `backend/controllers/userController.js`
- `backend/middleware/auth.js`
- `backend/models/User.js`

Also check:

- `backend/controllers/authController.js`
- `backend/services/sessionUserService.js`

### If you need to change uploads

Start in:

- `backend/middleware/upload.js`
- `backend/app.js`

Uploaded files are served from:

- `frontend/public/uploads/`

## Database Notes

Main tables used by the app:

- `gadgets`
  - core inventory records
- `laptop_specs`
  - laptop-specific fields
- `phone_specs`
  - phone-specific fields
- `sales`
  - saved sales and profit/loss source data
- `users`
  - app accounts and roles

Soft delete behavior:

- deleted gadgets stay in the `gadgets` table
- deleted records use `deleted_at` and `deleted_by`
- deleted items can be restored from the Sales page

Schema sources:

- `database/migrations/create_tables.sql`
- `database/migrations/*.sql`

## Maintenance Tips For New Developers

- Follow the full path of a feature before editing:
  - view -> frontend script -> route -> controller -> model/service -> migration if needed
- For UI issues, check both `theme.css` and the page-specific CSS file
- For API behavior changes, update controller tests in `backend/tests/`
- For new shared browser helpers, prefer `frontend/public/js/appUtils.js`
- For repeated backend validation/error logic, prefer `backend/utils/controllerHelpers.js`
- Keep poster preview and poster export behavior aligned:
  - preview uses browser JS
  - export uses backend HTML rendering with Playwright
- When changing gadget fields, verify all related pages:
  - Inventory
  - Add Gadget
  - Gadget Detail
  - Sales Report
  - poster export if the field appears there

## Test And Validation Points

Automated tests:

- `backend/tests/*.test.js`

Main command:

```bash
cd backend
npm test
```

After frontend or full-flow changes, manually check:

- login flow
- inventory filters
- add/edit gadget
- gadget detail page
- poster preview and export
- sale recording
- sales report
- deleted gadget restore
- users page
- dark/light theme switching

## Quick Start For Code Reading

If you are new to the repo, read files in this order:

1. `backend/server.js`
2. `backend/app.js`
3. `frontend/views/index.html`
4. `frontend/public/js/auth.js`
5. `frontend/public/js/appUtils.js`
6. `frontend/public/js/main.js`
7. `backend/routes/gadgetRoutes.js`
8. `backend/controllers/gadgetController.js`
9. `backend/models/Gadget.js`
10. `frontend/public/css/theme.css`

That path gives you the fastest high-level understanding of how the app is wired together.
