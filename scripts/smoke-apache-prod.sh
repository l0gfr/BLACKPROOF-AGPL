#!/usr/bin/env bash
set -euo pipefail

BASE_URL="${1:-https://blackproof.fr}"
CURL_BIN="${CURL_BIN:-$(command -v curl || true)}"

if [[ -z "$CURL_BIN" && -x /usr/bin/curl ]]; then
  CURL_BIN="/usr/bin/curl"
fi

if [[ -z "$CURL_BIN" ]]; then
  echo "FAIL curl not found. Set CURL_BIN=/path/to/curl."
  exit 1
fi

echo "BLACKPROOF production smoke test"
echo "Target: ${BASE_URL}"

if [[ "${BASE_URL}" == https://* ]]; then
  HTTP_BASE_URL="http://${BASE_URL#https://}"
  redirect_code="$("$CURL_BIN" -sS -o /dev/null -w "%{http_code}" "${HTTP_BASE_URL}/")"
  redirect_target="$("$CURL_BIN" -sS -o /dev/null -w "%{redirect_url}" "${HTTP_BASE_URL}/")"

  if [[ "$redirect_code" != "301" && "$redirect_code" != "308" ]]; then
    echo "FAIL HTTP is not forced to HTTPS: ${redirect_code} ${HTTP_BASE_URL}/"
    exit 1
  fi

  if [[ "${redirect_target}" != https://* ]]; then
    echo "FAIL HTTP redirect target is not HTTPS: ${redirect_target}"
    exit 1
  fi

  echo "OK   ${redirect_code} ${HTTP_BASE_URL}/ -> ${redirect_target}"
fi

urls=(
  "/"
  "/about"
  "/start"
  "/use-cases"
  "/grc"
  "/status"
  "/demo"
  "/app"
  "/app/cases"
  "/verify"
  "/proofpack"
  "/proofpack-example"
  "/open-source"
  "/LICENSE.txt"
  "/method"
  "/rgpd"
  "/legal"
  "/llms.txt"
  "/sitemap.xml"
  "/evidence-library"
  "/frameworks"
  "/questionnaire-import"
  "/questionnaire-crusher"
  "/demo/supplier-questionnaire-demo.csv"
  "/demo/proofpack-demo.json"
  "/demo/proofpack-delivery-demo.json"
  "/demo/proofpack-delivery-demo.zip"
  "/demo/reponse-fournisseur-demo.md"
  "/demo/registre-preuves-demo.csv"
  "/demo/plan-remediation-demo.csv"
  "/demo/note-synthese-demo.md"
  "/demo/proofpack-bundle-manifest.json"
  "/methodology.json"
  "/evidence-library.json"
  "/frameworks.json"
  "/questionnaire-import.json"
  "/questionnaire-crusher.json"
  "/api"
  "/api/index.json"
  "/api/status.json"
  "/api/methodology.json"
  "/api/evidence-library.json"
  "/api/frameworks.json"
  "/api/proofdebt.json"
  "/api/questionnaire-import.json"
  "/api/proofpack/schema.json"
  "/schemas/proofpack/v1.schema.json"
  "/schemas/proofpack/v2.schema.json"
  "/schemas/proofpack/v3.schema.json"
  "/schemas/source-import/v1.schema.json"
  "/canonicalization-vectors.json"
  "/schemas/proofpack-delivery/v4.schema.json"
  "/schemas/proofpack-delivery/v5.schema.json"
  "/api/verify.json"
)

for path in "${urls[@]}"; do
  url="${BASE_URL}${path}"
  code="$("$CURL_BIN" -L -sS -o /dev/null -w "%{http_code}" "$url")"

  if [[ "$code" != "200" ]]; then
    echo "FAIL ${code} ${url}"
    exit 1
  fi

  echo "OK   ${code} ${url}"
done

for redirect_spec in \
  "/pilot/|${BASE_URL}/open-source/|/open-source" \
  "/legal/pilot-order/|${BASE_URL}/open-source/|/open-source"
do
  IFS="|" read -r path expected_target expected_client_target <<< "$redirect_spec"
  url="${BASE_URL}${path}"
  code="$("$CURL_BIN" -sS -o /dev/null -w "%{http_code}" "$url")"
  target="$("$CURL_BIN" -sS -o /dev/null -w "%{redirect_url}" "$url")"

  if [[ "$code" == "308" && "$target" == "$expected_target" ]]; then
    echo "OK   ${code} ${url} -> ${target}"
    continue
  fi

  if [[ "$code" == "200" ]]; then
    body="$("$CURL_BIN" -sS "$url")"
    if [[ "$body" == *"content=\"0;url=${expected_client_target}\""* \
      && "$body" != *"1 500"* \
      && "$body" != *"Demander le pilote"* ]]; then
      echo "OK   200 client redirect ${url} -> ${expected_client_target}"
      continue
    fi
  fi

  echo "FAIL retired offer redirect: ${code} ${url} -> ${target}"
  exit 1
done

for retired_route in checkout webhook health delivery-status; do
  retired_code="$("$CURL_BIN" -sS -o /dev/null -w "%{http_code}" "${BASE_URL}/api/license/${retired_route}")"
  if [[ "$retired_code" != "410" ]]; then
    echo "FAIL retired dynamic route is not closed (${retired_code})"
    exit 1
  fi
done
echo "OK   retired dynamic namespace returns 410"

unknown_api_url="${BASE_URL}/api/blackproof-smoke-unknown-route.json"
unknown_api_code="$("$CURL_BIN" -L -sS -o /dev/null -w "%{http_code}" "$unknown_api_url")"

if [[ "$unknown_api_code" != "404" ]]; then
  echo "FAIL unknown API route did not return the required 404 (${unknown_api_code}): ${unknown_api_url}"
  exit 1
fi

echo "OK   ${unknown_api_code} ${unknown_api_url}"

legacy_nav_url="${BASE_URL}/blackproof-nav.js"
legacy_nav_code="$("$CURL_BIN" -L -sS -o /dev/null -w "%{http_code}" "$legacy_nav_url")"

if [[ "$legacy_nav_code" != "404" ]]; then
  echo "FAIL non-fingerprinted legacy nav script did not return the required 404 (${legacy_nav_code}): ${legacy_nav_url}"
  exit 1
fi

echo "OK   legacy nav script absent (${legacy_nav_code})"

for operational_path in "/deploy/blackproof.fr.conf" "/deploy/artifact-manifest.json"; do
  operational_url="${BASE_URL}${operational_path}"
  operational_code="$("$CURL_BIN" -L -sS -o /dev/null -w "%{http_code}" "$operational_url")"
  if [[ "$operational_code" != "404" ]]; then
    echo "FAIL operational artifact did not return the required 404 (${operational_code}): ${operational_url}"
    exit 1
  fi
  echo "OK   operational artifact blocked (${operational_code}) ${operational_url}"
done

case "${BLACKPROOF_SOURCE_CONTRACT_MODE:-required}" in
  required)
    node scripts/check-public-proofpack-contract.mjs "$BASE_URL"
    ;;
  exact-ci-artifact)
    echo "SKIP source-linked ProofPack contract replay: the promoted directory was checksum-matched to the exact CI artifact where this gate passed."
    ;;
  *)
    echo "FAIL invalid BLACKPROOF_SOURCE_CONTRACT_MODE."
    exit 1
    ;;
esac

echo
echo "Checking security headers on ${BASE_URL}/"

if [[ "${BASE_URL}" == http://127.0.0.1:* || "${BASE_URL}" == http://localhost:* ]]; then
  echo "SKIP security headers on local preview"
  echo
  echo "BLACKPROOF smoke test passed."
  exit 0
fi

echo "Checking private statistics barrier on ${BASE_URL}/stats/"

stats_redirect_code="$("$CURL_BIN" -sS -o /dev/null -w "%{http_code}" "${BASE_URL}/stats")"
stats_redirect_target="$("$CURL_BIN" -sS -o /dev/null -w "%{redirect_url}" "${BASE_URL}/stats")"
if [[ "$stats_redirect_code" != "308" || "$stats_redirect_target" != "${BASE_URL}/stats/" ]]; then
  echo "FAIL /stats is not canonically redirected: ${stats_redirect_code} ${stats_redirect_target}"
  exit 1
fi
echo "OK   308 ${BASE_URL}/stats -> ${BASE_URL}/stats/"

stats_code="$("$CURL_BIN" -sS -o /dev/null -w "%{http_code}" "${BASE_URL}/stats/")"
if [[ "$stats_code" != "401" ]]; then
  echo "FAIL private statistics must return 401 without credentials: ${stats_code}"
  exit 1
fi
echo "OK   401 private statistics without credentials"

stats_headers="$("$CURL_BIN" -sSI "${BASE_URL}/stats/")"
lower_stats_headers="$(printf "%s" "$stats_headers" | tr '[:upper:]' '[:lower:]')"
stats_csp_count="$(printf "%s" "$lower_stats_headers" | grep -c '^content-security-policy:' || true)"
if [[ "$stats_csp_count" != "1" ]]; then
  echo "FAIL private statistics must send exactly one CSP header: ${stats_csp_count}"
  exit 1
fi
stats_auth_count="$(printf "%s" "$lower_stats_headers" | grep -c '^www-authenticate: basic' || true)"
if [[ "$stats_auth_count" != "1" ]]; then
  echo "FAIL private statistics must send exactly one Basic challenge: ${stats_auth_count}"
  exit 1
fi

for expected_stats_header in \
  '^cache-control:.*private.*no-store' \
  '^x-robots-tag:.*noindex.*nofollow.*noarchive'; do
  if ! printf "%s" "$lower_stats_headers" | grep -q "$expected_stats_header"; then
    echo "FAIL private statistics missing header invariant: ${expected_stats_header}"
    exit 1
  fi
done

stats_csp_line="$(printf "%s" "$lower_stats_headers" | grep '^content-security-policy:' | head -n 1)"
for directive in \
  "script-src 'self' 'unsafe-inline' 'unsafe-eval'" \
  "style-src 'self' 'unsafe-inline'" \
  "connect-src 'none'" \
  "object-src 'none'" \
  "frame-ancestors 'none'"; do
  if ! printf "%s" "$stats_csp_line" | grep -q "$directive"; then
    echo "FAIL private statistics CSP missing directive: ${directive}"
    exit 1
  fi
done
echo "OK   private statistics auth, cache, robots and dedicated CSP"

headers="$("$CURL_BIN" -sSI "${BASE_URL}/")"

required_headers=(
  "x-content-type-options"
  "referrer-policy"
  "x-frame-options"
  "permissions-policy"
  "cross-origin-opener-policy"
  "cross-origin-resource-policy"
  "strict-transport-security"
  "cache-control"
)

lower_headers="$(printf "%s" "$headers" | tr '[:upper:]' '[:lower:]')"

for header in "${required_headers[@]}"; do
  if ! printf "%s" "$lower_headers" | grep -q "^${header}:"; then
    echo "FAIL missing header: ${header}"
    exit 1
  fi

  echo "OK   header ${header}"
done

hsts_count="$(printf "%s" "$lower_headers" | grep -c '^strict-transport-security:' || true)"
if [[ "$hsts_count" != "1" ]]; then
  echo "FAIL HTTPS responses must send exactly one HSTS header: ${hsts_count}"
  exit 1
fi

if ! printf "%s" "$lower_headers" | grep -q '^strict-transport-security:.*max-age=31536000.*includesubdomains'; then
  echo "FAIL HSTS must retain the reviewed one-year includeSubDomains policy"
  exit 1
fi

echo "OK   hsts one year with includeSubDomains"

csp_line="$(printf "%s" "$lower_headers" | grep "^content-security-policy:" | head -n 1 || true)"

if [[ -z "$csp_line" ]]; then
  echo "FAIL missing CSP header"
  exit 1
fi

echo "OK   header content-security-policy"

required_csp_directives=(
  "default-src 'self'"
  "object-src 'none'"
  "frame-ancestors 'none'"
  "frame-src 'none'"
  "form-action 'none'"
  "connect-src 'none'"
  "worker-src 'self'"
  "script-src-attr 'none'"
  "upgrade-insecure-requests"
)

if printf "%s" "$csp_line" | grep -q "'unsafe-inline'"; then
  echo "FAIL CSP must not contain unsafe-inline"
  exit 1
fi

echo "OK   csp no unsafe-inline"

if ! printf "%s" "$csp_line" | grep -q "'sha256-"; then
  echo "FAIL CSP must contain script/style hashes"
  exit 1
fi

echo "OK   csp hashes present"

for directive in "${required_csp_directives[@]}"; do
  if ! printf "%s" "$csp_line" | grep -q "$directive"; then
    echo "FAIL missing CSP directive: ${directive}"
    exit 1
  fi

  echo "OK   csp ${directive}"
done

home_html="$("$CURL_BIN" -fsSL "${BASE_URL}/")"

astro_script_path="$(printf "%s" "$home_html" | grep -o 'src="/_astro/[^"]*\.js"' | head -n 1 | sed 's/^src="//; s/"$//' || true)"

if [[ -z "$astro_script_path" ]]; then
  echo "FAIL no fingerprinted Astro JavaScript asset found on home"
  exit 1
fi

astro_script_headers="$("$CURL_BIN" -sSI "${BASE_URL}${astro_script_path}")"
lower_astro_script_headers="$(printf "%s" "$astro_script_headers" | tr '[:upper:]' '[:lower:]')"

if ! printf "%s" "$lower_astro_script_headers" | grep -q "^cache-control:.*max-age=31536000"; then
  echo "FAIL fingerprinted Astro JavaScript asset is not cached for one year: ${astro_script_path}"
  exit 1
fi

if ! printf "%s" "$lower_astro_script_headers" | grep -q "^cache-control:.*immutable"; then
  echo "FAIL fingerprinted Astro JavaScript asset is missing immutable cache directive: ${astro_script_path}"
  exit 1
fi

echo "OK   immutable cache on fingerprinted Astro script ${astro_script_path}"

for forbidden in \
  "google-analytics" \
  "googletagmanager" \
  "fonts.googleapis.com" \
  "fonts.gstatic.com" \
  "cdn.jsdelivr.net" \
  "unpkg.com" \
  "cdnjs.cloudflare.com" \
  "plausible" \
  "matomo" \
  "umami" \
  "hotjar" \
  "clarity"; do
  if printf "%s" "$home_html" | grep -qi "$forbidden"; then
    echo "FAIL privacy-first violation on home: ${forbidden}"
    exit 1
  fi
done

echo "OK   privacy no tracker/google-fonts/cdn markers on home"

echo
echo "BLACKPROOF smoke test passed."
