import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import httpClient from '@/http/client';

export const useDeviceStore = defineStore('devices', () => {
  const devices = ref([]);
  const selectedDevice = ref(null);
  const loading = ref(false);
  const error = ref(null);
  const terminalConnections = ref(new Map());

  const onlineDevices = computed(() => 
    devices.value.filter(device => device.isOnline)
  );

  const offlineDevices = computed(() => 
    devices.value.filter(device => !device.isOnline)
  );

  async function fetchDevices(onlineOnly = false) {
    loading.value = true;
    error.value = null;
    
    try {
      const response = await httpClient.getDevices(onlineOnly);
      console.log('fetchDevices')
      console.log(response)
      devices.value = response.devicesList || [];
    } catch (err) {
      error.value = `Failed to fetch devices: ${err.message}`;
      console.error('Error fetching devices:', err);
    } finally {
      loading.value = false;
    }
  }

  async function fetchDeviceInfo(deviceId) {
    try {
      const response = await httpClient.getDeviceInfo(deviceId);
      return response.device;
    } catch (err) {
      error.value = `Failed to fetch device info: ${err.message}`;
      console.error('Error fetching device info:', err);
      return null;
    }
  }

  async function sendCommand(deviceId, command, parameters = {}) {
    try {
      const response = await httpClient.sendCommand(deviceId, command, parameters);
      
      // Добавляем лог в терминал соединение
      const connection = terminalConnections.value.get(deviceId);
      if (connection && connection.addLog) {
        connection.addLog({
          type: 'command_sent',
          command,
          parameters,
          timestamp: new Date(),
          success: response.success
        });
      }
      
      return response;
    } catch (err) {
      error.value = `Failed to send command: ${err.message}`;
      console.error('Error sending command:', err);
      
      // Добавляем лог об ошибке
      const connection = terminalConnections.value.get(deviceId);
      if (connection && connection.addLog) {
        connection.addLog({
          type: 'error',
          message: `Command failed: ${err.message}`,
          timestamp: new Date()
        });
      }
      
      throw err;
    }
  }

  async function broadcastCommand(command, parameters = {}, deviceIds = []) {
    try {
      const response = await httpClient.broadcastCommand(command, parameters, deviceIds);
      return response;
    } catch (err) {
      error.value = `Failed to broadcast command: ${err.message}`;
      console.error('Error broadcasting command:', err);
      throw err;
    }
  }

  function selectDevice(device) {
    selectedDevice.value = device;
  }

  function clearSelection() {
    selectedDevice.value = null;
  }

  function createTerminalConnection(deviceId) {
    console.log('createTerminalConnection called for deviceId:', deviceId);
    
    // Если connection уже существует, закрываем его и создаем новый
    const existingConnection = terminalConnections.value.get(deviceId);
    if (existingConnection && typeof existingConnection.close === 'function') {
      console.log('Closing existing connection');
      existingConnection.close();
    }
    
    const logs = ref([]);
    let ws = null;
    const baseUrl = import.meta.env.VITE_HTTP_API_URL || 'http://localhost:8081';
    console.log('Base URL:', baseUrl);
    
    // Преобразуем HTTP URL в WebSocket URL
    // Включаем deviceId в URL, так как сервер требует device_id
    const wsUrl = baseUrl
      .replace(/^http:/, 'ws:')
      .replace(/^https:/, 'wss:')
      .replace(/\/$/, '') + `/ws/admin?device_id=${encodeURIComponent(deviceId)}`;
    console.log('WebSocket URL:', wsUrl);
    
    const connection = {
      deviceId,
      logs,
      isConnected: false,
      ws: null,
      
      addLog: (logEntry) => {
        logs.value.push({
          id: Date.now() + Math.random(),
          timestamp: logEntry.timestamp || new Date(),
          type: logEntry.type || 'info',
          message: logEntry.message,
          command: logEntry.command,
          parameters: logEntry.parameters,
          success: logEntry.success
        });
        
        // Ограничиваем количество логов - удаляем старые с начала
        if (logs.value.length > 1000) {
          logs.value = logs.value.slice(-1000);
        }
      },
      
      connect: () => {
        try {
          console.log('Attempting to connect to WebSocket:', wsUrl);
          connection.addLog({
            type: 'info',
            message: `Connecting to WebSocket: ${wsUrl}`,
            timestamp: new Date()
          });
          
          ws = new WebSocket(wsUrl);
          connection.ws = ws;
          
          ws.onopen = () => {
            console.log('WebSocket connection opened successfully');
            connection.isConnected = true;
            connection.addLog({
              type: 'info',
              message: `WebSocket connected to device: ${deviceId}`,
              timestamp: new Date()
            });
          };
          
          ws.onmessage = (event) => {
            console.log('WebSocket message received:', event.data);
            try {
              const data = JSON.parse(event.data);
              // Определяем тип лога на основе типа сообщения
              let logType = 'response';
              if (data.type === 'PING') {
                logType = 'ping';
              }
              // Сохраняем полный JSON как строку для возможности разворачивания
              connection.addLog({
                type: logType,
                message: JSON.stringify(data),
                timestamp: new Date()
              });
            } catch (e) {
              // Если не JSON, просто показываем как текст
              connection.addLog({
                type: 'response',
                message: event.data,
                timestamp: new Date()
              });
            }
          };
          
          ws.onerror = (error) => {
            console.error('WebSocket error:', error);
            console.error('WebSocket readyState:', ws?.readyState);
            const errorMessage = error.message || error.reason || 'Connection error';
            connection.addLog({
              type: 'error',
              message: `WebSocket error: ${errorMessage}`,
              timestamp: new Date()
            });
          };
          
          ws.onclose = (event) => {
            console.log('WebSocket connection closed:', event.code, event.reason);
            connection.isConnected = false;
            const closeMessage = event.code === 1000 
              ? 'WebSocket connection closed normally'
              : `WebSocket connection closed (code: ${event.code}${event.reason ? ', reason: ' + event.reason : ''})`;
            connection.addLog({
              type: 'info',
              message: closeMessage,
              timestamp: new Date()
            });
          };
        } catch (error) {
          console.error('Failed to create WebSocket:', error);
          connection.addLog({
            type: 'error',
            message: `Failed to connect: ${error.message}`,
            timestamp: new Date()
          });
        }
      },
      
      sendMessage: (message) => {
        if (!connection.isConnected || !connection.ws || connection.ws.readyState !== WebSocket.OPEN) {
          connection.addLog({
            type: 'error',
            message: 'WebSocket is not connected',
            timestamp: new Date()
          });
          return false;
        }
        
        // Если message уже объект, используем его, иначе оборачиваем в структуру
        let messageObj;
        if (typeof message === 'string') {
          // Для обратной совместимости
          messageObj = {
            type: 'command',
            command: message
          };
        } else if (typeof message === 'object' && message !== null) {
          // Создаем новый простой объект, чтобы избежать проблем с Proxy или другими обертками
          messageObj = {
            type: message.type || 'command',
            ...(message.command && { command: message.command }),
            ...(message.parameters && Object.keys(message.parameters).length > 0 && { parameters: message.parameters }),
            ...(message.data && { data: message.data })
          };
        } else {
          connection.addLog({
            type: 'error',
            message: 'Invalid message format',
            timestamp: new Date()
          });
          return false;
        }
        
        // Логируем отправленное сообщение
        const logMessage = messageObj.command || JSON.stringify(messageObj);
        connection.addLog({
          type: 'command',
          message: logMessage,
          timestamp: new Date()
        });
        
        // Отправляем сообщение в сокет как JSON строку
        try {
          // Убеждаемся, что messageObj - это простой объект
          const cleanMessageObj = {
            type: String(messageObj.type || 'command')
          };
          
          if (messageObj.command) {
            cleanMessageObj.command = String(messageObj.command);
          }
          
          if (messageObj.parameters && typeof messageObj.parameters === 'object') {
            const cleanParams = {};
            for (const [key, value] of Object.entries(messageObj.parameters)) {
              cleanParams[String(key)] = String(value);
            }
            if (Object.keys(cleanParams).length > 0) {
              cleanMessageObj.parameters = cleanParams;
            }
          }
          
          if (messageObj.data) {
            cleanMessageObj.data = messageObj.data;
          }
          
          const jsonMessage = JSON.stringify(cleanMessageObj);
          
          // Дополнительная проверка - убеждаемся, что это строка
          if (typeof jsonMessage !== 'string') {
            throw new Error('Failed to stringify message: result is not a string');
          }
          
          // Проверяем, что это валидный JSON
          if (!jsonMessage || jsonMessage === 'null' || jsonMessage === 'undefined') {
            throw new Error('Invalid JSON string');
          }
          
          console.log('Sending JSON message:', jsonMessage, 'Type:', typeof jsonMessage, 'Length:', jsonMessage.length);
          
          // Убеждаемся, что ws.send существует и это функция
          if (!connection.ws || typeof connection.ws.send !== 'function') {
            throw new Error('WebSocket send method is not available');
          }
          
          // Отправляем строку напрямую
          connection.ws.send(jsonMessage);
          return true;
        } catch (error) {
          console.error('Error sending message:', error, 'messageObj:', messageObj, 'messageObj type:', typeof messageObj);
          connection.addLog({
            type: 'error',
            message: `Failed to send message: ${error.message}`,
            timestamp: new Date()
          });
          return false;
        }
      },
      
      sendCommand: async (command, parameters = {}) => {
        // Для обратной совместимости, но теперь отправляем напрямую в сокет
        const message = command + (Object.keys(parameters).length > 0 
          ? ' ' + Object.entries(parameters).map(([k, v]) => `${k}=${v}`).join(' ')
          : '');
        return connection.sendMessage(message);
      },
      
      clearLogs: () => {
        logs.value = [];
      },
      
      close: () => {
        if (connection.ws) {
          connection.ws.close();
          connection.ws = null;
        }
        connection.isConnected = false;
        terminalConnections.value.delete(deviceId);
        connection.addLog({
          type: 'info',
          message: 'Terminal connection closed',
          timestamp: new Date()
        });
      }
    };
    
    // Автоматически подключаемся при создании соединения
    console.log('Calling connection.connect()');
    connection.connect();
    console.log('Connection object created:', connection);
    
    terminalConnections.value.set(deviceId, connection);
    return connection;
  }

  function getTerminalConnection(deviceId) {
    return terminalConnections.value.get(deviceId);
  }

  function closeTerminalConnection(deviceId) {
    const connection = terminalConnections.value.get(deviceId);
    if (connection) {
      connection.close();
    }
  }

  // Проверка подключения к gRPC серверу
  async function checkConnection() {
    try {
      await httpClient.checkConnection();
      return true;
    } catch (err) {
      console.error('gRPC connection failed:', err);
      return false;
    }
  }

  // Автообновление отключено по требованию
  function startAutoRefresh() {
    return () => {};
  }

  return {
    devices,
    selectedDevice,
    loading,
    error,
    onlineDevices,
    offlineDevices,
    
    fetchDevices,
    fetchDeviceInfo,
    sendCommand,
    broadcastCommand,
    selectDevice,
    clearSelection,
    createTerminalConnection,
    getTerminalConnection,
    closeTerminalConnection,
    checkConnection,
    startAutoRefresh
  };
});