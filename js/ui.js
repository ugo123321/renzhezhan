class UI {
    constructor() {}

    draw(ctx, player, vp, uiScale) {
        const s = uiScale || 1;
        this.drawKiBar(ctx, player, vp, s);
        this.drawHearts(ctx, player, vp, s);
        this.drawXpBar(ctx, player, vp, s);
        this.drawLevel(ctx, player, vp, s);
    }

    drawHearts(ctx, player, vp, s) {
        const xpBarY = vp.y + vp.h - 28 * s;
        const heartScale = Math.round(4 * s);
        const spacing = 26 * s;
        const heartBlockH = heartScale * 5;
        const y = xpBarY - heartBlockH - 8 * s;
        const totalHearts = Math.ceil(player.maxHearts);
        const totalW = totalHearts > 0 ? (totalHearts - 1) * spacing + heartScale * 5 : 0;
        const startX = vp.x + (vp.w - totalW) / 2;
        for (let i = 0; i < totalHearts; i++) {
            const heartVal = player.hearts - i;
            let sprite;
            if (heartVal >= 1) {
                sprite = SPRITES.heart.full;
            } else if (heartVal >= 0.5) {
                sprite = SPRITES.heart.half;
            } else {
                sprite = SPRITES.heart.empty;
            }
            drawSprite(ctx, sprite, startX + i * spacing, y, heartScale);
        }
    }

    drawKiBar(ctx, player, vp, s) {
        const pad = 14 * s;
        const barW = vp.w - pad * 2;
        const barH = Math.round(8 * s);
        const x = vp.x + pad;
        const y = vp.y + 16 * s;
        const ratio = clamp(player.ki / player.kiMax, 0, 1);

        ctx.fillStyle = 'rgba(60, 50, 40, 0.35)';
        ctx.fillRect(x, y, barW, barH);
        ctx.fillStyle = '#4a8ab8';
        ctx.fillRect(x, y, barW * ratio, barH);
        drawGameText(ctx, '气', x + 4, y + barH + 2, Math.round(12 * s), '#4a5a68', 'left', 'top');
    }

    drawXpBar(ctx, player, vp, s) {
        const pad = 14 * s;
        const barW = vp.w - pad * 2;
        const barH = Math.round(8 * s);
        const x = vp.x + pad;
        const y = vp.y + vp.h - 28 * s;
        const ratio = clamp(player.xp / player.xpToNext, 0, 1);

        ctx.fillStyle = 'rgba(60, 50, 40, 0.35)';
        ctx.fillRect(x, y, barW, barH);
        ctx.fillStyle = '#2d5aa0';
        ctx.fillRect(x, y, barW * ratio, barH);
        drawGameText(ctx, `${player.xp}/${player.xpToNext}`, x + barW, y - 2,
            Math.round(12 * s), '#2a4a78', 'right', 'bottom');
    }

    drawLevel(ctx, player, vp, s) {
        const xpBarY = vp.y + vp.h - 28 * s;
        drawGameText(ctx, `Lv.${player.level}`, vp.x + 14 * s, xpBarY - 4 * s,
            Math.round(13 * s), '#5a6a58', 'left', 'bottom');
    }
}
