class MonsterSpawner {
    constructor(game) {
        this.game = game;
        this.monsters = [];
        this.spawnClusters = [];
    }

    reset() {
        this.monsters = [];
        this.spawnClusters = [];
        this.boss = null;
    }

    _getSpawnBounds(w, playBottom) {
        const edgePad = 26;
        const top = 88;
        const bottom = Math.max(top + 80, playBottom - 26);
        return { edgePad, top, bottom };
    }

    _minDistFromPlayer(safeZone) {
        const pad = CONFIG.SPAWN.MIN_DIST_FROM_PLAYER || 100;
        return (safeZone?.r || 40) + pad;
    }

    _initSpawnClusters(w, h, playBottom, safeZone) {
        this.spawnClusters = [];
        const { edgePad, top, bottom } = this._getSpawnBounds(w, playBottom);
        const minPlayerDist = this._minDistFromPlayer(safeZone);
        const cfg = CONFIG.SPAWN;
        const clusterCount = Math.floor(randRange(cfg.CLUSTER_COUNT_MIN || 5, (cfg.CLUSTER_COUNT_MAX || 9) + 0.999));

        for (let i = 0; i < clusterCount; i++) {
            for (let attempt = 0; attempt < 80; attempt++) {
                const x = randRange(edgePad, w - edgePad);
                const y = randRange(top, bottom);
                if (safeZone && dist(x, y, safeZone.x, safeZone.y) < minPlayerDist) continue;

                let tooClose = false;
                for (const c of this.spawnClusters) {
                    if (dist(x, y, c.x, c.y) < 72) {
                        tooClose = true;
                        break;
                    }
                }
                if (tooClose) continue;

                const density = randRange(0.3, 1);
                this.spawnClusters.push({
                    x,
                    y,
                    radius: lerp(48, 92, density),
                    weight: 0.25 + density * density * 1.4,
                });
                break;
            }
        }

        if (!this.spawnClusters.length) {
            const fallbackX = safeZone
                ? clamp(safeZone.x + minPlayerDist * 1.1, edgePad, w - edgePad)
                : w * 0.72;
            const fallbackY = clamp(safeZone ? safeZone.y : (top + bottom) * 0.5, top, bottom);
            this.spawnClusters.push({ x: fallbackX, y: fallbackY, radius: 80, weight: 1 });
        }
    }

    _pickWeightedCluster() {
        if (!this.spawnClusters.length) return null;
        const total = this.spawnClusters.reduce((sum, c) => sum + c.weight, 0);
        let roll = Math.random() * total;
        for (const c of this.spawnClusters) {
            roll -= c.weight;
            if (roll <= 0) return c;
        }
        return this.spawnClusters[this.spawnClusters.length - 1];
    }

    _tooCloseToExisting(x, y, minDist) {
        for (const m of this.monsters) {
            if (!m.alive) continue;
            if (dist(x, y, m.x, m.y) < minDist) return true;
        }
        return false;
    }

    _pickSpawnPos(w, h, playBottom, safeZone) {
        const { edgePad, top, bottom } = this._getSpawnBounds(w, playBottom);
        const minPlayerDist = this._minDistFromPlayer(safeZone);
        const minSpacing = CONFIG.SPAWN.MIN_MONSTER_SPACING || 20;
        const clusterChance = CONFIG.SPAWN.CLUSTER_PICK_CHANCE || 0.74;

        for (let i = 0; i < 140; i++) {
            let x;
            let y;
            if (Math.random() < clusterChance && this.spawnClusters.length) {
                const cluster = this._pickWeightedCluster();
                const ang = randRange(0, Math.PI * 2);
                const rad = cluster.radius * Math.sqrt(Math.random());
                x = cluster.x + Math.cos(ang) * rad;
                y = cluster.y + Math.sin(ang) * rad;
            } else {
                x = randRange(edgePad, w - edgePad);
                y = randRange(top, bottom);
            }

            x = clamp(x, edgePad, w - edgePad);
            y = clamp(y, top, bottom);
            if (safeZone && dist(x, y, safeZone.x, safeZone.y) < minPlayerDist) continue;
            if (this._tooCloseToExisting(x, y, minSpacing)) continue;
            return { x, y };
        }

        for (let i = 0; i < 80; i++) {
            const x = randRange(edgePad, w - edgePad);
            const y = randRange(top, bottom);
            if (safeZone && dist(x, y, safeZone.x, safeZone.y) < minPlayerDist * 0.85) continue;
            return { x, y };
        }

        return {
            x: clamp((safeZone?.x || w * 0.5) + minPlayerDist, edgePad, w - edgePad),
            y: clamp(safeZone?.y || (top + bottom) * 0.5, top, bottom),
        };
    }

