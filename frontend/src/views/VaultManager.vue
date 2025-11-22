<script setup>
import { ref, onMounted, computed } from 'vue'
import { useRoute } from 'vue-router'
import { useVaultStore } from '../stores/vaultStore'
import { useSessionStore } from '../stores/sessionStore' // For "Send to Session"
import { marked } from 'marked'

const route = useRoute()
const vaultStore = useVaultStore()
const sessionStore = useSessionStore()
const campaignId = route.params.id

// Modal State
const showModal = ref(false)
const showSessionModal = ref(false) // For "Send to Session"
const isEditing = ref(false)
const currentItem = ref(null)
const itemToSend = ref(null) // Item selected to send

// Form State
const formType = ref('npc')
const formData = ref({})

const itemTypes = ['npc', 'scene', 'secret', 'location', 'monster', 'item']

onMounted(async () => {
  await vaultStore.fetchItems(campaignId)
  await sessionStore.fetchSessions(campaignId) // Pre-fetch sessions for the modal
})

// Group items by type
const itemsByType = computed(() => {
  const grouped = {}
  itemTypes.forEach(type => {
    grouped[type] = vaultStore.items.filter(i => i.type === type)
  })
  return grouped
})

const renderMarkdown = (text) => {
  return text ? marked(text) : ''
}

const scrollToCategory = (type) => {
  const el = document.getElementById(`category-${type}`)
  if (el) el.scrollIntoView({ behavior: 'smooth' })
}

const openCreateModal = (type = 'npc') => {
  isEditing.value = false
  currentItem.value = null
  formType.value = type
  resetForm(type)
  showModal.value = true
}

const openEditModal = (item) => {
  isEditing.value = true
  currentItem.value = item
  formType.value = item.type
  formData.value = JSON.parse(JSON.stringify(item.content))
  showModal.value = true
}

const openSendToSessionModal = (item) => {
  itemToSend.value = item
  showSessionModal.value = true
}

const sendToSession = async (sessionId) => {
  if (!itemToSend.value) return
  
  const session = sessionStore.sessions.find(s => s.id === sessionId)
  if (session) {
    const currentLinked = [...(session.linked_items || [])]
    if (!currentLinked.includes(itemToSend.value.id)) {
      currentLinked.push(itemToSend.value.id)
      await sessionStore.updateSession(campaignId, sessionId, { linked_items: currentLinked })
      alert(`Sent ${itemToSend.value.content.name || 'Item'} to Session ${session.number}`)
    } else {
      alert('Item already linked to this session.')
    }
  }
  showSessionModal.value = false
  itemToSend.value = null
}

const deleteItem = async (item) => {
  if (confirm(`Delete ${item.content.name || item.content.title || 'this item'}?`)) {
     // TODO: Implement delete in store
     console.log('Delete', item.id)
  }
}

const resetForm = (type) => {
  switch (type) {
    case 'npc': formData.value = { name: '', archetype: '', description: '', relationship: '' }; break;
    case 'scene': formData.value = { title: '', type: 'exploration', description: '' }; break;
    case 'secret': formData.value = { description: '' }; break;
    case 'location': formData.value = { name: '', description: '', aspects: ['', '', ''] }; break;
    case 'monster': formData.value = { name: '', description: '', stats: '' }; break;
    case 'item': formData.value = { name: '', description: '' }; break;
    default: formData.value = {};
  }
}

const saveItem = async () => {
  const itemPayload = {
    type: formType.value,
    content: formData.value,
    tags: []
  }

  if (isEditing.value && currentItem.value) {
    await vaultStore.updateItem(campaignId, currentItem.value.id, itemPayload)
  } else {
    await vaultStore.createItem(campaignId, itemPayload)
  }
  showModal.value = false
}
</script>

