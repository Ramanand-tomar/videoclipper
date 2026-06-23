import { NextResponse } from "next/server";
import { google } from "googleapis";
import { cookies } from "next/headers";

export const runtime = "nodejs";

function respondWithHtml(status, message = "") {
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <title>YouTube Authentication</title>
      <style>
        body {
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
          background-color: #0b0b0f;
          color: #f3f4f6;
          display: flex;
          align-items: center;
          justify-content: center;
          height: 100vh;
          margin: 0;
        }
        .container {
          text-align: center;
          padding: 2rem;
          background: #15151a;
          border-radius: 12px;
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.5);
          max-width: 400px;
          border: 1px solid #27272a;
        }
        h1 {
          font-size: 1.5rem;
          margin-bottom: 1rem;
          color: ${status === "success" ? "#10b981" : "#ef4444"};
        }
        p {
          color: #a1a1aa;
          font-size: 0.95rem;
          line-height: 1.5;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <h1>${status === "success" ? "Authentication Successful!" : "Authentication Failed"}</h1>
        <p>${status === "success" ? "You have successfully connected your YouTube account. This window will close automatically." : "An error occurred: " + message}</p>
      </div>
      <script>
        try {
          if (window.opener) {
            window.opener.postMessage({ 
              type: 'YOUTUBE_AUTH_STATUS', 
              status: '${status}', 
              message: ${JSON.stringify(message)} 
            }, '*');
            setTimeout(() => {
              window.close();
            }, 1000);
          } else {
            const redirectUrl = ${status === "success" ? '"/?youtube_auth=success"' : '"/?youtube_auth=failed&msg=" + encodeURIComponent(message)'};
            window.location.href = redirectUrl;
          }
        } catch (e) {
          console.error(e);
          window.location.href = "/";
        }
      </script>
    </body>
    </html>
  `;
  return new NextResponse(html, {
    headers: { "Content-Type": "text/html" },
  });
}

export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const code = searchParams.get("code");
  const error = searchParams.get("error");

  if (error) {
    console.error("OAuth callback error parameter:", error);
    return respondWithHtml("error", error);
  }

  if (!code) {
    return respondWithHtml("error", "Missing authorization code");
  }

  const client_id = process.env.YOUTUBE_CLIENT_ID;
  const client_secret = process.env.YOUTUBE_CLIENT_SECRET;
  const redirect_uri = process.env.YOUTUBE_REDIRECT_URI;

  try {
    const oauth2Client = new google.auth.OAuth2(
      client_id,
      client_secret,
      redirect_uri
    );

    const { tokens } = await oauth2Client.getToken(code);

    const cookieStore = await cookies();
    cookieStore.set("youtube_auth_tokens", JSON.stringify(tokens), {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      maxAge: 60 * 60 * 24 * 30, // 30 days
      path: "/",
      sameSite: "lax"
    });

    return respondWithHtml("success");
  } catch (err) {
    console.error("Error during YouTube token exchange:", err);
    return respondWithHtml("failed", err.message);
  }
}
