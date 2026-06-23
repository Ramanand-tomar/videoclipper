import { NextResponse } from "next/server";
import { google } from "googleapis";
import { cookies } from "next/headers";
import { v2 as cloudinary } from "cloudinary";
import { Readable } from "stream";

export const runtime = "nodejs";

// Configure Cloudinary SDK
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

export async function POST(req) {
  try {
    const cookieStore = await cookies();
    const tokenCookie = cookieStore.get("youtube_auth_tokens");

    if (!tokenCookie || !tokenCookie.value) {
      return NextResponse.json(
        { error: "Not authenticated with YouTube. Please connect your channel first." },
        { status: 401 }
      );
    }

    const { videoUrl, publicId, title, description } = await req.json();

    if (!videoUrl || !publicId || !title) {
      return NextResponse.json(
        { error: "Missing required parameters: videoUrl, publicId, or title" },
        { status: 400 }
      );
    }

    const tokens = JSON.parse(tokenCookie.value);
    const oauth2Client = new google.auth.OAuth2(
      process.env.YOUTUBE_CLIENT_ID,
      process.env.YOUTUBE_CLIENT_SECRET,
      process.env.YOUTUBE_REDIRECT_URI
    );
    oauth2Client.setCredentials(tokens);

    // Refresh credentials if expired
    oauth2Client.on("tokens", async (newTokens) => {
      const updatedTokens = { ...tokens, ...newTokens };
      await cookieStore.set("youtube_auth_tokens", JSON.stringify(updatedTokens), {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        maxAge: 60 * 60 * 24 * 30,
        path: "/",
        sameSite: "lax"
      });
    });

    const youtube = google.youtube({ version: "v3", auth: oauth2Client });

    // Download the video stream from Cloudinary
    const videoRes = await fetch(videoUrl);
    if (!videoRes.ok) {
      throw new Error(`Failed to download video from Cloudinary: ${videoRes.statusText}`);
    }

    // Convert Web ReadableStream to Node.js Readable stream
    const nodeReadableStream = Readable.fromWeb(videoRes.body);

    console.log("Uploading video to YouTube Shorts...");

    // Upload to YouTube Shorts
    const insertRes = await youtube.videos.insert({
      part: "snippet,status",
      requestBody: {
        snippet: {
          title: title.slice(0, 100), // Max 100 chars
          description: description || "",
          categoryId: "22", // People & Blogs
          defaultLanguage: "en"
        },
        status: {
          privacyStatus: "public", // Upload directly as public or unlisted
          selfDeclaredMadeForKids: false
        }
      },
      media: {
        mimeType: "video/mp4",
        body: nodeReadableStream
      }
    });

    console.log("YouTube upload successful. Video ID:", insertRes.data.id);

    // Delete the video from Cloudinary to free up space
    try {
      console.log("Deleting video from Cloudinary (publicId:", publicId, ")...");
      await cloudinary.uploader.destroy(publicId, { resource_type: "video" });
      console.log("Cloudinary cleanup successful.");
    } catch (cleanupErr) {
      console.warn("Failed to clean up Cloudinary video:", cleanupErr);
    }

    return NextResponse.json({
      success: true,
      videoId: insertRes.data.id,
      url: `https://youtube.com/shorts/${insertRes.data.id}`
    });
  } catch (error) {
    console.error("YouTube Shorts upload failed:", error);
    return NextResponse.json(
      { error: "YouTube Upload failed", detail: error.message },
      { status: 500 }
    );
  }
}
