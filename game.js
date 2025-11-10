// ゲーム設定
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// Canvas サイズの設定（レスポンシブ対応）
function resizeCanvas() {
    // ウィンドウサイズに応じてcanvasサイズを調整
    if (window.innerWidth <= 1250) {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
    } else {
        canvas.width = 1200;
        canvas.height = 800;
    }
}

// 初期サイズ設定
resizeCanvas();

// ウィンドウリサイズ時の処理
window.addEventListener('resize', () => {
    resizeCanvas();
});

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

// タッチ操作とバーチャルジョイスティック
let touchActive = false;
let touchTarget = { x: 0, y: 0 };

// バーチャルジョイスティッククラス
class VirtualJoystick {
    constructor() {
        this.baseX = 0;
        this.baseY = 0;
        this.stickX = 0;
        this.stickY = 0;
        this.radius = 60; // ジョイスティックの外側の半径
        this.stickRadius = 25; // スティックの半径
        this.maxDistance = 40; // スティックが移動できる最大距離
        this.active = false;
        this.direction = { x: 0, y: 0 }; // 正規化された方向ベクトル
    }

    start(x, y) {
        this.active = true;
        this.baseX = x;
        this.baseY = y;
        this.stickX = x;
        this.stickY = y;
        this.updateDirection();
    }

    move(x, y) {
        if (!this.active) return;

        const dx = x - this.baseX;
        const dy = y - this.baseY;
        const distance = Math.sqrt(dx * dx + dy * dy);

        // 最大距離を超えないように制限
        if (distance > this.maxDistance) {
            this.stickX = this.baseX + (dx / distance) * this.maxDistance;
            this.stickY = this.baseY + (dy / distance) * this.maxDistance;
        } else {
            this.stickX = x;
            this.stickY = y;
        }

        this.updateDirection();
    }

    end() {
        this.active = false;
        this.direction = { x: 0, y: 0 };
    }

    updateDirection() {
        const dx = this.stickX - this.baseX;
        const dy = this.stickY - this.baseY;
        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance > 5) { // デッドゾーン
            this.direction.x = dx / distance;
            this.direction.y = dy / distance;
        } else {
            this.direction.x = 0;
            this.direction.y = 0;
        }
    }

    draw(ctx) {
        if (!this.active) return;

        // 外側の円（ベース）
        ctx.fillStyle = 'rgba(100, 100, 100, 0.3)';
        ctx.beginPath();
        ctx.arc(this.baseX, this.baseY, this.radius, 0, Math.PI * 2);
        ctx.fill();

        // 外側の円の縁
        ctx.strokeStyle = 'rgba(150, 150, 150, 0.5)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(this.baseX, this.baseY, this.radius, 0, Math.PI * 2);
        ctx.stroke();

        // スティック
        ctx.fillStyle = 'rgba(200, 200, 200, 0.6)';
        ctx.beginPath();
        ctx.arc(this.stickX, this.stickY, this.stickRadius, 0, Math.PI * 2);
        ctx.fill();

        // スティックの縁
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(this.stickX, this.stickY, this.stickRadius, 0, Math.PI * 2);
        ctx.stroke();
    }
}

