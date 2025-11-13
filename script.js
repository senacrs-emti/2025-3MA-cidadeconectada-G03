// script.js — lógica do mapa, rota e simulação em tempo real

// --- configuração inicial ---
const routePoints = [
  [-30.034647, -51.217658], // Praça da Matriz
  [-30.02965, -51.2296],    // Mercado Público
  [-30.0275, -51.222],      // Cais Mauá
  [-30.0186, -51.2185],     // Usina do Gasômetro
  [-30.0665, -51.2296],     // Estádio Beira-Rio
  [-30.0850, -51.23]        // Zona sul / ponto final (exemplo)
];
const routeNames = [
  'Praça da Matriz',
  'Mercado Público',
  'Cais Mauá',
  'Usina do Gasômetro',
  'Estádio Beira-Rio',
  'Destino (Zona Sul)'
];

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

function setError(message){
  console.error(message);
  if(errorBox){ errorBox.hidden = false; errorBox.textContent = String(message); }
}

// helpers
function toLocalInputString(d){
  const pad=n=>String(n).padStart(2,'0');
  return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

// set default start time
const now = new Date(); now.setSeconds(0,0);
if(startTimeInput) startTimeInput.value = toLocalInputString(now);

let running = true;
let speedKmh = Number(speedRange ? speedRange.value : 30) || 30;
let speedMps = speedKmh * 1000 / 3600;

// mapa e camadas
let map, routeLine, marker;
let expandedRoute = []; // array de L.LatLng da geometria OSRM
let originalWaypointDistAlong = [];
let expandedCumulativeDist = [];
let osrmCumulativeSeconds = [];
let totalRouteDistance = 0;
let totalRouteDuration = 0;
let scheduleTimes = [];

// inicializar mapa com fallback simples
function initMap(){
  if(typeof L === 'undefined'){
    setError('Leaflet não carregado');
    return;
  }
  try{
    map = L.map('map').setView(routePoints[0], 13);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {maxZoom:19, attribution: ''}).addTo(map);
    // criar linha temporária e marker
    routeLine = L.polyline(routePoints, {color:'#06b6d4', weight:5, opacity:0.9}).addTo(map);
    map.fitBounds(routeLine.getBounds(), {padding:[40,40]});

    marker = L.marker(routePoints[0], {title: 'Caminhão'}).addTo(map);
    marker.bindPopup('Caminhão');

    // tornar mapa responsivo se container tiver height 0
    const mapEl = document.getElementById('map');
    if(mapEl && (mapEl.clientHeight<20 || mapEl.offsetHeight<20)){
      mapEl.style.height = mapEl.style.height || '60vh';
      setTimeout(()=>{ if(map && typeof map.invalidateSize==='function') map.invalidateSize(); }, 80);
      setTimeout(()=>{ if(map && typeof map.invalidateSize==='function') map.invalidateSize(); }, 350);
    }
  }catch(err){ setError('Erro iniciando mapa: '+err.message); }
}

// buscar rota via OSRM
async function fetchRouteFromOSRM(points){
  try{
    const coords = points.map(p=>`${p[1]},${p[0]}`).join(';');
    const url = `https://router.project-osrm.org/route/v1/driving/${coords}?overview=full&geometries=geojson`;
    const res = await fetch(url);
    if(!res.ok) throw new Error('OSRM returned '+res.status);
    const json = await res.json();
    if(!json.routes || !json.routes.length) throw new Error('No route');

    const routeGeo = json.routes[0].geometry.coordinates; // [lon,lat]
    const legs = json.routes[0].legs;
    totalRouteDistance = json.routes[0].distance;
    totalRouteDuration = json.routes[0].duration;

    expandedRoute = routeGeo.map(c => L.latLng(c[1], c[0]));

    // calcular cumulativa
    expandedCumulativeDist = [0];
    for(let i=0;i<expandedRoute.length-1;i++){
      const d = expandedRoute[i].distanceTo(expandedRoute[i+1]);
      expandedCumulativeDist.push(expandedCumulativeDist[i] + d);
    }

    // original waypoints distance along
    originalWaypointDistAlong = [];
    for(const wp of routePoints){
      let bestIdx=0, bestDist=Infinity;
      const wpLatLng = L.latLng(wp[0], wp[1]);
      for(let i=0;i<expandedRoute.length;i++){
        const dd = wpLatLng.distanceTo(expandedRoute[i]);
        if(dd < bestDist){ bestDist = dd; bestIdx = i; }
      }
      originalWaypointDistAlong.push(expandedCumulativeDist[bestIdx]);
    }

    // osrm cumulative seconds
    const legDurations = legs.map(l=>l.duration);
    osrmCumulativeSeconds = [0];
    for(let i=1;i<legDurations.length+1;i++) osrmCumulativeSeconds[i] = osrmCumulativeSeconds[i-1] + (legDurations[i-1]||0);

    // atualizar camada
    if(routeLine) routeLine.setLatLngs(expandedRoute);
    else routeLine = L.polyline(expandedRoute, {color:'#06b6d4', weight:5}).addTo(map);
    map.fitBounds(routeLine.getBounds(), {padding:[40,40]});

    // calcular scheduleTimes com velocidade atual
    scheduleTimes = computeScheduleTimesFromOSRM(new Date(startTimeInput.value), speedKmh);
    renderRouteList(); updateRouteTimesDisplay(); updateUI();

  }catch(err){
    setError('Erro ao carregar rota via OSRM: '+(err && err.message ? err.message : err));
    // fallback: use original waypoints
    expandedRoute = routePoints.map(p=>L.latLng(p[0], p[1]));
    if(routeLine) routeLine.setLatLngs(expandedRoute);
    scheduleTimes = new Array(routeNames.length).fill(null);
    renderRouteList(); updateRouteTimesDisplay(); updateUI();
  }
}

