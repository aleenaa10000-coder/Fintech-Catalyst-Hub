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
router.post("/admin-auth/login", async (req: Request, res: Response) => {
  const parsed = LoginAdminWithPasswordBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Email and password are required" });
    return;
  }

  const email = parsed.data.email.trim().toLowerCase();
  const password = parsed.data.password;

  if (!isAdminEmail(email)) {
    // Don't reveal whether the email exists — admin allowlist is the
    // first gate, so a non-allowlisted email always reads as 403.
    res.status(403).json({ error: "This email is not authorized for admin access." });
    return;
  }

  const [user] = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.email, email))
    .limit(1);

  if (!user || !user.passwordHash) {
    res.status(401).json({
      error: "Email or password is incorrect.",
    });
    return;
  }

  const ok = await bcrypt.compare(password, user.passwordHash);
  if (!ok) {
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
