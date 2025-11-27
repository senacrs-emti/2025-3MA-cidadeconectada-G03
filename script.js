// script.js — lógica do mapa, rota e simulação em tempo real

// ======= Definições de rotas (Porto Alegre) =======
const routeDefinitions = {
  'zona-sul': {
    title: 'Rota Zona Sul',
    points: [
      [-30.034647, -51.217658], // Praça da Matriz (início)
      [-30.02965, -51.2296],    // Mercado Público
      [-30.0275, -51.222],      // Cais Mauá
      [-30.0665, -51.2296],     // Beira-Rio (transição)
      [-30.0850, -51.23]        // Zona Sul (final aproximado)
    ],
    names: ['Praça da Matriz','Mercado Público','Cais Mauá','Estádio Beira-Rio','Zona Sul']
  },
  'zona-norte': {
    title: 'Rota Zona Norte',
    points: [
      [-30.034647, -51.217658], // Praça da Matriz
      [-30.034, -51.206],       // Rua dos Andradas / sentido norte
      [-30.022, -51.200],       // Parque Germânia (exemplo)
      [-30.010, -51.198],       // Zona Norte (final aproximado)
    ],
    names: ['Praça da Matriz','Andradas (N)','Parque Germânia','Zona Norte']
  },
  'centro': {
    title: 'Rota Centro',
    points: [
      [-30.034647, -51.217658], // Praça da Matriz
      [-30.02965, -51.2296],    // Mercado Público
      [-30.0275, -51.222],      // Cais Mauá
      [-30.0186, -51.2185],     // Gasômetro
    ],
    names: ['Praça da Matriz','Mercado Público','Cais Mauá','Usina do Gasômetro']
  },
  'leste': {
    title: 'Rota Leste',
    points: [
      [-30.034647, -51.217658],
      [-30.038, -51.200],
      [-30.046, -51.195],
      [-30.052, -51.190]
    ],
    names: ['Matriz','Rua Leste A','Bairro Industrial','Leste Final']
  },
  'nordeste': {
    title: 'Rota Nordeste',
    points: [
      [-30.034647, -51.217658],
      [-30.028, -51.205],
      [-30.020, -51.198],
      [-30.012, -51.190]
    ],
    names: ['Matriz','Av. Nordeste','Praça X','Nordeste Final']
  }
};

// elementos UI
const statusEl = document.getElementById('status');
const etaEl = document.getElementById('eta');
const lastUpdateEl = document.getElementById('lastUpdate');
const btnToggle = document.getElementById('btnToggle');
const btnReset = document.getElementById('btnReset');
const speedRange = document.getElementById('speedRange');
const routeList = document.getElementById('routeList');
const startTimeInput = document.getElementById('startTime');
const overlayETA = document.getElementById('overlayETA');
const overlaySpeed = document.getElementById('overlaySpeed');
const btnToggleSidebar = document.getElementById('btnToggleSidebar');
const errorBox = document.getElementById('errorBox');
const routeSelect = document.getElementById('routeSelect');
const routeTitle = document.getElementById('routeTitle');
const truckEl = document.getElementById('truckSvg'); // SVG element

function setError(message){ if(errorBox){ errorBox.hidden = false; errorBox.textContent = String(message); } console.error(message); }

