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

    getPos(e) {
        let clientX;
        let clientY;
        if (e.touches && e.touches.length > 0) {
            clientX = e.touches[0].clientX;
            clientY = e.touches[0].clientY;
        } else if (e.changedTouches && e.changedTouches.length > 0) {
            clientX = e.changedTouches[0].clientX;
            clientY = e.changedTouches[0].clientY;
        } else {
            clientX = e.clientX;
            clientY = e.clientY;
        }
        return this.game.renderer.screenToGame(clientX, clientY);
    }

    onStart(e) {
        e.preventDefault();
        const player = this.game.player;
        if (!player || player.state !== PlayerState.IDLE) return;
        if (this.game.state !== 'PLAYING') return;

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
}
