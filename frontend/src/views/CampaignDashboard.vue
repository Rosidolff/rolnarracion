<script setup>
import { ref, watch, onMounted } from 'vue'
import { useCampaignStore } from '../stores/campaignStore'
import { useRoute } from 'vue-router'

const campaignStore = useCampaignStore()
const route = useRoute()

// Local state for editing to avoid laggy inputs
const localCampaign = ref(null)
const saveTimeout = ref(null)
const isSaving = ref(false)

onMounted(async () => {
  if (route.params.id) {
    await campaignStore.getCampaign(route.params.id)
    // Deep copy to break reference
    localCampaign.value = JSON.parse(JSON.stringify(campaignStore.currentCampaign))
  }
})

// Watch for store changes (e.g. initial load)
watch(() => campaignStore.currentCampaign, (newVal) => {
  if (newVal && !localCampaign.value) {
    localCampaign.value = JSON.parse(JSON.stringify(newVal))
    // Enforce 6 truths
    while (localCampaign.value.truths.length < 6) {
      localCampaign.value.truths.push('')
    }
    if (localCampaign.value.truths.length > 6) {
      localCampaign.value.truths = localCampaign.value.truths.slice(0, 6)
    }
  }
}, { deep: true })

// Auto-save logic
const debouncedSave = () => {
  if (saveTimeout.value) clearTimeout(saveTimeout.value)
  isSaving.value = true
  saveTimeout.value = setTimeout(async () => {
    if (localCampaign.value) {
      await campaignStore.updateCampaign(localCampaign.value.id, localCampaign.value)
      isSaving.value = false
    }
  }, 1000) // 1 second debounce
}

// Truths Management
const addTruth = () => {
  localCampaign.value.truths.push('')
  debouncedSave()
}
const removeTruth = (index) => {
  localCampaign.value.truths.splice(index, 1)
  debouncedSave()
}

// Fronts Management
const addFront = () => {
  localCampaign.value.fronts.push({
    name: 'New Front',
    goal: '',
    grim_portents: ['', '', '']
  })
  debouncedSave()
}
const removeFront = (index) => {
  localCampaign.value.fronts.splice(index, 1)
  debouncedSave()
}
</script>

<template>
  <div class="p-8 max-w-5xl mx-auto pb-24" v-if="localCampaign">
    <div class="flex justify-between items-center mb-8">
      <h1 class="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-400">
        Campaign Dashboard
      </h1>
      <span v-if="isSaving" class="text-xs text-purple-400 animate-pulse">
        <i class="fas fa-save"></i> Saving...
      </span>
      <span v-else class="text-xs text-gray-500">
        <i class="fas fa-check"></i> Saved
      </span>
    </div>
    
    <!-- Elevator Pitch -->
    <section class="mb-8 bg-gray-900/50 p-6 rounded-xl border border-gray-800 shadow-lg backdrop-blur-sm">
      <h2 class="text-lg font-bold text-purple-300 mb-3 flex items-center gap-2">
        <i class="fas fa-bullhorn"></i> Elevator Pitch
      </h2>
      <textarea 
        v-model="localCampaign.elevator_pitch" 
        @input="debouncedSave"
        class="w-full bg-gray-950 text-gray-300 p-4 rounded-lg border border-gray-800 focus:border-purple-500 focus:ring-1 focus:ring-purple-500 focus:outline-none transition-all resize-none h-24"
        placeholder="What is the core hook of your campaign? e.g. 'Strahd has returned, and the mists are closing in...'"
      ></textarea>
    </section>

    <div class="grid grid-cols-1 lg:grid-cols-2 gap-8">
      <!-- The 6 Truths -->
      <section class="bg-gray-900/50 p-6 rounded-xl border border-gray-800 shadow-lg backdrop-blur-sm flex flex-col">
        <div class="flex justify-between items-center mb-4">
          <h2 class="text-lg font-bold text-purple-300 flex items-center gap-2">
            <i class="fas fa-list-ol"></i> The 6 Truths
          </h2>
        </div>
        
        <div class="space-y-3 flex-1">
          <div v-for="i in 6" :key="i" class="flex gap-2 items-start group">
            <span class="text-gray-600 font-mono mt-2">{{ i }}.</span>
            <textarea 
              v-model="localCampaign.truths[i-1]" 
              @input="debouncedSave"
              class="flex-1 bg-gray-950 text-gray-300 p-2 rounded border border-gray-800 focus:border-purple-500 focus:outline-none text-sm resize-none h-16"
              placeholder="A truth about the world..."
            ></textarea>
          </div>
        </div>
      </section>

      <!-- Fronts -->
      <section class="bg-gray-900/50 p-6 rounded-xl border border-gray-800 shadow-lg backdrop-blur-sm flex flex-col">
        <div class="flex justify-between items-center mb-4">
          <h2 class="text-lg font-bold text-red-400 flex items-center gap-2">
            <i class="fas fa-skull"></i> Active Fronts
          </h2>
          <button @click="addFront" class="text-xs bg-gray-800 hover:bg-gray-700 text-red-400 px-2 py-1 rounded transition-colors">
            <i class="fas fa-plus"></i> Add
          </button>
        </div>

        <div class="space-y-6 flex-1">
          <div v-for="(front, index) in localCampaign.fronts" :key="index" class="bg-gray-950/50 p-4 rounded-lg border border-gray-800 relative group">
            <button @click="removeFront(index)" class="absolute top-2 right-2 text-gray-600 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity">
              <i class="fas fa-trash"></i>
            </button>
            
            <div class="mb-3">
              <input 
                v-model="front.name" 
                @input="debouncedSave"
                class="w-full bg-transparent text-red-300 font-bold placeholder-red-900/50 focus:outline-none border-b border-transparent focus:border-red-900 transition-colors"
                placeholder="Front Name"
              >
              <input 
                v-model="front.goal" 
                @input="debouncedSave"
                class="w-full bg-transparent text-gray-400 text-sm mt-1 placeholder-gray-700 focus:outline-none"
                placeholder="Goal: What will happen if unchecked?"
              >
            </div>

            <div class="space-y-2 pl-2 border-l-2 border-gray-800">
              <div v-for="(portent, pIndex) in front.grim_portents" :key="pIndex" class="flex items-center gap-2">
                <span class="text-xs text-gray-600">{{ pIndex + 1 }}</span>
                <input 
                  v-model="front.grim_portents[pIndex]" 
                  @input="debouncedSave"
                  class="flex-1 bg-gray-900 text-gray-400 text-xs p-1 rounded border border-gray-800 focus:border-red-900 focus:outline-none"
                  placeholder="Grim Portent..."
                >
              </div>
            </div>
          </div>
          <div v-if="!localCampaign.fronts.length" class="text-center text-gray-600 py-8 italic text-sm">
            No active threats. The world is safe... for now.
          </div>
        </div>
      </section>
    </div>
    
    <!-- Safety Tools -->
    <section class="mt-8 bg-gray-900/50 p-6 rounded-xl border border-gray-800 shadow-lg backdrop-blur-sm">
      <h2 class="text-lg font-bold text-blue-300 mb-3 flex items-center gap-2">
        <i class="fas fa-shield-alt"></i> Safety Tools & Notes
      </h2>
      <textarea 
        v-model="localCampaign.safety_tools" 
        @input="debouncedSave"
        class="w-full bg-gray-950 text-gray-300 p-4 rounded-lg border border-gray-800 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none transition-all resize-none h-24"
        placeholder="Lines, Veils, and other safety considerations..."
      ></textarea>
    </section>
  </div>
</template>