// helpers
function toLocalInputString(d){ const pad=n=>String(n).padStart(2,'0'); return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`; }
const now = new Date(); now.setSeconds(0,0); if(startTimeInput) startTimeInput.value = toLocalInputString(now);

let running = true;
let speedKmh = Number(speedRange ? speedRange.value : 30) || 30;
let speedMps = speedKmh * 1000 / 3600;

// mapa e camadas
let map, routeLine, progressLine, marker;
let expandedRoute = []; // array de L.LatLng
let originalWaypointDistAlong = [];
let expandedCumulativeDist = [];
let osrmCumulativeSeconds = [];
let totalRouteDistance = 0;
let totalRouteDuration = 0;
let scheduleTimes = [];
let currentRouteKey = 'zona-sul';

// animação do caminhão
const truckRotationOffset = 0; // caminhão na posição normal, sem rotação
let dashAnimationOffset = 0;
let dashAnimRafId = null;

// Adicionar mapa de cores por rota
const routeColors = {
  'zona-sul': '#06b6d4',
  'zona-norte': '#ff7a59',
  'centro': '#7c4dff',
  'leste': '#00b894',
  'nordeste': '#ffbe0b'
};

// inicializar mapa
function initMap(){
  if(typeof L === 'undefined'){ setError('Leaflet não carregado'); return; }
  try{
    map = L.map('map', {zoomControl:true}).setView(routeDefinitions[currentRouteKey].points[0], 13);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:19, attribution:''}).addTo(map);

    // routeLine: linha vermelha (não percorrida ainda)
    routeLine = L.polyline([], {
      color: '#d32f2f',
      weight: 5,
      opacity: 0.9,
      lineCap: 'round'
    }).addTo(map);

    // progressLine: linha verde (já percorrida)
    progressLine = L.polyline([], {
      color: '#00c853',
      weight: 6,
      opacity: 0.95,
      lineCap: 'round'
    }).addTo(map);

    // usar marker somente como fallback visual
    const truckHtml = `<svg width="40" height="40" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="20" cy="20" r="19" fill="${routeColors[currentRouteKey]||'#06b6d4'}" opacity="0.15" stroke="${routeColors[currentRouteKey]||'#06b6d4'}" stroke-width="2"/>
      <rect x="10" y="14" width="16" height="12" rx="2" fill="${routeColors[currentRouteKey]||'#06b6d4'}" stroke="${routeColors[currentRouteKey]||'#06b6d4'}" stroke-width="1.5"/>
      <path d="M26 16h4v3h-4" fill="${routeColors[currentRouteKey]||'#06b6d4'}" stroke="${routeColors[currentRouteKey]||'#06b6d4'}" stroke-width="1.5"/>
      <circle cx="14" cy="28" r="2" fill="#333"/>
      <circle cx="28" cy="28" r="2" fill="#333"/>
    </svg>`;
    const truckIcon = L.divIcon({className:'truck-icon', html:truckHtml, iconSize:[40,40], iconAnchor:[20,20]});

    marker = L.marker(routeDefinitions[currentRouteKey].points[0], {icon:truckIcon, title:'Caminhão'}).addTo(map);
    marker.setOpacity(0); // escondemos o marker para mostrar apenas o SVG posicionado
    marker.bindPopup('Caminhão');

    // garantir tamanho visível
    const mapEl = document.getElementById('map');
    if(mapEl && (mapEl.clientHeight<20 || mapEl.offsetHeight<20)) mapEl.style.height = mapEl.style.height || '60vh';
    setTimeout(()=>{ if(map && typeof map.invalidateSize==='function') map.invalidateSize(); }, 120);

    if(truckEl){ truckEl.hidden = false; }
  }catch(err){ setError('Erro iniciando mapa: '+err.message); }
}

// fetch OSRM (recebe pontos no formato [[lat,lng],...])
async function fetchRouteFromOSRM(points){
  try{
    const coords = points.map(p=>`${p[1]},${p[0]}`).join(';');
    const url = `https://router.project-osrm.org/route/v1/driving/${coords}?overview=full&geometries=geojson`;
    const res = await fetch(url);
    if(!res.ok) throw new Error('OSRM retornou '+res.status);
    const json = await res.json();
    if(!json.routes || !json.routes.length) throw new Error('Nenhuma rota encontrada');

    const routeGeo = json.routes[0].geometry.coordinates; // [lon,lat]
    const legs = json.routes[0].legs;
    totalRouteDistance = json.routes[0].distance;
    totalRouteDuration = json.routes[0].duration;

    expandedRoute = routeGeo.map(c=>L.latLng(c[1], c[0]));

    // calcular cumulativa
    expandedCumulativeDist = [0];
    for(let i=0;i<expandedRoute.length-1;i++){
      const d = expandedRoute[i].distanceTo(expandedRoute[i+1]);
      expandedCumulativeDist.push(expandedCumulativeDist[i] + d);
    }

    // calcular posições dos waypoints originais ao longo da geometria
    const currentPoints = routeDefinitions[currentRouteKey].points;
    originalWaypointDistAlong = [];
    for(const wp of currentPoints){
      let bestIdx=0, bestDist=Infinity; const wpLatLng = L.latLng(wp[0], wp[1]);
      for(let i=0;i<expandedRoute.length;i++){ const dd = wpLatLng.distanceTo(expandedRoute[i]); if(dd<bestDist){ bestDist=dd; bestIdx=i; }}
      originalWaypointDistAlong.push(expandedCumulativeDist[bestIdx]);
    }

    // cumulativa de segundos por leg
    const legDurations = legs.map(l=>l.duration);
    osrmCumulativeSeconds = [0];
    for(let i=1;i<legDurations.length+1;i++) osrmCumulativeSeconds[i] = osrmCumulativeSeconds[i-1] + (legDurations[i-1]||0);

    // atualizar camada
    routeLine.setStyle({ color: '#d32f2f' });
    progressLine.setStyle({ color: '#00c853' });
    routeLine.setLatLngs(expandedRoute);
    map.fitBounds(routeLine.getBounds(), {padding:[40,40]});

    // garantir posição inicial do caminhão
    currentIndex = 0;
    currentLatLng = expandedRoute && expandedRoute.length ? expandedRoute[0].clone() : L.latLng(points[0][0], points[0][1]);
    if(marker) marker.setLatLng(currentLatLng);
    setTruckImagePosition(currentLatLng);

    scheduleTimes = computeScheduleTimesFromOSRM(new Date(startTimeInput.value), speedKmh);
    renderRouteList(); updateRouteTimesDisplay(); updateUI();

  }catch(err){
    setError('Erro ao carregar rota via OSRM: '+(err && err.message?err.message:err));
    // fallback: usar pontos originais e inicializar posição para evitar currentLatLng indefinido
    expandedRoute = routeDefinitions[currentRouteKey].points.map(p=>L.latLng(p[0], p[1]));
    routeLine.setLatLngs(expandedRoute);
    currentIndex = 0;
    currentLatLng = expandedRoute && expandedRoute.length ? expandedRoute[0].clone() : L.latLng(routeDefinitions[currentRouteKey].points[0][0], routeDefinitions[currentRouteKey].points[0][1]);
    if(marker) marker.setLatLng(currentLatLng);
    setTruckImagePosition(currentLatLng);

    scheduleTimes = new Array(routeDefinitions[currentRouteKey].names.length).fill(null);
    renderRouteList(); updateRouteTimesDisplay(); updateUI();
  }
}

