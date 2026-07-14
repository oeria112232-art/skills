const { S3Client, PutObjectCommand } = require("@aws-sdk/client-s3");

const s3 = new S3Client({
  region: "auto",
  endpoint: "https://55bf25ff142a637f72a9e8181ccb9702.r2.cloudflarestorage.com",
  forcePathStyle: true,
  credentials: {
    accessKeyId: "4fd1c5545d7c67df4a60d103147a5159",
    secretAccessKey: "234c7fdff11cc30dcfcdf5482dd50dd6f38587f234e7176ed064f8aa9d9e59aa"
  }
});

async function test() {
  try {
    const r = await s3.send(new PutObjectCommand({
      Bucket: "eduplat-videos",
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
