class CombatManager {
    constructor(game) {
        this.game = game;
        this.damageNumbers = [];
        this.pendingLightning = [];
    }

    onMonsterKilled(monster) {
        if (monster.deathHandled) return;
        monster.deathHandled = true;

        const { particles, experience, audio, bloodStains } = this.game;
        const intensity = monster.size > 13 ? 1.35 : 1;
        const player = this.game.player;
        const hitAngle = player
            ? angle(player.x, player.y, monster.x, monster.y)
            : Math.random() * Math.PI * 2;
        bloodStains.spawn(monster.x, monster.y + monster.hitboxRadius * 0.35, intensity, hitAngle);
        particles.deathEffect(monster.x, monster.y, monster.color);
        experience.spawnOrb(monster.x, monster.y, monster.xpValue);
        audio.playMonsterDeath();
    }

    onBossKilled(boss) {
        if (boss.deathHandled) return;
        boss.deathHandled = true;

        const { particles, experience, audio, renderer } = this.game;
        particles.deathEffect(boss.x, boss.y + 20, boss.color);
        for (let i = 0; i < 6; i++) {
            const a = (i / 6) * Math.PI * 2;
            const distR = 40 + i * 8;
            experience.spawnOrb(
                boss.x + Math.cos(a) * distR,
                boss.y + 20 + Math.sin(a) * distR * 0.4,
                boss.xpValue / 4
            );
        }
        renderer.shake(12, 0.35);
        audio.playMonsterDeath();
        if (this.game.bossChests) {
            this.game.bossChests.spawnForBoss(boss);
        }
    }

    update(dt) {
        this._updatePendingLightning(dt);

        const { player, spawner, projectiles, particles, renderer, experience } = this.game;

        if (player.state === PlayerState.ATTACKING) {
            this.checkAttackCollisions();
            this.checkBossAttackCollisions();
            this.checkShadowCloneCollisions();
            this.checkBossShadowCloneCollisions();
        }

        this.updateMonsterActions(dt);
        this.checkProjectileHits();
        this.checkBossProjectileHits();
        this.updateDamageNumbers(dt);
    }

    checkAttackCollisions() {
        const { player, spawner, particles, renderer } = this.game;

        for (const m of spawner.monsters) {
            if (!m.alive || m.dying || m.spawning) continue;

            const colliding = circlesCollide(
                player.x, player.y, player.effectiveRadius,
                m.x, m.y, m.hitboxRadius
            );

            if (colliding && !player.hitMonstersInSegment.has(m.id)) {
                player.hitMonstersInSegment.add(m.id);
                const combo = player.registerComboHit();
                if (this.game.abilities) {
                    this.game.abilities.onComboHit(combo);
                }
                const { damage, isCrit, isIaiCrit } = player.getDamage();
                const actualDmg = m.takeDamage(damage);

                this.spawnDamageNumber(m.x, m.y - m.hitboxRadius - 5, actualDmg, isCrit, null, combo, isIaiCrit);
                if (isIaiCrit) {
                    particles.iaiCritEffect(m.x, m.y);
                    renderer.shake(10, 0.2);
                } else {
                    particles.hitSpark(m.x, m.y, isCrit);
                }

                const a = angle(player.x, player.y, m.x, m.y);
                particles.slashTrail(m.x, m.y, a);

                renderer.shakeAttackHit(isCrit, combo);
                this.game.audio.playHit(isCrit);

                if (player.freezeChance > 0 && Math.random() < player.freezeChance) {
                    m.freeze(player.freezeDuration);
                    particles.freezeEffect(m.x, m.y);
                }

                if (player.lightningChains > 0) {
                    this.triggerLightningChain(m, actualDmg * 0.4);
                }

                if (m.dying) {
                    this.onMonsterKilled(m);
                }
            } else if (!colliding && player.hitMonstersInSegment.has(m.id)) {
                player.hitMonstersInSegment.delete(m.id);
            }
        }
    }

    _damageBoss(boss, damage, isCrit, combo, color, isIaiCrit = false) {
        const { particles, renderer } = this.game;
        const actualDmg = boss.takeDamage(damage);
        const yOff = boss.hitboxRadius ? -boss.hitboxRadius - 5 : -40;
        this.spawnDamageNumber(boss.x, boss.y + yOff, actualDmg, isCrit, color || '#fa4', combo, isIaiCrit);
        if (isIaiCrit) {
            particles.iaiCritEffect(boss.x, boss.y + 15);
            renderer.shake(10, 0.2);
        } else {
            particles.hitSpark(boss.x, boss.y + 15, isCrit);
        }
        renderer.shakeAttackHit(isCrit, combo);
        this.game.audio.playHit(isCrit);
        if (boss.dying) this.onBossKilled(boss);
        return actualDmg;
    }

