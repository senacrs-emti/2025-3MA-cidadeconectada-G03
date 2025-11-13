// script.js — lógica do mapa, rota e simulação em tempo real

// Captura global de erros e utilitários de diagnóstico
// função utilitária para mostrar uma mensagem de erro amigável na interface
/**
 * Mostrar erro amigável na UI e logar no console.
 * @param {string|Error} message - Mensagem ou objeto de erro a exibir
 */
// Mapa interativo, rota do caminhão, horário estimado e atualização em tempo real

// Coordenadas simuladas da rota (exemplo: pontos de uma cidade)
const route = [
	{ lat: -23.55052, lng: -46.633308, nome: 'Início' }, // São Paulo centro
	{ lat: -23.553, lng: -46.630 },
	{ lat: -23.556, lng: -46.628 },
	{ lat: -23.559, lng: -46.625 },
	{ lat: -23.561, lng: -46.622, nome: 'Ponto 1' },
	{ lat: -23.564, lng: -46.620 },
	{ lat: -23.567, lng: -46.618, nome: 'Ponto 2' },
	{ lat: -23.570, lng: -46.615 },
	{ lat: -23.573, lng: -46.613, nome: 'Final' }
];

let currentIndex = 0;
let marker = null;
let polyline = null;
let interval = null;
let startTime = Date.now();
const intervalMs = 2000; // Atualização a cada 2 segundos
const estimatedStopTime = 1.5 * 60 * 1000; // 1.5 minutos entre pontos

// Inicializa o mapa
const map = L.map('map').setView([route[0].lat, route[0].lng], 15);
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
	attribution: '© OpenStreetMap'
}).addTo(map);

// Desenha a rota
polyline = L.polyline(route.map(p => [p.lat, p.lng]), { color: '#0078d7', weight: 5 }).addTo(map);
map.fitBounds(polyline.getBounds(), { padding: [30, 30] });

// Adiciona marcadores dos pontos nomeados
route.forEach((p, i) => {
	if (p.nome) {
		L.marker([p.lat, p.lng], { title: p.nome })
			.addTo(map)
			.bindPopup(`<b>${p.nome}</b>`);
	}
});

// Adiciona o marcador do caminhão
marker = L.marker([route[0].lat, route[0].lng], {
	icon: L.icon({
		iconUrl: 'https://cdn-icons-png.flaticon.com/512/743/743007.png',
		iconSize: [38, 38],
		iconAnchor: [19, 38],
		popupAnchor: [0, -38]
	})
}).addTo(map);
marker.bindPopup('Caminhão em movimento').openPopup();

// Atualiza painel de informações
function updateInfoPanel(idx) {
	const loc = route[idx];
	document.getElementById('current-location').textContent = loc.nome ? loc.nome : `Lat: ${loc.lat.toFixed(5)}, Lng: ${loc.lng.toFixed(5)}`;
	// Horário estimado de passagem (simulação)
	const now = new Date();
	const eta = new Date(startTime + idx * estimatedStopTime);
	document.getElementById('estimated-time').textContent = eta.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}

// Move o caminhão ao longo da rota
function moveTruck() {
	if (currentIndex < route.length - 1) {
		currentIndex++;
		const pos = route[currentIndex];
		marker.setLatLng([pos.lat, pos.lng]);
		updateInfoPanel(currentIndex);
		// Anima o mapa para o novo ponto
		map.panTo([pos.lat, pos.lng]);
	} else {
		clearInterval(interval);
		document.getElementById('current-location').textContent = 'Rota finalizada';
		document.getElementById('estimated-time').textContent = '-';
	}
}

// Inicializa painel
updateInfoPanel(currentIndex);

// Inicia atualização em tempo real
interval = setInterval(moveTruck, intervalMs);
function setError(message){
    console.error('App error:', message);
    try{
        const box = document.getElementById('errorBox');
        if(box){ box.hidden = false; box.textContent = String(message); }
    }catch(e){ console.error('Erro ao setar errorBox', e); }
}