<template>
  <div class="p-6 h-full flex flex-col relative overflow-hidden">
    <div class="flex justify-between items-center mb-4 shrink-0">
      <h1 class="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-400">
        The Vault
      </h1>
      <!-- Navigation Anchors -->
      <div class="flex gap-2 overflow-x-auto">
        <button 
          v-for="type in itemTypes" 
          :key="type"
          @click="scrollToCategory(type)"
          class="text-xs bg-gray-800 hover:bg-gray-700 text-gray-300 px-3 py-1 rounded uppercase tracking-wider transition-colors border border-gray-700 whitespace-nowrap"
        >
          {{ type }}
        </button>
      </div>
    </div>

    <div class="space-y-8 pb-20 overflow-y-auto flex-1 pr-2">
      <div v-for="type in itemTypes" :key="type" :id="`category-${type}`">
        <div class="flex justify-between items-center mb-4 border-b border-gray-800 pb-2 sticky top-0 bg-gray-950/95 backdrop-blur z-10">
          <h2 class="text-xl font-bold text-gray-400 uppercase tracking-widest">
            {{ type }}s
          </h2>
          <button @click="openCreateModal(type)" class="text-xs text-purple-400 hover:text-purple-300 font-bold uppercase">+ Add {{ type }}</button>
        </div>
        
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          <div 
            v-for="item in itemsByType[type]" 
            :key="item.id"
            class="bg-gray-900/50 border border-gray-800 rounded-lg p-4 hover:border-purple-500/30 transition-all group relative flex flex-col gap-2"
          >
            <!-- Actions -->
            <div class="absolute top-2 right-2 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity bg-gray-900/80 rounded px-1">
              <button @click.stop="openSendToSessionModal(item)" class="text-gray-500 hover:text-blue-400" title="Send to Session"><i class="fas fa-share-square"></i></button>
              <button @click.stop="openEditModal(item)" class="text-gray-500 hover:text-purple-400" title="Edit"><i class="fas fa-edit"></i></button>
              <button @click.stop="deleteItem(item)" class="text-gray-500 hover:text-red-400" title="Delete"><i class="fas fa-trash"></i></button>
            </div>

            <!-- Content Rendering based on Type -->
            
            <!-- NPC -->
            <template v-if="type === 'npc'">
              <h3 class="font-bold text-purple-300 text-lg">{{ item.content.name }}</h3>
              <div class="text-xs text-gray-400 font-mono bg-gray-950/50 p-1 rounded self-start">{{ item.content.archetype }}</div>
              <div class="text-sm text-gray-300 italic border-l-2 border-purple-900 pl-2 my-1">{{ item.content.relationship }}</div>
              <div class="text-sm text-gray-500 leading-relaxed prose prose-invert prose-sm max-w-none" v-html="renderMarkdown(item.content.description)"></div>
            </template>

            <!-- Scene -->
            <template v-if="type === 'scene'">
              <h3 class="font-bold text-green-300 text-lg">{{ item.content.title }}</h3>
              <div class="text-xs text-gray-400 font-mono bg-gray-950/50 p-1 rounded self-start uppercase">{{ item.content.type }}</div>
              <div class="text-sm text-gray-500 leading-relaxed mt-1 prose prose-invert prose-sm max-w-none" v-html="renderMarkdown(item.content.description)"></div>
            </template>

            <!-- Secret -->
            <template v-if="type === 'secret'">
              <div class="text-yellow-300/80 italic text-lg font-serif leading-relaxed prose prose-invert prose-sm max-w-none" v-html="renderMarkdown(item.content.description)"></div>
            </template>

            <!-- Location -->
            <template v-if="type === 'location'">
              <h3 class="font-bold text-blue-300 text-lg">{{ item.content.name }}</h3>
              <div class="flex flex-wrap gap-1 my-1">
                <span v-for="(aspect, i) in item.content.aspects" :key="i" v-show="aspect" class="text-[10px] bg-blue-900/20 text-blue-400 px-2 py-0.5 rounded border border-blue-900/30">
                  {{ aspect }}
                </span>
              </div>
              <div class="text-sm text-gray-500 leading-relaxed prose prose-invert prose-sm max-w-none" v-html="renderMarkdown(item.content.description)"></div>
            </template>

            <!-- Monster -->
            <template v-if="type === 'monster'">
              <h3 class="font-bold text-red-300 text-lg">{{ item.content.name }}</h3>
              <div class="text-[10px] text-red-200/70 font-mono bg-red-900/10 p-2 rounded overflow-x-auto whitespace-pre-wrap prose prose-invert prose-sm max-w-none" v-html="renderMarkdown(item.content.stats)"></div>
              <div class="text-sm text-gray-500 leading-relaxed prose prose-invert prose-sm max-w-none" v-html="renderMarkdown(item.content.description)"></div>
            </template>

            <!-- Item -->
            <template v-if="type === 'item'">
              <h3 class="font-bold text-gray-300 text-lg">{{ item.content.name }}</h3>
              <div class="text-sm text-gray-500 leading-relaxed prose prose-invert prose-sm max-w-none" v-html="renderMarkdown(item.content.description)"></div>
            </template>

          </div>
          <div v-if="!itemsByType[type]?.length" class="col-span-full text-center text-gray-700 py-4 text-sm italic border border-dashed border-gray-800 rounded">
            No {{ type }}s yet.
          </div>
        </div>
      </div>
    </div>

    <!-- Create/Edit Modal -->
    <div v-if="showModal" class="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div class="bg-gray-900 w-full max-w-2xl rounded-2xl border border-gray-700 shadow-2xl flex flex-col max-h-[90vh]">
        <div class="p-6 border-b border-gray-800 flex justify-between items-center">
          <h2 class="text-xl font-bold text-white capitalize">
            {{ isEditing ? 'Edit' : 'Create' }} {{ formType }}
          </h2>
          <button @click="showModal = false" class="text-gray-500 hover:text-white">
            <i class="fas fa-times text-xl"></i>
          </button>
        </div>

        <div class="p-6 overflow-y-auto flex-1 space-y-4">
           <!-- Dynamic Forms -->
          <div v-if="formType === 'npc'" class="space-y-4">
            <input v-model="formData.name" placeholder="Name" class="w-full bg-gray-800 border border-gray-700 rounded p-3 text-white focus:border-purple-500 focus:outline-none">
            <input v-model="formData.archetype" placeholder="Archetype" class="w-full bg-gray-800 border border-gray-700 rounded p-3 text-white focus:border-purple-500 focus:outline-none">
            <input v-model="formData.relationship" placeholder="Relationship" class="w-full bg-gray-800 border border-gray-700 rounded p-3 text-white focus:border-purple-500 focus:outline-none">
            <textarea v-model="formData.description" placeholder="Description (Markdown)" class="w-full bg-gray-800 border border-gray-700 rounded p-3 text-white focus:border-purple-500 focus:outline-none h-32 font-mono"></textarea>
          </div>

          <div v-if="formType === 'scene'" class="space-y-4">
            <input v-model="formData.title" placeholder="Title" class="w-full bg-gray-800 border border-gray-700 rounded p-3 text-white focus:border-purple-500 focus:outline-none">
            <select v-model="formData.type" class="w-full bg-gray-800 border border-gray-700 rounded p-3 text-white focus:border-purple-500 focus:outline-none">
              <option value="exploration">Exploration</option>
              <option value="social">Social</option>
              <option value="combat">Combat</option>
            </select>
            <textarea v-model="formData.description" placeholder="Description (Markdown)" class="w-full bg-gray-800 border border-gray-700 rounded p-3 text-white focus:border-purple-500 focus:outline-none h-32 font-mono"></textarea>
          </div>

          <div v-if="formType === 'secret'" class="space-y-4">
            <textarea v-model="formData.description" placeholder="The Secret (Markdown)..." class="w-full bg-gray-800 border border-gray-700 rounded p-3 text-white focus:border-purple-500 focus:outline-none h-40 text-lg font-mono"></textarea>
          </div>

          <div v-if="formType === 'location'" class="space-y-4">
            <input v-model="formData.name" placeholder="Name" class="w-full bg-gray-800 border border-gray-700 rounded p-3 text-white focus:border-purple-500 focus:outline-none">
            <div class="space-y-2">
              <input v-for="(aspect, i) in formData.aspects" :key="i" v-model="formData.aspects[i]" :placeholder="`Aspect ${i+1}`" class="w-full bg-gray-800 border border-gray-700 rounded p-2 text-white focus:border-purple-500 focus:outline-none text-sm">
            </div>
            <textarea v-model="formData.description" placeholder="Description (Markdown)" class="w-full bg-gray-800 border border-gray-700 rounded p-3 text-white focus:border-purple-500 focus:outline-none h-24 font-mono"></textarea>
          </div>

          <div v-if="formType === 'monster'" class="space-y-4">
            <input v-model="formData.name" placeholder="Name" class="w-full bg-gray-800 border border-gray-700 rounded p-3 text-white focus:border-purple-500 focus:outline-none">
            <textarea v-model="formData.stats" placeholder="Stat Block (Markdown)" class="w-full bg-gray-800 border border-gray-700 rounded p-3 text-white focus:border-purple-500 focus:outline-none h-32 font-mono text-sm"></textarea>
            <textarea v-model="formData.description" placeholder="Description (Markdown)" class="w-full bg-gray-800 border border-gray-700 rounded p-3 text-white focus:border-purple-500 focus:outline-none h-24 font-mono"></textarea>
          </div>

          <div v-if="formType === 'item'" class="space-y-4">
            <input v-model="formData.name" placeholder="Name" class="w-full bg-gray-800 border border-gray-700 rounded p-3 text-white focus:border-purple-500 focus:outline-none">
            <textarea v-model="formData.description" placeholder="Description (Markdown)" class="w-full bg-gray-800 border border-gray-700 rounded p-3 text-white focus:border-purple-500 focus:outline-none h-32 font-mono"></textarea>
          </div>
        </div>

        <div class="p-6 border-t border-gray-800 flex justify-end gap-4">
          <button @click="showModal = false" class="px-4 py-2 rounded text-gray-400 hover:text-white transition-colors">Cancel</button>
          <button @click="saveItem" class="bg-purple-600 hover:bg-purple-700 text-white px-6 py-2 rounded transition-colors font-bold shadow-lg shadow-purple-900/20">
            Save
          </button>
        </div>
      </div>
    </div>

    <!-- Send to Session Modal -->
    <div v-if="showSessionModal" class="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div class="bg-gray-900 w-full max-w-md rounded-xl border border-gray-700 shadow-2xl flex flex-col">
        <div class="p-4 border-b border-gray-800 flex justify-between items-center">
          <h3 class="font-bold text-white">Send to Session</h3>
          <button @click="showSessionModal = false" class="text-gray-500 hover:text-white"><i class="fas fa-times"></i></button>
        </div>
        <div class="p-4 space-y-2">
          <button 
            v-for="session in sessionStore.sessions.filter(s => s.status !== 'completed')" 
            :key="session.id"
            @click="sendToSession(session.id)"
            class="w-full text-left p-3 rounded bg-gray-800 hover:bg-purple-900/30 border border-gray-700 hover:border-purple-500 transition-all flex justify-between items-center group"
          >
            <span>Session {{ session.number }}</span>
            <i class="fas fa-arrow-right text-gray-600 group-hover:text-purple-400"></i>
          </button>
          <div v-if="!sessionStore.sessions.filter(s => s.status !== 'completed').length" class="text-center text-gray-500 py-4">
            No active sessions found.
          </div>
        </div>
      </div>
    </div>

  </div>
</template>
