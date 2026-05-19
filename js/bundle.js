/* Ninja Slash bundle - supports file:// */
(function () {
'use strict';

// ---- utils.js ----
function dist(x1, y1, x2, y2) {
    const dx = x2 - x1;
    const dy = y2 - y1;
    return Math.sqrt(dx * dx + dy * dy);
}

function lerp(a, b, t) {
    return a + (b - a) * t;
}

function clamp(v, min, max) {
    return v < min ? min : v > max ? max : v;
}

function randRange(min, max) {
    return min + Math.random() * (max - min);
}

function randInt(min, max) {
    return Math.floor(randRange(min, max + 1));
}

function normalize(x, y) {
    const len = Math.sqrt(x * x + y * y);
    if (len === 0) return { x: 0, y: 0 };
    return { x: x / len, y: y / len };
}

function angle(x1, y1, x2, y2) {
    return Math.atan2(y2 - y1, x2 - x1);
}

function easeOutQuad(t) {
    return t * (2 - t);
}

function easeInOutQuad(t) {
    return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
}

function circlesCollide(x1, y1, r1, x2, y2, r2) {
    const d = dist(x1, y1, x2, y2);
    return d < r1 + r2;
}

function pickRandom(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
}

function shuffleArray(arr) {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
}


// ---- config.js ----
const CONFIG = {
    BULLET_TIME_SCALE: 0.12,
    NORMAL_TIME_SCALE: 1.0,

    DISPLAY: {
        LOGICAL_WIDTH: 390,
        LOGICAL_HEIGHT: 700,
        NINJA_SPRITE_SCALE: 3,
        MONSTER_SPRITE_SCALE: 3,
        MONSTER_SPRITE_SCALE_STRONG: 4,
        GRID_SIZE: 28,
    },

    PLAYER: {
        MAX_HEARTS: 3,
        DAMAGE_PER_HIT: 0.5,
        BASE_ATTACK: 18,
        CRIT_RATE: 0.10,
        CRIT_MULTIPLIER: 1.5,
        KI_MAX: 100,
        KI_DRAIN_RATE: 30,
        KI_REGEN_RATE: 30,
        ATTACK_SPEED: 2400,
        RETURN_SPEED_INSTANT: 200,
        RETURN_SPEED_SLOW: 48,
        HITBOX_RADIUS: 12,
        TRIGGER_RADIUS_RATIO: 0.11,
        MAGNET_RADIUS: 120,
        SIZE_SCALE: 1.0,
        INVINCIBLE_AFTER_HIT: 1.0,
        HIT_FLASH_DURATION: 0.28,
        COMBO_DAMAGE_BONUS: 0.10,
        COMBO_DISPLAY_HOLD: 0.55,
        COMBO_END_FADE: 0.35,
    },

    MONSTERS: {
        NORMAL_MELEE: {
            name: 'Skeleton',
            hp: 30, def: 3, range: 42, size: 11, speed: 22,
            atkSpeed: 1.0, atkDamage: 1, type: 'melee',
            color: '#8b9dc3', xp: 10,
        },
        NORMAL_RANGED: {
            name: 'Dark Mage',
            hp: 20, def: 3, range: 140, size: 11, speed: 17,
            atkSpeed: 1.8, atkDamage: 1, type: 'ranged',
            color: '#9b59b6', xp: 15,
        },
        STRONG_MELEE: {
            name: 'Oni',
            hp: 50, def: 5, range: 48, size: 15, speed: 19,
            atkSpeed: 1.2, atkDamage: 1, type: 'melee',
            color: '#e74c3c', xp: 25,
        },
        STRONG_RANGED: {
            name: 'Warlock',
            hp: 35, def: 3, range: 180, size: 15, speed: 15,
            atkSpeed: 2.0, atkDamage: 1, type: 'ranged',
            color: '#8e44ad', xp: 30,
        },
    },

    PROJECTILE: {
        SPEED: 120,
        RADIUS: 6,
    },

    BOSSES: {
        FIRE_DRAGON: {
            name: '火龙',
            hp: 1400,
            def: 10,
            hitboxRadius: 56,
            spriteScale: 5,
            attackInterval: 2.0,
            introDelay: 1.2,
            xp: 250,
            color: '#f84',
            fireballCount: 18,
            fireballSpeed: 210,
            fireballRadius: 9,
            fireballSpread: 0.55,
        },
    },

    SPAWN_FADE_DURATION: 1.0,

    XP: {
        BASE_REQUIRED: 30,
        SCALE_FACTOR: 1.35,
        ORB_VALUE_SCALE: 0.5,
        ORB_SPEED: 180,
        ORB_RADIUS: 5,
        PICKUP_DELAY: 0.3,
    },

    SHAKE: {
        NORMAL: { magnitude: 3, duration: 0.1 },
        CRIT: { magnitude: 8, duration: 0.22 },
        COMBO_MAG_PER_HIT: 0.1,
        COMBO_MAG_CAP: 1.5,
    },

    LEVELS: [
        {
            types: ['NORMAL_MELEE'],
            count: 56, waves: 3,
        },
        {
            types: ['NORMAL_MELEE'],
            count: 90, waves: 4,
        },
        {
            types: ['NORMAL_MELEE', 'NORMAL_RANGED'],
            count: 120, waves: 4,
        },
        {
            types: ['NORMAL_MELEE', 'NORMAL_RANGED'],
            count: 150, waves: 5,
            boss: 'FIRE_DRAGON',
        },
        {
            types: ['NORMAL_MELEE', 'NORMAL_RANGED', 'STRONG_MELEE'],
            count: 190, waves: 5,
        },
        {
            types: ['NORMAL_MELEE', 'NORMAL_RANGED', 'STRONG_MELEE'],
            count: 230, waves: 6,
        },
        {
            types: ['NORMAL_MELEE', 'NORMAL_RANGED', 'STRONG_MELEE', 'STRONG_RANGED'],
            count: 270, waves: 6,
        },
        {
            types: ['NORMAL_MELEE', 'NORMAL_RANGED', 'STRONG_MELEE', 'STRONG_RANGED'],
            count: 320, waves: 8,
            boss: null,
        },
    ],
};

function isBossLevel(levelIndex) {
    return (levelIndex + 1) % 4 === 0;
}

function getBossKeyForLevel(levelIndex) {
    const cfg = CONFIG.LEVELS[levelIndex];
    if (!cfg || !isBossLevel(levelIndex)) return null;
    if (cfg.boss === null) return null;
    if (cfg.boss) return cfg.boss;
    const chapterBoss = Math.floor(levelIndex / 4);
    if (chapterBoss === 0) return 'FIRE_DRAGON';
    return null;
}


// ---- spriteData.js ----
const _ = null;

const SPRITES = {
    ninja: {
        idle: [
            [
                [_, _, _, '#333', '#333', _, _, '#543', '#ccc'],
                [_, _, '#333', '#222', '#222', '#333', _, '#aaa', '#ddd'],
                [_, _, '#333', '#fff', '#fff', '#333', '#543', '#ccc', '#eee'],
                [_, _, _, '#333', '#333', _, _, '#ccc', '#ddd'],
                [_, _, '#555', '#224', '#224', '#555', _, '#aaa', '#ccc'],
                [_, '#555', '#224', '#224', '#224', '#224', '#555', '#ccc', '#ddd'],
                [_, _, '#224', '#224', '#224', '#224', _, '#eee', _],
                [_, _, '#224', _, _, '#224', _, '#ddd', _],
                [_, _, '#333', _, _, '#333', _, _, _],
                [_, _, '#444', _, _, '#444', _, _, _],
            ],
            [
                [_, _, _, '#333', '#333', _, _, '#543', '#ccc'],
                [_, _, '#333', '#222', '#222', '#333', _, '#ccc', '#eee'],
                [_, _, '#333', '#fff', '#fff', '#333', '#543', '#ddd', '#fff'],
                [_, _, _, '#333', '#333', _, _, '#bbb', '#ddd'],
                [_, _, '#555', '#224', '#224', '#555', _, '#aaa', '#ccc'],
                [_, '#555', '#224', '#224', '#224', '#224', '#555', '#ccc', '#eee'],
                [_, _, '#224', '#224', '#224', '#224', _, _, _],
                [_, _, '#444', _, _, '#444', _, '#ccc', _],
                [_, _, '#333', _, _, '#333', _, _, _],
                [_, _, '#444', _, _, '#333', _, _, _],
            ],
        ],
        attack: [
            [
                [_, _, '#333', '#333', _, _, _, _, '#543', '#aaa'],
                [_, _, '#333', '#222', '#222', '#333', _, '#543', '#ccc'],
                [_, _, '#333', '#fff', '#fff', '#333', '#543', '#ccc', '#eee'],
                [_, _, _, '#333', '#333', _, '#543', '#ddd', '#fff'],
                [_, _, '#224', '#224', '#224', '#224', '#ccc', '#eee', '#fff'],
                [_, _, '#224', '#224', '#224', '#224', '#ddd', '#fff', _],
                [_, _, '#224', '#224', '#224', '#224', _, _, _],
                [_, _, '#224', _, _, '#224', _, _, _],
                [_, _, '#333', _, _, '#333', _, _, _],
            ],
            [
                [_, _, _, '#333', '#333', _, _, _, _, '#543', '#ccc', '#ddd', '#eee'],
                [_, _, '#333', '#222', '#222', '#333', _, _, '#aaa', '#ccc', '#ddd', '#fff'],
                [_, _, '#333', '#fff', '#fff', '#333', _, '#543', '#ccc', '#ddd', '#eee'],
                [_, _, _, '#333', '#333', _, _, '#543', '#ccc', '#ddd', '#fff'],
                [_, _, '#224', '#224', '#224', '#224', '#ccc', '#eee', '#fff', '#fff', _],
                [_, _, '#224', '#224', '#224', '#224', '#ddd', '#fff', '#cef', _],
                [_, _, '#224', '#224', '#224', '#224', _, _, _, _],
                [_, _, '#224', _, _, '#224', _, _, _],
                [_, _, '#444', _, _, '#444', _, _, _],
            ],
            [
                [_, _, _, '#333', '#333', _, _, _, '#eee', '#fff', '#cef', '#adf'],
                [_, _, '#333', '#222', '#222', '#333', _, _, '#ddd', '#fff', '#cef', _],
                [_, _, '#333', '#fff', '#fff', '#333', _, '#543', '#ccc', '#eee', _],
                [_, _, _, '#333', '#333', _, _, '#ccc', '#ddd', '#fff', _],
                [_, _, '#224', '#224', '#224', '#224', '#aaa', '#cef', '#fff', _],
                [_, _, '#224', '#224', '#224', '#224', _, _, _],
                [_, _, '#224', _, _, '#224', _, _, _],
                [_, _, '#333', _, _, '#333', _, _, _],
            ],
        ],
        run: [
            [
                [_, _, _, '#333', '#333', _, _, '#543', '#ccc'],
                [_, _, '#333', '#222', '#222', '#333', _, '#ccc', '#eee'],
                [_, _, '#333', '#fff', '#fff', '#333', '#543', '#ddd', '#fff'],
                [_, _, _, '#333', '#333', _, _, '#bbb', '#ddd'],
                [_, _, '#555', '#224', '#224', '#555', _, '#aaa', '#ccc'],
                [_, '#555', '#224', '#224', '#224', '#224', '#555', '#ccc', '#eee'],
                [_, _, '#224', '#224', _, '#224', '#224', _, _],
                [_, _, '#333', '#224', '#224', '#333', _, _, _],
                [_, _, '#444', _, _, '#444', _, _, _],
            ],
            [
                [_, _, _, '#333', '#333', _, _, '#543', '#ccc'],
                [_, _, '#333', '#222', '#222', '#333', _, '#aaa', '#ddd'],
                [_, _, '#333', '#fff', '#fff', '#333', '#543', '#ccc', '#eee'],
                [_, _, _, '#333', '#333', _, _, '#ccc', '#ddd'],
                [_, _, '#555', '#224', '#224', '#555', _, '#aaa', '#ccc'],
                [_, '#555', '#224', '#224', '#224', '#224', '#555', '#ddd', '#fff'],
                [_, _, '#224', _, '#224', '#224', '#224', _, _],
                [_, _, '#444', _, _, '#444', _, _, _],
                [_, _, '#333', _, _, '#333', _, _, _],
            ],
        ],
    },

    normalMelee: {
        idle: [
            [
                [_, _, '#8b9', '#8b9', '#8b9', '#888', _],
                [_, '#8b9', '#556', '#556', '#556', '#8b9', _],
                [_, '#8b9', '#f44', _, '#f44', '#8b9', _],
                [_, _, '#556', '#556', '#556', '#654', _],
                [_, '#777', '#666', '#666', '#666', '#777', _],
                [_, _, '#666', '#666', '#666', _, _],
                [_, _, '#666', _, '#666', _, _],
                [_, _, '#555', _, '#555', _, _],
            ],
            [
                [_, _, '#8b9', '#8b9', '#8b9', _, _],
                [_, '#8b9', '#556', '#556', '#556', '#8b9', _],
                [_, '#8b9', '#f44', _, '#f44', '#8b9', _],
                [_, _, '#556', '#556', '#556', _, _],
                [_, '#777', '#666', '#666', '#666', '#777', _],
                [_, _, '#666', '#666', '#666', _, _],
                [_, _, '#555', _, '#555', _, _],
                [_, _, '#666', _, '#666', '#888', _],
            ],
        ],
        attack: [
            [
                [_, _, '#8b9', '#8b9', '#8b9', '#aaa', '#ccc'],
                [_, '#8b9', '#556', '#556', '#556', '#8b9', _],
                [_, '#8b9', '#f44', _, '#f44', '#8b9', _],
                [_, _, '#556', '#556', '#556', '#888', _],
                [_, '#777', '#666', '#666', '#666', '#777', _],
                [_, _, '#666', '#666', '#666', _, _],
                [_, _, '#666', _, '#666', _, _],
                [_, _, '#555', _, '#555', _, _],
            ],
        ],
    },

    normalRanged: {
        idle: [
            [
                [_, '#96b', '#96b', '#96b', '#654', _],
                ['#96b', '#537', '#537', '#537', '#96b', _],
                ['#96b', '#f0f', _, '#f0f', '#96b', _],
                [_, '#537', '#537', '#537', _, _],
                [_, '#549', '#549', '#549', '#888', _],
                ['#c8f', '#549', '#549', '#549', '#c8f', _],
                [_, '#549', _, '#549', _, _],
                [_, '#437', _, '#437', _, _],
            ],
            [
                [_, '#96b', '#96b', '#96b', _, _],
                ['#96b', '#537', '#537', '#537', '#96b', _],
                ['#96b', '#f0f', _, '#f0f', '#96b', _],
                [_, '#537', '#537', '#537', _, _],
                [_, '#549', '#549', '#549', _, _],
                ['#c8f', '#549', '#549', '#549', '#c8f', _],
                [_, '#437', _, '#437', _, _],
                [_, '#549', _, '#549', _, _],
            ],
        ],
        attack: [
            [
                [_, '#96b', '#96b', '#96b', '#aaa', '#ccc'],
                ['#96b', '#537', '#537', '#537', '#96b', _],
                ['#96b', '#f0f', _, '#f0f', '#96b', _],
                [_, '#537', '#537', '#537', '#888', _],
                [_, '#549', '#549', '#549', _, _],
                ['#c8f', '#549', '#549', '#549', '#c8f', _],
                [_, '#549', _, '#549', _, _],
                [_, '#437', _, '#437', _, _],
            ],
        ],
    },

    strongMelee: {
        idle: [
            [
                [_, '#a22', '#a22', '#a22', '#a22', '#ccc', _, _],
                ['#a22', '#622', '#622', '#622', '#622', '#a22', _, _],
                ['#a22', '#ff0', _, _, '#ff0', '#a22', _, _],
                [_, '#622', '#622', '#622', '#622', '#888', _, _],
                ['#a33', '#733', '#733', '#733', '#733', '#a33', _, _],
                ['#a33', '#733', '#733', '#733', '#733', '#a33', _, _],
                [_, '#733', '#733', '#733', '#733', _, _, _],
                [_, '#733', _, _, '#733', _, _, _],
                [_, '#622', _, _, '#622', '#888', _, _],
            ],
            [
                [_, '#a22', '#a22', '#a22', '#a22', _, _, _],
                ['#a22', '#622', '#622', '#622', '#622', '#a22', _, _],
                ['#a22', '#ff0', _, _, '#ff0', '#a22', _, _],
                [_, '#622', '#622', '#622', '#622', _, _, _],
                ['#a33', '#733', '#733', '#733', '#733', '#a33', _, _],
                ['#a33', '#733', '#733', '#733', '#733', '#a33', _, _],
                [_, '#733', '#733', '#733', '#733', _, _, _],
                [_, '#622', _, _, '#622', _, _, _],
                [_, '#733', _, _, '#733', _, _, _],
            ],
        ],
        attack: [
            [
                [_, '#a22', '#a22', '#a22', '#a22', '#ccc', '#ddd', _],
                ['#a22', '#622', '#622', '#622', '#622', '#a22', _, _],
                ['#a22', '#ff0', _, _, '#ff0', '#a22', _, _],
                [_, '#622', '#622', '#622', '#622', '#aaa', _, _],
                ['#a33', '#733', '#733', '#733', '#733', '#a33', _, _],
                ['#a33', '#733', '#733', '#733', '#733', '#a33', _, _],
                [_, '#733', '#733', '#733', '#733', _, _, _],
                [_, '#733', _, _, '#733', _, _, _],
                [_, '#622', _, _, '#622', _, _, _],
            ],
        ],
    },

    strongRanged: {
        idle: [
            [
                [_, _, '#82d', '#82d', '#82d', _, _, _],
                [_, '#82d', '#41a', '#41a', '#41a', '#82d', _, _],
                [_, '#82d', '#0ff', _, '#0ff', '#82d', _, _],
                [_, _, '#41a', '#41a', '#41a', _, _, _],
                [_, '#639', '#639', '#639', '#639', '#639', _, _],
                ['#a4f', '#639', '#639', '#639', '#639', '#639', '#a4f', _],
                [_, '#639', '#639', '#639', '#639', '#639', _, _],
                [_, _, '#639', _, '#639', _, _, _],
                [_, _, '#41a', _, '#41a', '#888', _, _],
            ],
            [
                [_, _, '#82d', '#82d', '#82d', _, _, _],
                [_, '#82d', '#41a', '#41a', '#41a', '#82d', _, _],
                [_, '#82d', '#0ff', _, '#0ff', '#82d', _, _],
                [_, _, '#41a', '#41a', '#41a', _, _, _],
                [_, '#639', '#639', '#639', '#639', '#639', _, _],
                ['#a4f', '#639', '#639', '#639', '#639', '#639', '#a4f', _],
                [_, '#639', '#639', '#639', '#639', '#639', _, _],
                [_, _, '#41a', _, '#41a', _, _, _],
                [_, _, '#639', _, '#639', _, _, _],
            ],
        ],
        attack: [
            [
                [_, _, '#82d', '#82d', '#82d', '#aaa', '#ccc', _],
                [_, '#82d', '#41a', '#41a', '#41a', '#82d', _, _],
                [_, '#82d', '#0ff', _, '#0ff', '#82d', _, _],
                [_, _, '#41a', '#41a', '#41a', '#888', _, _],
                [_, '#639', '#639', '#639', '#639', '#639', _, _],
                ['#a4f', '#639', '#639', '#639', '#639', '#639', '#a4f', _],
                [_, '#639', '#639', '#639', '#639', '#639', _, _],
                [_, _, '#639', _, '#639', _, _, _],
                [_, _, '#41a', _, '#41a', _, _, _],
            ],
        ],
    },

    heart: {
        full: [
            [_, '#f22', _, '#f22', _],
            ['#f22', '#f66', '#f22', '#f66', '#f22'],
            ['#f22', '#f44', '#f22', '#f44', '#f22'],
            [_, '#f22', '#f22', '#f22', _],
            [_, _, '#c00', _, _],
        ],
        half: [
            [_, '#f22', _, '#888', _],
            ['#f22', '#f66', '#f22', '#666', '#888'],
            ['#f22', '#f44', '#888', '#555', '#888'],
            [_, '#c00', '#888', '#666', _],
            [_, _, '#888', _, _],
        ],
        empty: [
            [_, '#888', _, '#888', _],
            ['#888', '#666', '#888', '#666', '#888'],
            ['#888', '#555', '#888', '#555', '#888'],
            [_, '#888', '#888', '#888', _],
            [_, _, '#666', _, _],
        ],
    },

    xpOrb: [
        [_, '#2563b8', _],
        ['#1a4080', '#6eb0ff', '#1a4080'],
        [_, '#2563b8', _],
    ],

    bullet: [
        ['#f4f', '#f8f'],
        ['#f8f', '#faf'],
    ],

    fireDragon: {
        idle: [
            [
                [_, _, _, _, _, _, _, _, _, _, '#2a0800', '#2a0800', '#2a0800', '#2a0800', '#2a0800', '#2a0800', _, _, _, _, _, _, _, _, _, _],
                [_, _, _, _, _, _, _, _, _, '#2a0800', '#6a2010', '#8a2810', '#8a2810', '#8a2810', '#8a2810', '#6a2010', '#2a0800', _, _, _, _, _, _, _, _, _],
                [_, _, _, _, _, _, _, _, '#2a0800', '#6a2010', '#c83010', '#e84818', '#ff8830', '#ff8830', '#e84818', '#c83010', '#6a2010', '#2a0800', _, _, _, _, _, _, _, _],
                [_, _, _, _, _, _, _, '#2a0800', '#6a2010', '#c83010', '#e84818', '#ff8830', '#ffaa44', '#ffaa44', '#ff8830', '#e84818', '#c83010', '#6a2010', '#2a0800', _, _, _, _, _, _, _],
                [_, _, _, '#ffe8a8', '#fff0c0', '#ffe8a8', '#c83010', '#6a2010', '#c83010', '#e84818', '#ff8830', '#ffaa44', '#ffcc44', '#ffcc44', '#ffaa44', '#ff8830', '#e84818', '#c83010', '#6a2010', '#c83010', '#ffe8a8', '#fff0c0', '#ffe8a8', _, _, _],
                [_, _, '#ffe8a8', '#fff8d0', '#ffe8a8', '#c83010', '#6a2010', '#8a2810', '#c83010', '#e84818', '#ffaa44', '#ffcc44', '#ffee66', '#ffee66', '#ffcc44', '#ffaa44', '#e84818', '#c83010', '#8a2810', '#6a2010', '#c83010', '#ffe8a8', '#fff8d0', '#ffe8a8', _, _],
                [_, _, '#c83010', '#ffe8a8', '#c83010', '#6a2010', '#8a2810', '#c83010', '#e84818', '#ff8830', '#ffaa44', '#ffee66', '#2a0800', '#2a0800', '#ffee66', '#ffaa44', '#ff8830', '#e84818', '#c83010', '#8a2810', '#6a2010', '#c83010', '#ffe8a8', '#c83010', _, _],
                [_, _, '#6a2010', '#c83010', '#6a2010', '#8a2810', '#c83010', '#e84818', '#ff8830', '#ffaa44', '#ffee66', '#2a0800', '#1a0800', '#1a0800', '#2a0800', '#ffee66', '#ffaa44', '#ff8830', '#e84818', '#c83010', '#8a2810', '#6a2010', '#c83010', '#6a2010', _, _],
                [_, _, '#6a2010', '#c83010', '#6a2010', '#8a2810', '#c83010', '#e84818', '#ff8830', '#ffaa44', '#ffee66', '#2a0800', '#1a0800', '#1a0800', '#2a0800', '#ffee66', '#ffaa44', '#ff8830', '#e84818', '#c83010', '#8a2810', '#6a2010', '#c83010', '#6a2010', _, _],
                [_, _, '#c83010', '#ffe8a8', '#c83010', '#6a2010', '#8a2810', '#c83010', '#e84818', '#ff8830', '#ffaa44', '#ffee66', '#2a0800', '#2a0800', '#ffee66', '#ffaa44', '#ff8830', '#e84818', '#c83010', '#8a2810', '#6a2010', '#c83010', '#ffe8a8', '#c83010', _, _],
                [_, _, '#ffe8a8', '#fff8d0', '#ffe8a8', '#c83010', '#6a2010', '#8a2810', '#c83010', '#e84818', '#ffaa44', '#ffcc44', '#ffee66', '#ffee66', '#ffcc44', '#ffaa44', '#e84818', '#c83010', '#8a2810', '#6a2010', '#c83010', '#ffe8a8', '#fff8d0', '#ffe8a8', _, _],
                [_, _, _, '#ffe8a8', '#fff0c0', '#ffe8a8', '#c83010', '#6a2010', '#c83010', '#e84818', '#ff8830', '#ffaa44', '#ffcc44', '#ffcc44', '#ffaa44', '#ff8830', '#e84818', '#c83010', '#6a2010', '#c83010', '#ffe8a8', '#fff0c0', '#ffe8a8', _, _, _],
                [_, _, _, _, _, _, _, '#2a0800', '#6a2010', '#c83010', '#e84818', '#ff8830', '#ffaa44', '#ffaa44', '#ff8830', '#e84818', '#c83010', '#6a2010', '#2a0800', _, _, _, _, _, _, _],
                [_, _, _, _, _, _, _, _, '#2a0800', '#6a2010', '#c83010', '#e84818', '#ff8830', '#ff8830', '#e84818', '#c83010', '#6a2010', '#2a0800', _, _, _, _, _, _, _, _],
                [_, _, _, _, _, _, _, _, _, '#2a0800', '#6a2010', '#c83010', '#e84818', '#e84818', '#c83010', '#6a2010', '#2a0800', _, _, _, _, _, _, _, _, _],
                [_, _, _, _, _, _, _, _, _, _, '#2a0800', '#6a2010', '#8a2810', '#8a2810', '#6a2010', '#2a0800', _, _, _, _, _, _, _, _, _, _],
                [_, _, _, _, _, _, _, _, _, _, _, '#2a0800', '#6a2010', '#6a2010', '#2a0800', _, _, _, _, _, _, _, _, _, _, _],
            ],
            [
                [_, _, _, _, _, _, _, _, _, _, '#2a0800', '#2a0800', '#2a0800', '#2a0800', '#2a0800', '#2a0800', _, _, _, _, _, _, _, _, _, _],
                [_, _, _, _, _, _, _, _, _, '#2a0800', '#6a2010', '#8a2810', '#8a2810', '#8a2810', '#8a2810', '#6a2010', '#2a0800', _, _, _, _, _, _, _, _, _],
                [_, _, _, _, _, _, _, _, '#2a0800', '#6a2010', '#c83010', '#e84818', '#ff8830', '#ff8830', '#e84818', '#c83010', '#6a2010', '#2a0800', _, _, _, _, _, _, _, _],
                [_, _, _, _, _, _, _, '#2a0800', '#6a2010', '#c83010', '#e84818', '#ff8830', '#ffaa44', '#ffaa44', '#ff8830', '#e84818', '#c83010', '#6a2010', '#2a0800', _, _, _, _, _, _, _],
                [_, _, _, '#ffe8a8', '#fff0c0', '#ffe8a8', '#c83010', '#6a2010', '#c83010', '#e84818', '#ff8830', '#ffaa44', '#ffcc44', '#ffcc44', '#ffaa44', '#ff8830', '#e84818', '#c83010', '#6a2010', '#c83010', '#ffe8a8', '#fff0c0', '#ffe8a8', _, _, _],
                [_, _, '#ffe8a8', '#fff8d0', '#ffe8a8', '#c83010', '#6a2010', '#8a2810', '#c83010', '#e84818', '#ffaa44', '#ffcc44', '#ffee66', '#ffee66', '#ffcc44', '#ffaa44', '#e84818', '#c83010', '#8a2810', '#6a2010', '#c83010', '#ffe8a8', '#fff8d0', '#ffe8a8', _, _],
                [_, _, '#c83010', '#ffe8a8', '#c83010', '#6a2010', '#8a2810', '#c83010', '#e84818', '#ff8830', '#ffaa44', '#ffee66', '#2a0800', '#2a0800', '#ffee66', '#ffaa44', '#ff8830', '#e84818', '#c83010', '#8a2810', '#6a2010', '#c83010', '#ffe8a8', '#c83010', _, _],
                [_, _, '#6a2010', '#c83010', '#6a2010', '#8a2810', '#c83010', '#e84818', '#ff8830', '#ffaa44', '#ffee66', '#2a0800', '#1a0800', '#1a0800', '#2a0800', '#ffee66', '#ffaa44', '#ff8830', '#e84818', '#c83010', '#8a2810', '#6a2010', '#c83010', '#6a2010', _, _],
                [_, _, '#6a2010', '#c83010', '#6a2010', '#8a2810', '#c83010', '#e84818', '#ff8830', '#ffaa44', '#ffee66', '#2a0800', '#1a0800', '#1a0800', '#2a0800', '#ffee66', '#ffaa44', '#ff8830', '#e84818', '#c83010', '#8a2810', '#6a2010', '#c83010', '#6a2010', _, _],
                [_, _, '#c83010', '#ffe8a8', '#c83010', '#6a2010', '#8a2810', '#c83010', '#e84818', '#ff8830', '#ffaa44', '#ffee66', '#2a0800', '#2a0800', '#ffee66', '#ffaa44', '#ff8830', '#e84818', '#c83010', '#8a2810', '#6a2010', '#c83010', '#ffe8a8', '#c83010', _, _],
                [_, _, '#ffe8a8', '#fff8d0', '#ffe8a8', '#c83010', '#6a2010', '#8a2810', '#c83010', '#e84818', '#ffaa44', '#ffcc44', '#ffee66', '#ffee66', '#ffcc44', '#ffaa44', '#e84818', '#c83010', '#8a2810', '#6a2010', '#c83010', '#ffe8a8', '#fff8d0', '#ffe8a8', _, _],
                [_, _, _, '#ffe8a8', '#fff0c0', '#ffe8a8', '#c83010', '#6a2010', '#c83010', '#e84818', '#ff8830', '#ffaa44', '#ffcc44', '#ffcc44', '#ffaa44', '#ff8830', '#e84818', '#c83010', '#6a2010', '#c83010', '#ffe8a8', '#fff0c0', '#ffe8a8', _, _, _],
                [_, _, _, _, _, _, _, '#2a0800', '#6a2010', '#c83010', '#e84818', '#ff8830', '#ffaa44', '#ffaa44', '#ff8830', '#e84818', '#c83010', '#6a2010', '#2a0800', _, _, _, _, _, _, _],
                [_, _, _, _, _, _, _, _, '#2a0800', '#6a2010', '#c83010', '#e84818', '#ff8830', '#ff8830', '#e84818', '#c83010', '#6a2010', '#2a0800', _, _, _, _, _, _, _, _],
                [_, _, _, _, _, _, _, _, _, '#2a0800', '#6a2010', '#c83010', '#ff6620', '#ff4400', '#c83010', '#6a2010', '#2a0800', _, _, _, _, _, _, _, _, _],
                [_, _, _, _, _, _, _, _, _, _, '#2a0800', '#6a2010', '#8a2810', '#8a2810', '#6a2010', '#2a0800', _, _, _, _, _, _, _, _, _, _],
                [_, _, _, _, _, _, _, _, _, _, _, '#2a0800', '#6a2010', '#6a2010', '#2a0800', _, _, _, _, _, _, _, _, _, _, _],
            ],
        ],
    },
};

function parseHexColor(hex) {
    if (!hex || hex[0] !== '#') return null;
    const h = hex.slice(1);
    if (h.length === 3) {
        return {
            r: parseInt(h[0] + h[0], 16),
            g: parseInt(h[1] + h[1], 16),
            b: parseInt(h[2] + h[2], 16),
        };
    }
    return {
        r: parseInt(h.slice(0, 2), 16),
        g: parseInt(h.slice(2, 4), 16),
        b: parseInt(h.slice(4, 6), 16),
    };
}

function tintHexColor(hex, tintR, tintG, tintB, amount) {
    const c = parseHexColor(hex);
    if (!c) return hex;
    const t = clamp(amount, 0, 1);
    const r = Math.round(lerp(c.r, tintR, t));
    const g = Math.round(lerp(c.g, tintG, t));
    const b = Math.round(lerp(c.b, tintB, t));
    const toHex = (v) => v.toString(16).padStart(2, '0');
    return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

function drawSprite(ctx, sprite, x, y, scale = 3, alpha = 1, flipX = false, tintAmount = 0) {
    if (!sprite || sprite.length === 0) return;
    const rows = sprite.length;
    const cols = sprite[0].length;
    const w = cols * scale;
    const h = rows * scale;
    const startX = x - w / 2;
    const startY = y - h / 2;

    ctx.globalAlpha = alpha;
    for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
            const color = sprite[r][flipX ? cols - 1 - c : c];
            if (color) {
                ctx.fillStyle = tintAmount > 0
                    ? tintHexColor(color, 255, 72, 72, tintAmount)
                    : color;
                ctx.fillRect(
                    Math.floor(startX + c * scale),
                    Math.floor(startY + r * scale),
                    scale, scale
                );
            }
        }
    }
    ctx.globalAlpha = 1;
}

function getSpriteSize(sprite, scale = 3) {
    if (!sprite || sprite.length === 0) return { w: 0, h: 0 };
    return {
        w: sprite[0].length * scale,
        h: sprite.length * scale,
    };
}

function drawSlashArc(ctx, x, y, facingRight, frame, scale) {
    const dir = facingRight ? 1 : -1;
    const len = 24 + frame * 10;
    const angles = [-0.55, -0.1, 0.25];
    const colors = ['rgba(255,255,255,0.95)', 'rgba(220,228,238,0.85)', 'rgba(170,180,195,0.5)'];

    ctx.save();
    ctx.translate(x, y);
    if (!facingRight) ctx.scale(-1, 1);

    for (let i = 0; i < angles.length; i++) {
        const a = angles[i] + frame * 0.15;
        const ex = Math.cos(a) * len * dir;
        const ey = Math.sin(a) * len * 0.6;
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(ex, ey);
        ctx.strokeStyle = colors[i];
        ctx.lineWidth = (4 - i) * scale * 0.35;
        ctx.lineCap = 'round';
        ctx.shadowColor = 'rgba(200, 210, 225, 0.8)';
        ctx.shadowBlur = 5;
        ctx.stroke();
    }
    ctx.shadowBlur = 0;
    ctx.restore();
}


// ---- audio.js ----
class AudioHooks {
    constructor() {
        this.enabled = false;
        this.volume = 0.7;
    }

    setEnabled(enabled) {
        this.enabled = Boolean(enabled);
    }

    setVolume(volume) {
        this.volume = Math.max(0, Math.min(1, volume));
    }

    playSlash() {
        if (!this.enabled) return;
    }

    playHit(isCrit = false) {
        if (!this.enabled) return;
        void isCrit;
    }

    playMonsterDeath() {
        if (!this.enabled) return;
    }

    playLevelUp() {
        if (!this.enabled) return;
    }

    playPlayerHurt() {
        if (!this.enabled) return;
    }
}


// ---- particles.js ----
class Particle {
    constructor() { this.active = false; }

    init(x, y, vx, vy, life, size, color, gravity = 0, shrink = true, glow = false) {
        this.x = x; this.y = y;
        this.vx = vx; this.vy = vy;
        this.life = life; this.maxLife = life;
        this.size = size; this.color = color;
        this.gravity = gravity;
        this.shrink = shrink;
        this.glow = glow;
        this.active = true;
    }

    update(dt) {
        if (!this.active) return;
        this.x += this.vx * dt;
        this.y += this.vy * dt;
        this.vy += this.gravity * dt;
        this.life -= dt;
        if (this.life <= 0) this.active = false;
    }

    draw(ctx) {
        if (!this.active) return;
        const t = this.life / this.maxLife;
        const s = this.shrink ? this.size * t : this.size;
        ctx.globalAlpha = t;
        if (this.glow) {
            ctx.shadowColor = this.color;
            ctx.shadowBlur = 8;
        }
        ctx.fillStyle = this.color;
        ctx.fillRect(Math.floor(this.x - s / 2), Math.floor(this.y - s / 2),
            Math.ceil(s), Math.ceil(s));
        ctx.shadowBlur = 0;
        ctx.globalAlpha = 1;
    }
}

class ParticleSystem {
    constructor(poolSize = 500) {
        this.pool = [];
        this.lightningBolts = [];
        for (let i = 0; i < poolSize; i++) {
            this.pool.push(new Particle());
        }
    }

    emit(x, y, vx, vy, life, size, color, gravity = 0, shrink = true, glow = false) {
        for (const p of this.pool) {
            if (!p.active) {
                p.init(x, y, vx, vy, life, size, color, gravity, shrink, glow);
                return p;
            }
        }
        return null;
    }

    slashTrail(x, y, angle) {
        const count = 6;
        for (let i = 0; i < count; i++) {
            const along = randRange(-12, 18);
            const perpAngle = angle + Math.PI / 2;
            const spread = randRange(-14, 14);
            const px = x + Math.cos(angle) * along + Math.cos(perpAngle) * spread;
            const py = y + Math.sin(angle) * along + Math.sin(perpAngle) * spread;
            const speed = randRange(80, 200);
            this.emit(px, py,
                Math.cos(angle + randRange(-0.4, 0.4)) * speed,
                Math.sin(angle + randRange(-0.4, 0.4)) * speed,
                randRange(0.12, 0.28), randRange(3, 7),
                ['#fff', '#f8faff', '#e8ecf2', '#d0d8e4', '#b8c4d0'][Math.floor(Math.random() * 5)],
                0, true, true);
        }
        for (let i = 0; i < 2; i++) {
            const len = randRange(16, 28);
            const ex = x + Math.cos(angle) * len;
            const ey = y + Math.sin(angle) * len;
            this.emit(ex, ey,
                Math.cos(angle) * randRange(40, 80),
                Math.sin(angle) * randRange(40, 80),
                randRange(0.08, 0.18), randRange(4, 8),
                '#fff', 0, true, true);
        }
    }

    hitSpark(x, y, isCrit) {
        const count = isCrit ? 20 : 10;
        const colors = isCrit
            ? ['#ff0', '#f80', '#f44', '#fff']
            : ['#fff', '#ff0', '#adf'];
        for (let i = 0; i < count; i++) {
            const a = randRange(0, Math.PI * 2);
            const speed = randRange(60, isCrit ? 250 : 150);
            this.emit(x, y,
                Math.cos(a) * speed, Math.sin(a) * speed,
                randRange(0.2, 0.5), randRange(2, isCrit ? 6 : 4),
                colors[Math.floor(Math.random() * colors.length)],
                100, true, true);
        }
    }

    deathEffect(x, y, color) {
        for (let i = 0; i < 16; i++) {
            const a = randRange(0, Math.PI * 2);
            const speed = randRange(30, 100);
            this.emit(x, y,
                Math.cos(a) * speed, Math.sin(a) * speed,
                randRange(0.3, 0.7), randRange(3, 6),
                color, 60, true, false);
        }
    }

    spawnEffect(x, y, color) {
        for (let i = 0; i < 12; i++) {
            const a = randRange(0, Math.PI * 2);
            const r = randRange(10, 30);
            this.emit(x + Math.cos(a) * r, y + Math.sin(a) * r,
                Math.cos(a) * -20, Math.sin(a) * -20,
                randRange(0.5, 1.0), randRange(2, 4),
                color, 0, true, true);
        }
    }

    bulletShatter(x, y) {
        for (let i = 0; i < 8; i++) {
            const a = randRange(0, Math.PI * 2);
            const speed = randRange(40, 100);
            this.emit(x, y,
                Math.cos(a) * speed, Math.sin(a) * speed,
                randRange(0.15, 0.35), randRange(2, 4),
                ['#f4f', '#f8f', '#faf'][Math.floor(Math.random() * 3)],
                80, true, false);
        }
    }

    xpPickup(x, y) {
        for (let i = 0; i < 5; i++) {
            this.emit(x, y,
                randRange(-30, 30), randRange(-60, -20),
                randRange(0.2, 0.4), randRange(2, 3),
                '#4a90e8', 0, true, true);
        }
    }

    freezeEffect(x, y) {
        for (let i = 0; i < 8; i++) {
            const a = randRange(0, Math.PI * 2);
            const speed = randRange(20, 60);
            this.emit(x, y,
                Math.cos(a) * speed, Math.sin(a) * speed,
                randRange(0.3, 0.6), randRange(2, 5),
                ['#0ff', '#8ff', '#aef'][Math.floor(Math.random() * 3)],
                0, true, true);
        }
    }

    iaiCritEffect(x, y) {
        for (let ring = 0; ring < 3; ring++) {
            const count = 10 + ring * 4;
            for (let i = 0; i < count; i++) {
                const a = (i / count) * Math.PI * 2 + ring * 0.4;
                const spd = randRange(100, 220) * (1 - ring * 0.15);
                this.emit(x, y, Math.cos(a) * spd, Math.sin(a) * spd,
                    randRange(0.35, 0.65), randRange(5, 11),
                    ['#fff', '#cef', '#8ef', '#48f'][Math.floor(Math.random() * 4)],
                    0, true, true);
            }
        }
        for (let i = 0; i < 8; i++) {
            const a = randRange(0, Math.PI * 2);
            const len = randRange(30, 70);
            const ex = x + Math.cos(a) * len;
            const ey = y + Math.sin(a) * len;
            this.lightningBolts.push({
                points: [{ x, y }, { x: ex, y: ey }],
                life: 0.35,
                maxLife: 0.35,
            });
        }
    }

    lightningEffect(x1, y1, x2, y2) {
        const segments = 12;
        const jitter = 16;
        const points = [{ x: x1, y: y1 }];
        for (let i = 1; i < segments; i++) {
            const t = i / segments;
            points.push({
                x: x1 + (x2 - x1) * t + randRange(-jitter, jitter),
                y: y1 + (y2 - y1) * t + randRange(-jitter, jitter),
            });
        }
        points.push({ x: x2, y: y2 });
        this.lightningBolts.push({ points, life: 0.5, maxLife: 0.5 });

        for (let i = 0; i <= 24; i++) {
            const t = i / 24;
            const px = x1 + (x2 - x1) * t + randRange(-10, 10);
            const py = y1 + (y2 - y1) * t + randRange(-10, 10);
            this.emit(px, py, randRange(-30, 30), randRange(-30, 30),
                randRange(0.28, 0.5), randRange(4, 9),
                ['#ff0', '#fff', '#8ef', '#cef'][Math.floor(Math.random() * 4)],
                0, true, true);
        }

        for (let i = 0; i < 10; i++) {
            const a = (i / 10) * Math.PI * 2;
            const spd = randRange(60, 140);
            this.emit(x1, y1, Math.cos(a) * spd, Math.sin(a) * spd,
                randRange(0.2, 0.4), randRange(5, 10), '#fff', 0, true, true);
            this.emit(x2, y2, Math.cos(a) * spd, Math.sin(a) * spd,
                randRange(0.2, 0.4), randRange(5, 10), '#ff0', 0, true, true);
        }
    }

    update(dt) {
        for (const p of this.pool) {
            if (p.active) p.update(dt);
        }
        for (const bolt of this.lightningBolts) {
            bolt.life -= dt;
        }
        this.lightningBolts = this.lightningBolts.filter(b => b.life > 0);
    }

    draw(ctx) {
        for (const bolt of this.lightningBolts) {
            const t = bolt.life / bolt.maxLife;
            const pts = bolt.points;
            if (pts.length < 2) continue;

            ctx.save();
            ctx.globalAlpha = t;
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';

            ctx.strokeStyle = 'rgba(140, 220, 255, 0.55)';
            ctx.lineWidth = 10;
            ctx.shadowColor = '#8cf';
            ctx.shadowBlur = 18;
            ctx.beginPath();
            ctx.moveTo(pts[0].x, pts[0].y);
            for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y);
            ctx.stroke();

            ctx.strokeStyle = '#fff';
            ctx.lineWidth = 4;
            ctx.shadowBlur = 10;
            ctx.beginPath();
            ctx.moveTo(pts[0].x, pts[0].y);
            for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y);
            ctx.stroke();

            ctx.strokeStyle = '#ff0';
            ctx.lineWidth = 2;
            ctx.shadowBlur = 0;
            ctx.beginPath();
            ctx.moveTo(pts[0].x, pts[0].y);
            for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y);
            ctx.stroke();

            ctx.restore();
        }

        for (const p of this.pool) {
            if (p.active) p.draw(ctx);
        }
    }
}


