<template>
  <div class="panel">
    <h2 class="panel-title">商店</h2>
    
    <!-- 宝石余额卡片 -->
    <div class="gem-card">
      <span class="gem-label">当前宝石</span>
      <span class="gem-value">{{ store.gems }}</span>
    </div>
    
    <!-- 资源包 -->
    <h3 class="section-title">资源包</h3>
    <div class="shop-grid">
      <div v-for="pack in resourcePacks" :key="pack.id" class="shop-card">
        <div class="shop-icon">{{ pack.name.charAt(0) }}</div>
        <div class="shop-info">
          <h4>{{ pack.name }}</h4>
          <p>{{ pack.desc }}</p>
        </div>
        <button class="btn" :disabled="store.gems < pack.cost" @click="buyResourcePack(pack)">
          {{ pack.cost }} 宝石
        </button>
      </div>
    </div>
    
    <!-- 立即完成 -->
    <h3 class="section-title" v-if="upgradingBuildings.length > 0 || store.trainingQueue.length > 0 || store.currentResearch || clanCastleUpgrading">加速完成</h3>
    <div class="speed-up-section" v-if="upgradingBuildings.length > 0 || store.trainingQueue.length > 0 || store.currentResearch || clanCastleUpgrading">
      <!-- 建筑升级加速 -->
      <div v-for="building in upgradingBuildings" :key="building.id" class="speed-card">
        <div class="speed-icon">{{ building.name.charAt(0) }}</div>
        <div class="speed-info">
          <h4>{{ building.name }} 升级中</h4>
          <p>剩余 {{ formatTime(getRemainingTime(building)) }}</p>
        </div>
        <button class="btn btn-speed" @click="speedUpBuilding(building)" :disabled="store.gems < getSpeedUpCost(building)">
          {{ getSpeedUpCost(building) }} 宝石 立即完成
        </button>
      </div>
      
      <!-- 训练加速 -->
      <div v-for="(item, index) in store.trainingQueue" :key="'train-' + index" class="speed-card">
        <div class="speed-icon train-icon">{{ item.troopName.charAt(0) }}</div>
        <div class="speed-info">
          <h4>训练 {{ item.troopName }}</h4>
          <p>剩余 {{ formatTrainingTime(item) }}</p>
        </div>
        <button class="btn btn-speed" @click="speedUpTraining(index)" :disabled="store.gems < 1">
          1 宝石 立即完成
        </button>
      </div>
      
      <!-- 研究加速 -->
      <div v-if="store.currentResearch" class="speed-card">
        <div class="speed-icon research-icon">研</div>
        <div class="speed-info">
          <h4>{{ store.currentResearch.name }} 研究中</h4>
          <p>剩余 {{ formatTime(getResearchRemaining()) }}</p>
        </div>
        <button class="btn btn-speed" @click="speedUpResearch" :disabled="store.gems < getResearchSpeedCost()">
          {{ getResearchSpeedCost() }} 宝石 立即完成
        </button>
      </div>
      
      <!-- 部落城堡升级加速 -->
      <div v-if="clanCastleUpgrading" class="speed-card">
        <div class="speed-icon castle-icon">城</div>
        <div class="speed-info">
          <h4>部落城堡 {{ store.clanCastle.level === 0 ? '建造中' : '升级中' }}</h4>
          <p>剩余 {{ formatTime(getClanCastleRemaining()) }}</p>
        </div>
        <button class="btn btn-speed" @click="speedUpClanCastle" :disabled="store.gems < getClanCastleSpeedCost()">
          {{ getClanCastleSpeedCost() }} 宝石 立即完成
        </button>
      </div>
    </div>
    
    <!-- 建筑工人 -->
    <h3 class="section-title">建筑工人</h3>
    <div class="builder-card">
      <div class="builder-icon">工</div>
      <div class="builder-info">
        <h4>额外建筑工人</h4>
        <p>当前: {{ store.builders.length }} / 5</p>
      </div>
      <button 
        class="btn"
        :disabled="store.builders.length >= 5 || store.gems < builderCost"
        @click="buyBuilder"
      >
        {{ store.builders.length >= 5 ? '已满' : builderCost + ' 宝石' }}
      </button>
    </div>
    
   <!-- 暂时注释
    <h3 class="section-title">获取宝石</h3>
    <div class="gem-packs">
      <div v-for="pack in gemPacks" :key="pack.id" class="gem-pack" @click="buyGems(pack)">
        <div class="gp-amount">{{ pack.amount }}</div>
        <div class="gp-label">宝石</div>
        <div class="gp-price">{{ pack.price }}</div>
        <div class="gp-bonus" v-if="pack.bonus">+{{ pack.bonus }} 赠送</div>
      </div>
    </div>
    <p class="text-muted text-center">* 演示版本，点击即可获得宝石</p>
     -->
    
    <!-- 限时特惠 -->
    <h3 class="section-title">限时特惠</h3>
    <div class="offer-card">
      <div class="offer-badge">限时</div>
      <div class="offer-icon">礼</div>
      <div class="offer-info">
        <h4>新手大礼包</h4>
        <p>50000金币 + 50000圣水 + 100宝石</p>
      </div>
      <div class="offer-price">
        <span class="original">500 宝石</span>
        <span class="free">免费</span>
      </div>
      <button class="btn" @click="claimOffer" :disabled="store.starterPackClaimed">
        {{ store.starterPackClaimed ? '已领取' : '领取' }}
      </button>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useGameStore } from '../stores/gameStore'

