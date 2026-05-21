class VirtualJoystick {
    constructor(game) {
        this.game = game;
        this.active = false;
        this.baseX = 0;
        this.baseY = 0;
        this.stickOffsetX = 0;
        this.stickOffsetY = 0;
        this._syncDefaultBase();
    }

    _syncDefaultBase() {
        const r = this.game.renderer;
        const ui = this.game.ui;
        const playBottom = ui.getPlayAreaBottom
            ? ui.getPlayAreaBottom(r.h, r.uiScale)
            : r.h;
        const offset = (CONFIG.JOYSTICK.DEFAULT_BOTTOM_OFFSET || 72) * r.uiScale;
        this.defaultX = r.w / 2;
        this.defaultY = playBottom - offset;
        if (!this.active) {
            this.baseX = this.defaultX;
            this.baseY = this.defaultY;
        }
    }

    resetToDefault() {
        this.active = false;
        this.stickOffsetX = 0;
        this.stickOffsetY = 0;
        this._syncDefaultBase();
    }

    beginAt(clientX, clientY) {
        this._syncDefaultBase();
        const pos = this.game.renderer.screenToGame(clientX, clientY);
        this.baseX = pos.x;
        this.baseY = pos.y;
        this.active = true;
        this._updateStick(clientX, clientY);
    }

    move(clientX, clientY) {
        if (!this.active) return;
        this._updateStick(clientX, clientY);
    }

    end() {
        this.resetToDefault();
    }

    _updateStick(clientX, clientY) {
        const pos = this.game.renderer.screenToGame(clientX, clientY);
        let dx = pos.x - this.baseX;
        let dy = pos.y - this.baseY;
        const max = CONFIG.JOYSTICK.MAX_OFFSET || 46;
        const len = Math.hypot(dx, dy);
        if (len > max) {
            dx = (dx / len) * max;
            dy = (dy / len) * max;
        }
        this.stickOffsetX = dx;
        this.stickOffsetY = dy;
    }

    getDirection() {
        const len = Math.hypot(this.stickOffsetX, this.stickOffsetY);
        const dead = CONFIG.JOYSTICK.DEAD_ZONE || 10;
        if (len < dead) return null;
        return { x: this.stickOffsetX / len, y: this.stickOffsetY / len };
    }

    draw(ctx) {
        this._syncDefaultBase();
        const cfg = CONFIG.JOYSTICK;
        const baseR = cfg.BASE_RADIUS || 52;
        const stickR = cfg.STICK_RADIUS || 22;
        const alpha = this.active ? 0.92 : 0.55;
        const stickX = this.baseX + this.stickOffsetX;
        const stickY = this.baseY + this.stickOffsetY;

        ctx.save();
        ctx.globalAlpha = alpha * 0.35;
        ctx.fillStyle = '#1a2430';
        ctx.beginPath();
        ctx.arc(this.baseX, this.baseY, baseR, 0, Math.PI * 2);
        ctx.fill();

        ctx.globalAlpha = alpha * 0.55;
        ctx.strokeStyle = '#8aa0b8';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(this.baseX, this.baseY, baseR, 0, Math.PI * 2);
        ctx.stroke();

        ctx.globalAlpha = alpha;
        ctx.fillStyle = '#d8e4f0';
        ctx.beginPath();
        ctx.arc(stickX, stickY, stickR, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#5a7088';
        ctx.lineWidth = 2;
        ctx.stroke();
        ctx.restore();
    }
}

class InputManager {
    constructor(canvas, game) {
        this.canvas = canvas;
        this.game = game;
        this.isDrawing = false;
        this.joystick = new VirtualJoystick(game);

        canvas.addEventListener('touchstart', (e) => this.onStart(e), { passive: false });
        canvas.addEventListener('touchmove', (e) => this.onMove(e), { passive: false });
        canvas.addEventListener('touchend', (e) => this.onEnd(e), { passive: false });
        canvas.addEventListener('touchcancel', (e) => this.onEnd(e), { passive: false });

        canvas.addEventListener('mousedown', (e) => this.onStart(e));
        canvas.addEventListener('mousemove', (e) => this.onMove(e));
        canvas.addEventListener('mouseup', (e) => this.onEnd(e));
    }

    _getClientPos(e) {
        if (e.touches && e.touches.length > 0) return { clientX: e.touches[0].clientX, clientY: e.touches[0].clientY };
        if (e.changedTouches && e.changedTouches.length > 0) return { clientX: e.changedTouches[0].clientX, clientY: e.changedTouches[0].clientY };
        return { clientX: e.clientX, clientY: e.clientY };
    }

    onStart(e) {
        if (this.game.state !== 'PLAYING') return;
        e.preventDefault();
        const player = this.game.player;
        if (!player || player.state !== PlayerState.IDLE) return;
        if (player.ki <= 0 || player.hp <= 0) return;

        const { clientX, clientY } = this._getClientPos(e);
        this.isDrawing = true;
        this.joystick.beginAt(clientX, clientY);
        this.game.enterBulletTime();
        player.startBulletTime();
    }

    onMove(e) {
        if (!this.isDrawing) return;
        e.preventDefault();
        const player = this.game.player;
        if (!player || player.state !== PlayerState.BULLET_TIME) return;
        const { clientX, clientY } = this._getClientPos(e);
        this.joystick.move(clientX, clientY);
    }

    onEnd(e) {
        if (!this.isDrawing) return;
        if (e) e.preventDefault();
        this.isDrawing = false;
        this.joystick.end();
        const player = this.game.player;
        if (!player || player.state !== PlayerState.BULLET_TIME) return;
        if (player.attackPath.length < 2) {
            this.game.exitBulletTime(true);
            player.invalidatePath();
            return;
        }
        this.game.exitBulletTime(false);
    }

    cancelActivePointer() {
        this.isDrawing = false;
        this.joystick.resetToDefault();
        const player = this.game.player;
        if (!player || player.state !== PlayerState.BULLET_TIME) return;
        this.game.timeScale = CONFIG.NORMAL_TIME_SCALE;
        this.game.endBulletTimeDim();
        player.invalidatePath();
    }
}
