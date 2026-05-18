// const puppeteer = require('puppeteer-extra');
// const StealthPlugin = require('puppeteer-extra-plugin-stealth');
// puppeteer.use(StealthPlugin());

// const fs = require('fs');
// const path = require('path');
// const os = require('os');
// const { spawn, execSync } = require('child_process');

// // 🚀 Multi-Stream Key Manager
// const STREAM_KEYS = {
//     '1'   : '15254238731883_15281627925099_najspfkgne', 
//     '1.1' : '15254260751979_15281671637611_2plrcfqzze', 
//     '1.2' : '15254285524587_15281717840491_7e6qdknzsu',
//     '2'   : '15254299352683_15281743071851_7dvz3h5d7q',
//     '3'   : '15254341885547_15281821059691_hhlpb5vicy', 
//     '4'   : '15255022345835_15283095800427_vwrupxzstm', 
//     '5'   : '15273689226859_15317451606635_d7zzy3c7qi',
//     '5.2' : '15273722257003_15317510195819_6edjluvdqi'
// };

// const TARGET_URL = process.env.TARGET_URL || 'https://dadocric.st/player.php?id=starsp3&v=m';
// const SELECTED_CHANNEL = process.env.OKRU_STREAM_ID || '1';
// const SERVER_SELECTION = process.env.SERVER_SELECTION || 'None'; 
// const ACTIVE_STREAM_KEY = STREAM_KEYS[SELECTED_CHANNEL] || STREAM_KEYS['1'];

// let browser = null;
// let obsProcess = null;

// let lastVideoTime = -1;
// let frozenCheckTimestamp = Date.now();
// const FROZEN_THRESHOLD_MS = 15000;

// if (!fs.existsSync('./screenshots')) fs.mkdirSync('./screenshots');
// let pendingScreenshots = [];
// let uploadCycleCount = 0;

// async function takeAndBatchScreenshot(page, stepName) {
//     try {
//         const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
//         const filePath = `./screenshots/snap_${timestamp}_${stepName}.png`;
//         await page.screenshot({ path: filePath });
//         console.log(`[📸] Screenshot saved: ${filePath}`);
//         pendingScreenshots.push(filePath);

//         if (pendingScreenshots.length >= 3) {
//             console.log(`[🚀] 3 Screenshots collected. Triggering LIVE batch upload...`);
//             try {
//                 const tag = 'live-stream-logs';
//                 try { execSync(`gh release view ${tag} || gh release create ${tag} -t "Live Logs"`, { stdio: 'ignore' }); } catch(e) {}
//                 try {
//                     const oldAssets = execSync(`gh release view ${tag} --json assets -q ".assets[].name"`, { encoding: 'utf-8' }).trim().split('\n');
//                     for (const asset of oldAssets) if (asset) execSync(`gh release delete-asset ${tag} "${asset}" -y`, { stdio: 'ignore' });
//                 } catch(e) {}

//                 const fileList = pendingScreenshots.join(' ');
//                 execSync(`gh release upload ${tag} ${fileList} --clobber`, { stdio: 'ignore' });
//                 uploadCycleCount++;
//                 console.log(`[+] Live batch upload successful! (Total Cycles: ${uploadCycleCount})`);
//                 pendingScreenshots = []; 
//             } catch (err) { }
//         }
//     } catch (e) {}
// }

// function setupOBSConfig() {
//     console.log('[*] Generating OBS Config files programmatically...');
//     const obsDir = path.join(os.homedir(), '.config', 'obs-studio');
//     const profilesDir = path.join(obsDir, 'basic', 'profiles', 'Untitled');
//     const scenesDir = path.join(obsDir, 'basic', 'scenes');

//     fs.mkdirSync(profilesDir, { recursive: true });
//     fs.mkdirSync(scenesDir, { recursive: true });

//     fs.writeFileSync(path.join(obsDir, 'global.ini'), '[General]\nLicenseAccepted=true\n[BasicWindow]\nShowAutoConfig=false\nWarned=true\n');
//     fs.writeFileSync(path.join(profilesDir, 'basic.ini'), `[General]\nName=Untitled\n[Video]\nBaseCX=1280\nBaseCY=720\nOutputCX=1280\nOutputCY=720\nFPSCommon=30\n[Output]\nMode=Simple\n`);

//     const serviceJson = {
//         "settings": {
//             "server": "rtmp://vsu.okcdn.ru/input/",
//             "key": ACTIVE_STREAM_KEY
//         },
//         "type": "rtmp_custom"
//     };
//     fs.writeFileSync(path.join(profilesDir, 'service.json'), JSON.stringify(serviceJson, null, 2));

//     const sceneJson = {
//         "current_scene": "MainScene",
//         "current_program_scene": "MainScene",
//         "name": "Untitled",
//         "scene_order": [{"name": "MainScene"}],
//         "sources": [
//             { "id": "xshm_input", "name": "Screen", "settings": {} },
//             { "id": "pulse_output_capture", "name": "Audio", "settings": {} },
//             {
//                 "id": "scene",
//                 "name": "MainScene",
//                 "settings": {
//                     "items": [
//                         {"name": "Screen", "id": 1, "visible": true},
//                         {"name": "Audio", "id": 2, "visible": true}
//                     ]
//                 }
//             }
//         ]
//     };
//     fs.writeFileSync(path.join(scenesDir, 'Untitled.json'), JSON.stringify(sceneJson, null, 2));
//     console.log('[+] OBS Configurations injected successfully!');
// }

// async function mainLoop() {
//     while (true) {
//         try {
//             await startDirectStreaming();
//         } catch (error) {
//             console.error(`\n[!] ALERT: ${error.message}`);
//             console.log('[*] 🔄 Restarting everything in 3 seconds...');
//             await cleanup();
//             await new Promise(resolve => setTimeout(resolve, 3000));
//         }
//     }
// }

