# AI-Assisted Problem-Solving & Server Management Platform
## Comprehensive Product Brief, System Architecture, Roadmap & Code Deliverables

---

## 1. Project Brief

### 1.1 Target Audience and Primary Use Cases
* **Systems Engineers & DevOps Specialists**: Troubleshooting infrastructure anomalies, diagnosing service degradation, log analysis, generating remediation scripts, and executing controlled server operations.
* **Software Developers & Data Engineers**: Multi-domain debugging (Node.js, Python, SQL, distributed systems), algorithm optimization, root-cause analysis, and architectural design evaluations.
* **Technical Support Leads & Operations Managers**: Managing incident response runbooks, verifying server uptime metrics, dispatching automated diagnostics, and tracking role-based audit trails.
* **Domain Specialists (STEM & Quantitative Analysts)**: Utilizing structured multi-step reasoning models for math, logic puzzles, algorithmic formulation, and data pipeline problem solving.

### 1.2 Core Feature Matrix
1. **Multi-Domain Problem-Solving Toolkit**:
   - Step-by-step tree-of-thought decomposition with chain-of-thought validation.
   - Domain-specific adapters: Systems/DevOps, Software Architecture, Mathematical/Algorithmic, and Database/Query optimization.
   - Progressive enhancement: Ability to ingest unstructured input (raw stack traces, logs, partial requirements) and iteratively refine problem statements through progressive prompts.
2. **Interactive AI Reasoning Workspace**:
   - Split-pane workspace: Left pane for problem definition, constraints, and source telemetry; right pane for interactive AI reasoning canvas, executable code blocks, and resolution steps.
   - Multi-model evaluation: Side-by-side verification and hypothesis testing.
   - Interactive scratchpad with session persistence and history replay.
3. **Identity, Authentication & Role-Based Access Control (RBAC)**:
   - Cryptographically secured credentials via Argon2id / Bcrypt with salted hashing.
   - JWT token lifecycle management with HttpOnly, SameSite, Secure refresh cookies.
   - Granular RBAC hierarchy:
     - `Viewer`: Read-only access to problem workspaces and public server health checks.
     - `Solver`: Create and solve problems; execute read-only diagnostic commands.
     - `Operator`: Trigger server health diagnostics, restart services, clear caches.
     - `Admin`: Full server provisioning, role management, audit log inspections, and API quota configuration.
4. **Server Management Dashboard**:
   - Real-time telemetry ingestion (CPU, memory, disk I/O, network throughput, event loop latency).
   - Process & daemon monitor (systemd / PM2 / Docker container status inspection).
   - Safe command execution sandbox with command whitelisting, dry-run simulation, and emergency kill switches.
   - Health probes (HTTP/gRPC liveness and readiness ping endpoints).
5. **Audit Logging & Incident Governance**:
   - Append-only immutable log for all administrative and server actions (actor, timestamp, IP, target service, command payload, exit code).
   - Session activity tracking with exportable compliance reports (JSON/CSV).

### 1.3 Non-Functional Requirements (NFRs)
* **Security**: Zero-trust architecture, OWASP Top 10 mitigation, sanitized shell execution (no raw interpolation), CORS whitelisting, strict CSP, per-IP and per-account rate limiting.
* **Scalability**: Stateless application servers behind load balancers, connection pooling for PostgreSQL, Redis caching for active sessions and server telemetry streams.
* **Accessibility**: WCAG 2.1 Level AA compliance, semantic HTML5, keyboard navigation across all workspace panes, high-contrast dark/light mode palette.
* **Performance**: Sub-100ms API response time for cached telemetry, streaming responses (Server-Sent Events) for AI reasoning outputs, sub-2s initial page load time.
* **Reliability & Resilience**: 99.9% uptime target, automatic reconnection on WebSocket/SSE failure, graceful degradation when upstream AI providers experience rate limits.

---

## 2. System Architecture Plan

