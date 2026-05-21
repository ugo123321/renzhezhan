class GroundEffectManager {
    constructor(game) {
        this.game = game;
        this.effects = [];
    }

    reset() {
        this.effects = [];
    }

    spawnFirePillar(x, y, damage) {
        const cfg = CONFIG.FIRE_PILLAR;
        this.effects.push({
            type: 'fire_pillar',
            x,
            y,
            r: cfg.RADIUS,
            damage: damage || cfg.DAMAGE,
            phase: 'warning',
            timer: cfg.WARNING_TIME,
            flashT: 0,
            hit: false,
            alive: true,
        });
    }

    update(dt, playerTarget) {
        const cfg = CONFIG.FIRE_PILLAR;
        for (const e of this.effects) {
            if (!e.alive) continue;
            e.flashT += dt;
            e.timer -= dt;

            if (e.phase === 'warning') {
                if (e.timer <= 0) {
                    e.phase = 'active';
                    e.timer = cfg.ACTIVE_TIME;
                    this._damagePlayer(e, playerTarget);
                }
            } else if (e.phase === 'active') {
                if (e.timer <= 0) {
                    e.phase = 'fade';
                    e.timer = cfg.FADE_TIME;
                }
            } else if (e.phase === 'fade' && e.timer <= 0) {
                e.alive = false;
            }
        }
        this.effects = this.effects.filter(e => e.alive);
    }

    _damagePlayer(e, playerTarget) {
        if (e.hit) return;
        const pl = playerTarget?.player;
        if (!pl || pl.hp <= 0) return;
        if (pl.state === PlayerState.BULLET_TIME || pl.isAttackInvincible?.()) return;
        if (!circlesCollide(e.x, e.y, e.r, pl.x, pl.y, pl.effectiveRadius + 2)) return;

        e.hit = true;
        const dmg = pl.takeDamage(e.damage);
        if (dmg <= 0 || !this.game) return;

        this.game.combat.spawnDamageNumber(pl.x, pl.y - pl.effectiveRadius - 8, dmg, false, '#ff7040');
        this.game.particles.hitSpark(pl.x, pl.y, false);
        this.game.renderer.shake(CONFIG.SHAKE.NORMAL.magnitude * 0.75, CONFIG.SHAKE.NORMAL.duration);
        for (let i = 0; i < 14; i++) {
            this.game.particles.spawnEffect(
                e.x + randRange(-e.r * 0.45, e.r * 0.45),
                e.y + randRange(-e.r * 0.45, e.r * 0.45),
                i % 2 === 0 ? '#ff6020' : '#ffcc50'
            );
        }
    }

    draw(ctx) {
        const cfg = CONFIG.FIRE_PILLAR;
        for (const e of this.effects) {
            if (e.phase === 'warning') {
                this._drawWarning(ctx, e);
            } else if (e.phase === 'active') {
                this._drawFirePillar(ctx, e, 1);
            } else if (e.phase === 'fade') {
                this._drawFirePillar(ctx, e, clamp(e.timer / cfg.FADE_TIME, 0, 1));
            }
        }
    }

    _drawWarning(ctx, e) {
        const pulse = Math.sin(e.flashT * 14) * 0.5 + 0.5;
        const flash = Math.floor(e.flashT * 10) % 2 === 0;
        const alphaFill = 0.1 + pulse * 0.16;
        const alphaStroke = flash ? 0.9 : 0.42;

        ctx.save();
        ctx.beginPath();
        ctx.arc(e.x, e.y, e.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255, 35, 28, ${alphaFill})`;
        ctx.fill();
        ctx.strokeStyle = `rgba(255, ${flash ? 45 : 95}, 35, ${alphaStroke})`;
        ctx.lineWidth = flash ? 3 : 2;
        ctx.stroke();

        ctx.setLineDash([5, 5]);
        ctx.strokeStyle = `rgba(255, 110, 70, ${0.38 + pulse * 0.28})`;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(e.x, e.y, e.r * 0.7, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
    }

    _drawFirePillar(ctx, e, alphaMul) {
        const x = e.x;
        const y = e.y;
        const r = e.r;
        const colH = r * 1.55;

        ctx.save();
        ctx.globalAlpha = alphaMul;

        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(48, 18, 8, 0.6)';
        ctx.fill();

        const cols = 8;
        for (let i = 0; i < cols; i++) {
            const ang = (i / cols) * Math.PI * 2 + e.flashT * 4.2;
            const spread = r * (0.28 + (i % 3) * 0.14);
            const fx = x + Math.cos(ang) * spread;
            const fy = y + Math.sin(ang) * spread * 0.4 - colH * 0.35;
            const fh = colH * (0.55 + (i % 4) * 0.12);
            const fw = 3 + (i % 3) * 2;
            const colors = ['#ff5018', '#ffb038', '#ff2810', '#ff9048'];
            ctx.fillStyle = colors[i % colors.length];
            ctx.fillRect(Math.floor(fx - fw / 2), Math.floor(fy - fh), fw, Math.floor(fh));
        }

        const grad = ctx.createRadialGradient(x, y, 0, x, y - colH * 0.15, r * 0.7);
        grad.addColorStop(0, 'rgba(255, 230, 130, 0.95)');
        grad.addColorStop(0.4, 'rgba(255, 110, 35, 0.75)');
        grad.addColorStop(1, 'rgba(255, 40, 8, 0.08)');
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.ellipse(x, y - colH * 0.22, r * 0.58, colH * 0.48, 0, 0, Math.PI * 2);
        ctx.fill();

        ctx.strokeStyle = 'rgba(255, 190, 70, 0.65)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
    }
}
