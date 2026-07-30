/**
 * providerAuth middleware
 * Validates X-Provider-Token (HMAC) + X-Provider-Id + X-Provider-User.
 * Replaces the old unauthenticated X-Provider-Id-only pattern.
 */
import { Request, Response, NextFunction } from 'express';
import { verifyProviderToken } from '../lib/providerToken';

export function providerAuth(req: Request, res: Response, next: NextFunction): void {
  const rawId    = req.headers['x-provider-id'];
  const token    = req.headers['x-provider-token'] as string | undefined;
  const username = req.headers['x-provider-user']  as string | undefined;

  if (!rawId || !token || !username) {
    res.status(401).json({ error: 'provider_auth_required' });
    return;
  }

  const providerId = parseInt(String(rawId), 10);
  if (isNaN(providerId) || providerId <= 0) {
    res.status(401).json({ error: 'invalid_provider_id' });
    return;
  }

  if (!verifyProviderToken(providerId, username, token)) {
    res.status(401).json({ error: 'invalid_provider_token' });
    return;
  }

  // Attach verified providerId for downstream handlers
  (req as any).providerId = providerId;
  next();
}
