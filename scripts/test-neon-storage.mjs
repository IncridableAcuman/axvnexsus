#!/usr/bin/env node
/**
 * Neon S3 Object Storage — Test va Tekshiruv Skripti
 * Ishlatish: node scripts/test-neon-storage.mjs
 * 
 * Ushbu skript npmpackages.txt da ko'rsatilgan Neon S3 sozlamalari
 * va @aws-sdk paketlari orqali bucket ulanishini sinovdan o'tkazadi.
 * Agar @aws-sdk o'rnatilmagan bo'lsa, Node.js 18+ ning ichki (native)
 * fetch va crypto moduli orqali AWS SigV4 imzosi bilan ulanadi.
 */

import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

// 1. .env faylini yuklash
const envPath = path.resolve(process.cwd(), ".env");
if (fs.existsSync(envPath)) {
  if (typeof process.loadEnvFile === "function") {
    try {
      process.loadEnvFile(envPath);
    } catch {
      // ignore
    }
  } else {
    const lines = fs.readFileSync(envPath, "utf-8").split("\n");
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const [key, ...vals] = trimmed.split("=");
      if (key && vals.length > 0) {
        const val = vals.join("=").replace(/^["']|["']$/g, "").trim();
        process.env[key.trim()] = val;
      }
    }
  }
}

const endpoint = process.env.AWS_ENDPOINT_URL_S3 || "";
const accessKeyId = process.env.AWS_ACCESS_KEY_ID || "";
const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY || "";
const region = process.env.AWS_REGION || "us-east-2";
const bucket = process.env.S3_BUCKET_NAME || "assets";

console.log("==================================================");
console.log(" AXM Nexus — Neon S3 Object Storage Healthcheck");
console.log("==================================================");
console.log(`Endpoint: ${endpoint}`);
console.log(`Region:   ${region}`);
console.log(`Bucket:   ${bucket}`);
console.log(`Key ID:   ${accessKeyId.substring(0, 16)}...`);
console.log("--------------------------------------------------");

async function runWithAwsSdk() {
  const { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } = await import("@aws-sdk/client-s3");
  const { getSignedUrl } = await import("@aws-sdk/s3-request-presigner");

  console.log("[Rejim] @aws-sdk/client-s3 kutubxonasi orqali tekshirilmoqda...\n");

  const s3 = new S3Client({
    endpoint,
    region,
    credentials: { accessKeyId, secretAccessKey },
    forcePathStyle: true,
  });

  const testKey = `test-healthcheck-${Date.now()}.txt`;
  const content = `AXM Nexus Neon Storage HealthCheck @ ${new Date().toISOString()}`;

  console.log(`1. Test fayli yuklanmoqda: ${testKey}...`);
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

  console.log("\n3. Test fayli o'chirilmoqda...");
  await s3.send(new DeleteObjectCommand({ Bucket: bucket, Key: testKey }));
  console.log("✓ Fayl o'chirildi!");

  console.log("\n>>> Neon S3 Storage to'liq ishchi holatda! <<<");
}

function sha256Hex(data) {
  return crypto.createHash("sha256").update(data).digest("hex");
}

function hmacSha256(key, data) {
  return crypto.createHmac("sha256", key).update(data).digest();
}

function getSigningKey(secret, dateStamp, regionName, serviceName) {
  const kDate = hmacSha256("AWS4" + secret, dateStamp);
  const kRegion = hmacSha256(kDate, regionName);
  const kService = hmacSha256(kRegion, serviceName);
  return hmacSha256(kService, "aws4_request");
}

async function runWithNativeNode() {
  console.log("[Rejim] Node.js ichki SigV4 & fetch moduli orqali tekshirilmoqda...\n");

  const testKey = `test-native-${Date.now()}.txt`;
  const content = `AXM Nexus Native Test @ ${new Date().toISOString()}`;
  const now = new Date();
  const amzDate = now.toISOString().replace(/[:-]|\.\d{3}/g, "");
  const dateStamp = amzDate.substring(0, 8);

  const parsedUrl = new URL(endpoint);
  const host = parsedUrl.host;
  const canonicalUri = `/${bucket}/${testKey}`;
  const fullUrl = `${endpoint}${canonicalUri}`;

  const payloadHash = sha256Hex(content);
  const canonicalHeaders = `host:${host}\nx-amz-content-sha256:${payloadHash}\nx-amz-date:${amzDate}\n`;
  const signedHeaders = "host;x-amz-content-sha256;x-amz-date";

  const canonicalRequest = `PUT\n${canonicalUri}\n\n${canonicalHeaders}\n${signedHeaders}\n${payloadHash}`;
  const credentialScope = `${dateStamp}/${region}/s3/aws4_request`;
  const stringToSign = `AWS4-HMAC-SHA256\n${amzDate}\n${credentialScope}\n${sha256Hex(canonicalRequest)}`;

  const signingKey = getSigningKey(secretAccessKey, dateStamp, region, "s3");
  const signature = crypto.createHmac("sha256", signingKey).update(stringToSign).digest("hex");
  const authHeader = `AWS4-HMAC-SHA256 Credential=${accessKeyId}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`;

  console.log(`1. Native PUT so'rovi yuborilmoqda: ${testKey}...`);
  const putRes = await fetch(fullUrl, {
    method: "PUT",
    headers: {
      Host: host,
      "x-amz-date": amzDate,
      "x-amz-content-sha256": payloadHash,
      "Content-Type": "text/plain",
      Authorization: authHeader,
    },
    body: content,
  });

  if (!putRes.ok) {
    const errText = await putRes.text();
    throw new Error(`S3 PUT muvaffaqiyatsiz bo'ldi (${putRes.status}): ${errText}`);
  }
  console.log("✓ Fayl muvaffaqiyatli yuklandi!");

  console.log("\n2. Native DELETE so'rovi bilan tozalanmoqda...");
  const delNow = new Date();
  const delAmzDate = delNow.toISOString().replace(/[:-]|\.\d{3}/g, "");
  const delDateStamp = delAmzDate.substring(0, 8);
  const delPayloadHash = sha256Hex("");
  const delCanonicalHeaders = `host:${host}\nx-amz-content-sha256:${delPayloadHash}\nx-amz-date:${delAmzDate}\n`;
  const delCanonicalRequest = `DELETE\n${canonicalUri}\n\n${delCanonicalHeaders}\n${signedHeaders}\n${delPayloadHash}`;
  const delStringToSign = `AWS4-HMAC-SHA256\n${delAmzDate}\n${delDateStamp}/${region}/s3/aws4_request\n${sha256Hex(delCanonicalRequest)}`;
  const delSigningKey = getSigningKey(secretAccessKey, delDateStamp, region, "s3");
  const delSignature = crypto.createHmac("sha256", delSigningKey).update(delStringToSign).digest("hex");
  const delAuthHeader = `AWS4-HMAC-SHA256 Credential=${accessKeyId}/${delDateStamp}/${region}/s3/aws4_request, SignedHeaders=${signedHeaders}, Signature=${delSignature}`;

  await fetch(fullUrl, {
    method: "DELETE",
    headers: {
      Host: host,
      "x-amz-date": delAmzDate,
      "x-amz-content-sha256": delPayloadHash,
      Authorization: delAuthHeader,
    },
  });
  console.log("✓ Fayl o'chirildi!");
  console.log("\n>>> Neon S3 Storage to'liq ishchi holatda! <<<");
}

async function main() {
  try {
    await runWithAwsSdk();
  } catch (sdkErr) {
    if (sdkErr.code === "ERR_MODULE_NOT_FOUND" || sdkErr.message?.includes("Cannot find package")) {
      console.log("(@aws-sdk kutubxonasi topilmadi, native Node.js rejimiga o'tilmoqda)");
      try {
        await runWithNativeNode();
      } catch (nativeErr) {
        console.error("Xatolik yuz berdi:", nativeErr.message);
      }
    } else {
      console.error("Xatolik yuz berdi:", sdkErr.message);
    }
  }
}

main();
