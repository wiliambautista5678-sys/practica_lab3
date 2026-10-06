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

        // 1. SOLICITUD DE PERMISOS PARA SENSORES (Crucial para iOS y Android moderno)
        if (typeof DeviceOrientationEvent !== "undefined" && typeof DeviceOrientationEvent.requestPermission === "function") {
            const permissionState = await DeviceOrientationEvent.requestPermission();
            if (permissionState !== "granted") {
                alert("⚠️ Se requieren permisos de orientación para alinear los cubos con el mundo real.");
                overlay.style.display = "flex";
                return;
            }
        }

        // 2. Inicializar la App LocAR con renderizado continuo forzado
        const app = new App({
            canvas,
            cameraOptions: { hFov: 80, near: 0.001, far: 1500 }
        });

        const locar = await app.start();
        
        // 3. Agregar luces obligatorias para que los cubos tengan color y no sean invisibles/negros
        const ambientLight = new THREE.AmbientLight(0xffffff, 1.8);
        app.scene.add(ambientLight);
        const dirLight = new THREE.DirectionalLight(0xffffff, 1.5);
        dirLight.position.set(0, 10, 10);
        app.scene.add(dirLight);

        // 4. Activar sensores AR y GPS de LocAR
        locar.startGps();
        console.log("🚀 Sensores AR y GPS activados correctamente.");

        // 5. Cargar los cubos cardinales de prueba
        cargarModeloRouter(locar);

        // 6. BUCLE DE ANIMACIÓN (Obligatorio en algunas versiones de LocAR para actualizar la brújula)
        function animate() {
            requestAnimationFrame(animate);
            // Fuerza a la app a sincronizar la orientación del teléfono con la cámara de Three.js
            if (app && app.update) {
                app.update(); 
            }
        }
        animate();

    } catch (error) {
        alert("Error al iniciar los componentes AR: " + error.message);
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
