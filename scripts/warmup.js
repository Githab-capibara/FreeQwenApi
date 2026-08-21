#!/usr/bin/env node
/**
 * Скрипт прогрева аккаунтов Qwen
 * Запускается ночью (3-4 утра) для "прогрева" новых аккаунтов
 * Делает простые запросы чтобы аккаунты не блокировались anti-bot
 */

import fetch from 'node-fetch';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const TOKENS_FILE = path.resolve(__dirname, '..', 'session', 'tokens.json');
const LOG_FILE = path.resolve(__dirname, '..', 'logs', 'warmup.log');

// Конфигурация
const CONFIG = {
    proxyUrl: process.env.FREEQWEN_PROXY_URL || 'http://127.0.0.1:3264',
    model: 'qwen3.7-max',
    // Простые запросы для прогрева
    warmupMessages: [
        'Привет! Как дела?',
        'Расскажи короткую шутку',
        'Какое сегодня число?',
        'Назови 3 цвета радуги',
        'Что такое 2+2?',
        'Скажи "hello world"',
        'Какой сегодня день недели?',
        'Перечисли времена года',
        'Сколько будет 10 * 10?',
        'Назови столицу России'
    ],
    // Пауза между запросами (мс) - важно для anti-bot
    delayBetweenRequests: 5000,
    // Пауза между аккаунтами (мс)
    delayBetweenAccounts: 15000,
    // Максимум запросов на аккаунт за сессию прогрева
    maxRequestsPerAccount: 3,
    // Таймаут запроса (мс)
    requestTimeout: 30000
};

function log(message) {
    const timestamp = new Date().toISOString();
    const logLine = `[${timestamp}] ${message}`;
    console.log(logLine);
    
    // Пишем в лог файл
    try {
        const logDir = path.dirname(LOG_FILE);
        if (!fs.existsSync(logDir)) {
            fs.mkdirSync(logDir, { recursive: true });
        }
        fs.appendFileSync(LOG_FILE, logLine + '\n');
    } catch (e) {
        // Игнорируем ошибки логирования
    }
}

