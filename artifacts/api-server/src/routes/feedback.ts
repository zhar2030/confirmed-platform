import { Router } from 'express';
import { db, feedbackTable } from '../lib/db';

const router = Router();

// POST /api/feedback
router.post('/feedback', async (req, res) => {
  try {
    const { type, message } = req.body as { type?: string; message?: string };
    if (!message?.trim()) {
      return res.status(400).json({ error: 'message_required' });
    }
    const validTypes = ['bug', 'idea', 'general'];
    const feedbackType = validTypes.includes(type ?? '') ? type! : 'general';

    await db.insert(feedbackTable).values({
      type: feedbackType,
      message: message.trim(),
    });

    return res.json({ success: true });
  } catch (err: any) {
    console.error('[POST /feedback]', err.message);
    return res.status(500).json({ error: 'feedback_failed' });
  }
});

// GET /api/feedback — admin only (requires SESSION_SECRET)
router.get('/feedback', async (req, res) => {
  const adminKey = process.env['SESSION_SECRET'];
  if (!adminKey || req.headers['x-admin-key'] !== adminKey) {
    return res.status(401).json({ error: 'admin_auth_required' });
  }
  try {
    const rows = await db.select().from(feedbackTable).orderBy(feedbackTable.createdAt);
    return res.json(rows);
  } catch (err: any) {
    console.error('[GET /feedback]', err.message);
    return res.status(500).json({ error: 'fetch_failed' });
  }
});

export default router;
