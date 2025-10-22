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
    const logs = ref([]);
    
    const connection = {
      deviceId,
      logs,
      isConnected: true,
      
      addLog: (logEntry) => {
        logs.value.unshift({
          id: Date.now() + Math.random(),
          timestamp: logEntry.timestamp || new Date(),
          type: logEntry.type || 'info',
          message: logEntry.message,
          command: logEntry.command,
          parameters: logEntry.parameters,
          success: logEntry.success
        });
        
        // Ограничиваем количество логов
        if (logs.value.length > 1000) {
          logs.value = logs.value.slice(0, 1000);
        }
      },
      
      sendCommand: async (command, parameters = {}) => {
        const logEntry = {
          type: 'command',
          command,
          parameters,
          timestamp: new Date()
        };
        
        connection.addLog(logEntry);
        
        try {
          const result = await sendCommand(deviceId, command, parameters);
          
          connection.addLog({
            type: 'response',
            message: `Command executed: ${result.message}`,
            success: result.success,
            timestamp: new Date()
          });
          
          return result;
        } catch (error) {
          connection.addLog({
            type: 'error',
            message: `Command failed: ${error.message}`,
            timestamp: new Date()
          });
          
          throw error;
        }
      },
      
      clearLogs: () => {
        logs.value = [];
      },
      
      close: () => {
        connection.isConnected = false;
        terminalConnections.value.delete(deviceId);
        connection.addLog({
          type: 'info',
          message: 'Terminal connection closed',
          timestamp: new Date()
        });
      }
    };
    
    // Добавляем начальное сообщение
    connection.addLog({
      type: 'info',
      message: `Terminal connected to device: ${deviceId}`,
      timestamp: new Date()
    });
    
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