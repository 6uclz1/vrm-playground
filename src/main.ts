import './style.css';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { VRM, VRMLoaderPlugin, VRMUtils, VRMHumanBoneName } from '@pixiv/three-vrm';

const $ = <T extends HTMLElement = HTMLElement>(id: string) => document.getElementById(id) as T;
document.querySelector('#app')!.innerHTML = `
<main><div id="viewport" tabindex="0" aria-label="3Dビュー。ドラッグで回転、ホイールでズーム、矢印キーで移動"><div id="empty"><button id="empty-upload" class="glass">＋ VRMを開く</button><small>またはドロップ</small></div></div>
<header class="glass"><span class="brand">VRM Playground</span><button id="upload" title="VRMファイルを開く">＋ 開く</button><button id="capture" title="PNG保存" disabled>↓ PNG</button><button id="fullscreen" title="全画面表示" aria-label="全画面表示">⛶</button><button id="toggle-ui" title="UIを隠す" aria-label="UIを隠す">◉</button></header>
<button id="restore-ui" class="glass" hidden aria-label="UIを表示" title="UIを表示">◉</button>
<div id="status" class="glass" role="status" aria-live="polite"></div>
<nav class="camera-bar glass" aria-label="カメラ"><button data-view="front" class="active">正面</button><button data-view="side">横</button><button data-view="back">背面</button><button data-view="face">顔</button><button data-view="full">全身</button><button id="toggle-controls" aria-expanded="false" aria-controls="controls-panel">調整</button></nav>
<aside id="controls-panel" class="glass" hidden><div class="panel-title"><b id="model-name">モデル未選択</b><button id="close-controls" aria-label="調整を閉じる">×</button></div>
<fieldset id="model-controls" disabled><section class="control-section"><h2>モーション</h2><div class="motions"><button data-motion="stand" class="active">直立</button><button data-motion="idle">アイドル</button><button data-motion="walk">歩く</button><button data-motion="wave">手振り</button><button data-motion="tpose">Tポーズ</button></div><div class="range-label"><label for="arm-angle">腕の角度</label><output id="arm-angle-value">65°</output></div><input id="arm-angle" type="range" min="0" max="90" step="1" value="65" aria-valuetext="65度"><div class="range-endpoints"><span>T字</span><span>気をつけ</span></div><div class="range-label"><label for="speed">速度</label><output id="speed-value">1.0×</output></div><input id="speed" type="range" min="0.2" max="2" step="0.1" value="1"><button id="pause" class="wide">Ⅱ 一時停止</button></section>
<section class="control-section"><div class="range-label"><label for="rotation">向き</label><output id="rotation-value">0°</output></div><input id="rotation" type="range" min="-180" max="180" value="0"><div class="position-grid"><label>X<input id="pos-x" type="number" min="-5" max="5" step="0.1" value="0"></label><label>Z<input id="pos-z" type="number" min="-5" max="5" step="0.1" value="0"></label></div><button id="reset-model" class="wide">位置をリセット</button></section>
<section class="control-section"><label for="expression">表情</label><select id="expression"><option value="">ニュートラル</option></select></section></fieldset>
<section class="control-section"><div class="range-label"><label for="light">ライト</label><output id="light-value">100%</output></div><input id="light" type="range" min="0" max="200" value="100"><div class="stage-row"><span>背景</span><div class="swatches"><button data-bg="mist" class="swatch active" aria-label="ミスト背景"></button><button data-bg="dark" class="swatch dark" aria-label="ダーク背景"></button><button data-bg="rose" class="swatch rose" aria-label="ローズ背景"></button></div></div><div class="checks"><label><input id="grid" type="checkbox" checked> グリッド</label><label><input id="orbit" type="checkbox"> 自動回転</label></div><button id="reset-camera" class="wide">カメラをリセット</button></section></aside></main><input id="file" type="file" accept=".vrm" hidden>`;

