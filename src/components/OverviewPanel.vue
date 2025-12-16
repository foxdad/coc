<template>
  <div class="panel">
    <h2 class="panel-title">村庄总览</h2>

    <!-- 大本营主卡片 -->
    <div class="main-card">
      <div class="main-card-header">
        <div class="th-badge">
          <span class="th-level">{{ store.townHallLevel }}</span>
          <span class="th-label">本</span>
        </div>
        <div class="th-info">
          <h3>大本营</h3>
          <div class="th-stats">
            <span class="th-stat">生命值 {{ townHallHP }}</span>
            <span class="th-stat-divider">|</span>
            <span class="th-stat">建筑工人 {{ store.freeBuilders }}/{{ store.builders.length }}</span>
          </div>
        </div>
      </div>

      <!-- 大本营升级信息 -->
      <div class="th-upgrade-section" v-if="store.townHallLevel < 9">
        <div class="upgrade-header">
          <span class="upgrade-label">升级到 {{ store.townHallLevel + 1 }} 本</span>
          <span class="upgrade-time">{{ formatUpgradeTime(getUpgradeTime()) }}</span>
        </div>
        <div class="upgrade-cost-row">
          <div class="cost-item" :class="{ enough: store.gold >= upgradeCost }">
            <span class="cost-label">需要金币</span>
            <span class="cost-value">{{ formatNumber(upgradeCost) }}</span>
          </div>
          <button
            class="btn btn-upgrade"
            :disabled="store.gold < upgradeCost || store.freeBuilders <= 0"
            @click="upgradeTownHall"
          >
            {{ store.freeBuilders <= 0 ? '无空闲工人' : '升级' }}
          </button>
        </div>
      </div>
      <div class="th-maxed" v-else>已达到最高等级</div>
    </div>

    <!-- 资源产出统计 -->
    <div class="section">
      <h3 class="section-title">资源产出</h3>
      <div class="production-grid">
        <div class="production-card">
          <div class="production-icon gold-icon">金</div>
          <div class="production-info">
            <div class="production-label">金币产量</div>
            <div class="production-value">+{{ store.goldProductionPerMinute }}/分钟</div>
          </div>
          <div class="production-buildings">{{ goldMineCount }} 座金矿</div>
        </div>
        <div class="production-card">
          <div class="production-icon elixir-icon">圣</div>
          <div class="production-info">
            <div class="production-label">圣水产量</div>
            <div class="production-value">+{{ store.elixirProductionPerMinute }}/分钟</div>
          </div>
          <div class="production-buildings">{{ elixirCollectorCount }} 座收集器</div>
        </div>
        <div class="production-card" v-if="store.townHallLevel >= 7">
          <div class="production-icon dark-icon">暗</div>
          <div class="production-info">
            <div class="production-label">暗黑产量</div>
            <div class="production-value">+{{ store.darkProductionPerMinute }}/分钟</div>
          </div>
          <div class="production-buildings">{{ darkDrillCount }} 座钻井</div>
        </div>
      </div>
    </div>

    <!-- 村庄统计 -->
    <div class="section">
      <h3 class="section-title">村庄统计</h3>
      <div class="stats-grid">
        <div class="stat-item">
          <div class="stat-number">{{ totalBuildings }}</div>
          <div class="stat-label">建筑总数</div>
        </div>
        <div class="stat-item">
          <div class="stat-number">{{ defenseBuildings }}</div>
          <div class="stat-label">防御建筑</div>
        </div>
        <div class="stat-item">
          <div class="stat-number">{{ resourceBuildings }}</div>
          <div class="stat-label">资源建筑</div>
        </div>
        <div class="stat-item">
          <div class="stat-number">{{ store.armyCapacity }}</div>
          <div class="stat-label">军队容量</div>
        </div>
      </div>
    </div>

    <!-- 村庄树木 -->
    <div class="section">
      <h3 class="section-title">
        <span>村庄树木</span>
        <span class="tree-count">{{ store.trees.length }}/10</span>
      </h3>
      <div class="trees-area" v-if="store.trees.length > 0">
        <div v-for="tree in store.trees" :key="tree.id" class="tree-item">
          <div class="tree-icon">{{ getTreeIcon(tree.type) }}</div>
          <div class="tree-info">
            <span class="tree-name">{{ tree.type }}</span>
          </div>
          <button 
            class="btn-remove-tree" 
            @click="handleRemoveTree(tree.id)"
            :disabled="store.elixir < 100"
          >
            挖掉 (100圣水)
          </button>
        </div>
      </div>
      <div class="trees-empty" v-else>
        <p>村庄里暂时没有树木</p>
        <p class="trees-hint">树木会随时间自动生长，挖掉有几率获得宝石</p>
      </div>
      
      <!-- 挖树结果提示 -->
      <div class="tree-result" v-if="treeResult" :class="treeResult.gemsGained > 0 ? 'success' : 'normal'">
        {{ treeResult.message }}
      </div>
    </div>

    <!-- 快捷操作 -->
    <div class="section">
      <h3 class="section-title">快捷操作</h3>
      <div class="quick-actions">
        <button class="quick-btn" @click="store.setMenu('buildings')">
          <span class="quick-icon">建</span>
          <span class="quick-text">建筑管理</span>
        </button>
        <button class="quick-btn" @click="store.setMenu('troops')">
          <span class="quick-icon">兵</span>
          <span class="quick-text">训练部队</span>
        </button>
        <button class="quick-btn" @click="store.setMenu('attack')">
          <span class="quick-icon">攻</span>
          <span class="quick-text">发起进攻</span>
        </button>
        <button class="quick-btn" @click="store.setMenu('defense')">
          <span class="quick-icon">防</span>
          <span class="quick-text">防御布局</span>
        </button>
      </div>
    </div>

    <!-- 下一级解锁内容 -->
    <div class="section" v-if="nextUnlocks.length > 0">
      <h3 class="section-title">
        <span>{{ store.townHallLevel + 1 }} 本解锁内容</span>
      </h3>
      <div class="unlock-list">
        <div class="unlock-item" v-for="item in nextUnlocks" :key="item.name">
          <span class="unlock-icon">{{ item.icon }}</span>
          <span class="unlock-name">{{ item.name }}</span>
          <span class="unlock-type">{{ item.type }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, ref, onMounted, onUnmounted } from 'vue'
