class LevelManager {
    constructor() {
        this.chapter = 1;
        this.level = 0;
        this.allLevelsComplete = false;

        this.bannerActive = false;
        this.bannerTimer = 0;
        this.bannerDuration = 0;
        this.bannerTitle = '';
        this.bannerSubtitle = '';
        this.bannerColor = '#fff';
        this.pendingStartLevel = false;
    }

    get totalLevels() {
        return CONFIG.LEVELS.length;
    }

    get currentLevelConfig() {
        return CONFIG.LEVELS[this.level] || null;
    }

    showBanner(title, subtitle, duration, color) {
        this.bannerActive = true;
        this.bannerTimer = duration;
        this.bannerDuration = duration;
        this.bannerTitle = title;
        this.bannerSubtitle = subtitle || '';
        this.bannerColor = color || '#fff';
    }

    showStageBanner() {
        const cfg = this.currentLevelConfig;
        const sub = cfg ? `怪物 ${cfg.count} 只` : '';
        this.showBanner(`第 ${this.chapter} 章 · 第 ${this.level + 1} 关`, sub, 2.2, '#fff');
    }

    beginFirstLevel() {
        this.showStageBanner();
        this.pendingStartLevel = true;
    }

    onLevelCleared() {
        this.showBanner('关卡通过!', '准备下一关...', 1.1, '#6f6');
    }

    update(dt) {
        if (!this.bannerActive) return null;

        this.bannerTimer -= dt;
        if (this.bannerTimer > 0) return null;

        this.bannerActive = false;

        if (this.pendingStartLevel) {
            this.pendingStartLevel = false;
            return 'START_LEVEL';
        }

        if (this.bannerTitle === '关卡通过!') {
            this.level++;
            if (this.level >= this.totalLevels) {
                this.allLevelsComplete = true;
                return 'ALL_COMPLETE';
            }
            this.showStageBanner();
            return 'START_LEVEL';
        }

        return null;
    }

    drawBanner(ctx, vp, uiScale) {
        if (!this.bannerActive) return;

        const s = uiScale || 1;
        const t = this.bannerTimer / this.bannerDuration;
        const fadeIn = Math.min(1, (1 - t) / 0.15);
        const fadeOut = Math.min(1, t / 0.25);
        const alpha = Math.min(fadeIn, fadeOut);

        const boxW = Math.min(vp.w - 24 * s, 340 * s);
        const boxH = (this.bannerSubtitle ? 72 : 52) * s;
        const x = vp.x + (vp.w - boxW) / 2;
        const y = vp.y + 72 * s;

        ctx.globalAlpha = alpha;
        ctx.fillStyle = 'rgba(58, 48, 38, 0.82)';
        ctx.strokeStyle = 'rgba(130, 100, 72, 0.65)';
        ctx.lineWidth = 2;
        if (typeof ctx.roundRect === 'function') {
            ctx.beginPath();
            ctx.roundRect(x, y, boxW, boxH, 10);
            ctx.fill();
            ctx.stroke();
        } else {
            ctx.fillRect(x, y, boxW, boxH);
            ctx.strokeRect(x, y, boxW, boxH);
        }

        drawGameText(ctx, this.bannerTitle, vp.cx, y + boxH * 0.38,
            Math.round(18 * s), this.bannerColor);

        if (this.bannerSubtitle) {
            drawGameText(ctx, this.bannerSubtitle, vp.cx, y + boxH * 0.72,
                Math.round(13 * s), '#8a7a6a');
        }

        ctx.globalAlpha = 1;
    }

    drawComplete(ctx, vp, uiScale) {
        ctx.fillStyle = 'rgba(0, 0, 0, 0.75)';
        ctx.fillRect(vp.x, vp.y, vp.w, vp.h);

        const s = uiScale || 1;
        drawGameText(ctx, '恭喜通关!', vp.cx, vp.y + vp.h * 0.44, Math.round(24 * s), '#8a6020');
        drawGameText(ctx, '第一章 全部完成', vp.cx, vp.y + vp.h * 0.54, Math.round(16 * s), '#4a4038');
        drawGameText(ctx, '点击屏幕重新开始', vp.cx, vp.y + vp.h * 0.64, Math.round(14 * s), '#7a6a5a');
    }
}