const store = useGameStore()

// 获取正在升级的建筑
const upgradingBuildings = computed(() => store.buildings.filter(b => b.upgrading))

// 获取部落城堡升级状态
const clanCastleUpgrading = computed(() => {
  return store.upgradeQueue.find(q => q.buildingId === 'clancastle')
})

// 获取建筑剩余时间（秒）
function getRemainingTime(building) {
  if (!building.upgrading || !building.upgradeEndTime) return 0
  return Math.max(0, Math.ceil((building.upgradeEndTime - Date.now()) / 1000))
}

// 计算加速费用（每分钟1宝石，最少1宝石）
function getSpeedUpCost(building) {
  const seconds = getRemainingTime(building)
  return Math.max(1, Math.ceil(seconds / 60))
}

// 加速建筑升级
function speedUpBuilding(building) {
  const cost = getSpeedUpCost(building)
  if (store.gems >= cost) {
    store.gems -= cost
    // 立即完成升级
    building.upgradeEndTime = Date.now()
    store.completeUpgrade(building.id)
  }
}

// 格式化训练剩余时间
function formatTrainingTime(item) {
  const remaining = Math.max(0, item.endTime - Date.now())
  return formatTime(Math.ceil(remaining / 1000))
}

// 加速训练
function speedUpTraining(index) {
  if (store.gems >= 1) {
    store.gems -= 1
    const item = store.trainingQueue[index]
    if (item) {
      item.endTime = Date.now()
      store.checkTraining()
    }
  }
}

// 获取研究剩余时间
function getResearchRemaining() {
  if (!store.currentResearch) return 0
  return Math.max(0, Math.ceil((store.currentResearch.endTime - Date.now()) / 1000))
}

// 计算研究加速费用
function getResearchSpeedCost() {
  const seconds = getResearchRemaining()
  return Math.max(1, Math.ceil(seconds / 60))
}

// 加速研究
function speedUpResearch() {
  const cost = getResearchSpeedCost()
  if (store.gems >= cost && store.currentResearch) {
    store.gems -= cost
    // 立即完成研究
    const troop = store.troops.find(t => t.id === store.currentResearch.troopId)
    if (troop) {
      troop.level = store.currentResearch.targetLevel
    }
    store.currentResearch = null
  }
}

// 获取部落城堡升级剩余时间
function getClanCastleRemaining() {
  const item = clanCastleUpgrading.value
  if (!item) return 0
  return Math.max(0, Math.ceil((item.endTime - Date.now()) / 1000))
}

// 计算部落城堡加速费用
function getClanCastleSpeedCost() {
  const seconds = getClanCastleRemaining()
  return Math.max(1, Math.ceil(seconds / 60))
}

// 加速部落城堡升级
function speedUpClanCastle() {
  const cost = getClanCastleSpeedCost()
  if (store.gems >= cost && clanCastleUpgrading.value) {
    store.gems -= cost
    // 立即完成升级
    clanCastleUpgrading.value.endTime = Date.now()
    store.checkUpgrades()
  }
}

