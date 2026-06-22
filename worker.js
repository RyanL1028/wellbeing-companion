/**
 * Cloudflare Worker — AI Image Analysis
 * POST /api/analyze — Mistral Vision API
 * Free tier: 100,000 requests/day
 */
const PROMPTS = {
  food: "Analyze this food photo and estimate its nutritional content. Return ONLY valid JSON (no markdown, no extra text) in this exact format:\n{\"name\":\"...\",\"calories\":000,\"protein_g\":00,\"carbs_g\":00,\"fat_g\":00,\"healthScore\":0,\"description\":\"...\"}\nhealthScore is 1-5 (1=unhealthy, 5=very healthy). Be realistic with estimates.",

  water: "Look at this photo and count how many cups/glasses/bottles of water are visible. Return ONLY valid JSON (no markdown, no extra text) in this exact format:\n{\"cupsCount\":0,\"totalMl\":000,\"description\":\"...\"}\nEstimate 250ml per standard cup. Count ALL drinking vessels containing clear liquid.",

  study: "Look at this photo and determine if the person is in a study/work environment. Return ONLY valid JSON (no markdown, no extra text) in this exact format:\n{\"studying\":true,\"confidence\":0.0,\"description\":\"...\",\"suggestions\":[\"...\"]}\nconfidence is 0.0-1.0. If studying, provide 1-2 brief tips. If not, describe what you see."
};

export default {
  async fetch(request, env) {
    // CORS preflight
    if (request.method === "OPTIONS") {
      return new Response("", {
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Headers": "Content-Type",
          "Access-Control-Allow-Methods": "POST, OPTIONS"
        }
      });
    }

    if (request.method !== "POST") {
      return json({ error: "Use POST" }, 405);
    }

    try {
      const { image, type, prompt } = await request.json();

      // Text-only chat mode (for sleep tips + wellness coach)
      if (type === 'chat') {
        const chatResponse = await fetch("https://api.mistral.ai/v1/chat/completions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${env.MISTRAL_API_KEY}`
          },
          body: JSON.stringify({
            model: "mistral-small-latest",
            messages: [
              { role: "system", content: "You are a friendly wellness coach for students. Give short, actionable, encouraging advice. Keep responses under 120 words. Try not to give medical advice unless asked explicitly and if so, make sure to state that you are not a medical professional and for proffesional advice they should consult a healthcare provider (e.g. doctor)." },
              { role: "user", content: prompt }
            ],
            max_tokens: 250,
            temperature: 0.7
          })
        });
        const chatData = await chatResponse.json();
        return json({ reply: chatData.choices[0].message.content.trim() }, 200);
      }

      // Image analysis mode
      if (!image || !PROMPTS[type]) {
        return json({ error: "Missing image or invalid type (food, water, study)" }, 400);
      }

      const mistralResponse = await fetch("https://api.mistral.ai/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${env.MISTRAL_API_KEY}`
        },
        body: JSON.stringify({
          model: "pixtral-12b-2409",
          messages: [{
            role: "user",
            content: [
              { type: "text", text: PROMPTS[type] },
              { type: "image_url", image_url: { url: image } }
            ]
          }],
          max_tokens: 500,
          temperature: 0.1
        })
      });

      const data = await mistralResponse.json();
      let raw = data.choices[0].message.content.trim();

      // Parse JSON from response (handle markdown code blocks)
      if (raw.startsWith("```")) {
        const lines = raw.split("\n");
        raw = lines.slice(1, lines[lines.length - 1] === "```" ? -1 : undefined).join("\n");
        if (raw.toLowerCase().startsWith("json")) raw = raw.slice(4);
        raw = raw.trim();
      }

      const result = JSON.parse(raw);
      return json(result, 200);

    } catch (e) {
      return json({ error: e.message }, 500);
    }
  }
};

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*"
    }
  });
}
