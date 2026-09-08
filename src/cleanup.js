require("dotenv").config();


const {
    connectToDatabase,
    disconnectFromDatabase,
} = require("./database/mongodb");


const Message =
    require("./database/models/Message");


const {
    deleteFile,
} = require("./storage/b2");


/*
|--------------------------------------------------------------------------
| Configuration
|--------------------------------------------------------------------------
*/

const TARGET_MEDIA_TYPE =
    "video";

const TARGET_MIME_TYPE =
    "video/webm";


/*
|--------------------------------------------------------------------------
| Helpers
|--------------------------------------------------------------------------
*/

function printLine() {
    console.log(
        "========================================"
    );
}


/*
|--------------------------------------------------------------------------
| Find target messages
|--------------------------------------------------------------------------
*/

async function findTargetMessages() {
    return Message.find({
        "media.type":
            TARGET_MEDIA_TYPE,

        "media.mimeType":
            TARGET_MIME_TYPE,
    })
        .select({
            _id: 1,

            telegramId: 1,

            chatId: 1,

            "media.type": 1,

            "media.mimeType": 1,

            "media.storageKey": 1,

            "media.status": 1,
        })
        .sort({
            chatId: 1,

            telegramId: 1,
        })
        .lean();
}


/*
|--------------------------------------------------------------------------
| Statistics
|--------------------------------------------------------------------------
*/

function getStatistics(
    messages
) {
    const statistics = {
        total: messages.length,

        uploaded: 0,

        pending: 0,

        failed: 0,

        uploading: 0,

        withStorageKey: 0,

        withoutStorageKey: 0,
    };


    for (
        const message of messages
    ) {
        const status =
            message.media?.status;


        if (
            status === "uploaded"
        ) {
            statistics.uploaded++;
        }

        else if (
            status === "pending"
        ) {
            statistics.pending++;
        }

        else if (
            status === "failed"
        ) {
            statistics.failed++;
        }

        else if (
            status === "uploading"
        ) {
            statistics.uploading++;
        }


        if (
            message.media?.storageKey
        ) {
            statistics.withStorageKey++;
        }

        else {
            statistics.withoutStorageKey++;
        }
    }


    return statistics;
}


/*
|--------------------------------------------------------------------------
| Print statistics
|--------------------------------------------------------------------------
*/

function printStatistics(
    statistics
) {
    printLine();

    console.log(
        "TELEGRAM MEDIA CLEANUP"
    );

    printLine();


    console.log(
        `Target media type: ${TARGET_MEDIA_TYPE}`
    );

    console.log(
        `Target MIME type: ${TARGET_MIME_TYPE}`
    );


    printLine();


    console.log(
        `Total messages: ${statistics.total}`
    );

    console.log(
        `Uploaded: ${statistics.uploaded}`
    );

    console.log(
        `Pending: ${statistics.pending}`
    );

    console.log(
        `Failed: ${statistics.failed}`
    );

    console.log(
        `Uploading: ${statistics.uploading}`
    );


    printLine();


    console.log(
        `B2 objects to delete: ${statistics.withStorageKey}`
    );

    console.log(
        `MongoDB records to delete: ${statistics.total}`
    );

    console.log(
        `Records without B2 object: ${statistics.withoutStorageKey}`
    );


    printLine();
}


/*
|--------------------------------------------------------------------------
| Delete one message
|--------------------------------------------------------------------------
*/

async function deleteMessage(
    message
) {
    const storageKey =
        message.media?.storageKey;


    /*
     * If the message has a B2 file,
     * delete the B2 object first.
     */
    if (storageKey) {
        try {
            console.log(
                `Deleting B2: ${storageKey}`
            );


            await deleteFile(
                storageKey
            );


            console.log(
                `B2 deleted: ${storageKey}`
            );

        } catch (error) {
            console.error(
                `B2 deletion failed: ${storageKey}`
            );

            console.error(
                error.message
            );


            /*
             * Do NOT delete MongoDB record
             * if B2 deletion failed.
             */
            return {
                success: false,

                reason:
                    "b2_failed",
            };
        }
    }


    /*
     * B2 deletion succeeded or there
     * was no B2 object.
     *
     * Now delete MongoDB record.
     */
    try {
        const result =
            await Message.deleteOne({
                _id:
                    message._id,
            });


        if (
            result.deletedCount !== 1
        ) {
            console.error(
                `MongoDB deletion failed: ` +
                `${message.chatId}/${message.telegramId}`
            );


            return {
                success: false,

                reason:
                    "mongodb_failed",
            };
        }


        console.log(
            `MongoDB deleted: ` +
            `${message.chatId}/${message.telegramId}`
        );


        return {
            success: true,
        };

    } catch (error) {
        console.error(
            `MongoDB deletion failed: ` +
            `${message.chatId}/${message.telegramId}`
        );

        console.error(
            error.message
        );


        return {
            success: false,

            reason:
                "mongodb_failed",
        };
    }
}


