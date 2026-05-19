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
        this.comboDamageBonus = CONFIG.PLAYER.COMBO_DAMAGE_BONUS;
        this.comboCount = 0;
        this.comboDisplayPeak = 0;
        this.comboDisplayTimer = 0;
        this.hitboxRadius = CONFIG.PLAYER.HITBOX_RADIUS;

        this.freezeChance = 0;
        this.freezeDuration = 2.0;
        this.lightningChains = 0;

        this.shurikenCount = 0;
        this.shurikenLevel = 0;
        this.crescentLevel = 0;
        this.crescentWaves = 0;
        this.crescentCharge = 0;
        this.blackHoleLevel = 0;
        this.bladeWhirlLevel = 0;
        this.fireballLevel = 0;
        this.fireballCount = 0;

        this.shadowCloneLevel = 0;
        this.shadowCloneCount = 0;
        this.shadowCloneDamageRatio = 0.30;
        this.shadowClonesPending = 0;
        this.shadowClonesActive = false;
        this.shadowCloneSlots = [];

        this.invincibleTimer = 0;
        this.flashTimer = 0;
        this.hitFlashTimer = 0;

        this.attackPath = [];
        this.pathIndex = 0;
        this.pathProgress = 0;
        this.hitMonstersInSegment = new Set();

        this.animFrame = 0;
        this.animTimer = 0;
        this.facingRight = true;
        this.lastX = x;
        this.lastY = y;

        this.level = 1;
        this.xp = 0;
        this.xpToNext = CONFIG.XP.BASE_REQUIRED;

        this.bossRewardDualWield = false;
        this.bossRewardIai = false;
        this.bossRewardDeepBreath = false;
        this.attackFirstCritUsed = false;
    }

    get effectiveRadius() {
        return this.hitboxRadius * this.sizeScale;
    }

    get spriteScale() {
        return CONFIG.DISPLAY.NINJA_SPRITE_SCALE * this.sizeScale;
    }

    get triggerRadius() {
        const refW = (typeof CONFIG !== 'undefined' && CONFIG.DISPLAY)
            ? CONFIG.DISPLAY.LOGICAL_WIDTH
            : 390;
        return Math.max(48, CONFIG.PLAYER.TRIGGER_RADIUS_RATIO * refW);
    }

    isInAttackMode() {
        return this.state === PlayerState.ATTACKING ||
            this.state === PlayerState.RETURNING;
    }

    isVulnerable() {
        if (this.isInAttackMode() || this.state === PlayerState.BULLET_TIME) {
            return false;
        }
        return this.invincibleTimer <= 0;
    }

    getComboDamageMultiplier() {
        if (this.comboCount <= 1) return 1;
        return 1 + this.comboDamageBonus * (this.comboCount - 1);
    }

    registerComboHit() {
        if (this.state !== PlayerState.ATTACKING) return 0;
        const inc = this.bossRewardDualWield ? 2 : 1;
        this.comboCount += inc;
        this.comboDisplayPeak = Math.max(this.comboDisplayPeak, this.comboCount);
        this.comboDisplayTimer = CONFIG.PLAYER.COMBO_DISPLAY_HOLD;
        return this.comboCount;
    }

    resetCombo() {
        if (this.comboDisplayPeak >= 2) {
            this.comboDisplayTimer = CONFIG.PLAYER.COMBO_END_FADE;
        } else {
            this.comboDisplayTimer = 0;
            this.comboDisplayPeak = 0;
        }
        this.comboCount = 0;
    }

    getComboBonusPercent(combo) {
        if (combo <= 1) return 0;
        return Math.round(this.comboDamageBonus * (combo - 1) * 100);
    }

    updateComboDisplay(dt) {
        if (this.comboDisplayTimer > 0) {
            this.comboDisplayTimer -= dt;
            if (this.comboDisplayTimer <= 0) {
                this.comboDisplayPeak = 0;
            }
        }
    }

    getDamage() {
        const isCrit = Math.random() < this.critRate;
        let dmg = this.baseDamage * (1 + this.damageBonus);
        dmg *= this.getComboDamageMultiplier();
        let isIaiCrit = false;
        if (isCrit) {
            if (this.bossRewardIai && !this.attackFirstCritUsed) {
                this.attackFirstCritUsed = true;
                dmg *= 3;
                isIaiCrit = true;
            } else {
                dmg *= this.critMultiplier;
            }
        }
        return { damage: Math.round(dmg), isCrit, isIaiCrit, combo: this.comboCount };
    }

    getCloneDamage() {
        const isCrit = Math.random() < this.critRate;
        let dmg = this.baseDamage * (1 + this.damageBonus) * this.shadowCloneDamageRatio;
        if (isCrit) dmg *= this.critMultiplier;
        return { damage: Math.round(dmg), isCrit };
    }

    _getShadowHomePosition(index, total) {
        const backAng = Math.atan2(this.homeY - this.y, this.homeX - this.x) || Math.PI;
        const perpX = -Math.sin(backAng);
        const perpY = Math.cos(backAng);
        const side = index % 2 === 0 ? -1 : 1;
        const tier = Math.floor(index / 2);
        const lateral = (22 + tier * 16) * side;
        const back = 18 + tier * 6;
        return {
            x: this.homeX - Math.cos(backAng) * back + perpX * lateral,
            y: this.homeY - Math.sin(backAng) * back + perpY * lateral,
        };
    }

    _armShadowClonesForAttack() {
        if (this.shadowClonesPending <= 0) return;
        this.shadowClonesActive = true;
        this.shadowCloneSlots = [];
        const count = this.shadowClonesPending;
        for (let i = 0; i < count; i++) {
            const side = i % 2 === 0 ? -1 : 1;
            const tier = Math.floor(i / 2);
            this.shadowCloneSlots.push({
                side,
                lateralDist: 22 + tier * 16,
                backOffset: 6,
                x: this.x,
                y: this.y,
                hitMonstersInSegment: new Set(),
            });
        }
        this.shadowClonesPending = 0;
    }

    _updateShadowClonePositions() {
        if (!this.shadowClonesActive || !this.shadowCloneSlots.length) return;

        let moveAng = this.facingRight ? 0 : Math.PI;
        if (this.pathIndex < this.attackPath.length - 1) {
            const to = this.attackPath[this.pathIndex + 1];
            moveAng = Math.atan2(to.y - this.y, to.x - this.x);
        }
        const perpX = -Math.sin(moveAng);
        const perpY = Math.cos(moveAng);
        const backX = -Math.cos(moveAng);
        const backY = -Math.sin(moveAng);

        for (const slot of this.shadowCloneSlots) {
            slot.x = this.x + perpX * slot.lateralDist * slot.side + backX * slot.backOffset;
            slot.y = this.y + perpY * slot.lateralDist * slot.side + backY * slot.backOffset;
        }
    }

    _tryLeaveShadowClones() {
        if (this.shadowCloneLevel <= 0 || this.comboCount <= 10) return;
        this.shadowClonesPending = this.shadowCloneCount || 1;
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
        this.state = PlayerState.ATTACKING;
        this.attackFirstCritUsed = false;
        this.resetCombo();
        this.crescentCharge = 0;
        this.comboDisplayPeak = 0;
        this.comboDisplayTimer = 0;
        this.pathIndex = 0;
        this.pathProgress = 0;
        this.hitMonstersInSegment.clear();
        this._armShadowClonesForAttack();
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

        this.updateComboDisplay(realDt);

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

    beginReturnHome() {
        this._tryLeaveShadowClones();
        this.resetCombo();
        this.crescentCharge = 0;
        this.state = PlayerState.RETURNING;
        this.animFrame = 0;
        this.animTimer = 0;
    }

    updateAttack(dt) {
        if (this.pathIndex >= this.attackPath.length - 1) {
            this.beginReturnHome();
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

        this._updateShadowClonePositions();

        if (this.pathIndex >= this.attackPath.length - 1) {
            this.beginReturnHome();
        }
    }

    updateReturn(dt) {
        const d = dist(this.x, this.y, this.homeX, this.homeY);
        if (d < 3) {
            this.x = this.homeX;
            this.y = this.homeY;
            this.state = PlayerState.IDLE;
            this.shadowClonesActive = false;
            this.shadowCloneSlots = [];
            return;
        }

        const n = normalize(this.homeX - this.x, this.homeY - this.y);
        const move = CONFIG.PLAYER.ATTACK_SPEED * dt;
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

        const spriteScale = this.spriteScale;

        this._drawBossRewardAuras(ctx, spriteScale);

        if (this.state === PlayerState.ATTACKING) {
            drawSlashArc(ctx, this.x, this.y, this.facingRight, this.animFrame, spriteScale);
            if (this.bossRewardDualWield) {
                drawSlashArc(ctx, this.x, this.y, !this.facingRight,
                    (this.animFrame + 2) % 4, spriteScale * 0.92);
            }
        }

        let tintAmount = 0;
        if (this.hitFlashTimer > 0) {
            const flashDur = CONFIG.PLAYER.HIT_FLASH_DURATION;
            const t = this.hitFlashTimer / flashDur;
            const pulse = 0.55 + Math.sin((1 - t) * Math.PI * 6) * 0.45;
            tintAmount = pulse * t;
        }

        this._drawShadowClones(ctx, spriteScale);

        if (this.bossRewardDualWield) {
            const offHandX = this.facingRight ? -spriteScale * 5 : spriteScale * 5;
            drawSprite(ctx, this.getCurrentSprite(),
                Math.floor(this.x + offHandX), Math.floor(this.y),
                spriteScale * 0.92, 0.88, this.facingRight, 0.35);
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

        this._drawBossRewardAccessories(ctx, spriteScale);
    }

    _drawBossRewardAuras(ctx, spriteScale) {
        const t = Date.now() * 0.001;

        if (this.bossRewardDeepBreath) {
            const pulse = 0.75 + Math.sin(t * 3.2) * 0.25;
            for (let ring = 0; ring < 3; ring++) {
                const r = (22 + ring * 11) * this.sizeScale * pulse;
                ctx.save();
                ctx.globalAlpha = (0.22 - ring * 0.05) * pulse;
                ctx.strokeStyle = ['#28d8f0', '#68e8ff', '#a8f4ff'][ring];
                ctx.lineWidth = 3 + ring;
                ctx.beginPath();
                ctx.arc(this.x, this.y, r, 0, Math.PI * 2);
                ctx.stroke();
                ctx.restore();
            }
        }

        if (this.bossRewardIai) {
            const pulse = 0.8 + Math.sin(t * 4) * 0.2;
            ctx.save();
            ctx.globalAlpha = 0.28 * pulse;
            const grad = ctx.createRadialGradient(
                this.x, this.y, 8, this.x, this.y, 38 * this.sizeScale);
            grad.addColorStop(0, 'rgba(160, 200, 255, 0.9)');
            grad.addColorStop(1, 'rgba(80, 120, 200, 0)');
            ctx.fillStyle = grad;
            ctx.beginPath();
            ctx.arc(this.x, this.y, 38 * this.sizeScale * pulse, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
        }
    }

    _drawBossRewardAccessories(ctx, spriteScale) {
        const flip = !this.facingRight;
        const dir = this.facingRight ? 1 : -1;

        if (this.bossRewardIai) {
            ctx.save();
            ctx.translate(this.x, this.y);
            if (flip) ctx.scale(-1, 1);
            ctx.strokeStyle = '#c8e8ff';
            ctx.lineWidth = Math.max(2, spriteScale * 0.35);
            ctx.shadowColor = '#8cf';
            ctx.shadowBlur = 8;
            ctx.beginPath();
            ctx.moveTo(-spriteScale * 1.2, spriteScale * 0.3);
            ctx.lineTo(-spriteScale * 2.8, -spriteScale * 0.8);
            ctx.stroke();
            ctx.fillStyle = '#6a88b8';
            ctx.fillRect(-spriteScale * 2.9, -spriteScale * 1.1,
                spriteScale * 0.5, spriteScale * 0.7);
            ctx.restore();
        }

        if (this.bossRewardDualWield) {
            ctx.save();
            ctx.translate(this.x, this.y);
            if (flip) ctx.scale(-1, 1);
            const bladeLen = spriteScale * 3.2;
            ctx.strokeStyle = '#ff9040';
            ctx.lineWidth = Math.max(2, spriteScale * 0.4);
            ctx.shadowColor = '#f84';
            ctx.shadowBlur = 10;
            ctx.beginPath();
            ctx.moveTo(spriteScale * 0.8, -spriteScale * 0.2);
            ctx.lineTo(spriteScale * 0.8 + bladeLen * dir, -spriteScale * 1.4);
            ctx.stroke();
            ctx.restore();
        }

        if (this.bossRewardDeepBreath) {
            const puff = Math.sin(Date.now() * 0.006) * 0.5 + 0.5;
            ctx.save();
            ctx.globalAlpha = 0.35 + puff * 0.25;
            ctx.fillStyle = '#a8f0ff';
            ctx.beginPath();
            ctx.arc(this.x - 14 * dir, this.y - 22, 5 + puff * 3, 0, Math.PI * 2);
            ctx.fill();
            ctx.beginPath();
            ctx.arc(this.x + 10 * dir, this.y - 26, 4 + puff * 2, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
        }
    }

    _drawShadowClones(ctx, spriteScale) {
        const sprite = this.state === PlayerState.ATTACKING
            ? SPRITES.ninja.attack[0]
            : SPRITES.ninja.idle[0];

        if (this.shadowClonesActive && this.shadowCloneSlots.length) {
            for (const slot of this.shadowCloneSlots) {
                ctx.save();
                ctx.globalAlpha = 0.42;
                drawSprite(ctx, sprite, Math.floor(slot.x), Math.floor(slot.y),
                    spriteScale, 1, !this.facingRight, 0);
                ctx.fillStyle = 'rgba(40, 30, 60, 0.35)';
                ctx.beginPath();
                ctx.arc(slot.x, slot.y, 10, 0, Math.PI * 2);
                ctx.fill();
                ctx.restore();
            }
            return;
        }

        if (this.shadowClonesPending > 0 &&
            (this.state === PlayerState.IDLE ||
                this.state === PlayerState.RETURNING ||
                this.state === PlayerState.BULLET_TIME)) {
            for (let i = 0; i < this.shadowClonesPending; i++) {
                const pos = this._getShadowHomePosition(i, this.shadowClonesPending);
                ctx.save();
                ctx.globalAlpha = 0.38 + Math.sin(Date.now() * 0.005 + i) * 0.08;
                drawSprite(ctx, SPRITES.ninja.idle[0], Math.floor(pos.x), Math.floor(pos.y),
                    spriteScale, 1, i % 2 === 0, 0);
                ctx.restore();
            }
        }
    }

    drawTriggerZone(ctx) {
        if (this.state === PlayerState.BULLET_TIME) return;

        const showZone =
            this.state === PlayerState.IDLE ||
            this.state === PlayerState.ATTACKING ||
            this.state === PlayerState.RETURNING;

        if (!showZone) return;

        const pulse = 0.85 + Math.sin(Date.now() * 0.006) * 0.15;

        ctx.beginPath();
        ctx.arc(this.homeX, this.homeY, this.triggerRadius, 0, Math.PI * 2);
        ctx.strokeStyle = 'rgba(90, 110, 130, 0.4)';
        ctx.lineWidth = 2;
        ctx.setLineDash([6, 4]);
        ctx.stroke();
        ctx.setLineDash([]);

        ctx.beginPath();
        ctx.arc(this.homeX, this.homeY, this.triggerRadius, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(90, 110, 130, 0.08)';
        ctx.fill();
    }

    drawPath(ctx) {
        if (this.attackPath.length < 2) return;

        const isDrawing = this.state === PlayerState.BULLET_TIME;
        const outerW = isDrawing ? 12 : 5;
        const midW = isDrawing ? 7 : 2.5;
        const innerW = isDrawing ? 3 : 1;

        ctx.beginPath();
        ctx.moveTo(this.attackPath[0].x, this.attackPath[0].y);
        for (let i = 1; i < this.attackPath.length; i++) {
            ctx.lineTo(this.attackPath[i].x, this.attackPath[i].y);
        }
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';

        if (isDrawing) {
            ctx.strokeStyle = 'rgba(50, 55, 70, 0.55)';
            ctx.lineWidth = outerW;
            ctx.stroke();
            ctx.strokeStyle = 'rgba(170, 185, 210, 0.92)';
            ctx.lineWidth = midW;
            ctx.stroke();
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.98)';
            ctx.lineWidth = innerW;
            ctx.stroke();
        } else {
            ctx.strokeStyle = 'rgba(90, 100, 115, 0.18)';
            ctx.lineWidth = outerW;
            ctx.stroke();
            ctx.strokeStyle = 'rgba(160, 175, 195, 0.22)';
            ctx.lineWidth = midW;
            ctx.stroke();
        }
    }
}
