import { app } from "electron";
import serve from "electron-serve";
import { createWindow } from "./helpers";

const isProd: boolean = process.env.NODE_ENV === "production";

if (isProd) {
  serve({ directory: "app" });
} else {
  app.setPath("userData", `${app.getPath("userData")} (development)`);
}

(async () => {
  // https://github.com/electron/electron/issues/25469
  app.commandLine.appendSwitch("disable-features", "CrossOriginOpenerPolicy");

  await app.whenReady();

  app.on(
    "certificate-error",
    (event, webContents, url, error, certificate, callback) => {
      event.preventDefault();
      callback(true);
    }
  );

  const mainWindow = createWindow("main", {
    title: "Tiled Browser",
  });
  mainWindow.maximize();

  if (isProd) {
    await mainWindow.loadURL("app://./home.html");
  } else {
    const port = process.argv[2];
    await mainWindow.loadURL(`http://localhost:${port}/home`, {
      userAgent:
        "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/76.0.3809.131 Safari/537.36",
    });
    // mainWindow.webContents.openDevTools();
  }
})();

app.on("window-all-closed", () => {
  app.quit();
});
