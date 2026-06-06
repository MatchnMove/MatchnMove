import {
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import type { ServerSideEncryption } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

function getStorageConfig() {
  return {
    accessKeyId: process.env.STORAGE_ACCESS_KEY?.trim() ?? "",
    secretAccessKey: process.env.STORAGE_SECRET_KEY?.trim() ?? "",
    bucket: process.env.STORAGE_BUCKET?.trim() ?? "",
    region: process.env.STORAGE_REGION?.trim() || "auto",
    endpoint: process.env.STORAGE_ENDPOINT?.trim() || undefined,
    forcePathStyle: process.env.STORAGE_FORCE_PATH_STYLE === "true",
  };
}

export function isPrivateStorageConfigured() {
  const config = getStorageConfig();
  return Boolean(config.accessKeyId && config.secretAccessKey && config.bucket);
}

function getStorageClient() {
  const config = getStorageConfig();
  if (!isPrivateStorageConfigured()) {
    throw new Error("Private document storage is not configured.");
  }

  return {
    bucket: config.bucket,
    client: new S3Client({
      region: config.region,
      endpoint: config.endpoint,
      forcePathStyle: config.forcePathStyle,
      credentials: {
        accessKeyId: config.accessKeyId,
        secretAccessKey: config.secretAccessKey,
      },
    }),
  };
}

export async function putPrivateDocument(params: {
  key: string;
  body: Buffer;
  contentType: string;
  fileName: string;
  sha256: string;
}) {
  const { bucket, client } = getStorageClient();
  const configuredEncryption = process.env.STORAGE_SERVER_SIDE_ENCRYPTION;
  const serverSideEncryption: ServerSideEncryption =
    configuredEncryption === "aws:kms" || configuredEncryption === "aws:kms:dsse"
      ? configuredEncryption
      : "AES256";
  await client.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: params.key,
      Body: params.body,
      ContentType: params.contentType,
      Metadata: {
        originalname: encodeURIComponent(params.fileName),
        sha256: params.sha256,
      },
      ServerSideEncryption: serverSideEncryption,
    }),
  );
}

export async function deletePrivateDocument(key: string) {
  if (!isPrivateStorageConfigured()) return;
  const { bucket, client } = getStorageClient();
  await client.send(new DeleteObjectCommand({ Bucket: bucket, Key: key }));
}

export async function getPrivateDocumentUrl(key: string, fileName: string) {
  const { bucket, client } = getStorageClient();
  const configuredTtl = Number(process.env.STORAGE_SIGNED_URL_TTL_SECONDS);
  const expiresIn = Number.isFinite(configuredTtl)
    ? Math.min(Math.max(Math.floor(configuredTtl), 60), 900)
    : 300;

  return getSignedUrl(
    client,
    new GetObjectCommand({
      Bucket: bucket,
      Key: key,
      ResponseContentDisposition: `inline; filename="${fileName.replace(/[\r\n"]/g, "") || "document"}"`,
    }),
    { expiresIn },
  );
}
