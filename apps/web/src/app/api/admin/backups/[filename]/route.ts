import { getBackupDownload, isBackupDownloadAuthorized } from "@/lib/backup-storage";
import { Readable } from "node:stream";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(
  request: Request,
  { params }: { params: { filename: string } | Promise<{ filename: string }> }
) {
  if (!isBackupDownloadAuthorized(request)) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { filename } = await params;
  const backup = await getBackupDownload(filename);

  if (!backup) {
    return Response.json({ error: "Backup not found" }, { status: 404 });
  }

  return new Response(Readable.toWeb(backup.stream) as unknown as BodyInit, {
    headers: {
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Content-Length": String(backup.bytes),
      "Content-Type": "application/gzip"
    }
  });
}
