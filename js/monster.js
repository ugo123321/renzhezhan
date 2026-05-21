const MonsterKind = {
    NORMAL: 'NORMAL',
    ELITE: 'ELITE',
    SHIELD: 'SHIELD',
    BERSERKER: 'BERSERKER',
    SPLITTER: 'SPLITTER',
    ARCHER: 'ARCHER',
    FIRE_MAGE: 'FIRE_MAGE',
};

let nextMonsterId = 1;

class Monster {
    constructor(x, y, kind, splitTier = 0, stageStatScale = null) {
        this.game = null;
        this.id = nextMonsterId++;
        this.kind = kind;
        this.splitTier = splitTier;
        this.base = CONFIG.MONSTERS[kind];
        this.stageStatScale = stageStatScale || { hp: 1, def: 1 };

        const splitScale = kind === MonsterKind.SPLITTER ? Math.pow(0.72, splitTier) : 1;
        const hpMul = (kind === MonsterKind.SPLITTER ? Math.pow(0.66, splitTier) : 1) * this.stageStatScale.hp;
        const defMul = (kind === MonsterKind.SPLITTER ? Math.pow(0.86, splitTier) : 1) * this.stageStatScale.def;
        this.maxHp = Math.max(8, Math.round(this.base.hp * hpMul));
        this.hp = this.maxHp;
        this.def = Math.max(0, Math.round(this.base.def * defMul));
        const unitScale = CONFIG.DISPLAY.UNIT_SCALE || 1;
        this.size = Math.max(6, Math.round(this.base.size * splitScale * unitScale));
        this.speed = this.base.speed * (kind === MonsterKind.SPLITTER ? 1 + splitTier * 0.08 : 1);
        this.color = this.base.color;

        this.x = x;
        this.y = y;
        this.facing = randRange(0, Math.PI * 2);
        this.moveDir = randRange(0, Math.PI * 2);
        this.moveTimer = randRange(0.6, 1.4);
        this.walkPhase = randRange(0, Math.PI * 2);
        this.animPulse = randRange(0, Math.PI * 2);

        this.alive = true;
        this.dying = false;
        this.deathDelay = 0;
        this.deathTimer = 0;
        this.deathFade = CONFIG.MONSTER_DEATH_FADE;
        this.spawnedChildren = false;
        this.frozenTimer = 0;
        this.vulnerableMark = false;
        this.spawning = false;
        this.spawnTimer = 0;
        this.spawnDuration = 0;
        this.failThrowTimer = 0;
        this.pathTargetHighlight = false;
        this.attackDamage = this.base.attack || 10;
        this.attackInterval = this.base.attackInterval || 1.1;
        this.attackCooldown = randRange(0.2, this.attackInterval);
    }

    beginSpawn(duration = CONFIG.MONSTER_SPAWN_ANIM) {
        this.spawning = true;
        this.spawnTimer = duration;
        this.spawnDuration = duration;
    }

    getSpawnVisual() {
        if (!this.spawning) return { scale: 1, alpha: 1 };
        const t = 1 - clamp(this.spawnTimer / Math.max(0.001, this.spawnDuration), 0, 1);
        return {
            scale: 0.35 + 0.65 * easeOutQuad(t),
            alpha: clamp(t * 1.15, 0, 1),
        };
    }

    get hitboxRadius() {
        return this.size;
    }

    canSplit() {
        return this.kind === MonsterKind.SPLITTER && this.splitTier < this.base.maxSplitTier;
    }

    freeze(duration) {
        this.frozenTimer = Math.max(this.frozenTimer, duration);
    }

    isFrozen() {
        return this.frozenTimer > 0;
    }

    _isShieldFacingLocked() {
        if (this.kind !== MonsterKind.SHIELD || !this.game) return false;
        const p = this.game.player;
        const combat = this.game.combat;
        if (!p || !combat) return false;
        if (p.state === PlayerState.BULLET_TIME || p.state === PlayerState.ATTACKING) return true;
        if (!combat.roundAttackResolved || combat.isResolving()) return true;
        return false;
    }

