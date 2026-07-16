/**
 * Purpose: Stores backup artifacts locally and optionally in S3-compatible object storage.
 */
import { GetObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { createReadStream } from "node:fs";
import { copyFile, mkdir, stat, writeFile } from "node:fs/promises";
import { basename, resolve } from "node:path";

export type StoredArtifact = {
  storageUrl: string;
  bytes: number;
};

export async function storeBackupArtifact(path: string): Promise<StoredArtifact> {
  const stats = await stat(path);
  const s3Bucket = process.env.BACKUP_S3_BUCKET;

  if (s3Bucket) {
    const keyPrefix = process.env.BACKUP_S3_PREFIX ?? "ai-sports-prediction/backups";
    const key = `${keyPrefix.replace(/\/+$/, "")}/${basename(path)}`;
    const client = new S3Client({
      region: process.env.BACKUP_S3_REGION ?? process.env.AWS_REGION ?? "auto",
      endpoint: process.env.BACKUP_S3_ENDPOINT,
      forcePathStyle: process.env.BACKUP_S3_FORCE_PATH_STYLE === "1"
    });

    await client.send(new PutObjectCommand({
      Bucket: s3Bucket,
      Key: key,
      Body: createReadStream(path)
    }));

    return {
      storageUrl: `s3://${s3Bucket}/${key}`,
      bytes: stats.size
    };
  }

  await mkdir(resolve(process.env.POSTGRES_BACKUP_DIR ?? "exports/postgres-backups"), { recursive: true });
  return {
    storageUrl: `file://${resolve(path)}`,
    bytes: stats.size
  };
}

export async function downloadStoredArtifact(storageUrl: string, destination: string) {
  const parsed = new URL(storageUrl);
  if (parsed.protocol === "file:") {
    await copyFile(parsed.pathname, destination);
    return destination;
  }
  if (parsed.protocol !== "s3:") {
    throw new Error(`Unsupported backup storage URL: ${parsed.protocol}`);
  }

  const bucket = parsed.hostname;
  const key = parsed.pathname.replace(/^\/+/, "");
  const client = new S3Client({
    region: process.env.BACKUP_S3_REGION ?? process.env.AWS_REGION ?? "eu-central-1",
    endpoint: process.env.BACKUP_S3_ENDPOINT,
    forcePathStyle: process.env.BACKUP_S3_FORCE_PATH_STYLE === "1"
  });
  const object = await client.send(new GetObjectCommand({ Bucket: bucket, Key: key }));
  if (!object.Body) throw new Error("Stored backup object has no body.");
  await writeFile(destination, await object.Body.transformToByteArray());
  return destination;
}
