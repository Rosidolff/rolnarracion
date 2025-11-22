<script setup>
import { ref, onMounted } from 'vue'
import { useCampaignStore } from '../stores/campaignStore'
import { useRouter } from 'vue-router'

const campaignStore = useCampaignStore()
const router = useRouter()
const newCampaignTitle = ref('')

onMounted(() => {
  campaignStore.fetchCampaigns()
})

const createCampaign = async () => {
  if (!newCampaignTitle.value) return
  
  const metadata = {
    title: newCampaignTitle.value,
    elevator_pitch: '',
    truths: [],
    fronts: [],
    safety_tools: ''
  }
  
  const campaign = await campaignStore.createCampaign(metadata)
  newCampaignTitle.value = ''
  router.push(`/campaigns/${campaign.id}`)
}
</script>

<template>
  <div class="container mx-auto p-8">
    <h1 class="text-4xl font-bold text-purple-400 mb-8">The Lazy DM Vault</h1>
    
    <div class="mb-8 bg-gray-800 p-6 rounded-lg shadow-lg">
      <h2 class="text-2xl font-semibold mb-4 text-gray-200">Create New Campaign</h2>
      <div class="flex gap-4">
        <input 
          v-model="newCampaignTitle" 
          type="text" 
          placeholder="Campaign Title" 
          class="flex-1 p-2 rounded bg-gray-700 text-white border border-gray-600 focus:border-purple-500 focus:outline-none"
          @keyup.enter="createCampaign"
        >
        <button 
          @click="createCampaign"
          class="bg-purple-600 hover:bg-purple-700 text-white px-6 py-2 rounded transition-colors"
        >
          Create
        </button>
      </div>
    </div>

    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      <div 
        v-for="campaign in campaignStore.campaigns" 
        :key="campaign.id"
        class="bg-gray-800 p-6 rounded-lg shadow-lg hover:bg-gray-750 transition-colors cursor-pointer border border-gray-700 hover:border-purple-500"
        @click="router.push(`/campaigns/${campaign.id}`)"
      >
        <h3 class="text-xl font-bold text-purple-300 mb-2">{{ campaign.title }}</h3>
        <p class="text-gray-400 text-sm line-clamp-3">{{ campaign.elevator_pitch || 'No pitch yet.' }}</p>
      </div>
    </div>
  </div>
</template>