window.addEventListener('error', function(event){
	try{
		const msg = event.message || 'Uncaught error';
		const src = event.filename ? `\nArquivo: ${event.filename}:${event.lineno}:${event.colno}` : '';
		const stack = event.error && event.error.stack ? `\nStack:\n${event.error.stack}` : '';
		setError(`${msg}${src}${stack}`);
	}catch(e){ console.error('Erro no handler global', e); }
});
window.addEventListener('unhandledrejection', function(ev){
	try{
		setError('Unhandled promise rejection: ' + (ev.reason && ev.reason.message ? ev.reason.message : String(ev.reason)));
	}catch(e){ console.error(e); }
});

// pontos de referência (origem/destinos desejados) em Porto Alegre — vamos pedir ao OSRM para traçar a rota pelas ruas
const routePoints = [
  [-30.034647, -51.217658], // Praça da Matriz
  [-30.029650, -51.229600], // Mercado Público
  [-30.027500, -51.222000], // Cais Mauá
  [-30.018600, -51.218500], // Usina do Gasômetro
  [-30.066500, -51.229600], // Estádio Beira-Rio
  [-30.085000, -51.230000]  // Zona sul / ponto final (exemplo)
];

const routeNames = [
  'Praça da Matriz',
  'Mercado Público',
  'Cais Mauá',
  'Usina do Gasômetro',
  'Estádio Beira-Rio',
  'Destino (Zona Sul)'
];

// o array `route` será preenchido com a geometria expandida (seguindo ruas) retornada pelo OSRM
let route = routePoints.map(p => L.latLng(p[0], p[1]));

// dados derivados da geometria expandida/OSRM
let expandedSegDistances = [];      // distâncias entre cada ponto expandido
let expandedCumulativeDist = [];    // cumulativa ao longo da geometria expandida
let originalWaypointDistAlong = []; // distância ao longo da geometria até cada waypoint original
let osrmLegDurations = [];          // durações (s) entre os pontos originais conforme OSRM
let osrmCumulativeSeconds = [];     // cumulativa de segundos por waypoint conforme OSRM
let totalRouteDistance = 0;         // metros
let totalRouteDuration = 0;         // segundos (OSRM)

// UI elements
const statusEl = document.getElementById('status');
const etaEl = document.getElementById('eta');
const lastUpdateEl = document.getElementById('lastUpdate');
const btnToggle = document.getElementById('btnToggle') || document.getElementById('btnToggleFloat');
const btnReset = document.getElementById('btnReset') || document.getElementById('btnResetFloat');
const speedRange = document.getElementById('speedRange') || document.getElementById('speedRangeFloat');
const routeList = document.getElementById('routeList');
const startTimeInput = document.getElementById('startTime');
const overlayETA = document.getElementById('overlayETA');
const overlaySpeed = document.getElementById('overlaySpeed');
const btnToggleSidebar = document.getElementById('btnToggleSidebar');

// set default start time to now (local) rounded to next minute
/**
 * Formata uma Date para a string compatível com input[type=datetime-local]
 * Exemplo de saída: 2025-11-06T14:30
 * @param {Date} d - objeto Date
 * @returns {string}
 */
