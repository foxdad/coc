<template>
  <aside class="sidebar" :class="{ 'has-upgrades': hasUpgrades, 'collapsed': store.sidebarCollapsed }">
    <!-- 消息按钮 -->
    <div class="message-btn" @click="showMessages = !showMessages" :title="store.sidebarCollapsed ? '消息' : ''">
      <span class="msg-icon" v-html="icons.bell"></span>
      <span class="msg-text" v-show="!store.sidebarCollapsed">消息</span>
      <span class="msg-badge" v-if="store.unreadMessageCount > 0">{{ store.unreadMessageCount > 9 ? '9+' : store.unreadMessageCount }}</span>
    </div>

    <nav class="nav-menu">
      <div 
        v-for="item in menuItems" 
        :key="item.id"
        class="nav-item"
        :class="{ active: store.currentMenu === item.id, locked: item.locked }"
        @click="handleMenuClick(item)"
        :title="store.sidebarCollapsed ? item.name : ''"
      >
        <span class="nav-icon" v-html="item.icon"></span>
        <span class="nav-text" v-show="!store.sidebarCollapsed">{{ item.name }}</span>
        <span class="beta-tag" v-if="item.beta && !store.sidebarCollapsed">测试</span>
        <span class="lock-icon" v-if="item.locked && !store.sidebarCollapsed">🔒</span>
      </div>
    </nav>

    <!-- 消息面板 -->
    <Teleport to="body">
      <Transition name="slide-right">
        <div class="message-panel" v-if="showMessages" :class="{ 'has-upgrades': hasUpgrades, 'collapsed': store.sidebarCollapsed }">
          <div class="msg-panel-header">
            <h3>📬 消息中心</h3>
            <div class="msg-actions">
              <button class="btn-text" @click="store.markAllMessagesRead" v-if="store.unreadMessageCount > 0">全部已读</button>
              <button class="btn-close-msg" @click="showMessages = false">✕</button>
            </div>
          </div>
          <div class="msg-panel-body">
            <div v-if="store.messages.length === 0" class="msg-empty">
              <span class="empty-icon">📭</span>
              <p>暂无消息</p>
            </div>
            <div 
              v-for="msg in store.messages" 
              :key="msg.id" 
              class="msg-item"
              :class="[msg.type, { unread: !msg.read }]"
              @click="handleMessageClick(msg)"
            >
              <div class="msg-dot" v-if="!msg.read"></div>
              <div class="msg-content">
                <div class="msg-title">{{ msg.title }}</div>
                <div class="msg-desc">{{ msg.content }}</div>
                <!-- 捐赠请求操作按钮 -->
                <div class="msg-actions-row" v-if="msg.data?.type === 'donation_request'" @click.stop>
                  <button class="btn-donate" @click="handleDonate(msg)">
                    💰 捐赠 {{ msg.data.amount }} (+{{ msg.data.reward }}好感)
                  </button>
                  <button class="btn-reject" @click="handleRejectDonate(msg)">
                    ❌ 拒绝
                  </button>
                </div>
                <div class="msg-time">{{ formatTime(msg.time) }}</div>
              </div>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>
    
    <!-- 解锁提示弹窗 -->
    <Teleport to="body">
      <Transition name="modal">
        <div class="unlock-modal" v-if="showUnlockTip" @click="showUnlockTip = false">
          <div class="unlock-card" @click.stop>
            <div class="unlock-header">
              <div class="unlock-icon-wrapper">
                <span class="unlock-icon">🔒</span>
              </div>
              <button class="btn-x" @click="showUnlockTip = false">✕</button>
            </div>
            <div class="unlock-body">
              <h3>{{ unlockTipData.title }}</h3>
              <p>{{ unlockTipData.message }}</p>
              <div class="unlock-hint">
                <span class="hint-icon">💡</span>
                <span>升级大本营或建造相关建筑来解锁此功能</span>
              </div>
            </div>
            <div class="unlock-footer">
              <button class="btn-primary" @click="showUnlockTip = false">我知道了</button>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>
    
    <!-- 底部操作区 -->
    <div class="sidebar-footer">
      <!-- 主题切换 -->
      <div class="theme-toggle" @click="store.toggleTheme" :title="store.sidebarCollapsed ? (store.themeMode === 'light' ? '浅色模式' : '深色模式') : ''">
        <span class="theme-icon" v-html="themeIcon"></span>
        <span class="theme-text" v-show="!store.sidebarCollapsed">{{ store.themeMode === 'light' ? '浅色模式' : '深色模式' }}</span>
      </div>
      
      <!-- 收缩按钮 -->
      <div class="collapse-toggle" @click="store.toggleSidebar" :title="store.sidebarCollapsed ? '展开菜单' : '收起菜单'">
        <span class="collapse-icon" v-html="collapseIcon"></span>
        <span class="collapse-text" v-show="!store.sidebarCollapsed">收起菜单</span>
      </div>
    </div>
    
    <!-- Toast 提示 -->
    <Teleport to="body">
      <Transition name="toast">
        <div class="sidebar-toast" v-if="toastMessage" :class="toastType">{{ toastMessage }}</div>
      </Transition>
    </Teleport>
  </aside>