### 2.1 Suggested Tech Stack
* **Frontend**: Next.js / React 18+ with TypeScript, Tailwind CSS, Lucide Icons, Monaco Editor (for code/command inspection), and TanStack Query (React Query) for telemetry cache synchronization.
* **Backend**: Node.js with TypeScript and Express or Fastify (low overhead, native schema validation via TypeBox or Zod).
* **AI Orchestration**: Modern Gemini API SDK (`@google/genai`) utilizing structured JSON schema outputs and streaming.
* **Primary Database**: PostgreSQL (via Drizzle ORM or Prisma) for transactional reliability, relational RBAC models, and audit logs.
* **In-Memory Store & Message Broker**: Redis for token invalidation blacklists, distributed rate limiting, and pub/sub server telemetry broadcast.
* **Deployment & Runtime**: Docker containers orchestrated on Google Cloud Run or Kubernetes; managed PostgreSQL on Cloud SQL.

### 2.2 Data Models & User Roles
```
User (1) <---> (M) Session
User (1) <---> (M) ProblemWorkspace
User (1) <---> (M) AuditLog
Role (1) <---> (M) User
ServerNode (1) <---> (M) ServerMetric
ServerNode (1) <---> (M) ServerActionExecution
```

#### Core Database Schema Entities
* **`users`**: `id` (UUID), `email` (VARCHAR), `password_hash` (TEXT), `role` (`viewer` | `solver` | `operator` | `admin`), `created_at`, `updated_at`, `is_active` (BOOL).
* **`problem_workspaces`**: `id` (UUID), `user_id` (UUID FK), `domain` (VARCHAR), `title` (VARCHAR), `raw_input` (TEXT), `refined_problem` (JSONB), `reasoning_steps` (JSONB), `solution` (TEXT), `status` (`draft` | `in_progress` | `resolved`).
* **`server_nodes`**: `id` (UUID), `name` (VARCHAR), `hostname` (VARCHAR), `status` (`healthy` | `warning` | `critical` | `offline`), `specs` (JSONB), `last_heartbeat` (TIMESTAMP).
* **`server_metrics`**: `id` (BIGINT), `node_id` (UUID FK), `cpu_percent` (FLOAT), `mem_used_bytes` (BIGINT), `mem_total_bytes` (BIGINT), `disk_percent` (FLOAT), `recorded_at` (TIMESTAMP).
* **`audit_logs`**: `id` (BIGINT), `actor_id` (UUID FK), `action` (VARCHAR), `target_type` (VARCHAR), `target_id` (VARCHAR), `details` (JSONB), `ip_address` (VARCHAR), `timestamp` (TIMESTAMP).

### 2.3 API Design & Authentication Flows
* **Authentication Flow**:
  1. User submits credentials to `POST /api/v1/auth/login`.
  2. Server validates with argon2id / bcrypt, generates an access token (JWT, 15m lifetime) and a refresh token (crypto-random 256-bit string, 7d lifetime).
  3. Refresh token is stored hashed in the DB / Redis and delivered via `HttpOnly`, `SameSite=Strict`, `Secure` cookie. Access token returned in response body.
  4. Client passes access token via `Authorization: Bearer <token>` in subsequent requests.
* **Key Endpoints**:
  - `POST /api/v1/auth/register` & `POST /api/v1/auth/login`
  - `POST /api/v1/auth/refresh` & `POST /api/v1/auth/logout`
  - `GET /api/v1/user/me`
  - `POST /api/v1/problems/decompose` (AI reasoning & decomposition)
  - `POST /api/v1/problems/:id/solve` (Streaming solution generation via SSE)
  - `GET /api/v1/servers` (List server instances & real-time health)
  - `GET /api/v1/servers/:id/metrics` (Time-series telemetry)
  - `POST /api/v1/servers/:id/actions` (Operator/Admin controlled action execution)
  - `GET /api/v1/admin/audit-logs` (Filtered audit inspection)

