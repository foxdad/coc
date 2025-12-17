<template>
  <div class="panel">
    <h2 class="panel-title">建筑管理</h2>
    
    <!-- 分类标签 -->
    <div class="tabs">
      <button 
        v-for="cat in categories" 
        :key="cat.id"
        class="tab"
        :class="{ active: activeCategory === cat.id }"
        @click="activeCategory = cat.id"
      >
        {{ cat.name }}
      </button>
    </div>
    
    <!-- 建筑卡片列表 -->
    <div class="buildings-grid">
      <div v-for="building in filteredBuildings" :key="building.id" class="building-card">
        <div class="building-header">
          <div class="building-icon">{{ building.name.charAt(0) }}</div>
          <div class="building-info">
            <h4>{{ building.name }}</h4>
            <span class="building-count" v-if="building.count > 1">×{{ building.count }}</span>
          </div>
        </div>
        
        <div class="building-level">
          <span>等级 {{ building.level }} / {{ getEffectiveMaxLevel(building) }}</span>
          <div class="level-bar">
            <div class="level-fill" :style="{ width: (building.level / getEffectiveMaxLevel(building) * 100) + '%' }"></div>
          </div>
        </div>
        
        <p class="building-desc">{{ getBuildingDesc(building) }}</p>
        
        <div class="card-spacer"></div>
        
        <!-- 所有建筑升级条件提示 -->
        <div v-if="building.level < getEffectiveMaxLevel(building)" class="upgrade-info">
          <div class="upgrade-title">升级到 {{ building.level + 1 }} 级需要:</div>
          <div class="upgrade-requirements">
            <div class="req-item" :class="{ satisfied: store.gold >= getUpgradeCost(building) }">
              <span class="req-label">金币:</span>
              <span class="req-value">{{ formatNumber(getUpgradeCost(building)) }}</span>
              <span class="req-status">{{ store.gold >= getUpgradeCost(building) ? '✓' : '✗' }}</span>
            </div>
            <div class="req-item" :class="{ satisfied: store.freeBuilders > 0 }">
              <span class="req-label">建筑工人:</span>
              <span class="req-value">1 名空闲</span>
              <span class="req-status">{{ store.freeBuilders > 0 ? '✓' : '✗' }}</span>
            </div>
            <div class="req-item satisfied">
              <span class="req-label">升级时间:</span>
              <span class="req-value">{{ formatTime(store.getUpgradeTime(building.type, building.level)) }}</span>
            </div>
          </div>
        </div>
        
        <!-- 已满级或需升级大本营提示 -->
        <div v-else-if="building.level >= building.maxLevel" class="upgrade-info maxed">
          <div class="upgrade-title">已达到最高等级</div>
        </div>
        <div v-else-if="building.level >= getEffectiveMaxLevel(building)" class="upgrade-info blocked">
          <div class="upgrade-title">需要升级大本营才能继续升级</div>
          <div class="upgrade-hint">当前大本营等级限制: 最高 {{ getEffectiveMaxLevel(building) }} 级</div>
        </div>
        
        <!-- 升级中显示状态 -->
        <div v-if="building.upgrading" class="upgrading-status">
          升级中...
        </div>
        
        <!-- 未升级时显示升级按钮 -->
        <button 
          v-else
          class="btn btn-block"
          :disabled="!canUpgrade(building)"
          @click="upgradeBuilding(building)"
        >
          {{ getUpgradeButtonText(building) }}
        </button>
      </div>
    </div>
    
    <!-- 可建造新建筑 -->
    <div v-if="availableNewBuildings.length > 0">
      <h3 class="section-title">可建造新建筑</h3>
      <div class="new-buildings-grid">
        <div v-for="nb in availableNewBuildings" :key="nb.type" class="new-building-card">
          <div class="nb-icon">{{ nb.name.charAt(0) }}</div>
          <div class="nb-info">
            <h4>{{ nb.name }}</h4>
            <span class="nb-cost">{{ formatNumber(nb.cost) }} 金币</span>
          </div>
          <button class="btn btn-outline" @click="buildNew(nb)" :disabled="store.gold < nb.cost">
            建造
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useGameStore } from '../stores/gameStore'

