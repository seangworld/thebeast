import { createHash, timingSafeEqual } from 'node:crypto';
import { NextRequest, NextResponse } from 'next/server';
import { canonicalAccountMailAdmin } from '@/lib/auth/accountMail/server';
import { deliverClaimedAccountMail, smtpSender, type AccountMail } from '@/lib/auth/accountMail/delivery';

export const runtime = 'nodejs';

const reply = (status: number, result: string) =>
  NextResponse.json({ result }, { status, headers: { 'Cache-Control': 'no-store' } });

export async function POST(request: NextRequest) {
  const token = process.env.BEAST_ACCOUNT_MAIL_CONTROLLED_RECOVERY_SECRET;
  const expected = token && /^[a-f0-9]{64}$/.test(token) ? Buffer.from('Bearer ' + token) : null;
  const supplied = Buffer.from(request.headers.get('authorization') ?? '');
  if (!expected || supplied.length !== expected.length || !timingSafeEqual(supplied, expected)) {
    return reply(401, 'unauthorized');
  }
  if (
    process.env.VERCEL_ENV !== 'production' ||
    process.env.BEAST_ACCOUNT_MAIL_ENABLED !== 'false' ||
    process.env.NEXT_PUBLIC_BEAST_USERNAME_MAIL_ENABLED !== 'false' ||
    process.env.BEAST_OWNER_REGISTRATION_MAIL_ENABLED !== 'false'
  ) {
    return reply(404, 'disabled');
  }

  try {
    const admin = canonicalAccountMailAdmin();
    // The separately authorized route enables only this transport instance.
    const send = smtpSender({ ...process.env, BEAST_ACCOUNT_MAIL_ENABLED: 'true' });
    const { data, error } = await admin.rpc('beast_account_mail_claim_controlled_recovery');
    if (error) return reply(503, 'unavailable');
    const rows = data as AccountMail[] | null;
    if (!rows?.length) return reply(409, 'no eligible receipt');
    if (rows.length !== 1 || rows[0].kind !== 'username_recovery' ||
        createHash('sha256').update(rows[0].mail_id).digest('hex') !== 'c584d60845b84f5497532c055d948bc78cf967618b7a6ca0c479dc3d37ca3ef2') return reply(503, 'unavailable');
    const sent = await deliverClaimedAccountMail(admin, send, rows[0]);
    return reply(sent ? 200 : 503, sent ? 'accepted' : 'held');
  } catch {
    return reply(503, 'unavailable');
  }
}