function loadTokens() {
    try {
        if (!fs.existsSync(TOKENS_FILE)) {
            log('❌ Файл токенов не найден: ' + TOKENS_FILE);
            return [];
        }
        const data = fs.readFileSync(TOKENS_FILE, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        log('❌ Ошибка загрузки токенов: ' + error.message);
        return [];
    }
}

function saveTokens(tokens) {
    try {
        fs.writeFileSync(TOKENS_FILE, JSON.stringify(tokens, null, 2), 'utf8');
    } catch (error) {
        log('❌ Ошибка сохранения токенов: ' + error.message);
    }
}

async function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function warmupAccount(token, index, total) {
    const accountId = token.id;
    log(`🔥 [${index + 1}/${total}] Начинаю прогрев аккаунта ${accountId}`);
    
    let successCount = 0;
    let failCount = 0;
    
    for (let i = 0; i < CONFIG.maxRequestsPerAccount; i++) {
        const message = CONFIG.warmupMessages[i % CONFIG.warmupMessages.length];
        
        try {
            log(`  📝 Запрос #${i + 1}: "${message}"`);
            
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), CONFIG.requestTimeout);
            
            const response = await fetch(`${CONFIG.proxyUrl}/api/chat/completions`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token.token}`
                },
                body: JSON.stringify({
                    model: CONFIG.model,
                    stream: false,
                    messages: [
                        { role: 'user', content: message }
                    ]
                }),
                signal: controller.signal
            });
            
            clearTimeout(timeoutId);
            
            if (response.ok) {
                const data = await response.json();
                const content = data?.choices?.[0]?.message?.content;
                log(`  ✅ Успешно (${response.status}): ${content ? content.substring(0, 50) + '...' : 'no content'}`);
                successCount++;
                
                // Сбрасываем resetAt если был rate limit
                if (token.resetAt) {
                    token.resetAt = null;
                    token.invalid = false;
                }
            } else {
                const errorText = await response.text().catch(() => 'unknown');
                log(`  ⚠️ Ошибка (${response.status}): ${errorText.substring(0, 100)}`);
                
                if (response.status === 429) {
                    // Rate limited - помечаем аккаунт
                    token.resetAt = new Date(Date.now() + 3600000).toISOString();
                    log(`  ⏳ Аккаунт rate limited, ждём 1 час`);
                    break;
                } else if (response.status === 401 || response.status === 403) {
                    token.invalid = true;
                    log(`  ❌ Аккаунт недействителен`);
                    break;
                }
                failCount++;
            }
            
        } catch (error) {
            log(`  ❌ Исключение: ${error.message}`);
            failCount++;
            
            if (error.name === 'AbortError') {
                log(`  ⏰ Таймаут запроса (${CONFIG.requestTimeout / 1000}s)`);
            }
        }
        
        // Пауза между запросами к одному аккаунту
        if (i < CONFIG.maxRequestsPerAccount - 1) {
            log(`  😴 Пауза ${CONFIG.delayBetweenRequests / 1000}s...`);
            await delay(CONFIG.delayBetweenRequests);
        }
    }
    
    log(`  📊 Результат: ${successCount} успешно, ${failCount} ошибок`);
    return { accountId, successCount, failCount };
}

async function checkProxyHealth() {
    try {
        const response = await fetch(`${CONFIG.proxyUrl}/api/health`, {
            signal: AbortSignal.timeout(5000)
        });
        
        if (response.ok) {
            const data = await response.json();
            log(`✅ Proxy здоров: ${data.accounts?.available || 0} аккаунтов доступно`);
            return data;
        }
    } catch (error) {
        log(`❌ Proxy недоступен: ${error.message}`);
    }
    return null;
}

async function main() {
    log('========================================');
    log('🔥 НАЧАЛО ПРОГРЕВА АККАУНТОВ QWEN');
    log('========================================');
    log(`Конфигурация:`);
    log(`  - Proxy: ${CONFIG.proxyUrl}`);
    log(`  - Модель: ${CONFIG.model}`);
    log(`  - Запросов на аккаунт: ${CONFIG.maxRequestsPerAccount}`);
    log(`  - Пауза между запросами: ${CONFIG.delayBetweenRequests / 1000}s`);
    log(`  - Пауза между аккаунтами: ${CONFIG.delayBetweenAccounts / 1000}s`);
    log('');
    
    // Проверяем proxy
    const health = await checkProxyHealth();
    if (!health) {
        log('❌ Proxy не отвечает. Завершаем.');
        process.exit(1);
    }
    
    // Загружаем токены
    const tokens = loadTokens();
    if (tokens.length === 0) {
        log('❌ Нет аккаунтов для прогрева');
        process.exit(1);
    }
    
    log(`📦 Найдено аккаунтов: ${tokens.length}`);
    log('');
    
    // Прогреваем каждый аккаунт
    const results = [];
    for (let i = 0; i < tokens.length; i++) {
        const token = tokens[i];
        
        // Пропускаем недействительные
        if (token.invalid) {
            log(`⏭️ [${i + 1}] Пропускаю недействительный аккаунт ${token.id}`);
            continue;
        }
        
        // Пропускаем аккаунты в ожидании сброса
        if (token.resetAt && new Date(token.resetAt).getTime() > Date.now()) {
            log(`⏭️ [${i + 1}] Пропускаю аккаунт ${token.id} (ждёт сброса до ${token.resetAt})`);
            continue;
        }
        
        const result = await warmupAccount(token, i, tokens.length);
        results.push(result);
        
        // Пауза между аккаунтами
        if (i < tokens.length - 1) {
            log(`😴 Пауза ${CONFIG.delayBetweenAccounts / 1000}s перед следующим аккаунтом...`);
            await delay(CONFIG.delayBetweenAccounts);
        }
    }
    
    // Сохраняем обновлённые токены
    saveTokens(tokens);
    
    // Итоговая статистика
    log('');
    log('========================================');
    log('📊 ИТОГИ ПРОГРЕВА');
    log('========================================');
    
    const totalSuccess = results.reduce((sum, r) => sum + r.successCount, 0);
    const totalFail = results.reduce((sum, r) => sum + r.failCount, 0);
    log(`Всего аккаунтов обработано: ${results.length}`);
    log(`Всего запросов успешно: ${totalSuccess}`);
    log(`Всего запросов с ошибками: ${totalFail}`);
    
    if (results.length > 0) {
        const successRate = ((totalSuccess / (totalSuccess + totalFail)) * 100).toFixed(1);
        log(`Процент успеха: ${successRate}%`);
    }
    
    log('');
    log('✅ ПРОГРЕВ ЗАВЕРШЁН');
    log('========================================');
}

// Запуск
main().catch(error => {
    log('❌ Критическая ошибка: ' + error.message);
    log(error.stack);
    process.exit(1);
});
