export const BLACKPROOF_PUBLIC_API_VERSION = "blackproof-public-api-v0.1.0-alpha";

export const BLACKPROOF_API_DISCLAIMER =
  "BLACKPROOF structure des registres de préparation cyber. L'API publique ne fournit ni certification, ni avis juridique, ni audit qualifié, ni garantie de conformité réglementaire.";

export function jsonResponse(body: unknown, cacheSeconds = 3600): Response {
  return new Response(JSON.stringify(body, null, 2), {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": `public, max-age=${cacheSeconds}`,
      "X-Blackproof-Api-Version": BLACKPROOF_PUBLIC_API_VERSION,
      "X-Blackproof-No-Upload-Default": "true",
    },
  });
}

export function apiEnvelope(resource: string, body: Record<string, unknown>) {
  return {
    product: "BLACKPROOF",
    apiVersion: BLACKPROOF_PUBLIC_API_VERSION,
    resource,
    posture: {
      publicSurface: true,
      defaultMode: "lecture-seule",
      noUploadByDefault: true,
      sensitiveEvidenceAccepted: false,
    },
    disclaimer: BLACKPROOF_API_DISCLAIMER,
    ...body,
  };
}
