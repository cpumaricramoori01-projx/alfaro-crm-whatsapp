import test from 'node:test';
import assert from 'node:assert/strict';
import { serveWebhook } from '../api/whatsapp-webhook.mjs';
const response = () => ({ code: null, body: null, headers: {},
  setHeader(key, value) { this.headers[key] = value; },
  status(code) { this.code = code; return this; },
  end(body) { this.body = body; return this; },
  json(body) { this.body = body; return this; }
});
const validUrl = '/api/whatsapp-webhook?hub.mode=subscribe&hub.verify_token=test-secret&hub.challenge=12345';
test('devuelve el desafío como texto sin comillas y sin caché', () => {
  const res = response(); serveWebhook({ method: 'GET', url: validUrl }, res, 'test-secret');
  assert.equal(res.code, 200); assert.equal(res.body, '12345');
  assert.equal(res.headers['Content-Type'], 'text/plain; charset=utf-8');
  assert.equal(res.headers['Cache-Control'], 'no-store');
});
test('rechaza token incorrecto, parámetros ausentes o repetidos y modo incorrecto', () => {
  for (const url of [validUrl.replace('test-secret', 'wrong'), '/api/whatsapp-webhook',
    validUrl + '&hub.challenge=67890', validUrl.replace('subscribe', 'invalid'),
    validUrl.replace('12345', '')]) {
    const res = response(); serveWebhook({ method: 'GET', url }, res, 'test-secret');
    assert.equal(res.code, 403);
  }
});
test('sin configuración no permite verificar; POST no confirma eventos sin guardar', () => {
  const get = response(); serveWebhook({ method: 'GET', url: validUrl }, get, '');
  assert.equal(get.code, 503);
  const post = response(); serveWebhook({ method: 'POST', url: validUrl }, post, 'test-secret');
  assert.equal(post.code, 503); assert.equal(post.headers['Retry-After'], '60');
});
test('rechaza otros métodos', () => {
  const res = response(); serveWebhook({ method: 'DELETE', url: validUrl }, res, 'test-secret');
  assert.equal(res.code, 405); assert.equal(res.headers.Allow, 'GET, POST');
});
