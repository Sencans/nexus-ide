import socket
import struct
import json
import traceback
import bpy
import bmesh
import os
from datetime import datetime

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
WORKSPACE_ROOT = os.path.dirname(os.path.dirname(SCRIPT_DIR))
TELEMETRY_PATH = os.path.join(WORKSPACE_ROOT, 'blender_telemetry.json')

def write_telemetry(status, last_sync=None, mesh_name=None, vertices_count=None, indices_count=None, faces_count=None, last_op=None):
    try:
        data = {
            "status": status,
            "last_sync": last_sync.isoformat() if last_sync else None,
            "mesh_name": mesh_name,
            "vertices_count": vertices_count,
            "indices_count": indices_count,
            "faces_count": faces_count,
            "last_op": last_op
        }
        with open(TELEMETRY_PATH, 'w', encoding='utf-8') as f:
            json.dump(data, f, indent=4)
    except Exception as e:
        print(f"Error escribiendo telemetría: {e}")


HOST = '127.0.0.1'
PORT = 5005

def setup_initial_mesh():
    """
    Establece una escena limpia con un único objeto cúbico listo para edición.
    """
    # Limpiar objetos existentes
    if bpy.context.object and bpy.context.object.mode == 'EDIT':
        bpy.ops.object.mode_set(mode='OBJECT')
    bpy.ops.object.select_all(action='SELECT')
    bpy.ops.object.delete(use_global=False)
    
    # Agregar cubo base
    bpy.ops.mesh.primitive_cube_add(size=2.0, enter_editmode=False, location=(0, 0, 0))
    obj = bpy.context.active_object
    obj.name = "Cube"
    return obj

def apply_operator(op_type, params):
    """
    Aplica una operación geométrica sobre el modelo usando el módulo bmesh y bpy de Blender.
    """
    obj = bpy.data.objects.get("Cube")
    if not obj:
        return {"status": "error", "message": "Cube object not found"}

    # Forzar el modo Edición para aplicar cambios de bmesh de forma reactiva
    bpy.context.view_layer.objects.active = obj
    bpy.ops.object.mode_set(mode='EDIT')
    
    bm = bmesh.from_edit_mesh(obj.data)
    bm.normal_update()

    try:
        if op_type == "extrude":
            face_index = params.get("face_index", 0)
            amount = params.get("amount", 1.0)
            
            bm.faces.ensure_lookup_table()
            if face_index < len(bm.faces):
                face = bm.faces[face_index]
                # Realizar extrusión
                r = bmesh.ops.extrude_face_region(bm, geom=[face])
                # Mover la región extruida a lo largo del vector normal de la cara original
                verts = [v for v in r['geom'] if isinstance(v, bmesh.types.BMVert)]
                bmesh.ops.translate(bm, vec=face.normal * amount, verts=verts)
            else:
                return {"status": "error", "message": f"Face index {face_index} out of bounds (max: {len(bm.faces)-1})"}

        elif op_type == "modify_vertex":
            vertex_index = params.get("vertex_index", 0)
            pos = params.get("position", [0.0, 0.0, 0.0])
            
            bm.verts.ensure_lookup_table()
            if vertex_index < len(bm.verts):
                bm.verts[vertex_index].co = tuple(pos)
            else:
                return {"status": "error", "message": f"Vertex index {vertex_index} out of bounds (max: {len(bm.verts)-1})"}

        elif op_type == "subdivide":
            # Subdividir todas las aristas
            bmesh.ops.subdivide_edges(bm, edges=bm.edges, cuts=1, use_grid_fill=True)

        elif op_type == "create_mesh":
            # Limpiar geometría y reinstanciar cubo
            bm.clear()
            bpy.ops.object.mode_set(mode='OBJECT')
            obj = setup_initial_mesh()
            bpy.ops.object.mode_set(mode='EDIT')
            bm = bmesh.from_edit_mesh(bpy.context.active_object.data)

        # Recuperar estado de selección activa en modo edición original antes de salir del modo Edición
        selected_v = [v.index for v in bm.verts if v.select]
        selected_e = [e.index for e in bm.edges if e.select]
        selected_f = [f.index for f in bm.faces if f.select]
        
        bm.select_history.validate()
        active_face = bm.select_history.active
        if active_face and isinstance(active_face, bmesh.types.BMFace) and active_face.index not in selected_f:
            selected_f.append(active_face.index)

        # Actualizar la malla de edición de Blender y regresar a modo Objeto
        bmesh.update_edit_mesh(obj.data)
        bpy.ops.object.mode_set(mode='OBJECT')
        
        # Triangular una copia temporal de la malla (Godot requiere geometría indexada por triángulos)
        temp_mesh = obj.data.copy()
        temp_bm = bmesh.new()
        temp_bm.from_mesh(temp_mesh)
        bmesh.ops.triangulate(temp_bm, faces=temp_bm.faces)
        temp_bm.to_mesh(temp_mesh)
        
        # Extraer listas planas para la transmisión
        vertices = []
        for v in temp_mesh.vertices:
            vertices.extend([v.co.x, v.co.y, v.co.z])
            
        indices = []
        for poly in temp_mesh.polygons:
            indices.extend(poly.vertices)

        normals = []
        for v in temp_mesh.vertices:
            normals.extend([v.normal.x, v.normal.y, v.normal.z])

        uvs = []
        if temp_mesh.uv_layers.active:
            uv_layer = temp_mesh.uv_layers.active.data
            uvs = [0.0] * (len(temp_mesh.vertices) * 2)
            for loop in temp_mesh.loops:
                v_idx = loop.vertex_index
                uvs[v_idx * 2] = uv_layer[loop.index].uv.x
                uvs[v_idx * 2 + 1] = uv_layer[loop.index].uv.y

        # Liberar mallas de renderizado auxiliares
        temp_bm.free()
        bpy.data.meshes.remove(temp_mesh)

        return {
            "status": "ok",
            "mesh_name": obj.name,
            "vertices": vertices,
            "indices": indices,
            "normals": normals,
            "uvs": uvs,
            "faces_count": len(bm.faces),
            "selection": {
                "vertices": selected_v,
                "edges": selected_e,
                "faces": selected_f
            }
        }
    except Exception as e:
        traceback.print_exc()
        return {"status": "error", "message": str(e)}

