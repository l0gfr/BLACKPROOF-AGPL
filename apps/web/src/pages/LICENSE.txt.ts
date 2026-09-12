import licenseText from "../../../../LICENSE?raw";

export const prerender = true;
export function GET() {
  return new Response(licenseText, { headers: { "Content-Type": "text/plain; charset=utf-8", "X-Content-Type-Options": "nosniff" } });
}
