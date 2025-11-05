// ゲーム設定
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// 画像の設定（ここで画像パスを変更できます）
const playerImagePath = 'player.png'; // プレイヤー画像のパス（nullにすると四角形で描画）
let playerImage = null;
let playerImageLoaded = false;

// プレイヤー画像の読み込み
if (playerImagePath) {
    playerImage = new Image();
    playerImage.onload = () => {
        playerImageLoaded = true;
        console.log('プレイヤー画像を読み込みました');
    };
    playerImage.onerror = () => {
        console.log('プレイヤー画像の読み込みに失敗しました。デフォルトの四角形で描画します。');
        playerImageLoaded = false;
    };
    playerImage.src = playerImagePath;
}

// ゲーム状態
let gameState = 'start'; // start, playing, levelup, gameover
let gameTime = 0;
let score = 0;
let lastTime = 0;

// キー入力
const keys = {
    w: false,
    a: false,
    s: false,
    d: false
};

// プレイヤークラス
class Player {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.width = 30;
        this.height = 30;
        this.speed = 3;
        this.maxHealth = 100;
        this.health = 100;
        this.level = 1;
        this.exp = 0;
        this.expToNextLevel = 10;
    }

    update() {
        if (keys.w) this.y -= this.speed;
        if (keys.s) this.y += this.speed;
        if (keys.a) this.x -= this.speed;
        if (keys.d) this.x += this.speed;

        // 画面外に出ないようにする
        this.x = Math.max(this.width / 2, Math.min(canvas.width - this.width / 2, this.x));
        this.y = Math.max(this.height / 2, Math.min(canvas.height - this.height / 2, this.y));
    }

    draw() {
        if (playerImageLoaded && playerImage) {
            // 画像を描画
            ctx.drawImage(
                playerImage,
                this.x - this.width / 2,
                this.y - this.height / 2,
                this.width,
                this.height
            );
        } else {
            // デフォルトの四角形を描画
            ctx.fillStyle = '#4CAF50';
            ctx.fillRect(this.x - this.width / 2, this.y - this.height / 2, this.width, this.height);

            // プレイヤーの目
            ctx.fillStyle = '#FFF';
            ctx.fillRect(this.x - 7, this.y - 7, 5, 5);
            ctx.fillRect(this.x + 2, this.y - 7, 5, 5);
        }
    }

    takeDamage(damage) {
        this.health -= damage;
        if (this.health <= 0) {
            this.health = 0;
            gameState = 'gameover';
            showGameOver();
        }
    }

    gainExp(amount) {
        this.exp += amount;
        if (this.exp >= this.expToNextLevel) {
            this.levelUp();
        }
    }

    levelUp() {
        this.level++;
        this.exp = 0;
        this.expToNextLevel = Math.floor(this.expToNextLevel * 1.5);
        gameState = 'levelup';
        showLevelUpMenu();
    }
}

// 敵クラス
class Enemy {
    constructor(x, y, type = 'normal') {
        this.x = x;
        this.y = y;
        this.width = 25;
        this.height = 25;
        this.speed = 1.5;
        this.health = 3;
        this.maxHealth = 3;
        this.damage = 10;
        this.expValue = 5;
        this.type = type;
        this.lastDamageTime = 0;
    }

    update() {
        // プレイヤーに向かって移動
        const dx = player.x - this.x;
        const dy = player.y - this.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance > 0) {
            this.x += (dx / distance) * this.speed;
            this.y += (dy / distance) * this.speed;
        }

        // プレイヤーとの衝突判定
        if (this.checkCollision(player)) {
            const currentTime = Date.now();
            if (currentTime - this.lastDamageTime > 1000) {
                player.takeDamage(this.damage);
                this.lastDamageTime = currentTime;
            }
        }
    }

    draw() {
        // 敵の体
        ctx.fillStyle = '#F44336';
        ctx.fillRect(this.x - this.width / 2, this.y - this.height / 2, this.width, this.height);

        // 体力バー
        const healthBarWidth = this.width;
        const healthBarHeight = 3;
        ctx.fillStyle = '#000';
        ctx.fillRect(this.x - healthBarWidth / 2, this.y - this.height / 2 - 8, healthBarWidth, healthBarHeight);
        ctx.fillStyle = '#0F0';
        ctx.fillRect(this.x - healthBarWidth / 2, this.y - this.height / 2 - 8,
                     healthBarWidth * (this.health / this.maxHealth), healthBarHeight);
    }

    checkCollision(other) {
        return Math.abs(this.x - other.x) < (this.width + other.width) / 2 &&
               Math.abs(this.y - other.y) < (this.height + other.height) / 2;
    }

    takeDamage(damage) {
        this.health -= damage;
        return this.health <= 0;
    }
}

