// x5secSolver.js — автоматическое решение слайдер-капчи Alibaba x5sec.
//
// Страница челленджа («Captcha Interception») показывает простой ползунок без
// пазла: текст «Проведите вправо», кнопка #nc_1_n1z, трек #nc_1_n1t.
// Решение = перетащить кнопку в правый край трека человеческой траекторией
// (разгон/торможение, лёгкий джиттер, паузы), после чего nc-скрипт заполняет
// скрытые поля формы (#nc-sig) и перенаправляет на исходную страницу.

import { logInfo, logWarn, logDebug } from '../logger/index.js';

const SLIDER_SELECTOR = '#nc_1_n1z';
const TRACK_SELECTOR = '#nc_1_n1t';
const SUCCESS_SIG_SELECTOR = '#nc-sig';
const PUNISH_CONTAINER = '#baxia-punish';

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

/** Страница челленджа x5sec? (URL/заголовок/контейнер). */
export async function isX5secPage(page) {
    try {
        const url = page.url();
        if (/(_____tmd_____|punish|captcha)/i.test(url)) return true;
        const title = await page.title().catch(() => '');
        if (/captcha interception/i.test(title)) return true;
        return await page.$eval(PUNISH_CONTAINER, () => true).catch(() => false);
    } catch { return false; }
}

/**
 * Достаёт URL страницы-челленджа из тела anti-bot ответа Qwen.
 * Тело содержит JS-редирект вида window.location.replace("https://.../punish?x5secdata=...").
 */
