import { isBackupDownloadAuthorized, listBackupFiles } from "@/lib/backup-storage";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: Request) {
  if (!isBackupDownloadAuthorized(request)) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const backups = await listBackupFiles();
  return Response.json({ backups });
}
