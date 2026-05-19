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
        this.bossRewards = new BossRewardManager();
        this.bossChests = new BossChestManager(this);
        this.levelManager = new LevelManager();
        this.ui = new UI();
        this.audio = new AudioHooks();
        this.bloodStains = new BloodStainSystem();
        this.abilities = new AbilityManager(this);
        this.sakura = new SakuraSystem();
        this.grass = new GrassSystem();
        this.bossManager = new BossManager(this);
        this.input = null;

        this.levelCleared = false;
        this.pendingLevelUpCount = 0;
        this._lastTouchUiTime = 0;
        this._overlayDismissPending = false;
        this._overlayGestureActive = false;
        this._pointerDown = false;
        this.pauseOverlay = {
            passwordMode: false,
            passwordInput: '',
            debugUnlocked: false,
            debugLevelInput: '1',
            debugChapterInput: '1',
            debugStageInput: '1',
        };

        const trackPointerDown = () => { this._pointerDown = true; };
        const trackPointerUp = () => { this._pointerDown = false; };
        this.canvas.addEventListener('touchstart', trackPointerDown, { passive: true });
        this.canvas.addEventListener('mousedown', trackPointerDown);
        this.canvas.addEventListener('touchend', trackPointerUp, { passive: true });
        this.canvas.addEventListener('touchcancel', trackPointerUp);
        this.canvas.addEventListener('mouseup', trackPointerUp);

        this.upgrades.onSelect = () => this._finishRewardOverlay();
        this.bossRewards.onSelect = () => this._finishRewardOverlay();

        const overlayDown = (e) => {
            if (this.state === 'PLAYING' && this.ui && this.player) {
                const pos = this.getClickPos(e);
                const vp = this.renderer.getViewport();
                const s = this.renderer.uiScale || 1;
                if (this.ui.isPauseButtonHit(pos.x, pos.y, vp, s)) {
                    if (e.cancelable) e.preventDefault();
                    this.pauseGame();
                    return;
                }
            }
            if (this._isOverlayState()) this._onOverlayPointerDown(e);
        };
        const overlayUp = (e) => {
            if (this._isOverlayState()) this._onOverlayPointerUp(e);
        };
        this.canvas.addEventListener('touchstart', overlayDown, { passive: false });
        this.canvas.addEventListener('mousedown', overlayDown);
        this.canvas.addEventListener('touchend', overlayUp, { passive: false });
        this.canvas.addEventListener('touchcancel', overlayUp, { passive: false });
        this.canvas.addEventListener('mouseup', overlayUp);
        this.canvas.addEventListener('contextmenu', (e) => e.preventDefault());
        document.addEventListener('gesturestart', (e) => e.preventDefault(), { passive: false });
        document.addEventListener('gesturechange', (e) => e.preventDefault(), { passive: false });
        document.addEventListener('gestureend', (e) => e.preventDefault(), { passive: false });

        const onViewportChange = () => {
            this.renderer.resize();
            if (this.grass && this.ui) {
                const playBottom = this.ui.getPlayAreaBottom(this.renderer.h, this.renderer.uiScale);
                this.grass.init(
                    this.renderer.w, this.renderer.h, playBottom, this._getGrassSafeZone());
            }
            if (this.player) {
                this.player.homeX = this.renderer.w / 2;
                this.player.homeY = this.renderer.h / 2;
                if (this.player.state === PlayerState.IDLE) {
                    this.player.x = this.player.homeX;
                    this.player.y = this.player.homeY;
                }
            }
        };
        window.addEventListener('resize', onViewportChange);
        window.addEventListener('orientationchange', onViewportChange);
        if (window.visualViewport) {
            window.visualViewport.addEventListener('resize', onViewportChange);
            window.visualViewport.addEventListener('scroll', onViewportChange);
        }

        this.lastTime = performance.now();
        requestAnimationFrame((t) => this.loop(t));
    }

    _getGrassSafeZone() {
        const x = this.player ? this.player.homeX : this.renderer.w / 2;
        const y = this.player ? this.player.homeY : this.renderer.h / 2;
        const refW = (typeof CONFIG !== 'undefined' && CONFIG.DISPLAY)
            ? CONFIG.DISPLAY.LOGICAL_WIDTH
            : 390;
        const triggerRadius = Math.max(48, CONFIG.PLAYER.TRIGGER_RADIUS_RATIO * refW);
        return { x, y, r: triggerRadius };
    }

    _isOverlayState() {
        return this.state === 'MENU' || this.state === 'GAME_OVER' ||
            this.state === 'COMPLETE' || this.state === 'LEVEL_UP' ||
            this.state === 'BOSS_REWARD' || this.state === 'PAUSED';
    }

    _lockOverlayInput() {
        this._overlayGestureActive = false;
        this._overlayDismissPending = this._pointerDown;
        if (this.input) this.input.cancelActivePointer();
    }

    _onOverlayPointerDown(e) {
        if (this._overlayDismissPending) return;
        this._overlayGestureActive = true;
        if (e.cancelable) e.preventDefault();
    }

    _onOverlayPointerUp(e) {
        if (e.cancelable) e.preventDefault();
        this._lastTouchUiTime = performance.now();

        if (this._overlayDismissPending) {
            this._overlayDismissPending = false;
            return;
        }
        if (!this._overlayGestureActive) return;
        this._overlayGestureActive = false;

        const pos = this.getClickPos(e);

        if (this.state === 'LEVEL_UP') {
            const idx = this.upgrades.handleClick(pos.x, pos.y);
            if (idx >= 0) {
                this.upgrades.selectUpgrade(idx, this.player);
            }
            return;
        }

        if (this.state === 'BOSS_REWARD') {
            const idx = this.bossRewards.handleClick(pos.x, pos.y);
            if (idx >= 0) {
                this.bossRewards.selectReward(idx, this.player);
            }
            return;
        }

        if (this.state === 'PAUSED') {
            this.handlePauseOverlayClick(pos.x, pos.y);
            return;
        }

        if (this.state === 'MENU' || this.state === 'GAME_OVER' || this.state === 'COMPLETE') {
            this.startGame();
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
        this.bossRewards = new BossRewardManager();
        this.bossChests = new BossChestManager(this);
        this.levelManager = new LevelManager();
        this.audio = new AudioHooks();
        this.bloodStains = new BloodStainSystem();
        this.abilities.reset();
        this.bossManager = new BossManager(this);
        this.sakura.petals = [];
        this.sakura.active = false;
        this.grass.init(
            this.renderer.w, this.renderer.h,
            this.ui.getPlayAreaBottom(this.renderer.h, this.renderer.uiScale),
            this._getGrassSafeZone());
        this.levelCleared = false;
        this.pendingLevelUpCount = 0;

        this.upgrades.onSelect = () => this._finishRewardOverlay();
        this.bossRewards.onSelect = () => this._finishRewardOverlay();

        if (!this.input) {
            this.input = new InputManager(this.canvas, this);
        } else {
            this.input.game = this;
        }

        this.state = 'PLAYING';
        this.levelManager.beginFirstLevel();
    }

    pauseGame() {
        if (this.state !== 'PLAYING') return;
        this.state = 'PAUSED';
        this._lockOverlayInput();
    }

    resumeGame() {
        if (this.state !== 'PAUSED') return;
        this.state = 'PLAYING';
        this._tryStartLevelUp();
    }

    _queueLevelUps(count) {
        if (!this.player || !this.upgrades || count <= 0) return;
        this.pendingLevelUpCount += count;
        this._tryStartLevelUp();
    }

    _finishRewardOverlay() {
        this.state = 'PLAYING';
        this._tryStartLevelUp();
    }

    _tryStartLevelUp() {
        if (this.pendingLevelUpCount <= 0) return;
        if (this.state === 'PAUSED' || this.state === 'MENU' ||
            this.state === 'GAME_OVER' || this.state === 'COMPLETE') return;
        if (!this.player || this.player.state !== PlayerState.IDLE) return;

        this.pendingLevelUpCount--;
        this.state = 'LEVEL_UP';
        this.upgrades.generateChoices();
        this._lockOverlayInput();
        this.audio.playLevelUp();
    }

    applyDebugLevel(targetLevel) {
        if (!this.player) return;
        const lv = clamp(Math.floor(targetLevel), 1, 99);
        const current = this.player.level;
        if (lv <= current) {
            this.player.level = lv;
            this.player.xp = 0;
            this.player.xpToNext = Math.floor(CONFIG.XP.BASE_REQUIRED * Math.pow(CONFIG.XP.SCALE_FACTOR, lv - 1));
            return;
        }
        this.player.level = lv;
        this.player.xp = 0;
        this.player.xpToNext = Math.floor(CONFIG.XP.BASE_REQUIRED * Math.pow(CONFIG.XP.SCALE_FACTOR, lv - 1));
        this._queueLevelUps(lv - current);
    }

    _syncDebugStageInputs() {
        if (!this.levelManager) return;
        this.pauseOverlay.debugChapterInput = String(this.levelManager.chapter);
        this.pauseOverlay.debugStageInput = String(this.levelManager.level + 1);
    }

    jumpToStage(chapter, stage) {
        const ch = Math.max(1, Math.floor(chapter));
        const st = clamp(Math.floor(stage), 1, 8);
        const levelIndex = clamp((ch - 1) * 8 + (st - 1), 0, CONFIG.LEVELS.length - 1);

        this.levelManager.chapter = ch;
        this.levelManager.level = levelIndex;
        this.levelManager.nextLevelOverride = null;
        this.levelManager.bannerActive = false;
        this.levelManager.pendingStartLevel = false;
        this.levelCleared = false;
        this.pendingLevelUpCount = 0;

        if (this.input) this.input.cancelActivePointer();
        this.timeScale = CONFIG.NORMAL_TIME_SCALE;

        if (this.player) {
            this.player.state = PlayerState.IDLE;
            this.player.x = this.player.homeX;
            this.player.y = this.player.homeY;
            this.player.attackPath = [];
            this.player.pathIndex = 0;
            this.player.pathProgress = 0;
            this.player.hitMonstersInSegment.clear();
        }

        this.spawner.monsters = [];
        this.spawner.spawnQueue = [];
        this.spawner.spawnTimer = 0;
        this.projectiles.projectiles = [];
        this.bossManager.reset();
        this.bossChests.reset();
        this.experience.orbs = [];

        this.sakura.start(this.renderer.w, this.renderer.h);
        const playBottom = this.ui.getPlayAreaBottom(this.renderer.h, this.renderer.uiScale);
        this.spawner.prepareLevelSpawns(
            this.levelManager.level, this.renderer.w, this.renderer.h, playBottom);
        this.bossManager.prepareForLevel(
            this.levelManager.level, this.renderer.w, this.renderer.h);

        this._syncDebugStageInputs();
        this.resumeGame();
    }

    handlePauseOverlayClick(x, y) {
        const ui = this.ui;
        if (!ui || !ui.pauseRects) return;
        const rects = ui.pauseRects;
        const hit = (r) => r && x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h;

        if (hit(rects.resume)) {
            this.resumeGame();
            return;
        }
        if (hit(rects.password)) {
            this.pauseOverlay.passwordMode = true;
            return;
        }
        if (this.pauseOverlay.passwordMode && !this.pauseOverlay.debugUnlocked) {
            for (const k of rects.keys || []) {
                if (!hit(k)) continue;
                if (k.key === 'C') {
                    this.pauseOverlay.passwordInput = '';
                } else if (k.key === 'OK') {
                    if (this.pauseOverlay.passwordInput === '1234') {
                        this.pauseOverlay.debugUnlocked = true;
                        this._syncDebugStageInputs();
                        this.pauseOverlay.debugLevelInput = String(this.player.level);
                    }
                    this.pauseOverlay.passwordInput = '';
                } else if (this.pauseOverlay.passwordInput.length < 8) {
                    this.pauseOverlay.passwordInput += k.key;
                }
                return;
            }
        }
        if (this.pauseOverlay.debugUnlocked) {
            if (hit(rects.levelMinus)) {
                const v = Math.max(1, parseInt(this.pauseOverlay.debugLevelInput || '1', 10) - 1);
                this.pauseOverlay.debugLevelInput = String(v);
                return;
            }
            if (hit(rects.levelPlus)) {
                const v = Math.min(99, parseInt(this.pauseOverlay.debugLevelInput || '1', 10) + 1);
                this.pauseOverlay.debugLevelInput = String(v);
                return;
            }
            if (hit(rects.levelApply)) {
                this.applyDebugLevel(parseInt(this.pauseOverlay.debugLevelInput || '1', 10));
                return;
            }
            if (hit(rects.chapterMinus)) {
                const v = Math.max(1, parseInt(this.pauseOverlay.debugChapterInput || '1', 10) - 1);
                this.pauseOverlay.debugChapterInput = String(v);
                return;
            }
            if (hit(rects.chapterPlus)) {
                const v = Math.min(9, parseInt(this.pauseOverlay.debugChapterInput || '1', 10) + 1);
                this.pauseOverlay.debugChapterInput = String(v);
                return;
            }
            if (hit(rects.stageMinus)) {
                const v = Math.max(1, parseInt(this.pauseOverlay.debugStageInput || '1', 10) - 1);
                this.pauseOverlay.debugStageInput = String(v);
                return;
            }
            if (hit(rects.stagePlus)) {
                const v = Math.min(8, parseInt(this.pauseOverlay.debugStageInput || '1', 10) + 1);
                this.pauseOverlay.debugStageInput = String(v);
                return;
            }
            if (hit(rects.stageApply)) {
                this.jumpToStage(
                    parseInt(this.pauseOverlay.debugChapterInput || '1', 10),
                    parseInt(this.pauseOverlay.debugStageInput || '1', 10)
                );
                return;
            }
        }
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

        if (this.state === 'LEVEL_UP' || this.state === 'BOSS_REWARD') {
            this.particles.update(realDt);
            if ((this.state === 'LEVEL_UP' && !this.upgrades.active) ||
                (this.state === 'BOSS_REWARD' && !this.bossRewards.active)) {
                this._finishRewardOverlay();
            }
            return;
        }
        if (this.state === 'PAUSED') {
            this.particles.update(realDt * 0.25);
            return;
        }

        if (this.state === 'PLAYING' || this.state === 'BULLET_TIME') {
            const levelEvent = this.levelManager.update(realDt);
            if (levelEvent === 'START_LEVEL') {
                this.levelCleared = false;
                this.sakura.start(this.renderer.w, this.renderer.h);
                const playBottom = this.ui.getPlayAreaBottom(
                    this.renderer.h, this.renderer.uiScale);
                this.spawner.prepareLevelSpawns(
                    this.levelManager.level, this.renderer.w, this.renderer.h, playBottom);
                this.bossManager.prepareForLevel(
                    this.levelManager.level, this.renderer.w, this.renderer.h);
            } else if (levelEvent === 'ALL_COMPLETE') {
                this.state = 'COMPLETE';
                this._lockOverlayInput();
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
            this.bossManager.update(dt);
            this.abilities.update(dt);
            this.combat.update(dt);
            this.bossChests.update(dt);
            this.sakura.update(realDt, this.renderer.w, this.renderer.h);
            this.bloodStains.update(realDt);
            this.grass.update(realDt);
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
                    this.pendingLevelUpCount++;
                }
            }

            if (this.pendingLevelUpCount > 0 && this.player.state === PlayerState.IDLE) {
                this._tryStartLevelUp();
                if (this.state === 'LEVEL_UP') return;
            }

            if (this.player.isDead()) {
                this.state = 'GAME_OVER';
                this._lockOverlayInput();
                return;
            }

            if (!this.levelCleared && !this.levelManager.bannerActive &&
                this.spawner.allClear() && this.bossManager.allClear() &&
                !this.bossChests.hasActiveChest()) {
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
        this.renderer.resetScreenDraw();
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

        this.grass.draw(ctx);
        this.sakura.draw(ctx);
        this.bloodStains.draw(ctx);
        this.experience.draw(ctx);

        for (const m of this.spawner.monsters) {
            m.draw(ctx);
        }

        this.bossManager.draw(ctx);

        this.abilities.drawBehind(ctx);

        this.projectiles.draw(ctx);
        this.bossManager.drawProjectiles(ctx);

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

        this.abilities.drawFront(ctx);
        this.particles.draw(ctx);
        this.bossChests.draw(ctx);
        this.combat.drawDamageNumbers(ctx);

        this.renderer.endClippedGameDraw();
        this.renderer.resetScreenDraw();
        const vp = this.renderer.getViewport();
        const uiScale = this.renderer.uiScale;

        ctx.save();
        this.renderer.clipViewport(ctx);

        if (this.player) {
            const boss = this.bossManager.boss;
            const hasBoss = !!(boss && (boss.alive || boss.dying));
            this.ui.draw(ctx, this.player, vp, uiScale, { hasBoss });
            if (hasBoss) {
                this.ui.drawBossBar(ctx, boss, vp, uiScale);
            }
        }

        this.levelManager.drawBanner(ctx, vp, uiScale);

        if (this.state === 'LEVEL_UP') {
            this.upgrades.drawUI(ctx, vp, uiScale);
        }
        if (this.state === 'BOSS_REWARD') {
            this.bossRewards.drawUI(ctx, vp, uiScale);
        }
        if (this.state === 'PAUSED') {
            this.ui.drawPauseButton(ctx, vp, uiScale, true);
            this.ui.drawPauseOverlay(ctx, vp, uiScale, this.pauseOverlay);
        } else if (this.state === 'PLAYING') {
            this.ui.drawPauseButton(ctx, vp, uiScale, false);
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
