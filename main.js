let gameActiveStatus = false;
let stars = [];
let asteroids = [];
let plums = [];
let bullets = [];
let rocketModel;
let asteroidModel;
let spawnTimer = 0;
let shipX = 0;
let shipY = 200;
let speed = 10;
let tiltZ = 0;
let rollAngle = 0;
let canFlip = true;
let ammo = 10;
let flipsCount = 0;
let KMtraveled = 0;

let bestScore = 0;
let shakeAmount = 0;
let gameDifficulty = 1;

let asteroidDestroySound;
let rocketShotSound;
let rocketCrashSound;
let rocketFlipSound;
let bgMusic;
let isLoaded = false;

function preload() {
    rocketModel = loadModel('models/rocket.obj', true);
    asteroidModel = loadModel('models/asteroid.obj', true);
    asteroidDestroySound = loadSound('sounds/asteroidDestroy.mp3');
    rocketShotSound = loadSound('sounds/shot.mp3');
    rocketCrashSound = loadSound('sounds/crash.mp3');
    rocketFlipSound = loadSound('sounds/flip.mp3');
    bgMusic = loadSound('sounds/foneMusic.mp3', () => {
        isLoaded = true;
    });

    bestScore = localStorage.getItem('spaceGame_bestScore') || 0;
}

function setup() {
    createCanvas(windowWidth, windowHeight, WEBGL);
    const gl = this._renderer.GL;
    gl.enable(gl.DEPTH_TEST);
    for (let i = 0; i < 500; i++) {
        stars.push({
            x: random(-width / 2, width / 2),
            y: random(-height / 2, height / 2),
            size: random(0.1, 1.5)
        });
    }
}

function spawnAsteroid() {
    asteroids.push({
        x: random(-width / 2 + 100, width / 2 - 100),
        y: -height / 2 - 100,
        z: random(-50, 50),
        rotX: random(TWO_PI),
        rotY: random(TWO_PI),
        rotZ: random(TWO_PI),
        rotSpeed: random(0.01, 0.04),
        size: random(10, 25),
        speed: random(7, 12) * gameDifficulty
    });
}

function spawnRocketPlume() {
    if (rollAngle !== 0) return;
    let engineX = shipX - sin(-tiltZ) * 40;
    let engineY = shipY + 45;
    for (let i = 0; i < 2; i++) {
        plums.push({
            x: engineX,
            y: engineY,
            z: random(-5, 5),
            velX: sin(-tiltZ) * 2 + random(-1.5, 1.5),
            velY: random(3, 6),
            velZ: random(-1.5, 1.5),
            life: 255,
            size: random(10, 18)
        });
    }
}

