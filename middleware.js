// Vercel Edge Middleware — gate the whole app behind HTTP Basic Auth.
// Credentials live in Vercel env vars (server-side, never shipped to the browser).
// Only people you give the user/password to can load the demo.
export const config = { matcher: "/:path*" };

export default function middleware(req) {
  const user = process.env.BASIC_AUTH_USER;
  const pass = process.env.BASIC_AUTH_PASSWORD;

  // If not configured, fail closed (deny) so the app is never accidentally public.
  if (!user || !pass) {
    return new Response("Acceso restringido — Atlantis", { status: 503 });
  }

  const auth = req.headers.get("authorization") || "";
  const [scheme, encoded] = auth.split(" ");
  if (scheme === "Basic" && encoded) {
    const decoded = atob(encoded);
    const i = decoded.indexOf(":");
    if (decoded.slice(0, i) === user && decoded.slice(i + 1) === pass) {
      return; // authorized → continue to the app
    }
  }

  return new Response("Acceso restringido — Atlantis", {
    status: 401,
    headers: { "WWW-Authenticate": 'Basic realm="Atlantis Demo", charset="UTF-8"' },
  });
}
