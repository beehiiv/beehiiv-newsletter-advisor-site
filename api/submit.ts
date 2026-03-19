import type { VercelRequest, VercelResponse } from '@vercel/node';

const SLACK_WEBHOOK_URL = process.env.SLACK_WEBHOOK_URL || '';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Only allow POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { productUrl, email } = req.body;

  if (!productUrl) {
    return res.status(400).json({ error: 'Product URL is required' });
  }

  try {
    const slackMessage = {
      blocks: [
        {
          type: 'header',
          text: {
            type: 'plain_text',
            text: '🎉 New Product Submission',
            emoji: true
          }
        },
        {
          type: 'section',
          fields: [
            {
              type: 'mrkdwn',
              text: `*Product URL:*\n<${productUrl}|${productUrl}>`
            },
            {
              type: 'mrkdwn',
              text: `*Submitted by:*\n${email || 'Not provided'}`
            }
          ]
        },
        {
          type: 'context',
          elements: [
            {
              type: 'mrkdwn',
              text: `Submitted at ${new Date().toISOString()}`
            }
          ]
        }
      ]
    };

    const slackResponse = await fetch(SLACK_WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(slackMessage)
    });

    if (!slackResponse.ok) {
      throw new Error('Failed to send to Slack');
    }

    return res.status(200).json({ success: true });
  } catch (error) {
    console.error('Submission error:', error);
    return res.status(500).json({ error: 'Failed to submit' });
  }
}
