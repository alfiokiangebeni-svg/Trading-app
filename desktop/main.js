// Alerte Trading — PC application (Windows, macOS, Linux).
// Loads the same single-page app as the web/Android versions from local files.
const { app, BrowserWindow, shell, Menu, nativeTheme, session } = require('electron');
const path = require('path');

nativeTheme.themeSource = 'dark';
if (!app.requestSingleInstanceLock()) app.quit();

let win;
function createWindow() {
  win = new BrowserWindow({
    width: 1480, height: 960, minWidth: 380, minHeight: 600,
    backgroundColor: '#05070b', title: 'Alerte Trading', show: false,
    icon: path.join(__dirname, 'app', 'icons', 'icon-512.png'),
    autoHideMenuBar: true,
    webPreferences: { contextIsolation: true, sandbox: true, nodeIntegration: false, backgroundThrottling: false }
  });
  win.loadFile(path.join(__dirname, 'app', 'index.html'));
  win.once('ready-to-show', () => win.show());
  // Links (releases, GitHub, etc.) open in the default browser, never inside the app.
  win.webContents.setWindowOpenHandler(({ url }) => { if (/^https?:/.test(url)) shell.openExternal(url); return { action: 'deny' }; });
  win.webContents.on('will-navigate', (e, url) => { if (!url.startsWith('file:')) { e.preventDefault(); shell.openExternal(url); } });
}

Menu.setApplicationMenu(Menu.buildFromTemplate([
  ...(process.platform === 'darwin' ? [{ role: 'appMenu' }] : []),
  { label: 'Affichage', submenu: [{ role: 'reload', label: 'Actualiser' }, { role: 'togglefullscreen', label: 'Plein écran' }, { type: 'separator' }, { role: 'zoomIn', label: 'Zoom +' }, { role: 'zoomOut', label: 'Zoom −' }, { role: 'resetZoom', label: 'Taille normale' }] },
  { role: 'windowMenu', label: 'Fenêtre' }
]));

app.on('second-instance', () => { if (win) { if (win.isMinimized()) win.restore(); win.focus(); } });
app.whenReady().then(() => {
  // The economic calendar (ForexFactory) and Yahoo Finance send no CORS header: allow the app to read them.
  session.defaultSession.webRequest.onHeadersReceived({ urls: ['https://nfs.faireconomy.media/*', 'https://query1.finance.yahoo.com/*', 'https://query2.finance.yahoo.com/*'] }, (details, cb) => {
    const h = details.responseHeaders || {};
    h['access-control-allow-origin'] = ['*'];
    cb({ responseHeaders: h });
  });
  createWindow();
});
app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });
app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) createWindow(); });
