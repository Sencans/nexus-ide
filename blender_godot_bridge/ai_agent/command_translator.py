import json
import sys

def translate_prompt_to_json(prompt: str) -> str:
    """
    Traduce comandos en lenguaje natural estructurado a formato JSON de nuestro protocolo.
    Ejemplo de inyección simple. En un sistema real esto interactúa con una API LLM o parser regex.
    """
    prompt = prompt.lower().strip()
    
    if "extruye" in prompt or "extrude" in prompt:
        # Analizar índice de cara y cantidad
        # Ej: "extruye la cara 4 por 1.5" o "extrude face 4 amount 1.5"
        words = prompt.split()
        face_idx = 0
        amount = 1.0
        for i, word in enumerate(words):
            if word in ["cara", "face"] and i + 1 < len(words):
                try:
                    face_idx = int(words[i+1])
                except ValueError: pass
            if word in ["por", "amount", "distancia"] and i + 1 < len(words):
                try:
                    amount = float(words[i+1])
                except ValueError: pass
        return json.dumps({
            "command": "edit_op",
            "op_type": "extrude",
            "params": {"face_index": face_idx, "amount": amount}
        })
        
    elif "subdivide" in prompt:
        return json.dumps({
            "command": "edit_op",
            "op_type": "subdivide",
            "params": {}
        })
        
    elif "mueve vertice" in prompt or "modify vertex" in prompt:
        # Ej: "mueve vertice 2 a 1.0 2.0 0.5"
        words = prompt.split()
        v_idx = 0
        pos = [0.0, 0.0, 0.0]
        for i, word in enumerate(words):
            if word in ["vertice", "vertex"] and i + 1 < len(words):
                try: v_idx = int(words[i+1])
                except ValueError: pass
            if word in ["a", "pos", "to"] and i + 3 < len(words):
                try:
                    pos = [float(words[i+1]), float(words[i+2]), float(words[i+3])]
                except ValueError: pass
        return json.dumps({
            "command": "edit_op",
            "op_type": "modify_vertex",
            "params": {"vertex_index": v_idx, "position": pos}
        })
        
    elif "reiniciar" in prompt or "reset" in prompt or "crear cubo" in prompt:
        return json.dumps({
            "command": "edit_op",
            "op_type": "create_mesh",
            "params": {"shape": "cube"}
        })
        
    else:
        return json.dumps({
            "status": "error",
            "message": f"No se pudo traducir el prompt: '{prompt}'"
        })

if __name__ == "__main__":
    if len(sys.argv) > 1:
        user_prompt = " ".join(sys.argv[1:])
        print(translate_prompt_to_json(user_prompt))
    else:
        # Ejemplo por defecto
        print(translate_prompt_to_json("extruye la cara 0 por 2.5"))
