<script setup>
import { ref, onMounted, watch, computed } from 'vue'
import { useRoute } from 'vue-router'
import { useSessionStore } from '../stores/sessionStore'
import { useVaultStore } from '../stores/vaultStore'
import { marked } from 'marked'

const route = useRoute()
const sessionStore = useSessionStore()
const vaultStore = useVaultStore()
const campaignId = route.params.id

const selectedSessionId = ref(null)
const showLinkModal = ref(false)

// Local state for UI interactions
const expandedItems = ref([])
const usedItems = ref([]) 

onMounted(async () => {
  await sessionStore.fetchSessions(campaignId)
  await vaultStore.fetchItems(campaignId)
})

const currentSession = computed(() => sessionStore.currentSession)

// Group Active Items by Type
const activeItemsByType = computed(() => {
  if (!currentSession.value || !currentSession.value.linked_items) return {}
  
  const items = vaultStore.items.filter(i => currentSession.value.linked_items.includes(i.id))
  const grouped = {}
  
  // Define order
  const order = ['secret', 'scene', 'npc', 'monster', 'location', 'item']
  
  order.forEach(type => {
    grouped[type] = items.filter(i => i.type === type)
  })
  
  return grouped
})

const availableItems = computed(() => {
  if (!currentSession.value) return []
  const linked = currentSession.value.linked_items || []
  return vaultStore.items.filter(i => !linked.includes(i.id) && i.status !== 'archived')
})

const renderMarkdown = (text) => {
  return text ? marked(text) : ''
}

const toggleAccordion = (itemId) => {
  const index = expandedItems.value.indexOf(itemId)
  if (index > -1) {
    expandedItems.value.splice(index, 1)
  } else {
    expandedItems.value.push(itemId)
  }
}

const isExpanded = (itemId) => expandedItems.value.includes(itemId)

const toggleUsed = (itemId) => {
  const index = usedItems.value.indexOf(itemId)
  if (index > -1) {
    usedItems.value.splice(index, 1)
  } else {
    usedItems.value.push(itemId)
  }
}

const isUsed = (itemId) => usedItems.value.includes(itemId)

const createSession = async () => {
  const session = await sessionStore.createSession(campaignId)
  selectSession(session.id)
}

const selectSession = (id) => {
  selectedSessionId.value = id
  sessionStore.currentSession = sessionStore.sessions.find(s => s.id === id)
  expandedItems.value = [] 
  usedItems.value = []
  // Auto-expand all items by default
  if (sessionStore.currentSession && sessionStore.currentSession.linked_items) {
    expandedItems.value = [...sessionStore.currentSession.linked_items]
  }
}

const updateNotes = (e) => {
  if (!currentSession.value) return
  sessionStore.updateSession(campaignId, currentSession.value.id, { notes: e.target.value })
}

const updateField = (field, value) => {
  if (!currentSession.value) return
  sessionStore.updateSession(campaignId, currentSession.value.id, { [field]: value })
}

const finalize = async () => {
  if (!confirm('Are you sure you want to finalize this session? Used items will be archived.')) return
  await sessionStore.finalizeSession(campaignId, currentSession.value.id)
  selectedSessionId.value = null
  sessionStore.currentSession = null
}

const linkItem = async (itemId) => {
  if (!currentSession.value) return
  const currentLinked = [...(currentSession.value.linked_items || [])]
  if (!currentLinked.includes(itemId)) {
    currentLinked.push(itemId)
    await sessionStore.updateSession(campaignId, currentSession.value.id, { linked_items: currentLinked })
    expandedItems.value.push(itemId) 
  }
  showLinkModal.value = false
}

const unlinkItem = async (itemId) => {
  if (!currentSession.value) return
  const currentLinked = [...(currentSession.value.linked_items || [])]
  const index = currentLinked.indexOf(itemId)
  if (index > -1) {
    currentLinked.splice(index, 1)
    await sessionStore.updateSession(campaignId, currentSession.value.id, { linked_items: currentLinked })
  }
}

// Inline Editing Logic
const updateItemContent = async (item, field, value) => {
  const updatedContent = { ...item.content, [field]: value }
  // Optimistic update in store (if store supports it, otherwise we wait for fetch)
  // For now, we call API.
  await vaultStore.updateItem(campaignId, item.id, { ...item, content: updatedContent })
}