let joystick = new VirtualJoystick();

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
        // キーボード操作
        if (keys.w) this.y -= this.speed;
        if (keys.s) this.y += this.speed;
        if (keys.a) this.x -= this.speed;
        if (keys.d) this.x += this.speed;

        // バーチャルジョイスティック操作
        if (joystick.active) {
            this.x += joystick.direction.x * this.speed;
            this.y += joystick.direction.y * this.speed;
        }

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
        this.type = type;
        this.lastDamageTime = 0;

        // 敵タイプ別のステータス設定
        if (type === 'swarm') {
            // 群れ敵：小さくて弱いが、大量に出現（ハチ）
            this.width = 15;
            this.height = 15;
            this.speed = 2.5;
            this.health = 1;
            this.maxHealth = 1;
            this.damage = 5;
            this.expValue = 2;
            this.emoji = '🐝';
        } else if (type === 'tank') {
            // タンク敵：大きくて硬い、確実にレベルアップアイテムを落とす（ロボット）
            this.width = 40;
            this.height = 40;
            this.speed = 0.8;
            this.health = 20;
            this.maxHealth = 20;
            this.damage = 20;
            this.expValue = 30;
            this.emoji = '🤖';
            this.guaranteedDrop = true;
        } else {
            // 通常敵（エイリアン）
            this.width = 25;
            this.height = 25;
            this.speed = 1.2;
            this.health = 3;
            this.maxHealth = 3;
            this.damage = 10;
            this.expValue = 5;
            this.emoji = '👾';
        }
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
        // 絵文字で敵を描画
        ctx.font = `${this.width}px Arial`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(this.emoji, this.x, this.y);

        // 体力バー（タンク敵は少し大きめ）
        const healthBarWidth = this.width;
        const healthBarHeight = this.type === 'tank' ? 5 : 3;
        const healthBarY = this.y - this.height / 2 - (this.type === 'tank' ? 15 : 10);

        ctx.fillStyle = '#000';
        ctx.fillRect(this.x - healthBarWidth / 2, healthBarY, healthBarWidth, healthBarHeight);
        ctx.fillStyle = '#0F0';
        ctx.fillRect(this.x - healthBarWidth / 2, healthBarY,
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

// 経験値アイテムクラス
class ExpItem {
    constructor(x, y, value) {
        this.x = x;
        this.y = y;
        this.width = 12;
        this.height = 12;
        this.value = value;
        this.magnetRange = 80; // プレイヤーを引き寄せる範囲
        this.magnetSpeed = 2; // 引き寄せられる速度
    }

    update() {
        // プレイヤーとの距離を計算
        const dx = player.x - this.x;
        const dy = player.y - this.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        // プレイヤーが一定範囲内にいたら引き寄せられる
        if (distance < this.magnetRange) {
            const moveSpeed = this.magnetSpeed;
            this.x += (dx / distance) * moveSpeed;
            this.y += (dy / distance) * moveSpeed;
        }

        // プレイヤーと接触したかチェック
        if (distance < (this.width + player.width) / 2) {
            player.gainExp(this.value);
            return true; // 削除フラグ
        }

        return false;
    }

    draw() {
        // 経験値の結晶を描画
        ctx.fillStyle = '#00FFFF';
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.width / 2, 0, Math.PI * 2);
        ctx.fill();

        // 光る効果
        ctx.strokeStyle = '#FFFFFF';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.width / 2, 0, Math.PI * 2);
        ctx.stroke();
    }
}

