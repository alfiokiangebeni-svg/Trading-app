// Copies the web app (single page + PWA files) into www/ for the Android and desktop builds.
import { cpSync, mkdirSync, rmSync } from 'node:fs';
const out = process.argv[2] || 'www';
rmSync(out, { recursive: true, force: true });
mkdirSync(out, { recursive: true });
for (const f of ['index.html', 'manifest.webmanifest', 'sw.js', 'icons', 'js', 'css']) cpSync(f, `${out}/${f}`, { recursive: true });
// rapports du bot de recherche Python (affichés dans l'onglet Labo)
cpSync('bot/reports', `${out}/bot/reports`, { recursive: true });
console.log(`web app copied to ${out}/`);
