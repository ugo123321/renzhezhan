let nextProjectileId = 1;

class ProjectileManager {
    constructor(game) {
        this.game = game;
        this.projectiles = [];
    }

    reset() {
        this.projectiles = [];
    }

    spawnArrow(opts) {
        const unit = CONFIG.DISPLAY.UNIT_SCALE || 1;
        const speed = opts.speed || CONFIG.ARROW.SPEED || 340;
        let vx = opts.vx;
        let vy = opts.vy;
        if (opts.targetX != null && opts.targetY != null) {
            const dx = opts.targetX - opts.x;
            const dy = opts.targetY - opts.y;
            const len = Math.hypot(dx, dy) || 1;
            vx = (dx / len) * speed;
            vy = (dy / len) * speed;
        }
        this.projectiles.push({
            id: nextProjectileId++,
            type: 'arrow',
            x: opts.x,
            y: opts.y,
            vx,
            vy,
            damage: opts.damage || 10,
            radius: opts.radius || (CONFIG.ARROW.RADIUS || 6) * unit,
            angle: Math.atan2(vy, vx),
            alive: true,
            blockable: true,
        });
    }

    update(dt, w, h, playerTarget) {
        const top = 84;
        const playBottom = this.game && this.game.ui
            ? this.game.ui.getPlayAreaBottom(h, this.game.renderer.uiScale)
            : h;
        const bottom = Math.max(top + 60, playBottom - 10);

        for (const p of this.projectiles) {
            if (!p.alive) continue;
            p.x += p.vx * dt;
            p.y += p.vy * dt;
            p.angle = Math.atan2(p.vy, p.vx);

            if (p.x < -24 || p.x > w + 24 || p.y < top - 24 || p.y > bottom + 24) {
                p.alive = false;
                continue;
            }

            if (!playerTarget || !playerTarget.player) continue;
            const pl = playerTarget.player;
            if (pl.hp <= 0 || pl.isAttackInvincible?.() || pl.state === PlayerState.BULLET_TIME) continue;
            if (!circlesCollide(p.x, p.y, p.radius, playerTarget.x, playerTarget.y, playerTarget.effectiveRadius + 2)) continue;

            p.alive = false;
            const dmg = pl.takeDamage(p.damage);
            if (dmg > 0 && this.game) {
                this.game.combat.spawnDamageNumber(
                    pl.x, pl.y - pl.effectiveRadius - 8, dmg, false, '#e05840'
                );
                this.game.particles.hitSpark(pl.x, pl.y, false);
                this.game.renderer.shake(CONFIG.SHAKE.NORMAL.magnitude * 0.55, CONFIG.SHAKE.NORMAL.duration * 0.75);
            }
        }

        this.projectiles = this.projectiles.filter(p => p.alive);
    }

    draw(ctx) {
        for (const p of this.projectiles) {
            if (!p.alive) continue;
            const x = Math.floor(p.x);
            const y = Math.floor(p.y);
            ctx.save();
            ctx.translate(x, y);
            ctx.rotate(p.angle + Math.PI);
            const shaftLen = Math.round(18 * (CONFIG.DISPLAY.UNIT_SCALE || 1));
            const headLen = Math.round(8 * (CONFIG.DISPLAY.UNIT_SCALE || 1));
            ctx.fillStyle = '#5a4030';
            ctx.fillRect(-12, -1.5, shaftLen, 3);
            ctx.fillStyle = '#c8a878';
            ctx.beginPath();
            ctx.moveTo(8, 0);
            ctx.lineTo(8 + headLen * 0.75, -3);
            ctx.lineTo(8 + headLen * 0.75, 3);
            ctx.closePath();
            ctx.fill();
            ctx.fillStyle = '#e8dcc8';
            ctx.fillRect(-14, -1, 4, 2);
            ctx.restore();
        }
    }
}