// 弾丸クラス（基本弾）
class Projectile {
    constructor(x, y, targetX, targetY, damage = 1) {
        this.x = x;
        this.y = y;
        this.width = 8;
        this.height = 8;
        this.speed = 7;
        this.damage = damage;
        this.type = 'basic';

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

// スパイラル鎌クラス
class SpiralScythe {
    constructor(x, y, angle, damage = 2) {
        this.x = x;
        this.y = y;
        this.width = 20;
        this.height = 20;
        this.damage = damage;
        this.type = 'scythe';
        this.angle = angle; // 初期角度
        this.spiralRadius = 50; // スパイラルの半径
        this.spiralSpeed = 0.1; // 回転速度
        this.lifetime = 200; // 長めの寿命
        this.centerX = x;
        this.centerY = y;
    }

    update() {
        // スパイラル運動
        this.angle += this.spiralSpeed;
        this.spiralRadius += 1; // 徐々に外側へ

        this.x = this.centerX + Math.cos(this.angle) * this.spiralRadius;
        this.y = this.centerY + Math.sin(this.angle) * this.spiralRadius;

        this.lifetime--;
        return this.lifetime > 0 &&
               this.x > -50 && this.x < canvas.width + 50 &&
               this.y > -50 && this.y < canvas.height + 50;
    }

    draw() {
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate(this.angle);

        // 鎌の形状
        ctx.fillStyle = '#8B4513';
        ctx.fillRect(-3, -this.height / 2, 6, this.height); // 柄

        ctx.fillStyle = '#C0C0C0';
        ctx.beginPath();
        ctx.arc(0, -this.height / 2, this.width / 2, 0, Math.PI, true);
        ctx.fill();

        ctx.restore();
    }

    checkCollision(enemy) {
        return Math.abs(this.x - enemy.x) < (this.width + enemy.width) / 2 &&
               Math.abs(this.y - enemy.y) < (this.height + enemy.height) / 2;
    }
}

// 反射レーザークラス
class ReflectingLaser {
    constructor(x, y, angle, damage = 2) {
        this.x = x;
        this.y = y;
        this.width = 4;
        this.height = 4;
        this.damage = damage;
        this.type = 'laser';
        this.speed = 10;
        this.lifetime = 300;
        this.reflections = 0;
        this.maxReflections = 5;

        this.vx = Math.cos(angle) * this.speed;
        this.vy = Math.sin(angle) * this.speed;
    }

    update() {
        this.x += this.vx;
        this.y += this.vy;

        // 画面端で反射
        if (this.x <= 0 || this.x >= canvas.width) {
            this.vx = -this.vx;
            this.x = Math.max(0, Math.min(canvas.width, this.x));
            this.reflections++;
        }
        if (this.y <= 0 || this.y >= canvas.height) {
            this.vy = -this.vy;
            this.y = Math.max(0, Math.min(canvas.height, this.y));
            this.reflections++;
        }

        this.lifetime--;
        return this.lifetime > 0 && this.reflections < this.maxReflections;
    }

    draw() {
        // レーザー本体
        ctx.fillStyle = '#00FFFF';
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.width, 0, Math.PI * 2);
        ctx.fill();

        // レーザーの軌跡（光の効果）
        const gradient = ctx.createRadialGradient(this.x, this.y, 0, this.x, this.y, 10);
        gradient.addColorStop(0, 'rgba(0, 255, 255, 0.5)');
        gradient.addColorStop(1, 'rgba(0, 255, 255, 0)');
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(this.x, this.y, 10, 0, Math.PI * 2);
        ctx.fill();
    }

    checkCollision(enemy) {
        return Math.abs(this.x - enemy.x) < (this.width + enemy.width) / 2 &&
               Math.abs(this.y - enemy.y) < (this.height + enemy.height) / 2;
    }
}

// 爆発ボムクラス
class ExplosiveBomb {
    constructor(x, y, targetX, targetY, damage = 5) {
        this.x = x;
        this.y = y;
        this.startX = x;
        this.startY = y;
        this.targetX = targetX;
        this.targetY = targetY;
        this.width = 12;
        this.height = 12;
        this.damage = damage;
        this.type = 'bomb';
        this.speed = 4;
        this.lifetime = 100;
        this.exploded = false;
        this.explosionRadius = 80;
        this.explosionDuration = 20;
        this.explosionTimer = 0;

        // 放物線運動のパラメータ
        const dx = targetX - x;
        const dy = targetY - y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        this.vx = (dx / distance) * this.speed;
        this.vy = (dy / distance) * this.speed;
        this.arc = -0.15; // 上向きの弧を描く
    }

    update() {
        if (!this.exploded) {
            this.x += this.vx;
            this.y += this.vy;
            this.vy += this.arc; // 重力効果

            // 目標地点に到達したら爆発
            const distToTarget = Math.sqrt(
                (this.x - this.targetX) ** 2 + (this.y - this.targetY) ** 2
            );

            if (distToTarget < 10 || this.lifetime <= 0) {
                this.exploded = true;
                this.explosionTimer = this.explosionDuration;
            }

            this.lifetime--;
        } else {
            this.explosionTimer--;
            return this.explosionTimer > 0;
        }

        return true;
    }

