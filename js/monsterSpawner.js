class MonsterSpawner {
    constructor(game) {
        this.game = game;
        this.monsters = [];
    }

    reset() {
        this.monsters = [];
    }

    _pickSpawnPos(w, h, playBottom, safeZone) {
        const edgePad = 26;
        const top = 88;
        const bottom = Math.max(top + 80, playBottom - 26);
        for (let i = 0; i < 100; i++) {
            const x = randRange(edgePad, w - edgePad);
            const y = randRange(top, bottom);
            if (!safeZone) return { x, y };
            if (dist(x, y, safeZone.x, safeZone.y) > safeZone.r + 24) return { x, y };
        }
        return { x: w * 0.5, y: (top + bottom) * 0.5 };
    }

    _spawnBatch(kind, count, w, h, playBottom, safeZone, splitTier = 0, withSpawnAnim = false) {
        for (let i = 0; i < count; i++) {
            const pos = this._pickSpawnPos(w, h, playBottom, safeZone);
            const m = new Monster(pos.x, pos.y, kind, splitTier);
            m.game = this.game;
            if (withSpawnAnim) m.beginSpawn(CONFIG.MONSTER_SPAWN_ANIM + randRange(0, 0.12));
            this.monsters.push(m);
        }
    }

    _scaledCount(n) {
        const scale = CONFIG.STAGE_MONSTER_SCALE || 1;
        return Math.max(0, Math.round((n || 0) * scale));
    }

    spawnStage(stageIndex, w, h, playBottom, safeZone, withSpawnAnim = false) {
        this.monsters = [];
        const cfg = CONFIG.STAGES[clamp(stageIndex, 0, CONFIG.STAGES.length - 1)];
        if (!cfg) return;
        this._spawnBatch(MonsterKind.NORMAL, this._scaledCount(cfg.normal), w, h, playBottom, safeZone, 0, withSpawnAnim);
        this._spawnBatch(MonsterKind.ELITE, this._scaledCount(cfg.elite), w, h, playBottom, safeZone, 0, withSpawnAnim);
        this._spawnBatch(MonsterKind.SHIELD, this._scaledCount(cfg.shield), w, h, playBottom, safeZone, 0, withSpawnAnim);
        this._spawnBatch(MonsterKind.BERSERKER, this._scaledCount(cfg.berserker), w, h, playBottom, safeZone, 0, withSpawnAnim);
        this._spawnBatch(MonsterKind.SPLITTER, this._scaledCount(cfg.splitter), w, h, playBottom, safeZone, 0, withSpawnAnim);
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
                parent.splitTier + 1
            );
            child.game = this.game;
            child.beginSpawn(CONFIG.MONSTER_SPAWN_ANIM * 0.85);
            children.push(child);
        }
        this.monsters.push(...children);
        return children;
    }

    update(dt, w, h, playBottom, playerZone) {
        const resolving = this.game && this.game.combat && this.game.combat.isResolving();
        for (const m of this.monsters) {
            if (resolving && !m.dying) continue;
            m.update(dt, w, h, playBottom, playerZone);
        }
        this.monsters = this.monsters.filter(m => m.alive);
    }

    getActiveMonsters() {
        return this.monsters.filter(m => m.alive && !m.dying && !m.spawning);
    }

    allClear() {
        return !this.monsters.some(m => m.alive && !m.dying);
    }
}
