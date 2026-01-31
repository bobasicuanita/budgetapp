// Email utility - For now, just logs emails
// In production, integrate with SendGrid, Mailgun, or AWS SES

export const sendVerificationEmail = async (email, token, name) => {
  const verificationUrl = `${process.env.FRONTEND_URL || 'http://localhost:5000'}/api/auth/verify-email?token=${token}`;
  
  // TODO: Replace with actual email service
  console.log('\n=== EMAIL VERIFICATION ===');
  console.log(`To: ${email}`);
  console.log(`Subject: Verify your email address`);
  console.log(`\nHi ${name},\n`);
  console.log('Thank you for registering! Please verify your email address by clicking the link below:\n');
  console.log(verificationUrl);
  console.log('\nThis link will expire in 24 hours.\n');
  console.log('If you did not create an account, please ignore this email.');
  console.log('=========================\n');
  
  // In production, use something like:
  // await emailService.send({
  //   to: email,
  //   subject: 'Verify your email address',
  //   html: `<p>Hi ${name},</p><p>Please verify your email: <a href="${verificationUrl}">Click here</a></p>`
  // });
  
  return true;
};

export const sendPasswordResetEmail = async (email, token, name) => {
  const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:5000'}/api/auth/reset-password?token=${token}`;
  
  // TODO: Replace with actual email service
  console.log('\n=== PASSWORD RESET ===');
  console.log(`To: ${email}`);
  console.log(`Subject: Reset your password`);
  console.log(`\nHi ${name},\n`);
  console.log('You requested to reset your password. Click the link below:\n');
  console.log(resetUrl);
  console.log('\nThis link will expire in 1 hour.\n');
  console.log('If you did not request this, please ignore this email.');
  console.log('======================\n');
  
  return true;
};
