const { app, BrowserWindow, ipcMain, globalShortcut } = require("electron");
const path = require("path");
const { exec, spawn, execSync, execFile } = require("child_process");
const fs = require("fs");

// v7.14: 【最高优先级】全局防崩溃熔断罩
process.on("uncaughtException", (error) => {
  console.error(" [致命错误拦截] ", error);
});

let mainWindow = null;
let fillingProcess = null;

// v1.1.0: 路径标准化与生产环境适配
const IS_PROD = app.isPackaged;
const BACKEND_PATH = IS_PROD
    ? path.join(process.resourcesPath, 'backend')
    : path.resolve(__dirname, '../backend');

// 如果是生产环境，直接调用打包后的二进制；开发环境则调用 python 解释器执行 handler.py
const ENGINE_BIN = IS_PROD
    ? path.join(BACKEND_PATH, process.platform === 'win32' ? 'yucase_engine.exe' : 'yucase_engine')
    : 'python';

const ENGINE_ENTRY = IS_PROD
    ? []
    : [path.join(BACKEND_PATH, 'handler.py')];

const GET_SCRIPT = (name) => path.join(BACKEND_PATH, name);
const RULES_PATH = IS_PROD
    ? path.join(process.resourcesPath, 'rules.json')
    : path.resolve(__dirname, '../rules.json');

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 450,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
    },
    frame: false, // 皇家标准：自定义标题栏
    transparent: true,
    backgroundColor: "#00000000",
    resizable: false,
    maximizable: false,
    icon: path.join(__dirname, "../case512x.png"), // v1.0: 任务栏与窗口图标烙印
  });

  if (process.env.NODE_ENV === "development") {
    mainWindow.loadURL("http://localhost:5173");
  } else {
    mainWindow.loadFile(path.join(__dirname, "../dist/index.html"));
  }

  mainWindow.on("closed", () => {
    mainWindow = null;
  });
}

app.whenReady().then(() => {
  createWindow();

  // v7.24: 【上帝启动】注册全局 F8 快捷键，支持非聚焦状态下开启引擎
  globalShortcut.register("F8", () => {
    console.log("🎹 [GLOBAL F8] 检测到全局击发，正在指令前端启动引擎...");
    if (mainWindow) {
      mainWindow.webContents.send("global-f8-trigger");
    }
  });

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});

function addLogToTerminal(message) {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send("terminal-log", message);
  } else {
    console.log(`[TERMINAL LOG] ${message}`);
  }
}

ipcMain.on("window-min", () => {
  if (mainWindow) mainWindow.minimize();
});

ipcMain.on("window-max", () => {
  if (mainWindow) {
    if (mainWindow.isMaximized()) {
      mainWindow.unmaximize();
    } else {
      mainWindow.maximize();
    }
  }
});

ipcMain.on("window-close", () => {
  if (mainWindow) mainWindow.close();
});

ipcMain.handle("get-rules", async () => {
    return new Promise((resolve) => {
        fs.readFile(RULES_PATH, 'utf8', (err, data) => {
            if (err) {
                console.error("读取规则失败:", err);
                resolve([]);
            } else {
                try {
                    resolve(JSON.parse(data));
                } catch (e) {
                    console.error("解析规则失败:", e);
                    resolve([]);
                }
            }
        });
    });
});

ipcMain.handle("save-rules", async (event, rules) => {
  return new Promise((resolve) => {
    fs.writeFile(
      RULES_PATH,
      JSON.stringify(rules, null, 4),
      "utf8",
      (err) => {
        if (err) resolve({ success: false, message: "保存规则失败" });
        else resolve({ success: true });
      },
    );
  });
});