// async function startDirectStreaming() {
//     console.log(`[*] Starting OBS Studio FIRST...`);
//     setupOBSConfig();

//     console.log(`[+] Broadcasting via OBS STUDIO to OK.ru CHANNEL: ${SELECTED_CHANNEL}`);
//     obsProcess = spawn('obs', ['--startstreaming']);
    
//     obsProcess.stdout.on('data', (data) => console.log(`[OBS]: ${data.toString().trim()}`));
//     obsProcess.stderr.on('data', (data) => {
//         const msg = data.toString().trim();
//         if (msg.includes('error') || msg.includes('fail')) console.log(`[OBS Error]: ${msg}`);
//     });

//     console.log('[*] Waiting for OBS to initialize before launching browser...');
//     await new Promise(r => setTimeout(r, 8000));

//     console.log(`[*] Starting browser...`);
//     browser = await puppeteer.launch({
//         headless: false, 
//         defaultViewport: { width: 1280, height: 720 },
//         ignoreDefaultArgs: ['--enable-automation'], 
//         args: [
//             '--no-sandbox', '--disable-setuid-sandbox',
//             '--window-size=1280,720',
//             '--window-position=0,0', // 🛠 FIX: Window ko strictly top-left par force kiya
//             '--kiosk', '--start-fullscreen', // 🛠 FIX: Extra flags to ensure full screen
//             '--disable-infobars',
//             '--force-device-scale-factor=1', // 🛠 FIX: Prevents scaling gaps
//             '--autoplay-policy=no-user-gesture-required'
//         ]
//     });

//     const page = await browser.newPage();
//     const pages = await browser.pages();
//     for (const p of pages) { if (p !== page) await p.close(); }

//     browser.on('targetcreated', async (target) => {
//         if (target.type() === 'page') {
//             try {
//                 const newPage = await target.page();
//                 if (newPage && newPage !== page) {
//                     await page.bringToFront(); await newPage.close();
//                 }
//             } catch (e) {}
//         }
//     });

//     console.log(`[*] Navigating to: ${TARGET_URL}`);
//     await page.goto(TARGET_URL, { waitUntil: 'domcontentloaded', timeout: 60000 });
//     await takeAndBatchScreenshot(page, 'after-load');

//     if (SERVER_SELECTION !== 'None') {
//         let serverClicked = false; let serverAttempts = 0;
//         while (!serverClicked && serverAttempts < 10) { 
//             serverAttempts++;
//             try {
//                 const clickSuccess = await page.evaluate((serverName) => {
//                     const buttons = Array.from(document.querySelectorAll('button'));
//                     const targetBtn = buttons.find(b => b.innerText && b.innerText.trim().includes(serverName));
//                     if (targetBtn) { targetBtn.click(); return true; }
//                     return false;
//                 }, SERVER_SELECTION);

//                 if (clickSuccess) {
//                     serverClicked = true; await takeAndBatchScreenshot(page, `server-clicked`);
//                     await new Promise(r => setTimeout(r, 3000)); await page.bringToFront(); 
//                 } else await new Promise(r => setTimeout(r, 2000));
//             } catch (err) { await new Promise(r => setTimeout(r, 2000)); }
//         }
//     }

//     console.log('[*] Hunting for the Play Button...');
//     let buttonClicked = false;
//     let attempts = 0;
    
//     while (!buttonClicked && attempts < 15) {
//         console.log(`[*] Searching for Play button... (Attempt ${attempts + 1}/15)`);
//         for (const frame of page.frames()) {
//             try {
//                 const playBtn = await frame.$('.jw-icon-display[aria-label="Play"], button[data-plyr="play"], .vjs-big-play-button');
//                 if (playBtn) {
//                     const isVisible = await frame.evaluate(el => {
//                         const style = window.getComputedStyle(el);
//                         return style.display !== 'none' && style.visibility !== 'hidden' && style.opacity !== '0';
//                     }, playBtn);

//                     if (isVisible) {
//                         console.log(`[+] Play button mil gaya! Click kar raha hoon...`);
//                         await frame.evaluate(el => el.click(), playBtn); 
//                         buttonClicked = true;
//                         await takeAndBatchScreenshot(page, `play-btn-clicked`);
//                         break; 
//                     }
//                 }
//             } catch (err) {}
//         }
        
//         if (!buttonClicked) await new Promise(r => setTimeout(r, 2000));
//         else await new Promise(r => setTimeout(r, 2000));
//         attempts++;
//     }

//     if (!buttonClicked) console.log('[!] Warning: Play button 15 attempts ke baad bhi nahi mila. Aagay barh raha hoon.');

//     console.log('[*] Scanning iframes for the REAL Live Stream Video...');
//     let targetFrame = null;
//     for (const frame of page.frames()) {
//         try {
//             const isRealLiveStream = await frame.evaluate(() => {
//                 const vid = document.querySelector('video');
//                 return vid && vid.clientWidth > 100 && vid.clientHeight > 100;
//             });
//             if (isRealLiveStream) { targetFrame = frame; break; }
//         } catch (e) { }
//     }

//     if (!targetFrame) targetFrame = page.mainFrame();
//     await takeAndBatchScreenshot(page, 'video-located');

//     console.log('[*] Enforcing Black Background, Hiding Cursor and Full Screen UI...');
    
//     // 🛠 FIX: Page Level CSS Inject - Hidden Cursor + Zero Margins
//     await page.evaluate(() => {
//         const style = document.createElement('style');
//         style.innerHTML = `
//             * { cursor: none !important; } /* 🖱️ Hides mouse pointer completely */
//             html, body {
//                 margin: 0 !important; 
//                 padding: 0 !important; 
//                 width: 100vw !important; 
//                 height: 100vh !important; 
//                 background-color: black !important; 
//                 overflow: hidden !important; 
//             }
//         `;
//         document.head.appendChild(style);
        
