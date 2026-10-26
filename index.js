const { trace, context, SpanKind, SpanStatusCode } = require('@opentelemetry/api');
const { SeverityNumber } = require('@opentelemetry/api-logs');
const { tracer, logger, flushTelemetry } = require('./telemetry');

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

exports.handler = async (event, lambdaContext) => {
  let payload = {};
  try {
    payload = typeof event.body === 'string' ? JSON.parse(event.body || '{}') : (event.body || event || {});
  } catch {
    payload = {};
  }

  const orderId = payload.orderId || `ord-${Math.floor(Math.random() * 90000) + 10000}`;
  const simulateError = payload.simulateError === true;

  // Standard OpenTelemetry HTTP Server Span (pure OTel, zero vendor-specific code)
  const parentSpan = tracer.startSpan('POST /api/orders', {
    kind: SpanKind.SERVER,
    attributes: {
      'http.method': 'POST',
      'http.route': '/api/orders',
      'http.status_code': 200,
      'faas.execution': lambdaContext?.awsRequestId || 'local-exec',
      'order.id': orderId
    }
  });

  const ctx = trace.setSpan(context.active(), parentSpan);

  try {
    logger.emit({
      severityNumber: SeverityNumber.INFO,
      severityText: 'INFO',
      body: `Processing order ${orderId}`,
      attributes: { 'order.id': orderId }
    });

    await tracer.startActiveSpan('authorizePayment', { kind: SpanKind.INTERNAL }, ctx, async (span) => {
      await sleep(65);
      if (simulateError) {
        const error = new Error('Payment gateway timeout');
        span.recordException(error);
        span.setStatus({ code: SpanStatusCode.ERROR, message: error.message });
        span.end();
        throw error;
      }
      span.end();
    });

    parentSpan.setStatus({ code: SpanStatusCode.OK });
    return { statusCode: 200, body: JSON.stringify({ status: 'SUCCESS', orderId }) };
  } catch (err) {
    parentSpan.recordException(err);
    parentSpan.setAttribute('http.status_code', 500);
    parentSpan.setStatus({ code: SpanStatusCode.ERROR, message: err.message });

    return { statusCode: 500, body: JSON.stringify({ status: 'FAILED', orderId, error: err.message }) };
  } finally {
    parentSpan.end();
    await flushTelemetry(); // Standard trace flush
  }
};

