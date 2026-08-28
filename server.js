require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

const app = express();
app.use(cors());
app.use(express.json({ limit: '15mb' }));

// ─── Upload directory ──────────────────────────────────────────────────────────
const UPLOAD = path.join(__dirname, 'uploads');
if (!fs.existsSync(UPLOAD)) fs.mkdirSync(UPLOAD, { recursive: true });
app.use('/uploads', express.static(UPLOAD));

// ─── Cinematic video assets (hero, HQ map, login) ─────────────────────────────
const VIDEOS = path.join(__dirname, 'videos');
app.use('/videos', express.static(VIDEOS, {
  setHeaders: (res) => res.setHeader('Accept-Ranges', 'bytes') // enables scrubbing/seek
}));

const ASSETS = path.join(__dirname, 'assets');
app.use('/assets', express.static(ASSETS));

// ─── SQLite (better-sqlite3 — synchronous, file-based, free, no cloud) ────────
let db;
try {
  const Database = require('better-sqlite3');
  const DB_PATH = process.env.DB_PATH || path.join(__dirname, 'margdarshak.db');
db = new Database(DB_PATH);
  db.pragma('journal_mode = WAL');
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      background TEXT DEFAULT '',
      goal TEXT DEFAULT '',
      city TEXT DEFAULT '',
      xp INTEGER DEFAULT 0,
      level INTEGER DEFAULT 1,
      badges TEXT DEFAULT '[]',
      avatar TEXT DEFAULT NULL,
      skill_analysis TEXT DEFAULT NULL,
      roadmap TEXT DEFAULT NULL,
      created_at TEXT DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS sessions (
      token TEXT PRIMARY KEY,
      email TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now'))
    );
  `);
  console.log('✅  SQLite database ready → margdarshak.db');
} catch (e) {
  console.warn('⚠️  SQLite not available, using in-memory store. Run: npm install better-sqlite3');
  db = null;
}

// ─── Password hashing (using built-in crypto — no external dep needed) ────────
function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${hash}`;
}
function verifyPassword(password, stored) {
  try {
    const [salt, hash] = stored.split(':');
    const check = crypto.scryptSync(password, salt, 64).toString('hex');
    return check === hash;
  } catch { return false; }
}

// ─── Fallback in-memory store (if SQLite unavailable) ─────────────────────────
const memUsers = new Map();
const memSessions = new Map();

// ─── DB helpers ───────────────────────────────────────────────────────────────
function dbGetUser(email) {
  if (db) {
    const row = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
    if (!row) return null;
    return { ...row, badges: JSON.parse(row.badges || '[]'), skillAnalysis: row.skill_analysis ? JSON.parse(row.skill_analysis) : null, roadmap: row.roadmap ? JSON.parse(row.roadmap) : null };
  }
  return memUsers.get(email) || null;
}
function dbSetUser(user) {
  if (db) {
    const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(user.email);
    if (existing) {
      db.prepare(`UPDATE users SET name=?,password_hash=?,background=?,goal=?,city=?,xp=?,level=?,badges=?,avatar=?,skill_analysis=?,roadmap=? WHERE email=?`)
        .run(user.name, user.password_hash, user.background || '', user.goal || '', user.city || '', user.xp || 0, user.level || 1, JSON.stringify(user.badges || []), user.avatar || null, user.skillAnalysis ? JSON.stringify(user.skillAnalysis) : null, user.roadmap ? JSON.stringify(user.roadmap) : null, user.email);
    } else {
      db.prepare(`INSERT INTO users (id,name,email,password_hash,background,goal,city,xp,level,badges,avatar,skill_analysis,roadmap) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)`)
        .run(user.id, user.name, user.email, user.password_hash, user.background || '', user.goal || '', user.city || '', user.xp || 0, user.level || 1, JSON.stringify(user.badges || []), user.avatar || null, user.skillAnalysis ? JSON.stringify(user.skillAnalysis) : null, user.roadmap ? JSON.stringify(user.roadmap) : null);
    }
  } else {
    memUsers.set(user.email, user);
  }
}
function dbGetSession(token) {
  if (db) return db.prepare('SELECT email FROM sessions WHERE token = ?').get(token)?.email;
  return memSessions.get(token);
}
function dbSetSession(token, email) {
  if (db) {
    try { db.prepare('INSERT INTO sessions (token, email) VALUES (?, ?)').run(token, email); } catch {}
  } else {
    memSessions.set(token, email);
  }
}
function dbDeleteSession(token) {
  if (db) db.prepare('DELETE FROM sessions WHERE token = ?').run(token);
  else memSessions.delete(token);
}
function dbAllUsers() {
  if (db) return db.prepare('SELECT * FROM users').all().map(r => ({ ...r, badges: JSON.parse(r.badges || '[]') }));
  return Array.from(memUsers.values());
}