// calcular scheduleTimes
function computeScheduleTimesFromOSRM(startDate, speedKmhLocal){
  const times = [];
  if(!osrmCumulativeSeconds || osrmCumulativeSeconds.length===0){
    for(let i=0;i<routeNames.length;i++) times.push(null);
    return times;
  }
  const avgSpeedMps = totalRouteDistance>0 && totalRouteDuration>0 ? (totalRouteDistance/totalRouteDuration) : (speedKmhLocal/3.6);
  const selectedSpeedMps = (speedKmhLocal||30)/3.6;
  const scale = avgSpeedMps / selectedSpeedMps;
  for(let i=0;i<osrmCumulativeSeconds.length;i++){
    const scaledSeconds = Math.round(osrmCumulativeSeconds[i]*scale);
    times.push(new Date(startDate.getTime() + scaledSeconds*1000));
  }
  return times;
}

// render route list
function renderRouteList(){
  if(!routeList) return;
  routeList.innerHTML = '';
  for(let i=0;i<routeNames.length;i++){
    const li = document.createElement('li');
    li.dataset.index = i;
    li.innerHTML = `<div style="display:flex;justify-content:space-between;align-items:center"><strong>${routeNames[i]||('Ponto '+(i+1))}</strong><span class="pt-time" data-index="${i}">--:--</span></div>`;
    routeList.appendChild(li);
  }
}

function updateRouteTimesDisplay(){
  if(!routeList) return;
  const items = routeList.querySelectorAll('.pt-time');
  items.forEach(span=>{
    const idx = Number(span.dataset.index);
    const t = scheduleTimes[idx];
    span.textContent = t ? t.toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'}) : '--:--';
  });
}

// movimento do caminhão ao longo da geometria expandida
let currentIndex = 0; // índice do ponto na expandedRoute
let currentLatLng = null;

function getDistanceAlongLatLng(latlng){
  if(!expandedCumulativeDist || expandedCumulativeDist.length===0) return 0;
  let bestIdx=0, bestDist=Infinity;
  for(let i=0;i<expandedRoute.length;i++){
    const d = latlng.distanceTo(expandedRoute[i]);
    if(d < bestDist){ bestDist = d; bestIdx = i; }
  }
  return expandedCumulativeDist[bestIdx];
}

function remainingDistanceFrom(idx, latlng){
  if(!expandedRoute || expandedRoute.length===0) return 0;
  let dist = 0;
  if(idx < expandedRoute.length-1){
    dist += latlng.distanceTo(expandedRoute[idx+1]);
    for(let i=idx+1;i<expandedRoute.length-1;i++) dist += expandedRoute[i].distanceTo(expandedRoute[i+1]);
  }
  return dist;
}

function interpolate(a,b,t){ return L.latLng(a.lat + (b.lat-a.lat)*t, a.lng + (b.lng-a.lng)*t); }
function distance(a,b){ return a.distanceTo(b); }

function advance(dt){
  if(!running) return;
  if(currentIndex >= expandedRoute.length-1) return;
  let remaining = speedMps * dt; // meters
  while(remaining > 0 && currentIndex < expandedRoute.length-1){
    const target = expandedRoute[currentIndex+1];
    const segDist = distance(currentLatLng, target);
    if(remaining < segDist - 0.0001){
      const t = remaining / segDist;
      currentLatLng = interpolate(currentLatLng, target, t);
      remaining = 0;
    } else {
      currentLatLng = target.clone();
      remaining -= segDist;
      currentIndex++;
    }
  }
  if(marker) marker.setLatLng(currentLatLng);
  updateUI();
}

function formatETA(seconds){ if(!isFinite(seconds)) return '--:--'; if(seconds<=0) return '00:00'; const mins=Math.round(seconds/60); if(mins<60) return `${mins} min`; const hours=Math.floor(mins/60); const rem = mins%60; return `${hours}h ${rem}m`; }