    checkBossAttackCollisions() {
        const { player, bossManager } = this.game;
        const boss = bossManager && bossManager.boss;
        if (!boss || !boss.alive || boss.dying) return;

        const colliding = circlesCollide(
            player.x, player.y, player.effectiveRadius,
            boss.x, boss.y + 10, boss.hitboxRadius
        );

        if (colliding && !player.hitMonstersInSegment.has('boss')) {
            player.hitMonstersInSegment.add('boss');
            const combo = player.registerComboHit();
            if (this.game.abilities) this.game.abilities.onComboHit(combo);
            const { damage, isCrit, isIaiCrit } = player.getDamage();
            this._damageBoss(boss, damage, isCrit, combo, null, isIaiCrit);
        } else if (!colliding && player.hitMonstersInSegment.has('boss')) {
            player.hitMonstersInSegment.delete('boss');
        }
    }

    checkBossShadowCloneCollisions() {
        const { player, bossManager } = this.game;
        const boss = bossManager && bossManager.boss;
        if (!boss || !boss.alive || boss.dying) return;
        if (!player.shadowClonesActive || !player.shadowCloneSlots.length) return;

        const cloneRadius = player.effectiveRadius * 0.85;
        for (const clone of player.shadowCloneSlots) {
            if (!circlesCollide(clone.x, clone.y, cloneRadius,
                boss.x, boss.y + 10, boss.hitboxRadius)) continue;
            if (clone.hitMonstersInSegment.has('boss')) continue;
            clone.hitMonstersInSegment.add('boss');
            const { damage, isCrit } = player.getCloneDamage();
            this._damageBoss(boss, damage, isCrit, 0, '#a8a');
        }
    }

    checkBossProjectileHits() {
        const { player, bossManager, particles } = this.game;
        if (!bossManager) return;

        for (const p of bossManager.projectiles) {
            if (!p.alive) continue;

            if (player.isInAttackMode()) {
                if (circlesCollide(player.x, player.y, player.effectiveRadius + 8, p.x, p.y, p.radius)) {
                    p.alive = false;
                    particles.bulletShatter(p.x, p.y);
                    particles.hitSpark(p.x, p.y, false);
                    continue;
                }
            }

            if (player.isVulnerable()) {
                if (circlesCollide(player.x, player.y, player.effectiveRadius, p.x, p.y, p.radius)) {
                    p.alive = false;
                    if (player.takeDamage(CONFIG.PLAYER.DAMAGE_PER_HIT)) {
                        this.game.audio.playPlayerHurt();
                    }
                    particles.bulletShatter(p.x, p.y);
                }
            }
        }
    }

    checkShadowCloneCollisions() {
        const { player, spawner, particles, renderer } = this.game;
        if (!player.shadowClonesActive || !player.shadowCloneSlots.length) return;

        const cloneRadius = player.effectiveRadius * 0.85;

        for (const clone of player.shadowCloneSlots) {
            for (const m of spawner.monsters) {
                if (!m.alive || m.dying || m.spawning) continue;

                const colliding = circlesCollide(
                    clone.x, clone.y, cloneRadius,
                    m.x, m.y, m.hitboxRadius
                );

                if (colliding && !clone.hitMonstersInSegment.has(m.id)) {
                    clone.hitMonstersInSegment.add(m.id);
                    const { damage, isCrit } = player.getCloneDamage();
                    const actualDmg = m.takeDamage(damage);

                    this.spawnDamageNumber(m.x, m.y - m.hitboxRadius - 5, actualDmg, isCrit, '#a8a');
                    particles.hitSpark(m.x, m.y, isCrit);

                    if (isCrit) {
                        renderer.shake(CONFIG.SHAKE.NORMAL.magnitude, CONFIG.SHAKE.NORMAL.duration);
                    }
                    this.game.audio.playHit(isCrit);

                    if (m.dying) {
                        this.onMonsterKilled(m);
                    }
                } else if (!colliding && clone.hitMonstersInSegment.has(m.id)) {
                    clone.hitMonstersInSegment.delete(m.id);
                }
            }
        }
    }

    triggerLightningChain(sourceMonster, damage) {
        const { spawner } = this.game;
        const active = spawner.getActiveMonsters().filter(m => m.id !== sourceMonster.id && !m.spawning);

        active.sort((a, b) =>
            dist(sourceMonster.x, sourceMonster.y, a.x, a.y) -
            dist(sourceMonster.x, sourceMonster.y, b.x, b.y)
        );

        let prevX = sourceMonster.x;
        let prevY = sourceMonster.y;
        const maxChains = this.game.player.lightningChains;
        const dmg = Math.round(damage);
        const stepDelay = 0.16;

        for (let i = 0; i < Math.min(maxChains, active.length); i++) {
            const t = active[i];
            if (dist(prevX, prevY, t.x, t.y) > 200) break;

            this.pendingLightning.push({
                timer: i * stepDelay,
                fromX: prevX,
                fromY: prevY,
                toX: t.x,
                toY: t.y,
                target: t,
                damage: dmg,
                fired: false,
            });

            prevX = t.x;
            prevY = t.y;
        }
    }

