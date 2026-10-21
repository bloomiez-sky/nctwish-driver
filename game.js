// =========================================================
// 📌 ล็อค Playlist ID ของคุณที่นี่
// =========================================================
const DEFAULT_MEDIA_ID = "jfKfPfyJRdk"; 

// 🚫 บล็อกคลิกขวา และปุ่มเปิด DevTools (F12)
document.addEventListener('contextmenu', event => event.preventDefault());
document.onkeydown = function (e) {
    if (e.keyCode == 123 || (e.ctrlKey && e.shiftKey && (e.keyCode == 73 || e.keyCode == 74)) || (e.ctrlKey && e.keyCode == 85)) {
        return false;
    }
};

// =========================================================
// 🎵 YOUTUBE API (WITH AUTO-SKIP FOR BLOCKED VIDEOS)
// =========================================================
let ytPlayer = null;
let isVideoReady = false;

function onYouTubeIframeAPIReady() {
    ytPlayer = new YT.Player('player', {
        playerVars: {
            'autoplay': 1,
            'controls': 1,
            'modestbranding': 1,
            'rel': 0,
            'playsinline': 1
        },
        events: {
            'onReady': onPlayerReady,
            'onStateChange': onPlayerStateChange,
            'onError': onPlayerError // 👈 เพิ่มการตรวจจับ Error เพื่อข้ามคลิปที่โดนบล็อก
        }
    });
}

function loadMediaToPlayer(id) {
    if (!ytPlayer || !isVideoReady || !id) return;
    if (id.startsWith("PL")) {
        ytPlayer.loadPlaylist({ list: id, listType: 'playlist' });
    } else {
        ytPlayer.loadVideoById(id);
    }
}

function onPlayerReady(event) {
    isVideoReady = true;
    ytPlayer.setVolume(80);
    loadMediaToPlayer(DEFAULT_MEDIA_ID);
}

// ข้ามไปเพลงถัดไปทันทีหากเจอวิดีโอที่โดนค่ายเพลงบล็อกห้ามฝังบนเว็บภายนอก
function onPlayerError(event) {
    console.warn("YouTube Video Error (Skipping to next):", event.data);
    if (ytPlayer && typeof ytPlayer.nextVideo === 'function') {
        setTimeout(() => { ytPlayer.nextVideo(); }, 500);
    }
}

function onPlayerStateChange(event) {
    const playIcon = document.getElementById('play-icon');
    if (event.data === YT.PlayerState.PLAYING) {
        if (playIcon) playIcon.className = "fa-solid fa-pause";
    } else {
        if (playIcon) playIcon.className = "fa-solid fa-play";
    }
}

function togglePlayPause() {
    if (!ytPlayer || !isVideoReady) return;
    const state = ytPlayer.getPlayerState();
    if (state === YT.PlayerState.PLAYING) {
        ytPlayer.pauseVideo();
    } else {
        ytPlayer.playVideo();
    }
}

function nextVideo() { if (ytPlayer && isVideoReady && typeof ytPlayer.nextVideo === 'function') ytPlayer.nextVideo(); }
function prevVideo() { if (ytPlayer && isVideoReady && typeof ytPlayer.previousVideo === 'function') ytPlayer.previousVideo(); }

function toggleMute() {
    if (!ytPlayer || !isVideoReady) return;
    const muteIcon = document.getElementById('mute-icon');
    if (ytPlayer.isMuted()) {
        ytPlayer.unMute();
        if (muteIcon) muteIcon.className = "fa-solid fa-volume-high";
    } else {
        ytPlayer.mute();
        if (muteIcon) muteIcon.className = "fa-solid fa-volume-xmark";
    }
}

function setVolume(val) {
    if (ytPlayer && isVideoReady) ytPlayer.setVolume(val);
}

function extractPlaylistOrVideoID(url) {
    if (!url) return null;
    const playlistMatch = url.match(/[&?]list=([^&]+)/);
    if (playlistMatch) return playlistMatch[1];
    
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
    const match = url.match(regExp);
    return (match && match[2].length === 11) ? match[2] : url.trim();
}

// =========================================================
// 🔊 WEB AUDIO SYNTHESIZER
// =========================================================
const audioCtx = new (window.AudioContext || window.webkitAudioContext)();