//         document.querySelectorAll('iframe').forEach(iframe => {
//             iframe.style.position = 'fixed'; iframe.style.top = '0'; iframe.style.left = '0';
//             iframe.style.width = '100vw'; iframe.style.height = '100vh';
//             iframe.style.zIndex = '999999'; iframe.style.backgroundColor = 'black'; 
//             iframe.style.border = 'none'; iframe.style.margin = '0'; iframe.style.padding = '0';
//         });
//     }).catch(() => {});

//     // 🛠 FIX: Target Frame CSS Inject - Hidden Cursor + Zero Margins
//     await targetFrame.evaluate(async () => {
//         const style = document.createElement('style');
//         style.innerHTML = `
//             * { cursor: none !important; } /* 🖱️ Hides mouse pointer inside iframe */
//             html, body {
//                 margin: 0 !important; 
//                 padding: 0 !important; 
//                 background-color: black !important; 
//                 overflow: hidden !important; 
//             }
//             .jw-controls, .jw-ui, .plyr__controls, .vjs-control-bar, [data-player] .controls { 
//                 display: none !important; 
//                 opacity: 0 !important;
//                 visibility: hidden !important;
//             }
//         `;
//         document.head.appendChild(style);

//         const video = document.querySelector('video');
//         if (video) { 
//             video.muted = false; 
//             video.volume = 1.0; 
//             video.style.position = 'fixed'; 
//             video.style.top = '0'; 
//             video.style.left = '0';
//             video.style.width = '100vw'; 
//             video.style.height = '100vh';
//             video.style.zIndex = '2147483647'; 
//             video.style.backgroundColor = 'black'; 
//             video.style.objectFit = 'contain';
//             video.style.margin = '0'; 
//             video.style.padding = '0';
//         }
//     }).catch(()=>{});

//     console.log('\n[*] OBS Engine Connected! 24/7 Monitoring Active...');
//     let watchdogTicks = 0;
//     while (true) {
//         if (!browser || !browser.isConnected()) throw new Error("Browser closed.");

//         let overallStatus = 'DEAD'; let currentVideoTime = -1; let criticalErrorFound = false;

//         for (const frame of page.frames()) {
//             try {
//                 const result = await frame.evaluate(() => {
//                     const bodyText = document.body.innerText.toLowerCase();
//                     if (bodyText.includes("stream error")) return { status: 'CRITICAL_ERROR' };
//                     const v = document.querySelector('video');
//                     if (v && !v.ended) return { status: 'HEALTHY', currentTime: v.currentTime };
//                     return { status: 'DEAD' };
//                 });
//                 if (result.status === 'CRITICAL_ERROR') criticalErrorFound = true;
//                 if (result.status === 'HEALTHY') { overallStatus = 'HEALTHY'; currentVideoTime = result.currentTime; }
//             } catch (e) {}
//         }

//         if (overallStatus === 'HEALTHY' && currentVideoTime !== -1) {
//             const now = Date.now();
//             if (currentVideoTime === lastVideoTime) {
//                 if (now - frozenCheckTimestamp > FROZEN_THRESHOLD_MS) overallStatus = 'FROZEN';
//             } else { lastVideoTime = currentVideoTime; frozenCheckTimestamp = now; }
//         }

//         if (criticalErrorFound || overallStatus === 'DEAD' || overallStatus === 'FROZEN') {
//             const reason = overallStatus === 'FROZEN' ? "video frozen" : "video dead/error";
//             console.log(`\n[!] ❌ STREAM DEAD/FROZEN DETECTED (${reason})! Restarting process...`);
//             await takeAndBatchScreenshot(page, 'stream-dead-detected');
//             throw new Error(`Watchdog detected ${reason}.`); 
//         }

//         watchdogTicks++;
//         if (watchdogTicks % 120 === 0) await takeAndBatchScreenshot(page, `heartbeat-tick-${watchdogTicks}`);
//         await new Promise(r => setTimeout(r, 5000)); 
//     }
// }

// async function cleanup() {
//     if (obsProcess) { try { obsProcess.kill('SIGKILL'); } catch(e){} obsProcess = null; }
//     if (browser) { try { await browser.close(); } catch(e){} browser = null; }
// }

// process.on('SIGINT', async () => { await cleanup(); process.exit(0); });

// setTimeout(() => {
//     try {
//         const { execSync } = require('child_process');
//         const cmd = `gh workflow run main.yml -f target_url="${process.env.TARGET_URL}" -f okru_stream_channel="${process.env.OKRU_STREAM_ID}" -f stream_quality="${process.env.STREAM_QUALITY}" -f server_selection="${process.env.SERVER_SELECTION}"`;
//         execSync(cmd, { stdio: 'inherit' });
//         setTimeout(async () => { await cleanup(); process.exit(0); }, 300000); 
//     } catch (err) {}
// }, 21000000);

// mainLoop();








// 1


const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
puppeteer.use(StealthPlugin());

const fs = require('fs');
const path = require('path');
const os = require('os');
const { spawn, execSync } = require('child_process');

// 🚀 Multi-Stream Key Manager
const STREAM_KEYS = {
    '1'   : '15254238731883_15281627925099_najspfkgne', 
    '1.1' : '15254260751979_15281671637611_2plrcfqzze', 
    '1.2' : '15254285524587_15281717840491_7e6qdknzsu',
    '2'   : '15254299352683_15281743071851_7dvz3h5d7q',
    '3'   : '15254341885547_15281821059691_hhlpb5vicy', 
    '4'   : '15255022345835_15283095800427_vwrupxzstm', 
    '5'   : '15273689226859_15317451606635_d7zzy3c7qi',
    '5.2' : '15273722257003_15317510195819_6edjluvdqi'
};

const TARGET_URL = process.env.TARGET_URL || 'https://dadocric.st/player.php?id=starsp3&v=m';
const SELECTED_CHANNEL = process.env.OKRU_STREAM_ID || '1';
const SERVER_SELECTION = process.env.SERVER_SELECTION || 'None'; 
const ACTIVE_STREAM_KEY = STREAM_KEYS[SELECTED_CHANNEL] || STREAM_KEYS['1'];

