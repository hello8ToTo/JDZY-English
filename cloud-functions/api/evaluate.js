const jsonHeaders = { 'Content-Type': 'application/json; charset=utf-8' };

function json(data, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: jsonHeaders });
}

function cleanModelJson(content) {
  const text = String(content || '').trim()
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/i, '');
  return JSON.parse(text);
}

function buildPrompt(payload) {
  const terms = Array.isArray(payload.terms) ? payload.terms : [];
  const placements = payload.placements && typeof payload.placements === 'object' ? payload.placements : {};
  return `You are an English-for-automotive-sales instructor. Assess one student's follow-up question for this overseas EV sales case.\n\nCase country: ${payload.country}\nCase title: ${payload.title}\nCase text: ${payload.caseText}\nKey terms: ${terms.map(term => `${term.text} (${term.type})`).join(', ')}\nStudent classifications: ${Object.entries(placements).map(([key, zone]) => `${key}: ${zone}`).join(', ')}\nStudent question: ${payload.question}\n\nReturn ONLY valid JSON with this exact shape: {"questionScore":0,"advice":["...","...","..."],"sampleQuestion":"..."}. questionScore must be an integer from 0 to 100. Write all advice in Chinese. The sampleQuestion must be a natural English question relevant to missing information in this case.`;
}

export async function onRequestPost(context) {
  const { request, env } = context;
  const apiKey = env?.XFYUN_API_KEY;
  const apiUrl = env?.XFYUN_API_URL;
  const model = env?.XFYUN_MODEL;

  if (!apiKey || !apiUrl || !model) {
    return json({ message: 'AI 服务尚未完成环境变量配置。' }, 503);
  }

  let payload;
  try {
    payload = await request.json();
  } catch {
    return json({ message: '请求格式无效。' }, 400);
  }

  const required = ['country', 'title', 'caseText', 'question'];
  if (!required.every(key => typeof payload?.[key] === 'string' && payload[key].trim())) {
    return json({ message: '缺少必要的评估内容。' }, 400);
  }
  if (payload.question.length > 1000 || payload.caseText.length > 12000) {
    return json({ message: '评估内容长度超出限制。' }, 413);
  }

  try {
    const upstream = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model,
        temperature: 0.2,
        messages: [
          { role: 'system', content: 'You are a careful evaluator. Follow the requested JSON format exactly.' },
          { role: 'user', content: buildPrompt(payload) }
        ]
      })
    });

    const upstreamBody = await upstream.json().catch(() => ({}));
    if (!upstream.ok) {
      console.error('XFYUN request failed', upstream.status, upstreamBody?.error?.message);
      return json({ message: '讯飞模型服务暂时不可用。' }, 502);
    }

    const result = cleanModelJson(upstreamBody?.choices?.[0]?.message?.content);
    const questionScore = Number(result.questionScore);
    if (!Number.isInteger(questionScore) || questionScore < 0 || questionScore > 100 || !Array.isArray(result.advice) || typeof result.sampleQuestion !== 'string') {
      throw new Error('Model response does not match expected schema');
    }

    return json({
      questionScore,
      advice: result.advice.slice(0, 5).map(item => String(item).slice(0, 300)),
      sampleQuestion: result.sampleQuestion.slice(0, 500)
    });
  } catch (error) {
    console.error('AI evaluation failed', error?.message);
    return json({ message: 'AI 评估解析失败，请稍后重试。' }, 502);
  }
}
