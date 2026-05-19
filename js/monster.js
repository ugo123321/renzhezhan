class Monster {
    constructor(x, y, config, id) {
        this.id = id;
        this.x = x;
        this.y = y;
        this.config = { ...config };
        this.hp = config.hp;
        this.maxHp = config.hp;
        this.def = config.def;
        this.range = config.range;
        this.size = config.size;
        this.speed = config.speed;
        this.atkSpeed = config.atkSpeed;
        this.atkDamage = config.atkDamage;
        this.monsterType = config.type;
        this.color = config.color;
        this.xpValue = config.xp;

        this.alive = true;
        this.atkTimer = 0;
        this.animFrame = 0;
        this.animTimer = 0;
        this.isMoving = false;
        this.walkPhase = 0;

        this.spawnTimer = CONFIG.SPAWN_FADE_DURATION;
        this.spawning = true;
        this.deathTimer = 0;
        this.dying = false;

        this.frozen = false;
        this.frozenTimer = 0;

        this.configKey = '';
    }

    get hitboxRadius() {
        return this.size;
    }

    update(dt, playerX, playerY) {
        if (this.spawning) {
            this.spawnTimer -= dt;
            if (this.spawnTimer <= 0) {
                this.spawning = false;
            }
            return null;
        }

        if (this.dying) {
            this.deathTimer -= dt;
            if (this.deathTimer <= 0) {
                this.alive = false;
            }
            return null;
        }

        if (this.frozen) {
            this.frozenTimer -= dt;
            if (this.frozenTimer <= 0) {
                this.frozen = false;
            }
            return null;
        }

        const d = dist(this.x, this.y, playerX, playerY);
        this.isMoving = d > this.range;

        this.walkPhase += dt * (this.isMoving ? 14 : 4);
        const animInterval = this.isMoving ? 0.14 : 0.45;
        this.animTimer += dt;
        if (this.animTimer >= animInterval) {
            this.animTimer = 0;
            this.animFrame = (this.animFrame + 1) % 2;
        }

        if (this.isMoving) {
            const n = normalize(playerX - this.x, playerY - this.y);
            this.x += n.x * this.speed * dt;
            this.y += n.y * this.speed * dt;
        }

        this.atkTimer += dt;
        if (d <= this.range && this.atkTimer >= this.atkSpeed) {
            this.atkTimer = 0;
            if (this.monsterType === 'ranged') {
                const a = angle(this.x, this.y, playerX, playerY);
                return {
                    type: 'shoot',
                    x: this.x, y: this.y,
                    angle: a,
                };
            } else {
                return {
                    type: 'melee',
                    damage: this.atkDamage,
                    targetX: playerX,
                    targetY: playerY,
                };
            }
        }

        return null;
    }

    takeDamage(rawDamage) {
        const actual = Math.max(1, rawDamage - this.def);
        this.hp -= actual;
        if (this.hp <= 0) {
            this.hp = 0;
            this.dying = true;
            this.deathTimer = 0.3;
            this.deathHandled = false;
        }
        return actual;
    }

    freeze(duration) {
        this.frozen = true;
        this.frozenTimer = duration;
    }

    getSpriteKey() {
        switch (this.configKey) {
            case 'NORMAL_MELEE': return SPRITES.normalMelee;
            case 'NORMAL_RANGED': return SPRITES.normalRanged;
            case 'STRONG_MELEE': return SPRITES.strongMelee;
            case 'STRONG_RANGED': return SPRITES.strongRanged;
            default: return SPRITES.normalMelee;
        }
    }

    getWalkBob() {
        if (!this.isMoving || this.spawning || this.dying) return 0;
        return Math.sin(this.walkPhase) * 3;
    }

    draw(ctx) {
        if (!this.alive) return;

        let alpha = 1;
        if (this.spawning) {
            alpha = 1 - (this.spawnTimer / CONFIG.SPAWN_FADE_DURATION);
        }
        if (this.dying) {
            alpha = this.deathTimer / 0.3;
        }

        const spriteSet = this.getSpriteKey();
        const isAttacking = !this.isMoving && this.atkTimer < 0.35 && !this.spawning;
        let frames = spriteSet.walk || spriteSet.idle;
        if (isAttacking && spriteSet.attack) {
            frames = spriteSet.attack;
        }
        const sprite = frames[this.animFrame % frames.length];
        const scale = this.size > 13
            ? CONFIG.DISPLAY.MONSTER_SPRITE_SCALE_STRONG
            : CONFIG.DISPLAY.MONSTER_SPRITE_SCALE;

        const drawY = Math.floor(this.y + this.getWalkBob());

        if (this.frozen) {
            ctx.globalAlpha = alpha;
            ctx.fillStyle = 'rgba(0, 200, 255, 0.3)';
            ctx.beginPath();
            ctx.arc(this.x, drawY, this.hitboxRadius + 4, 0, Math.PI * 2);
            ctx.fill();
            ctx.globalAlpha = 1;
        }

        drawSprite(ctx, sprite, Math.floor(this.x), drawY, scale, alpha);

        if (!this.spawning && !this.dying && this.hp < this.maxHp) {
            this.drawHpBar(ctx, drawY);
        }
    }

    drawHpBar(ctx, drawY) {
        const barW = 22;
        const barH = 3;
        const x = this.x - barW / 2;
        const y = drawY - this.hitboxRadius - 10;
        const ratio = this.hp / this.maxHp;

        ctx.fillStyle = '#333';
        ctx.fillRect(x, y, barW, barH);
        ctx.fillStyle = ratio > 0.5 ? '#4f4' : ratio > 0.25 ? '#ff0' : '#f44';
        ctx.fillRect(x, y, barW * ratio, barH);
        ctx.strokeStyle = '#000';
        ctx.lineWidth = 1;
        ctx.strokeRect(x, y, barW, barH);
    }
}
