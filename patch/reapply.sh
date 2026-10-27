#!/bin/bash
# 插件被市场更新/重装覆盖后，重新打 luna-vits 熔断补丁
set -euo pipefail

cd /opt/koishi
TARGET=node_modules/koishi-plugin-luna-vits/lib/index.js

docker exec koishi node /koishi/luna-vits-patch/patch.mjs "/koishi/$TARGET"
docker exec koishi node --check "/koishi/$TARGET"
docker restart koishi
echo "[done] reapplied and restarted"
