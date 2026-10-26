# nr-adot-lamdba-demo

This demo application features an AWS Lambda function written in Node.js, instrumented with native OpenTelemetry (Traces, Metrics, and Logs), and routed to New Relic through the open-source otel/opentelemetry-collector-contrib Collector running locally in containers on Rancher Desktop or Docker Desktop on macOS.

 
## Overview

This demo showcases:
- **Standard Open Telemetry Configuration**: Standard Metrics, Events and Traces that captured via Open Source Open Telemetry Libraries
- **No Code Changes**: No code changes are required to the client libraries
- **Distributed Tracing**: Complete visibility across the lambda implementations
- **Logs**: Application logs are captured
- **OTTL**: OpenTelemetry Translation Language was utilized to translate to New Relic

## Architecture

The system consists of 6 Docker services:

```
                      [ macOS Terminal ]
                              |
                     (load-test.sh via curl)
                              v
   +-------------------------------------------------------+
   |             Rancher Desktop (macOS)                   |
   |                                                       |
   |  +---------------------+      +--------------------+  |
   |  |   lambda-app        |      |   adot-collector   |  |
   |  | (AWS Lambda Runtime | OTLP |  (open source.)    |  |
   |  |  Emulator :9000)    |----->|  :4317 / :4318     |  |
   |  |                     |      +---------+----------+  |
   |  +---------------------+                |             |
   +-----------------------------------------|-------------+
                                             | OTLP/gRPC
                                             v
                                  [ New Relic OTLP Gateway ]
                                  (otlp.nr-data.net:4317)
                                             |
                         +-------------------+-------------------+
                         |                   |                   |
                         v                   v                   v
                     [APM View]      [Distributed Trace]    [Logs/Metrics]
```
To ensure New Relic synthesizes an APM Service Entity rather than a generic telemetry bucket, this setup satisfies four critical requirements:
- Defines service.name and telemetry.sdk.language: nodejs in the resource attributes.
- Generates root spans with SpanKind.SERVER simulating HTTP invocations.
- Attaches standard HTTP semantic conventions (http.method, http.status_code, http.route).
- Flushes traces, metrics, and logs explicitly before the Lambda handler returns to prevent frozen serverless buffers.



**Project File Structure**

nr-adot-lambda-demo/
- .env.example
- Dockerfile
- collector-config.yaml
- docker-compose.yml
- index.js
- load-test.sh
- package.json
- telemetry.js

### Software Requirements
- Docker Desktop or Docker Engine 20.10+ OR Rancher Desktop Version 1.23.1
- Docker Compose V2
- Git

### Operating Systems
- macOS (Apple Silicon or Intel)
- Linux (x86_64 or ARM64)
- Windows with WSL2

## Configuration

### 1. Clone and Navigate
```bash
cd nr-adot-lambda-demo
```

### 2. Configure Environment Variables
```bash
# Copy the example file
cp .env.example .env

# US Region endpoint: otlp.nr-data.net:4317
# EU Region endpoint: otlp.eu01.nr-data.net:4317
NEW_RELIC_OTLP_ENDPOINT=otlp.nr-data.net:4317
NEW_RELIC_LICENSE_KEY=NRII-xxxxxxxxxxxxxxxxxxxxxxxxxx

# Please make sure that the license key is an INGEST Key
```

**To access New Relic license key**: [New Relic License Keys](https://one.newrelic.com/launcher/api-keys-ui.api-keys-launcher)

### 3. Build All Images
Build all services including the lightweight Ollama models:
```bash
docker compose build -d
```

### 4. Verify containers are running and healthy
Build all services including the lightweight Ollama models:
```bash
docker compose ps
docker compose logs -f adot-collector
```

### 4. Run the load generator
```bash
chmod +x load-test.sh
./load-test.sh 50 0.2
```

### 5. Log onto New Relic
Search for order-service-lambda under APM Services Open Telemetry
