# image_to_3d.py - Conversor de Imagen a Modelo 3D en Blender
import bpy
import sys
import os
import argparse

def main():
    # Obtener argumentos pasados después de '--'
    argv = sys.argv
    if "--" in argv:
        args = argv[argv.index("--") + 1:]
    else:
        args = []

    parser = argparse.ArgumentParser(description="Convierte imágenes a modelo 3D en Blender")
    parser.add_argument("--images", required=True, help="Rutas de las imágenes separadas por comas")
    parser.add_argument("--output", required=True, help="Ruta del archivo GLB de salida")
    parser.add_argument("--height", type=float, default=0.5, help="Factor de escala para el relieve")
    
    parsed_args = parser.parse_args(args)
    
    image_paths = [p.strip() for p in parsed_args.images.split(",") if p.strip()]
    output_path = parsed_args.output
    height_scale = parsed_args.height

    print(f"Iniciando conversión. Imágenes: {image_paths}, Salida: {output_path}, Relieve: {height_scale}")

    # Limpiar escena inicial
    bpy.ops.wm.read_factory_settings(use_empty=True)

    if not image_paths:
        print("Error: No se especificaron imágenes.")
        return

    # Caso 1: Una sola imagen (Displazamiento de plano simple)
    if len(image_paths) == 1:
        img_path = image_paths[0]
        if not os.path.exists(img_path):
            print(f"Error: No existe el archivo {img_path}")
            return

        # Crear rejilla
        bpy.ops.mesh.primitive_grid_add(x_subdivisions=150, y_subdivisions=150, size=2)
        grid = bpy.context.active_object
        grid.name = "DisplacedMesh"

        # Cargar imagen y textura
        img = bpy.data.images.load(img_path)
        tex = bpy.data.textures.new("DisplaceTex", type='IMAGE')
        tex.image = img

        # Modificador de desplazamiento
        displace_mod = grid.modifiers.new(name="Displace", type='DISPLACE')
        displace_mod.texture = tex
        displace_mod.strength = height_scale
        displace_mod.direction = 'Z'

        # Material con textura
        mat = bpy.data.materials.new(name="MaterialDisplace")
        mat.use_nodes = True
        nodes = mat.node_tree.nodes
        links = mat.node_tree.links
        
        bsdf = nodes.get("Principled BSDF")
        tex_node = nodes.new("ShaderNodeTexImage")
        tex_node.image = img
        
        links.new(tex_node.outputs["Color"], bsdf.inputs["Base Color"])
        grid.data.materials.append(mat)

        # Aplicar el modificador
        bpy.ops.object.modifier_apply(modifier="Displace")

    # Caso 2: Múltiples imágenes (ej. Frontal y Lateral) - Intersección Booleana
    else:
        # Cargar imágenes
        img1_path = image_paths[0]
        img2_path = image_paths[1]

        if not (os.path.exists(img1_path) and os.path.exists(img2_path)):
            print("Error: Una de las imágenes de entrada no existe.")
            return

        img1 = bpy.data.images.load(img1_path)
        img2 = bpy.data.images.load(img2_path)

        # 1. Crear Primer Modelo (Frontal)
        bpy.ops.mesh.primitive_grid_add(x_subdivisions=120, y_subdivisions=120, size=2)
        front_grid = bpy.context.active_object
        front_grid.name = "FrontMesh"

        tex1 = bpy.data.textures.new("FrontTex", type='IMAGE')
        tex1.image = img1
        disp1 = front_grid.modifiers.new(name="DisplaceFront", type='DISPLACE')
        disp1.texture = tex1
        disp1.strength = height_scale
        bpy.ops.object.modifier_apply(modifier="DisplaceFront")

        # Dar volumen/extrusión al modelo frontal (Solidify)
        solidify1 = front_grid.modifiers.new(name="SolidifyFront", type='SOLIDIFY')
        solidify1.thickness = 2.0
        solidify1.offset = 0.0
        bpy.ops.object.modifier_apply(modifier="SolidifyFront")

        # 2. Crear Segundo Modelo (Lateral, rotado 90 grados en Z)
        bpy.ops.mesh.primitive_grid_add(x_subdivisions=120, y_subdivisions=120, size=2)
        side_grid = bpy.context.active_object
        side_grid.name = "SideMesh"
        
        # Rotar para alinear lateralmente
        side_grid.rotation_euler[1] = 1.5708 # Rotar 90 grados en Y para mirar de lado
        side_grid.rotation_euler[2] = 1.5708 # Rotar 90 grados en Z
        
        tex2 = bpy.data.textures.new("SideTex", type='IMAGE')
        tex2.image = img2
        disp2 = side_grid.modifiers.new(name="DisplaceSide", type='DISPLACE')
        disp2.texture = tex2
        disp2.strength = height_scale
        bpy.ops.object.modifier_apply(modifier="DisplaceSide")

        # Extruir modelo lateral
        solidify2 = side_grid.modifiers.new(name="SolidifySide", type='SOLIDIFY')
        solidify2.thickness = 2.0
        solidify2.offset = 0.0
        bpy.ops.object.modifier_apply(modifier="SolidifySide")

        # 3. Intersección Booleana
        bool_mod = front_grid.modifiers.new(name="BooleanIntersection", type='BOOLEAN')
        bool_mod.operation = 'INTERSECT'
        bool_mod.object = side_grid
        bpy.ops.object.modifier_apply(modifier="BooleanIntersection")

        # Borrar el objeto lateral secundario ya que fue intersectado
        bpy.data.objects.remove(side_grid, do_unlink=True)

        # Aplicar material frontal
        mat = bpy.data.materials.new(name="MaterialFront")
        mat.use_nodes = True
        bsdf = mat.node_tree.nodes.get("Principled BSDF")
        tex_node = mat.node_tree.nodes.new("ShaderNodeTexImage")
        tex_node.image = img1
        mat.node_tree.links.new(tex_node.outputs["Color"], bsdf.inputs["Base Color"])
        front_grid.data.materials.append(mat)

    # Exportar a GLB
    bpy.ops.export_scene.gltf(filepath=output_path, export_format='GLB')
    print(f"Modelo exportado correctamente a {output_path}")

if __name__ == "__main__":
    main()
