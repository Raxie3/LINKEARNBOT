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



  const welcomeMessage = `<b>Hello, ${username}!</b>\n\n`

    + `<b>Welcome to the IndiaEarnX URL Shortener Bot!</b>\n`

    + `<b>You can use this bot to shorten URLs using the LinkEarnX.In API service.</b>\n\n`

    + `<b>To shorten a URL, just type or paste the URL directly in the chat, and the bot will provide you with the shortened URL.</b>\n\n`

    + `<b>If you haven't set your LinkEarnX API token yet, use the command:</b>\n<code>/setapi YOUR_LinkEarnx_API_TOKEN</code>\n\n`

    + `<b>Example:</b>\n<code>/setapi 32ca9882210b1fbe3e2382848f1cabbf904bd2e4</code>`;



  const options = {

    reply_markup: JSON.stringify({

      inline_keyboard: [

        [

          { text: "Chat with Admin", url: "https://t.me/OfficialSwiftCart" },

          { text: "Payment Proof", url: "https://t.me/OfficialSwiftCart" }

        ],

        [

          { text: "Get API Token from Here", url: "https://softurl.in/member/tools/quick" }

        ]

      ]

    })

  };



  bot.sendPhoto(chatId, "https://envs.sh/dn1.jpg", {

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