function toLocalInputString(d){
	const pad = n=>String(n).padStart(2,'0');
	return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
const now = new Date();
now.setSeconds(0,0);
startTimeInput.value = toLocalInputString(now);

// estado
let running = true;
let speedKmh = Number(speedRange.value) || 30; // km/h
let speedMps = speedKmh * 1000 / 3600; // m/s

// criar mapa (com guard para forçar redraw se o container estiver oculto)
let map;
try{
	if(typeof L === 'undefined') throw new Error('Leaflet não carregado');
	map = L.map('map', {zoomControl: true}).setView(route[0], 13);
	L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
		maxZoom: 19,
		attribution: ''
	}).addTo(map);

	// garantir que o container do mapa tenha altura visível e forçar o Leaflet a recalcular o layout
	// Essa função é usada quando o mapa está inicialmente oculto (por exemplo, sidebar colapsada)
	const mapEl = document.getElementById('map');
	/**
	 * Garante que o elemento do mapa tenha uma altura mínima e chama map.invalidateSize().
	 * Não altera a lógica do mapa — apenas reforça um fallback visual para evitar height:0.
	 */
	function ensureMapVisible(){
		try{
			if(mapEl){
				// se a altura calculada for muito pequena, aplicamos um fallback (60vh)
				const h = mapEl.clientHeight || mapEl.offsetHeight || 0;
				if(h < 20){
					mapEl.style.height = mapEl.style.height || '60vh';
				}
			}
			if(map && typeof map.invalidateSize === 'function') map.invalidateSize();
		}catch(e){ console.warn('ensureMapVisible error', e); }
	}
	ensureMapVisible();
	setTimeout(ensureMapVisible, 80);
	setTimeout(ensureMapVisible, 350);
}catch(err){
	setError('Erro ao iniciar mapa: ' + (err && err.message ? err.message : String(err)));
	console.error(err);
}

// desenhamos uma linha temporária até buscarmos a rota real
let routeLine = L.polyline(route, {color: '#06b6d4', weight: 5, opacity:0.9}).addTo(map);
map.fitBounds(routeLine.getBounds(), {padding:[40,40]});

// busca ao OSRM e substitui a geometria pela rota seguindo ruas
/**
 * Consulta o OSRM para traçar uma rota street-following entre os waypoints fornecidos.
 * Atualiza variáveis globais: `route`, `expandedCumulativeDist`, `osrmCumulativeSeconds`,
 * `totalRouteDistance`, `totalRouteDuration` e também atualiza a `routeLine` no mapa.
 * Em caso de falha, popula um fallback mantendo os waypoints originais.
 * @param {Array<[lat, lng]>} points - array de coordenadas [lat, lng]
 */
async function fetchRouteFromOSRM(points){
	try{
		// montar string de coordenadas no formato lon,lat;lon,lat;...
		const coords = points.map(p => `${p[1]},${p[0]}`).join(';');
		const url = `https://router.project-osrm.org/route/v1/driving/${coords}?overview=full&geometries=geojson`;
		const res = await fetch(url);
		if(!res.ok) throw new Error('OSRM error '+res.status);
		const json = await res.json();
		if(!json.routes || !json.routes.length) throw new Error('No route found');

		const routeGeo = json.routes[0].geometry.coordinates; // array [lon,lat]
		const legs = json.routes[0].legs; // array de legs entre waypoints
		totalRouteDistance = json.routes[0].distance; // metros
		totalRouteDuration = json.routes[0].duration; // segundos

		// construir geometria expandida (lat,lng)
		route = routeGeo.map(c => L.latLng(c[1], c[0]));

		// calcular distâncias e cumulativa ao longo da geometria expandida
		expandedSegDistances = [];
		expandedCumulativeDist = [0];
		for(let i=0;i<route.length-1;i++){
			const d = route[i].distanceTo(route[i+1]);
			expandedSegDistances.push(d);
			expandedCumulativeDist[i+1] = expandedCumulativeDist[i] + d;
		}

		// mapear as distâncias ao longo da geometria até cada waypoint original
		originalWaypointDistAlong = [];
		for(const wp of points){
			// encontrar índice no expanded route mais próximo do waypoint
			let bestIdx = 0; let bestDist = Infinity;
			const wpLatLng = L.latLng(wp[0], wp[1]);
			for(let i=0;i<route.length;i++){
				const dd = wpLatLng.distanceTo(route[i]);
				if(dd < bestDist){ bestDist = dd; bestIdx = i; }
			}
			originalWaypointDistAlong.push(expandedCumulativeDist[bestIdx]);
		}

		// extrair durações por leg (entre waypoints) e cumulativa
		osrmLegDurations = legs.map(l => l.duration); // segundos
		osrmCumulativeSeconds = [0];
		for(let i=1;i<legs.length+1;i++) osrmCumulativeSeconds[i] = osrmCumulativeSeconds[i-1] + (osrmLegDurations[i-1]||0);

		// atualizar polilinha no mapa e centralizar
		routeLine.setLatLngs(route);
		map.fitBounds(routeLine.getBounds(), {padding:[40,40]});

		// recomputar horários iniciais usando OSRM durations
		scheduleTimes = computeScheduleTimesFromOSRM(new Date(startTimeInput.value), speedKmh);
		// reaplicar quaisquer horários manuais fornecidos pelo usuário
		applyManualSchedule(manualSchedule);
		updateRouteTimesDisplay();
		updateUI();

	}catch(err){
		console.error('Erro ao carregar rota OSRM', err);
		setError('Não foi possível carregar rota via OSRM: ' + (err && err.message ? err.message : String(err)));
		// fallback: manter geom baseada nos waypoints originais e preencher horários placeholders
		scheduleTimes = new Array(routeNames.length).fill(null);
		updateRouteTimesDisplay();
		updateUI();
		// iniciar ticker mesmo com fallback (evita que a simulação nunca rode)
		startTicker();
	}
}

