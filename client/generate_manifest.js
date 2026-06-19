import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const distDir = path.join(__dirname, 'dist');

function getFiles(dir, filesList = []) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const name = path.join(dir, file);
    if (fs.statSync(name).isDirectory()) {
      getFiles(name, filesList);
    } else {
      const relativePath = path.relative(distDir, name).replace(/\\/g, '/');
      // Only cache index.html, CSS, JS, fonts, SVG and PNG assets (exclude source maps or config leftovers)
      if (!relativePath.endsWith('.map') && relativePath !== 'manifest.json' && !relativePath.endsWith('.apk')) {
        filesList.push('/' + relativePath);
      }
    }
  }
  return filesList;
}

try {
  if (fs.existsSync(distDir)) {
    const assets = getFiles(distDir);
    const version = 'v' + Date.now();
    const manifest = {
      version,
      assets
    };
    fs.writeFileSync(
      path.join(distDir, 'manifest.json'),
      JSON.stringify(manifest, null, 2)
    );
    console.log(`✅ Successfully generated manifest.json with ${assets.length} assets. Version: ${version}`);
  } else {
    console.error('dist directory does not exist.');
  }
} catch (error) {
  console.error('Error generating manifest:', error);
}
