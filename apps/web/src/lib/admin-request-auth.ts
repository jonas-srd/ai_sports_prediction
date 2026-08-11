import type { NextRequest } from "next/server";
import {
  ADMIN_SESSION_COOKIE,
  getAdminSessionSecret,
  getAllowedAdminEmails,
  verifyAdminSession,
  type AdminSession
} from "@/lib/admin-session";

export async function isAdminRequestAuthorized(request: NextRequest): Promise<boolean> {
  return Boolean(await getAuthorizedAdminSession(request));
}

export async function getAuthorizedAdminSession(
  request: NextRequest
): Promise<AdminSession | null> {
  const secret = getAdminSessionSecret();
  const allowedEmails = getAllowedAdminEmails();
  const token = request.cookies.get(ADMIN_SESSION_COOKIE)?.value ?? "";
  if (!secret || allowedEmails.size === 0 || !token) {
    return null;
  }

  return verifyAdminSession(token, secret, allowedEmails);
}
