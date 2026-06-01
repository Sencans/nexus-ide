#include "geometry_bridge_3d.h"
#include <godot_cpp/core/class_db.hpp>
#include <godot_cpp/classes/placeholder_mesh.hpp>
#include <godot_cpp/classes/json.hpp>

using namespace godot;

void GeometryBridge3D::_bind_methods() {
    ClassDB::bind_method(D_METHOD("connect_to_blender", "host", "port"), &GeometryBridge3D::connect_to_blender);
    ClassDB::bind_method(D_METHOD("disconnect_from_blender"), &GeometryBridge3D::disconnect_from_blender);
    ClassDB::bind_method(D_METHOD("send_edit_command", "op_type", "params"), &GeometryBridge3D::send_edit_command);
    ClassDB::bind_method(D_METHOD("get_selected_vertices"), &GeometryBridge3D::get_selected_vertices);
    ClassDB::bind_method(D_METHOD("get_selected_edges"), &GeometryBridge3D::get_selected_edges);
    ClassDB::bind_method(D_METHOD("get_selected_faces"), &GeometryBridge3D::get_selected_faces);
    ClassDB::bind_method(D_METHOD("_network_loop"), &GeometryBridge3D::_network_loop);
}

GeometryBridge3D::GeometryBridge3D() {
    dynamic_mesh.instantiate();
    mesh_mutex.instantiate();
    network_thread.instantiate();
}

GeometryBridge3D::~GeometryBridge3D() {
    disconnect_from_blender();
}

void GeometryBridge3D::_ready() {
    set_mesh(dynamic_mesh);
}

void GeometryBridge3D::_process(double delta) {
    mesh_mutex->lock();
    if (mesh_dirty) {
        rebuild_mesh();
        mesh_dirty = false;
    }
    mesh_mutex->unlock();
}

bool GeometryBridge3D::connect_to_blender(String host, int port) {
    server_host = host;
    server_port = port;
    if (tcp_client.connect_to(server_host.utf8().get_data(), server_port)) {
        is_thread_running = true;
        network_thread->start(Callable(this, "_network_loop"));
        UtilityFunctions::print("[Godot GeometryBridge] Conectado a Blender en ", host, ":", port);
        return true;
    }
    UtilityFunctions::printerr("[Godot GeometryBridge] Error al conectar a Blender.");
    return false;
}

void GeometryBridge3D::disconnect_from_blender() {
    is_thread_running = false;
    tcp_client.disconnect();
    if (network_thread->is_started()) {
        network_thread->wait_to_finish();
    }
}

void GeometryBridge3D::send_edit_command(String op_type, Dictionary params) {
    if (!tcp_client.is_connected()) return;

    Dictionary payload;
    payload["command"] = "edit_op";
    payload["op_type"] = op_type;
    payload["params"] = params;

    String json_str = JSON::stringify(payload);
    tcp_client.send_data(json_str.utf8().get_data());
}

void GeometryBridge3D::_network_loop() {
    while (is_thread_running) {
        std::string raw_response;
        if (tcp_client.receive_data(raw_response)) {
            String json_str = String::utf8(raw_response.c_str());
            Ref<JSON> json;
            json.instantiate();
            if (json->parse(json_str) == OK) {
                Dictionary res = json->get_data();
                if (res.has("status") && res["status"] == "ok") {
                    mesh_mutex->lock();

                    // Carga de arrays geométricos de retorno
                    Array raw_verts = res["vertices"];
                    Array raw_indices = res["indices"];
                    Array raw_normals = res["normals"];
                    Array raw_uvs = res["uvs"];

                    vertices.resize(raw_verts.size() / 3);
                    for (int i = 0; i < vertices.size(); i++) {
                        vertices[i] = Vector3(raw_verts[i*3], raw_verts[i*3+1], raw_verts[i*3+2]);
                    }

                    indices.resize(raw_indices.size());
                    for (int i = 0; i < indices.size(); i++) {
                        indices[i] = raw_indices[i];
                    }

                    normals.resize(raw_normals.size() / 3);
                    for (int i = 0; i < normals.size(); i++) {
                        normals[i] = Vector3(raw_normals[i*3], raw_normals[i*3+1], raw_normals[i*3+2]);
                    }

                    if (raw_uvs.size() > 0) {
                        uvs.resize(raw_uvs.size() / 2);
                        for (int i = 0; i < uvs.size(); i++) {
                            uvs[i] = Vector2(raw_uvs[i*2], raw_uvs[i*2+1]);
                        }
                    }

                    // Actualizar índices de selección
                    Dictionary selection = res["selection"];
                    selected_vertices = selection["vertices"];
                    selected_edges = selection["edges"];
                    selected_faces = selection["faces"];

                    mesh_dirty = true;
                    mesh_mutex->unlock();
                }
            }
        } else {
            // Error de conexión o desconexión
            is_thread_running = false;
        }
    }
}

void GeometryBridge3D::rebuild_mesh() {
    dynamic_mesh->clear_surfaces();

    if (vertices.size() == 0 || indices.size() == 0) return;

    Array mesh_arrays;
    mesh_arrays.resize(Mesh::ARRAY_MAX);
    mesh_arrays[Mesh::ARRAY_VERTEX] = vertices;
    mesh_arrays[Mesh::ARRAY_INDEX] = indices;
    
    if (normals.size() == vertices.size()) {
        mesh_arrays[Mesh::ARRAY_NORMAL] = normals;
    }
    if (uvs.size() == vertices.size()) {
        mesh_arrays[Mesh::ARRAY_TEX_UV] = uvs;
    }

    dynamic_mesh->add_surface_from_arrays(Mesh::PRIMITIVE_TRIANGLES, mesh_arrays);
}
