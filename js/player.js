const PlayerState = {
    IDLE: 'idle',
    BULLET_TIME: 'bulletTime',
    ATTACKING: 'attacking',
    RETURNING: 'returning',
};

class Player {
    constructor(x, y) {
        this.homeX = x;
        this.homeY = y;
        this.x = x;
        this.y = y;
        this.state = PlayerState.IDLE;

        this.maxHearts = CONFIG.PLAYER.MAX_HEARTS;
        this.hearts = this.maxHearts;
        this.ki = CONFIG.PLAYER.KI_MAX;
        this.kiMax = CONFIG.PLAYER.KI_MAX;
        this.baseDamage = CONFIG.PLAYER.BASE_ATTACK;
        this.critRate = CONFIG.PLAYER.CRIT_RATE;
        this.critMultiplier = CONFIG.PLAYER.CRIT_MULTIPLIER;
        this.sizeScale = CONFIG.PLAYER.SIZE_SCALE;
        this.damageBonus = 0;
        this.hitboxRadius = CONFIG.PLAYER.HITBOX_RADIUS;

        this.freezeChance = 0;
        this.freezeDuration = 2.0;
        this.lightningChains = 0;

        this.invincibleTimer = 0;
        this.flashTimer = 0;
        this.hitFlashTimer = 0;

        this.attackPath = [];
        this.pathIndex = 0;
        this.pathProgress = 0;
        this.returnToCircle = false;

        this.hitMonstersInSegment = new Set();

        this.animFrame = 0;
        this.animTimer = 0;
        this.facingRight = true;
        this.lastX = x;
        this.lastY = y;

        this.level = 1;
        this.xp = 0;
        this.xpToNext = CONFIG.XP.BASE_REQUIRED;
    }

    get effectiveRadius() {
        return this.hitboxRadius * this.sizeScale;
    }

    get triggerRadius() {
        const refW = (typeof CONFIG !== 'undefined' && CONFIG.DISPLAY)
            ? CONFIG.DISPLAY.LOGICAL_WIDTH
            : 390;
        return Math.max(48, CONFIG.PLAYER.TRIGGER_RADIUS_RATIO * refW);
    }

    isVulnerable() {
        return this.state !== PlayerState.ATTACKING &&
            this.state !== PlayerState.BULLET_TIME &&
            this.invincibleTimer <= 0;
    }

    getDamage() {
        const isCrit = Math.random() < this.critRate;
        let dmg = this.baseDamage * (1 + this.damageBonus);
        if (isCrit) dmg *= this.critMultiplier;
        return { damage: Math.round(dmg), isCrit };
    }

    takeDamage(amount) {
        if (!this.isVulnerable()) return false;
        this.hearts -= amount;
        if (this.hearts < 0) this.hearts = 0;
        this.invincibleTimer = CONFIG.PLAYER.INVINCIBLE_AFTER_HIT;
        this.flashTimer = CONFIG.PLAYER.INVINCIBLE_AFTER_HIT;
        this.hitFlashTimer = CONFIG.PLAYER.HIT_FLASH_DURATION;
        return true;
    }

    isDead() {
        return this.hearts <= 0;
    }

    startBulletTime() {
        this.state = PlayerState.BULLET_TIME;
        this.attackPath = [];
        this.hitMonstersInSegment.clear();
        this.animFrame = 0;
        this.animTimer = 0;
    }

    addPathPoint(x, y) {
        const last = this.attackPath[this.attackPath.length - 1];
        if (!last || dist(last.x, last.y, x, y) > 5) {
            this.attackPath.push({ x, y });
        }
    }

    startAttack() {
        if (this.attackPath.length < 2) {
            this.state = PlayerState.IDLE;
            return;
        }
        const lastPt = this.attackPath[this.attackPath.length - 1];
        this.returnToCircle = dist(lastPt.x, lastPt.y, this.homeX, this.homeY) < this.triggerRadius;
        this.state = PlayerState.ATTACKING;
        this.pathIndex = 0;
        this.pathProgress = 0;
        this.hitMonstersInSegment.clear();
        this.animFrame = 0;
        this.animTimer = 0;
    }

