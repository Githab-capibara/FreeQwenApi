import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import AdblockerPlugin from 'puppeteer-extra-plugin-adblocker';
import RecaptchaPlugin from 'puppeteer-extra-plugin-recaptcha';
import { saveSession, saveAuthToken } from './session.js';
import { startManualAuthentication } from './auth.js';
import { getRandomUserAgent, getRandomAcceptLanguage, getRandomTimezone } from './userAgentRotator.js';
import { proxyManager } from './proxyManager.js';
import { clearPagePool, getAuthToken } from '../api/chat.js';
import fs from 'fs';
import path from 'path';
import { logInfo, logError, logWarn, logDebug } from '../logger/index.js';
import {
    CHAT_PAGE_URL, NAVIGATION_TIMEOUT, RETRY_DELAY, PROTOCOL_TIMEOUT,
    VIEWPORT_WIDTH, VIEWPORT_HEIGHT, USER_AGENT, CHROME_PROFILE_DIR,
    SESSION_DIR, ACCOUNTS_DIR
} from '../config.js';

// === МАКСИМАЛЬНАЯ STEALTH КОНФИГУРАЦИЯ ===
puppeteer.use(StealthPlugin());
// AdblockerPlugin отключён — блокирует CDN ресурсы Qwen (CSS/JS) как трекеры
// puppeteer.use(AdblockerPlugin({ blockTrackers: true }));

let browserInstance = null;
let browserContext = null;
let browserVisibleMode = false;
export let isAuthenticated = false;

const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Создаёт рабочую страницу из контекста/страницы браузера. Вынесена сюда,
// чтобы chat.js и x5secSolver.js делили одну реализацию без циклических импортов.
export async function getPageFromContext(context) {
    if (context && typeof context.newPage === 'function') {
        return await context.newPage();
    }

    if (context && typeof context.goto === 'function') {
        // Если передана Puppeteer Page, не переиспользуем её как рабочую:
        // создаём отдельную вкладку из того же браузера, чтобы избежать гонок
        // и случайного закрытия базовой страницы.
        if (typeof context.browser === 'function') {
            try {
                const browser = context.browser();
                if (browser && typeof browser.newPage === 'function') {
                    return await browser.newPage();
                }
            } catch (error) {
                logWarn(`Не удалось создать новую страницу из текущего контекста: ${error.message}`);
            }
        }

        if (typeof context.isClosed === 'function' && context.isClosed()) {
            throw new Error('Базовая страница браузера закрыта');
        }

        return context;
    }

    throw new Error('Неверный контекст: не страница Puppeteer, не контекст Playwright');
}

export function isBrowserVisibleMode() { return browserVisibleMode; }