    _move(dt, w, h, playBottom, playerTarget) {
        if (!playerTarget) return;
        this.walkPhase += dt * 7;
        this.animPulse += dt * 3.6;

        const dx = playerTarget.x - this.x;
        const dy = playerTarget.y - this.y;
        const distToPlayer = Math.hypot(dx, dy);
        if (distToPlayer < 0.001) return;

        if (!this._isShieldFacingLocked()) {
            this.moveDir = Math.atan2(dy, dx);
            this.facing = this.moveDir;
        }

        let stopDist;
        if (this._isRangedKind()) {
            stopDist = this.base.attackRange || 165;
            if (distToPlayer <= stopDist) return;
        } else {
            stopDist = this.hitboxRadius + (playerTarget.effectiveRadius || 12) + 2;
        }

        const step = Math.min(this.speed * dt, Math.max(0, distToPlayer - stopDist));
        this.x += Math.cos(this.moveDir) * step;
        this.y += Math.sin(this.moveDir) * step;

        const margin = 24;
        const top = 84;
        const bottom = Math.max(top + 60, playBottom - 20);
        if (this.x < margin || this.x > w - margin) {
            this.x = clamp(this.x, margin, w - margin);
        }
        if (this.y < top || this.y > bottom) {
            this.y = clamp(this.y, top, bottom);
        }
    }

    _isRangedKind() {
        return this.kind === MonsterKind.ARCHER || this.kind === MonsterKind.FIRE_MAGE;
    }

    _canRangedAttack(playerTarget) {
        if (!playerTarget || !playerTarget.player) return false;
        const player = playerTarget.player;
        if (player.hp <= 0 || player.state === PlayerState.BULLET_TIME || player.isAttackInvincible?.()) return false;
        const attackRange = this.base.attackRange || 165;
        return dist(this.x, this.y, playerTarget.x, playerTarget.y) <= attackRange;
    }

    _canArcherShoot(playerTarget) {
        return this._canRangedAttack(playerTarget);
    }

    _shootArrow(playerTarget) {
        if (!this.game || !this.game.projectiles) return;
        const muzzle = this.hitboxRadius + 6;
        this.game.projectiles.spawnArrow({
            x: this.x + Math.cos(this.facing) * muzzle,
            y: this.y + Math.sin(this.facing) * muzzle,
            targetX: playerTarget.x,
            targetY: playerTarget.y,
            speed: this.base.arrowSpeed || CONFIG.ARROW.SPEED || 340,
            damage: this.attackDamage,
        });
        if (this.game.particles) {
            this.game.particles.spawnEffect(
                this.x + Math.cos(this.facing) * muzzle,
                this.y + Math.sin(this.facing) * muzzle,
                '#c8b890'
            );
        }
    }

    _castFirePillar(playerTarget) {
        if (!this.game?.groundEffects) return;
        this.game.groundEffects.spawnFirePillar(playerTarget.x, playerTarget.y, this.attackDamage);
        const handX = this.x + Math.cos(this.facing) * (this.hitboxRadius + 4);
        const handY = this.y + Math.sin(this.facing) * (this.hitboxRadius + 4);
        if (this.game.particles) {
            this.game.particles.spawnEffect(handX, handY, '#c03030');
            this.game.particles.spawnEffect(handX, handY - 4, '#ff5040');
        }
    }

    _canAttackPlayer(playerTarget) {
        if (!playerTarget || !playerTarget.player) return false;
        const player = playerTarget.player;
        if (player.hp <= 0 || player.state === PlayerState.BULLET_TIME || player.isAttackInvincible?.()) return false;
        const reach = this.hitboxRadius + player.effectiveRadius + 4;
        return dist(this.x, this.y, playerTarget.x, playerTarget.y) <= reach;
    }

    _attackPlayer(playerTarget) {
        const player = playerTarget.player;
        const dmg = player.takeDamage(this.attackDamage);
        if (dmg > 0 && this.game) {
            this.game.combat.spawnDamageNumber(player.x, player.y - player.effectiveRadius - 8, dmg, false, '#e05840');
            this.game.particles.hitSpark(player.x, player.y, false);
            this.game.renderer.shake(CONFIG.SHAKE.NORMAL.magnitude * 0.6, CONFIG.SHAKE.NORMAL.duration * 0.8);
        }
    }