def start_server():
    setup_initial_mesh()
    write_telemetry("listening")
    server_socket = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    server_socket.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
    server_socket.bind((HOST, PORT))
    server_socket.listen(1)
    print(f"Servidor Blender headless escuchando en {HOST}:{PORT}...")

    try:
        while True:
            conn, addr = server_socket.accept()
            print(f"Conexión recibida de: {addr}")
            write_telemetry("client_connected")
            try:
                while True:
                    # Leer cabecera de tamaño (4 bytes)
                    size_data = conn.recv(4)
                    if not size_data:
                        break
                    size = struct.unpack('!I', size_data)[0]

                    # Leer cuerpo
                    data = b''
                    while len(data) < size:
                        packet = conn.recv(size - len(data))
                        if not packet:
                            break
                        data += packet

                    if len(data) < size:
                        break

                    req = json.loads(data.decode('utf-8'))
                    if req.get("command") == "edit_op":
                        res = apply_operator(req["op_type"], req["params"])
                        if res.get("status") == "ok":
                            write_telemetry(
                                status="connected",
                                last_sync=datetime.now(),
                                mesh_name=res.get("mesh_name"),
                                vertices_count=len(res.get("vertices")) // 3,
                                indices_count=len(res.get("indices")),
                                faces_count=res.get("faces_count"),
                                last_op=req["op_type"]
                            )
                    else:
                        res = {"status": "error", "message": "Unknown command"}

                    # Retornar payload serializado con su cabecera de tamaño
                    res_bytes = json.dumps(res).encode('utf-8')
                    header = struct.pack('!I', len(res_bytes))
                    conn.sendall(header + res_bytes)
            except Exception as e:
                print(f"Error procesando conexión: {e}")
            finally:
                conn.close()
                print("Conexión con el cliente cerrada.")
                write_telemetry("listening")
    except KeyboardInterrupt:
        print("Cerrando servidor Blender...")
    finally:
        server_socket.close()

if __name__ == '__main__':
    start_server()