// 弾丸クラス
class Projectile {
    constructor(x, y, targetX, targetY, damage = 1) {
        this.x = x;
        this.y = y;
        this.width = 8;
        this.height = 8;
        this.speed = 7;
        this.damage = damage;

        const dx = targetX - x;
        const dy = targetY - y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        this.vx = (dx / distance) * this.speed;
        this.vy = (dy / distance) * this.speed;
        this.lifetime = 100;
    }

    update() {
        this.x += this.vx;
        this.y += this.vy;
        this.lifetime--;
        return this.lifetime > 0 &&
               this.x > 0 && this.x < canvas.width &&
               this.y > 0 && this.y < canvas.height;
    }

    draw() {
        ctx.fillStyle = '#FFC107';
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.width / 2, 0, Math.PI * 2);
        ctx.fill();
    }

    checkCollision(enemy) {
        return Math.abs(this.x - enemy.x) < (this.width + enemy.width) / 2 &&
               Math.abs(this.y - enemy.y) < (this.height + enemy.height) / 2;
    }
}

// ゲームオブジェクト
let player;
let enemies = [];
let projectiles = [];
let weapons = [];

// 武器システム
class Weapon {
    constructor(name, damage, cooldown, count = 1) {
        this.name = name;
        this.damage = damage;
        this.cooldown = cooldown;
        this.lastFire = 0;
        this.count = count; // 同時発射数
    }

    canFire() {
        return Date.now() - this.lastFire > this.cooldown;
    }

    fire() {
        if (!this.canFire() || enemies.length === 0) return;

        // 最も近い敵を見つけて攻撃
        const sortedEnemies = [...enemies].sort((a, b) => {
            const distA = Math.sqrt((a.x - player.x) ** 2 + (a.y - player.y) ** 2);
            const distB = Math.sqrt((b.x - player.x) ** 2 + (b.y - player.y) ** 2);
            return distA - distB;
        });

        for (let i = 0; i < Math.min(this.count, sortedEnemies.length); i++) {
            const target = sortedEnemies[i];
            projectiles.push(new Projectile(player.x, player.y, target.x, target.y, this.damage));
        }

        this.lastFire = Date.now();
    }

    upgrade() {
        this.damage += 1;
        this.count += 1;
    }
}

// アップグレードオプション
const upgradeTemplates = [
    { name: '攻撃力+1', apply: () => { if(weapons[0]) weapons[0].damage += 1; } },
    { name: '攻撃速度+20%', apply: () => { if(weapons[0]) weapons[0].cooldown *= 0.8; } },
    { name: '弾数+1', apply: () => { if(weapons[0]) weapons[0].count += 1; } },
    { name: '最大体力+20', apply: () => { player.maxHealth += 20; player.health += 20; } },
    { name: '移動速度+10%', apply: () => { player.speed *= 1.1; } },
    { name: '体力回復', apply: () => { player.health = Math.min(player.maxHealth, player.health + 30); } }
];

// 敵のスポーン
function spawnEnemy() {
    const side = Math.floor(Math.random() * 4);
    let x, y;

    switch(side) {
        case 0: x = Math.random() * canvas.width; y = -30; break;
        case 1: x = canvas.width + 30; y = Math.random() * canvas.height; break;
        case 2: x = Math.random() * canvas.width; y = canvas.height + 30; break;
        case 3: x = -30; y = Math.random() * canvas.height; break;
    }

    enemies.push(new Enemy(x, y));
}

// レベルアップメニュー表示
function showLevelUpMenu() {
    const menu = document.getElementById('levelUpMenu');
    const optionsDiv = document.getElementById('upgradeOptions');
    optionsDiv.innerHTML = '';

    // ランダムに3つのアップグレードを選択
    const shuffled = [...upgradeTemplates].sort(() => Math.random() - 0.5);
    const options = shuffled.slice(0, 3);

    options.forEach((upgrade, index) => {
        const btn = document.createElement('button');
        btn.className = 'upgrade-btn';
        btn.textContent = upgrade.name;
        btn.onclick = () => {
            upgrade.apply();
            menu.classList.add('hidden');
            gameState = 'playing';
            updateUI();
        };
        optionsDiv.appendChild(btn);
    });

    menu.classList.remove('hidden');
}

