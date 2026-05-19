let nextMonsterId = 0;

class MonsterSpawner {
    constructor() {
        this.monsters = [];
        this.spawnQueue = [];
        this.spawnTimer = 0;
        this.spawnInterval = 1.5;
    }

    prepareLevelSpawns(levelIndex, canvasW, canvasH) {
        this.monsters = [];
        this.spawnQueue = [];
        this.spawnTimer = 0;

        const levelConfig = CONFIG.LEVELS[levelIndex];
        if (!levelConfig) return;

        const totalCount = levelConfig.count;
        const waves = levelConfig.waves;
        const perWave = Math.ceil(totalCount / waves);

        for (let w = 0; w < waves; w++) {
            const count = w === waves - 1 ? totalCount - perWave * w : perWave;
            for (let i = 0; i < count; i++) {
                const typeKey = pickRandom(levelConfig.types);
                const config = CONFIG.MONSTERS[typeKey];
                const edge = Math.floor(Math.random() * 4);
                let x, y;
                const margin = 36;
                const inset = 20;

                switch (edge) {
                    case 0:
                        x = randRange(inset, canvasW - inset);
                        y = -margin;
                        break;
                    case 1:
                        x = randRange(inset, canvasW - inset);
                        y = canvasH + margin;
                        break;
                    case 2:
                        x = inset;
                        y = randRange(inset, canvasH - inset);
                        break;
                    case 3:
                        x = canvasW - inset;
                        y = randRange(inset, canvasH - inset);
                        break;
                }

                const spawnGap = totalCount > 40 ? 0.35 : totalCount > 25 ? 0.45 : 0.55;
                const waveGap = totalCount > 40 ? 2.5 : 3.5;
                this.spawnQueue.push({
                    delay: w * waveGap + i * spawnGap,
                    x, y, config, typeKey,
                });
            }
        }

        this.spawnQueue.sort((a, b) => a.delay - b.delay);
    }

    update(dt) {
        this.spawnTimer += dt;

        while (this.spawnQueue.length > 0 && this.spawnQueue[0].delay <= this.spawnTimer) {
            const entry = this.spawnQueue.shift();
            const m = new Monster(entry.x, entry.y, entry.config, nextMonsterId++);
            m.configKey = entry.typeKey;
            this.monsters.push(m);
        }

        this.monsters = this.monsters.filter(m => m.alive);
    }

    allClear() {
        return this.spawnQueue.length === 0 && this.monsters.length === 0;
    }

    getActiveMonsters() {
        return this.monsters.filter(m => m.alive && !m.dying);
    }
}
