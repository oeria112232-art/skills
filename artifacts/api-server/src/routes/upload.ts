import { Router, type IRouter } from "express";
import { requireAuth, requireRole, type AuthenticatedRequest } from "../middlewares/auth";
import { rateLimit } from "../middlewares/rateLimit";
import { db, platformSettingsTable } from "@workspace/db";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { compressVideo } from "../services/video-compress";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const router: IRouter = Router();

const uploadRateLimit = rateLimit({
  windowMs: 60 * 1000,
  max: 5,
  keyPrefix: "rl:upload",
  message: "تم تجاوز حد رفع الملفات. يرجى المحاولة بعد دقيقة.",
});

async function getR2Config() {
  const settings = await db.select().from(platformSettingsTable);
  const map: Record<string, string> = {};
  for (const s of settings) map[s.key] = s.value;
  return {
    accountId: map["r2_account_id"] || "",
    accessKeyId: map["r2_access_key_id"] || "",
    secretAccessKey: map["r2_secret_access_key"] || "",
    bucket: map["r2_bucket_name"] || "",
    publicDomain: map["r2_public_domain"] || "",
  };
}

function getR2Client(config: { accountId: string; accessKeyId: string; secretAccessKey: string }) {
  return new S3Client({
    region: "auto",
    endpoint: `https://${config.accountId}.r2.cloudflarestorage.com`,
    forcePathStyle: true,
    credentials: {
      accessKeyId: config.accessKeyId,
      secretAccessKey: config.secretAccessKey,
    },
  });
}

const MAX_BASE64_BYTES = 200 * 1024 * 1024;

router.post("/upload/video", requireAuth, requireRole(["admin", "instructor"]), uploadRateLimit, async (req: AuthenticatedRequest, res): Promise<void> => {
  try {
    const { file, fileName, folder, quality } = req.body;
    if (!file) { res.status(400).json({ error: "No file data provided" }); return; }

    const config = await getR2Config();
    const useLocalFallback = !config.accountId || !config.accessKeyId || !config.secretAccessKey || !config.bucket;

    const base64Data = file.includes(",") ? file.split(",")[1] : file;
    const inputBuffer = Buffer.from(base64Data, "base64");

    if (inputBuffer.byteLength > MAX_BASE64_BYTES) {
      res.status(413).json({ error: "File too large. Maximum size is 200MB." });
      return;
    }

    const mimeType = (file.substring(5, file.indexOf(";")) || "video/mp4");

    // Validate video MIME type
    const ALLOWED_VIDEO_TYPES = ["video/mp4", "video/webm", "video/quicktime", "video/x-msvideo"];
    if (!ALLOWED_VIDEO_TYPES.includes(mimeType)) {
      res.status(400).json({ error: "Invalid video type. Allowed: mp4, webm, mov, avi" });
      return;
    }

    const inputSize = inputBuffer.byteLength;

    let uploadBuffer: Buffer;
    let uploadMime: string;
    let compressionStats: any = null;

    if (mimeType.startsWith("video/") && inputSize > 500 * 1024) {
      try {
        const qualityPresets: Record<string, { crf: number; maxWidth: number; maxHeight: number; fps: number }> = {
          low:    { crf: 32, maxWidth: 640,  maxHeight: 360, fps: 24 },
          medium: { crf: 28, maxWidth: 1280, maxHeight: 720, fps: 30 },
          high:   { crf: 23, maxWidth: 1920, maxHeight: 1080, fps: 30 },
        };
        const preset = qualityPresets[quality || "medium"] || qualityPresets.medium;

        const result = await compressVideo(inputBuffer, mimeType, {
          crf: preset.crf,
          maxWidth: preset.maxWidth,
          maxHeight: preset.maxHeight,
          fps: preset.fps,
          preset: "fast",
          audioBitrate: "96k",
        });

        uploadBuffer = result.buffer;
        uploadMime = result.mime;
        compressionStats = {
          originalSize: inputSize,
          compressedSize: result.buffer.byteLength,
          ratio: result.stats.compressionRatio,
          duration: result.stats.duration,
        };
      } catch (compressErr: any) {
        console.warn("Compression failed, uploading original:", compressErr.message);
        uploadBuffer = inputBuffer;
        uploadMime = mimeType;
      }
    } else {
      uploadBuffer = inputBuffer;
      uploadMime = mimeType;
    }

    const ext = uploadMime.includes("webm") ? "webm" : "mp4";
    const safeName = (fileName || `video-${Date.now()}`).replace(/[^a-zA-Z0-9._-]/g, "_").replace(/\.[^.]+$/, "");
    const finalFileName = `${safeName}-${Date.now()}.${ext}`;
    const key = `${folder || "eduplat/videos"}/${finalFileName}`;

    if (useLocalFallback) {
      console.warn("R2 is not configured. Saving uploaded video locally.");
      const uploadsDir = path.resolve(__dirname, "../../../uploads/videos");
      if (!fs.existsSync(uploadsDir)) {
        fs.mkdirSync(uploadsDir, { recursive: true });
      }
      const filePath = path.join(uploadsDir, finalFileName);
      fs.writeFileSync(filePath, uploadBuffer);

      res.json({
        url: `/api/uploads/videos/${finalFileName}`,
        publicId: `uploads/videos/${finalFileName}`,
        format: ext,
        bytes: uploadBuffer.byteLength,
        size: (uploadBuffer.byteLength / (1024 * 1024)).toFixed(2) + " MB",
        ...(compressionStats ? { compressed: compressionStats } : {}),
      });
      return;
    }

    const s3 = getR2Client(config);

    await s3.send(new PutObjectCommand({
      Bucket: config.bucket,
      Key: key,
      Body: uploadBuffer,
      ContentType: uploadMime,
    }));

    const publicUrl = config.publicDomain
      ? `${config.publicDomain.replace(/\/$/, "")}/${key}`
      : `https://${config.bucket}.${config.accountId}.r2.dev/${key}`;

    res.json({
      url: publicUrl,
      publicId: key,
      format: ext,
      bytes: uploadBuffer.byteLength,
      size: (uploadBuffer.byteLength / (1024 * 1024)).toFixed(2) + " MB",
      ...(compressionStats ? { compressed: compressionStats } : {}),
    });
  } catch (e: any) {
    console.error("Upload error:", e);
    res.status(500).json({ error: "Upload failed. Please try again." });
  }
});

export default router;