</template>

<script setup>
import { computed, ref } from 'vue'
import { useGameStore } from '../stores/gameStore'

const store = useGameStore()

// 消息面板
const showMessages = ref(false)

// 解锁提示弹窗
const showUnlockTip = ref(false)
const unlockTipData = ref({ title: '', message: '' })

// 检查是否有实验室
const hasLaboratory = computed(() => store.buildings.some((b) => b.type === 'laboratory'))

// 格式化时间
function formatTime(timestamp) {
  const now = Date.now()
  const diff = now - timestamp
  if (diff < 60000) return '刚刚'
  if (diff < 3600000) return `${Math.floor(diff / 60000)}分钟前`
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}小时前`
  return `${Math.floor(diff / 86400000)}天前`
}

// 处理消息点击
function handleMessageClick(msg) {
  store.markMessageRead(msg.id)
  // 如果是入侵消息，跳转到防御面板
  if (msg.data?.type === 'invasion') {
    store.setMenu('defense')
    showMessages.value = false
  }
  // 如果是捐赠请求，跳转到邻邦面板
  if (msg.data?.type === 'donation_request') {
    store.setMenu('neighbors')
  }
}

// Toast 提示
const toastMessage = ref('')
const toastType = ref('success')

function showToast(message, type = 'success') {
  toastMessage.value = message
  toastType.value = type
  setTimeout(() => { toastMessage.value = '' }, 3000)
}

// 处理捐赠
function handleDonate(msg) {
  const result = store.fulfillDonationRequest(msg.data.requestId)
  if (result.success) {
    showToast(result.message, 'success')
    store.markMessageRead(msg.id)
    // 从消息列表中移除该消息
    const index = store.messages.findIndex(m => m.id === msg.id)
    if (index > -1) store.messages.splice(index, 1)
  } else {
    showToast(result.message, 'error')
  }
}

// 处理拒绝捐赠
function handleRejectDonate(msg) {
  const result = store.rejectDonationRequest(msg.data.requestId)
  if (result.success) {
    showToast(result.message, 'warning')
    store.markMessageRead(msg.id)
    // 从消息列表中移除该消息
    const index = store.messages.findIndex(m => m.id === msg.id)
    if (index > -1) store.messages.splice(index, 1)
  }
}

// 图标SVG
const icons = {
  bell: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>',
  overview: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>',
  buildings: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="4" y="2" width="16" height="20" rx="2"/><path d="M9 22v-4h6v4"/><path d="M8 6h.01"/><path d="M16 6h.01"/><path d="M12 6h.01"/><path d="M12 10h.01"/><path d="M12 14h.01"/><path d="M16 10h.01"/><path d="M16 14h.01"/><path d="M8 10h.01"/><path d="M8 14h.01"/></svg>',
  troops: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/><path d="M12 18v-6"/><path d="M9 15l3 3 3-3"/></svg>',
  research: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 3h6v2H9z"/><path d="M10 5v6l-3 8h10l-3-8V5"/><circle cx="12" cy="17" r="1"/></svg>',
  heroes: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>',
  campaign: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/><line x1="4" y1="22" x2="4" y2="15"/></svg>',
  dungeon: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>',
  defense: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>',
  attack: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></svg>',
  battlefield: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="3" y1="15" x2="21" y2="15"/><line x1="9" y1="3" x2="9" y2="21"/><line x1="15" y1="3" x2="15" y2="21"/></svg>',
  clancastle: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 21h18"/><path d="M5 21V7l7-4 7 4v14"/><path d="M9 21v-6h6v6"/><path d="M9 9h.01"/><path d="M15 9h.01"/><path d="M9 13h.01"/><path d="M15 13h.01"/></svg>',
  neighbors: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>',
  shop: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 0 1-8 0"/></svg>',
  settings: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>',
  battlelog: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>',
  sun: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>',
  moon: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>',
  chevronLeft: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="15 18 9 12 15 6"/></svg>',
  chevronRight: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 18 15 12 9 6"/></svg>'
}

// 主题图标
const themeIcon = computed(() => {
  return store.themeMode === 'light' ? icons.sun : icons.moon
})

// 收缩图标
const collapseIcon = computed(() => {
  return store.sidebarCollapsed ? icons.chevronRight : icons.chevronLeft
})

const menuItems = computed(() => {
  return [
    { id: 'overview', name: '村庄总览', icon: icons.overview, locked: false },
    { id: 'buildings', name: '建筑管理', icon: icons.buildings, locked: false },
    { id: 'troops', name: '训练部队', icon: icons.troops, locked: false },
    { id: 'research', name: '研究升级', icon: icons.research, locked: !hasLaboratory.value, unlockMsg: '需要建造实验室（3本解锁）' },
    { id: 'heroes', name: '英雄', icon: icons.heroes, locked: store.townHallLevel < 7, unlockMsg: '需要 7 级大本营解锁' },
    { id: 'clancastle', name: '部落城堡', icon: icons.clancastle, locked: store.townHallLevel < 5, unlockMsg: '需要 5 级大本营解锁' },
    { id: 'neighbors', name: '边境邻邦', icon: icons.neighbors, locked: store.townHallLevel < 3, unlockMsg: '需要 3 级大本营解锁' },
    { id: 'battlelog', name: '战斗日志', icon: icons.battlelog, locked: store.townHallLevel < 3, unlockMsg: '需要 3 级大本营解锁' },
    { id: 'campaign', name: '哥布林副本', icon: icons.campaign, locked: false },
    { id: 'defense', name: '防御布局', icon: icons.defense, locked: false },
    { id: 'attack', name: '进攻掠夺', icon: icons.attack, locked: false },
    { id: 'battlefield', name: '排兵布阵', icon: icons.battlefield, locked: false, beta: true },
    { id: 'shop', name: '商店', icon: icons.shop, locked: false },
    { id: 'settings', name: '设置', icon: icons.settings, locked: false }
  ]
})

// 处理菜单点击
function handleMenuClick(item) {
  if (item.locked) {
    unlockTipData.value = {
      title: item.name,
      message: item.unlockMsg || '该功能暂未解锁'
    }
    showUnlockTip.value = true
  } else {
    store.setMenu(item.id)
  }
}

// 检查是否有正在升级的建筑/研究/训练（与 ResourceBar 的升级条显示逻辑一致）
const hasUpgrades = computed(() => {
  const hasBuilding = store.buildings.some(b => b.upgrading)
  const hasResearch = !!store.currentResearch
  const hasTraining = store.trainingQueue && store.trainingQueue.length > 0
  const hasClanCastle = store.upgradeQueue && store.upgradeQueue.some(q => q.buildingId === 'clancastle')
  return hasBuilding || hasResearch || hasTraining || hasClanCastle
})
</script>

<style scoped>
.sidebar {
  position: fixed;
  left: 0;
  top: 70px;
  bottom: 0;
  width: 200px;
  background: var(--bg-secondary);
  border-right: 1px solid var(--border-color);
  padding: 8px 0 16px;
  display: flex;
  flex-direction: column;
  transition: all 0.3s ease;
}

/* 消息按钮 */
.message-btn {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 20px;
  margin: 0 8px 8px;
  cursor: pointer;
  font-size: 14px;
  color: var(--text-secondary);
  background: var(--hover-bg);
  border-radius: 10px;
  transition: all 0.2s;
  position: relative;
}
.sidebar.collapsed .message-btn {
  padding: 10px 0;
  margin: 0 8px 8px;
  justify-content: center;
}
.message-btn:hover {
  background: var(--bg-card);
  color: var(--text-primary);
}
.msg-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 20px;
  flex-shrink: 0;
}
.msg-text { flex: 1; }
.msg-badge {
  position: absolute;
  top: 4px;
  right: 8px;
  min-width: 18px;
  height: 18px;
  padding: 0 5px;
  background: #ef4444;
  color: white;
  font-size: 11px;
  font-weight: 600;
  border-radius: 9px;
  display: flex;
  align-items: center;
  justify-content: center;
  animation: pulse 2s infinite;
}
.sidebar.collapsed .msg-badge {
  top: 2px;
  right: 4px;
}
@keyframes pulse {
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.1); }
}

/* 消息面板 */
.message-panel {
  position: fixed;
  top: 70px;
  left: 200px;
  width: 360px;
  max-height: calc(100vh - 90px);
  background: var(--bg-card);
  border-radius: 0 12px 12px 0;
  box-shadow: 4px 0 24px rgba(0, 0, 0, 0.15);
  z-index: 1000;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  transition: all 0.3s ease;
}
.message-panel.has-upgrades {
  top: 100px;
  max-height: calc(100vh - 120px);
}
.message-panel.collapsed {
  left: 60px;
}
.msg-panel-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px;
  border-bottom: 1px solid var(--border-color);
  background: var(--bg-secondary);
}
.msg-panel-header h3 {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
  color: var(--text-primary);
}
.msg-actions {
  display: flex;
  align-items: center;
  gap: 12px;
}
.btn-text {
  background: none;
  border: none;
  color: #3b82f6;
  font-size: 13px;
  cursor: pointer;
  padding: 4px 8px;
  border-radius: 4px;
}
.btn-text:hover { background: rgba(59, 130, 246, 0.1); }
.btn-close-msg {
  width: 28px;
  height: 28px;
  border: none;
  background: var(--hover-bg);
  color: var(--text-secondary);
  border-radius: 6px;
  font-size: 14px;
  cursor: pointer;
}
.btn-close-msg:hover { background: var(--bg-card); }

.msg-panel-body {
  flex: 1;
  overflow-y: auto;
  padding: 8px;
}
.msg-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 48px 20px;
  color: var(--text-secondary);
}
.empty-icon { font-size: 48px; margin-bottom: 12px; opacity: 0.5; }
.msg-empty p { margin: 0; font-size: 14px; }

.msg-item {
  display: flex;
  gap: 12px;
  padding: 12px 16px;
  border-radius: 10px;
  cursor: pointer;
  transition: all 0.2s;
  position: relative;
  margin-bottom: 4px;
}
.msg-item:hover { background: var(--hover-bg); }
.msg-item.unread { background: rgba(59, 130, 246, 0.05); }
.msg-item.danger { border-left: 3px solid #ef4444; }
.msg-item.warning { border-left: 3px solid #f59e0b; }
.msg-item.success { border-left: 3px solid #22c55e; }
.msg-item.info { border-left: 3px solid #3b82f6; }

.msg-dot {
  position: absolute;
  top: 16px;
  left: 8px;
  width: 8px;
  height: 8px;
  background: #3b82f6;
  border-radius: 50%;
}
.msg-content { flex: 1; min-width: 0; }
.msg-title {
  font-size: 14px;
  font-weight: 600;
  color: var(--text-primary);
  margin-bottom: 4px;
}
.msg-desc {
  font-size: 13px;
  color: var(--text-secondary);
  line-height: 1.4;
  margin-bottom: 6px;
}
.msg-time {
  font-size: 11px;
  color: var(--text-secondary);
  opacity: 0.7;
}

.msg-panel-footer {
  padding: 12px 16px;
  border-top: 1px solid var(--border-color);
}
.btn-clear {
  width: 100%;
  padding: 10px;
  background: var(--hover-bg);
  border: none;
  border-radius: 8px;
  color: var(--text-secondary);
  font-size: 13px;
  cursor: pointer;
  transition: all 0.2s;
}
.btn-clear:hover { background: var(--bg-secondary); color: var(--text-primary); }

/* 消息面板动画 */
.slide-right-enter-active,
.slide-right-leave-active {
  transition: all 0.3s ease;
}
.slide-right-enter-from,
.slide-right-leave-to {
  opacity: 0;
  transform: translateX(-20px);
}

.sidebar.collapsed {
  width: 60px;
}

.sidebar.has-upgrades {
  top: 100px;
}

.nav-menu {
  flex: 1;
  overflow-y: auto;
}

.nav-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 20px;
  cursor: pointer;
  font-size: 15px;
  color: var(--text-secondary);
  border-left: 3px solid transparent;
  transition: all 0.2s;
  white-space: nowrap;
}

.sidebar.collapsed .nav-item {
  padding: 12px 0;
  justify-content: center;
  border-left: none;
}

.nav-item:hover {
  background: var(--hover-bg);
  color: var(--text-primary);
}

.nav-item.active {
  background: var(--hover-bg);
  border-left-color: var(--text-primary);
  color: var(--text-primary);
  font-weight: 500;
}

.sidebar.collapsed .nav-item.active {
  border-left-color: transparent;
  background: var(--hover-bg);
}

.nav-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 20px;
  flex-shrink: 0;
}

.nav-text {
  flex: 1;
  overflow: hidden;
}

/* 底部操作区 */
.sidebar-footer {
  border-top: 1px solid var(--border-color);
}

/* 主题切换 */
.theme-toggle,
.collapse-toggle {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 20px;
  cursor: pointer;
  font-size: 14px;
  color: var(--text-secondary);
  transition: all 0.2s;
  white-space: nowrap;
}

.sidebar.collapsed .theme-toggle,
.sidebar.collapsed .collapse-toggle {
  padding: 12px 0;
  justify-content: center;
}

.theme-toggle:hover,
.collapse-toggle:hover {
  background: var(--hover-bg);
  color: var(--text-primary);
}

.theme-icon,
.collapse-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 20px;
  flex-shrink: 0;
}

.theme-text,
.collapse-text {
  flex: 1;
  overflow: hidden;
}

/* 锁定状态 */
.nav-item.locked {
  opacity: 0.5;
}

.nav-item.locked:hover {
  background: var(--hover-bg);
}

.lock-icon {
  font-size: 12px;
  margin-left: auto;
}

.beta-tag {
  font-size: 10px;
  background: #ff9800;
  color: white;
  padding: 2px 6px;
  border-radius: 4px;
  margin-left: auto;
  font-weight: 500;
}

/* 解锁提示弹窗 */
.unlock-modal {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.6);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9999;
}

.unlock-card {
  background: var(--bg-card);
  border-radius: 20px;
  width: 90%;
  max-width: 360px;
  box-shadow: 0 25px 80px rgba(0, 0, 0, 0.4);
  overflow: hidden;
}

.unlock-header {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  padding: 24px 20px;
  position: relative;
  display: flex;
  justify-content: center;
}

.unlock-icon-wrapper {
  width: 72px;
  height: 72px;
  background: rgba(255, 255, 255, 0.2);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  backdrop-filter: blur(10px);
}

.unlock-icon {
  font-size: 36px;
}

.btn-x {
  position: absolute;
  top: 12px;
  right: 12px;
  width: 28px;
  height: 28px;
  border: none;
  background: rgba(255, 255, 255, 0.2);
  color: white;
  border-radius: 50%;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  justify-content: center;
}

.btn-x:hover {
  background: rgba(255, 255, 255, 0.3);
  transform: scale(1.1);
}

.unlock-body {
  padding: 24px 24px 16px;
  text-align: center;
}

.unlock-body h3 {
  font-size: 20px;
  font-weight: 600;
  color: var(--text-primary);
  margin: 0 0 8px;
}

.unlock-body p {
  font-size: 15px;
  color: var(--text-secondary);
  margin: 0 0 16px;
  line-height: 1.5;
}

.unlock-hint {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  background: var(--hover-bg);
  padding: 12px 16px;
  border-radius: 12px;
  text-align: left;
}

.hint-icon {
  font-size: 16px;
  flex-shrink: 0;
}

.unlock-hint span:last-child {
  font-size: 13px;
  color: var(--text-secondary);
  line-height: 1.4;
}

.unlock-footer {
  padding: 16px 24px 24px;
}

.btn-primary {
  width: 100%;
  padding: 14px 24px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border: none;
  border-radius: 12px;
  font-size: 15px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-primary:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
}

.btn-primary:active {
  transform: translateY(0);
}

/* 弹窗动画 */
.modal-enter-active,
.modal-leave-active {
  transition: all 0.25s ease;
}

.modal-enter-from,
.modal-leave-to {
  opacity: 0;
}

.modal-enter-from .unlock-card,
.modal-leave-to .unlock-card {
  transform: scale(0.9) translateY(20px);
}

.modal-enter-active .unlock-card,
.modal-leave-active .unlock-card {
  transition: all 0.25s ease;
}

/* 捐赠请求按钮 */
.msg-actions-row {
  display: flex;
  gap: 8px;
  margin-top: 8px;
}
.btn-donate {
  flex: 1;
  padding: 8px 12px;
  background: linear-gradient(135deg, #22c55e 0%, #16a34a 100%);
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}
.btn-donate:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(34, 197, 94, 0.3);
}
.btn-reject {
  padding: 8px 12px;
  background: var(--hover-bg);
  color: var(--text-secondary);
  border: 1px solid var(--border-color);
  border-radius: 8px;
  font-size: 12px;
  cursor: pointer;
  transition: all 0.2s;
}
.btn-reject:hover {
  background: rgba(239, 68, 68, 0.1);
  border-color: #ef4444;
  color: #ef4444;
}

/* Toast 提示 */
.sidebar-toast {
  position: fixed;
  bottom: 24px;
  left: 50%;
  transform: translateX(-50%);
  padding: 12px 24px;
  border-radius: 10px;
  font-size: 14px;
  font-weight: 500;
  z-index: 9999;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.2);
}
.sidebar-toast.success { background: #22c55e; color: white; }
.sidebar-toast.error { background: #dc2626; color: white; }
.sidebar-toast.warning { background: #f59e0b; color: white; }

.toast-enter-active, .toast-leave-active { transition: all 0.3s ease; }
.toast-enter-from, .toast-leave-to { opacity: 0; transform: translateX(-50%) translateY(20px); }
</style>
