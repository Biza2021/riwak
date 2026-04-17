import { GetObjectCommand, PutObjectCommand, DeleteObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { nanoid } from "nanoid";

import { MAX_VOICE_NOTE_FILE_BYTES } from "./domain";

const DEFAULT_REGION = "us-east-1";
const DEFAULT_SIGNED_URL_TTL_SECONDS = 60 * 60;

type VoiceNoteStorageConfig = {
  bucket: string;
  region: string;
  endpoint?: string;
  accessKeyId: string;
  secretAccessKey: string;
  forcePathStyle: boolean;
  signedUrlTtlSeconds: number;
};

type VoiceNoteInput = {
  customerId: string;
  dataUrl: string;
  mimeType: string;
  durationSec: number;
};

export type StoredVoiceNote = {
  storageKey: string;
  mimeType: string;
  durationSec: number;
  fileSizeBytes: number;
};

class VoiceNoteStorageError extends Error {
  constructor(
    readonly code: "NOT_CONFIGURED" | "INVALID_PAYLOAD" | "TOO_LARGE",
    message: string,
  ) {
    super(message);
    this.name = "VoiceNoteStorageError";
  }
}

let cachedClient: S3Client | null = null;
let cachedConfig: VoiceNoteStorageConfig | null | undefined;

function parseBooleanEnv(value: string | undefined, fallback = false) {
  if (!value) {
    return fallback;
  }

  return ["1", "true", "yes", "on"].includes(value.trim().toLowerCase());
}

function readConfig() {
  if (cachedConfig !== undefined) {
    return cachedConfig;
  }

  const bucket = process.env.S3_BUCKET?.trim() ?? "";
  const accessKeyId = process.env.S3_ACCESS_KEY_ID?.trim() ?? "";
  const secretAccessKey = process.env.S3_SECRET_ACCESS_KEY?.trim() ?? "";

  if (!bucket || !accessKeyId || !secretAccessKey) {
    cachedConfig = null;
    return cachedConfig;
  }

  cachedConfig = {
    bucket,
    region: process.env.S3_REGION?.trim() || DEFAULT_REGION,
    endpoint: process.env.S3_ENDPOINT?.trim() || undefined,
    accessKeyId,
    secretAccessKey,
    forcePathStyle: parseBooleanEnv(process.env.S3_FORCE_PATH_STYLE),
    signedUrlTtlSeconds:
      Number.parseInt(process.env.S3_SIGNED_URL_TTL_SECONDS?.trim() || "", 10) ||
      DEFAULT_SIGNED_URL_TTL_SECONDS,
  };

  return cachedConfig;
}

function getClient() {
  const config = readConfig();
  if (!config) {
    throw new VoiceNoteStorageError(
      "NOT_CONFIGURED",
      "Voice note storage is not configured.",
    );
  }

  if (!cachedClient) {
    cachedClient = new S3Client({
      region: config.region,
      endpoint: config.endpoint,
      forcePathStyle: config.forcePathStyle,
      credentials: {
        accessKeyId: config.accessKeyId,
        secretAccessKey: config.secretAccessKey,
      },
    });
  }

  return { client: cachedClient, config };
}

function resolveVoiceNoteExtension(mimeType: string) {
  if (mimeType.includes("ogg")) {
    return "ogg";
  }

  if (mimeType.includes("mpeg")) {
    return "mp3";
  }

  if (mimeType.includes("wav")) {
    return "wav";
  }

  return "webm";
}

function decodeVoiceNoteDataUrl(dataUrl: string, mimeType: string) {
  const expectedPrefix = `data:${mimeType};base64,`;
  if (!dataUrl.startsWith(expectedPrefix)) {
    throw new VoiceNoteStorageError(
      "INVALID_PAYLOAD",
      "Voice note payload is invalid.",
    );
  }

  const payload = dataUrl.slice(expectedPrefix.length);
  const bytes = Buffer.from(payload, "base64");

  if (bytes.length <= 0 || bytes.length > MAX_VOICE_NOTE_FILE_BYTES) {
    throw new VoiceNoteStorageError(
      "TOO_LARGE",
      "Voice note payload is too large.",
    );
  }

  return bytes;
}

export function isVoiceNoteStorageConfigured() {
  return readConfig() !== null;
}

export function isVoiceNoteStorageError(error: unknown): error is VoiceNoteStorageError {
  return error instanceof VoiceNoteStorageError;
}

export async function uploadVoiceNote(input: VoiceNoteInput): Promise<StoredVoiceNote> {
  const { client, config } = getClient();
  const body = decodeVoiceNoteDataUrl(input.dataUrl, input.mimeType);
  const extension = resolveVoiceNoteExtension(input.mimeType);
  const datePrefix = new Date().toISOString().slice(0, 10);
  const storageKey = `voice-notes/${datePrefix}/${input.customerId}-${nanoid(12)}.${extension}`;

  await client.send(
    new PutObjectCommand({
      Bucket: config.bucket,
      Key: storageKey,
      Body: body,
      ContentType: input.mimeType,
      ContentLength: body.length,
      ContentDisposition: "inline",
      CacheControl: "private, max-age=31536000, immutable",
    }),
  );

  return {
    storageKey,
    mimeType: input.mimeType,
    durationSec: input.durationSec,
    fileSizeBytes: body.length,
  };
}

export async function deleteVoiceNote(storageKey: string) {
  if (!storageKey || !isVoiceNoteStorageConfigured()) {
    return;
  }

  const { client, config } = getClient();

  await client.send(
    new DeleteObjectCommand({
      Bucket: config.bucket,
      Key: storageKey,
    }),
  );
}

export async function getVoiceNotePlaybackUrl(storageKey: string) {
  if (!storageKey || !isVoiceNoteStorageConfigured()) {
    return null;
  }

  const { client, config } = getClient();

  return getSignedUrl(
    client,
    new GetObjectCommand({
      Bucket: config.bucket,
      Key: storageKey,
      ResponseContentDisposition: "inline",
    }),
    {
      expiresIn: config.signedUrlTtlSeconds,
    },
  );
}
