class CombatManager {
    constructor(game) {
        this.game = game;
        this.damageNumbers = [];
        this.roundAttackResolved = true;
        this.pendingHits = [];
        this.resolving = false;
        this.resolveTimer = 0;
        this.afterimages = [];
        this._deathStaggerIndex = 0;
    }

    beginRoundAttack() {
        this.roundAttackResolved = false;
        this.pendingHits = [];
        this.resolving = false;
        this.resolveTimer = 0;
        this.afterimages = [];
        this._deathStaggerIndex = 0;
    }

    scheduleDeathFade() {
        const interval = CONFIG.COMBAT_RESOLVE.DEATH_STAGGER || 0.07;
        const delay = this._deathStaggerIndex * interval;
        this._deathStaggerIndex++;
        return delay;
    }

    consumeRoundAttack() {
        if (this.roundAttackResolved) return false;
        this.roundAttackResolved = true;
        return true;
    }

    isResolving() {
        return this.resolving;
    }

    spawnDamageNumber(x, y, damage, isCrit = false, color = null) {
        this.damageNumbers.push({
            x, y, damage, isCrit, life: 0.85, maxLife: 0.85,
            vy: -68, color: color || (isCrit ? '#f08230' : '#c22a20'),
        });
    }

    _handleMonsterKilled(m) {
        if (m._deathHandled) return;
        m._deathHandled = true;
        const player = this.game.player;
        const hitAngle = player
            ? angle(player.x, player.y, m.x, m.y)
            : Math.random() * Math.PI * 2;
        const intensity = m.size > 13 ? 1.35 : 1;
        this.game.bloodStains.spawn(m.x, m.y + m.hitboxRadius * 0.35, intensity, hitAngle);
        this.game.particles.deathEffect(m.x, m.y, m.color);
        if (m.canSplit() && !m.spawnedChildren && this._shouldSpawnSplitChildren(m)) {
            m.spawnedChildren = true;
            const kids = this.game.spawner.spawnSplitChildren(m);
            for (const k of kids) {
                this.game.particles.spawnEffect(k.x, k.y, k.color);
            }
        }
        if (this.game.experience) this.game.experience.onMonsterKilled(m);
    }

    _shouldSpawnSplitChildren(deadMonster) {
        const others = this.game.spawner.getActiveMonsters().filter(m => m !== deadMonster);
        if (others.length > 0) return true;
        return true;
    }

    recordFinalPathSegment() {
        const p = this.game.player;
        if (!p || p.attackPath.length < 2) return;
        const from = p.attackPath[p.attackPath.length - 2];
        const to = p.attackPath[p.attackPath.length - 1];
        this._recordPathHits(from, to, p.pathIndex);
    }

    beginResolve(attackPath) {
        const p = this.game.player;
        if (!p) return;
        this.resolvePath = attackPath ? attackPath.map(pt => ({ x: pt.x, y: pt.y })) : [];
        if (this.pendingHits.length === 0) {
            this._finishResolve();
            return;
        }
        this.resolving = true;
        this.resolveTimer = CONFIG.COMBAT_RESOLVE.FIRST_HIT_DELAY;
        this.game.abilities.onResolveStarted(this.resolvePath);
    }

    _finishResolve() {
        const p = this.game.player;
        this.resolving = false;
        this.pendingHits = [];
        this.resolvePath = [];
        this._applyCloneHits();
        this.game.abilities.onResolveEnded();
        if (p) p.endCombo();
        if (this.game.experience) this.game.experience.tryTriggerPendingUpgrade();
    }

    _spawnAfterimage(x, y, angle) {
        this.afterimages.push({
            x, y, angle,
            life: CONFIG.COMBAT_RESOLVE.AFTERIMAGE_LIFE,
            maxLife: CONFIG.COMBAT_RESOLVE.AFTERIMAGE_LIFE,
        });
    }

