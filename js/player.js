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

        this.baseAttack = CONFIG.PLAYER.BASE_ATTACK;
        this.attackPowerScale = 1;
        this.critRate = CONFIG.PLAYER.BASE_CRIT_RATE;
        this.critDamage = CONFIG.PLAYER.BASE_CRIT_DAMAGE;
        this.sizeScale = CONFIG.PLAYER.SIZE_SCALE;

        this.baseKi = CONFIG.PLAYER.BASE_KI;
        this.kiMax = this.baseKi;
        this.ki = this.kiMax;
        this.nextTurnKiBonus = 0;

        this.comboCount = 0;
        this.comboDisplayPeak = 0;
        this.comboDisplayTimer = 0;
        this.comboShakeTimer = 0;
        this.waterTornadoCharge = 0;
        this.whirlCharge = 0;
        this.comboDamageBonus = CONFIG.PLAYER.COMBO_DAMAGE_BONUS;

        this.attackPath = [];
        this.pathIndex = 0;
        this.pathProgress = 0;
        this.hitMonstersInSegment = new Set();
        this.invalidPathTimer = 0;
        this.kiAtDrawStart = this.ki;

        this.turnBuffs = {
            attackMult: 1,
            comboMult: 1,
            iceReady: false,
        };
        this.shadowClones = [];

        this.upgradeStacks = {};
        this.collectedOrbBuffs = [];
        this.drawSessionSnapshot = null;
        this.activeMessage = '';
        this.messageTimer = 0;
    }

    get effectiveRadius() {
        return CONFIG.PLAYER.HITBOX_RADIUS * this.sizeScale;
    }

    get triggerRadius() {
        const refW = CONFIG.DISPLAY.LOGICAL_WIDTH;
        const base = Math.max(48, CONFIG.PLAYER.TRIGGER_RADIUS_RATIO * refW);
        return base * this.sizeScale;
    }

    get spriteScale() {
        return CONFIG.DISPLAY.NINJA_SPRITE_SCALE * this.sizeScale;
    }

    isInAttackMode() {
        return this.state === PlayerState.ATTACKING || this.state === PlayerState.RETURNING;
    }

    resetLineBuffs() {
        this.collectedOrbBuffs = [];
        this.turnBuffs.attackMult = 1;
        this.turnBuffs.comboMult = 1;
        this.turnBuffs.iceReady = false;
    }

    beginTurn() {
        this.deathAnim = null;
        this.state = PlayerState.IDLE;
        this.attackPath = [];
        this.pathIndex = 0;
        this.pathProgress = 0;
        this.hitMonstersInSegment.clear();
        this.invalidPathTimer = 0;
        this.comboCount = 0;
        this.comboDisplayPeak = 0;
        this.comboDisplayTimer = 0;
        this.comboShakeTimer = 0;
        this.waterTornadoCharge = 0;
        this.drawSessionSnapshot = null;
        if (this.game && this.game.buffOrbs) {
            this.game.buffOrbs.drawSessionEaten = [];
        }
        this.resetLineBuffs();
        const turnKiMax = Math.round(this.baseKi * (1 + this.nextTurnKiBonus));
        this.kiMax = Math.max(20, turnKiMax);
        this.ki = this.kiMax;
        this.nextTurnKiBonus = 0;
    }

    invalidatePath() {
        this.invalidPathTimer = 0.3;
        this.state = PlayerState.IDLE;
        if (this.game && this.game.buffOrbs) this.game.buffOrbs.cancelDrawSession();
        this.pathIndex = 0;
        this.pathProgress = 0;
        this.hitMonstersInSegment.clear();
        this.queueMessage('路径无效');
    }

    consumeKiByDistance(d) {
        const cost = d * CONFIG.PLAYER.KI_PER_PIXEL;
        this.ki = Math.max(0, this.ki - cost);
        return this.ki > 0;
    }

    startBulletTime() {
        this.state = PlayerState.BULLET_TIME;
        if (this.game && this.game.buffOrbs) this.game.buffOrbs.beginDrawSession();
        this.invalidPathTimer = 0;
        this.attackPath = [];
        this.pathIndex = 0;
        this.pathProgress = 0;
        this.hitMonstersInSegment.clear();
    }

    addPathPoint(x, y) {
        const last = this.attackPath[this.attackPath.length - 1];
        if (!last || dist(last.x, last.y, x, y) > 4) this.attackPath.push({ x, y });
    }

    startAttack() {
        if (this.attackPath.length < 2) {
            this.state = PlayerState.IDLE;
            this.attackPath = [];
            return false;
        }
        this.state = PlayerState.ATTACKING;
        if (this.game && this.game.buffOrbs) this.game.buffOrbs.commitDrawSession();
        this.pathIndex = 0;
        this.pathProgress = 0;
        this.hitMonstersInSegment.clear();
        this.comboCount = 0;
        this.comboDisplayPeak = 0;
        this.comboDisplayTimer = 0;
        this.comboShakeTimer = 0;
        this.waterTornadoCharge = 0;
        this.whirlCharge = 0;
        return true;
    }

    registerComboHit() {
        const baseInc = this.getUpgradeLevel('dual_wield') > 0 ? 2 : 1;
        const inc = baseInc * this.turnBuffs.comboMult;
        this.comboCount += inc;
        this.comboDisplayPeak = Math.max(this.comboDisplayPeak, this.comboCount);
        this.comboDisplayTimer = CONFIG.PLAYER.COMBO_DISPLAY_HOLD;
        return this.comboCount;
    }

    _getShadowCloneAnchor() {
        if (this.state === PlayerState.ATTACKING || this.state === PlayerState.RETURNING) {
            return { x: this.x, y: this.y };
        }
        return { x: this.homeX, y: this.homeY };
    }

    _syncShadowClones() {
        if (!this.shadowClones.length) return;
        const anchor = this._getShadowCloneAnchor();
        for (const c of this.shadowClones) {
            c.x = anchor.x + c.ox;
            c.y = anchor.y + c.oy;
        }
    }

    addShadowClones(count) {
        if (count <= 0) return;
        for (let i = 0; i < count; i++) {
            const idx = this.shadowClones.length;
            const side = idx % 2 === 0 ? -1 : 1;
            const tier = Math.floor(idx / 2);
            this.shadowClones.push({
                ox: side * (18 + tier * 14),
                oy: -10 - tier * 4,
            });
        }
        this._syncShadowClones();
    }

    endCombo() {
        if (this.getUpgradeLevel('shadow_clone') > 0 && this.comboDisplayPeak > 10) {
            this.addShadowClones(this.getUpgradeLevel('shadow_clone'));
        }
        if (this.comboDisplayPeak >= 2) this.comboDisplayTimer = CONFIG.PLAYER.COMBO_END_FADE;
        this.comboCount = 0;
    }

    getComboBonusPercent(combo) {
        if (combo <= 1) return 0;
        return Math.round((combo - 1) * this.comboDamageBonus * 100);
    }

    getDamage() {
        const crit = Math.random() < this.critRate;
        let dmg = this.baseAttack * this.attackPowerScale;
        dmg *= this.turnBuffs.attackMult;
        dmg *= 1 + Math.max(0, this.comboCount - 1) * this.comboDamageBonus;
        if (crit) dmg *= this.critDamage;
        return { damage: Math.round(dmg), isCrit: crit };
    }

    getAbilityDamage(mult) {
        return Math.max(1, Math.round(this.baseAttack * this.attackPowerScale * mult));
    }

    queueMessage(text) {
        this.activeMessage = text;
        this.messageTimer = 1.25;
    }

    getUpgradeLevel(id) {
        return this.upgradeStacks[id] || 0;
    }

    applyUpgrade(upgrade) {
        this.upgradeStacks[upgrade.id] = (this.upgradeStacks[upgrade.id] || 0) + 1;
        upgrade.apply(this, this.upgradeStacks[upgrade.id]);
        this.queueMessage(`获得强化: ${upgrade.name}`);
    }

    update(dt) {
        if (this.messageTimer > 0) this.messageTimer -= dt;
        if (this.invalidPathTimer > 0) {
            this.invalidPathTimer -= dt;
            if (this.invalidPathTimer <= 0) {
                this.attackPath = [];
            }
        }

        if (this.comboDisplayTimer > 0) {
            this.comboDisplayTimer -= dt;
            if (this.comboDisplayTimer <= 0) this.comboDisplayPeak = 0;
        }
        if (this.comboShakeTimer > 0) {
            this.comboShakeTimer = Math.max(0, this.comboShakeTimer - dt);
        }

        if (this.state === PlayerState.ATTACKING) this._updateAttack(dt);
        else if (this.state === PlayerState.RETURNING) this._updateReturn(dt);
        this._syncShadowClones();
    }

    _updateAttack(dt) {
        if (this.pathIndex >= this.attackPath.length - 1) {
            this.state = PlayerState.RETURNING;
            return;
        }
        let remaining = CONFIG.PLAYER.ATTACK_SPEED * dt;
        while (remaining > 0 && this.pathIndex < this.attackPath.length - 1) {
            const from = this.attackPath[this.pathIndex];
            const to = this.attackPath[this.pathIndex + 1];
            const segment = dist(from.x, from.y, to.x, to.y);
            if (segment < 0.001) {
                this.pathIndex++;
                this.pathProgress = 0;
                continue;
            }
            const left = segment * (1 - this.pathProgress);
            if (remaining >= left) {
                remaining -= left;
                this.x = to.x;
                this.y = to.y;
                this.pathIndex++;
                this.pathProgress = 0;
                this.hitMonstersInSegment.clear();
            } else {
                this.pathProgress += remaining / segment;
                this.x = lerp(from.x, to.x, this.pathProgress);
                this.y = lerp(from.y, to.y, this.pathProgress);
                remaining = 0;
            }
        }
        if (this.pathIndex >= this.attackPath.length - 1) {
            this.state = PlayerState.RETURNING;
        }
    }

    _updateReturn(dt) {
        const d = dist(this.x, this.y, this.homeX, this.homeY);
        if (d <= 3) {
            if (this.game && this.game.combat) {
                this.game.combat.recordFinalPathSegment();
            }
            const pathSnapshot = this.attackPath.map(pt => ({ x: pt.x, y: pt.y }));
            this.x = this.homeX;
            this.y = this.homeY;
            this.state = PlayerState.IDLE;
            this.attackPath = [];
            if (this.game) {
                this.game.endBulletTimeDim();
                if (this.game.combat) this.game.combat.beginResolve(pathSnapshot);
            }
            return;
        }
        const n = normalize(this.homeX - this.x, this.homeY - this.y);
        const step = Math.min(d, CONFIG.PLAYER.ATTACK_SPEED * dt);
        this.x += n.x * step;
        this.y += n.y * step;
    }

    drawTriggerZone(ctx) {
        if (this.state === PlayerState.BULLET_TIME) return;
        ctx.save();
        ctx.strokeStyle = 'rgba(90, 110, 130, 0.42)';
        ctx.setLineDash([6, 4]);
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(this.homeX, this.homeY, this.triggerRadius, 0, Math.PI * 2);
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.fillStyle = 'rgba(90, 110, 130, 0.08)';
        ctx.beginPath();
        ctx.arc(this.homeX, this.homeY, this.triggerRadius, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    }

    drawPath(ctx) {
        if (this.attackPath.length < 2) return;

        const invalidFlash = this.invalidPathTimer > 0;
        const redOn = !invalidFlash || Math.floor(this.invalidPathTimer * 16) % 2 === 0;
        const colorOuter = invalidFlash
            ? (redOn ? 'rgba(255, 45, 35, 0.95)' : 'rgba(180, 25, 20, 0.5)')
            : 'rgba(70, 90, 120, 0.45)';
        const colorInner = invalidFlash
            ? (redOn ? 'rgba(255, 200, 190, 1)' : 'rgba(255, 120, 110, 0.45)')
            : 'rgba(220, 230, 255, 0.95)';
        const pathThick = 1.25;
        const drawing = this.state === PlayerState.BULLET_TIME || invalidFlash;
        const flying = this.state === PlayerState.ATTACKING || this.state === PlayerState.RETURNING;
        const outerBase = drawing ? 12 : (flying ? 11 : 6);
        const innerBase = drawing ? 5 : (flying ? 4.5 : 3);
        const outerW = outerBase * pathThick;
        const innerW = innerBase * pathThick;

        ctx.save();
        ctx.beginPath();
        ctx.moveTo(this.attackPath[0].x, this.attackPath[0].y);
        for (let i = 1; i < this.attackPath.length; i++) ctx.lineTo(this.attackPath[i].x, this.attackPath[i].y);
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.strokeStyle = colorOuter;
        ctx.lineWidth = outerW;
        ctx.stroke();
        ctx.strokeStyle = colorInner;
        ctx.lineWidth = innerW;
        ctx.stroke();
        ctx.restore();
    }

    draw(ctx) {
        const failDeath = this.game && this.game.failDeath;
        if (this.deathAnim && failDeath && failDeath.showFailPose()) {
            const d = failDeath.death;
            const shakeX = d.shake || 0;
            const fallY = (d.fall || 0) * 22;
            const rot = (d.fall || 0) * 1.05;
            const alpha = d.alpha != null ? d.alpha : 1;
            const px = Math.floor(this.x + shakeX);
            const py = Math.floor(this.y + fallY);

            ctx.save();
            ctx.globalAlpha = alpha;
            ctx.translate(px, py);
            ctx.rotate(rot);
            const sprite = SPRITES.ninja.idle[0];
            drawSprite(ctx, sprite, 0, 0, this.spriteScale);
            failDeath.drawImpaledSpears(ctx, 0, 0);
            ctx.restore();

            ctx.save();
            ctx.globalAlpha = alpha * 0.55;
            ctx.fillStyle = '#6a1010';
            ctx.fillRect(px - 10, py + 10, 20, 8);
            ctx.restore();
            return;
        }

        const sprite = this.state === PlayerState.ATTACKING
            ? SPRITES.ninja.attack[Math.floor(Date.now() / 80) % SPRITES.ninja.attack.length]
            : this.state === PlayerState.RETURNING
                ? SPRITES.ninja.run[Math.floor(Date.now() / 120) % SPRITES.ninja.run.length]
                : SPRITES.ninja.idle[Math.floor(Date.now() / 180) % SPRITES.ninja.idle.length];
        drawSprite(ctx, sprite, Math.floor(this.x), Math.floor(this.y), this.spriteScale);

        if (this.getUpgradeLevel('luck') > 0) {
            const lv = this.getUpgradeLevel('luck');
            for (let i = 0; i < Math.min(8, lv * 2); i++) {
                const a = Date.now() * 0.002 + i * 0.6;
                const rx = this.x + Math.cos(a) * (6 + i * 1.3);
                const ry = this.y + 12 + Math.sin(a * 0.8) * 4;
                ctx.fillStyle = 'rgba(90,170,255,0.22)';
                ctx.fillRect(Math.floor(rx), Math.floor(ry), 3, 3);
            }
        }

        if (this.shadowClones.length) {
            for (const c of this.shadowClones) {
                ctx.save();
                ctx.globalAlpha = 0.35;
                drawSprite(ctx, SPRITES.ninja.idle[0], Math.floor(c.x), Math.floor(c.y), this.spriteScale * 0.92);
                ctx.restore();
            }
        }
    }
}
