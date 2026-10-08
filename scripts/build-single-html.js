import fs from 'fs';
import path from 'path';

const distDir = path.resolve('dist');
const assetsDir = path.join(distDir, 'assets');

// Find JS and CSS in dist/assets
const files = fs.readdirSync(assetsDir);
const jsFile = files.find(f => f.startsWith('index-') && f.endsWith('.js'));
const cssFile = files.find(f => f.startsWith('index-') && f.endsWith('.css'));

if (!jsFile || !cssFile) {
  console.error('Built assets not found in dist/assets!');
  process.exit(1);
}

const jsContent = fs.readFileSync(path.join(assetsDir, jsFile), 'utf-8');
const cssContent = fs.readFileSync(path.join(assetsDir, cssFile), 'utf-8');

// Read icon.svg and convert to base64
const iconSvg = fs.readFileSync(path.resolve('public/icon.svg'), 'utf-8');
const iconBase64 = `data:image/svg+xml;base64,${Buffer.from(iconSvg).toString('base64')}`;

// Inlined JS with embedded base64 icon (replaces any quotes or backticks)
let inlinedJs = jsContent.split('./icon.svg').join(iconBase64);

const singleHtml = `<!doctype html>
<html lang="tr">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
    <title>Nivelman Hesabı</title>
    <meta name="description" content="Dayalı GNSS Nivelmanı Uygulaması" />
    <meta name="theme-color" content="#0f172a" />
    <link rel="icon" type="image/svg+xml" href="${iconBase64}" />

    <style>
/* Leaflet & Tailwind Application Styles */
${cssContent}
    </style>
  </head>
  <body class="bg-slate-50 text-slate-800 antialiased font-sans min-h-screen">
    <div id="root"></div>

    <script type="module">
${inlinedJs}
    </script>
  </body>
</html>
`;

// Write to root /app.html
fs.writeFileSync(path.resolve('app.html'), singleHtml, 'utf-8');

// Also write to public/app.html so it can be viewed or downloaded directly via the app URL
if (!fs.existsSync(path.resolve('public'))) {
  fs.mkdirSync(path.resolve('public'), { recursive: true });
}
fs.writeFileSync(path.resolve('public/app.html'), singleHtml, 'utf-8');

console.log('Successfully generated standalone app.html (' + (Buffer.byteLength(singleHtml) / 1024 / 1024).toFixed(2) + ' MB)');
