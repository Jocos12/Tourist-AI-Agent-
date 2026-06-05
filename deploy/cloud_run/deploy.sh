#!/usr/bin/env bash
# deploy.sh — Build and deploy Hodari agent services to Google Cloud Run
#
# Usage:
#   ./deploy.sh <project_id> <region> [service]
#
# <service> is optional. When omitted, all 4 services are deployed in order.
# Valid values: planner | explorer | itinerary | orchestrator | all
#
# Prerequisites:
#   • gcloud CLI authenticated and configured
#   • Google Secret Manager secrets created:
#       hodari-google-maps-api-key  → value of GOOGLE_MAPS_API_KEY
#       hodari-mongodb-uri          → value of MONGODB_URI (Atlas connection string)
#   • Artifact Registry repo OR gcr.io enabled for the project
#   • APIs enabled: Cloud Run, Cloud Build, Secret Manager, Maps Grounding Lite

set -euo pipefail

# ── Argument validation ───────────────────────────────────────────────────────

if [[ $# -lt 2 ]]; then
  echo "Usage: $0 <project_id> <region> [service]" >&2
  exit 1
fi

PROJECT_ID="$1"
REGION="$2"
TARGET_SERVICE="${3:-all}"

# ── Sanity checks ─────────────────────────────────────────────────────────────

if ! command -v gcloud &>/dev/null; then
  echo "ERROR: gcloud CLI not found on PATH. Install it from https://cloud.google.com/sdk" >&2
  exit 1
fi

# Resolve the repo root (two directories above this script)
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/../.." && pwd)"
AGENTS_DIR="${REPO_ROOT}/agents"
DEPLOY_DIR="${SCRIPT_DIR}"

if [[ ! -f "${AGENTS_DIR}/Dockerfile" ]]; then
  echo "ERROR: Dockerfile not found at ${AGENTS_DIR}/Dockerfile" >&2
  exit 1
fi

IMAGE="gcr.io/${PROJECT_ID}/hodari-agents:latest"

echo "======================================================================"
echo "  Hodari Cloud Run deploy"
echo "  Project : ${PROJECT_ID}"
echo "  Region  : ${REGION}"
echo "  Image   : ${IMAGE}"
echo "  Target  : ${TARGET_SERVICE}"
echo "======================================================================"

# ── Helper: substitute IMAGE_PLACEHOLDER and deploy a service YAML ────────────

deploy_yaml() {
  local svc="$1"          # e.g. planner
  local yaml_file="${DEPLOY_DIR}/${svc}.yaml"

  echo ""
  echo "── Deploying ${svc} ──────────────────────────────────────────────"

  # Substitute the image placeholder into a temp file
  local tmp_yaml
  tmp_yaml="$(mktemp /tmp/hodari-${svc}-XXXX.yaml)"
  sed "s|IMAGE_PLACEHOLDER|${IMAGE}|g" "${yaml_file}" > "${tmp_yaml}"

  gcloud run services replace "${tmp_yaml}" \
    --region="${REGION}" \
    --project="${PROJECT_ID}"

  rm -f "${tmp_yaml}"
  echo "  ${svc} deployed."
}

# ── Helper: inject secrets into a deployed service ───────────────────────────

inject_secrets() {
  local svc_name="$1"    # Cloud Run service name, e.g. hodari-planner
  local secrets="$2"     # comma-separated KEY=secret-name:version pairs

  gcloud run services update "${svc_name}" \
    --region="${REGION}" \
    --project="${PROJECT_ID}" \
    --set-secrets="${secrets}"
}

# ── Helper: get a deployed service URL ───────────────────────────────────────

get_service_url() {
  local svc_name="$1"
  gcloud run services describe "${svc_name}" \
    --region="${REGION}" \
    --project="${PROJECT_ID}" \
    --format="value(status.url)"
}

# ── Step 1: Build the shared Docker image ────────────────────────────────────

build_image() {
  echo ""
  echo "── Building Docker image ─────────────────────────────────────────────"
  gcloud builds submit "${AGENTS_DIR}" \
    --tag="${IMAGE}" \
    --project="${PROJECT_ID}"
  echo "  Image built: ${IMAGE}"
}

# ── Step 2: Deploy the MongoDB MCP sidecar service ───────────────────────────
# Runs npx mongodb-mcp-server in HTTP transport mode on Cloud Run.
# The orchestrator/explorer agents reach it via MONGODB_MCP_URL.

deploy_mongo_mcp() {
  echo ""
  echo "── Deploying MongoDB MCP server ─────────────────────────────────────"

  gcloud run deploy hodari-mongo-mcp \
    --image="node:20-slim" \
    --region="${REGION}" \
    --project="${PROJECT_ID}" \
    --command="npx" \
    --args="mongodb-mcp-server,--transport,http,--httpPort,8080" \
    --port=8080 \
    --set-secrets="MDB_MCP_CONNECTION_STRING=hodari-mongodb-uri:latest" \
    --allow-unauthenticated \
    --memory="512Mi" \
    --cpu="1" \
    --min-instances=1 \
    --max-instances=5 \
    --timeout=300 2>/dev/null || {
      # If the base node image approach fails, use the published npm package
      # image approach with Cloud Run Jobs — log a warning and continue.
      echo "  WARNING: MongoDB MCP Cloud Run deploy failed (may need a pre-built image)."
      echo "  Run manually: gcloud run deploy hodari-mongo-mcp --image <your-mcp-image>"
    }
}

# ── Step 3: Deploy sub-services and wire up orchestrator ─────────────────────

deploy_all() {
  build_image
  deploy_mongo_mcp

  # Deploy sub-services
  for svc in planner explorer itinerary; do
    deploy_yaml "${svc}"

    # Inject secrets appropriate to each service
    case "${svc}" in
      planner)
        inject_secrets "hodari-planner" \
          "GOOGLE_MAPS_API_KEY=hodari-google-maps-api-key:latest"
        ;;
      explorer)
        # Explorer needs Maps MCP key + MongoDB MCP URL (fetched from deployed sidecar)
        local mcp_url
        mcp_url="$(get_service_url hodari-mongo-mcp 2>/dev/null || echo '')"
        if [[ -n "${mcp_url}" ]]; then
          gcloud run services update hodari-explorer \
            --region="${REGION}" \
            --project="${PROJECT_ID}" \
            --set-env-vars="MONGODB_MCP_URL=${mcp_url}/mcp"
        fi
        inject_secrets "hodari-explorer" \
          "GOOGLE_MAPS_API_KEY=hodari-google-maps-api-key:latest"
        ;;
      itinerary)
        inject_secrets "hodari-itinerary" \
          "GOOGLE_MAPS_API_KEY=hodari-google-maps-api-key:latest"
        ;;
    esac
  done

  # Collect sub-service URLs
  echo ""
  echo "── Collecting sub-service URLs ───────────────────────────────────────"
  PLANNER_URL="$(get_service_url hodari-planner)"
  EXPLORER_URL="$(get_service_url hodari-explorer)"
  ITINERARY_URL="$(get_service_url hodari-itinerary)"
  MCP_URL="$(get_service_url hodari-mongo-mcp 2>/dev/null || echo '')"

  echo "  Planner  : ${PLANNER_URL}"
  echo "  Explorer : ${EXPLORER_URL}"
  echo "  Itinerary: ${ITINERARY_URL}"
  [[ -n "${MCP_URL}" ]] && echo "  Mongo MCP: ${MCP_URL}"

  # Deploy orchestrator with sub-service URLs wired in
  deploy_yaml "orchestrator"

  echo ""
  echo "── Wiring orchestrator env vars ──────────────────────────────────────"
  gcloud run services update hodari-orchestrator \
    --region="${REGION}" \
    --project="${PROJECT_ID}" \
    --set-env-vars="PLANNER_SERVICE_URL=${PLANNER_URL},EXPLORER_SERVICE_URL=${EXPLORER_URL},ITINERARY_SERVICE_URL=${ITINERARY_URL}"

  inject_secrets "hodari-orchestrator" \
    "GOOGLE_MAPS_API_KEY=hodari-google-maps-api-key:latest"

  if [[ -n "${MCP_URL}" ]]; then
    gcloud run services update hodari-orchestrator \
      --region="${REGION}" \
      --project="${PROJECT_ID}" \
      --set-env-vars="MONGODB_MCP_URL=${MCP_URL}/mcp"
  fi

  # Print final service URLs
  echo ""
  echo "======================================================================"
  echo "  Deployment complete"
  echo "======================================================================"
  ORCH_URL="$(get_service_url hodari-orchestrator)"
  echo "  Orchestrator : ${ORCH_URL}"
  echo "  Planner      : ${PLANNER_URL}"
  echo "  Explorer     : ${EXPLORER_URL}"
  echo "  Itinerary    : ${ITINERARY_URL}"
  [[ -n "${MCP_URL}" ]] && echo "  Mongo MCP    : ${MCP_URL}"
  echo ""
  echo "  Test with:"
  echo "  curl -X POST ${ORCH_URL}/run \\"
  echo "    -H 'Content-Type: application/json' \\"
  echo "    -d '{\"app_name\":\"orchestrator\",\"user_id\":\"test\",\"session_id\":\"s1\",\"new_message\":{\"role\":\"user\",\"parts\":[{\"text\":\"Plan 2 hours near Camp Nou\"}]},\"streaming\":false}'"
}

deploy_single() {
  local svc="$1"
  build_image
  deploy_yaml "${svc}"
  echo "Single service deploy complete: ${svc}"
}

# ── Entry point ───────────────────────────────────────────────────────────────

case "${TARGET_SERVICE}" in
  all)
    deploy_all
    ;;
  planner|explorer|itinerary|orchestrator)
    deploy_single "${TARGET_SERVICE}"
    ;;
  *)
    echo "ERROR: Unknown service '${TARGET_SERVICE}'. Valid: planner | explorer | itinerary | orchestrator | all" >&2
    exit 1
    ;;
esac
