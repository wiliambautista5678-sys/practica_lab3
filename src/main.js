import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { App } from "locar";

const canvas = document.querySelector("#canvas-ar");
const btnIniciar = document.querySelector("#btn-iniciar-ar");
const overlay = document.querySelector("#ar-overlay");

// Coordenadas objetivo
const TARGET = { lat: -2.299114, lon: -78.118125 };

// Escuchar el clic del botón del usuario (Requisito obligatorio del navegador)
btnIniciar.addEventListener("click", async () => {
    try {
        overlay.style.display = "none";

        // 1. Solicitud obligatoria de permisos para sensores de movimiento (Giroscopio)
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
                near: 0.1,  // Cambiado a 0.1 para evitar problemas de frustum clipping
                far: 2000 
            }
        });

        // 3. Arrancar la aplicación y capturar la instancia del motor
        const locar = await app.start();

        // 4. Agregar Iluminación (Imprescindible para materiales MeshStandardMaterial)
        const ambientLight = new THREE.AmbientLight(0xffffff, 2.0);
        app.scene.add(ambientLight);
        
        const dirLight = new THREE.DirectionalLight(0xffffff, 1.5);
        dirLight.position.set(0, 20, 10);
        app.scene.add(dirLight);

        // 5. Iniciar la escucha del hardware GPS interno
        locar.startGps();
        console.log("🚀 Sensores AR y GPS vinculados exitosamente.");

        // 6. Forzar la inyección de los cubos cardinales de prueba
        cargarModeloRouter(locar);

        // 7. BUCLE DE RENDERIZADO OFICIAL (Corrección del problema de visibilidad)
        // Redefinimos el ciclo de animación asegurando que la cámara de Three.js actualice su matriz
              // 5. Iniciar la escucha del hardware GPS interno
        locar.startGps();
        console.log("🚀 Sensores AR y GPS vinculados exitosamente.");

        // 6. Forzar la inyección de los cubos cardinales de prueba
        cargarModeloRouter(locar);

        // ==========================================================
        // 7. BUCLE DE ANIMACIÓN ESTÁNDAR Y COMPATIBLE (CORRECCIÓN)
        // ==========================================================
        const clock = new THREE.Clock();

        function renderLoop() {
            // Reclama el siguiente fotograma del navegador
            requestAnimationFrame(renderLoop);

            // 1. Obliga a LocAR.js a sincronizar los sensores de orientación física con Three.js
            if (app && typeof app.update === "function") {
                app.update(); 
            }

            // 2. Ejecuta el renderizado de la escena usando los objetos base de Three.js
            // app.renderer y app.camera son creados automáticamente por LocAR al iniciar
            if (app.renderer && app.scene && app.camera) {
                app.renderer.render(app.scene, app.camera);
            }
        }

        // Ejecutar el bucle de animación por primera vez
        renderLoop();
   // LocAR.js gestiona internamente la rotación de la cámara basándose en el giroscopio aquí.
            // Si necesitas animar algo de Three.js (como rotar un cubo), puedes hacerlo en este bloque.
        });

    } catch (error) {
        alert("Error crítico al iniciar componentes AR: " + error.message);
        overlay.style.display = "flex";
    }
});



// Envolver la carga del modelo en una función limpia
function cargarModeloRouter(locar) {
    // 1. Obtener tu posición GPS actual para usarla como punto de origen central
    navigator.geolocation.getCurrentPosition((position) => {
        const miLat = position.coords.latitude;
        const miLon = position.coords.longitude;
        
        console.log(`📍 Posición central fija para cardinales: Lat: ${miLat}, Lon: ${miLon}`);

        // Factor de conversión aproximado: 0.0001 grados ≈ 11 metros
        const DISTANCIA = 0.0001; 

        // 2. Definición de los 4 Puntos Cardinales con sus desplazamientos GPS y colores
        const puntosCardinales = [
            { nombre: "NORTE (Verde)", lat: miLat + DISTANCIA, lon: miLon, color: 0x00FF00 },
            { nombre: "SUR (Rojo)",    lat: miLat - DISTANCIA, lon: miLon, color: 0xFF0000 },
            { nombre: "ESTE (Azul)",   lat: miLat, lon: miLon + DISTANCIA, color: 0x0000FF },
            { nombre: "OESTE (Amarillo)", lat: miLat, lon: miLon - DISTANCIA, color: 0xFFFF00 }
        ];

        // 3. Crear y posicionar un cubo en cada coordenada calculada
        puntosCardinales.forEach((punto) => {
            // Geometría del cubo (3 metros de ancho, alto y profundidad para que sea muy visible)
            const geometry = new THREE.BoxGeometry(3, 3, 3);
            const material = new THREE.MeshStandardMaterial({ 
                color: punto.color,
                roughness: 0.4,
                metalness: 0.1
            });
            const cubo = new THREE.Mesh(geometry, material);

            // Crear un grupo en Three.js para este elemento
            const grupoCubo = new THREE.Group();
            grupoCubo.add(cubo);

            // Opcional: Agregar texto flotante simple encima de cada cubo si tienes la función 'createInfoLabel'
            if (typeof createInfoLabel === "function") {
                // Puedes personalizar createInfoLabel para recibir el nombre si lo deseas
                grupoCubo.add(createInfoLabel()); 
            }

            // 4. Inyectar el cubo en el motor LocAR
            // Parámetros: (Objeto3D, Longitud, Latitud, Elevación del suelo en metros)
            locar.add(grupoCubo, punto.lon, punto.lat, 1.5);

            console.log(`✅ Cubo inyectado en el ${punto.nombre} a ~11 metros.`);
        });

    }, (error) => {
        alert("❌ Error al obtener el GPS de referencia para los puntos cardinales: " + error.message);
    }, {
        enableHighAccuracy: true
    });
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
    console.log(`Posición actualizada -> Lat: ${ev.position.coords.latitude}, Lon: ${ev.position.coords.longitude}`);
});

}
