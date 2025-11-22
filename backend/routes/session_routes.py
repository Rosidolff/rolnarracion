from flask import Blueprint, request, jsonify, current_app
from services.file_service import FileService
from services.id_service import generate_id
import os
from datetime import datetime

session_bp = Blueprint('sessions', __name__)

def get_file_service():
    storage_path = current_app.config['DATA_STORAGE_PATH']
    return FileService(storage_path)

@session_bp.route('/<campaign_id>/sessions', methods=['GET'])
def list_sessions(campaign_id):
    service = get_file_service()
    campaign_path = service._get_campaign_path(campaign_id)
    sessions_path = os.path.join(campaign_path, "sessions")
    
    sessions = []
    if os.path.exists(sessions_path):
        for filename in os.listdir(sessions_path):
            if filename.endswith(".json"):
                session = service.load_json(os.path.join(sessions_path, filename))
                if session:
                    sessions.append(session)
    
    # Sort by number
    sessions.sort(key=lambda x: x.get('number', 0))
    return jsonify(sessions)

@session_bp.route('/<campaign_id>/sessions', methods=['POST'])
def create_session(campaign_id):
    service = get_file_service()
    campaign_path = service._get_campaign_path(campaign_id)
    sessions_path = os.path.join(campaign_path, "sessions")
    
    # Calculate next number
    existing_sessions = []
    if os.path.exists(sessions_path):
        for filename in os.listdir(sessions_path):
            if filename.endswith(".json"):
                s = service.load_json(os.path.join(sessions_path, filename))
                if s: existing_sessions.append(s)
    
    next_number = 1
    if existing_sessions:
        next_number = max([s.get('number', 0) for s in existing_sessions]) + 1
        
    session_id = generate_id()
    session = {
        "id": session_id,
        "number": next_number,
        "date": datetime.now().isoformat(),
        "strong_start": "",
        "recap": "",
        "notes": "",
        "linked_items": [],
        "status": "planned"
    }
    
    file_path = os.path.join(sessions_path, f"session_{next_number:02d}_{session_id}.json")
    service.save_json(file_path, session)
    
    return jsonify(session), 201

@session_bp.route('/<campaign_id>/sessions/<session_id>', methods=['GET'])
def get_session(campaign_id, session_id):
    service = get_file_service()
    campaign_path = service._get_campaign_path(campaign_id)
    sessions_path = os.path.join(campaign_path, "sessions")
    
    target_file = None
    for filename in os.listdir(sessions_path):
        if filename.endswith(f"_{session_id}.json"):
            target_file = filename
            break
            
    if not target_file:
        return jsonify({"error": "Session not found"}), 404
        
    session = service.load_json(os.path.join(sessions_path, target_file))
    return jsonify(session)

@session_bp.route('/<campaign_id>/sessions/<session_id>', methods=['PUT'])
def update_session(campaign_id, session_id):
    data = request.get_json()
    service = get_file_service()
    campaign_path = service._get_campaign_path(campaign_id)
    sessions_path = os.path.join(campaign_path, "sessions")
    
    target_file = None
    for filename in os.listdir(sessions_path):
        if filename.endswith(f"_{session_id}.json"):
            target_file = filename
            break
            
    if not target_file:
        return jsonify({"error": "Session not found"}), 404
        
    file_path = os.path.join(sessions_path, target_file)
    current_session = service.load_json(file_path)
    
    # Update fields
    fields = ['strong_start', 'recap', 'notes', 'linked_items', 'status']
    for field in fields:
        if field in data:
            current_session[field] = data[field]
            
    service.save_json(file_path, current_session)
    return jsonify(current_session)
