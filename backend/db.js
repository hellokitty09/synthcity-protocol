/**
 * ═══════════════════════════════════════════════════════════
 *  SYNTHCITY DATABASE — SQLite Persistence Layer
 *  Zero-config persistent storage for protocol state.
 *  All data survives server restarts.
 * ═══════════════════════════════════════════════════════════
 */

const Database = require('better-sqlite3');
const path = require('path');
const crypto = require('crypto');

const DB_PATH = process.env.DB_PATH || path.join(__dirname, 'synthcity.db');
const db = new Database(DB_PATH);

// Enable WAL mode for better concurrent read performance
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// ═══════════════════════════════════════════════
//  SCHEMA
// ═══════════════════════════════════════════════

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    display_name TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'spectator',
    wallet_address TEXT UNIQUE,
    faction TEXT DEFAULT 'Independent',
    model_id TEXT,
    domains TEXT DEFAULT '[]',
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS sessions (
    token TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role TEXT NOT NULL,
    expires_at TEXT NOT NULL,
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS agents (
    address TEXT PRIMARY KEY,
    faction TEXT DEFAULT 'Independent',
    style TEXT DEFAULT 'balanced',
    reputation REAL DEFAULT 50.0,
    is_sovereign INTEGER DEFAULT 0,
    total_predictions INTEGER DEFAULT 0,
    total_rewards REAL DEFAULT 0.0,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS predictions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    agent_address TEXT NOT NULL,
    cycle INTEGER NOT NULL,
    domain TEXT NOT NULL,
    predicted_volatility REAL,
    actual_volatility REAL,
    accuracy REAL,
    bias TEXT,
    reasoning TEXT,
    model TEXT,
    used_llm INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS cycles (
    cycle_number INTEGER PRIMARY KEY,
    epoch INTEGER DEFAULT 0,
    dominant_faction TEXT,
    tax_rate INTEGER DEFAULT 1,
    tax_rate_name TEXT DEFAULT 'Neutral',
    settled_at TEXT,
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS chronicle (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    cycle INTEGER NOT NULL,
    text TEXT NOT NULL,
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE INDEX IF NOT EXISTS idx_predictions_agent ON predictions(agent_address);
  CREATE INDEX IF NOT EXISTS idx_predictions_cycle ON predictions(cycle);
  CREATE INDEX IF NOT EXISTS idx_chronicle_cycle ON chronicle(cycle);
  CREATE INDEX IF NOT EXISTS idx_sessions_expires ON sessions(expires_at);
`);

// ═══════════════════════════════════════════════
//  USER HELPERS
// ═══════════════════════════════════════════════

function hashPassword(password) {
    const salt = crypto.randomBytes(16).toString('hex');
    const hash = crypto.scryptSync(password, salt, 64).toString('hex');
    return `${salt}:${hash}`;
}

function verifyPassword(password, stored) {
    const [salt, hash] = stored.split(':');
    const check = crypto.scryptSync(password, salt, 64).toString('hex');
    return hash === check;
}

function createUser({ email, password, displayName, role, walletAddress, faction, modelId, domains }) {
    const id = crypto.randomBytes(16).toString('hex');
    const passwordHash = hashPassword(password);
    const stmt = db.prepare(`
        INSERT INTO users (id, email, password_hash, display_name, role, wallet_address, faction, model_id, domains)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    stmt.run(id, email.toLowerCase(), passwordHash, displayName, role, walletAddress || null, faction || 'Independent', modelId || null, JSON.stringify(domains || []));
    return id;
}

function getUserByEmail(email) {
    return db.prepare('SELECT * FROM users WHERE email = ?').get(email.toLowerCase());
}

function getUserById(id) {
    return db.prepare('SELECT id, email, display_name, role, wallet_address, faction, model_id, domains, created_at FROM users WHERE id = ?').get(id);
}

// ═══════════════════════════════════════════════
//  SESSION HELPERS
// ═══════════════════════════════════════════════

const SESSION_DURATION_HOURS = parseInt(process.env.SESSION_DURATION_HOURS, 10) || 72;

function createSession(userId, role) {
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + SESSION_DURATION_HOURS * 60 * 60 * 1000).toISOString();
    db.prepare('INSERT INTO sessions (token, user_id, role, expires_at) VALUES (?, ?, ?, ?)').run(token, userId, role, expiresAt);
    return { token, expiresAt };
}

function getSession(token) {
    const session = db.prepare('SELECT * FROM sessions WHERE token = ?').get(token);
    if (!session) return null;
    if (new Date(session.expires_at) < new Date()) {
        db.prepare('DELETE FROM sessions WHERE token = ?').run(token);
        return null;
    }
    return session;
}

function deleteSession(token) {
    db.prepare('DELETE FROM sessions WHERE token = ?').run(token);
}

function cleanExpiredSessions() {
    db.prepare("DELETE FROM sessions WHERE expires_at < datetime('now')").run();
}

// ═══════════════════════════════════════════════
//  AGENT HELPERS
// ═══════════════════════════════════════════════

function upsertAgent(address, { faction, style, reputation, isSovereign }) {
    const stmt = db.prepare(`
        INSERT INTO agents (address, faction, style, reputation, is_sovereign, updated_at)
        VALUES (?, ?, ?, ?, ?, datetime('now'))
        ON CONFLICT(address) DO UPDATE SET
            faction = COALESCE(excluded.faction, faction),
            style = COALESCE(excluded.style, style),
            reputation = excluded.reputation,
            is_sovereign = COALESCE(excluded.is_sovereign, is_sovereign),
            updated_at = datetime('now')
    `);
    stmt.run(address, faction || 'Independent', style || 'balanced', reputation || 50, isSovereign ? 1 : 0);
}

function getAgent(address) {
    return db.prepare('SELECT * FROM agents WHERE address = ?').get(address);
}

function getAllAgents() {
    return db.prepare('SELECT * FROM agents ORDER BY reputation DESC').all();
}

function updateReputation(address, newRep) {
    db.prepare('UPDATE agents SET reputation = ?, updated_at = datetime(\'now\') WHERE address = ?').run(Math.min(newRep, 100), address);
}

// ═══════════════════════════════════════════════
//  PREDICTION HELPERS
// ═══════════════════════════════════════════════

function savePrediction({ agentAddress, cycle, domain, predictedVol, actualVol, accuracy, bias, reasoning, model, usedLLM }) {
    db.prepare(`
        INSERT INTO predictions (agent_address, cycle, domain, predicted_volatility, actual_volatility, accuracy, bias, reasoning, model, used_llm)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(agentAddress, cycle, domain, predictedVol, actualVol, accuracy, bias, reasoning, model, usedLLM ? 1 : 0);
}

function getAgentPredictions(address, limit = 20) {
    return db.prepare('SELECT * FROM predictions WHERE agent_address = ? ORDER BY id DESC LIMIT ?').all(address, limit);
}

// ═══════════════════════════════════════════════
//  CYCLE HELPERS
// ═══════════════════════════════════════════════

function saveCycle({ cycleNumber, epoch, dominantFaction, taxRate, taxRateName }) {
    db.prepare(`
        INSERT OR REPLACE INTO cycles (cycle_number, epoch, dominant_faction, tax_rate, tax_rate_name, settled_at)
        VALUES (?, ?, ?, ?, ?, datetime('now'))
    `).run(cycleNumber, epoch, dominantFaction, taxRate, taxRateName);
}

function getLatestCycle() {
    return db.prepare('SELECT * FROM cycles ORDER BY cycle_number DESC LIMIT 1').get();
}

// ═══════════════════════════════════════════════
//  CHRONICLE HELPERS
// ═══════════════════════════════════════════════

function addChronicleEntry(cycle, text) {
    db.prepare('INSERT INTO chronicle (cycle, text) VALUES (?, ?)').run(cycle, text);
}

function getChronicle(limit = 50) {
    return db.prepare('SELECT * FROM chronicle ORDER BY id DESC LIMIT ?').all(limit);
}

// ═══════════════════════════════════════════════
//  PROTOCOL STATE HELPERS (for boot recovery)
// ═══════════════════════════════════════════════

function getProtocolState() {
    const latestCycle = getLatestCycle();
    const agents = getAllAgents();
    const reputations = new Map();
    for (const a of agents) {
        reputations.set(a.address, a.reputation);
    }
    return {
        currentCycle: latestCycle ? latestCycle.cycle_number + 1 : 1,
        epoch: latestCycle ? latestCycle.epoch : 0,
        taxRate: latestCycle ? latestCycle.tax_rate : 1,
        taxRateName: latestCycle ? latestCycle.tax_rate_name : 'Neutral',
        reputations,
    };
}

module.exports = {
    db,
    // Users
    hashPassword,
    verifyPassword,
    createUser,
    getUserByEmail,
    getUserById,
    // Sessions
    createSession,
    getSession,
    deleteSession,
    cleanExpiredSessions,
    // Agents
    upsertAgent,
    getAgent,
    getAllAgents,
    updateReputation,
    // Predictions
    savePrediction,
    getAgentPredictions,
    // Cycles
    saveCycle,
    getLatestCycle,
    // Chronicle
    addChronicleEntry,
    getChronicle,
    // State
    getProtocolState,
};