// iniciar carregamento da rota real
fetchRouteFromOSRM(routePoints);

// marker do caminhão
const truckIcon = L.divIcon({
	className: 'truck-icon',
	html: '<svg width="30" height="30" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><rect x="1" y="6" width="15" height="9" rx="1.5" fill="#06b6d4"/><path d="M16 11h3l2 2v2h-5V11z" fill="#06b6d4"/><circle cx="7" cy="18" r="1.8" fill="#fff"/><circle cx="18" cy="18" r="1.8" fill="#fff"/></svg>'
});

let currentIndex = 0; // segmento atual: entre route[currentIndex] e route[currentIndex+1]
let currentLatLng = route[0].clone();
let marker = L.marker(currentLatLng, {icon: truckIcon}).addTo(map);

// popular lista de rota
// renderizar lista com nomes e placeholders para horários
let scheduleTimes = [];
function renderRouteList(){
	routeList.innerHTML = '';
	for(let i=0;i<routeNames.length;i++){
		const li = document.createElement('li');
		li.dataset.index = i;
		li.innerHTML = `<div style="display:flex;justify-content:space-between;align-items:center"><strong>${routeNames[i]||('Ponto '+(i+1))}</strong><span class="pt-time" data-index="${i}">--:--</span></div>`;
		routeList.appendChild(li);
	}
}
renderRouteList();

// calcula horários de passagem (array de Date) baseado nas durações OSRM e ajustado pela velocidade selecionada
/**
 * Computa os horários estimados de passagem para cada waypoint com base nas durações
 * retornadas pelo OSRM (`osrmCumulativeSeconds`) e ajusta esses tempos conforme a
 * velocidade selecionada pelo usuário.
 * Retorna um array de objetos Date (ou null quando não houver dado).
 * @param {Date} startDate - horário de início da rota
 * @param {number} speedKmhLocal - velocidade selecionada (km/h)
 * @returns {Date[]}
 */
function computeScheduleTimesFromOSRM(startDate, speedKmhLocal){
	const times = [];
	if(!osrmCumulativeSeconds || osrmCumulativeSeconds.length === 0){
		for(let i=0;i<routeNames.length;i++) times.push(null);
		return times;
	}
	// se não temos dados OSRM, cai para nulls
	// determinar fator de escala: OSRM já retorna durações reais; se o usuário alterar a velocidade, ajustamos pelo fator (avgSpeed / selectedSpeed)
	const avgSpeedMps = totalRouteDistance > 0 && totalRouteDuration > 0 ? (totalRouteDistance / totalRouteDuration) : (speedKmhLocal/3.6);
	const selectedSpeedMps = (speedKmhLocal || 30) / 3.6;
	const scale = avgSpeedMps / selectedSpeedMps; // >1 significa aumentar duração (usuário escolheu velocidade menor que média), <1 reduzir

	for(let i=0;i<osrmCumulativeSeconds.length;i++){
		const scaledSeconds = Math.round(osrmCumulativeSeconds[i] * scale);
		times.push(new Date(startDate.getTime() + scaledSeconds*1000));
	}
	return times;
}

