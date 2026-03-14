const esbuild = require('esbuild');
const path = require('path');
const fs = require('fs');

const isWatch = process.argv.includes('--watch');

const distDir = path.join(__dirname, 'dist');
const tesseractDir = path.join(distDir, 'tesseract');

if (!fs.existsSync(distDir)) {
  fs.mkdirSync(distDir, { recursive: true });
}
if (!fs.existsSync(tesseractDir)) {
  fs.mkdirSync(tesseractDir, { recursive: true });
}

function copyTesseractFiles() {
  const filesToCopy = [
    {
      src: 'node_modules/tesseract.js/dist/worker.min.js',
      dest: 'dist/tesseract/worker.min.js'
    },
    {
      src: 'node_modules/tesseract.js-core/tesseract-core-simd.wasm.js',
      dest: 'dist/tesseract/tesseract-core-simd.wasm.js'
    }
  ];

  for (const file of filesToCopy) {
    const srcPath = path.join(__dirname, file.src);
    const destPath = path.join(__dirname, file.dest);
    
    if (fs.existsSync(srcPath)) {
      fs.copyFileSync(srcPath, destPath);
      console.log(`Copied: ${file.src} -> ${file.dest}`);
    } else {
      console.warn(`Warning: ${file.src} not found`);
    }
  }
}

const buildOptions = {
  entryPoints: ['popup/popup.js'],
  bundle: true,
  outfile: 'dist/popup.bundle.js',
  format: 'iife',
  platform: 'browser',
  target: ['chrome100'],
  sourcemap: true,
  minify: !isWatch,
  loader: {
    '.js': 'js'
  }
};

async function build() {
  try {
    copyTesseractFiles();

    if (isWatch) {
      const ctx = await esbuild.context(buildOptions);
      await ctx.watch();
      console.log('Watching for changes...');
    } else {
      await esbuild.build(buildOptions);
      console.log('Build complete: dist/popup.bundle.js');
    }
  } catch (err) {
    console.error('Build failed:', err);
    process.exit(1);
  }
}

build();
