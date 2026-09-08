const {
    S3Client,
    DeleteObjectCommand,
} = require("@aws-sdk/client-s3");


const endpoint =
    process.env.B2_ENDPOINT;

const region =
    process.env.B2_REGION;

const accessKeyId =
    process.env.B2_KEY_ID;

const secretAccessKey =
    process.env.B2_APPLICATION_KEY;

const bucketName =
    process.env.B2_BUCKET_NAME;


if (!endpoint) {
    throw new Error(
        "B2_ENDPOINT is not defined in .env"
    );
}


if (!region) {
    throw new Error(
        "B2_REGION is not defined in .env"
    );
}


if (!accessKeyId) {
    throw new Error(
        "B2_KEY_ID is not defined in .env"
    );
}


if (!secretAccessKey) {
    throw new Error(
        "B2_APPLICATION_KEY is not defined in .env"
    );
}


if (!bucketName) {
    throw new Error(
        "B2_BUCKET_NAME is not defined in .env"
    );
}


/*
|--------------------------------------------------------------------------
| B2 S3 Client
|--------------------------------------------------------------------------
*/

const s3 =
    new S3Client({
        endpoint,

        region,

        credentials: {
            accessKeyId,
            secretAccessKey,
        },
    });


/*
|--------------------------------------------------------------------------
| Delete object
|--------------------------------------------------------------------------
*/

async function deleteFile(
    storageKey
) {
    if (!storageKey) {
        throw new Error(
            "Storage key is required"
        );
    }


    const command =
        new DeleteObjectCommand({
            Bucket:
                bucketName,

            Key:
                storageKey,
        });


    await s3.send(
        command
    );


    return true;
}


module.exports = {
    deleteFile,
};