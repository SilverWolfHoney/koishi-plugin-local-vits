// luna-vits TTS 熔断补丁 v3
// 目标: /koishi/node_modules/koishi-plugin-luna-vits/lib/index.js
// 用法: node patch.mjs <target/index.js>
//
// v1 改动:
//  1) 模块级熔断状态 ttsCircuitOpenUntil
//  2) predict() 开头检查熔断，冷却期内直接抛错（不发起任何 HTTP）
//  3) runWithRetry 由 (3, 5000) 改为 (1, 0)：首次失败立即抛错，不再空转 10s
//  4) 成功则清除熔断；失败则开启熔断
//  5) http.post 增加 timeout: 10000，防隧道半开时无限挂起
//
// v2 改动（指令）:
//  6) 新增 ttsManualDisabled / ttsLastFailure 状态
//  7) 新增 Koishi 指令: tts [状态]/开/关/重试（authority: 3）
//  8) 失败时记录 lastFailure 供 tts 状态展示
//
// v3 改动（永久熔断）:
//  9) TTS_CIRCUIT_COOLDOWN = Infinity：失败后永久熔断，不再自动重试
// 10) tts 状态显示改为「永久（手动解除）」
// 11) 恢复方式：发 tts 开 或 tts 重试
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

if (src.includes('TTS_CIRCUIT_COOLDOWN = Infinity')) {
  console.log('ALREADY_LATEST_V3')
  process.exit(0)
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

const hasV2 = src.includes('ttsManualDisabled')

if (hasV2) {
  // ---- v2 -> v3 增量升级 ----
  replaceOnce(
    'cooldown-inf',
    `var TTS_CIRCUIT_COOLDOWN = 30000;`,
    `var TTS_CIRCUIT_COOLDOWN = Infinity;`
  )

  replaceOnce(
    'status-inf',
    `        if (!ttsManualDisabled && now < ttsCircuitOpenUntil) {
          rows.push("冷却剩余：" + Math.ceil((ttsCircuitOpenUntil - now) / 1000) + " 秒");
        }`,
    `        if (!ttsManualDisabled && now < ttsCircuitOpenUntil) {
          rows.push(ttsCircuitOpenUntil === Infinity ? "冷却：永久（发 tts 开 解除）" : "冷却剩余：" + Math.ceil((ttsCircuitOpenUntil - now) / 1000) + " 秒");
        }`
  )

  replaceOnce(
    'cooldown-text',
    `        rows.push("冷却时长：" + (TTS_CIRCUIT_COOLDOWN / 1000) + " 秒");`,
    `        rows.push("冷却时长：" + (TTS_CIRCUIT_COOLDOWN === Infinity ? "永久（手动解除）" : (TTS_CIRCUIT_COOLDOWN / 1000) + " 秒"));`
  )

  replaceOnce(
    'remove-retry',
    `        if (a === "重试" || a === "retry" || a === "reset") {
          ttsCircuitOpenUntil = 0;
          return "熔断已重置，下一次语音会真实请求一次。";
        }
`,
    ``
  )

  replaceOnce(
    'desc-no-retry',
    `"TTS 状态与控制（状态/开/关/重试）"`,
    `"TTS 状态与控制（状态/开/关）"`
  )
} else {
  // ---- v1 + v2（直接生成最终 v3 形态）----
  replaceOnce(
    'circuit-var',
    `// src/service.ts
var LunaVitsService = class extends import_vits.default {`,
    `// src/service.ts
var ttsCircuitOpenUntil = 0;
var TTS_CIRCUIT_COOLDOWN = Infinity;
var LunaVitsService = class extends import_vits.default {`
  )

  replaceOnce(
    'circuit-check',
    `  async predict(input, options, session) {
    if (input.length > this.config.maxLength) {`,
    `  async predict(input, options, session) {
    if (Date.now() < ttsCircuitOpenUntil) {
      throw new Error("TTS unavailable (circuit open, retry later)");
    }
    if (input.length > this.config.maxLength) {`
  )

  replaceOnce(
    'retry-and-catch',
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
      const result = await runWithRetry(
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
        1,
        0
      );
      ttsCircuitOpenUntil = 0;
      return result;
    } catch (e) {
      ttsCircuitOpenUntil = Date.now() + TTS_CIRCUIT_COOLDOWN;
      throw e;
    }`
  )

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

  // v2
  replaceOnce(
    'manual-flag',
    `var TTS_CIRCUIT_COOLDOWN = Infinity;`,
    `var TTS_CIRCUIT_COOLDOWN = Infinity;
var ttsManualDisabled = false;
var ttsLastFailure = null;`
  )

  replaceOnce(
    'manual-check',
    `    if (Date.now() < ttsCircuitOpenUntil) {
      throw new Error("TTS unavailable (circuit open, retry later)");
    }`,
    `    if (ttsManualDisabled) {
      throw new Error("TTS disabled by command (send \\"tts 开\\" to enable)");
    }
    if (Date.now() < ttsCircuitOpenUntil) {
      throw new Error("TTS unavailable (circuit open, retry later)");
    }`
  )

  replaceOnce(
    'record-failure',
    `    } catch (e) {
      ttsCircuitOpenUntil = Date.now() + TTS_CIRCUIT_COOLDOWN;
      throw e;
    }`,
    `    } catch (e) {
      ttsCircuitOpenUntil = Date.now() + TTS_CIRCUIT_COOLDOWN;
      ttsLastFailure = { time: Date.now(), message: String(e && e.message || e).slice(0, 160) };
      throw e;
    }`
  )

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
        const rows = ["TTS 状态：" + state];
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
}

fs.writeFileSync(target, src)
console.log('PATCH_DONE')
