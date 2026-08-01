# Research Report: Using OpenAI Codex for Image-Based Cat Interactions and Plant Growth in PinkWorkbench

## Executive Summary

OpenAI Codex and the GPT-4o vision family can power two distinct PinkWorkbench features: a visually-aware cat companion that reacts to clicks on its rendered image, and procedurally generated plant growth stages. The practical path is a **hybrid architecture**: pre-generate plant growth sprites and pet reaction poses with an image generation model such as GPT Image 1, then use GPT-4o vision only for novel, context-aware reactions when a user supplies or authorizes an API key. A Cloudflare Worker proxy is required to keep any OpenAI key out of the client bundle. For a pure client-side PWA without a backend budget, the safest fallback is to ship all generative assets at build time and skip live API calls entirely.

## Background and Context

PinkWorkbench is a single-file HTML/CSS/JS PWA that already renders a pixel-art pet room and garden. The current pet system uses emoji-driven state updates, pre-generated PNG sprites, and daily interaction limits. The user wants to explore whether OpenAI Codex can make the cat respond to clicks on its actual image and whether plants can grow through generative image stages. Because PinkWorkbench is deployed as a static site on Cloudflare Pages and stores state in `localStorage`, any AI integration must respect three constraints: no long-running server, no exposed secrets, and minimal per-user cost.

## What Codex and GPT-4o Vision Can Do for Image-Based Pet Interaction

Codex is OpenAI's agentic coding model, but the underlying vision capability comes from the GPT-4o family. For an interactive cat, the relevant API is the chat completions endpoint with vision input, not a dedicated "Codex pet API." The frontend can capture the pet's current on-screen image or its pre-rendered sprite, encode it as base64 or a URL, and send it with a prompt such as "The user just clicked the cat's head in a cozy pink room. Return a JSON reaction: moodChange, animation, and a short Chinese text bubble."

The API accepts an array of content parts where one part is `{"type":"image_url","image_url":{"url":"data:image/png;base64,..."}}` and another part is text. By adding `response_format: {type:"json_object"}` or a function schema, the model returns structured data that the frontend can parse safely. This makes it possible to derive a reaction from the visual context rather than from a hard-coded lookup table. For example, a click near the food bowl could return `{"moodChange":+5,"animation":"eat","text":"还要吃小鱼干吗？"}`, while a click on the tail could return `{"moodChange":+2,"animation":"wiggle","text":"别碰我尾巴呀～"}`.

The catch is latency. A vision request with a 1024x1024 image can take several seconds from a browser, especially after base64 encoding overhead and network round-trips. That is too slow for an immediate click reaction in a playful UI. The better pattern is to pre-generate a small set of reaction sprites and text lines, then use the vision model **offline during development** to author those assets, or use it **sparingly** for special events such as "take a photo of your real cat and let the virtual cat react to it."

## Plant Growth Implementation Options

Plant growth in PinkWorkbench can be implemented as a state machine with visual stages. The technical question is how each stage's image is produced. There are four realistic options, ranked from simplest to most AI-heavy.

**Option A: Hand-drawn or pre-generated sprite sheet.** The artist or AI generates one image per stage at build time, stores them as PNG files, and the app swaps `src` based on `growthLevel`. This is the current garden pattern and remains the cheapest and most reliable.

**Option B: Prompt-driven runtime generation with GPT Image 1.** Each time a plant reaches a new stage, the frontend sends a prompt like "A cute pixel-art rose at growth stage 3 of 5, pink petals, in a round pot, transparent background" to an image generation API and displays the returned URL. This produces endless variety but requires an API key, network access, and budget per user.

**Option C: Prompt-to-sprite pipeline during build.** A build script calls GPT Image 1 or DALL-E 3 once per plant type and stage, caches the results in `generated-images/`, and ships them with the app. The runtime remains simple sprite swapping, but the asset library is AI-generated. This balances variety and runtime reliability.

**Option D: Canvas-based procedural drawing.** Instead of images, draw the plant with Canvas or SVG using parameters such as height, leaf count, and flower color. This avoids image generation entirely and allows smooth interpolation between stages, but it requires custom drawing code and looks less like the existing pixel-art style.

For PinkWorkbench, Option C is the sweet spot: keep the runtime client-side and static, but use generative AI to expand the plant catalog without manual drawing. Option B should only be offered as a premium, opt-in feature with the user's own API key.

## Integration Architecture for a Client-Side PWA

Any live OpenAI API call from PinkWorkbench must pass through a backend proxy. The reason is that an API key shipped in client-side JavaScript is visible to any user who opens DevTools. Once leaked, the key can be used to drain the account quota.

The recommended architecture is a Cloudflare Worker deployed alongside the existing Cloudflare Pages site. The browser sends requests to `https://api.pink-workbench.pages.dev/ai` or a dedicated Worker route such as `https://pink-ai-proxy.yourname.workers.dev/v1/chat/completions`. The Worker holds the OpenAI key as an encrypted Secret, validates an optional custom token, strips any incoming Authorization header, forwards the request to OpenAI, and returns the response. Cloudflare's free tier provides 100,000 requests per day, which is ample for a personal productivity app.

