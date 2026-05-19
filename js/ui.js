class UI {
    constructor() {
        this.pauseRects = {};
    }

    draw(ctx, player, vp, uiScale, opts = {}) {
        const s = uiScale || 1;
        this.drawKiBar(ctx, player, vp, s);
        this.drawHearts(ctx, player, vp, s);
        this.drawXpBar(ctx, player, vp, s);
        this.drawLevel(ctx, player, vp, s);
        this.drawComboBanner(ctx, player, vp, s, !!opts.hasBoss);
    }

    getTopHudBottom(vp, s, hasBoss = false) {
        const ki = this.getKiBarLayout(vp, s);
        let bottom = ki.y + ki.h;
        if (hasBoss) {
            const gap = Math.round(5 * s);
            const barH = Math.round(8 * s);
            const nameSize = Math.round(11 * s);
            bottom += gap + barH + nameSize + Math.round(6 * s);
        }
        return bottom;
    }

    drawComboBanner(ctx, player, vp, s, hasBoss = false) {
        const combo = player.comboDisplayPeak;
        if (combo < 2 || player.comboDisplayTimer <= 0) return;

        const fading = player.comboCount < 2;
        const fadeDur = fading
            ? CONFIG.PLAYER.COMBO_END_FADE
            : CONFIG.PLAYER.COMBO_DISPLAY_HOLD;
        const alpha = fading
            ? clamp(player.comboDisplayTimer / fadeDur, 0, 1)
            : 1;

        const tier = combo >= 10 ? 2 : combo >= 5 ? 1 : 0;
        const mainColors = ['#5a5048', '#6a4a38', '#7a3a28'];
        const mainColor = mainColors[tier];
        const bonusColor = '#2a4a78';

        const mainSize = Math.round((26 + Math.min(combo - 2, 16) * 1.4) * s);
        const bonusSize = Math.round(mainSize * 0.7);
        const y = this.getTopHudBottom(vp, s, hasBoss) + Math.round(32 * s);

        const mainLabel = `连击×${combo}`;
        const bonusLabel = `+${player.getComboBonusPercent(combo)}%`;
        const gap = 10 * s;

        ctx.save();
        ctx.globalAlpha = alpha;

        ctx.font = `${mainSize}px ${GAME_FONT}`;
        const mainW = ctx.measureText(mainLabel).width;
        ctx.font = `${bonusSize}px ${GAME_FONT}`;
        const bonusW = ctx.measureText(bonusLabel).width;
        const totalW = mainW + gap + bonusW;

        const mainX = vp.cx - totalW / 2 + mainW / 2;
        const bonusX = vp.cx - totalW / 2 + mainW + gap + bonusW / 2;

        drawGameText(ctx, mainLabel, mainX, y, mainSize, mainColor);
        drawGameText(ctx, bonusLabel, bonusX, y + 1 * s, bonusSize, bonusColor);

        ctx.restore();
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

    _drawKatanaKiBar(ctx, x, y, totalW, h, ratio, s, deepBreath = false) {
        const hiltW = Math.max(Math.round(14 * s), Math.round(totalW * 0.09));
        const tsubaW = Math.max(Math.round(8 * s), Math.round(totalW * 0.045));
        const tipW = Math.max(Math.round(10 * s), Math.round(totalW * 0.05));
        const bladeW = totalW - hiltW - tsubaW - tipW;
        const bladeX = x + hiltW + tsubaW;
        const outline = deepBreath ? '#1a3848' : '#2a2018';
        const hiltFill = deepBreath ? '#3a5868' : '#5a4038';
        const hiltWrap = deepBreath ? '#68a8c0' : '#8a6858';
        const tsubaFill = deepBreath ? '#58a8c8' : '#6a6468';
        const trackFill = deepBreath ? '#2a5060' : '#4a5058';
        const trackDark = deepBreath ? '#1a3844' : '#363c44';
        const kiHi = deepBreath ? '#b8ffff' : '#8ad4f0';
        const kiLo = deepBreath ? '#48d8f8' : '#4a88b0';
        const edgeHi = deepBreath ? '#d8ffff' : '#9a9088';

        if (deepBreath) {
            const pulse = 0.5 + Math.sin(Date.now() * 0.005) * 0.25;
            ctx.save();
            ctx.globalAlpha = pulse;
            ctx.strokeStyle = '#68e8ff';
            ctx.lineWidth = 3;
            ctx.strokeRect(x - 2, y - 3, totalW + 4, h + 6);
            ctx.restore();
        }

        ctx.lineWidth = Math.max(2, Math.round(2 * s));
        ctx.strokeStyle = outline;
        ctx.lineJoin = 'round';

        ctx.fillStyle = hiltFill;
        ctx.fillRect(x + 1, y + 2, hiltW - 2, h - 4);
        ctx.fillStyle = hiltWrap;
        for (let i = 0; i < 3; i++) {
            const dy = y + 3 + i * Math.floor((h - 6) / 3);
            ctx.fillRect(x + 3, dy, hiltW - 6, Math.max(1, Math.floor((h - 6) / 3) - 1));
        }

        const gx = x + hiltW;
        const tsubaH = h + Math.round(6 * s);
        const tsubaY = y - Math.round(3 * s);
        ctx.fillStyle = tsubaFill;
        ctx.beginPath();
        ctx.rect(gx, tsubaY + 1, tsubaW, tsubaH - 2);
        ctx.fill();
        ctx.strokeRect(gx, tsubaY, tsubaW, tsubaH);
        ctx.fillStyle = edgeHi;
        ctx.fillRect(gx + 1, tsubaY + 1, tsubaW - 2, 2);

        ctx.fillStyle = trackDark;
        ctx.fillRect(bladeX, y + 1, bladeW, h - 2);

        const fillW = Math.max(0, Math.floor((bladeW - 2) * ratio));
        if (fillW > 0) {
            ctx.fillStyle = kiLo;
            ctx.fillRect(bladeX + 1, y + 2, fillW, h - 4);
            ctx.fillStyle = kiHi;
            ctx.fillRect(bladeX + 1, y + 2, fillW, Math.max(1, Math.floor((h - 4) * 0.45)));
        }

        const tipX = bladeX + bladeW;
        ctx.fillStyle = trackFill;
        ctx.beginPath();
        ctx.moveTo(tipX, y);
        ctx.lineTo(x + totalW - 1, y + h / 2);
        ctx.lineTo(tipX, y + h);
        ctx.closePath();
        ctx.fill();

        ctx.strokeStyle = outline;
        ctx.beginPath();
        ctx.moveTo(bladeX, y);
        ctx.lineTo(tipX, y);
        ctx.lineTo(x + totalW - 1, y + h / 2);
        ctx.lineTo(tipX, y + h);
        ctx.lineTo(bladeX, y + h);
        ctx.closePath();
        ctx.stroke();

        ctx.strokeStyle = outline;
        ctx.strokeRect(x, y, hiltW, h);
        ctx.strokeRect(bladeX, y, bladeW, h);

        ctx.strokeStyle = edgeHi;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(bladeX + 1, y + 1);
        ctx.lineTo(tipX - 1, y + 1);
        ctx.stroke();

        if (ratio < 0.25) {
            const blink = Math.floor(Date.now() / 280) % 2 === 0;
            if (blink) {
                ctx.fillStyle = '#c45848';
                ctx.fillRect(tipX - 4, y - 2, 3, 2);
            }
        }
    }

    getKiBarLayout(vp, s) {
        const pad = 12 * s;
        const barH = Math.round(10 * s);
        const pauseBtn = this.getPauseButtonRect(vp, s);
        const topGap = Math.round(8 * s);
        const x = Math.floor(vp.x + pad);
        const y = Math.floor(pauseBtn.y + pauseBtn.h + topGap);
        const totalW = vp.w - pad * 2;
        return { x, y, w: totalW, h: barH, pad };
    }

    drawKiBar(ctx, player, vp, s) {
        const { x, y, w, h } = this.getKiBarLayout(vp, s);
        const ratio = clamp(player.ki / player.kiMax, 0, 1);
        this._drawKatanaKiBar(ctx, x, y, w, h, ratio, s, player.bossRewardDeepBreath);
    }

    drawBossBar(ctx, boss, vp, s) {
        if (!boss || (!boss.alive && !boss.dying)) return;

        const ki = this.getKiBarLayout(vp, s);
        const gap = Math.round(5 * s);
        const barH = Math.round(8 * s);
        const x = ki.x;
        const y = ki.y + ki.h + gap;
        const barW = ki.w;
        const ratio = clamp(boss.hp / boss.maxHp, 0, 1);

        ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
        ctx.fillRect(x - 1, y - 1, barW + 2, barH + 2);
        ctx.fillStyle = '#2a1810';
        ctx.fillRect(x, y, barW, barH);
        ctx.fillStyle = ratio > 0.35 ? '#e84818' : '#c02010';
        ctx.fillRect(x, y, barW * ratio, barH);
        ctx.strokeStyle = '#ffaa66';
        ctx.lineWidth = 1;
        ctx.strokeRect(x, y, barW, barH);

        const nameSize = Math.round(11 * s);
        drawGameText(ctx, boss.cfg.name, vp.cx, y - 2 * s, nameSize, '#ffe8c0', 'center', 'bottom');
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

    getPauseButtonRect(vp, s) {
        const size = Math.round(28 * s);
        const x = Math.round(vp.x + vp.w - size - 10 * s);
        const y = Math.round(vp.y + 10 * s);
        return { x, y, w: size, h: size };
    }

    isPauseButtonHit(x, y, vp, s) {
        const r = this.getPauseButtonRect(vp, s);
        return x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h;
    }

    drawPauseButton(ctx, vp, s, active) {
        const r = this.getPauseButtonRect(vp, s);
        ctx.save();
        ctx.globalAlpha = active ? 0.95 : 0.8;
        ctx.fillStyle = 'rgba(28, 24, 20, 0.72)';
        ctx.strokeStyle = 'rgba(210, 190, 160, 0.9)';
        ctx.lineWidth = 2;
        if (typeof ctx.roundRect === 'function') {
            ctx.beginPath();
            ctx.roundRect(r.x, r.y, r.w, r.h, Math.round(6 * s));
            ctx.fill();
            ctx.stroke();
        } else {
            ctx.fillRect(r.x, r.y, r.w, r.h);
            ctx.strokeRect(r.x, r.y, r.w, r.h);
        }
        const barW = Math.max(3, Math.round(4 * s));
        const barH = Math.max(12, Math.round(13 * s));
        const gap = Math.max(4, Math.round(5 * s));
        const cx = r.x + r.w / 2;
        const cy = r.y + r.h / 2;
        ctx.fillStyle = '#f2e7d2';
        ctx.fillRect(Math.round(cx - gap / 2 - barW), Math.round(cy - barH / 2), barW, barH);
        ctx.fillRect(Math.round(cx + gap / 2), Math.round(cy - barH / 2), barW, barH);
        ctx.restore();
    }

    _drawPauseButton(ctx, rect, text, s, color) {
        ctx.fillStyle = color || 'rgba(54, 46, 36, 0.9)';
        ctx.strokeStyle = 'rgba(170, 145, 110, 0.95)';
        ctx.lineWidth = 2;
        if (typeof ctx.roundRect === 'function') {
            ctx.beginPath();
            ctx.roundRect(rect.x, rect.y, rect.w, rect.h, Math.round(8 * s));
            ctx.fill();
            ctx.stroke();
        } else {
            ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
            ctx.strokeRect(rect.x, rect.y, rect.w, rect.h);
        }
        drawGameText(ctx, text, rect.x + rect.w / 2, rect.y + rect.h / 2,
            Math.round(14 * s), '#f2e7d2', 'center', 'middle');
    }

    _layoutDebugControls(px, panelW, rowY, s, withApply) {
        const smallW = Math.round(30 * s);
        const applyW = Math.round(56 * s);
        const btnH = Math.round(30 * s);
        const gap = Math.round(6 * s);
        const right = px + panelW - 16 * s;
        const plus = {
            x: right - smallW,
            y: rowY - btnH / 2,
            w: smallW,
            h: btnH,
        };
        const minus = {
            x: plus.x - gap - smallW,
            y: rowY - btnH / 2,
            w: smallW,
            h: btnH,
        };
        let apply = null;
        if (withApply) {
            apply = {
                x: minus.x - gap - applyW,
                y: rowY - btnH / 2,
                w: applyW,
                h: btnH,
            };
        }
        return { minus, plus, apply, labelX: px + 16 * s };
    }

    _drawAdjustRow(ctx, label, value, labelX, rectMinus, rectPlus, rectApply, rowY, s) {
        drawGameText(ctx, `${label}: ${value}`, labelX, rowY,
            Math.round(13 * s), '#d7c7ae', 'left', 'middle');
        this._drawPauseButton(ctx, rectMinus, '-', s, 'rgba(48, 40, 32, 0.9)');
        this._drawPauseButton(ctx, rectPlus, '+', s, 'rgba(48, 40, 32, 0.9)');
        if (rectApply) {
            this._drawPauseButton(ctx, rectApply, '应用', s, 'rgba(68, 48, 32, 0.95)');
        }
    }

    drawPauseOverlay(ctx, vp, s, data) {
        ctx.fillStyle = 'rgba(0, 0, 0, 0.65)';
        ctx.fillRect(vp.x, vp.y, vp.w, vp.h);
        const panelW = Math.min(vp.w - 26 * s, 330 * s);
        const panelH = Math.min(vp.h - 40 * s, 420 * s);
        const px = vp.x + (vp.w - panelW) / 2;
        const py = vp.y + (vp.h - panelH) / 2;

        ctx.fillStyle = 'rgba(36, 30, 24, 0.96)';
        ctx.strokeStyle = 'rgba(166, 138, 104, 0.95)';
        ctx.lineWidth = 2;
        if (typeof ctx.roundRect === 'function') {
            ctx.beginPath();
            ctx.roundRect(px, py, panelW, panelH, Math.round(10 * s));
            ctx.fill();
            ctx.stroke();
        } else {
            ctx.fillRect(px, py, panelW, panelH);
            ctx.strokeRect(px, py, panelW, panelH);
        }

        drawGameText(ctx, '已暂停', vp.cx, py + 26 * s, Math.round(20 * s), '#f2e7d2');

        const btnW = panelW * 0.72;
        const btnH = 36 * s;
        const btnX = px + (panelW - btnW) / 2;
        const resumeRect = { x: btnX, y: py + 52 * s, w: btnW, h: btnH };
        const passRect = { x: btnX, y: py + 96 * s, w: btnW, h: btnH };
        this.pauseRects.resume = resumeRect;
        this.pauseRects.password = passRect;
        this._drawPauseButton(ctx, resumeRect, '继续', s, 'rgba(56, 74, 52, 0.92)');
        this._drawPauseButton(ctx, passRect, '密码输入', s, 'rgba(76, 56, 38, 0.92)');

        let y = py + 146 * s;
        if (data.passwordMode && !data.debugUnlocked) {
            drawGameText(ctx, `密码: ${data.passwordInput}`, vp.cx, y, Math.round(14 * s), '#e6d8c2');
            y += 10 * s;
            const keyW = Math.round(44 * s);
            const keyH = Math.round(32 * s);
            const keyGap = Math.round(8 * s);
            const startX = vp.cx - (keyW * 3 + keyGap * 2) / 2;
            const rows = [['1', '2', '3'], ['4', 'C', 'OK']];
            this.pauseRects.keys = [];
            for (let r = 0; r < rows.length; r++) {
                for (let c = 0; c < rows[r].length; c++) {
                    const rect = {
                        x: startX + c * (keyW + keyGap),
                        y: y + r * (keyH + keyGap),
                        w: keyW,
                        h: keyH,
                        key: rows[r][c],
                    };
                    this.pauseRects.keys.push(rect);
                    this._drawPauseButton(ctx, rect, rect.key, s, 'rgba(48, 40, 32, 0.92)');
                }
            }
        } else {
            this.pauseRects.keys = [];
        }

        if (data.debugUnlocked) {
            drawGameText(ctx, '调试模式', vp.cx, py + 148 * s, Math.round(16 * s), '#ffd18a');
            const rowY1 = py + 182 * s;
            const rowY2 = py + 228 * s;
            const rowY3 = py + 274 * s;

            const row1 = this._layoutDebugControls(px, panelW, rowY1, s, true);
            this.pauseRects.levelMinus = row1.minus;
            this.pauseRects.levelPlus = row1.plus;
            this.pauseRects.levelApply = row1.apply;
            this._drawAdjustRow(ctx, '主角等级', data.debugLevelInput, row1.labelX,
                row1.minus, row1.plus, row1.apply, rowY1, s);

            const row2 = this._layoutDebugControls(px, panelW, rowY2, s, false);
            this.pauseRects.chapterMinus = row2.minus;
            this.pauseRects.chapterPlus = row2.plus;
            this._drawAdjustRow(ctx, '当前章节', data.debugChapterInput, row2.labelX,
                row2.minus, row2.plus, null, rowY2, s);

            const row3 = this._layoutDebugControls(px, panelW, rowY3, s, true);
            this.pauseRects.stageMinus = row3.minus;
            this.pauseRects.stagePlus = row3.plus;
            this.pauseRects.stageApply = row3.apply;
            this._drawAdjustRow(ctx, '当前关卡', data.debugStageInput, row3.labelX,
                row3.minus, row3.plus, row3.apply, rowY3, s);
        }
    }
}