    _recordPathProjectileHits(pathFrom, pathTo, segmentIndex) {
        const p = this.game.player;
        const projs = this.game.projectiles && this.game.projectiles.projectiles;
        if (!p || !projs || !projs.length) return;

        const segLen = dist(pathFrom.x, pathFrom.y, pathTo.x, pathTo.y);
        if (segLen < 0.001) return;

        for (const proj of projs) {
            if (!proj.alive || !proj.blockable) continue;
            const key = `${proj.id}:${segmentIndex}`;
            if (p.hitProjectilesInSegment.has(key)) continue;

            const vx = pathTo.x - pathFrom.x;
            const vy = pathTo.y - pathFrom.y;
            const ux = proj.x - pathFrom.x;
            const uy = proj.y - pathFrom.y;
            const t = clamp((ux * vx + uy * vy) / Math.max(1e-6, segLen * segLen), 0, 1);
            const px = pathFrom.x + vx * t;
            const py = pathFrom.y + vy * t;
            const hitDist = proj.radius + p.effectiveRadius * 0.38;
            if (dist(px, py, proj.x, proj.y) > hitDist) continue;

            p.hitProjectilesInSegment.add(key);
            proj.alive = false;
            this.game.particles.hitSpark(proj.x, proj.y, false);
            this.game.particles.slashTrail(proj.x, proj.y, angle(pathFrom.x, pathFrom.y, pathTo.x, pathTo.y));
        }
    }

    _pathSegmentHitsMonster(pathFrom, pathTo, monster, hitPad) {
        const segLen = dist(pathFrom.x, pathFrom.y, pathTo.x, pathTo.y);
        if (segLen < 0.001) return false;

        const vx = pathTo.x - pathFrom.x;
        const vy = pathTo.y - pathFrom.y;
        const ux = monster.x - pathFrom.x;
        const uy = monster.y - pathFrom.y;
        const t = clamp((ux * vx + uy * vy) / Math.max(1e-6, segLen * segLen), 0, 1);
        const px = pathFrom.x + vx * t;
        const py = pathFrom.y + vy * t;
        return dist(px, py, monster.x, monster.y) <= monster.hitboxRadius + hitPad;
    }

    getPathPreviewTargetIds(path, player) {
        const ids = new Set();
        if (!path || path.length < 2 || !player) return ids;

        const hitPad = player.effectiveRadius * 0.42;
        const monsters = this.game.spawner.getActiveMonsters();
        for (let i = 0; i < path.length - 1; i++) {
            const from = path[i];
            const to = path[i + 1];
            for (const m of monsters) {
                if (this._pathSegmentHitsMonster(from, to, m, hitPad)) ids.add(m.id);
            }
        }
        return ids;
    }

    _recordPathHits(pathFrom, pathTo, segmentIndex) {
        const p = this.game.player;
        const monsters = this.game.spawner.getActiveMonsters();
        const hitPad = p.effectiveRadius * 0.42;
        for (const m of monsters) {
            const key = `${m.id}:${segmentIndex}`;
            if (p.hitMonstersInSegment.has(key)) continue;
            if (!this._pathSegmentHitsMonster(pathFrom, pathTo, m, hitPad)) continue;

            p.hitMonstersInSegment.add(key);
            this.pendingHits.push({
                monsterId: m.id,
                pathFrom: { x: pathFrom.x, y: pathFrom.y },
                pathTo: { x: pathTo.x, y: pathTo.y },
            });
        }
    }

    _getMonsterById(id) {
        return this.game.spawner.monsters.find(m => m.id === id && m.alive && !m.dying);
    }

    _applyQueuedHit(hit) {
        const p = this.game.player;
        const m = this._getMonsterById(hit.monsterId);
        if (!p || !m) return;

        const hitAngle = angle(hit.pathFrom.x, hit.pathFrom.y, hit.pathTo.x, hit.pathTo.y);
        const dashAngle = angle(p.x, p.y, m.x, m.y);
        this._spawnAfterimage(m.x, m.y, dashAngle);
        this.game.particles.slashTrail(m.x, m.y, hitAngle);
        this.game.particles.slashTrail(p.x, p.y, dashAngle);

        const { damage, isCrit } = p.getDamage();
        const strike = m.takeDamage(damage, hitAngle);

        if (strike.blockedByShield) {
            this.spawnDamageNumber(m.x, m.y - m.hitboxRadius - 4, 0, false, '#9fb8d8');
            return;
        }

        if (strike.actualDamage <= 0) return;

        const combo = p.registerComboHit('path');
        this.game.abilities.onResolveHit(hit, combo);

        this.spawnDamageNumber(m.x, m.y - m.hitboxRadius - 4, strike.actualDamage, isCrit);
        this.game.particles.hitSpark(m.x, m.y, isCrit);
        this.game.renderer.shakeAttackHit(isCrit, combo);

        if (m.kind === MonsterKind.BERSERKER) {
            const drain = m.base.kiDrainOnHit || 0;
            p.ki = Math.max(0, p.ki - drain);
        }

        if (m.dying) {
            this._applyIceBurst(m.x, m.y);
            this._handleMonsterKilled(m);
        }
    }

