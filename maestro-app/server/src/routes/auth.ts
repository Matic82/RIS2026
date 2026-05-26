import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import { z } from 'zod';
import oracledb from 'oracledb';
import { query, withTransaction } from '../db.js';
import { requireAuth, signToken } from '../middleware/auth.js';
import { blacklistToken } from '../services/tokenBlacklist.js';
import {
  EmailDeliveryError,
  sendVerificationEmail,
} from '../services/emailService.js';
import { logAudit } from '../services/auditService.js';
import { getMemberPointsBalance } from '../services/loyaltyEngine.js';
import { TIER_LABELS } from '../config.js';
import type { TierCode } from '../config.js';

const router = Router();

const registerSchema = z.object({
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  email: z.string().email(),
  password: z.string().min(6),
  address: z.string().min(1),
  marketingConsent: z.boolean().optional(),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
  role: z.enum(['member', 'admin']).optional(),
});

const adminLoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

router.post('/register', async (req, res) => {
  const parsed = registerSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Invalid input', details: parsed.error.flatten() });
    return;
  }
  const { firstName, lastName, email, password, address, marketingConsent } =
    parsed.data;
  const emailLower = email.toLowerCase();

  const existing = await query(
    `SELECT ID_RACUNA FROM UPORABNISK_RACUN WHERE LOWER(UPORABNISKO_IME) = :email`,
    { email: emailLower }
  );
  if (existing.length) {
    res.status(409).json({ error: 'Email already registered' });
    return;
  }

  const hash = await bcrypt.hash(password, 10);
  const cardNumber = `MC-${Date.now().toString(36).toUpperCase().slice(-12)}`;
  const token = uuidv4().replace(/-/g, '');

  try {
    await withTransaction(async (conn) => {
      const idRows = await conn.execute<{ ID: number }>(
        `SELECT seq_clan.NEXTVAL AS ID FROM DUAL`
      );
      const memberId = Number((idRows.rows as { ID: number }[])[0].ID);

      await conn.execute(
        `INSERT INTO CLAN (ID_CLANA, IME, PRIIMEK, EMAIL, NASLOV, MARKETING_SOGLASJE)
         VALUES (:memberId, :firstName, :lastName, :email, :address, :marketing)`,
        {
          memberId,
          firstName,
          lastName,
          email: emailLower,
          address,
          marketing: marketingConsent ? 'Y' : 'N',
        },
        { autoCommit: false }
      );

      const osnovni = await conn.execute<{ ID_NIVOJA: number }>(
        `SELECT ID_NIVOJA FROM NIVO_LOJALNOSTI WHERE KODA = 'OSNOVNI'`
      );
      const tierId = Number(
        (osnovni.rows as { ID_NIVOJA: number }[])[0].ID_NIVOJA
      );

      await conn.execute(
        `INSERT INTO STATUS_CLANA (ID_STATUSA, ID_CLANA, ID_NIVOJA, RAZLOG_SPREMEMBE, TRENUTNI)
         VALUES (seq_status.NEXTVAL, :memberId, :tierId, 'Registracija v program', 'Y')`,
        { memberId, tierId },
        { autoCommit: false }
      );

      await conn.execute(
        `INSERT INTO KARTICA_LOJALNOSTI (ID_KARTICE, ID_CLANA, STEVILKA_KARTICE, STATUS_POSILJANJA)
         VALUES (seq_kartica.NEXTVAL, :memberId, :cardNumber, 'PENDING')`,
        { memberId, cardNumber },
        { autoCommit: false }
      );

      const accRows = await conn.execute<{ ID: number }>(
        `SELECT seq_racun.NEXTVAL AS ID FROM DUAL`
      );
      const accountId = Number((accRows.rows as { ID: number }[])[0].ID);

      await conn.execute(
        `INSERT INTO UPORABNISK_RACUN (ID_RACUNA, ID_CLANA, UPORABNISKO_IME, GESLO_HASH, VLOGA, EMAIL_VERIFICIRAN)
         VALUES (:accountId, :memberId, :email, :hash, 'CLAN', 'N')`,
        { accountId, memberId, email: emailLower, hash },
        { autoCommit: false }
      );

      await conn.execute(
        `INSERT INTO EMAIL_VERIFIKACIJA (ID, ID_RACUNA, TOKEN, POTEK)
         VALUES (seq_email_ver.NEXTVAL, :accountId, :token, SYSTIMESTAMP + INTERVAL '1' DAY)`,
        { accountId, token },
        { autoCommit: false }
      );
    });

    await sendVerificationEmail(emailLower, token);
    await logAudit({
      eventType: 'MEMBER_REGISTER',
      entity: 'CLAN',
      details: emailLower,
    });

    res.status(201).json({
      message: 'Registration successful. Please verify your email.',
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Registration failed' });
  }
});

router.get('/verify-email', async (req, res) => {
  const token = req.query.token as string;
  if (!token) {
    res.status(400).json({ error: 'Token required' });
    return;
  }

  const rows = await query<{ ID_RACUNA: number }>(
    `SELECT ID_RACUNA FROM EMAIL_VERIFIKACIJA
     WHERE TOKEN = :token AND UPORABLJEN = 'N' AND POTEK > SYSTIMESTAMP`,
    { token }
  );
  if (!rows.length) {
    res.status(400).json({ error: 'Invalid or expired token' });
    return;
  }

  const accountId = rows[0].ID_RACUNA;
  await withTransaction(async (conn) => {
    await conn.execute(
      `UPDATE UPORABNISK_RACUN SET EMAIL_VERIFICIRAN = 'Y' WHERE ID_RACUNA = :accountId`,
      { accountId },
      { autoCommit: false }
    );
    await conn.execute(
      `UPDATE EMAIL_VERIFIKACIJA SET UPORABLJEN = 'Y' WHERE TOKEN = :token`,
      { token },
      { autoCommit: false }
    );
    await conn.execute(
      `UPDATE KARTICA_LOJALNOSTI SET STATUS_POSILJANJA = 'SENT'
       WHERE ID_CLANA = (SELECT ID_CLANA FROM UPORABNISK_RACUN WHERE ID_RACUNA = :accountId)`,
      { accountId },
      { autoCommit: false }
    );
  });

  res.json({ message: 'Email verified successfully. You can now log in.' });
});

router.post('/admin/login', async (req, res) => {
  const parsed = adminLoginSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Invalid input' });
    return;
  }
  const { email, password } = parsed.data;
  const emailLower = email.toLowerCase();

  const rows = await query<{
    ID_RACUNA: number;
    GESLO_HASH: string;
    VLOGA: string;
    IME: string | null;
    PRIIMEK: string | null;
    AKTIVEN: string;
  }>(
    `SELECT u.ID_RACUNA, u.GESLO_HASH, u.VLOGA, c.IME, c.PRIIMEK, u.AKTIVEN
     FROM UPORABNISK_RACUN u
     LEFT JOIN CLAN c ON c.ID_CLANA = u.ID_CLANA
     WHERE LOWER(u.UPORABNISKO_IME) = :email AND u.VLOGA = 'ADMIN'`,
    { email: emailLower }
  );

  if (!rows.length || rows[0].AKTIVEN !== 'Y') {
    await logAudit({
      eventType: 'ADMIN_LOGIN_FAILED',
      entity: 'UPORABNISK_RACUN',
      details: emailLower,
      ip: req.ip,
    });
    res.status(401).json({ error: 'Invalid credentials' });
    return;
  }

  const account = rows[0];
  const valid = await bcrypt.compare(password, account.GESLO_HASH);
  if (!valid) {
    await logAudit({
      eventType: 'ADMIN_LOGIN_FAILED',
      entity: 'UPORABNISK_RACUN',
      details: emailLower,
      ip: req.ip,
    });
    res.status(401).json({ error: 'Invalid credentials' });
    return;
  }

  await query(
    `UPDATE UPORABNISK_RACUN SET ZADNJA_PRIJAVA = SYSTIMESTAMP WHERE ID_RACUNA = :id`,
    { id: account.ID_RACUNA }
  );

  const jwtToken = signToken({
    accountId: account.ID_RACUNA,
    role: 'ADMIN',
    email: emailLower,
  });

  await logAudit({
    accountId: account.ID_RACUNA,
    eventType: 'ADMIN_LOGIN_SUCCESS',
    entity: 'UPORABNISK_RACUN',
    details: emailLower,
    ip: req.ip,
  });

  res.json({
    token: jwtToken,
    role: 'admin',
    admin: {
      id: String(account.ID_RACUNA),
      email: emailLower,
      name: `${account.IME || 'Admin'} ${account.PRIIMEK || 'User'}`.trim(),
    },
  });
});

