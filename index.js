const fs = require('fs');
const TelegramBot = require('node-telegram-bot-api');
require('dotenv').config();

// Remplace ceci par le token de ton bot
const token = process.env.TOKEN;

// Créer un bot avec l'option 'polling' pour recevoir les messages
const bot = new TelegramBot(token, { polling: true });

// Liste des administrateurs (utilise des IDs Telegram des admins)
const admins = [7119930360]; // Remplace avec les IDs Telegram des admins

// Message de bienvenue (pour la commande /start)
let startMessage = "Bienvenue sur mon bot Telegram !";

// Chemin du fichier JSON pour stocker les chat.id
const usersFilePath = './users.json';

// Vérifie si le fichier existe, sinon crée un fichier vide
if (!fs.existsSync(usersFilePath)) {
    fs.writeFileSync(usersFilePath, JSON.stringify([]));
}

// Fonction pour lire les utilisateurs sauvegardés
const getSavedUsers = () => {
    const data = fs.readFileSync(usersFilePath);
    return JSON.parse(data);
};

// Fonction pour ajouter un utilisateur au fichier
const saveUser = (chatId) => {
    const users = getSavedUsers();
    if (!users.includes(chatId)) {
        users.push(chatId);
        fs.writeFileSync(usersFilePath, JSON.stringify(users));
    }
};

// Fonction pour envoyer un message à tous les utilisateurs
const sendToAllUsers = (message) => {
    const users = getSavedUsers();
    users.forEach(chatId => {
        // Exclure les administrateurs de l'envoi
        if (!admins.includes(chatId)) {
            bot.sendMessage(chatId, message);
        }
    });
};


// Commande /start
bot.onText(/\/start/, (msg) => {
    const chatId = msg.chat.id;

    // Sauvegarder le chat.id si ce n'est pas déjà fait
    saveUser(chatId);

    // Si l'utilisateur est un admin, ajoute les autres boutons
    if (admins.includes(msg.from.id)) {
        const adminOptions = {
            reply_markup: {
                inline_keyboard: [
                    [
                        { text: "Edit /start", callback_data: 'update_message' },
                    ],
                    [
                        { text: "Message", callback_data: 'send_message' }
                    ]
                ]
            }
        };
        bot.sendMessage(chatId, startMessage, adminOptions).then((sentMessage) => {
            // On garde en mémoire l'ID du message
            sentMessage.message_id = sentMessage.message_id;
        });
    } else {
        // Si l'utilisateur n'est pas admin, affiche simplement le message de bienvenue avec le bouton Retour
        bot.sendMessage(chatId, startMessage);
    }
});

// Gérer les actions des boutons
bot.on('callback_query', (query) => {
    const chatId = query.message.chat.id;
    const messageId = query.message.message_id; // ID du message à modifier
    const data = query.data;

    if (data === 'go_back') {
        // Renvoie l'utilisateur au message de démarrage
        bot.editMessageText(startMessage, {
            chat_id: chatId,
            message_id: messageId, // Utilisation du message_id pour cibler le message exact
            reply_markup: {
                inline_keyboard: [
                    [
                        { text: "Edit /start", callback_data: 'update_message' },
                    ],
                    [
                        { text: "Message", callback_data: 'send_message' }
                    ]
                ]
            }
        });
    }

    if (data === 'update_message') {
        // L'admin peut mettre à jour le message de /start
        bot.sendMessage(chatId, "Entrez le nouveau message pour la commande /start :").then(() => {
            bot.once('message', (msg) => {
                startMessage = msg.text; // Mettre à jour le message de start

                // Envoyer un nouveau message en dessous avec la confirmation
                bot.sendMessage(chatId, `Le message de démarrage a été mis à jour : \n\n${startMessage}`, {
                    reply_markup: {
                        inline_keyboard: [
                            [
                                { text: "Edit /start", callback_data: 'update_message' },
                            ],
                            [
                                { text: "Message", callback_data: 'send_message' }
                            ]
                        ]
                    }
                });
            });
        });
    } else if (data === 'send_message') {
        // L'admin peut envoyer un message à tous les utilisateurs
        bot.sendMessage(chatId, "Entrez le message à envoyer à tous les utilisateurs :").then(() => {
            bot.once('message', (msg) => {
                const messageToSend = msg.text;
                sendToAllUsers(messageToSend); // Envoie à tous les utilisateurs

                // Envoyer un nouveau message en dessous avec la confirmation de l'envoi
                bot.sendMessage(chatId, "Le message a été envoyé à tous les utilisateurs !", {
                    reply_markup: {
                        inline_keyboard: [
                            [
                                { text: "Edit /start", callback_data: 'update_message' },
                            ],
                            [
                                { text: "Message", callback_data: 'send_message' }
                            ]
                        ]
                    }
                });
            });
        });
    }

});
