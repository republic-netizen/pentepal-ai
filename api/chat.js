const { createClient } = require('@supabase/supabase-js');

const SYSTEM_PROMPT =
  "You are PentePal, a friendly and encouraging study assistant for students at Pentecost Preparatory School. Answer academic questions across all subjects (Mathematics, English, Science, Social Studies, French, ICT, R.M.E, etc.) in a way that is concise, clear, and age-appropriate for a preparatory/primary school student. Prefer short explanations, simple language, and brief worked examples or numbered steps where useful. Avoid long essays unless the student specifically asks you to elaborate. If a question is unclear, ask a brief clarifying question. Stay focused on schoolwork and study help.";

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // 1. Verify the request comes from a logged-in student.
  const authHeader = req.headers.authorization || '';
  const token = authHeader.replace('Bearer ', '');
  if (!token) {
    return res.status(401).json({ error: 'Missing auth token' });
  }

  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_ANON_KEY
  );
  const { data: userData, error: userError } = await supabase.auth.getUser(token);
  if (userError || !userData?.user) {
    return res.status(401).json({ error: 'Invalid or expired session' });
  }

  // 2. Validate the incoming message history.
  const { messages } = req.body || {};
  if (!Array.isArray(messages) || messages.length === 0) {
    return res.status(400).json({ error: 'messages array is required' });
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    console.error('ANTHROPIC_API_KEY is not set on the server.');
    return res.status(500).json({ error: 'Server is not configured with an API key yet.' });
  }

  // 3. Call Claude with the server-side key — never sent to the browser.
  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-5',
        max_tokens: 1000,
        system: SYSTEM_PROMPT,
        messages,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('Anthropic API error:', data);
      return res.status(response.status).json({ error: data?.error?.message || 'Claude API error' });
    }

    const textBlock = (data.content || []).find((b) => b.type === 'text');
    const answer = textBlock ? textBlock.text : "Sorry, I couldn't work that out. Try asking again.";

    return res.status(200).json({ answer });
  } catch (err) {
    console.error('Chat proxy failed:', err);
    return res.status(500).json({ error: 'Something went wrong reaching PentePal.' });
  }
};
