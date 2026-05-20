class InputManager {
    constructor(canvas, game) {
        this.canvas = canvas;
        this.game = game;
        this.isDrawing = false;

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

    getPos(e) {
        const { clientX, clientY } = this._getClientPos(e);
        return this.game.renderer.screenToGame(clientX, clientY);
    }

    onStart(e) {
        if (this.game.state !== 'PLAYING') return;
        e.preventDefault();
        const player = this.game.player;
        if (!player || player.state !== PlayerState.IDLE) return;

        const pos = this.getPos(e);
        if (!this.game.renderer.isGameInBounds(pos.x, pos.y)) return;
        if (dist(pos.x, pos.y, player.homeX, player.homeY) > player.triggerRadius) return;
        if (player.ki <= 0) return;

        this.isDrawing = true;
        this.game.enterBulletTime();
        player.startBulletTime();
        player.addPathPoint(player.homeX, player.homeY);
        player.addPathPoint(pos.x, pos.y);
        this._checkPathOrbs(player);
    }

    _checkPathOrbs(player) {
        const path = player.attackPath;
        if (path.length < 2) return;
        const from = path[path.length - 2];
        const to = path[path.length - 1];
        this.game.buffOrbs.checkPathSegment(from, to);
    }

    onMove(e) {
        if (!this.isDrawing) return;
        e.preventDefault();
        const player = this.game.player;
        if (!player || player.state !== PlayerState.BULLET_TIME) return;
        const pos = this.getPos(e);
        if (!this.game.renderer.isGameInBounds(pos.x, pos.y)) return;
        const last = player.attackPath[player.attackPath.length - 1];
        if (!last) return;
        const step = dist(last.x, last.y, pos.x, pos.y);
        if (step < 2) return;

        if (!player.consumeKiByDistance(step)) {
            this.isDrawing = false;
            this.game.exitBulletTime(false);
            return;
        }
        player.addPathPoint(pos.x, pos.y);
        this._checkPathOrbs(player);
    }

    onEnd(e) {
        if (!this.isDrawing) return;
        if (e) e.preventDefault();
        this.isDrawing = false;
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
        const player = this.game.player;
        if (!player || player.state !== PlayerState.BULLET_TIME) return;
        this.game.timeScale = CONFIG.NORMAL_TIME_SCALE;
        this.game.endBulletTimeDim();
        player.invalidatePath();
    }
}
