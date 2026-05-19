const GAME_FONT = 'Arial, Helvetica, "Microsoft YaHei", sans-serif';

function drawGameText(ctx, text, x, y, size, color, align = 'center', baseline = 'middle') {
    const dpr = typeof window !== 'undefined' ? Math.min(window.devicePixelRatio || 1, 2.5) : 1;
    const px = Math.round(size * dpr) / dpr;
    ctx.font = `${px}px ${GAME_FONT}`;
    ctx.fillStyle = color;
    ctx.textAlign = align;
    ctx.textBaseline = baseline;
    ctx.fillText(text, x, y);
}
