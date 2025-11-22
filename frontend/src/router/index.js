import { createRouter, createWebHistory } from 'vue-router'

const router = createRouter({
    history: createWebHistory(import.meta.env.BASE_URL),
    routes: [
        {
            path: '/',
            name: 'home',
            component: () => import('../views/HomeView.vue')
        },
        {
            path: '/campaigns/:id',
            component: () => import('../layouts/CampaignLayout.vue'),
            children: [
                {
                    path: '',
                    name: 'campaign-dashboard',
                    component: () => import('../views/CampaignDashboard.vue')
                },
                {
                    path: 'vault',
                    name: 'vault-manager',
                    component: () => import('../views/VaultManager.vue')
                },
                {
                    path: 'sessions',
                    name: 'session-view',
                    component: () => import('../views/SessionView.vue')
                }
            ]
        }
    ]
})

export default router
