#ifndef GEOMETRY_BRIDGE_3D_H
#define GEOMETRY_BRIDGE_3D_H

#include <godot_cpp/classes/mesh_instance3d.hpp>
#include <godot_cpp/classes/array_mesh.hpp>
#include <godot_cpp/classes/thread.hpp>
#include <godot_cpp/classes/mutex.hpp>
#include <godot_cpp/variant/utility_functions.hpp>
#include "tcp_socket_client.h"

namespace godot {

class GeometryBridge3D : public MeshInstance3D {
    GDCLASS(GeometryBridge3D, MeshInstance3D)

private:
    TcpSocketClient tcp_client;
    String server_host = "127.0.0.1";
    int server_port = 5005;

    Ref<ArrayMesh> dynamic_mesh;
    Ref<Thread> network_thread;
    Ref<Mutex> mesh_mutex;
    bool is_thread_running = false;
    bool mesh_dirty = false;

    // Buffers geométricos recibidos para reconstrucción
    PackedVector3Array vertices;
    PackedInt32Array indices;
    PackedVector3Array normals;
    PackedVector2Array uvs;

    // Selección
    PackedInt32Array selected_vertices;
    PackedInt32Array selected_edges;
    PackedInt32Array selected_faces;

    void _network_loop();
    void rebuild_mesh();

protected:
    static void _bind_methods();

public:
    GeometryBridge3D();
    ~GeometryBridge3D();

    void _ready() override;
    void _process(double delta) override;

    // Métodos expuestos para la IA y scripts
    bool connect_to_blender(String host, int port);
    void disconnect_from_blender();
    void send_edit_command(String op_type, Dictionary params);

    // Getters de buffers de selección
    PackedInt32Array get_selected_vertices() const { return selected_vertices; }
    PackedInt32Array get_selected_edges() const { return selected_edges; }
    PackedInt32Array get_selected_faces() const { return selected_faces; }
};

} // namespace godot

#endif // GEOMETRY_BRIDGE_3D_H
