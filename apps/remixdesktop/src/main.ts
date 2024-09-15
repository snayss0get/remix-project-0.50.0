import { app, BrowserWindow, dialog, Menu, MenuItem, shell, utilityProcess } from 'electron';
import path from 'path';


export let isPackaged = false;
export const version = app.getVersion();

if (
  process.mainModule &&
  process.mainModule.filename.indexOf('app.asar') !== -1
) {
  isPackaged = true;
} else if (process.argv.filter(a => a.indexOf('app.asar') !== -1).length > 0) {
  isPackaged = true;
}

// get system home dir
const homeDir = app.getPath('userData')

const windowSet = new Set<BrowserWindow>([]);
export const createWindow = async (dir?: string): Promise<void> => {
  // Create the browser window.
  const mainWindow = new BrowserWindow({
    height: 800,
    width: 1024,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js')
    },
  });
  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url); // Open URL in user's browser.
    return { action: "deny" }; // Prevent the app from opening the URL.
  })
  if (dir && dir.endsWith('/')) dir = dir.slice(0, -1)
  const params = dir ? `?opendir=${encodeURIComponent(dir)}` : '';
  // and load the index.html of the app.
  mainWindow.loadURL(
    process.env.NODE_ENV === 'production' || isPackaged ? `file://${__dirname}/remix-ide/index.html` + params :
      'http://localhost:8080' + params)

  mainWindow.maximize();

  if (dir) {
    mainWindow.setTitle(dir)
  }

  // on close
  mainWindow.on('close', (event) => {
    windowSet.delete(mainWindow)
  })

  windowSet.add(mainWindow)
  //mainWindow.webContents.openDevTools();
};

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.on('ready', async () => {
  require('./engine')
});

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  // On OS X it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

const showAbout = () => {


  void dialog.showMessageBox({
    title: `About Remix`,
    message: `Remix`,
    detail: `Remix`,
    buttons: [],
  });
};

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and import them here.

const isMac = process.platform === 'darwin'

import FileMenu from './menus/file';
import darwinMenu from './menus/darwin';
import WindowMenu from './menus/window';
import EditMenu from './menus/edit';
import GitMenu from './menus/git';
import ViewMenu from './menus/view';
import TerminalMenu from './menus/terminal';
import HelpMenu from './menus/help';
import { execCommand } from './menus/commands';


const commandKeys: Record<string, string> = {
  'window:new': 'CmdOrCtrl+N',
  'folder:open': 'CmdOrCtrl+O',
};

const menu = [...(process.platform === 'darwin' ? [darwinMenu(commandKeys, execCommand, showAbout)] : []),
  FileMenu(commandKeys, execCommand),
  GitMenu(commandKeys, execCommand),
  EditMenu(commandKeys, execCommand),
  ViewMenu(commandKeys, execCommand),
  TerminalMenu(commandKeys, execCommand),
  WindowMenu(commandKeys, execCommand, []),
  HelpMenu(commandKeys, execCommand),
]

Menu.setApplicationMenu(Menu.buildFromTemplate(menu))