// atualiza os textos de horário na lista de rota
function updateRouteTimesDisplay(){
	const items = routeList.querySelectorAll('.pt-time');
	items.forEach(span => {
		const idx = Number(span.dataset.index);
		const t = scheduleTimes[idx];
		span.textContent = t ? t.toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'}) : '--:--';
	});
}

// inicializa scheduleTimes com placeholders (serão preenchidos quando a rota OSRM for carregada)
scheduleTimes = new Array(routeNames.length).fill(null);
updateRouteTimesDisplay();

// --- Aplicar horários manuais fornecidos (ex: do prompt) ---
// formato esperado: { "bairroA": "10:30", "bairroB": "11:00" }
const manualSchedule = { "bairroA": "10:30", "bairroB": "11:00" };
// mapa simples de manual keys para índices dos routeNames (você pode ajustar conforme preciso)
const manualKeyToIndex = { "bairroA": 0, "bairroB": 1 };

function parseTimeToToday(timeStr){
	// timeStr no formato HH:MM
	const parts = String(timeStr).split(':');
	if(parts.length < 2) return null;
	const d = new Date();
	d.setHours(Number(parts[0])||0, Number(parts[1])||0, 0, 0);
	return d;
}

function applyManualSchedule(obj){
	let applied = false;
	for(const key of Object.keys(obj)){
		const idx = manualKeyToIndex[key];
		if(typeof idx === 'number' && idx >=0 && idx < routeNames.length){
			const dt = parseTimeToToday(obj[key]);
			if(dt){ scheduleTimes[idx] = dt; applied = true; }
		}
	}
	if(applied){
		updateRouteTimesDisplay();
	}
}

// aplicar manualmente os horários do prompt
applyManualSchedule(manualSchedule);

function updateRouteListActive(){
	const items = routeList.querySelectorAll('li');
	items.forEach((li)=> li.classList.remove('active'));
	// determinar próximo waypoint original baseado na distância percorrida ao longo da geometria expandida
	const traveled = (currentLatLng && expandedCumulativeDist && expandedCumulativeDist.length) ? getDistanceAlong(currentLatLng) : 0;
	let nextWp = routeNames.length-1;
	for(let i=0;i<originalWaypointDistAlong.length;i++){
		if(originalWaypointDistAlong[i] > traveled){ nextWp = i; break; }
	}
	const next = routeList.querySelector(`li[data-index='${nextWp}']`);
	if(next) next.classList.add('active');
}

function interpolate(a,b,t){
	return L.latLng(a.lat + (b.lat-a.lat)*t, a.lng + (b.lng-a.lng)*t);
}

function distance(a,b){
	return a.distanceTo(b); // metros
}

// calcula distância restante até o fim (metros)
function remainingDistanceFrom(posIndex, posLatLng){
	let dist = 0;
	// remainder on current segment
	if(posIndex < route.length -1){
		dist += distance(posLatLng, route[posIndex+1]);
		for(let i=posIndex+1;i<route.length-1;i++){
			dist += distance(route[i], route[i+1]);
		}
	}
	return dist;
}

// retorna a distância (m) ao longo da geometria expandida desde o início até um ponto latlng aproximado
function getDistanceAlong(latlng){
	if(!expandedCumulativeDist || expandedCumulativeDist.length === 0) return 0;
	// encontrar o índice do segmento mais próximo
	let bestIdx = 0; let bestDist = Infinity;
	for(let i=0;i<route.length;i++){
		const d = latlng.distanceTo(route[i]);
		if(d < bestDist){ bestDist = d; bestIdx = i; }
	}
	return expandedCumulativeDist[bestIdx];
}

// avança posição por dt segundos
/**
 * Move a posição simulada do caminhão adiante por `dt` segundos.
 * A função percorre a geometria (array `route`) deslocando o `currentLatLng`
 * e atualizando `currentIndex` conforme necessário.
 * @param {number} dt - segundos a avançar
 */