export async function initBrowser(visibleMode = true, skipManualRestart = false) {
    if (browserInstance) return true;

        browserVisibleMode = visibleMode;
        logInfo('Инициализация браузера с МАКСИМАЛЬНОЙ stealth защитой...');

        // Proxy rotation: получаем прокси для смены IP
        const proxy = proxyManager.getRandomProxy();
        if (proxy) {
            logInfo(`Используем прокси: ${proxy.slice(0, 20)}...`);
        }

        try {
            // === МАКСИМАЛЬНЫЙ СПИСОК ANTI-DETECT АРГУМЕНТОВ ===
            const launchArgs = [
                // Базовые security
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage',
                // Разрешаем cross-origin запросы (не блокировать CDN)
                '--disable-web-security',
                '--allow-running-insecure-content',

                // Anti-detection (минимальные, не ломающие рендеринг)
                '--disable-features=AcceptCHFrame,MediaRouter,Translate,EyeDropper,WebUIReloadButton,SitePerProcess,IsolateOrigins',

                // Realistic browser behavior
                '--start-maximized',
                '--disable-infobars',
                '--disable-extensions',
                '--no-first-run',
                '--no-default-browser-check',
                '--disable-background-timer-throttling',
                '--disable-backgrounding-occluded-windows',
                '--disable-renderer-backgrounding',
                '--disable-breakpad',
                '--force-color-profile=srgb',
                // Wayland отключён для стабильности
                '--disable-features=UseOzonePlatform',
                // Software rendering для стабильности
                '--disable-gpu',
                '--disable-software-rasterizer',

                // Window size
                `--window-size=${VIEWPORT_WIDTH},${VIEWPORT_HEIGHT}`,
            ];

            // Добавляем прокси если есть
            if (proxy) {
                launchArgs.push(`--proxy-server=${proxy}`);
            }

            browserInstance = await puppeteer.launch({
                headless: !visibleMode,
                slowMo: visibleMode ? 30 : 0,
                executablePath: process.env.CHROME_PATH || undefined,
                ignoreDefaultArgs: ['--enable-automation'],
                userDataDir: CHROME_PROFILE_DIR,
                args: launchArgs,
                defaultViewport: { width: VIEWPORT_WIDTH, height: VIEWPORT_HEIGHT },
                protocolTimeout: PROTOCOL_TIMEOUT,
                ignoreHTTPSErrors: true
            });

        const pages = await browserInstance.pages();
        const page = pages.length > 0 ? pages[0] : await browserInstance.newPage();

        // Ротация User-Agent для вариативности сессий
        const randomUA = getRandomUserAgent();
        await page.setUserAgent(randomUA);
        logInfo(`User-Agent: ${randomUA.slice(0, 50)}...`);

        // Рандомизация viewport (некоторые пользователи имеют DPI > 1)
        const randomDPI = 1 + Math.random() * 0.5;
        await page.setViewport({
            width: VIEWPORT_WIDTH,
            height: VIEWPORT_HEIGHT,
            deviceScaleFactor: randomDPI
        });

        await page.setExtraHTTPHeaders({
            'Accept-Language': 'en-US,en;q=0.9',
            'Accept-Encoding': 'gzip, deflate, br',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
            'Connection': 'keep-alive',
            'Upgrade-Insecure-Requests': '1',
            'Sec-Fetch-Dest': 'document',
            'Sec-Fetch-Mode': 'navigate',
            'Sec-Fetch-Site': 'none',
            'Sec-Fetch-User': '?1'
        });

        // Отключаем CSP чтобы скрипты загружались без блокировки
        await page.setBypassCSP(true);

        // Логирование запросов для отладки (показываем заблокированные)
        page.on('requestfailed', request => {
            const url = request.url();
            const type = request.resourceType();
            const failure = request.failure();
            if (failure && (type === 'stylesheet' || type === 'script')) {
                console.warn(`[BLOCKED] ${type}: ${url} - ${failure.errorText}`);
            }
        });

        await page.evaluateOnNewDocument((tz) => {
            // Timezone spoofing (безопасно)
            const originalDateTimeFormat = Intl.DateTimeFormat;
            Intl.DateTimeFormat = function(locale, options) {
                return new originalDateTimeFormat(locale, { ...options, timeZone: tz });
            };
            Intl.DateTimeFormat.prototype = originalDateTimeFormat.prototype;

            // Platform spoofing (безопасно)
            Object.defineProperty(navigator, 'platform', { get: () => 'Win32' });

            // Hardware concurrency (безопасно)
            Object.defineProperty(navigator, 'hardwareConcurrency', { get: () => 8 });

            // Device memory (безопасно)
            Object.defineProperty(navigator, 'deviceMemory', { get: () => 8 });

            // Connection (безопасно)
            Object.defineProperty(navigator, 'connection', {
                get: () => ({ effectiveType: '4g', rtt: 50, downlink: 10, saveData: false })
            });

            // Battery API (безопасно)
            if (!navigator.getBattery) {
                navigator.getBattery = () => Promise.resolve({ charging: true, chargingTime: 0, dischargingTime: Infinity, level: 0.85 });
            }

            // WebGL vendor (безопасно — не переопределяем prototype)
            const originalGetParameter = WebGLRenderingContext.prototype.getParameter;
            WebGLRenderingContext.prototype.getParameter = function(param) {
                if (param === 37445) return 'Intel Inc.';
                if (param === 37446) return 'Intel Iris OpenGL Engine';
                return originalGetParameter.call(this, param);
            };

            // НЕ переопределяем EventTarget — может ломать скрипты страницы
            // НЕ добавляем canvas noise — может ломать WebGL контекст
            // НЕ переопределяем AudioContext — может ломать аудио API
        }, getRandomTimezone());

        // В headless-режиме восстанавливаем cookie-сессию из сохранённого аккаунта
        // и загружаем страницу Qwen: антибот-скрипты (acw_tc, tfstk и т.д.)
        // выполняются только на реальной странице с origin chat.qwen.ai.
        // Без этого fetch на пустой вкладке даёт "Qwen anti-bot challenge" на
        // completion (chats/new при этом проходит по cookie token).
        if (!visibleMode) {
            try {
                const accountsDir = path.join(process.cwd(), SESSION_DIR, ACCOUNTS_DIR);
                if (fs.existsSync(accountsDir)) {
                    const accDirs = fs.readdirSync(accountsDir)
                        .filter(d => fs.existsSync(path.join(accountsDir, d, 'cookies.json')));
                    if (accDirs.length > 0) {
                        const cookies = JSON.parse(fs.readFileSync(path.join(accountsDir, accDirs[0], 'cookies.json'), 'utf8'));
                        await page.setCookie(...cookies);
                        logInfo(`Cookies восстановлены из session/accounts/${accDirs[0]}`);
                    }
                }
                // Загружаем страницу, чтобы инициализировать антибот-окружение (обязательно для completion).
                await page.goto(CHAT_PAGE_URL, { waitUntil: 'domcontentloaded', timeout: NAVIGATION_TIMEOUT });
                await delay(4000);
                const finalUrl = page.url();
                logInfo(`Страница Qwen загружена в headless-режиме: ${finalUrl}`);
                if (/\/auth/.test(finalUrl)) {
                    logWarn('Qwen перенаправил на страницу авторизации — cookie-сессия могла истечь');
                }
            } catch (e) {
                logWarn(`Не удалось восстановить cookies: ${e.message}`);
            }
        }

        browserContext = page;
        logInfo('Браузер инициализирован с максимальной защитой от обнаружения');

        if (visibleMode) {
            await startManualAuthenticationPuppeteer(page, skipManualRestart);
        }

        return true;
    } catch (error) {
        logError('Ошибка при инициализации браузера', error);
        return false;
    }
}