function computeScheduleTimesFromOSRM(startDate, speedKmhLocal){
  const times=[];
  if(!osrmCumulativeSeconds || osrmCumulativeSeconds.length===0){
    for(let i=0;i<routeDefinitions[currentRouteKey].names.length;i++) times.push(null);
    return times;
  }
  const avgSpeedMps = totalRouteDistance>0 && totalRouteDuration>0 ? (totalRouteDistance/totalRouteDuration) : (speedKmhLocal/3.6);
  const selectedSpeedMps = (speedKmhLocal||30)/3.6;
  const scale = avgSpeedMps/selectedSpeedMps;
  for(let i=0;i<osrmCumulativeSeconds.length;i++){
    const scaledSeconds = Math.round(osrmCumulativeSeconds[i]*scale);
    times.push(new Date(startDate.getTime() + scaledSeconds*1000));
  }
  return times;
}

// render lista de pontos (names) — agora com badge de status por ponto
function renderRouteList(){
  if(!routeList) return;
  routeList.innerHTML='';
  const names = routeDefinitions[currentRouteKey].names;
  for(let i=0;i<names.length;i++){
    const li = document.createElement('li');
    li.dataset.index = i;
    li.innerHTML = `<div style="display:flex;justify-content:space-between;align-items:center">
      <div style="display:flex;flex-direction:column">
        <strong>${names[i]||('Ponto '+(i+1))}</strong>
        <small class="pt-sub" data-index="${i}"></small>
      </div>
      <div style="text-align:right;display:flex;flex-direction:column;align-items:flex-end;gap:4px">
        <span class="pt-time" data-index="${i}">--:--</span>
        <span class="pt-status" data-index="${i}" style="font-size:0.75rem;color:#0078d7"></span>
      </div>
    </div>`;
    routeList.appendChild(li);
  }
}