// ---- renderer.js ----
class Renderer {
    constructor(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.shakeX = 0;
        this.shakeY = 0;
        this.shakeMag = 0;
        this.shakeDur = 0;
        this.shakeTimer = 0;
        this.resize();
    }

    resize() {
        const logicalW = CONFIG.DISPLAY.LOGICAL_WIDTH;
        const logicalH = CONFIG.DISPLAY.LOGICAL_HEIGHT;
        const vv = window.visualViewport;

        this.canvas.style.width = '100%';
        this.canvas.style.height = '100%';

        const layoutW = vv ? vv.width : (window.innerWidth || document.documentElement.clientWidth || logicalW);
        const layoutH = vv ? vv.height : (window.innerHeight || document.documentElement.clientHeight || logicalH);
        const rect = this.canvas.getBoundingClientRect();
        const screenW = Math.max(rect.width || layoutW, logicalW);
        const screenH = Math.max(rect.height || layoutH, logicalH);
        this.dpr = Math.min(window.devicePixelRatio || 1, 2.5);

        this.canvas.width = Math.round(screenW * this.dpr);
        this.canvas.height = Math.round(screenH * this.dpr);

        this.screenW = screenW;
        this.screenH = screenH;
        this.logicalW = logicalW;
        this.logicalH = logicalH;
        this.w = logicalW;
        this.h = logicalH;

        this.scale = Math.min(screenW / logicalW, screenH / logicalH);
        this.offsetX = (screenW - logicalW * this.scale) / 2;
        this.offsetY = (screenH - logicalH * this.scale) / 2;
        this.uiScale = Math.max(1, this.scale * 0.92);
        this.viewportW = logicalW * this.scale;
        this.viewportH = logicalH * this.scale;

        this.ctx.imageSmoothingEnabled = true;
    }