const genId = () => crypto.randomUUID();
const safe = u => {
  const { password_hash, password, skill_analysis, roadmap, ...s } = u;
  return { ...s, skillAnalysis: u.skillAnalysis, roadmap: u.roadmap };
};

// ─── AI (Gemini) ──────────────────────────────────────────────────────────────
const KEY = process.env.GEMINI_API_KEY || '';
const GEMINI = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=' + KEY;
const HAS_KEY = KEY.length > 10;
const cleanJ = r => r.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();

async function callGemini(prompt, system, maxT, history) {
  if (!HAS_KEY) throw new Error('NO_KEY');
  const contents = [...(history || []).slice(-8).map(m => ({ role: m.role === 'assistant' ? 'model' : 'user', parts: [{ text: m.content }] })), { role: 'user', parts: [{ text: prompt }] }];
  const body = { contents, generationConfig: { temperature: 0.75, maxOutputTokens: maxT || 1500 } };
  if (system) body.systemInstruction = { parts: [{ text: system }] };
  const res = await fetch(GEMINI, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  const data = await res.json();
  if (data.error) throw new Error(data.error.message);
  return data.candidates[0].content.parts[0].text;
}

// ─── Fallbacks ────────────────────────────────────────────────────────────────
function fallbackAnalysis() { return { matchScore: 72, marketInsight: 'Strong potential — Python and SQL will be the highest-impact skills to add first.', salaryRange: '₹6-12 LPA in 12 months', readinessScore: 68, topRoles: [{ title: 'Data Analyst', match: 82, avgSalary: '₹6-14 LPA', demand: 'High', openings: '85,000+' }, { title: 'Business Analyst', match: 76, avgSalary: '₹5-12 LPA', demand: 'High', openings: '60,000+' }, { title: 'Product Analyst', match: 70, avgSalary: '₹7-16 LPA', demand: 'Medium', openings: '28,000+' }], top3Skills: [{ skill: 'Python', reason: 'Most in-demand skill in India — 180,000+ job listings require it.', resources: ['NPTEL', 'Swayam', 'YouTube'] }, { skill: 'Data Analysis (SQL + Excel)', reason: 'Required in 95% of analyst roles.', resources: ['NPTEL', 'Coursera (free audit)'] }, { skill: 'Communication & Storytelling', reason: 'The hidden skill that gets you hired. Earn 25% more.', resources: ['Swayam', 'LinkedIn Learning'] }], skillGaps: [{ skill: 'Python Programming', priority: 'High', timeToLearn: '6 weeks', whyItMatters: 'Required in 80% of data-related job listings.' }, { skill: 'SQL & Databases', priority: 'High', timeToLearn: '4 weeks', whyItMatters: 'Every analyst role needs this.' }, { skill: 'Data Visualization', priority: 'Medium', timeToLearn: '3 weeks', whyItMatters: 'Makes your portfolio stand out.' }] }; }
function fallbackRoadmap(goal) { return { finalOutcome: 'Ready to apply confidently for ' + (goal || 'your target role') + ' with a real portfolio', expectedSalary: '₹6-12 LPA', jobsToApply: ['Data Analyst', 'Business Analyst', 'Junior Data Scientist', 'SQL Developer'], phases: [{ phase: 'Phase 1 — Foundation', weeks: 'Week 1-4', focus: 'Python + SQL Fundamentals', milestone: 'Complete 2 NPTEL modules', tasks: ['Complete NPTEL Python course (free)', 'Learn SQL basics on Swayam', 'Build a simple data cleaning project'], resources: [{ name: 'Programming in Python — NPTEL', platform: 'NPTEL', free: true }] }, { phase: 'Phase 2 — Build', weeks: 'Week 5-8', focus: 'Data Analysis + Portfolio', milestone: '2 real-world analysis projects on GitHub', tasks: ['Analyse a real Indian dataset', 'Build Excel + Python dashboards', 'Update LinkedIn with projects'], resources: [{ name: 'Data Analysis with Python — NPTEL', platform: 'NPTEL', free: true }] }, { phase: 'Phase 3 — Apply', weeks: 'Week 9-12', focus: 'Job Applications + Interview Prep', milestone: 'Apply to 30 companies, get 5 interviews', tasks: ['Apply on Naukri, LinkedIn, AngelList daily', 'Practice SQL on LeetCode', 'Mock interviews with MARGDARSHAK AI Mentor'], resources: [{ name: 'Interview Prep', platform: 'LinkedIn', free: true }] }] }; }
function fallbackChat(msg, name, goal, city) { const m = msg.toLowerCase(); if (m.includes('salary') || m.includes('lpa')) return 'Here\'s the honest salary picture in India for ' + (city || 'your city') + ':\n\n**Entry level (0-1 yr):** ₹3-6 LPA\n**Mid level (1-3 yrs):** ₹6-14 LPA\n**Senior (3+ yrs):** ₹14-30+ LPA\n\nFastest way to jump salary tiers? Strong GitHub portfolio + one good NPTEL certification.'; if (m.includes('python') || m.includes('learn')) return 'Python is the right call — start with NPTEL "Programming, Data Structures and Algorithms in Python" from IIT Madras. Free, 8 weeks, employer-recognised.\n\n**Week 1-2:** Basics\n**Week 3-4:** Pandas\n**Week 5-6:** Analysis & visualisation\n**Week 7-8:** Real project with Indian data'; return 'Great question, ' + (name ? name.split(' ')[0] : 'there') + '!\n\nFor ' + (goal ? 'your goal of becoming a ' + goal : 'your career journey') + ':\n\n**Priority 1:** Build marketable skills — Python, SQL, Communication.\n\n**Priority 2:** Create a real portfolio on GitHub with Indian datasets.\n\n**Priority 3:** Get active on LinkedIn. India\'s hiring is referral-driven.'; }

// ─── XP & Badges ──────────────────────────────────────────────────────────────
function addXP(u, amt, bid) {
  u.xp = (u.xp || 0) + amt;
  u.level = Math.floor(u.xp / 100) + 1;
  if (bid && !u.badges.includes(bid)) u.badges.push(bid);
  dbSetUser(u);
}

// ─── Auth Routes ──────────────────────────────────────────────────────────────
app.post('/api/auth/register', (req, res) => {
  const { name, email, password, background, goal, city } = req.body;
  if (!name || !email || !password) return res.status(400).json({ error: 'Name, email and password required.' });
  if (password.length < 6) return res.status(400).json({ error: 'Password must be at least 6 characters.' });
  if (dbGetUser(email)) return res.status(400).json({ error: 'Email already registered.' });
  const user = { id: genId(), name, email, password_hash: hashPassword(password), background: background || '', goal: goal || '', city: city || '', xp: 0, level: 1, badges: [], avatar: null, skillAnalysis: null, roadmap: null, createdAt: new Date().toISOString() };
  dbSetUser(user);
  const token = genId();
  dbSetSession(token, email);
  res.json({ token, user: safe(user) });
});

app.post('/api/auth/login', (req, res) => {
  const { email, password } = req.body;
  const user = dbGetUser(email);
  if (!user) return res.status(401).json({ error: 'Invalid email or password.' });
  const valid = user.password_hash ? verifyPassword(password, user.password_hash) : (user.password === password); // legacy fallback
  if (!valid) return res.status(401).json({ error: 'Invalid email or password.' });
  const token = genId();
  dbSetSession(token, email);
  res.json({ token, user: safe(user) });
});

app.post('/api/auth/logout', (req, res) => {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (token) dbDeleteSession(token);
  res.json({ ok: true });
});

// ─── Auth Middleware ───────────────────────────────────────────────────────────
function auth(req, res, next) {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) return res.status(401).json({ error: 'Unauthorized.' });
  const email = dbGetSession(token);
  if (!email) return res.status(401).json({ error: 'Session expired. Please log in again.' });
  const user = dbGetUser(email);
  if (!user) return res.status(401).json({ error: 'User not found.' });
  req.user = user;
  next();
}

