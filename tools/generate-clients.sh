#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

echo "==> Exporting latest OpenAPI contract from API test harness..."
dotnet test "${ROOT_DIR}/backend/tests/Api.Tests/Api.Tests.csproj" \
  --filter "OpenApi_ShouldExposeValidSpecification" \
  -c Release \
  --nologo \
  --verbosity quiet

OPENAPI_PATH="${ROOT_DIR}/docs/openapi.json"
if [ ! -s "${OPENAPI_PATH}" ]; then
  echo "Error: ${OPENAPI_PATH} was not generated or is empty." >&2
  exit 1
fi

echo "==> OpenAPI specification successfully exported to ${OPENAPI_PATH}."
echo "==> Ready for client generation (TypeScript / Kotlin Multiplatform)."
