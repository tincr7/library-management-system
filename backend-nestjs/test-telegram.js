const { Telegraf } = require('telegraf');

const bot = new Telegraf(
  '8805056693:AAFDHxAzqc0Mk5X9nQ8Bn_uG05tSQk0a6Kw'
);

(async () => {
  try {
    const me = await bot.telegram.getMe();
    console.log(me);
  } catch (e) {
    console.error(e);
  }
})();