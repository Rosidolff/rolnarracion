from flask import Blueprint, request, jsonify, current_app
from services.file_service import FileService
from services.id_service import generate_id
import os

campaign_bp = Blueprint('campaigns', __name__)

def get_file_service():
    storage_path = current_app.config['DATA_STORAGE_PATH']
    return FileService(storage_path)

@campaign_bp.route('/', methods=['GET'])
def list_campaigns():
    service = get_file_service()
    campaigns = service.list_campaigns()
    return jsonify(campaigns)

@campaign_bp.route('/', methods=['POST'])
def create_campaign():
    data = request.get_json()
    if not data or 'title' not in data:
        return jsonify({"error": "Title is required"}), 400

    service = get_file_service()
    campaign_id = generate_id()
    
    # Create structure
    base_path = service.create_campaign_structure(campaign_id)
    
    # Create metadata
    metadata = {
        "id": campaign_id,
        "title": data['title'],
        "elevator_pitch": data.get('elevator_pitch', ''),
        "truths": data.get('truths', []),
        "fronts": data.get('fronts', []),
        "safety_tools": data.get('safety_tools', '')
    }
    
    service.save_json(os.path.join(base_path, "metadata.json"), metadata)
    
    return jsonify(metadata), 201

@campaign_bp.route('/<campaign_id>', methods=['GET'])
def get_campaign(campaign_id):
    service = get_file_service()
    path = service._get_campaign_path(campaign_id)
    metadata = service.load_json(os.path.join(path, "metadata.json"))
    
    if not metadata:
        return jsonify({"error": "Campaign not found"}), 404
        
    return jsonify(metadata)

@campaign_bp.route('/<campaign_id>', methods=['PUT'])
def update_campaign(campaign_id):
    data = request.get_json()
    service = get_file_service()
    path = service._get_campaign_path(campaign_id)
    metadata_path = os.path.join(path, "metadata.json")
    
    current_metadata = service.load_json(metadata_path)
    if not current_metadata:
        return jsonify({"error": "Campaign not found"}), 404
        
    # Update fields
    fields = ['title', 'elevator_pitch', 'truths', 'fronts', 'safety_tools']
    for field in fields:
        if field in data:
            current_metadata[field] = data[field]
            
    service.save_json(metadata_path, current_metadata)
    return jsonify(current_metadata)

@campaign_bp.route('/<campaign_id>', methods=['DELETE'])
def delete_campaign(campaign_id):
    service = get_file_service()
    success = service.delete_campaign(campaign_id)
    
    if not success:
        return jsonify({"error": "Campaign not found"}), 404
        
    return jsonify({"message": "Campaign deleted"})