    _spawnBatch(kind, count, w, h, playBottom, safeZone, splitTier = 0, withSpawnAnim = false, stageStatScale = null) {
        for (let i = 0; i < count; i++) {
            const pos = this._pickSpawnPos(w, h, playBottom, safeZone);
            const m = new Monster(pos.x, pos.y, kind, splitTier, stageStatScale);
            m.game = this.game;
            if (withSpawnAnim) m.beginSpawn(CONFIG.MONSTER_SPAWN_ANIM + randRange(0, 0.12));
            this.monsters.push(m);
        }
    }

    _scaledCount(n) {
        const scale = CONFIG.STAGE_MONSTER_SCALE || 1;
        const mul = CONFIG.STAGE_COUNT_MUL ?? 1;
        return Math.max(0, Math.round((n || 0) * scale * mul));
    }

    _scaledShieldCount(n) {
        const mul = CONFIG.SHIELD_COUNT_MUL ?? 1;
        return Math.max(0, Math.round(this._scaledCount(n) * mul));
    }

    spawnStage(stageIndex, w, h, playBottom, safeZone, withSpawnAnim = false) {
        this.monsters = [];
        this.boss = null;
        const cfg = CONFIG.STAGES[clamp(stageIndex, 0, CONFIG.STAGES.length - 1)];
        if (!cfg) return;
        const stageStatScale = getStageStatScale(stageIndex);

        if (cfg.boss === 'centipede') {
            this.boss = new CentipedeBoss(this.game, w, h, playBottom, safeZone, stageStatScale);
            return;
        }

        this._initSpawnClusters(w, h, playBottom, safeZone);
        this._spawnBatch(MonsterKind.NORMAL, this._scaledCount(cfg.normal), w, h, playBottom, safeZone, 0, withSpawnAnim, stageStatScale);
        this._spawnBatch(MonsterKind.ELITE, this._scaledCount(cfg.elite), w, h, playBottom, safeZone, 0, withSpawnAnim, stageStatScale);
        this._spawnBatch(MonsterKind.SHIELD, this._scaledShieldCount(cfg.shield), w, h, playBottom, safeZone, 0, withSpawnAnim, stageStatScale);
        this._spawnBatch(MonsterKind.BERSERKER, this._scaledCount(cfg.berserker), w, h, playBottom, safeZone, 0, withSpawnAnim, stageStatScale);
        this._spawnBatch(MonsterKind.SPLITTER, this._scaledCount(cfg.splitter), w, h, playBottom, safeZone, 0, withSpawnAnim, stageStatScale);
        if (stageIndex >= 1) {
            this._spawnBatch(MonsterKind.ARCHER, this._scaledCount(cfg.archer || 0), w, h, playBottom, safeZone, 0, withSpawnAnim, stageStatScale);
        }
        if (stageIndex >= 2) {
            this._spawnBatch(MonsterKind.FIRE_MAGE, this._scaledCount(cfg.fireMage || 0), w, h, playBottom, safeZone, 0, withSpawnAnim, stageStatScale);
        }
    }

    spawnSplitChildren(parent) {
        if (!parent || !parent.canSplit()) return [];
        const children = [];
        const cnt = parent.base.splitCount || 2;
        for (let i = 0; i < cnt; i++) {
            const a = (i / cnt) * Math.PI * 2 + randRange(-0.25, 0.25);
            const d = randRange(12, 20);
            const child = new Monster(
                parent.x + Math.cos(a) * d,
                parent.y + Math.sin(a) * d,
                MonsterKind.SPLITTER,
                parent.splitTier + 1,
                parent.stageStatScale
            );
            child.game = this.game;
            child.beginSpawn(CONFIG.MONSTER_SPAWN_ANIM * 0.85);
            children.push(child);
        }
        this.monsters.push(...children);
        return children;
    }

    update(dt, w, h, playBottom, playerTarget) {
        if (this.boss) {
            this.boss.update(dt, playerTarget);
            return;
        }
        const resolving = this.game && this.game.combat && this.game.combat.isResolving();
        for (const m of this.monsters) {
            if (resolving && !m.dying) continue;
            m.update(dt, w, h, playBottom, playerTarget);
        }
        this.monsters = this.monsters.filter(m => m.alive);
    }

    getCombatTargetById(id) {
        if (this.boss) {
            const seg = this.boss.segments.find(s => s.id === id && s.alive);
            if (seg && this.boss.phase === 'active') return seg;
        }
        return this.monsters.find(m => m.id === id && m.alive && !m.dying);
    }

    getActiveMonsters() {
        if (this.boss && this.boss.phase === 'active') {
            return this.boss.getActiveSegments();
        }
        return this.monsters.filter(m => m.alive && !m.dying && !m.spawning);
    }

    allClear() {
        if (this.boss) return this.boss.isDefeated();
        return !this.monsters.some(m => m.alive && !m.dying);
    }
}