async function saveSessionPuppeteer(page) {
    try {
        const cookies = await page.cookies();
        const sessionDir = path.join(process.cwd(), SESSION_DIR, ACCOUNTS_DIR);
        if (!fs.existsSync(sessionDir)) fs.mkdirSync(sessionDir, { recursive: true });

        const accountId = `acc_${Date.now()}`;
        const accountDir = path.join(sessionDir, accountId);
        if (!fs.existsSync(accountDir)) fs.mkdirSync(accountDir, { recursive: true });

        fs.writeFileSync(path.join(accountDir, 'cookies.json'), JSON.stringify(cookies, null, 2));
        logInfo(`Cookies сохранены для аккаунта ${accountId}`);
        return accountId;
    } catch (error) {
        logError('Ошибка при сохранении сессии', error);
        return null;
    }
}

async function startManualAuthenticationPuppeteer(page, skipManualRestart) {
    try {
        logInfo('Открытие страницы для ручной авторизации...');

        // Проверяем доступность Qwen перед навигацией
        const https = await import('https');
        await new Promise((resolve, reject) => {
            const req = https.get(CHAT_PAGE_URL, { timeout: 10000 }, (res) => {
                logInfo(`Qwen доступен: HTTP ${res.statusCode}`);
                resolve();
            });
            req.on('error', (e) => {
                logWarn(`Qwen недоступен: ${e.message}`);
                reject(e);
            });
            req.on('timeout', () => {
                req.destroy();
                reject(new Error('Timeout checking Qwen availability'));
            });
        });

        await page.goto(CHAT_PAGE_URL, { waitUntil: 'domcontentloaded', timeout: 60_000 });
                // Даём время на загрузку CSS/JS и применение стилей
                await new Promise(r => setTimeout(r, 8000));
        await delay(5000);

        console.log('------------------------------------------------------');
        console.log('               НЕОБХОДИМА АВТОРИЗАЦИЯ');
        console.log('------------------------------------------------------');
        console.log('Пожалуйста, выполните следующие действия:');
        console.log('1. Войдите в систему в открытом браузере');
        console.log('2. ВАЖНО: Двигайте мышью естественно, не спешите');
        console.log('3. Если появится слайдер капчи - решите её медленно');
        console.log('4. Дождитесь полной загрузки главной страницы');
        console.log('5. После успешной авторизации нажмите ENTER в консоли');
        console.log('------------------------------------------------------');
        console.log('После успешной авторизации нажмите ENTER для продолжения...');

        await new Promise((resolve) => {
            if (process.stdin.isTTY) process.stdin.setRawMode(false);
            process.stdin.resume();
            process.stdin.setEncoding('utf8');
            const onData = (key) => {
                if (key === '\n' || key === '\r' || key.charCodeAt(0) === 13) {
                    process.stdin.pause();
                    process.stdin.removeListener('data', onData);
                    logInfo('Получено подтверждение, продолжаем...');
                    resolve();
                }
            };
            process.stdin.on('data', onData);
        });

        let cookies = [];
        try {
            cookies = await page.cookies();
            logInfo(`Сохранено ${cookies.length} cookies`);
        } catch (error) {
            logWarn(`Не удалось прочитать cookies после ручной авторизации: ${error.message}`);
        }

        let token = null;
        try {
            token = await page.evaluate(() => {
                const directKeys = ['token', 'auth_token', 'access_token', 'id_token', 'qwen_token'];
                for (const key of directKeys) {
                    const value = localStorage.getItem(key) || sessionStorage.getItem(key);
                    if (value) return value;
                }
                const jwtLike = /eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/;
                for (const storage of [localStorage, sessionStorage]) {
                    for (let i = 0; i < storage.length; i += 1) {
                        const value = storage.getItem(storage.key(i)) || '';
                        const match = value.match(jwtLike);
                        if (match) return match[0];
                    }
                }
                return null;
            });
        } catch (error) {
            logWarn(`Не удалось прочитать localStorage/sessionStorage: ${error.message}`);
        }

        if (token) {
            logInfo('Токен найден и будет сохранен');
            saveAuthToken(token);
        } else {
            logWarn('Токен не найден в localStorage/sessionStorage');
            logInfo('Попытка извлечь токен из cookies...');
            const tokenCookie = cookies.find(c => c.name.toLowerCase().includes('token') || c.name.toLowerCase().includes('auth'));
            if (tokenCookie) {
                logInfo(`Токен найден в cookie: ${tokenCookie.name}`);
                saveAuthToken(tokenCookie.value);
            }
        }

        try {
            const accountId = await saveSessionPuppeteer(page);
            if (accountId) logInfo(`Сессия сохранена с ID: ${accountId}`);
        } catch (error) {
            logWarn(`Не удалось сохранить cookies-сессию: ${error.message}`);
        }

        setAuthenticationStatus(true);
        logInfo('Авторизация завершена успешно');

        if (!skipManualRestart) await restartBrowserInHeadlessMode();
    } catch (error) {
        logError('Ошибка при ручной авторизации', error);
        throw error;
    }
}

export async function restartBrowserInHeadlessMode() {
    logInfo('Перезапуск браузера в фоновом режиме...');
    const token = getAuthToken();
    if (token) { logDebug('Сохранение токена...'); saveAuthToken(token); await delay(1000); }
    await shutdownBrowser();
    await delay(RETRY_DELAY);
    const success = await initBrowser(false);
    logInfo(success ? 'Браузер перезапущен в фоновом режиме' : 'Ошибка при перезапуске браузера');
}

export async function shutdownBrowser() {
    try {
        try { await clearPagePool(); } catch (e) { logError('Ошибка при очистке пула страниц', e); }
        if (browserInstance) {
            try {
                const pages = await browserInstance.pages();
                for (const page of pages) await page.close().catch(() => {});
                await browserInstance.close();
            } catch (e) { logError('Ошибка при закрытии браузера', e); }
        }
        browserContext = null;
        browserInstance = null;
        logInfo('Браузер закрыт');
    } catch (error) {
        logError('Ошибка при завершении работы браузера', error);
    }
}

export function getBrowserContext() { return browserContext; }
export function setAuthenticationStatus(status) { isAuthenticated = status; }
export function getAuthenticationStatus() { return isAuthenticated; }