    update(dt, w, h, playBottom, playerTarget) {
        if (!this.alive) return;
        if (this.failThrowTimer > 0) {
            this.failThrowTimer -= dt;
            return;
        }
        if (this.spawning) {
            this.spawnTimer -= dt;
            if (this.spawnTimer <= 0) this.spawning = false;
            return;
        }
        if (this.dying) {
            if (this.deathDelay > 0) {
                this.deathDelay -= dt;
                return;
            }
            this.deathTimer -= dt;
            if (this.deathTimer <= 0) this.alive = false;
            return;
        }
        if (this.frozenTimer > 0) {
            this.frozenTimer -= dt;
            return;
        }
        if (this.base.canMove) this._move(dt, w, h, playBottom, playerTarget);

        if (playerTarget) {
            this.attackCooldown -= dt;
            if (this.attackCooldown <= 0) {
                if (this._isRangedKind()) {
                    if (this._canRangedAttack(playerTarget)) {
                        if (this.kind === MonsterKind.ARCHER) {
                            this._shootArrow(playerTarget);
                        } else if (this.kind === MonsterKind.FIRE_MAGE) {
                            this._castFirePillar(playerTarget);
                        }
                        this.attackCooldown = this.attackInterval;
                    }
                } else if (this._canAttackPlayer(playerTarget)) {
                    this._attackPlayer(playerTarget);
                    this.attackCooldown = this.attackInterval;
                }
            }
        }
    }

    _drawShieldPlate(ctx, x, y, r, alpha) {
        const px = Math.max(2, Math.round(r / 4));
        const facing = this.facing;
        const dist = r + px * 2.5;

        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.translate(x, y);
        ctx.rotate(facing);
        ctx.imageSmoothingEnabled = false;

        const pattern = [
            '..OOO..',
            '.OOOOO.',
            'OOOOOOO',
            'OHHHHHO',
            'OHHHHHO',
            'OOOOOOO',
            '.OOOOO.',
            '..O.O..',
            '...O...',
        ];
        const palette = {
            O: ['#4a6888', '#8ab0d0', '#c8e0f8'],
            H: ['#5a7898', '#a8c8e8', '#f0f8ff'],
        };
        const cols = pattern[0].length;
        const rows = pattern.length;
        const w = cols * px;
        const h = rows * px;
        const sx = Math.floor(dist - px);
        const sy = Math.floor(-h / 2);

        for (let row = 0; row < rows; row++) {
            for (let col = 0; col < cols; col++) {
                const ch = pattern[row][col];
                if (ch === '.') continue;
                const colors = palette[ch] || palette.O;
                const edge = row === 0 || col === 0 || col === cols - 1 || pattern[row][col - 1] === '.' || pattern[row][col + 1] === '.';
                const hi = ch === 'H' && col >= 2 && col <= 4 && row >= 2 && row <= 4;
                ctx.fillStyle = edge ? colors[0] : (hi ? colors[2] : colors[1]);
                ctx.fillRect(sx + col * px, sy + row * px, px, px);
            }
        }

        // 盾心十字
        const cx = sx + Math.floor(w * 0.5) - px;
        const cy = sy + Math.floor(h * 0.42);
        ctx.fillStyle = '#3a5878';
        ctx.fillRect(cx, cy - px * 2, px, px * 5);
        ctx.fillRect(cx - px * 2, cy, px * 5, px);
        ctx.fillStyle = '#e8f4ff';
        ctx.fillRect(cx, cy - px, px, px * 3);
        ctx.fillRect(cx - px, cy, px * 3, px);

        // 朝向箭头（指向前方）
        const ax = sx + w + px * 1.2;
        const ay = sy + h * 0.5;
        ctx.fillStyle = '#ffd060';
        ctx.fillRect(Math.floor(ax), Math.floor(ay - px), px * 2, px * 2);
        ctx.fillRect(Math.floor(ax + px * 2), Math.floor(ay - px * 0.5), px * 2, px);

        ctx.restore();

        // 前方格挡范围提示弧
        ctx.save();
        ctx.globalAlpha = alpha * 0.28;
        ctx.strokeStyle = '#78a8d8';
        ctx.fillStyle = 'rgba(120, 168, 220, 0.12)';
        ctx.lineWidth = Math.max(2, px * 0.6);
        ctx.setLineDash([5, 4]);
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.arc(x, y, r + px * 6, facing - Math.PI * 0.55, facing + Math.PI * 0.55);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        ctx.restore();
    }