    /** Map pointer (client) coords to canvas layout space (matches viewport / upgrade UI). */
    screenToCanvas(clientX, clientY) {
        const rect = this.canvas.getBoundingClientRect();
        const scaleX = rect.width > 0 ? this.screenW / rect.width : 1;
        const scaleY = rect.height > 0 ? this.screenH / rect.height : 1;
        return {
            x: (clientX - rect.left) * scaleX,
            y: (clientY - rect.top) * scaleY,
        };
    }

    getViewport() {
        return {
            x: this.offsetX,
            y: this.offsetY,
            w: this.viewportW,
            h: this.viewportH,
            cx: this.offsetX + this.viewportW / 2,
            cy: this.offsetY + this.viewportH / 2,
        };
    }

    isScreenInViewport(sx, sy) {
        const vp = this.getViewport();
        return sx >= vp.x && sx <= vp.x + vp.w &&
            sy >= vp.y && sy <= vp.y + vp.h;
    }

    clipViewport(ctx) {
        const vp = this.getViewport();
        ctx.beginPath();
        ctx.rect(vp.x, vp.y, vp.w, vp.h);
        ctx.clip();
        return vp;
    }

    screenToGame(clientX, clientY) {
        const { x: sx, y: sy } = this.screenToCanvas(clientX, clientY);
        return {
            x: (sx - this.offsetX) / this.scale,
            y: (sy - this.offsetY) / this.scale,
        };
    }

    isGameInBounds(gx, gy) {
        return gx >= 0 && gx <= this.w && gy >= 0 && gy <= this.h;
    }

    /** Layout-space transform: CSS pixels → backing store (call before clip/UI). */
    applyLayoutTransform() {
        this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    }

    beginGameDraw() {
        const d = this.dpr;
        this.ctx.setTransform(
            this.scale * d, 0, 0, this.scale * d,
            (this.offsetX + this.shakeX) * d,
            (this.offsetY + this.shakeY) * d
        );
    }

    resetScreenDraw() {
        this.applyLayoutTransform();
    }

    shake(magnitude, duration) {
        if (magnitude > this.shakeMag) {
            this.shakeMag = magnitude;
            this.shakeDur = duration;
            this.shakeTimer = duration;
        }
    }

    shakeAttackHit(isCrit, combo = 1) {
        const base = isCrit ? CONFIG.SHAKE.CRIT : CONFIG.SHAKE.NORMAL;
        const bonus = Math.min(
            CONFIG.SHAKE.COMBO_MAG_CAP,
            Math.max(0, combo - 1) * CONFIG.SHAKE.COMBO_MAG_PER_HIT
        );
        this.shake(base.magnitude + bonus, base.duration);
    }

    updateShake(dt) {
        if (this.shakeTimer > 0) {
            this.shakeTimer -= dt;
            const intensity = this.shakeTimer / this.shakeDur;
            this.shakeX = (Math.random() - 0.5) * 2 * this.shakeMag * intensity;
            this.shakeY = (Math.random() - 0.5) * 2 * this.shakeMag * intensity;
            if (this.shakeTimer <= 0) {
                this.shakeX = 0;
                this.shakeY = 0;
                this.shakeMag = 0;
            }
        }
    }

    clear() {
        const ctx = this.ctx;
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.fillStyle = '#9a8b78';
        ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    }

    beginClippedGameDraw() {
        this.ctx.save();
        this.applyLayoutTransform();
        this.clipViewport(this.ctx);
        this.beginGameDraw();
        this.drawBackground();
    }

    endClippedGameDraw() {
        this.ctx.restore();
    }

    drawBackground() {
        const ctx = this.ctx;
        const base = '#ebe3d3';
        ctx.fillStyle = base;
        ctx.fillRect(0, 0, this.w, this.h);

        const grad = ctx.createRadialGradient(
            this.w * 0.5, this.h * 0.45, this.w * 0.1,
            this.w * 0.5, this.h * 0.5, this.w * 0.85
        );
        grad.addColorStop(0, 'rgba(255, 252, 245, 0.35)');
        grad.addColorStop(1, 'rgba(180, 165, 140, 0.08)');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, this.w, this.h);
    }

    applyBulletTimeEffect(active) {
        if (!active) return;
        this.ctx.fillStyle = 'rgba(38, 30, 24, 0.48)';
        this.ctx.fillRect(-10, -10, this.w + 20, this.h + 20);
        this.ctx.fillStyle = 'rgba(18, 12, 8, 0.15)';
        this.ctx.fillRect(-10, -10, this.w + 20, this.h + 20);
    }
}


// ---- player.js ----
const PlayerState = {
    IDLE: 'idle',
    BULLET_TIME: 'bulletTime',
    ATTACKING: 'attacking',
    RETURNING: 'returning',
};

class Player {
    constructor(x, y) {
        this.homeX = x;
        this.homeY = y;
        this.x = x;
        this.y = y;
        this.state = PlayerState.IDLE;

        this.maxHearts = CONFIG.PLAYER.MAX_HEARTS;
        this.hearts = this.maxHearts;
        this.ki = CONFIG.PLAYER.KI_MAX;
        this.kiMax = CONFIG.PLAYER.KI_MAX;
        this.baseDamage = CONFIG.PLAYER.BASE_ATTACK;
        this.critRate = CONFIG.PLAYER.CRIT_RATE;
        this.critMultiplier = CONFIG.PLAYER.CRIT_MULTIPLIER;
        this.sizeScale = CONFIG.PLAYER.SIZE_SCALE;
        this.damageBonus = 0;
        this.comboDamageBonus = CONFIG.PLAYER.COMBO_DAMAGE_BONUS;
        this.comboCount = 0;
        this.comboDisplayPeak = 0;
        this.comboDisplayTimer = 0;
        this.hitboxRadius = CONFIG.PLAYER.HITBOX_RADIUS;

        this.freezeChance = 0;
        this.freezeDuration = 2.0;
        this.lightningChains = 0;

        this.shurikenCount = 0;
        this.shurikenLevel = 0;
        this.crescentLevel = 0;
        this.crescentWaves = 0;
        this.crescentCharge = 0;
        this.blackHoleLevel = 0;
        this.bladeWhirlLevel = 0;
        this.fireballLevel = 0;
        this.fireballCount = 0;

        this.shadowCloneLevel = 0;
        this.shadowCloneCount = 0;
        this.shadowCloneDamageRatio = 0.30;
        this.shadowClonesPending = 0;
        this.shadowClonesActive = false;
        this.shadowCloneSlots = [];

        this.invincibleTimer = 0;
        this.flashTimer = 0;
        this.hitFlashTimer = 0;

        this.attackPath = [];
        this.pathIndex = 0;
        this.pathProgress = 0;
        this.hitMonstersInSegment = new Set();

        this.animFrame = 0;
        this.animTimer = 0;
        this.facingRight = true;
        this.lastX = x;
        this.lastY = y;

        this.level = 1;
        this.xp = 0;
        this.xpToNext = CONFIG.XP.BASE_REQUIRED;

        this.bossRewardDualWield = false;
        this.bossRewardIai = false;
        this.bossRewardDeepBreath = false;
        this.attackFirstCritUsed = false;
    }

    get effectiveRadius() {
        return this.hitboxRadius * this.sizeScale;
    }

    get spriteScale() {
        return CONFIG.DISPLAY.NINJA_SPRITE_SCALE * this.sizeScale;
    }

    get triggerRadius() {
        const refW = (typeof CONFIG !== 'undefined' && CONFIG.DISPLAY)
            ? CONFIG.DISPLAY.LOGICAL_WIDTH
            : 390;
        return Math.max(48, CONFIG.PLAYER.TRIGGER_RADIUS_RATIO * refW);
    }

    isInAttackMode() {
        return this.state === PlayerState.ATTACKING ||
            this.state === PlayerState.RETURNING;
    }

    isVulnerable() {
        if (this.isInAttackMode() || this.state === PlayerState.BULLET_TIME) {
            return false;
        }
        return this.invincibleTimer <= 0;
    }

    getComboDamageMultiplier() {
        if (this.comboCount <= 1) return 1;
        return 1 + this.comboDamageBonus * (this.comboCount - 1);
    }

    registerComboHit() {
        if (this.state !== PlayerState.ATTACKING) return 0;
        const inc = this.bossRewardDualWield ? 2 : 1;
        this.comboCount += inc;
        this.comboDisplayPeak = Math.max(this.comboDisplayPeak, this.comboCount);
        this.comboDisplayTimer = CONFIG.PLAYER.COMBO_DISPLAY_HOLD;
        return this.comboCount;
    }

    resetCombo() {
        if (this.comboDisplayPeak >= 2) {
            this.comboDisplayTimer = CONFIG.PLAYER.COMBO_END_FADE;
        } else {
            this.comboDisplayTimer = 0;
            this.comboDisplayPeak = 0;
        }
        this.comboCount = 0;
    }

    getComboBonusPercent(combo) {
        if (combo <= 1) return 0;
        return Math.round(this.comboDamageBonus * (combo - 1) * 100);
    }

    updateComboDisplay(dt) {
        if (this.comboDisplayTimer > 0) {
            this.comboDisplayTimer -= dt;
            if (this.comboDisplayTimer <= 0) {
                this.comboDisplayPeak = 0;
            }
        }
    }

    getDamage() {
        const isCrit = Math.random() < this.critRate;
        let dmg = this.baseDamage * (1 + this.damageBonus);
        dmg *= this.getComboDamageMultiplier();
        let isIaiCrit = false;
        if (isCrit) {
            if (this.bossRewardIai && !this.attackFirstCritUsed) {
                this.attackFirstCritUsed = true;
                dmg *= 3;
                isIaiCrit = true;
            } else {
                dmg *= this.critMultiplier;
            }
        }
        return { damage: Math.round(dmg), isCrit, isIaiCrit, combo: this.comboCount };
    }

    getCloneDamage() {
        const isCrit = Math.random() < this.critRate;
        let dmg = this.baseDamage * (1 + this.damageBonus) * this.shadowCloneDamageRatio;
        if (isCrit) dmg *= this.critMultiplier;
        return { damage: Math.round(dmg), isCrit };
    }

    _getShadowHomePosition(index, total) {
        const backAng = Math.atan2(this.homeY - this.y, this.homeX - this.x) || Math.PI;
        const perpX = -Math.sin(backAng);
        const perpY = Math.cos(backAng);
        const side = index % 2 === 0 ? -1 : 1;
        const tier = Math.floor(index / 2);
        const lateral = (22 + tier * 16) * side;
        const back = 18 + tier * 6;
        return {
            x: this.homeX - Math.cos(backAng) * back + perpX * lateral,
            y: this.homeY - Math.sin(backAng) * back + perpY * lateral,
        };
    }

    _armShadowClonesForAttack() {
        if (this.shadowClonesPending <= 0) return;
        this.shadowClonesActive = true;
        this.shadowCloneSlots = [];
        const count = this.shadowClonesPending;
        for (let i = 0; i < count; i++) {
            const side = i % 2 === 0 ? -1 : 1;
            const tier = Math.floor(i / 2);
            this.shadowCloneSlots.push({
                side,
                lateralDist: 22 + tier * 16,
                backOffset: 6,
                x: this.x,
                y: this.y,
                hitMonstersInSegment: new Set(),
            });
        }
        this.shadowClonesPending = 0;
    }

    _updateShadowClonePositions() {
        if (!this.shadowClonesActive || !this.shadowCloneSlots.length) return;

        let moveAng = this.facingRight ? 0 : Math.PI;
        if (this.pathIndex < this.attackPath.length - 1) {
            const to = this.attackPath[this.pathIndex + 1];
            moveAng = Math.atan2(to.y - this.y, to.x - this.x);
        }
        const perpX = -Math.sin(moveAng);
        const perpY = Math.cos(moveAng);
        const backX = -Math.cos(moveAng);
        const backY = -Math.sin(moveAng);

        for (const slot of this.shadowCloneSlots) {
            slot.x = this.x + perpX * slot.lateralDist * slot.side + backX * slot.backOffset;
            slot.y = this.y + perpY * slot.lateralDist * slot.side + backY * slot.backOffset;
        }
    }

    _tryLeaveShadowClones() {
        if (this.shadowCloneLevel <= 0 || this.comboCount <= 10) return;
        this.shadowClonesPending = this.shadowCloneCount || 1;
    }

    takeDamage(amount) {
        if (!this.isVulnerable()) return false;
        this.hearts -= amount;
        if (this.hearts < 0) this.hearts = 0;
        this.invincibleTimer = CONFIG.PLAYER.INVINCIBLE_AFTER_HIT;
        this.flashTimer = CONFIG.PLAYER.INVINCIBLE_AFTER_HIT;
        this.hitFlashTimer = CONFIG.PLAYER.HIT_FLASH_DURATION;
        return true;
    }

    isDead() {
        return this.hearts <= 0;
    }

    startBulletTime() {
        this.state = PlayerState.BULLET_TIME;
        this.attackPath = [];
        this.hitMonstersInSegment.clear();
        this.animFrame = 0;
        this.animTimer = 0;
    }

    addPathPoint(x, y) {
        const last = this.attackPath[this.attackPath.length - 1];
        if (!last || dist(last.x, last.y, x, y) > 5) {
            this.attackPath.push({ x, y });
        }
    }

    startAttack() {
        if (this.attackPath.length < 2) {
            this.state = PlayerState.IDLE;
            return;
        }
        this.state = PlayerState.ATTACKING;
        this.attackFirstCritUsed = false;
        this.resetCombo();
        this.crescentCharge = 0;
        this.comboDisplayPeak = 0;
        this.comboDisplayTimer = 0;
        this.pathIndex = 0;
        this.pathProgress = 0;
        this.hitMonstersInSegment.clear();
        this._armShadowClonesForAttack();
        this.animFrame = 0;
        this.animTimer = 0;
    }

    updateAnimation(realDt) {
        let interval = 0.35;
        let frameCount = SPRITES.ninja.idle.length;

        if (this.state === PlayerState.ATTACKING) {
            interval = 0.055;
            frameCount = SPRITES.ninja.attack.length;
        } else if (this.state === PlayerState.RETURNING) {
            interval = 0.1;
            frameCount = SPRITES.ninja.run.length;
        }

        this.animTimer += realDt;
        if (this.animTimer >= interval) {
            this.animTimer = 0;
            this.animFrame = (this.animFrame + 1) % frameCount;
        }

    }

    update(dt, realDt) {
        this.lastX = this.x;
        this.lastY = this.y;
        this.updateAnimation(realDt);

        if (this.invincibleTimer > 0) {
            this.invincibleTimer -= realDt;
            this.flashTimer -= realDt;
        }
        if (this.hitFlashTimer > 0) {
            this.hitFlashTimer -= realDt;
        }

        this.updateComboDisplay(realDt);

        if (this.state === PlayerState.BULLET_TIME) {
            this.ki -= CONFIG.PLAYER.KI_DRAIN_RATE * realDt;
            if (this.ki < 0) this.ki = 0;
        } else {
            this.ki += CONFIG.PLAYER.KI_REGEN_RATE * realDt;
            if (this.ki > this.kiMax) this.ki = this.kiMax;
        }

        if (this.state === PlayerState.ATTACKING) {
            this.updateAttack(dt);
        } else if (this.state === PlayerState.RETURNING) {
            this.updateReturn(dt);
        }
    }

    beginReturnHome() {
        this._tryLeaveShadowClones();
        this.resetCombo();
        this.crescentCharge = 0;
        this.state = PlayerState.RETURNING;
        this.animFrame = 0;
        this.animTimer = 0;
    }

    updateAttack(dt) {
        if (this.pathIndex >= this.attackPath.length - 1) {
            this.beginReturnHome();
            return;
        }

        const speed = CONFIG.PLAYER.ATTACK_SPEED;
        let remaining = speed * dt;

        while (remaining > 0 && this.pathIndex < this.attackPath.length - 1) {
            const from = this.attackPath[this.pathIndex];
            const to = this.attackPath[this.pathIndex + 1];
            const segDist = dist(from.x, from.y, to.x, to.y);

            if (segDist === 0) {
                this.pathIndex++;
                continue;
            }

            const segRemaining = segDist * (1 - this.pathProgress);
            if (remaining >= segRemaining) {
                remaining -= segRemaining;
                this.pathIndex++;
                this.pathProgress = 0;
                this.x = to.x;
                this.y = to.y;
            } else {
                this.pathProgress += remaining / segDist;
                const t = this.pathProgress;
                this.x = from.x + (to.x - from.x) * t;
                this.y = from.y + (to.y - from.y) * t;
                remaining = 0;
            }
        }

        if (this.pathIndex < this.attackPath.length - 1) {
            const to = this.attackPath[this.pathIndex + 1];
            this.facingRight = to.x > this.x;
        }

        this._updateShadowClonePositions();

        if (this.pathIndex >= this.attackPath.length - 1) {
            this.beginReturnHome();
        }
    }

    updateReturn(dt) {
        const d = dist(this.x, this.y, this.homeX, this.homeY);
        if (d < 3) {
            this.x = this.homeX;
            this.y = this.homeY;
            this.state = PlayerState.IDLE;
            this.shadowClonesActive = false;
            this.shadowCloneSlots = [];
            return;
        }

        const n = normalize(this.homeX - this.x, this.homeY - this.y);
        const move = CONFIG.PLAYER.ATTACK_SPEED * dt;
        this.x += n.x * Math.min(move, d);
        this.y += n.y * Math.min(move, d);
        this.facingRight = n.x > 0;
    }

    addXP(amount) {
        this.xp += amount;
        if (this.xp >= this.xpToNext) {
            this.xp -= this.xpToNext;
            this.level++;
            this.xpToNext = Math.floor(CONFIG.XP.BASE_REQUIRED * Math.pow(CONFIG.XP.SCALE_FACTOR, this.level - 1));
            return true;
        }
        return false;
    }

    getCurrentSprite() {
        if (this.state === PlayerState.ATTACKING) {
            return SPRITES.ninja.attack[this.animFrame % SPRITES.ninja.attack.length];
        }
        if (this.state === PlayerState.RETURNING) {
            return SPRITES.ninja.run[this.animFrame % SPRITES.ninja.run.length];
        }
        return SPRITES.ninja.idle[this.animFrame % SPRITES.ninja.idle.length];
    }

    draw(ctx) {
        const isInvincibleBlink = this.invincibleTimer > 0 &&
            Math.floor(this.flashTimer * 10) % 2 === 0 &&
            this.state !== PlayerState.RETURNING;

        const spriteScale = this.spriteScale;

        this._drawBossRewardAuras(ctx, spriteScale);

        if (this.state === PlayerState.ATTACKING) {
            drawSlashArc(ctx, this.x, this.y, this.facingRight, this.animFrame, spriteScale);
            if (this.bossRewardDualWield) {
                drawSlashArc(ctx, this.x, this.y, !this.facingRight,
                    (this.animFrame + 2) % 4, spriteScale * 0.92);
            }
        }

        let tintAmount = 0;
        if (this.hitFlashTimer > 0) {
            const flashDur = CONFIG.PLAYER.HIT_FLASH_DURATION;
            const t = this.hitFlashTimer / flashDur;
            const pulse = 0.55 + Math.sin((1 - t) * Math.PI * 6) * 0.45;
            tintAmount = pulse * t;
        }

        this._drawShadowClones(ctx, spriteScale);

        if (this.bossRewardDualWield) {
            const offHandX = this.facingRight ? -spriteScale * 5 : spriteScale * 5;
            drawSprite(ctx, this.getCurrentSprite(),
                Math.floor(this.x + offHandX), Math.floor(this.y),
                spriteScale * 0.92, 0.88, this.facingRight, 0.35);
        }

        if (isInvincibleBlink) {
            ctx.save();
            ctx.globalAlpha = 0.45;
        }

        drawSprite(ctx, this.getCurrentSprite(), Math.floor(this.x), Math.floor(this.y),
            spriteScale, 1, !this.facingRight, tintAmount);

        if (isInvincibleBlink) {
            ctx.restore();
        }

        this._drawBossRewardAccessories(ctx, spriteScale);
    }

