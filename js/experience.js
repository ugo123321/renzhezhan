class XpOrb {
    constructor(x, y, value) {
        this.x = x;
        this.y = y;
        this.value = value;
        this.vx = randRange(-40, 40);
        this.vy = randRange(-60, -20);
        this.alive = true;
        this.age = 0;
        this.bobTimer = Math.random() * Math.PI * 2;
        this.settled = false;
        this.radius = CONFIG.XP.ORB_RADIUS;
        this.pickupDelay = CONFIG.XP.PICKUP_DELAY;
    }

    canPickup() {
        return this.age >= this.pickupDelay;
    }

    update(dt, playerX, playerY, magnetRadius) {
        this.age += dt;
        this.bobTimer += dt * 3;

        if (!this.settled) {
            this.vy += 120 * dt;
            this.x += this.vx * dt;
            this.y += this.vy * dt;
            if (this.age > 0.4) {
                this.settled = true;
                this.vx = 0;
                this.vy = 0;
            }
        }

        const d = dist(this.x, this.y, playerX, playerY);
        const pickupReady = this.canPickup();

        if (pickupReady && d < magnetRadius) {
            const n = normalize(playerX - this.x, playerY - this.y);
            const speed = CONFIG.XP.ORB_SPEED * (1 - d / magnetRadius + 0.3);
            this.x += n.x * speed * dt;
            this.y += n.y * speed * dt;
        }

        if (pickupReady && d < 15) {
            this.alive = false;
            return this.value;
        }
        return 0;
    }

    draw(ctx) {
        if (!this.alive) return;
        const bobY = Math.sin(this.bobTimer) * 2;
        if (!this.canPickup()) {
            ctx.save();
            ctx.globalAlpha = 0.55;
        }
        drawSprite(ctx, SPRITES.xpOrb, Math.floor(this.x), Math.floor(this.y + bobY), 3);
        if (!this.canPickup()) {
            ctx.restore();
        }

        const glowAlpha = this.canPickup()
            ? 0.45 + Math.sin(this.bobTimer) * 0.2
            : 0.22;
        ctx.globalAlpha = glowAlpha;
        ctx.beginPath();
        ctx.arc(this.x, this.y + bobY, 6, 0, Math.PI * 2);
        ctx.fillStyle = '#3a7bd5';
        ctx.fill();
        ctx.globalAlpha = 1;
    }
}

class ExperienceManager {
    constructor() {
        this.orbs = [];
    }

    spawnOrb(x, y, value) {
        this.orbs.push(new XpOrb(x, y, value));
    }

    update(dt, playerX, playerY, magnetRadius) {
        let totalXp = 0;
        for (const orb of this.orbs) {
            totalXp += orb.update(dt, playerX, playerY, magnetRadius);
        }
        this.orbs = this.orbs.filter(o => o.alive);
        return totalXp;
    }

    draw(ctx) {
        for (const orb of this.orbs) {
            orb.draw(ctx);
        }
    }
}
