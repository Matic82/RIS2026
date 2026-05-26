const fs = require('fs');

const file = 'src/app/context/LanguageContext.tsx';
let content = fs.readFileSync(file, 'utf-8');

const translations = `
   'member.forgotPassword.title': { en: 'Forgot Your Password?', sl: 'Ste pozabili geslo?' },
   'member.forgotPassword.subtitle': { en: 'Enter your email address and we\\'ll send you a link to reset your password.', sl: 'Vnesite svojo e-poštni naslov in poslali vam bomo povezavo za ponastavitev gesla.' },
   'member.forgotPassword.sendLink': { en: 'Send Reset Link', sl: 'Pošlji povezavo za ponastavitev' },
   'member.forgotPassword.rememberPassword': { en: 'Remember your password?', sl: 'Se spomnite gesla?' },
   'member.forgotPassword.checkEmail': { en: 'Check Your Email', sl: 'Preverite e-pošto' },
   'member.forgotPassword.sentMessage': { en: 'If an account exists with this email, you will receive a password reset link.', sl: 'Če obstaja račun s to e-pošto, boste prejeli povezavo za ponastavitev gesla.' },
   'member.forgotPassword.expiresIn': { en: 'The link expires in 24 hours.', sl: 'Povezava preneha veljati čez 24 ur.' },
   'member.forgotPassword.tryAnotherEmail': { en: 'Try Another Email', sl: 'Poskusi drugem e-pošto' },
   'member.resetPassword.title': { en: 'Reset Your Password', sl: 'Ponastavite geslo' },
   'member.resetPassword.newPassword': { en: 'New Password', sl: 'Novo geslo' },
   'member.resetPassword.passwordMinLength': { en: 'Minimum 6 characters', sl: 'Najmanj 6 znakov' },
   'member.resetPassword.confirmPassword': { en: 'Confirm Password', sl: 'Potrdite geslo' },
   'member.resetPassword.resetButton': { en: 'Reset Password', sl: 'Ponastavite geslo' },
   'member.resetPassword.passwordMismatch': { en: 'Passwords do not match', sl: 'Gesli se ne ujemata' },
   'member.resetPassword.passwordTooShort': { en: 'Password must be at least 6 characters', sl: 'Geslo mora imeti najmanj 6 znakov' },
   'member.resetPassword.invalidToken': { en: 'Invalid or expired reset link', sl: 'Neveljavna ali potekla povezava za ponastavitev' },
   'member.resetPassword.invalidLink': { en: 'This password reset link is invalid or has expired. Please request a new one.', sl: 'Ta povezava za ponastavitev gesla je neveljavna ali je potekla. Zahtevajte novo.' },
   'member.resetPassword.success': { en: 'Password Reset Successfully!', sl: 'Geslo uspešno ponastavljen!' },
   'member.resetPassword.redirecting': { en: 'Redirecting to login page...', sl: 'Preusmerjam na stran za prijavo...' },
   'member.resetPassword.backToLogin': { en: 'Back to login', sl: 'Nazaj na prijavo' },`;

// Find the closing }; of the translations object and insert before it
content = content.replace(/(\};)\s*$/, translations + '\n' + '$1');

fs.writeFileSync(file, content, 'utf-8');
console.log('Translations added successfully');
