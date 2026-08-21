#!/usr/bin/env bash
# add-qwen-account.sh — добавление аккаунтов Qwen в FreeQwenApi
# Прокси останавливается (иначе lock на chrome-профиль), затем добавляются
# аккаунты по одному (каждый — ручной вход в браузере), в конце прокси запускается.
set -e
cd /home/d/my/FreeQwenApi

systemctl --user stop freeqwenapi.service || true
sleep 2

while true; do
  echo "=== Откроется браузер: войди в Qwen вручную, затем вернись в терминал ==="
  npm run auth -- --add
  read -r -p "Добавить ещё аккаунт? (y/n): " ans
  case "$ans" in
    y|Y|yes|YES|да|Да) continue ;;
    *) break ;;
  esac
done

systemctl --user start freeqwenapi.service
echo "Прокси запущен. Проверь список: npm run auth -- --list"