// 格式化时间
function formatTime(seconds) {
  if (seconds <= 0) return '完成'
  if (seconds < 60) return `${seconds}秒`
  if (seconds < 3600) {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return secs > 0 ? `${mins}分${secs}秒` : `${mins}分钟`
  }
  const hours = Math.floor(seconds / 3600)
  const mins = Math.floor((seconds % 3600) / 60)
  return mins > 0 ? `${hours}时${mins}分` : `${hours}小时`
}

// 基础资源包
const baseResourcePacks = [
  { id: 1, name: '金币小包', desc: '10000 金币', cost: 10, gold: 10000, elixir: 0, dark: 0 },
  { id: 2, name: '金币大包', desc: '50000 金币', cost: 40, gold: 50000, elixir: 0, dark: 0 },
  { id: 3, name: '圣水小包', desc: '10000 圣水', cost: 10, gold: 0, elixir: 10000, dark: 0 },
  { id: 4, name: '圣水大包', desc: '50000 圣水', cost: 40, gold: 0, elixir: 50000, dark: 0 },
  { id: 5, name: '资源组合包', desc: '30000金币 + 30000圣水', cost: 50, gold: 30000, elixir: 30000, dark: 0 },
]

// 暗黑重油资源包（7本解锁）
const darkResourcePacks = [
  { id: 6, name: '暗黑小包', desc: '500 暗黑重油', cost: 15, gold: 0, elixir: 0, dark: 500 },
  { id: 7, name: '暗黑大包', desc: '2000 暗黑重油', cost: 50, gold: 0, elixir: 0, dark: 2000 },
  { id: 8, name: '暗黑组合包', desc: '20000金币 + 20000圣水 + 1000暗黑', cost: 60, gold: 20000, elixir: 20000, dark: 1000 },
]

// 根据大本营等级显示资源包
const resourcePacks = computed(() => {
  if (store.townHallLevel >= 7) {
    return [...baseResourcePacks, ...darkResourcePacks]
  }
  return baseResourcePacks
})

const gemPacks = [
  { id: 1, amount: 80, price: '¥6', bonus: 0 },
  { id: 2, amount: 500, price: '¥30', bonus: 50 },
  { id: 3, amount: 1200, price: '¥68', bonus: 200 },
]

const builderCost = computed(() => {
  const costs = [0, 250, 500, 1000, 2000]
  return costs[store.builders.length] || 2000
})

function buyResourcePack(pack) {
  if (store.gems >= pack.cost) {
    store.gems -= pack.cost
    if (pack.gold > 0) store.addGold(pack.gold)
    if (pack.elixir > 0) store.addElixir(pack.elixir)
    if (pack.dark > 0 && store.townHallLevel >= 7) {
      store.darkElixir = Math.min(store.darkElixir + pack.dark, store.maxDarkElixir)
    }
  }
}

function buyBuilder() {
  if (store.builders.length < 5 && store.gems >= builderCost.value) {
    store.gems -= builderCost.value
    store.builders.push({ id: store.builders.length + 1, busy: false, task: null, endTime: null })
  }
}

function buyGems(pack) {
  store.gems += pack.amount + (pack.bonus || 0)
}