    takeDamage(rawDamage, hitAngle = null) {
        let blockedByShield = false;
        if (this.kind === MonsterKind.SHIELD && hitAngle !== null) {
            const diff = Math.abs(Math.atan2(
                Math.sin(hitAngle - this.facing),
                Math.cos(hitAngle - this.facing)
            ));
            // Front hemisphere blocks damage.
            if (diff < Math.PI * 0.55) blockedByShield = true;
        }
        if (blockedByShield) return { actualDamage: 0, blockedByShield: true };

        const vulnerableMult = this.vulnerableMark ? 2 : 1;
        this.vulnerableMark = false;
        const actualDamage = Math.max(1, Math.round((rawDamage - this.def) * vulnerableMult));
        this.hp -= actualDamage;
        if (this.hp <= 0) {
            this.hp = 0;
            this.dying = true;
            this.deathFade = CONFIG.MONSTER_DEATH_FADE;
            this.deathTimer = this.deathFade;
            this.deathDelay = (this.game && this.game.combat)
                ? this.game.combat.scheduleDeathFade()
                : 0;
        }
        return { actualDamage, blockedByShield: false };
    }

    draw(ctx) {
        if (!this.alive) return;
        const spawnVis = this.getSpawnVisual();
        const fadeDur = this.deathFade || CONFIG.MONSTER_DEATH_FADE;
        const deathAlpha = this.dying
            ? (this.deathDelay > 0 ? 1 : clamp(this.deathTimer / fadeDur, 0, 1))
            : 1;
        const alpha = deathAlpha * spawnVis.alpha;
        const bobY = this.dying || this.spawning ? 0 : Math.sin(this.walkPhase) * 1.6;
        const x = Math.floor(this.x);
        const y = Math.floor(this.y + bobY);
        const r = this.hitboxRadius;
        const spriteSet = this._getSpriteSet();
        const frameIdx = Math.floor(this.walkPhase * 0.22) % 2;
        const sprite = (spriteSet.idle || [])[frameIdx % (spriteSet.idle || [spriteSet]).length] || spriteSet;
        const scale = clamp(Math.round(this.size / 4), 2, 6);
        const flipX = Math.cos(this.facing) < 0;
        let tint = 0;
        let tintR = 255;
        let tintG = 72;
        let tintB = 72;
        if (this.kind === MonsterKind.BERSERKER) {
            tint = 0.16;
        } else if (this.kind === MonsterKind.FIRE_MAGE) {
            tint = 0.52;
            tintR = 90;
            tintG = 12;
            tintB = 18;
        }

        ctx.save();
        if (spawnVis.scale !== 1) {
            ctx.translate(x, y);
            ctx.scale(spawnVis.scale, spawnVis.scale);
            ctx.translate(-x, -y);
        }
        if (this.spawning) {
            const ringR = r * (1.4 - spawnVis.scale * 0.5);
            ctx.strokeStyle = `rgba(255, 220, 140, ${0.35 * spawnVis.alpha})`;
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(x, y, ringR, 0, Math.PI * 2);
            ctx.stroke();
        }
        if (this.pathTargetHighlight) {
            ctx.save();
            ctx.globalAlpha = alpha;
            const startX = x - (sprite[0].length * scale) / 2;
            const startY = y - (sprite.length * scale) / 2;
            for (let row = 0; row < sprite.length; row++) {
                for (let col = 0; col < sprite[0].length; col++) {
                    const color = sprite[row][flipX ? sprite[0].length - 1 - col : col];
                    if (!color) continue;
                    ctx.fillStyle = tintHexColor(color, 210, 210, 218, 0.78);
                    ctx.fillRect(
                        Math.floor(startX + col * scale),
                        Math.floor(startY + row * scale),
                        scale,
                        scale
                    );
                }
            }
            ctx.restore();
        } else {
            drawSprite(ctx, sprite, x, y, scale, alpha, flipX, tint, tintR, tintG, tintB);
        }

        const failDeath = this.game && this.game.failDeath;
        if (failDeath && failDeath.isThrowing() && this.failThrowTimer > 0) {
            failDeath.drawMonsterThrowSpear(ctx, this);
        }

        if (this.kind === MonsterKind.SHIELD) {
            this._drawShieldPlate(ctx, x, y, r, alpha);
        } else if (this.kind === MonsterKind.BERSERKER) {
            ctx.fillStyle = '#ff8a68';
            ctx.fillRect(x - 2, y - r - 4, 4, 4);
        } else if (this.kind === MonsterKind.SPLITTER) {
            ctx.fillStyle = '#d2f6a8';
            ctx.fillRect(x - 2, y - 2, 4, 4);
            ctx.fillRect(x + 3, y - 2, 3, 3);
            if (this.splitTier > 0) {
                ctx.fillStyle = '#4e7c38';
                ctx.fillRect(x - 6, y + r * 0.5, 3, 3);
            }
        } else if (this.kind === MonsterKind.ARCHER) {
            ctx.strokeStyle = '#8a6848';
            ctx.lineWidth = 2;
            const bx = x + Math.cos(this.facing) * (r + 1);
            const by = y + Math.sin(this.facing) * (r + 1);
            ctx.beginPath();
            ctx.arc(bx, by, r * 0.55, this.facing - 1.1, this.facing + 1.1);
            ctx.stroke();
        } else if (this.kind === MonsterKind.FIRE_MAGE) {
            const sx = x + Math.cos(this.facing) * (r + 2);
            const sy = y + Math.sin(this.facing) * (r + 2);
            ctx.fillStyle = '#281010';
            ctx.fillRect(Math.floor(sx - 1), Math.floor(sy - 5), 3, 8);
            ctx.fillStyle = '#a02828';
            ctx.fillRect(Math.floor(sx), Math.floor(sy - 7), 2, 3);
            ctx.fillStyle = '#ff4030';
            ctx.fillRect(Math.floor(sx), Math.floor(sy - 9), 2, 2);
        }

        if (this.isFrozen()) {
            ctx.strokeStyle = 'rgba(120,220,255,0.9)';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(x, y, r + 3, 0, Math.PI * 2);
            ctx.stroke();
        }

        if (!this.dying && this.hp < this.maxHp) {
            const w = Math.max(18, r * 1.6);
            const h = 4;
            const bx = x - w / 2;
            const by = y - r - 14;
            const ratio = this.hp / this.maxHp;
            ctx.fillStyle = '#231a14';
            ctx.fillRect(bx, by, w, h);
            ctx.fillStyle = ratio > 0.5 ? '#68d070' : ratio > 0.25 ? '#f0c850' : '#e05840';
            ctx.fillRect(bx, by, w * ratio, h);
        }
        ctx.restore();
    }

    _getSpriteSet() {
        switch (this.kind) {
            case MonsterKind.NORMAL: return SPRITES.normalMelee;
            case MonsterKind.ELITE: return SPRITES.strongMelee;
            case MonsterKind.SHIELD: return SPRITES.strongRanged;
            case MonsterKind.BERSERKER: return SPRITES.strongMelee;
            case MonsterKind.SPLITTER: return SPRITES.normalRanged;
            case MonsterKind.ARCHER: return SPRITES.normalRanged;
            case MonsterKind.FIRE_MAGE: return SPRITES.strongRanged;
            default: return SPRITES.normalMelee;
        }
    }
}