const viewport = $('viewport');
const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.NoToneMapping;
viewport.prepend(renderer.domElement);
const scene = new THREE.Scene();
scene.background = new THREE.Color('#eef0ed');
const camera = new THREE.PerspectiveCamera(32, 1, 0.01, 100);
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true; controls.minDistance = 0.2; controls.maxDistance = 20;
const keyLight = new THREE.DirectionalLight(0xfff8ed, 2.5); keyLight.position.set(2, 4, 3);
const fill = new THREE.HemisphereLight(0xf3f6ff, 0x878b80, 1.8); scene.add(keyLight, fill);
const grid = new THREE.GridHelper(20, 80, 0xc2c9bd, 0xdce0d8); scene.add(grid);
const ring = new THREE.Mesh(new THREE.RingGeometry(0.55, 0.565, 96), new THREE.MeshBasicMaterial({color:0xa4b594,side:THREE.DoubleSide})); ring.rotation.x = -Math.PI / 2; ring.position.y = 0.002; scene.add(ring);
let vrm: VRM | undefined; let height = 1.7; let centerY = 0.85; let motion = 'stand'; let armAngle = 65; let paused = false; let time = 0; let loading = false;
function view(name = 'full') { const targetY = name === 'face' ? centerY + height * 0.38 : centerY; controls.target.set(vrm?.scene.position.x ?? 0, targetY, vrm?.scene.position.z ?? 0); const distance = name === 'face' ? height * 0.9 : height * 2.5; const dir = name === 'side' ? new THREE.Vector3(1,0,0) : name === 'back' ? new THREE.Vector3(0,0,-1) : new THREE.Vector3(0,0,1); camera.position.copy(controls.target).addScaledVector(dir,distance); controls.update(); }
view();
new ResizeObserver(() => { const {width, height} = viewport.getBoundingClientRect(); renderer.setSize(width,height); camera.aspect = width/height; camera.updateProjectionMatrix(); }).observe(viewport);
function bone(name: VRMHumanBoneName, x=0,y=0,z=0) { vrm?.humanoid.getNormalizedBoneNode(name)?.rotation.set(x,y,z); }
function pose() { if (!vrm) return; vrm.humanoid.resetNormalizedPose(); if(motion==='tpose') return; const angle=THREE.MathUtils.degToRad(armAngle); bone('leftUpperArm',0,0,-angle); bone('rightUpperArm',0,0,angle);
 if(motion==='idle') { bone('spine',0,0,Math.sin(time*1.5)*0.025); bone('head',0,Math.sin(time*0.8)*0.08); }
 if(motion==='walk') { const s=Math.sin(time*5); bone('leftUpperLeg',s*0.45); bone('rightUpperLeg',-s*0.45); bone('leftLowerLeg',Math.max(0,-s)*0.65); bone('rightLowerLeg',Math.max(0,s)*0.65); bone('leftUpperArm',-s*0.3,0,-angle); bone('rightUpperArm',s*0.3,0,angle); }
 if(motion==='wave') { bone('rightUpperArm',0,0,-0.7); bone('rightLowerArm',0,0,-0.9-Math.sin(time*5)*0.25); bone('rightHand',Math.sin(time*5)*0.2); bone('head',0,0,-0.08); }
}
async function load(file: File) {
 if(loading) return; if(!/\.vrm$/i.test(file.name)) { $('status').textContent='拡張子 .vrm のファイルを選んでください。'; return; }
 loading=true; $('status').textContent='モデルを読み込み中…'; $('upload').setAttribute('disabled','');
 let candidate: VRM | undefined;
 try { const buffer = await file.arrayBuffer(); const header = new DataView(buffer); if(buffer.byteLength<20 || header.getUint32(0,true)!==0x46546c67) throw new Error('有効なバイナリVRMではありません');
 const manager = new THREE.LoadingManager(); manager.setURLModifier(url => { if(!url.startsWith('data:') && !url.startsWith('blob:')) throw new Error('外部ファイルを参照するVRMは読み込めません'); return url; });
 const loader=new GLTFLoader(manager); loader.register(parser=>new VRMLoaderPlugin(parser));
 const gltf=await loader.parseAsync(buffer,''); candidate=gltf.userData.vrm as VRM | undefined; if(!candidate) { VRMUtils.deepDispose(gltf.scene); throw new Error('VRM情報が見つかりません'); }
 VRMUtils.rotateVRM0(candidate); candidate.scene.traverse(o=>{o.frustumCulled=false;});
 if(vrm) { scene.remove(vrm.scene); VRMUtils.deepDispose(vrm.scene); }
 vrm=candidate; scene.add(vrm.scene); motion='stand'; time=0; paused=false; syncArmControl(); pose(); vrm.update(0);
 const bounds=new THREE.Box3().setFromObject(vrm.scene); vrm.scene.position.y-=bounds.min.y; height=bounds.max.y-bounds.min.y; centerY=height/2; controls.maxDistance=Math.max(20,height*8); ring.scale.setScalar(height/1.7); view();
 $('empty').hidden=true; ($('model-controls') as HTMLFieldSetElement).disabled=false; ($('capture') as HTMLButtonElement).disabled=false;
 const meta=vrm.meta; $('model-name').textContent=(meta.metaVersion==='1' ? meta.name : meta.title) || file.name;
 const expression=$<HTMLSelectElement>('expression'); expression.replaceChildren(new Option('ニュートラル','')); for(const e of vrm.expressionManager?.expressions??[]) expression.add(new Option(e.expressionName,e.expressionName)); expression.disabled=expression.options.length===1;
 resetPosition(); document.querySelectorAll('[data-motion]').forEach(b=>b.classList.toggle('active',(b as HTMLElement).dataset.motion==='stand')); $('pause').textContent='Ⅱ 一時停止'; $('status').textContent='読み込み完了'; setTimeout(()=>{ if(!loading && $('status').textContent==='読み込み完了') $('status').textContent=''; },2000);
 } catch(error) { if(candidate && candidate!==vrm) VRMUtils.deepDispose(candidate.scene); $('status').textContent=`読み込めませんでした: ${error instanceof Error?error.message:'ファイルを確認してください'}`; } finally {loading=false; $('upload').removeAttribute('disabled'); $<HTMLInputElement>('file').value='';}
}
['upload','empty-upload'].forEach(id=>$(id).onclick=()=>$('file').click()); $<HTMLInputElement>('file').onchange=e=>{ const file=(e.target as HTMLInputElement).files?.[0]; if(file) void load(file); };
viewport.ondragover=e=>{e.preventDefault();viewport.classList.add('dragging');}; viewport.ondragleave=()=>viewport.classList.remove('dragging'); viewport.ondrop=e=>{e.preventDefault();viewport.classList.remove('dragging');const file=e.dataTransfer?.files[0];if(file) void load(file);};
document.querySelectorAll<HTMLButtonElement>('[data-motion]').forEach(b=>b.onclick=()=>{motion=b.dataset.motion!;time=0;syncArmControl();document.querySelectorAll('[data-motion]').forEach(x=>x.classList.toggle('active',x===b));pose();});
document.querySelectorAll<HTMLButtonElement>('[data-view]').forEach(b=>b.onclick=()=>{view(b.dataset.view);document.querySelectorAll('[data-view]').forEach(x=>x.classList.toggle('active',x===b));});
$('pause').onclick=()=>{paused=!paused;$('pause').textContent=paused?'▶ 再開':'Ⅱ 一時停止';};
$<HTMLInputElement>('speed').oninput=e=>{$('speed-value').textContent=`${Number((e.target as HTMLInputElement).value).toFixed(1)}×`;};
$<HTMLInputElement>('rotation').oninput=e=>{const v=Number((e.target as HTMLInputElement).value);if(vrm) vrm.scene.rotation.y=THREE.MathUtils.degToRad(v)+(vrm.meta.metaVersion==='0'?Math.PI:0);$('rotation-value').textContent=`${v}°`;};
function resetPosition(){ if(vrm){vrm.scene.position.x=0;vrm.scene.position.z=0;vrm.scene.rotation.y=vrm.meta.metaVersion==='0'?Math.PI:0;} ['pos-x','pos-z','rotation'].forEach(id=>$<HTMLInputElement>(id).value='0');$('rotation-value').textContent='0°';}
$('reset-model').onclick=resetPosition;
['x','z'].forEach(axis=>$<HTMLInputElement>(`pos-${axis}`).oninput=e=>{const v=Number((e.target as HTMLInputElement).value);if(vrm && Number.isFinite(v)) vrm.scene.position[axis as 'x'|'z']=THREE.MathUtils.clamp(v,-5,5);});
viewport.onkeydown=e=>{ if(!vrm || !['ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.key)) return; e.preventDefault();const a=e.key==='ArrowLeft'||e.key==='ArrowRight'?'x':'z';vrm.scene.position[a]=THREE.MathUtils.clamp(vrm.scene.position[a]+(e.key==='ArrowLeft'||e.key==='ArrowUp'?-0.1:0.1),-5,5);$<HTMLInputElement>(`pos-${a}`).value=vrm.scene.position[a].toFixed(1);};
$<HTMLSelectElement>('expression').onchange=e=>{const manager=vrm?.expressionManager;manager?.resetValues();const name=(e.target as HTMLSelectElement).value;if(name)manager?.setValue(name,1);};
$<HTMLInputElement>('orbit').onchange=e=>controls.autoRotate=(e.target as HTMLInputElement).checked;
$<HTMLInputElement>('grid').onchange=e=>{grid.visible=ring.visible=(e.target as HTMLInputElement).checked;};
$<HTMLInputElement>('light').oninput=e=>{const v=Number((e.target as HTMLInputElement).value);keyLight.intensity=2.5*v/100;fill.intensity=1.8*v/100;$('light-value').textContent=`${v}%`;};
document.querySelectorAll<HTMLButtonElement>('[data-bg]').forEach(b=>b.onclick=()=>{const dark=b.dataset.bg==='dark';scene.background=new THREE.Color(dark?'#242c2a':b.dataset.bg==='rose'?'#efe3e0':'#eef0ed');viewport.classList.toggle('dark-stage',dark);document.querySelectorAll('[data-bg]').forEach(x=>x.classList.toggle('active',x===b));});
$('reset-camera').onclick=()=>view(); $('capture').onclick=()=>{renderer.render(scene,camera);renderer.domElement.toBlob(blob=>{if(!blob)return;const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download='vrm-playground.png';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);});};
const clock = new THREE.Clock(); renderer.setAnimationLoop(()=>{const delta=Math.min(clock.getDelta(),0.05);if(!paused)time+=delta*Number($<HTMLInputElement>('speed').value); if(vrm){pose();vrm.update(paused?0:delta);} controls.update();renderer.render(scene,camera);});
renderer.domElement.addEventListener('webglcontextlost',e=>{e.preventDefault();$('status').textContent='GPU接続が失われました。ページを再読み込みしてください。';});

function panel(open: boolean) { $('controls-panel').hidden=!open; $('toggle-controls').setAttribute('aria-expanded',String(open)); if(open) $('close-controls').focus(); else $('toggle-controls').focus(); }
$('toggle-controls').onclick=()=>panel($('controls-panel').hidden);
$('close-controls').onclick=()=>panel(false);
function hideUI(hidden: boolean) { document.body.classList.toggle('ui-hidden',hidden); $('restore-ui').hidden=!hidden; if(hidden) $('restore-ui').focus(); else $('toggle-ui').focus(); }
$('toggle-ui').onclick=()=>hideUI(true); $('restore-ui').onclick=()=>hideUI(false);
document.addEventListener('keydown',e=>{if(e.key==='Escape'){ if(document.body.classList.contains('ui-hidden')) hideUI(false); else if(!$('controls-panel').hidden) panel(false); }});
$('fullscreen').onclick=async()=>{try{if(document.fullscreenElement) await document.exitFullscreen();else await document.documentElement.requestFullscreen();}catch{$('status').textContent='このブラウザでは全画面表示を使用できません。';}};
document.addEventListener('fullscreenchange',()=>{const active=!!document.fullscreenElement;$('fullscreen').setAttribute('aria-label',active?'全画面を終了':'全画面表示');});

function syncArmControl() { const value=motion==='tpose'?0:armAngle; $<HTMLInputElement>('arm-angle').value=String(value); $('arm-angle-value').textContent=`${value}°`; $('arm-angle').setAttribute('aria-valuetext',`${value}度`); }
$<HTMLInputElement>('arm-angle').oninput=e=>{armAngle=Number((e.target as HTMLInputElement).value);if(motion==='tpose'){motion='stand';document.querySelectorAll<HTMLButtonElement>('[data-motion]').forEach(b=>b.classList.toggle('active',b.dataset.motion==='stand'));}syncArmControl();pose();};
