import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import os from 'os';

const R2_BUCKET = 'timi-gallery';
const R2_PUBLIC_URL = 'https://pub-327f4433aa4146c4852ab84c5b89ec45.r2.dev';
const R2_ENDPOINT = `https://${process.env.CLOUDFLARE_ACCOUNT_ID}.r2.cloudflarestorage.com`;
const configPath = path.join(process.cwd(), 'src/data/gallery-config.json');

export async function POST(req: Request) {
  const formData = await req.formData();
  const files = formData.getAll('files') as File[];
  const added: { src: string; w: number; h: number }[] = [];
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'gallery-'));

  try {
    for (const file of files) {
      const bytes = await file.arrayBuffer();
      const buffer = Buffer.from(bytes);
      const filename = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
      const tmpPath = path.join(tmpDir, filename);
      fs.writeFileSync(tmpPath, buffer);

      const s3Key = `gallery/${filename}`;
      execSync(
        `aws s3 cp "${tmpPath}" "s3://${R2_BUCKET}/${s3Key}" --endpoint-url "${R2_ENDPOINT}"`,
        {
          env: {
            ...process.env,
            AWS_ACCESS_KEY_ID: process.env.R2_ACCESS_KEY_ID,
            AWS_SECRET_ACCESS_KEY: process.env.R2_SECRET_ACCESS_KEY,
          },
        }
      );

      const size = getImageSize(tmpPath);
      added.push({
        src: `${R2_PUBLIC_URL}/${s3Key}`,
        w: size.w,
        h: size.h,
      });
    }

    const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
    for (const img of added) {
      if (!config.some((p: { src: string }) => p.src === img.src)) {
        config.push({
          src: img.src,
          caption: '',
          hidden: false,
          w: img.w,
          h: img.h,
          votes: 0,
        });
      }
    }
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2));

    return NextResponse.json({ added: added.length });
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
}

function getImageSize(filePath: string): { w: number; h: number } {
  try {
    const output = execSync(`sips -g pixelWidth -g pixelHeight "${filePath}"`, { encoding: 'utf-8' });
    const wMatch = output.match(/pixelWidth:\s*(\d+)/);
    const hMatch = output.match(/pixelHeight:\s*(\d+)/);
    return {
      w: wMatch ? parseInt(wMatch[1]) : 800,
      h: hMatch ? parseInt(hMatch[1]) : 600,
    };
  } catch {
    return { w: 800, h: 600 };
  }
}