// atualiza horários e pequenos textos por ponto
function updateRouteTimesDisplay(){
  if(!routeList) return;
  const items = routeList.querySelectorAll('.pt-time');
  const statuses = routeList.querySelectorAll('.pt-status');
  const subs = routeList.querySelectorAll('.pt-sub');
  const now = new Date();

  items.forEach(span=>{
    const idx = Number(span.dataset.index);
    const t = scheduleTimes[idx];
    span.textContent = t? t.toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'}) : '--:--';
    const sub = subs[idx];
    if(sub){
      const name = routeDefinitions[currentRouteKey].names[idx] || ('Ponto '+(idx+1));
      sub.textContent = name;
    }
  });

  // preencher status badges (Chegando / Previsto / --)
  statuses.forEach(span=>{
    const idx = Number(span.dataset.index);
    const t = scheduleTimes[idx];
    if(!t){ span.textContent = ''; return; }
    const etaSec = Math.round((t.getTime() - now.getTime())/1000);
    if(etaSec <= 0){ span.textContent = 'Já passou'; span.style.color = '#888'; }
    else if(etaSec <= 120){ span.textContent = 'Chegando'; span.style.color = '#d9534f'; }
    else if(etaSec <= 600){ span.textContent = 'A caminho'; span.style.color = '#f0ad4e'; }
    else { span.textContent = 'Previsto'; span.style.color = '#0078d7'; }
  });
}

// retorna metros até waypoint original index baseado na geometria expandida
function metersToWaypoint(idx){
  if(!originalWaypointDistAlong || !originalWaypointDistAlong.length) return Infinity;
  const traveled = (currentLatLng && expandedCumulativeDist && expandedCumulativeDist.length) ? getDistanceAlongLatLng(currentLatLng) : 0;
  const targetDist = originalWaypointDistAlong[idx] || 0;
  return Math.max(0, targetDist - traveled);
}

function updateRouteListActive(){
  if(!routeList) return;
  const items = routeList.querySelectorAll('li');
  items.forEach(li=> li.classList.remove('active'));
  const traveled = (currentLatLng && expandedCumulativeDist && expandedCumulativeDist.length) ? getDistanceAlongLatLng(currentLatLng) : 0;
  let nextWp = routeDefinitions[currentRouteKey].names.length-1;
  for(let i=0;i<originalWaypointDistAlong.length;i++){
    if(originalWaypointDistAlong[i] > traveled){ nextWp = i; break; }
  }
  const next = routeList.querySelector(`li[data-index='${nextWp}']`);
  if(next) next.classList.add('active');

  // atualizar badge do próximo ponto para 'Chegando' quando estiver próximo
  const statuses = routeList.querySelectorAll('.pt-status');
  statuses.forEach(span=> span.textContent = span.textContent); // manter como estava (vamos recomputar abaixo)
  const statusSpan = routeList.querySelector(`.pt-status[data-index='${nextWp}']`);
  if(statusSpan){
    const meters = metersToWaypoint(nextWp);
    if(meters <= 200){
      statusSpan.textContent = 'Chegando';
      statusSpan.style.color = '#d9534f';
    }
  }
}