    _drawBossRewardAuras(ctx, spriteScale) {
        const t = Date.now() * 0.001;

        if (this.bossRewardDeepBreath) {
            const pulse = 0.75 + Math.sin(t * 3.2) * 0.25;
            for (let ring = 0; ring < 3; ring++) {
                const r = (22 + ring * 11) * this.sizeScale * pulse;
                ctx.save();
                ctx.globalAlpha = (0.22 - ring * 0.05) * pulse;
                ctx.strokeStyle = ['#28d8f0', '#68e8ff', '#a8f4ff'][ring];
                ctx.lineWidth = 3 + ring;
                ctx.beginPath();
                ctx.arc(this.x, this.y, r, 0, Math.PI * 2);
                ctx.stroke();
                ctx.restore();
            }
        }

        if (this.bossRewardIai) {
            const pulse = 0.8 + Math.sin(t * 4) * 0.2;
            ctx.save();
            ctx.globalAlpha = 0.28 * pulse;
            const grad = ctx.createRadialGradient(
                this.x, this.y, 8, this.x, this.y, 38 * this.sizeScale);
            grad.addColorStop(0, 'rgba(160, 200, 255, 0.9)');
            grad.addColorStop(1, 'rgba(80, 120, 200, 0)');
            ctx.fillStyle = grad;
            ctx.beginPath();
            ctx.arc(this.x, this.y, 38 * this.sizeScale * pulse, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
        }
    }

    _drawBossRewardAccessories(ctx, spriteScale) {
        const flip = !this.facingRight;
        const dir = this.facingRight ? 1 : -1;

        if (this.bossRewardIai) {
            ctx.save();
            ctx.translate(this.x, this.y);
            if (flip) ctx.scale(-1, 1);
            ctx.strokeStyle = '#c8e8ff';
            ctx.lineWidth = Math.max(2, spriteScale * 0.35);
            ctx.shadowColor = '#8cf';
            ctx.shadowBlur = 8;
            ctx.beginPath();
            ctx.moveTo(-spriteScale * 1.2, spriteScale * 0.3);
            ctx.lineTo(-spriteScale * 2.8, -spriteScale * 0.8);
            ctx.stroke();
            ctx.fillStyle = '#6a88b8';
            ctx.fillRect(-spriteScale * 2.9, -spriteScale * 1.1,
                spriteScale * 0.5, spriteScale * 0.7);
            ctx.restore();
        }

        if (this.bossRewardDualWield) {
            ctx.save();
            ctx.translate(this.x, this.y);
            if (flip) ctx.scale(-1, 1);
            const bladeLen = spriteScale * 3.2;
            ctx.strokeStyle = '#ff9040';
            ctx.lineWidth = Math.max(2, spriteScale * 0.4);
            ctx.shadowColor = '#f84';
            ctx.shadowBlur = 10;
            ctx.beginPath();
            ctx.moveTo(spriteScale * 0.8, -spriteScale * 0.2);
            ctx.lineTo(spriteScale * 0.8 + bladeLen * dir, -spriteScale * 1.4);
            ctx.stroke();
            ctx.restore();
        }

        if (this.bossRewardDeepBreath) {
            const puff = Math.sin(Date.now() * 0.006) * 0.5 + 0.5;
            ctx.save();
            ctx.globalAlpha = 0.35 + puff * 0.25;
            ctx.fillStyle = '#a8f0ff';
            ctx.beginPath();
            ctx.arc(this.x - 14 * dir, this.y - 22, 5 + puff * 3, 0, Math.PI * 2);
            ctx.fill();
            ctx.beginPath();
            ctx.arc(this.x + 10 * dir, this.y - 26, 4 + puff * 2, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
        }
    }

    _drawShadowClones(ctx, spriteScale) {
        const sprite = this.state === PlayerState.ATTACKING
            ? SPRITES.ninja.attack[0]
            : SPRITES.ninja.idle[0];

        if (this.shadowClonesActive && this.shadowCloneSlots.length) {
            for (const slot of this.shadowCloneSlots) {
                ctx.save();
                ctx.globalAlpha = 0.42;
                drawSprite(ctx, sprite, Math.floor(slot.x), Math.floor(slot.y),
                    spriteScale, 1, !this.facingRight, 0);
                ctx.fillStyle = 'rgba(40, 30, 60, 0.35)';
                ctx.beginPath();
                ctx.arc(slot.x, slot.y, 10, 0, Math.PI * 2);
                ctx.fill();
                ctx.restore();
            }
            return;
        }

        if (this.shadowClonesPending > 0 &&
            (this.state === PlayerState.IDLE ||
                this.state === PlayerState.RETURNING ||
                this.state === PlayerState.BULLET_TIME)) {
            for (let i = 0; i < this.shadowClonesPending; i++) {
                const pos = this._getShadowHomePosition(i, this.shadowClonesPending);
                ctx.save();
                ctx.globalAlpha = 0.38 + Math.sin(Date.now() * 0.005 + i) * 0.08;
                drawSprite(ctx, SPRITES.ninja.idle[0], Math.floor(pos.x), Math.floor(pos.y),
                    spriteScale, 1, i % 2 === 0, 0);
                ctx.restore();
            }
        }
    }

    drawTriggerZone(ctx) {
        if (this.state === PlayerState.BULLET_TIME) return;

        const showZone =
            this.state === PlayerState.IDLE ||
            this.state === PlayerState.ATTACKING ||
            this.state === PlayerState.RETURNING;

        if (!showZone) return;

        const pulse = 0.85 + Math.sin(Date.now() * 0.006) * 0.15;

        ctx.beginPath();
        ctx.arc(this.homeX, this.homeY, this.triggerRadius, 0, Math.PI * 2);
        ctx.strokeStyle = 'rgba(90, 110, 130, 0.4)';
        ctx.lineWidth = 2;
        ctx.setLineDash([6, 4]);
        ctx.stroke();
        ctx.setLineDash([]);

        ctx.beginPath();
        ctx.arc(this.homeX, this.homeY, this.triggerRadius, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(90, 110, 130, 0.08)';
        ctx.fill();
    }

    drawPath(ctx) {
        if (this.attackPath.length < 2) return;

        const isDrawing = this.state === PlayerState.BULLET_TIME;
        const outerW = isDrawing ? 12 : 5;
        const midW = isDrawing ? 7 : 2.5;
        const innerW = isDrawing ? 3 : 1;

        ctx.beginPath();
        ctx.moveTo(this.attackPath[0].x, this.attackPath[0].y);
        for (let i = 1; i < this.attackPath.length; i++) {
            ctx.lineTo(this.attackPath[i].x, this.attackPath[i].y);
        }
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';

        if (isDrawing) {
            ctx.strokeStyle = 'rgba(50, 55, 70, 0.55)';
            ctx.lineWidth = outerW;
            ctx.stroke();
            ctx.strokeStyle = 'rgba(170, 185, 210, 0.92)';
            ctx.lineWidth = midW;
            ctx.stroke();
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.98)';
            ctx.lineWidth = innerW;
            ctx.stroke();
        } else {
            ctx.strokeStyle = 'rgba(90, 100, 115, 0.18)';
            ctx.lineWidth = outerW;
            ctx.stroke();
            ctx.strokeStyle = 'rgba(160, 175, 195, 0.22)';
            ctx.lineWidth = midW;
            ctx.stroke();
        }
    }
}


// ---- monster.js ----
class Monster {
    constructor(x, y, config, id) {
        this.id = id;
        this.x = x;
        this.y = y;
        this.config = { ...config };
        this.hp = config.hp;
        this.maxHp = config.hp;
        this.def = config.def;
        this.range = config.range;
        this.size = config.size;
        this.speed = config.speed;
        this.atkSpeed = config.atkSpeed;
        this.atkDamage = config.atkDamage;
        this.monsterType = config.type;
        this.color = config.color;
        this.xpValue = config.xp;

        this.alive = true;
        this.atkTimer = 0;
        this.animFrame = 0;
        this.animTimer = 0;
        this.isMoving = false;
        this.walkPhase = 0;

        this.spawnTimer = CONFIG.SPAWN_FADE_DURATION;
        this.spawning = true;
        this.deathTimer = 0;
        this.dying = false;

        this.frozen = false;
        this.frozenTimer = 0;

        this.configKey = '';
    }

    get hitboxRadius() {
        return this.size;
    }

    update(dt, playerX, playerY) {
        if (this.spawning) {
            this.spawnTimer -= dt;
            if (this.spawnTimer <= 0) {
                this.spawning = false;
            }
            return null;
        }

        if (this.dying) {
            this.deathTimer -= dt;
            if (this.deathTimer <= 0) {
                this.alive = false;
            }
            return null;
        }

        if (this.frozen) {
            this.frozenTimer -= dt;
            if (this.frozenTimer <= 0) {
                this.frozen = false;
            }
            return null;
        }

        const d = dist(this.x, this.y, playerX, playerY);
        this.isMoving = d > this.range;

        this.walkPhase += dt * (this.isMoving ? 14 : 4);
        const animInterval = this.isMoving ? 0.14 : 0.45;
        this.animTimer += dt;
        if (this.animTimer >= animInterval) {
            this.animTimer = 0;
            this.animFrame = (this.animFrame + 1) % 2;
        }

        if (this.isMoving) {
            const n = normalize(playerX - this.x, playerY - this.y);
            this.x += n.x * this.speed * dt;
            this.y += n.y * this.speed * dt;
        }

        this.atkTimer += dt;
        if (d <= this.range && this.atkTimer >= this.atkSpeed) {
            this.atkTimer = 0;
            if (this.monsterType === 'ranged') {
                const a = angle(this.x, this.y, playerX, playerY);
                return {
                    type: 'shoot',
                    x: this.x, y: this.y,
                    angle: a,
                };
            } else {
                return {
                    type: 'melee',
                    damage: this.atkDamage,
                    targetX: playerX,
                    targetY: playerY,
                };
            }
        }

        return null;
    }

    takeDamage(rawDamage) {
        const actual = Math.max(1, rawDamage - this.def);
        this.hp -= actual;
        if (this.hp <= 0) {
            this.hp = 0;
            this.dying = true;
            this.deathTimer = 0.3;
            this.deathHandled = false;
        }
        return actual;
    }

    freeze(duration) {
        this.frozen = true;
        this.frozenTimer = duration;
    }

    getSpriteKey() {
        switch (this.configKey) {
            case 'NORMAL_MELEE': return SPRITES.normalMelee;
            case 'NORMAL_RANGED': return SPRITES.normalRanged;
            case 'STRONG_MELEE': return SPRITES.strongMelee;
            case 'STRONG_RANGED': return SPRITES.strongRanged;
            default: return SPRITES.normalMelee;
        }
    }

    getWalkBob() {
        if (!this.isMoving || this.spawning || this.dying) return 0;
        return Math.sin(this.walkPhase) * 3;
    }

    draw(ctx) {
        if (!this.alive) return;

        let alpha = 1;
        if (this.spawning) {
            alpha = 1 - (this.spawnTimer / CONFIG.SPAWN_FADE_DURATION);
        }
        if (this.dying) {
            alpha = this.deathTimer / 0.3;
        }

        const spriteSet = this.getSpriteKey();
        const isAttacking = !this.isMoving && this.atkTimer < 0.35 && !this.spawning;
        let frames = spriteSet.walk || spriteSet.idle;
        if (isAttacking && spriteSet.attack) {
            frames = spriteSet.attack;
        }
        const sprite = frames[this.animFrame % frames.length];
        const scale = this.size > 13
            ? CONFIG.DISPLAY.MONSTER_SPRITE_SCALE_STRONG
            : CONFIG.DISPLAY.MONSTER_SPRITE_SCALE;

        const drawY = Math.floor(this.y + this.getWalkBob());

        if (this.frozen) {
            ctx.globalAlpha = alpha;
            ctx.fillStyle = 'rgba(0, 200, 255, 0.3)';
            ctx.beginPath();
            ctx.arc(this.x, drawY, this.hitboxRadius + 4, 0, Math.PI * 2);
            ctx.fill();
            ctx.globalAlpha = 1;
        }

        drawSprite(ctx, sprite, Math.floor(this.x), drawY, scale, alpha);

        if (!this.spawning && !this.dying && this.hp < this.maxHp) {
            this.drawHpBar(ctx, drawY);
        }
    }

    drawHpBar(ctx, drawY) {
        const barW = 22;
        const barH = 3;
        const x = this.x - barW / 2;
        const y = drawY - this.hitboxRadius - 10;
        const ratio = this.hp / this.maxHp;

        ctx.fillStyle = '#333';
        ctx.fillRect(x, y, barW, barH);
        ctx.fillStyle = ratio > 0.5 ? '#4f4' : ratio > 0.25 ? '#ff0' : '#f44';
        ctx.fillRect(x, y, barW * ratio, barH);
        ctx.strokeStyle = '#000';
        ctx.lineWidth = 1;
        ctx.strokeRect(x, y, barW, barH);
    }
}


// ---- projectile.js ----
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


// ---- experience.js ----
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
        this.magnetized = false;
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
            this.magnetized = true;
        }