For vision requests, the flow is: user clicks the cat → frontend captures the visible canvas or image element → base64 is sent to the Worker → Worker forwards to `v1/chat/completions` with the GPT-4o model and JSON schema → model returns reaction JSON → Worker returns JSON → frontend updates state and plays the matching pre-generated animation.

For image generation, the flow is similar but targets the `v1/images/generations` endpoint. The Worker can also cache generated images in Cloudflare Cache or R2 to avoid paying twice for the same prompt.

## Cost, Latency, and Security Considerations

GPT-4o vision input is billed by token. At roughly $2.50 per million input tokens and $10.00 per million output tokens as of August 2026, a single 1024x1024 image with the `high` detail setting can consume tens of thousands of tokens, translating to a few cents per request. GPT-4o Mini is about seventeen times cheaper at $0.15/$0.60 per million tokens and is sufficient for simple reaction classification, making it the better default for high-frequency interactions.

Image generation via GPT Image 1 or DALL-E 3 costs roughly $0.02 to $0.20 per image depending on resolution and model variant. For a plant catalog of 8 plant types × 5 stages, pre-generating all images once costs under $10. Runtime generation per user would scale with user count and could become expensive quickly.

Latency is the user-experience bottleneck. A typical vision request can take 2–5 seconds end-to-end. Image generation can take 3–10 seconds. These delays are acceptable for background asset generation or occasional special interactions but feel sluggish for every click. Therefore, the frontend should show immediate feedback using local animations and only call the API when the result genuinely depends on novel visual input.

Security requires three layers: the API key lives only in the Worker Secret, the Worker validates the request origin or a custom token, and the frontend strips any key before shipping. If the app cannot run a Worker, the only safe alternative is to ask each user to provide their own OpenAI key and store it in `localStorage` with clear consent; this removes the proxy but places cost and trust entirely on the user.

## Recommended Hybrid Approach for PinkWorkbench

The most practical way to add "Codex-powered" visuals without breaking the PWA model is:

1. **Keep the daily-limit logic local.** Petting, feeding, and playing already use `interactLog[todayKey()]` counters. Any new AI feature should respect the same limits to prevent accidental cost explosions.

2. **Pre-generate growth and reaction assets.** Use a build-time script that calls GPT Image 1 or DALL-E 3 to produce plant stage images and extra pet poses for each animal type. Store them in `generated-images/` and ship them with the app.

3. **Use GPT-4o Mini for optional smart reactions.** Add an opt-in setting where the user can enable "AI reactions." When enabled, clicks on the pet image are sent to a Cloudflare Worker proxy with a base64 crop of the pet. The model returns one of a small set of reactions that the frontend already knows how to animate. This avoids generating images at runtime and keeps latency low.

4. **Never embed keys in the client.** If the user does not configure a proxy, disable live AI features and fall back to the pre-generated asset set.

## Global User Rule Recommendation

The reusable finding from this research is a security pattern, not a product-specific choice: **client-side web apps and browser extensions that integrate generative AI APIs must not ship API keys in the frontend bundle.** The correct pattern is a backend proxy (Cloudflare Worker, Vercel Edge Function, or similar) that stores the key in an encrypted secret and validates requests, or an explicit user-provided key with informed consent. This rule applies across all Chrome extensions and PWAs the user builds, so it is worth writing into global User Rules.

## Limitations

This research relied on publicly available OpenAI documentation and third-party pricing aggregators; exact token counts for vision images depend on undocumented details such as tiling behavior. Pricing and model names change frequently, so any cost estimates should be re-checked before deployment. The research also did not benchmark latency from mainland China, where routing to OpenAI endpoints may require additional proxy considerations beyond Cloudflare.

## References

1. [OpenAI Vision Guide - developers.openai.ac.cn](https://developers.openai.ac.cn/api/docs/guides/images-vision)
2. [Holysheep - GPT-4o Vision API 完整教程](https://www.holysheep.ai/articles/zh-gpt-4o-vision-api-wanzhengjiaochengtupianlijieyufe-2026-04-09-0062.html)
3. [APIDot - AI Image Generation API Pricing 2026](https://apidot.ai/zh/blog/ai-image-generation-api-pricing-2026)
4. [Dev.to - Rebuilding the 90s Tamagotchi for the Browser](https://dev.to/tech-aficionado/i-rebuilt-the-90s-tamagotchi-for-the-browser-and-accidentally-learned-more-about-state-machines-254j)
5. [腾讯云 - GPT-Image-1 API 详解](https://cloud.tencent.com/developer/article/2516198)
6. [CSDN - Web 前端实现虚拟宠物](https://blog.csdn.net/weixin_28728279/article/details/161063741)
7. [Easton Dev - Cloudflare Workers OpenAI API Proxy](https://eastondev.com/blog/zh/posts/ai/20251201-workers-ai-proxy-guide/)
8. [LM Market Cap - OpenAI API Pricing 2026](https://lmmarketcap.com/openai-api-pricing)
