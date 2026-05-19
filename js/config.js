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
        ORB_VALUE_SCALE: 0.25,
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