    _applyCloneHits() {
        const p = this.game.player;
        if (!p || !p.shadowClones.length) return;
        const monsters = this.game.spawner.getActiveMonsters();
        const cloneDmg = p.getAbilityDamage(0.2);
        for (const c of p.shadowClones) {
            for (const m of monsters) {
                if (!circlesCollide(c.x, c.y, p.effectiveRadius * 0.7, m.x, m.y, m.hitboxRadius)) continue;
                const hit = m.takeDamage(cloneDmg, angle(c.x, c.y, m.x, m.y));
                if (hit.actualDamage > 0) {
                    this.spawnDamageNumber(m.x, m.y - m.hitboxRadius - 4, hit.actualDamage, false, '#a58ad0');
                    this.game.particles.hitSpark(m.x, m.y, false);
                }
                if (m.dying) this._handleMonsterKilled(m);
            }
        }
    }

    _applyIceBurst(centerX, centerY) {
        const p = this.game.player;
        if (!p.turnBuffs.iceReady) return;
        p.turnBuffs.iceReady = false;
        const monsters = this.game.spawner.getActiveMonsters();
        const dmg = p.getAbilityDamage(0.30);
        const radius = 90;
        for (const m of monsters) {
            if (dist(centerX, centerY, m.x, m.y) > radius + m.hitboxRadius) continue;
            m.freeze(1.8);
            m.vulnerableMark = true;
            const hit = m.takeDamage(dmg, angle(centerX, centerY, m.x, m.y));
            if (hit.actualDamage > 0) this.spawnDamageNumber(m.x, m.y - m.hitboxRadius - 4, hit.actualDamage, false, '#78d8ff');
            this.game.particles.freezeEffect(m.x, m.y);
            if (m.dying) this._handleMonsterKilled(m);
        }
        this.game.player.queueMessage('冰冻触发!');
    }

    update(dt) {
        const p = this.game.player;

        if (this.resolving) {
            this.resolveTimer -= dt;
            if (this.resolveTimer <= 0) {
                if (this.pendingHits.length > 0) {
                    this._applyQueuedHit(this.pendingHits.shift());
                    this.resolveTimer = CONFIG.COMBAT_RESOLVE.HIT_INTERVAL;
                } else {
                    this._finishResolve();
                }
            }
        } else if (p && p.state === PlayerState.ATTACKING && p.pathIndex < p.attackPath.length - 1) {
            const from = p.attackPath[p.pathIndex];
            const to = p.attackPath[p.pathIndex + 1];
            this._recordPathHits(from, to, p.pathIndex);
            this._recordPathProjectileHits(from, to, p.pathIndex);
        }

        for (let i = this.afterimages.length - 1; i >= 0; i--) {
            this.afterimages[i].life -= dt;
            if (this.afterimages[i].life <= 0) this.afterimages.splice(i, 1);
        }

        if (this.game.abilities.hasActiveFx()) {
            this.game.abilities.update(dt);
        }
        for (const d of this.damageNumbers) {
            d.life -= dt;
            d.y += d.vy * dt;
            d.vy *= 0.95;
        }
        this.damageNumbers = this.damageNumbers.filter(d => d.life > 0);
    }

    drawAfterimages(ctx) {
        const p = this.game.player;
        if (!p || this.afterimages.length === 0) return;
        const sprite = SPRITES.ninja.attack[0];
        for (const img of this.afterimages) {
            const t = img.life / img.maxLife;
            ctx.save();
            ctx.globalAlpha = t * 0.55;
            ctx.translate(img.x, img.y);
            ctx.rotate(img.angle * 0.15);
            drawSprite(ctx, sprite, 0, 0, p.spriteScale * 0.92);
            ctx.restore();
        }
    }

    drawDamageNumbers(ctx) {
        const s = this.game.renderer.uiScale || 1;
        for (const d of this.damageNumbers) {
            const alpha = d.life / d.maxLife;
            const size = Math.floor((15 + d.damage * 0.24) * s * (d.isCrit ? 1.28 : 1));
            ctx.save();
            ctx.globalAlpha = alpha;
            ctx.font = `${size}px ${GAME_FONT}`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.lineWidth = Math.max(2, size * 0.14);
            ctx.strokeStyle = 'rgba(255,248,236,0.92)';
            ctx.strokeText(String(d.damage), d.x, d.y);
            ctx.fillStyle = d.color;
            ctx.fillText(String(d.damage), d.x, d.y);
            ctx.restore();
        }
    }
}