// ゲームオーバー表示
function showGameOver() {
    const menu = document.getElementById('gameOverMenu');
    document.getElementById('finalScore').textContent = score;
    document.getElementById('survivalTime').textContent = formatTime(gameTime);
    menu.classList.remove('hidden');
}

// UI更新
function updateUI() {
    document.getElementById('level').textContent = player.level;
    document.getElementById('score').textContent = score;
    document.getElementById('time').textContent = formatTime(gameTime);

    const healthPercent = (player.health / player.maxHealth) * 100;
    document.getElementById('healthBar').style.width = healthPercent + '%';

    const expPercent = (player.exp / player.expToNextLevel) * 100;
    document.getElementById('expBar').style.width = expPercent + '%';
}

function formatTime(seconds) {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
}

// ゲーム初期化
function initGame() {
    player = new Player(canvas.width / 2, canvas.height / 2);
    enemies = [];
    projectiles = [];
    weapons = [new Weapon('基本攻撃', 1, 1000, 1)];
    gameTime = 0;
    score = 0;
    lastTime = Date.now();
    updateUI();
}

// ゲームループ
let enemySpawnTimer = 0;
const enemySpawnInterval = 2000; // 2秒ごと

function gameLoop(currentTime) {
    requestAnimationFrame(gameLoop);

    if (gameState !== 'playing') return;

    const deltaTime = currentTime - lastTime;
    lastTime = currentTime;
    gameTime += deltaTime / 1000;

    // 背景
    ctx.fillStyle = '#1a1a2e';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // グリッド描画（雰囲気作り）
    ctx.strokeStyle = '#0f0f1e';
    ctx.lineWidth = 1;
    for (let i = 0; i < canvas.width; i += 50) {
        ctx.beginPath();
        ctx.moveTo(i, 0);
        ctx.lineTo(i, canvas.height);
        ctx.stroke();
    }
    for (let i = 0; i < canvas.height; i += 50) {
        ctx.beginPath();
        ctx.moveTo(0, i);
        ctx.lineTo(canvas.width, i);
        ctx.stroke();
    }

    // プレイヤー更新・描画
    player.update();
    player.draw();

    // 武器発射
    weapons.forEach(weapon => weapon.fire());

    // 弾丸更新・描画
    projectiles = projectiles.filter(proj => {
        const alive = proj.update();
        if (alive) {
            proj.draw();

            // 敵との衝突チェック
            for (let i = enemies.length - 1; i >= 0; i--) {
                if (proj.checkCollision(enemies[i])) {
                    if (enemies[i].takeDamage(proj.damage)) {
                        score += enemies[i].expValue;
                        player.gainExp(enemies[i].expValue);
                        enemies.splice(i, 1);
                    }
                    return false; // 弾丸削除
                }
            }
        }
        return alive;
    });

    // 敵のスポーン
    enemySpawnTimer += deltaTime;
    if (enemySpawnTimer > enemySpawnInterval) {
        const spawnCount = Math.min(5, Math.floor(gameTime / 30) + 1);
        for (let i = 0; i < spawnCount; i++) {
            spawnEnemy();
        }
        enemySpawnTimer = 0;
    }

    // 敵更新・描画
    enemies.forEach(enemy => {
        enemy.update();
        enemy.draw();
    });

    updateUI();
}

// イベントリスナー
window.addEventListener('keydown', (e) => {
    const key = e.key.toLowerCase();
    if (keys.hasOwnProperty(key)) {
        keys[key] = true;
    }
});

window.addEventListener('keyup', (e) => {
    const key = e.key.toLowerCase();
    if (keys.hasOwnProperty(key)) {
        keys[key] = false;
    }
});

document.getElementById('startBtn').addEventListener('click', () => {
    document.getElementById('startMenu').classList.add('hidden');
    gameState = 'playing';
    initGame();
    lastTime = Date.now();
    gameLoop(lastTime);
});

document.getElementById('restartBtn').addEventListener('click', () => {
    document.getElementById('gameOverMenu').classList.add('hidden');
    gameState = 'playing';
    initGame();
    lastTime = Date.now();
});

// ゲーム開始
initGame();