import { useGameStore } from '../stores/gameStore'

const store = useGameStore()

// 树木结果提示
const treeResult = ref(null)
let treeResultTimer = null
let treeGrowthTimer = null

onMounted(() => {
  // 每分钟检查树木生长
  treeGrowthTimer = setInterval(() => {
    store.checkTreeGrowth()
  }, 60000)
  // 初始检查一次
  store.checkTreeGrowth()
})

onUnmounted(() => {
  if (treeGrowthTimer) clearInterval(treeGrowthTimer)
  if (treeResultTimer) clearTimeout(treeResultTimer)
})

function getTreeIcon(type) {
  const icons = {
    '橡树': '🌳',
    '松树': '🌲',
    '灌木': '🌿',
    '蘑菇': '🍄',
    '石头': '🪨',
    '宝箱树': '🎄'
  }
  return icons[type] || '🌳'
}

function handleRemoveTree(treeId) {
  const result = store.removeTree(treeId)
  treeResult.value = result
  
  // 3秒后清除提示
  if (treeResultTimer) clearTimeout(treeResultTimer)
  treeResultTimer = setTimeout(() => {
    treeResult.value = null
  }, 3000)
}

const townHallHP = computed(() => {
  const hpList = [450, 1600, 1850, 2100, 2400, 2800, 3300, 3900, 4600]
  return hpList[store.townHallLevel - 1]
})

const upgradeCost = computed(() => {
  const costs = [1000, 4000, 25000, 150000, 750000, 1000000, 2000000, 3000000]
  return costs[store.townHallLevel - 1] || 0
})

function getUpgradeTime() {
  const times = [10, 10, 450, 900, 1800, 2700, 3600, 7200]
  return times[store.townHallLevel - 1] || 0
}

const goldMineCount = computed(() => {
  const mine = store.buildings.find((b) => b.type === 'goldmine')
  return mine ? mine.count || 1 : 0
})

const elixirCollectorCount = computed(() => {
  const collector = store.buildings.find((b) => b.type === 'elixircollector')
  return collector ? collector.count || 1 : 0
})

const darkDrillCount = computed(() => {
  const drill = store.buildings.find((b) => b.type === 'darkelixirdrill')
  return drill ? drill.count || 1 : 0
})

const totalBuildings = computed(() => store.buildings.reduce((sum, b) => sum + (b.count || 1), 0))

const defenseBuildings = computed(() => {
  const defenseTypes = ['cannon', 'archertower', 'mortar', 'airdefense', 'wizardtower']
  return store.buildings
    .filter((b) => defenseTypes.includes(b.type))
    .reduce((sum, b) => sum + (b.count || 1), 0)
})

const resourceBuildings = computed(() => {
  const resourceTypes = ['goldmine', 'elixircollector', 'goldstorage', 'elixirstorage']
  return store.buildings
    .filter((b) => resourceTypes.includes(b.type))
    .reduce((sum, b) => sum + (b.count || 1), 0)
})