function playStarPickupSound(points) {
    if (audioCtx.state === 'suspended') audioCtx.resume();
    
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.connect(gain);
    gain.connect(audioCtx.destination);

    const freqMap = { 1: 523.25, 2: 659.25, 5: 783.99, 10: 1046.50 };
    const baseFreq = freqMap[points] || 523.25;

    osc.type = 'sine';
    osc.frequency.setValueAtTime(baseFreq, audioCtx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(baseFreq * 1.5, audioCtx.currentTime + 0.15);

    gain.gain.setValueAtTime(0.2, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.15);

    osc.start();
    osc.stop(audioCtx.currentTime + 0.15);
}

// =========================================================
// 🏎️ THREE.JS 3D PASTEL DRIVING ENGINE
// =========================================================
let scene, camera, renderer;
let playerCar, roadGrid;
let starsList = [];

const STAR_TIERS = [
    { points: 1, scale: 0.6, weight: 50, colorHex: 0xFFADAD },  // ⭐ 1 คะแนน = ❤️ แดงพาสเทล
    { points: 2, scale: 0.85, weight: 30, colorHex: 0xBDB2FF }, // ⭐ 2 คะแนน = 💜 ม่วงพาสเทล
    { points: 5, scale: 1.15, weight: 15, colorHex: 0xFDFFB6 }, // ⭐ 5 คะแนน = 💛 เหลืองพาสเทล
    { points: 10, scale: 1.55, weight: 5, colorHex: 0x9BF6FF }  // 🌟 10 คะแนน = 🩵 ฟ้าพาสเทล
];

let speed = 110;
let targetLane = 0;
let currentCarX = 0;
const laneWidth = 3.5;
let isNitroActive = false;
let nitroAmount = 100;

let score = 0;
let starCounts = { 1: 0, 2: 0, 5: 0, 10: 0 };
let isGameRunning = false;

function initThreeJS() {
    const container = document.getElementById('game-container');
    const width = container.clientWidth || window.innerWidth;
    const height = container.clientHeight || (window.innerHeight * 0.7);

    scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x0f0c1b, 0.012);

    camera = new THREE.PerspectiveCamera(55, width / height, 0.1, 1000);
    camera.position.set(0, 5.5, 9.0);
    camera.lookAt(0, 1.0, -10);

    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setClearColor(0x0f0c1b);
    container.appendChild(renderer.domElement);

    const ambientLight = new THREE.AmbientLight(0xffffff, 0.8);
    scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0xffc6ff, 1.2);
    dirLight.position.set(0, 20, -10);
    scene.add(dirLight);

    const gridHelper = new THREE.GridHelper(100, 30, 0xffc6ff, 0x3d2b56);
    gridHelper.position.set(0, 0, -30);
    scene.add(gridHelper);
    roadGrid = gridHelper;

    createPastelCar();
    window.addEventListener('resize', onWindowResize);
}

function createPastelCar() {
    playerCar = new THREE.Group();

    const bodyGeo = new THREE.BoxGeometry(1.7, 0.65, 3.2);
    const bodyMat = new THREE.MeshStandardMaterial({ color: 0xFFC6FF, roughness: 0.3 });
    const body = new THREE.Mesh(bodyGeo, bodyMat);
    body.position.y = 0.45;
    playerCar.add(body);

    const cabinGeo = new THREE.BoxGeometry(1.2, 0.5, 1.6);
    const cabinMat = new THREE.MeshStandardMaterial({ color: 0x9BF6FF, roughness: 0.1, transparent: true, opacity: 0.8 });
    const cabin = new THREE.Mesh(cabinGeo, cabinMat);
    cabin.position.set(0, 0.85, -0.2);
    playerCar.add(cabin);

    const tailGeo = new THREE.BoxGeometry(1.4, 0.1, 0.1);
    const tailMat = new THREE.MeshBasicMaterial({ color: 0xFFADAD });
    const tail = new THREE.Mesh(tailGeo, tailMat);
    tail.position.set(0, 0.5, 1.61);
    playerCar.add(tail);

    playerCar.position.set(0, 0, 2);
    scene.add(playerCar);
}

function createStarMesh(tier) {
    const shape = new THREE.Shape();
    const points = 5;
    const outerRadius = 0.7 * tier.scale;
    const innerRadius = 0.35 * tier.scale;

    for (let i = 0; i < points * 2; i++) {
        const r = (i % 2 === 0) ? outerRadius : innerRadius;
        const a = (i / (points * 2)) * Math.PI * 2 - Math.PI / 2;
        const x = Math.cos(a) * r;
        const y = Math.sin(a) * r;
        if (i === 0) shape.moveTo(x, y);
        else shape.lineTo(x, y);
    }
    shape.closePath();

    const extrudeSettings = { depth: 0.25 * tier.scale, bevelEnabled: true, bevelSegments: 2, steps: 1, bevelSize: 0.05, bevelThickness: 0.05 };
    const geo = new THREE.ExtrudeGeometry(shape, extrudeSettings);
    geo.center();

    const mat = new THREE.MeshStandardMaterial({ color: tier.colorHex, metalness: 0.2, roughness: 0.2 });
    const mesh = new THREE.Mesh(geo, mat);

    mesh.userData = { points: tier.points, colorHex: '#' + tier.colorHex.toString(16) };
    return mesh;
}

