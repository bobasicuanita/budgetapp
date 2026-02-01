// Email utility for passwordless authentication
// For now, logs emails to console
// In production, integrate with SendGrid, Mailgun, or AWS SES

export const sendOTPEmail = async (email, otp, name) => {
  // TODO: Replace with actual email service
  console.log('\n=== OTP CODE EMAIL ===');
  console.log(`To: ${email}`);
  console.log(`Subject: Your login code`);
  console.log(`\nHi ${name || 'there'},\n`);
  console.log(`Your login code is: ${otp}\n`);
  console.log('This code will expire in 10 minutes.\n');
  console.log('If you did not request this code, please ignore this email.');
  console.log('======================\n');
  
  return true;
};

export const sendMagicLinkEmail = async (email, token, name) => {
  const magicLinkUrl = `${process.env.FRONTEND_URL || 'http://localhost:5000'}/api/auth/verify-magic-link?token=${token}`;
  
  // TODO: Replace with actual email service
  console.log('\n=== MAGIC LINK EMAIL ===');
  console.log(`To: ${email}`);
  console.log(`Subject: Sign in to Budget App`);
  console.log(`\nHi ${name || 'there'},\n`);
  console.log('Click the link below to sign in to your account:\n');
  console.log(magicLinkUrl);
  console.log('\nThis link will expire in 15 minutes.\n');
  console.log('If you did not request this link, please ignore this email.');
  console.log('========================\n');
  
  return true;
};

export const sendLoginNotification = async (email, name) => {
  // TODO: Replace with actual email service
  console.log('\n=== LOGIN NOTIFICATION ===');
  console.log(`To: ${email}`);
  console.log(`Subject: New login to your account`);
  console.log(`\nHi ${name},\n`);
  console.log('A new login to your Budget App account was detected.\n');
  console.log(`Time: ${new Date().toLocaleString()}\n`);
  console.log('If this wasn\'t you, please contact support immediately.');
  console.log('==========================\n');
  
  return true;
};