router.post('/login', async (req, res) => {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Invalid input' });
    return;
  }
  const { email, password, role } = parsed.data;

  if (role === 'admin') {
    res.status(400).json({ error: 'Use POST /auth/admin/login for admin access' });
    return;
  }

  const vloga = 'CLAN';

  const rows = await query<{
    ID_RACUNA: number;
    GESLO_HASH: string;
    VLOGA: string;
    EMAIL_VERIFICIRAN: string;
    ID_CLANA: number | null;
    IME: string | null;
    PRIIMEK: string | null;
    AKTIVEN: string;
  }>(
    `SELECT u.ID_RACUNA, u.GESLO_HASH, u.VLOGA, u.EMAIL_VERIFICIRAN, u.ID_CLANA,
            c.IME, c.PRIIMEK, u.AKTIVEN
     FROM UPORABNISK_RACUN u
     LEFT JOIN CLAN c ON c.ID_CLANA = u.ID_CLANA
     WHERE LOWER(u.UPORABNISKO_IME) = :email AND u.VLOGA = :vloga`,
    { email: email.toLowerCase(), vloga }
  );

  if (!rows.length || rows[0].AKTIVEN !== 'Y') {
    res.status(401).json({ error: 'Invalid credentials' });
    return;
  }

  const account = rows[0];
  const valid = await bcrypt.compare(password, account.GESLO_HASH);
  if (!valid) {
    res.status(401).json({ error: 'Invalid credentials' });
    return;
  }

  if (vloga === 'CLAN' && account.EMAIL_VERIFICIRAN !== 'Y') {
    res.status(403).json({
      error: 'Email not verified',
      code: 'EMAIL_NOT_VERIFIED',
    });
    return;
  }

  await query(
    `UPDATE UPORABNISK_RACUN SET ZADNJA_PRIJAVA = SYSTIMESTAMP WHERE ID_RACUNA = :id`,
    { id: account.ID_RACUNA }
  );

  const jwtToken = signToken({
    accountId: account.ID_RACUNA,
    role: vloga as 'CLAN' | 'ADMIN',
    memberId: account.ID_CLANA ?? undefined,
    email: email.toLowerCase(),
  });

  const memberId = account.ID_CLANA!;
  if (!memberId) {
    res.status(401).json({ error: 'Invalid credentials' });
    return;
  }
  const tierRows = await query<{ KODA: TierCode; NAZIV_EN: string }>(
    `SELECT n.KODA, n.NAZIV_EN FROM STATUS_CLANA s
     JOIN NIVO_LOJALNOSTI n ON n.ID_NIVOJA = s.ID_NIVOJA
     WHERE s.ID_CLANA = :memberId AND s.TRENUTNI = 'Y'`,
    { memberId }
  );
  const tierCode = tierRows[0]?.KODA ?? 'OSNOVNI';
  const tierEn = TIER_LABELS[tierCode]?.en ?? 'Basic';

  const cardRows = await query<{
    STEVILKA_KARTICE: string;
    STATUS_POSILJANJA: string;
  }>(
    `SELECT STEVILKA_KARTICE, STATUS_POSILJANJA FROM KARTICA_LOJALNOSTI WHERE ID_CLANA = :memberId`,
    { memberId }
  );

  const clanRows = await query<{
    IME: string;
    PRIIMEK: string;
    EMAIL: string;
    NASLOV: string;
    DATUM_REGISTRACIJE: Date;
  }>(`SELECT * FROM CLAN WHERE ID_CLANA = :memberId`, { memberId });

  const clan = clanRows[0];
  const points = await getMemberPointsBalance(memberId);

  const cardStatusMap: Record<string, string> = {
    PENDING: 'pending',
    SENT: 'sent',
    DELIVERED: 'delivered',
  };

  res.json({
    token: jwtToken,
    role: 'member',
    member: {
      id: String(memberId),
      firstName: clan.IME,
      lastName: clan.PRIIMEK,
      email: clan.EMAIL,
      tier: tierEn as 'Basic' | 'Bronze' | 'Silver' | 'Gold',
      points,
      cardNumber: cardRows[0]?.STEVILKA_KARTICE ?? '',
      cardStatus: cardStatusMap[cardRows[0]?.STATUS_POSILJANJA] ?? 'pending',
      address: clan.NASLOV,
      registrationDate: clan.DATUM_REGISTRACIJE,
    },
  });
});

