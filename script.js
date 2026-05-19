/**
 * SNAKE GAME - PRO EDITION
 * Fitur: requestAnimationFrame, Particle System, Audio Synthesizer, Dynamic Speed
 */

const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

// Konfigurasi Grid
const gridSize = 20;
const tileCount = canvas.width / gridSize;

// Variabel Game
let snake, food, particles;
let score = 0;
let highScore = localStorage.getItem("snakeProHigh") || 0;
let gameOver = false;
let gameRunning = false;

// Variabel Waktu (Delta Time)
let lastTime = 0;
let timer = 0;
let speedMs = 120; // Kecepatan awal (makin kecil makin cepat)

// Audio Context (Suara)
let audioCtx;

// --- KELAS SISTEM PARTIKEL ---
class Particle {
    constructor(x, y, color) {
        this.x = x; this.y = y; this.color = color;
        this.size = Math.random() * 4 + 2;
        this.speedX = (Math.random() - 0.5) * 8;
        this.speedY = (Math.random() - 0.5) * 8;
        this.life = 1.0; // Opacity awal
    }
    update() {
        this.x += this.speedX;
        this.y += this.speedY;
        this.life -= 0.05; // Menghilang perlahan
    }
    draw(context) {
        context.globalAlpha = Math.max(0, this.life);
        context.fillStyle = this.color;
        context.fillRect(this.x, this.y, this.size, this.size);
        context.globalAlpha = 1.0;
    }
}

