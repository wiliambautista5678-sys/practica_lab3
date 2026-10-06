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
    const loader = new GLTFLoader();
    loader.load("/models/router.glb", function (gltf) {
        const routerGroup = new THREE.Group();
        routerGroup.add(gltf.scene);
        
        // Añadir al entorno AR
        locar.add(routerGroup, TARGET.lon, TARGET.lat, 0);
    });
}
