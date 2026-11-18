#!/usr/bin/env node
/**
 * Neon S3 Object Storage — Test va Tekshiruv Skripti
 * Ishlatish: node scripts/test-neon-storage.mjs
 */

import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import * as dotenv from "dotenv";

dotenv.config();

const endpoint = process.env.AWS_ENDPOINT_URL_S3 || "https://br-dark-math-beyvvxd8.storage.c-9.us-east-2.aws.neon.tech";
const accessKeyId = process.env.AWS_ACCESS_KEY_ID || "nak_live_a830d72ca13646aaae231f0a1c17d35e";
const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY || "nsk_live_1f92bc1985936e64ba5131a79c12fa1e07ef821f54f8ab9f7d1c1cc1825e7bfc";
const region = process.env.AWS_REGION || "us-east-2";
const bucket = process.env.S3_BUCKET_NAME || "assets";

console.log("=== Neon S3 Storage Tekshiruv ===");
console.log(`Endpoint: ${endpoint}`);
console.log(`Region:   ${region}`);
console.log(`Bucket:   ${bucket}`);
console.log(`Key ID:   ${accessKeyId.substring(0, 12)}...`);

const s3 = new S3Client({
  endpoint,
  region,
  credentials: {
    accessKeyId,
    secretAccessKey,
  },
  forcePathStyle: true,
});

async function main() {
  const testKey = `test-healthcheck-${Date.now()}.txt`;
  const content = `AXM Nexus Neon Storage HealthCheck @ ${new Date().toISOString()}`;

  try {
    console.log(`\n1. Fayl yuklanmoqda: ${testKey}...`);
    await s3.send(new PutObjectCommand({
      Bucket: bucket,
      Key: testKey,
      Body: content,
      ContentType: "text/plain",
    }));
    console.log("✓ Fayl muvaffaqiyatli yuklandi!");

    console.log("\n2. Presigned URL generatsiya qilinmoqda...");
    const url = await getSignedUrl(s3, new GetObjectCommand({ Bucket: bucket, Key: testKey }), { expiresIn: 3600 });
    console.log(`✓ Presigned URL: ${url}`);

    console.log("\n3. Fayl tozalanmoqda (o'chirilmoqda)...");
    await s3.send(new DeleteObjectCommand({ Bucket: bucket, Key: testKey }));
    console.log("✓ Fayl o'chirildi!");

    console.log("\n>>> Neon S3 Storage to'liq ishchi holatda! <<<");
  } catch (err) {
    console.error("Xatolik yuz berdi:", err.message);
  }
}

main();
