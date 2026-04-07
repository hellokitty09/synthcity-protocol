/**
 * ═══════════════════════════════════════════════════════════
 *  SYNTHCITY AUTH — Session & Protection Middleware
 *  Handles signup, login, session tokens, and route guards.
 * ═══════════════════════════════════════════════════════════
 */

const {
    createUser, getUserByEmail, getUserById,
    createSession, getSession, deleteSession,
    verifyPassword,
} = require('./db');

const ADMIN_API_KEY = process.env.ADMIN_API_KEY || null;

// ═══════════════════════════════════════════════
//  AUTH ROUTES (mount on Express app)
// ═══════════════════════════════════════════════

function mountAuthRoutes(app) {
    /**
     * POST /api/auth/signup
     * Body: { email, password, displayName, role, walletAddress?, faction?, modelId?, domains? }
     */
    app.post('/api/auth/signup', (req, res) => {
        try {
            const { email, password, displayName, role, walletAddress, faction, modelId, domains } = req.body;

            // Validation
            if (!email || !password || !displayName) {
                return res.status(400).json({ error: 'Email, password, and display name are required' });
            }
            if (password.length < 8) {
                return res.status(400).json({ error: 'Password must be at least 8 characters' });
            }
            if (!['spectator', 'agent'].includes(role)) {
                return res.status(400).json({ error: 'Role must be spectator or agent' });
            }
            if (role === 'agent' && !walletAddress) {
                return res.status(400).json({ error: 'Agents must provide a wallet address' });
            }

            // Email format check
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(email)) {
                return res.status(400).json({ error: 'Invalid email format' });
            }

            // Check duplicate
            const existing = getUserByEmail(email);
            if (existing) {
                return res.status(409).json({ error: 'Email already registered' });
            }

            // Create user
            const userId = createUser({ email, password, displayName, role, walletAddress, faction, modelId, domains });
            const session = createSession(userId, role);

            res.status(201).json({
                token: session.token,
                expiresAt: session.expiresAt,
                user: { id: userId, email, displayName, role, walletAddress: walletAddress || null },
            });
        } catch (e) {
            console.error('[Auth] Signup error:', e.message);
            if (e.message.includes('UNIQUE constraint failed: users.wallet_address')) {
                return res.status(409).json({ error: 'Wallet already registered' });
            }
            res.status(500).json({ error: 'Internal server error' });
        }
    });

    /**
     * POST /api/auth/login
     * Body: { email, password }
     */
    app.post('/api/auth/login', (req, res) => {
        try {
            const { email, password } = req.body;

            if (!email || !password) {
                return res.status(400).json({ error: 'Email and password are required' });
            }

            const user = getUserByEmail(email);
            if (!user) {
                return res.status(401).json({ error: 'Invalid credentials' });
            }

            if (!verifyPassword(password, user.password_hash)) {
                return res.status(401).json({ error: 'Invalid credentials' });
            }

            const session = createSession(user.id, user.role);

            res.json({
                token: session.token,
                expiresAt: session.expiresAt,
                user: {
                    id: user.id,
                    email: user.email,
                    displayName: user.display_name,
                    role: user.role,
                    walletAddress: user.wallet_address,
                },
            });
        } catch (e) {
            console.error('[Auth] Login error:', e.message);
            res.status(500).json({ error: 'Internal server error' });
        }
    });

    /**
     * POST /api/auth/logout
     * Header: Authorization: Bearer <token>
     */
    app.post('/api/auth/logout', (req, res) => {
        const token = extractToken(req);
        if (token) deleteSession(token);
        res.json({ success: true });
    });

    /**
     * GET /api/auth/me
     * Returns current user info from session token.
     */
    app.get('/api/auth/me', (req, res) => {
        const token = extractToken(req);
        if (!token) return res.status(401).json({ error: 'No token provided' });

        const session = getSession(token);
        if (!session) return res.status(401).json({ error: 'Invalid or expired session' });

        const user = getUserById(session.user_id);
        if (!user) return res.status(401).json({ error: 'User not found' });

        res.json({ user });
    });
}

// ═══════════════════════════════════════════════
//  MIDDLEWARE
// ═══════════════════════════════════════════════

/**
 * Extract Bearer token from Authorization header.
 */
function extractToken(req) {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) return null;
    return authHeader.slice(7);
}

/**
 * Require a valid session. Sets req.user and req.session.
 */
function requireAuth(req, res, next) {
    const token = extractToken(req);
    if (!token) return res.status(401).json({ error: 'Authentication required' });

    const session = getSession(token);
    if (!session) return res.status(401).json({ error: 'Invalid or expired session' });

    const user = getUserById(session.user_id);
    if (!user) return res.status(401).json({ error: 'User not found' });

    req.user = user;
    req.session = session;
    next();
}

/**
 * Require agent role.
 */
function requireAgent(req, res, next) {
    requireAuth(req, res, () => {
        if (req.user.role !== 'agent') {
            return res.status(403).json({ error: 'Agent role required' });
        }
        next();
    });
}

/**
 * Require admin API key (for system operations like settle).
 */
function requireAdmin(req, res, next) {
    if (!ADMIN_API_KEY) {
        // If no admin key configured, fall back to requiring any auth
        return requireAuth(req, res, next);
    }
    const key = req.headers['x-admin-key'] || req.query.adminKey;
    if (key !== ADMIN_API_KEY) {
        return res.status(403).json({ error: 'Admin access required' });
    }
    next();
}

module.exports = {
    mountAuthRoutes,
    extractToken,
    requireAuth,
    requireAgent,
    requireAdmin,
};
