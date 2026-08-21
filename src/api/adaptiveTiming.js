// adaptiveTiming.js
// Умный jitter на основе истории запросов.
// Чем больше запросов было недавно, тем длиннее пауза - эмуляция человеческого поведения.

class AdaptiveRequestTimer {
    constructor() {
        this.requestHistory = [];
        this.baseInterval = 3000; // 3 секунды база
        this.maxHistoryWindow = 300000; // 5 минут хранения истории
        this.recentWindow = 60000; // 1 минута для "недавних" запросов
    }

    async getNextDelay() {
        const now = Date.now();

        // Анализируем историю запросов за последнюю минуту
        const recentRequests = this.requestHistory.filter(
            t => now - t < this.recentWindow
        );

        // Чем больше запросов было недавно, тем длиннее пауза
        let multiplier = 1;
        if (recentRequests.length > 3) multiplier = 1.5;
        if (recentRequests.length > 6) multiplier = 2.5;
        if (recentRequests.length > 10) multiplier = 4;
        if (recentRequests.length > 15) multiplier = 8;

        // Exponential backoff с рандомизацией
        const baseDelay = this.baseInterval * multiplier;
        const jitter = baseDelay * 0.4 * Math.random(); // +/- 40% рандомизация
        const delay = baseDelay + jitter;

        // Сохраняем в историю
        this.requestHistory.push(now);

        // Очищаем старую историю
        this.requestHistory = this.requestHistory.filter(
            t => now - t < this.maxHistoryWindow
        );

        return delay;
    }

    // Сброс истории (после успешного решения капчи или долгого простоя)
    reset() {
        this.requestHistory = [];
    }

    // Получить статистику запросов
    getStats() {
        const now = Date.now();
        const recent = this.requestHistory.filter(t => now - t < this.recentWindow).length;
        const total = this.requestHistory.length;
        return {
            recentRequests: recent,
            totalTracked: total,
            currentMultiplier: recent > 15 ? 8 : recent > 10 ? 4 : recent > 6 ? 2.5 : recent > 3 ? 1.5 : 1
        };
    }
}

export const adaptiveTimer = new AdaptiveRequestTimer();
