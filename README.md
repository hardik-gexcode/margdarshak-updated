# MARGDARSHAK v2.0 — AI Career Navigator

> Built by Hardik Gupta · JECRC Foundation, Jaipur

---

## 🚀 Quick Start (Local Development)

```bash
# 1. Install server dependencies
npm install

# 2. Copy .env and add your Gemini API key
cp .env.example .env
# Edit .env → GEMINI_API_KEY=your_key_here

# 3. Build the React frontend
cd app && npm install && npm run build && cd ..

# 4. Start everything on ONE port
npm start
# → http://localhost:3001
```

That's it. Landing page + React app + API all on **one port (3001)**.

---

## 🔑 Getting Your Free Gemini API Key (30 seconds)

1. Go to → https://aistudio.google.com/app/apikey
2. Click "Create API Key"
3. Copy it into `.env`:
   ```
   GEMINI_API_KEY=AIza...your_key_here
   ```
4. Restart: `npm start`

Without a key, the app runs in **prototype mode** with smart fallback responses — all features still work.

---

## 🗃️ Database — How Data Is Stored

### What's used: SQLite (better-sqlite3)
- **Free, file-based, zero cloud needed**
- All data saved to `margdarshak.db` in the project root
- Data **persists across server restarts** — no data loss
- When you deploy to Render/Railway/VPS, the db file stays on the server disk

### What's stored:
| Table | What |
|-------|------|
| `users` | name, email, hashed password, background, goal, city, XP, badges, avatar path, AI analysis |
| `sessions` | login tokens (UUID) |

### How to view your data:
```bash
# Install SQLite CLI (free)
sudo apt install sqlite3        # Ubuntu/Render
brew install sqlite3            # Mac

# Open and query
sqlite3 margdarshak.db
sqlite> SELECT name, email, xp, level FROM users;
sqlite> SELECT COUNT(*) FROM users;
sqlite> .quit
```

Or use **DB Browser for SQLite** (free GUI): https://sqlitebrowser.org

### Backup (for .in deployment):
```bash
# Simple backup — just copy the file
cp margdarshak.db margdarshak_backup_$(date +%Y%m%d).db
```

---

## 🔐 Password Security

Passwords are **NEVER stored as plain text**.

The system uses **scrypt** (Node.js built-in `crypto.scryptSync`):
1. A random 16-byte salt is generated for each password
2. scrypt derives a 64-byte hash from `password + salt`
3. Only `salt:hash` is stored in the database
4. On login, the same operation is run and compared — the original password is never recoverable

**Even if someone gets your database file, passwords cannot be reversed.**

---

## 🌐 Deploying to a .in Domain (Render + Namecheap/GoDaddy)

### Option A: Render.com (Free Tier — Recommended)

1. **Push to GitHub:**
   ```bash
   git init && git add . && git commit -m "MARGDARSHAK v2"
   git remote add origin https://github.com/hardik-gexcode/margdarshak
   git push -u origin main
   ```

2. **On Render.com:**
   - New → Web Service → Connect GitHub repo
   - Build Command: `npm install && cd app && npm install && npm run build && cd ..`
   - Start Command: `node server.js`
   - Add environment variable: `GEMINI_API_KEY=your_key`
   - Deploy!

3. **Persistent disk (for SQLite):**
   - In Render dashboard → your service → Disks → Add Disk
   - Mount path: `/opt/render/project/src`
   - This keeps `margdarshak.db` alive between deploys

4. **Connect .in domain:**
   - Render → Settings → Custom Domains → Add `margdarshak.in`
   - In your domain registrar DNS: Add CNAME → your-app.onrender.com

### Option B: Railway.app

```bash
railway login
railway new
railway add
railway up
# Set GEMINI_API_KEY in Railway dashboard env vars
```

### Option C: VPS (DigitalOcean/Hostinger)

```bash
# On your server:
git clone your-repo
cd margdarshak
npm install && cd app && npm install && npm run build && cd ..
cp .env.example .env && nano .env  # add Gemini key

# Run with PM2 (keeps running after logout)
npm install -g pm2
pm2 start server.js --name margdarshak
pm2 startup && pm2 save

# Nginx reverse proxy (optional, for port 80/443):
# server { listen 80; location / { proxy_pass http://localhost:3001; } }
```

---

## ✅ Bugs Fixed in v2.0

| Bug | Fix |
|-----|-----|
| Photo upload not working | Fixed base64 stripping, canvas resize/compress, correct URL path `/uploads/...` |
| Unauthorized on AI Skill Scan & Chat | `api()` now always reads token from `localStorage` not React state (state is empty on page refresh) |
| Passwords in plain text | scrypt hashing with random salt |
| Data lost on restart | SQLite replaces in-memory Map |
| Frontend and backend on different ports | Already unified — server serves React build. Just `npm run build` then `npm start` |
| No founder name in app | Removed from all UI |

---

## 📁 Clean Project Structure

```
margdarshak/
├── server.js          # Express API + serves React build
├── package.json       # Server deps
├── .env               # GEMINI_API_KEY (create from .env.example)
├── .env.example       # Template
├── index.html         # Cinematic landing page (3D scroll animations)
├── margdarshak.db     # SQLite database (auto-created on first run)
├── uploads/           # Avatar images (auto-created)
└── app/               # React frontend
    ├── package.json
    ├── public/
    └── src/
        ├── App.js
        ├── index.js
        ├── index.css
        ├── context/AuthContext.js   # Fixed token handling
        ├── components/AppShell.js
        └── pages/
            ├── Auth.js
            ├── Dashboard.js
            ├── Analyze.js      # AI Skill Scan
            ├── Roadmap.js      # 90-day plan
            ├── Market.js       # Market intel
            ├── Chat.js         # AI Mentor
            ├── Badges.js       # XP & Leaderboard
            └── Profile.js      # Fixed avatar upload
```

---

## 🧑‍💻 Development Mode (two terminals)

```bash
# Terminal 1 — Server
npm run dev    # nodemon — auto-restarts on changes

# Terminal 2 — React dev server (hot reload)
cd app && npm start
# React runs on :3000, proxies API calls to :3001
```

---

## 📊 Viewing User Data (Admin)

```bash
sqlite3 margdarshak.db "SELECT name, email, xp, level, json_array_length(badges) as badge_count FROM users ORDER BY xp DESC;"
```

---

Built with ❤️ for India's next generation of professionals.
