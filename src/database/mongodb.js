const mongoose = require("mongoose");

const MONGODB_URI =
    process.env.MONGODB_URI;

if (!MONGODB_URI) {
    throw new Error(
        "MONGODB_URI is not defined in .env"
    );
}

let cachedConnection = null;

async function connectToDatabase() {
    if (cachedConnection) {
        return cachedConnection;
    }

    try {
        cachedConnection =
            await mongoose.connect(
                MONGODB_URI
            );

        console.log(
            "MongoDB connected successfully."
        );

        return cachedConnection;

    } catch (error) {
        console.error(
            "MongoDB connection failed:"
        );

        console.error(
            error.message
        );

        throw error;
    }
}

async function disconnectFromDatabase() {
    if (!mongoose.connection) {
        return;
    }

    if (
        mongoose.connection.readyState === 0
    ) {
        return;
    }

    await mongoose.disconnect();

    cachedConnection = null;

    console.log(
        "MongoDB disconnected."
    );
}

module.exports = {
    connectToDatabase,
    disconnectFromDatabase,
};