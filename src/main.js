import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js"; // Corrección de ruta oficial
import { App } from "locar";

// 1. Configuración de la coordenada objetivo (Laboratorio de Redes)
const TARGET = {
    lat: -2.299114,
    lon: -78.118125,
    name: "LABORATORIO DE REDES"
};

const canvas = document.querySelector("#canvas-ar"); // Asegúrate de tener este id en tu HTML

// 2. Inicialización de la App LocAR (Escena, Cámara y Sensores)
const app = new App({
    canvas,
    cameraOptions: {
        hFov: 80,
        near: 0.001,
        far: 1500
    }
});

const locar = await app.start();

// 3. Función para generar la etiqueta informativa en un Canvas Texturizado (Sprite)
function createInfoLabel() {
    const canvasLabel = document.createElement("canvas");
    canvasLabel.width = 1024;
    canvasLabel.height = 512;
    const ctx = canvasLabel.getContext("2d");

    // Fondo Negro Semitransparente
    ctx.fillStyle = "rgba(0, 0, 0, 0.75)";
    ctx.fillRect(0, 0, canvasLabel.width, canvasLabel.height);

    // Borde Verde Tecnológico
    ctx.strokeStyle = "#00FF00";
    ctx.lineWidth = 12;
    ctx.strokeRect(8, 8, canvasLabel.width - 16, canvasLabel.height - 16);

    // Texto del Título (Blanco)
    ctx.fillStyle = "#FFFFFF";
    ctx.textAlign = "center";
    ctx.font = "bold 72px Arial";
    ctx.fillText("ROUTER DE RED", canvasLabel.width / 2, 110);

    // Texto de la IP (Blanco)
    ctx.font = "52px Arial";
    ctx.fillText("IP: 192.168.1.1", canvasLabel.width / 2, 210);

    // Texto del Estado destacado en VERDE (Mejora didáctica del manual)
    ctx.fillStyle = "#00FF00";
    ctx.fillText("Estado: ACTIVO", canvasLabel.width / 2, 300);

    // Texto de los Puertos (Blanco)
    ctx.fillStyle = "#FFFFFF";
    ctx.fillText("24 puertos", canvasLabel.width / 2, 390);

    // Convertir el lienzo en una textura interactiva de Three.js
    const texture = new THREE.CanvasTexture(canvasLabel);
    texture.needsUpdate = true;

    const material = new THREE.SpriteMaterial({
        map: texture,
        transparent: true,
        depthTest: false // Evita que se oculte detrás de otras mallas si hay oclusión básica
    });

    const sprite = new THREE.Sprite(material);
    
    // Dimensiones y escalado de la etiqueta flotante
    sprite.scale.set(14, 7, 1);
    
    // Posición en el eje Y (12 unidades arriba del Router para que no se superpongan)
    sprite.position.set(0, 12, 0); 

    return sprite;
}

// 4. Carga del Modelo 3D del Router (.glb) combinándolo con su Etiqueta
const loader = new GLTFLoader();

loader.load(
    "/models/router.glb", // Ruta mapeada automáticamente por la carpeta public de Vite
    function (gltf) {
        const routerMesh = gltf.scene;

        // Ajuste de escala inicial (Modificar a 10,10,10 si se visualiza muy pequeño)
        routerMesh.scale.set(5, 5, 5);
        
        // Rotación en radianes (0, 0, 0 por defecto)
        routerMesh.rotation.set(0, 0, 0);

        // Crear un grupo unificado en Three.js para mover ambos elementos en bloque
        const routerGroup = new THREE.Group();
        routerGroup.add(routerMesh);
        
        // Obtener y añadir la etiqueta informativa
        const infoLabel = createInfoLabel();
        routerGroup.add(infoLabel);

        // 5. Inyección de Realidad Aumentada Georreferenciada mediante LocAR
        // Parámetros: (Grupo3D, Longitud, Latitud, Elevación sobre el suelo)
        locar.add(
            routerGroup,
            TARGET.lon,
            TARGET.lat,
            5 
        );

        console.log("✅ Router y etiqueta cargados y georreferenciados con éxito.");
    },
    function (progress) {
        console.log("⚡ Cargando componentes del router...");
    },
    function (error) {
        console.error("❌ Error crítico de carga en el GLTF:", error);
    }
);

// 6. Activación del ciclo de escucha en tiempo real para el GPS del móvil
locar.startGps();

locar.on("gpsupdate", (ev) => {
    console.log(`Posición actual -> Lat: ${ev.position.coords.latitude}, Lon: ${ev.position.coords.longitude}, Precisión: ${ev.position.coords.accuracy}m`);
});
