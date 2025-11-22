from flask import Blueprint, jsonify, request
from services.data_manager import DataManager

api_bp = Blueprint('api', __name__)
data_manager = DataManager()

@api_bp.route('/health', methods=['GET'])
def health_check():
    return jsonify({'status': 'ok', 'message': 'Lazy DM Vault API is running'})

# --- Campaign Routes ---

@api_bp.route('/campaigns', methods=['GET'])
def list_campaigns():
    campaigns = data_manager.list_campaigns()
    return jsonify(campaigns)

@api_bp.route('/campaigns', methods=['POST'])
def create_campaign():
    data = request.json
    campaign = data_manager.create_campaign(data)
    return jsonify(campaign), 201

@api_bp.route('/campaigns/<campaign_id>', methods=['GET'])
def get_campaign(campaign_id):
    campaign = data_manager.get_campaign(campaign_id)
    if not campaign:
        return jsonify({'error': 'Campaign not found'}), 404
    return jsonify(campaign)

@api_bp.route('/campaigns/<campaign_id>', methods=['PUT'])
def update_campaign(campaign_id):
    data = request.json
    campaign = data_manager.update_campaign(campaign_id, data)
    if not campaign:
        return jsonify({'error': 'Campaign not found'}), 404
    return jsonify(campaign)

# --- Vault Routes ---

@api_bp.route('/campaigns/<campaign_id>/vault', methods=['GET'])
def get_vault_items(campaign_id):
    type_filter = request.args.get('type')
    items = data_manager.get_vault_items(campaign_id, type_filter)
    return jsonify(items)

@api_bp.route('/campaigns/<campaign_id>/vault', methods=['POST'])
def create_vault_item(campaign_id):
    data = request.json
    item = data_manager.create_vault_item(campaign_id, data)
    return jsonify(item), 201

@api_bp.route('/campaigns/<campaign_id>/vault/<item_id>', methods=['PUT'])
def update_vault_item(campaign_id, item_id):
    data = request.json
    item = data_manager.update_vault_item(campaign_id, item_id, data)
    if not item:
        return jsonify({'error': 'Item not found'}), 404
    return jsonify(item)

# --- Session Routes ---

@api_bp.route('/campaigns/<campaign_id>/sessions', methods=['GET'])
def get_sessions(campaign_id):
    sessions = data_manager.get_sessions(campaign_id)
    return jsonify(sessions)

@api_bp.route('/campaigns/<campaign_id>/sessions', methods=['POST'])
def create_session(campaign_id):
    session = data_manager.create_session(campaign_id)
    return jsonify(session), 201

@api_bp.route('/campaigns/<campaign_id>/sessions/<session_id>', methods=['PUT'])
def update_session(campaign_id, session_id):
    data = request.json
    session = data_manager.update_session(campaign_id, session_id, data)
    if not session:
        return jsonify({'error': 'Session not found'}), 404
    return jsonify(session)

@api_bp.route('/campaigns/<campaign_id>/sessions/<session_id>/finalize', methods=['POST'])
def finalize_session(campaign_id, session_id):
    # Placeholder for finalize logic
    # data_manager.finalize_session(campaign_id, session_id)
    return jsonify({'status': 'finalized'}), 200
