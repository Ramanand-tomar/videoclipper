import { NextResponse } from "next/server";
import { google } from "googleapis";

export const runtime = "nodejs";

export async function GET() {
  const client_id = process.env.YOUTUBE_CLIENT_ID;
  const client_secret = process.env.YOUTUBE_CLIENT_SECRET;
  const redirect_uri = process.env.YOUTUBE_REDIRECT_URI;

  if (!client_id || !client_secret || !redirect_uri) {
    return NextResponse.json(
      { error: "Missing YOUTUBE_CLIENT_ID, YOUTUBE_CLIENT_SECRET, or YOUTUBE_REDIRECT_URI in env" },
      { status: 500 }
    );
  }

  const oauth2Client = new google.auth.OAuth2(
    client_id,
    client_secret,
    redirect_uri
  );

  const scopes = [
    "https://www.googleapis.com/auth/youtube.upload",
    "https://www.googleapis.com/auth/youtube.readonly"
  ];

  const authUrl = oauth2Client.generateAuthUrl({
    access_type: "offline",
    scope: scopes,
    prompt: "consent"
  });

  return NextResponse.redirect(authUrl);
}
