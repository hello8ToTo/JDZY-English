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
  if (payload.mode === 'conversation') {
    const clientFacts = payload.clientFacts && typeof payload.clientFacts === 'object' ? payload.clientFacts : {};
    return `You are both an overseas EV customer in a classroom role-play and a careful English-for-sales evaluator. Stay in character when replying to the student. Use ONLY the supplied client facts; never invent prices, specifications, promises, or personal details. If the question is unclear or asks for an unavailable fact, politely ask the student to clarify. Evaluate the student's English follow-up for relevance to missing information, clarity, politeness, and specificity. Do not penalize harmless regional spelling variants.\n\nScenario: ${payload.scenarioTitle}\nClient: ${payload.clientName} from ${payload.city}, ${payload.country}\nReception context: ${payload.context}\nWhat the client already said: ${payload.caseText}\nInformation selected by the student as heard: ${(payload.heard || []).join('; ')}\nFollow-up topic selected by the student: ${payload.topicLabel}\nTopic status: ${payload.topicStatus}\nAvailable client facts for role-play: ${Object.entries(clientFacts).map(([key, value]) => `${key}: ${value}`).join('; ')}\nStudent question: ${payload.question}\n\nReturn ONLY valid JSON with this exact shape: {"questionScore":0,"relevanceScore":0,"clarityScore":0,"politenessScore":0,"specificityScore":0,"clientReply":"...","advice":["...","..."],"sampleQuestion":"..."}. All five scores must be integers from 0 to 100. clientReply must be a concise natural English answer spoken as the client, using only the supplied facts. Write advice in Chinese. sampleQuestion must be a short, polite and specific English follow-up question for the selected topic.`;
  }
  if (payload.mode === 'delivery') {
    return `You are an English-for-automotive-sales instructor. Assess a student's spoken client-confirmation task from its browser transcript. Do not claim to have heard the audio or to score pronunciation acoustically. Assess task completion, natural professional English, relevance of the follow-up, and whether the student agrees a next step.\n\nCase country: ${payload.country}\nCase title: ${payload.title}\nClient request: ${payload.caseText}\nInformation the student selected as heard: ${(payload.heard || []).join('; ')}\nInformation selected for follow-up: ${(payload.followUps || []).join('; ')}\nStudent transcript: ${payload.transcript}\n\nReturn ONLY valid JSON with this exact shape: {"overallScore":0,"taskScore":0,"interactionScore":0,"fluencyScore":0,"pronunciationScore":null,"advice":["...","...","..."],"sampleResponse":"..."}. Scores must be integers from 0 to 100. Write advice in Chinese. sampleResponse must be a short, natural English client-confirmation response that confirms known needs, asks about one missing item, and promises a clear next step.`;
  }
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

  const required = payload?.mode === 'delivery'
    ? ['country', 'title', 'caseText', 'transcript']
    : payload?.mode === 'conversation'
      ? ['country', 'scenarioTitle', 'clientName', 'city', 'context', 'caseText', 'topicLabel', 'question']
      : ['country', 'title', 'caseText', 'question'];
  if (!required.every(key => typeof payload?.[key] === 'string' && payload[key].trim())) {
    return json({ message: '缺少必要的评估内容。' }, 400);
  }
  const studentText = payload?.mode === 'delivery' ? payload.transcript : payload.question;
  if (studentText.length > 3000 || payload.caseText.length > 12000) {
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
    if (payload.mode === 'conversation') {
      const scoreKeys = ['questionScore', 'relevanceScore', 'clarityScore', 'politenessScore', 'specificityScore'];
      if (!scoreKeys.every(key => Number.isInteger(Number(result[key])) && Number(result[key]) >= 0 && Number(result[key]) <= 100)
        || typeof result.clientReply !== 'string' || !Array.isArray(result.advice) || typeof result.sampleQuestion !== 'string') {
        throw new Error('Model response does not match conversation schema');
      }
      return json(Object.fromEntries(scoreKeys.map(key => [key, Number(result[key])]).concat([
        ['clientReply', result.clientReply.slice(0, 700)],
        ['advice', result.advice.slice(0, 5).map(item => String(item).slice(0, 300))],
        ['sampleQuestion', result.sampleQuestion.slice(0, 500)]
      ])));
    }
    if (payload.mode === 'delivery') {
      const scoreKeys = ['overallScore', 'taskScore', 'interactionScore', 'fluencyScore'];
      if (!scoreKeys.every(key => Number.isInteger(Number(result[key])) && Number(result[key]) >= 0 && Number(result[key]) <= 100) || !Array.isArray(result.advice) || typeof result.sampleResponse !== 'string') throw new Error('Model response does not match delivery schema');
      return json(Object.fromEntries(scoreKeys.map(key => [key, Number(result[key])]).concat([['pronunciationScore', null], ['advice', result.advice.slice(0, 5).map(item => String(item).slice(0, 300))], ['sampleResponse', result.sampleResponse.slice(0, 700)]])));
    }
    const questionScore = Number(result.questionScore);
    if (!Number.isInteger(questionScore) || questionScore < 0 || questionScore > 100 || !Array.isArray(result.advice) || typeof result.sampleQuestion !== 'string') throw new Error('Model response does not match expected schema');
    return json({ questionScore, advice: result.advice.slice(0, 5).map(item => String(item).slice(0, 300)), sampleQuestion: result.sampleQuestion.slice(0, 500) });
  } catch (error) {
    console.error('AI evaluation failed', error?.message);
    return json({ message: 'AI 评估解析失败，请稍后重试。' }, 502);
  }
}