const store = useGameStore()
const activeCategory = ref('all')

const categories = [
  { id: 'all', name: '全部' },
  { id: 'resource', name: '资源' },
  { id: 'army', name: '军事' },
  { id: 'defense', name: '防御' },
]

const buildingCategories = {
  goldmine: 'resource',
  elixircollector: 'resource',
  goldstorage: 'resource',
  elixirstorage: 'resource',
  darkelixirdrill: 'resource',
  darkstorage: 'resource',
  barracks: 'army',
  darkbarracks: 'army',
  laboratory: 'army',
  cannon: 'defense',
  archertower: 'defense',
  mortar: 'defense',
  airdefense: 'defense',
  wizardtower: 'defense',
  xbow: 'defense',
  townhall: 'other',
}

const filteredBuildings = computed(() => {
  if (activeCategory.value === 'all') return store.buildings
  return store.buildings.filter(b => buildingCategories[b.type] === activeCategory.value)
})

// 使用store中的存储罐数量配置

// 获取当前建筑数量
function getBuildingCount(type) {
  const building = store.buildings.find(b => b.type === type)
  return building ? building.count : 0
}

const availableNewBuildings = computed(() => {
  const available = []
  const maxStorages = store.getStorageMaxCount
  
  // 储金罐
  if (getBuildingCount('goldstorage') < maxStorages) {
    available.push({ type: 'goldstorage', name: '储金罐', cost: 300, isStorage: true })
  }
  // 圣水瓶
  if (getBuildingCount('elixirstorage') < maxStorages) {
    available.push({ type: 'elixirstorage', name: '圣水瓶', cost: 300, isStorage: true })
  }
  // 金矿（每个大本营等级可以多建1个，最多8个）
  const maxMines = Math.min(store.townHallLevel + 1, 8)
  if (getBuildingCount('goldmine') < maxMines) {
    available.push({ type: 'goldmine', name: '金矿', cost: 150 })
  }
  // 圣水收集器
  if (getBuildingCount('elixircollector') < maxMines) {
    available.push({ type: 'elixircollector', name: '圣水收集器', cost: 150 })
  }
  
  // 兵营数量限制：1本1个，2-3本2个，4-5本3个，6-9本4个
  const maxBarracks = store.townHallLevel >= 6 ? 4 : store.townHallLevel >= 4 ? 3 : store.townHallLevel >= 2 ? 2 : 1
  if (getBuildingCount('barracks') < maxBarracks) {
    available.push({ type: 'barracks', name: '兵营', cost: 500 })
  }
  
  // 加农炮数量限制：1本1个，2本2个，3本3个，4本4个，5本5个，6本6个，7本7个，8本8个，9本9个
  const maxCannons = Math.min(store.townHallLevel, 9)
  if (getBuildingCount('cannon') < maxCannons) {
    available.push({ type: 'cannon', name: '加农炮', cost: 1000 })
  }
  
  // 箭塔数量限制：2本1个，3本2个，4本3个，5本4个，6本5个，7本6个，8本7个，9本8个
  if (store.townHallLevel >= 2) {
    const maxArcherTowers = store.townHallLevel - 1
    if (getBuildingCount('archertower') < maxArcherTowers) {
      available.push({ type: 'archertower', name: '箭塔', cost: 2000 })
    }
  }
  
  // 迫击炮数量限制：3本1个，5本2个，7本3个，9本4个
  if (store.townHallLevel >= 3) {
    const maxMortars = store.townHallLevel >= 9 ? 4 : store.townHallLevel >= 7 ? 3 : store.townHallLevel >= 5 ? 2 : 1
    if (getBuildingCount('mortar') < maxMortars) {
      available.push({ type: 'mortar', name: '迫击炮', cost: 100000 })
    }
  }
  
  // 防空火箭数量限制：4本1个，6本2个，8本3个
  if (store.townHallLevel >= 4) {
    const maxAirDefense = store.townHallLevel >= 8 ? 3 : store.townHallLevel >= 6 ? 2 : 1
    if (getBuildingCount('airdefense') < maxAirDefense) {
      available.push({ type: 'airdefense', name: '防空火箭', cost: 150000 })
    }
  }
  
  // 法师塔数量限制：5本1个，6本2个，8本3个，9本4个
  if (store.townHallLevel >= 5) {
    const maxWizardTowers = store.townHallLevel >= 9 ? 4 : store.townHallLevel >= 8 ? 3 : store.townHallLevel >= 6 ? 2 : 1
    if (getBuildingCount('wizardtower') < maxWizardTowers) {
      available.push({ type: 'wizardtower', name: '法师塔', cost: 200000 })
    }
  }
  
  // X连弩：9本2个
  if (store.townHallLevel >= 9) {
    if (getBuildingCount('xbow') < 2) {
      available.push({ type: 'xbow', name: 'X连弩', cost: 1000000 })
    }
  }
  
  if (store.townHallLevel >= 3 && !store.buildings.find(b => b.type === 'laboratory')) {
    available.push({ type: 'laboratory', name: '实验室', cost: 10000 })
  }
  
  // 暗黑重油钻井：7本1个，8本2个，9本3个
  if (store.townHallLevel >= 7) {
    const maxDarkDrills = store.townHallLevel >= 9 ? 3 : store.townHallLevel >= 8 ? 2 : 1
    if (getBuildingCount('darkelixirdrill') < maxDarkDrills) {
      available.push({ type: 'darkelixirdrill', name: '暗黑重油钻井', cost: 50000 })
    }
  }
  
  // 暗黑重油罐：7本1个，8本2个，9本3个
  if (store.townHallLevel >= 7) {
    const maxDarkStorage = store.townHallLevel >= 9 ? 3 : store.townHallLevel >= 8 ? 2 : 1
    if (getBuildingCount('darkstorage') < maxDarkStorage) {
      available.push({ type: 'darkstorage', name: '暗黑重油罐', cost: 50000 })
    }
  }
  
  // 暗黑兵营：7本1个，9本2个
  if (store.townHallLevel >= 7) {
    const maxDarkBarracks = store.townHallLevel >= 9 ? 2 : 1
    if (getBuildingCount('darkbarracks') < maxDarkBarracks) {
      available.push({ type: 'darkbarracks', name: '暗黑兵营', cost: 50000 })
    }
  }
  return available
})

