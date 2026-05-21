class Game {
    constructor() {
        this.canvas = document.getElementById('gameCanvas');
        this.renderer = new Renderer(this.canvas);
        this.ctx = this.renderer.ctx;

        this.state = 'MENU';
        this.timeScale = CONFIG.NORMAL_TIME_SCALE;
        this.bulletTimeDimActive = false;
        this.lastTime = performance.now();

        this.player = null;
        this.spawner = new MonsterSpawner(this);
        this.projectiles = new ProjectileManager(this);
        this.groundEffects = new GroundEffectManager(this);
        this.particles = new ParticleSystem(650);
        this.combat = new CombatManager(this);
        this.upgrades = new UpgradeManager();
        this.experience = new ExperienceManager(this);
        this.levelManager = new LevelManager();
        this.ui = new UI();
        this.audio = new AudioHooks();
        this.bloodStains = new BloodStainSystem();
        this.abilities = new AbilityManager(this);
        this.sakura = new SakuraSystem();
        this.failDeath = new StageFailAnimator(this);
        this.grass = new GrassSystem();
        this.buffOrbs = new BuffOrbManager(this);
        this.input = null;

        this.awaitingUpgrade = false;
        this.pendingStageClear = false;

        this._pointerDown = false;
        this._overlayDismissPending = false;
        this._overlayGestureActive = false;

        this._bindEvents();
        this.upgrades.onSelect = () => {
            this.state = 'PLAYING';
            if (this.experience) this.experience.tryTriggerPendingUpgrade();
            this._tryFinishStageClear();
        };

        requestAnimationFrame((t) => this.loop(t));
    }

    _bindEvents() {
        const trackDown = () => { this._pointerDown = true; };
        const trackUp = () => { this._pointerDown = false; };
        this.canvas.addEventListener('touchstart', trackDown, { passive: true });
        this.canvas.addEventListener('mousedown', trackDown);
        this.canvas.addEventListener('touchend', trackUp, { passive: true });
        this.canvas.addEventListener('mouseup', trackUp);
        this.canvas.addEventListener('touchcancel', trackUp, { passive: true });

        const overlayDown = (e) => {
            if (this._isOverlayState()) this._onOverlayPointerDown(e);
        };
        const overlayUp = (e) => {
            if (this._isOverlayState()) this._onOverlayPointerUp(e);
        };
        this.canvas.addEventListener('touchstart', overlayDown, { passive: false });
        this.canvas.addEventListener('mousedown', overlayDown);
        this.canvas.addEventListener('touchend', overlayUp, { passive: false });
        this.canvas.addEventListener('mouseup', overlayUp);
        this.canvas.addEventListener('touchcancel', overlayUp, { passive: false });
        this.canvas.addEventListener('contextmenu', (e) => e.preventDefault());

        const onViewport = () => {
            this.renderer.resize();
            const playBottom = this.ui.getPlayAreaBottom
                ? this.ui.getPlayAreaBottom(this.renderer.h, this.renderer.uiScale)
                : this.renderer.h;
            this.grass.init(this.renderer.w, this.renderer.h, playBottom, this._getSafeZone());
        };
        window.addEventListener('resize', onViewport);
        window.addEventListener('orientationchange', onViewport);
        if (window.visualViewport) window.visualViewport.addEventListener('resize', onViewport);
    }

    _isOverlayState() {
        return this.state === 'MENU' || this.state === 'FAIL' || this.state === 'COMPLETE'
            || this.state === 'LEVEL_UP' || this.state === 'STAGE_INTRO';
    }

    _lockOverlayInput() {
        this._overlayGestureActive = false;
        this._overlayDismissPending = this._pointerDown;
        if (this.input) this.input.cancelActivePointer();
    }

    _pauseForUpgrade() {
        if (this.renderer) this.renderer.clearShake();
        if (this.player) this.player.comboShakeTimer = 0;
    }

    _onOverlayPointerDown(e) {
        if (this._overlayDismissPending) return;
        this._overlayGestureActive = true;
        if (e.cancelable) e.preventDefault();
    }

    _onOverlayPointerUp(e) {
        if (e.cancelable) e.preventDefault();
        if (this._overlayDismissPending) {
            this._overlayDismissPending = false;
            return;
        }
        if (!this._overlayGestureActive) return;
        this._overlayGestureActive = false;

        const pos = this.getClickPos(e);
        if (this.state === 'LEVEL_UP') {
            const idx = this.upgrades.handleClick(pos.x, pos.y);
            if (idx >= 0) this.upgrades.selectUpgrade(idx, this.player);
            return;
        }
        if (this.state === 'MENU' || this.state === 'FAIL' || this.state === 'COMPLETE') {
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

    _isFailBattlefield() {
        return this.state === 'FAIL_DEATH' || this.state === 'STAGE_FAIL' || this.state === 'FAIL';
    }

    isUpgradeBlocked() {
        if (!this.combat || !this.abilities) return false;
        if (this.combat.isResolving()) return true;
        if (this.abilities.lightningChain) return true;
        return false;
    }

    _isBattleScene() {
        return this.state === 'PLAYING' || this.state === 'LEVEL_UP';
    }

    isCombatPresentationActive() {
        if (this.isUpgradeBlocked()) return true;
        if (this.abilities.hasActiveFx()) return true;
        if (this.combat.afterimages.length > 0) return true;
        if (this.combat.damageNumbers.length > 0) return true;
        return false;
    }

    _isWorldFrozen() {
        const p = this.player;
        if (!p) return false;
        if (p.state === PlayerState.BULLET_TIME) return true;
        if (this.combat && !this.combat.roundAttackResolved) return true;
        return false;
    }

    _canAdvanceStage() {
        if (this.state !== 'PLAYING') return false;
        if (!this.spawner.allClear()) return false;
        if (this.combat.isResolving()) return false;
        if (this.isUpgradeBlocked()) return false;
        const p = this.player;
        if (!p || p.state !== PlayerState.IDLE) return false;
        return true;
    }

    _syncPendingStageClear() {
        if (this.pendingStageClear || !this._canAdvanceStage()) return;
        if (!this.combat.roundAttackResolved) {
            this.combat.consumeRoundAttack();
            this.player.finishAttackCycle();
        }
        this.pendingStageClear = true;
    }

    _tryFinishStageClear() {
        if (!this.pendingStageClear || this.state !== 'PLAYING') return;
        if (this.isUpgradeBlocked() || this.combat.isResolving()) return;
        if (!this.spawner.allClear()) return;
        this.pendingStageClear = false;
        this._stageCleared();
    }

    _updateLiveBattle(dt, realDt) {
        this.player.update(dt, realDt);
        const playBottom = this.ui.getPlayAreaBottom
            ? this.ui.getPlayAreaBottom(this.renderer.h, this.renderer.uiScale)
            : this.renderer.h;
        const worldDt = this._isWorldFrozen() ? 0 : dt;
        const playerTarget = this.player ? {
            x: this.player.x,
            y: this.player.y,
            effectiveRadius: this.player.effectiveRadius,
            player: this.player,
        } : null;
        this.spawner.update(worldDt, this.renderer.w, this.renderer.h, playBottom, playerTarget);
        this.projectiles.update(worldDt, this.renderer.w, this.renderer.h, playerTarget);
        this.groundEffects.update(worldDt, playerTarget);
        this.combat.update(dt);
        this.buffOrbs.update(realDt);
        this.sakura.update(realDt, this.renderer.w, this.renderer.h);
        this.grass.update(realDt);
        this.bloodStains.update(realDt);
        this.particles.update(realDt);
    }

    _getSafeZone() {
        const x = this.player ? this.player.homeX : this.renderer.w / 2;
        const y = this.player ? this.player.homeY : this.renderer.h / 2;
        const r = this.player
            ? this.player.triggerRadius
            : Math.max(CONFIG.PLAYER.TRIGGER_RADIUS_MIN || 30, CONFIG.PLAYER.TRIGGER_RADIUS_RATIO * CONFIG.DISPLAY.LOGICAL_WIDTH);
        return { x, y, r };
    }

    _playerDied() {
        if (this.state !== 'PLAYING') return;
        if (this.input) this.input.cancelActivePointer();
        this._stageFailed();
    }

    _clearCombatResiduals() {
        this.pendingStageClear = false;
        if (this.input) this.input.cancelActivePointer();
        if (this.player) {
            this.player.deathAnim = null;
            this.player.state = PlayerState.IDLE;
            this.player.attackPath = [];
            this.player.pathIndex = 0;
            this.player.pathProgress = 0;
            this.player.hitMonstersInSegment.clear();
            this.player.hitProjectilesInSegment.clear();
            this.player.invalidPathTimer = 0;
            this.player.comboCount = 0;
            this.player.comboDisplayPeak = 0;
            this.player.comboDisplayTimer = 0;
            this.player.comboShakeTimer = 0;
        }
        if (this.combat) {
            this.combat.damageNumbers = [];
            this.combat.finalSegmentHit = false;
        }
        this.bloodStains.clear();
        this.particles.clear();
        this.abilities.reset();
        this.projectiles.reset();
        this.groundEffects.reset();
        if (this.buffOrbs) {
            this.buffOrbs.cancelDrawSession();
            this.buffOrbs.reset();
        }
        this.endBulletTimeDim();
        this.timeScale = CONFIG.NORMAL_TIME_SCALE;
    }

    _prepareStage(levelIndex, withSpawnAnim = false) {
        this.levelManager.level = levelIndex;
        this.player.beginStage();
        const playBottom = this.ui.getPlayAreaBottom ? this.ui.getPlayAreaBottom(this.renderer.h, this.renderer.uiScale) : this.renderer.h;
        const safe = this._getSafeZone();
        this.spawner.spawnStage(levelIndex, this.renderer.w, this.renderer.h, playBottom, safe, withSpawnAnim);
        this.buffOrbs.spawnForStage(levelIndex, safe, false);
        this.combat.roundAttackResolved = true;
    }

    _setupStageBeforeIntro(levelIndex) {
        this._clearCombatResiduals();
        this.levelManager.level = levelIndex;
        this.player.beginStage();
        this.spawner.monsters = [];
        this.combat.roundAttackResolved = true;
    }

    _beginStageIntro(levelIndex) {
        if (this.input) this.input.cancelActivePointer();
        this.state = 'STAGE_INTRO';
        this._setupStageBeforeIntro(levelIndex);
        const introDur = CONFIG.STAGE_INTRO_SLIDE_IN + CONFIG.STAGE_INTRO_LABEL_HOLD
            + CONFIG.STAGE_INTRO_SLIDE_OUT;
        const sakuraDur = introDur + (CONFIG.STAGE_INTRO_SAKURA_EXTRA || 0.8);
        this.sakura.start(this.renderer.w, this.renderer.h, sakuraDur);
        this.levelManager.startStageIntro(levelIndex + 1, () => {
            this._prepareStage(levelIndex, true);
            this.state = 'PLAYING';
        });
    }

    _beginNextLevelTransition() {
        const next = this.levelManager.level + 1;
        if (next >= CONFIG.STAGES.length) {
            this.state = 'COMPLETE';
            this._lockOverlayInput();
            return;
        }
        this._beginStageIntro(next);
    }

    _stageCleared() {
        this.pendingStageClear = false;
        this.state = 'STAGE_CLEAR';
        if (this.input) this.input.cancelActivePointer();
        this.levelManager.showClearFlash(() => {
            this._clearCombatResiduals();
            const next = this.levelManager.level + 1;
            if (next >= CONFIG.STAGES.length) {
                this.state = 'COMPLETE';
                this._lockOverlayInput();
                return;
            }
            this._beginStageIntro(next);
        });
    }

    _stageFailed() {
        if (this.input) this.input.cancelActivePointer();
        if (this.failDeath.isActive()) return;
        this.state = 'FAIL_DEATH';
        this.abilities.reset();
        this.failDeath.start(() => {
            this.state = 'STAGE_FAIL';
            this.levelManager.showFailIntro(() => {
                this.state = 'FAIL';
                this._lockOverlayInput();
            });
        });
    }

    startGame() {
        const cx = this.renderer.w / 2;
        const cy = this.renderer.h / 2;
        this.player = new Player(cx, cy);
        this.player.game = this;
        this.failDeath = new StageFailAnimator(this);
        this.spawner = new MonsterSpawner(this);
        this.projectiles = new ProjectileManager(this);
        this.groundEffects = new GroundEffectManager(this);
        this.particles = new ParticleSystem(650);
        this.combat = new CombatManager(this);
        this.upgrades = new UpgradeManager();
        this.experience = new ExperienceManager(this);
        this.levelManager = new LevelManager();
        this.abilities = new AbilityManager(this);
        this.buffOrbs = new BuffOrbManager(this);
        this.bloodStains = new BloodStainSystem();
        this.sakura.petals = [];
        this.sakura.active = false;
        const playBottom = this.ui.getPlayAreaBottom ? this.ui.getPlayAreaBottom(this.renderer.h, this.renderer.uiScale) : this.renderer.h;
        this.grass.init(this.renderer.w, this.renderer.h, playBottom, this._getSafeZone());

        this.experience.reset();
        this.upgrades.onSelect = () => {
            this.state = 'PLAYING';
            if (this.experience) this.experience.tryTriggerPendingUpgrade();
            this._tryFinishStageClear();
        };
        if (!this.input) this.input = new InputManager(this.canvas, this);
        else this.input.game = this;

        this.pendingStageClear = false;
        this._beginStageIntro(0);
    }

    enterBulletTime() {
        this.bulletTimeDimActive = true;
        this.timeScale = CONFIG.BULLET_TIME_SCALE;
    }

    endBulletTimeDim() {
        this.bulletTimeDimActive = false;
    }

    exitBulletTime(invalid = false) {
        this.timeScale = CONFIG.NORMAL_TIME_SCALE;
        if (invalid) {
            this.endBulletTimeDim();
            return;
        }
        if (!this.player.startAttack()) {
            this.endBulletTimeDim();
            this.buffOrbs.cancelDrawSession();
            return;
        }
        this.combat.beginRoundAttack();
        this.abilities.reset();
    }

    _onAttackFinished() {
        if (this.combat.consumeRoundAttack()) {
            const cleared = this.spawner.allClear();
            if (cleared) {
                this.pendingStageClear = true;
                return;
            }
            this.player.finishAttackCycle();
        }
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
        if (this.state === 'MENU' || this.state === 'COMPLETE') return;
        if (this.state === 'FAIL' && !this.levelManager.isFailIntroActive()) return;
        this.renderer.updateShake(this.state === 'LEVEL_UP' ? 0 : realDt);
        if (this.state === 'LEVEL_UP') this.renderer.clearShake();
        this.levelManager.update(realDt);

        if (this.state === 'STAGE_INTRO' || this.state === 'STAGE_CLEAR') {
            this.sakura.update(realDt, this.renderer.w, this.renderer.h);
            this.grass.update(realDt);
            this.particles.update(realDt);
        }
        if (this.state === 'FAIL_DEATH') {
            this.failDeath.update(realDt);
            this.bloodStains.update(realDt);
            this.particles.update(realDt);
            return;
        }
        if (this.state === 'STAGE_FAIL' || this.state === 'FAIL') {
            return;
        }
        if (this.state === 'STAGE_INTRO') return;
        if (this.state === 'STAGE_CLEAR') return;
        if (this.state === 'LEVEL_UP') {
            this.upgrades.update(realDt);
            return;
        }

        if (this._isBattleScene()) {
            this._updateLiveBattle(dt, realDt);

            if (this.state === 'PLAYING') {
                if (this.experience) this.experience.tryTriggerPendingUpgrade();

                if (this.player.state === PlayerState.IDLE
                    && !this.combat.roundAttackResolved
                    && !this.combat.isResolving()
                    && !this.isUpgradeBlocked()) {
                    this._onAttackFinished();
                }
                this._syncPendingStageClear();
                this._tryFinishStageClear();
            }
        }
    }

    _drawBulletTimeDim(ctx) {
        if (!this.bulletTimeDimActive) return;
        ctx.save();
        ctx.fillStyle = `rgba(0, 0, 0, ${CONFIG.BULLET_TIME_DIM_ALPHA})`;
        ctx.fillRect(0, 0, this.renderer.w, this.renderer.h);
        ctx.restore();
    }

    draw() {
        const ctx = this.ctx;
        this.renderer.clear();
        this.renderer.resetScreenDraw();
        this.renderer.beginClippedGameDraw();

        if (this.state === 'MENU') {
            this.renderer.endClippedGameDraw();
            this.drawMenu();
            return;
        }
        if (this.state === 'COMPLETE') {
            this.renderer.endClippedGameDraw();
            this.renderer.resetScreenDraw();
            this.levelManager.drawComplete(ctx, this.renderer.getViewport(), this.renderer.uiScale);
            return;
        }

        this.grass.draw(ctx);
        this.sakura.draw(ctx);
        this.bloodStains.draw(ctx);
        this._drawBulletTimeDim(ctx);
        const battleScene = this._isBattleScene();
        const showCombatFx = battleScene && this.state !== 'LEVEL_UP';
        const showBattlefield = battleScene || this._isFailBattlefield();
        if (showBattlefield && this.groundEffects) this.groundEffects.draw(ctx);
        if (showBattlefield) {
            if (battleScene) this.buffOrbs.draw(ctx);
            const previewTargets = (battleScene
                && this.player
                && this.player.state === PlayerState.BULLET_TIME
                && this.player.attackPath.length >= 2)
                ? this.combat.getPathPreviewTargetIds(this.player.attackPath, this.player)
                : null;
            for (const m of this.spawner.monsters) {
                m.pathTargetHighlight = previewTargets ? previewTargets.has(m.id) : false;
                m.draw(ctx);
            }
            if (battleScene) this.projectiles.draw(ctx);
        }

        if (showCombatFx) {
            this.abilities.drawBehind(ctx);
        }
        if (this.player) {
            if (!this._isFailBattlefield()) this.player.drawTriggerZone(ctx);
            if (battleScene || this.player.state === PlayerState.BULLET_TIME) {
                this.player.drawPath(ctx);
            }
            this.player.draw(ctx);
        }
        if (showCombatFx) {
            this.combat.drawAfterimages(ctx);
        }
        if (showCombatFx && this.abilities.hasActiveFx()) {
            this.abilities.drawFront(ctx);
        }
        if (this.state === 'FAIL_DEATH' && this.failDeath.isActive()) {
            this.failDeath.drawSpears(ctx);
        }
        if (showCombatFx) {
            this.buffOrbs.drawPickupEffects(ctx);
        }
        if (showCombatFx || this.state === 'FAIL_DEATH') {
            this.particles.draw(ctx);
        }
        if (showCombatFx && this.combat.damageNumbers.length > 0) {
            this.combat.drawDamageNumbers(ctx);
        }

        this.renderer.endClippedGameDraw();
        this.renderer.resetScreenDraw();

        const vp = this.renderer.getViewport();
        const s = this.renderer.uiScale;
        ctx.save();
        this.renderer.clipViewport(ctx);
        if (this.player && !this._isFailBattlefield()) this.ui.draw(ctx, this, vp, s);
        this.levelManager.drawBanner(ctx, vp, s);
        if (this.state === 'LEVEL_UP') this.upgrades.drawUI(ctx, vp, s, this.player);
        this.levelManager.drawStageIntro(ctx, vp, s);
        this.levelManager.drawClearFlash(ctx, vp, s);
        if (this.state === 'FAIL' || this.state === 'STAGE_FAIL') {
            this.levelManager.drawFail(ctx, vp, s);
        }
        ctx.restore();
    }

    drawMenu() {
        const ctx = this.ctx;
        const vp = this.renderer.getViewport();
        drawGameText(ctx, '忍者斩', vp.cx, vp.y + vp.h * 0.38, Math.round(40 * this.renderer.uiScale), '#3a3028');
        drawGameText(ctx, '新版本', vp.cx, vp.y + vp.h * 0.45, Math.round(18 * this.renderer.uiScale), '#6a5a48');
        drawGameText(ctx, '点击屏幕开始', vp.cx, vp.y + vp.h * 0.58, Math.round(18 * this.renderer.uiScale), '#5a5048');
    }
}

window.addEventListener('DOMContentLoaded', () => {
    new Game();
});
