# Team Testing Guide

This guide is the quick reference version of the main [README.md](/home/charlie/sika-prime-gadget-manager/README.md).

## Clone the repository

```bash
git clone git@github.com:venmor/sika-prime-gadget-manager-.git
cd sika-prime-gadget-manager-
```

## Start the guided helper

Linux:

```bash
bash ./scripts/team-test.sh
```

Windows PowerShell:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\team-test.ps1
```

Windows batch:

```bat
.\scripts\team-test.bat
```

## First-time menu flow

1. choose `Setup or update local settings`
2. choose `Start or resume the app`
3. open `http://localhost:3000/login.html`

Default login:

- Username: `admin`
- Password: `TeamTest123!`

Extra seeded users:

- `mercy.soko`
- `martha.phiri`
- `patrick.moyo`

All seeded accounts use:

- Password: `TeamTest123!`

## Resume later

The helper keeps `team-test.env` and Docker data unless you reset them.

Resume examples:

Linux:

```bash
bash ./scripts/team-test.sh resume
```

Windows:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\team-test.ps1 resume
```

## Useful direct commands

Check setup:

```bash
bash ./scripts/team-test.sh doctor
```

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\team-test.ps1 doctor
```

Show status:

```bash
bash ./scripts/team-test.sh status
```

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\team-test.ps1 status
```

Show logs:

```bash
bash ./scripts/team-test.sh logs
```

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\team-test.ps1 logs
```

Stop without deleting data:

```bash
bash ./scripts/team-test.sh stop
```

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\team-test.ps1 stop
```

Reset local data:

```bash
bash ./scripts/team-test.sh reset --yes
```

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\team-test.ps1 reset -Yes
```

## What is seeded automatically

- available gadgets
- sold gadgets
- deleted history
- demo users
- demo images

For the full step-by-step version with examples, use [README.md](/home/charlie/sika-prime-gadget-manager/README.md).