function updateRouteListActive(){
  if(!routeList) return;
  const items = routeList.querySelectorAll('li');
  items.forEach(li=> li.classList.remove('active'));
  const traveled = (currentLatLng && expandedCumulativeDist && expandedCumulativeDist.length) ? getDistanceAlongLatLng(currentLatLng) : 0;
  let nextWp = routeNames.length-1;
  for(let i=0;i<originalWaypointDistAlong.length;i++){
    if(originalWaypointDistAlong[i] > traveled){ nextWp = i; break; }
  }
  const next = routeList.querySelector(`li[data-index='${nextWp}']`);
  if(next) next.classList.add('active');
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
    if(currentIndex >= expandedRoute.length-1){ statusEl.textContent='Chegou ao destino'; }
    else if(!running){ statusEl.textContent='Pausado'; }
    else { statusEl.textContent='Em trânsito'; }
  }
  // popup
  if(marker){
    const remKm = (remMeters/1000).toFixed(2);
    let traveled = (currentLatLng && expandedCumulativeDist && expandedCumulativeDist.length) ? getDistanceAlongLatLng(currentLatLng) : 0;
    let nextWp = routeNames.length-1;
    for(let i=0;i<originalWaypointDistAlong.length;i++){
      if(originalWaypointDistAlong[i] > traveled){ nextWp = i; break; }
    }
    const nextTime = scheduleTimes[nextWp];
    const nextTimeText = nextTime ? nextTime.toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'}) : '--:--';
    marker.bindPopup(`<strong>Coletaja</strong><br/>Velocidade: ${Math.round(speedKmh)} km/h<br/>Distância restante: ${remKm} km<br/>Próx. parada: ${routeNames[nextWp] || ('Ponto '+(nextWp+1))} — ${nextTimeText}`);
  }
}

// ticker
let ticker = null;
function startTicker(){ if(ticker) return; ticker = setInterval(()=> advance(1), 1000); }
function stopTicker(){ if(!ticker) return; clearInterval(ticker); ticker = null; }

// controles UI
if(btnToggle){ btnToggle.addEventListener('click', ()=>{ running = !running; btnToggle.textContent = running ? 'Pausar' : 'Retomar'; if(running) startTicker(); else stopTicker(); updateUI(); }); }
if(speedRange){ speedRange.addEventListener('input', ()=>{ speedKmh = Number(speedRange.value); speedMps = speedKmh*1000/3600; scheduleTimes = computeScheduleTimesFromOSRM(new Date(startTimeInput.value), speedKmh); updateRouteTimesDisplay(); updateUI(); }); }
if(btnReset){ btnReset.addEventListener('click', (ev)=>{ ev.preventDefault(); resetRoute(); }); }
if(startTimeInput){ startTimeInput.addEventListener('change', ()=>{ scheduleTimes = computeScheduleTimesFromOSRM(new Date(startTimeInput.value), speedKmh); updateRouteTimesDisplay(); updateUI(); }); }

if(routeList){ routeList.addEventListener('click', (ev)=>{ const li = ev.target.closest('li'); if(!li) return; const idx = Number(li.dataset.index); const wp = routePoints[idx]; if(wp) map.flyTo([wp[0], wp[1]], 15); }); }

if(btnToggleSidebar){ btnToggleSidebar.addEventListener('click', ()=>{ const collapsed = document.body.classList.toggle('sidebar-collapsed'); btnToggleSidebar.textContent = collapsed ? 'Restaurar layout' : 'Mostrar mapa maior'; setTimeout(()=>{ if(map && typeof map.invalidateSize==='function') map.invalidateSize(); }, 80); setTimeout(()=>{ if(map && typeof map.invalidateSize==='function') map.invalidateSize(); }, 350); setTimeout(()=>{ try{ if(routeLine && routeLine.getBounds) map.fitBounds(routeLine.getBounds(), {padding:[40,40]}); }catch(e){} }, 360); }); }

// reset function
function resetRoute(){ stopTicker(); currentIndex = 0; currentLatLng = expandedRoute && expandedRoute.length ? expandedRoute[0].clone() : L.latLng(routePoints[0][0], routePoints[0][1]); if(marker) marker.setLatLng(currentLatLng); scheduleTimes = computeScheduleTimesFromOSRM(new Date(startTimeInput.value), speedKmh); updateRouteTimesDisplay(); updateUI(); running = true; if(btnToggle) btnToggle.textContent = 'Pausar'; startTicker(); try{ map.setView(currentLatLng, 13); }catch(e){}
}

// inicialização principal
initMap();
fetchRouteFromOSRM(routePoints).then(()=>{
  // preparar start position
  expandedRoute = expandedRoute && expandedRoute.length ? expandedRoute : routePoints.map(p=>L.latLng(p[0], p[1]));
  currentIndex = 0; currentLatLng = expandedRoute[0].clone(); if(marker) marker.setLatLng(currentLatLng);
  scheduleTimes = computeScheduleTimesFromOSRM(new Date(startTimeInput.value), speedKmh);
  renderRouteList(); updateRouteTimesDisplay(); updateUI(); startTicker();
}).catch(err=>{ console.warn('fetchRouteFromOSRM error', err); });

// tornar mapa acessível no console para debug
window.map = map;
window.routeData = { routePoints, routeNames };
