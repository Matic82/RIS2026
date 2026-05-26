import 'dotenv/config';

export const config = {
  port: parseInt(process.env.PORT || '3001', 10),
  jwtSecret: process.env.JWT_SECRET || 'maestro-dev-secret-change-in-production',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '8h',
  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:5173',
  oracle: {
    user: process.env.ORACLE_USER || 'maestro_app',
    password: process.env.ORACLE_PASSWORD || 'MaestroApp1',
    connectString:
      process.env.ORACLE_CONNECT_STRING || 'localhost:1521/XEPDB1',
  },
  email: {
    from: process.env.EMAIL_FROM || 'noreply@maestro.local',
    devLogToConsole: process.env.EMAIL_DEV_LOG !== 'false',
    smtp: {
      host: process.env.SMTP_HOST,
      port: process.env.SMTP_PORT ? parseInt(process.env.SMTP_PORT, 10) : undefined,
      secure: process.env.SMTP_SECURE === 'true', // true for 465, false for other ports
      auth: process.env.SMTP_USER && process.env.SMTP_PASSWORD
        ? {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASSWORD,
          }
        : undefined,
    },
  },
};

export type TierCode = 'OSNOVNI' | 'BRONASTI' | 'SREBRNI' | 'ZLATI';

export const TIER_LABELS: Record<TierCode, { sl: string; en: string }> = {
  OSNOVNI: { sl: 'Osnovni', en: 'Basic' },
  BRONASTI: { sl: 'Bronasti', en: 'Bronze' },
  SREBRNI: { sl: 'Srebrni', en: 'Silver' },
  ZLATI: { sl: 'Zlati', en: 'Gold' },
};