### 2.4 Security Architecture
1. **Input Validation**: All incoming requests validated at the boundary with Zod schemas. Strict typing prevents SQL injection, prototype pollution, and malformed inputs.
2. **Command Whitelisting**: Server operations accept structured command enum keys (`service_restart`, `cache_flush`, `disk_cleanup`), never arbitrary shell strings.
3. **Rate Limiting**: Multi-tier rate limiting using Token Bucket algorithm in Redis:
   - Auth endpoints: 5 attempts per 15 minutes per IP.
   - AI endpoints: 20 calls per minute per user.
   - Server management actions: 10 calls per minute per operator.
4. **Audit Logging**: Write-before-execute pattern ensures all sensitive operations are recorded before execution begins.

---

## 3. MVP Implementation Roadmap

### Phase 1: Core Foundation & Telemetry Baseline (Weeks 1-3)
* **Features**:
  - Secure authentication (email/password with JWT + refresh token cookies).
  - Basic problem-solving workspace (text input, domain selection, AI problem breakdown).
  - Simple server status dashboard (system CPU, memory, uptime, process listing).
* **Success Criteria**:
  - User can register, log in, create a problem workspace, and receive an AI-guided step-by-step resolution.
  - Server dashboard reliably displays local host telemetry updated every 5 seconds.

### Phase 2: RBAC, Persistence & Progressive Enhancement (Weeks 4-6)
* **Features**:
  - Persistent database storage for problem history and workspace sessions.
  - Role-based authorization (`Viewer`, `Solver`, `Operator`, `Admin`).
  - Progressive enhancement engine: Handling vague/incomplete problem inputs by generating clarifying diagnostic questions before proposing solutions.
  - Basic server diagnostics: Ping, port checks, process inspection.
* **Success Criteria**:
  - Unauthorized roles (`Viewer`) cannot execute operations or trigger heavy AI workflows.
  - Inputting a chaotic stack trace prompts the AI to request missing log lines or environment details before proposing a patch.

### Phase 3: Advanced Server Management & Enterprise Governance (Weeks 7-9)
* **Features**:
  - Multi-node server management with remote agent heartbeats.
  - Safe remediation executions (service restarts, memory dump triggers) with dry-run verification.
  - Full audit logging dashboard with search, filter, and export capabilities.
  - Anomaly detection alerts triggered when server thresholds exceed defined limits.
* **Success Criteria**:
  - Operators can trigger safe server actions that produce verified audit log entries with exit codes and execution latency.
  - Complete disaster-recovery rollback verification.

---

## 4. Deliverables & Code Samples

### 4.1 Security Implementation: Password Hashing & Token Verification
```typescript
// src/security/auth.ts
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { Request, Response, NextFunction } from 'express';

const SALT_ROUNDS = 12;
const JWT_SECRET = process.env.JWT_SECRET || 'dev-super-secure-secret-32-chars-min';
const JWT_EXPIRES_IN = '15m';

export interface UserPayload {
  id: string;
  email: string;
  role: 'viewer' | 'solver' | 'operator' | 'admin';
}

declare global {
  namespace Express {
    interface Request {
      user?: UserPayload;
    }
  }
}

/** Securely hashes a plain-text password using salt rounds */
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS);
}

/** Verifies a plain-text password against a stored bcrypt hash */
export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

/** Issues a signed JWT access token */
export function issueAccessToken(payload: UserPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
}

/** Middleware: Authenticate JWT Bearer Token */
export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Unauthorized: Missing or malformed token' });
    return;
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as UserPayload;
    req.user = decoded;
    next();
  } catch (err) {
    res.status(401).json({ error: 'Unauthorized: Invalid or expired token' });
  }
}

/** Middleware: Role-Based Authorization */
export function requireRole(allowedRoles: Array<'viewer' | 'solver' | 'operator' | 'admin'>) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }
    if (!allowedRoles.includes(req.user.role)) {
      res.status(403).json({ error: `Forbidden: Requires one of [${allowedRoles.join(', ')}]` });
      return;
    }
    next();
  };
}
```

---