const nextUnlocks = computed(() => {
  const unlocks = {
    2: [
      { name: '箭塔', type: '防御', icon: '箭' },
      { name: '城墙', type: '防御', icon: '墙' },
      { name: '哥布林', type: '兵种', icon: '哥' },
    ],
    3: [
      { name: '迫击炮', type: '防御', icon: '迫' },
      { name: '实验室', type: '功能', icon: '实' },
      { name: '炸弹人', type: '兵种', icon: '炸' },
    ],
    4: [
      { name: '防空火箭', type: '防御', icon: '防' },
      { name: '法术工厂', type: '功能', icon: '法' },
      { name: '气球兵', type: '兵种', icon: '气' },
    ],
    5: [
      { name: '法师塔', type: '防御', icon: '塔' },
      { name: '部落城堡', type: '功能', icon: '城' },
      { name: '法师', type: '兵种', icon: '师' },
    ],
    6: [
      { name: '空气炮', type: '防御', icon: '空' },
      { name: '天使', type: '兵种', icon: '天' },
      { name: '治疗法术', type: '法术', icon: '治' },
    ],
    7: [
      { name: '暗黑重油', type: '资源', icon: '暗' },
      { name: '野蛮人之王', type: '英雄', icon: '王' },
      { name: '飞龙', type: '兵种', icon: '龙' },
    ],
    8: [
      { name: '炸弹塔', type: '防御', icon: '弹' },
      { name: '皮卡超人', type: '兵种', icon: '皮' },
      { name: '戈仑石人', type: '兵种', icon: '戈' },
    ],
    9: [
      { name: 'X连弩', type: '防御', icon: 'X' },
      { name: '弓箭女皇', type: '英雄', icon: '皇' },
      { name: '熔岩猎犬', type: '兵种', icon: '熔' },
    ],
  }
  return unlocks[store.townHallLevel + 1] || []
})

function formatNumber(num) {
  if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M'
  if (num >= 1000) return (num / 1000).toFixed(0) + 'K'
  return num.toString()
}

function formatUpgradeTime(seconds) {
  if (seconds < 60) return `${seconds}秒`
  if (seconds < 3600) {
    const mins = Math.floor(seconds / 60)
    return `${mins}分钟`
  }
  const hours = Math.floor(seconds / 3600)
  return `${hours}小时`
}

function upgradeTownHall() {
  if (store.spendGold(upgradeCost.value) && store.freeBuilders > 0) {
    const townhall = store.buildings.find((b) => b.type === 'townhall')
    if (townhall) {
      store.startUpgrade(townhall)
    }
  }
}
</script>

<style scoped>
.panel-title {
  font-size: 24px;
  font-weight: 600;
  margin-bottom: 24px;
  color: var(--text-primary);
}

.section {
  margin-bottom: 28px;
}

.section-title {
  font-size: 15px;
  font-weight: 500;
  color: var(--text-secondary);
  margin-bottom: 12px;
  display: flex;
  align-items: center;
  gap: 8px;
}

