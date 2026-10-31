var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });
var __export = (target, all) => {
  for (var name2 in all)
    __defProp(target, name2, { get: all[name2], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/index.ts
var index_exports = {};
__export(index_exports, {
  Config: () => Config,
  apply: () => apply,
  inject: () => inject,
  name: () => name
});
module.exports = __toCommonJS(index_exports);

// src/service.ts
var import_koishi = require("koishi");
var import_vits = __toESM(require("@initencounter/vits"));
var TTS_CIRCUIT_COOLDOWN = Infinity;
var ttsCircuitOpenUntil = 0;
var ttsManualDisabled = false;
var ttsLastFailure = null;
function getTtsStatus() {
  return {
    manualDisabled: ttsManualDisabled,
    circuitOpenUntil: ttsCircuitOpenUntil,
    lastFailure: ttsLastFailure,
    cooldown: TTS_CIRCUIT_COOLDOWN
  };
}
__name(getTtsStatus, "getTtsStatus");
function resetTtsCircuit() {
  ttsManualDisabled = false;
  ttsCircuitOpenUntil = 0;
  ttsLastFailure = null;
}
__name(resetTtsCircuit, "resetTtsCircuit");
function disableTts() {
  ttsManualDisabled = true;
}
__name(disableTts, "disableTts");
var LunaVitsService = class extends import_vits.default {
  constructor(ctx, config) {
    super(ctx);
    this.ctx = ctx;
    this.config = config;
  }
  static {
    __name(this, "LunaVitsService");
  }
  _adapters = {};
  addAdapter(adapter) {
    this._adapters[adapter.type] = adapter;
  }
  async predict(input, options, session) {
    if (ttsManualDisabled) {
      throw new Error(
        'TTS disabled by command (send "tts 开" to enable)'
      );
    }
    if (Date.now() < ttsCircuitOpenUntil) {
      throw new Error("TTS unavailable (circuit open, retry later)");
    }
    if (input.length > this.config.maxLength) {
      return import_koishi.h.text("输入的字符串长度不能超过 " + this.config.maxLength);
    }
    let lang = options.speaker?.split("_")?.pop();
    if (!lang) {
      lang = "ZH";
    }
    const speakerKeyMap = await this.ctx.console.services.luna_vits_data.getSpeakerKeyMap();
    if (this.config.autoTranslate) {
      this.ctx.logger.debug(
        "input sentence (origin) %s, lang: %s",
        input,
        lang
      );
      input = await this.checkLanguage(input, lang);
    }
    this.ctx.logger.debug("input sentence %s", input);
    const currentConfig = speakerKeyMap[options.speaker];
    if (!currentConfig) {
      throw new Error("Speaker not found");
    }
    try {
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
    } catch (error) {
      ttsCircuitOpenUntil = Date.now() + TTS_CIRCUIT_COOLDOWN;
      ttsLastFailure = {
        time: Date.now(),
        message: String(
          error?.message ?? error
        ).slice(0, 160)
      };
      throw error;
    }
  }
  async checkLanguage(input, lang) {
    try {
      const franc = await importFranc();
      lang = lang.toLocaleLowerCase();
      const sourceLanguage = francLanguageMapping[franc.franc(input)] ?? lang;
      if (sourceLanguage === lang || !this.config.autoTranslate) {
        return input;
      }
      return this.ctx.translator.translate({
        input,
        source: sourceLanguage.toLocaleLowerCase(),
        target: lang
      });
    } catch (error) {
      return input;
    }
  }
  async say(options) {
    const speakerKeyIdMap = await this.ctx.console.services.luna_vits_data.getSpeakerKeyIdMap();
    return this.predict(
      options.input,
      {
        speaker: speakerKeyIdMap[options.speaker_id]?.[1] ?? this.config.defaultSpeaker
      },
      options["session"]
    );
  }
  getSpeakerList(config) {
    const adapter = this._adapters[config.type];
    if (!adapter) {
      return [];
    }
    return adapter.getSpeakerList(config);
  }
  static inject = {
    console: {
      required: true
    },
    gradio: {
      required: false
    }
  };
};
var francLanguageMapping = {
  jpn: "jp",
  zho: "zh",
  eng: "en",
  spa: "es",
  fra: "fr",
  deu: "de",
  ita: "it",
  por: "pt",
  rus: "ru",
  kor: "ko",
  ara: "ar",
  heb: "he",
  hin: "hi",
  tur: "tr",
  vie: "vi",
  cmn: "zh",
  ell: "el"
};
async function importFranc() {
  try {
    return await import("franc-min");
  } catch (e) {
    throw new Error(
      "Please install franc-min as a dependency with, e.g. `npm install -S franc-min`"
    );
  }
}
__name(importFranc, "importFranc");

// src/adapters/base.ts
var VitsAdapter = class {
  constructor(ctx) {
    this.ctx = ctx;
  }
  static {
    __name(this, "VitsAdapter");
  }
  async getSpeakerList(config) {
    return config.speakers;
  }
};

// src/adapters/gpt_sovits2_api.ts
var import_koishi2 = require("koishi");

// src/utils.ts
function removeProperty(value, properties) {
  const propertySet = new Set(properties);
  const result = {};
  for (const [key, val] of Object.entries(value)) {
    if (!propertySet.has(key)) {
      result[key] = val;
    }
  }
  return result;
}
__name(removeProperty, "removeProperty");
function selectProperty(value, properties) {
  const result = {};
  for (const property of properties) {
    if (property in value) {
      result[property] = value[property];
    }
  }
  return result;
}
__name(selectProperty, "selectProperty");
var PromiseLock = class {
  static {
    __name(this, "PromiseLock");
  }
  _lock = false;
  constructor(lock = false) {
    this._lock = lock;
  }
  async lock() {
    if (this._lock) {
      while (this._lock) {
        await new Promise((resolve2) => {
          setTimeout(() => {
            resolve2(null);
          }, 100);
        });
      }
    }
    this._lock = true;
  }
  async runLocked(callback) {
    await this.lock();
    const result = await callback();
    this.unlock();
    return result;
  }
  unlock() {
    this._lock = false;
  }
};
var TTLCache = class {
  constructor(ctx, _ttlTime = 1e3 * 60 * 20) {
    this._ttlTime = _ttlTime;
    ctx.setInterval(() => {
      const now = Date.now();
      for (const [key, value] of this._cache.entries()) {
        if (value.expire < now) {
          this._cache.delete(key);
        }
      }
    }, _ttlTime);
  }
  static {
    __name(this, "TTLCache");
  }
  _cache = /* @__PURE__ */ new Map();
  get(key) {
    const item = this._cache.get(key);
    if (item) {
      return item.value;
    }
  }
  set(key, value) {
    const item = {
      value,
      expire: Date.now() + this._ttlTime
    };
    this._cache.set(key, item);
  }
  delete(key) {
    this._cache.delete(key);
  }
  clear() {
    this._cache.clear();
  }
};
function getAudioFileExtension(filePath) {
  switch (filePath) {
    case "wav":
      return "audio/wav";
    case "mp3":
      return "audio/mp3";
    case "flac":
      return "audio/flac";
    case "slik":
      return "audio/slik";
    default:
      return "audio/wav";
  }
}
__name(getAudioFileExtension, "getAudioFileExtension");
function getSpeaker(ctx, speakerKeyMap, speaker) {
  for (const key of [speaker, speaker + "_AUTO", speaker + "_ZH"]) {
    if (speakerKeyMap[key]) {
      return [speakerKeyMap[key], key];
    }
  }
  return [null, null];
}
__name(getSpeaker, "getSpeaker");
function isNumeric(str) {
  return !isNaN(parseFloat(str));
}
__name(isNumeric, "isNumeric");

// src/adapters/gpt_sovits2_api.ts
var GPTSoVITS2Adapter = class extends VitsAdapter {
  static {
    __name(this, "GPTSoVITS2Adapter");
  }
  type = "GPT-SoVITS2";
  _configWeights = {};
  constructor(ctx) {
    super(ctx);
  }
  async predict(input, config, options) {
    const speaker = options.speaker;
    if (speaker.sovits_weights) {
      await this._updateSovitsWeights(config, speaker.sovits_weights);
    }
    if (speaker.gpt_weights) {
      await this._updateGPTWeights(config, speaker.gpt_weights);
    }
    const payload = this._generatePayload(
      input,
      config.config,
      options
    );
    this.ctx.logger.debug("payload, %s", JSON.stringify(payload));
    try {
      const response = await this.ctx.http.post(
        `${config.url}/tts`,
        payload,
        {
          responseType: "arraybuffer",
          headers: Object.assign({}, config.headers ?? {})
        }
      );
      return import_koishi2.h.audio(response, payload.media_type ?? "wav");
    } catch (e) {
      this.ctx.logger.error(e.response);
      return import_koishi2.h.text("语音合成失败");
    }
  }
  async _updateSovitsWeights(config, weights) {
    const configWeight = this._configWeights?.[config.name] ?? {
      sovits_weights: "",
      gpt_weights: ""
    };
    if (configWeight.sovits_weights === weights) {
      return;
    }
    const response = await this.ctx.http.get(
      `${config.url}/set_sovits_weights?weights_path=${weights}`
    );
    if (response.message !== "success") {
      throw new Error(JSON.stringify(response));
    }
    this._configWeights[config.name] = Object.assign(configWeight, {
      sovits_weights: weights
    });
  }
  async _updateGPTWeights(config, weights) {
    const configWeight = this._configWeights?.[config.name] ?? {
      sovits_weights: "",
      gpt_weights: ""
    };
    if (configWeight.gpt_weights === weights) {
      return;
    }
    const response = await this.ctx.http.get(
      `${config.url}/set_gpt_weights?weights_path=${weights}`
    );
    if (response.message !== "success") {
      throw new Error(JSON.stringify(response));
    }
    this._configWeights[config.name] = Object.assign(configWeight, {
      gpt_weights: weights
    });
  }
  _generatePayload(input, config, options) {
    const base = Object.assign(
      {},
      config,
      removeProperty(options.speaker, [
        "name",
        "gpt_weights",
        "sovits_weights"
      ]),
      {
        text: input,
        text_lang: options.language?.toLocaleLowerCase() ?? "zh",
        streaming_mode: false
      }
    );
    if (base["speed"]) {
      base["speed_factor"] = base["speed"];
      delete base["speed"];
    }
    base.prompt_lang = mappingLanguageToGPTSoVits(base.prompt_lang);
    base.text_lang = mappingLanguageToGPTSoVits(base.text_lang);
    return base;
  }
};
function mappingLanguageToGPTSoVits(lang) {
  switch (lang.toLocaleLowerCase()) {
    case "zh":
      return "zh";
    case "en":
      return "en";
    case "jp":
    case "ja":
      return "ja";
    default:
      return lang.toLocaleLowerCase();
  }
}
__name(mappingLanguageToGPTSoVits, "mappingLanguageToGPTSoVits");

// src/adapters/vits_simple_api.ts
var import_koishi3 = require("koishi");
var import_fs = __toESM(require("fs"));
var import_path = __toESM(require("path"));
var VitsSimpleAPIAdapter = class extends VitsAdapter {
  static {
    __name(this, "VitsSimpleAPIAdapter");
  }
  type = "vits-simple-api";
  async predict(input, config, options) {
    const currentSpeaker = options.speaker;
    const [payload, url, headers] = this._generatePayload(
      input,
      config,
      currentSpeaker,
      options
    );
    this.ctx.logger.debug("payload, %s", JSON.stringify(payload));
    const formData = new FormData();
    for (const [key, value] of Object.entries(payload)) {
      if (key === "reference_audio") {
        const filePath = value;
        const file = import_fs.default.readFileSync(filePath);
        const blob = new Blob([new Uint8Array(file)], {
          type: getAudioFileExtension(import_path.default.extname(filePath))
        });
        formData.append(key, blob, import_path.default.basename(filePath));
        continue;
      }
      formData.append(key, value.toString());
    }
    try {
      const response = await this.ctx.http.post(url, formData, {
        headers,
        responseType: "arraybuffer",
        timeout: config.config.timeout ?? 6e4
      });
      return import_koishi3.h.audio(response, payload["format"] ?? "wav");
    } catch (error) {
      if (error?.response?.status === 401) {
        this.ctx.logger.warn(
          "vits-simple-api 要求认证（401）：请在配置里填写 username / password（HTTP Basic Auth），或在 headers 里配置 Authorization"
        );
      }
      throw error;
    }
  }
  /** 构建请求头：合并自定义 headers，并支持 api_key / HTTP Basic Auth */
  _buildHeaders(config) {
    const headers = Object.assign(
      {},
      config.headers ?? {}
    );
    if (config.config.api_key) {
      headers["X-API-KEY"] = config.config.api_key;
    }
    const { username, password } = config.config;
    if (username && password && !headers["Authorization"]) {
      headers["Authorization"] = "Basic " + Buffer.from(`${username}:${password}`).toString("base64");
    }
    return headers;
  }
  _generatePayload(input, config, speaker, options) {
    const payload = [
      {},
      config.url,
      Object.assign({}, config.headers ?? {})
    ];
    if (speaker.type === "VITS") {
      payload[0] = this._generateVitsPayload(input, speaker, options);
      payload[1] = `${config.url}/voice/vits`;
    } else if (speaker.type === "W2V2-VITS") {
      payload[0] = this._generateW2V2VitsPayload(
        input,
        speaker,
        options
      );
      payload[1] = `${config.url}/voice/w2v2-vits`;
    } else if (speaker.type === "BERT-VITS2") {
      payload[0] = this._generateBertVits2Payload(input, speaker, options);
      payload[1] = `${config.url}/voice/bert-vits2`;
    } else if (speaker.type === "GPT-SOVITS") {
      payload[0] = this._generateGPTSoVitsPayload(input, speaker, options);
      payload[1] = `${config.url}/voice/gpt-sovits`;
    }
    payload[2] = this._buildHeaders(config);
    for (const key of ["lang", "prompt_lang"]) {
      if (payload[0][key]) {
        payload[0][key] = mappingLanguageToGPTSoVits(payload[0][key]);
      }
    }
    return payload;
  }
  _generateVitsPayload(input, speaker, options) {
    const payload = {
      text: input,
      id: speaker.id,
      lang: options.language
    };
    const baseConfig = selectProperty(speaker, [
      "length",
      "noise",
      "format",
      "noise_w",
      "segment_size"
    ]);
    const additionalConfig = selectProperty(options, [
      "length",
      "noise",
      "noise_w",
      "segment_size"
    ]);
    return Object.assign({}, baseConfig, additionalConfig, payload);
  }
  _generateW2V2VitsPayload(input, speaker, options) {
    const payload = {
      text: input,
      id: speaker.id,
      lang: options.language
    };
    const baseConfig = selectProperty(speaker, [
      "length",
      "noise",
      "format",
      "noise_w",
      "segment_size",
      "emotion"
    ]);
    const additionalConfig = selectProperty(options, [
      "length",
      "noise",
      "noise_w",
      "segment_size",
      "emotion"
    ]);
    return Object.assign({}, baseConfig, additionalConfig, payload);
  }
  _generateBertVits2Payload(input, speaker, options) {
    const payload = {
      text: input,
      id: speaker.id,
      lang: options.language
    };
    const baseConfig = selectProperty(speaker, [
      "length",
      "noise",
      "noise_w",
      "segment_size",
      "sdp_radio",
      "format",
      "text_prompt"
    ]);
    const additionalConfig = selectProperty(options, [
      "length",
      "noise",
      "noise_w",
      "segment_size",
      "emotion",
      "text_prompt"
    ]);
    return Object.assign({}, baseConfig, additionalConfig, payload);
  }
  _generateGPTSoVitsPayload(input, speaker, options) {
    const payload = {
      text: input,
      id: speaker.id,
      lang: options.language
    };
    const baseConfig = selectProperty(speaker, [
      "segment_size",
      "batch_size",
      "temperature",
      "top_p",
      "speed",
      "top_k",
      "preset",
      "prompt_text",
      "prompt_lang",
      "reference_audio"
    ]);
    const additionalConfig = selectProperty(options, [
      "segment_size",
      "batch_size",
      "temperature",
      "top_p",
      "speed",
      "top_k",
      "preset"
    ]);
    return Object.assign({}, baseConfig, additionalConfig, payload);
  }
  async getSpeakerList(config) {
    const simpleApiConfig = config;
    const baseList = simpleApiConfig.speakers;
    if (!simpleApiConfig.config.auto_pull_speaker) {
      return baseList;
    }
    const additionalList = await this._fetchSpeakerList(simpleApiConfig);
    return baseList.concat(additionalList);
  }
  async _fetchSpeakerList(config) {
    try {
      const result = [];
      const speakerMap = await this.ctx.http.get(
        `${config.url}/voice/speakers`,
        {
          headers: {
            "Content-Type": "application/json",
            ...this._buildHeaders(config)
          },
          timeout: config.config.timeout ?? 6e4
        }
      );
      for (const [key, value] of Object.entries(speakerMap)) {
        if (key === "HUBERT-VITS") {
          continue;
        }
        for (const speaker of value) {
          result.push({
            name: speaker.name,
            id: speaker.id,
            languages: speaker.lang,
            type: key
          });
        }
      }
      return result;
    } catch (error) {
      this.ctx.logger.error("Failed to fetch speaker list:", error);
      return [];
    }
  }
};

// src/adapters/gradio/base.ts
var import_koishi4 = require("koishi");

// src/adapters/gradio/processor/bert_vits.ts
var bert_vits_exports = {};
__export(bert_vits_exports, {
  generatePayload: () => generatePayload,
  getSpeakerList: () => getSpeakerList,
  type: () => type
});
var type = "bert-vits2";
async function getSpeakerList(app, config) {
  const apiInfo = await app.viewApi();
  let fnIndex = config.config.fn_index ?? "tts_fn";
  if (typeof fnIndex === "string" && !fnIndex.startsWith("/")) {
    fnIndex = `/${fnIndex}`;
  }
  let fnInfo = apiInfo.named_endpoints[fnIndex] || apiInfo.unnamed_endpoints[fnIndex];
  if (!fnInfo) {
    const findEndpoint = /* @__PURE__ */ __name((endpoints) => {
      for (const key in endpoints) {
        const endpoint = endpoints[key];
        if (endpoint.parameters.some(
          (p) => p.parameter_name === "speaker" || p.label.includes("选择说话人") || p.label.includes("Speaker")
        ) && !endpoint.parameters.some(
          (p) => p.label.includes("按句切分")
        )) {
          fnInfo = endpoint;
          fnIndex = isNumeric(key) ? parseInt(key) : key;
          return true;
        }
      }
      return false;
    }, "findEndpoint");
    findEndpoint(apiInfo.named_endpoints) || findEndpoint(apiInfo.unnamed_endpoints);
  }
  config.config.fn_index = fnIndex;
  const getComponent = /* @__PURE__ */ __name((name2, labels) => fnInfo.parameters.find(
    (p) => p.parameter_name === name2 || labels.some((label) => p.label.includes(label))
  ), "getComponent");
  const speakerComponent = getComponent("speaker", ["选择说话人", "Speaker"]);
  const languageComponent = getComponent("language", ["选择语言", "Language"]);
  let languageType = languageComponent?.enum;
  if (!languageType) {
    const match = languageComponent?.description?.match(
      /Option from: \[(.*?)\]/
    );
    if (match) {
      languageType = Array.from(
        new Set(
          match[1].match(/'([^']+)'/g)?.map((value) => value.replace(/'/g, "").trim()) || []
        )
      );
    }
  }
  if (languageType) {
    config.config.languages = languageType.filter((value) => !value.includes("mix")).map((value) => value.toLocaleUpperCase());
  }
  if (!speakerComponent) {
    return [];
  }
  let enums = speakerComponent?.enum;
  if (!enums) {
    const match = speakerComponent.description.match(
      /Option from: \[(.*?)\]/
    );
    if (match) {
      enums = Array.from(
        new Set(
          match[1].match(/'([^']+)'/g)?.map((value) => value.replace(/'/g, "").trim()) || []
        )
      );
    }
  }
  return enums?.map(
    (value) => ({
      name: value,
      fn_index: fnIndex
    })
  ) ?? [];
}
__name(getSpeakerList, "getSpeakerList");
async function generatePayload(input, client, config, speaker, options) {
  const payload = {
    text: input,
    language: options.language,
    speaker: speaker.name
  };
  const baseConfig = selectProperty(speaker, [
    "noise",
    "noise_w",
    "sdp_radio",
    "length_scale",
    "length",
    "text_prompt",
    "style_text",
    "style_weight",
    "emotion",
    "prompt_mode",
    "language"
  ]);
  const additionalConfig = selectProperty(options, [
    "noise",
    "noise_w",
    "sdp_radio",
    "length_scale",
    "length",
    "text_prompt",
    "style_text",
    "style_weight",
    "emotion",
    "prompt_mode",
    "language"
  ]);
  const mix = Object.assign(
    {
      sdp_ratio: 0.3,
      noise_scale: 0.4,
      noise_scale_w: 0.8,
      length_scale: 1,
      language: "ZH",
      emotion: "Happy",
      prompt_mode: "Text prompt",
      reference_audio: null,
      style_text: "Hello!!",
      style_weight: 0
    },
    baseConfig,
    additionalConfig,
    payload
  );
  const apiInfo = await client.viewApi();
  const apiData = apiInfo.unnamed_endpoints[speaker.fn_index] ?? apiInfo.named_endpoints[speaker.fn_index];
  return apiData.parameters.map((p) => {
    if (p.parameter_name === "text" || p.label === "输入文本内容" || p.label.toLocaleLowerCase() === "text") {
      return mix.text;
    }
    if (p.parameter_name === "speaker" || p.label === "选择说话人" || p.label === "Speaker") {
      return mix.speaker;
    }
    if (p.parameter_name === "sdp_ratio" || p.label === "SDP Ratio" || p.label.includes("DP混合比")) {
      return mix.sdp_ratio;
    }
    if (p.parameter_name === "noise" || p.label === "Noise" || p.label.includes("感情")) {
      return mix.noise ?? mix.noise_scale;
    }
    if (p.parameter_name === "noise_scale" || p.label === "Noise_W" || p.label.includes("音素长度")) {
      return mix.noise_w ?? mix.noise_scale_w;
    }
    if (p.parameter_name === "length" || p.label === "Length" || p.parameter_name === "length_scale" || p.label.includes("语速") || p.label.includes("生成长度")) {
      return mix.length ?? mix.length_scale;
    }
    if (p.parameter_name === "language" || p.label === "Language" || p.label.includes("选择语言")) {
      return mix.language;
    }
    if (p.parameter_name === "emotion" || p.label === "Emotion") {
      return mix.emotion;
    }
    if (p.parameter_name === "prompt_mode" || p.label === "Prompt Mode") {
      return mix.prompt_mode ?? "Text prompt";
    }
    if (p.parameter_name === "text_prompt" || p.label === "Text prompt") {
      return mix.text_prompt ?? "Happy";
    }
    if (p.label === "辅助文本") {
      return "";
    }
    if (p.parameter_name === "style_text" || p.label === "Style Text") {
      return mix.style_text;
    }
    if (p.parameter_name === "style_weight" || p.label === "Weight") {
      return mix.style_weight;
    }
    if (p.parameter_name === "reference_audio" || p.label === "Audio prompt") {
      return null;
    }
  });
}
__name(generatePayload, "generatePayload");