function advance(dt){
	if(!running) return;
	if(currentIndex >= route.length -1) return; // já chegou

	let remainingToMove = speedMps * dt; // meters

	while(remainingToMove > 0 && currentIndex < route.length -1){
		const target = route[currentIndex+1];
		const segDist = distance(currentLatLng, target);
		if(remainingToMove < segDist - 0.0001){
			const t = remainingToMove / segDist;
			currentLatLng = interpolate(currentLatLng, target, t);
			remainingToMove = 0;
		} else {
			// move to next vertex
			currentLatLng = target.clone();
			remainingToMove -= segDist;
			currentIndex++;
		}
	}

	marker.setLatLng(currentLatLng);
	updateUI();
}

function formatETA(seconds){
	if(!isFinite(seconds)) return '--:--';
	if(seconds <= 0) return '00:00';
	const mins = Math.round(seconds/60);
	if(mins < 60) return `${mins} min`;
	const hours = Math.floor(mins/60);
	const rem = mins % 60;
	return `${hours}h ${rem}m`;
}

/**
 * Atualiza a interface (status, ETA, overlay e popup do marcador) com base na posição
 * corrente do caminhão (`currentLatLng`) e na velocidade selecionada.
 */
function updateUI(){
	updateRouteListActive();
	// remaining distance
	const remMeters = remainingDistanceFrom(currentIndex, currentLatLng);
	let etaSeconds = Infinity;
	if(speedMps > 0) etaSeconds = remMeters / speedMps;

	etaEl.textContent = formatETA(etaSeconds);
	lastUpdateEl.textContent = new Date().toLocaleTimeString();

	// update floating overlay if present
	if(overlayETA){ overlayETA.textContent = formatETA(etaSeconds); }
	if(overlaySpeed){ overlaySpeed.textContent = `${Math.round(speedKmh)} km/h`; }

	if(currentIndex >= route.length -1){
		statusEl.textContent = 'Chegou ao destino';
		statusEl.style.color = '#8ef';
		btnToggle.disabled = true;
	} else if(!running){
		statusEl.textContent = 'Pausado';
		statusEl.style.color = '#f3c';
	} else {
		statusEl.textContent = 'Em trânsito';
		statusEl.style.color = '#9ff';
	}

	// atualizar popup do marcador (informações rápidas)
	const remKm = (remMeters/1000).toFixed(2);
		// calcular próximo ponto e horário estimado de passagem
		// identificar próximo waypoint original e horário segundo osrm/speed
		let traveled = (currentLatLng && expandedCumulativeDist && expandedCumulativeDist.length) ? getDistanceAlong(currentLatLng) : 0;
		let nextWp = routeNames.length-1;
		for(let i=0;i<originalWaypointDistAlong.length;i++){
			if(originalWaypointDistAlong[i] > traveled){ nextWp = i; break; }
		}
		const nextTime = scheduleTimes[nextWp];
		const nextTimeText = nextTime ? nextTime.toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'}) : '--:--';
		marker.bindPopup(`<strong>Coleteja</strong><br/>Velocidade: ${Math.round(speedKmh)} km/h<br/>Distância restante: ${remKm} km<br/>Próx. parada: ${routeNames[nextWp] || ('Ponto '+(nextWp+1))} — ${nextTimeText}`).openPopup();
}

// timer
let ticker = null;
function startTicker(){
	if(ticker) return;
	ticker = setInterval(()=>{
		advance(1);
	}, 1000);
}
function stopTicker(){
	if(!ticker) return;
	clearInterval(ticker); ticker = null;
}

// controls
btnToggle.addEventListener('click', ()=>{
	running = !running;
	btnToggle.textContent = running ? 'Pausar' : 'Retomar';
	if(running) startTicker();
	updateUI();
});

