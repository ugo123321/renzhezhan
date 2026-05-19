const GAME_FONT = 'Arial, Helvetica, "Microsoft YaHei", sans-serif';

function drawGameText(ctx, text, x, y, size, color, align = 'center', baseline = 'middle') {
    ctx.font = `${size}px ${GAME_FONT}`;
    ctx.fillStyle = color;
    ctx.textAlign = align;
    ctx.textBaseline = baseline;
    ctx.fillText(text, x, y);
}