// ─── User Routes ──────────────────────────────────────────────────────────────
app.get('/api/me', auth, (req, res) => res.json(safe(req.user)));

app.put('/api/me', auth, (req, res) => {
  const { name, background, goal, city } = req.body;
  const u = req.user;
  if (name) u.name = name;
  if (background !== undefined) u.background = background;
  if (goal !== undefined) u.goal = goal;
  if (city !== undefined) u.city = city;
  dbSetUser(u);
  res.json(safe(u));
});

// ─── Avatar Upload (FIXED: correct URL path) ──────────────────────────────────
app.post('/api/avatar', auth, (req, res) => {
  const { base64 } = req.body;
  if (!base64) return res.status(400).json({ error: 'No image provided.' });
  try {
    // Strip data URL prefix if present
    const data = base64.replace(/^data:image\/\w+;base64,/, '');
    const buf = Buffer.from(data, 'base64');
    if (buf.length > 8 * 1024 * 1024) return res.status(400).json({ error: 'Image too large. Max 8MB.' });
    const fn = 'av_' + req.user.id + '_' + Date.now() + '.jpg';
    const fp = path.join(UPLOAD, fn);
    fs.writeFileSync(fp, buf);
    // FIX: store the full relative URL that works from the frontend
    req.user.avatar = '/uploads/' + fn;
    addXP(req.user, 10, 'avatar_set');
    res.json({ url: req.user.avatar, xp: req.user.xp, badges: req.user.badges });
  } catch (e) {
    res.status(500).json({ error: 'Upload failed: ' + e.message });
  }
});

