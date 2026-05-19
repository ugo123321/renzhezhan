class Game {
    constructor() {
        this.canvas = document.getElementById('gameCanvas');
        this.renderer = new Renderer(this.canvas);
        this.ctx = this.renderer.ctx;

        this.state = 'MENU';
        this.timeScale = CONFIG.NORMAL_TIME_SCALE;
        this.lastTime = 0;

        this.player = null;
        this.spawner = new MonsterSpawner();
        this.projectiles = new ProjectileManager();
        this.particles = new ParticleSystem(600);
        this.combat = new CombatManager(this);
        this.experience = new ExperienceManager();
        this.upgrades = new UpgradeManager();
        this.levelManager = new LevelManager();
        this.ui = new UI();
        this.audio = new AudioHooks();
        this.bloodStains = new BloodStainSystem();
        this.input = null;

        this.levelCleared = false;
        this.pendingLevelUp = false;
        this._lastTouchUiTime = 0;

        this.upgrades.onSelect = () => {
            this.pendingLevelUp = false;
            this.state = 'PLAYING';
        };

        this.canvas.addEventListener('click', (e) => this.onClick(e));
        this.canvas.addEventListener('touchstart', (e) => {
            if (this.state === 'MENU' || this.state === 'GAME_OVER' ||
                this.state === 'COMPLETE' || this.state === 'LEVEL_UP') {
                e.preventDefault();
                if (this.state !== 'LEVEL_UP') {
                    this.onClick(e);
                }
            }
        }, { passive: false });
        this.canvas.addEventListener('touchend', (e) => {
            if (this.state === 'LEVEL_UP') {
                e.preventDefault();
                this._lastTouchUiTime = performance.now();
                this.onClick(e);
            }
        }, { passive: false });
        this.canvas.addEventListener('contextmenu', (e) => e.preventDefault());
        document.addEventListener('gesturestart', (e) => e.preventDefault(), { passive: false });
        document.addEventListener('gesturechange', (e) => e.preventDefault(), { passive: false });
        document.addEventListener('gestureend', (e) => e.preventDefault(), { passive: false });

        window.addEventListener('resize', () => {
            this.renderer.resize();
            if (this.player) {
                this.player.homeX = this.renderer.w / 2;
                this.player.homeY = this.renderer.h / 2;
                if (this.player.state === PlayerState.IDLE) {
                    this.player.x = this.player.homeX;
                    this.player.y = this.player.homeY;
                }
            }
        });

        this.lastTime = performance.now();
        requestAnimationFrame((t) => this.loop(t));
    }

    onClick(e) {
        if (e.type === 'click' && performance.now() - this._lastTouchUiTime < 400) {
            return;
        }

        const pos = this.getClickPos(e);

        if (this.state === 'MENU') {
            this.startGame();
            return;
        }

        if (this.state === 'GAME_OVER' || this.state === 'COMPLETE') {
            this.startGame();
            return;
        }

        if (this.state === 'LEVEL_UP') {
            const idx = this.upgrades.handleClick(pos.x, pos.y);
            if (idx >= 0) {
                this.upgrades.selectUpgrade(idx, this.player);
            }
        }
    }

    getClickPos(e) {
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
        return this.renderer.screenToCanvas(clientX, clientY);
    }

    startGame() {
        const cx = this.renderer.w / 2;
        const cy = this.renderer.h / 2;
        this.player = new Player(cx, cy);
        this.spawner = new MonsterSpawner();
        this.projectiles = new ProjectileManager();
        this.particles = new ParticleSystem(600);
        this.combat = new CombatManager(this);
        this.experience = new ExperienceManager();
        this.upgrades = new UpgradeManager();
        this.levelManager = new LevelManager();
        this.audio = new AudioHooks();
        this.bloodStains = new BloodStainSystem();
        this.levelCleared = false;
        this.pendingLevelUp = false;

        this.upgrades.onSelect = () => {
            this.pendingLevelUp = false;
            this.state = 'PLAYING';
        };

        if (!this.input) {
            this.input = new InputManager(this.canvas, this);
        } else {
            this.input.game = this;
        }

        this.state = 'PLAYING';
        this.levelManager.beginFirstLevel();
    }

    enterBulletTime() {
        this.timeScale = CONFIG.BULLET_TIME_SCALE;
        this.player.startBulletTime();
    }

    exitBulletTime() {
        this.timeScale = CONFIG.NORMAL_TIME_SCALE;
        this.player.startAttack();
        this.audio.playSlash();
    }

    loop(now) {
        const realDt = Math.min((now - this.lastTime) / 1000, 0.05);
        this.lastTime = now;
        const dt = realDt * this.timeScale;

        this.update(dt, realDt);
        this.draw();

        requestAnimationFrame((t) => this.loop(t));
    }

    update(dt, realDt) {
        if (this.state === 'MENU' || this.state === 'GAME_OVER' ||
            this.state === 'COMPLETE') return;

        this.renderer.updateShake(realDt);

        if (this.state === 'LEVEL_UP') {
            this.particles.update(realDt);
            return;
        }

        if (this.state === 'PLAYING' || this.state === 'BULLET_TIME') {
            const levelEvent = this.levelManager.update(realDt);
            if (levelEvent === 'START_LEVEL') {
                this.levelCleared = false;
                this.spawner.prepareLevelSpawns(
                    this.levelManager.level, this.renderer.w, this.renderer.h);
            } else if (levelEvent === 'ALL_COMPLETE') {
                this.state = 'COMPLETE';
                return;
            }

            const isBulletTime = this.player.state === PlayerState.BULLET_TIME;

            this.player.update(dt, realDt);

            const prevMonsterCount = this.spawner.monsters.length;
            this.spawner.update(dt);
            for (let i = prevMonsterCount; i < this.spawner.monsters.length; i++) {
                const m = this.spawner.monsters[i];
                this.particles.spawnEffect(m.x, m.y, m.color);
            }

            this.projectiles.update(dt, this.renderer.w, this.renderer.h);
            this.combat.update(dt);
            this.particles.update(realDt);

            if (this.player.state === PlayerState.ATTACKING) {
                const nextIdx = Math.min(this.player.pathIndex + 1, this.player.attackPath.length - 1);
                const a = this.player.attackPath.length > 1
                    ? angle(this.player.x, this.player.y,
                        this.player.attackPath[nextIdx].x, this.player.attackPath[nextIdx].y)
                    : 0;
                this.particles.slashTrail(this.player.x, this.player.y, a);
            }

            const xpGained = this.experience.update(
                dt, this.player.x, this.player.y, CONFIG.PLAYER.MAGNET_RADIUS);
            if (xpGained > 0) {
                this.particles.xpPickup(this.player.x, this.player.y);
                const leveledUp = this.player.addXP(xpGained);
                if (leveledUp) {
                    this.pendingLevelUp = true;
                }
            }

            if (this.pendingLevelUp && this.player.state === PlayerState.IDLE) {
                this.state = 'LEVEL_UP';
                this.upgrades.generateChoices();
                this.audio.playLevelUp();
                return;
            }

            if (this.player.isDead()) {
                this.state = 'GAME_OVER';
                return;
            }

            if (!this.levelCleared && !this.levelManager.bannerActive && this.spawner.allClear()) {
                this.levelCleared = true;
                this.levelManager.onLevelCleared();
            }
        }
    }

    draw() {
        const ctx = this.ctx;
        const w = this.renderer.w;
        const h = this.renderer.h;

        this.renderer.clear();
        this.renderer.beginClippedGameDraw();

        if (this.state === 'MENU') {
            this.renderer.endClippedGameDraw();
            this.drawMenu();
            return;
        }

        if (this.state === 'GAME_OVER') {
            this.renderer.endClippedGameDraw();
            this.drawGameOver();
            return;
        }

        if (this.state === 'COMPLETE') {
            this.renderer.endClippedGameDraw();
            this.renderer.resetScreenDraw();
            const vp = this.renderer.getViewport();
            this.levelManager.drawComplete(ctx, vp, this.renderer.uiScale);
            return;
        }

        const isBulletTime = this.player && this.player.state === PlayerState.BULLET_TIME;

        this.bloodStains.draw(ctx);
        this.experience.draw(ctx);

        for (const m of this.spawner.monsters) {
            m.draw(ctx);
        }

        this.projectiles.draw(ctx);

        if (isBulletTime) {
            this.renderer.applyBulletTimeEffect(true);
        }

        if (this.player) {
            this.player.drawTriggerZone(ctx);
            if (isBulletTime || this.player.state === PlayerState.ATTACKING) {
                this.player.drawPath(ctx);
            }
            this.player.draw(ctx);
        }

        this.particles.draw(ctx);
        this.combat.drawDamageNumbers(ctx);

        this.renderer.endClippedGameDraw();
        this.renderer.resetScreenDraw();
        const vp = this.renderer.getViewport();
        const uiScale = this.renderer.uiScale;

        ctx.save();
        this.renderer.clipViewport(ctx);

        if (this.player) {
            this.ui.draw(ctx, this.player, vp, uiScale);
        }

        this.levelManager.drawBanner(ctx, vp, uiScale);

        if (this.state === 'LEVEL_UP') {
            this.upgrades.drawUI(ctx, vp, uiScale);
        }

        ctx.restore();
    }

    drawScreenText(ctx, vp, lines) {
        for (const line of lines) {
            const size = Math.round(line.size * (this.renderer.uiScale || 1));
            const y = typeof line.y === 'number' && line.y <= 1
                ? vp.y + vp.h * line.y
                : line.y;
            drawGameText(ctx, line.text, vp.cx, y, size, line.color);
        }
    }

    drawMenu() {
        const ctx = this.ctx;
        const vp = this.renderer.getViewport();

        this.renderer.resetScreenDraw();

        this.drawScreenText(ctx, vp, [
            { text: '忍者斩', y: 0.38, size: 40, bold: true, color: '#3a3028' },
            { text: 'NINJA SLASH', y: 0.45, size: 16, bold: false, color: '#6a5a48' },
            { text: '点击屏幕开始', y: 0.56, size: 18, bold: false, color: '#5a5048' },
            { text: '点击忍者身边的圆圈', y: 0.64, size: 15, bold: false, color: '#7a6a58' },
            { text: '画出攻击路径来消灭怪物', y: 0.70, size: 15, bold: false, color: '#7a6a58' },
        ]);
    }

    drawGameOver() {
        const ctx = this.ctx;
        const vp = this.renderer.getViewport();

        this.renderer.resetScreenDraw();

        ctx.save();
        this.renderer.clipViewport(ctx);
        ctx.fillStyle = 'rgba(0, 0, 0, 0.55)';
        ctx.fillRect(vp.x, vp.y, vp.w, vp.h);
        ctx.restore();

        this.drawScreenText(ctx, vp, [
            { text: '游戏结束', y: 0.42, size: 36, bold: true, color: '#f66' },
            { text: `到达: 第${this.levelManager.level + 1}关 | 等级: ${this.player.level}`, y: 0.52, size: 16, bold: false, color: '#fff' },
            { text: '点击屏幕重新开始', y: 0.62, size: 18, bold: false, color: '#aaa' },
        ]);
    }
}

window.addEventListener('DOMContentLoaded', () => {
    new Game();
});
