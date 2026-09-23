// Cloudflare Pages Function —— 宠物 AI 聊天代理
// 把硅基流动(SiliconFlow)的 key 存在 Pages Secret 里，前端只调同域 /api/chat，key 不进代码、不进 git。

// 仅放开放的免费模型，防止被拿去打别的模型（SSRF/刷额度防护）
const ALLOWED_MODELS = [
  'Qwen/Qwen2.5-7B-Instruct',
  'Qwen/Qwen2.5-14B-Instruct',
  'Qwen/Qwen3-8B',
  'THUDM/glm-4-9b-chat',
  'deepseek-ai/deepseek-llm-7b-chat',
];

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8' },
  });
}

export async function onRequestPost({ request, env }) {
  const apiKey = env.SILICONFLOW_API_KEY;
  if (!apiKey) return json({ error: 'not_configured' }, 500);

  let body;
  try { body = await request.json(); } catch { return json({ error: 'bad_json' }, 400); }

  const messages = body.messages;
  if (!Array.isArray(messages) || !messages.length) return json({ error: 'empty_messages' }, 400);

  let model = body.model;
  if (!ALLOWED_MODELS.includes(model)) model = 'Qwen/Qwen2.5-7B-Instruct';

  // 只保留安全的 message 字段，限制长度，避免异常输入打爆上游
  const safeMessages = messages.slice(-24).map(m => ({
    role: (m.role === 'assistant' || m.role === 'user' || m.role === 'system') ? m.role : 'user',
    content: String(m.content || '').slice(0, 2000),
  }));

  const isQwen3 = model.includes('Qwen3');

  let upstreamRes;
  try {
    upstreamRes = await fetch('https://api.siliconflow.cn/v1/chat/completions', {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'authorization': 'Bearer ' + apiKey },
      body: JSON.stringify({
        model,
        messages: safeMessages,
        stream: true,
        max_tokens: 600,
        temperature: 0.9,
        ...(isQwen3 ? { chat_template_kwargs: { enable_thinking: false } } : {}),
      }),
    });
  } catch (e) {
    return json({ error: 'upstream_error', detail: String(e) }, 502);
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
        try { controller.enqueue(encoder.encode('data: ' + JSON.stringify({ error: String(e) }) + '\n\n')); } catch {}
      } finally {
        controller.close();
      }
    },
    cancel() { try { reader.cancel(); } catch {} },
  });

  return new Response(stream, {
    status: upstreamRes.status,
    headers: {
      'content-type': 'text/event-stream; charset=utf-8',
      'cache-control': 'no-cache, no-transform',
      'connection': 'keep-alive',
      'x-accel-buffering': 'no',
    },
  });
}

// 兜底 OPTIONS（本地跨域调试用）
export async function onRequestOptions() {
  return new Response(null, { status: 204, headers: {
    'access-control-allow-origin': '*',
    'access-control-allow-methods': 'POST, OPTIONS',
    'access-control-allow-headers': 'content-type',
  } });
}