function draw() {
    if (!isLoaded) {
        background(10, 10, 26);
        return;
    }

    colorMode(RGB, 255);
    background(10, 10, 26);

    if (shakeAmount > 0) {
        translate(random(-shakeAmount, shakeAmount), random(-shakeAmount, shakeAmount));
        shakeAmount *= 0.9;
    }

    push();
    resetMatrix();
    camera(0, 0, (height / 2.0) / tan(PI * 30.0 / 180.0), 0, 0, 0, 0, 1, 0);
    noStroke();
    fill(255);
    for (let s of stars) {
        circle(s.x, s.y, s.size);
    }
    pop();

    if (gameActiveStatus) {
        gameDifficulty = 1 + (floor(KMtraveled / 500) * 0.1);

        speed = keyIsDown(DOWN_ARROW) ? 3 : 10;
        KMtraveled += 0.5 * (speed / 10);

        document.getElementById('kmPassed').innerText = "KM PASSED: " + floor(KMtraveled);
        document.getElementById('ammo').innerText = "AMMO: " + ammo;

        spawnRocketPlume();
        for (let i = plums.length - 1; i >= 0; i--) {
            let p = plums[i];
            p.x += p.velX; p.y += p.velY; p.z += p.velZ;
            p.life -= 10;
            push();
            translate(p.x, p.y, p.z);
            noStroke();
            fill(255, 100 + p.life / 2, 0, p.life);
            sphere(p.size / 2, 4, 3);
            pop();
            if (p.life <= 0) plums.splice(i, 1);
        }

        spawnTimer += (speed / 100) * gameDifficulty;
        if (spawnTimer >= 1.5) {
            spawnAsteroid();
            spawnTimer = 0;
        }

        ambientLight(120);
        directionalLight(255, 255, 255, 0.5, 0.5, -1);

        for (let i = asteroids.length - 1; i >= 0; i--) {
            let a = asteroids[i];
            let currentAstSpeed = keyIsDown(DOWN_ARROW) ? 1.5 : a.speed;
            a.y += currentAstSpeed;
            a.rotX += a.rotSpeed;
            push();
            translate(a.x, a.y, a.z);
            rotateX(a.rotX); rotateY(a.rotY);
            scale(a.size * 0.025);
            noStroke();
            fill(120);
            model(asteroidModel);
            pop();

            if (a.y > height / 2 + 200) {
                asteroids.splice(i, 1);
                continue;
            }

            let d = dist(shipX, shipY, a.x, a.y);
            if (d < (70 + a.size * 0.5) && rollAngle === 0) {
                gameOver();
            }
        }

        for (let i = bullets.length - 1; i >= 0; i--) {
            let b = bullets[i];
            b.x += b.velX; b.y += b.velY;
            push();
            translate(b.x, b.y, b.z);
            rotateZ(b.angle);
            fill(0, 255, 255);
            box(3, 25, 3);
            pop();

            for (let j = asteroids.length - 1; j >= 0; j--) {
                let a = asteroids[j];
                if (dist(b.x, b.y, a.x, a.y) < a.size + 20) {
                    asteroidDestroySound.play();
                    shakeAmount = 5;
                    asteroids.splice(j, 1);
                    bullets.splice(i, 1);
                    break;
                }
            }
            if (b && (b.y < -height / 2 - 100 || abs(b.x) > width / 2)) bullets.splice(i, 1);
        }

        let targetTilt = 0;
        if (keyIsDown(LEFT_ARROW)) { shipX -= speed; targetTilt = 0.5; }
        if (keyIsDown(RIGHT_ARROW)) { shipX += speed; targetTilt = -0.5; }

        if (keyIsDown(UP_ARROW) && rollAngle <= 0 && canFlip && !keyIsDown(LEFT_ARROW) && !keyIsDown(RIGHT_ARROW)) {
            rocketFlipSound.setVolume(0.5);
            rocketFlipSound.play();
            rollAngle = 0.01;
            canFlip = false;
        }
        if (!keyIsDown(UP_ARROW)) canFlip = true;

        if (rollAngle > 0) {
            rollAngle += 0.2;
            if (rollAngle >= TWO_PI) {
                rollAngle = 0;
                flipsCount++;
                if (flipsCount % 3 === 0) ammo++;
            }
        }

        shipX = constrain(shipX, -width / 2 + 100, width / 2 - 100);
        tiltZ = lerp(tiltZ, targetTilt, 0.1);

        push();
        translate(shipX, shipY, 0);
        rotateX(-0.7 + rollAngle);
        rotateY(PI);
        rotateZ(PI + tiltZ);
        scale(0.75);
        noStroke();
        colorMode(HSB, 360, 100, 100);
        let shipHue = (KMtraveled * 5) % 360;
        ambientMaterial(shipHue, 60, 75);
        model(rocketModel);
        colorMode(RGB, 255);
        pop();
    }
}

function keyPressed() {
    if (gameActiveStatus && keyCode === 32) shot();
}

function shot() {
    if (ammo > 0 && rollAngle === 0) {
        rocketShotSound.setVolume(0.5);
        rocketShotSound.play();
        shakeAmount = 3;
        bullets.push({
            x: shipX + sin(-tiltZ) * 50,
            y: shipY - 50,
            z: 0,
            velX: sin(-tiltZ) * 15,
            velY: -20,
            angle: tiltZ
        });
        ammo--;
    }
}

function start() {
    if (!isLoaded) return;
    gameActiveStatus = true;
    if (bgMusic.isLoaded()) {
        bgMusic.loop();
        bgMusic.setVolume(0.5);
    }
    loop();
    asteroids = []; bullets = []; plums = [];
    KMtraveled = 0; shipX = 0; ammo = 10; gameDifficulty = 1;

    const elementsToNF = ['.start-btn', '.controls-hint', '.titleImg', '.info'];
    elementsToNF.forEach(selector => {
        let el = document.querySelector(selector);
        if (el) el.style.display = el.classList.contains('info') ? 'block' : 'none';
    });
}

function gameOver() {
    gameActiveStatus = false;
    bgMusic.stop();
    rocketCrashSound.play();
    shakeAmount = 30;

    let finalKM = floor(KMtraveled);
    if (finalKM > bestScore) {
        bestScore = finalKM;
        localStorage.setItem('spaceGame_bestScore', bestScore);
    }

    noLoop();
    document.getElementById('blur-layer').style.display = 'block';
    document.getElementById('loseWnd').style.display = 'flex';

    let bestScoreEl = document.getElementById('bestScore');
    if (bestScoreEl) bestScoreEl.innerText = "BEST: " + bestScore;
}