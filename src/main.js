import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { App } from "locar";

const canvas = document.querySelector("#canvas-ar");
const btnIniciar = document.querySelector("#btn-iniciar-ar");
const overlay = document.querySelector("#ar-overlay");

function createInfoLabel() {
    const canvasLabel = document.createElement("canvas");
    canvasLabel.width = 1024;
    canvasLabel.height = 512;
    const ctx = canvasLabel.getContext("2d");

    ctx.fillStyle = "rgba(0, 0, 0, 0.75)";
    ctx.fillRect(0, 0, canvasLabel.width, canvasLabel.height);

    ctx.strokeStyle = "#00FF00";
    ctx.lineWidth = 12;
    ctx.strokeRect(8, 8, canvasLabel.width - 16, canvasLabel.height - 16);

    ctx.fillStyle = "#FFFFFF";
    ctx.textAlign = "center";
    ctx.font = "bold 72px Arial";
    ctx.fillText("ROUTER DE RED", canvasLabel.width / 2, 110);

    ctx.font = "52px Arial";
    ctx.fillText("IP: 192.168.1.1", canvasLabel.width / 2, 210);

    ctx.fillStyle = "#00FF00";
    ctx.fillText("Estado: ACTIVO", canvasLabel.width / 2, 300);

    ctx.fillStyle = "#FFFFFF";
    ctx.fillText("24 puertos", canvasLabel.width / 2, 390);

    const texture = new THREE.CanvasTexture(canvasLabel);
    texture.needsUpdate = true;

    const material = new THREE.SpriteMaterial({
        map: texture,
        transparent: true,
        depthTest: false
    });

    const sprite = new THREE.Sprite(material);
    sprite.scale.set(14, 7, 1);
    sprite.position.set(0, 12, 0); 

    return sprite;
}

// FLUJO PRINCIPAL ASÍNCRONO AL CLIC del BOTÓN
btnIniciar.addEventListener("click", async () => {
    try {
        overlay.style.display = "none";

        // 1. Permisos para sensores de movimiento (Crucial para dispositivos móviles)
        if (typeof DeviceOrientationEvent !== "undefined" && typeof DeviceOrientationEvent.requestPermission === "function") {
            const permissionState = await DeviceOrientationEvent.requestPermission();
            if (permissionState !== "granted") {
                alert("⚠️ Se requieren permisos de orientación para alinear los componentes AR.");
                overlay.style.display = "flex";
                return;
            }
        }

        // 2. Inicialización estricta de la App LocAR
        const app = new App({
            canvas,
            cameraOptions: { 
                hFov: 80, 
                near: 0.1,  
                far: 2000 
            }
        });

        // 3. Arrancar la aplicación y capturar el motor LocAR
        const locar = await app.start();

        // 4. Agregar Iluminación para los materiales
        const ambientLight = new THREE.AmbientLight(0xffffff, 2.0);
        app.scene.add(ambientLight);
        
        const dirLight = new THREE.DirectionalLight(0xffffff, 1.5);
        dirLight.position.set(0, 20, 10);
        app.scene.add(dirLight);

        // 5. Iniciar la escucha nativa del hardware GPS móvil
        locar.startGps();
        console.log("🚀 Sensores AR y GPS vinculados exitosamente.");

        // 6. SOLUCIÓN CORREGIDA: Escuchar la actualización de GPS dentro del flujo del objeto activo
        locar.on("gpsupdate", (ev) => {
            const debugPanel = document.querySelector("#debug-panel");
            if (debugPanel) {
                debugPanel.innerHTML = `
                    📡 Status GPS: CONECTADO<br>
                    📍 Mi Lat: ${ev.position.coords.latitude.toFixed(6)}<br>
                    📍 Mi Lon: ${ev.position.coords.longitude.toFixed(6)}<br>
                    🎯 Precisión: ${ev.position.coords.accuracy.toFixed(1)} metros
                `;
            }
        });

        // 7. Forzar la inyección de los cubos cardinales de prueba
        cargarModeloRouter(locar);

        // 8. BUCLE DE ANIMACIÓN ESTÁNDAR COMPATIBLE
        function renderLoop() {
            requestAnimationFrame(renderLoop);

            if (app && typeof app.update === "function") {
                app.update(); 
            }

            if (app.renderer && app.scene && app.camera) {
                app.renderer.render(app.scene, app.camera);
            }
        }

        renderLoop();

    } catch (error) {
        alert("Error crítico al iniciar componentes AR: " + error.message);
        overlay.style.display = "flex";
    }
});

function cargarModeloRouter(locar) {
    // Forzamos opciones de alta precisión para evitar coordenadas congeladas en 0
    navigator.geolocation.getCurrentPosition(
        (position) => {
            const miLat = position.coords.latitude;
            const miLon = position.coords.longitude;
            
            console.log(`📍 Posición central fija para cardinales: Lat: ${miLat}, Lon: ${miLon}`);

            const DISTANCIA = 0.0001; 

            const puntosCardinales = [
                { nombre: "NORTE (Verde)", lat: miLat + DISTANCIA, lon: miLon, color: 0x00FF00 },
                { nombre: "SUR (Rojo)",    lat: miLat - DISTANCIA, lon: miLon, color: 0xFF0000 },
                { nombre: "ESTE (Azul)",   lat: miLat, lon: miLon + DISTANCIA, color: 0x0000FF },
                { nombre: "OESTE (Amarillo)", lat: miLat, lon: miLon - DISTANCIA, color: 0xFFFF00 }
            ];

            puntosCardinales.forEach((punto) => {
                const geometry = new THREE.BoxGeometry(3, 3, 3);
                const material = new THREE.MeshStandardMaterial({ 
                    color: punto.color,
                    roughness: 0.4,
                    metalness: 0.1
                });
                const cubo = new THREE.Mesh(geometry, material);

                const grupoCubo = new THREE.Group();
                grupoCubo.add(cubo);

                if (typeof createInfoLabel === "function") {
                    grupoCubo.add(createInfoLabel()); 
                }

                locar.add(grupoCubo, punto.lon, punto.lat, 1.5);
                console.log(`✅ Cubo inyectado en el ${punto.nombre}`);
            });
        }, 
        (error) => {
            alert("❌ Error al obtener el GPS de referencia: " + error.message);
        }, 
        {
            enableHighAccuracy: true,
            timeout: 15000,
            maximumAge: 0
        }
    ); 
}
