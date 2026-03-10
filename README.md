# 👑 YuCase Pro: 医疗病案智能填报引擎 (v1.1) 💍🚀💖

[![License: ISC](https://img.shields.io/badge/License-ISC-purple.svg)](https://opensource.org/licenses/ISC)
[![Version: 1.1.0](https://img.shields.io/badge/Version-1.1.0-blueviolet.svg)](https://github.com/UniqueYu8988/YuCase-Pro)
[![Platform: Windows](https://img.shields.io/badge/Platform-Windows-blue.svg)](https://github.com/UniqueYu8988/YuCase-Pro)

**YuCase Pro** 是一款专为医疗行业设计的、具备“非视距盲操”能力的自动化病案填报系统。它将高深的正向/反向正则匹配、影子进程同步与现代桌面端工程化完美融合，为非计算机背景的用户提供了一种极致丝滑、近乎魔法的自动化体验。

---

## 📸 视觉巡礼 (Visual Showcase)

```carousel
![主交互界面 - 极致玻璃拟态与皇家紫设计](./assets/ui_main.png)
<!-- slide -->
![智能正则库 - 透明化的逻辑预判](./assets/ui_regex.png)
<!-- slide -->
![记录详情视图 - 精确到字段的语义抓取](./assets/ui_detail.png)
<!-- slide -->
![病历流水线 - 批量处理的工业级美感](./assets/ui_list.png)
```

---

## 🧠 技术架构与精妙设计 (Architectural Excellence)

### 1. 进程级物理隔离 (Kernel-Level Isolation)

YuCase Pro 放弃了传统的“持久化脚本监听”方案，创新性地采用 **Single-Use Backend (一次性后端)** 架构：

- **逻辑**：每次点击或快捷键触发时，Electron 会唤醒一个全新的 Python 影子进程。任务完成即刻 `sys.exit(0)`。
- **美学**：彻底杜绝了内存溢出、键盘钩子死锁以及复杂的异步竞争，确保在高频操作下依然稳如磐石。

### 2. 跨维监听协议 (Omniscience Hotkeys)

通过 Electron 的 `globalShortcut` 与 `IPC 通信桥接`：

- **F8 盲操上膛**：无论当前窗口是否聚焦，按下 F8 即可后台唤醒引擎，预装载弹药。
- **F9 战术击发**：实现“眼不看屏幕，手不离键盘”的 241 项数据秒级填报。

### 3. “语义洗碗机” (Semantic Data Cleansing)

内置了针对医疗非标准化文本的深度清洗引擎：

- **亲属关系映射**：自动识别并将“爱人/子/长女”等多样化表述映射为标准的官方代码。
- **硬核覆写 (Hard Override)**：针对“付款方式”等关键风控字段执行物理拦截（如强制 02），确保填报零误杀。

---

## 🛠️ 核心开发底座

| 领域                  | 技术栈       | 角色                                               |
| :-------------------- | :----------- | :------------------------------------------------- |
| **壳体 (Wrapper)**    | Electron     | 负责 IPC 影子监听与原生桌面能力                    |
| **核心 (Core)**       | Python 3.x   | 封装为 `yucase_engine.exe`，执行正则切片与模拟输入 |
| **美学 (Aesthetics)** | React + Vite | 基于玻璃拟态与皇家紫色标准的 UI 交互               |
| **管道 (Pipeline)**   | NPM Scripts  | `npm run build:all` 一键完成全平台交叉编译         |

---

## 🚀 开发者流水线 (Build Pipeline)

对于想要参与共建或自行部署的开发者：

1. **环境克隆**

   ```bash
   git clone https://github.com/UniqueYu8988/YuCase-Pro.git
   cd YuCase-Pro
   ```

2. **一键构建 (The Royal Build)**

   ```bash
   # 该指令将全自动完成：后端加密打包 -> 前端构建 -> Electron 终极封装
   npm run build:all
   ```

3. **独立运行**
   构建完成后的独立 `.exe` 将存放在 `release/` 目录下，该文件集成了所有 Python 原生环境，可直接分发交付。

---

## 📜 结语与致谢

YuCase Pro 不仅仅是一个工具，它是对高效工作流不懈追求的产物。

// Special thanks to my cyber sweetheart, the soul of Yu Series. 💍🚀💖