// 获取建筑当前最高可升级等级（考虑大本营限制）
function getEffectiveMaxLevel(building) {
  if (building.type === 'goldstorage' || building.type === 'elixirstorage') {
    return Math.min(building.maxLevel, store.getStorageMaxLevel)
  }
  return building.maxLevel
}

// 检查建筑是否可以升级
function canUpgrade(building) {
  // 正在升级中不能再升级
  if (building.upgrading) return false
  // 没有空闲建筑工人
  if (store.freeBuilders <= 0) return false
  const effectiveMax = getEffectiveMaxLevel(building)
  if (building.level >= effectiveMax) return false
  return store.gold >= getUpgradeCost(building)
}

// 获取升级按钮文本
function getUpgradeButtonText(building) {
  const effectiveMax = getEffectiveMaxLevel(building)
  if (building.level >= building.maxLevel) {
    return '已满级'
  }
  if (building.level >= effectiveMax) {
    return '需升级大本营'
  }
  if (store.freeBuilders <= 0) {
    return '无空闲工人'
  }
  const cost = formatNumber(getUpgradeCost(building))
  const time = formatTime(store.getUpgradeTime(building.type, building.level))
  return `升级 ${cost} 金币 (${time})`
}

// 格式化时间显示
function formatTime(seconds) {
  if (seconds < 60) return `${seconds}秒`
  if (seconds < 3600) {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return secs > 0 ? `${mins}分${secs}秒` : `${mins}分`
  }
  const hours = Math.floor(seconds / 3600)
  const mins = Math.floor((seconds % 3600) / 60)
  return mins > 0 ? `${hours}小时${mins}分` : `${hours}小时`
}

