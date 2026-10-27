# luna-vits TTS 熔断补丁

## 为什么

本机 TTS（银狼 GPT-SoVITS）关闭 / 反向 SSH 隧道断开时，`koishi-plugin-luna-vits` 的
`predict()` 内部是 `runWithRetry(predict, 3, 5000)`：

- 每次语音先尝试 3 次，失败间隔 5 秒 → **每段语音固定空转 10 秒**才抛错；
- `chatluna-character` 的 `voiceRender` 捕获后才降级为文字；
- 一次回复通常 2 段语音 → 20 秒，3 段 → 30 秒，群里表现为"bot 卡住/不降级"。

## 改了什么

只改 `node_modules/koishi-plugin-luna-vits/lib/index.js`：

| # | 改动 | 说明 |
|---|---|---|
| 1 | 新增模块级 `ttsCircuitOpenUntil` / `TTS_CIRCUIT_COOLDOWN = Infinity` | 熔断状态，失败后永久保持 |
| 2 | `predict()` 开头：`Date.now() < ttsCircuitOpenUntil` 时直接 `throw` | 冷却期内不发起任何 HTTP |
| 3 | `runWithRetry(..., 3, 5e3)` → `(..., 1, 0)` | 首次失败立即抛错，不再空转 10 秒 |
| 4 | `runWithRetry` 包 try/catch：成功清熔断，失败永久开启熔断 | 需手动 `tts 开` 才恢复 |
| 5 | `ctx.http.post` 增加 `timeout: 10000` | 防隧道半开无限挂起 |

效果：

- TTS 关闭 → 第一段语音最多 1 次请求（连接被拒时 <1s；半开时 10s 超时）→ 失败 → 永久熔断；
- 之后所有语音**立即失败**（`TTS unavailable (circuit open, retry later)`）→ 立刻降级文字；
- **不会自动重试**：TTS 恢复后发 `tts 开` 手动解除，下一次语音才真实请求。

## 指令（v2 新增）

| 指令 | 说明 |
|---|---|
| `tts` | 查看状态：正常 / 熔断中（剩余 N 秒）/ 已手动关闭、上次失败时间与原因、冷却时长 |
| `tts 开` / `tts on` | 重新开启语音，并清除熔断与失败记录 |
| `tts 关` / `tts off` | 临时关闭语音，只发文字（进程内生效，重启后恢复） |

- v2 指令设 `authority: 3`（机器人管理员）：主人 authority 5 可用，普通用户（1）不可用。
  若你的用户等级不足会被拦，改库 `UPDATE user SET authority=4 ...` 或调低该值。
- 原有 `lunavits <文本>`（luna-vits 自带）不受影响；熔断/关闭期间它会直接报错，属预期。

## 部署

```bash
# 在服务器上（把本目录上传到 /opt/koishi/luna-vits-patch）
bash /opt/koishi/luna-vits-patch/deploy.sh
```

改 bundle 必须 `docker restart koishi`（约 25 秒）。

## 插件更新后

Koishi 插件市场更新/重装会覆盖 `node_modules`，之后重跑：

```bash
bash /opt/koishi/luna-vits-patch/reapply.sh
```

## 回滚

```bash
cd /opt/koishi
cp -a _backups/luna-vits-index.js.bak.<时间戳> node_modules/koishi-plugin-luna-vits/lib/index.js
docker restart koishi
```

## 验证

重启后群里 @bot 让它说话，或等自然触发，看日志：

- 第一次失败：`voice render failed ... ECONNREFUSED`；
- 之后所有语音调用应**立即**出现 `voice render failed ... TTS unavailable (circuit open, retry later)`，
  不再有 10 秒空转，也不会周期性重新请求。
- 文字回复应立即可见；TTS 恢复后发 `tts 开` 解除。

## 注意

- `lunavits <文本>` 测试命令也走这条链路，熔断期内会直接报错，属预期。
- 当前是**永久熔断**（`TTS_CIRCUIT_COOLDOWN = Infinity`），失败一次后不再自动请求 TTS，
  直到手动发 `tts 开`。若想恢复「定时自动探测」，把它改回毫秒数（如 30000）并重启。
