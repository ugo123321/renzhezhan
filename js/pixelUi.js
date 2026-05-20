function getBuffOrbIconSprite(type) {
    const W = '#f8f8f8';
    const D = '#2a1e16';
    const B = '#9be8ff';
    const G = '#d8ff98';
    const P = '#ffd0ff';
    const O = '#ffb070';
    const map = {
        attack: [
            [null, W, null, null, W, null],
            [null, W, O, O, W, null],
            [null, W, O, O, W, null],
            [null, W, null, null, W, null],
            [null, D, null, null, D, null],
            [null, D, null, null, D, null],
        ],
        ki: [
            [null, B, null, B, null],
            [B, W, B, W, B],
            [null, B, W, B, null],
            [null, B, W, B, null],
            [B, W, B, W, B],
        ],
        combo: [
            [null, P, W, P, null],
            [P, null, W, null, P],
            [W, W, W, W, W],
            [P, null, W, null, P],
            [null, P, W, P, null],
        ],
        ice: [
            [null, null, B, null, null],
            [null, B, W, B, null],
            [B, W, W, W, B],
            [null, B, W, B, null],
            [null, null, B, null, null],
        ],
    };
    return map[type] || map.attack;
}

function drawPixelIcon(ctx, sprite, cx, cy, px) {
    if (!sprite || sprite.length === 0) return;
    const rows = sprite.length;
    const cols = sprite[0].length;
    const ox = Math.floor(cx - (cols * px) / 2);
    const oy = Math.floor(cy - (rows * px) / 2);
    for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
            const color = sprite[r][c];
            if (!color) continue;
            ctx.fillStyle = color;
            ctx.fillRect(ox + c * px, oy + r * px, px, px);
        }
    }
}

function drawPixelPanel(ctx, x, y, w, h, fill, border, borderPx = 2) {
    const bx = Math.floor(x);
    const by = Math.floor(y);
    const bw = Math.floor(w);
    const bh = Math.floor(h);
    const bp = Math.max(1, Math.floor(borderPx));
    ctx.fillStyle = border;
    ctx.fillRect(bx, by, bw, bh);
    ctx.fillStyle = fill;
    ctx.fillRect(bx + bp, by + bp, bw - bp * 2, bh - bp * 2);
}

function drawPixelText(ctx, text, x, y, sizePx, color, align = 'center', baseline = 'middle') {
    ctx.save();
    ctx.imageSmoothingEnabled = false;
    const px = Math.max(8, Math.round(sizePx));
    const ix = Math.floor(x);
    const iy = Math.floor(y);
    ctx.font = `bold ${px}px ${GAME_FONT}`;
    ctx.textAlign = align;
    ctx.textBaseline = baseline;
    const off = Math.max(1, Math.floor(px / 7));
    ctx.fillStyle = '#1a1008';
    ctx.fillText(text, ix + off, iy + off);
    ctx.fillStyle = color;
    ctx.fillText(text, ix, iy);
    ctx.restore();
}

function getBuffOrbShortLabel(type) {
    if (type === 'attack') return '攻击';
    if (type === 'ki') return '气力';
    if (type === 'combo') return '连击';
    if (type === 'ice') return '冰冻';
    return '强化';
}
