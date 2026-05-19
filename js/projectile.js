class Projectile {
    constructor(x, y, angle) {
        this.x = x;
        this.y = y;
        this.vx = Math.cos(angle) * CONFIG.PROJECTILE.SPEED;
        this.vy = Math.sin(angle) * CONFIG.PROJECTILE.SPEED;
        this.radius = CONFIG.PROJECTILE.RADIUS;
        this.alive = true;
        this.animTimer = 0;
    }

    update(dt, canvasW, canvasH) {
        this.x += this.vx * dt;
        this.y += this.vy * dt;
        this.animTimer += dt;

        if (this.x < -20 || this.x > canvasW + 20 ||
            this.y < -20 || this.y > canvasH + 20) {
            this.alive = false;
        }
    }

    draw(ctx) {
        if (!this.alive) return;
        drawSprite(ctx, SPRITES.bullet, Math.floor(this.x), Math.floor(this.y), 4);

        ctx.globalAlpha = 0.4 + Math.sin(this.animTimer * 8) * 0.2;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius + 2, 0, Math.PI * 2);
        ctx.fillStyle = '#f4f';
        ctx.fill();
        ctx.globalAlpha = 1;
    }
}

class ProjectileManager {
    constructor() {
        this.projectiles = [];
    }

    spawn(x, y, angle) {
        this.projectiles.push(new Projectile(x, y, angle));
    }

    update(dt, canvasW, canvasH) {
        for (const p of this.projectiles) {
            p.update(dt, canvasW, canvasH);
        }
        this.projectiles = this.projectiles.filter(p => p.alive);
    }

    draw(ctx) {
        for (const p of this.projectiles) {
            p.draw(ctx);
        }
    }
}
