import { GetObjectCommand, S3Client } from "@aws-sdk/client-s3";

export const runtime = "nodejs";

const MARKETING_ASSET_FILE = /^[A-Za-z0-9][A-Za-z0-9_-]{0,160}-(?:instagram_feed|instagram_story|social_landscape|tiktok_photo)\.jpg$/u;

export async function GET(
  _request: Request,
  context: { params: Promise<{ fileName: string }> }
): Promise<Response> {
  const { fileName } = await context.params;
  if (!MARKETING_ASSET_FILE.test(fileName)) {
    return new Response("Not found", { status: 404 });
  }

  const bucket = process.env.MARKETING_ASSET_S3_BUCKET?.trim();
  if (!bucket) {
    return new Response("Not found", { status: 404 });
  }

  const prefix = (
    process.env.MARKETING_ASSET_S3_PREFIX?.trim()
    || "ai-sports-prediction/backups/marketing-assets"
  )
    .replace(/^\/+|\/+$/gu, "");
  const endpoint = process.env.MARKETING_ASSET_S3_ENDPOINT?.trim();
  const client = new S3Client({
    region: process.env.MARKETING_ASSET_S3_REGION?.trim() || "eu-central-1",
    ...(endpoint ? { endpoint } : {}),
    forcePathStyle: ["1", "true", "yes"].includes(
      (process.env.MARKETING_ASSET_S3_FORCE_PATH_STYLE ?? "").trim().toLowerCase()
    )
  });

  try {
    const object = await client.send(new GetObjectCommand({
      Bucket: bucket,
      Key: `${prefix}/${fileName}`
    }));
    if (!object.Body) {
      return new Response("Not found", { status: 404 });
    }

    const bytes = await object.Body.transformToByteArray();
    const body = bytes.buffer.slice(
      bytes.byteOffset,
      bytes.byteOffset + bytes.byteLength
    ) as ArrayBuffer;
    return new Response(body, {
      headers: {
        "cache-control": "public, max-age=31536000, immutable",
        "content-type": object.ContentType || "image/jpeg",
        ...(object.ETag ? { etag: object.ETag } : {}),
        "x-content-type-options": "nosniff",
        "x-robots-tag": "noindex, nofollow"
      }
    });
  } catch {
    return new Response("Not found", { status: 404 });
  } finally {
    client.destroy();
  }
}
