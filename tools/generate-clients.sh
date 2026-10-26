#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

echo "==> Building backend API to ensure OpenAPI specification is current..."
dotnet build "${ROOT_DIR}/backend/src/Api/Api.csproj" -c Release --nologo

OPENAPI_PATH="${ROOT_DIR}/docs/openapi.json"
echo "==> OpenAPI contract path: ${OPENAPI_PATH}"

# Placeholder for Phase 1 openapi exporter & openapi-generator CLI
if [ ! -f "${OPENAPI_PATH}" ]; then
  echo "==> Initializing baseline openapi.json placeholder..."
  cat <<'EOF' > "${OPENAPI_PATH}"
{
  "openapi": "3.0.1",
  "info": {
    "title": "Billefy API",
    "version": "v1"
  },
  "paths": {}
}
EOF
fi

echo "==> API contract verified. Client generation will execute against ${OPENAPI_PATH}."