    updateAnimation(realDt) {
        let interval = 0.35;
        let frameCount = SPRITES.ninja.idle.length;

        if (this.state === PlayerState.ATTACKING) {
            interval = 0.055;
            frameCount = SPRITES.ninja.attack.length;
        } else if (this.state === PlayerState.RETURNING) {
            interval = 0.1;
            frameCount = SPRITES.ninja.run.length;
        }

        this.animTimer += realDt;
        if (this.animTimer >= interval) {
            this.animTimer = 0;
            this.animFrame = (this.animFrame + 1) % frameCount;
        }

    }

    update(dt, realDt) {
        this.lastX = this.x;
        this.lastY = this.y;
        this.updateAnimation(realDt);

        if (this.invincibleTimer > 0) {
            this.invincibleTimer -= realDt;
            this.flashTimer -= realDt;
        }
        if (this.hitFlashTimer > 0) {
            this.hitFlashTimer -= realDt;
        }

        if (this.state === PlayerState.BULLET_TIME) {
            this.ki -= CONFIG.PLAYER.KI_DRAIN_RATE * realDt;
            if (this.ki < 0) this.ki = 0;
        } else {
            this.ki += CONFIG.PLAYER.KI_REGEN_RATE * realDt;
            if (this.ki > this.kiMax) this.ki = this.kiMax;
        }

        if (this.state === PlayerState.ATTACKING) {
            this.updateAttack(dt);
        } else if (this.state === PlayerState.RETURNING) {
            this.updateReturn(dt);
        }
    }

    updateAttack(dt) {
        if (this.pathIndex >= this.attackPath.length - 1) {
            this.state = PlayerState.RETURNING;
            return;
        }

        const speed = CONFIG.PLAYER.ATTACK_SPEED;
        let remaining = speed * dt;

        while (remaining > 0 && this.pathIndex < this.attackPath.length - 1) {
            const from = this.attackPath[this.pathIndex];
            const to = this.attackPath[this.pathIndex + 1];
            const segDist = dist(from.x, from.y, to.x, to.y);

            if (segDist === 0) {
                this.pathIndex++;
                continue;
            }

            const segRemaining = segDist * (1 - this.pathProgress);
            if (remaining >= segRemaining) {
                remaining -= segRemaining;
                this.pathIndex++;
                this.pathProgress = 0;
                this.x = to.x;
                this.y = to.y;
            } else {
                this.pathProgress += remaining / segDist;
                const t = this.pathProgress;
                this.x = from.x + (to.x - from.x) * t;
                this.y = from.y + (to.y - from.y) * t;
                remaining = 0;
            }
        }

        if (this.pathIndex < this.attackPath.length - 1) {
            const to = this.attackPath[this.pathIndex + 1];
            this.facingRight = to.x > this.x;
        }

        if (this.pathIndex >= this.attackPath.length - 1) {
            this.state = PlayerState.RETURNING;
        }
    }

    updateReturn(dt) {
        if (this.returnToCircle) {
            this.x = this.homeX;
            this.y = this.homeY;
            this.state = PlayerState.IDLE;
            return;
        }

        const d = dist(this.x, this.y, this.homeX, this.homeY);
        if (d < 3) {
            this.x = this.homeX;
            this.y = this.homeY;
            this.state = PlayerState.IDLE;
            return;
        }

        const n = normalize(this.homeX - this.x, this.homeY - this.y);
        const move = CONFIG.PLAYER.RETURN_SPEED_SLOW * dt;
        this.x += n.x * Math.min(move, d);
        this.y += n.y * Math.min(move, d);
        this.facingRight = n.x > 0;
    }

    addXP(amount) {
        this.xp += amount;
        if (this.xp >= this.xpToNext) {
            this.xp -= this.xpToNext;
            this.level++;
            this.xpToNext = Math.floor(CONFIG.XP.BASE_REQUIRED * Math.pow(CONFIG.XP.SCALE_FACTOR, this.level - 1));
            return true;
        }
        return false;
    }

