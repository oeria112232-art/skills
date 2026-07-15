import { Router, type IRouter } from "express";
import { requireAuth, type AuthenticatedRequest } from "../middlewares/auth";
import { db, platformSettingsTable } from "@workspace/db";
import { S3Client, GetObjectCommand, HeadObjectCommand } from "@aws-sdk/client-s3";
import jwt from "jsonwebtoken";
import { Readable } from "node:stream";
import fs from "fs";
import path from "path";

const router: IRouter = Router();

import { JWT_SECRET } from "../lib/secrets";

async function getR2Config() {
  const settings = await db.select().from(platformSettingsTable);
  const map: Record<string, string> = {};
  for (const s of settings) map[s.key] = s.value;
  return {
    accountId: map["r2_account_id"] || "",
    accessKeyId: map["r2_access_key_id"] || "",
    secretAccessKey: map["r2_secret_access_key"] || "",
    bucket: map["r2_bucket_name"] || "",
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

const MIME_MAP: Record<string, string> = {
  mp4: "video/mp4",
  webm: "video/webm",
  mov: "video/quicktime",
  mkv: "video/x-matroska",
  avi: "video/x-msvideo",
  m4v: "video/x-m4v",
};

function streamToResponse(stream: Readable, res: any): Promise<void> {
  return new Promise((resolve, reject) => {
    stream.on("end", resolve);
    stream.on("error", reject);
    stream.pipe(res);
  });
}

router.get("/video-stream", async (req: any, res): Promise<void> => {
  try {
    const queryToken = req.query.token as string;
    const authHeader = req.headers.authorization;
    const token = queryToken || (authHeader ? authHeader.replace("Bearer ", "") : null);

    if (!token) {
      res.status(401).json({ error: "Authentication required" });
      return;
    }

    let userId: number;
    try {
      const decoded = jwt.verify(token, JWT_SECRET) as any;
      userId = decoded.userId;
    } catch {
      res.status(401).json({ error: "Invalid or expired token" });
      return;
    }

    const key = req.query.key as string;
    if (!key) {
      res.status(400).json({ error: "key query parameter required" });
      return;
    }
    if (key.includes("..") || key.includes("\\") || key.includes(":")) {
      res.status(400).json({ error: "Invalid key format" });
      return;
    }

    const config = await getR2Config();
    const isLocalPath = key.startsWith("uploads/");
    const isR2Configured = !!(config.accountId && config.accessKeyId && config.secretAccessKey && config.bucket);

    if (isLocalPath || !isR2Configured) {
      console.warn("Serving video locally for key:", key);
      const filename = path.basename(key);
      const localFilePath = path.resolve(import.meta.dirname, "../../../uploads/videos", filename);
      if (fs.existsSync(localFilePath)) {
        res.sendFile(localFilePath);
        return;
      }

      const altLocalFilePath = path.resolve(import.meta.dirname, "../../../uploads", filename);
      if (fs.existsSync(altLocalFilePath)) {
        res.sendFile(altLocalFilePath);
        return;
      }

      res.status(404).json({ error: "Video file not found locally" });
      return;
    }

    const ext = key.split(".").pop()?.toLowerCase() || "mp4";
    const contentType = MIME_MAP[ext] || "video/mp4";

    const s3 = getR2Client(config);

    const headResult = await s3.send(new HeadObjectCommand({
      Bucket: config.bucket,
      Key: key,
    }));
    const fileSize = headResult.ContentLength || 0;

    const range = req.headers.range;

    if (range) {
      const parts = range.replace(/bytes=/, "").split("-");
      const start = parseInt(parts[0], 10);
      const end = parts[1] ? parseInt(parts[1], 10) : Math.min(start + 10 * 1024 * 1024 - 1, fileSize - 1);
      const chunkSize = end - start + 1;

      const streamResult = await s3.send(new GetObjectCommand({
        Bucket: config.bucket,
        Key: key,
        Range: `bytes=${start}-${end}`,
      }));

      res.writeHead(206, {
        "Content-Range": `bytes ${start}-${end}/${fileSize}`,
        "Accept-Ranges": "bytes",
        "Content-Length": chunkSize,
        "Content-Type": contentType,
        "Cache-Control": "private, no-cache, no-store, must-revalidate",
      });

      if (streamResult.Body) {
        await streamToResponse(streamResult.Body as unknown as Readable, res);
      } else {
        res.end();
      }
    } else {
      const streamResult = await s3.send(new GetObjectCommand({
        Bucket: config.bucket,
        Key: key,
      }));

      res.writeHead(200, {
        "Content-Length": fileSize,
        "Content-Type": contentType,
        "Accept-Ranges": "bytes",
        "Cache-Control": "private, no-cache, no-store, must-revalidate",
      });

      if (streamResult.Body) {
        await streamToResponse(streamResult.Body as unknown as Readable, res);
      } else {
        res.end();
      }
    }
  } catch (err: any) {
    console.error("Video stream error:", err);
    if (!res.headersSent) {
      if (err.name === "NoSuchKey" || err.$metadata?.httpStatusCode === 404) {
        res.status(404).json({ error: "Video not found" });
      } else {
        res.status(500).json({ error: "Failed to stream video" });
      }
    }
  }
});

export default router;
