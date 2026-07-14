const { S3Client, PutObjectCommand } = require("@aws-sdk/client-s3");

// Load environment variables from .env if not already loaded
require("dotenv").config({ path: "./.env" });

const R2_ENDPOINT = process.env.R2_ENDPOINT;
const R2_ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID;
const R2_SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY;
const R2_BUCKET = process.env.R2_BUCKET_NAME;

if (!R2_ENDPOINT || !R2_ACCESS_KEY_ID || !R2_SECRET_ACCESS_KEY || !R2_BUCKET) {
  console.error("Missing R2 credentials. Please set R2_ENDPOINT, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET_NAME in .env");
  process.exit(1);
}

const s3 = new S3Client({
  region: "auto",
  endpoint: R2_ENDPOINT,
  forcePathStyle: true,
  credentials: {
    accessKeyId: R2_ACCESS_KEY_ID,
    secretAccessKey: R2_SECRET_ACCESS_KEY
  }
});

async function test() {
  try {
    const r = await s3.send(new PutObjectCommand({
      Bucket: R2_BUCKET,
      Key: "test/hello.txt",
      Body: Buffer.from("Hello R2!"),
      ContentType: "text/plain"
    }));
    console.log("SUCCESS!", JSON.stringify(r));
  } catch(e) {
    console.log("ERROR:", e.name, e.message);
  }
}
test();