    getCurrentSprite() {
        if (this.state === PlayerState.ATTACKING) {
            return SPRITES.ninja.attack[this.animFrame % SPRITES.ninja.attack.length];
        }
        if (this.state === PlayerState.RETURNING) {
            return SPRITES.ninja.run[this.animFrame % SPRITES.ninja.run.length];
        }
        return SPRITES.ninja.idle[this.animFrame % SPRITES.ninja.idle.length];
    }

    draw(ctx) {
        const isInvincibleBlink = this.invincibleTimer > 0 &&
            Math.floor(this.flashTimer * 10) % 2 === 0 &&
            this.state !== PlayerState.RETURNING;

        const spriteScale = Math.round(CONFIG.DISPLAY.NINJA_SPRITE_SCALE * this.sizeScale);

        if (this.state === PlayerState.ATTACKING) {
            drawSlashArc(ctx, this.x, this.y, this.facingRight, this.animFrame, spriteScale);
        }

        let tintAmount = 0;
        if (this.hitFlashTimer > 0) {
            const flashDur = CONFIG.PLAYER.HIT_FLASH_DURATION;
            const t = this.hitFlashTimer / flashDur;
            const pulse = 0.55 + Math.sin((1 - t) * Math.PI * 6) * 0.45;
            tintAmount = pulse * t;
        }

        if (isInvincibleBlink) {
            ctx.save();
            ctx.globalAlpha = 0.45;
        }

        drawSprite(ctx, this.getCurrentSprite(), Math.floor(this.x), Math.floor(this.y),
            spriteScale, 1, !this.facingRight, tintAmount);

        if (isInvincibleBlink) {
            ctx.restore();
        }
    }

    drawTriggerZone(ctx) {
        const showZone =
            this.state === PlayerState.IDLE ||
            this.state === PlayerState.BULLET_TIME ||
            this.state === PlayerState.ATTACKING ||
            this.state === PlayerState.RETURNING;

        if (!showZone) return;

        const isDrawing = this.state === PlayerState.BULLET_TIME;
        const pulse = 0.85 + Math.sin(Date.now() * 0.006) * 0.15;

        ctx.beginPath();
        ctx.arc(this.homeX, this.homeY, this.triggerRadius, 0, Math.PI * 2);
        ctx.strokeStyle = isDrawing
            ? `rgba(75, 105, 135, ${0.65 * pulse})`
            : 'rgba(90, 110, 130, 0.4)';
        ctx.lineWidth = isDrawing ? 3 : 2;
        ctx.setLineDash(isDrawing ? [8, 5] : [6, 4]);
        ctx.stroke();
        ctx.setLineDash([]);

        ctx.beginPath();
        ctx.arc(this.homeX, this.homeY, this.triggerRadius, 0, Math.PI * 2);
        ctx.fillStyle = isDrawing
            ? 'rgba(75, 105, 135, 0.14)'
            : 'rgba(90, 110, 130, 0.08)';
        ctx.fill();

        if (isDrawing) {
            drawGameText(ctx, '画回此处瞬移', this.homeX, this.homeY + this.triggerRadius + 14,
                11, '#4a5a68');
        }
    }

    drawPath(ctx) {
        if (this.attackPath.length < 2) return;
        ctx.beginPath();
        ctx.moveTo(this.attackPath[0].x, this.attackPath[0].y);
        for (let i = 1; i < this.attackPath.length; i++) {
            ctx.lineTo(this.attackPath[i].x, this.attackPath[i].y);
        }
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';

        ctx.strokeStyle = 'rgba(70, 75, 85, 0.4)';
        ctx.lineWidth = 7;
        ctx.stroke();

        ctx.strokeStyle = 'rgba(200, 208, 220, 0.88)';
        ctx.lineWidth = 4;
        ctx.stroke();

        ctx.strokeStyle = 'rgba(255, 255, 255, 0.95)';
        ctx.lineWidth = 1.5;
        ctx.stroke();
    }
}