let browser = null;
let obsProcess = null;

let lastVideoTime = -1;
let frozenCheckTimestamp = Date.now();
const FROZEN_THRESHOLD_MS = 15000;

if (!fs.existsSync('./screenshots')) fs.mkdirSync('./screenshots');
let pendingScreenshots = [];
let uploadCycleCount = 0;

async function takeAndBatchScreenshot(page, stepName) {
    try {
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const filePath = `./screenshots/snap_${timestamp}_${stepName}.png`;
        await page.screenshot({ path: filePath });
        console.log(`[📸] Screenshot saved: ${filePath}`);
        pendingScreenshots.push(filePath);

        if (pendingScreenshots.length >= 3) {
            console.log(`[🚀] 3 Screenshots collected. Triggering LIVE batch upload...`);
            try {
                const tag = 'live-stream-logs';
                try { execSync(`gh release view ${tag} || gh release create ${tag} -t "Live Logs"`, { stdio: 'ignore' }); } catch(e) {}
                try {
                    const oldAssets = execSync(`gh release view ${tag} --json assets -q ".assets[].name"`, { encoding: 'utf-8' }).trim().split('\n');
                    for (const asset of oldAssets) if (asset) execSync(`gh release delete-asset ${tag} "${asset}" -y`, { stdio: 'ignore' });
                } catch(e) {}

                const fileList = pendingScreenshots.join(' ');
                execSync(`gh release upload ${tag} ${fileList} --clobber`, { stdio: 'ignore' });
                uploadCycleCount++;
                console.log(`[+] Live batch upload successful! (Total Cycles: ${uploadCycleCount})`);
                pendingScreenshots = []; 
            } catch (err) { }
        }
    } catch (e) {}
}

// =========================================================================
// 🛠️ SETUP OBS CONFIGURATION DYNAMICALLY (UNTOUCHED)
// =========================================================================
function setupOBSConfig() {
    console.log('[*] Generating OBS Config files programmatically...');
    const obsDir = path.join(os.homedir(), '.config', 'obs-studio');
    const profilesDir = path.join(obsDir, 'basic', 'profiles', 'Untitled');
    const scenesDir = path.join(obsDir, 'basic', 'scenes');

    fs.mkdirSync(profilesDir, { recursive: true });
    fs.mkdirSync(scenesDir, { recursive: true });

    fs.writeFileSync(path.join(obsDir, 'global.ini'), '[General]\nLicenseAccepted=true\n[BasicWindow]\nShowAutoConfig=false\nWarned=true\n');
    fs.writeFileSync(path.join(profilesDir, 'basic.ini'), `[General]\nName=Untitled\n[Video]\nBaseCX=1280\nBaseCY=720\nOutputCX=1280\nOutputCY=720\nFPSCommon=30\n[Output]\nMode=Simple\n`);

    const serviceJson = {
        "settings": {
            "server": "rtmp://vsu.okcdn.ru/input/",
            "key": ACTIVE_STREAM_KEY
        },
        "type": "rtmp_custom"
    };
    fs.writeFileSync(path.join(profilesDir, 'service.json'), JSON.stringify(serviceJson, null, 2));

    const sceneJson = {
        "current_scene": "MainScene",
        "current_program_scene": "MainScene",
        "name": "Untitled",
        "scene_order": [{"name": "MainScene"}],
        "sources": [
            { "id": "xshm_input", "name": "Screen", "settings": {} },
            { "id": "pulse_output_capture", "name": "Audio", "settings": {} },
            {
                "id": "scene",
                "name": "MainScene",
                "settings": {
                    "items": [
                        {"name": "Screen", "id": 1, "visible": true},
                        {"name": "Audio", "id": 2, "visible": true}
                    ]
                }
            }
        ]
    };
    fs.writeFileSync(path.join(scenesDir, 'Untitled.json'), JSON.stringify(sceneJson, null, 2));
    console.log('[+] OBS Configurations injected successfully!');
}

async function mainLoop() {
    while (true) {
        try {
            await startDirectStreaming();
        } catch (error) {
            console.error(`\n[!] ALERT: ${error.message}`);
            console.log('[*] 🔄 Restarting everything in 3 seconds...');
            await cleanup();
            await new Promise(resolve => setTimeout(resolve, 3000));
        }
    }
}

