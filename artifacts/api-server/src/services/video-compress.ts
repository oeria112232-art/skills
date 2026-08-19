import { execFile } from "node:child_process";
import { promisify } from "node:util";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";

const execFileAsync = promisify(execFile);

import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

let FFMPEG_PATH = process.env.FFMPEG_PATH || "";

if (!FFMPEG_PATH) {
  if (process.platform === "win32") {
    FFMPEG_PATH = path.resolve(__dirname, "../../../ffmpeg/ffmpeg.exe");
  } else {
    FFMPEG_PATH = "ffmpeg";
  }
}

function isFfmpegAvailable(): boolean {
  try {
    if (path.isAbsolute(FFMPEG_PATH) || FFMPEG_PATH.includes("/") || FFMPEG_PATH.includes("\\")) {
      return fs.existsSync(FFMPEG_PATH);
    }
    return true; // Assume global system command
  } catch {
    return false;
  }
}

export interface CompressOptions {
  maxWidth?: number;
  maxHeight?: number;
  crf?: number;
  preset?: string;
  audioBitrate?: string;
  fps?: number;
}

const DEFAULT_OPTIONS: CompressOptions = {
  maxWidth: 1280,
  maxHeight: 720,
  crf: 28,
  preset: "fast",
  audioBitrate: "96k",
  fps: 30,
};

export interface CompressResult {
  inputPath: string;
  outputPath: string;
  inputSize: number;
  outputSize: number;
  compressionRatio: string;
  duration: string;
}

export async function compressVideo(
  inputBuffer: Buffer,
  inputMime: string,
  options: CompressOptions = {}
): Promise<{ buffer: Buffer; mime: string; stats: CompressResult }> {
  const opts = { ...DEFAULT_OPTIONS, ...options };

  if (opts.maxWidth !== undefined) {
    const val = Number(opts.maxWidth);
    if (!Number.isInteger(val) || val < 120 || val > 7680) {
      throw new Error("Invalid maxWidth: must be an integer between 120 and 7680");
    }
    opts.maxWidth = val;
  }
  if (opts.maxHeight !== undefined) {
    const val = Number(opts.maxHeight);
    if (!Number.isInteger(val) || val < 120 || val > 7680) {
      throw new Error("Invalid maxHeight: must be an integer between 120 and 7680");
    }
    opts.maxHeight = val;
  }
  if (opts.crf !== undefined) {
    const val = Number(opts.crf);
    if (!Number.isInteger(val) || val < 0 || val > 51) {
      throw new Error("Invalid crf: must be an integer between 0 and 51");
    }
    opts.crf = val;
  }
  if (opts.fps !== undefined) {
    const val = Number(opts.fps);
    if (!Number.isInteger(val) || val < 1 || val > 120) {
      throw new Error("Invalid fps: must be an integer between 1 and 120");
    }
    opts.fps = val;
  }
  const validPresets = new Set(["ultrafast", "superfast", "veryfast", "faster", "fast", "medium", "slow", "slower", "veryslow", "placebo"]);
  if (opts.preset !== undefined && !validPresets.has(opts.preset)) {
    throw new Error("Invalid preset value");
  }
  if (opts.audioBitrate !== undefined && !/^\d+k$/.test(opts.audioBitrate)) {
    throw new Error("Invalid audioBitrate: must match pattern e.g., '128k'");
  }

  if (!isFfmpegAvailable()) {
    throw new Error("FFmpeg not available at " + FFMPEG_PATH);
  }

  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "video-compress-"));
  const ext = inputMime.includes("webm") ? "webm" : "mp4";
  const inputPath = path.join(tmpDir, `input.${ext}`);
  const outputPath = path.join(tmpDir, `output.${ext}`);

  try {
    fs.writeFileSync(inputPath, inputBuffer);
    const inputSize = fs.statSync(inputPath).size;

    const filterComplex = [
      `-vf`,
      `scale='min(${opts.maxWidth},iw)':min'(${opts.maxHeight},ih)':force_original_aspect_ratio=decrease:force_divisible_by=2`,
      `-r`,
      String(opts.fps),
      `-c:v`,
      `libx264`,
      `-preset`,
      opts.preset!,
      `-crf`,
      String(opts.crf),
      `-c:a`,
      `aac`,
      `-b:a`,
      opts.audioBitrate!,
      `-movflags`,
      `+faststart`,
      `-pix_fmt`,
      `yuv420p`,
    ];

    await execFileAsync(FFMPEG_PATH, [
      "-i",
      inputPath,
      ...filterComplex,
      "-y",
      outputPath,
    ], { timeout: 300000 });

    const outputBuffer = fs.readFileSync(outputPath);
    const outputSize = outputBuffer.length;
    const ratio =
      inputSize > 0
        ? ((1 - outputSize / inputSize) * 100).toFixed(1) + "%"
        : "0%";

    let duration = "unknown";
    try {
      const { stdout } = await execFileAsync(FFMPEG_PATH, [
        "-i",
        inputPath,
      ], { timeout: 10000 });
      const match = stdout.match(/Duration:\s*(\d{2}):(\d{2}):(\d{2})/);
      if (match) duration = `${match[1]}:${match[2]}:${match[3]}`;
    } catch {}

    return {
      buffer: outputBuffer,
      mime: "video/mp4",
      stats: {
        inputPath,
        outputPath,
        inputSize,
        outputSize,
        compressionRatio: ratio,
        duration,
      },
    };
  } catch (err: any) {
    try { fs.rmSync(tmpDir, { recursive: true, force: true }); } catch {}
    throw new Error(`FFmpeg compression failed: ${err.message}`);
  } finally {
    try { fs.rmSync(tmpDir, { recursive: true, force: true }); } catch {}
  }
}
