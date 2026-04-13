const express = require('express');
const router = express.Router();

router.post('/improve', async (req, res) => {
  try {
    const { text, type } = req.body;
    if (!text) return res.status(400).json({ error: 'No text provided' });

    const prompts = {
      duties: `You are helping a UK security officer write their CV. Fix any spelling and grammar errors in the following job duties text and make it professional, clear and concise. Use active voice. Return only the improved text with no preamble:\n\n${text}`,
      cover_letter: `Fix any spelling and grammar errors in this cover letter and make it more impactful while keeping it professional and authentic. Return only the improved letter:\n\n${text}`,
      generate_cover_letter: text, // full prompt passed directly
    };

    const prompt = prompts[type] || prompts.duties;

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 1000,
        messages: [{ role: 'user', content: prompt }],
      }),
    });

    if (!response.ok) {
      const err = await response.json();
      throw new Error(err.error?.message || 'AI request failed');
    }

    const data = await response.json();
    const result = data.content?.[0]?.text;
    res.json({ result });
  } catch (err) {
    console.error('AI error:', err.message);
    res.status(500).json({ error: 'AI service unavailable' });
  }
});

module.exports = router;
