import {
  S3Client,
  GetObjectCommand,
  PutObjectCommand,
  DeleteObjectCommand,
  type PutObjectCommandInput,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

// S3-compatible object storage. Works against Cloudflare R2 (prod) or any
// S3-compatible endpoint in dev — only the env vars change, never the code.
// Keep usage to the common subset (put/get/delete/presign) so it stays portable.

let cachedClient: S3Client | null = null;

function env(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`${name} is not set`);
  return v;
}

export function s3(): S3Client {
  if (cachedClient) return cachedClient;
  cachedClient = new S3Client({
    endpoint: env("S3_ENDPOINT"),
    region: env("S3_REGION"),
    credentials: {
      accessKeyId: env("S3_ACCESS_KEY"),
      secretAccessKey: env("S3_SECRET_KEY"),
    },
    forcePathStyle: process.env.S3_FORCE_PATH_STYLE === "true",
  });
  return cachedClient;
}

function bucket(): string {
  return env("S3_BUCKET");
}

export async function putObject(
  key: string,
  body: PutObjectCommandInput["Body"],
  contentType?: string
): Promise<void> {
  await s3().send(
    new PutObjectCommand({
      Bucket: bucket(),
      Key: key,
      Body: body,
      ContentType: contentType,
    })
  );
}

export async function getObject(key: string): Promise<Uint8Array> {
  const res = await s3().send(new GetObjectCommand({ Bucket: bucket(), Key: key }));
  return res.Body!.transformToByteArray();
}

export async function deleteObject(key: string): Promise<void> {
  await s3().send(new DeleteObjectCommand({ Bucket: bucket(), Key: key }));
}

// Presigned URL for direct client upload/download without proxying bytes through
// the app. `expiresIn` is seconds (default 1h).
export async function presignGet(key: string, expiresIn = 3600): Promise<string> {
  return getSignedUrl(s3(), new GetObjectCommand({ Bucket: bucket(), Key: key }), {
    expiresIn,
  });
}

export async function presignPut(
  key: string,
  contentType?: string,
  expiresIn = 3600
): Promise<string> {
  return getSignedUrl(
    s3(),
    new PutObjectCommand({ Bucket: bucket(), Key: key, ContentType: contentType }),
    { expiresIn }
  );
}
