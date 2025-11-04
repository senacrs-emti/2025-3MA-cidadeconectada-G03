// Inicializa o mapa em Porto Alegre
const map = L.map('map').setView([-30.0346, -51.2177], 12);

// Tiles OpenStreetMap
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  maxZoom: 19,
}).addTo(map);

// Regiões e bairros com coordenadas centrais corretas
const regions = {
  "Centro": [
    { name: "Centro Histórico", lat:-30.0279, lng:-51.2280, time:"08:00" },
    { name: "Bom Fim", lat:-30.0326, lng:-51.2145, time:"08:30" },
    { name: "Cidade Baixa", lat:-30.0375, lng:-51.2195, time:"09:00" },
    { name: "Moinhos de Vento", lat:-30.0250, lng:-51.2027, time:"09:30" },
    { name: "Menino Deus", lat:-30.0520, lng:-51.2205, time:"10:00" },
    { name: "Petrópolis", lat:-30.0385, lng:-51.1965, time:"10:30" },
    { name: "Bela Vista", lat:-30.0320, lng:-51.1945, time:"11:00" },
    { name: "Rio Branco", lat:-30.0265, lng:-51.2095, time:"11:30" },
    { name: "Farroupilha", lat:-30.0362, lng:-51.2185, time:"12:00" }
  ],
  "Noroeste": [
    { name: "Humaitá", lat:-30.0150, lng:-51.1890, time:"08:15" },
    { name: "Navegantes", lat:-30.0095, lng:-51.1965, time:"08:45" },
    { name: "São Geraldo", lat:-30.0185, lng:-51.2040, time:"09:15" },
    { name: "Anchieta", lat:-30.0195, lng:-51.1925, time:"09:45" },
    { name: "São João", lat:-30.0225, lng:-51.1880, time:"10:15" },
    { name: "Higienópolis", lat:-30.0205, lng:-51.1850, time:"10:45" },
    { name: "Cristo Redentor", lat:-30.0135, lng:-51.1935, time:"11:15" },
    { name: "Boa Vista", lat:-30.0160, lng:-51.1895, time:"11:45" }
  ],
  "Leste": [
    { name: "Jardim Carvalho", lat:-30.0250, lng:-51.2000, time:"08:30" },
    { name: "Jardim do Salso", lat:-30.0220, lng:-51.2050, time:"09:00" },
    { name: "Três Figueiras", lat:-30.0300, lng:-51.2000, time:"09:30" },
    { name: "Vila Jardim", lat:-30.0280, lng:-51.2100, time:"10:00" },
    { name: "Bom Jesus", lat:-30.0250, lng:-51.2150, time:"10:30" },
    { name: "Chácara das Pedras", lat:-30.0350, lng:-51.2200, time:"11:00" }
  ],
  "Centro-Sul e Sul": [
    { name: "Ipanema", lat:-30.1340, lng:-51.2170, time:"08:45" },
    { name: "Tristeza", lat:-30.1180, lng:-51.2150, time:"09:15" },
    { name: "Vila Assunção", lat:-30.1250, lng:-51.2160, time:"09:45" },
    { name: "Vila Conceição", lat:-30.1220, lng:-51.2140, time:"10:15" },
    { name: "Pedra Redonda", lat:-30.1290, lng:-51.2165, time:"10:45" },
    { name: "Camaquã", lat:-30.1150, lng:-51.2190, time:"11:15" },
    { name: "Cavalhada", lat:-30.0990, lng:-51.2195, time:"11:45" },
    { name: "Teresópolis", lat:-30.0870, lng:-51.2190, time:"12:15" },
    { name: "Nonoai", lat:-30.0950, lng:-51.2180, time:"12:45" }
  ],
  "Norte": [
    { name: "Sarandi", lat:-29.9850, lng:-51.1070, time:"08:00" },
    { name: "Rubem Berta", lat:-29.9920, lng:-51.1160, time:"08:30" },
    { name: "Passo das Pedras", lat:-29.9880, lng:-51.1120, time:"09:00" },
    { name: "Santa Rosa de Lima", lat:-29.9950, lng:-51.1150, time:"09:30" },
    { name: "Costa e Silva", lat:-29.9980, lng:-51.1090, time:"10:00" },
    { name: "Jardim Leopoldina", lat:-29.9910, lng:-51.1130, time:"10:30" }
  ]
};

// Junta todos os bairros
const allPoints = Object.values(regions).flat();

// Adiciona marcadores corretos no mapa
allPoints.forEach(p => {
  const marker = L.marker([p.lat, p.lng]).addTo(map);
  marker.bindPopup(`<b>${p.name}</b><br>🕓 Próxima passagem: ${p.time}`);
});

// Sidebar
const scheduleList = document.getElementById("schedule-list");
allPoints.forEach(p => {
  const li = document.createElement("li");
  li.innerHTML = `🛻 <b>${p.name}</b> - 🕓 ${p.time}`;
  scheduleList.appendChild(li);
  li.addEventListener('click', () => map.setView([p.lat, p.lng], 14));
});

// Caminhão
const truckIcon = L.icon({
  iconUrl: 'https://cdn-icons-png.flaticon.com/512/743/743131.png',
  iconSize: [40, 40],
  iconAnchor: [20, 20]
});

let truckMarker = L.marker([allPoints[0].lat, allPoints[0].lng], {icon: truckIcon}).addTo(map);
const truckStatus = document.getElementById("truck-status");

// Simula caminhão se movendo pelos bairros
let index = 0;
setInterval(() => {
  index = (index + 1) % allPoints.length;
  const p = allPoints[index];
  truckMarker.setLatLng([p.lat, p.lng]);
  truckStatus.innerText = `🚛 Caminhão está em: ${p.name}`;
}, 3000);
