# Puente de Modelado y Renderizado Godot <-> Blender IPC

Este directorio contiene la arquitectura inicial para conectar la base de datos geométrica de **Blender** (a través de su API Python en modo headless) con el motor de renderizado y lógica en tiempo real de **Godot Engine 4.x** (mediante una GDExtension escrita en C++).

## Características Implementadas

- **Servidor Headless en Blender**: Levanta un socket TCP local en Python que escucha comandos JSON estructurados, modifica la geometría usando `bmesh` y retorna buffers de vértices, índices triangulados, normales y coordenadas UV optimizadas.
- **Nodo GDExtension en Godot C++ (`GeometryBridge3D`)**: Carga el cliente de red en un hilo separado para evitar bloqueos del bucle principal de renderizado, y reconstruye dinámicamente una malla usando `ArrayMesh` y buffers nativos de Godot.
- **Protocolo IPC Ligero**: Comunicación bidireccional sobre sockets TCP binarios usando una cabecera de tamaño de 4 bytes Big-Endian seguida por el payload codificado en JSON.
- **Traductor de Prompts de IA**: Script para parsear lenguaje natural estructurado a comandos del protocolo JSON.

---

## Estructura de Directorios

- `protocol/protocol_schema.json`: Especificación formal del protocolo de mensajes JSON.
- `blender/blender_server.py`: Script principal de Blender.
- `godot/`: Código fuente C++ para compilar como módulo de Godot.
  - `src/geometry_bridge_3d.h` y `.cpp`: Lógica de integración y renderizado del nodo Godot.
  - `src/tcp_socket_client.h` y `.cpp`: Cliente de red portátil.
  - `src/register_types.h` y `.cpp`: Puntos de entrada para el registro de GDExtension.
  - `SConstruct`: Script de compilación usando SCons.
  - `blender_godot_bridge.gdextension`: Metadatos del puente para Godot.
- `ai_agent/command_translator.py`: Traductor de lenguaje natural para la IA.

---

## Requisitos y Preparación

### Lado de Blender (Servidor)
Asegúrate de tener Blender instalado en tu PATH (o ejecuta usando la ruta absoluta).

### Lado de Godot C++ (GDExtension)
1. Descarga los bindings oficiales de C++ para Godot en la carpeta `godot/godot-cpp`:
   ```bash
   cd godot
   git clone --recursive -b 4.2 https://github.com/godotengine/godot-cpp.git
   ```
2. Compila los bindings de `godot-cpp` para tu plataforma:
   ```bash
   cd godot-cpp
   scons platform=windows target=template_debug
   ```
3. Compila el puente del GDExtension desde el directorio `godot/`:
   ```bash
   cd ..
   scons platform=windows target=template_debug
   ```
   Esto generará el archivo DLL/SO/DYLIB correspondiente dentro de `godot/bin/`.

---

## Guía de Uso Rápido

### 1. Levantar el Servidor de Blender
Ejecuta Blender en modo de fondo (headless) inyectando el script del servidor:
```bash
blender --background --python blender/blender_server.py
```
*Salida esperada:*
```
Servidor Blender headless escuchando en 127.0.0.1:5005...
```

### 2. Conectar e Interactuar en Godot
En tu escena de Godot, añade el nodo `GeometryBridge3D` (el cual hereda de `MeshInstance3D`).

Escribe un script en GDScript para conectar con Blender e invocar operaciones:
```gdscript
extends GeometryBridge3D

func _ready():
    # Conectarse al puerto local de Blender
    if connect_to_blender("127.0.0.1", 5005):
        print("¡Conexión establecida con Blender!")
        
        # Esperar un segundo y mandar comando de extrusión
        await get_tree().create_timer(1.0).timeout
        extrude_face(0, 1.5)

func extrude_face(face_idx: int, amount: float):
    var params = {
        "face_index": face_idx,
        "amount": amount
    }
    send_edit_command("extrude", params)
```

### 3. Ejecutar Comandos por IA (Traductor de Prompts)
Un agente de IA puede invocar el script en `ai_agent/command_translator.py` pasándole prompts:
```bash
python ai_agent/command_translator.py "extruye la cara 2 por 1.8"
```
*Salida en consola:*
```json
{"command": "edit_op", "op_type": "extrude", "params": {"face_index": 2, "amount": 1.8}}
```
Este JSON puede enviarse directamente por el socket de red del cliente o procesarse desde tu aplicación.