router.post('/forgot-password', async (req, res) => {
  const forgotSchema = z.object({
    email: z.string().email(),
  });
  const parsed = forgotSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Invalid email' });
    return;
  }

  const { email } = parsed.data;
  const emailLower = email.toLowerCase();

  try {
    const rows = await query<{ ID_RACUNA: number }>(
      `SELECT ID_RACUNA FROM UPORABNISK_RACUN WHERE LOWER(UPORABNISKO_IME) = :email`,
      { email: emailLower }
    );

    // Always return success to prevent email enumeration
    if (!rows.length) {
      res.json({
        message: 'If this email exists, you will receive a password reset link.',
      });
      return;
    }

    const accountId = rows[0].ID_RACUNA;
    const token = uuidv4().replace(/-/g, '');

    await withTransaction(async (conn) => {
      await conn.execute(
        `INSERT INTO PONASTAVITEV_GESLA (ID, ID_RACUNA, TOKEN, POTEK, UPORABLJEN)
         VALUES (seq_reset_gesla.NEXTVAL, :accountId, :token, SYSTIMESTAMP + INTERVAL '1' DAY, 'N')`,
        { accountId, token },
        { autoCommit: false }
      );
    });

    // Send email
    const { sendPasswordResetEmail } = await import('../services/emailService.js');
    await sendPasswordResetEmail(emailLower, token);

    await logAudit({
      eventType: 'PASSWORD_RESET_REQUESTED',
      entity: 'UPORABNISK_RACUN',
      details: emailLower,
    });

    res.json({
      message: 'If this email exists, you will receive a password reset link.',
    });
  } catch (e) {
    console.error(e);
    if (e instanceof EmailDeliveryError) {
      res.status(503).json({
        error: e.message,
        code: e.code,
      });
      return;
    }
    res.status(500).json({ error: 'Request failed' });
  }
});

