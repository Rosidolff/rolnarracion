import { defineStore } from 'pinia'
import axios from 'axios'

const API_URL = 'http://localhost:5000/api'

export const useSessionStore = defineStore('session', {
    state: () => ({
        sessions: [],
        currentSession: null,
        loading: false,
        error: null
    }),
    actions: {
        async fetchSessions(campaignId) {
            this.loading = true
            try {
                const response = await axios.get(`${API_URL}/campaigns/${campaignId}/sessions`)
                this.sessions = response.data
            } catch (err) {
                this.error = err.message
            } finally {
                this.loading = false
            }
        },
        async createSession(campaignId) {
            this.loading = true
            try {
                const response = await axios.post(`${API_URL}/campaigns/${campaignId}/sessions`)
                this.sessions.push(response.data)
                return response.data
            } catch (err) {
                this.error = err.message
                throw err
            } finally {
                this.loading = false
            }
        },
        async updateSession(campaignId, sessionId, sessionData) {
            // Don't set global loading for background saves if possible, but for now simple
            try {
                const response = await axios.put(`${API_URL}/campaigns/${campaignId}/sessions/${sessionId}`, sessionData)
                this.currentSession = response.data
                // Update list if needed
                const index = this.sessions.findIndex(s => s.id === sessionId)
                if (index !== -1) {
                    this.sessions[index] = response.data
                }
                return response.data
            } catch (err) {
                this.error = err.message
                throw err
            }
        },
        async finalizeSession(campaignId, sessionId) {
            this.loading = true
            try {
                await axios.post(`${API_URL}/campaigns/${campaignId}/sessions/${sessionId}/finalize`)
                // Refresh session to get updated status
                await this.updateSession(campaignId, sessionId, { status: 'completed' })
            } catch (err) {
                this.error = err.message
            } finally {
                this.loading = false
            }
        }
    }
})
