class Renderer {
    constructor(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.shakeX = 0;
        this.shakeY = 0;
        this.shakeMag = 0;
        this.shakeDur = 0;
        this.shakeTimer = 0;
        this.resize();
    }

    resize() {
        const logicalW = CONFIG.DISPLAY.LOGICAL_WIDTH;
        const logicalH = CONFIG.DISPLAY.LOGICAL_HEIGHT;
        const vv = window.visualViewport;

        this.canvas.style.width = '100%';
        this.canvas.style.height = '100%';

        const layoutW = vv ? vv.width : (window.innerWidth || document.documentElement.clientWidth || logicalW);
        const layoutH = vv ? vv.height : (window.innerHeight || document.documentElement.clientHeight || logicalH);
        const rect = this.canvas.getBoundingClientRect();
        const screenW = Math.max(rect.width || layoutW, logicalW);
        const screenH = Math.max(rect.height || layoutH, logicalH);
        this.dpr = Math.min(window.devicePixelRatio || 1, 2.5);

        this.canvas.width = Math.round(screenW * this.dpr);
        this.canvas.height = Math.round(screenH * this.dpr);

        this.screenW = screenW;
        this.screenH = screenH;
        this.logicalW = logicalW;
        this.logicalH = logicalH;
        this.w = logicalW;
        this.h = logicalH;

        this.scale = Math.min(screenW / logicalW, screenH / logicalH);
        this.offsetX = (screenW - logicalW * this.scale) / 2;
        this.offsetY = (screenH - logicalH * this.scale) / 2;
        this.uiScale = Math.max(1, this.scale * 0.92);
        this.viewportW = logicalW * this.scale;
        this.viewportH = logicalH * this.scale;

        this.ctx.imageSmoothingEnabled = true;
    }

    /** Map pointer (client) coords to canvas layout space (matches viewport / upgrade UI). */
    screenToCanvas(clientX, clientY) {
        const rect = this.canvas.getBoundingClientRect();
        const scaleX = rect.width > 0 ? this.screenW / rect.width : 1;
        const scaleY = rect.height > 0 ? this.screenH / rect.height : 1;
        return {
            x: (clientX - rect.left) * scaleX,
            y: (clientY - rect.top) * scaleY,
        };
    }

    getViewport() {
        return {
            x: this.offsetX,
            y: this.offsetY,
            w: this.viewportW,
            h: this.viewportH,
            cx: this.offsetX + this.viewportW / 2,
            cy: this.offsetY + this.viewportH / 2,
        };
    }

    isScreenInViewport(sx, sy) {
        const vp = this.getViewport();
        return sx >= vp.x && sx <= vp.x + vp.w &&
            sy >= vp.y && sy <= vp.y + vp.h;
    }

    clipViewport(ctx) {
        const vp = this.getViewport();
        ctx.beginPath();
        ctx.rect(vp.x, vp.y, vp.w, vp.h);
        ctx.clip();
        return vp;
    }

    screenToGame(clientX, clientY) {
        const { x: sx, y: sy } = this.screenToCanvas(clientX, clientY);
        return {
            x: (sx - this.offsetX) / this.scale,
            y: (sy - this.offsetY) / this.scale,
        };
    }

    isGameInBounds(gx, gy) {
        return gx >= 0 && gx <= this.w && gy >= 0 && gy <= this.h;
    }

    /** Layout-space transform: CSS pixels → backing store (call before clip/UI). */
    applyLayoutTransform() {
        this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    }

    beginGameDraw() {
        const d = this.dpr;
        this.ctx.setTransform(
            this.scale * d, 0, 0, this.scale * d,
            (this.offsetX + this.shakeX) * d,
            (this.offsetY + this.shakeY) * d
        );
    }

    resetScreenDraw() {
        this.applyLayoutTransform();
    }

    shake(magnitude, duration) {
        if (magnitude > this.shakeMag) {
            this.shakeMag = magnitude;
            this.shakeDur = duration;
            this.shakeTimer = duration;
        }
    }

    shakeAttackHit(isCrit, combo = 1) {
        const base = isCrit ? CONFIG.SHAKE.CRIT : CONFIG.SHAKE.NORMAL;
        const bonus = Math.min(
            CONFIG.SHAKE.COMBO_MAG_CAP,
            Math.max(0, combo - 1) * CONFIG.SHAKE.COMBO_MAG_PER_HIT
        );
        this.shake(base.magnitude + bonus, base.duration);
    }

    updateShake(dt) {
        if (this.shakeTimer > 0) {
            this.shakeTimer -= dt;
            const intensity = this.shakeTimer / this.shakeDur;
            this.shakeX = (Math.random() - 0.5) * 2 * this.shakeMag * intensity;
            this.shakeY = (Math.random() - 0.5) * 2 * this.shakeMag * intensity;
            if (this.shakeTimer <= 0) {
                this.shakeX = 0;
                this.shakeY = 0;
                this.shakeMag = 0;
            }
        }
    }

    clear() {
        const ctx = this.ctx;
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.fillStyle = '#9a8b78';
        ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    }

    beginClippedGameDraw() {
        this.ctx.save();
        this.applyLayoutTransform();
        this.clipViewport(this.ctx);
        this.beginGameDraw();
        this.drawBackground();
    }

    endClippedGameDraw() {
        this.ctx.restore();
    }

    drawBackground() {
        const ctx = this.ctx;
        const base = '#ebe3d3';
        ctx.fillStyle = base;
        ctx.fillRect(0, 0, this.w, this.h);

        const grad = ctx.createRadialGradient(
            this.w * 0.5, this.h * 0.45, this.w * 0.1,
            this.w * 0.5, this.h * 0.5, this.w * 0.85
        );
        grad.addColorStop(0, 'rgba(255, 252, 245, 0.35)');
        grad.addColorStop(1, 'rgba(180, 165, 140, 0.08)');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, this.w, this.h);
    }

    applyBulletTimeEffect(active) {
        if (!active) return;
        this.ctx.fillStyle = 'rgba(38, 30, 24, 0.48)';
        this.ctx.fillRect(-10, -10, this.w + 20, this.h + 20);
        this.ctx.fillStyle = 'rgba(18, 12, 8, 0.15)';
        this.ctx.fillRect(-10, -10, this.w + 20, this.h + 20);
    }
}