function updateUI(){
  updateRouteListActive();
  const remMeters = remainingDistanceFrom(currentIndex, currentLatLng);
  let etaSeconds = Infinity; if(speedMps>0) etaSeconds = remMeters / speedMps;
  if(etaEl) etaEl.textContent = formatETA(etaSeconds);
  if(lastUpdateEl) lastUpdateEl.textContent = new Date().toLocaleTimeString();
  if(overlayETA) overlayETA.textContent = formatETA(etaSeconds);
  if(overlaySpeed) overlaySpeed.textContent = `${Math.round(speedKmh)} km/h`;
  if(statusEl){
    let nextWp = routeDefinitions[currentRouteKey].names.length-1;
    const traveled = (currentLatLng && expandedCumulativeDist && expandedCumulativeDist.length) ? getDistanceAlongLatLng(currentLatLng) : 0;
    for(let i=0;i<originalWaypointDistAlong.length;i++){
      if(originalWaypointDistAlong[i] > traveled){ nextWp = i; break; }
    }
    const metersToNext = metersToWaypoint(nextWp);
    if(currentIndex >= expandedRoute.length-1){ statusEl.textContent='Chegou ao destino'; }
    else if(!running){ statusEl.textContent='Pausado'; }
    else if(metersToNext <= 200){ statusEl.textContent=`Chegando em ${routeDefinitions[currentRouteKey].names[nextWp] || ('Ponto '+(nextWp+1))}`; }
    else { statusEl.textContent='Em trânsito'; }
  }

  // atualizar tempos e badges
  updateRouteTimesDisplay();

  // atualizar popup com próximo ponto e tempo
  if(marker){
    const remKm = (remMeters/1000).toFixed(2);
    let traveled = (currentLatLng && expandedCumulativeDist && expandedCumulativeDist.length) ? getDistanceAlongLatLng(currentLatLng) : 0;
    let nextWp = routeDefinitions[currentRouteKey].names.length-1;
    for(let i=0;i<originalWaypointDistAlong.length;i++){
      if(originalWaypointDistAlong[i] > traveled){ nextWp = i; break; }
    }
    const nextTime = scheduleTimes[nextWp];
    const nextTimeText = nextTime ? nextTime.toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'}) : '--:--';
    marker.bindPopup(`<strong>Coletaja</strong><br/>Velocidade: ${Math.round(speedKmh)} km/h<br/>Distância restante: ${remKm} km<br/>Próx. parada: ${routeDefinitions[currentRouteKey].names[nextWp] || ('Ponto '+(nextWp+1))} — ${nextTimeText}`);
  }
}

// ticker
let ticker = null;
function startTicker(){
  if(ticker) return;
  if(truckEl) truckEl.classList.add('moving');
  ticker = setInterval(()=> advance(1), 1000);
}
function stopTicker(){
  if(!ticker) return;
  clearInterval(ticker); ticker=null;
  if(truckEl) truckEl.classList.remove('moving');
}

// controles UI
if(btnToggle){ btnToggle.addEventListener('click', ()=>{ running=!running; btnToggle.textContent = running? 'Pausar' : 'Retomar'; if(running) startTicker(); else stopTicker(); updateUI(); }); }
if(speedRange){ speedRange.addEventListener('input', ()=>{ speedKmh = Number(speedRange.value); speedMps = speedKmh*1000/3600; scheduleTimes = computeScheduleTimesFromOSRM(new Date(startTimeInput.value), speedKmh); updateRouteTimesDisplay(); updateUI(); }); }
if(btnReset){ btnReset.addEventListener('click', (ev)=>{ ev.preventDefault(); resetRoute(); }); }
if(startTimeInput){ startTimeInput.addEventListener('change', ()=>{ scheduleTimes = computeScheduleTimesFromOSRM(new Date(startTimeInput.value), speedKmh); updateRouteTimesDisplay(); updateUI(); }); }

// clique na lista para centralizar
if(routeList){ routeList.addEventListener('click', (ev)=>{ const li = ev.target.closest('li'); if(!li) return; const idx = Number(li.dataset.index); const wp = routeDefinitions[currentRouteKey].points[idx]; if(wp) map.flyTo([wp[0], wp[1]], 15); }); }

