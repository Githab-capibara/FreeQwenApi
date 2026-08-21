// proxyManager.js
// Ротация прокси для смены IP адресов между сессиями.
// Помогает избежать IP-based блокировок при частых запросах.
//
// Использование:
// 1. Создать файл proxies.txt в корне проекта:
//    user:pass@ip:port
//    user:pass@ip:port
// 2. Или указать путь через env PROXY_LIST_FILE=proxies.txt

import fs from 'fs';
import path from 'path';
import { logInfo, logWarn } from '../logger/index.js';

class ProxyManager {
    constructor() {
        this.proxies = [];
        this.currentIndex = 0;
        this.loadProxies();
    }

    loadProxies() {
        const proxyFile = process.env.PROXY_LIST_FILE || path.join(process.cwd(), 'proxies.txt');
        if (!fs.existsSync(proxyFile)) {
            logInfo(`Proxy файл не найден: ${proxyFile}. Прокси ротация отключена.`);
            return;
        }

        try {
            this.proxies = fs.readFileSync(proxyFile, 'utf8')
                .split('\n')
                .map(l => l.trim())
                .filter(l => l && !l.startsWith('#') && l.includes('@'));

            logInfo(`Загружено ${this.proxies.length} прокси из ${proxyFile}`);
        } catch (error) {
            logWarn(`Ошибка загрузки прокси: ${error.message}`);
        }
    }

    // Получить следующий прокси (round-robin)
    getNextProxy() {
        if (this.proxies.length === 0) return null;
        const proxy = this.proxies[this.currentIndex % this.proxies.length];
        this.currentIndex++;
        return proxy;
    }

    // Получить случайный прокси
    getRandomProxy() {
        if (this.proxies.length === 0) return null;
        return this.proxies[Math.floor(Math.random() * this.proxies.length)];
    }

    // Получить текущий индекс (для логирования)
    getCurrentIndex() {
        return this.currentIndex;
    }

    // Проверить доступность прокси (можно расширить)
    async isProxyWorking(proxy) {
        // Простая проверка - можно расширить до реального HTTP запроса
        return proxy && proxy.includes('@');
    }

    // Сбросить индекс (начать сначала)
    reset() {
        this.currentIndex = 0;
    }

    // Получить статистику
    getStats() {
        return {
            total: this.proxies.length,
            currentIndex: this.currentIndex,
            currentProxy: this.proxies.length > 0 ? this.proxies[this.currentIndex % this.proxies.length] : null
        };
    }
}

export const proxyManager = new ProxyManager();
