import { v2 as cloudinary } from 'cloudinary';
import dotenv from 'dotenv';
// Use global fetch (native in Node 18+)

dotenv.config();

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

// A dummy PDF header buffer to test upload
const dummyPdfBuffer = Buffer.from('%PDF-1.4\n1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] >>\nendobj\nxref\n0 4\n0000000000 65535 f\n0000000009 00000 n\n0000000056 00000 n\n0000000111 00000 n\ntrailer\n<< /Size 4 /Root 1 0 R >>\nstartxref\n190\n%%EOF');

const testUpload = async (resourceType) => {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      { 
        folder: 'test_admin_reports',
        public_id: `test_report_${resourceType}.pdf`, // Explicitly add .pdf extension to public_id
        resource_type: resourceType,
        overwrite: true
      },
      async (error, result) => {
        if (error) {
          console.error(`❌ Upload failed for ${resourceType}:`, error.message);
          return resolve(null);
        }
        console.log(`✅ Upload success for ${resourceType}. URL:`, result.secure_url);
        
        // Try fetching the URL
        try {
          const res = await fetch(result.secure_url);
          console.log(`   Fetch status for ${resourceType}:`, res.status, `Content-Type:`, res.headers.get('content-type'));
        } catch (fetchErr) {
          console.error(`   Fetch error for ${resourceType}:`, fetchErr.message);
        }
        resolve(result);
      }
    );
    stream.end(dummyPdfBuffer);
  });
};

async function run() {
  console.log("Starting Cloudinary test...");
  await testUpload('raw');
  await testUpload('image');
  process.exit(0);
}

run();
