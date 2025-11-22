import { defineStore } from 'pinia'
import axios from 'axios'

const API_URL = 'http://localhost:5000/api'

export const useCampaignStore = defineStore('campaign', {
    state: () => ({
        campaigns: [],
        currentCampaign: null,
        loading: false,
        error: null
    }),
    actions: {
        async fetchCampaigns() {
            this.loading = true
            try {
                const response = await axios.get(`${API_URL}/campaigns`)
                this.campaigns = response.data
            } catch (err) {
                this.error = err.message
            } finally {
                this.loading = false
            }
        },
        async createCampaign(campaignData) {
            this.loading = true
            try {
                const response = await axios.post(`${API_URL}/campaigns`, campaignData)
                this.campaigns.push(response.data)
                return response.data
            } catch (err) {
                this.error = err.message
                throw err
            } finally {
                this.loading = false
            }
        },
        async getCampaign(id) {
            this.loading = true
            try {
                const response = await axios.get(`${API_URL}/campaigns/${id}`)
                this.currentCampaign = response.data
                return response.data
            } catch (err) {
                this.error = err.message
            } finally {
                this.loading = false
            }
        },
        async updateCampaign(id, campaignData) {
            // Background update, don't set global loading to avoid flicker on auto-save
            try {
                const response = await axios.put(`${API_URL}/campaigns/${id}`, campaignData)
                this.currentCampaign = response.data
                return response.data
            } catch (err) {
                this.error = err.message
                throw err
            }
        }
    }
})
