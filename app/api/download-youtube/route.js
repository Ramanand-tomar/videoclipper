import { NextResponse } from "next/server";
import { spawn } from "child_process";
import path from "path";
import os from "os";
import fs from "fs";

export const runtime = "nodejs";

const YOUTUBE_URL_REGEX = /^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.be)\/.+$/;

export async function POST(req) {
  let tempFilePath = null;

  try {
    const { url } = await req.json();

    if (!url || typeof url !== "string") {
      return NextResponse.json(
        { error: "YouTube URL is required" },
        { status: 400 }
      );
    }

    if (!YOUTUBE_URL_REGEX.test(url.trim())) {
      return NextResponse.json(
        { error: "Invalid YouTube URL format" },
        { status: 400 }
      );
    }

    const videoUrl = url.trim();
    const uniqueId = `yt-download-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
    const tempDir = os.tmpdir();
    tempFilePath = path.join(tempDir, `${uniqueId}.mp4`);

    console.log(`[Backend] Starting YouTube download for URL: ${videoUrl}`);
    console.log(`[Backend] Destination: ${tempFilePath}`);

    // Build yt-dlp arguments
    const args = [
      "--format",
      "bestvideo[ext=mp4][height<=1080]+bestaudio[ext=m4a]/best[ext=mp4][height<=1080]",
      "--client-impersonate",
      "chrome",
      "-o",
      tempFilePath,
    ];

    // Configure cookies from browser if set
    if (process.env.YT_DLP_COOKIES_FROM_BROWSER) {
      args.push("--cookies-from-browser", process.env.YT_DLP_COOKIES_FROM_BROWSER);
      console.log(`[Backend] Using browser cookies from: ${process.env.YT_DLP_COOKIES_FROM_BROWSER}`);
    }

    // Configure cookies file if set
    if (process.env.YT_DLP_COOKIES_FILE) {
      const cookiesPath = path.resolve(process.env.YT_DLP_COOKIES_FILE);
      if (fs.existsSync(cookiesPath)) {
        args.push("--cookies", cookiesPath);
        console.log(`[Backend] Using cookies file from: ${cookiesPath}`);
      } else {
        console.warn(`[Backend] Configured cookies file not found at: ${cookiesPath}`);
      }
    }

    args.push(videoUrl);

    // Spawn yt-dlp process
    const ytDlpProcess = spawn("yt-dlp", args);

    let stderrData = "";

    ytDlpProcess.stderr.on("data", (data) => {
      stderrData += data.toString();
    });

    const runProcess = () => {
      return new Promise((resolve, reject) => {
        ytDlpProcess.on("close", (code) => {
          if (code === 0) {
            resolve();
          } else {
            console.error(`[Backend] yt-dlp exited with code ${code}. Error: ${stderrData}`);
            reject(new Error(`yt-dlp failed (exit code ${code}): ${stderrData}`));
          }
        });
        ytDlpProcess.on("error", (err) => {
          console.error(`[Backend] Failed to start yt-dlp process:`, err);
          reject(new Error(`Failed to start yt-dlp: ${err.message}`));
        });
      });
    };

    await runProcess();

    // Verify temp file exists and has size
    if (!fs.existsSync(tempFilePath) || fs.statSync(tempFilePath).size === 0) {
      throw new Error("Downloaded video file is empty or missing.");
    }

    const fileStats = fs.statSync(tempFilePath);
    console.log(`[Backend] Download finished. File size: ${(fileStats.size / (1024 * 1024)).toFixed(2)} MB`);

    // Stream the file back and delete it on end/close
    const fileStream = fs.createReadStream(tempFilePath);
    const targetPath = tempFilePath; // Capture in scope for closures

    const readableStream = new ReadableStream({
      start(controller) {
        fileStream.on("data", (chunk) => controller.enqueue(chunk));
        fileStream.on("end", () => {
          controller.close();
          try {
            if (fs.existsSync(targetPath)) {
              fs.unlinkSync(targetPath);
              console.log(`[Backend] Successfully cleaned up temporary file: ${targetPath}`);
            }
          } catch (cleanupErr) {
            console.warn(`[Backend] Failed to delete temp file ${targetPath}:`, cleanupErr);
          }
        });
        fileStream.on("error", (err) => {
          controller.error(err);
          try {
            if (fs.existsSync(targetPath)) {
              fs.unlinkSync(targetPath);
            }
          } catch (_) {}
        });
      },
      cancel() {
        fileStream.destroy();
        try {
          if (fs.existsSync(targetPath)) {
            fs.unlinkSync(targetPath);
          }
        } catch (_) {}
      },
    });

    return new Response(readableStream, {
      headers: {
        "Content-Type": "video/mp4",
        "Content-Disposition": `attachment; filename="youtube-download.mp4"`,
        "Content-Length": String(fileStats.size),
      },
    });

  } catch (error) {
    console.error("[Backend] Download endpoint error:", error);
    
    // Clean up temp file if it exists
    if (tempFilePath && fs.existsSync(tempFilePath)) {
      try {
        fs.unlinkSync(tempFilePath);
      } catch (_) {}
    }

    let detail = error instanceof Error ? error.message : String(error);
    if (detail.includes("ENOENT") || detail.includes("spawn yt-dlp")) {
      detail = "yt-dlp command-line tool was not found on the server. If you are running on Vercel, please note that serverless environments lack yt-dlp and ffmpeg pre-installed, and exceed the 10s execution limit. Please run the project locally using 'npm run dev'.";
    }

    return NextResponse.json(
      { 
        error: "Failed to download YouTube video", 
        detail: detail
      },
      { status: 500 }
    );
  }
}
