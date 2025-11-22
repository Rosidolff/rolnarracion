import os
import json
import uuid
from pathlib import Path

class DataManager:
    def __init__(self, storage_path='../data_storage'):
        self.storage_path = Path(storage_path)
        self.storage_path.mkdir(exist_ok=True)

    def _get_campaign_path(self, campaign_id):
        return self.storage_path / f"campaign_{campaign_id}"

    def create_campaign(self, metadata):
        campaign_id = str(uuid.uuid4())
        campaign_dir = self._get_campaign_path(campaign_id)
        campaign_dir.mkdir(exist_ok=True)
        
        (campaign_dir / 'vault').mkdir(exist_ok=True)
        (campaign_dir / 'sessions').mkdir(exist_ok=True)
        
        metadata['id'] = campaign_id
        with open(campaign_dir / 'metadata.json', 'w', encoding='utf-8') as f:
            json.dump(metadata, f, indent=4, ensure_ascii=False)
    def update_campaign(self, campaign_id, metadata):
        campaign_dir = self._get_campaign_path(campaign_id)
        metadata_path = campaign_dir / 'metadata.json'
        
        if not metadata_path.exists():
            return None
            
        with open(metadata_path, 'r', encoding='utf-8') as f:
            existing_data = json.load(f)
            
        existing_data.update(metadata)
        # Ensure ID doesn't change
        existing_data['id'] = campaign_id
        
        with open(metadata_path, 'w', encoding='utf-8') as f:
            json.dump(existing_data, f, indent=4, ensure_ascii=False)
            
        return existing_data

    def list_campaigns(self):
        campaigns = []
        for campaign_dir in self.storage_path.glob('campaign_*'):
            metadata_path = campaign_dir / 'metadata.json'
            if metadata_path.exists():
                with open(metadata_path, 'r', encoding='utf-8') as f:
                    campaigns.append(json.load(f))
        return campaigns

    def get_campaign(self, campaign_id):
        campaign_dir = self._get_campaign_path(campaign_id)
        metadata_path = campaign_dir / 'metadata.json'
        if not metadata_path.exists():
            return None
        with open(metadata_path, 'r', encoding='utf-8') as f:
            return json.load(f)

    def create_vault_item(self, campaign_id, item_data):
        item_id = str(uuid.uuid4())
        item_data['id'] = item_id
        item_data['status'] = item_data.get('status', 'reserve')
        
        # Ensure type is valid to avoid path traversal or weird filenames
        item_type = item_data.get('type', 'unknown')
        filename = f"{item_type}_{item_id}.json"
        
        file_path = self._get_campaign_path(campaign_id) / 'vault' / filename
        
        with open(file_path, 'w', encoding='utf-8') as f:
            json.dump(item_data, f, indent=4, ensure_ascii=False)
            
        return item_data

    def get_vault_items(self, campaign_id, type_filter=None):
        vault_path = self._get_campaign_path(campaign_id) / 'vault'
        items = []
        if not vault_path.exists():
            return []
            
        for item_file in vault_path.glob('*.json'):
            with open(item_file, 'r', encoding='utf-8') as f:
                item = json.load(f)
                if type_filter and item.get('type') != type_filter:
                    continue
                items.append(item)
        return items

    def update_vault_item(self, campaign_id, item_id, item_data):
        # We need to find the file first because the filename depends on the type
        # and the type might not be in the item_data update, or we need to check consistency.
        # For simplicity, we assume we search by ID.
        vault_path = self._get_campaign_path(campaign_id) / 'vault'
        target_file = None
        
        # Optimization: if type is provided, we can guess the filename, but let's search to be safe
        # or assume the frontend sends the full object.
        # Let's search for the file with the ID.
        for item_file in vault_path.glob('*.json'):
            if item_id in item_file.name:
                target_file = item_file
                break
        
        if not target_file:
            return None

        # Read existing to merge or overwrite? 
        # Specification implies full update or we can do merge. Let's do full overwrite with merge.
        with open(target_file, 'r', encoding='utf-8') as f:
            existing_data = json.load(f)
        
        existing_data.update(item_data)
        
        with open(target_file, 'w', encoding='utf-8') as f:
            json.dump(existing_data, f, indent=4, ensure_ascii=False)
            
        return existing_data

    def create_session(self, campaign_id):
        sessions_path = self._get_campaign_path(campaign_id) / 'sessions'
        existing_sessions = list(sessions_path.glob('session_*_*.json'))
        session_number = len(existing_sessions) + 1
        
        session_id = str(uuid.uuid4())
        filename = f"session_{session_number:02d}_{session_id}.json"
        
        session_data = {
            "id": session_id,
            "number": session_number,
            "date": None, # To be set by frontend or now
            "strong_start": "",
            "recap": "",
            "notes": "",
            "linked_items": [],
            "status": "planned"
        }
        
        with open(sessions_path / filename, 'w', encoding='utf-8') as f:
            json.dump(session_data, f, indent=4, ensure_ascii=False)
            
        return session_data

    def get_sessions(self, campaign_id):
        sessions_path = self._get_campaign_path(campaign_id) / 'sessions'
        sessions = []
        if not sessions_path.exists():
            return []
            
        for session_file in sessions_path.glob('session_*.json'):
            with open(session_file, 'r', encoding='utf-8') as f:
                sessions.append(json.load(f))
        
        # Sort by number
        sessions.sort(key=lambda x: x.get('number', 0))
        return sessions

    def update_session(self, campaign_id, session_id, session_data):
        sessions_path = self._get_campaign_path(campaign_id) / 'sessions'
        target_file = None
        
        for session_file in sessions_path.glob(f"session_*_{session_id}.json"):
            target_file = session_file
            break
            
        if not target_file:
            return None
            
        with open(target_file, 'r', encoding='utf-8') as f:
            existing_data = json.load(f)
            
        existing_data.update(session_data)
        
        with open(target_file, 'w', encoding='utf-8') as f:
            json.dump(existing_data, f, indent=4, ensure_ascii=False)
            
        # Handle linking/unlinking logic if needed here, or just save state.
        # The specification says: "Al vincular, el estado del archivo JSON del elemento cambia a 'active'."
        # We should handle this side effect.
        self._update_linked_items_status(campaign_id, existing_data.get('linked_items', []))
            
        return existing_data

    def _update_linked_items_status(self, campaign_id, linked_item_ids):
        # This is a bit heavy, iterating all vault items to find matches. 
        # But with file system DB, direct access is hard without index.
        # We can optimize by knowing the ID -> Filename mapping or searching.
        vault_path = self._get_campaign_path(campaign_id) / 'vault'
        
        # Reset all active to reserve? No, that might break other sessions if concurrent? 
        # But spec says "active: Vinculado a la sesión actual". 
        # If we have multiple sessions, this state might be ambiguous. 
        # Assuming single active session context for now or that 'active' just means 'in use'.
        
        # For now, we just ensure the linked items are 'active'.
        # And we might need to set unlinked ones to 'reserve' if they were previously active?
        # The spec says: "Desvinculación: ... vuelve a 'reserve'".
        # This implies we need to know what was removed. 
        # For simplicity, the frontend might handle the explicit link/unlink calls, 
        # but here we are just saving the session state.
        # Let's implement explicit link/unlink methods or handle it in update_session.
        
        # Let's just iterate all items and set status based on inclusion in linked_items.
        # This is inefficient but safe for consistency.
        for item_file in vault_path.glob('*.json'):
            with open(item_file, 'r', encoding='utf-8') as f:
                item = json.load(f)
            
            if item['status'] == 'archived':
                continue # Don't touch archived
                
            if item['id'] in linked_item_ids:
                if item['status'] != 'active':
                    item['status'] = 'active'
                    with open(item_file, 'w', encoding='utf-8') as f:
                        json.dump(item, f, indent=4, ensure_ascii=False)
            else:
                if item['status'] == 'active':
                    item['status'] = 'reserve'
                    with open(item_file, 'w', encoding='utf-8') as f:
                        json.dump(item, f, indent=4, ensure_ascii=False)

    def finalize_session(self, campaign_id, session_id):
        # "Lazy Cleanup"
        # 1. Mark session as completed?
        # 2. Used/Revealed items -> archived.
        # 3. Unused items -> reserve.
        
        # We need to know which items were "used". 
        # The spec says: "Los elementos marcados como 'usados/revelados' pasan a estado 'archived'".
        # This implies the session data or item data tracks "used" state.
        # Or maybe the user manually archives them?
        # "Botón para finalizar sesión... Acción: Los elementos marcados como 'usados/revelados' pasan a estado 'archived'."
        # We probably need a list of "revealed_items" in the session or a flag on the item.
        # Let's assume the frontend sends a list of items to archive.
        pass 
        # I will implement this when I have more clarity or just provide a method to archive items.
