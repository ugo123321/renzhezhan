class BossFireball {
    constructor(x, y, vx, vy, radius) {
        this.x = x;
        this.y = y;
        this.vx = vx;
        this.vy = vy;
        this.radius = radius;
        this.alive = true;
        this.spin = Math.random() * Math.PI * 2;
    }

    update(dt, canvasW, canvasH) {
        this.x += this.vx * dt;
        this.y += this.vy * dt;
        this.spin += dt * 10;
        if (this.x < -30 || this.x > canvasW + 30 ||
            this.y < -30 || this.y > canvasH + 30) {
            this.alive = false;
        }
    }

    draw(ctx) {
        if (!this.alive) return;
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate(this.spin);

        ctx.globalAlpha = 0.35;
        const glow = ctx.createRadialGradient(0, 0, 0, 0, 0, this.radius * 2.2);
        glow.addColorStop(0, 'rgba(255, 200, 80, 0.9)');
        glow.addColorStop(0.5, 'rgba(255, 80, 20, 0.4)');
        glow.addColorStop(1, 'rgba(255, 40, 0, 0)');
        ctx.fillStyle = glow;
        ctx.beginPath();
        ctx.arc(0, 0, this.radius * 2.2, 0, Math.PI * 2);
        ctx.fill();

        ctx.globalAlpha = 1;
        ctx.fillStyle = '#ff6620';
        ctx.beginPath();
        ctx.arc(0, 0, this.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#ffcc66';
        ctx.beginPath();
        ctx.arc(-this.radius * 0.2, -this.radius * 0.15, this.radius * 0.45, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    }
}

class FireDragonBoss {
    constructor(game, canvasW, canvasH, cfg) {
        this.game = game;
        this.cfg = cfg;
        this.alive = true;
        this.dying = false;
        this.deathHandled = false;
        this.chestDropped = false;
        this.deathTimer = 0;

        this.spriteScale = cfg.spriteScale || 5;
        this.animFrame = 0;
        this.animTimer = 0;

        const spr = SPRITES.fireDragon.idle[0];
        const sz = getSpriteSize(spr, this.spriteScale);
        this.x = canvasW / 2;
        this.y = sz.h * 0.88;
        this.canvasW = canvasW;

        const mouthRow = 17;
        this.mouthX = this.x;
        this.mouthY = this.y - sz.h / 2 + mouthRow * this.spriteScale + this.spriteScale * 0.5;

        this.hitboxRadius = cfg.hitboxRadius;
        this.hp = cfg.hp;
        this.maxHp = cfg.hp;
        this.def = cfg.def;
        this.xpValue = cfg.xp;
        this.color = cfg.color;
        this.size = cfg.hitboxRadius;

        this.attackTimer = cfg.introDelay;
    }

    takeDamage(rawDamage) {
        if (!this.alive || this.dying) return 0;
        const actual = Math.max(1, rawDamage - this.def);
        this.hp -= actual;
        if (this.hp <= 0) {
            this.hp = 0;
            this.dying = true;
            this.deathTimer = 0.8;
        }
        return actual;
    }

    update(dt) {
        if (this.dying) {
            this.deathTimer -= dt;
            if (this.deathTimer <= 0) this.alive = false;
            return;
        }

        this.animTimer += dt;
        if (this.animTimer >= 0.35) {
            this.animTimer = 0;
            this.animFrame = (this.animFrame + 1) % SPRITES.fireDragon.idle.length;
        }

        this.attackTimer -= dt;
        if (this.attackTimer > 0) return;

        this.attackTimer = this.cfg.attackInterval;
        const player = this.game.player;
        if (!player) return;
        this._attackFireballs(player);
    }

    _attackFireballs(player) {
        const mgr = this.game.bossManager;
        const mx = this.mouthX;
        const my = this.mouthY;
        const baseAng = Math.atan2(player.y - my, player.x - mx);
        const count = this.cfg.fireballCount;
        const spread = this.cfg.fireballSpread;

        for (let i = 0; i < count; i++) {
            const t = count > 1 ? (i / (count - 1)) - 0.5 : 0;
            const ang = baseAng + t * spread + randRange(-0.06, 0.06);
            const spd = this.cfg.fireballSpeed * randRange(0.88, 1.08);
            mgr.projectiles.push(new BossFireball(
                mx + Math.cos(ang) * 12,
                my + Math.sin(ang) * 12,
                Math.cos(ang) * spd,
                Math.sin(ang) * spd,
                this.cfg.fireballRadius
            ));
        }

        this.animFrame = 1;
        this.animTimer = 0;
        this.game.particles.spawnEffect(mx, my, '#f84');
        this.game.renderer.shake(5, 0.12);
    }

    draw(ctx) {
        const sprite = SPRITES.fireDragon.idle[this.animFrame];
        const alpha = this.dying ? clamp(this.deathTimer / 0.8, 0, 1) : 1;

        ctx.save();
        ctx.globalAlpha = alpha;

        const sz = getSpriteSize(sprite, this.spriteScale);
        const glowY = this.y + sz.h * 0.05;
        ctx.globalAlpha = 0.18 * alpha;
        const aura = ctx.createRadialGradient(this.x, glowY, 8, this.x, glowY, sz.w * 0.75);
        aura.addColorStop(0, 'rgba(255, 120, 40, 0.55)');
        aura.addColorStop(1, 'rgba(255, 40, 0, 0)');
        ctx.fillStyle = aura;
        ctx.beginPath();
        ctx.arc(this.x, glowY, sz.w * 0.75, 0, Math.PI * 2);
        ctx.fill();

        ctx.globalAlpha = alpha;
        drawSprite(ctx, sprite, Math.floor(this.x), Math.floor(this.y), this.spriteScale);
        ctx.restore();
    }
}

class BossManager {
    constructor(game) {
        this.game = game;
        this.boss = null;
        this.projectiles = [];
        this.introTimer = 0;
    }

    reset() {
        this.boss = null;
        this.projectiles = [];
        this.introTimer = 0;
    }

    prepareForLevel(levelIndex, canvasW, canvasH) {
        this.reset();
        const key = getBossKeyForLevel(levelIndex);
        if (key === 'FIRE_DRAGON') {
            const cfg = CONFIG.BOSSES.FIRE_DRAGON;
            this.boss = new FireDragonBoss(this.game, canvasW, canvasH, cfg);
            this.introTimer = cfg.introDelay;
        }
    }

    isActive() {
        return this.boss && this.boss.alive;
    }

    allClear() {
        if (this.boss) return !this.boss.alive;
        return true;
    }

    update(dt) {
        const w = this.game.renderer.w;
        const h = this.game.renderer.h;

        if (this.introTimer > 0) {
            this.introTimer -= dt;
        }

        if (this.boss && this.boss.alive && this.introTimer <= 0) {
            this.boss.update(dt);
        } else if (this.boss && this.boss.dying) {
            this.boss.update(dt);
            if (!this.boss.alive && !this.boss.deathHandled) {
                const combat = this.game.combat;
                if (combat) combat.onBossKilled(this.boss);
            }
        }

        for (const p of this.projectiles) {
            p.update(dt, w, h);
        }
        this.projectiles = this.projectiles.filter(p => p.alive);
    }

    draw(ctx) {
        if (this.boss && (this.boss.alive || this.boss.dying)) {
            this.boss.draw(ctx);
        }
    }

    drawProjectiles(ctx) {
        for (const p of this.projectiles) {
            p.draw(ctx);
        }
    }
}