### 4.2 Backend Skeleton: Express, User Model & AI Problem-Solving API
```typescript
// src/server.ts
import express, { Request, Response } from 'express';
import cors from 'cors';
import { z } from 'zod';
import { GoogleGenAI } from '@google/genai';
import { hashPassword, verifyPassword, issueAccessToken, requireAuth, requireRole } from './security/auth';

const app = express();
app.use(cors({ origin: true, credentials: true }));
app.use(express.json());

// In-Memory Data Store (Easily mapped to PostgreSQL / Drizzle ORM)
interface UserRecord {
  id: string;
  email: string;
  passwordHash: string;
  role: 'viewer' | 'solver' | 'operator' | 'admin';
  createdAt: string;
}

const usersDb = new Map<string, UserRecord>();
const workspacesDb = new Map<string, any>();

// Initialize Gemini Client
const ai = new GoogleGenAI();

// -----------------------------------------------------------------------------
// Auth Routes
// -----------------------------------------------------------------------------
const RegisterSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  role: z.enum(['viewer', 'solver', 'operator', 'admin']).default('solver'),
});

app.post('/api/v1/auth/register', async (req: Request, res: Response) => {
  const result = RegisterSchema.safeParse(req.body);
  if (!result.success) {
    res.status(400).json({ error: 'Invalid input', details: result.error.flatten() });
    return;
  }

  const { email, password, role } = result.data;
  if (usersDb.has(email.toLowerCase())) {
    res.status(409).json({ error: 'User already exists' });
    return;
  }

  const passwordHash = await hashPassword(password);
  const newUser: UserRecord = {
    id: `usr_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    email: email.toLowerCase(),
    passwordHash,
    role,
    createdAt: new Date().toISOString(),
  };

  usersDb.set(newUser.email, newUser);

  const token = issueAccessToken({
    id: newUser.id,
    email: newUser.email,
    role: newUser.role,
  });

  res.status(201).json({
    message: 'User registered successfully',
    token,
    user: { id: newUser.id, email: newUser.email, role: newUser.role },
  });
});

app.post('/api/v1/auth/login', async (req: Request, res: Response) => {
  const { email, password } = req.body;
  if (!email || !password) {
    res.status(400).json({ error: 'Email and password required' });
    return;
  }

  const user = usersDb.get(email.toLowerCase());
  if (!user || !(await verifyPassword(password, user.passwordHash))) {
    res.status(401).json({ error: 'Invalid credentials' });
    return;
  }

  const token = issueAccessToken({
    id: user.id,
    email: user.email,
    role: user.role,
  });

  res.json({
    token,
    user: { id: user.id, email: user.email, role: user.role },
  });
});

app.get('/api/v1/user/me', requireAuth, (req: Request, res: Response) => {
  res.json({ user: req.user });
});

// -----------------------------------------------------------------------------
// AI Problem-Solving API (Progressive Enhancement)
// -----------------------------------------------------------------------------
const DecomposeSchema = z.object({
  domain: z.enum(['devops', 'software', 'database', 'algorithms', 'general']),
  problemDescription: z.string().min(10),
  contextLogs: z.string().optional(),
  targetOutcome: z.string().optional(),
});