export function extractPunishUrl(body) {
    if (typeof body !== 'string' || !body) return null;
    const m = body.match(/window\.location\.replace\(\s*["']([^"']+)["']\s*\)/);
    if (m && m[1]) return m[1];
    // запасной вариант: URL с _____tmd_____/punish прямо в тексте
    const m2 = body.match(/https?:\/\/[^\s"'<>]+_____tmd_____[^\s"'<>]*/);
    return m2 ? m2[0] : null;
}

/**
 * Решает челлендж: открывает punish URL, тянет ползунок, ждёт ухода с капчи.
 * Возвращает true при успехе. Страница после успеха сама редиректит обратно.
 */
export async function solveX5secChallenge(page, punishUrl, { maxAttempts = 3, waitAfterMs = 8_000 } = {}) {
    if (!page || !punishUrl) return false;
    try {
        await page.goto(punishUrl, { waitUntil: 'domcontentloaded', timeout: 30_000 }).catch(() => {});
        // Не ждём фиксированные секунды: слайдер внедряется nc-скриптом с CDN,
        // его появление дожидается опросом в solveSliderCaptcha. Короткий сон —
        // чтобы nc успел перехватить события мыши после навигации.
        await sleep(900 + Math.random() * 600);
        if (!(await isX5secPage(page))) {
            logWarn(`x5sec: страница не похожа на челлендж (${page.url().slice(0, 60)}) — пропускаем`);
            return false;
        }
        const solved = await solveSliderCaptcha(page, { maxAttempts });
        if (!solved) return false;
        // ждём редирект с капчи (verify-форма отправляет nc_sig и редиректит)
        const deadline = Date.now() + waitAfterMs;
        while (Date.now() < deadline) {
            const url = page.url();
            if (!url.includes('_____tmd_____') && !url.includes('/punish')) return true;
            await sleep(500);
        }
        logWarn('x5sec: слайдер решён, но редиректа с капчи нет');
        return false;
    } catch (e) {
        logWarn(`x5sec: ошибка решения челленджа: ${e.message?.slice(0, 100)}`);
        return false;
    }
}

// Улучшенная human-like траектория движения мыши.
// Реальные люди двигают мышь НЕидеально:
// - Начальная пауза 150-400ms перед движением
// - Разгон нелинейный (quadratic)
// - Микро-коррекции траектории (sin-волна)
// - Jitter 2-5px (не 1.5px!)
// - Случайные паузы в середине движения
// - Финальная пауза 200-500ms перед отпусканием
// Общее время: 1200-2500ms (медленнее роботизированных 400-800ms)
export function buildTrajectory(startX, endX, steps = 28) {
    const pts = [];
    const distance = endX - startX;

    // 1. Начальная пауза (человек не начинает движение мгновенно)
    const startPause = 150 + Math.random() * 250;
    pts.push({ x: startX, delay: startPause });

    // 2. Фаза разгона (5-12 шагов) - quadratic acceleration
    const accelSteps = 5 + Math.floor(Math.random() * 8);
    for (let i = 1; i <= accelSteps; i++) {
        const t = i / (accelSteps + 15);
        const progress = t * t; // Quadratic acceleration
        const jitter = (Math.random() - 0.5) * 3.5; // Увеличенный jitter
        const x = startX + distance * progress + jitter;
        const delay = 20 + Math.random() * 35;
        pts.push({ x, delay });
    }

    // 3. Основная фаза с микро-коррекциями (10-25 шагов)
    const midSteps = 10 + Math.floor(Math.random() * 15);
    for (let i = 0; i < midSteps; i++) {
        const t = (accelSteps + 1 + i) / (accelSteps + midSteps + 10);
        // Sigmoid curve для естественного движения
        const progress = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
        // Микро-коррекции (затухающие к концу) - человек постоянно корректирует движение
        const correction = Math.sin(t * Math.PI * 3) * 2 * (1 - t);
        const jitter = (Math.random() - 0.5) * 2.5;
        const x = startX + distance * progress + correction + jitter;
        // Нерегулярные паузы (чаще в середине движения)
        const pauseChance = t > 0.35 && t < 0.65 ? 0.35 : 0.08;
        const delay = Math.random() < pauseChance
            ? 50 + Math.random() * 80  // Пауза 50-130ms
            : 12 + Math.random() * 28; // Обычное движение 12-40ms
        pts.push({ x, delay });
    }

    // 4. Фаза торможения (8-15 шагов)
    const decelSteps = 8 + Math.floor(Math.random() * 7);
    for (let i = 1; i <= decelSteps; i++) {
        const t = 1 - (i / decelSteps) * 0.15;
        const jitter = (Math.random() - 0.5) * 1.5;
        const x = startX + distance * t + jitter;
        const delay = 35 + Math.random() * 45; // Медленнее к концу
        pts.push({ x, delay });
    }

    // 5. Финальная пауза перед отпусканием (человек замирает перед release)
    pts.push({
        x: endX + (Math.random() - 0.5) * 0.5,
        delay: 250 + Math.random() * 350
    });

    // Нормализация: убираем точки, которые идут назад (nc детектит backtrack)
    const normalized = [];
    let prevX = startX;
    for (const pt of pts) {
        if (pt.x >= prevX - 0.3) { // Небольшой допуск на floating point
            normalized.push({ ...pt, x: Math.max(pt.x, prevX) });
            prevX = pt.x;
        }
    }

    return normalized;
}

// Коды отказа nc: BXMARK (поведенческая метка), BXFASTMARK (слишком быстро),
// FAIL (ошибка сервера). Возвращаем их из текста ошибки на странице.
async function readFailureCode(page) {
    return page.evaluate(() => {
        const el = document.querySelector('.nc_scale .errloading, .errloading');
        const text = el ? el.innerText : '';
        if (text.includes('Verified') || text.includes('SUCCESS')) return 'NONE';
        if (/fast|слишком быстро|太快|спершу/i.test(text)) return 'BXFASTMARK';
        if (text) return 'FAIL:' + text.slice(0, 40);
        const sig = document.querySelector('#nc-sig');
        return sig && sig.value ? 'SIG' : '';
    }).catch(() => '');
}

/** Ждём признака успеха: nc_sig заполнен или страница ушла с punish. */
async function waitForSuccess(page, timeoutMs = 8_000) {
    const deadline = Date.now() + timeoutMs;
    while (Date.now() < deadline) {
        const ok = await page.evaluate((sigSel) => {
            if (!location.href.includes('_____tmd_____') && !location.href.includes('/punish')) return true;
            const sig = document.querySelector(sigSel);
            if (sig && sig.value && sig.value.length > 10) return true;
            const container = document.querySelector('#baxia-punish');
            if (container) {
                const style = getComputedStyle(container);
                if (style.display === 'none' || style.visibility === 'hidden') return true;
            }
            return false;
        }, SUCCESS_SIG_SELECTOR).catch(() => false);
        if (ok) return true;
        await sleep(400);
    }
    return false;
}

/**
 * Перетаскивает ползунок слайдера в правый край трека человеческой траекторией.
 *
 * @param {import('puppeteer').Page} page
 * @param {object} [options]
 * @param {number} [options.maxAttempts] — попытки при неудаче
 * @returns {Promise<boolean>}
 */
/** Максимум ожидания появления ползунка (nc-скрипт грузится с CDN и
 *  внедряет слайдер после DOMContentLoaded; на медленных сетях это секунды). */
const SLIDER_APPEAR_TIMEOUT_MS = 15_000;

export async function solveSliderCaptcha(page, { maxAttempts = 3 } = {}) {
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        try {
            // Ползунок появляется не сразу — опрашиваем DOM до появления.
            let slider = await page.$(SLIDER_SELECTOR);
            const sliderDeadline = Date.now() + SLIDER_APPEAR_TIMEOUT_MS;
            while (!slider && Date.now() < sliderDeadline) {
                await sleep(300);
                slider = await page.$(SLIDER_SELECTOR);
            }
            if (!slider) {
                // Диагностика: что реально есть на странице вместо слайдера.
                const dump = await page.evaluate(() => {
                    const containers = ['#baxia-punish', '.nc-container', '.nc_wrapper', 'iframe'];
                    const found = {};
                    for (const sel of containers) {
                        const els = document.querySelectorAll(sel);
                        found[sel] = els.length;
                    }
                    return { url: location.href.slice(0, 80), title: document.title.slice(0, 60), found };
                }).catch(() => null);
                logWarn(`x5sec: ползунок ${SLIDER_SELECTOR} не найден за ${SLIDER_APPEAR_TIMEOUT_MS / 1000}с`);
                if (dump) logWarn(`x5sec: диагностика страницы: ${JSON.stringify(dump)}`);
                return false;
            }
            const box = await slider.boundingBox();
            const track = await page.$(TRACK_SELECTOR);
            const trackBox = track ? await track.boundingBox() : null;
            if (!box || box.width < 5) {
                logWarn('x5sec: ползунок без геометрии');
                return false;
            }

            const startX = box.x + box.width / 2;
            const startY = box.y + box.height / 2;
            // Ключевой момент: nc-скрипт считает успех по offset кнопки
            // a === S, где S = trackWidth - btnWidth (для нас 300-42=258px).
            // a = R + (clientX - clientX_mousedown), т.е. нужен clientX = startX + S.
            // Старая формула (правый край трека - btnW/2 - 2) давала 254px — 4px не хватало,
            // и mouseup сбрасывал кнопку (визуально: «проведите вправо» без результата).
            const trackWidth = trackBox ? trackBox.width : 300;
            const btnWidth = box.width;
            const S = trackWidth - btnWidth;
            let endX = startX + S + 3 + Math.random() * 4; // лёгкий переезд за край — clamp в nc сам упрётся в S
            if (trackBox) {
                // но не дальше правого края трека: t >= trackRight вызывает сброс в nc
                const trackRight = trackBox.x + trackBox.width;
                endX = Math.min(endX, trackRight - 3);
            }
            const distance = endX - startX;
            if (distance <= 10) {
                logWarn(`x5sec: дистанция подозрительно мала (${distance.toFixed(0)}px)`);
                return false;
            }

            logDebug(`x5sec: перетаскиваем ${distance.toFixed(0)}px (${startX.toFixed(0)} → ${endX.toFixed(0)}), S=${S}`);

            await page.mouse.move(startX, startY, { steps: 3 });
            await sleep(120 + Math.random() * 180);
            await page.mouse.down();
            await sleep(90 + Math.random() * 120);

            const trajectory = buildTrajectory(startX, endX);
            const t0 = Date.now();
            let prevX = startX;
            for (const pt of trajectory) {
                if (pt.x <= prevX + 0.01) continue; // не возвращаемся назад
                prevX = pt.x;
                const y = startY + (Math.random() - 0.5) * 2.4;
                await page.mouse.move(pt.x, y);
                await sleep(pt.delay);
            }
            // доводка до цели и «замирание» перед отпусканием
            await page.mouse.move(endX, startY + (Math.random() - 0.5) * 1.4);
            await sleep(200 + Math.random() * 250);
            await page.mouse.up();
            const totalMs = Date.now() - t0;
            logDebug(`x5sec: трасса за ${totalMs}мс`);

            const ok = await waitForSuccess(page);
            if (ok) {
                logInfo(`x5sec: слайдер решён (попытка ${attempt}/${maxAttempts}, ${totalMs}мс)`);
                return true;
            }
            const failCode = await readFailureCode(page);
            logWarn(`x5sec: попытка ${attempt}/${maxAttempts} не прошла (${failCode || 'без кода'}) — пробуем снова`);
            // перезагрузим страницу челленджа перед следующей попыткой (новый фон/токен)
            await page.reload({ waitUntil: 'domcontentloaded', timeout: 30_000 }).catch(() => {});
            await sleep(1500 + Math.random() * 1000);
        } catch (e) {
            logWarn(`x5sec: ошибка попытки ${attempt}: ${e.message?.slice(0, 100)}`);
            await sleep(800);
        }
    }
    return false;
}