// src/adapters/gradio/processor/gpt_sovits_1.ts
var gpt_sovits_1_exports = {};
__export(gpt_sovits_1_exports, {
  generatePayload: () => generatePayload2,
  getSpeakerList: () => getSpeakerList2,
  type: () => type2
});
var type2 = "gpt-sovits-xzjosh";
async function getSpeakerList2(app, config) {
  const speakers = config.speakers;
  if (speakers.length === 0) {
    throw new Error(
      "The speakers list is empty. Please specify the speaker manually."
    );
  }
  const apiInfo = await app.viewApi();
  const appConfig = await app.resolveConfig();
  let fnInfo;
  let fnIndex;
  const findEndpoint = /* @__PURE__ */ __name((endpoints, componentType) => {
    for (const [key, value] of Object.entries(endpoints)) {
      if (value.returns.length === 1 && value.returns[0].label.includes("输出的语音") && value.returns[0].component.toLowerCase() === componentType) {
        return {
          fnInfo: value,
          fnIndex: isNumeric(key) ? parseInt(key) : key
        };
      }
    }
  }, "findEndpoint");
  const findComponent = /* @__PURE__ */ __name((fnInfo2, labels) => {
    for (const [key, value] of Object.entries(fnInfo2.parameters)) {
      if (labels.some((label) => value.label.includes(label))) {
        return { componentInfo: value, componentIndex: parseInt(key) };
      }
    }
  }, "findComponent");
  const getAppComponent = /* @__PURE__ */ __name((dependency2, id) => {
    return appConfig.components.find(
      (component) => component.id === dependency2.inputs[id]
    );
  }, "getAppComponent");
  ({ fnInfo, fnIndex } = findEndpoint(apiInfo.named_endpoints, "audio") || findEndpoint(apiInfo.unnamed_endpoints, "audio") || {});
  if (!fnInfo || fnIndex === void 0) {
    throw new Error("No valid endpoint found");
  }
  const pureFnIndex = typeof fnIndex === "string" ? fnIndex.replace(/^\//, "") : "";
  const dependency = appConfig.dependencies.find(
    (dep) => dep.id === fnIndex || dep.id === app.apiMap[pureFnIndex.replace(/^\//, "")] || dep.api_name === pureFnIndex.replace(/^\//, "")
  );
  const referenceAudioInfo = findComponent(fnInfo, ["选择参考音频"]);
  const languageInfo = findComponent(fnInfo, ["合成的语种"]);
  if (!referenceAudioInfo) {
    throw new Error("No reference audio parameter found");
  }
  const referenceAudioComponent = getAppComponent(
    dependency,
    referenceAudioInfo.componentIndex
  );
  const languageComponent = getAppComponent(
    dependency,
    languageInfo.componentIndex
  );
  const referenceAudioChoices = referenceAudioComponent.props["choices"];
  const languageChoices = languageComponent.props["choices"].map(([value]) => value);
  config.config["referenceAudio"] = referenceAudioChoices.map(
    ([, value]) => value
  );
  config.config["languages"] = languageChoices.map((value) => languagesMap[value]).filter((value) => value != null);
  return config.speakers.map((speaker) => ({
    ...speaker,
    fn_index: fnIndex
  }));
}
__name(getSpeakerList2, "getSpeakerList");
async function generatePayload2(input, client, config, speaker, options) {
  const payload = {
    text: input,
    language: options.language,
    prompt_text: randomPromptText(config),
    // ?，不是中文在说
    prompt_lang: "zh",
    text_split_method: "凑五句一切"
  };
  const baseConfig = selectProperty(speaker, [
    "text_split_method",
    "language",
    "prompt_text",
    "prompt_lang"
  ]);
  const additionalConfig = selectProperty(options, [
    "text_split_method",
    "language",
    "prompt_text",
    "prompt_lang"
  ]);
  const mix = Object.assign(
    {
      prompt_text: randomPromptText(config),
      // ?，不是中文在说
      prompt_lang: "zh"
    },
    baseConfig,
    additionalConfig,
    payload
  );
  const apiInfo = await client.viewApi();
  const apiData = apiInfo.unnamed_endpoints[speaker.fn_index] ?? apiInfo.named_endpoints[speaker.fn_index];
  return apiData.parameters.map((p) => {
    if (p.parameter_name === "text" || p.label === "需要合成的文本") {
      return mix.text;
    }
    if (p.label.includes("需要合成的语种")) {
      return languagesKeyMap[mix.language.toLocaleLowerCase()];
    }
    if (p.label.includes("自动切分")) {
      return mix.text_split_method;
    }
    if (p.label.includes("选择参考音频") || p.label.includes("参考音频文本")) {
      return mix.prompt_text;
    }
    if (p.label.includes("参考音频语种") || p.label.includes("参考音频的语种")) {
      return languagesKeyMap[mix.prompt_lang.toLocaleLowerCase()] ?? mix.prompt_lang;
    }
  });
}
__name(generatePayload2, "generatePayload");
function randomPromptText(config) {
  const texts = config.config["referenceAudio"];
  return texts[Math.floor(Math.random() * texts.length)];
}
__name(randomPromptText, "randomPromptText");
var languagesMap = {
  中文: "zh",
  英文: "en",
  日文: "ja",
  韩文: "ko",
  多语种混合: "auto"
};
var languagesKeyMap = Object.fromEntries(
  Object.entries(languagesMap).map(([key, value]) => [value, key])
);

// src/adapters/gradio/processor/gpt_sovits_2_fixed1.ts
var gpt_sovits_2_fixed1_exports = {};
__export(gpt_sovits_2_fixed1_exports, {
  generatePayload: () => generatePayload3,
  getSpeakerList: () => getSpeakerList3,
  type: () => type3
});
var type3 = "gpt-sovits2-v1";
async function getSpeakerList3(app, config) {
  const speakers = config.speakers;
  if (speakers.length === 0) {
    throw new Error(
      "The speakers list is empty. Please specify the speaker manually."
    );
  }
  const apiInfo = await app.viewApi();
  const appConfig = await app.resolveConfig();
  let fnInfo;
  let fnIndex;
  const findEndpoint = /* @__PURE__ */ __name((endpoints, componentType) => {
    for (const [key, value] of Object.entries(endpoints)) {
      if (value.returns.length === 1 && value.returns[0].label.includes("输出的语音") && value.returns[0].component.toLowerCase() === componentType) {
        return {
          fnInfo: value,
          fnIndex: isNumeric(key) ? parseInt(key) : key
        };
      }
    }
  }, "findEndpoint");
  const findComponent = /* @__PURE__ */ __name((fnInfo2, labels) => {
    for (const [key, value] of Object.entries(fnInfo2.parameters)) {
      if (labels.some((label) => value.label.includes(label))) {
        return { componentInfo: value, componentIndex: parseInt(key) };
      }
    }
  }, "findComponent");
  const getAppComponent = /* @__PURE__ */ __name((dependency2, id) => {
    return appConfig.components.find(
      (component) => component.id === dependency2.inputs[id]
    );
  }, "getAppComponent");
  ({ fnInfo, fnIndex } = findEndpoint(apiInfo.named_endpoints, "audio") || findEndpoint(apiInfo.unnamed_endpoints, "audio") || {});
  if (!fnInfo || fnIndex === void 0) {
    throw new Error("No valid endpoint found");
  }
  const pureFnIndex = typeof fnIndex === "string" ? fnIndex.replace(/^\//, "") : "";
  const dependency = appConfig.dependencies.find(
    (dep) => dep.id === fnIndex || dep.id === app.apiMap[pureFnIndex.replace(/^\//, "")] || dep.api_name === pureFnIndex.replace(/^\//, "")
  );
  const referenceAudioInfo = findComponent(fnInfo, ["选择参考音频"]);
  const languageInfo = findComponent(fnInfo, ["合成的语种"]);
  const referenceAudioLanguage = findComponent(fnInfo, ["参考音频的语种"]);
  if (!referenceAudioInfo) {
    throw new Error("No reference audio parameter found");
  }
  const referenceAudioComponent = getAppComponent(
    dependency,
    referenceAudioInfo.componentIndex
  );
  const languageComponent = getAppComponent(
    dependency,
    languageInfo.componentIndex
  );
  const referenceAudioChoices = referenceAudioComponent.props["choices"];
  const languageChoices = languageComponent.props["choices"].map(([value]) => value);
  config.config["referenceAudio"] = referenceAudioInfo.componentInfo.enum ?? referenceAudioChoices.map(([, value]) => value);
  config.config["referenceAudioLanguage"] = languagesMap2[referenceAudioLanguage.componentInfo.parameter_default ?? "中文"];
  config.config["languages"] = languageChoices.map((value) => languagesMap2[value]).filter((value) => value != null);
  return config.speakers.map((speaker) => ({
    ...speaker,
    fn_index: fnIndex
  }));
}
__name(getSpeakerList3, "getSpeakerList");
async function generatePayload3(input, client, config, speaker, options) {
  const payload = {
    text: input,
    language: options.language,
    prompt_text: randomPromptText2(config),
    prompt_lang: config.config["referenceAudioLanguage"],
    text_split_method: "按标点符号切",
    speed: 1,
    temperature: 1,
    top_p: 0.9,
    top_k: 15,
    if_freeze: false
  };
  const baseConfig = selectProperty(speaker, [
    "text_split_method",
    "language",
    "prompt_text",
    "prompt_lang",
    "temperature",
    "top_p",
    "speed",
    "top_k"
  ]);
  const additionalConfig = selectProperty(options, [
    "text_split_method",
    "language",
    "prompt_text",
    "prompt_lang",
    "temperature",
    "top_p",
    "speed",
    "top_k"
  ]);
  const mix = Object.assign(
    {
      prompt_text: randomPromptText2(config),
      prompt_lang: config.config["referenceAudioLanguage"]
    },
    baseConfig,
    additionalConfig,
    payload
  );
  const apiInfo = await client.viewApi();
  const apiData = apiInfo.unnamed_endpoints[speaker.fn_index] ?? apiInfo.named_endpoints[speaker.fn_index];
  return apiData.parameters.map((p) => {
    if (p.parameter_name === "text" || p.label === "需要合成的文本") {
      return mix.text;
    }
    if (p.label.includes("需要合成的语种")) {
      return languagesKeyMap2[mix.language.toLocaleLowerCase()];
    }
    if (p.label.includes("怎么切")) {
      return mix.text_split_method;
    }
    if (p.label.includes("选择参考音频") || p.label.includes("参考音频文本")) {
      return mix.prompt_text;
    }
    if (p.label.includes("参考音频语种") || p.label.includes("参考音频的语种")) {
      return languagesKeyMap2[mix.prompt_lang.toLocaleLowerCase()] ?? mix.prompt_lang;
    }
    if (p.label.includes("top_k")) {
      return mix.top_k;
    }
    if (p.label.includes("top_p")) {
      return mix.top_p;
    }
    if (p.label.includes("temperature")) {
      return mix.temperature;
    }
    if (p.label.includes("语速")) {
      return mix.speed;
    }
    if (p.label.includes("是否直接对上次合成结果调整语速和音色")) {
      return mix.if_freeze;
    }
  });
}
__name(generatePayload3, "generatePayload");
function randomPromptText2(config) {
  const texts = config.config["referenceAudio"];
  return texts[Math.floor(Math.random() * texts.length)];
}
__name(randomPromptText2, "randomPromptText");
var languagesMap2 = {
  中文: "zh",
  英文: "en",
  韩文: "ko",
  日英混合: "ja",
  多语种混合: "auto"
};
var languagesKeyMap2 = Object.fromEntries(
  Object.entries(languagesMap2).map(([key, value]) => [value, key])
);

// src/adapters/gradio/base.ts
var GradioAdapter = class extends VitsAdapter {
  static {
    __name(this, "GradioAdapter");
  }
  type = "gradio";
  clients;
  processors = {};
  constructor(ctx) {
    super(ctx);
    this.clients = new TTLCache(ctx, 1e3 * 60 * 5);
    this.addProcessor(type, bert_vits_exports);
    this.addProcessor(type2, gpt_sovits_1_exports);
    this.addProcessor(type3, gpt_sovits_2_fixed1_exports);
  }
  async predict(input, config, options) {
    const client = await this.getGradioClient(config);
    const currentSpeaker = options.speaker;
    const payload = await this._generatePayload(
      input,
      client,
      config,
      currentSpeaker,
      options
    );
    this.ctx.logger.debug("payload %s", JSON.stringify(payload));
    const fnIndex = currentSpeaker.fn_index ?? config.config.fn_index;
    currentSpeaker.fn_index = fnIndex;
    try {
      const response = await client.predict(
        currentSpeaker.fn_index ?? config.config.fn_index,
        payload
      ).then((res) => {
        return res["data"];
      });
      let url;
      const finalResponse = typeof response[0] === "string" ? response[1] : response[0];
      if (finalResponse.url) {
        url = finalResponse.url;
      } else if (finalResponse.path || finalResponse.name) {
        const filePath = finalResponse.path || finalResponse.name;
        url = `${config.url}/file=${filePath}`;
      } else {
        this.ctx.logger.error(
          "Invalid response:",
          JSON.stringify(finalResponse)
        );
        throw new Error("Invalid response format");
      }
      if (url == null) {
        this.ctx.logger.error(
          "Invalid response:",
          JSON.stringify(response)
        );
        throw new Error("Invalid response format");
      }
      if (client.jwt != null) {
        url = url + "?__sign=" + client.jwt;
      }
      const audioBuffer = await this.ctx.http.get(url, {
        responseType: "arraybuffer",
        headers: this._buildHeaders(config)
      });
      client.close();
      return import_koishi4.h.audio(audioBuffer, getAudioFileExtension(url));
    } catch (error) {
      this.ctx.logger.error(JSON.stringify(error));
      throw error;
    }
  }
  async _generatePayload(input, client, config, currentSpeaker, options) {
    const processor = this.processors[config.config.type];
    return processor?.generatePayload(
      input,
      client,
      config,
      currentSpeaker,
      options
    ) ?? {};
  }
  async getSpeakerList(config) {
    if (config.config.auto_pull_speaker !== true) {
      return config.speakers ?? [];
    }
    const processor = this.processors[config.config.type];
    const client = await this.getGradioClient(config);
    return processor?.getSpeakerList(client, config) ?? config.speakers ?? [];
  }
  async getGradioClient(config) {
    const url = config.url;
    if (this.clients.get(url)) {
      return this.clients.get(url);
    }
    const client = await this.ctx.gradio.connect(url, {
      hf_token: config.config.hf_token
    });
    this.clients.set(url, client);
    return client;
  }
  _buildHeaders(config) {
    if (!config.config.hf_token) {
      return {};
    }
    return {
      Authorization: `Bearer ${config.config.hf_token}`
    };
  }
  addProcessor(type4, processor) {
    this.processors[type4] = processor;
  }
};

// src/index.ts
var import_path3 = require("path");

// src/constants.ts
var import_path2 = __toESM(require("path"));
var import_fs2 = __toESM(require("fs"));
var import_js_yaml = require("js-yaml");
var import_plugin_console = require("@koishijs/plugin-console");
var import_koishi5 = require("koishi");
var LunaVitsProvider = class extends import_plugin_console.DataService {
  constructor(ctx, config) {
    super(ctx, "luna_vits_data");
    this.config = config;
  }
  vitsConfig = [];
  speakerKeyIdMap = {};
  speakerKeyMap = {};
  abortController = new AbortController();
  lock = new PromiseLock();
  async refresh() {
    await this.lock.lock();
    this.vitsConfig = await this.loadConfig();
    this.speakerKeyIdMap = this.mapSpeakers();
    this.speakerKeyMap = this.mapSpeakerKey();
    this.lock.unlock();
    this.ctx.schema.set(
      "speaker",
      import_koishi5.Schema.union(Object.values(this.speakerKeyIdMap).map((s) => s[1]))
    );
    this.watchConfig();
    await super.refresh(true);
  }
  stop() {
    this.abortController.abort();
  }
  async loadConfig() {
    if (!this.ctx.vits) {
      return [];
    }
    try {
      await import_fs2.default.promises.access(this.resolveConfigPath());
    } catch {
      const defaultPath = import_path2.default.join(__dirname, "../resources/config.yml");
      try {
        await import_fs2.default.promises.mkdir(this.resolveConfigDir(), {
          recursive: true
        });
      } catch (e) {
      }
      await import_fs2.default.promises.copyFile(defaultPath, this.resolveConfigPath());
    }
    const configs = (0, import_js_yaml.load)(
      await import_fs2.default.promises.readFile(this.resolveConfigPath(), "utf-8")
    );
    const managed = this.buildManagedConfig();
    if (managed) configs.push(managed);
    const filteredConfigs = configs.filter((c) => c.enabled === true || c.enabled == null).map(async (config) => {
      const speakerList = await this.ctx.vits.getSpeakerList(config);
      config.speakers = speakerList;
      return config;
    });
    return await Promise.all(filteredConfigs);
  }
  /** 从控制台插件配置构造一个 vits-simple-api 后端（启用时） */
  buildManagedConfig() {
    const managed = this.config?.vitsApi;
    if (!managed?.enabled || !managed.url) return null;
    return {
      name: "控制台 Vits-Simple-API",
      type: "vits-simple-api",
      enabled: true,
      url: managed.url.replace(/\/+$/, ""),
      config: {
        auto_pull_speaker: managed.autoPullSpeaker ?? true,
        api_key: managed.apiKey || void 0,
        username: managed.username || void 0,
        password: managed.password || void 0,
        timeout: managed.timeout ?? 6e4
      },
      speakers: []
    };
  }
  resolveConfigDir() {
    return import_path2.default.resolve(this.ctx.baseDir, "data/local-vits");
  }
  resolveConfigPath() {
    return import_path2.default.resolve(this.resolveConfigDir(), "config.yml");
  }
  watchConfig() {
    if (this.abortController) {
      this.abortController.abort();
    }
    this.abortController = new AbortController();
    const debounceFn = this.ctx.debounce(async () => {
      this.ctx.logger.info("Configuration changed, refreshing");
      await this.refresh();
      this.ctx.logger.info(
        `Successfully loaded ${Object.keys(this.speakerKeyIdMap).length} speakers`
      );
    }, 300);
    (0, import_fs2.watch)(
      import_path2.default.resolve("data/local-vits/config.yml"),
      {
        signal: this.abortController.signal
      },
      async (event, filename) => {
        await debounceFn();
      }
    );
  }
  processSpeaker(speaker, config, result) {
    if (config.type === "GPT-SoVITS2") {
      for (const language of ["ZH", "EN", "JA", "KO", "YUO", "AUTO"]) {
        result.push([config, `${speaker.name}_${language}`, speaker]);
      }
    } else if (config.type === "gradio") {
      const requestConfig = config.config;
      speaker = speaker;
      const languages = requestConfig.languages ?? [
        "ZH",
        "EN",
        "JA",
        "AUTO"
      ];
      if (languages) {
        for (const language of languages) {
          result.push([
            config,
            `${speaker.name}_${language.toUpperCase()}`,
            speaker
          ]);
        }
      }
    } else if (config.type === "vits-simple-api") {
      speaker = speaker;
      const languages = speaker.languages;
      if (languages) {
        for (const language of languages) {
          result.push([
            config,
            `${speaker.name}_${language.toUpperCase()}`,
            speaker
          ]);
        }
      }
      result.push([config, `${speaker.name}_AUTO`, speaker]);
    } else if (config.type === "qq-voice") {
      speaker = speaker;
      result.push([config, `QQ_${speaker.name}_AUTO`, speaker]);
    } else if (config.type === "fish-audio") {
      speaker = speaker;
      const languages = speaker.languages;
      if (languages) {
        for (const language of languages) {
          result.push([
            config,
            `${speaker.name}_${language.toUpperCase()}`,
            speaker
          ]);
        }
      }
      result.push([config, `${speaker.name}_AUTO`, speaker]);
    }
  }
  mapSpeakers() {
    return this.vitsConfig.flatMap((config) => {
      const result = [];
      for (const speaker of config.speakers) {
        this.processSpeaker(speaker, config, result);
      }
      return result;
    }).sort((a, b) => a[1] < b[1] ? 1 : -1).map((k, index) => [k, baseSpeakId++]).reduce(
      (acc, [k, v]) => {
        acc[v] = k;
        return acc;
      },
      {}
    );
  }
  mapSpeakerKey() {
    return Object.fromEntries(
      Object.entries(this.speakerKeyIdMap).map(([k, v]) => [
        v[1],
        [v[0], v[2]]
      ])
    );
  }
  // format as markdown table item list [speaker_name, speaker_id]
  get() {
    return this.lock.runLocked(async () => {
      const speakers = Object.entries(this.speakerKeyIdMap).map(([k, v]) => [v[1], k]).map(([speaker, id]) => `| ${speaker} | ${id} |`).join("\n");
      const usage = await import_fs2.default.promises.readFile(
        import_path2.default.resolve(__dirname, "../resources/usage.md"),
        "utf-8"
      );
      return usage.replace("{speakers}", speakers);
    });
  }
  async getVitsConfig() {
    return this.lock.runLocked(() => this.vitsConfig);
  }
  async getSpeakerKeyIdMap() {
    return this.lock.runLocked(() => this.speakerKeyIdMap);
  }
  async getSpeakerKeyMap() {
    return this.lock.runLocked(() => this.speakerKeyMap);
  }
  static name = "local-vits-config";
  static inject = {
    console: {
      required: true
    },
    vits: {
      required: true
    },
    gradio: {
      required: false
    }
  };
};
var baseSpeakId = 114514;

// src/adapters/fish_audio.ts
var import_koishi6 = require("koishi");
var FishAudioAdapter = class extends VitsAdapter {
  static {
    __name(this, "FishAudioAdapter");
  }
  type = "fish-audio";
  constructor(ctx) {
    super(ctx);
  }
  async predict(input, config, options) {
    const payload = this._generatePayload(input, config.config, options);
    this.ctx.logger.debug("payload, %s", JSON.stringify(payload));
    try {
      const response = await this.ctx.http.post(
        `https://api.fish.audio/v1/tts`,
        payload,
        {
          responseType: "arraybuffer",
          headers: {
            Authorization: `Bearer ${config.config.api_key}`
          }
        }
      );
      return import_koishi6.h.audio(response, payload.format ?? "wav");
    } catch (e) {
      this.ctx.logger.error(e.response);
      return import_koishi6.h.text("语音合成失败");
    }
  }
  _generatePayload(input, config, options) {
    const base = Object.assign(
      {
        chunk_length: 50,
        normalize: true,
        mp3_bitrate: 64,
        opus_bitrate: -1e3,
        latency: "normal",
        reference_id: options.speaker.reference_id
      },
      removeProperty(
        options.speaker,
        ["languages", "text", "name"]
      ),
      {
        text: input,
        format: "wav"
      }
    );
    return base;
  }
  async getSpeakerList(config) {
    const simpleApiConfig = config;
    const baseList = simpleApiConfig.speakers;
    const needFetchList = baseList.filter(
      (speaker) => !speaker.languages || speaker.languages?.length === 0
    );
    for (let i = 0; i < 3; i++) {
      try {
        await this._getSpeakerListLanguage(config, needFetchList);
      } catch (error) {
        this.ctx.logger.error("Failed to fetch speaker list:", error);
      }
    }
    return baseList;
  }
  async _getSpeakerLanguage(config, speaker) {
    const response = await this.ctx.http.get(
      `https://api.fish.audio/model/${speaker.reference_id}`,
      {
        responseType: "json",
        headers: {
          Authorization: `Bearer ${config.config.api_key}`
        }
      }
    );
    speaker.languages = response.languages;
  }
  async _getSpeakerListLanguage(config, list) {
    const tasks = list.map(
      (speaker) => this._getSpeakerLanguage(config, speaker)
    );
    await Promise.race(tasks);
  }
};

// src/adapters/qq_voice.ts
var import_koishi7 = require("koishi");
var QQVoiceAdapter = class _QQVoiceAdapter extends VitsAdapter {
  static {
    __name(this, "QQVoiceAdapter");
  }
  type = "qq-voice";
  static _accounts = /* @__PURE__ */ new Set();
  static _lock = new PromiseLock(false);
  constructor(ctx) {
    super(ctx);
  }
  async predict(input, _, options, session) {
    if (session == null) {
      return import_koishi7.h.text("请提供 session 对象。");
    }
    if (session.platform !== "onebot" && session.onebot == null) {
      return import_koishi7.h.text("AI 声聊仅支持 OneBot 协议。");
    }
    if (session.isDirect) {
      return import_koishi7.h.text("AI 声聊仅支持在群聊中使用。");
    }
    const speaker = options.speaker;
    if (!speaker) {
      return import_koishi7.h.text("请先选择一个角色。");
    }
    const bot = session.onebot;
    await _QQVoiceAdapter._lock.runLocked(async () => {
      await bot._request("send_group_ai_record", {
        group_id: session.guildId,
        character: speaker.characterId,
        text: input
      }).then((res) => {
        return res.data;
      });
      await (0, import_koishi7.sleep)(400);
    });
    return import_koishi7.h.text("");
  }
  async getSpeakerList(config) {
    let groupId;
    let errorCount = 0;
    let bot = null;
    while (!groupId && errorCount < 5) {
      bot = bot ?? this.ctx.bots.find((bot2) => {
        return bot2.platform === "onebot" && bot2.selfId === config.config.accountId.toString();
      });
      if (!bot) {
        this.ctx.logger.error(
          `Failed to connect onebot: ${bot.selfId}, wait ${(5e3 + errorCount * 5e3) / 1e3}s`
        );
        (0, import_koishi7.sleep)(5e3 + errorCount * 5e3);
      }
      _QQVoiceAdapter._accounts.add(config.config.accountId);
      try {
        groupId = await bot.getGuildList().then((guilds) => {
          const data = guilds.data;
          return data[Math.floor(Math.random() * data.length)].id;
        });
      } catch (error) {
        errorCount++;
        this.ctx.logger.error(
          `Failed to connect onebot: ${bot.selfId}, wait ${(5e3 + errorCount * 5e3) / 1e3}s`,
          error
        );
        (0, import_koishi7.sleep)(5e3 + errorCount * 5e3);
      }
    }
    if (errorCount >= 5) {
      this.ctx.logger.error(`Failed to connect onebot: ${bot.selfId}`);
      return [];
    }
    errorCount = 0;
    while (errorCount < 5) {
      try {
        const speakers = await bot.internal._request("get_ai_characters", {
          group_id: groupId
        }).then((res) => {
          return res.data;
        }).then((res) => {
          return res.flatMap((raw) => {
            return raw.characters.map((character) => {
              return {
                name: character.character_name,
                characterId: character.character_id
              };
            });
          });
        });
        return Array.from(
          new Map(
            speakers.map((speaker) => [
              speaker.characterId,
              speaker
            ])
          ).values()
        );
      } catch (e) {
        errorCount++;
        this.ctx.logger.error(
          `Failed to get voice list from onebot: ${bot.selfId}`,
          e
        );
        (0, import_koishi7.sleep)(5e3 + errorCount * 5e3);
      }
    }
  }
};

// src/config.ts
var import_koishi8 = require("koishi");
var Config = import_koishi8.Schema.intersect([
  import_koishi8.Schema.object({
    defaultSpeaker: import_koishi8.Schema.dynamic("speaker").description("全局默认的讲者。"),
    maxLength: import_koishi8.Schema.number().description("最大能转换的文字长度。超出后自动报错").min(10).max(500).default(100),
    autoTranslate: import_koishi8.Schema.boolean().default(false).description(
      "自动翻译到目标语言（需要翻译服务，并且确保已安装可选依赖`franc-min`)"
    )
  }).description("全局配置"),
  import_koishi8.Schema.object({
    vitsApi: import_koishi8.Schema.object({
      enabled: import_koishi8.Schema.boolean().default(false).description(
        "开启后可直接在控制台配置 vits-simple-api，无需编辑 data/local-vits/config.yml"
      ),
      url: import_koishi8.Schema.string().role("link").description(
        "vits-simple-api 服务地址，例如 http://127.0.0.1:23456"
      ),
      username: import_koishi8.Schema.string().description(
        "HTTP Basic Auth 用户名（后端开启认证时填写）"
      ),
      password: import_koishi8.Schema.string().role("secret").description("HTTP Basic Auth 密码"),
      apiKey: import_koishi8.Schema.string().role("secret").description("X-API-KEY（后端用 API Key 鉴权时填写）"),
      timeout: import_koishi8.Schema.number().default(6e4).description("请求超时（毫秒）"),
      autoPullSpeaker: import_koishi8.Schema.boolean().default(true).description("自动从后端拉取 speaker 列表")
    }).description("vits-simple-api 快捷配置")
  }).description("后端配置")
]);
var inject = {
  optional: ["translator"]
};
var name = "local-vits";

// src/index.ts
function apply(ctx, config) {
  ctx.inject(["console"], (ctx2) => {
    ctx2.console.addEntry({
      dev: (0, import_path3.resolve)(__dirname, "../client/index.ts"),
      prod: (0, import_path3.resolve)(__dirname, "../dist")
    });
  });
  ctx.plugin(LunaVitsService, config);
  ctx.plugin(LunaVitsProvider, config);
  ctx.inject(
    {
      vits: {
        required: true
      },
      console: {
        required: true
      },
      "console.services.luna_vits_data": {
        required: true
      },
      gradio: {
        required: false
      }
    },
    async (ctx2) => {
      const lunaVits = ctx2.vits;
      lunaVits.addAdapter(new GPTSoVITS2Adapter(lunaVits.ctx));
      lunaVits.addAdapter(new VitsSimpleAPIAdapter(lunaVits.ctx));
      lunaVits.addAdapter(new FishAudioAdapter(lunaVits.ctx));
      lunaVits.addAdapter(new QQVoiceAdapter(lunaVits.ctx));
      ctx2.inject(["gradio"], async () => {
        lunaVits.addAdapter(new GradioAdapter(lunaVits.ctx));
        await ctx2.console.services.luna_vits_data.refresh();
      });
      ctx2.command(
        "tts [action:string]",
        "TTS 状态与控制（状态/开/关）",
        { authority: 3 }
      ).action((_, action) => {
        const a = String(action ?? "").trim().toLowerCase();
        if (a === "开" || a === "on") {
          resetTtsCircuit();
          return "语音已开启，熔断已清除。";
        }
        if (a === "关" || a === "off") {
          disableTts();
          return "语音已关闭：之后只发文字（发 tts 开 恢复）。";
        }
        const { manualDisabled, circuitOpenUntil, lastFailure, cooldown } = getTtsStatus();
        const now = Date.now();
        const state = manualDisabled ? "已手动关闭" : now < circuitOpenUntil ? "熔断中" : "正常";
        const rows = [`#TTS 状态：${state}`];
        if (!manualDisabled && now < circuitOpenUntil) {
          rows.push(
            circuitOpenUntil === Infinity ? "冷却：永久（发 tts 开 解除）" : `冷却剩余：${Math.ceil((circuitOpenUntil - now) / 1e3)} 秒`
          );
        }
        if (lastFailure) {
          rows.push(
            `上次失败：${new Date(lastFailure.time).toLocaleString("zh-CN")} — ${lastFailure.message}`
          );
        }
        rows.push(
          `冷却时长：${cooldown === Infinity ? "永久（手动解除）" : cooldown / 1e3 + " 秒"}`
        );
        return rows.join("\n");
      });
      ctx2.command("lunavits <text:text>", "lunavits 语音合成").option("speaker", "-s [speaker:string] 语音合成的讲者", {
        fallback: config.defaultSpeaker
      }).option(
        "sdp_ratio",
        "-sr [sdp_ratio:nubmer] 语音合成的SDP/DP混合比"
      ).option("noise", "-n [noise:number] 语音合成的感情强度").option("noisew", "-nw [noisew:number] 语音合成的音素长度").option("length", "-l [length:number] 语音合成语速").option(
        "weight",
        "-w [weight:number] 主文本和辅助文本的混合比率"
      ).option(
        "temperature",
        "-t [temperature:number] 合成的温度（GPT-SOVITS-ONLY）"
      ).option(
        "text_split_method",
        "-ts [text_split_method:string] 语音合成的文本分割方法（GPT-SOVITS-ONLY）"
      ).option(
        "speed",
        "-sp [speed:number] 语音合成的语速（GPT-SOVITS-ONLY）"
      ).action(async ({ session, options }, text) => {
        if (!text) {
          await session.execute("lunavits -h");
          return null;
        }
        const speakerKeyMap = await ctx2.console.services.luna_vits_data.getSpeakerKeyMap();
        const [speakerConfig, finalSpeaker] = getSpeaker(
          ctx2,
          speakerKeyMap,
          options.speaker ?? config.defaultSpeaker
        );
        if (!speakerConfig) {
          return `找不到这个 ${finalSpeaker} 讲者，请检查你的输入。`;
        }
        const lunaVits2 = ctx2.vits;
        return await lunaVits2.predict(
          text,
          Object.assign(options, {
            speaker: finalSpeaker
          }),
          session
        );
      });
      await ctx2.console.services.luna_vits_data.refresh();
    }
  );
}
__name(apply, "apply");
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  Config,
  apply,
  inject,
  name
});