const updateItemAspect = async (item, index, value) => {
  const newAspects = [...(item.content.aspects || [])]
  newAspects[index] = value
  await updateItemContent(item, 'aspects', newAspects)
}

</script>

<template>
  <div class="h-full flex flex-col p-4 overflow-hidden">
    <!-- Header / Session Selector -->
    <div class="flex justify-between items-center mb-2 shrink-0">
      <div class="flex items-center gap-4">
        <h1 class="text-xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-400">
          Session
        </h1>
        <select 
          :value="selectedSessionId" 
          @change="selectSession($event.target.value)"
          class="bg-gray-800 text-white border border-gray-700 rounded px-2 py-1 text-xs focus:outline-none focus:border-purple-500"
        >
          <option :value="null">Select...</option>
          <option v-for="s in sessionStore.sessions" :key="s.id" :value="s.id">
            Session {{ s.number }} ({{ s.status }})
          </option>
        </select>
      </div>
      <div class="flex gap-2">
        <button 
          v-if="currentSession && currentSession.status !== 'completed'"
          @click="finalize"
          class="text-xs bg-red-900/30 hover:bg-red-900/50 text-red-400 px-2 py-1 rounded border border-red-900/50 transition-colors"
        >
          Finalize
        </button>
        <button 
          @click="createSession"
          class="bg-purple-600 hover:bg-purple-700 text-white px-2 py-1 rounded text-xs shadow-lg shadow-purple-900/20 transition-all"
        >
          + New
        </button>
      </div>
    </div>

    <!-- Active Session View -->
    <div v-if="currentSession" class="flex-1 flex flex-col gap-2 overflow-hidden">
      
      <!-- Top Section: Plan & Resources -->
      <div class="flex-1 flex gap-2 min-h-0">
        <!-- Left: Session Plan (Compact) -->
        <div class="w-1/3 flex flex-col gap-2">
          <div class="bg-gray-900/50 border border-gray-800 rounded p-2 flex flex-col shadow-lg backdrop-blur-sm h-1/2">
            <label class="block text-[10px] font-bold text-purple-300 mb-1 uppercase tracking-wider">Strong Start</label>
            <textarea 
              :value="currentSession.strong_start"
              @input="updateField('strong_start', $event.target.value)"
              class="flex-1 w-full bg-gray-950 text-gray-300 p-2 rounded border border-gray-800 focus:border-purple-500 focus:outline-none resize-none text-xs"
              placeholder="..."
            ></textarea>
          </div>
          <div class="bg-gray-900/50 border border-gray-800 rounded p-2 flex flex-col shadow-lg backdrop-blur-sm h-1/2">
            <label class="block text-[10px] font-bold text-purple-300 mb-1 uppercase tracking-wider">Recap</label>
            <textarea 
              :value="currentSession.recap"
              @input="updateField('recap', $event.target.value)"
              class="flex-1 w-full bg-gray-950 text-gray-300 p-2 rounded border border-gray-800 focus:border-purple-500 focus:outline-none resize-none text-xs"
              placeholder="..."
            ></textarea>
          </div>
        </div>

        <!-- Right: Active Resources (High Density) -->
        <div class="flex-1 bg-gray-900/50 border border-gray-800 rounded flex flex-col shadow-lg backdrop-blur-sm overflow-hidden">
          <div class="flex justify-between items-center p-2 bg-gray-900/80 border-b border-gray-800 shrink-0">
            <h2 class="text-xs font-bold text-purple-300 flex items-center gap-2 uppercase tracking-wider">
              <i class="fas fa-link"></i> Active Resources
            </h2>
            <button @click="showLinkModal = true" class="text-[10px] bg-gray-800 hover:bg-gray-700 text-purple-300 px-2 py-0.5 rounded transition-colors uppercase tracking-wider border border-gray-700">
              + Link
            </button>
          </div>
          
          <div class="flex-1 overflow-y-auto">
            <div v-for="(items, type) in activeItemsByType" :key="type" v-if="Object.keys(activeItemsByType).length > 0">
              <div v-if="items.length > 0">
                <!-- Type Header -->
                <div class="bg-gray-800/50 px-3 py-1 text-[10px] font-bold text-gray-400 uppercase tracking-widest border-y border-gray-800 sticky top-0 z-10 backdrop-blur">
                  {{ type }}s
                </div>

                <!-- Secrets List View -->
                <div v-if="type === 'secret'" class="divide-y divide-gray-800">
                  <div v-for="(item, index) in items" :key="item.id" class="flex items-start group hover:bg-gray-900/30 transition-colors" :class="{'opacity-50': isUsed(item.id)}">
                    <div class="p-2 text-gray-500 font-mono text-xs w-8 text-center shrink-0">{{ index + 1 }}.</div>
                    <div class="flex-1 p-2 min-w-0">
                       <!-- Inline Edit Description (Secrets usually just have description) -->
                       <div 
                        contenteditable="true"
                        @blur="updateItemContent(item, 'description', $event.target.innerText)"
                        class="text-sm text-gray-300 focus:outline-none focus:text-white focus:bg-gray-800/50 rounded px-1"
                        :class="{'line-through text-gray-600': isUsed(item.id)}"
                       >{{ item.content.description }}</div>
                    </div>
                    <div class="p-2 flex items-center gap-2 shrink-0">
                      <button @click="toggleUsed(item.id)" class="text-gray-600 hover:text-green-400" title="Mark Used">
                        <i class="fas" :class="isUsed(item.id) ? 'fa-check-square' : 'fa-square'"></i>
                      </button>
                      <button @click="unlinkItem(item.id)" class="text-gray-600 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity">
                        <i class="fas fa-times"></i>
                      </button>
                    </div>
                  </div>
                </div>

                <!-- Standard Resource View (High Density) -->
                <div v-else class="divide-y divide-gray-800">
                  <div v-for="item in items" :key="item.id" class="group hover:bg-gray-900/30 transition-colors" :class="{'opacity-50 grayscale': isUsed(item.id)}">
                    <!-- Header Row -->
                    <div class="flex items-center p-2 gap-2">
                      <!-- Accordion Arrow -->
                      <button @click="toggleAccordion(item.id)" class="text-gray-500 hover:text-white w-4 text-center transition-transform" :class="{'rotate-90': isExpanded(item.id)}">
                        <i class="fas fa-chevron-right text-xs"></i>
                      </button>
                      
                      <!-- Inline Edit Name -->
                      <input 
                        v-model="item.content.name" 
                        @blur="updateItemContent(item, 'name', item.content.name)"
                        class="bg-transparent text-sm font-bold text-gray-200 focus:outline-none focus:bg-gray-800/50 rounded px-1 flex-1 min-w-0"
                        :class="{'line-through': isUsed(item.id)}"
                      >
                      
                      <!-- Inline Edit Title (for Scenes) -->
                      <input 
                        v-if="item.type === 'scene'"
                        v-model="item.content.title" 
                        @blur="updateItemContent(item, 'title', item.content.title)"
                        class="bg-transparent text-sm font-bold text-gray-200 focus:outline-none focus:bg-gray-800/50 rounded px-1 flex-1 min-w-0"
                        :class="{'line-through': isUsed(item.id)}"
                      >

                      <!-- Actions -->
                      <div class="flex items-center gap-2 shrink-0">
                         <button @click="toggleUsed(item.id)" class="text-gray-600 hover:text-green-400" title="Mark Used">
                          <i class="fas" :class="isUsed(item.id) ? 'fa-check-circle' : 'fa-circle'"></i>
                        </button>
                        <button @click="unlinkItem(item.id)" class="text-gray-600 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity">
                          <i class="fas fa-times"></i>
                        </button>
                      </div>
                    </div>

                    <!-- Expanded Content -->
                    <div v-show="isExpanded(item.id)" class="px-8 pb-2 text-xs text-gray-400 space-y-2">
                      
                      <!-- NPC Fields -->
                      <div v-if="item.type === 'npc'" class="grid grid-cols-2 gap-2">
                        <div class="flex items-center gap-1">
                          <span class="text-purple-400 font-bold shrink-0">Archetype:</span>
                          <input v-model="item.content.archetype" @blur="updateItemContent(item, 'archetype', item.content.archetype)" class="bg-transparent w-full focus:outline-none focus:bg-gray-800/50 rounded px-1 text-gray-300">
                        </div>
                        <div class="flex items-center gap-1">
                          <span class="text-purple-400 font-bold shrink-0">Rel:</span>
                          <input v-model="item.content.relationship" @blur="updateItemContent(item, 'relationship', item.content.relationship)" class="bg-transparent w-full focus:outline-none focus:bg-gray-800/50 rounded px-1 text-gray-300">
                        </div>
                      </div>

                      <!-- Location Fields -->
                      <div v-if="item.type === 'location'" class="flex flex-wrap gap-2">
                        <div v-for="(aspect, i) in item.content.aspects" :key="i" class="flex items-center bg-blue-900/10 border border-blue-900/30 rounded px-1">
                           <input 
                            v-model="item.content.aspects[i]" 
                            @blur="updateItemAspect(item, i, item.content.aspects[i])"
                            class="bg-transparent text-blue-300 w-24 text-[10px] focus:outline-none"
                           >
                        </div>
                      </div>

                      <!-- Monster Fields -->
                      <div v-if="item.type === 'monster'">
                        <textarea 
                          v-model="item.content.stats"
                          @blur="updateItemContent(item, 'stats', item.content.stats)"
                          class="w-full bg-red-900/10 text-red-200/70 font-mono text-[10px] p-1 rounded focus:outline-none focus:bg-red-900/20 resize-y"
                          rows="3"
                        ></textarea>
                      </div>

                      <!-- Description (Markdown Editable) -->
                      <div class="relative group/desc">
                        <textarea 
                          v-model="item.content.description"
                          @blur="updateItemContent(item, 'description', item.content.description)"
                          class="w-full bg-transparent text-gray-500 focus:text-gray-300 focus:bg-gray-800/50 rounded p-1 focus:outline-none resize-y min-h-[3rem]"
                          placeholder="Description..."
                        ></textarea>
                        <!-- Preview Hint (Optional, maybe too cluttered) -->
                      </div>

                    </div>
                  </div>
                </div>
              </div>
            </div>
            
            <div v-if="!Object.keys(activeItemsByType).length" class="text-center text-gray-600 py-12 text-xs italic">
              Link items from the Vault to see them here.
            </div>
          </div>
        </div>
      </div>

      <!-- Bottom Section: Session Log -->
      <div class="h-1/3 bg-gray-900/50 border border-gray-800 rounded p-2 flex flex-col shadow-lg backdrop-blur-sm shrink-0">
        <h2 class="text-xs font-bold text-purple-300 flex items-center gap-2 mb-1 uppercase tracking-wider">
          <i class="fas fa-book"></i> Session Log
        </h2>
        <textarea 
          :value="currentSession.notes"
          @input="updateNotes"
          class="flex-1 w-full bg-gray-950 text-gray-300 p-2 rounded border border-gray-800 focus:border-purple-500 focus:outline-none resize-none font-mono text-xs leading-relaxed"
          placeholder="Log your session notes here..."
        ></textarea>
      </div>

    </div>

    <!-- Empty State -->
    <div v-else class="flex-1 flex items-center justify-center text-gray-600">
      <div class="text-center">
        <i class="fas fa-dice-d20 text-4xl mb-4 opacity-50"></i>
        <p>Select a session or start a new one.</p>
      </div>
    </div>

    <!-- Link Modal -->
    <div v-if="showLinkModal" class="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div class="bg-gray-900 w-full max-w-lg rounded-xl border border-gray-700 shadow-2xl flex flex-col max-h-[80vh]">
        <div class="p-4 border-b border-gray-800 flex justify-between items-center">
          <h3 class="font-bold text-white">Link Resource</h3>
          <button @click="showLinkModal = false" class="text-gray-500 hover:text-white"><i class="fas fa-times"></i></button>
        </div>
        <div class="p-2 overflow-y-auto flex-1">
          <div v-for="item in availableItems" :key="item.id" 
            @click="linkItem(item.id)"
            class="p-3 hover:bg-gray-800 rounded cursor-pointer flex justify-between items-center group border-b border-gray-800 last:border-0"
          >
            <div>
              <div class="text-sm font-bold text-gray-200">{{ item.content.name || item.content.title }}</div>
              <div class="text-xs text-gray-500 uppercase">{{ item.type }}</div>
            </div>
            <i class="fas fa-plus text-purple-500 opacity-0 group-hover:opacity-100"></i>
          </div>
          <div v-if="!availableItems.length" class="p-4 text-center text-gray-500 text-sm">
            No available items to link.
          </div>
        </div>
      </div>
    </div>

  </div>
</template>