/* 大本营主卡片 */
.main-card {
  background: linear-gradient(135deg, #333 0%, #555 100%);
  border-radius: 16px;
  padding: 24px;
  color: #fff;
  margin-bottom: 28px;
}

.main-card-header {
  display: flex;
  align-items: center;
  gap: 20px;
  margin-bottom: 20px;
}

.th-badge {
  width: 72px;
  height: 72px;
  background: rgba(255, 255, 255, 0.15);
  border-radius: 16px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}

.th-level {
  font-size: 32px;
  font-weight: 700;
  line-height: 1;
}

.th-label {
  font-size: 14px;
  opacity: 0.8;
}

.th-info h3 {
  font-size: 22px;
  font-weight: 600;
  margin-bottom: 6px;
}

.th-stats {
  display: flex;
  align-items: center;
  gap: 12px;
  font-size: 14px;
  opacity: 0.85;
}

.th-stat-divider {
  opacity: 0.4;
}

.th-upgrade-section {
  background: rgba(255, 255, 255, 0.1);
  border-radius: 12px;
  padding: 16px;
}

.upgrade-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.upgrade-label {
  font-size: 15px;
  font-weight: 500;
}

.upgrade-time {
  font-size: 13px;
  opacity: 0.7;
}

.upgrade-cost-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.cost-item {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.cost-label {
  font-size: 12px;
  opacity: 0.7;
}

.cost-value {
  font-size: 20px;
  font-weight: 600;
  color: #ffcc00;
}

.cost-item.enough .cost-value {
  color: #8bc34a;
}

.btn-upgrade {
  padding: 10px 28px;
  background: #fff;
  color: #333;
  border: none;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-upgrade:hover:not(:disabled) {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
}

.btn-upgrade:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.th-maxed {
  text-align: center;
  padding: 12px;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 8px;
  font-size: 14px;
  opacity: 0.8;
}

/* 资源产出 */
.production-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 12px;
}

.production-card {
  background: var(--bg-card);
  border: 1px solid var(--border-light);
  border-radius: 12px;
  padding: 16px;
  display: flex;
  align-items: center;
  gap: 14px;
}

.production-icon {
  width: 44px;
  height: 44px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 18px;
  font-weight: 600;
  color: #fff;
}

.gold-icon {
  background: linear-gradient(135deg, #ffd54f, #ffb300);
}

.elixir-icon {
  background: linear-gradient(135deg, #ce93d8, #9c27b0);
}

.dark-icon {
  background: linear-gradient(135deg, #78909c, #455a64);
}

.production-info {
  flex: 1;
}

.production-label {
  font-size: 13px;
  color: var(--text-secondary);
  margin-bottom: 2px;
}

.production-value {
  font-size: 18px;
  font-weight: 600;
  color: var(--text-primary);
}

.production-buildings {
  font-size: 12px;
  color: var(--text-muted);
}

/* 村庄统计 */
.stats-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 12px;
}

.stat-item {
  background: var(--bg-card);
  border: 1px solid var(--border-light);
  border-radius: 12px;
  padding: 20px 16px;
  text-align: center;
}

.stat-number {
  font-size: 28px;
  font-weight: 700;
  color: var(--text-primary);
  margin-bottom: 4px;
}

.stat-label {
  font-size: 13px;
  color: var(--text-secondary);
}

/* 快捷操作 */
.quick-actions {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 12px;
}

.quick-btn {
  background: var(--bg-card);
  border: 1px solid var(--border-light);
  border-radius: 12px;
  padding: 20px 16px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  cursor: pointer;
  transition: all 0.2s;
}

.quick-btn:hover {
  border-color: var(--text-primary);
  box-shadow: 0 4px 12px var(--shadow);
}

.quick-icon {
  width: 44px;
  height: 44px;
  background: var(--hover-bg);
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 18px;
  font-weight: 600;
  color: var(--text-primary);
}

.quick-text {
  font-size: 14px;
  color: var(--text-primary);
  font-weight: 500;
}

/* 解锁内容 */
.unlock-list {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
}

.unlock-item {
  background: var(--bg-card);
  border: 1px solid var(--border-light);
  border-radius: 12px;
  padding: 14px 16px;
  display: flex;
  align-items: center;
  gap: 12px;
  flex: 0 0 auto;
}

.unlock-icon {
  width: 40px;
  height: 40px;
  background: var(--hover-bg);
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 16px;
  font-weight: 600;
  color: var(--text-primary);
  flex-shrink: 0;
}

.unlock-name {
  flex: 1;
  font-size: 14px;
  font-weight: 500;
  color: var(--text-primary);
  white-space: nowrap;
}

.unlock-type {
  font-size: 11px;
  color: var(--text-muted);
  background: var(--hover-bg);
  padding: 3px 8px;
  border-radius: 4px;
  white-space: nowrap;
  flex-shrink: 0;
}

/* 村庄树木 */
.tree-count {
  font-size: 12px;
  color: var(--text-muted);
  background: var(--hover-bg);
  padding: 2px 8px;
  border-radius: 10px;
  margin-left: auto;
}

.trees-area {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  gap: 12px;
}

.tree-item {
  background: var(--bg-card);
  border: 1px solid var(--border-light);
  border-radius: 12px;
  padding: 14px 16px;
  display: flex;
  align-items: center;
  gap: 12px;
}

.tree-icon {
  font-size: 28px;
  line-height: 1;
}

.tree-info {
  flex: 1;
}

.tree-name {
  font-size: 14px;
  font-weight: 500;
  color: var(--text-primary);
}

.btn-remove-tree {
  padding: 6px 12px;
  background: var(--hover-bg);
  border: 1px solid var(--border-color);
  border-radius: 6px;
  font-size: 12px;
  color: var(--text-secondary);
  cursor: pointer;
  transition: all 0.2s;
}

.btn-remove-tree:hover:not(:disabled) {
  background: var(--text-primary);
  color: var(--bg-secondary);
  border-color: var(--text-primary);
}

.btn-remove-tree:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.trees-empty {
  background: var(--bg-card);
  border: 1px dashed var(--border-color);
  border-radius: 12px;
  padding: 32px;
  text-align: center;
}

.trees-empty p {
  color: var(--text-secondary);
  margin: 0;
}

.trees-hint {
  font-size: 13px;
  color: var(--text-muted);
  margin-top: 8px !important;
}

.tree-result {
  margin-top: 12px;
  padding: 12px 16px;
  border-radius: 8px;
  font-size: 14px;
  text-align: center;
}

.tree-result.normal {
  background: var(--hover-bg);
  color: var(--text-secondary);
}

.tree-result.success {
  background: #e8f5e9;
  color: #2e7d32;
  font-weight: 500;
}

[data-theme="dark"] .tree-result.success {
  background: rgba(76, 175, 80, 0.15);
  color: #81c784;
}
</style>
