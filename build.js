const esbuild = require('esbuild');
const path = require('path');
const fs = require('fs');

const isWatch = process.argv.includes('--watch');

const distDir = path.join(__dirname, 'dist');

if (!fs.existsSync(distDir)) {
  fs.mkdirSync(distDir, { recursive: true });
}

const commonOptions = {
  bundle: true,
  format: 'iife',
  platform: 'browser',
  target: ['chrome100'],
  sourcemap: true,
  minify: !isWatch,
  loader: {
    '.js': 'js'
  }
};

const buildConfigs = [
  {
    ...commonOptions,
    entryPoints: ['popup/popup.js'],
    outfile: 'dist/popup.bundle.js'
  },
  {
    ...commonOptions,
    entryPoints: ['popup/settings.js'],
    outfile: 'dist/settings.bundle.js'
  }
];

async function build() {
  try {
    if (isWatch) {
      for (const config of buildConfigs) {
        const ctx = await esbuild.context(config);
        await ctx.watch();
      }
      console.log('Watching for changes...');
    } else {
      for (const config of buildConfigs) {
        await esbuild.build(config);
        console.log(`Build complete: ${config.outfile}`);
      }
    }
  } catch (err) {
    console.error('Build failed:', err);
    process.exit(1);
  }
}

build();
