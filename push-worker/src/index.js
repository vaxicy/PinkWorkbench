import { buildPushPayload } from '@block65/webcrypto-web-push';

const json = (data, status = 200) => new Response(JSON.stringify(data), {
  status,
  headers: { 'content-type': 'application/json; charset=utf-8' },
});

function cors(request, env) {
  const origin = request.headers.get('origin');
  const allowed = origin && (origin === env.APP_ORIGIN || origin.endsWith('.pink-workbench.pages.dev')) ? origin : env.APP_ORIGIN;
  return { 'access-control-allow-origin': allowed, 'access-control-allow-methods': 'GET,POST,DELETE,OPTIONS', 'access-control-allow-headers': 'content-type', 'vary': 'Origin' };
}

function withCors(response, request, env) {
  const headers = new Headers(response.headers);
  for (const [key, value] of Object.entries(cors(request, env))) headers.set(key, value);
  return new Response(response.body, { status: response.status, headers });
}

function base64url(bytes) {
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

function decodeBase64url(value) {
  const padded = value.replace(/-/g, '+').replace(/_/g, '/') + '==='.slice((value.length + 3) % 4);
  const binary = atob(padded);
  return Uint8Array.from(binary, char => char.charCodeAt(0));
}

async function publicKeyFromPrivate(privateJwk) {
  const key = await crypto.subtle.importKey('jwk', JSON.parse(privateJwk), { name: 'ECDSA', namedCurve: 'P-256' }, false, ['sign']);
  const jwk = await crypto.subtle.exportKey('jwk', key);
  return base64url(Uint8Array.from([4, ...decodeBase64url(jwk.x), ...decodeBase64url(jwk.y)]));
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (request.method === 'OPTIONS') return withCors(new Response(null, { status: 204 }), request, env);
    if (url.pathname === '/vapid-public-key' && request.method === 'GET') {
      return withCors(json({ publicKey: env.VAPID_PUBLIC_KEY }), request, env);
    }
    const match = url.pathname.match(/^\/devices\/([a-zA-Z0-9_-]{16,80})(?:\/(subscribe|reminder|test))?$/);
    if (!match) return withCors(json({ error: 'not_found' }, 404), request, env);
    const id = env.REMINDERS.idFromName(match[1]);
    const stub = env.REMINDERS.get(id);
    const headers = new Headers(request.headers);
    headers.set('x-device-id', match[1]);
    const forwarded = new Request(new URL('/' + (match[2] || ''), request.url), { method: request.method, headers, body: request.method === 'GET' || request.method === 'DELETE' ? undefined : request.body });
    return withCors(await stub.fetch(forwarded), request, env);
  },
};

export class Reminder {
  constructor(state, env) { this.state = state; this.env = env; }

  async fetch(request) {
    const path = new URL(request.url).pathname;
    if (request.method === 'POST' && path === '/subscribe') {
      const body = await request.json();
      if (!body?.subscription?.endpoint) return json({ error: 'invalid_subscription' }, 400);
      const current = await this.state.storage.get('reminder') || {};
      const reminder = { ...current, subscription: body.subscription, intervalMin: Math.max(1, Number(body.intervalMin) || 60), active: Boolean(body.active), nextReminderAt: Number(body.nextReminderAt) || 0 };
      await this.state.storage.put('reminder', reminder);
      if (reminder.active) await this.state.storage.setAlarm(reminder.nextReminderAt || Date.now() + reminder.intervalMin * 60000);
      return json({ ok: true });
    }
    if (request.method === 'POST' && path === '/reminder') {
      const body = await request.json();
      const current = await this.state.storage.get('reminder') || {};
      const reminder = { ...current, intervalMin: Math.max(1, Number(body.intervalMin) || current.intervalMin || 60), active: Boolean(body.active), nextReminderAt: Number(body.nextReminderAt) || 0 };
      await this.state.storage.put('reminder', reminder);
      if (reminder.active) await this.state.storage.setAlarm(reminder.nextReminderAt || Date.now() + reminder.intervalMin * 60000);
      else await this.state.storage.deleteAlarm();
      return json({ ok: true });
    }
    if (request.method === 'POST' && path === '/test') {
      await this.send('💧 测试提醒', '该喝水啦，后台推送已经接通。');
      return json({ ok: true });
    }
    if (request.method === 'DELETE' && path === '/') {
      await this.state.storage.deleteAll();
      return json({ ok: true });
    }
    return json({ error: 'not_found' }, 404);
  }

  async alarm() {
    const reminder = await this.state.storage.get('reminder');
    if (!reminder?.active || !reminder.subscription) return;
    await this.send('💧 喝水提醒', '喝一口水，再继续今天的事情吧。');
    reminder.nextReminderAt = Date.now() + Math.max(1, reminder.intervalMin) * 60000;
    await this.state.storage.put('reminder', reminder);
    await this.state.storage.setAlarm(reminder.nextReminderAt);
  }

  async send(title, body) {
    const reminder = await this.state.storage.get('reminder');
    if (!reminder?.subscription) return;
    // urgency: high + 唯一 tag，提高 iOS 到达概率，避免被当作旧通知替换
    const payload = await buildPushPayload({ data: JSON.stringify({ title, body, url: '/' }), options: { ttl: 300, urgency: 'high', tag: 'water-' + Date.now() } }, reminder.subscription, {
      subject: this.env.VAPID_SUBJECT,
      publicKey: this.env.VAPID_PUBLIC_KEY,
      privateKey: this.env.VAPID_PRIVATE_JWK,
    });
    const response = await fetch(reminder.subscription.endpoint, payload);
    if (response.status === 404 || response.status === 410) await this.state.storage.deleteAll();
  }
}