if(btnToggleSidebar){ btnToggleSidebar.addEventListener('click', ()=>{ const collapsed = document.body.classList.toggle('sidebar-collapsed'); btnToggleSidebar.textContent = collapsed ? 'Restaurar layout' : 'Mostrar mapa maior'; setTimeout(()=>{ if(map && typeof map.invalidateSize==='function') map.invalidateSize(); }, 80); setTimeout(()=>{ if(map && typeof map.invalidateSize==='function') map.invalidateSize(); }, 350); setTimeout(()=>{ try{ if(routeLine && routeLine.getBounds) map.fitBounds(routeLine.getBounds(), {padding:[40,40]}); }catch(e){} }, 360); }); }

// seleção de rota via select
if(routeSelect){ routeSelect.addEventListener('change', ()=>{ const key = routeSelect.value; loadRouteByKey(key); }); }

// reset route
function resetRoute(){
  stopTicker();
  currentIndex = 0;
  currentLatLng = expandedRoute && expandedRoute.length ? expandedRoute[0].clone() : L.latLng(routeDefinitions[currentRouteKey].points[0][0], routeDefinitions[currentRouteKey].points[0][1]);
  if(marker) marker.setLatLng(currentLatLng);
  setTruckImagePosition(currentLatLng);
  scheduleTimes = computeScheduleTimesFromOSRM(new Date(startTimeInput.value), speedKmh);
  updateRouteTimesDisplay();
  updateUI();
  running = true;
  if(btnToggle) btnToggle.textContent = 'Pausar';
  startTicker();
  try{ map.setView(currentLatLng, 13); }catch(e){}
}

// carregar rota por chave (ex: zona-sul)
async function loadRouteByKey(key){
  if(!routeDefinitions[key]){ setError('Rota desconhecida: '+key); return; }
  currentRouteKey = key;
  routeTitle.textContent = routeDefinitions[key].title || 'Rota';
  routeSelect.value = key;
  if(routeLine) routeLine.setLatLngs([]); if(progressLine) progressLine.setLatLngs([]);
  // ajustar estilos
  if(routeLine) routeLine.setStyle({ color: '#d32f2f' });
  if(progressLine) progressLine.setStyle({ color: '#00c853' });
  // fetch route
  await fetchRouteFromOSRM(routeDefinitions[key].points);
  // preparar posição inicial
  expandedRoute = expandedRoute && expandedRoute.length ? expandedRoute : routeDefinitions[key].points.map(p=>L.latLng(p[0], p[1]));
  currentIndex = 0;
  currentLatLng = expandedRoute[0].clone();
  if(marker) marker.setLatLng(currentLatLng);
  setTruckImagePosition(currentLatLng);
  scheduleTimes = computeScheduleTimesFromOSRM(new Date(startTimeInput.value), speedKmh);
  renderRouteList(); updateRouteTimesDisplay(); updateUI(); startTicker();
}

// movimento e animação
let currentIndex = 0;
let currentLatLng = null;

function interpolate(a,b,t){ return L.latLng(a.lat + (b.lat-a.lat)*t, a.lng + (b.lng-a.lng)*t); }
function distance(a,b){ return a.distanceTo(b); }
function getDistanceAlongLatLng(latlng){ if(!expandedCumulativeDist || expandedCumulativeDist.length===0) return 0; let bestIdx=0, bestDist=Infinity; for(let i=0;i<expandedRoute.length;i++){ const d = latlng.distanceTo(expandedRoute[i]); if(d<bestDist){ bestDist=d; bestIdx=i; }} return expandedCumulativeDist[bestIdx]; }
function remainingDistanceFrom(idx, latlng){ if(!expandedRoute || expandedRoute.length===0) return 0; let dist=0; if(idx < expandedRoute.length-1){ dist += latlng.distanceTo(expandedRoute[idx+1]); for(let i=idx+1;i<expandedRoute.length-1;i++) dist += expandedRoute[i].distanceTo(expandedRoute[i+1]); } return dist; }