    draw() {
        if (!this.exploded) {
            // ボム本体
            ctx.fillStyle = '#FF4500';
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.width / 2, 0, Math.PI * 2);
            ctx.fill();

            // 導火線（点滅効果）
            if (Math.floor(this.lifetime / 5) % 2 === 0) {
                ctx.fillStyle = '#FFD700';
                ctx.beginPath();
                ctx.arc(this.x, this.y - this.height / 2, 3, 0, Math.PI * 2);
                ctx.fill();
            }
        } else {
            // 爆発エフェクト
            const explosionProgress = 1 - (this.explosionTimer / this.explosionDuration);
            const currentRadius = this.explosionRadius * explosionProgress;

            // 外側の円
            const outerGradient = ctx.createRadialGradient(
                this.x, this.y, 0, this.x, this.y, currentRadius
            );
            outerGradient.addColorStop(0, 'rgba(255, 165, 0, 0.8)');
            outerGradient.addColorStop(0.5, 'rgba(255, 69, 0, 0.5)');
            outerGradient.addColorStop(1, 'rgba(255, 0, 0, 0)');

            ctx.fillStyle = outerGradient;
            ctx.beginPath();
            ctx.arc(this.x, this.y, currentRadius, 0, Math.PI * 2);
            ctx.fill();

            // 内側の明るい円
            const innerGradient = ctx.createRadialGradient(
                this.x, this.y, 0, this.x, this.y, currentRadius * 0.5
            );
            innerGradient.addColorStop(0, 'rgba(255, 255, 255, 0.9)');
            innerGradient.addColorStop(1, 'rgba(255, 255, 0, 0)');

            ctx.fillStyle = innerGradient;
            ctx.beginPath();
            ctx.arc(this.x, this.y, currentRadius * 0.5, 0, Math.PI * 2);
            ctx.fill();
        }
    }

    checkCollision(enemy) {
        if (!this.exploded) return false;

        const distance = Math.sqrt(
            (this.x - enemy.x) ** 2 + (this.y - enemy.y) ** 2
        );
        return distance < this.explosionRadius;
    }
}

// ブーメランクラス
class Boomerang {
    constructor(x, y, targetX, targetY, damage = 3) {
        this.x = x;
        this.y = y;
        this.startX = x;
        this.startY = y;
        this.width = 15;
        this.height = 15;
        this.damage = damage;
        this.type = 'boomerang';
        this.speed = 6;
        this.lifetime = 150;
        this.returning = false;
        this.rotationAngle = 0;

        const dx = targetX - x;
        const dy = targetY - y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        this.vx = (dx / distance) * this.speed;
        this.vy = (dy / distance) * this.speed;
        this.hitEnemies = new Set(); // 同じ敵に複数回当たらないようにする
    }

    update() {
        // 一定時間後に戻ってくる
        if (!this.returning && this.lifetime < 75) {
            this.returning = true;
        }

        if (this.returning) {
            // プレイヤーに向かって戻る
            const dx = player.x - this.x;
            const dy = player.y - this.y;
            const distance = Math.sqrt(dx * dx + dy * dy);

            if (distance > 5) {
                this.vx = (dx / distance) * this.speed;
                this.vy = (dy / distance) * this.speed;
            } else {
                // プレイヤーに到達したら削除
                return false;
            }
        }

        this.x += this.vx;
        this.y += this.vy;
        this.rotationAngle += 0.3; // 回転エフェクト
        this.lifetime--;

        return this.lifetime > 0;
    }

