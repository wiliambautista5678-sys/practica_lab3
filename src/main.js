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

btnIniciar.addEventListener("click", async () => {
    try {
        overlay.style.display = "none";

        // 1. Permisos para sensores de movimiento (Giroscopio/Brújula)
        if (typeof DeviceOrientationEvent !== "undefined" && typeof DeviceOrientationEvent.requestPermission === "function") {
            const permissionState = await DeviceOrientationEvent.requestPermission();
            if (permissionState !== "granted") {
                alert("⚠️ Se requieren permisos de orientación para alinear los componentes AR.");
                overlay.style.display = "flex";
                return;
            }
        }

        // 2. Inicialización de la App LocAR
        const app = new App({
            canvas,
            cameraOptions: { 
                hFov: 80, 
                near: 0.1,  
                far: 2000 
            }
        });

        const locar = await app.start();

        // 3. Luces intensas para hacer los cubos visibles
        const ambientLight = new THREE.AmbientLight(0xffffff, 2.5);
        app.scene.add(ambientLight);
        
        const dirLight = new THREE.DirectionalLight(0xffffff, 1.8);
        dirLight.position.set(10, 20, 10);
        app.scene.add(dirLight);

        // 4. Iniciar hardware de localización
        locar.startGps();
        console.log("🚀 Sensores AR y GPS vinculados exitosamente.");

        // 5. Monitoreo en el Panel de Diagnóstico
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

        // 6. Inyección de objetos en la escena
        cargarModeloRouter(locar);

        // 7. BRÚJULA DE RESPALDO: Escucha nativa de orientación absoluta
        let alphaOrientacion = 0;
        window.addEventListener("deviceorientationabsolute", (event) => {
            // Captura los grados de rotación reales respecto al norte magnético
            if (event.alpha !== null) {
                alphaOrientacion = event.alpha; 
            }
        }, true);

        // En caso de que no soporte absolute (ej. algunos iPhones viejos) usamos el estándar
        window.addEventListener("deviceorientation", (event) => {
            if (event.webkitCompassHeading) {
                alphaOrientacion = -event.webkitCompassHeading; // Ajuste para iOS
            } else if (event.alpha !== null && !event.absolute) {
                alphaOrientacion = event.alpha;
            }
        }, true);

        // 8. BUCLE DE ANIMACIÓN INTEGRADO
        function renderLoop() {
            requestAnimationFrame(renderLoop);

            if (app && typeof app.update === "function") {
                app.update(); 
            }

            // Forzar de forma manual la rotación de la cámara si LocAR no logra acoplar el giroscopio
            if (app.camera && alphaOrientacion !== 0) {
                // Convertir grados de la brújula a radianes de Three.js en el eje Y (giro horizontal)
                const radianes = THREE.MathUtils.degToRad(alphaOrientacion);
                app.camera.rotation.y = radianes;
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
    navigator.geolocation.getCurrentPosition(
        (position) => {
            const miLat = position.coords.latitude;
            const miLon = position.coords.longitude;
            
            console.log(`📍 Posición base para cubos: Lat: ${miLat}, Lon: ${miLon}`);

            // Incrementamos la distancia a 0.00015 (~16 metros) y los hacemos más grandes para verlos fácil
            const DISTANCIA = 0.00015; 

            const puntosCardinales = [
                { nombre: "NORTE (Verde)", lat: miLat + DISTANCIA, lon: miLon, color: 0x00FF00 },
                { nombre: "SUR (Rojo)",    lat: miLat - DISTANCIA, lon: miLon, color: 0xFF0000 },
                { nombre: "ESTE (Azul)",   lat: miLat, lon: miLon + DISTANCIA, color: 0x0000FF },
                { nombre: "OESTE (Amarillo)", lat: miLat, lon: miLon - DISTANCIA, color: 0xFFFF00 }
            ];

            puntosCardinales.forEach((punto) => {
                // Cubos gigantes de 4x4x4 metros para que no pasen desapercibidos
                const geometry = new THREE.BoxGeometry(4, 4, 4);
                const material = new THREE.MeshStandardMaterial({ 
                    color: punto.color,
                    roughness: 0.2,
                    metalness: 0.2
                });
                const cubo = new THREE.Mesh(geometry, material);

                const grupoCubo = new THREE.Group();
                grupoCubo.add(cubo);

                if (typeof createInfoLabel === "function") {
                    grupoCubo.add(createInfoLabel()); 
                }

                // Posicionamiento con una elevación de 2 metros sobre el suelo
                locar.add(grupoCubo, punto.lon, punto.lat, 2.0);
                console.log(`✅ Cubo inyectado en: ${punto.nombre}`);
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