/*
|--------------------------------------------------------------------------
| Delete all target messages
|--------------------------------------------------------------------------
*/

async function deleteMessages(
    messages
) {
    let successful = 0;

    let b2Failed = 0;

    let mongodbFailed = 0;


    for (
        let index = 0;
        index < messages.length;
        index++
    ) {
        const message =
            messages[index];


        console.log(
            "\n----------------------------------------"
        );


        console.log(
            `Progress: ${index + 1}/${messages.length}`
        );


        console.log(
            `Chat: ${message.chatId}`
        );


        console.log(
            `Telegram message: ${message.telegramId}`
        );


        console.log(
            `Status: ${message.media?.status}`
        );


        const result =
            await deleteMessage(
                message
            );


        if (
            result.success
        ) {
            successful++;
        }

        else if (
            result.reason ===
            "b2_failed"
        ) {
            b2Failed++;
        }

        else if (
            result.reason ===
            "mongodb_failed"
        ) {
            mongodbFailed++;
        }
    }


    return {
        successful,

        b2Failed,

        mongodbFailed,
    };
}


/*
|--------------------------------------------------------------------------
| Main
|--------------------------------------------------------------------------
*/

async function main() {
    try {
        console.log(
            "Starting Telegram media cleaner..."
        );


        /*
         * Connect to MongoDB.
         */
        console.log(
            "Connecting to MongoDB..."
        );


        await connectToDatabase();


        /*
         * Find target messages.
         */
        console.log(
            "Searching for target messages..."
        );


        const messages =
            await findTargetMessages();


        /*
         * Get statistics.
         */
        const statistics =
            getStatistics(
                messages
            );


        /*
         * Show what will be deleted.
         */
        printStatistics(
            statistics
        );


        /*
         * Nothing to delete.
         */
        if (
            messages.length === 0
        ) {
            console.log(
                "No matching messages found."
            );

            return;
        }


        /*
         * Safety warning.
         */
        console.log(
            "\nWARNING:"
        );

        console.log(
            "This operation is irreversible."
        );

        console.log(
            "B2 files and MongoDB records will be deleted."
        );


        /*
         * Start cleanup directly.
         */
        console.log(
            "\nStarting cleanup..."
        );


        const result =
            await deleteMessages(
                messages
            );


        /*
         * Final report.
         */
        console.log(
            "\n"
        );

        printLine();

        console.log(
            "CLEANUP COMPLETED"
        );

        printLine();


        console.log(
            `Successfully deleted: ${result.successful}`
        );


        console.log(
            `B2 deletion failed: ${result.b2Failed}`
        );


        console.log(
            `MongoDB deletion failed: ${result.mongodbFailed}`
        );


        printLine();


        /*
         * Check remaining messages.
         */
        const remaining =
            await Message.countDocuments({
                "media.type":
                    TARGET_MEDIA_TYPE,

                "media.mimeType":
                    TARGET_MIME_TYPE,
            });


        console.log(
            `Remaining target messages: ${remaining}`
        );


        printLine();

    } catch (error) {
        console.error(
            "\nCleanup failed:"
        );

        console.error(
            error
        );

        process.exitCode = 1;

    } finally {
        /*
         * Always close MongoDB connection.
         */
        try {
            await disconnectFromDatabase();

        } catch (error) {
            console.error(
                "Failed to disconnect from MongoDB:"
            );

            console.error(
                error.message
            );
        }
    }
}


/*
|--------------------------------------------------------------------------
| Start
|--------------------------------------------------------------------------
*/

main();
