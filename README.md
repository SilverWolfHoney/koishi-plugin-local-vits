# koishi-plugin-local-vits

[![npm](https://img.shields.io/npm/v/koishi-plugin-local-vits.svg)](https://www.npmjs.com/package/koishi-plugin-local-vits)
[![npm downloads](https://img.shields.io/npm/dm/koishi-plugin-local-vits.svg)](https://www.npmjs.com/package/koishi-plugin-local-vits)
[![license](https://img.shields.io/npm/l/koishi-plugin-local-vits.svg)](https://github.com/SilverWolfHoney/koishi-plugin-local-vits/blob/main/LICENSE)

> 本仓库是 [`koishi-plugin-luna-vits@0.5.3`](https://github.com/ChatLunaLab/luna-vits) 的**本地化改版**，由 SilverWolfHoney 维护，与上游项目无隶属关系。
> 原项目版权归 dingyi（Copyright © 2024-present dingyi），修改部分版权归 SilverWolfHoney（Copyright © 2026-present），按 MIT License 分发。

## 改版说明

| 项 | 上游 `koishi-plugin-luna-vits` | 本仓库 `koishi-plugin-local-vits` |
|---|---|---|
| 包名 | `koishi-plugin-luna-vits` | `koishi-plugin-local-vits` |
| 插件名（`koishi.yml` key） | `luna-vits` | `local-vits` |
| 数据目录 | `data/luna-vits` | `data/local-vits` |
| TTS 失败后的行为 | 重试 3 次、间隔 5 秒，约 10 秒后才降级文字 | **永久熔断**，立即降级文字，不再请求 TTS |
| 手动控制 | 无 | 新增 `tts` 指令（状态 / 开 / 关） |
| HTTP 超时 | 无 | `timeout: 10000`，防隧道半开挂起 |

适合场景：**自建 TTS（如 GPT-SoVITS）经常开关、或反向 SSH 隧道不稳定**，
希望 TTS 不可用时 bot 立刻用文字回复，而不是卡 10~30 秒。

## 为什么改

上游在语音渲染失败时会 `runWithRetry(predict, 3, 5000)`，即尝试 3 次、每次间隔 5 秒。
TTS 关闭或隧道断开时，每段语音要空转约 10 秒才抛错并降级；一次回复 2 段语音就是 20 秒，
群里表现为 bot「卡住 / 不回复 / 不降级」。

本版改成：

1. 首次失败立即抛错，不再重试；
2. 失败后进入**永久熔断**，之后所有语音调用直接快速失败，不再发起任何 HTTP 请求；
3. 立刻降级为文字发送；
4. TTS 恢复后，手动发 `tts 开` 解除熔断（不会自动恢复，避免反复空转）。

## 指令

| 指令 | 说明 |
|---|---|
| `tts` | 查看状态：正常 / 熔断中 / 已手动关闭，以及上次失败时间与原因 |
| `tts 开` / `tts on` | 重新开启语音并清除熔断与失败记录 |
| `tts 关` / `tts off` | 临时关闭语音，只发文字（进程内生效，重启恢复） |

> 指令权限 `authority: 3`（机器人管理员/主人可用），可在 Koishi 控制台「指令 → permissions」调整。

原有 `lunavits <文本>` 测试指令保持不变。

## 安装

### 从插件市场安装（推荐）

在 Koishi 控制台打开「插件市场」，搜索 `local-vits`（或包名 `koishi-plugin-local-vits`）安装，然后在「插件配置」里启用。

### 使用包管理器安装

```bash
cd /path/to/koishi-app
npm install koishi-plugin-local-vits
```

安装后重启 Koishi（或让控制台热重载），在插件配置中启用 `local-vits`。

### 从源码安装

把本仓库目录放到 Koishi 的 `node_modules/koishi-plugin-local-vits/`，然后在 `koishi.yml` 里启用：

```yaml
local-vits:xxx: {}
```

### 打补丁（仅给已有安装用）

`patch/` 目录是增量补丁脚本，用于在已安装的旧版本上应用本版改动：

```bash
cd <koishi-root>
node patch/patch.mjs node_modules/koishi-plugin-local-vits/lib/index.js
node --check node_modules/koishi-plugin-local-vits/lib/index.js
# 重启 Koishi
```

## 开发与构建

本仓库包含完整 TypeScript 源码（`src/`，控制台前端在 `client/`），构建产物 `lib/`、`dist/` 已提交，可直接发布。

```bash
npm install --legacy-peer-deps
npm run build     # yakumo build: tsc 类型声明 + esbuild 打包 + vite 前端
```

- `src/`：插件主逻辑（`service.ts` 熔断、`index.ts` 指令、`constants.ts` 数据服务）
- `client/`：控制台页面
- `lib/`：构建产物（`index.js` + 类型声明）
- `dist/`：控制台前端产物

## 从 luna-vits 迁移

数据目录已改为 `data/local-vits`。如果之前用过 luna-vits：

```bash
cp -a <koishi-root>/data/luna-vits <koishi-root>/data/local-vits
```

## 回滚

用上游 `koishi-plugin-luna-vits@0.5.3` 的 `lib/index.js` 覆盖，或重新安装原插件。

## 许可证与致谢

本项目是 [`koishi-plugin-luna-vits`](https://github.com/ChatLunaLab/luna-vits) 的修改版，按 **MIT License** 分发。

- 原项目版权：Copyright © 2024-present dingyi
- 修改部分版权：Copyright © 2026-present SilverWolfHoney
- 完整许可证见仓库根目录 [LICENSE](./LICENSE)

感谢 [better-dxl-bert-vits](https://github.com/TR0MXI/koishi-plugin-better-dxl-bert-vits)
为本项目带来的启发，感谢 [gradio](https://github.com/gradio-app/gradio/blob/main/client/js/README.md)
提供 gradio API 接入参考。
