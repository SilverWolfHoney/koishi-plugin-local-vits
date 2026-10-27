#!/bin/bash
# luna-vits 熔断补丁部署脚本（在服务器 /opt/koishi 下执行）
# 首次部署用；插件更新后用 reapply.sh
set -euo pipefail

cd /opt/koishi
TS=$(date +%Y%m%d-%H%M%S)
TARGET=node_modules/koishi-plugin-luna-vits/lib/index.js

if [ ! -f "$TARGET" ]; then
  echo "[FAIL] $TARGET not found"
  exit 1
fi

mkdir -p _backups
cp -a "$TARGET" "_backups/luna-vits-index.js.bak.$TS"
echo "[backup] _backups/luna-vits-index.js.bak.$TS"

docker exec koishi node /koishi/luna-vits-patch/patch.mjs "/koishi/$TARGET"
docker exec koishi node --check "/koishi/$TARGET"
echo "[check] syntax ok"

COUNT=$(docker exec koishi sh -c "grep -c 'TTS_CIRCUIT_COOLDOWN' /koishi/$TARGET")
echo "[verify] marker count = $COUNT"

docker restart koishi
echo "[done] koishi restarted, check: docker logs --tail 100 koishi"