    _updatePendingLightning(dt) {
        const { particles } = this.game;
        const keep = [];

        for (const step of this.pendingLightning) {
            step.timer -= dt;
            if (!step.fired && step.timer <= 0) {
                step.fired = true;
                const t = step.target;
                if (t.alive && !t.dying && !t.spawning) {
                    const actualDmg = t.takeDamage(step.damage);
                    this.spawnDamageNumber(
                        t.x, t.y - t.hitboxRadius - 5, actualDmg, false, '#ff0');
                    particles.lightningEffect(step.fromX, step.fromY, step.toX, step.toY);
                    if (t.dying) this.onMonsterKilled(t);
                }
            }
            if (!step.fired || step.timer > -0.35) keep.push(step);
        }

        this.pendingLightning = keep;
    }

    getMonsterTarget(player) {
        if (player.state === PlayerState.RETURNING) {
            return { x: player.x, y: player.y };
        }
        return { x: player.homeX, y: player.homeY };
    }

    updateMonsterActions(dt) {
        const { player, spawner, projectiles } = this.game;
        const target = this.getMonsterTarget(player);

        for (const m of spawner.monsters) {
            if (!m.alive) continue;
            const action = m.update(dt, target.x, target.y);
            if (!action) continue;

            if (action.type === 'shoot') {
                projectiles.spawn(action.x, action.y, action.angle);
            } else if (action.type === 'melee') {
                if (player.isVulnerable()) {
                    const d = dist(m.x, m.y, player.x, player.y);
                    if (d < m.range + player.effectiveRadius) {
                        if (player.takeDamage(CONFIG.PLAYER.DAMAGE_PER_HIT)) {
                            this.game.audio.playPlayerHurt();
                        }
                    }
                }
            }
        }
    }

    checkProjectileHits() {
        const { player, projectiles, particles } = this.game;

        for (const p of projectiles.projectiles) {
            if (!p.alive) continue;

            if (player.isInAttackMode()) {
                if (circlesCollide(player.x, player.y, player.effectiveRadius + 5, p.x, p.y, p.radius)) {
                    p.alive = false;
                    particles.bulletShatter(p.x, p.y);
                    continue;
                }
            }

            if (player.isVulnerable()) {
                if (circlesCollide(player.x, player.y, player.effectiveRadius, p.x, p.y, p.radius)) {
                    p.alive = false;
                    if (player.takeDamage(CONFIG.PLAYER.DAMAGE_PER_HIT)) {
                        this.game.audio.playPlayerHurt();
                    }
                    particles.bulletShatter(p.x, p.y);
                }
            }
        }
    }

    spawnDamageNumber(x, y, damage, isCrit, color = null, combo = 0, isIaiCrit = false) {
        this.damageNumbers.push({
            x, y,
            damage,
            isCrit,
            isIaiCrit,
            combo,
            color: isIaiCrit ? '#8ef' : (color || (isCrit ? '#ff0' : '#fff')),
            life: isIaiCrit ? 1.1 : 0.8,
            maxLife: isIaiCrit ? 1.1 : 0.8,
            vy: isIaiCrit ? -80 : -60,
        });
    }

    updateDamageNumbers(dt) {
        for (const d of this.damageNumbers) {
            d.life -= dt;
            d.y += d.vy * dt;
            d.vy *= 0.95;
        }
        this.damageNumbers = this.damageNumbers.filter(d => d.life > 0);
    }

    drawDamageNumbers(ctx) {
        const uiScale = this.game.renderer.uiScale || 1;
        for (const d of this.damageNumbers) {
            const alpha = d.life / d.maxLife;
            const scale = d.isIaiCrit ? 1.8 : (d.isCrit ? 1.4 : 1.0);
            const size = Math.floor((14 + d.damage * 0.3) * scale * uiScale);

            ctx.globalAlpha = alpha;
            if (d.isIaiCrit) {
                ctx.shadowColor = '#8ef';
                ctx.shadowBlur = 14;
            }
            drawGameText(ctx, String(d.damage), d.x, d.y, size, d.color);
            ctx.shadowBlur = 0;

            if (d.isIaiCrit) {
                drawGameText(ctx, '居合!', d.x, d.y - size * 0.9,
                    Math.floor(size * 0.5), '#adf');
            } else if (d.isCrit) {
                drawGameText(ctx, '暴击', d.x, d.y - size * 0.85,
                    Math.floor(size * 0.55), '#d44');
            }
            ctx.globalAlpha = 1;
        }
    }
}
