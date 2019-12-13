const accountSid = 'ACd629b0ac3aacd8e5e3496e4699ea1ef7';
const authToken = process.env.twilioAuth;
const client = require('twilio')(accountSid, authToken);
console.log("LOOKING!!!!!!!!", authToken, client)
client.messages
.create({
  body: 'This is the ship that made the Kessel Run in fourteen parsecs?',
  from: '+16509037299',
  to: '+16176505251'
})
.then(message => console.log("twilioSID!!!!!!", message.sid));
