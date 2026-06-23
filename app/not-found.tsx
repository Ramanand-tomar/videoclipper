import Link from "next/link";

export default function NotFound() {
  return (
    <div style={{
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      height: "100vh",
      backgroundColor: "#0b0b0f",
      color: "#f3f4f6",
      fontFamily: "sans-serif"
    }}>
      <h2 style={{ fontSize: "2rem", marginBottom: "1rem" }}>404 - Page Not Found</h2>
      <p style={{ color: "#a1a1aa", marginBottom: "1.5rem" }}>Could not find requested resource</p>
      <Link href="/" style={{
        color: "#3b82f6",
        textDecoration: "underline"
      }}>
        Return Home
      </Link>
    </div>
  );
}
