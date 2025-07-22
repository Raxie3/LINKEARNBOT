const TelegramBot = require('node-telegram-bot-api');

const axios = require('axios');

const fs = require('fs');

const express = require('express');



const app = express();

app.get('/', (req, res) => {

  res.send('Hello World!');

});



const port = 8000;

app.listen(port, () => {

  console.log(`Server running at http://localhost:${port}`);

});



const botToken = process.env.TELEGRAM_BOT_TOKEN;

const bot = new TelegramBot(botToken, { polling: true });



// Handle /start command

bot.onText(/\/start/, (msg) => {

  const chatId = msg.chat.id;

  const username = msg.from.username;



const welcomeMessage = `<b>👋 Hello, ${username}!</b>\n\n` +

  `<b>🎉 Welcome to the <u>LinkEarnX URL Shortener Bot</u>! 🔗✨</b>\n` +
  `<b>Your one-stop solution to <i>shorten URLs</i> & <i>earn money effortlessly</i>! 💸🚀</b>\n\n` +

  `🔥 <b><u>How to Use:</u></b>\n` +
  `👉 Just send any <b>URL</b> directly in the chat, and the bot will instantly reply with your <b>shortened link</b>! ⚡🧿\n\n` +

  `🔐 <b><u>First time here?</u></b>\n` +
  `Paste your API token using:\n` +
  `<code>/setapi YOUR_LinkEarnX_API_TOKEN</code>\n\n` +

  `🧪 <b>Example:</b>\n` +
  `<code>/setapi 32ca9882210b1fbe3e2382848f1cabbf904bd2e4</code>`;




  const options = {
  reply_markup: JSON.stringify({
    inline_keyboard: [
      [
        { text: "💬 Chat with Admin", url: "https://t.me/LinkEarnX_Official" },
        { text: "📸 Payment Proof", url: "https://t.me/LinkEarnX_Official" }
      ],
      [
        { text: "🔑 Get API Token", url: "https://softurl.in/member/tools/quick" }
      ],
      [
        { text: "📢 Join Updates Channel", url: "https://t.me/LinkEarnX_Official" },
        { text: "💡 How It Works?", url: "https://t.me/LinkEarnX_Official" }
      ],
      [
        { text: "🚀 Share This Bot", url: "https://telegram.me/share/url?url=https://t.me/LinkEarnXBot" }
      ]
    ]
  })
};




  bot.sendPhoto(chatId, "https://i.ibb.co/dsQTPBnc/temp.jpg", {

    caption: welcomeMessage,

    parse_mode: "HTML",

    reply_markup: options.reply_markup

  });

});



// Command: /setapi

bot.onText(/\/setapi (.+)/, (msg, match) => {

  const chatId = msg.chat.id;

  const userToken = match[1].trim();



  saveUserToken(chatId, userToken);

  bot.sendMessage(chatId, `LinkEarnX API token set successfully. Your token: ${userToken}`);

});



const axios = require('axios');

// /balance command
bot.onText(/\/balance/, async (msg) => {
  const chatId = msg.chat.id;

  const userToken = getUserToken(chatId); // ये function पहले से defined होना चाहिए जो user का token return करता हो

  if (!userToken) {
    bot.sendMessage(chatId, "❌ Please set your LinkEarnX API token first using:\n/setapi YOUR_API_TOKEN");
    return;
  }

  // Debugging logs — Render पर दिखेगा log में
  console.log("Token used:", userToken);
  const apiURL = `https://softurl.in/api?api=${userToken}&action=user_data`;
  console.log("Calling:", apiURL);

  try {
    const response = await axios.get(apiURL);
    const data = response.data;

    if (!data || data.status === 'error' || !data.username) {
      bot.sendMessage(chatId, `❌ Error: ${data.message || "Invalid API token or user not found."}`);
      return;
    }

    const userInfo = `
<b>👤 Username:</b> ${data.username}
<b>📧 Email:</b> ${data.email}
<b>🔑 Your API Token:</b> ${userToken}

<b>💰 Current Balance:</b> $${data.balance}
<b>🎁 Referral Income:</b> $${data.referral_earnings}
    `;

    bot.sendMessage(chatId, userInfo, { parse_mode: "HTML" });

  } catch (error) {
    console.error("API Error:", error.message);
    bot.sendMessage(chatId, "⚠️ Something went wrong while fetching balance. Please try again later.");
  }
});