// ─── AI Routes ────────────────────────────────────────────────────────────────
app.post('/api/analyze', auth, async (req, res) => {
  const { background, goal, city, currentSkills } = req.body;
  const u = req.user;
  if (background) u.background = background;
  if (goal) u.goal = goal;
  if (city) u.city = city;
  let analysis;
  if (!HAS_KEY) {
    analysis = fallbackAnalysis();
  } else {
    const sys = 'You are MARGDARSHAK AI for India. Respond ONLY with valid raw JSON. No markdown.';
    const prompt = `Analyse this Indian learner:\nName:${u.name}\nBackground:${u.background}\nGoal:${u.goal}\nCity:${u.city}\nSkills:${currentSkills || 'Not specified'}\n\nReturn ONLY JSON:\n{"matchScore":<0-100>,"marketInsight":"<1 sentence>","salaryRange":"₹X-Y LPA in 12 months","readinessScore":<0-100>,"topRoles":[{"title":"","match":<0-100>,"avgSalary":"₹X-Y LPA","demand":"High/Medium/Low","openings":"XX,XXX+"}],"top3Skills":[{"skill":"","reason":"","resources":[""]}],"skillGaps":[{"skill":"","priority":"High/Medium/Low","timeToLearn":"X weeks","whyItMatters":""}]}`;
    try { analysis = JSON.parse(cleanJ(await callGemini(prompt, sys, 1200))); } catch (e) { console.error('Analyze:', e.message); analysis = fallbackAnalysis(); }
  }
  u.skillAnalysis = analysis;
  addXP(u, 50, 'first_analysis');
  res.json({ analysis, xp: u.xp, badges: u.badges, prototypeMode: !HAS_KEY });
});

