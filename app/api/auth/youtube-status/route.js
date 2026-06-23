import { NextResponse } from "next/server";
import { google } from "googleapis";
import { cookies } from "next/headers";

export const runtime = "nodejs";

export async function GET(req) {
  try {
    const cookieStore = await cookies();
    const tokenCookie = cookieStore.get("youtube_auth_tokens");

    if (!tokenCookie || !tokenCookie.value) {
      return NextResponse.json({ authenticated: false });
    }

    const tokens = JSON.parse(tokenCookie.value);
    const oauth2Client = new google.auth.OAuth2(
      process.env.YOUTUBE_CLIENT_ID,
      process.env.YOUTUBE_CLIENT_SECRET,
      process.env.YOUTUBE_REDIRECT_URI
    );
    oauth2Client.setCredentials(tokens);

    // Verify token by calling channels.list
    const youtube = google.youtube({ version: "v3", auth: oauth2Client });
    const response = await youtube.channels.list({
      part: "snippet",
      mine: true
    });

    const channel = response.data.items?.[0];
    if (!channel) {
      return NextResponse.json({ authenticated: false });
    }

    return NextResponse.json({
      authenticated: true,
      channelTitle: channel.snippet.title,
      channelThumbnail: channel.snippet.thumbnails?.default?.url
    });
  } catch (error) {
    console.error("YouTube status check failed:", error);
    return NextResponse.json({ authenticated: false, error: error.message });
  }
}
