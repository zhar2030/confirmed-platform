import { Router } from 'express';
import { sendContactEmail } from '../lib/emailService';

const router = Router();

// ─── POST /api/contact ────────────────────────────────────────────────────────
router.post('/contact', async (req, res) => {
  try {
    const { name, facilityType, email, phone, message } = req.body as {
      name: string;
      facilityType: string;
      email: string;
      phone: string;
      message?: string;
    };

    if (!name || !email || !phone) {
      return res.status(400).json({ success: false, error: 'missing_fields' });
    }

    await sendContactEmail({ name, facilityType: facilityType || 'غير محدد', email, phone, message });

    return res.json({ success: true });
  } catch (err) {
    console.error('[contact]', err);
    return res.status(500).json({ success: false, error: 'send_failed' });
  }
});

export { router as contactRouter };