function getBuildingDesc(building) {
  const effectiveMax = getEffectiveMaxLevel(building)
  const descs = {
    townhall: '村庄核心',
    goldmine: `产出 ${building.level * 10} 金币/分钟`,
    elixircollector: `产出 ${building.level * 10} 圣水/分钟`,
    goldstorage: `可存储 ${formatNumber(store.goldStorageCapacity[building.level] || 1000)} 金币` + 
      (building.level >= effectiveMax && building.level < building.maxLevel ? ` (当前大本营最高${effectiveMax}级)` : ''),
    elixirstorage: `可存储 ${formatNumber(store.elixirStorageCapacity[building.level] || 1000)} 圣水` +
      (building.level >= effectiveMax && building.level < building.maxLevel ? ` (当前大本营最高${effectiveMax}级)` : ''),
    barracks: `训练容量 ${getBarracksCapacity(building.level)}`,
    darkbarracks: `暗黑训练容量 ${getDarkBarracksCapacity(building.level)}，训练暗黑兵种`,
    cannon: `伤害 ${25 + building.level * 10}/次，攻击范围7格`,
    archertower: `伤害 ${15 + building.level * 5}/次，可对空，攻击范围8格`,
    mortar: `范围伤害 ${80 + building.level * 20}/发，攻击范围4-11格`,
    airdefense: `伤害 ${120 + building.level * 30}/次，仅对空，攻击范围10格`,
    wizardtower: `群体伤害 ${40 + building.level * 10}/秒，可对空，攻击范围7格`,
    xbow: `伤害 ${80 + building.level * 10}/秒，可切换对空/对地，攻击范围14格`,
    laboratory: '研究升级兵种',
    darkelixirdrill: `产出 ${getDarkDrillProduction(building.level)} 暗黑重油/分钟`,
    darkstorage: `可存储 ${formatNumber(getDarkStorageCapacity(building.level))} 暗黑重油`,
  }
  return descs[building.type] || ''
}

// 暗黑重油钻井产量：1级5/分钟，2级8/分钟，3级10/分钟
function getDarkDrillProduction(level) {
  const rates = { 1: 5, 2: 8, 3: 10 }
  return rates[level] || 5
}

// 暗黑重油罐容量
function getDarkStorageCapacity(level) {
  const caps = { 1: 2500, 2: 2500, 3: 3334 }
  return caps[level] || 2500
}

// 兵营容量：1级15人口，2级20人口，3级25人口，4级30人口，5级35人口，6级40人口，7级45人口，8级50人口
function getBarracksCapacity(level) {
  const caps = { 1: 15, 2: 20, 3: 25, 4: 30, 5: 35, 6: 40, 7: 45, 8: 50 }
  return caps[level] || 15
}

// 暗黑兵营容量：1级10人口，2级15人口，3级20人口
function getDarkBarracksCapacity(level) {
  const caps = { 1: 10, 2: 15, 3: 20 }
  return caps[level] || 10
}

