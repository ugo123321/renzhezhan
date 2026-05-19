class CombatManager {
    constructor(game) {
        this.game = game;
        this.damageNumbers = [];
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

    update(dt) {
        const { player, spawner, projectiles, particles, renderer, experience } = this.game;

        if (player.state === PlayerState.ATTACKING) {
            this.checkAttackCollisions();
        }

        this.updateMonsterActions(dt);
        this.checkProjectileHits();
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
                const { damage, isCrit } = player.getDamage();
                const actualDmg = m.takeDamage(damage);

                this.spawnDamageNumber(m.x, m.y - m.hitboxRadius - 5, actualDmg, isCrit);
                particles.hitSpark(m.x, m.y, isCrit);

                const a = angle(player.x, player.y, m.x, m.y);
                particles.slashTrail(m.x, m.y, a);

                if (isCrit) {
                    renderer.shake(CONFIG.SHAKE.CRIT.magnitude, CONFIG.SHAKE.CRIT.duration);
                } else {
                    renderer.shake(CONFIG.SHAKE.NORMAL.magnitude, CONFIG.SHAKE.NORMAL.duration);
                }
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

    triggerLightningChain(sourceMonster, damage) {
        const { spawner, particles } = this.game;
        const targets = [];
        const active = spawner.getActiveMonsters().filter(m => m.id !== sourceMonster.id && !m.spawning);

        active.sort((a, b) =>
            dist(sourceMonster.x, sourceMonster.y, a.x, a.y) -
            dist(sourceMonster.x, sourceMonster.y, b.x, b.y)
        );

        let prevX = sourceMonster.x;
        let prevY = sourceMonster.y;
        const maxChains = this.game.player.lightningChains;

        for (let i = 0; i < Math.min(maxChains, active.length); i++) {
            const t = active[i];
            if (dist(prevX, prevY, t.x, t.y) > 200) break;
            targets.push(t);

            const actualDmg = t.takeDamage(Math.round(damage));
            this.spawnDamageNumber(t.x, t.y - t.hitboxRadius - 5, actualDmg, false, '#ff0');
            particles.lightningEffect(prevX, prevY, t.x, t.y);

            if (t.dying) {
                this.onMonsterKilled(t);
            }

            prevX = t.x;
            prevY = t.y;
        }
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

            if (player.state === PlayerState.ATTACKING) {
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

    spawnDamageNumber(x, y, damage, isCrit, color = null) {
        this.damageNumbers.push({
            x, y,
            damage,
            isCrit,
            color: color || (isCrit ? '#ff0' : '#fff'),
            life: 0.8,
            maxLife: 0.8,
            vy: -60,
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
            const scale = d.isCrit ? 1.4 : 1.0;
            const size = Math.floor((14 + d.damage * 0.3) * scale * uiScale);

            ctx.globalAlpha = alpha;
            drawGameText(ctx, String(d.damage), d.x, d.y, size, d.color);

            if (d.isCrit) {
                drawGameText(ctx, '暴击', d.x, d.y - size * 0.85,
                    Math.floor(size * 0.55), '#d44');
            }
            ctx.globalAlpha = 1;
        }
    }
}
