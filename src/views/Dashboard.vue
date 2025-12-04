<template>
    <div class="dashboard">
      <header class="dashboard-header">
        <h1>Device Management Dashboard</h1>
        <ConnectionStatus />
      </header>
  
      <main class="dashboard-main">
        <div class="dashboard-content">
          <DeviceList
            :devices="deviceStore.devices"
            :selected-device="deviceStore.selectedDevice"
            :loading="deviceStore.loading"
            :error="deviceStore.error"
            :online-only="showOnlineOnly"
            @select="deviceStore.selectDevice"
            @terminal="openTerminal"
            @refresh="refreshDevices"
            @toggle-online="showOnlineOnly = $event"
          />
  
          <div v-if="activeTerminal" class="terminal-container">
            <DeviceTerminal
              :device="activeTerminal.device"
              :connection="activeTerminal.connection"
              @close="closeTerminal"
            />
          </div>
        </div>
  
        <div v-if="deviceStore.selectedDevice && !activeTerminal" class="device-details">
          <DeviceDetails :device="deviceStore.selectedDevice" />
        </div>
      </main>
    </div>
  </template>
  
  <script setup>
  import { ref, onMounted, onUnmounted } from 'vue';
  import { useDeviceStore } from '@/stores/deviceStore';
  import DeviceList from '@/components/DeviceList.vue';
  import DeviceTerminal from '@/components/DeviceTerminal.vue';
  import ConnectionStatus from '@/components/ConnectionStatus.vue';
  import DeviceDetails from '@/components/DeviceDetails.vue';
  
  const deviceStore = useDeviceStore();
  const showOnlineOnly = ref(false);
  const activeTerminal = ref(null);
  
  const refreshDevices = () => {
    deviceStore.fetchDevices(showOnlineOnly.value);
  };
  
  const openTerminal = (device) => {
    console.log('openTerminal called with device:', device);
    console.log('Device ID:', device?.deviceId);
    const connection = deviceStore.createTerminalConnection(device.deviceId);
    console.log('Connection received:', connection);
    activeTerminal.value = {
      device,
      connection
    };
    console.log('activeTerminal set:', activeTerminal.value);
  };
  
  const closeTerminal = () => {
    if (activeTerminal.value) {
      deviceStore.closeTerminalConnection(activeTerminal.value.device.deviceId);
      activeTerminal.value = null;
    }
  };
  
  onMounted(() => {
    // Загружаем данные только по кнопке Refresh.
    onUnmounted(() => {
      if (activeTerminal.value) {
        closeTerminal();
      }
    });
  });
  </script>
  
  <style scoped>
  .dashboard {
    min-height: 100vh;
    background-color: #f8fafc;
  }
  
  .dashboard-header {
    background: white;
    border-bottom: 1px solid #e5e7eb;
    padding: 20px;
    display: flex;
    justify-content: space-between;
    align-items: center;
  }
  
  .dashboard-header h1 {
    margin: 0;
    color: #1f2937;
    font-size: 2rem;
    font-weight: 700;
  }
  
  .dashboard-main {
    padding: 20px;
    display: flex;
    gap: 20px;
    max-width: 100vw;
  }
  
  .dashboard-content {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 20px;
    min-width: 0;
  }
  
  .terminal-container {
    min-height: 400px;
  }
  
  .device-details {
    width: 400px;
    flex-shrink: 0;
  }
  
  @media (max-width: 1024px) {
    .dashboard-main {
      flex-direction: column;
    }
    
    .device-details {
      width: 100%;
    }
  }
  </style>