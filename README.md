# Sika Prime Gadget Manager

This project includes a guided local test setup so teammates can clone the repository, run one helper script, and start testing the app with demo data.

The local test flow is designed to:

- create `team-test.env` automatically if it is missing
- check Git, Docker, and Docker Compose before starting
- reuse the same local setup later so teammates can continue from where they stopped
- give Linux and Windows users the same guided menu

## What teammates need before they start

Install these two apps first:

- Git: https://git-scm.com/downloads
- Docker Desktop: https://www.docker.com/products/docker-desktop/

After Docker Desktop installs, open it and wait until it says Docker is running.

## Step 1. Clone the repository

Use the project SSH repository URL:

```bash
git clone git@github.com:venmor/sika-prime-gadget-manager-.git
cd sika-prime-gadget-manager-
```

Example:

```bash
$ git clone git@github.com:venmor/sika-prime-gadget-manager-.git
Cloning into 'sika-prime-gadget-manager-'...
$ cd sika-prime-gadget-manager-
```

If you get an SSH error like `Permission denied (publickey)`, ask the repository owner to add your GitHub SSH key before trying again.

## Step 2. Start the guided setup helper

The helper opens an interactive menu. It can set up local config, start the app, show logs, stop the app, or reset local test data.

### Linux

Run:

```bash
bash ./scripts/team-test.sh
```

### Windows PowerShell

Run:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\team-test.ps1
```

### Windows batch file

If someone prefers double-clicking or `cmd`, use:

```bat
.\scripts\team-test.bat
```

## Step 3. Use the interactive menu

When the helper opens, it shows options like these:

```text
Sika Prime Gadget Manager - Team Test Helper

Choose an option
  1. Setup or update local settings
  2. Start or resume the app
  3. Check setup
  4. Show status
  5. Show logs
  6. Stop the app
  7. Reset local test data
  8. Exit
```

Recommended first-time path:

1. choose `1` to review the local port and admin username
2. choose `2` to start the app

What the helper does for you:

- runs environment checks
- creates `team-test.env` if it does not exist yet
- keeps your last local settings instead of overwriting them
- starts Docker containers with the test database and seeded demo data

## Step 4. Open the app

After startup, open:

```text
http://localhost:3000/login.html
```

If you changed the port during setup, use that port instead.

Example:

```text
http://localhost:3001/login.html
```

## Step 5. Sign in with the shared test login

Default login:

- Username: `admin`
- Password: `TeamTest123!`

Extra seeded demo users:

- `mercy.soko` - admin
- `martha.phiri` - staff
- `patrick.moyo` - staff

All seeded accounts use the same password:

- `TeamTest123!`

## Step 6. What everyone will see after login

The first local startup seeds demo data automatically, so teammates begin with the same sample workspace.

That includes:

- available gadgets in Inventory
- sold gadgets in Sales
- extra users in the Users page
- a deleted gadget example in deleted history
- demo images for inventory cards and previews

Important note:

- each teammate still uses their own local Docker data
- the seeded demo data is the same on first setup
- later edits stay on that teammate's machine unless they reset the environment

## Continue from where you stopped

The helper is resume-friendly by default.

What that means:

- `team-test.env` is reused if it already exists
- Docker volumes are reused unless you run a reset
- running `Start or resume the app` brings back the same local data you had before

Example on Linux:

```bash
bash ./scripts/team-test.sh start
```

Example on Windows:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\team-test.ps1 resume
```

## Direct command examples

Teammates can use the menu, but these direct commands also work.

### Check setup

Linux:

```bash
bash ./scripts/team-test.sh doctor
```

Windows:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\team-test.ps1 doctor
```

### Start or resume the app

Linux:

```bash
bash ./scripts/team-test.sh start
```

Windows:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\team-test.ps1 start
```

### Show running containers

Linux:

```bash
bash ./scripts/team-test.sh status
```

Windows:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\team-test.ps1 status
```

### Show live logs

Linux:

```bash
bash ./scripts/team-test.sh logs
```

Windows:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\team-test.ps1 logs
```

### Stop the app without removing data

Linux:

```bash
bash ./scripts/team-test.sh stop
```

Windows:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\team-test.ps1 stop
```

### Reset all local test data

This removes the local Docker data for this project and gives the teammate a fresh seeded setup next time they start again.

Linux:

```bash
bash ./scripts/team-test.sh reset --yes
```

Windows:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\team-test.ps1 reset -Yes
```

## Common setup examples

### Example: change the local port

If port `3000` is already in use:

1. run the helper
2. choose `Setup or update local settings`
3. change the port to something like `3001`
4. start the app again

Then open:

```text
http://localhost:3001/login.html
```

### Example: Docker is not running

If the helper says Docker is installed but not running:

1. open Docker Desktop
2. wait until Docker says it is running
3. run the helper again
4. choose `Start or resume the app`

### Example: someone stopped yesterday and wants to continue today

They do not need to clone again or reconfigure everything.

They only need:

Linux:

```bash
bash ./scripts/team-test.sh
```

Then choose:

```text
2. Start or resume the app
```

Or directly:

```bash
bash ./scripts/team-test.sh resume
```

## Notes for the team

- This local setup does not need a paid domain.
- The app, database, and demo data run locally in Docker.
- Uploaded files and local test changes stay on the teammate's machine until they reset.
- The helper scripts are the recommended way to run the app for team testing.

## Helpful files

- Team helper for Linux: [team-test.sh](/home/charlie/sika-prime-gadget-manager/scripts/team-test.sh)
- Team helper for Windows PowerShell: [team-test.ps1](/home/charlie/sika-prime-gadget-manager/scripts/team-test.ps1)
- Windows batch wrapper: [team-test.bat](/home/charlie/sika-prime-gadget-manager/scripts/team-test.bat)
- Local test settings example: [team-test.env.example](/home/charlie/sika-prime-gadget-manager/team-test.env.example)
- Detailed team testing reference: [TEAM_TESTING.md](/home/charlie/sika-prime-gadget-manager/TEAM_TESTING.md)

## Technical deployment docs

If the team later wants a shared online preview or production deployment:

- VPS deployment: [deploy.md](/home/charlie/sika-prime-gadget-manager/deploy.md)
- Railway deployment: [railway.md](/home/charlie/sika-prime-gadget-manager/deploy/railway.md)