        if (pickupReady && this.magnetized) {
            const n = normalize(playerX - this.x, playerY - this.y);
            let speed;
            if (d < magnetRadius) {
                speed = CONFIG.XP.ORB_SPEED * (1 - d / magnetRadius + 0.3);
            } else {
                speed = CONFIG.XP.ORB_SPEED * 1.4;
            }
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

        const glowAlpha = this.magnetized
            ? 0.55 + Math.sin(this.bobTimer) * 0.25
            : this.canPickup()
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
        const scale = CONFIG.XP.ORB_VALUE_SCALE ?? 1;
        const xp = Math.max(1, Math.floor(value * scale));
        this.orbs.push(new XpOrb(x, y, xp));
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


// ---- upgrades.js ----
const UPGRADE_DEFS = [
    {
        id: 'ice_heart',
        name: '冰冻之心',
        desc: '伤害+5%，攻击有30%概率冰冻敌人2秒',
        stackDesc: '冰冻概率+5%，伤害+5%',
        icon: '❄️',
        color: '#0cf',
        apply(player, stacks) {
            if (stacks === 1) {
                player.damageBonus += 0.05;
                player.freezeChance = 0.30;
            } else {
                player.damageBonus += 0.05;
                player.freezeChance += 0.05;
            }
        },
    },
    {
        id: 'cheese',
        name: '奶酪',
        desc: '增加半颗心最大血量',
        stackDesc: '增加半颗心最大血量',
        icon: '🧀',
        color: '#fd0',
        apply(player, stacks) {
            player.maxHearts += 0.5;
            player.hearts += 0.5;
        },
    },
    {
        id: 'lightning',
        name: '闪电链',
        desc: '攻击时释放闪电链，连锁3个敌人',
        stackDesc: '闪电链目标+1',
        icon: '⚡',
        color: '#ff0',
        apply(player, stacks) {
            if (stacks === 1) {
                player.lightningChains = 3;
            } else {
                player.lightningChains += 1;
            }
        },
    },
    {
        id: 'big_mushroom',
        name: '大蘑菇',
        desc: '体型放大6%，暴击率+10%',
        stackDesc: '体型放大6%，暴击率+10%',
        icon: '🍄',
        color: '#e44',
        apply(player, stacks) {
            player.sizeScale *= 1.06;
            player.critRate += 0.10;
        },
    },
    {
        id: 'shuriken',
        name: '飞镖',
        desc: '伤害+10%，1枚飞镖环绕身边伤害敌人',
        stackDesc: '飞镖+1，伤害+5%',
        icon: '🎯',
        color: '#8aa',
        apply(player, stacks) {
            if (stacks === 1) {
                player.damageBonus += 0.10;
                player.shurikenCount = 1;
                player.shurikenLevel = 1;
            } else {
                player.damageBonus += 0.05;
                player.shurikenCount += 1;
                player.shurikenLevel = stacks;
            }
        },
    },
    {
        id: 'crescent',
        name: '月牙天冲',
        desc: '暴击率+5%，每连击3次对最近敌人释放穿透月牙波',
        stackDesc: '暴击率+2%，月牙波+1',
        icon: '🌙',
        color: '#bdf',
        apply(player, stacks) {
            if (stacks === 1) {
                player.critRate += 0.05;
                player.crescentLevel = 1;
                player.crescentWaves = 1;
            } else {
                player.critRate += 0.02;
                player.crescentLevel = stacks;
                player.crescentWaves += 1;
            }
        },
    },
    {
        id: 'black_hole',
        name: '黑洞',
        desc: '每连击8次在攻击位置生成黑洞，吸附范围内敌人',
        stackDesc: '吸附范围+10，吸力+18',
        icon: '🕳️',
        color: '#86a',
        apply(player, stacks) {
            player.blackHoleLevel = stacks;
        },
    },
    {
        id: 'blade_whirl',
        name: '刀阵旋风',
        desc: '每连击5次以自身为中心释放刀阵旋风',
        stackDesc: '刀阵旋风伤害+12%',
        icon: '🌀',
        color: '#aab',
        apply(player, stacks) {
            player.bladeWhirlLevel = stacks;
        },
    },
    {
        id: 'fireball',
        name: '火球术',
        desc: '暴击伤害+10%，每2秒对最近敌人释放火球',
        stackDesc: '暴击伤害+5%，火球+1',
        icon: '🔥',
        color: '#f84',
        apply(player, stacks) {
            if (stacks === 1) {
                player.critMultiplier += 0.10;
                player.fireballLevel = 1;
                player.fireballCount = 1;
            } else {
                player.critMultiplier += 0.05;
                player.fireballCount += 1;
                player.fireballLevel = stacks;
            }
        },
    },
    {
        id: 'shadow_clone',
        name: '影分身',
        desc: '连击>10时留下影分身，下次攻击协同作战(30%伤害)',
        stackDesc: '影分身+1',
        icon: '👤',
        color: '#668',
        apply(player, stacks) {
            player.shadowCloneLevel = stacks;
            player.shadowCloneCount = stacks;
        },
    },
];

class UpgradeManager {
    constructor() {
        this.stacks = {};
        for (const u of UPGRADE_DEFS) {
            this.stacks[u.id] = 0;
        }
        this.choices = [];
        this.active = false;
        this.onSelect = null;
    }

    generateChoices() {
        const shuffled = shuffleArray(UPGRADE_DEFS);
        this.choices = shuffled.slice(0, 3);
        this.active = true;
    }

    selectUpgrade(index, player) {
        if (index < 0 || index >= this.choices.length) return;
        const upgrade = this.choices[index];
        this.stacks[upgrade.id]++;
        upgrade.apply(player, this.stacks[upgrade.id]);
        this.active = false;
        this.choices = [];
        if (this.onSelect) this.onSelect();
    }

    getDesc(upgrade) {
        const stk = this.stacks[upgrade.id];
        if (stk > 0) return upgrade.stackDesc;
        return upgrade.desc;
    }

    _wrapLines(ctx, text, maxW) {
        const lines = [];
        let line = '';
        for (let i = 0; i < text.length; i++) {
            const test = line + text[i];
            if (ctx.measureText(test).width > maxW && line.length > 0) {
                lines.push(line);
                line = text[i];
            } else {
                line = test;
            }
        }
        if (line) lines.push(line);
        return lines;
    }

    _drawWrappedTextCentered(ctx, text, centerX, y, maxW, fontSize, lineHeight, color) {
        ctx.font = `${fontSize}px "Segoe UI", Arial, "Microsoft YaHei", sans-serif`;
        ctx.fillStyle = color;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'top';

        const lines = this._wrapLines(ctx, text, maxW);
        let lineY = y;
        for (const ln of lines) {
            ctx.fillText(ln, centerX, lineY);
            lineY += lineHeight;
        }
        return lines.length;
    }

    drawUI(ctx, vp, uiScale) {
        if (!this.active) return;

        const s = uiScale || 1;

        ctx.fillStyle = 'rgba(0, 0, 0, 0.75)';
        ctx.fillRect(vp.x, vp.y, vp.w, vp.h);

        const titleY = vp.y + vp.h * 0.14;
        drawGameText(ctx, '升级！选择一个强化', vp.cx, titleY,
            Math.round(22 * s), '#fff', 'center', 'middle');

        const cardW = vp.w * 0.84;
        const cardH = 118 * s;
        const gap = 10 * s;
        const startY = vp.y + vp.h * 0.21;
        const innerPad = 20 * s;
        const textMaxW = cardW - innerPad * 2;

        this._cardRects = [];

        for (let i = 0; i < this.choices.length; i++) {
            const u = this.choices[i];
            const y = startY + i * (cardH + gap);
            const x = vp.x + (vp.w - cardW) / 2;
            const cardCx = x + cardW / 2;

            this._cardRects.push({ x, y, w: cardW, h: cardH, index: i });

            ctx.fillStyle = 'rgba(30, 30, 60, 0.95)';
            ctx.strokeStyle = u.color;
            ctx.lineWidth = 2;
            if (typeof ctx.roundRect === 'function') {
                ctx.beginPath();
                ctx.roundRect(x, y, cardW, cardH, 8);
                ctx.fill();
                ctx.stroke();
            } else {
                ctx.fillRect(x, y, cardW, cardH);
                ctx.strokeRect(x, y, cardW, cardH);
            }

            const iconSize = Math.round(32 * s);
            const iconY = y + innerPad + iconSize * 0.45;
            ctx.font = `${iconSize}px serif`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillStyle = '#fff';
            ctx.fillText(u.icon, cardCx, iconY);

            const nameSize = Math.round(17 * s);
            const nameY = iconY + iconSize * 0.55 + 14 * s;
            ctx.font = `bold ${nameSize}px "Segoe UI", Arial, "Microsoft YaHei", sans-serif`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillStyle = u.color;
            ctx.fillText(u.name, cardCx, nameY);

            const stk = this.stacks[u.id];
            if (stk > 0) {
                const lvSize = Math.round(12 * s);
                ctx.font = `bold ${lvSize}px "Segoe UI", Arial, sans-serif`;
                ctx.textAlign = 'right';
                ctx.textBaseline = 'top';
                ctx.fillStyle = '#aaa';
                ctx.fillText(`Lv.${stk + 1}`, x + cardW - innerPad, y + innerPad * 0.7);
            }

            const descSize = Math.round(13 * s);
            const lineHeight = Math.round(18 * s);
            const descY = nameY + 16 * s;
            this._drawWrappedTextCentered(
                ctx, this.getDesc(u), cardCx, descY,
                textMaxW, descSize, lineHeight, '#ccc'
            );
        }
    }

    handleClick(x, y) {
        if (!this.active || !this._cardRects) return -1;
        for (const r of this._cardRects) {
            if (x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h) {
                return r.index;
            }
        }
        return -1;
    }
}


// ---- bossRewards.js ----
const BOSS_REWARD_DEFS = [
    {
        id: 'dual_wield',
        name: '二刀流',
        desc: '攻击时连击次数翻倍',
        icon: '⚔️',
        color: '#e85828',
        apply(player) {
            player.bossRewardDualWield = true;
        },
    },
    {
        id: 'iai_slash',
        name: '居合斩',
        desc: '每次攻击的第一次暴击造成3倍伤害',
        icon: '🗡️',
        color: '#a8d8ff',
        apply(player) {
            player.bossRewardIai = true;
        },
    },
    {
        id: 'deep_breath',
        name: '深呼吸',
        desc: '气力上限+30%',
        icon: '🌬️',
        color: '#48c8e8',
        apply(player) {
            player.bossRewardDeepBreath = true;
            const bonus = Math.floor(player.kiMax * 0.3);
            player.kiMax += bonus;
            player.ki = Math.min(player.kiMax, player.ki + bonus);
        },
    },
];

class BossRewardManager {
    constructor() {
        this.owned = new Set();
        this.choices = [];
        this.active = false;
        this.onSelect = null;
        this._cardRects = [];
    }

    reset() {
        this.owned.clear();
        this.choices = [];
        this.active = false;
        this._cardRects = [];
    }

    hasAvailable() {
        return BOSS_REWARD_DEFS.some(r => !this.owned.has(r.id));
    }

    generateChoices() {
        const available = BOSS_REWARD_DEFS.filter(r => !this.owned.has(r.id));
        if (available.length === 0) return false;
        const shuffled = shuffleArray(available);
        this.choices = shuffled.slice(0, Math.min(2, shuffled.length));
        this.active = true;
        return true;
    }

    selectReward(index, player) {
        if (index < 0 || index >= this.choices.length) return;
        const reward = this.choices[index];
        this.owned.add(reward.id);
        reward.apply(player);
        this.active = false;
        this.choices = [];
        if (this.onSelect) this.onSelect();
    }

    drawUI(ctx, vp, uiScale) {
        if (!this.active) return;

        const s = uiScale || 1;
        ctx.fillStyle = 'rgba(0, 0, 0, 0.78)';
        ctx.fillRect(vp.x, vp.y, vp.w, vp.h);

        drawGameText(ctx, 'Boss奖励！选择一个', vp.cx, vp.y + vp.h * 0.16,
            Math.round(24 * s), '#ffd080', 'center', 'middle');

        const cardW = vp.w * 0.42;
        const cardH = 200 * s;
        const gap = 14 * s;
        const totalW = this.choices.length * cardW + (this.choices.length - 1) * gap;
        let startX = vp.x + (vp.w - totalW) / 2;
        const cardY = vp.y + vp.h * 0.28;
        const innerPad = 16 * s;

        this._cardRects = [];

        for (let i = 0; i < this.choices.length; i++) {
            const u = this.choices[i];
            const x = startX;
            const cardCx = x + cardW / 2;

            this._cardRects.push({ x, y: cardY, w: cardW, h: cardH, index: i });

            ctx.fillStyle = 'rgba(24, 18, 48, 0.96)';
            ctx.strokeStyle = u.color;
            ctx.lineWidth = 3;
            if (typeof ctx.roundRect === 'function') {
                ctx.beginPath();
                ctx.roundRect(x, cardY, cardW, cardH, 10);
                ctx.fill();
                ctx.stroke();
            } else {
                ctx.fillRect(x, cardY, cardW, cardH);
                ctx.strokeRect(x, cardY, cardW, cardH);
            }

            const iconSize = Math.round(40 * s);
            ctx.font = `${iconSize}px serif`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillStyle = '#fff';
            ctx.fillText(u.icon, cardCx, cardY + innerPad + iconSize * 0.5);

            const nameSize = Math.round(18 * s);
            ctx.font = `bold ${nameSize}px ${GAME_FONT}`;
            ctx.fillStyle = u.color;
            ctx.fillText(u.name, cardCx, cardY + innerPad + iconSize + 18 * s);

            const descSize = Math.round(13 * s);
            ctx.font = `${descSize}px ${GAME_FONT}`;
            ctx.fillStyle = '#ccc';
            const lines = this._wrapLines(ctx, u.desc, cardW - innerPad * 2);
            let lineY = cardY + innerPad + iconSize + 44 * s;
            for (const ln of lines) {
                ctx.fillText(ln, cardCx, lineY);
                lineY += Math.round(18 * s);
            }

            startX += cardW + gap;
        }
    }

    _wrapLines(ctx, text, maxW) {
        const lines = [];
        let line = '';
        for (let i = 0; i < text.length; i++) {
            const test = line + text[i];
            if (ctx.measureText(test).width > maxW && line.length > 0) {
                lines.push(line);
                line = text[i];
            } else {
                line = test;
            }
        }
        if (line) lines.push(line);
        return lines;
    }

    handleClick(x, y) {
        if (!this.active || !this._cardRects) return -1;
        for (const r of this._cardRects) {
            if (x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h) {
                return r.index;
            }
        }
        return -1;
    }
}

class BossChestManager {
    constructor(game) {
        this.game = game;
        this.chests = [];
    }

    reset() {
        this.chests = [];
    }

    hasActiveChest() {
        return this.chests.some(c => !c.opened);
    }

    getSpawnPos(boss) {
        const player = this.game.player;
        const w = this.game.renderer.w;
        const h = this.game.renderer.h;
        if (!player) {
            return { x: boss.x, y: clamp(boss.y + 90, h * 0.35, h * 0.65) };
        }
        const t = 0.58;
        let x = boss.x + (player.x - boss.x) * t;
        let y = boss.y + (player.y - boss.y) * t;
        y = clamp(y, h * 0.30, h * 0.70);
        x = clamp(x, 48, w - 48);
        return { x, y };
    }

    spawnForBoss(boss) {
        if (!boss || boss.chestDropped || this.hasActiveChest()) return;
        boss.chestDropped = true;
        const pos = this.getSpawnPos(boss);
        this.spawn(pos.x, pos.y);
    }

    spawn(x, y) {
        this.chests.push({
            x,
            y,
            bob: Math.random() * Math.PI * 2,
            glow: 0,
            opened: false,
            spawnPop: 0.45,
        });
        const { particles, renderer } = this.game;
        renderer.shake(5, 0.12);
        for (let i = 0; i < 24; i++) {
            const a = (i / 24) * Math.PI * 2;
            particles.emit(
                x + Math.cos(a) * 12, y + Math.sin(a) * 8,
                Math.cos(a) * randRange(50, 130), Math.sin(a) * randRange(30, 100),
                randRange(0.35, 0.7), randRange(4, 9),
                ['#ffd080', '#ffb040', '#fff8c0'][Math.floor(Math.random() * 3)],
                0, true, true);
        }
    }

    update(dt) {
        const player = this.game.player;
        if (!player) return;

        for (const chest of this.chests) {
            if (chest.opened) continue;
            chest.bob += dt * 4;
            chest.glow = Math.min(1, chest.glow + dt * 2);
            if (chest.spawnPop > 0) chest.spawnPop -= dt;

            const canPickup = player.state === PlayerState.IDLE ||
                player.state === PlayerState.RETURNING;
            if (!canPickup) continue;
            if (dist(player.x, player.y, chest.x, chest.y) > 52) continue;

            chest.opened = true;
            this._openChest(chest);
            break;
        }

        this.chests = this.chests.filter(c => !c.opened);
    }

    getActiveChest() {
        return this.chests.find(c => !c.opened) || null;
    }

    _openChest(chest) {
        if (this.game.state === 'BOSS_REWARD' || this.game.state === 'LEVEL_UP') return;

        const { particles, renderer, bossRewards } = this.game;
        for (let i = 0; i < 20; i++) {
            const a = randRange(0, Math.PI * 2);
            particles.emit(
                chest.x, chest.y - 8,
                Math.cos(a) * randRange(40, 120), Math.sin(a) * randRange(-80, -20),
                randRange(0.25, 0.55), randRange(4, 8),
                ['#ffd080', '#fff', '#ffb850'][Math.floor(Math.random() * 3)],
                80, true, true);
        }
        renderer.shake(6, 0.18);

        if (bossRewards.hasAvailable()) {
            bossRewards.generateChoices();
            this.game.state = 'BOSS_REWARD';
            this.game._lockOverlayInput();
        }
    }

    draw(ctx) {
        for (const chest of this.chests) {
            if (chest.opened) continue;
            const bobY = Math.sin(chest.bob) * 6;
            const pop = chest.spawnPop > 0 ? 1 + chest.spawnPop * 0.35 : 1;
            const x = Math.floor(chest.x);
            const y = Math.floor(chest.y + bobY);
            const pulse = 0.7 + Math.sin(chest.bob * 1.4) * 0.3;
            const scale = pop;

            ctx.save();
            ctx.globalAlpha = 0.4 + chest.glow * 0.25;
            const beamH = 120 * scale;
            const beam = ctx.createLinearGradient(x, y, x, y - beamH);
            beam.addColorStop(0, 'rgba(255, 220, 100, 0.55)');
            beam.addColorStop(1, 'rgba(255, 200, 80, 0)');
            ctx.fillStyle = beam;
            ctx.fillRect(x - 14 * scale, y - beamH, 28 * scale, beamH);

            const grad = ctx.createRadialGradient(x, y - 8, 6, x, y - 8, 52 * pulse * scale);
            grad.addColorStop(0, 'rgba(255, 220, 120, 0.95)');
            grad.addColorStop(0.5, 'rgba(255, 160, 50, 0.45)');
            grad.addColorStop(1, 'rgba(255, 140, 40, 0)');
            ctx.fillStyle = grad;
            ctx.beginPath();
            ctx.arc(x, y - 8, 52 * pulse * scale, 0, Math.PI * 2);
            ctx.fill();

            ctx.globalAlpha = 1;
            const bw = 44 * scale;
            const bh = 28 * scale;
            const topH = 20 * scale;
            ctx.fillStyle = '#5a3818';
            ctx.fillRect(x - bw / 2, y - 6, bw, bh);
            ctx.fillStyle = '#9a6828';
            ctx.fillRect(x - bw / 2 + 3, y - topH - 6, bw - 6, topH);
            ctx.fillStyle = '#ffd060';
            ctx.fillRect(x - bw / 2 + 5, y - topH - 4, bw - 10, 5 * scale);
            ctx.strokeStyle = '#ffe8a0';
            ctx.lineWidth = 2;
            ctx.strokeRect(x - bw / 2 + 3, y - topH - 6, bw - 6, topH + bh - 4);

            ctx.fillStyle = '#ffea90';
            ctx.font = `bold ${Math.round(20 * scale)}px serif`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText('📦', x, y - 2);

            ctx.fillStyle = '#fff8c0';
            ctx.font = `bold ${Math.round(13 * scale)}px ${GAME_FONT}`;
            ctx.fillText('Boss宝箱', x, y + bh + 10);
            ctx.restore();
        }
    }

    drawHint(ctx, vp, uiScale) {
        const chest = this.getActiveChest();
        const player = this.game.player;
        if (!chest || !player) return;
        if (dist(player.x, player.y, chest.x, chest.y) < 80) return;

        const dx = chest.x - player.x;
        const dy = chest.y - player.y;
        const len = Math.hypot(dx, dy) || 1;
        const ux = dx / len;
        const uy = dy / len;
        const s = uiScale || 1;

        ctx.save();
        ctx.globalAlpha = 0.9;
        drawGameText(ctx, 'Boss宝箱 →',
            vp.cx + ux * 72 * s, vp.cy + uy * 72 * s,
            Math.round(15 * s), '#ffd080', 'center', 'middle');
        ctx.restore();
    }
}


// ---- abilities.js ----
class AbilityManager {
    constructor(game) {
        this.game = game;
        this.reset();
    }

    reset() {
        this.orbitAngle = 0;
        this.shurikenHitCd = new Map();
        this.shurikenTrails = [];
        this.crescents = [];
        this.blackHoles = [];
        this.whirlwinds = [];
        this.fireballs = [];
        this.fireballTimer = 2;
        this.lastCrescentAtCombo = 0;
        this.lastWhirlAtCombo = 0;
        this.lastBlackHoleAtCombo = 0;
    }

    onComboHit(combo) {
        const player = this.game.player;
        if (!player) return;

        if (player.crescentLevel > 0) {
            player.crescentCharge = (player.crescentCharge || 0) + 1;
            if (player.crescentCharge >= 3) {
                player.crescentCharge = 0;
                const waves = player.crescentWaves || 1;
                const target = this._nearestMonster(player.x, player.y);
                for (let i = 0; i < waves; i++) {
                    this._spawnCrescent(player, target, i, waves);
                }
            }
        }

        if (player.bladeWhirlLevel > 0 && combo >= 5 && combo % 5 === 0 && combo !== this.lastWhirlAtCombo) {
            this.lastWhirlAtCombo = combo;
            this._spawnWhirlwind(player.x, player.y, player.bladeWhirlLevel);
        }

        if (player.blackHoleLevel > 0 && combo >= 8 && combo % 8 === 0 &&
            combo !== this.lastBlackHoleAtCombo) {
            this.lastBlackHoleAtCombo = combo;
            this._spawnBlackHoleAt(player.x, player.y, player.blackHoleLevel);
        }
    }

    update(dt) {
        const player = this.game.player;
        if (!player) return;

        this.orbitAngle += dt * 4.8;
        this._updateShurikens(dt, player);
        this._updateCrescents(dt);
        this._updateBlackHoles(dt);
        this._updateWhirlwinds(dt);
        this._updateFireballs(dt);

        if (player.fireballLevel > 0) {
            this.fireballTimer -= dt;
            if (this.fireballTimer <= 0) {
                this.fireballTimer = 2;
                this._spawnFireballVolley(player);
            }
        }
    }

    drawBehind(ctx) {
        for (const h of this.blackHoles) this._drawBlackHole(ctx, h);
        for (const w of this.whirlwinds) this._drawWhirlwind(ctx, w);
    }

    drawFront(ctx) {
        for (const c of this.crescents) this._drawCrescent(ctx, c);
        for (const f of this.fireballs) this._drawFireball(ctx, f);
        this._drawShurikenTrails(ctx);
        this._drawShurikens(ctx);
    }

    draw(ctx) {
        this.drawBehind(ctx);
        this.drawFront(ctx);
    }

    _burstParticles(x, y, count, colors, speedMin, speedMax, life, size, glow) {
        const particles = this.game.particles;
        for (let i = 0; i < count; i++) {
            const a = randRange(0, Math.PI * 2);
            const sp = randRange(speedMin, speedMax);
            particles.emit(x, y,
                Math.cos(a) * sp, Math.sin(a) * sp,
                randRange(life * 0.7, life), randRange(size * 0.8, size * 1.2),
                colors[Math.floor(Math.random() * colors.length)],
                0, true, glow);
        }
    }

    _abilityDamage(player, mult) {
        let dmg = player.baseDamage * (1 + player.damageBonus) * mult;
        const isCrit = Math.random() < player.critRate;
        if (isCrit) dmg *= player.critMultiplier;
        return { damage: Math.round(dmg), isCrit };
    }

    _hitMonster(m, damage, isCrit, color) {
        const actual = m.takeDamage(damage);
        this.game.combat.spawnDamageNumber(
            m.x, m.y - m.hitboxRadius - 5, actual, isCrit, color || '#cef');
        this.game.particles.hitSpark(m.x, m.y, isCrit);
        if (m.dying) this.game.combat.onMonsterKilled(m);
        return actual;
    }

    _nearestMonster(x, y, maxDist = 9999) {
        let best = null;
        let bestD = maxDist;
        const boss = this.game.bossManager && this.game.bossManager.boss;
        if (boss && boss.alive && !boss.dying) {
            const d = dist(x, y, boss.x, boss.y + 10);
            if (d < bestD) {
                bestD = d;
                best = boss;
            }
        }
        for (const m of this.game.spawner.monsters) {
            if (!m.alive || m.dying || m.spawning) continue;
            const d = dist(x, y, m.x, m.y);
            if (d < bestD) {
                bestD = d;
                best = m;
            }
        }
        return best;
    }

    _nearestMonsters(x, y, count, usedIds = new Set()) {
        const candidates = [];
        const boss = this.game.bossManager && this.game.bossManager.boss;
        if (boss && boss.alive && !boss.dying && !usedIds.has('boss')) {
            candidates.push({ m: boss, d: dist(x, y, boss.x, boss.y + 10) });
        }
        for (const m of this.game.spawner.monsters) {
            if (!m.alive || m.dying || m.spawning || usedIds.has(m.id)) continue;
            candidates.push({ m, d: dist(x, y, m.x, m.y) });
        }
        candidates.sort((a, b) => a.d - b.d);
        const picked = [];
        for (const c of candidates) {
            if (picked.length >= count) break;
            picked.push(c.m);
            usedIds.add(c.m.id);
        }
        return picked;
    }

    _spawnFireballVolley(player) {
        const count = Math.max(1, player.fireballCount || 1);
        const used = new Set();
        const targets = this._nearestMonsters(player.x, player.y, count, used);

        for (let i = 0; i < count; i++) {
            const target = targets[i] || targets[0] || null;
            let ang;
            if (target) {
                ang = Math.atan2(target.y - player.y, target.x - player.x);
            } else {
                ang = player.facingRight ? 0 : Math.PI;
            }
            if (count > 1 && !target) {
                ang += (i - (count - 1) / 2) * 0.35;
            } else if (count > 1 && target && i > 0 && targets.length <= 1) {
                ang += (i - (count - 1) / 2) * 0.22;
            }
            this._spawnFireball(player, ang);
        }
    }

    _spawnFireball(player, ang) {
        const lvl = player.fireballLevel || 1;
        const speed = 340 + lvl * 22;
        this.fireballs.push({
            x: player.x,
            y: player.y,
            vx: Math.cos(ang) * speed,
            vy: Math.sin(ang) * speed,
            radius: 11 + lvl * 1.5,
            damageMult: 0.62 + (lvl - 1) * 0.09,
            life: 2.4,
            maxLife: 2.4,
            hitIds: new Set(),
            spin: 0,
        });
        this._burstParticles(player.x, player.y, 10,
            ['#ff6620', '#ffaa44', '#ff4400', '#ffcc66'], 60, 160, 0.28, 4, true);
    }

    _updateFireballs(dt) {
        const player = this.game.player;
        if (!player) return;
        const w = this.game.renderer.w;
        const h = this.game.renderer.h;

        for (const f of this.fireballs) {
            f.life -= dt;
            f.spin += dt * 14;
            f.x += f.vx * dt;
            f.y += f.vy * dt;

            if (Math.random() < 0.55) {
                this.game.particles.emit(
                    f.x - f.vx * 0.03, f.y - f.vy * 0.03,
                    -f.vx * 0.05 + randRange(-20, 20), -f.vy * 0.05 + randRange(-20, 20),
                    randRange(0.1, 0.22), randRange(3, 5),
                    ['#ff6620', '#ffaa44', '#ff8830'][Math.floor(Math.random() * 3)],
                    0, true, true);
            }

            for (const m of this.game.spawner.monsters) {
                if (!m.alive || m.dying || m.spawning || f.hitIds.has(m.id)) continue;
                if (!circlesCollide(f.x, f.y, f.radius, m.x, m.y, m.hitboxRadius)) continue;
                f.hitIds.add(m.id);
                const { damage, isCrit } = this._abilityDamage(player, f.damageMult);
                this._hitMonster(m, damage, isCrit, '#f84');
                this._burstParticles(f.x, f.y, 14,
                    ['#ff6620', '#ffaa44', '#ff4400', '#fff4c0'], 80, 200, 0.32, 5, true);
                f.life = 0;
                break;
            }
        }
        this.fireballs = this.fireballs.filter(f =>
            f.life > 0 && f.x > -40 && f.x < w + 40 && f.y > -40 && f.y < h + 40);
    }

    _drawFireball(ctx, f) {
        const alpha = clamp(f.life / f.maxLife, 0, 1);
        const r = f.radius;

        ctx.save();
        ctx.translate(f.x, f.y);

        ctx.globalAlpha = 0.25 * alpha;
        const glow = ctx.createRadialGradient(0, 0, 0, 0, 0, r * 2.2);
        glow.addColorStop(0, 'rgba(255, 180, 80, 0.9)');
        glow.addColorStop(0.5, 'rgba(255, 80, 20, 0.35)');
        glow.addColorStop(1, 'rgba(255, 40, 0, 0)');
        ctx.fillStyle = glow;
        ctx.beginPath();
        ctx.arc(0, 0, r * 2.2, 0, Math.PI * 2);
        ctx.fill();

        ctx.rotate(f.spin);
        ctx.globalAlpha = 0.9 * alpha;
        ctx.fillStyle = '#ff6620';
        ctx.beginPath();
        ctx.arc(0, 0, r, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#ffcc66';
        ctx.beginPath();
        ctx.arc(-r * 0.15, -r * 0.1, r * 0.55, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#fff8e0';
        ctx.beginPath();
        ctx.arc(-r * 0.2, -r * 0.15, r * 0.28, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();
    }

    _canHitMonster(id, cooldown) {
        const t = this.shurikenHitCd.get(id) || 0;
        return performance.now() - t > cooldown * 1000;
    }

    _markHitMonster(id) {
        this.shurikenHitCd.set(id, performance.now());
    }

    _updateShurikens(dt, player) {
        if (player.shurikenCount <= 0) return;
        const orbitR = 28 + player.sizeScale * 6;
        const hitR = 10;
        const dmgMult = 0.32 + (player.shurikenLevel - 1) * 0.05;

        this.shurikenTrails = [];
        for (let i = 0; i < player.shurikenCount; i++) {
            const a = this.orbitAngle + (i / player.shurikenCount) * Math.PI * 2;
            const sx = player.x + Math.cos(a) * orbitR;
            const sy = player.y + Math.sin(a) * orbitR;
            this.shurikenTrails.push({ x: sx, y: sy, a });

            for (const m of this.game.spawner.monsters) {
                if (!m.alive || m.dying || m.spawning) continue;
                if (!circlesCollide(sx, sy, hitR, m.x, m.y, m.hitboxRadius)) continue;
                if (!this._canHitMonster(`s${m.id}`, 0.32)) continue;
                this._markHitMonster(`s${m.id}`);
                const { damage, isCrit } = this._abilityDamage(player, dmgMult);
                this._hitMonster(m, damage, isCrit, '#9cf');
                this._burstParticles(sx, sy, 4, ['#adf', '#fff', '#8cf'], 40, 90, 0.15, 3, true);
            }
        }
    }

    _drawShurikenTrails(ctx) {
        for (const t of this.shurikenTrails) {
            ctx.save();
            ctx.globalAlpha = 0.35;
            ctx.translate(t.x, t.y);
            ctx.rotate(t.a);
            ctx.fillStyle = '#88c8f8';
            ctx.fillRect(-8, -1, 16, 2);
            ctx.fillRect(-1, -8, 2, 16);
            ctx.globalAlpha = 0.18;
            ctx.fillStyle = '#fff';
            ctx.fillRect(-12, -2, 24, 4);
            ctx.fillRect(-2, -12, 4, 24);
            ctx.restore();
        }
    }

    _drawShurikens(ctx) {
        const player = this.game.player;
        if (!player || player.shurikenCount <= 0) return;
        const orbitR = 28 + player.sizeScale * 6;

        for (let i = 0; i < player.shurikenCount; i++) {
            const a = this.orbitAngle + (i / player.shurikenCount) * Math.PI * 2;
            const sx = Math.floor(player.x + Math.cos(a) * orbitR);
            const sy = Math.floor(player.y + Math.sin(a) * orbitR);

            ctx.save();
            ctx.translate(sx, sy);
            ctx.rotate(a + Math.PI / 4);

            ctx.globalAlpha = 0.45;
            ctx.fillStyle = '#5ac8ff';
            ctx.fillRect(-7, -7, 14, 14);

            ctx.globalAlpha = 1;
            ctx.fillStyle = '#1a2838';
            ctx.fillRect(-5, -1, 10, 2);
            ctx.fillRect(-1, -5, 2, 10);
            ctx.fillStyle = '#e8f4ff';
            ctx.fillRect(-3, -3, 6, 6);
            ctx.fillStyle = '#88b8e0';
            ctx.fillRect(-1, -4, 2, 8);
            ctx.fillRect(-4, -1, 8, 2);
            ctx.restore();
        }
    }

    _spawnCrescent(player, target, index, total) {
        let ang;
        if (target) {
            ang = Math.atan2(target.y - player.y, target.x - player.x);
        } else if (player.state === PlayerState.ATTACKING && player.pathIndex < player.attackPath.length - 1) {
            const to = player.attackPath[player.pathIndex + 1];
            ang = Math.atan2(to.y - player.y, to.x - player.x);
        } else {
            ang = player.facingRight ? 0 : Math.PI;
        }
        if (total > 1) {
            ang += (index - (total - 1) / 2) * 0.28;
        }
        const speed = 380 + player.crescentLevel * 24;
        const lvl = player.crescentLevel;
        const cx = player.x;
        const cy = player.y;
        this.crescents.push({
            x: cx, y: cy,
            vx: Math.cos(ang) * speed,
            vy: Math.sin(ang) * speed,
            radius: 18 + lvl * 3,
            damageMult: 0.55 + (lvl - 1) * 0.08,
            life: 2.0,
            maxLife: 2.0,
            hitIds: new Set(),
            spin: ang,
            travel: 0,
        });
        this._burstParticles(cx, cy, 18, ['#ffaa44', '#ff8830', '#ffcc66', '#ff6620'], 90, 220, 0.38, 5, true);
        this.game.renderer.shake(5, 0.14);
    }

    /** 月牙路径：开口朝后，弧顶朝飞行方向（局部 +X） */
    _crescentPath(ctx, r, outerMul, innerMul, innerOffsetX) {
        const or = r * outerMul;
        const ir = r * innerMul;
        const ix = -r * innerOffsetX;
        ctx.beginPath();
        ctx.arc(r * 0.22, 0, or, -Math.PI * 0.58, Math.PI * 0.58);
        ctx.arc(ix, 0, ir, Math.PI * 0.5, -Math.PI * 0.5, true);
        ctx.closePath();
    }

    _updateCrescents(dt) {
        const player = this.game.player;
        const w = this.game.renderer.w;
        const h = this.game.renderer.h;

        for (const c of this.crescents) {
            c.life -= dt;
            c.travel += dt;
            c.x += c.vx * dt;
            c.y += c.vy * dt;

            if (Math.random() < 0.4) {
                const tailX = c.x - c.vx * 0.04;
                const tailY = c.y - c.vy * 0.04;
                this.game.particles.emit(tailX, tailY,
                    -c.vx * 0.06 + randRange(-16, 16), -c.vy * 0.06 + randRange(-16, 16),
                    randRange(0.14, 0.28), randRange(3, 5),
                    ['#ffaa44', '#ff8830', '#ffcc88'][Math.floor(Math.random() * 3)],
                    0, true, true);
            }

            const boss = this.game.bossManager && this.game.bossManager.boss;
            if (boss && boss.alive && !boss.dying && !c.hitIds.has('boss')) {
                if (circlesCollide(c.x, c.y, c.radius * 1.15, boss.x, boss.y + 10, boss.hitboxRadius)) {
                    c.hitIds.add('boss');
                    const { damage, isCrit } = this._abilityDamage(player, c.damageMult);
                    const actual = boss.takeDamage(damage);
                    this.game.combat.spawnDamageNumber(boss.x, boss.y - 30, actual, isCrit, '#fa0');
                    this.game.particles.hitSpark(boss.x, boss.y + 15, isCrit);
                    if (boss.dying) this.game.combat.onBossKilled(boss);
                }
            }
            for (const m of this.game.spawner.monsters) {
                if (!m.alive || m.dying || m.spawning || c.hitIds.has(m.id)) continue;
                if (!circlesCollide(c.x, c.y, c.radius * 1.15, m.x, m.y, m.hitboxRadius)) continue;
                c.hitIds.add(m.id);
                const { damage, isCrit } = this._abilityDamage(player, c.damageMult);
                this._hitMonster(m, damage, isCrit, '#fa0');
                this._burstParticles(c.x, c.y, 8, ['#ffcc66', '#ff8830', '#ffaa44'], 50, 120, 0.22, 4, true);
            }
        }
        this.crescents = this.crescents.filter(c =>
            c.life > 0 && c.x > -40 && c.x < w + 40 && c.y > -40 && c.y < h + 40);
    }

    _drawCrescent(ctx, c) {
        const alpha = clamp(c.life / c.maxLife, 0, 1);
        const r = c.radius;
        const flightAngle = c.spin;

        ctx.save();
        ctx.translate(c.x, c.y);
        ctx.rotate(flightAngle);

        ctx.globalAlpha = 0.22 * alpha;
        ctx.fillStyle = '#ff6620';
        this._crescentPath(ctx, r, 1.45, 1.05, 0.42);
        ctx.fill();

        ctx.globalAlpha = 0.5 * alpha;
        ctx.fillStyle = '#ff8830';
        this._crescentPath(ctx, r, 1.22, 0.88, 0.38);
        ctx.fill();

        ctx.globalAlpha = 0.88 * alpha;
        ctx.fillStyle = '#ffaa44';
        this._crescentPath(ctx, r, 1.05, 0.78, 0.34);
        ctx.fill();

        ctx.globalAlpha = 0.95 * alpha;
        ctx.fillStyle = '#ffd080';
        this._crescentPath(ctx, r * 0.88, 0.92, 0.68, 0.3);
        ctx.fill();

        ctx.globalAlpha = 0.75 * alpha;
        ctx.strokeStyle = '#fff4c8';
        ctx.lineWidth = 2;
        this._crescentPath(ctx, r, 1.05, 0.78, 0.34);
        ctx.stroke();

        ctx.restore();
    }

    _spawnBlackHoleAt(x, y, level) {
        const radius = 82 + level * 12;
        this.blackHoles.push({
            x, y,
            radius,
            coreRadius: 14,
            pull: 100 + level * 18,
            life: 4.2,
            maxLife: 4.2,
            spin: Math.random() * Math.PI * 2,
            spawnBurst: 0.35,
        });
        this._burstParticles(x, y, 22, ['#6a48a8', '#9a78d0', '#2a1840', '#c8b0ff'], 30, 120, 0.5, 5, true);
        this.game.renderer.shake(4, 0.14);
    }

    _updateBlackHoles(dt) {
        const monsters = this.game.spawner.monsters;

        for (const hole of this.blackHoles) {
            hole.life -= dt;
            hole.spin += dt * 3.2;
            if (hole.spawnBurst > 0) hole.spawnBurst -= dt;

            if (Math.random() < 0.35) {
                const a = hole.spin + randRange(0, Math.PI * 2);
                const distR = randRange(hole.coreRadius, hole.radius * 0.9);
                this.game.particles.emit(
                    hole.x + Math.cos(a) * distR,
                    hole.y + Math.sin(a) * distR,
                    Math.cos(a + Math.PI / 2) * randRange(-40, 40),
                    Math.sin(a + Math.PI / 2) * randRange(-40, 40),
                    randRange(0.2, 0.45), randRange(2, 4),
                    ['#8a68c8', '#c8a8ff', '#4a3080'][Math.floor(Math.random() * 3)],
                    0, true, true);
            }

            for (const m of monsters) {
                if (!m.alive || m.dying || m.spawning) continue;
                const d = dist(m.x, m.y, hole.x, hole.y);
                if (d >= hole.radius || d <= hole.coreRadius) continue;

                const n = normalize(hole.x - m.x, hole.y - m.y);
                const pull = hole.pull * dt * (1 - d / hole.radius);
                m.x += n.x * Math.min(pull, d - hole.coreRadius);
                m.y += n.y * Math.min(pull, d - hole.coreRadius);

                for (const other of monsters) {
                    if (other === m || !other.alive || other.dying || other.spawning) continue;
                    const sd = dist(m.x, m.y, other.x, other.y);
                    const minD = (m.hitboxRadius + other.hitboxRadius) * 0.82;
                    if (sd < minD && sd > 0.1) {
                        const push = normalize(m.x - other.x, m.y - other.y);
                        const amt = (minD - sd) * 0.55;
                        m.x += push.x * amt;
                        m.y += push.y * amt;
                    }
                }
            }
        }
        this.blackHoles = this.blackHoles.filter(h => h.life > 0);
    }

    _drawBlackHole(ctx, h) {
        const pulse = 0.82 + Math.sin(h.spin * 2.2) * 0.18;
        const alpha = clamp(h.life / h.maxLife, 0, 1) * pulse;
        const burst = h.spawnBurst > 0 ? h.spawnBurst / 0.35 : 0;

        ctx.save();

        ctx.globalAlpha = (0.32 + burst * 0.2) * alpha;
        const grad = ctx.createRadialGradient(h.x, h.y, h.coreRadius, h.x, h.y, h.radius);
        grad.addColorStop(0, '#0a0614');
        grad.addColorStop(0.45, '#1a1030');
        grad.addColorStop(0.85, 'rgba(90, 60, 140, 0.35)');
        grad.addColorStop(1, 'rgba(90, 60, 140, 0)');
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(h.x, h.y, h.radius * (1 + burst * 0.15), 0, Math.PI * 2);
        ctx.fill();

        for (let ring = 0; ring < 3; ring++) {
            const rr = h.radius * (0.55 + ring * 0.18);
            ctx.globalAlpha = (0.35 - ring * 0.08) * alpha;
            ctx.strokeStyle = ring === 0 ? '#c8a8ff' : '#7a58b0';
            ctx.lineWidth = ring === 0 ? 3 : 2;
            ctx.setLineDash([8 - ring * 2, 6 + ring * 2]);
            ctx.beginPath();
            ctx.arc(h.x, h.y, rr, h.spin + ring * 0.5, h.spin + ring * 0.5 + Math.PI * 1.6);
            ctx.stroke();
        }
        ctx.setLineDash([]);

        ctx.globalAlpha = 0.95 * alpha;
        ctx.fillStyle = '#120820';
        ctx.beginPath();
        ctx.arc(h.x, h.y, h.coreRadius, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#9a78d0';
        ctx.beginPath();
        ctx.arc(h.x, h.y, h.coreRadius * 0.45, 0, Math.PI * 2);
        ctx.fill();

        ctx.globalAlpha = 0.85 * alpha;
        for (let i = 0; i < 10; i++) {
            const a = h.spin * 1.4 + (i / 10) * Math.PI * 2;
            const px = h.x + Math.cos(a) * (h.radius * 0.65);
            const py = h.y + Math.sin(a) * (h.radius * 0.65);
            ctx.fillStyle = i % 2 === 0 ? '#e8d8ff' : '#8868b8';
            ctx.fillRect(Math.floor(px) - 2, Math.floor(py) - 1, 4, 2);
            ctx.fillRect(Math.floor(px) - 1, Math.floor(py) - 2, 2, 4);
        }
        ctx.restore();
    }

    _spawnWhirlwind(x, y, level) {
        this.whirlwinds.push({
            x, y,
            radius: 6,
            maxRadius: 118 + level * 16,
            expandSpeed: 280 + level * 25,
            damageMult: 0.42 + (level - 1) * 0.12,
            life: 0.75,
            maxLife: 0.75,
            spin: 0,
            hitIds: new Set(),
        });
        this._burstParticles(x, y, 32, ['#fff', '#e8f0ff', '#c8d8e8', '#8898b0', '#adf'], 100, 320, 0.45, 5, true);
        this.game.renderer.shake(9, 0.22);
        this.game.audio.playSlash();
    }

    _updateWhirlwinds(dt) {
        const player = this.game.player;

        for (const w of this.whirlwinds) {
            w.life -= dt;
            w.spin += dt * 22;
            const prevR = w.radius;
            w.radius = Math.min(w.maxRadius, w.radius + w.expandSpeed * dt);

            if (w.radius > prevR && Math.random() < 0.6) {
                const a = randRange(0, Math.PI * 2);
                const px = w.x + Math.cos(a) * w.radius;
                const py = w.y + Math.sin(a) * w.radius;
                this.game.particles.emit(px, py,
                    Math.cos(a) * randRange(-30, 30), Math.sin(a) * randRange(-30, 30),
                    randRange(0.1, 0.22), randRange(2, 5),
                    ['#fff', '#d8e8f8', '#b0c0d0'][Math.floor(Math.random() * 3)],
                    0, true, true);
            }

            for (const m of this.game.spawner.monsters) {
                if (!m.alive || m.dying || m.spawning || w.hitIds.has(m.id)) continue;
                const d = dist(w.x, w.y, m.x, m.y);
                if (d > w.radius + m.hitboxRadius) continue;
                w.hitIds.add(m.id);
                const { damage, isCrit } = this._abilityDamage(player, w.damageMult);
                this._hitMonster(m, damage, isCrit, '#eef');
            }
        }
        this.whirlwinds = this.whirlwinds.filter(w => w.life > 0);
    }

    _drawWhirlwind(ctx, w) {
        const alpha = clamp(w.life / w.maxLife, 0, 1);
        const t = 1 - alpha;
        const pulse = 0.9 + Math.sin(w.spin * 1.5) * 0.1;

        ctx.save();
        ctx.translate(w.x, w.y);

        for (let ring = 0; ring < 4; ring++) {
            const rr = w.radius * (0.35 + ring * 0.22);
            if (rr < 8) continue;
            ctx.save();
            ctx.rotate(w.spin * (1 + ring * 0.15) + ring);
            ctx.globalAlpha = (0.12 + ring * 0.06) * alpha * pulse;
            ctx.strokeStyle = '#fff';
            ctx.lineWidth = 2 + ring;
            ctx.beginPath();
            ctx.arc(0, 0, rr, 0, Math.PI * 2);
            ctx.stroke();
            ctx.restore();
        }

        ctx.rotate(w.spin);
        const blades = 14;
        for (let i = 0; i < blades; i++) {
            const a = (i / blades) * Math.PI * 2;
            const inner = w.radius * (0.15 + t * 0.1);
            const outer = w.radius * (0.92 + (i % 3) * 0.04);
            const ex = Math.cos(a) * outer;
            const ey = Math.sin(a) * outer;
            const ix = Math.cos(a) * inner;
            const iy = Math.sin(a) * inner;

            ctx.globalAlpha = (0.5 + (i % 2) * 0.2) * alpha;
            ctx.strokeStyle = i % 3 === 0 ? '#fff' : (i % 2 === 0 ? '#d8e8f8' : '#98a8b8');
            ctx.lineWidth = i % 3 === 0 ? 5 : 3;
            ctx.lineCap = 'round';
            ctx.beginPath();
            ctx.moveTo(ix, iy);
            ctx.lineTo(ex, ey);
            ctx.stroke();

            ctx.globalAlpha = 0.75 * alpha;
            ctx.fillStyle = '#fff';
            ctx.fillRect(Math.floor(ex) - 2, Math.floor(ey) - 2, 4, 4);
        }

        ctx.globalAlpha = 0.35 * alpha * pulse;
        ctx.fillStyle = '#fff';
        ctx.beginPath();
        ctx.arc(0, 0, w.radius * 0.55, 0, Math.PI * 2);
        ctx.fill();

        ctx.globalAlpha = 0.65 * alpha;
        ctx.fillStyle = '#f0f8ff';
        ctx.beginPath();
        ctx.arc(0, 0, 10 + t * 6, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();
    }
}


// ---- sakura.js ----
class SakuraSystem {
    constructor() {
        this.petals = [];
        this.active = false;
        this.timer = 0;
        this.duration = 5.5;
        this.fadeOutDuration = 1.8;
    }

    start(worldW, worldH) {
        this.petals = [];
        this.active = true;
        this.timer = this.duration;
        const count = 42;
        for (let i = 0; i < count; i++) {
            this.petals.push({
                x: randRange(0, worldW),
                y: randRange(-worldH * 0.25, worldH * 0.08),
                vx: randRange(-18, 18),
                vy: randRange(28, 62),
                rot: randRange(0, Math.PI * 2),
                spin: randRange(-1.8, 1.8),
                sway: randRange(0.8, 2.2),
                swayPhase: randRange(0, Math.PI * 2),
                size: randRange(3, 7),
                color: ['#ffb7c5', '#ffc8d8', '#f8a0b0', '#ffe8ee', '#f5c6d0'][
                    Math.floor(Math.random() * 5)],
            });
        }
    }

    update(dt, worldW, worldH) {
        if (!this.active) return;
        this.timer -= dt;
        if (this.timer <= 0) {
            this.active = false;
            this.petals = [];
            return;
        }

        const fading = this.timer <= this.fadeOutDuration;

        for (const p of this.petals) {
            p.swayPhase += dt * p.sway;
            p.x += (p.vx + Math.sin(p.swayPhase) * 22) * dt;
            p.y += p.vy * dt;
            p.rot += p.spin * dt;

            if (!fading && p.y > worldH + 20) {
                p.y = randRange(-40, -8);
                p.x = randRange(0, worldW);
            }
            if (p.x < -20) p.x = worldW + 10;
            if (p.x > worldW + 20) p.x = -10;
        }
    }

    _getFadeAlpha() {
        if (this.timer <= this.fadeOutDuration) {
            return clamp(this.timer / this.fadeOutDuration, 0, 1);
        }
        return 1;
    }

    _drawPetal(ctx, p, masterAlpha) {
        const s = p.size;
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rot);
        ctx.fillStyle = p.color;
        ctx.globalAlpha = 0.82 * masterAlpha;

        for (let i = 0; i < 5; i++) {
            ctx.save();
            ctx.rotate((i / 5) * Math.PI * 2);
            ctx.beginPath();
            ctx.ellipse(0, -s * 0.55, s * 0.38, s * 0.72, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
        }

        ctx.fillStyle = '#fff5f8';
        ctx.globalAlpha = 0.55 * masterAlpha;
        ctx.beginPath();
        ctx.arc(0, 0, s * 0.18, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    }

    draw(ctx) {
        if (!this.active || this.petals.length === 0) return;
        const masterAlpha = this._getFadeAlpha();
        if (masterAlpha <= 0) return;

        ctx.save();
        ctx.globalAlpha = (0.4 + masterAlpha * 0.5) * masterAlpha;
        for (const p of this.petals) {
            this._drawPetal(ctx, p, masterAlpha);
        }
        ctx.restore();
    }
}


// ---- levelManager.js ----
class LevelManager {
    constructor() {
        this.chapter = 1;
        this.level = 0;
        this.allLevelsComplete = false;
        this.nextLevelOverride = null;

        this.bannerActive = false;
        this.bannerTimer = 0;
        this.bannerDuration = 0;
        this.bannerTitle = '';
        this.bannerSubtitle = '';
        this.bannerColor = '#fff';
        this.pendingStartLevel = false;
    }

    get totalLevels() {
        return CONFIG.LEVELS.length;
    }

    get currentLevelConfig() {
        return CONFIG.LEVELS[this.level] || null;
    }

    showBanner(title, subtitle, duration, color) {
        this.bannerActive = true;
        this.bannerTimer = duration;
        this.bannerDuration = duration;
        this.bannerTitle = title;
        this.bannerSubtitle = subtitle || '';
        this.bannerColor = color || '#fff';
    }

    showStageBanner() {
        const cfg = this.currentLevelConfig;
        if (isBossLevel(this.level)) {
            const bossKey = getBossKeyForLevel(this.level);
            const bossName = bossKey && CONFIG.BOSSES[bossKey]
                ? CONFIG.BOSSES[bossKey].name
                : '首领即将登场...';
            this.showBanner('⚠ BOSS战', bossName, 2.8, '#f84');
            return;
        }
        const sub = cfg ? `怪物 ${cfg.count} 只` : '';
        this.showBanner(`第 ${this.chapter} 章 · 第 ${this.level + 1} 关`, sub, 2.2, '#fff');
    }

    beginFirstLevel() {
        this.showStageBanner();
        this.pendingStartLevel = true;
    }

    onLevelCleared() {
        this.showBanner('关卡通过!', '准备下一关...', 1.1, '#4a3828');
    }

    setNextLevelOverride(index) {
        if (!Number.isInteger(index)) return;
        const clamped = clamp(index, 0, this.totalLevels - 1);
        this.nextLevelOverride = clamped;
    }

    update(dt) {
        if (!this.bannerActive) return null;

        this.bannerTimer -= dt;
        if (this.bannerTimer > 0) return null;

        this.bannerActive = false;

        if (this.pendingStartLevel) {
            this.pendingStartLevel = false;
            return 'START_LEVEL';
        }

        if (this.bannerTitle === '关卡通过!') {
            if (this.nextLevelOverride !== null) {
                this.level = this.nextLevelOverride;
                this.nextLevelOverride = null;
            } else {
                this.level++;
            }
            if (this.level >= this.totalLevels) {
                this.allLevelsComplete = true;
                return 'ALL_COMPLETE';
            }
            this.showStageBanner();
            return 'START_LEVEL';
        }

        return null;
    }

    drawBanner(ctx, vp, uiScale) {
        if (!this.bannerActive) return;

        const s = uiScale || 1;
        const t = this.bannerTimer / this.bannerDuration;
        const fadeIn = Math.min(1, (1 - t) / 0.15);
        const fadeOut = Math.min(1, t / 0.25);
        const alpha = Math.min(fadeIn, fadeOut);

        const boxW = Math.min(vp.w - 24 * s, 340 * s);
        const boxH = (this.bannerSubtitle ? 72 : 52) * s;
        const x = vp.x + (vp.w - boxW) / 2;
        const y = vp.y + 72 * s;

        ctx.globalAlpha = alpha;
        ctx.fillStyle = 'rgba(58, 48, 38, 0.82)';
        ctx.strokeStyle = 'rgba(130, 100, 72, 0.65)';
        ctx.lineWidth = 2;
        if (typeof ctx.roundRect === 'function') {
            ctx.beginPath();
            ctx.roundRect(x, y, boxW, boxH, 10);
            ctx.fill();
            ctx.stroke();
        } else {
            ctx.fillRect(x, y, boxW, boxH);
            ctx.strokeRect(x, y, boxW, boxH);
        }

        drawGameText(ctx, this.bannerTitle, vp.cx, y + boxH * 0.38,
            Math.round(18 * s), this.bannerColor);

        if (this.bannerSubtitle) {
            drawGameText(ctx, this.bannerSubtitle, vp.cx, y + boxH * 0.72,
                Math.round(13 * s), '#8a7a6a');
        }

        ctx.globalAlpha = 1;
    }

    drawComplete(ctx, vp, uiScale) {
        ctx.fillStyle = 'rgba(0, 0, 0, 0.75)';
        ctx.fillRect(vp.x, vp.y, vp.w, vp.h);

        const s = uiScale || 1;
        drawGameText(ctx, '恭喜通关!', vp.cx, vp.y + vp.h * 0.44, Math.round(24 * s), '#8a6020');
        drawGameText(ctx, '第一章 全部完成', vp.cx, vp.y + vp.h * 0.54, Math.round(16 * s), '#4a4038');
        drawGameText(ctx, '点击屏幕重新开始', vp.cx, vp.y + vp.h * 0.64, Math.round(14 * s), '#7a6a5a');
    }
}


// ---- ui.js ----
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


// ---- boss.js ----
class BossFireball {
    constructor(x, y, vx, vy, radius) {
        this.x = x;
        this.y = y;
        this.vx = vx;
        this.vy = vy;
        this.radius = radius;
        this.alive = true;
        this.spin = Math.random() * Math.PI * 2;
    }

    update(dt, canvasW, canvasH) {
        this.x += this.vx * dt;
        this.y += this.vy * dt;
        this.spin += dt * 10;
        if (this.x < -30 || this.x > canvasW + 30 ||
            this.y < -30 || this.y > canvasH + 30) {
            this.alive = false;
        }
    }

    draw(ctx) {
        if (!this.alive) return;
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate(this.spin);

        ctx.globalAlpha = 0.35;
        const glow = ctx.createRadialGradient(0, 0, 0, 0, 0, this.radius * 2.2);
        glow.addColorStop(0, 'rgba(255, 200, 80, 0.9)');
        glow.addColorStop(0.5, 'rgba(255, 80, 20, 0.4)');
        glow.addColorStop(1, 'rgba(255, 40, 0, 0)');
        ctx.fillStyle = glow;
        ctx.beginPath();
        ctx.arc(0, 0, this.radius * 2.2, 0, Math.PI * 2);
        ctx.fill();

        ctx.globalAlpha = 1;
        ctx.fillStyle = '#ff6620';
        ctx.beginPath();
        ctx.arc(0, 0, this.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#ffcc66';
        ctx.beginPath();
        ctx.arc(-this.radius * 0.2, -this.radius * 0.15, this.radius * 0.45, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    }
}

class FireDragonBoss {
    constructor(game, canvasW, canvasH, cfg) {
        this.game = game;
        this.cfg = cfg;
        this.alive = true;
        this.dying = false;
        this.deathHandled = false;
        this.chestDropped = false;
        this.deathTimer = 0;

        this.spriteScale = cfg.spriteScale || 5;
        this.animFrame = 0;
        this.animTimer = 0;

        const spr = SPRITES.fireDragon.idle[0];
        const sz = getSpriteSize(spr, this.spriteScale);
        this.x = canvasW / 2;
        this.y = sz.h * 0.52;
        this.canvasW = canvasW;

        const mouthRow = 17;
        this.mouthX = this.x;
        this.mouthY = this.y - sz.h / 2 + mouthRow * this.spriteScale + this.spriteScale * 0.5;

        this.hitboxRadius = cfg.hitboxRadius;
        this.hp = cfg.hp;
        this.maxHp = cfg.hp;
        this.def = cfg.def;
        this.xpValue = cfg.xp;
        this.color = cfg.color;
        this.size = cfg.hitboxRadius;

        this.attackTimer = cfg.introDelay;
    }

    takeDamage(rawDamage) {
        if (!this.alive || this.dying) return 0;
        const actual = Math.max(1, rawDamage - this.def);
        this.hp -= actual;
        if (this.hp <= 0) {
            this.hp = 0;
            this.dying = true;
            this.deathTimer = 0.8;
        }
        return actual;
    }

    update(dt) {
        if (this.dying) {
            this.deathTimer -= dt;
            if (this.deathTimer <= 0) this.alive = false;
            return;
        }

        this.animTimer += dt;
        if (this.animTimer >= 0.35) {
            this.animTimer = 0;
            this.animFrame = (this.animFrame + 1) % SPRITES.fireDragon.idle.length;
        }

        this.attackTimer -= dt;
        if (this.attackTimer > 0) return;

        this.attackTimer = this.cfg.attackInterval;
        const player = this.game.player;
        if (!player) return;
        this._attackFireballs(player);
    }

    _attackFireballs(player) {
        const mgr = this.game.bossManager;
        const mx = this.mouthX;
        const my = this.mouthY;
        const baseAng = Math.atan2(player.y - my, player.x - mx);
        const count = this.cfg.fireballCount;
        const spread = this.cfg.fireballSpread;

        for (let i = 0; i < count; i++) {
            const t = count > 1 ? (i / (count - 1)) - 0.5 : 0;
            const ang = baseAng + t * spread + randRange(-0.06, 0.06);
            const spd = this.cfg.fireballSpeed * randRange(0.88, 1.08);
            mgr.projectiles.push(new BossFireball(
                mx + Math.cos(ang) * 12,
                my + Math.sin(ang) * 12,
                Math.cos(ang) * spd,
                Math.sin(ang) * spd,
                this.cfg.fireballRadius
            ));
        }

        this.animFrame = 1;
        this.animTimer = 0;
        this.game.particles.spawnEffect(mx, my, '#f84');
        this.game.renderer.shake(5, 0.12);
    }

    draw(ctx) {
        const sprite = SPRITES.fireDragon.idle[this.animFrame];
        const alpha = this.dying ? clamp(this.deathTimer / 0.8, 0, 1) : 1;

        ctx.save();
        ctx.globalAlpha = alpha;

        const sz = getSpriteSize(sprite, this.spriteScale);
        const glowY = this.y + sz.h * 0.05;
        ctx.globalAlpha = 0.18 * alpha;
        const aura = ctx.createRadialGradient(this.x, glowY, 8, this.x, glowY, sz.w * 0.75);
        aura.addColorStop(0, 'rgba(255, 120, 40, 0.55)');
        aura.addColorStop(1, 'rgba(255, 40, 0, 0)');
        ctx.fillStyle = aura;
        ctx.beginPath();
        ctx.arc(this.x, glowY, sz.w * 0.75, 0, Math.PI * 2);
        ctx.fill();

        ctx.globalAlpha = alpha;
        drawSprite(ctx, sprite, Math.floor(this.x), Math.floor(this.y), this.spriteScale);
        ctx.restore();
    }
}

class BossManager {
    constructor(game) {
        this.game = game;
        this.boss = null;
        this.projectiles = [];
        this.introTimer = 0;
    }

    reset() {
        this.boss = null;
        this.projectiles = [];
        this.introTimer = 0;
    }

    prepareForLevel(levelIndex, canvasW, canvasH) {
        this.reset();
        const key = getBossKeyForLevel(levelIndex);
        if (key === 'FIRE_DRAGON') {
            const cfg = CONFIG.BOSSES.FIRE_DRAGON;
            this.boss = new FireDragonBoss(this.game, canvasW, canvasH, cfg);
            this.introTimer = cfg.introDelay;
        }
    }

    isActive() {
        return this.boss && this.boss.alive;
    }

    allClear() {
        if (this.boss) return !this.boss.alive;
        return true;
    }

    update(dt) {
        const w = this.game.renderer.w;
        const h = this.game.renderer.h;

        if (this.introTimer > 0) {
            this.introTimer -= dt;
        }

        if (this.boss && this.boss.alive && this.introTimer <= 0) {
            this.boss.update(dt);
        } else if (this.boss && this.boss.dying) {
            this.boss.update(dt);
            if (!this.boss.alive && !this.boss.deathHandled) {
                const combat = this.game.combat;
                if (combat) combat.onBossKilled(this.boss);
            }
        }

        for (const p of this.projectiles) {
            p.update(dt, w, h);
        }
        this.projectiles = this.projectiles.filter(p => p.alive);
    }

    draw(ctx) {
        if (this.boss && (this.boss.alive || this.boss.dying)) {
            this.boss.draw(ctx);
        }
    }

    drawProjectiles(ctx) {
        for (const p of this.projectiles) {
            p.draw(ctx);
        }
    }
}


// ---- combat.js ----
class CombatManager {
    constructor(game) {
        this.game = game;
        this.damageNumbers = [];
        this.pendingLightning = [];
    }

    onMonsterKilled(monster) {
        if (monster.deathHandled) return;
        monster.deathHandled = true;

        const { particles, experience, audio, bloodStains } = this.game;
        const intensity = monster.size > 13 ? 1.35 : 1;
        const player = this.game.player;
        const hitAngle = player
            ? angle(player.x, player.y, monster.x, monster.y)
            : Math.random() * Math.PI * 2;
        bloodStains.spawn(monster.x, monster.y + monster.hitboxRadius * 0.35, intensity, hitAngle);
        particles.deathEffect(monster.x, monster.y, monster.color);
        experience.spawnOrb(monster.x, monster.y, monster.xpValue);
        audio.playMonsterDeath();
    }

    onBossKilled(boss) {
        if (boss.deathHandled) return;
        boss.deathHandled = true;

        const { particles, experience, audio, renderer } = this.game;
        particles.deathEffect(boss.x, boss.y + 20, boss.color);
        for (let i = 0; i < 6; i++) {
            const a = (i / 6) * Math.PI * 2;
            const distR = 40 + i * 8;
            experience.spawnOrb(
                boss.x + Math.cos(a) * distR,
                boss.y + 20 + Math.sin(a) * distR * 0.4,
                boss.xpValue / 4
            );
        }
        renderer.shake(12, 0.35);
        audio.playMonsterDeath();
        if (this.game.bossChests) {
            this.game.bossChests.spawnForBoss(boss);
        }
    }

    update(dt) {
        this._updatePendingLightning(dt);

        const { player, spawner, projectiles, particles, renderer, experience } = this.game;

        if (player.state === PlayerState.ATTACKING) {
            this.checkAttackCollisions();
            this.checkBossAttackCollisions();
            this.checkShadowCloneCollisions();
            this.checkBossShadowCloneCollisions();
        }

        this.updateMonsterActions(dt);
        this.checkProjectileHits();
        this.checkBossProjectileHits();
        this.updateDamageNumbers(dt);
    }

    checkAttackCollisions() {
        const { player, spawner, particles, renderer } = this.game;

        for (const m of spawner.monsters) {
            if (!m.alive || m.dying || m.spawning) continue;

            const colliding = circlesCollide(
                player.x, player.y, player.effectiveRadius,
                m.x, m.y, m.hitboxRadius
            );

            if (colliding && !player.hitMonstersInSegment.has(m.id)) {
                player.hitMonstersInSegment.add(m.id);
                const combo = player.registerComboHit();
                if (this.game.abilities) {
                    this.game.abilities.onComboHit(combo);
                }
                const { damage, isCrit, isIaiCrit } = player.getDamage();
                const actualDmg = m.takeDamage(damage);

                this.spawnDamageNumber(m.x, m.y - m.hitboxRadius - 5, actualDmg, isCrit, null, combo, isIaiCrit);
                if (isIaiCrit) {
                    particles.iaiCritEffect(m.x, m.y);
                    renderer.shake(10, 0.2);
                } else {
                    particles.hitSpark(m.x, m.y, isCrit);
                }

                const a = angle(player.x, player.y, m.x, m.y);
                particles.slashTrail(m.x, m.y, a);

                renderer.shakeAttackHit(isCrit, combo);
                this.game.audio.playHit(isCrit);

                if (player.freezeChance > 0 && Math.random() < player.freezeChance) {
                    m.freeze(player.freezeDuration);
                    particles.freezeEffect(m.x, m.y);
                }

                if (player.lightningChains > 0) {
                    this.triggerLightningChain(m, actualDmg * 0.4);
                }

                if (m.dying) {
                    this.onMonsterKilled(m);
                }
            } else if (!colliding && player.hitMonstersInSegment.has(m.id)) {
                player.hitMonstersInSegment.delete(m.id);
            }
        }
    }

    _damageBoss(boss, damage, isCrit, combo, color, isIaiCrit = false) {
        const { particles, renderer } = this.game;
        const actualDmg = boss.takeDamage(damage);
        const yOff = boss.hitboxRadius ? -boss.hitboxRadius - 5 : -40;
        this.spawnDamageNumber(boss.x, boss.y + yOff, actualDmg, isCrit, color || '#fa4', combo, isIaiCrit);
        if (isIaiCrit) {
            particles.iaiCritEffect(boss.x, boss.y + 15);
            renderer.shake(10, 0.2);
        } else {
            particles.hitSpark(boss.x, boss.y + 15, isCrit);
        }
        renderer.shakeAttackHit(isCrit, combo);
        this.game.audio.playHit(isCrit);
        if (boss.dying) this.onBossKilled(boss);
        return actualDmg;
    }

    checkBossAttackCollisions() {
        const { player, bossManager } = this.game;
        const boss = bossManager && bossManager.boss;
        if (!boss || !boss.alive || boss.dying) return;

        const colliding = circlesCollide(
            player.x, player.y, player.effectiveRadius,
            boss.x, boss.y + 10, boss.hitboxRadius
        );

        if (colliding && !player.hitMonstersInSegment.has('boss')) {
            player.hitMonstersInSegment.add('boss');
            const combo = player.registerComboHit();
            if (this.game.abilities) this.game.abilities.onComboHit(combo);
            const { damage, isCrit, isIaiCrit } = player.getDamage();
            this._damageBoss(boss, damage, isCrit, combo, null, isIaiCrit);
        } else if (!colliding && player.hitMonstersInSegment.has('boss')) {
            player.hitMonstersInSegment.delete('boss');
        }
    }

    checkBossShadowCloneCollisions() {
        const { player, bossManager } = this.game;
        const boss = bossManager && bossManager.boss;
        if (!boss || !boss.alive || boss.dying) return;
        if (!player.shadowClonesActive || !player.shadowCloneSlots.length) return;

        const cloneRadius = player.effectiveRadius * 0.85;
        for (const clone of player.shadowCloneSlots) {
            if (!circlesCollide(clone.x, clone.y, cloneRadius,
                boss.x, boss.y + 10, boss.hitboxRadius)) continue;
            if (clone.hitMonstersInSegment.has('boss')) continue;
            clone.hitMonstersInSegment.add('boss');
            const { damage, isCrit } = player.getCloneDamage();
            this._damageBoss(boss, damage, isCrit, 0, '#a8a');
        }
    }

    checkBossProjectileHits() {
        const { player, bossManager, particles } = this.game;
        if (!bossManager) return;

        for (const p of bossManager.projectiles) {
            if (!p.alive) continue;

            if (player.isInAttackMode()) {
                if (circlesCollide(player.x, player.y, player.effectiveRadius + 8, p.x, p.y, p.radius)) {
                    p.alive = false;
                    particles.bulletShatter(p.x, p.y);
                    particles.hitSpark(p.x, p.y, false);
                    continue;
                }
            }

            if (player.isVulnerable()) {
                if (circlesCollide(player.x, player.y, player.effectiveRadius, p.x, p.y, p.radius)) {
                    p.alive = false;
                    if (player.takeDamage(CONFIG.PLAYER.DAMAGE_PER_HIT)) {
                        this.game.audio.playPlayerHurt();
                    }
                    particles.bulletShatter(p.x, p.y);
                }
            }
        }
    }

    checkShadowCloneCollisions() {
        const { player, spawner, particles, renderer } = this.game;
        if (!player.shadowClonesActive || !player.shadowCloneSlots.length) return;

        const cloneRadius = player.effectiveRadius * 0.85;

        for (const clone of player.shadowCloneSlots) {
            for (const m of spawner.monsters) {
                if (!m.alive || m.dying || m.spawning) continue;

                const colliding = circlesCollide(
                    clone.x, clone.y, cloneRadius,
                    m.x, m.y, m.hitboxRadius
                );

                if (colliding && !clone.hitMonstersInSegment.has(m.id)) {
                    clone.hitMonstersInSegment.add(m.id);
                    const { damage, isCrit } = player.getCloneDamage();
                    const actualDmg = m.takeDamage(damage);

                    this.spawnDamageNumber(m.x, m.y - m.hitboxRadius - 5, actualDmg, isCrit, '#a8a');
                    particles.hitSpark(m.x, m.y, isCrit);

                    if (isCrit) {
                        renderer.shake(CONFIG.SHAKE.NORMAL.magnitude, CONFIG.SHAKE.NORMAL.duration);
                    }
                    this.game.audio.playHit(isCrit);

                    if (m.dying) {
                        this.onMonsterKilled(m);
                    }
                } else if (!colliding && clone.hitMonstersInSegment.has(m.id)) {
                    clone.hitMonstersInSegment.delete(m.id);
                }
            }
        }
    }

    triggerLightningChain(sourceMonster, damage) {
        const { spawner } = this.game;
        const active = spawner.getActiveMonsters().filter(m => m.id !== sourceMonster.id && !m.spawning);

        active.sort((a, b) =>
            dist(sourceMonster.x, sourceMonster.y, a.x, a.y) -
            dist(sourceMonster.x, sourceMonster.y, b.x, b.y)
        );

        let prevX = sourceMonster.x;
        let prevY = sourceMonster.y;
        const maxChains = this.game.player.lightningChains;
        const dmg = Math.round(damage);
        const stepDelay = 0.16;

        for (let i = 0; i < Math.min(maxChains, active.length); i++) {
            const t = active[i];
            if (dist(prevX, prevY, t.x, t.y) > 200) break;

            this.pendingLightning.push({
                timer: i * stepDelay,
                fromX: prevX,
                fromY: prevY,
                toX: t.x,
                toY: t.y,
                target: t,
                damage: dmg,
                fired: false,
            });

            prevX = t.x;
            prevY = t.y;
        }
    }

    _updatePendingLightning(dt) {
        const { particles } = this.game;
        const keep = [];

        for (const step of this.pendingLightning) {
            step.timer -= dt;
            if (!step.fired && step.timer <= 0) {
                step.fired = true;
                const t = step.target;
                if (t.alive && !t.dying && !t.spawning) {
                    const actualDmg = t.takeDamage(step.damage);
                    this.spawnDamageNumber(
                        t.x, t.y - t.hitboxRadius - 5, actualDmg, false, '#ff0');
                    particles.lightningEffect(step.fromX, step.fromY, step.toX, step.toY);
                    if (t.dying) this.onMonsterKilled(t);
                }
            }
            if (!step.fired || step.timer > -0.35) keep.push(step);
        }

        this.pendingLightning = keep;
    }

    getMonsterTarget(player) {
        if (player.state === PlayerState.RETURNING) {
            return { x: player.x, y: player.y };
        }
        return { x: player.homeX, y: player.homeY };
    }

    updateMonsterActions(dt) {
        const { player, spawner, projectiles } = this.game;
        const target = this.getMonsterTarget(player);

        for (const m of spawner.monsters) {
            if (!m.alive) continue;
            const action = m.update(dt, target.x, target.y);
            if (!action) continue;

            if (action.type === 'shoot') {
                projectiles.spawn(action.x, action.y, action.angle);
            } else if (action.type === 'melee') {
                if (player.isVulnerable()) {
                    const d = dist(m.x, m.y, player.x, player.y);
                    if (d < m.range + player.effectiveRadius) {
                        if (player.takeDamage(CONFIG.PLAYER.DAMAGE_PER_HIT)) {
                            this.game.audio.playPlayerHurt();
                        }
                    }
                }
            }
        }
    }

    checkProjectileHits() {
        const { player, projectiles, particles } = this.game;

        for (const p of projectiles.projectiles) {
            if (!p.alive) continue;

            if (player.isInAttackMode()) {
                if (circlesCollide(player.x, player.y, player.effectiveRadius + 5, p.x, p.y, p.radius)) {
                    p.alive = false;
                    particles.bulletShatter(p.x, p.y);
                    continue;
                }
            }

            if (player.isVulnerable()) {
                if (circlesCollide(player.x, player.y, player.effectiveRadius, p.x, p.y, p.radius)) {
                    p.alive = false;
                    if (player.takeDamage(CONFIG.PLAYER.DAMAGE_PER_HIT)) {
                        this.game.audio.playPlayerHurt();
                    }
                    particles.bulletShatter(p.x, p.y);
                }
            }
        }
    }

    spawnDamageNumber(x, y, damage, isCrit, color = null, combo = 0, isIaiCrit = false) {
        this.damageNumbers.push({
            x, y,
            damage,
            isCrit,
            isIaiCrit,
            combo,
            color: isIaiCrit ? '#8ef' : (color || (isCrit ? '#ff0' : '#fff')),
            life: isIaiCrit ? 1.1 : 0.8,
            maxLife: isIaiCrit ? 1.1 : 0.8,
            vy: isIaiCrit ? -80 : -60,
        });
    }

    updateDamageNumbers(dt) {
        for (const d of this.damageNumbers) {
            d.life -= dt;
            d.y += d.vy * dt;
            d.vy *= 0.95;
        }
        this.damageNumbers = this.damageNumbers.filter(d => d.life > 0);
    }

    drawDamageNumbers(ctx) {
        const uiScale = this.game.renderer.uiScale || 1;
        for (const d of this.damageNumbers) {
            const alpha = d.life / d.maxLife;
            const scale = d.isIaiCrit ? 1.8 : (d.isCrit ? 1.4 : 1.0);
            const size = Math.floor((14 + d.damage * 0.3) * scale * uiScale);

            ctx.globalAlpha = alpha;
            if (d.isIaiCrit) {
                ctx.shadowColor = '#8ef';
                ctx.shadowBlur = 14;
            }
            drawGameText(ctx, String(d.damage), d.x, d.y, size, d.color);
            ctx.shadowBlur = 0;

            if (d.isIaiCrit) {
                drawGameText(ctx, '居合!', d.x, d.y - size * 0.9,
                    Math.floor(size * 0.5), '#adf');
            } else if (d.isCrit) {
                drawGameText(ctx, '暴击', d.x, d.y - size * 0.85,
                    Math.floor(size * 0.55), '#d44');
            }
            ctx.globalAlpha = 1;
        }
    }
}


// ---- monsterSpawner.js ----
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

        if (getBossKeyForLevel(levelIndex)) {
            return;
        }

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


// ---- input.js ----
class InputManager {
    constructor(canvas, game) {
        this.canvas = canvas;
        this.game = game;
        this.isDrawing = false;
        this.lastPoint = null;

        canvas.addEventListener('touchstart', (e) => this.onStart(e), { passive: false });
        canvas.addEventListener('touchmove', (e) => this.onMove(e), { passive: false });
        canvas.addEventListener('touchend', (e) => this.onEnd(e), { passive: false });
        canvas.addEventListener('touchcancel', (e) => this.onEnd(e), { passive: false });

        canvas.addEventListener('mousedown', (e) => this.onStart(e));
        canvas.addEventListener('mousemove', (e) => this.onMove(e));
        canvas.addEventListener('mouseup', (e) => this.onEnd(e));
    }

    _getClientPos(e) {
        if (e.touches && e.touches.length > 0) {
            return { clientX: e.touches[0].clientX, clientY: e.touches[0].clientY };
        }
        if (e.changedTouches && e.changedTouches.length > 0) {
            return { clientX: e.changedTouches[0].clientX, clientY: e.changedTouches[0].clientY };
        }
        return { clientX: e.clientX, clientY: e.clientY };
    }

    getPos(e) {
        const { clientX, clientY } = this._getClientPos(e);
        return this.game.renderer.screenToGame(clientX, clientY);
    }

    getCanvasPos(e) {
        const { clientX, clientY } = this._getClientPos(e);
        return this.game.renderer.screenToCanvas(clientX, clientY);
    }

    onStart(e) {
        if (this.game.state === 'PLAYING' && this.game.ui && this.game.player) {
            const pos = this.getCanvasPos(e);
            const vp = this.game.renderer.getViewport();
            const s = this.game.renderer.uiScale || 1;
            if (this.game.ui.isPauseButtonHit(pos.x, pos.y, vp, s)) {
                e.preventDefault();
                this.game.pauseGame();
                return;
            }
        }

        if (this.game.state !== 'PLAYING') return;

        e.preventDefault();
        const player = this.game.player;
        if (!player || player.state !== PlayerState.IDLE) return;

        const pos = this.getPos(e);
        if (!this.game.renderer.isGameInBounds(pos.x, pos.y)) return;

        const d = dist(pos.x, pos.y, player.homeX, player.homeY);
        if (d <= player.triggerRadius && player.ki > 10) {
            this.isDrawing = true;
            this.game.enterBulletTime();
            player.addPathPoint(player.homeX, player.homeY);
            player.addPathPoint(pos.x, pos.y);
            this.lastPoint = pos;
        }
    }

    onMove(e) {
        e.preventDefault();
        if (!this.isDrawing) return;
        const player = this.game.player;
        if (!player || player.state !== PlayerState.BULLET_TIME) return;
        if (player.ki <= 0) {
            this.onEnd(e);
            return;
        }

        const pos = this.getPos(e);
        if (!this.game.renderer.isGameInBounds(pos.x, pos.y)) return;

        player.addPathPoint(pos.x, pos.y);
        this.lastPoint = pos;
    }

    onEnd(e) {
        if (e) e.preventDefault();
        if (!this.isDrawing) return;
        this.isDrawing = false;
        const player = this.game.player;
        if (!player || player.state !== PlayerState.BULLET_TIME) return;
        this.game.exitBulletTime();
    }

    cancelActivePointer() {
        this.isDrawing = false;
        const player = this.game.player;
        if (!player || player.state !== PlayerState.BULLET_TIME) return;
        this.game.timeScale = CONFIG.NORMAL_TIME_SCALE;
        player.state = PlayerState.IDLE;
        player.attackPath = [];
    }
}


// ---- main.js ----
class Game {
    constructor() {
        this.canvas = document.getElementById('gameCanvas');
        this.renderer = new Renderer(this.canvas);
        this.ctx = this.renderer.ctx;

        this.state = 'MENU';
        this.timeScale = CONFIG.NORMAL_TIME_SCALE;
        this.lastTime = 0;

        this.player = null;
        this.spawner = new MonsterSpawner();
        this.projectiles = new ProjectileManager();
        this.particles = new ParticleSystem(600);
        this.combat = new CombatManager(this);
        this.experience = new ExperienceManager();
        this.upgrades = new UpgradeManager();
        this.bossRewards = new BossRewardManager();
        this.bossChests = new BossChestManager(this);
        this.levelManager = new LevelManager();
        this.ui = new UI();
        this.audio = new AudioHooks();
        this.bloodStains = new BloodStainSystem();
        this.abilities = new AbilityManager(this);
        this.sakura = new SakuraSystem();
        this.bossManager = new BossManager(this);
        this.input = null;

        this.levelCleared = false;
        this.pendingLevelUpCount = 0;
        this._lastTouchUiTime = 0;
        this._overlayDismissPending = false;
        this._overlayGestureActive = false;
        this._pointerDown = false;
        this.pauseOverlay = {
            passwordMode: false,
            passwordInput: '',
            debugUnlocked: false,
            debugLevelInput: '1',
            debugChapterInput: '1',
            debugStageInput: '1',
        };

        const trackPointerDown = () => { this._pointerDown = true; };
        const trackPointerUp = () => { this._pointerDown = false; };
        this.canvas.addEventListener('touchstart', trackPointerDown, { passive: true });
        this.canvas.addEventListener('mousedown', trackPointerDown);
        this.canvas.addEventListener('touchend', trackPointerUp, { passive: true });
        this.canvas.addEventListener('touchcancel', trackPointerUp);
        this.canvas.addEventListener('mouseup', trackPointerUp);

        this.upgrades.onSelect = () => {
            if (this.pendingLevelUpCount > 0) {
                this._tryStartLevelUp();
            } else {
                this.state = 'PLAYING';
            }
        };

        this.bossRewards.onSelect = () => {
            if (this.pendingLevelUpCount > 0) {
                this._tryStartLevelUp();
            } else {
                this.state = 'PLAYING';
            }
        };

        const overlayDown = (e) => {
            if (this.state === 'PLAYING' && this.ui && this.player) {
                const pos = this.getClickPos(e);
                const vp = this.renderer.getViewport();
                const s = this.renderer.uiScale || 1;
                if (this.ui.isPauseButtonHit(pos.x, pos.y, vp, s)) {
                    if (e.cancelable) e.preventDefault();
                    this.pauseGame();
                    return;
                }
            }
            if (this._isOverlayState()) this._onOverlayPointerDown(e);
        };
        const overlayUp = (e) => {
            if (this._isOverlayState()) this._onOverlayPointerUp(e);
        };
        this.canvas.addEventListener('touchstart', overlayDown, { passive: false });
        this.canvas.addEventListener('mousedown', overlayDown);
        this.canvas.addEventListener('touchend', overlayUp, { passive: false });
        this.canvas.addEventListener('touchcancel', overlayUp, { passive: false });
        this.canvas.addEventListener('mouseup', overlayUp);
        this.canvas.addEventListener('contextmenu', (e) => e.preventDefault());
        document.addEventListener('gesturestart', (e) => e.preventDefault(), { passive: false });
        document.addEventListener('gesturechange', (e) => e.preventDefault(), { passive: false });
        document.addEventListener('gestureend', (e) => e.preventDefault(), { passive: false });

        const onViewportChange = () => {
            this.renderer.resize();
            if (this.player) {
                this.player.homeX = this.renderer.w / 2;
                this.player.homeY = this.renderer.h / 2;
                if (this.player.state === PlayerState.IDLE) {
                    this.player.x = this.player.homeX;
                    this.player.y = this.player.homeY;
                }
            }
        };
        window.addEventListener('resize', onViewportChange);
        window.addEventListener('orientationchange', onViewportChange);
        if (window.visualViewport) {
            window.visualViewport.addEventListener('resize', onViewportChange);
            window.visualViewport.addEventListener('scroll', onViewportChange);
        }

        this.lastTime = performance.now();
        requestAnimationFrame((t) => this.loop(t));
    }

    _isOverlayState() {
        return this.state === 'MENU' || this.state === 'GAME_OVER' ||
            this.state === 'COMPLETE' || this.state === 'LEVEL_UP' ||
            this.state === 'BOSS_REWARD' || this.state === 'PAUSED';
    }

    _lockOverlayInput() {
        this._overlayGestureActive = false;
        this._overlayDismissPending = this._pointerDown;
        if (this.input) this.input.cancelActivePointer();
    }

    _onOverlayPointerDown(e) {
        if (this._overlayDismissPending) return;
        this._overlayGestureActive = true;
        if (e.cancelable) e.preventDefault();
    }

    _onOverlayPointerUp(e) {
        if (e.cancelable) e.preventDefault();
        this._lastTouchUiTime = performance.now();

        if (this._overlayDismissPending) {
            this._overlayDismissPending = false;
            return;
        }
        if (!this._overlayGestureActive) return;
        this._overlayGestureActive = false;

        const pos = this.getClickPos(e);

        if (this.state === 'LEVEL_UP') {
            const idx = this.upgrades.handleClick(pos.x, pos.y);
            if (idx >= 0) {
                this.upgrades.selectUpgrade(idx, this.player);
            }
            return;
        }

        if (this.state === 'BOSS_REWARD') {
            const idx = this.bossRewards.handleClick(pos.x, pos.y);
            if (idx >= 0) {
                this.bossRewards.selectReward(idx, this.player);
            }
            return;
        }

        if (this.state === 'PAUSED') {
            this.handlePauseOverlayClick(pos.x, pos.y);
            return;
        }

        if (this.state === 'MENU' || this.state === 'GAME_OVER' || this.state === 'COMPLETE') {
            this.startGame();
        }
    }

    getClickPos(e) {
        let clientX;
        let clientY;
        if (e.touches && e.touches.length > 0) {
            clientX = e.touches[0].clientX;
            clientY = e.touches[0].clientY;
        } else if (e.changedTouches && e.changedTouches.length > 0) {
            clientX = e.changedTouches[0].clientX;
            clientY = e.changedTouches[0].clientY;
        } else {
            clientX = e.clientX;
            clientY = e.clientY;
        }
        return this.renderer.screenToCanvas(clientX, clientY);
    }

    startGame() {
        const cx = this.renderer.w / 2;
        const cy = this.renderer.h / 2;
        this.player = new Player(cx, cy);
        this.spawner = new MonsterSpawner();
        this.projectiles = new ProjectileManager();
        this.particles = new ParticleSystem(600);
        this.combat = new CombatManager(this);
        this.experience = new ExperienceManager();
        this.upgrades = new UpgradeManager();
        this.bossRewards = new BossRewardManager();
        this.bossChests = new BossChestManager(this);
        this.levelManager = new LevelManager();
        this.audio = new AudioHooks();
        this.bloodStains = new BloodStainSystem();
        this.abilities.reset();
        this.bossManager = new BossManager(this);
        this.sakura.petals = [];
        this.sakura.active = false;
        this.levelCleared = false;
        this.pendingLevelUpCount = 0;

        this.upgrades.onSelect = () => {
            if (this.pendingLevelUpCount > 0) {
                this._tryStartLevelUp();
            } else {
                this.state = 'PLAYING';
            }
        };

        this.bossRewards.onSelect = () => {
            if (this.pendingLevelUpCount > 0) {
                this._tryStartLevelUp();
            } else {
                this.state = 'PLAYING';
            }
        };

        if (!this.input) {
            this.input = new InputManager(this.canvas, this);
        } else {
            this.input.game = this;
        }

        this.state = 'PLAYING';
        this.levelManager.beginFirstLevel();
    }

    pauseGame() {
        if (this.state !== 'PLAYING') return;
        this.state = 'PAUSED';
        this._lockOverlayInput();
    }

    resumeGame() {
        if (this.state !== 'PAUSED') return;
        this.state = 'PLAYING';
        this._tryStartLevelUp();
    }

    _queueLevelUps(count) {
        if (!this.player || !this.upgrades || count <= 0) return;
        this.pendingLevelUpCount += count;
        this._tryStartLevelUp();
    }

    _tryStartLevelUp() {
        if (this.pendingLevelUpCount <= 0) return;
        if (this.state === 'PAUSED' || this.state === 'MENU' ||
            this.state === 'GAME_OVER' || this.state === 'COMPLETE') return;
        if (!this.player || this.player.state !== PlayerState.IDLE) return;

        this.pendingLevelUpCount--;
        this.state = 'LEVEL_UP';
        this.upgrades.generateChoices();
        this._lockOverlayInput();
        this.audio.playLevelUp();
    }

    applyDebugLevel(targetLevel) {
        if (!this.player) return;
        const lv = clamp(Math.floor(targetLevel), 1, 99);
        const current = this.player.level;
        if (lv <= current) {
            this.player.level = lv;
            this.player.xp = 0;
            this.player.xpToNext = Math.floor(CONFIG.XP.BASE_REQUIRED * Math.pow(CONFIG.XP.SCALE_FACTOR, lv - 1));
            return;
        }
        this.player.level = lv;
        this.player.xp = 0;
        this.player.xpToNext = Math.floor(CONFIG.XP.BASE_REQUIRED * Math.pow(CONFIG.XP.SCALE_FACTOR, lv - 1));
        this._queueLevelUps(lv - current);
    }

    _syncDebugStageInputs() {
        if (!this.levelManager) return;
        this.pauseOverlay.debugChapterInput = String(this.levelManager.chapter);
        this.pauseOverlay.debugStageInput = String(this.levelManager.level + 1);
    }

    jumpToStage(chapter, stage) {
        const ch = Math.max(1, Math.floor(chapter));
        const st = clamp(Math.floor(stage), 1, 8);
        const levelIndex = clamp((ch - 1) * 8 + (st - 1), 0, CONFIG.LEVELS.length - 1);

        this.levelManager.chapter = ch;
        this.levelManager.level = levelIndex;
        this.levelManager.nextLevelOverride = null;
        this.levelManager.bannerActive = false;
        this.levelManager.pendingStartLevel = false;
        this.levelCleared = false;
        this.pendingLevelUpCount = 0;

        if (this.input) this.input.cancelActivePointer();
        this.timeScale = CONFIG.NORMAL_TIME_SCALE;

        if (this.player) {
            this.player.state = PlayerState.IDLE;
            this.player.x = this.player.homeX;
            this.player.y = this.player.homeY;
            this.player.attackPath = [];
            this.player.pathIndex = 0;
            this.player.pathProgress = 0;
            this.player.hitMonstersInSegment.clear();
        }

        this.spawner.monsters = [];
        this.spawner.spawnQueue = [];
        this.spawner.spawnTimer = 0;
        this.projectiles.projectiles = [];
        this.bossManager.reset();
        this.bossChests.reset();
        this.experience.orbs = [];

        this.sakura.start(this.renderer.w, this.renderer.h);
        this.spawner.prepareLevelSpawns(
            this.levelManager.level, this.renderer.w, this.renderer.h);
        this.bossManager.prepareForLevel(
            this.levelManager.level, this.renderer.w, this.renderer.h);

        this._syncDebugStageInputs();
        this.resumeGame();
    }

    handlePauseOverlayClick(x, y) {
        const ui = this.ui;
        if (!ui || !ui.pauseRects) return;
        const rects = ui.pauseRects;
        const hit = (r) => r && x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h;

        if (hit(rects.resume)) {
            this.resumeGame();
            return;
        }
        if (hit(rects.password)) {
            this.pauseOverlay.passwordMode = true;
            return;
        }
        if (this.pauseOverlay.passwordMode && !this.pauseOverlay.debugUnlocked) {
            for (const k of rects.keys || []) {
                if (!hit(k)) continue;
                if (k.key === 'C') {
                    this.pauseOverlay.passwordInput = '';
                } else if (k.key === 'OK') {
                    if (this.pauseOverlay.passwordInput === '1234') {
                        this.pauseOverlay.debugUnlocked = true;
                        this._syncDebugStageInputs();
                        this.pauseOverlay.debugLevelInput = String(this.player.level);
                    }
                    this.pauseOverlay.passwordInput = '';
                } else if (this.pauseOverlay.passwordInput.length < 8) {
                    this.pauseOverlay.passwordInput += k.key;
                }
                return;
            }
        }
        if (this.pauseOverlay.debugUnlocked) {
            if (hit(rects.levelMinus)) {
                const v = Math.max(1, parseInt(this.pauseOverlay.debugLevelInput || '1', 10) - 1);
                this.pauseOverlay.debugLevelInput = String(v);
                return;
            }
            if (hit(rects.levelPlus)) {
                const v = Math.min(99, parseInt(this.pauseOverlay.debugLevelInput || '1', 10) + 1);
                this.pauseOverlay.debugLevelInput = String(v);
                return;
            }
            if (hit(rects.levelApply)) {
                this.applyDebugLevel(parseInt(this.pauseOverlay.debugLevelInput || '1', 10));
                return;
            }
            if (hit(rects.chapterMinus)) {
                const v = Math.max(1, parseInt(this.pauseOverlay.debugChapterInput || '1', 10) - 1);
                this.pauseOverlay.debugChapterInput = String(v);
                return;
            }
            if (hit(rects.chapterPlus)) {
                const v = Math.min(9, parseInt(this.pauseOverlay.debugChapterInput || '1', 10) + 1);
                this.pauseOverlay.debugChapterInput = String(v);
                return;
            }
            if (hit(rects.stageMinus)) {
                const v = Math.max(1, parseInt(this.pauseOverlay.debugStageInput || '1', 10) - 1);
                this.pauseOverlay.debugStageInput = String(v);
                return;
            }
            if (hit(rects.stagePlus)) {
                const v = Math.min(8, parseInt(this.pauseOverlay.debugStageInput || '1', 10) + 1);
                this.pauseOverlay.debugStageInput = String(v);
                return;
            }
            if (hit(rects.stageApply)) {
                this.jumpToStage(
                    parseInt(this.pauseOverlay.debugChapterInput || '1', 10),
                    parseInt(this.pauseOverlay.debugStageInput || '1', 10)
                );
                return;
            }
        }
    }

    enterBulletTime() {
        this.timeScale = CONFIG.BULLET_TIME_SCALE;
        this.player.startBulletTime();
    }

    exitBulletTime() {
        this.timeScale = CONFIG.NORMAL_TIME_SCALE;
        this.player.startAttack();
        this.audio.playSlash();
    }

    loop(now) {
        const realDt = Math.min((now - this.lastTime) / 1000, 0.05);
        this.lastTime = now;
        const dt = realDt * this.timeScale;

        this.update(dt, realDt);
        this.draw();

        requestAnimationFrame((t) => this.loop(t));
    }

    update(dt, realDt) {
        if (this.state === 'MENU' || this.state === 'GAME_OVER' ||
            this.state === 'COMPLETE') return;

        this.renderer.updateShake(realDt);

        if (this.state === 'LEVEL_UP' || this.state === 'BOSS_REWARD') {
            this.particles.update(realDt);
            return;
        }
        if (this.state === 'PAUSED') {
            this.particles.update(realDt * 0.25);
            return;
        }

        if (this.state === 'PLAYING' || this.state === 'BULLET_TIME') {
            const levelEvent = this.levelManager.update(realDt);
            if (levelEvent === 'START_LEVEL') {
                this.levelCleared = false;
                this.sakura.start(this.renderer.w, this.renderer.h);
                this.spawner.prepareLevelSpawns(
                    this.levelManager.level, this.renderer.w, this.renderer.h);
                this.bossManager.prepareForLevel(
                    this.levelManager.level, this.renderer.w, this.renderer.h);
            } else if (levelEvent === 'ALL_COMPLETE') {
                this.state = 'COMPLETE';
                this._lockOverlayInput();
                return;
            }

            const isBulletTime = this.player.state === PlayerState.BULLET_TIME;

            this.player.update(dt, realDt);

            const prevMonsterCount = this.spawner.monsters.length;
            this.spawner.update(dt);
            for (let i = prevMonsterCount; i < this.spawner.monsters.length; i++) {
                const m = this.spawner.monsters[i];
                this.particles.spawnEffect(m.x, m.y, m.color);
            }

            this.projectiles.update(dt, this.renderer.w, this.renderer.h);
            this.bossManager.update(dt);
            this.abilities.update(dt);
            this.combat.update(dt);
            this.bossChests.update(dt);
            this.sakura.update(realDt, this.renderer.w, this.renderer.h);
            this.particles.update(realDt);

            if (this.player.state === PlayerState.ATTACKING) {
                const nextIdx = Math.min(this.player.pathIndex + 1, this.player.attackPath.length - 1);
                const a = this.player.attackPath.length > 1
                    ? angle(this.player.x, this.player.y,
                        this.player.attackPath[nextIdx].x, this.player.attackPath[nextIdx].y)
                    : 0;
                this.particles.slashTrail(this.player.x, this.player.y, a);
            }

            const xpGained = this.experience.update(
                dt, this.player.x, this.player.y, CONFIG.PLAYER.MAGNET_RADIUS);
            if (xpGained > 0) {
                this.particles.xpPickup(this.player.x, this.player.y);
                const leveledUp = this.player.addXP(xpGained);
                if (leveledUp) {
                    this.pendingLevelUpCount++;
                }
            }

            if (this.pendingLevelUpCount > 0 && this.player.state === PlayerState.IDLE) {
                this._tryStartLevelUp();
                if (this.state === 'LEVEL_UP') return;
            }

            if (this.player.isDead()) {
                this.state = 'GAME_OVER';
                this._lockOverlayInput();
                return;
            }

            if (!this.levelCleared && !this.levelManager.bannerActive &&
                this.spawner.allClear() && this.bossManager.allClear() &&
                !this.bossChests.hasActiveChest()) {
                this.levelCleared = true;
                this.levelManager.onLevelCleared();
            }
        }
    }

    draw() {
        const ctx = this.ctx;
        const w = this.renderer.w;
        const h = this.renderer.h;

        this.renderer.clear();
        this.renderer.resetScreenDraw();
        this.renderer.beginClippedGameDraw();

        if (this.state === 'MENU') {
            this.renderer.endClippedGameDraw();
            this.drawMenu();
            return;
        }

        if (this.state === 'GAME_OVER') {
            this.renderer.endClippedGameDraw();
            this.drawGameOver();
            return;
        }

        if (this.state === 'COMPLETE') {
            this.renderer.endClippedGameDraw();
            this.renderer.resetScreenDraw();
            const vp = this.renderer.getViewport();
            this.levelManager.drawComplete(ctx, vp, this.renderer.uiScale);
            return;
        }

        const isBulletTime = this.player && this.player.state === PlayerState.BULLET_TIME;

        this.sakura.draw(ctx);
        this.bloodStains.draw(ctx);
        this.experience.draw(ctx);

        for (const m of this.spawner.monsters) {
            m.draw(ctx);
        }

        this.bossManager.draw(ctx);

        this.abilities.drawBehind(ctx);

        this.projectiles.draw(ctx);
        this.bossManager.drawProjectiles(ctx);

        if (isBulletTime) {
            this.renderer.applyBulletTimeEffect(true);
        }

        if (this.player) {
            this.player.drawTriggerZone(ctx);
            if (isBulletTime || this.player.state === PlayerState.ATTACKING) {
                this.player.drawPath(ctx);
            }
            this.player.draw(ctx);
        }

        this.abilities.drawFront(ctx);
        this.particles.draw(ctx);
        this.bossChests.draw(ctx);
        this.combat.drawDamageNumbers(ctx);

        this.renderer.endClippedGameDraw();
        this.renderer.resetScreenDraw();
        const vp = this.renderer.getViewport();
        const uiScale = this.renderer.uiScale;

        ctx.save();
        this.renderer.clipViewport(ctx);

        if (this.player) {
            const boss = this.bossManager.boss;
            const hasBoss = !!(boss && (boss.alive || boss.dying));
            this.ui.draw(ctx, this.player, vp, uiScale, { hasBoss });
            if (hasBoss) {
                this.ui.drawBossBar(ctx, boss, vp, uiScale);
            }
        }

        this.levelManager.drawBanner(ctx, vp, uiScale);
        this.bossChests.drawHint(ctx, vp, uiScale);

        if (this.state === 'LEVEL_UP') {
            this.upgrades.drawUI(ctx, vp, uiScale);
        }
        if (this.state === 'BOSS_REWARD') {
            this.bossRewards.drawUI(ctx, vp, uiScale);
        }
        if (this.state === 'PAUSED') {
            this.ui.drawPauseButton(ctx, vp, uiScale, true);
            this.ui.drawPauseOverlay(ctx, vp, uiScale, this.pauseOverlay);
        } else if (this.state === 'PLAYING') {
            this.ui.drawPauseButton(ctx, vp, uiScale, false);
        }

        ctx.restore();
    }

    drawScreenText(ctx, vp, lines) {
        for (const line of lines) {
            const size = Math.round(line.size * (this.renderer.uiScale || 1));
            const y = typeof line.y === 'number' && line.y <= 1
                ? vp.y + vp.h * line.y
                : line.y;
            drawGameText(ctx, line.text, vp.cx, y, size, line.color);
        }
    }

    drawMenu() {
        const ctx = this.ctx;
        const vp = this.renderer.getViewport();

        this.renderer.resetScreenDraw();

        this.drawScreenText(ctx, vp, [
            { text: '忍者斩', y: 0.38, size: 40, bold: true, color: '#3a3028' },
            { text: 'NINJA SLASH', y: 0.45, size: 16, bold: false, color: '#6a5a48' },
            { text: '点击屏幕开始', y: 0.56, size: 18, bold: false, color: '#5a5048' },
            { text: '点击忍者身边的圆圈', y: 0.64, size: 15, bold: false, color: '#7a6a58' },
            { text: '画出攻击路径来消灭怪物', y: 0.70, size: 15, bold: false, color: '#7a6a58' },
        ]);
    }

    drawGameOver() {
        const ctx = this.ctx;
        const vp = this.renderer.getViewport();

        this.renderer.resetScreenDraw();

        ctx.save();
        this.renderer.clipViewport(ctx);
        ctx.fillStyle = 'rgba(0, 0, 0, 0.55)';
        ctx.fillRect(vp.x, vp.y, vp.w, vp.h);
        ctx.restore();

        this.drawScreenText(ctx, vp, [
            { text: '游戏结束', y: 0.42, size: 36, bold: true, color: '#f66' },
            { text: `到达: 第${this.levelManager.level + 1}关 | 等级: ${this.player.level}`, y: 0.52, size: 16, bold: false, color: '#fff' },
            { text: '点击屏幕重新开始', y: 0.62, size: 18, bold: false, color: '#aaa' },
        ]);
    }
}

window.addEventListener('DOMContentLoaded', () => {
    new Game();
});

})();
