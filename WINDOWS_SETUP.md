# Compiler Lab — Windows Setup Guide

Step-by-step instructions to get Compiler Lab running on a Windows machine.
If you get stuck, the [README](README.md) has the full project documentation.

---

## 1. What you'll be installing

Compiler Lab is a web app with two parts, each in its own terminal window:

| Part | Tech | Runs at |
|---|---|---|
| **Backend** (API) | Python / FastAPI | http://localhost:8000 |
| **Frontend** (what you open in your browser) | React / Vite | http://localhost:5173 |

You need **both** running at the same time.

---

## 2. One-time prerequisites

Install these first (all free):

1. **Git for Windows** — https://git-scm.com/download/win
   Keep all default options in the installer.
2. **Python 3.11 or newer** — https://www.python.org/downloads/windows/
   ⚠️ On the first installer screen, **tick "Add python.exe to PATH"** before clicking Install.
3. **Node.js 22 LTS** — https://nodejs.org/
   (The frontend needs Node 20.19+ or 22.12+; the 22 LTS installer is the easiest choice.)

Check they're installed — open a new **PowerShell** window and run:

```powershell
git --version      # should print something like git version 2.x
python --version   # should print Python 3.11 or higher
node --version     # should print v22.x (or v20.19+)
```

> If `python` isn't found but you definitely installed it, try `py --version`.
> On Windows the `py` launcher always works; you can substitute `py` for `python`
> in every command below.

---

## 3. Get the project (pull it from GitHub)

Open **PowerShell** and clone the repository:

```powershell
cd ~\Documents
git clone https://github.com/KHassanTaha/compiler-lab.git
cd compiler-lab
```

Later, when new work is pushed to GitHub, get the latest version with:

```powershell
cd ~\Documents\compiler-lab
git pull
```

---

## 4. Start the backend (terminal 1)

Keep this PowerShell window open — the backend only runs while it's open.

```powershell
cd ~\Documents\compiler-lab\backend

# Create an isolated Python environment
python -m venv .venv

# Activate it (PowerShell)
.venv\Scripts\Activate.ps1

# Install dependencies (first time only)
pip install -r requirements.txt

# Create your config file (first time only)
Copy-Item .env.example .env

# Start the server
uvicorn app.main:app --reload
```

You should see `Uvicorn running on http://127.0.0.1:8000`.
Open http://localhost:8000/health in your browser — it should show `{"status": "ok"}`.

**Next time** you only need: activate the venv, then run uvicorn:

```powershell
cd ~\Documents\compiler-lab\backend
.venv\Scripts\Activate.ps1
uvicorn app.main:app --reload
```

---

## 5. Start the frontend (terminal 2)

Open a **second** PowerShell window and keep it open too.

```powershell
cd ~\Documents\compiler-lab\frontend

# Install dependencies (first time only; takes a few minutes)
npm install

# Create your config file (first time only)
Copy-Item .env.example .env

# Start the app
npm run dev
```

You should see something like `Local: http://localhost:5173/`.

**Next time**: `cd` in, then just `npm run dev`.

---

## 6. Use the app

Open **http://localhost:5173** in your browser.

- Click **Register** and create your own account, **or** log in as the built-in admin:

  | Field | Value |
  |---|---|
  | Username | `admin` |
  | Password | `Admin@123` |

- Head to the **Workspace**, pick an example program (valid or intentionally broken), and hit **Run All** to see all four compiler engines at work: lexer → parser → semantic → ICG.

---

## 7. Troubleshooting

**"Running scripts is disabled" when activating the venv**
PowerShell blocks `.ps1` scripts by default. Either run this once and retry:

```powershell
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

…or use **Command Prompt (cmd)** instead of PowerShell, where the activation is:

```bat
.venv\Scripts\activate.bat
```

**`npm install` fails or hangs**
Make sure Node 20.19+ / 22.12+ is installed (`node --version`). Then delete `node_modules` and retry:

```powershell
Remove-Item -Recurse -Force node_modules
npm install
```

**Frontend opens but nothing loads / every request fails**
The backend isn't running. Terminal 1 must show `Uvicorn running on http://127.0.0.1:8000` — if you closed it, restart section 4.

**Port already in use (`8000` or `5173`)**
Another copy is still running somewhere. Close old terminal windows, or restart your PC and follow sections 4–5 again.

**`pip install` fails with long red errors**
Make sure you activated the venv first (your prompt should start with `(.venv)`), and that Python 3.11+ is installed (`python --version`).

---

## Quick reference (after first setup)

```powershell
# Terminal 1 — backend
cd ~\Documents\compiler-lab\backend
.venv\Scripts\Activate.ps1
uvicorn app.main:app --reload

# Terminal 2 — frontend
cd ~\Documents\compiler-lab\frontend
npm run dev

# Browser
http://localhost:5173
```
