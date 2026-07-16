import type { NextRequest } from "next/server";
import {
  ADMIN_SESSION_COOKIE,
  getAdminSessionSecret,
  getAllowedAdminEmails,
  verifyAdminSession
} from "@/lib/admin-session";

export async function isAdminRequestAuthorized(request: NextRequest): Promise<boolean> {
  const secret = getAdminSessionSecret();
  const allowedEmails = getAllowedAdminEmails();
  const token = request.cookies.get(ADMIN_SESSION_COOKIE)?.value ?? "";
  if (!secret || allowedEmails.size === 0 || !token) {
    return false;
  }

  return Boolean(await verifyAdminSession(token, secret, allowedEmails));
}
