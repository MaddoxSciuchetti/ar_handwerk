import { GetObjectCommand, ListObjectsV2Command, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const PRESIGN_TTL_SECONDS = 60 * 60;
const VIDEO_EXTENSIONS = [".mp4", ".mov", ".webm", ".m4v"];

export type R2ObjectSummary = {
  key: string;
  lastModified: string | null;
  sizeBytes: number | null;
};

function isVideoKey(key: string): boolean {
  const lower = key.toLowerCase();
  return VIDEO_EXTENSIONS.some((ext) => lower.endsWith(ext));
}

function titleFromKey(key: string): string {
  const filename = key.split("/").pop() ?? key;
  const withoutExt = filename.replace(/\.[^.]+$/, "");
  return withoutExt.replace(/[-_]+/g, " ").replace(/\b\w/g, (char) => char.toUpperCase());
}

function getR2Config() {
  const accountId = process.env.R2_ACCOUNT_ID;
  const accessKeyId = process.env.R2_ACCESS_KEY_ID;
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
  const bucketName = process.env.R2_BUCKET_NAME;

  if (!accountId || !accessKeyId || !secretAccessKey || !bucketName) {
    throw new Error("R2 storage is not fully configured");
  }

  return { accountId, accessKeyId, secretAccessKey, bucketName };
}

let r2Client: S3Client | null = null;

function getR2Client(): S3Client {
  if (r2Client) return r2Client;

  const { accountId, accessKeyId, secretAccessKey } = getR2Config();
  r2Client = new S3Client({
    region: "auto",
    endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId,
      secretAccessKey,
    },
  });

  return r2Client;
}

export async function listR2VideoObjects(prefix = ""): Promise<R2ObjectSummary[]> {
  const { bucketName } = getR2Config();
  const client = getR2Client();
  const objects: R2ObjectSummary[] = [];
  let continuationToken: string | undefined;

  do {
    const response = await client.send(
      new ListObjectsV2Command({
        Bucket: bucketName,
        Prefix: prefix || undefined,
        ContinuationToken: continuationToken,
      })
    );

    for (const item of response.Contents ?? []) {
      if (!item.Key || !isVideoKey(item.Key)) continue;
      objects.push({
        key: item.Key,
        lastModified: item.LastModified?.toISOString() ?? null,
        sizeBytes: item.Size ?? null,
      });
    }

    continuationToken = response.IsTruncated ? response.NextContinuationToken : undefined;
  } while (continuationToken);

  return objects.sort((a, b) => {
    const aTime = a.lastModified ? Date.parse(a.lastModified) : 0;
    const bTime = b.lastModified ? Date.parse(b.lastModified) : 0;
    return bTime - aTime;
  });
}

export function getVideoTitleFromR2Key(key: string): string {
  return titleFromKey(key);
}

export async function getPresignedR2Url(key: string): Promise<string> {
  const { bucketName } = getR2Config();
  const command = new GetObjectCommand({
    Bucket: bucketName,
    Key: key,
  });

  return getSignedUrl(getR2Client(), command, {
    expiresIn: PRESIGN_TTL_SECONDS,
  });
}

export function isR2Configured(): boolean {
  return Boolean(
    process.env.R2_ACCOUNT_ID &&
      process.env.R2_ACCESS_KEY_ID &&
      process.env.R2_SECRET_ACCESS_KEY &&
      process.env.R2_BUCKET_NAME
  );
}