app.post('/api/roadmap', auth, async (req, res) => {
  const { goal, city, analysis } = req.body;
  const u = req.user;
  let roadmap;
  if (!HAS_KEY) {
    roadmap = fallbackRoadmap(goal || u.goal);
  } else {
    const sys = 'You are MARGDARSHAK roadmap engine for India. Respond ONLY with valid raw JSON.';
    const prompt = `Create 90-day roadmap:\nGoal:${goal || u.goal}\nCity:${city || u.city}\nSkills:${analysis?.top3Skills?.map(s => s.skill).join(',') || 'Python,SQL'}\n\nReturn ONLY JSON:\n{"finalOutcome":"","expectedSalary":"₹X-Y LPA","jobsToApply":[""],"phases":[{"phase":"Phase 1 — Foundation","weeks":"Week 1-4","focus":"","milestone":"","tasks":[""],"resources":[{"name":"","platform":"NPTEL","free":true}]},{"phase":"Phase 2 — Build","weeks":"Week 5-8","focus":"","milestone":"","tasks":[""],"resources":[{"name":"","platform":"Swayam","free":true}]},{"phase":"Phase 3 — Apply","weeks":"Week 9-12","focus":"","milestone":"","tasks":[""],"resources":[{"name":"","platform":"LinkedIn","free":true}]}]}`;
    try { roadmap = JSON.parse(cleanJ(await callGemini(prompt, sys, 1500))); } catch (e) { console.error('Roadmap:', e.message); roadmap = fallbackRoadmap(goal || u.goal); }
  }
  u.roadmap = roadmap;
  addXP(u, 30, 'roadmap_created');
  res.json({ roadmap, xp: u.xp, badges: u.badges, prototypeMode: !HAS_KEY });
});

app.post('/api/chat', auth, async (req, res) => {
  const { message, history } = req.body;
  const u = req.user;
  if (!message?.trim()) return res.status(400).json({ error: 'Message required.' });
  let reply;
  if (!HAS_KEY) {
    reply = fallbackChat(message, u.name, u.goal, u.city);
  } else {
    const sys = `You are MARGDARSHAK AI career mentor for India. Warm, direct, India-specific. User: Name=${u.name}, Background=${u.background || 'Student'}, Goal=${u.goal || 'Career growth'}, City=${u.city || 'India'}. Keep replies 2-4 paragraphs. Use ₹ for salaries. Use **bold** for key points. Mention NPTEL, Swayam, Naukri, LinkedIn India.`;
    try { reply = await callGemini(message, sys, 600, history || []); } catch (e) { console.error('Chat:', e.message); reply = fallbackChat(message, u.name, u.goal, u.city); }
  }
  addXP(u, 5, 'first_chat');
  res.json({ reply, xp: u.xp, prototypeMode: !HAS_KEY });
});

// ─── Static Routes ────────────────────────────────────────────────────────────
app.get('/api/market', auth, (req, res) => res.json({ industries: [{ name: 'Information Technology', growth: '+22%', openings: '2.5M+', salary: '₹8-20 LPA', color: '#2B9E96' }, { name: 'Data & AI', growth: '+38%', openings: '450K+', salary: '₹12-35 LPA', color: '#7B6CF6' }, { name: 'Financial Services', growth: '+15%', openings: '1.2M+', salary: '₹6-18 LPA', color: '#E8601A' }, { name: 'E-commerce', growth: '+25%', openings: '800K+', salary: '₹4-12 LPA', color: '#F472B6' }, { name: 'Healthcare Tech', growth: '+18%', openings: '300K+', salary: '₹5-15 LPA', color: '#4A9E3A' }, { name: 'EdTech', growth: '+20%', openings: '180K+', salary: '₹4-10 LPA', color: '#F5C842' }], topSkills: [{ skill: 'Python', demand: 98, salary: '₹8-25 LPA', jobs: '180K+' }, { skill: 'Data Analysis', demand: 95, salary: '₹6-20 LPA', jobs: '220K+' }, { skill: 'Machine Learning', demand: 92, salary: '₹12-35 LPA', jobs: '85K+' }, { skill: 'Cloud (AWS/Azure)', demand: 90, salary: '₹10-28 LPA', jobs: '150K+' }, { skill: 'React / Node.js', demand: 88, salary: '₹7-22 LPA', jobs: '200K+' }, { skill: 'Digital Marketing', demand: 85, salary: '₹4-12 LPA', jobs: '300K+' }, { skill: 'SQL & Databases', demand: 87, salary: '₹6-18 LPA', jobs: '175K+' }, { skill: 'Communication', demand: 80, salary: '₹5-15 LPA', jobs: '500K+' }], topCompanies: [{ name: 'TCS', openings: '45K+', type: 'IT Services', location: 'Pan India' }, { name: 'Infosys', openings: '38K+', type: 'IT Services', location: 'Pan India' }, { name: 'Flipkart', openings: '8K+', type: 'E-commerce', location: 'Bengaluru' }, { name: 'Razorpay', openings: '2K+', type: 'FinTech', location: 'Bengaluru' }, { name: 'Zomato', openings: '3K+', type: 'FoodTech', location: 'Gurugram' }, { name: 'Amazon India', openings: '12K+', type: 'E-commerce/Cloud', location: 'Hyderabad' }, { name: 'Paytm', openings: '4K+', type: 'FinTech', location: 'Noida' }, { name: 'Swiggy', openings: '5K+', type: 'FoodTech', location: 'Bengaluru' }], salaryTrends: [{ month: 'Jul', avg: 7.2 }, { month: 'Aug', avg: 7.5 }, { month: 'Sep', avg: 7.8 }, { month: 'Oct', avg: 8.1 }, { month: 'Nov', avg: 8.4 }, { month: 'Dec', avg: 8.6 }, { month: 'Jan', avg: 9.0 }, { month: 'Feb', avg: 9.2 }, { month: 'Mar', avg: 9.5 }] }));

