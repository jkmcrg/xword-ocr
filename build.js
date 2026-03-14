const esbuild = require('esbuild');
const path = require('path');
const fs = require('fs');

const isWatch = process.argv.includes('--watch');

const distDir = path.join(__dirname, 'dist');
if (!fs.existsSync(distDir)) {
  fs.mkdirSync(distDir, { recursive: true });
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
