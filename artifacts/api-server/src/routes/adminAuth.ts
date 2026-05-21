import { Router, type IRouter, type Request, type Response } from "express";
import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { db, usersTable } from "@workspace/db";
import {
  GetCurrentAuthUserResponse,
  LoginAdminWithPasswordBody,
  LogoutAdminSessionResponse,
} from "@workspace/api-zod";
import {
  createSession,
  clearSession,
  getSessionId,
  isAdminEmail,
  SESSION_COOKIE,
  SESSION_TTL,
  type SessionData,
} from "../lib/auth";
import { loginRateLimiter } from "../lib/rateLimiter";

// Constant placeholder hash used to keep bcrypt.compare timing equivalent
// for missing-user / no-password-hash branches. The actual value never
// matches a real password — its sole purpose is to spend the same CPU as
// a real comparison so attackers cannot enumerate admin emails by timing.
//
// IMPORTANT: this MUST be a valid 60-char $2b$12$ bcrypt hash matching the
// cost factor used in production (12). bcryptjs short-circuits on malformed
// hashes and returns false in <1ms, which would defeat the whole point.
// Generated once with bcrypt.hashSync("<placeholder>", 12) — the plaintext
// was discarded; only the hash is kept.
const DUMMY_BCRYPT_HASH =
  "$2b$12$mdG.GFV2AeTLd972juUkKOaJIEYhwjIIiHTYoO1JDV1aFWhwgueLO";

const router: IRouter = Router();

function setSessionCookie(res: Response, sid: string) {
  res.cookie(SESSION_COOKIE, sid, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_TTL,
  });
}

/**
 * Email + password admin login. Used by the self-hosted (e.g. Hostinger)
 * deployment where Replit OIDC is unavailable. The user must:
 *   1. Have an email on the ADMIN_EMAILS allowlist.
 *   2. Have a row in `users` with a non-null `password_hash` whose
 *      bcrypt hash matches the supplied password.
 *
 * On success we create a session row keyed by a random sid, set the
 * `sid` cookie, and return the same `{ user }` envelope as
 * `GET /auth/user` so the existing `useAuth()` hook on the client just
 * works after a refetch.
 */
router.post("/admin-auth/login", loginRateLimiter, async (req: Request, res: Response) => {
  const parsed = LoginAdminWithPasswordBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Email and password are required" });
    return;
  }

  const email = parsed.data.email.trim().toLowerCase();
  const password = parsed.data.password;

  // Always look up the user AND run bcrypt.compare before checking the admin
  // allowlist. If we returned 403 early (before bcrypt), non-admin emails
  // would complete in <1ms while admin emails take ~100ms — leaking which
  // addresses are in ADMIN_EMAILS via timing. Doing DB + bcrypt first makes
  // every request take the same wall-clock time regardless of the allowlist.
  let user: typeof usersTable.$inferSelect | undefined;
  try {
    [user] = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.email, email))
      .limit(1);
  } catch {
    res.status(500).json({ error: "Database error. Please try again." });
    return;
  }

  // Always run bcrypt.compare — even when the user/hash is missing — so the
  // response timing for "no user", "wrong password", and "not admin" is
  // indistinguishable to an outside observer.
  const hashToCompare = user?.passwordHash ?? DUMMY_BCRYPT_HASH;
  const passwordOk = await bcrypt.compare(password, hashToCompare);

  // Admin allowlist check comes AFTER bcrypt so timing is uniform.
  if (!isAdminEmail(email)) {
    res.status(403).json({ error: "This email is not authorized for admin access." });
    return;
  }

  if (!user || !user.passwordHash || !passwordOk) {
    res.status(401).json({ error: "Email or password is incorrect." });
    return;
  }

  const authUser = {
    id: user.id,
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
    profileImageUrl: user.profileImageUrl,
    isAdmin: true,
  };

  const sessionData: SessionData = {
    user: authUser,
    // No OIDC tokens for password-based sessions — the auth middleware's
    // refresh path is short-circuited by the absent `expires_at`.
    access_token: "",
  };

  const sid = await createSession(sessionData);
  setSessionCookie(res, sid);

  res.json(GetCurrentAuthUserResponse.parse({ user: authUser }));
});

router.post("/admin-auth/logout", async (req: Request, res: Response) => {
  const sid = getSessionId(req);
  await clearSession(res, sid);
  res.json(LogoutAdminSessionResponse.parse({ success: true }));
});

export default router;