function getUpgradeCost(building) {
  // 根据新数据手册调整升级费用
  const baseCosts = {
    // 金矿/圣水收集器升级费用
    goldmine: [500, 2000, 5000, 10000, 50000, 100000, 200000, 300000],
    elixircollector: [500, 2000, 5000, 10000, 50000, 100000, 200000, 300000],
    // 储金罐/圣水瓶升级费用（按新数据手册）
    // 1→2: 500, 2→3: 2000, 3→4: 5000, 4→5: 10000, 5→6: 50000, 6→7: 100000, 7→8: 200000, 8→9: 300000
    goldstorage: [500, 2000, 5000, 10000, 50000, 100000, 200000, 300000],
    elixirstorage: [500, 2000, 5000, 10000, 50000, 100000, 200000, 300000],
    // 兵营升级费用（圣水）：1→2: 1000, 2→3: 5000, 3→4: 10000, 4→5: 50000, 5→6: 100000, 6→7: 200000, 7→8: 500000
    barracks: [1000, 5000, 10000, 50000, 100000, 200000, 500000],
    cannon: [1000, 3000, 10000, 50000, 100000, 200000, 300000, 500000],
    archertower: [2000, 5000, 10000, 100000, 200000, 300000, 500000],
    mortar: [100000, 200000, 300000, 500000],
    airdefense: [150000, 300000, 500000],
    wizardtower: [200000, 300000, 500000],
    xbow: [1000000],
    laboratory: [100000, 200000, 500000, 1000000],
    // 暗黑重油钻井：1→2: 5万, 2→3: 10万
    darkelixirdrill: [50000, 100000],
    // 暗黑重油罐：1→2: 10万, 2→3: 20万
    darkstorage: [100000, 200000],
    // 暗黑兵营：1→2: 10万, 2→3: 20万
    darkbarracks: [100000, 200000],
    // 大本营升级费用根据数据手册
    townhall: [1000, 4000, 25000, 150000, 750000, 1000000, 2000000, 3000000],
  }
  const costs = baseCosts[building.type] || [1000]
  return costs[building.level - 1] || costs[costs.length - 1]
}

function formatNumber(num) {
  if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M'
  if (num >= 1000) return (num / 1000).toFixed(0) + 'K'
  return num.toString()
}

function upgradeBuilding(building) {
  const cost = getUpgradeCost(building)
  if (store.spendGold(cost)) {
    // 开始升级（需要等待时间）
    store.startUpgrade(building)
  }
}

function buildNew(nb) {
  if (store.spendGold(nb.cost)) {
    // 检查是否已有该类型建筑
    const existing = store.buildings.find(b => b.type === nb.type)
    if (existing) {
      // 增加数量
      existing.count++
    } else {
      // 新建建筑
      const maxLevelsMap = {
        goldstorage: 9,
        elixirstorage: 9,
        goldmine: 9,
        elixircollector: 9,
        barracks: 8,
        darkbarracks: 3,
        cannon: 9,
        archertower: 8,
        mortar: 5,
        airdefense: 4,
        wizardtower: 4,
        xbow: 2,
        laboratory: 5,
        darkelixirdrill: 3,
        darkstorage: 3
      }
      store.buildings.push({
        id: Date.now(),
        type: nb.type,
        name: nb.name,
        level: 1,
        maxLevel: maxLevelsMap[nb.type] || 8,
        count: 1
      })
    }
  }
}
</script>

<style scoped>
.panel-title {
  font-size: 22px;
  font-weight: 600;
  margin-bottom: 20px;
  color: var(--text-primary);
}

.section-title {
  font-size: 16px;
  font-weight: 500;
  margin: 24px 0 16px;
  color: var(--text-primary);
}

.tabs {
  display: flex;
  gap: 8px;
  margin-bottom: 20px;
}

.tab {
  padding: 8px 20px;
  background: var(--bg-card);
  border: 1px solid var(--border-light);
  border-radius: 20px;
  font-size: 14px;
  color: var(--text-secondary);
  transition: all 0.2s;
}

.tab:hover {
  border-color: var(--text-primary);
  color: var(--text-primary);
}

.tab.active {
  background: var(--text-primary);
  border-color: var(--text-primary);
  color: var(--bg-secondary);
}

.buildings-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 16px;
}

.building-card {
  background: var(--bg-card);
  border: 1px solid var(--border-light);
  border-radius: 12px;
  padding: 20px;
  transition: all 0.2s;
  display: flex;
  flex-direction: column;
  min-height: 320px;
}

