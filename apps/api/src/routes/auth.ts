import { Router } from "express";
import registerRouter from "../modules/auth/register.js";
import loginRouter from "../modules/auth/login.js";
import sessionRouter from "../modules/auth/session.js";
import meRouter from "../modules/auth/me.js";
import oauthRouter from "../modules/auth/oauth.js";
import passwordRouter from "../modules/auth/password.js";

/**
 * Auth routes. The former 532-line monolith is split by concern into
 * sub-routers under `modules/auth/`, each < 400 lines. All sub-routers mount at
 * the same `/api/auth` base so endpoint paths, methods, and payloads are
 * unchanged. Shared token/cookie helpers live in `modules/auth/shared.ts`.
 */
const router = Router();

router.use(registerRouter);
router.use(loginRouter);
router.use(sessionRouter);
router.use(meRouter);
router.use(oauthRouter);
router.use(passwordRouter);

export default router;

// Re-exported for reuse at other password boundaries (e.g. users change-password).
export { passwordSchema } from "../modules/auth/shared.js";