ipcMain.handle("invoke-python", async (event, { action, data }) => {
    return new Promise((resolve) => {
        console.log(`[EXEC] 执行引擎动作: ${action}`);
        
        if (action === 'STOP_FILLING') {
            // v7.23: 物理离线后，始终确保注销 F9 物理强杀权，防止误吞
            globalShortcut.unregister('F9');
            
            if (fillingProcess && fillingProcess.pid) {
                try {
                    execSync(`taskkill /F /T /PID ${fillingProcess.pid}`);
                } catch (err) {} 
                fillingProcess = null;
                resolve({ success: true, message: '引擎已物理离线' });
                if (mainWindow) mainWindow.webContents.send('filling-state-update', 'engine-stopped');
            } else {
                resolve({ success: true, message: '无运行进程' });
            }
            return;
        }

        if (action === 'SELECT_FILE') {
            const args = [...ENGINE_ENTRY, '--mode', 'SELECT'];
            execFile(ENGINE_BIN, args, (error, stdout) => {
                const output = stdout.trim();
                if (output && output !== 'CANCELLED') resolve({ success: true, path: output });
                else resolve({ success: false, message: '取消选择' });
            });
        } else if (action === 'IMPORT_FILE') {
            const selectArgs = [...ENGINE_ENTRY, '--mode', 'SELECT'];
            execFile(ENGINE_BIN, selectArgs, { encoding: 'utf8' }, (error, stdout) => {
                const output = stdout.trim();
                if (output && output !== 'CANCELLED' && !output.startsWith('ERROR')) {
                    // v1.1: 传入 --rules 确保跨环境一致性
                    const extractArgs = [...ENGINE_ENTRY, '--mode', 'EXTRACT', '--path', output, '--rules', RULES_PATH];
                    execFile(ENGINE_BIN, extractArgs, { encoding: 'utf8' }, (pError, pStdout) => {
                        if (pError) {
                            resolve({ success: false, message: '解析脚本异常' });
                            return;
                        }
                        try {
                            const cleanStdout = pStdout.trim().replace(/^\ufeff/, '');
                            const parsed = JSON.parse(cleanStdout);
                            resolve({ success: true, message: '解析成功', path: output, parsedData: parsed });
                        } catch(e) {
                            resolve({ success: false, message: '数据解析异常' });
                        }
                    });
                } else {
                    resolve({ success: false, message: '取消选择' });
                }
            });
        } else if (action === 'START_FILLING') {
            const { fillList, speed } = data;
            const fillListB64 = Buffer.from(JSON.stringify(fillList)).toString('base64');

            console.log(`🚀 [START_FILLING] 准备唤醒后端引擎 (Binary: ${ENGINE_BIN})...`);

            if (fillingProcess && fillingProcess.pid) {
                try { execSync(`taskkill /F /T /PID ${fillingProcess.pid}`); } catch(e){}
            }

            // v1.1: 使用聚合后的 args 发起填报
            const fillArgs = [...ENGINE_ENTRY, '--mode', 'FILL', '--payload', fillListB64, '--speed', speed.toString()];
            fillingProcess = spawn(ENGINE_BIN, fillArgs, {
              encoding: 'utf8'
            });

      fillingProcess.on("error", (err) => {
        console.error(`🚨 [SPAWN ERROR] 进程启动失败: ${err.message}`);
        addLogToTerminal(
          `🚨 [SPAWN ERROR] 无法启动 Python 引擎: ${err.message}`,
        );
        if (mainWindow)
          mainWindow.webContents.send("filling-state-update", "engine-stopped");
      });

      fillingProcess.stdout.on("data", (data) => {
        const chunk = data.toString();
        console.log(`[PY STDOUT] ${chunk}`);
        addLogToTerminal(chunk);

        // v7.19: 标准频道对齐
        if (chunk.includes("[READY_FOR_F9]")) {
          console.log("🔔 [IPC] 发送 ARMED 信号至前端");
          if (mainWindow)
            mainWindow.webContents.send("filling-state-update", "engine-armed");
        }

        if (chunk.includes("[FILLING_START]")) {
          console.log("🔥 [IPC] 发送 FILLING 信号至前端");
          if (mainWindow)
            mainWindow.webContents.send(
              "filling-state-update",
              "engine-filling",
            );

          // v7.20: 【上帝之手】在触发填报时，主进程接管 F9 物理强杀权
          globalShortcut.register("F9", () => {
            console.log(
              "⚔️ [HARD KILL] 主进程拦截到 F9，正在物理打断 Python 引擎...",
            );
            if (fillingProcess && fillingProcess.pid) {
              try {
                // Windows 平台使用 taskkill 确保强力杀除子进程树
                execSync(`taskkill /F /T /PID ${fillingProcess.pid}`);
              } catch (e) {
                // 如果进程已经自己结束了，忽略错误
              }
              fillingProcess = null;
            }
            // 强杀后注销快捷键，并通知前端重置为 IDLE
            globalShortcut.unregister("F9");
            if (mainWindow)
              mainWindow.webContents.send(
                "filling-state-update",
                "engine-stopped",
              );
          });
        }

        if (chunk.includes("[SINGLE_DONE]")) {
          console.log("🎉 [IPC] 发送 SINGLE_DONE 信号至前端");
          if (mainWindow)
            mainWindow.webContents.send(
              "filling-state-update",
              "single-patient-done",
            );
        }

        if (chunk.includes("[ABORT]")) {
          console.log("🛑 [IPC] 拦截到中止信号");
          if (mainWindow)
            mainWindow.webContents.send(
              "filling-state-update",
              "engine-stopped",
            );
        }
      });

      fillingProcess.stderr.on("data", (data) => {
        console.error(`[PY ERR] ${data}`);
        addLogToTerminal(`[PY ERR] ${data}`);
      });

      // v7.18: 引用当前进程实例用于闭包判定
      const currentProc = fillingProcess;

      fillingProcess.on("close", (code) => {
        console.log(`[EXIT] 引擎退出: ${code}`);
        // v7.20: 引擎由于任何原因退出（完成/强杀/崩溃），立即交还 F9 键
        globalShortcut.unregister("F9");

        if (fillingProcess === currentProc) {
          fillingProcess = null;
          if (mainWindow)
            mainWindow.webContents.send(
              "filling-state-update",
              "engine-stopped",
            );
        }
      });

      resolve({ success: true, message: "正在唤醒..." });
    }
  });
});
