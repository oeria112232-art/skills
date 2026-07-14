import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";

// Try with explicit region matching bucket location
const configs = [
  { region: "eeur", label: "eeur" },
  { region: "wnam", label: "wnam" },
  { region: "auto", label: "auto" },
];

for (const cfg of configs) {
  const s3 = new S3Client({
    region: cfg.region,
    endpoint: `https://55bf25ff142a637f72a9e8181ccb9702.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: "4fd1c5545d7c67df4a60d103147a5159",
      secretAccessKey: "234c7fdff11cc30dcfcdf5482dd50dd6f38587f234e7176ed064f8aa9d9e59aa"
    }
  });

  try {
    const r = await s3.send(new PutObjectCommand({
      Bucket: "eduplat-videos",
      Key: `test/region-${cfg.label}.txt`,
      Body: Buffer.from("Hello R2!"),
      ContentType: "text/plain"
    }));
    console.log(`Region ${cfg.label}: SUCCESS! ETag: ${r.ETag}`);
    break;
  } catch(e) {
    console.log(`Region ${cfg.label}: FAIL - ${e.name}`);
  }
}
