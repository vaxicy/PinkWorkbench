// Cloudflare Pages Function —— AI 代理
// 防护要点：
//  1) 模型在服务端**写死**为唯一「置顶模型」，前端传什么 model 一律忽略，也**绝不 fallback** 到其它（更贵的）模型；
//  2) 只允许自家站点调用（Origin 白名单），第三方网站拿不到 CORS 放行；
//  3) 每 IP 每分钟限流 + 输入长度/条数/输出长度上限，防止被拿去刷额度。

const MODEL = 'deepseek-ai/DeepSeek-V4-Flash';
const MAX_TOKENS = 800;        // 输出上限（防止一次刷爆）
const MAX_MSGS = 16;           // 最多取最近 16 条
const MAX_MSG_CHARS = 1500;    // 单条上限
const MAX_TOTAL_CHARS = 6000;  // 总输入上限
const RATE_LIMIT = 30;         // 每窗口允许请求数
const RATE_WINDOW = 60;        // 限流窗口（秒）

// 只放行自家站点：Pages 预览域/生产域 + 本地调试
const ORIGIN_PATTERNS = [
  /^https:\/\/[a-z0-9-]+\.pink-workbench\.pages\.dev$/i,
  /^https:\/\/pink-workbench\.pages\.dev$/i,
  /^http:\/\/localhost(:\d+)?$/i,
  /^http:\/\/127\.0\.0\.1(:\d+)?$/i,
];
function originAllowed(origin) {
  if (!origin) return false;
  return ORIGIN_PATTERNS.some((re) => re.test(origin));
}

function json(data, status = 200, origin = '') {
  const headers = { 'content-type': 'application/json; charset=utf-8' };
  if (originAllowed(origin)) {
    headers['access-control-allow-origin'] = origin;
    headers['vary'] = 'origin';
  }
  return new Response(JSON.stringify(data), { status, headers });
}

// 基于 Cache API 的轻量限流（无需额外 KV 绑定；各节点独立计数，够用）
async function rateLimited(ip) {
  if (!ip) return false;
  try {
    const bucket = Math.floor(Date.now() / 1000 / RATE_WINDOW);
    const key = new Request('https://rate-limit.internal/chat/' + encodeURIComponent(ip) + '/' + bucket);
    const cache = caches.default;
    const hit = await cache.match(key);
    const used = hit ? parseInt(await hit.text(), 10) || 0 : 0;
    if (used >= RATE_LIMIT) return true;
    await cache.put(
      key,
      new Response(String(used + 1), { headers: { 'cache-control': 'max-age=' + RATE_WINDOW } })
    );
    return false;
  } catch {
    return false; // 限流本身出错时不影响正常使用
  }
}

export async function onRequestPost({ request, env }) {
  const origin = request.headers.get('origin') || '';

  // 1) 来源校验：挡住第三方网站直接调这个接口
  if (!originAllowed(origin)) return json({ error: 'forbidden_origin' }, 403);

  const apiKey = env.SILICONFLOW_API_KEY;
  if (!apiKey) return json({ error: 'not_configured' }, 500, origin);

  // 2) 限流
  const ip = request.headers.get('cf-connecting-ip') || '';
  if (await rateLimited(ip)) return json({ error: 'rate_limited' }, 429, origin);

  let body;
  try { body = await request.json(); } catch { return json({ error: 'bad_json' }, 400, origin); }

  const messages = body && body.messages;
  if (!Array.isArray(messages) || !messages.length) return json({ error: 'empty_messages' }, 400, origin);

  // 3) 清洗消息 + 长度上限
  let total = 0;
  const safeMessages = messages.slice(-MAX_MSGS).map((m) => {
    const content = String((m && m.content) || '').slice(0, MAX_MSG_CHARS);
    total += content.length;
    const role = m && (m.role === 'assistant' || m.role === 'user' || m.role === 'system') ? m.role : 'user';
    return { role, content };
  }).filter((m) => m.content);
  if (!safeMessages.length) return json({ error: 'empty_messages' }, 400, origin);
  if (total > MAX_TOTAL_CHARS) return json({ error: 'too_large' }, 413, origin);

  let upstreamRes;
  try {
    upstreamRes = await fetch('https://api.siliconflow.cn/v1/chat/completions', {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: 'Bearer ' + apiKey },
      body: JSON.stringify({
        model: MODEL,          // ← 永远是这个模型，不接受外部指定
        messages: safeMessages,
        stream: true,
        max_tokens: MAX_TOKENS,
        temperature: 0.9,
      }),
    });
  } catch (e) {
    return json({ error: 'upstream_error', detail: String(e) }, 502, origin);
  }

  // 上游失败直接把状态码透传，前端自行提示；不做任何模型降级/重试
  if (!upstreamRes.ok || !upstreamRes.body) {
    const detail = await upstreamRes.text().catch(() => '');
    return json({ error: 'upstream_' + upstreamRes.status, detail: detail.slice(0, 300) }, 502, origin);
  }

  const encoder = new TextEncoder();
  const reader = upstreamRes.body.getReader();
  const stream = new ReadableStream({
    async start(controller) {
      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          controller.enqueue(value);
        }
      } catch (e) {
        try {
          controller.enqueue(encoder.encode('data: ' + JSON.stringify({ error: String(e) }) + '\n\n'));
        } catch {}
      } finally {
        controller.close();
      }
    },
    cancel() { try { reader.cancel(); } catch {} },
  });

  const headers = {
    'content-type': 'text/event-stream; charset=utf-8',
    'cache-control': 'no-cache, no-transform',
    connection: 'keep-alive',
    'x-accel-buffering': 'no',
  };
  if (originAllowed(origin)) {
    headers['access-control-allow-origin'] = origin;
    headers['vary'] = 'origin';
  }

  return new Response(stream, { status: 200, headers });
}

// 预检：仅对本站点放行，不再返回通配 *
export async function onRequestOptions({ request }) {
  const origin = request.headers.get('origin') || '';
  if (!originAllowed(origin)) return new Response(null, { status: 403 });
  return new Response(null, {
    status: 204,
    headers: {
      'access-control-allow-origin': origin,
      'access-control-allow-methods': 'POST, OPTIONS',
      'access-control-allow-headers': 'content-type',
      'access-control-max-age': '86400',
      vary: 'origin',
    },
  });
}