function claimOffer() {
  if (!store.starterPackClaimed) {
    store.addGold(50000)
    store.addElixir(50000)
    store.gems += 100
    store.starterPackClaimed = true
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

.gem-card {
  background: var(--bg-card);
  border: 1px solid var(--border-color);
  border-radius: 12px;
  padding: 20px;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.gem-label {
  font-size: 15px;
  color: var(--text-secondary);
}

.gem-value {
  font-size: 28px;
  font-weight: 700;
  color: var(--text-primary);
}

.shop-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 12px;
}

.shop-card {
  background: var(--bg-card);
  border: 1px solid var(--border-color);
  border-radius: 12px;
  padding: 16px 20px;
  display: flex;
  align-items: center;
  gap: 16px;
}

.shop-icon {
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

.shop-info {
  flex: 1;
}

.shop-info h4 {
  font-size: 15px;
  font-weight: 500;
  margin-bottom: 2px;
  color: var(--text-primary);
}

.shop-info p {
  font-size: 13px;
  color: var(--text-secondary);
}

.builder-card {
  background: var(--bg-card);
  border: 1px solid var(--border-color);
  border-radius: 12px;
  padding: 20px;
  display: flex;
  align-items: center;
  gap: 16px;
}

.builder-icon {
  width: 56px;
  height: 56px;
  background: var(--hover-bg);
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24px;
  font-weight: 600;
  color: var(--text-primary);
}

.builder-info {
  flex: 1;
}

.builder-info h4 {
  font-size: 16px;
  font-weight: 500;
  margin-bottom: 4px;
  color: var(--text-primary);
}

.builder-info p {
  font-size: 14px;
  color: var(--text-secondary);
}

.gem-packs {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px;
  margin-bottom: 12px;
}

.gem-pack {
  background: var(--bg-card);
  border: 1px solid var(--border-color);
  border-radius: 12px;
  padding: 20px;
  text-align: center;
  cursor: pointer;
  transition: all 0.2s;
}

.gem-pack:hover {
  border-color: var(--text-primary);
  box-shadow: 0 4px 12px var(--shadow);
}

.gp-amount {
  font-size: 28px;
  font-weight: 700;
  color: var(--text-primary);
}

.gp-label {
  font-size: 13px;
  color: var(--text-secondary);
  margin-bottom: 8px;
}

.gp-price {
  font-size: 16px;
  font-weight: 500;
  color: var(--text-primary);
}

.gp-bonus {
  font-size: 12px;
  color: var(--text-secondary);
  margin-top: 4px;
}

.text-muted {
  color: var(--text-secondary);
  font-size: 13px;
}

.text-center {
  text-align: center;
}

.offer-card {
  background: var(--bg-card);
  border: 1px solid var(--border-color);
  border-radius: 12px;
  padding: 20px;
  display: flex;
  align-items: center;
  gap: 16px;
  position: relative;
}

.offer-badge {
  position: absolute;
  top: -8px;
  right: 20px;
  background: var(--text-primary);
  color: var(--bg-secondary);
  padding: 4px 12px;
  border-radius: 12px;
  font-size: 12px;
  font-weight: 500;
}

.offer-icon {
  width: 56px;
  height: 56px;
  background: var(--hover-bg);
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24px;
  font-weight: 600;
  color: var(--text-primary);
}

.offer-info {
  flex: 1;
}

.offer-info h4 {
  font-size: 16px;
  font-weight: 500;
  margin-bottom: 4px;
  color: var(--text-primary);
}

.offer-info p {
  font-size: 13px;
  color: var(--text-secondary);
}

.offer-price {
  display: flex;
  flex-direction: column;
  align-items: center;
  margin-right: 16px;
}

.original {
  font-size: 13px;
  color: var(--text-muted);
  text-decoration: line-through;
}

.free {
  font-size: 16px;
  font-weight: 600;
  color: var(--text-primary);
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

.btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* 加速完成区域 */
.speed-up-section {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.speed-card {
  background: var(--bg-card);
  border: 1px solid var(--border-color);
  border-radius: 12px;
  padding: 16px 20px;
  display: flex;
  align-items: center;
  gap: 16px;
}

.speed-icon {
  width: 44px;
  height: 44px;
  background: #e8f5e9;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 18px;
  font-weight: 600;
  color: #4caf50;
}

.speed-icon.train-icon {
  background: #fff3e0;
  color: #ff9800;
}

.speed-icon.research-icon {
  background: #e3f2fd;
  color: #2196f3;
}

.speed-icon.castle-icon {
  background: #f3e5f5;
  color: #9c27b0;
}

.speed-info {
  flex: 1;
}

.speed-info h4 {
  font-size: 15px;
  font-weight: 500;
  margin-bottom: 2px;
  color: var(--text-primary);
}

.speed-info p {
  font-size: 13px;
  color: var(--text-secondary);
}

.btn-speed {
  background: #ff9800;
  color: #fff;
  white-space: nowrap;
}

.btn-speed:hover:not(:disabled) {
  background: #f57c00;
}
</style>
