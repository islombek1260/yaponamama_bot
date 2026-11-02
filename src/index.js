process.env.NTBA_FIX_350 = 1;
import dotenv from 'dotenv';
import TelegramBot from 'node-telegram-bot-api';
import fs from 'fs';
import express from 'express'; // <-- Express ni qo'shamiz

dotenv.config();

// Render port talab qilgani uchun oddiy Express server ochamiz
const app = express();
const PORT = process.env.PORT || 3000;

app.get('/', (req, res) => {
    res.send('Telegram bot ishlayapti!');
});

app.listen(PORT, () => {
    console.log(`Server ${PORT}-portda ishga tushdi`);
});

// --- Telegram bot qismi ---
const bot = new TelegramBot(process.env.API_TOKEN, { polling: true });
const CHANNEL = '@yaponamirabad';

const keyboard = {
    reply_markup: {
        keyboard: [
            [{ text: "/start" }]
        ],
        resize_keyboard: true,
        one_time_keyboard: true
    }
};

bot.onText(/\/start/, (msg) => {
    const chatId = msg.chat.id;
    bot.sendMessage(chatId, "Salom! Menga rasm yuboring, men uni barmenga yo'naltiraman.", keyboard);
});

bot.on('photo', (msg) => {
    const chatId = msg.chat.id;
    const fileId = msg.photo[msg.photo.length - 1].file_id;
    
    const user = msg.from;
    const displayName = user.first_name || 'Foydalanuvchi';
    const profileLink = user.username 
        ? `https://t.me/${user.username}` 
        : `tg://user?id=${user.id}`;

    bot.downloadFile(fileId, './').then((filePath) => {
        bot.sendPhoto(CHANNEL, filePath, {
            caption: `Yuboruvchi: ${displayName}`,
            reply_markup: {
                inline_keyboard: [
                    [{ text: "Profilni ochish", url: profileLink }]
                ]
            }
        }).then(() => {
            bot.sendMessage(chatId, "Rasmingiz muvaffaqiyatli yuborildi!");
            fs.unlinkSync(filePath);
        }).catch((error) => {
            console.error(`Xatolik: ${error.message}`);
            bot.sendMessage(chatId, "Xatolik yuz berdi.");
            if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
        });
    }).catch((error) => {
        console.error(`Xatolik: ${error.message}`);
        bot.sendMessage(chatId, "Xatolik yuz berdi.");
    });
});