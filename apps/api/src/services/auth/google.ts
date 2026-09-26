import { OAuth2Client } from "google-auth-library";
import { env } from "../../config/env.js";

let client: OAuth2Client | null = null;

function getClient(): OAuth2Client {
  if (!client) {
    client = new OAuth2Client(
      env.GOOGLE_CLIENT_ID,
      env.GOOGLE_CLIENT_SECRET,
      env.GOOGLE_CALLBACK_URL,
    );
  }
  return client;
}

export function buildGoogleAuthUrl(state: string): string {
  return getClient().generateAuthUrl({
    access_type: "offline",
    scope: ["openid", "email", "profile"],
    state,
    prompt: "select_account",
  });
}

export type GoogleProfile = {
  email: string;
  name: string;
  avatarUrl: string | null;
  googleSub: string;
};

export async function exchangeGoogleCode(
  code: string,
): Promise<GoogleProfile> {
  const c = getClient();
  const { tokens } = await c.getToken(code);
  c.setCredentials(tokens);

  const ticket = await c.verifyIdToken({
    idToken: tokens.id_token!,
    audience: env.GOOGLE_CLIENT_ID,
  });

  const payload = ticket.getPayload();
  if (!payload || !payload.email) {
    throw new Error("Google profile missing email");
  }
  if (!payload.email_verified) {
    throw new Error("Google email not verified");
  }

  return {
    email: payload.email,
    name: payload.name ?? payload.email.split("@")[0] ?? payload.email,
    avatarUrl: payload.picture ?? null,
    googleSub: payload.sub,
  };
}
