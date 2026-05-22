class LevelManager {
    constructor() {
        this.level = 0;
        this.bannerActive = false;
        this.bannerTimer = 0;
        this.bannerDuration = 0;
        this.bannerTitle = '';
        this.bannerSubtitle = '';
        this.bannerColor = '#fff';

        this.stageIntro = null;
        this.clearFlash = null;
        this.failIntro = null;
    }

    startStageIntro(levelNum, onComplete, bossKey) {
        let bossName = null;
        if (bossKey === 'centipede' && CONFIG.BOSS && CONFIG.BOSS.CENTIPEDE) {
            bossName = CONFIG.BOSS.CENTIPEDE.name;
        }
        this.stageIntro = {
            levelNum,
            bossName,
            phase: 'slideIn',
            slideInDur: CONFIG.STAGE_INTRO_SLIDE_IN,
            holdDur: CONFIG.STAGE_INTRO_LABEL_HOLD,
            slideOutDur: CONFIG.STAGE_INTRO_SLIDE_OUT,
            phaseTimer: CONFIG.STAGE_INTRO_SLIDE_IN,
            onComplete,
        };
    }

    isStageIntroActive() {
        return this.stageIntro !== null;
    }

    updateStageIntro(dt) {
        if (!this.stageIntro) return;
        const intro = this.stageIntro;
        intro.phaseTimer -= dt;
        if (intro.phaseTimer > 0) return;

        if (intro.phase === 'slideIn') {
            intro.phase = 'hold';
            intro.phaseTimer = intro.holdDur;
        } else if (intro.phase === 'hold') {
            intro.phase = 'slideOut';
            intro.phaseTimer = intro.slideOutDur;
        } else {
            const cb = intro.onComplete;
            this.stageIntro = null;
            if (cb) cb();
        }
    }

    _getStageIntroTextX(intro, vp) {
        const centerX = vp.cx;
        const offScreen = vp.w * 0.42;
        if (intro.phase === 'slideIn') {
            const t = 1 - clamp(intro.phaseTimer / intro.slideInDur, 0, 1);
            return lerp(-offScreen, centerX, easeOutQuad(t));
        }
        if (intro.phase === 'hold') return centerX;
        const t = 1 - clamp(intro.phaseTimer / intro.slideOutDur, 0, 1);
        return lerp(centerX, vp.w + offScreen, easeInQuad(t));
    }

    _drawStageIntroText(ctx, text, x, y, fontSize, color) {
        const px = Math.max(8, Math.round(fontSize));
        ctx.font = `bold ${px}px ${GAME_FONT}`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = color;
        ctx.fillText(text, Math.floor(x), Math.floor(y));
    }

    drawStageIntro(ctx, vp, uiScale) {
        if (!this.stageIntro) return;
        const s = uiScale || 1;
        const intro = this.stageIntro;
        const labelY = Math.floor(vp.y + vp.h * 0.22);
        const textX = Math.floor(this._getStageIntroTextX(intro, vp));
        const fontSize = Math.round(14 * s);
        const text = `第${intro.levelNum}关`;

        ctx.save();
        ctx.imageSmoothingEnabled = false;
        this._drawStageIntroText(ctx, text, textX, labelY, fontSize, '#000000');
        if (intro.bossName) {
            const subSize = Math.round(11 * s);
            this._drawStageIntroText(ctx, intro.bossName, textX, labelY + Math.round(16 * s), subSize, '#000000');
        }
        ctx.restore();
    }

    showClearFlash(onMid) {
        this.clearFlash = {
            timer: CONFIG.STAGE_CLEAR_FLASH,
            duration: CONFIG.STAGE_CLEAR_FLASH,
            onMid,
            midDone: false,
        };
    }

    updateClearFlash(dt) {
        if (!this.clearFlash) return;
        const f = this.clearFlash;
        f.timer -= dt;
        const elapsed = f.duration - f.timer;
        if (!f.midDone && elapsed >= f.duration * 0.45) {
            f.midDone = true;
            if (f.onMid) f.onMid();
        }
        if (f.timer <= 0) this.clearFlash = null;
    }

    drawClearFlash(ctx, vp, uiScale) {
        if (!this.clearFlash) return;
        const s = uiScale || 1;
        const alpha = clamp(this.clearFlash.timer / this.clearFlash.duration, 0, 1);
        ctx.save();
        ctx.globalAlpha = alpha;
        drawPixelText(ctx, '关卡通过', vp.cx, vp.cy, Math.round(26 * s), '#ffd8a0');
        ctx.restore();
    }

    showFailIntro(onComplete) {
        this.failIntro = {
            labelTimer: CONFIG.STAGE_FAIL_LABEL_DURATION,
            labelDuration: CONFIG.STAGE_FAIL_LABEL_DURATION,
            overlayAlpha: 0,
            onComplete,
            completeCalled: false,
        };
    }

    isFailIntroActive() {
        return this.failIntro !== null;
    }

    updateFailIntro(dt) {
        if (!this.failIntro) return;
        const f = this.failIntro;
        if (f.labelTimer > 0) {
            f.labelTimer -= dt;
            if (f.labelTimer <= 0 && !f.completeCalled) {
                f.completeCalled = true;
                if (f.onComplete) f.onComplete();
            }
            return;
        }
        f.overlayAlpha = Math.min(1, f.overlayAlpha + dt / CONFIG.STAGE_FAIL_OVERLAY_FADE);
        if (f.overlayAlpha >= 1) this.failIntro = null;
    }

    drawFail(ctx, vp, s) {
        const intro = this.failIntro;
        const overlayA = intro ? intro.overlayAlpha : 1;
        const labelA = intro && intro.labelTimer > 0
            ? clamp(intro.labelTimer / intro.labelDuration, 0, 1)
            : 0;
        const labelY = vp.y + vp.h * 0.22;

        if (overlayA > 0) {
            ctx.fillStyle = `rgba(0, 0, 0, ${0.72 * overlayA})`;
            ctx.fillRect(vp.x, vp.y, vp.w, vp.h);
        }

        if (labelA > 0) {
            const text = '挑战失败';
            const size = Math.round(24 * s);
            ctx.save();
            ctx.globalAlpha = labelA;
            ctx.imageSmoothingEnabled = false;
            ctx.font = `bold ${size}px ${GAME_FONT}`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillStyle = 'rgba(255, 220, 210, 0.9)';
            ctx.fillText(text, Math.floor(vp.cx) + 1, Math.floor(labelY) + 1);
            ctx.fillStyle = '#8a2820';
            ctx.fillText(text, Math.floor(vp.cx), Math.floor(labelY));
            ctx.restore();
        }

        if (overlayA > 0.35) {
            const msgA = easeOutQuad(clamp((overlayA - 0.35) / 0.65, 0, 1));
            const pop = 0.88 + 0.12 * msgA;
            const cy = vp.y + vp.h * 0.44;
            ctx.save();
            ctx.globalAlpha = msgA;
            ctx.translate(vp.cx, cy);
            ctx.scale(pop, pop);
            ctx.translate(-vp.cx, -cy);
            drawPixelText(ctx, '体力耗尽', vp.cx, cy, Math.round(20 * s), '#ff9c84');
            drawPixelText(ctx, '点击屏幕重新挑战', vp.cx, cy + 28 * s, Math.round(13 * s), '#f4e8da');
            ctx.restore();
        }
    }

    showBanner(title, subtitle, duration, color = '#fff') {
        this.bannerActive = true;
        this.bannerTimer = duration;
        this.bannerDuration = duration;
        this.bannerTitle = title;
        this.bannerSubtitle = subtitle || '';
        this.bannerColor = color;
    }

    beginFirstLevel() {}

    showStageBanner() {
        // Replaced by stage intro countdown
    }

    onLevelCleared() {}

    update(dt) {
        this.updateStageIntro(dt);
        this.updateClearFlash(dt);
        this.updateFailIntro(dt);
        if (!this.bannerActive) return false;
        this.bannerTimer -= dt;
        if (this.bannerTimer > 0) return false;
        this.bannerActive = false;
        return true;
    }

    drawBanner(ctx, vp, uiScale) {
        if (!this.bannerActive) return;
        const s = uiScale || 1;
        const alpha = clamp(this.bannerTimer / this.bannerDuration, 0, 1);
        const boxW = Math.min(vp.w - 28 * s, 340 * s);
        const boxH = (this.bannerSubtitle ? 72 : 54) * s;
        const x = vp.x + (vp.w - boxW) / 2;
        const y = vp.y + 86 * s;
        ctx.save();
        ctx.globalAlpha = alpha;
        drawPixelPanel(ctx, x, y, boxW, boxH, 'rgba(44,34,26,0.92)', 'rgba(168,132,96,0.85)', 2);
        drawPixelText(ctx, this.bannerTitle, vp.cx, y + boxH * 0.38, Math.round(18 * s), this.bannerColor);
        if (this.bannerSubtitle) {
            drawPixelText(ctx, this.bannerSubtitle, vp.cx, y + boxH * 0.72, Math.round(12 * s), '#c8b8a6');
        }
        ctx.restore();
    }

    drawComplete(ctx, vp, s) {
        ctx.fillStyle = 'rgba(0,0,0,0.72)';
        ctx.fillRect(vp.x, vp.y, vp.w, vp.h);
        drawPixelText(ctx, '你完成了全部关卡', vp.cx, vp.y + vp.h * 0.44, Math.round(22 * s), '#ffd8a0');
        drawPixelText(ctx, '点击屏幕重新开始', vp.cx, vp.y + vp.h * 0.58, Math.round(14 * s), '#f4e8da');
    }
}
