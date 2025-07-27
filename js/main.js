// ========== 3.1 เส้นทาง ==========
const cRoute1 = "#0000ff";
const cRoute2 = "red";
const cRoute3 = "#f39c12";
const routeColors = [cRoute1, cRoute2, cRoute3];

const mainRouteStyles = [
  { color: 'white', weight: 8, opacity: 0.8 },
  { color: cRoute1, weight: 3, opacity: 0.8 }
];
const altRouteStyles = [
  [{ color: 'white', weight: 6, opacity: 0.8 }, { color: cRoute2, weight: 3, opacity: 0.8 }],
  [{ color: 'white', weight: 6, opacity: 0.8 }, { color: cRoute3, weight: 3, opacity: 0.8 }]
];

// ========== 3.2 รูปแบบหมุด ==========
const markerIcons = {
  start: L.icon({ iconUrl: 'img/start.png', iconSize: [26, 26], iconAnchor: [13, 26] }),
  via:   L.icon({ iconUrl: 'img/via.png', iconSize: [26, 26], iconAnchor: [13, 26] }),
  end:   L.icon({ iconUrl: 'img/end.png', iconSize: [26, 26], iconAnchor: [13, 26] })
};

document.addEventListener("DOMContentLoaded", function () {
  const map = L.map("map").setView([16.439810, 102.829446], 10);
  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
        {
          attribution: "&copy; OpenStreetMap contributors",
        }).addTo(map);
  
  let routeControl = null;
  let waypoints = [];
  let markers = [];
  let mode = "idle";

  const routeBtn = document.getElementById("routeBtn");
  const exitBtn = document.getElementById('exitBtn');
  const coordInputs = document.getElementById("coord-inputs");
  const showInstruction = document.getElementById("showInstruction");

  exitBtn.addEventListener('click', () => {
      controlPanel.classList.remove('show');
    });
  
  routeBtn.addEventListener("click", () => {
    if (mode === "idle") {
      mode = "selecting";
      routeBtn.textContent = "รีเซ็ต";
      waypoints = [];
      markers.forEach((m) => map.removeLayer(m));
      markers = [];
      coordInputs.innerHTML = "";
      showInstruction.innerHTML = "คลิกจุดเริ่มต้น จุดหมาย <br>และทางผ่าน(ถ้ามี)";
      if (routeControl) {
        map.removeControl(routeControl);
        routeControl = null;
      }
    } else {
      resetAll();
    }
  });

  map.on("click", (e) => {
    if (mode !== "selecting" || waypoints.length >= 3) return;

    const idx = waypoints.length;
    const icon = idx === 0 ? markerIcons.start : (idx === 1 ? markerIcons.end : markerIcons.via);
    const marker = L.marker(e.latlng, { draggable: true, icon }).addTo(map);

    if (idx === 0) {
      waypoints.push(e.latlng);
      markers.push(marker);
    } else if (idx === 1) {
      waypoints.push(e.latlng);
      markers.push(marker);
    } else {
      waypoints.splice(1, 0, e.latlng);
      markers.splice(1, 0, marker);
    }

    updateInputs();
    markers.forEach((m, i) => {
      m.off("dragend").on("dragend", () => {
        waypoints[i] = m.getLatLng();
        updateInputs();
        drawRoute();
      });
    });

    drawRoute();
  });

  function updateInputs() {
  coordInputs.innerHTML = "";

  waypoints.forEach((pt, i) => {
    const role = i === 0 ? "start" : (i === waypoints.length - 1 ? "end" : "via");
    const labelText = i === 0 ? "จุดเริ่ม :" : (i === waypoints.length - 1 ? "จุดหมาย :" : "ทางผ่าน :");
    const showRemove = waypoints.length === 3 && i === 1;

    // สร้าง <img> แสดงไอคอนหน้าป้ายชื่อ
    const iconUrl = markerIcons[role].options.iconUrl;
    const iconHtml = `<img src="${iconUrl}" class="role-icon" alt="${role}">`;

    // สร้าง DOM element แต่ละแถว
    const row = document.createElement("div");
    row.classList.add("coord-row");
    row.innerHTML = `
      <label>${iconHtml}${labelText}</label>
      <input type="text" value="${pt.lat.toFixed(6)}, ${pt.lng.toFixed(6)}" data-idx="${i}">
      ${showRemove ? `<span class="remove-btn" onclick="removeVia(${i})">✖</span>` : ""}
    `;
    coordInputs.appendChild(row);
  });

  // เพิ่ม event เมื่อแก้ไขพิกัดใน input
  coordInputs.querySelectorAll("input").forEach((input) => {
    input.addEventListener("change", (e) => {
      const idx = +e.target.dataset.idx;
      const [lat, lng] = e.target.value.split(",").map(parseFloat);
      if (!isNaN(lat) && !isNaN(lng)) {
        waypoints[idx] = L.latLng(lat, lng);
        markers[idx].setLatLng(waypoints[idx]);
        drawRoute();
      }
    });
  });
}


  window.removeVia = function (index) {
    map.removeLayer(markers[index]);
    markers.splice(index, 1);
    waypoints.splice(index, 1);
    updateInputs();
    drawRoute();
  };

  function drawRoute() {
    if (waypoints.length < 2) return;
    if (routeControl) map.removeControl(routeControl);

    routeControl = L.Routing.control({
      waypoints,
      routeWhileDragging: true,
      show: false,
      collapsible: true,
      router: L.Routing.osrmv1({
        serviceUrl: "https://router.project-osrm.org/route/v1", //serviceUrl: 'http://localhost:5000/route/v1'
      }),
      createMarker: () => null,
      showAlternatives: true,
      lineOptions: { styles: mainRouteStyles },
      altLineOptions: [
        { styles: altRouteStyles[0] },
        { styles: altRouteStyles[1] }
      ]
    })
    .on("routesfound", function (e) {
      if (!true) return;

      const popupGroup = L.layerGroup().addTo(map);
      showInstruction.innerHTML = "";
      e.routes.forEach((route, idx) => {
        const summary = route.summary;
        const distance = (summary.totalDistance / 1000).toFixed(2);
        const timeMin = Math.round(summary.totalTime / 60);
        const hrs = Math.floor(timeMin / 60);
        const mins = timeMin % 60;
        const timeStr = hrs ? `${hrs} ชม. ${mins} นาที` : `${mins} นาที`;
        const label = idx === 0 ? "เส้นทางหลัก" : `เส้นทางสำรอง ${idx}`;
        const midLatLng = route.coordinates[Math.floor(route.coordinates.length / 2)];

        const popup = L.popup({ className: 'route-popup' })
          .setLatLng(midLatLng)
          .setContent(`<strong>${label}</strong><br>ระยะทาง: ${distance} กม.<br>เวลาประมาณ: ${timeStr}`)
          .openOn(map);
        popupGroup.addLayer(popup);

        showInstruction.innerHTML += `<div style="color: ${routeColors[idx]}"><strong>${label}</strong><br>ระยะทาง: ${distance} กม.<br>เวลาประมาณ: ${timeStr}</div><br>`;
      });

      routeControl._popupGroup = popupGroup;
    })
    .addTo(map);
  }

  function resetAll() {
    mode = "idle";
    routeBtn.textContent = "ค้นหาเส้นทาง";
    waypoints = [];
    markers.forEach((m) => map.removeLayer(m));
    markers = [];
    coordInputs.innerHTML = "";
    showInstruction.innerHTML = "";
    if (routeControl) {
      if (routeControl._popupGroup) map.removeLayer(routeControl._popupGroup);
      map.removeControl(routeControl);
      routeControl = null;
    }
  }
});
