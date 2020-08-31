const fs = require('fs');
const path = require('path');

module.exports = {
  cookieKey: process.env.COOKIE_KEY,
  dkimKey: fs.readFileSync(path.join(__dirname, '../dkimKey'), 'utf8'),
  googleClientId: process.env.GOOGLE_CLIENT_ID,
  googleClientSecret: process.env.GOOGLE_CLIENT_SECRET,
  mongoURI: process.env.MONGO_URI,
  nemp3EmailContact: process.env.NEMP3_EMAIL_CONTACT,
  nemp3EmailGeneral: process.env.NEMP3_EMAIL_GENERAL,
  nemp3EmailSupport: process.env.NEMP3_EMAIL_SUPPORT,
  nemp3Secret: process.env.NEMP3_SECRET,
  privKey: process.env.PRIV_KEY,
  rabbitUser: process.env.RABBITMQ_DEFAULT_USER,
  rabbitPass: process.env.RABBITMQ_DEFAULT_PASS,
  recaptchaSecretKey: process.env.RECAPTCHA_SECRET_KEY,
  smtpHostName: process.env.NEMP3_SMTP_HOST,
  smtpPassword: process.env.NEMP3_SMTP_PASSWORD,
  smtpUsername: process.env.NEMP3_SMTP_USER,
  spotifyClientId: process.env.SPOTIFY_CLIENT_ID,
  spotifyClientSecret: process.env.SPOTIFY_CLIENT_SECRET,
  twitterConsumerKey: process.env.TWITTER_CONSUMER_KEY,
  twitterConsumerSecret: process.env.TWITTER_CONSUMER_SECRET
};