    draw() {
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate(this.rotationAngle);

        // ブーメランの形状
        ctx.fillStyle = '#FFD700';
        ctx.beginPath();
        ctx.moveTo(-this.width / 2, 0);
        ctx.arc(0, 0, this.width / 2, Math.PI, 0, false);
        ctx.lineTo(this.width / 2, 0);
        ctx.arc(0, 0, this.width / 2, 0, Math.PI, false);
        ctx.closePath();
        ctx.fill();

        ctx.strokeStyle = '#FFA500';
        ctx.lineWidth = 2;
        ctx.stroke();

        ctx.restore();
    }

    checkCollision(enemy) {
        // すでにヒットした敵はスキップ
        if (this.hitEnemies.has(enemy)) {
            return false;
        }

        const hit = Math.abs(this.x - enemy.x) < (this.width + enemy.width) / 2 &&
                    Math.abs(this.y - enemy.y) < (this.height + enemy.height) / 2;

        if (hit) {
            this.hitEnemies.add(enemy);
        }

        return hit;
    }
}

// ゲームオブジェクト
let player;
let enemies = [];
let projectiles = [];
let weapons = [];
let expItems = []; // 経験値アイテム配列

// 武器システム
class Weapon {
    constructor(name, type, damage, cooldown, count = 1) {
        this.name = name;
        this.type = type; // 'basic', 'scythe', 'boomerang', 'laser', 'bomb'
        this.damage = damage;
        this.baseDamage = damage;
        this.cooldown = cooldown;
        this.baseCooldown = cooldown;
        this.lastFire = 0;
        this.count = count;
        this.level = 1; // 武器レベル
        this.maxLevel = 5; // 最大レベル
    }

    canFire() {
        return Date.now() - this.lastFire > this.cooldown;
    }

    fire() {
        if (!this.canFire()) return;

        if (this.type === 'basic') {
            if (enemies.length === 0) return;

            const sortedEnemies = [...enemies].sort((a, b) => {
                const distA = Math.sqrt((a.x - player.x) ** 2 + (a.y - player.y) ** 2);
                const distB = Math.sqrt((b.x - player.x) ** 2 + (b.y - player.y) ** 2);
                return distA - distB;
            });

            for (let i = 0; i < Math.min(this.count, sortedEnemies.length); i++) {
                const target = sortedEnemies[i];
                projectiles.push(new Projectile(player.x, player.y, target.x, target.y, this.damage));
            }
        } else if (this.type === 'scythe') {
            for (let i = 0; i < this.count; i++) {
                const angle = (Math.PI * 2 / this.count) * i;
                projectiles.push(new SpiralScythe(player.x, player.y, angle, this.damage));
            }
        } else if (this.type === 'boomerang') {
            if (enemies.length === 0) return;

            const sortedEnemies = [...enemies].sort((a, b) => {
                const distA = Math.sqrt((a.x - player.x) ** 2 + (a.y - player.y) ** 2);
                const distB = Math.sqrt((b.x - player.x) ** 2 + (b.y - player.y) ** 2);
                return distA - distB;
            });

            for (let i = 0; i < Math.min(this.count, sortedEnemies.length); i++) {
                const target = sortedEnemies[i];
                projectiles.push(new Boomerang(player.x, player.y, target.x, target.y, this.damage));
            }
        } else if (this.type === 'laser') {
            // 反射レーザー：等間隔の角度で発射
            for (let i = 0; i < this.count; i++) {
                const angle = (Math.PI * 2 / this.count) * i + Date.now() * 0.001;
                projectiles.push(new ReflectingLaser(player.x, player.y, angle, this.damage));
            }
        } else if (this.type === 'bomb') {
            if (enemies.length === 0) return;

            const sortedEnemies = [...enemies].sort((a, b) => {
                const distA = Math.sqrt((a.x - player.x) ** 2 + (a.y - player.y) ** 2);
                const distB = Math.sqrt((b.x - player.x) ** 2 + (b.y - player.y) ** 2);
                return distA - distB;
            });

            for (let i = 0; i < Math.min(this.count, sortedEnemies.length); i++) {
                const target = sortedEnemies[i];
                projectiles.push(new ExplosiveBomb(player.x, player.y, target.x, target.y, this.damage));
            }
        }

        this.lastFire = Date.now();
    }