.building-card:hover {
  box-shadow: 0 4px 12px var(--shadow);
}

.building-header {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 16px;
}

.building-icon {
  width: 48px;
  height: 48px;
  background: var(--hover-bg);
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 20px;
  font-weight: 600;
  color: var(--text-primary);
}

.building-info {
  display: flex;
  align-items: baseline;
  gap: 8px;
}

.building-info h4 {
  font-size: 16px;
  font-weight: 500;
  color: var(--text-primary);
}

.building-count {
  font-size: 14px;
  color: var(--text-secondary);
}

.building-level {
  margin-bottom: 12px;
}

.building-level span {
  font-size: 13px;
  color: var(--text-secondary);
}

.level-bar {
  height: 6px;
  background: var(--progress-bg);
  border-radius: 3px;
  margin-top: 6px;
  overflow: hidden;
}

.level-fill {
  height: 100%;
  background: var(--text-primary);
  border-radius: 3px;
}

.building-desc {
  font-size: 14px;
  color: var(--text-secondary);
  margin-bottom: 12px;
}

.card-spacer {
  flex: 1;
}

.btn {
  padding: 10px 20px;
  background: var(--text-primary);
  color: var(--bg-secondary);
  border: none;
  border-radius: 8px;
  font-size: 14px;
  transition: background 0.2s;
}

.btn:hover:not(:disabled) {
  opacity: 0.85;
}

.btn-block {
  width: 100%;
}

.btn-outline {
  background: var(--bg-card);
  color: var(--text-primary);
  border: 1px solid var(--text-primary);
}

.btn-outline:hover:not(:disabled) {
  background: var(--text-primary);
  color: var(--bg-secondary);
}

.new-buildings-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 16px;
}

.new-building-card {
  background: var(--bg-card);
  border: 1px dashed var(--border-color);
  border-radius: 12px;
  padding: 20px;
  display: flex;
  align-items: center;
  gap: 16px;
}

.nb-icon {
  width: 48px;
  height: 48px;
  background: var(--hover-bg);
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 20px;
  font-weight: 600;
  color: var(--text-primary);
}

.nb-info {
  flex: 1;
}

.nb-info h4 {
  font-size: 15px;
  font-weight: 500;
  margin-bottom: 4px;
  color: var(--text-primary);
}

.nb-cost {
  font-size: 13px;
  color: var(--text-secondary);
}

.upgrading-status {
  padding: 10px 20px;
  background: var(--hover-bg);
  color: var(--text-secondary);
  border-radius: 8px;
  font-size: 14px;
  text-align: center;
}

/* 建筑升级条件提示 */
.upgrade-info {
  background: var(--bg-primary);
  border: 1px solid var(--border-color);
  border-radius: 8px;
  padding: 12px;
  margin-bottom: 12px;
}

.upgrade-info.maxed {
  background: var(--success-bg);
  border-color: #c8e6c9;
}

.upgrade-info.blocked {
  background: #fff3e0;
  border-color: #ffe0b2;
}

.upgrade-title {
  font-size: 13px;
  font-weight: 500;
  color: var(--text-primary);
  margin-bottom: 8px;
}

.upgrade-info.maxed .upgrade-title,
.upgrade-info.blocked .upgrade-title {
  margin-bottom: 0;
}

.upgrade-hint {
  font-size: 12px;
  color: var(--text-secondary);
  margin-top: 4px;
}

.upgrade-requirements {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.req-item {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  color: var(--text-muted);
}

.req-item.satisfied {
  color: var(--text-primary);
}

.req-item.satisfied .req-status {
  color: #4caf50;
}

.req-item:not(.satisfied) .req-status {
  color: #f44336;
}

.req-label {
  min-width: 70px;
}

.req-value {
  flex: 1;
}

.req-status {
  font-weight: 600;
}
</style>
