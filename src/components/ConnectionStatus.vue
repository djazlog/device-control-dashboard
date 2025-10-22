<template>
  <div class="connection-status">
    <div :class="['status-indicator', statusClass]">
      <div class="status-dot"></div>
      <span class="status-text">{{ statusText }}</span>
    </div>
    <div v-if="lastConnected" class="last-connected">
      Last connected: {{ formatTime(lastConnected) }}
    </div>
  </div>
</template>

<script setup>
import { computed, ref, onMounted } from 'vue';
import { useDeviceStore } from '@/stores/deviceStore';

const deviceStore = useDeviceStore();
const isConnected = ref(false);
const isConnecting = ref(false);

// Проверяем подключение при монтировании компонента
onMounted(async () => {
  isConnecting.value = true;
  try {
    isConnected.value = await deviceStore.checkConnection();
  } catch (error) {
    console.error('Connection check failed:', error);
    isConnected.value = false;
  } finally {
    isConnecting.value = false;
  }
});

const statusClass = computed(() => {
  if (isConnected.value) {
    return 'connected';
  } else if (isConnecting.value) {
    return 'connecting';
  } else {
    return 'disconnected';
  }
});

const statusText = computed(() => {
  if (isConnected.value) {
    return 'Connected';
  } else if (isConnecting.value) {
    return 'Connecting...';
  } else {
    return 'Disconnected';
  }
});

const lastConnected = computed(() => {
  return new Date().toLocaleString();
});

function formatTime(timestamp) {
  if (!timestamp) return 'Never';
  const date = new Date(timestamp);
  return date.toLocaleString();
}
</script>

<style scoped>
.connection-status {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 4px;
}

.status-indicator {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  border-radius: 6px;
  font-size: 14px;
  font-weight: 500;
}

.status-indicator.connected {
  background-color: #dcfce7;
  color: #166534;
}

.status-indicator.connecting {
  background-color: #fef3c7;
  color: #92400e;
}

.status-indicator.disconnected {
  background-color: #fee2e2;
  color: #991b1b;
}

.status-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background-color: currentColor;
}

.status-indicator.connecting .status-dot {
  animation: pulse 1.5s ease-in-out infinite;
}

@keyframes pulse {
  0%, 100% {
    opacity: 1;
  }
  50% {
    opacity: 0.5;
  }
}

.last-connected {
  font-size: 12px;
  color: #6b7280;
}
</style>
