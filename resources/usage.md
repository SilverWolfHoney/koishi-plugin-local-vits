## 🎉 配置

配置文件在 [`data/local-vits/config.yml`](../files/data/local-vits/config.yml)，请前往此处查看。
如需查看最新版本的配置信息说明，请前往 [GitHub](https://github.com/SilverWolfHoney/koishi-plugin-local-vits/blob/main/resources/config.yml) 查看。

我们现支持热更新配置文件，以及下面的信息。无需重启即可查看最新讲者列表。

## ✨ 特性

1. 聚合多平台 vits 支持，覆盖热门 vits 接入
2. 识别源语言，自动翻译支持
3. 全手写 API 接入，不使用大包库，标准 gradio 流程。
4. 自动热更新讲者列表，对 `vits-simple-api` 支持自动拉取讲者列表。

## 🌈 使用

- 建议自行添加别名。

> lunavits

显示语音合成使用帮助。

> lunavits -s 东雪莲|塔菲|坏女人星瞳

将输入的文本转换为东雪莲|塔菲|坏女人星瞳...的语音。

---

## 兼容原vits 服务

下表为每个讲者对应的 speaker_id，如果某个使用了 vits 服务的插件需要该数字的 speaker_id，你可以根据下表来获取实际的 id。
<details>

<summary> 点击展开/折叠 全部的 [讲者--speaker_id] 列表 </summary>

| 讲者 | speaker_id |
| --- | --- |
{speakers}

</details>