    upgrade() {
        if (this.level >= this.maxLevel) return false;

        this.level++;

        // レベルに応じたダメージとクールダウン向上
        this.damage = Math.floor(this.baseDamage * (1 + (this.level - 1) * 0.5));
        this.cooldown = Math.floor(this.baseCooldown * Math.pow(0.9, this.level - 1));

        // 特定レベルで弾数増加
        if (this.level === 2 || this.level === 4) {
            if (this.type === 'basic' || this.type === 'bomb') {
                this.count += 1;
            } else if (this.type === 'scythe' || this.type === 'laser') {
                this.count = Math.min(8, this.count + 1);
            } else if (this.type === 'boomerang') {
                this.count = Math.min(3, this.count + 1);
            }
        }

        return true;
    }

    getIcon() {
        // 武器タイプに応じたアイコン文字列
        const icons = {
            'basic': '🔫',
            'scythe': '🔪',
            'boomerang': '🪃',
            'laser': '⚡',
            'bomb': '💣'
        };
        return icons[this.type] || '⚔️';
    }
}

// アップグレードオプション
const upgradeTemplates = [
    {
        name: '基本攻撃強化',
        apply: () => {
            const basic = weapons.find(w => w.type === 'basic');
            if (basic && basic.upgrade()) {
                return `Lv.${basic.level} ダメージ:${basic.damage}`;
            }
            return null;
        }
    },
    { name: '最大体力+20', apply: () => { player.maxHealth += 20; player.health += 20; } },
    { name: '移動速度+10%', apply: () => { player.speed *= 1.1; } },
    { name: '体力回復', apply: () => { player.health = Math.min(player.maxHealth, player.health + 30); } },
    {
        name: 'スパイラル鎌',
        apply: () => {
            const existing = weapons.find(w => w.type === 'scythe');
            if (existing) {
                if (existing.upgrade()) {
                    return `Lv.${existing.level}`;
                }
                return null;
            } else {
                weapons.push(new Weapon('スパイラル鎌', 'scythe', 1, 2500, 2));
                return 'NEW!';
            }
        }
    },
    {
        name: 'ブーメラン',
        apply: () => {
            const existing = weapons.find(w => w.type === 'boomerang');
            if (existing) {
                if (existing.upgrade()) {
                    return `Lv.${existing.level}`;
                }
                return null;
            } else {
                weapons.push(new Weapon('ブーメラン', 'boomerang', 2, 3500, 1));
                return 'NEW!';
            }
        }
    },
    {
        name: '反射レーザー',
        apply: () => {
            const existing = weapons.find(w => w.type === 'laser');
            if (existing) {
                if (existing.upgrade()) {
                    return `Lv.${existing.level}`;
                }
                return null;
            } else {
                weapons.push(new Weapon('反射レーザー', 'laser', 1, 1500, 2));
                return 'NEW!';
            }
        }
    },
    {
        name: '爆発ボム',
        apply: () => {
            const existing = weapons.find(w => w.type === 'bomb');
            if (existing) {
                if (existing.upgrade()) {
                    return `Lv.${existing.level}`;
                }
                return null;
            } else {
                weapons.push(new Weapon('爆発ボム', 'bomb', 3, 4000, 1));
                return 'NEW!';
            }
        }
    }
];