app.get('/api/badges', auth, (req, res) => {
  const ALL = [{ id: 'first_analysis', name: 'Navigator', icon: '🧭', desc: 'Completed first AI Skill Scan', xp: 50 }, { id: 'roadmap_created', name: 'Pathfinder', icon: '🗺️', desc: 'Generated 90-day roadmap', xp: 30 }, { id: 'first_chat', name: 'Curious Mind', icon: '💬', desc: 'First AI mentor conversation', xp: 5 }, { id: 'avatar_set', name: 'Face of India', icon: '🤳', desc: 'Uploaded profile picture', xp: 10 }, { id: 'week_streak', name: 'Consistent', icon: '🔥', desc: '7-day learning streak', xp: 100 }, { id: 'top10', name: 'Rising Star', icon: '⭐', desc: 'Reached top 10 leaderboard', xp: 200 }, { id: 'skill_master', name: 'Skill Master', icon: '🏆', desc: 'Completed 5 skill assessments', xp: 150 }, { id: 'mentor_10', name: 'Guided', icon: '🎓', desc: '10 AI mentor conversations', xp: 80 }];
  res.json(ALL.map(b => ({ ...b, earned: (req.user.badges || []).includes(b.id) })));
});

app.get('/api/leaderboard', auth, (req, res) => {
  res.json(dbAllUsers().map(u => ({ name: u.name, xp: u.xp || 0, level: u.level || 1, badges: (u.badges || []).length, city: u.city || 'India', avatar: u.avatar || null })).sort((a, b) => b.xp - a.xp).slice(0, 10));
});

app.get('/api/status', (req, res) => res.json({ ok: true, aiMode: HAS_KEY ? 'gemini-live' : 'prototype-fallback', db: db ? 'sqlite' : 'in-memory' }));

// ─── Serve React build ────────────────────────────────────────────────────────
const BUILD = path.join(__dirname, 'app', 'build');
const LANDING = path.join(__dirname, 'index.html');

// Landing page FIRST — before React static, so / always shows landing
app.get('/', (req, res) => {
  if (fs.existsSync(LANDING)) return res.sendFile(LANDING);
  res.sendFile(path.join(BUILD, 'index.html'));
});

// React static files (js/css/media) — only after landing route is registered
app.use(express.static(BUILD));

// React app routes — these serve React's index.html (NOT the landing page)
['/auth', '/dashboard', '/analyze', '/roadmap', '/market', '/chat', '/badges', '/profile'].forEach(r =>
  app.get(r, (req, res) => res.sendFile(path.join(BUILD, 'index.html')))
);

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log('\n✅  MARGDARSHAK → http://localhost:' + PORT);
  console.log('🗃️  Database: ' + (db ? 'SQLite (margdarshak.db) — data persists across restarts' : 'In-memory (install better-sqlite3 for persistence)'));
  console.log('🤖  AI: ' + (HAS_KEY ? 'Gemini Live ✨' : 'Prototype mode (smart fallbacks) 🔧'));
  if (!HAS_KEY) console.log('\n💡  Get free Gemini key: https://aistudio.google.com/app/apikey\n    Add to .env: GEMINI_API_KEY=your_key\n');
  console.log('🏠  Landing: http://localhost:' + PORT + '/');
  console.log('📱  App:     http://localhost:' + PORT + '/auth\n');
});
