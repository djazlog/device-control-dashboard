import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import httpClient from '@/http/client';

export const useAuthStore = defineStore('auth', () => {
  const isAuthenticated = ref(false);
  const user = ref(null);
  const token = ref(localStorage.getItem('auth_token') || null);

  // Проверяем, есть ли сохраненный токен при инициализации
  if (token.value) {
    isAuthenticated.value = true;
    // Загружаем данные пользователя из localStorage
    const savedUser = localStorage.getItem('auth_user');
    if (savedUser) {
      try {
        user.value = JSON.parse(savedUser);
      } catch (e) {
        console.error('Failed to parse saved user data:', e);
      }
    }
  }

  const login = async (username, password) => {
    try {
      if (!username || !password) {
        return { success: false, error: 'Логин и пароль обязательны' };
      }

      // Отправляем запрос на сервер для авторизации
      const response = await httpClient.login(username, password);
      
      // Ожидаем ответ в формате: { token: string, user: object } или { success: true, token: string, user: object }
      const authToken = response.token || response.data?.token;
      const userData = response.user || response.data?.user || { username };
      
      if (!authToken) {
        return { success: false, error: 'Токен не получен от сервера' };
      }

      // Сохраняем токен и данные пользователя
      token.value = authToken;
      user.value = {
        ...userData,
        username: userData.username || username,
        loginTime: new Date().toISOString()
      };
      isAuthenticated.value = true;
      
      // Сохраняем в localStorage
      localStorage.setItem('auth_token', authToken);
      localStorage.setItem('auth_user', JSON.stringify(user.value));
      
      return { success: true };
    } catch (error) {
      console.error('Login error:', error);
      
      // Обрабатываем различные типы ошибок
      let errorMessage = 'Ошибка авторизации';
      
      if (error.response) {
        // Сервер ответил с ошибкой
        const status = error.response.status;
        const data = error.response.data;
        
        if (status === 401) {
          errorMessage = data?.message || 'Неверный логин или пароль';
        } else if (status === 400) {
          errorMessage = data?.message || 'Неверный формат данных';
        } else if (status >= 500) {
          errorMessage = 'Ошибка сервера. Попробуйте позже';
        } else {
          errorMessage = data?.message || error.message || 'Ошибка авторизации';
        }
      } else if (error.request) {
        // Запрос был отправлен, но ответа не получено
        errorMessage = 'Сервер не отвечает. Проверьте подключение к интернету';
      } else {
        // Ошибка при настройке запроса
        errorMessage = error.message || 'Ошибка при отправке запроса';
      }
      
      return { success: false, error: errorMessage };
    }
  };

  const logout = async () => {
    try {
      // Отправляем запрос на сервер для выхода (если есть токен)
      if (token.value) {
        await httpClient.logout();
      }
    } catch (error) {
      // Игнорируем ошибки при выходе - все равно очищаем локальные данные
      console.warn('Logout error:', error);
    } finally {
      // Очищаем локальные данные в любом случае
      isAuthenticated.value = false;
      user.value = null;
      token.value = null;
      localStorage.removeItem('auth_token');
      localStorage.removeItem('auth_user');
    }
  };

  const checkAuth = async () => {
    // Проверяем наличие токена
    const savedToken = localStorage.getItem('auth_token');
    if (!savedToken) {
      return false;
    }

    try {
      // Валидируем токен на сервере
      const response = await httpClient.validateToken(savedToken);
      
      // Если токен валиден, обновляем данные пользователя
      if (response.valid !== false) {
        token.value = savedToken;
        isAuthenticated.value = true;
        
        // Обновляем данные пользователя, если они пришли с сервера
        if (response.user) {
          user.value = response.user;
          localStorage.setItem('auth_user', JSON.stringify(user.value));
        } else {
          // Используем сохраненные данные
          const savedUser = localStorage.getItem('auth_user');
          if (savedUser) {
            try {
              user.value = JSON.parse(savedUser);
            } catch (e) {
              console.error('Failed to parse saved user data:', e);
            }
          }
        }
        
        return true;
      } else {
        // Токен невалиден - очищаем
        logout();
        return false;
      }
    } catch (error) {
      // Если ошибка валидации (401, 403), токен невалиден
      if (error.response?.status === 401 || error.response?.status === 403) {
        logout();
        return false;
      }
      
      // Для других ошибок (сеть и т.д.) используем сохраненный токен
      // но помечаем как невалидированный
      console.warn('Token validation error:', error);
      token.value = savedToken;
      isAuthenticated.value = true;
      
      const savedUser = localStorage.getItem('auth_user');
      if (savedUser) {
        try {
          user.value = JSON.parse(savedUser);
        } catch (e) {
          console.error('Failed to parse saved user data:', e);
        }
      }
      
      return true; // Разрешаем доступ, но токен может быть невалидным
    }
  };

  return {
    isAuthenticated: computed(() => isAuthenticated.value),
    user: computed(() => user.value),
    token: computed(() => token.value),
    login,
    logout,
    checkAuth
  };
});