// 敵のスポーン
function spawnEnemy(type = null) {
    const side = Math.floor(Math.random() * 4);
    let x, y;

    switch(side) {
        case 0: x = Math.random() * canvas.width; y = -30; break;
        case 1: x = canvas.width + 30; y = Math.random() * canvas.height; break;
        case 2: x = Math.random() * canvas.width; y = canvas.height + 30; break;
        case 3: x = -30; y = Math.random() * canvas.height; break;
    }

    // タイプが指定されていない場合は、時間に応じて決定
    if (!type) {
        const rand = Math.random();

        if (gameTime < 30) {
            // 最初の30秒は通常敵のみ
            type = 'normal';
        } else if (gameTime < 60) {
            // 30-60秒：通常と群れ敵
            type = rand < 0.7 ? 'normal' : 'swarm';
        } else if (gameTime < 120) {
            // 60-120秒：全タイプ、タンクは稀
            if (rand < 0.5) type = 'normal';
            else if (rand < 0.85) type = 'swarm';
            else type = 'tank';
        } else {
            // 120秒以降：バランス良く出現
            if (rand < 0.4) type = 'normal';
            else if (rand < 0.75) type = 'swarm';
            else type = 'tank';
        }
    }

    enemies.push(new Enemy(x, y, type));
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

// 武器アイコンを更新
function updateWeaponIcons() {
    const iconsDiv = document.getElementById('weaponIcons');
    iconsDiv.innerHTML = '';

    weapons.forEach(weapon => {
        const iconDiv = document.createElement('div');
        iconDiv.className = 'weapon-icon';

        const iconSpan = document.createElement('span');
        iconSpan.className = 'icon';
        iconSpan.textContent = weapon.getIcon();

        const levelSpan = document.createElement('span');
        levelSpan.className = 'level';
        levelSpan.textContent = `Lv.${weapon.level}`;

        iconDiv.appendChild(iconSpan);
        iconDiv.appendChild(levelSpan);
        iconsDiv.appendChild(iconDiv);
    });
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

    updateWeaponIcons();
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
    expItems = [];
    weapons = [new Weapon('基本攻撃', 'basic', 1, 1000, 1)]; // 初期は弱め
    gameTime = 0;
    score = 0;
    lastTime = performance.now(); // Date.now()から変更
    updateUI();
}

// ゲームループ
let enemySpawnTimer = 0;
let enemySpawnInterval = 1000; // 初期は1秒ごと

// 敵の出現数を時間に応じて計算
function getEnemySpawnCount() {
    // 30秒ごとに1体ずつ増加、最大10体まで
    return Math.min(10, Math.floor(gameTime / 30) + 1);
}

// 敵の出現間隔を時間に応じて計算
function getEnemySpawnInterval() {
    // 60秒ごとに100ms短縮、最低500msまで
    return Math.max(500, 1000 - Math.floor(gameTime / 60) * 100);
}

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

            // 爆発ボムの場合は、爆発した時に範囲内の敵全てにダメージ
            if (proj.type === 'bomb' && proj.exploded) {
                for (let i = enemies.length - 1; i >= 0; i--) {
                    if (proj.checkCollision(enemies[i])) {
                        if (enemies[i].takeDamage(proj.damage)) {
                            // 敵を倒したら経験値アイテムをドロップ
                            expItems.push(new ExpItem(enemies[i].x, enemies[i].y, enemies[i].expValue));
                            score += enemies[i].expValue;
                            enemies.splice(i, 1);
                        }
                    }
                }
            } else if (proj.type !== 'bomb') {
                // 通常の弾丸の衝突チェック
                for (let i = enemies.length - 1; i >= 0; i--) {
                    if (proj.checkCollision(enemies[i])) {
                        if (enemies[i].takeDamage(proj.damage)) {
                            // 敵を倒したら経験値アイテムをドロップ
                            expItems.push(new ExpItem(enemies[i].x, enemies[i].y, enemies[i].expValue));
                            score += enemies[i].expValue;
                            enemies.splice(i, 1);
                        }
                        // レーザーは貫通するため削除しない
                        if (proj.type !== 'laser') {
                            return false; // 弾丸削除
                        }
                    }
                }
            }
        }
        return alive;
    });

    // 敵のスポーン（動的に出現数と間隔を調整）
    enemySpawnInterval = getEnemySpawnInterval();
    enemySpawnTimer += deltaTime;
    if (enemySpawnTimer > enemySpawnInterval) {
        const spawnCount = getEnemySpawnCount();
        for (let i = 0; i < spawnCount; i++) {
            const enemyType = determineEnemyType();

            // 群れ敵の場合は、3-5匹まとめてスポーン
            if (enemyType === 'swarm') {
                const swarmCount = Math.floor(Math.random() * 3) + 3; // 3-5匹
                const side = Math.floor(Math.random() * 4);

                for (let j = 0; j < swarmCount; j++) {
                    let x, y;
                    const offset = (Math.random() - 0.5) * 100; // ランダムなオフセット

                    switch(side) {
                        case 0:
                            x = Math.random() * canvas.width;
                            y = -30 + offset;
                            break;
                        case 1:
                            x = canvas.width + 30 + offset;
                            y = Math.random() * canvas.height;
                            break;
                        case 2:
                            x = Math.random() * canvas.width;
                            y = canvas.height + 30 + offset;
                            break;
                        case 3:
                            x = -30 + offset;
                            y = Math.random() * canvas.height;
                            break;
                    }

                    enemies.push(new Enemy(x, y, 'swarm'));
                }
            } else {
                spawnEnemy(enemyType);
            }
        }
        enemySpawnTimer = 0;
    }

    // 敵のタイプを決定する関数
    function determineEnemyType() {
        const rand = Math.random();

        if (gameTime < 30) {
            return 'normal';
        } else if (gameTime < 60) {
            return rand < 0.7 ? 'normal' : 'swarm';
        } else if (gameTime < 120) {
            if (rand < 0.4) return 'normal';
            else if (rand < 0.85) return 'swarm';
            else return 'tank';
        } else {
            if (rand < 0.35) return 'normal';
            else if (rand < 0.75) return 'swarm';
            else return 'tank';
        }
    }

    // 敵更新・描画
    enemies.forEach(enemy => {
        enemy.update();
        enemy.draw();
    });

    // 経験値アイテム更新・描画
    expItems = expItems.filter(item => {
        const collected = item.update();
        if (!collected) {
            item.draw();
        }
        return !collected;
    });

    // ジョイスティック描画
    joystick.draw(ctx);

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

