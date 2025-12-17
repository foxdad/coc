<template>
  <aside class="sidebar" :class="{ 'has-upgrades': hasUpgrades, 'collapsed': store.sidebarCollapsed }">
    <nav class="nav-menu">
      <div 
        v-for="item in menuItems" 
        :key="item.id"
        class="nav-item"
        :class="{ active: store.currentMenu === item.id }"
        @click="store.setMenu(item.id)"
        :title="store.sidebarCollapsed ? item.name : ''"
      >
        <span class="nav-icon" v-html="item.icon"></span>
        <span class="nav-text" v-show="!store.sidebarCollapsed">{{ item.name }}</span>
      </div>
    </nav>
    
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
  </aside>
</template>

<script setup>
import { computed } from 'vue'
import { useGameStore } from '../stores/gameStore'

const store = useGameStore()

// 检查是否有实验室
const hasLaboratory = computed(() => store.buildings.some((b) => b.type === 'laboratory'))

// 图标SVG
const icons = {
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
  shop: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 0 1-8 0"/></svg>',
  settings: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>',
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
  const items = [
    { id: 'overview', name: '村庄总览', icon: icons.overview },
    { id: 'buildings', name: '建筑管理', icon: icons.buildings },
    { id: 'troops', name: '训练部队', icon: icons.troops },
  ]
  if (hasLaboratory.value) {
    items.push({ id: 'research', name: '研究升级', icon: icons.research })
  }
  // 7本解锁英雄功能
  if (store.townHallLevel >= 7) {
    items.push({ id: 'heroes', name: '英雄', icon: icons.heroes })
  }
  items.push(
    { id: 'campaign', name: '哥布林副本', icon: icons.campaign },
    { id: 'defense', name: '防御布局', icon: icons.defense },
    { id: 'attack', name: '进攻掠夺', icon: icons.attack },
    { id: 'battlefield', name: '排兵布阵', icon: icons.battlefield },
    { id: 'shop', name: '商店', icon: icons.shop },
    { id: 'settings', name: '设置', icon: icons.settings }
  )
  return items
})

// 检查是否有正在升级的建筑
const hasUpgrades = computed(() => store.buildings.some(b => b.upgrading))
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
  padding: 16px 0;
  display: flex;
  flex-direction: column;
  transition: all 0.3s ease;
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
</style>