router.post('/reset-password', async (req, res) => {
  const resetSchema = z.object({
    token: z.string().min(1),
    password: z.string().min(6),
  });
  const parsed = resetSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Invalid input' });
    return;
  }

  const { token, password } = parsed.data;

  try {
    const rows = await query<{ ID_RACUNA: number }>(
      `SELECT ID_RACUNA FROM PONASTAVITEV_GESLA
       WHERE TOKEN = :token AND UPORABLJEN = 'N' AND POTEK > SYSTIMESTAMP`,
      { token }
    );

    if (!rows.length) {
      res.status(400).json({ error: 'Invalid or expired token' });
      return;
    }

    const accountId = rows[0].ID_RACUNA;
    const hash = await bcrypt.hash(password, 10);

    await withTransaction(async (conn) => {
      await conn.execute(
        `UPDATE UPORABNISK_RACUN SET GESLO_HASH = :hash WHERE ID_RACUNA = :accountId`,
        { hash, accountId },
        { autoCommit: false }
      );
      await conn.execute(
        `UPDATE PONASTAVITEV_GESLA SET UPORABLJEN = 'Y' WHERE TOKEN = :token`,
        { token },
        { autoCommit: false }
      );
    });

    await logAudit({
      eventType: 'PASSWORD_RESET_COMPLETED',
      entity: 'UPORABNISK_RACUN',
      details: String(accountId),
    });

    res.json({ message: 'Password reset successfully. You can now log in.' });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Password reset failed' });
  }
});

router.post('/logout', requireAuth(['CLAN', 'ADMIN']), async (req, res) => {
  const header = req.headers.authorization;
  if (header?.startsWith('Bearer ')) {
    blacklistToken(header.slice(7));
  }

  await logAudit({
    accountId: req.user!.accountId,
    eventType: 'LOGOUT',
    entity: 'UPORABNISK_RACUN',
    details: req.user!.email,
    ip: req.ip,
  });

  res.json({ success: true, message: 'Logged out successfully' });
});

export default router;
