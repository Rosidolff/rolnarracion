from flask import Blueprint, request, jsonify, current_app
from services.file_service import FileService
import os
import google.generativeai as genai

# Configuración de Gemini basada en datosv1.txt
API_KEY = "AIzaSyCHn26XJ5sX5QxnCCvHaTR4pc3m5dmOk3E"
genai.configure(api_key=API_KEY)

# Configuración del modelo
generation_config = {
  "temperature": 0.9,
  "top_p": 0.95,
  "top_k": 40,
  "max_output_tokens": 8192,
  "response_mime_type": "text/plain",
}

# Usamos el modelo listado en datosv1.txt
model = genai.GenerativeModel(
  model_name="gemini-2.0-flash",
  generation_config=generation_config,
)

ai_bp = Blueprint('ai', __name__)

def get_file_service():
    storage_path = current_app.config['DATA_STORAGE_PATH']
    return FileService(storage_path)

def load_campaign_context(service, campaign_id):
    """Carga metadatos y elementos del vault para contexto"""
    path = service._get_campaign_path(campaign_id)
    metadata = service.load_json(os.path.join(path, "metadata.json"))
    
    vault_path = os.path.join(path, "vault")
    vault_items = []
    if os.path.exists(vault_path):
        for f in os.listdir(vault_path):
            if f.endswith(".json"):
                item = service.load_json(os.path.join(vault_path, f))
                if item: vault_items.append(item)
                
    return metadata, vault_items

@ai_bp.route('/<campaign_id>/chat', methods=['POST'])
def chat_with_ai(campaign_id):
    try:
        data = request.get_json()
        user_query = data.get('query', '')
        context_mode = data.get('mode', 'vault') # 'vault' o 'session'
        session_id = data.get('sessionId')
        
        service = get_file_service()
        metadata, vault_items = load_campaign_context(service, campaign_id)
        
        if not metadata:
            return jsonify({"error": "Campaign not found"}), 404

        # Construcción del System Prompt
        characters = [i['content'] for i in vault_items if i['type'] == 'character']
        secrets = [i['content'] for i in vault_items if i['type'] == 'secret' and i['status'] == 'reserve']
        
        framework = metadata.get('framework', 'Mundo de fantasía genérico.')
        truths = metadata.get('truths', [])
        fronts = metadata.get('fronts', [])

        system_prompt = f"""
        Eres un Asistente de Dungeon Master experto en la metodología 'Return of the Lazy Dungeon Master'.
        Tu objetivo es ayudar al DM a improvisar narrativa, conectar tramas y profundizar en el mundo sin usar mecánicas de juego, números ni estadísticas.
        
        CONTEXTO DE CAMPAÑA:
        - Framework (Mundo): {framework}
        - 6 Verdades: {', '.join(filter(None, truths))}
        - Frentes (Amenazas): {str(fronts)}
        - Personajes Jugadores (PJs): {str(characters)}
        """

        if context_mode == 'session' and session_id:
            # Cargar sesión activa
            session_path = os.path.join(service._get_campaign_path(campaign_id), "sessions")
            session_file = next((f for f in os.listdir(session_path) if f.endswith(f"_{session_id}.json")), None)
            
            if session_file:
                session_data = service.load_json(os.path.join(session_path, session_file))
                linked_ids = session_data.get('linked_items', [])
                active_items = [i['content'] for i in vault_items if i['id'] in linked_ids]
                
                system_prompt += f"""
                
                ESTAMOS EN UNA SESIÓN ACTIVA.
                Elementos activos en la escena: {str(active_items)}
                Secretos NO revelados disponibles para usar: {str(secrets)}
                
                INSTRUCCIONES PARA SESIÓN:
                1. Si el usuario pregunta qué encuentra un personaje, busca en la lista de 'Secretos NO revelados' y mira si puedes conectar uno.
                2. Conecta los hallazgos con los 'Deseos' o 'Vínculos' de los Personajes Jugadores definidos arriba.
                3. No inventes cosas al azar si puedes usar un Secreto o un Frente existente para avanzar la trama.
                4. Sé conciso y evocador.
                """
        else:
            # Modo Vault (Preparación)
            item_names = [i['content'].get('name', i['content'].get('title')) for i in vault_items]
            system_prompt += f"""
            
            ESTAMOS EN MODO PREPARACIÓN (VAULT).
            Items existentes en el Vault: {str(item_names)}
            
            INSTRUCCIONES PARA VAULT:
            1. Ayuda a generar nuevos elementos (NPCs, Lugares, Secretos) que encajen con el Framework y los Frentes.
            2. Asegúrate de que lo nuevo tenga coherencia con lo ya existente.
            """

        # Llamada a Gemini
        chat_session = model.start_chat(
            history=[
                {"role": "user", "parts": [system_prompt]},
                {"role": "model", "parts": ["Entendido. Estoy listo para ayudarte como tu Asistente de DM Lazy. ¿Qué necesitas?"]}
            ]
        )
        
        response = chat_session.send_message(user_query)
        return jsonify({"response": response.text})
        
    except Exception as e:
        # Log del error en la terminal del backend
        print(f"Error CRÍTICO en IA: {str(e)}") 
        return jsonify({"error": str(e)}), 500