function spawnStar() {
    if (!isGameRunning) return;
    
    const rand = Math.random() * 100;
    let cum = 0;
    let selectedTier = STAR_TIERS[0];
    for (let t of STAR_TIERS) {
        cum += t.weight;
        if (rand <= cum) {
            selectedTier = t;
            break;
        }
    }

    const lane = Math.floor(Math.random() * 3) - 1;
    const starMesh = createStarMesh(selectedTier);
    starMesh.position.set(lane * laneWidth, 0.8, -70);
    scene.add(starMesh);
    starsList.push(starMesh);
}

function showFloatingScoreText(points, colorHex) {
    const container = document.getElementById('game-container');
    if (!container) return;
    const el = document.createElement('div');
    el.className = 'floating-score';
    el.innerText = `+${points}`;
    el.style.color = colorHex;
    el.style.left = `${container.clientWidth / 2 + (targetLane * 50)}px`;
    el.style.top = `${container.clientHeight / 2 + 30}px`;
    container.appendChild(el);
    setTimeout(() => el.remove(), 800);
}

let spawnTimer = 0;
function updateGame(delta) {
    if (!isGameRunning) return;

    if (isNitroActive && nitroAmount > 0) {
        speed = 170;
        nitroAmount -= delta * 40;
        if (nitroAmount <= 0) isNitroActive = false;
    } else {
        speed = 110;
        if (nitroAmount < 100) nitroAmount += delta * 12;
    }

    const nitroBar = document.getElementById('nitro-bar');
    if (nitroBar) nitroBar.style.width = `${Math.max(0, nitroAmount)}%`;

    const targetX = targetLane * laneWidth;
    currentCarX += (targetX - currentCarX) * 0.18;
    playerCar.position.x = currentCarX;
    playerCar.rotation.z = (currentCarX - targetX) * 0.06;

    roadGrid.position.z += (speed * delta) * 0.4;
    if (roadGrid.position.z > 0) roadGrid.position.z = -30;

    spawnTimer += delta;
    if (spawnTimer > 0.7) {
        spawnTimer = 0;
        spawnStar();
    }

    for (let i = starsList.length - 1; i >= 0; i--) {
        const star = starsList[i];
        star.position.z += (speed * delta) * 0.4;
        star.rotation.y += delta * 3.5;

        if (Math.abs(star.position.z - playerCar.position.z) < 1.4 &&
            Math.abs(star.position.x - playerCar.position.x) < 1.3) {
            
            const pts = star.userData.points;
            score += pts;
            starCounts[pts] = (starCounts[pts] || 0) + 1;

            const scoreDisp = document.getElementById('score-display');
            const starCountDisp = document.getElementById(`star-${pts}-count`);
            if (scoreDisp) scoreDisp.innerText = String(score).padStart(5, '0');
            if (starCountDisp) starCountDisp.innerText = starCounts[pts];

            playStarPickupSound(pts);
            showFloatingScoreText(pts, star.userData.colorHex);

            scene.remove(star);
            starsList.splice(i, 1);
            continue;
        }

        if (star.position.z > 10) {
            scene.remove(star);
            starsList.splice(i, 1);
        }
    }
}

// Controls
window.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') {
        if (targetLane > -1) targetLane--;
    } else if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') {
        if (targetLane < 1) targetLane++;
    } else if (e.key === ' ' || e.key === 'Spacebar') {
        if (nitroAmount > 15) isNitroActive = true;
    }
});

const bindTouchBtn = (id, action) => {
    const btn = document.getElementById(id);
    if (!btn) return;
    btn.addEventListener('pointerdown', (e) => {
        e.preventDefault();
        action();
    });
};

bindTouchBtn('btn-left', () => { if (targetLane > -1) targetLane--; });
bindTouchBtn('btn-right', () => { if (targetLane < 1) targetLane--; });
bindTouchBtn('btn-nitro', () => { if (nitroAmount > 15) isNitroActive = true; });

function onWindowResize() {
    const container = document.getElementById('game-container');
    if (!container) return;
    const width = container.clientWidth;
    const height = container.clientHeight;

    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    renderer.setSize(width, height);
}

let clock = new THREE.Clock();
function animate() {
    requestAnimationFrame(animate);
    const delta = clock.getDelta();
    updateGame(delta);
    renderer.render(scene, camera);
}

function startGame() {
    const inputUrl = document.getElementById('start-yt-url').value;
    const extractedId = extractPlaylistOrVideoID(inputUrl) || DEFAULT_MEDIA_ID;

    loadMediaToPlayer(extractedId);

    // ปลดล็อกระบบเสียงวิดีโอทันทีที่กดปุ่ม Start
    if (ytPlayer && typeof ytPlayer.playVideo === 'function') {
        ytPlayer.playVideo();
    }

    document.getElementById('game-overlay').classList.add('hidden');
    isGameRunning = true;
    clock.start();
}

initThreeJS();
animate();