app.post('/api/v1/problems/decompose', requireAuth, requireRole(['solver', 'operator', 'admin']), async (req: Request, res: Response) => {
  const validation = DecomposeSchema.safeParse(req.body);
  if (!validation.success) {
    res.status(400).json({ error: 'Validation failed', details: validation.error.flatten() });
    return;
  }

  const { domain, problemDescription, contextLogs, targetOutcome } = validation.data;

  try {
    const prompt = `
You are a senior multi-domain problem-solving architect specializing in ${domain}.
Analyze the following problem and context. Handle potential gaps or incomplete requirements using progressive refinement.

Problem: ${problemDescription}
Context/Logs: ${contextLogs || 'None provided'}
Desired Outcome: ${targetOutcome || 'Optimal resolution with minimal blast radius'}

Return a structured JSON with:
1. clarifiedStatement: Clean, unambiguous problem definition.
2. rootCauseHypotheses: List of potential causes ranked by likelihood.
3. missingInformation: Information or telemetry needed to complete diagnosis if requirements are vague.
4. actionPlan: Ordered list of concrete, verifiable steps to resolve the issue.
5. preventativeMeasures: How to avoid this issue in the future.
`;

    const aiResponse = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
      },
    });

    const parsedResolution = JSON.parse(aiResponse.text || '{}');
    const workspaceId = `ws_${Date.now()}`;
    workspacesDb.set(workspaceId, {
      id: workspaceId,
      userId: req.user?.id,
      domain,
      input: req.body,
      resolution: parsedResolution,
      createdAt: new Date().toISOString(),
    });

    res.json({
      workspaceId,
      resolution: parsedResolution,
    });
  } catch (error: any) {
    res.status(500).json({ error: 'AI reasoning failed', message: error.message });
  }
});

// -----------------------------------------------------------------------------
// Server Management & Telemetry API
// -----------------------------------------------------------------------------
app.get('/api/v1/servers/health', requireAuth, (req: Request, res: Response) => {
  const memoryUsage = process.memoryUsage();
  const uptime = process.uptime();

  res.json({
    status: 'healthy',
    uptimeSeconds: Math.floor(uptime),
    timestamp: new Date().toISOString(),
    telemetry: {
      heapUsedMb: Math.round(memoryUsage.heapUsed / 1024 / 1024),
      heapTotalMb: Math.round(memoryUsage.heapTotal / 1024 / 1024),
      rssMb: Math.round(memoryUsage.rss / 1024 / 1024),
      activeHandles: (process as any)._getActiveHandles ? (process as any)._getActiveHandles().length : 'N/A',
    },
  });
});

app.post('/api/v1/servers/action', requireAuth, requireRole(['operator', 'admin']), (req: Request, res: Response) => {
  const { actionName, targetService } = req.body;
  const ALLOWED_ACTIONS = ['restart_service', 'flush_cache', 'rotate_logs'];

  if (!ALLOWED_ACTIONS.includes(actionName)) {
    res.status(400).json({ error: `Unauthorized action. Must be one of: ${ALLOWED_ACTIONS.join(', ')}` });
    return;
  }

  // Simulated controlled operation
  res.json({
    success: true,
    action: actionName,
    target: targetService || 'default_worker',
    executedBy: req.user?.email,
    timestamp: new Date().toISOString(),
    exitCode: 0,
    message: `Action ${actionName} dispatched successfully.`,
  });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`AI Problem-Solving & Server Management Server running on port ${PORT}`);
});
```

---

### 4.3 Minimal Viable Frontend Scaffold (React/TypeScript Workspace & Auth)
```tsx
// src/components/WorkspaceApp.tsx
import React, { useState, useEffect } from 'react';

interface User {
  id: string;
  email: string;
  role: 'viewer' | 'solver' | 'operator' | 'admin';
}

interface ProblemResolution {
  clarifiedStatement: string;
  rootCauseHypotheses: string[];
  missingInformation: string[];
  actionPlan: Array<{ step: number; action: string; validation: string }>;
  preventativeMeasures: string[];
}

