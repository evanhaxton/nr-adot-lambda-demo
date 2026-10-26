const { Resource } = require('@opentelemetry/resources');
const {
  SEMRESATTRS_SERVICE_NAME,
  SEMRESATTRS_SERVICE_VERSION,
  SEMRESATTRS_DEPLOYMENT_ENVIRONMENT,
  SEMRESATTRS_TELEMETRY_SDK_LANGUAGE
} = require('@opentelemetry/semantic-conventions');

// Tracing imports
const { BasicTracerProvider, SimpleSpanProcessor } = require('@opentelemetry/sdk-trace-base');
const { OTLPTraceExporter } = require('@opentelemetry/exporter-trace-otlp-http');
const opentelemetry = require('@opentelemetry/api');

// Metrics imports
const { MeterProvider, PeriodicExportingMetricReader } = require('@opentelemetry/sdk-metrics');
const { OTLPMetricExporter } = require('@opentelemetry/exporter-metrics-otlp-http');

// Logs imports
const { LoggerProvider, SimpleLogRecordProcessor } = require('@opentelemetry/sdk-logs');
const { OTLPLogExporter } = require('@opentelemetry/exporter-logs-otlp-http');
const { logs } = require('@opentelemetry/api-logs');

const otlpEndpoint = process.env.OTEL_EXPORTER_OTLP_ENDPOINT || 'http://adot-collector:4318';

// 1. Configure Shared Resource for New Relic APM Entity Recognition
const resource = new Resource({
  [SEMRESATTRS_SERVICE_NAME]: process.env.OTEL_SERVICE_NAME || 'order-service-lambda',
  [SEMRESATTRS_SERVICE_VERSION]: '1.2.0',
  [SEMRESATTRS_DEPLOYMENT_ENVIRONMENT]: 'production',
  [SEMRESATTRS_TELEMETRY_SDK_LANGUAGE]: 'nodejs',
  'aws.lambda.function_name': process.env.AWS_LAMBDA_FUNCTION_NAME || 'order-service-lambda',
  'instrumentation.provider': 'opentelemetry'
});

// 2. Initialize Tracing
const traceExporter = new OTLPTraceExporter({
  url: `${otlpEndpoint}/v1/traces`
});
const tracerProvider = new BasicTracerProvider({ resource });
tracerProvider.addSpanProcessor(new SimpleSpanProcessor(traceExporter));
tracerProvider.register();
const tracer = opentelemetry.trace.getTracer('order-service-tracer');

// 3. Initialize Metrics
const metricExporter = new OTLPMetricExporter({
  url: `${otlpEndpoint}/v1/metrics`
});
const metricReader = new PeriodicExportingMetricReader({
  exporter: metricExporter,
  exportIntervalMillis: 60000 // In Lambda we flush manually
});
const meterProvider = new MeterProvider({ resource });
meterProvider.addMetricReader(metricReader);
const meter = meterProvider.getMeter('order-service-meter');

// 4. Initialize Logs
const logExporter = new OTLPLogExporter({
  url: `${otlpEndpoint}/v1/logs`
});
const loggerProvider = new LoggerProvider({ resource });
loggerProvider.addLogRecordProcessor(new SimpleLogRecordProcessor(logExporter));
logs.setGlobalLoggerProvider(loggerProvider);
const logger = logs.getLogger('order-service-logger');

// Explicit flush function critical for serverless invocations
async function flushTelemetry() {
  await Promise.all([
    tracerProvider.forceFlush(),
    meterProvider.forceFlush(),
    loggerProvider.forceFlush()
  ]);
}

module.exports = {
  tracer,
  meter,
  logger,
  flushTelemetry
};