speedRange.addEventListener('input', ()=>{
	speedKmh = Number(speedRange.value);
	speedMps = speedKmh * 1000/3600;
	// recomputar horários com nova velocidade
	const start = new Date(startTimeInput.value);
	scheduleTimes = computeScheduleTimesFromOSRM(start, speedKmh);
	applyManualSchedule(manualSchedule);
	updateRouteTimesDisplay();
	updateUI();
});

// --- botão Recomeçar: reinicia a simulação e posiciona o caminhão no ponto inicial ---
/**
 * Reinicia a simulação: posiciona o caminhão no primeiro ponto, recomputa horários
 * e reinicia o ticker.
 */
function resetRoute(){
	stopTicker();
	// reset position/index
	currentIndex = 0;
	if(route && route.length){
		currentLatLng = route[0].clone();
	} else {
		currentLatLng = L.latLng(routePoints[0][0], routePoints[0][1]);
	}
	if(marker) marker.setLatLng(currentLatLng);

	// recomputar horários a partir do startTime atual
	scheduleTimes = computeScheduleTimesFromOSRM(new Date(startTimeInput.value), speedKmh);
	applyManualSchedule(manualSchedule);
	updateRouteTimesDisplay();
	updateUI();

	// reiniciar a simulação
	running = true;
	if(btnToggle) btnToggle.textContent = 'Pausar';
	startTicker();

	// recentralizar mapa (silenciosamente)
	try{ map.setView(currentLatLng, 13); }catch(e){ /* ignore */ }
}

if(btnReset){
	btnReset.addEventListener('click', (ev)=>{
		ev.preventDefault();
		resetRoute();
	});
}

// atualizar horários quando hora de partida mudar
startTimeInput.addEventListener('change', ()=>{
	const start = new Date(startTimeInput.value);
	scheduleTimes = computeScheduleTimesFromOSRM(start, speedKmh);
	applyManualSchedule(manualSchedule);
	updateRouteTimesDisplay();
	updateUI();
});

// iniciar
renderRouteList();
// recomputar scheduleTimes com valores iniciais (somente se OSRM respondeu); caso contrário manter placeholders
if(osrmCumulativeSeconds && osrmCumulativeSeconds.length){
	scheduleTimes = computeScheduleTimesFromOSRM(new Date(startTimeInput.value), speedKmh);
} else {
	scheduleTimes = new Array(routeNames.length).fill(null);
}
updateRouteTimesDisplay();
updateUI();
startTicker();

// exposição: permitir clicar na rota para centralizar
routeLine.on('click', (e)=>{
	map.panTo(e.latlng);
});

// clique nos itens da lista para navegar
routeList.addEventListener('click', (ev)=>{
	const li = ev.target.closest('li');
	if(!li) return;
	const idx = Number(li.dataset.index);
	// centralizar no waypoint original
	const wp = routePoints[idx];
	if(wp) map.flyTo([wp[0], wp[1]], 15);
});

// sidebar toggle: allow expanding map to full width
if(btnToggleSidebar){
	btnToggleSidebar.addEventListener('click', ()=>{
		const collapsed = document.body.classList.toggle('sidebar-collapsed');
		btnToggleSidebar.textContent = collapsed ? 'Restaurar layout' : 'Mostrar mapa maior';

		// Robust resize: call invalidateSize immediately and again after short delays
		try{ if(window.map && typeof map.invalidateSize === 'function') map.invalidateSize(); }catch(e){/*ignore*/}
		setTimeout(()=>{ try{ if(window.map && typeof map.invalidateSize === 'function') map.invalidateSize(); }catch(e){} }, 80);
		setTimeout(()=>{ try{ if(window.map && typeof map.invalidateSize === 'function') map.invalidateSize(); }catch(e){} }, 350);

		// If we have a route line, refocus to bounds so viewport uses available space
		setTimeout(()=>{
			try{
				if(typeof routeLine !== 'undefined' && routeLine && routeLine.getBounds){
					map.fitBounds(routeLine.getBounds(), {padding:[40,40]});
				}
			}catch(e){/*ignore*/}
		}, 360);
	});
}
