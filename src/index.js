import dotenv from 'dotenv';
import TelegramBot from 'node-telegram-bot-api';
import fs from 'fs';
import mongoose from 'mongoose';

dotenv.config();

// MongoDB ga ulanish
mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/telegram_bot_db')
    .then(() => console.log('MongoDB ga muvaffaqiyatli ulandi!'))
    .catch((err) => console.error('MongoDB ulanishida xatolik:', err));

// Mongoose Schema
const userPhotoSchema = new mongoose.Schema({
    telegramId: { type: Number, required: true },
    username: { type: String },
    firstName: { type: String },
    fileId: { type: String, required: true },
    filePath: { type: String },
    createdAt: { type: Date, default: Date.now }
});

const UserPhoto = mongoose.model('UserPhoto', userPhotoSchema);

const bot = new TelegramBot(process.env.API_TOKEN, { polling: true });
const CHANNEL = '@yaponamirabad';
const ADMIN_ID = Number(process.env.ADMIN_ID); // .env dan admin ID sini olish

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
    bot.sendMessage(chatId, "Salom! Menga rasm yuboring, men uni bazaga saqlab kanalga yo'naltiraman.", keyboard);
});

// --- ADMIN BUYRUG'I: /stats ---
bot.onText(/\/stats/, async (msg) => {
    const chatId = msg.chat.id;
    const userId = msg.from.id;

    // Faqat admin yozganini tekshirish
    if (userId !== ADMIN_ID) {
        return bot.sendMessage(chatId, "Kechirasiz, bu buyruq faqat admin uchun!");
    }

    try {
        // Bazadan statistikani yig'ish
        const totalPhotos = await UserPhoto.countDocuments();
        const uniqueUsers = await UserPhoto.distinct('telegramId');
        
        // Oxirgi yuklangan 5 ta rasm haqida ma'lumot
        const recentUploads = await UserPhoto.find().sort({ createdAt: -1 }).limit(5);

        let report = `📊 **Bot Statistikasi:**\n\n`;
        report += `• Jami yuborilgan rasmlar: ${totalPhotos}\n`;
        report += `• Foydalanuvchilar soni: ${uniqueUsers.length}\n\n`;
        report += `🕒 **Oxirgi yuborishlar:**\n`;

        recentUploads.forEach((item, index) => {
            const date = new Date(item.createdAt).toLocaleString();
            report += `${index + 1}. ${item.firstName} (@${item.username}) — ${date}\n`;
        });

        bot.sendMessage(chatId, report, { parse_mode: 'Markdown' });
    } catch (error) {
        console.error(`Statistikani olishda xatolik: ${error.message}`);
        bot.sendMessage(chatId, "Statistikani olishda xatolik yuz berdi.");
    }
});

// Rasm qabul qilish qismi (oldingidek)
bot.on('photo', (msg) => {
    const chatId = msg.chat.id;
    const fileId = msg.photo[msg.photo.length - 1].file_id;
    
    const user = msg.from;
    const displayName = user.first_name || 'Foydalanuvchi';
    const profileLink = user.username 
        ? `https://t.me/${user.username}` 
        : `tg://user?id=${user.id}`;

    bot.downloadFile(fileId, './').then(async (filePath) => {
        try {
            const newRecord = new UserPhoto({
                telegramId: user.id,
                username: user.username || 'Nomaʼlum',
                firstName: displayName,
                fileId: fileId,
                filePath: filePath
            });
            await newRecord.save();

            await bot.sendPhoto(CHANNEL, filePath, {
                caption: `Yuboruvchi: ${displayName}`,
                reply_markup: {
                    inline_keyboard: [
                        [{ text: "Profilni ochish", url: profileLink }]
                    ]
                }
            });

            bot.sendMessage(chatId, "Rasmingiz qabul qilindi va bazaga saqlandi!");
        } catch (dbError) {
            console.error(`Bazaga saqlashda xatolik: ${dbError.message}`);
        } finally {
            if (fs.existsSync(filePath)) {
                fs.unlinkSync(filePath);
            }
        }
    }).catch((error) => {
        console.error(`Xatolik: ${error.message}`);
        bot.sendMessage(chatId, "Rasmni qayta ishlashda xatolik yuz berdi.");
    });
});