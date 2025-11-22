<script setup>
import { ref, onMounted } from 'vue'
import { useRoute, RouterView, RouterLink } from 'vue-router'
import { useCampaignStore } from '../stores/campaignStore'

const route = useRoute()
const campaignStore = useCampaignStore()
const isOracleOpen = ref(false)

onMounted(() => {
  if (route.params.id) {
    campaignStore.getCampaign(route.params.id)
  }
})
</script>

<template>
  <div class="flex flex-col h-screen bg-gray-950 text-gray-100 font-sans selection:bg-purple-500 selection:text-white">
    <!-- Top Navigation Bar -->
    <header class="bg-gray-900/80 backdrop-blur-md border-b border-gray-800 h-16 flex items-center justify-between px-6 sticky top-0 z-50">
      <div class="flex items-center gap-6">
        <RouterLink to="/" class="text-gray-400 hover:text-white transition-colors">
          <i class="fas fa-arrow-left"></i>
        </RouterLink>
        <h1 class="text-xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent truncate max-w-md">
          {{ campaignStore.currentCampaign?.title || 'Loading...' }}
        </h1>
      </div>

      <nav class="flex items-center gap-1 bg-gray-800/50 p-1 rounded-lg border border-gray-700/50">
        <RouterLink 
          :to="`/campaigns/${route.params.id}`" 
          class="px-4 py-1.5 rounded-md text-sm font-medium transition-all duration-200"
          active-class="bg-purple-600 text-white shadow-lg shadow-purple-900/20"
          :class="route.name === 'campaign-dashboard' ? '' : 'text-gray-400 hover:text-gray-200 hover:bg-gray-700/50'"
        >
          Dashboard
        </RouterLink>
        <RouterLink 
          :to="`/campaigns/${route.params.id}/vault`" 
          class="px-4 py-1.5 rounded-md text-sm font-medium transition-all duration-200"
          active-class="bg-purple-600 text-white shadow-lg shadow-purple-900/20"
          :class="route.name === 'vault-manager' ? '' : 'text-gray-400 hover:text-gray-200 hover:bg-gray-700/50'"
        >
          Vault
        </RouterLink>
        <RouterLink 
          :to="`/campaigns/${route.params.id}/sessions`" 
          class="px-4 py-1.5 rounded-md text-sm font-medium transition-all duration-200"
          active-class="bg-purple-600 text-white shadow-lg shadow-purple-900/20"
          :class="route.name === 'session-view' ? '' : 'text-gray-400 hover:text-gray-200 hover:bg-gray-700/50'"
        >
          Sessions
        </RouterLink>
      </nav>

      <div class="w-8"></div> <!-- Spacer to balance back button -->
    </header>

    <!-- Main Workspace -->
    <div class="flex-1 flex overflow-hidden relative">
      <!-- Central Content -->
      <main class="flex-1 overflow-y-auto bg-gradient-to-b from-gray-950 to-gray-900 relative">
        <div class="absolute inset-0 bg-[url('/noise.png')] opacity-5 pointer-events-none"></div> <!-- Texture placeholder -->
        <RouterView />
      </main>

      <!-- Floating AI Oracle -->
      <div class="absolute bottom-6 right-6 z-50 flex flex-col items-end">
        <!-- Chat Window (Collapsible) -->
        <div v-if="isOracleOpen" class="mb-4 w-80 h-96 bg-gray-900/95 backdrop-blur-xl border border-gray-700 rounded-2xl shadow-2xl flex flex-col overflow-hidden transition-all origin-bottom-right">
          <div class="p-3 border-b border-gray-800 flex justify-between items-center bg-gray-800/50">
            <h2 class="text-xs font-bold text-purple-300 uppercase tracking-wider flex items-center gap-2">
              <i class="fas fa-sparkles"></i> AI Oracle
            </h2>
            <button @click="isOracleOpen = false" class="text-gray-500 hover:text-white transition-colors">
              <i class="fas fa-times"></i>
            </button>
          </div>
          <div class="flex-1 p-4 flex flex-col items-center justify-center text-center text-gray-500 space-y-3">
             <div class="w-12 h-12 rounded-full bg-gray-800 flex items-center justify-center mb-1 animate-pulse">
              <i class="fas fa-dragon text-xl text-purple-500/50"></i>
            </div>
            <p class="text-xs">The Oracle is sleeping...</p>
          </div>
          <div class="p-3 border-t border-gray-800 bg-gray-800/30">
             <input type="text" placeholder="Ask the Oracle..." class="w-full bg-gray-950 border border-gray-800 rounded px-3 py-2 text-xs text-gray-300 focus:border-purple-500 focus:outline-none">
          </div>
        </div>

        <!-- Toggle Button -->
        <button 
          @click="isOracleOpen = !isOracleOpen"
          class="w-12 h-12 rounded-full bg-purple-600 hover:bg-purple-500 text-white shadow-lg shadow-purple-900/40 flex items-center justify-center transition-all hover:scale-110 active:scale-95"
        >
          <i class="fas" :class="isOracleOpen ? 'fa-chevron-down' : 'fa-comment-dots'"></i>
        </button>
      </div>
    </div>
  </div>
</template>
