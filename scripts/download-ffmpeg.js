const https = require('https');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const url = 'https://github.com/yt-dlp/FFmpeg-Builds/releases/download/latest/ffmpeg-master-latest-win64-gpl.zip';
const outDir = path.resolve(__dirname, '..', 'ffmpeg');
const zipFile = path.join(outDir, 'ffmpeg.zip');

if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

console.log('Downloading ffmpeg...');
const file = fs.createWriteStream(zipFile);

function download(downloadUrl) {
  return new Promise((resolve, reject) => {
    const mod = downloadUrl.startsWith('https') ? https : require('http');
    const req = mod.get(downloadUrl, { headers: { 'User-Agent': 'Mozilla/5.0' } }, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        console.log('Redirecting to:', res.headers.location);
        download(res.headers.location).then(resolve).catch(reject);
        return;
      }
      console.log('Status:', res.statusCode);
      res.pipe(file);
      file.on('finish', () => { file.close(); resolve(); });
    });
    req.on('error', reject);
    req.setTimeout(60000, () => { req.destroy(); reject(new Error('timeout')); });
  });
}

download(url).then(() => {
  console.log('Downloaded. Extracting...');
  try {
    execSync(`tar -xf "${zipFile}" -C "${outDir}"`, { stdio: 'inherit' });
    // Find the ffmpeg.exe
    function findFfmpeg(dir) {
      for (const f of fs.readdirSync(dir)) {
        const fp = path.join(dir, f);
        if (f === 'ffmpeg.exe') return fp;
        if (fs.statSync(fp).isDirectory()) {
          const r = findFfmpeg(fp);
          if (r) return r;
        }
      }
    }
    const exe = findFfmpeg(outDir);
    if (exe) {
      // Copy to a simple path
      const target = path.join(outDir, 'ffmpeg.exe');
      if (exe !== target) fs.copyFileSync(exe, target);
      console.log('SUCCESS: ffmpeg at', target);
      const ver = execSync(`"${target}" -version`).toString().split('\n')[0];
      console.log('Version:', ver);
    } else {
      console.log('ffmpeg.exe not found in extracted files');
    }
  } catch(e) {
    console.log('Extract error:', e.message);
  }
}).catch(e => console.log('Download failed:', e.message));
