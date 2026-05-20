class StageFailAnimator {
    constructor(game) {
        this.game = game;
        this.active = false;
        this.phase = 'idle';
        this.timer = 0;
        this.spears = [];
        this.onComplete = null;
        this.frozen = false;
        this.death = { shake: 0, fall: 0, alpha: 1, impaleAngles: [] };
    }

    isFrozen() {
        return this.frozen;
    }

    showFailPose() {
        return this.active || this.frozen;
    }

    freeze() {
        this.frozen = true;
        this.active = false;
        this.phase = 'done';
        this.death.fall = 1;
        this.death.shake = 0;
        this.death.alpha = this.death.alpha != null ? this.death.alpha : 0.65;
        const p = this.game.player;
        if (p) {
            p.deathAnim = { active: true, phase: 'done', frozen: true };
        }
    }

    start(onComplete) {
        this.frozen = false;
        const game = this.game;
        const p = game.player;
        if (!p) {
            if (onComplete) onComplete();
            return;
        }

        const monsters = game.spawner.getActiveMonsters();
        const px = p.homeX;
        const py = p.homeY;
        const sources = monsters.length > 0
            ? monsters
            : [{ x: px + randRange(90, 160), y: py - randRange(60, 120), facing: Math.PI + 0.4 }];

        this.active = true;
        this.phase = 'windup';
        this.timer = 0;
        this.onComplete = onComplete;
        this.death = { shake: 0, fall: 0, alpha: 1, impaleAngles: [] };
        this.spears = [];

        for (const m of game.spawner.monsters) m.game = game;

        sources.forEach((m, i) => {
            const mx = m.x;
            const my = m.y;
            const tx = px + randRange(-10, 10);
            const ty = py + randRange(-8, 8);
            const ang = angle(mx, my, tx, ty);
            const d = Math.max(40, dist(mx, my, tx, ty));
            this.spears.push({
                fromX: mx,
                fromY: my,
                x: mx,
                y: my,
                targetX: tx,
                targetY: ty,
                angle: ang,
                delay: i * CONFIG.FAIL_DEATH.SPEAR_STAGGER,
                progress: 0,
                dist: d,
                speed: CONFIG.FAIL_DEATH.SPEAR_SPEED,
                landed: false,
                monster: m,
            });
            m.failThrowTimer = CONFIG.FAIL_DEATH.WINDUP + 0.45;
        });

        p.x = px;
        p.y = py;
        p.state = PlayerState.IDLE;
        p.deathAnim = { active: true, phase: 'windup' };
    }

    isActive() {
        return this.active;
    }

    isThrowing() {
        return this.active && (this.phase === 'windup' || this.phase === 'throw');
    }

    update(dt) {
        if (!this.active) return;
        const cfg = CONFIG.FAIL_DEATH;
        const p = this.game.player;
        this.timer += dt;

        if (this.phase === 'windup') {
            if (this.timer >= cfg.WINDUP) {
                this.phase = 'throw';
                this.timer = 0;
                if (p) p.deathAnim.phase = 'throw';
            }
            return;
        }

        if (this.phase === 'throw') {
            let pending = false;
            for (const s of this.spears) {
                if (s.landed) continue;
                pending = true;
                if (this.timer < s.delay) continue;
                const elapsed = this.timer - s.delay;
                s.progress = Math.min(1, (elapsed * s.speed) / s.dist);
                s.x = lerp(s.fromX, s.targetX, easeInQuad(s.progress));
                s.y = lerp(s.fromY, s.targetY, easeInQuad(s.progress));
                if (s.progress >= 1) {
                    s.landed = true;
                    s.x = s.targetX;
                    s.y = s.targetY;
                    this.death.impaleAngles.push(s.angle + Math.PI + randRange(-0.2, 0.2));
                }
            }
            if (!pending) {
                this._beginImpact();
            }
            return;
        }

        if (this.phase === 'impact') {
            this.death.shake = Math.sin(this.timer * 48) * (1 - this.timer / cfg.IMPACT_PAUSE) * 8;
            if (this.timer >= cfg.IMPACT_PAUSE) {
                this.phase = 'death';
                this.timer = 0;
                if (p) p.deathAnim.phase = 'falling';
            }
            return;
        }

        if (this.phase === 'death') {
            const t = clamp(this.timer / cfg.DEATH_DURATION, 0, 1);
            this.death.fall = easeInQuad(t);
            this.death.alpha = 1 - t * 0.35;
            this.death.shake *= 0.9;
            if (this.timer >= cfg.DEATH_DURATION) {
                this.freeze();
                const cb = this.onComplete;
                this.onComplete = null;
                if (cb) cb();
            }
        }
    }

    _beginImpact() {
        const cfg = CONFIG.FAIL_DEATH;
        const p = this.game.player;
        this.phase = 'impact';
        this.timer = 0;
        if (p) {
            p.deathAnim.phase = 'impaled';
            this.game.bloodStains.spawn(p.x, p.y + 8, 1.5, 0);
            this.game.particles.deathEffect(p.x, p.y, '#6a1818');
        }
        this.game.renderer.shake(14, 0.35);
    }

    _drawSpear(ctx, x, y, ang, stuck = false) {
        const len = stuck ? 22 : 18;
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(ang);
        ctx.fillStyle = '#5a4030';
        ctx.fillRect(-len * 0.55, -1.5, len * 0.72, 3);
        ctx.fillStyle = '#8a7060';
        ctx.fillRect(len * 0.08, -1, len * 0.28, 2);
        ctx.fillStyle = '#c8ccd4';
        ctx.beginPath();
        ctx.moveTo(len * 0.38, 0);
        ctx.lineTo(len * 0.55, -3);
        ctx.lineTo(len * 0.55, 3);
        ctx.closePath();
        ctx.fill();
        if (stuck) {
            ctx.fillStyle = '#8a1818';
            ctx.fillRect(-len * 0.08, -2.5, 5, 5);
        }
        ctx.restore();
    }

    drawSpears(ctx) {
        if (!this.active) return;
        for (const s of this.spears) {
            if (s.landed) continue;
            if (this.phase === 'windup' || this.timer < s.delay) continue;
            this._drawSpear(ctx, s.x, s.y, s.angle, false);
        }
    }

    drawImpaledSpears(ctx, px, py) {
        for (const ang of this.death.impaleAngles) {
            this._drawSpear(ctx, px, py, ang, true);
        }
    }

    drawMonsterThrowSpear(ctx, m) {
        if (!m.failThrowTimer || m.failThrowTimer <= 0) return;
        const ang = angle(m.x, m.y, this.game.player.x, this.game.player.y);
        const reach = m.hitboxRadius + 10;
        const sx = m.x + Math.cos(ang) * reach;
        const sy = m.y + Math.sin(ang) * reach;
        this._drawSpear(ctx, sx, sy, ang, false);
    }
}
