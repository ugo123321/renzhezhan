const PlayerState = {
    IDLE: 'idle',
    BULLET_TIME: 'bulletTime',
    ATTACKING: 'attacking',
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

        this.baseHp = CONFIG.PLAYER.BASE_HP;
        this.maxHp = this.baseHp;
        this.hp = this.maxHp;
        this.invincibleTimer = 0;

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
        this.hitProjectilesInSegment = new Set();
        this.invalidPathTimer = 0;
        this.kiAtDrawStart = this.ki;
        this.damageFlashTimer = 0;

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

        this.holyShieldCharges = 0;
        this.holyShieldTimer = 0;
        this.killCountForVampire = 0;
        this.healingComboFiredThisResolve = false;
        this.comboFireballMilestone = 0;
    }

    get effectiveRadius() {
        const unit = CONFIG.DISPLAY.UNIT_SCALE || 1;
        return CONFIG.PLAYER.HITBOX_RADIUS * this.sizeScale * unit;
    }

    get triggerRadius() {
        const refW = CONFIG.DISPLAY.LOGICAL_WIDTH;
        const unit = CONFIG.DISPLAY.UNIT_SCALE || 1;
        const minR = CONFIG.PLAYER.TRIGGER_RADIUS_MIN || 30;
        const base = Math.max(minR, CONFIG.PLAYER.TRIGGER_RADIUS_RATIO * refW);
        return base * this.sizeScale * unit;
    }

    get spriteScale() {
        const unit = CONFIG.DISPLAY.UNIT_SCALE || 1;
        return CONFIG.DISPLAY.NINJA_SPRITE_SCALE * this.sizeScale * unit;
    }

    isInAttackMode() {
        return this.state === PlayerState.ATTACKING;
    }

    isAttackInvincible() {
        return this.isInAttackMode();
    }

    resetLineBuffs() {
        this.collectedOrbBuffs = [];
        this.turnBuffs.attackMult = 1;
        this.turnBuffs.comboMult = 1;
        this.turnBuffs.iceReady = false;
    }

    beginStage() {
        this.deathAnim = null;
        this.state = PlayerState.IDLE;
        this.attackPath = [];
        this.pathIndex = 0;
        this.pathProgress = 0;
        this.hitMonstersInSegment.clear();
        this.hitProjectilesInSegment.clear();
        this.invalidPathTimer = 0;
        this.comboCount = 0;
        this.comboDisplayPeak = 0;
        this.comboDisplayTimer = 0;
        this.comboShakeTimer = 0;
        this.waterTornadoCharge = 0;
        this.drawSessionSnapshot = null;
        this.invincibleTimer = 0;
        this.damageFlashTimer = 0;
        this.holyShieldCharges = 0;
        this.holyShieldTimer = 0;
        this.killCountForVampire = 0;
        this.healingComboFiredThisResolve = false;
        this.comboFireballMilestone = 0;
        this.hp = this.maxHp;
        if (this.game && this.game.buffOrbs) {
            this.game.buffOrbs.drawSessionEaten = [];
        }
        this.resetLineBuffs();
        this._refreshHolyShieldInterval();
        const turnKiMax = Math.round(this.baseKi * (1 + this.nextTurnKiBonus));
        this.kiMax = Math.max(20, turnKiMax);
        this.ki = this.kiMax;
        this.nextTurnKiBonus = 0;
    }

    finishAttackCycle() {
        this.state = PlayerState.IDLE;
        this.attackPath = [];
        this.pathIndex = 0;
        this.pathProgress = 0;
        this.hitMonstersInSegment.clear();
        this.hitProjectilesInSegment.clear();
        this.invalidPathTimer = 0;
        this.comboCount = 0;
        this.comboDisplayPeak = 0;
        this.comboDisplayTimer = 0;
        this.comboShakeTimer = 0;
        this.waterTornadoCharge = 0;
        this.healingComboFiredThisResolve = false;
        this.comboFireballMilestone = 0;
        this.drawSessionSnapshot = null;
        if (this.game && this.game.buffOrbs) {
            this.game.buffOrbs.drawSessionEaten = [];
        }
        this.resetLineBuffs();
        const turnKiMax = Math.round(this.baseKi * (1 + this.nextTurnKiBonus));
        this.kiMax = Math.max(20, turnKiMax);
        this.ki = Math.min(this.ki, this.kiMax);
        this.nextTurnKiBonus = 0;
    }
    _canRegenKi() {
        if (this.state !== PlayerState.IDLE || this.ki >= this.kiMax) return false;
        if (!this.game || !this.game.combat) return false;
        if (this.game.combat.isResolving()) return false;
        if (!this.game.combat.roundAttackResolved) return false;
        if (this.game.isUpgradeBlocked()) return false;
        return true;
    }

    _updateKiRegen(realDt) {
        if (!this._canRegenKi()) return;
        const rate = CONFIG.PLAYER.KI_REGEN_RATE || 52;
        this.ki = Math.min(this.kiMax, this.ki + rate * realDt);
    }

    getHealMultiplier() {
        const lv = this.getUpgradeLevel('super_heal');
        return 1 + 0.5 * lv;
    }

    heal(amount) {
        if (amount <= 0 || this.hp <= 0) return 0;
        const actual = Math.max(1, Math.round(amount * this.getHealMultiplier()));
        const before = this.hp;
        this.hp = Math.min(this.maxHp, this.hp + actual);
        return this.hp - before;
    }

    getHolyShieldInterval() {
        const lv = this.getUpgradeLevel('holy_shield');
        if (lv <= 0) return 0;
        return Math.max(1.5, 6 - 0.5 * (lv - 1));
    }

    _refreshHolyShieldInterval() {
        if (this.getUpgradeLevel('holy_shield') <= 0) return;
        if (this.holyShieldCharges < 1 && this.holyShieldTimer <= 0) {
            this.holyShieldTimer = this.getHolyShieldInterval();
        }
    }

    _updateHolyShield(dt) {
        if (this.getUpgradeLevel('holy_shield') <= 0) return;
        if (this.holyShieldCharges >= 1) return;
        this.holyShieldTimer -= dt;
        if (this.holyShieldTimer <= 0) {
            this.holyShieldCharges = 1;
            this.holyShieldTimer = this.getHolyShieldInterval();
        }
    }

    onEnemyKilledForUpgrades(killX, killY) {
        const lv = this.getUpgradeLevel('vampire_bat');
        if (lv <= 0) return;
        this.killCountForVampire++;
        const need = 10;
        if (this.killCountForVampire < need) return;
        this.killCountForVampire -= need;
        if (this.game?.abilities) {
            this.game.abilities.spawnVampireBatSwarm(
                killX ?? this.x,
                killY ?? this.y
            );
        }
    }

    takeDamage(rawDamage) {
        if (this.isAttackInvincible() || this.invincibleTimer > 0 || this.hp <= 0) return 0;
        if (this.holyShieldCharges > 0) {
            this.holyShieldCharges = 0;
            this.holyShieldTimer = this.getHolyShieldInterval();
            this.queueMessage('圣盾抵挡');
            return 0;
        }
        const actual = Math.max(1, Math.round(rawDamage));
        this.hp = Math.max(0, this.hp - actual);
        this.invincibleTimer = CONFIG.PLAYER.INVINCIBLE_TIME || 0.45;
        this.damageFlashTimer = CONFIG.PLAYER.DAMAGE_FLASH_TIME || 0.42;
        if (this.game && this.game.renderer) {
            this.game.renderer.shake(4, 0.12);
        }
        if (this.hp <= 0 && this.game) {
            this.game._playerDied();
        }
        return actual;
    }

    invalidatePath() {
        this.invalidPathTimer = 0.3;
        this.state = PlayerState.IDLE;
        if (this.game && this.game.buffOrbs) this.game.buffOrbs.cancelDrawSession();
        this.pathIndex = 0;
        this.pathProgress = 0;
        this.hitMonstersInSegment.clear();
        this.hitProjectilesInSegment.clear();
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
        this.hitProjectilesInSegment.clear();
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
        this.hitProjectilesInSegment.clear();
        this.comboCount = 0;
        this.comboDisplayPeak = 0;
        this.comboDisplayTimer = 0;
        this.comboShakeTimer = 0;
        this.waterTornadoCharge = 0;
        this.whirlCharge = 0;
        this.healingComboFiredThisResolve = false;
        this.comboFireballMilestone = 0;
        return true;
    }

    registerComboHit(source = 'path') {
        // 连击仅由画线冲刺的路径碰撞伤害叠加，技能/黑洞等特效伤害不得调用
        if (source !== 'path') return this.comboCount;
        if (!this.game?.combat?.isResolving()) return this.comboCount;

        const baseInc = 1;
        const multiComboLv = this.getUpgradeLevel('multi_combo');
        const inc = baseInc * this.turnBuffs.comboMult * Math.pow(1.2, multiComboLv);
        this.comboCount += inc;
        this.comboDisplayPeak = Math.max(this.comboDisplayPeak, this.comboCount);
        this.comboDisplayTimer = CONFIG.PLAYER.COMBO_DISPLAY_HOLD;
        return this.comboCount;
    }

    _getShadowCloneAnchor() {
        if (this.state === PlayerState.ATTACKING) {
            return { x: this.x, y: this.y };
        }
        return { x: this.homeX, y: this.homeY };
    }

    _layoutShadowClones() {
        const total = this.shadowClones.length;
        if (total <= 0) return;

        let idx = 0;
        let ring = 0;
        while (idx < total) {
            const onRing = Math.min(4 + ring * 2, total - idx);
            const radius = 24 + ring * 20;
            const ringOffset = ring * 0.38;
            for (let slot = 0; slot < onRing; slot++, idx++) {
                const angle = ringOffset + (slot / onRing) * Math.PI * 2;
                this.shadowClones[idx].ox = Math.cos(angle) * radius;
                this.shadowClones[idx].oy = Math.sin(angle) * radius;
            }
            ring++;
        }
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
            this.shadowClones.push({ ox: 0, oy: 0 });
        }
        this._layoutShadowClones();
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

    /** 画线普攻基础伤害（不含暴击随机） */
    getLineAttackDamage() {
        let dmg = this.baseAttack * this.attackPowerScale;
        dmg *= this.turnBuffs.attackMult;
        dmg *= 1 + Math.max(0, this.comboCount - 1) * this.comboDamageBonus;
        return Math.max(1, Math.round(dmg));
    }

    getAutoDartDamage() {
        const mult = CONFIG.PLAYER.AUTO_DART?.DAMAGE_MULT ?? 0.20;
        let dmg = this.getLineAttackDamage() * mult;
        const spiritLv = this.getUpgradeLevel('spirit_bomb');
        if (spiritLv > 0) dmg *= 1 + 0.5 * spiritLv;
        return Math.max(1, Math.round(dmg));
    }

    getAutoDartScale() {
        return 1 + 0.2 * this.getUpgradeLevel('giant_dart');
    }

    hasSpiritBomb() {
        return this.getUpgradeLevel('spirit_bomb') > 0;
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

    update(dt, realDt) {
        if (this.invincibleTimer > 0) this.invincibleTimer -= dt;
        if (this.damageFlashTimer > 0) this.damageFlashTimer -= dt;
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
        this._updateHolyShield(dt);
        this._updateKiRegen(realDt || dt);
        this._syncShadowClones();
    }

    _finishAttackAtPathEnd() {
        if (this.game && this.game.combat) {
            this.game.combat.recordFinalPathSegment();
        }
        const pathSnapshot = this.attackPath.map(pt => ({ x: pt.x, y: pt.y }));
        this.homeX = this.x;
        this.homeY = this.y;
        this.state = PlayerState.IDLE;
        this.attackPath = [];
        if (this.game) {
            this.game.endBulletTimeDim();
            if (this.game.combat) this.game.combat.beginResolve(pathSnapshot);
        }
    }

    _updateAttack(dt) {
        if (this.pathIndex >= this.attackPath.length - 1) {
            this._finishAttackAtPathEnd();
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
        this.hitProjectilesInSegment.clear();
            } else {
                this.pathProgress += remaining / segment;
                this.x = lerp(from.x, to.x, this.pathProgress);
                this.y = lerp(from.y, to.y, this.pathProgress);
                remaining = 0;
            }
        }
        if (this.pathIndex >= this.attackPath.length - 1) {
            this._finishAttackAtPathEnd();
        }
    }

    drawTriggerZone(ctx) {
        if (this.state === PlayerState.BULLET_TIME || this.state === PlayerState.ATTACKING) return;
        ctx.save();
        ctx.strokeStyle = 'rgba(72, 168, 255, 0.88)';
        ctx.setLineDash([7, 5]);
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.arc(this.homeX, this.homeY, this.triggerRadius, 0, Math.PI * 2);
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.fillStyle = 'rgba(72, 168, 255, 0.16)';
        ctx.beginPath();
        ctx.arc(this.homeX, this.homeY, this.triggerRadius, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = 'rgba(160, 220, 255, 0.35)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(this.homeX, this.homeY, this.triggerRadius - 2, 0, Math.PI * 2);
        ctx.stroke();
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
        const flying = this.state === PlayerState.ATTACKING;
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

    _drawHpBar(ctx) {
        if (this.hp >= this.maxHp) return;
        const w = Math.max(28, this.effectiveRadius * 2.4);
        const h = 5;
        const bx = Math.floor(this.x - w / 2);
        const by = Math.floor(this.y - this.effectiveRadius - 22);
        const ratio = clamp(this.hp / this.maxHp, 0, 1);
        ctx.save();
        ctx.fillStyle = '#231a14';
        ctx.fillRect(bx, by, w, h);
        ctx.fillStyle = ratio > 0.5 ? '#68d070' : ratio > 0.25 ? '#f0c850' : '#e05840';
        ctx.fillRect(bx, by, w * ratio, h);
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

        const blink = this.invincibleTimer > 0
            && this.damageFlashTimer <= 0
            && Math.floor(this.invincibleTimer * 18) % 2 === 0;
        const damageFlashOn = this.damageFlashTimer > 0
            && Math.floor(this.damageFlashTimer * 22) % 2 === 0;
        const px = Math.floor(this.x);
        const py = Math.floor(this.y);

        const sprite = this.state === PlayerState.ATTACKING
            ? SPRITES.ninja.attack[Math.floor(Date.now() / 80) % SPRITES.ninja.attack.length]
            : SPRITES.ninja.idle[Math.floor(Date.now() / 180) % SPRITES.ninja.idle.length];
        const alpha = blink ? 0.55 : 1;
        const tint = damageFlashOn ? 0.72 : 0;
        drawSprite(ctx, sprite, px, py, this.spriteScale, alpha, false, tint);

        this._drawHpBar(ctx);

        if (this.holyShieldCharges > 0) {
            ctx.save();
            ctx.strokeStyle = 'rgba(120, 200, 255, 0.85)';
            ctx.lineWidth = 2.5;
            ctx.beginPath();
            ctx.arc(px, py, this.effectiveRadius + 10, 0, Math.PI * 2);
            ctx.stroke();
            ctx.fillStyle = 'rgba(90, 170, 255, 0.18)';
            ctx.fill();
            ctx.restore();
        }

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
