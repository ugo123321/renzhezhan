class InputManager {
    constructor(canvas, game) {
        this.canvas = canvas;
        this.game = game;
        this.isDrawing = false;
        this.lastPoint = null;

        canvas.addEventListener('touchstart', (e) => this.onStart(e), { passive: false });
        canvas.addEventListener('touchmove', (e) => this.onMove(e), { passive: false });
        canvas.addEventListener('touchend', (e) => this.onEnd(e), { passive: false });
        canvas.addEventListener('touchcancel', (e) => this.onEnd(e), { passive: false });

        canvas.addEventListener('mousedown', (e) => this.onStart(e));
        canvas.addEventListener('mousemove', (e) => this.onMove(e));
        canvas.addEventListener('mouseup', (e) => this.onEnd(e));
    }

    _getClientPos(e) {
        if (e.touches && e.touches.length > 0) {
            return { clientX: e.touches[0].clientX, clientY: e.touches[0].clientY };
        }
        if (e.changedTouches && e.changedTouches.length > 0) {
            return { clientX: e.changedTouches[0].clientX, clientY: e.changedTouches[0].clientY };
        }
        return { clientX: e.clientX, clientY: e.clientY };
    }

    getPos(e) {
        const { clientX, clientY } = this._getClientPos(e);
        return this.game.renderer.screenToGame(clientX, clientY);
    }

    getCanvasPos(e) {
        const { clientX, clientY } = this._getClientPos(e);
        return this.game.renderer.screenToCanvas(clientX, clientY);
    }

    onStart(e) {
        if (this.game.state === 'PLAYING' && this.game.ui && this.game.player) {
            const pos = this.getCanvasPos(e);
            const vp = this.game.renderer.getViewport();
            const s = this.game.renderer.uiScale || 1;
            if (this.game.ui.isPauseButtonHit(pos.x, pos.y, vp, s)) {
                e.preventDefault();
                this.game.pauseGame();
                return;
            }
        }

        if (this.game.state !== 'PLAYING') return;

        e.preventDefault();
        const player = this.game.player;
        if (!player || player.state !== PlayerState.IDLE) return;

        const pos = this.getPos(e);
        if (!this.game.renderer.isGameInBounds(pos.x, pos.y)) return;

        const d = dist(pos.x, pos.y, player.homeX, player.homeY);
        if (d <= player.triggerRadius && player.ki > 10) {
            this.isDrawing = true;
            this.game.enterBulletTime();
            player.addPathPoint(player.homeX, player.homeY);
            player.addPathPoint(pos.x, pos.y);
            this.lastPoint = pos;
        }
    }

    onMove(e) {
        e.preventDefault();
        if (!this.isDrawing) return;
        const player = this.game.player;
        if (!player || player.state !== PlayerState.BULLET_TIME) return;
        if (player.ki <= 0) {
            this.onEnd(e);
            return;
        }

        const pos = this.getPos(e);
        if (!this.game.renderer.isGameInBounds(pos.x, pos.y)) return;

        player.addPathPoint(pos.x, pos.y);
        this.lastPoint = pos;
    }

    onEnd(e) {
        if (e) e.preventDefault();
        if (!this.isDrawing) return;
        this.isDrawing = false;
        const player = this.game.player;
        if (!player || player.state !== PlayerState.BULLET_TIME) return;
        this.game.exitBulletTime();
    }

    cancelActivePointer() {
        this.isDrawing = false;
        const player = this.game.player;
        if (!player || player.state !== PlayerState.BULLET_TIME) return;
        this.game.timeScale = CONFIG.NORMAL_TIME_SCALE;
        player.state = PlayerState.IDLE;
        player.attackPath = [];
    }
}