// タッチイベント（スマホ対応 - バーチャルジョイスティック）
function getTouchPos(e) {
    const rect = canvas.getBoundingClientRect();
    const touch = e.touches[0] || e.changedTouches[0];
    return {
        x: touch.clientX - rect.left,
        y: touch.clientY - rect.top
    };
}

canvas.addEventListener('touchstart', (e) => {
    e.preventDefault();
    if (gameState !== 'playing') return;

    const pos = getTouchPos(e);
    joystick.start(pos.x, pos.y);
});

canvas.addEventListener('touchmove', (e) => {
    e.preventDefault();
    if (gameState !== 'playing') return;

    const pos = getTouchPos(e);
    joystick.move(pos.x, pos.y);
});

canvas.addEventListener('touchend', (e) => {
    e.preventDefault();
    joystick.end();
});

canvas.addEventListener('touchcancel', (e) => {
    e.preventDefault();
    joystick.end();
});

document.getElementById('startBtn').addEventListener('click', () => {
    document.getElementById('startMenu').classList.add('hidden');
    gameState = 'playing';
    initGame();
    lastTime = performance.now(); // Date.now()から変更
    gameLoop(lastTime);
});

document.getElementById('restartBtn').addEventListener('click', () => {
    document.getElementById('gameOverMenu').classList.add('hidden');
    gameState = 'playing';
    initGame();
    lastTime = performance.now(); // Date.now()から変更
});

// DOMが完全に読み込まれたことを確認（自動初期化は削除）
// スタートボタンを押すまでゲームは開始しない
