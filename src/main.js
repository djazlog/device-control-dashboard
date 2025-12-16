import { createApp } from 'vue'
import { createPinia } from 'pinia'
import { createRouter, createWebHistory } from 'vue-router'
import App from './App.vue'
import Dashboard from './views/Dashboard.vue'
import Login from './views/Login.vue'
import { useAuthStore } from './stores/authStore'

// Создаем Pinia перед router
const pinia = createPinia()

const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/login',
      name: 'login',
      component: Login,
      meta: { requiresAuth: false }
    },
    {
      path: '/',
      name: 'dashboard',
      component: Dashboard,
      meta: { requiresAuth: true }
    },
    {
      path: '/:pathMatch(.*)*',
      redirect: '/'
    }
  ]
})

// Защита маршрутов
router.beforeEach(async (to, from, next) => {
  // Используем Pinia для доступа к store
  const authStore = useAuthStore()
  
  // Проверяем авторизацию при загрузке (асинхронно)
  if (!authStore.isAuthenticated) {
    await authStore.checkAuth()
  }
  
  // Если маршрут требует авторизации
  if (to.meta.requiresAuth) {
    if (authStore.isAuthenticated) {
      next()
    } else {
      // Перенаправляем на страницу логина
      next({ name: 'login', query: { redirect: to.fullPath } })
    }
  } else {
    // Если пользователь уже авторизован и пытается зайти на страницу логина
    if (to.name === 'login' && authStore.isAuthenticated) {
      next({ name: 'dashboard' })
    } else {
      next()
    }
  }
})

const app = createApp(App)
app.use(pinia)
app.use(router)
app.mount('#app')

// Скрываем экран загрузки после успешного монтирования приложения
const hideLoadingScreen = () => {
  const loadingScreen = document.getElementById('loading-screen')
  if (loadingScreen) {
    loadingScreen.style.opacity = '0'
    setTimeout(() => {
      if (loadingScreen.parentNode) {
        loadingScreen.remove()
      }
    }, 300)
  }
}

// Скрываем экран загрузки после монтирования
setTimeout(hideLoadingScreen, 100)