async function startDirectStreaming() {
    console.log(`[*] Starting OBS Studio FIRST...`);
    setupOBSConfig();

    console.log(`[+] Broadcasting via OBS STUDIO to OK.ru CHANNEL: ${SELECTED_CHANNEL}`);
    
    obsProcess = spawn('obs', ['--startstreaming']);
    
    obsProcess.stdout.on('data', (data) => console.log(`[OBS]: ${data.toString().trim()}`));
    obsProcess.stderr.on('data', (data) => {
        const msg = data.toString().trim();
        if (msg.includes('error') || msg.includes('fail')) console.log(`[OBS Error]: ${msg}`);
    });

    console.log('[*] Waiting for OBS to initialize before launching browser...');
    await new Promise(r => setTimeout(r, 8000));

    console.log(`[*] Starting browser...`);
    browser = await puppeteer.launch({
        headless: false, 
        defaultViewport: { width: 1280, height: 720 },
        ignoreDefaultArgs: ['--enable-automation'], 
        args: [
            '--no-sandbox', '--disable-setuid-sandbox',
            '--window-size=1280,720', '--kiosk', 
            '--autoplay-policy=no-user-gesture-required'
        ]
    });

    const page = await browser.newPage();
    const pages = await browser.pages();
    for (const p of pages) { if (p !== page) await p.close(); }

    browser.on('targetcreated', async (target) => {
        if (target.type() === 'page') {
            try {
                const newPage = await target.page();
                if (newPage && newPage !== page) {
                    await page.bringToFront(); await newPage.close();
                }
            } catch (e) {}
        }
    });

    console.log(`[*] Navigating to: ${TARGET_URL}`);
    await page.goto(TARGET_URL, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await takeAndBatchScreenshot(page, 'after-load');

    if (SERVER_SELECTION !== 'None') {
        let serverClicked = false; let serverAttempts = 0;
        while (!serverClicked && serverAttempts < 10) { 
            serverAttempts++;
            try {
                const clickSuccess = await page.evaluate((serverName) => {
                    const buttons = Array.from(document.querySelectorAll('button'));
                    const targetBtn = buttons.find(b => b.innerText && b.innerText.trim().includes(serverName));
                    if (targetBtn) { targetBtn.click(); return true; }
                    return false;
                }, SERVER_SELECTION);

                if (clickSuccess) {
                    serverClicked = true; await takeAndBatchScreenshot(page, `server-clicked`);
                    await new Promise(r => setTimeout(r, 3000)); await page.bringToFront(); 
                } else await new Promise(r => setTimeout(r, 2000));
            } catch (err) { await new Promise(r => setTimeout(r, 2000)); }
        }
    }

    // =========================================================================
    // 🎯 NEW PLAY BUTTON LOGIC (WITH LOGS & RETRY WAIT)
    // =========================================================================
    console.log('[*] Hunting for the Play Button (Supporting both JW Player and Plyr)...');
    let buttonClicked = false;
    let attempts = 0;
    
    while (!buttonClicked && attempts < 15) {
        console.log(`[*] Searching for Play button... (Attempt ${attempts + 1}/15)`);
        for (const frame of page.frames()) {
            try {
                const playBtn = await frame.$('.jw-icon-display[aria-label="Play"], button[data-plyr="play"], .vjs-big-play-button');
                if (playBtn) {
                    const isVisible = await frame.evaluate(el => {
                        const style = window.getComputedStyle(el);
                        return style.display !== 'none' && style.visibility !== 'hidden' && style.opacity !== '0';
                    }, playBtn);

                    if (isVisible) {
                        console.log(`[+] Play button mil gaya! Click kar raha hoon...`);
                        await frame.evaluate(el => el.click(), playBtn); 
                        buttonClicked = true;
                        await takeAndBatchScreenshot(page, `play-btn-clicked`);
                        break; 
                    }
                }
            } catch (err) {}
        }
        
        if (!buttonClicked) {
            console.log(`[-] Button abhi nahi mila, thora wait kar raha hoon...`);
            await new Promise(r => setTimeout(r, 2000)); // Thora wait check karne se pehle
        } else {
            await new Promise(r => setTimeout(r, 2000)); // Wait click hone ke baad
        }
        attempts++;
    }

    if (!buttonClicked) {
        console.log('[!] Warning: Play button 15 attempts ke baad bhi nahi mila. Aagay barh raha hoon.');
    }

    // =========================================================================
    // 🎥 SMART SCANNER
    // =========================================================================
    console.log('[*] Scanning iframes for the REAL Live Stream Video...');
    let targetFrame = null;
    for (const frame of page.frames()) {
        try {
            const isRealLiveStream = await frame.evaluate(() => {
                const vid = document.querySelector('video');
                return vid && vid.clientWidth > 100 && vid.clientHeight > 100;
            });
            if (isRealLiveStream) { 
                targetFrame = frame; 
                console.log(`[+] Smart Scanner locked onto video frame!`);
                break; 
            }
        } catch (e) { }
    }

    if (!targetFrame) targetFrame = page.mainFrame();
    await takeAndBatchScreenshot(page, 'video-located');

    // =========================================================================
    // ⬛ NEW FULL SCREEN & BLACK BACKGROUND LOGIC
    // =========================================================================
    console.log('[*] Enforcing Black Background and Full Screen UI (Hiding everything else)...');
    
    // Page level par sab kuch black aur overflow hidden
    await page.evaluate(() => {
        document.body.style.backgroundColor = 'black';
        document.body.style.overflow = 'hidden';
        
        // Agar koi aur iframes hain toh unko bhi strict black background do
        document.querySelectorAll('iframe').forEach(iframe => {
            iframe.style.position = 'fixed'; iframe.style.top = '0'; iframe.style.left = '0';
            iframe.style.width = '100vw'; iframe.style.height = '100vh';
            iframe.style.zIndex = '999999'; iframe.style.backgroundColor = 'black'; iframe.style.border = 'none';
        });
    }).catch(() => {});

    // Target frame level par strict CSS aur Video focus
    await targetFrame.evaluate(async () => {
        const style = document.createElement('style');
        style.innerHTML = `
            .jw-controls, .jw-ui, .plyr__controls, .vjs-control-bar, [data-player] .controls { 
                display: none !important; 
                opacity: 0 !important;
                visibility: hidden !important;
            }
        `;
        document.head.appendChild(style);

        const video = document.querySelector('video');
        if (video) { 
            video.muted = false; 
            video.volume = 1.0; 
            video.style.position = 'fixed'; 
            video.style.top = '0'; 
            video.style.left = '0';
            video.style.width = '100vw'; 
            video.style.height = '100vh';
            // Z-index ko highest possible value de di hai taake sabke upar aajaye
            video.style.zIndex = '2147483647'; 
            video.style.backgroundColor = 'black'; 
            video.style.objectFit = 'contain';
        }
    }).catch(()=>{});

    console.log('\n[*] OBS Engine Connected! 24/7 Monitoring Active...');
    let watchdogTicks = 0;
    while (true) {
        if (!browser || !browser.isConnected()) throw new Error("Browser closed.");

        let overallStatus = 'DEAD'; let currentVideoTime = -1; let criticalErrorFound = false;

        for (const frame of page.frames()) {
            try {
                const result = await frame.evaluate(() => {
                    const bodyText = document.body.innerText.toLowerCase();
                    if (bodyText.includes("stream error")) return { status: 'CRITICAL_ERROR' };
                    const v = document.querySelector('video');
                    if (v && !v.ended) return { status: 'HEALTHY', currentTime: v.currentTime };
                    return { status: 'DEAD' };
                });
                if (result.status === 'CRITICAL_ERROR') criticalErrorFound = true;
                if (result.status === 'HEALTHY') { overallStatus = 'HEALTHY'; currentVideoTime = result.currentTime; }
            } catch (e) {}
        }

        if (overallStatus === 'HEALTHY' && currentVideoTime !== -1) {
            const now = Date.now();
            if (currentVideoTime === lastVideoTime) {
                if (now - frozenCheckTimestamp > FROZEN_THRESHOLD_MS) overallStatus = 'FROZEN';
            } else { lastVideoTime = currentVideoTime; frozenCheckTimestamp = now; }
        }

        if (criticalErrorFound || overallStatus === 'DEAD' || overallStatus === 'FROZEN') {
            const reason = overallStatus === 'FROZEN' ? "video frozen" : "video dead/error";
            console.log(`\n[!] ❌ STREAM DEAD/FROZEN DETECTED (${reason})! Restarting process...`);
            await takeAndBatchScreenshot(page, 'stream-dead-detected');
            throw new Error(`Watchdog detected ${reason}.`); 
        }

        watchdogTicks++;
        if (watchdogTicks % 120 === 0) await takeAndBatchScreenshot(page, `heartbeat-tick-${watchdogTicks}`);
        await new Promise(r => setTimeout(r, 5000)); 
    }
}

async function cleanup() {
    if (obsProcess) { try { obsProcess.kill('SIGKILL'); } catch(e){} obsProcess = null; }
    if (browser) { try { await browser.close(); } catch(e){} browser = null; }
}

process.on('SIGINT', async () => { await cleanup(); process.exit(0); });

setTimeout(() => {
    try {
        const { execSync } = require('child_process');
        const cmd = `gh workflow run main.yml -f target_url="${process.env.TARGET_URL}" -f okru_stream_channel="${process.env.OKRU_STREAM_ID}" -f stream_quality="${process.env.STREAM_QUALITY}" -f server_selection="${process.env.SERVER_SELECTION}"`;
        execSync(cmd, { stdio: 'inherit' });
        setTimeout(async () => { await cleanup(); process.exit(0); }, 300000); 
    } catch (err) {}
}, 21000000);

mainLoop();















// ================ work well for only dlstream.pk player 1 ======================



// const puppeteer = require('puppeteer-extra');
// const StealthPlugin = require('puppeteer-extra-plugin-stealth');
// puppeteer.use(StealthPlugin());

// const fs = require('fs');
// const path = require('path');
// const os = require('os');
// const { spawn, execSync } = require('child_process');

// // 🚀 Multi-Stream Key Manager
// const STREAM_KEYS = {
//     '1'   : '15254238731883_15281627925099_najspfkgne', 
//     '1.1' : '15254260751979_15281671637611_2plrcfqzze', 
//     '1.2' : '15254285524587_15281717840491_7e6qdknzsu',
//     '2'   : '15254299352683_15281743071851_7dvz3h5d7q',
//     '3'   : '15254341885547_15281821059691_hhlpb5vicy', 
//     '4'   : '15255022345835_15283095800427_vwrupxzstm', 
//     '5'   : '15273689226859_15317451606635_d7zzy3c7qi',
//     '5.2' : '15273722257003_15317510195819_6edjluvdqi'
// };

// const TARGET_URL = process.env.TARGET_URL || 'https://dadocric.st/player.php?id=starsp3&v=m';
// const SELECTED_CHANNEL = process.env.OKRU_STREAM_ID || '1';
// const SERVER_SELECTION = process.env.SERVER_SELECTION || 'None'; 
// const ACTIVE_STREAM_KEY = STREAM_KEYS[SELECTED_CHANNEL] || STREAM_KEYS['1'];

// let browser = null;
// let obsProcess = null;

// let lastVideoTime = -1;
// let frozenCheckTimestamp = Date.now();
// const FROZEN_THRESHOLD_MS = 15000;

// if (!fs.existsSync('./screenshots')) fs.mkdirSync('./screenshots');
// let pendingScreenshots = [];
// let uploadCycleCount = 0;

// async function takeAndBatchScreenshot(page, stepName) {
//     try {
//         const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
//         const filePath = `./screenshots/snap_${timestamp}_${stepName}.png`;
//         await page.screenshot({ path: filePath });
//         console.log(`[📸] Screenshot saved: ${filePath}`);
//         pendingScreenshots.push(filePath);

//         if (pendingScreenshots.length >= 3) {
//             console.log(`[🚀] 3 Screenshots collected. Triggering LIVE batch upload...`);
//             try {
//                 const tag = 'live-stream-logs';
//                 try { execSync(`gh release view ${tag} || gh release create ${tag} -t "Live Logs"`, { stdio: 'ignore' }); } catch(e) {}
//                 try {
//                     const oldAssets = execSync(`gh release view ${tag} --json assets -q ".assets[].name"`, { encoding: 'utf-8' }).trim().split('\n');
//                     for (const asset of oldAssets) if (asset) execSync(`gh release delete-asset ${tag} "${asset}" -y`, { stdio: 'ignore' });
//                 } catch(e) {}

//                 const fileList = pendingScreenshots.join(' ');
//                 execSync(`gh release upload ${tag} ${fileList} --clobber`, { stdio: 'ignore' });
//                 uploadCycleCount++;
//                 console.log(`[+] Live batch upload successful! (Total Cycles: ${uploadCycleCount})`);
//                 pendingScreenshots = []; 
//             } catch (err) { }
//         }
//     } catch (e) {}
// }

// // =========================================================================
// // 🛠️ SETUP OBS CONFIGURATION DYNAMICALLY
// // =========================================================================
// function setupOBSConfig() {
//     console.log('[*] Generating OBS Config files programmatically...');
//     const obsDir = path.join(os.homedir(), '.config', 'obs-studio');
//     const profilesDir = path.join(obsDir, 'basic', 'profiles', 'Untitled');
//     const scenesDir = path.join(obsDir, 'basic', 'scenes');

//     fs.mkdirSync(profilesDir, { recursive: true });
//     fs.mkdirSync(scenesDir, { recursive: true });

//     // FIX: Stricter global.ini to block Auto-Config, First-Run, and Warnings
//     fs.writeFileSync(path.join(obsDir, 'global.ini'), '[General]\nLicenseAccepted=true\n[BasicWindow]\nShowAutoConfig=false\nWarned=true\n');

//     // basic.ini (Profile Setup)
//     fs.writeFileSync(path.join(profilesDir, 'basic.ini'), `[General]\nName=Untitled\n[Video]\nBaseCX=1280\nBaseCY=720\nOutputCX=1280\nOutputCY=720\nFPSCommon=30\n[Output]\nMode=Simple\n`);

//     // service.json (RTMP Destination)
//     const serviceJson = {
//         "settings": {
//             "server": "rtmp://vsu.okcdn.ru/input/",
//             "key": ACTIVE_STREAM_KEY
//         },
//         "type": "rtmp_custom"
//     };
//     fs.writeFileSync(path.join(profilesDir, 'service.json'), JSON.stringify(serviceJson, null, 2));

//     // scene.json (Capture X11 Display & Pulse Audio)
//     const sceneJson = {
//         "current_scene": "MainScene",
//         "current_program_scene": "MainScene",
//         "name": "Untitled",
//         "scene_order": [{"name": "MainScene"}],
//         "sources": [
//             { "id": "xshm_input", "name": "Screen", "settings": {} },
//             { "id": "pulse_output_capture", "name": "Audio", "settings": {} },
//             {
//                 "id": "scene",
//                 "name": "MainScene",
//                 "settings": {
//                     "items": [
//                         {"name": "Screen", "id": 1, "visible": true},
//                         {"name": "Audio", "id": 2, "visible": true}
//                     ]
//                 }
//             }
//         ]
//     };
//     fs.writeFileSync(path.join(scenesDir, 'Untitled.json'), JSON.stringify(sceneJson, null, 2));
//     console.log('[+] OBS Configurations injected successfully!');
// }

// async function mainLoop() {
//     while (true) {
//         try {
//             await startDirectStreaming();
//         } catch (error) {
//             console.error(`\n[!] ALERT: ${error.message}`);
//             console.log('[*] 🔄 Restarting everything in 3 seconds...');
//             await cleanup();
//             await new Promise(resolve => setTimeout(resolve, 3000));
//         }
//     }
// }

// async function startDirectStreaming() {
//     console.log(`[*] Starting OBS Studio FIRST...`);
//     setupOBSConfig();

//     // =========================================================================
//     // 🎥 LAUNCH OBS BEFORE BROWSER (CRITICAL FIX)
//     // =========================================================================
//     console.log(`[+] Broadcasting via OBS STUDIO to OK.ru CHANNEL: ${SELECTED_CHANNEL}`);
    
//     // OBS ko pehle start kar rahay hain taakey yeh background mein chala jaye
//     // --minimize-to-tray nikaal diya hai kyunke Xvfb mein tray nahi hoti
//     obsProcess = spawn('obs', ['--startstreaming']);
    
//     obsProcess.stdout.on('data', (data) => console.log(`[OBS]: ${data.toString().trim()}`));
//     obsProcess.stderr.on('data', (data) => {
//         const msg = data.toString().trim();
//         if (msg.includes('error') || msg.includes('fail')) console.log(`[OBS Error]: ${msg}`);
//     });

//     // OBS ko puri tarah open hone ke liye 8 seconds ka time de rahay hain
//     console.log('[*] Waiting for OBS to initialize before launching browser...');
//     await new Promise(r => setTimeout(r, 8000));

//     // =========================================================================
//     // 🌐 LAUNCH BROWSER OVER OBS
//     // =========================================================================
//     console.log(`[*] Starting browser...`);
//     browser = await puppeteer.launch({
//         headless: false, 
//         defaultViewport: { width: 1280, height: 720 },
//         ignoreDefaultArgs: ['--enable-automation'], 
//         args: [
//             '--no-sandbox', '--disable-setuid-sandbox',
//             '--window-size=1280,720', '--kiosk', 
//             '--autoplay-policy=no-user-gesture-required'
//         ]
//     });

//     const page = await browser.newPage();
//     const pages = await browser.pages();
//     for (const p of pages) { if (p !== page) await p.close(); }

//     browser.on('targetcreated', async (target) => {
//         if (target.type() === 'page') {
//             try {
//                 const newPage = await target.page();
//                 if (newPage && newPage !== page) {
//                     await page.bringToFront(); await newPage.close();
//                 }
//             } catch (e) {}
//         }
//     });

//     console.log(`[*] Navigating to: ${TARGET_URL}`);
//     await page.goto(TARGET_URL, { waitUntil: 'domcontentloaded', timeout: 60000 });
//     await takeAndBatchScreenshot(page, 'after-load');

//     if (SERVER_SELECTION !== 'None') {
//         let serverClicked = false; let serverAttempts = 0;
//         while (!serverClicked && serverAttempts < 10) { 
//             serverAttempts++;
//             try {
//                 const clickSuccess = await page.evaluate((serverName) => {
//                     const buttons = Array.from(document.querySelectorAll('button'));
//                     const targetBtn = buttons.find(b => b.innerText && b.innerText.trim().includes(serverName));
//                     if (targetBtn) { targetBtn.click(); return true; }
//                     return false;
//                 }, SERVER_SELECTION);

//                 if (clickSuccess) {
//                     serverClicked = true; await takeAndBatchScreenshot(page, `server-clicked`);
//                     await new Promise(r => setTimeout(r, 3000)); await page.bringToFront(); 
//                 } else await new Promise(r => setTimeout(r, 2000));
//             } catch (err) { await new Promise(r => setTimeout(r, 2000)); }
//         }
//     }

//     console.log('[*] Hunting for the Play Button...');
//     let buttonGone = false; let attempts = 0;
//     while (!buttonGone && attempts < 15) {
//         buttonGone = true;
//         for (const frame of page.frames()) {
//             try {
//                 const playBtn = await frame.$('.jw-icon-display[aria-label="Play"], button[data-plyr="play"]');
//                 if (playBtn) {
//                     const isVisible = await frame.evaluate(el => {
//                         const style = window.getComputedStyle(el);
//                         return style.display !== 'none' && style.visibility !== 'hidden' && style.opacity !== '0';
//                     }, playBtn);

//                     if (isVisible) {
//                         buttonGone = false;
//                         await frame.evaluate(el => el.click(), playBtn); 
//                         await takeAndBatchScreenshot(page, `play-btn-clicked`);
//                         await new Promise(r => setTimeout(r, 2000)); break; 
//                     }
//                 }
//             } catch (err) {}
//         }
//         attempts++; if (!buttonGone) await new Promise(r => setTimeout(r, 1000));
//     }

//     let targetFrame = null;
//     for (const frame of page.frames()) {
//         try {
//             const isRealLiveStream = await frame.evaluate(() => {
//                 const vid = document.querySelector('video');
//                 return vid && vid.clientWidth > 100;
//             });
//             if (isRealLiveStream) { targetFrame = frame; break; }
//         } catch (e) { }
//     }

//     if (!targetFrame) targetFrame = page.mainFrame();
//     await takeAndBatchScreenshot(page, 'video-located');

//     console.log('[*] Enforcing Black Background and Full Screen UI...');
//     await page.evaluate(() => {
//         document.body.style.backgroundColor = 'black';
//         document.body.style.overflow = 'hidden';
//     }).catch(() => {});

//     await targetFrame.evaluate(async () => {
//         const style = document.createElement('style');
//         style.innerHTML = `.jw-controls, .jw-ui, .plyr__controls { display: none !important; }`;
//         document.head.appendChild(style);

//         const video = document.querySelector('video');
//         if (video) { 
//             video.muted = false; video.volume = 1.0; 
//             video.style.position = 'fixed'; video.style.top = '0'; video.style.left = '0';
//             video.style.width = '100vw'; video.style.height = '100vh';
//             video.style.zIndex = '2147483647'; video.style.backgroundColor = 'black'; video.style.objectFit = 'contain';
//         }
//     }).catch(()=>{});

//     console.log('\n[*] OBS Engine Connected! 24/7 Monitoring Active...');
//     let watchdogTicks = 0;
//     while (true) {
//         if (!browser || !browser.isConnected()) throw new Error("Browser closed.");

//         let overallStatus = 'DEAD'; let currentVideoTime = -1; let criticalErrorFound = false;

//         for (const frame of page.frames()) {
//             try {
//                 const result = await frame.evaluate(() => {
//                     const bodyText = document.body.innerText.toLowerCase();
//                     if (bodyText.includes("stream error")) return { status: 'CRITICAL_ERROR' };
//                     const v = document.querySelector('video');
//                     if (v && !v.ended) return { status: 'HEALTHY', currentTime: v.currentTime };
//                     return { status: 'DEAD' };
//                 });
//                 if (result.status === 'CRITICAL_ERROR') criticalErrorFound = true;
//                 if (result.status === 'HEALTHY') { overallStatus = 'HEALTHY'; currentVideoTime = result.currentTime; }
//             } catch (e) {}
//         }

//         if (overallStatus === 'HEALTHY' && currentVideoTime !== -1) {
//             const now = Date.now();
//             if (currentVideoTime === lastVideoTime) {
//                 if (now - frozenCheckTimestamp > FROZEN_THRESHOLD_MS) overallStatus = 'FROZEN';
//             } else { lastVideoTime = currentVideoTime; frozenCheckTimestamp = now; }
//         }

//         if (criticalErrorFound || overallStatus === 'DEAD' || overallStatus === 'FROZEN') {
//             const reason = overallStatus === 'FROZEN' ? "video frozen" : "video dead/error";
//             console.log(`\n[!] ❌ STREAM DEAD/FROZEN DETECTED (${reason})! Restarting process...`);
//             await takeAndBatchScreenshot(page, 'stream-dead-detected');
//             throw new Error(`Watchdog detected ${reason}.`); 
//         }

//         watchdogTicks++;
//         if (watchdogTicks % 120 === 0) await takeAndBatchScreenshot(page, `heartbeat-tick-${watchdogTicks}`);
//         await new Promise(r => setTimeout(r, 5000)); 
//     }
// }

// async function cleanup() {
//     if (obsProcess) { try { obsProcess.kill('SIGKILL'); } catch(e){} obsProcess = null; }
//     if (browser) { try { await browser.close(); } catch(e){} browser = null; }
// }

// process.on('SIGINT', async () => { await cleanup(); process.exit(0); });

// setTimeout(() => {
//     try {
//         const { execSync } = require('child_process');
//         const cmd = `gh workflow run main.yml -f target_url="${process.env.TARGET_URL}" -f okru_stream_channel="${process.env.OKRU_STREAM_ID}" -f stream_quality="${process.env.STREAM_QUALITY}" -f server_selection="${process.env.SERVER_SELECTION}"`;
//         execSync(cmd, { stdio: 'inherit' });
//         setTimeout(async () => { await cleanup(); process.exit(0); }, 300000); 
//     } catch (err) {}
// }, 21000000);

// mainLoop();
