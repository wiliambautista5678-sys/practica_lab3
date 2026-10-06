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
        // Ocultar la pantalla de carga
        overlay.style.display = "none";

        // Inicializar LocAR tras la interacción del usuario
        const app = new App({
            canvas,
            cameraOptions: { hFov: 80, near: 0.001, far: 1500 }
        });

        const locar = await app.start();
        
        // Activar sensores de movimiento y GPS
        locar.startGps();
        console.log("🚀 Sensores AR y GPS activados correctamente.");

        // Cargar el modelo 3D del Router
        cargarModeloRouter(locar);

    } catch (error) {
        alert("Error al iniciar los componentes AR: " + error.message);
        overlay.style.display = "flex"; // Volver a mostrar si falla
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
}

}
