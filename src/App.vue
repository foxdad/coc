<template>
  <div class="game-container">
    <ResourceBar />
    <div class="main-content" :class="{ 'has-upgrades': hasUpgrades, 'sidebar-collapsed': store.sidebarCollapsed }">
      <Sidebar />
      <main class="content-area">
        <OverviewPanel v-if="store.currentMenu === 'overview'" />
        <BuildingsPanel v-else-if="store.currentMenu === 'buildings'" />
        <TroopsPanel v-else-if="store.currentMenu === 'troops'" />
        <ResearchPanel v-else-if="store.currentMenu === 'research'" />
        <HeroesPanel v-else-if="store.currentMenu === 'heroes'" />
        <CampaignPanel v-else-if="store.currentMenu === 'campaign'" />
        <DefensePanel v-else-if="store.currentMenu === 'defense'" />
        <AttackPanel v-else-if="store.currentMenu === 'attack'" />
        <BattleFieldPanel v-else-if="store.currentMenu === 'battlefield'" />
        <ClanCastlePanel v-else-if="store.currentMenu === 'clancastle'" />
        <NeighborPanel v-else-if="store.currentMenu === 'neighbors'" />
        <BattleLogPanel v-else-if="store.currentMenu === 'battlelog'" />
        <ShopPanel v-else-if="store.currentMenu === 'shop'" />
        <SettingsPanel v-else-if="store.currentMenu === 'settings'" />
      </main>
    </div>
    
    <!-- 新手引导 -->
    <TutorialGuide />
  </div>
</template>

<script setup>
import { onMounted, computed } from 'vue'
import { useGameStore } from './stores/gameStore'
import ResourceBar from './components/ResourceBar.vue'
import Sidebar from './components/Sidebar.vue'
import OverviewPanel from './components/OverviewPanel.vue'
import BuildingsPanel from './components/BuildingsPanel.vue'
import TroopsPanel from './components/TroopsPanel.vue'
import DefensePanel from './components/DefensePanel.vue'
import AttackPanel from './components/AttackPanel.vue'
import ShopPanel from './components/ShopPanel.vue'
import ResearchPanel from './components/ResearchPanel.vue'
import SettingsPanel from './components/SettingsPanel.vue'
import HeroesPanel from './components/HeroesPanel.vue'
import CampaignPanel from './components/CampaignPanel.vue'
import BattleFieldPanel from './components/BattleFieldPanel.vue'
import ClanCastlePanel from './components/ClanCastlePanel.vue'
import NeighborPanel from './components/NeighborPanel.vue'
import BattleLogPanel from './components/BattleLogPanel.vue'
import TutorialGuide from './components/TutorialGuide.vue'

const store = useGameStore()

// 检查是否有正在升级的建筑
const hasUpgrades = computed(() => {
  return store.buildings.some(b => b.upgrading)
})

// 应用启动时初始化游戏（加载存档）
onMounted(() => {
  store.initGame()
  
  // 每10秒检查一次：升级完成、训练完成、资源收集、树木生长、建筑工人疲劳、邻邦漂移
  setInterval(() => {
    store.checkUpgrades()
    store.checkTraining()
    store.collectResources()
    store.checkTreeGrowth()
    store.checkBuilderFatigue()
    store.checkNeighborDrift()
    store.checkNeighborGrowth()
    store.updateNeighborStrength()
  }, 10000)
})
</script>

<style scoped>
.game-container {
  min-height: 100vh;
  background: var(--bg-primary);
}

.main-content {
  display: flex;
  padding-top: 70px;
  min-height: calc(100vh - 70px);
}

.main-content.has-upgrades {
  padding-top: 100px;
  min-height: calc(100vh - 100px);
}

.content-area {
  flex: 1;
  padding: 32px 40px;
  margin-left: 200px;
  background: var(--bg-secondary);
  min-height: 100%;
  transition: margin-left 0.3s ease;
}

.main-content.sidebar-collapsed .content-area {
  margin-left: 60px;
}
</style>