// --- FUNGSI AUDIO SINTETIS ---
function playSound(type) {
    if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    if (audioCtx.state === 'suspended') audioCtx.resume();
    
    const osc = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();
    osc.connect(gainNode);
    gainNode.connect(audioCtx.destination);
    
    if (type === 'eat') {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(800, audioCtx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(1200, audioCtx.currentTime + 0.1);
        gainNode.gain.setValueAtTime(0.3, audioCtx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.1);
        osc.start(); osc.stop(audioCtx.currentTime + 0.1);
    } else if (type === 'die') {
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(150, audioCtx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(40, audioCtx.currentTime + 0.3);
        gainNode.gain.setValueAtTime(0.5, audioCtx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.3);
        osc.start(); osc.stop(audioCtx.currentTime + 0.3);
    }
}

// --- INISIALISASI GAME ---
function init() {
    snake = [ { x: 10, y: 10 } ];
    velocityX = 0; velocityY = 0;
    score = 0;
    speedMs = 120;
    gameOver = false;
    particles = [];
    document.getElementById("scoreDisplay").innerText = score;
    document.getElementById("highScoreDisplay").innerText = highScore;
    spawnFood();
}

function spawnFood() {
    food = {
        x: Math.floor(Math.random() * tileCount),
        y: Math.floor(Math.random() * tileCount)
    };
    // Pastikan makanan tidak muncul di badan ular
    for(let segment of snake) {
        if(segment.x === food.x && segment.y === food.y) spawnFood();
    }
}

function createExplosion(x, y, color) {
    for (let i = 0; i < 15; i++) {
        // Partikel di-spawn di koordinat pixel sebenarnya
        particles.push(new Particle(x * gridSize + 10, y * gridSize + 10, color));
    }
}

// --- KONTROL ULAR ---
let velocityX = 0, velocityY = 0;
let nextX = 0, nextY = 0; // Mencegah bug klik ganda cepat

window.addEventListener("keydown", e => {
    if (!gameRunning || gameOver) return;
    if ((e.code === "ArrowUp" || e.code === "KeyW") && velocityY === 0) { nextX = 0; nextY = -1; }
    if ((e.code === "ArrowDown" || e.code === "KeyS") && velocityY === 0) { nextX = 0; nextY = 1; }
    if ((e.code === "ArrowLeft" || e.code === "KeyA") && velocityX === 0) { nextX = -1; nextY = 0; }
    if ((e.code === "ArrowRight" || e.code === "KeyD") && velocityX === 0) { nextX = 1; nextY = 0; }
});

// --- GAME LOOP UTAMA (Pro Level Delta Time) ---
function gameLoop(timestamp) {
    if (!gameRunning) return;
    
    let deltaTime = timestamp - lastTime;
    lastTime = timestamp;
    timer += deltaTime;

    // Update Logika Ular berdasarkan speedMs
    if (timer > speedMs && !gameOver) {
        updateSnake();
        timer = 0;
    }

    // Gambar ulang semuanya setiap frame (membuat partikel sangat mulus)
    drawEverything();

    requestAnimationFrame(gameLoop);
}

function updateSnake() {
    // Terapkan arah baru
    if (nextX !== 0 || nextY !== 0) {
        velocityX = nextX; velocityY = nextY;
    }
    
    if (velocityX === 0 && velocityY === 0) return; // Belum jalan

    let headX = snake[0].x + velocityX;
    let headY = snake[0].y + velocityY;

    // Cek Tabrakan Dinding
    if (headX < 0 || headX >= tileCount || headY < 0 || headY >= tileCount) {
        return triggerGameOver();
    }
    // Cek Tabrakan Badan
    for (let i = 0; i < snake.length; i++) {
        if (headX === snake[i].x && headY === snake[i].y) return triggerGameOver();
    }

    snake.unshift({ x: headX, y: headY });

    // Cek Makan
    if (headX === food.x && headY === food.y) {
        playSound('eat');
        score += 10;
        document.getElementById("scoreDisplay").innerText = score;
        if (score > highScore) {
            highScore = score;
            localStorage.setItem("snakeProHigh", highScore);
            document.getElementById("highScoreDisplay").innerText = highScore;
        }
        createExplosion(food.x, food.y, '#ff003c'); // Ledakan pink
        
        // Dinamis: Makin panjang, game makin cepat sedikit
        if(speedMs > 60) speedMs -= 2; 
        
        spawnFood();
    } else {
        snake.pop(); // Hapus ekor jika tidak makan
    }
}

function drawEverything() {
    // Hapus Layar (Warna gelap)
    ctx.fillStyle = "#080812";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Gambar Grid Tipis
    ctx.strokeStyle = "rgba(255, 255, 255, 0.05)";
    ctx.lineWidth = 1;
    for(let i=0; i<tileCount; i++){
        ctx.strokeRect(i*gridSize, 0, 1, canvas.height);
        ctx.strokeRect(0, i*gridSize, canvas.width, 1);
    }

    if (!gameOver) {
        // Gambar Makanan (Pink Neon)
        ctx.fillStyle = "#ff003c";
        ctx.shadowBlur = 15;
        ctx.shadowColor = "#ff003c";
        ctx.beginPath();
        ctx.arc(food.x * gridSize + 10, food.y * gridSize + 10, 6, 0, Math.PI*2);
        ctx.fill();
        ctx.shadowBlur = 0; // Matikan shadow
    }

    // Gambar Ular (Cyan Neon)
    for (let i = 0; i < snake.length; i++) {
        // Kepala lebih terang dari badan
        ctx.fillStyle = i === 0 ? "#ffffff" : "#00f3ff";
        if(i === 0) {
            ctx.shadowBlur = 10;
            ctx.shadowColor = "#00f3ff";
        } else {
            ctx.shadowBlur = 0;
        }
        
        ctx.beginPath();
        ctx.roundRect(snake[i].x * gridSize + 1, snake[i].y * gridSize + 1, gridSize - 2, gridSize - 2, 4);
        ctx.fill();
    }
    ctx.shadowBlur = 0;

    // Update & Gambar Partikel
    for (let i = particles.length - 1; i >= 0; i--) {
        particles[i].update();
        particles[i].draw(ctx);
        if (particles[i].life <= 0) particles.splice(i, 1); // Hapus memori partikel mati
    }
}

function triggerGameOver() {
    gameOver = true;
    playSound('die');
    document.getElementById("finalScore").innerText = score;
    document.getElementById("gameOverScreen").classList.remove("hidden");
}

// --- EVENT LISTENER TOMBOL UI ---
document.getElementById("btnStart").addEventListener("click", () => {
    // Inisialisasi Audio Context memerlukan interaksi user pertama kali
    if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    
    document.getElementById("startScreen").classList.add("hidden");
    init();
    gameRunning = true;
    lastTime = performance.now();
    requestAnimationFrame(gameLoop);
});

document.getElementById("btnRestart").addEventListener("click", () => {
    document.getElementById("gameOverScreen").classList.add("hidden");
    init();
});

// Load awal
document.getElementById("highScoreDisplay").innerText = highScore;