// posiciona o SVG do caminhão sobre o mapa (robusto quanto a offsets)
function setTruckImagePosition(latlng){
  if(!truckEl || !map || !latlng) return;
  try{
    const point = map.latLngToContainerPoint(latlng);
    const mapRect = map.getContainer().getBoundingClientRect();
    const parentRect = truckEl.parentElement.getBoundingClientRect();
    const offsetX = mapRect.left - parentRect.left;
    const offsetY = mapRect.top - parentRect.top;
    const left = Math.round(point.x + offsetX);
    const top = Math.round(point.y + offsetY);
    truckEl.style.left = left + 'px';
    truckEl.style.top = top + 'px';

    // calcular ângulo de direção usando próximo ponto
    let angle = 0;
    if(expandedRoute && expandedRoute.length){
      const nextIdx = Math.min(currentIndex+1, expandedRoute.length-1);
      const nextPt = expandedRoute[nextIdx];
      if(nextPt){
        const pCur = map.latLngToContainerPoint(latlng);
        const pNext = map.latLngToContainerPoint(nextPt);
        const dx = pNext.x - pCur.x;
        const dy = pNext.y - pCur.y;
        angle = Math.atan2(dy, dx) * 180 / Math.PI;
      }
    }

    // aplicar balanço (suspensão) SEM girar as rodas
    const nowTs = Date.now();
    const swayAmp = Math.min(8, Math.max(1, speedKmh / 12));
    const swayY = Math.sin(nowTs / 200) * swayAmp;
    const roll = Math.sin(nowTs / 350) * (swayAmp * 0.6);
    const finalAngle = 0; // caminhão parado, sem rotação

    truckEl.style.transform = `translate(-50%,-50%) translateY(${swayY}px) rotate(${finalAngle}deg)`;
  }catch(e){ console.warn('setTruckImagePosition error', e); }
}

// atualizar linha de progresso (parte percorrida)
function updateProgressLine(){
  if(!progressLine || !expandedRoute || expandedRoute.length===0 || !currentLatLng) return;
  const segment = [];
  for(let i=0;i<=currentIndex;i++) segment.push(expandedRoute[i]);
  if(currentIndex < expandedRoute.length-1){ segment.push(currentLatLng); }
  progressLine.setLatLngs(segment);
}

function advance(dt){
  if(!running) return;
  if(!expandedRoute || expandedRoute.length===0) return;
  if(currentIndex >= expandedRoute.length-1) return;

  let remaining = speedMps * dt;
  while(remaining > 0 && currentIndex < expandedRoute.length-1){
    const target = expandedRoute[currentIndex+1];
    const segDist = distance(currentLatLng, target);
    if(remaining < segDist - 0.0001){
      const t = remaining/segDist;
      currentLatLng = interpolate(currentLatLng, target, t);
      remaining = 0;
    } else {
      currentLatLng = target.clone();
      remaining -= segDist;
      currentIndex++;
    }
  }

  if(marker) marker.setLatLng(currentLatLng);
  updateProgressLine();
  setTruckImagePosition(currentLatLng);
  updateUI();
}

// reposition truck on map move/zoom to keep it synced
function attachMapListeners(){
  if(!map) return;
  map.on('move', ()=>{ setTruckImagePosition(currentLatLng); });
  map.on('zoom', ()=>{ setTruckImagePosition(currentLatLng); });
}

// utilitário formatETA
function formatETA(seconds){
  if(!isFinite(seconds)) return '--:--';
  const s = Math.max(0, Math.round(seconds));
  const h = Math.floor(s/3600); const m = Math.floor((s%3600)/60);
  if(h>0) return `${h}h ${String(m).padStart(2,'0')}m`;
  return `${m} min`;
}

// inicialização
initMap();
attachMapListeners();
if(routeSelect && routeDefinitions[routeSelect.value]){ currentRouteKey = routeSelect.value; }
loadRouteByKey(currentRouteKey).catch(err=> console.warn('Erro loadRouteByKey', err));

// expor para debugging
window.map = map; window.routeDefinitions = routeDefinitions; window.loadRouteByKey = loadRouteByKey;