export const WorkspaceApp: React.FC = () => {
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('auth_token'));
  const [user, setUser] = useState<User | null>(null);

  // Auth form state
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<'solver' | 'operator' | 'admin'>('solver');
  const [authError, setAuthError] = useState('');

  // Workspace form state
  const [domain, setDomain] = useState<'devops' | 'software' | 'database' | 'algorithms'>('devops');
  const [problemDescription, setProblemDescription] = useState('');
  const [contextLogs, setContextLogs] = useState('');
  const [loading, setLoading] = useState(false);
  const [resolution, setResolution] = useState<ProblemResolution | null>(null);

  // Server health state
  const [serverHealth, setServerHealth] = useState<any>(null);

  // Load user profile on token
  useEffect(() => {
    if (token) {
      fetch('/api/v1/user/me', {
        headers: { Authorization: `Bearer ${token}` },
      })
        .then((res) => (res.ok ? res.json() : Promise.reject()))
        .then((data) => setUser(data.user))
        .catch(() => logout());
      
      fetchServerHealth();
    }
  }, [token]);

  const fetchServerHealth = async () => {
    if (!token) return;
    try {
      const res = await fetch('/api/v1/servers/health', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setServerHealth(data);
      }
    } catch (err) {
      console.error('Health check failed', err);
    }
  };

  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');
    const endpoint = authMode === 'login' ? '/api/v1/auth/login' : '/api/v1/auth/register';
    const payload = authMode === 'login' ? { email, password } : { email, password, role };

    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Authentication failed');

      localStorage.setItem('auth_token', data.token);
      setToken(data.token);
      setUser(data.user);
    } catch (err: any) {
      setAuthError(err.message);
    }
  };

  const handleSolve = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;
    setLoading(true);
    setResolution(null);

    try {
      const res = await fetch('/api/v1/problems/decompose', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ domain, problemDescription, contextLogs }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to solve problem');
      setResolution(data.resolution);
    } catch (err: any) {
      alert(`Error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    localStorage.removeItem('auth_token');
    setToken(null);
    setUser(null);
  };

  // 1. Unauthenticated View: Login & Registration
  if (!token || !user) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-xl p-8 shadow-2xl">
          <h2 className="text-2xl font-bold text-center mb-2 tracking-tight">AI Problem-Solving Workspace</h2>
          <p className="text-sm text-slate-400 text-center mb-6">
            Sign in to access AI reasoning models, diagnostic sandboxes, and server telemetry.
          </p>

          {authError && (
            <div className="mb-4 p-3 bg-red-950/60 border border-red-800 text-red-200 text-sm rounded-lg">
              {authError}
            </div>
          )}

          <form onSubmit={handleAuthSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">
                Email
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-cyan-500"
                placeholder="devops@infrastructure.internal"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">
                Password
              </label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-cyan-500"
                placeholder="••••••••••••"
              />
            </div>

            {authMode === 'register' && (
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">
                  Access Role
                </label>
                <select
                  value={role}
                  onChange={(e: any) => setRole(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-cyan-500"
                >
                  <option value="solver">Solver (Create Workspaces & Run Diagnostics)</option>
                  <option value="operator">Operator (Server Restarts & Actions)</option>
                  <option value="admin">Administrator (Full Access)</option>
                </select>
              </div>
            )}

            <button
              type="submit"
              className="w-full bg-cyan-600 hover:bg-cyan-500 text-white font-medium py-2.5 rounded-lg text-sm transition-colors mt-2"
            >
              {authMode === 'login' ? 'Sign In to Workspace' : 'Create Account'}
            </button>
          </form>

          <div className="mt-6 text-center text-xs text-slate-400">
            {authMode === 'login' ? "Don't have an account? " : 'Already registered? '}
            <button
              type="button"
              onClick={() => setAuthMode(authMode === 'login' ? 'register' : 'login')}
              className="text-cyan-400 hover:underline font-semibold"
            >
              {authMode === 'login' ? 'Register here' : 'Sign in here'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // 2. Authenticated View: Problem Workspace & Server Telemetry
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      {/* Top Header */}
      <header className="bg-slate-900 border-b border-slate-800 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-cyan-600 flex items-center justify-center font-bold text-white text-sm">
            AI
          </div>
          <div>
            <h1 className="font-semibold text-sm leading-tight text-slate-100">AI Problem-Solving Workspace</h1>
            <p className="text-xs text-slate-400">Multi-Domain Reasoning & Systems Management</p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          {serverHealth && (
            <div className="flex items-center gap-2 bg-slate-800/80 px-3 py-1 rounded border border-slate-700 text-xs">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              <span className="text-slate-300">Server Health: {serverHealth.status}</span>
              <span className="text-slate-500">| Heap: {serverHealth.telemetry.heapUsedMb}MB</span>
            </div>
          )}

          <div className="text-xs text-right">
            <span className="block font-medium text-slate-200">{user.email}</span>
            <span className="inline-block text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-slate-800 text-cyan-400 border border-slate-700">
              {user.role}
            </span>
          </div>

          <button
            onClick={logout}
            className="text-xs bg-slate-800 hover:bg-slate-700 text-slate-300 px-3 py-1.5 rounded transition-colors border border-slate-700"
          >
            Logout
          </button>
        </div>
      </header>

      {/* Main Dual-Pane Workspace */}
      <main className="flex-1 grid grid-cols-1 lg:grid-cols-2 gap-6 p-6 overflow-hidden">
        {/* Left Pane: Input & Problem Statement */}
        <section className="bg-slate-900 border border-slate-800 rounded-xl p-6 flex flex-col">
          <h2 className="text-lg font-semibold text-slate-200 mb-1">Define Problem or Incident</h2>
          <p className="text-xs text-slate-400 mb-4">
            Input unstructured problem context, partial log dumps, or mathematical constraints.
          </p>

          <form onSubmit={handleSolve} className="flex-1 flex flex-col space-y-4">
            <div>
              <label className="block text-xs font-semibold uppercase text-slate-400 mb-1">Domain</label>
              <select
                value={domain}
                onChange={(e: any) => setDomain(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200"
              >
                <option value="devops">DevOps & Cloud Systems</option>
                <option value="software">Software Architecture & Bugs</option>
                <option value="database">Database & Query Performance</option>
                <option value="algorithms">Algorithms & Logic Puzzles</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase text-slate-400 mb-1">
                Problem Statement / Symptoms
              </label>
              <textarea
                required
                rows={4}
                value={problemDescription}
                onChange={(e) => setProblemDescription(e.target.value)}
                placeholder="Describe symptoms, expected behavior, or mathematical prompt..."
                className="w-full bg-slate-800 border border-slate-700 rounded-lg p-3 text-sm text-slate-200 focus:outline-none focus:border-cyan-500 font-mono"
              />
            </div>

            <div className="flex-1 flex flex-col">
              <label className="block text-xs font-semibold uppercase text-slate-400 mb-1">
                Context Telemetry / Stack Trace (Optional)
              </label>
              <textarea
                rows={5}
                value={contextLogs}
                onChange={(e) => setContextLogs(e.target.value)}
                placeholder="Paste stack traces, system logs, query EXPLAIN ANALYZE results, or partial code..."
                className="w-full flex-1 bg-slate-800 border border-slate-700 rounded-lg p-3 text-xs text-slate-200 focus:outline-none focus:border-cyan-500 font-mono"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-cyan-600 hover:bg-cyan-500 disabled:bg-slate-800 text-white font-medium py-2.5 rounded-lg text-sm transition-colors"
            >
              {loading ? 'AI Reasoning in Progress...' : 'Run Tree-of-Thought Decomposition'}
            </button>
          </form>
        </section>

        {/* Right Pane: AI Reasoning & Resolution Output */}
        <section className="bg-slate-900 border border-slate-800 rounded-xl p-6 flex flex-col overflow-y-auto max-h-[82vh]">
          <h2 className="text-lg font-semibold text-slate-200 mb-1">AI Reasoning Canvas</h2>
          <p className="text-xs text-slate-400 mb-4">
            Decomposed root-cause hypotheses, missing prerequisites, and resolution steps.
          </p>

          {!resolution && !loading && (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-8 border border-dashed border-slate-800 rounded-lg">
              <p className="text-sm text-slate-500 font-medium">Ready for problem submission</p>
              <p className="text-xs text-slate-600 mt-1 max-w-sm">
                Submit a problem on the left to trigger multi-step reasoning, root cause isolation, and verified action steps.
              </p>
            </div>
          )}

          {loading && (
            <div className="flex-1 flex flex-col items-center justify-center p-8">
              <div className="w-8 h-8 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin mb-4"></div>
              <p className="text-sm text-slate-300 font-medium">Synthesizing domain knowledge...</p>
              <p className="text-xs text-slate-500 mt-1">Evaluating hypotheses and isolating potential variables</p>
            </div>
          )}

          {resolution && (
            <div className="space-y-6">
              {/* Clarified Problem Definition */}
              <div className="bg-slate-800/60 border border-slate-700/80 rounded-lg p-4">
                <h3 className="text-xs font-bold uppercase tracking-wider text-cyan-400 mb-1">Clarified Problem</h3>
                <p className="text-sm text-slate-200">{resolution.clarifiedStatement}</p>
              </div>

              {/* Hypotheses */}
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
                  Root Cause Hypotheses
                </h3>
                <div className="space-y-2">
                  {resolution.rootCauseHypotheses?.map((hypo, idx) => (
                    <div key={idx} className="flex gap-2 text-xs bg-slate-800/40 p-2.5 rounded border border-slate-800">
                      <span className="font-bold text-cyan-400">#{idx + 1}</span>
                      <span className="text-slate-300">{hypo}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Missing Information / Progressive Refinement */}
              {resolution.missingInformation?.length > 0 && (
                <div className="bg-amber-950/30 border border-amber-800/50 rounded-lg p-3">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-amber-400 mb-1">
                    Progressive Refinement Needed
                  </h3>
                  <ul className="list-disc list-inside text-xs text-amber-200/90 space-y-1">
                    {resolution.missingInformation.map((info, idx) => (
                      <li key={idx}>{info}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Action Plan */}
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
                  Action Plan & Verifications
                </h3>
                <div className="space-y-3">
                  {resolution.actionPlan?.map((item: any, idx) => (
                    <div key={idx} className="bg-slate-800/70 border border-slate-700 rounded-lg p-3 text-xs space-y-1">
                      <div className="font-semibold text-slate-200">
                        Step {item.step || idx + 1}: {item.action}
                      </div>
                      <div className="text-slate-400">
                        <span className="text-slate-500 font-mono">Validation:</span> {item.validation}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </section>
      </main>
    </div>
  );
};
```

---

### 4.4 Local Setup & Deployment Instructions

#### Local Development Run
```bash
# 1. Clone repository and install dependencies
git clone <repo-url>
cd ai-problem-solver
npm install

# 2. Configure environment variables in .env
cat <<EOF > .env
PORT=3000
NODE_ENV=development
JWT_SECRET=production_quality_super_random_jwt_secret_token_12345
GEMINI_API_KEY=your_gemini_api_key_here
DATABASE_URL=postgres://postgres:postgres@localhost:5432/problemsolver
EOF

# 3. Start TypeScript backend and dev server
npm run dev
# The application is available at http://localhost:3000
```

#### Production Container Deployment (Docker / Cloud Run)
```dockerfile
# Dockerfile
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json tsconfig.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY package*.json ./
RUN npm ci --only=production
COPY --from=builder /app/dist ./dist
EXPOSE 3000
CMD ["node", "dist/server.js"]
```

---

## 5. Assumptions and Constraints

1. **Stack & Runtime Assumptions**:
   - Node.js LTS (v20+) runtime environment with ES module support.
   - Dual-tier relational persistence (PostgreSQL for user state, workspaces, and audit trails; Redis for real-time telemetry caching and token revocation).
   - Upstream AI SDK: `@google/genai` (Gemini API) utilizing `gemini-2.5-flash` for high throughput and structured JSON outputs.

2. **Security & Deployment Constraints**:
   - Zero-trust principle for server operations: Remote execution accepts only pre-registered structured enum actions with typed parameters; never arbitrary shell strings.
   - Non-negotiable OWASP compliance: Salted Argon2id/Bcrypt password hashes, 15-minute access token lifespan, HttpOnly/SameSite refresh tokens.
   - Progressive Enhancement: Incomplete or ambiguous inputs are not rejected with generic errors; instead, the AI model generates targeted diagnostic inquiries before proposing remediation paths.
