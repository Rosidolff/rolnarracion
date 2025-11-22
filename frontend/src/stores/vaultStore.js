import { defineStore } from 'pinia'
import axios from 'axios'

const API_URL = 'http://localhost:5000/api'

export const useVaultStore = defineStore('vault', {
    state: () => ({
        items: [],
        loading: false,
        error: null
    }),
    actions: {
        async fetchItems(campaignId, typeFilter = null) {
            this.loading = true
            try {
                const params = typeFilter ? { type: typeFilter } : {}
                const response = await axios.get(`${API_URL}/campaigns/${campaignId}/vault`, { params })
                this.items = response.data
            } catch (err) {
                this.error = err.message
            } finally {
                this.loading = false
            }
        },
        async createItem(campaignId, itemData) {
            this.loading = true
            try {
                const response = await axios.post(`${API_URL}/campaigns/${campaignId}/vault`, itemData)
                this.items.push(response.data)
                return response.data
            } catch (err) {
                this.error = err.message
                throw err
            } finally {
                this.loading = false
            }
        },
        async updateItem(campaignId, itemId, itemData) {
            this.loading = true
            try {
                const response = await axios.put(`${API_URL}/campaigns/${campaignId}/vault/${itemId}`, itemData)
                const index = this.items.findIndex(i => i.id === itemId)
                if (index !== -1) {
                    this.items[index] = response.data
                }
                return response.data
            } catch (err) {
                this.error = err.message
                throw err
            } finally {
                this.loading = false
            }
        }
    }
})