// Handle URL shortening

bot.on("message", async (msg) => {
  const chatId = msg.chat.id;

  // If the message contains entities (like text links, URLs)
  if (msg.entities || msg.caption_entities) {
    const text = msg.text || msg.caption || '';
    const entities = msg.entities || msg.caption_entities;

    let arklinksToken = getUserToken(chatId);
    if (!arklinksToken) {
      bot.sendMessage(chatId, "Please set your LinkEarnX API token first using:\n/setapi YOUR_API_TOKEN");
      return;
    }

    const urlEntities = entities.filter(e => e.type === 'url' || e.type === 'text_link');
    if (urlEntities.length === 0) return;

    let newText = text;
    for (const entity of urlEntities.reverse()) {
      const url = entity.type === 'text_link' ? entity.url : text.substring(entity.offset, entity.offset + entity.length);
      try {
        const apiUrl = `https://softurl.in/api?api=${arklinksToken}&url=${url}`;
        const response = await axios.get(apiUrl);
        const shortUrl = response.data.shortenedUrl;

        newText = newText.substring(0, entity.offset) + shortUrl + newText.substring(entity.offset + entity.length);
      } catch (err) {
        console.error('Error shortening:', err.message);
      }
    }

    if (msg.photo) {
      const photo = msg.photo[msg.photo.length - 1].file_id;
      bot.sendPhoto(chatId, photo, { caption: newText });
    } else {
      bot.sendMessage(chatId, newText);
    }

    return;
  }

  // If plain text message contains multiple links
  const messageText = msg.text;
  if (messageText) {
    const urls = messageText.match(/https?:\/\/[^\s]+/g);
    if (!urls) return;

    let arklinksToken = getUserToken(chatId);
    if (!arklinksToken) {
      bot.sendMessage(chatId, "Please set your LinkEarnX API token first using:\n/setapi YOUR_API_TOKEN");
      return;
    }

    for (const url of urls) {
      try {
        const apiUrl = `https://softurl.in/api?api=${arklinksToken}&url=${url}`;
        const response = await axios.get(apiUrl);
        const shortUrl = response.data.shortenedUrl;
        await bot.sendMessage(chatId, `Shortened: ${shortUrl}`);
      } catch (err) {
        console.error("Shorten error:", err.message);
        await bot.sendMessage(chatId, `Error shortening URL: ${url}`);
      }
    }
  }
});



// Function to shorten the URL and send the result

async function shortenUrlAndSend(chatId, Url) {

  const arklinksToken = getUserToken(chatId);



  if (!arklinksToken) {

    bot.sendMessage(chatId, "Please provide your LinkEarnX API token first. Use the command: /setapi YOUR_LinkEarnX_API_TOKEN");

    return;

  }



  try {

    const apiUrl = `https://softurl.in/api?api=${arklinksToken}&url=${Url}`;

    const response = await axios.get(apiUrl);

    const shortUrl = response.data.shortenedUrl;



    bot.sendMessage(chatId, `Shortened URL: ${shortUrl}`);

  } catch (error) {

    console.error("Shorten URL Error:", error);

    bot.sendMessage(chatId, "An error occurred while shortening the URL. Please check your API token and try again.");

  }

}



// Function to save user's API token

function saveUserToken(chatId, token) {

  const dbData = getDatabaseData();

  dbData[chatId] = token;

  fs.writeFileSync("database.json", JSON.stringify(dbData, null, 2));

}



// Function to retrieve user's API token

function getUserToken(chatId) {

  const dbData = getDatabaseData();

  return dbData[chatId];

}



// Function to read the database

function getDatabaseData() {

  try {

    return JSON.parse(fs.readFileSync("database.json", "utf8"));

  } catch (error) {

    return {};

  }

}
