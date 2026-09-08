const mongoose = require("mongoose");

const messageSchema = new mongoose.Schema(
    {
        telegramId: {
            type: Number,
            required: true,
        },

        chatId: {
            type: String,
            required: true,
        },

        media: {
            type: {
                type: String,
            },

            mimeType: {
                type: String,
            },

            storageKey: {
                type: String,
                default: null,
            },

            status: {
                type: String,
            },
        },
    },
    {
        collection: "messages",
        strict: false,
    }
);

const Message =
    mongoose.models.Message ||
    mongoose.model(
        "Message",
        messageSchema
    );

module.exports = Message;