extends GeometryBridge3D

func _ready():
	connect_blender()

func connect_blender():
	print("[Godot] Intentando conectar con el servidor de Blender (127.0.0.1:5005)...")
	if connect_to_blender("127.0.0.1", 5005):
		print("[Godot] Conexion exitosa con Blender. Solicitando malla inicial...")
		send_edit_command("create_mesh", {})
	else:
		print("[Godot] Fallo la conexion. Reintentando en 2 segundos...")
		await get_tree().create_timer(2.0).timeout
		connect_blender()
