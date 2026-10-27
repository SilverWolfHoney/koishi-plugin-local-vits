// luna-vits TTS 熔断补丁
// 目标: <koishi-root>/node_modules/koishi-plugin-luna-vits/lib/index.js
// 用法: node patch.mjs <target/index.js>
//
//
//  - 模块级熔断状态 ttsCircuitOpenUntil / TTS_CIRCUIT_COOLDOWN = Infinity（永久熔断）
//  - predict() 开头检查熔断（手动关闭/熔断中直接抛错，不发起 HTTP）
//  - 彻底移除 runWithRetry，直接调用 adapter.predict，首次失败立即抛错
//  - http.post 增加 timeout: 10000
//  - 新增 Koishi 指令 tts [状态]/开/关（authority: 3）
//  - 失败记录 ttsLastFailure 供状态展示
import fs from 'node:fs'

const target = process.argv[2]
if (!target) {
  console.error('usage: node patch.mjs <path/to/luna-vits/lib/index.js>')
  process.exit(1)
}

let src
try {
  src = fs.readFileSync(target, 'utf8')
} catch (e) {
  console.error(`[FAIL] cannot read ${target}: ${e.message}`)
  process.exit(1)
}

// 幂等：已经是最新形态
if (src.includes('TTS_CIRCUIT_COOLDOWN = Infinity') && !src.includes('await runWithRetry(')) {
  console.log('ALREADY_LATEST')
  process.exit(0)
}

// 旧版补丁不可增量升级，要求先恢复原版
if (src.includes('ttsCircuitOpenUntil')) {
  console.error('ALREADY_PATCHED_OLD: 请先恢复原版 index.js（重装插件或从备份覆盖），再运行本脚本')
  process.exit(3)
}

function replaceOnce(name, from, to) {
  const n = src.split(from).length - 1
  if (n !== 1) {
    console.error(`[FAIL] ${name}: expected 1 occurrence, got ${n}`)
    process.exit(2)
  }
  src = src.replace(from, to)
  console.log(`[OK] ${name}`)
}

const RETRY_FN = `async function runWithRetry(func, retry, interval) {
  while (retry > 0) {
    try {
      return await func();
    } catch (error) {
      if (--retry === 0) throw error;
      await new Promise((resolve2) => setTimeout(resolve2, interval));
    }
  }
  throw new Error("Retry count exceeded");
}
__name(runWithRetry, "runWithRetry");
`

// 1. 熔断状态
replaceOnce(
  'circuit-var',
  `// src/service.ts
var LunaVitsService = class extends import_vits.default {`,
  `// src/service.ts
var ttsCircuitOpenUntil = 0;
var TTS_CIRCUIT_COOLDOWN = Infinity;
var ttsManualDisabled = false;
var ttsLastFailure = null;
var LunaVitsService = class extends import_vits.default {`
)

// 2. predict 开头检查（手动关闭 + 熔断）
replaceOnce(
  'circuit-check',
  `  async predict(input, options, session) {
    if (input.length > this.config.maxLength) {`,
  `  async predict(input, options, session) {
    if (ttsManualDisabled) {
      throw new Error("TTS disabled by command (send \\"tts 开\\" to enable)");
    }
    if (Date.now() < ttsCircuitOpenUntil) {
      throw new Error("TTS unavailable (circuit open, retry later)");
    }
    if (input.length > this.config.maxLength) {`
)

// 3. 移除 runWithRetry：调用改为直接 predict，并记录失败/清熔断
replaceOnce(
  'direct-call',
  `    return runWithRetry(
      async () => this._adapters[currentConfig[0].type].predict(
        input,
        currentConfig[0],
        Object.assign(
          {
            language: lang
          },
          options,
          {
            speaker: currentConfig[1]
          }
        ),
        session
      ),
      3,
      5e3
    );`,
  `    try {
      const result = await this._adapters[currentConfig[0].type].predict(
        input,
        currentConfig[0],
        Object.assign(
          {
            language: lang
          },
          options,
          {
            speaker: currentConfig[1]
          }
        ),
        session
      );
      ttsCircuitOpenUntil = 0;
      return result;
    } catch (e) {
      ttsCircuitOpenUntil = Date.now() + TTS_CIRCUIT_COOLDOWN;
      ttsLastFailure = { time: Date.now(), message: String(e && e.message || e).slice(0, 160) };
      throw e;
    }`
)

// 4. 删除 runWithRetry 函数定义
replaceOnce('remove-retry-fn', RETRY_FN, '')

// 5. HTTP 超时
replaceOnce(
  'http-timeout',
  `    const response = await this.ctx.http.post(url, formData, {
      headers,
      responseType: "arraybuffer"
    });`,
  `    const response = await this.ctx.http.post(url, formData, {
      headers,
      responseType: "arraybuffer",
      timeout: 10000
    });`
)

// 6. tts 指令
replaceOnce(
  'tts-command',
  `      ctx2.command("lunavits <text:text>", "lunavits 语音合成")`,
  `      ctx2.command("tts [action:string]", "TTS 状态与控制（状态/开/关）", { authority: 3 }).action(({ session }, action) => {
        const a = String(action ?? "").trim().toLowerCase();
        if (a === "开" || a === "on") {
          ttsManualDisabled = false;
          ttsCircuitOpenUntil = 0;
          ttsLastFailure = null;
          return "语音已开启，熔断已清除。";
        }
        if (a === "关" || a === "off") {
          ttsManualDisabled = true;
          return "语音已关闭：之后只发文字（发 tts 开 恢复）。";
        }
        const now = Date.now();
        const state = ttsManualDisabled ? "已手动关闭" : now < ttsCircuitOpenUntil ? "熔断中" : "正常";
        const rows = ["#TTS 状态：" + state];
        if (!ttsManualDisabled && now < ttsCircuitOpenUntil) {
          rows.push(ttsCircuitOpenUntil === Infinity ? "冷却：永久（发 tts 开 解除）" : "冷却剩余：" + Math.ceil((ttsCircuitOpenUntil - now) / 1000) + " 秒");
        }
        if (ttsLastFailure) {
          rows.push("上次失败：" + new Date(ttsLastFailure.time).toLocaleString("zh-CN") + " — " + ttsLastFailure.message);
        }
        rows.push("冷却时长：" + (TTS_CIRCUIT_COOLDOWN === Infinity ? "永久（手动解除）" : (TTS_CIRCUIT_COOLDOWN / 1000) + " 秒"));
        return rows.join("\\n");
      });
      ctx2.command("lunavits <text:text>", "lunavits 语音合成")`
)

fs.writeFileSync(target, src)
console.log('PATCH_DONE')
