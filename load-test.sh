#!/usr/bin/env bash

set -euo pipefail

LAMBDA_URL="http://localhost:9000/2015-03-31/functions/function/invocations"
TOTAL_REQUESTS=${1:-50}
CONCURRENCY_DELAY=${2:-0.4}

echo "=================================================="
echo " Starting OpenTelemetry Load Generator for macOS"
echo " Target: ${LAMBDA_URL}"
echo " Total Requests: ${TOTAL_REQUESTS}"
echo "=================================================="

# Check if curl is installed
if ! command -v curl &> /dev/null; then
    echo "Error: curl is required."
    exit 1
fi

success_count=0
error_count=0

for ((i=1; i<=TOTAL_REQUESTS; i++)); do
    ORDER_ID="ORD-$(jot -r 1 10000 99999 2>/dev/null || od -An -N2 -i /dev/urandom | tr -d ' ')"
    AMOUNT="$(awk -v min=15 -v max=300 'BEGIN{srand(); printf "%.2f", min+rand()*(max-min)}')"
    
    # 15% probability of error
    RAND_VAL=$((RANDOM % 100))
    if [ "${RAND_VAL}" -lt 15 ]; then
        SIM_ERROR="true"
    else
        SIM_ERROR="false"
    fi

    PAYLOAD=$(cat <<EOF
{
  "orderId": "${ORDER_ID}",
  "amount": ${AMOUNT},
  "simulateError": ${SIM_ERROR}
}
EOF
)

    HTTP_RESPONSE=$(curl -s -X POST "${LAMBDA_URL}" \
        -H "Content-Type: application/json" \
        -d "${PAYLOAD}")

    if echo "${HTTP_RESPONSE}" | grep -q '"statusCode":200'; then
        echo "[$i/$TOTAL_REQUESTS] ✅ Success - Order ${ORDER_ID} ($${AMOUNT})"
        success_count=$((success_count + 1))
    else
        echo "[$i/$TOTAL_REQUESTS] ❌ Injected Failure - Order ${ORDER_ID}"
        error_count=$((error_count + 1))
    fi

    sleep "${CONCURRENCY_DELAY}"
done

echo ""
echo "=================================================="
echo " Load Generation Complete"
echo " Successful: ${success_count}"
echo " Errors:     ${error_count}"
echo " Telemetry sent to New Relic via ADOT Collector!"
echo "=================================================="
