<template>
  <div class="neighbor-panel">
    <div class="panel-header">
      <div class="header-info">
        <h2>🏘️ 边境邻邦</h2>
        <p class="panel-desc">与周边村庄建立关系，获取资源、兵种和特殊道具</p>
      </div>
      <div class="header-stats">
        <div class="stat-item">
          <span class="stat-icon">⚔️</span>
          <span class="stat-value">{{ store.currentArmy }}</span>
          <span class="stat-label">兵力</span>
        </div>
        <div class="stat-item ally-count">
          <span class="stat-icon">🤝</span>
          <span class="stat-value">{{ allyCount }}</span>
          <span class="stat-label">同盟</span>
        </div>
      </div>
    </div>

    <!-- 筛选标签栏 -->
    <div class="filter-tabs">
      <button 
        class="tab" 
        :class="{ active: currentFilter === 'all' }"
        @click="currentFilter = 'all'"
      >
        <span class="tab-icon">📋</span>
        <span class="tab-text">全部</span>
        <span class="tab-count">{{ store.neighbors.length }}</span>
      </button>
      <button 
        class="tab" 
        :class="{ active: currentFilter === 'friendly' }"
        @click="currentFilter = 'friendly'"
      >
        <span class="tab-icon">💚</span>
        <span class="tab-text">友好</span>
        <span class="tab-count green">{{ friendlyCount }}</span>
      </button>
      <button 
        class="tab" 
        :class="{ active: currentFilter === 'neutral' }"
        @click="currentFilter = 'neutral'"
      >
        <span class="tab-icon">⚪</span>
        <span class="tab-text">中立</span>
        <span class="tab-count">{{ neutralCount }}</span>
      </button>
      <button 
        class="tab" 
        :class="{ active: currentFilter === 'hostile' }"
        @click="currentFilter = 'hostile'"
      >
        <span class="tab-icon">🔴</span>
        <span class="tab-text">敌对</span>
        <span class="tab-count red">{{ hostileCount }}</span>
      </button>
    </div>

    <!-- 卡片网格 -->
    <div class="neighbor-grid">
      <div 
        v-for="neighbor in filteredNeighbors" 
        :key="neighbor.id"
        class="neighbor-card"
        :class="[getRelationClass(neighbor.favor), { allied: neighbor.allied }]"
      >
        <!-- 同盟标记 -->
        <div class="ally-badge" v-if="neighbor.allied">🤝 同盟</div>
        
        <!-- 卡片头部 -->
        <div class="card-header">
          <div class="avatar-wrapper" :class="getRelationClass(neighbor.favor)">
            <span class="card-icon">{{ neighbor.icon }}</span>
          </div>
          <div class="card-info">
            <span class="card-name">{{ neighbor.name }}</span>
            <span class="card-type">{{ neighbor.title }}</span>
          </div>
          <span class="status-badge" :class="getRelationClass(neighbor.favor)">
            {{ getRelationText(neighbor.favor) }}
          </span>
        </div>

        <!-- 兵力和资源信息 -->
        <div class="neighbor-stats">
          <div class="stat-item power">
            <span class="stat-icon">⚔️</span>
            <span class="stat-val">{{ store.calculateNeighborPower(neighbor) }}</span>
          </div>
          <div class="stat-item gold">
            <span class="stat-icon">🪙</span>
            <span class="stat-val">{{ neighbor.resources?.gold || 0 }}</span>
          </div>
          <div class="stat-item elixir">
            <span class="stat-icon">💧</span>
            <span class="stat-val">{{ neighbor.resources?.elixir || 0 }}</span>
          </div>
        </div>

        <!-- 好感度进度条 -->
        <div class="favor-section">
          <div class="favor-header">
            <span class="favor-label">好感度</span>
            <span class="favor-value" :class="neighbor.favor >= 0 ? 'positive' : 'negative'">
              {{ neighbor.favor > 0 ? '+' : '' }}{{ Math.floor(neighbor.favor) }}
            </span>
          </div>
          <div class="favor-bar-wrapper">
            <div class="favor-bar">
              <div class="favor-fill" :style="getFavorStyle(neighbor.favor)"></div>
              <div class="favor-marker" :style="{ left: '50%' }"></div>
            </div>
            <div class="favor-labels">
              <span>-100</span>
              <span>0</span>
              <span>+100</span>
            </div>
          </div>
        </div>

        <!-- 操作按钮 -->
        <div class="card-actions">
          <button class="btn-action gift" @click="openGiftPanel(neighbor)" title="赠送礼物提升好感度">
            <span class="btn-icon">🎁</span>
            <span class="btn-text">赠送</span>
          </button>
          <button 
            class="btn-action raid" 
            @click="raidNeighbor(neighbor)"
            title="掠夺资源（会降低好感度）"
          >
            <span class="btn-icon">⚔️</span>
            <span class="btn-text">掠夺</span>
          </button>
          <button 
            class="btn-action ally" 
            :disabled="neighbor.favor < 50 || neighbor.allied"
            @click="proposeAlliance(neighbor)"
            :title="neighbor.allied ? '已结盟' : '好感度≥50可结盟'"
          >
            <span class="btn-icon">{{ neighbor.allied ? '✓' : '🤝' }}</span>
            <span class="btn-text">{{ neighbor.allied ? '已盟' : '结盟' }}</span>
          </button>
          <button 
            class="btn-action aid" 
            :disabled="neighbor.favor < 61 || isAidCooldown(neighbor)"
            @click="requestAid(neighbor)"
            :title="neighbor.favor < 61 ? '好感度≥61可请求援助' : '请求援助'"
          >
            <span class="btn-icon">🆘</span>
            <span class="btn-text">援助</span>
          </button>
        </div>
      </div>
    </div>

    <!-- 赠送面板 -->
    <Transition name="slide">
      <div class="gift-panel" v-if="selectedNeighbor">
        <div class="gift-panel-header">
          <span class="gift-target">
            <span class="icon">{{ selectedNeighbor.icon }}</span>
            {{ selectedNeighbor.name }} · {{ selectedNeighbor.title }}
          </span>
          <span class="favor-display" :class="selectedNeighbor.favor >= 0 ? 'positive' : 'negative'">
            好感度: {{ Math.floor(selectedNeighbor.favor) }}
          </span>
          <button class="btn-close" @click="selectedNeighbor = null">✕</button>
        </div>
        
        <div class="gift-panel-body">
          <div class="dialog-line">"{{ getCurrentDialog(selectedNeighbor) }}"</div>

          <div class="gift-row">
            <span class="gift-label">💰 资源</span>
            <div class="gift-buttons">
              <button 
                class="gift-btn"
                :disabled="store.gold < 1000"
                @click="giftResource(selectedNeighbor, 'gold', 1000)"
              >
                🪙 1000 <span class="effect">+{{ getResourceGiftFavor(selectedNeighbor, 'gold') }}</span>
              </button>
              <button 
                class="gift-btn"
                :disabled="store.elixir < 1000"
                @click="giftResource(selectedNeighbor, 'elixir', 1000)"
              >
                💧 1000 <span class="effect">+{{ getResourceGiftFavor(selectedNeighbor, 'elixir') }}</span>
              </button>
              <button 
                class="gift-btn"
                :disabled="store.darkElixir < 100 || store.townHallLevel < 7"
                @click="giftResource(selectedNeighbor, 'dark', 100)"
              >
                🛢️ 100 <span class="effect">+{{ getResourceGiftFavor(selectedNeighbor, 'dark') }}</span>
              </button>
              <button 
                class="gift-btn gem"
                :disabled="store.gems < 10"
                @click="giftResource(selectedNeighbor, 'gems', 10)"
              >
                💎 10 <span class="effect">+{{ getResourceGiftFavor(selectedNeighbor, 'gems') }}</span>
              </button>
            </div>
          </div>

          <div class="gift-row" v-if="availableTroopsForGift.length > 0">
            <span class="gift-label">⚔️ 兵种 <small>本命: {{ selectedNeighbor.favoriteTroops?.join('、') || '无' }}</small></span>
            <div class="gift-buttons troop-scroll">
              <button 
                v-for="troop in availableTroopsForGift"
                :key="troop.id"
                class="gift-btn"
                :class="{ favorite: isFavoriteTroop(selectedNeighbor, troop.name) }"
                :disabled="troop.count < 1"
                @click="giftTroop(selectedNeighbor, troop)"
              >
                {{ troop.name }} <small>Lv.{{ troop.level }}({{ troop.count }})</small>
                <span class="effect" :class="getTroopGiftFavor(selectedNeighbor, troop) < 0 ? 'negative' : ''">
                  {{ getTroopGiftFavor(selectedNeighbor, troop) > 0 ? '+' : '' }}{{ getTroopGiftFavor(selectedNeighbor, troop) }}
                </span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </Transition>

    <!-- 战斗日志弹窗 -->
    <Teleport to="body">
      <Transition name="modal">
        <div class="battle-modal" v-if="battleLogData" @click="battleLogData = null">
          <div class="battle-log-panel" @click.stop>
            <div class="battle-log-header" :class="battleLogData.victory ? 'victory' : 'defeat'">
              <h3>{{ battleLogData.victory ? '⚔️ 战斗胜利' : '💀 战斗失败' }}</h3>
              <div class="battle-stats">
                <span>我方战力: {{ battleLogData.playerPower }}</span>
                <span>vs</span>
                <span>敌方战力: {{ battleLogData.neighborPower }}</span>
              </div>
              <button class="btn-close-log" @click="battleLogData = null">✕</button>
            </div>
            <div class="battle-log-body">
              <div 
                v-for="(log, index) in battleLogData.battleLog" 
                :key="index"
                class="log-item"
                :class="log.type"
              >
                <span class="log-time">[{{ log.time }}]</span>
                <span class="log-text">{{ log.text }}</span>
              </div>
            </div>
            <div class="battle-log-footer" v-if="battleLogData.victory">
              <div class="loot-summary">
                <span class="loot-item gold">🪙 +{{ battleLogData.goldGained }}</span>
                <span class="loot-item elixir">💧 +{{ battleLogData.elixirGained }}</span>
                <span class="loot-item dark" v-if="battleLogData.darkGained > 0">🛢️ +{{ battleLogData.darkGained }}</span>
              </div>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>

    <!-- Toast -->
    <Transition name="toast">
      <div class="toast" v-if="toastMessage" :class="toastType">{{ toastMessage }}</div>
    </Transition>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useGameStore } from '../stores/gameStore'

const store = useGameStore()
const currentFilter = ref('all')
const selectedNeighbor = ref(null)
const toastMessage = ref('')
const toastType = ref('success')
const raidResult = ref(null)
const battleLogData = ref(null)

const friendlyCount = computed(() => store.neighbors.filter(n => n.favor > 20).length)
const neutralCount = computed(() => store.neighbors.filter(n => n.favor >= -20 && n.favor <= 20).length)
const hostileCount = computed(() => store.neighbors.filter(n => n.favor < -20).length)
const allyCount = computed(() => store.neighbors.filter(n => n.allied).length)

const filteredNeighbors = computed(() => {
  if (currentFilter.value === 'friendly') return store.neighbors.filter(n => n.favor > 20)
  if (currentFilter.value === 'neutral') return store.neighbors.filter(n => n.favor >= -20 && n.favor <= 20)
  if (currentFilter.value === 'hostile') return store.neighbors.filter(n => n.favor < -20)
  return store.neighbors
})

const availableTroopsForGift = computed(() => store.troops.filter(t => t.count > 0 && t.unlocked))

function getRelationClass(favor) {
  if (favor <= -60) return 'enemy'
  if (favor <= -20) return 'hostile'
  if (favor <= 20) return 'neutral'
  if (favor <= 60) return 'friendly'
  return 'ally'
}

function getRelationText(favor) {
  if (favor <= -60) return '血仇'
  if (favor <= -20) return '敌对'
  if (favor <= 20) return '中立'
  if (favor <= 60) return '友好'
  return '同盟'
}

function getFavorStyle(favor) {
  const percent = ((favor + 100) / 200) * 100
  let color = '#6b7280'
  if (favor <= -60) color = '#dc2626'
  else if (favor <= -20) color = '#f97316'
  else if (favor <= 20) color = '#6b7280'
  else if (favor <= 60) color = '#22c55e'
  else color = '#3b82f6'
  return { width: `${percent}%`, background: color }
}

function getCurrentDialog(neighbor) {
  const dialogs = neighbor.dialogs || {}
  const favor = neighbor.favor
  if (favor <= -60) return dialogs.enemy || '滚！'
  if (favor <= -20) return dialogs.hostile || '有事？'
  if (favor <= 20) return dialogs.neutral || '你好。'
  if (favor <= 60) return dialogs.friendly || '朋友！'
  return dialogs.ally || '兄弟！'
}

function openGiftPanel(neighbor) { selectedNeighbor.value = neighbor }
function isFavoriteTroop(neighbor, troopName) { return neighbor.favoriteTroops?.includes(troopName) }

function getResourceGiftFavor(neighbor, resourceType) {
  const baseGain = { gold: 3, elixir: 3, dark: 8, gems: 15 }
  let gain = baseGain[resourceType] || 3
  if (neighbor.preferredResources?.includes(resourceType)) gain = Math.floor(gain * 1.5)
  return gain
}

function getTroopGiftFavor(neighbor, troop) {
  let gain = 5
  if (troop.level >= 5 || troop.population >= 10) gain = 25 + Math.floor(troop.level * 2)
  if (isFavoriteTroop(neighbor, troop.name)) gain += 15
  if (troop.level <= 2 && troop.population <= 2) {
    gain = neighbor.personality === 'aggressive' || neighbor.personality === 'theatrical' ? -25 : -5
  }
  return gain
}

function showToast(message, type = 'success') {
  toastMessage.value = message
  toastType.value = type
  setTimeout(() => { toastMessage.value = '' }, 3000)
}

function giftResource(neighbor, type, amount) {
  const result = store.giftToNeighbor(neighbor.id, 'resource', { type, amount })
  showToast(result.message, result.success ? 'success' : 'error')
}

function giftTroop(neighbor, troop) {
  const result = store.giftToNeighbor(neighbor.id, 'troop', { 
    troopId: troop.id, troopName: troop.name, level: troop.level, population: troop.population
  })
  showToast(result.message, result.success ? 'success' : 'error')
}

function proposeAlliance(neighbor) {
  const result = store.proposeAlliance(neighbor.id)
  showToast(result.message, result.success ? 'success' : 'error')
}

function isAidCooldown(neighbor) {
  if (!neighbor.lastAidTime) return false
  return Date.now() - neighbor.lastAidTime < 3600000
}

function requestAid(neighbor) {
  const result = store.requestNeighborAid(neighbor.id)
  showToast(result.message, result.success ? 'success' : 'error')
}

function raidNeighbor(neighbor) {
  const result = store.raidNeighbor(neighbor.id)
  if (result.success) {
    raidResult.value = result
    // 显示战斗日志弹窗
    battleLogData.value = result
  }
  showToast(result.message, result.victory ? 'success' : 'error')
}
</script>

<style scoped>
.neighbor-panel { max-width: 1200px; }

/* 头部区域 */
.panel-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 20px;
  padding-bottom: 16px;
  border-bottom: 1px solid var(--border-color);
}
.header-info h2 { 
  font-size: 22px; 
  font-weight: 600; 
  color: var(--text-primary); 
  margin: 0 0 6px;
  display: flex;
  align-items: center;
  gap: 8px;
}
.panel-desc { color: var(--text-secondary); margin: 0; font-size: 13px; }
.header-stats {
  display: flex;
  gap: 16px;
}
.stat-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 8px 16px;
  background: var(--bg-card);
  border-radius: 10px;
  min-width: 70px;
}
.stat-icon { font-size: 18px; margin-bottom: 2px; }
.stat-value { font-size: 18px; font-weight: 700; color: var(--text-primary); }
.stat-label { font-size: 11px; color: var(--text-secondary); }
.stat-item.ally-count .stat-value { color: #3b82f6; }

/* 筛选标签 - 更明显的设计 */
.filter-tabs {
  display: flex;
  background: var(--bg-card);
  border-radius: 12px;
  padding: 6px;
  margin-bottom: 20px;
  gap: 6px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.05);
}
.tab {
  flex: 1;
  padding: 12px 16px;
  border: none;
  background: transparent;
  border-radius: 10px;
  font-size: 14px;
  color: var(--text-secondary);
  cursor: pointer;
  transition: all 0.25s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  position: relative;
}
.tab:hover { 
  background: var(--hover-bg); 
  color: var(--text-primary);
}
.tab.active { 
  background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
  color: white;
  font-weight: 600;
  box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3);
}
.tab-icon { font-size: 16px; }
.tab-text { font-weight: 500; }
.tab-count { 
  font-size: 12px; 
  padding: 2px 8px; 
  background: rgba(255,255,255,0.2); 
  border-radius: 10px;
  font-weight: 600;
}
.tab:not(.active) .tab-count { background: var(--hover-bg); }
.tab-count.green { color: #22c55e; }
.tab-count.red { color: #dc2626; }
.tab.active .tab-count.green,
.tab.active .tab-count.red { color: white; }

/* 卡片网格 */
.neighbor-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 16px;
  max-height: calc(100vh - 320px);
  overflow-y: auto;
  padding: 4px;
  padding-bottom: 20px;
}

.neighbor-card {
  background: var(--bg-card);
  border-radius: 16px;
  padding: 18px;
  border: 2px solid transparent;
  transition: all 0.25s ease;
  position: relative;
  overflow: hidden;
}
.neighbor-card::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 4px;
  background: var(--border-color);
  transition: all 0.25s;
}
.neighbor-card:hover { 
  transform: translateY(-4px); 
  box-shadow: 0 12px 32px rgba(0,0,0,0.12);
}
.neighbor-card.enemy { border-color: rgba(220, 38, 38, 0.3); }
.neighbor-card.enemy::before { background: linear-gradient(90deg, #dc2626, #ef4444); }
.neighbor-card.hostile { border-color: rgba(249, 115, 22, 0.3); }
.neighbor-card.hostile::before { background: linear-gradient(90deg, #f97316, #fb923c); }
.neighbor-card.neutral { border-color: rgba(107, 114, 128, 0.2); }
.neighbor-card.neutral::before { background: linear-gradient(90deg, #6b7280, #9ca3af); }
.neighbor-card.friendly { border-color: rgba(34, 197, 94, 0.3); }
.neighbor-card.friendly::before { background: linear-gradient(90deg, #22c55e, #4ade80); }
.neighbor-card.ally { border-color: rgba(59, 130, 246, 0.3); }
.neighbor-card.ally::before { background: linear-gradient(90deg, #3b82f6, #60a5fa); }
.neighbor-card.allied { 
  background: linear-gradient(135deg, var(--bg-card) 0%, rgba(59, 130, 246, 0.05) 100%);
}

/* 同盟标记 */
.ally-badge {
  position: absolute;
  top: 12px;
  right: 12px;
  padding: 4px 10px;
  background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
  color: white;
  font-size: 11px;
  font-weight: 600;
  border-radius: 20px;
  box-shadow: 0 2px 8px rgba(59, 130, 246, 0.3);
}

/* 邻邦兵力和资源 */
.neighbor-stats {
  display: flex;
  gap: 8px;
  margin-bottom: 12px;
  padding: 8px 10px;
  background: var(--hover-bg);
  border-radius: 8px;
}
.neighbor-stats .stat-item {
  flex: 1;
  display: flex;
  flex-direction: row;
  align-items: center;
  gap: 4px;
  padding: 0;
  background: none;
  min-width: auto;
}
.neighbor-stats .stat-icon { font-size: 14px; margin-bottom: 0; }
.neighbor-stats .stat-val { 
  font-size: 13px; 
  font-weight: 600; 
  color: var(--text-primary);
}
.neighbor-stats .stat-item.power .stat-val { color: #ef4444; }
.neighbor-stats .stat-item.gold .stat-val { color: #eab308; }
.neighbor-stats .stat-item.elixir .stat-val { color: #a855f7; }

/* 卡片头部 */
.card-header { 
  display: flex; 
  align-items: center; 
  gap: 12px; 
  margin-bottom: 14px;
  margin-top: 4px;
}
.avatar-wrapper {
  width: 48px;
  height: 48px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--hover-bg);
  flex-shrink: 0;
}
.avatar-wrapper.enemy { background: rgba(220, 38, 38, 0.1); }
.avatar-wrapper.hostile { background: rgba(249, 115, 22, 0.1); }
.avatar-wrapper.neutral { background: rgba(107, 114, 128, 0.1); }
.avatar-wrapper.friendly { background: rgba(34, 197, 94, 0.1); }
.avatar-wrapper.ally { background: rgba(59, 130, 246, 0.1); }
.card-icon { font-size: 26px; }
.card-info { flex: 1; min-width: 0; }
.card-name { 
  font-size: 16px; 
  font-weight: 600; 
  color: var(--text-primary); 
  display: block;
  margin-bottom: 2px;
}
.card-type { font-size: 12px; color: var(--text-secondary); }

.status-badge {
  padding: 5px 10px;
  border-radius: 20px;
  font-size: 11px;
  font-weight: 600;
  flex-shrink: 0;
  letter-spacing: 0.3px;
}
.status-badge.enemy { background: rgba(220, 38, 38, 0.12); color: #dc2626; }
.status-badge.hostile { background: rgba(249, 115, 22, 0.12); color: #ea580c; }
.status-badge.neutral { background: rgba(107, 114, 128, 0.12); color: #6b7280; }
.status-badge.friendly { background: rgba(34, 197, 94, 0.12); color: #16a34a; }
.status-badge.ally { background: rgba(59, 130, 246, 0.12); color: #2563eb; }

/* 好感度区域 */
.favor-section { margin-bottom: 14px; }
.favor-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 6px;
}
.favor-label { font-size: 12px; color: var(--text-secondary); font-weight: 500; }
.favor-value { 
  font-size: 14px; 
  font-weight: 700;
  padding: 2px 8px;
  border-radius: 6px;
}
.favor-value.positive { color: #16a34a; background: rgba(34, 197, 94, 0.1); }
.favor-value.negative { color: #dc2626; background: rgba(220, 38, 38, 0.1); }

.favor-bar-wrapper { position: relative; }
.favor-bar { 
  height: 8px; 
  background: var(--hover-bg); 
  border-radius: 4px; 
  overflow: hidden;
  position: relative;
}
.favor-fill { 
  height: 100%; 
  border-radius: 4px; 
  transition: all 0.4s ease;
}
.favor-marker {
  position: absolute;
  top: 0;
  width: 2px;
  height: 100%;
  background: var(--text-secondary);
  opacity: 0.3;
}
.favor-labels {
  display: flex;
  justify-content: space-between;
  margin-top: 4px;
  font-size: 10px;
  color: var(--text-secondary);
  opacity: 0.6;
}

/* 操作按钮 */
.card-actions { 
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 8px;
}
.btn-action {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  padding: 10px 6px;
  border: none;
  border-radius: 10px;
  font-size: 11px;
  cursor: pointer;
  transition: all 0.2s ease;
  background: var(--hover-bg);
  color: var(--text-primary);
}
.btn-icon { font-size: 18px; }
.btn-text { font-weight: 500; }
.btn-action:hover:not(:disabled) { 
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0,0,0,0.1);
}
.btn-action:disabled { opacity: 0.35; cursor: not-allowed; }
.btn-action.gift { 
  background: linear-gradient(135deg, rgba(251, 191, 36, 0.15) 0%, rgba(245, 158, 11, 0.1) 100%);
  color: #d97706;
}
.btn-action.gift:hover:not(:disabled) { background: rgba(251, 191, 36, 0.25); }
.btn-action.raid { 
  background: linear-gradient(135deg, rgba(239, 68, 68, 0.15) 0%, rgba(220, 38, 38, 0.1) 100%);
  color: #dc2626;
}
.btn-action.raid:hover:not(:disabled) { background: rgba(239, 68, 68, 0.25); }
.btn-action.ally { 
  background: linear-gradient(135deg, rgba(59, 130, 246, 0.15) 0%, rgba(37, 99, 235, 0.1) 100%);
  color: #2563eb;
}
.btn-action.ally:hover:not(:disabled) { background: rgba(59, 130, 246, 0.25); }
.btn-action.aid { 
  background: linear-gradient(135deg, rgba(34, 197, 94, 0.15) 0%, rgba(22, 163, 74, 0.1) 100%);
  color: #16a34a;
}
.btn-action.aid:hover:not(:disabled) { background: rgba(34, 197, 94, 0.25); }

/* 赠送面板 */
.gift-panel {
  position: fixed;
  bottom: 0;
  left: 200px;
  right: 0;
  background: var(--bg-card);
  border-top: 1px solid var(--border-color);
  box-shadow: 0 -4px 20px rgba(0, 0, 0, 0.1);
  z-index: 100;
}
.gift-panel-header {
  display: flex;
  align-items: center;
  padding: 12px 20px;
  background: var(--hover-bg);
  border-bottom: 1px solid var(--border-color);
}
.gift-target { display: flex; align-items: center; gap: 8px; font-size: 15px; font-weight: 500; color: var(--text-primary); }
.gift-target .icon { font-size: 20px; }
.favor-display { margin-left: auto; margin-right: 16px; font-size: 14px; font-weight: 600; }
.favor-display.positive { color: #22c55e; }
.favor-display.negative { color: #dc2626; }
.btn-close {
  width: 28px; height: 28px;
  border: none;
  background: var(--bg-secondary);
  color: var(--text-secondary);
  border-radius: 6px;
  font-size: 14px;
  cursor: pointer;
}

.gift-panel-body { padding: 12px 20px; }
.dialog-line {
  font-style: italic;
  color: var(--text-secondary);
  margin-bottom: 12px;
  padding: 8px 12px;
  background: var(--hover-bg);
  border-radius: 6px;
  font-size: 13px;
}

.gift-row { display: flex; align-items: center; gap: 12px; margin-bottom: 10px; }
.gift-label { font-size: 13px; color: var(--text-primary); min-width: 100px; }
.gift-label small { color: var(--text-secondary); font-size: 11px; display: block; }
.gift-buttons { display: flex; flex-wrap: wrap; gap: 6px; flex: 1; }
.troop-scroll { max-width: 600px; overflow-x: auto; flex-wrap: nowrap; }

.gift-btn {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 6px 10px;
  background: var(--bg-secondary);
  border: 1px solid var(--border-color);
  border-radius: 6px;
  font-size: 12px;
  color: var(--text-primary);
  cursor: pointer;
  transition: all 0.2s;
  white-space: nowrap;
}
.gift-btn:hover:not(:disabled) { background: var(--hover-bg); border-color: var(--text-secondary); }
.gift-btn:disabled { opacity: 0.4; cursor: not-allowed; }
.gift-btn.gem { background: rgba(168, 85, 247, 0.1); border-color: rgba(168, 85, 247, 0.3); }
.gift-btn.favorite { background: rgba(251, 191, 36, 0.15); border-color: rgba(251, 191, 36, 0.4); }
.gift-btn small { color: var(--text-secondary); }
.effect { color: #22c55e; font-weight: 600; font-size: 11px; margin-left: 4px; }
.effect.negative { color: #dc2626; }

/* Toast */
.toast {
  position: fixed;
  bottom: 24px;
  left: 50%;
  transform: translateX(-50%);
  padding: 10px 20px;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 500;
  z-index: 9999;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.2);
}
.toast.success { background: #22c55e; color: white; }
.toast.error { background: #dc2626; color: white; }

/* 动画 */
.slide-enter-active, .slide-leave-active { transition: all 0.3s ease; }
.slide-enter-active, .slide-leave-active { transition: all 0.3s ease; }
.slide-enter-from, .slide-leave-to { transform: translateY(100%); }
.toast-enter-active, .toast-leave-active { transition: all 0.3s ease; }
.toast-enter-from, .toast-leave-to { opacity: 0; transform: translateX(-50%) translateY(20px); }

/* 战斗日志弹窗 */
.battle-modal {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.7);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9999;
}
.battle-log-panel {
  width: 90%;
  max-width: 600px;
  max-height: 80vh;
  background: var(--bg-card);
  border-radius: 16px;
  overflow: hidden;
  box-shadow: 0 25px 80px rgba(0, 0, 0, 0.4);
  display: flex;
  flex-direction: column;
}
.battle-log-header {
  padding: 20px 24px;
  position: relative;
  color: white;
}
.battle-log-header.victory {
  background: linear-gradient(135deg, #22c55e 0%, #16a34a 100%);
}
.battle-log-header.defeat {
  background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
}
.battle-log-header h3 {
  margin: 0 0 8px;
  font-size: 20px;
  font-weight: 600;
}
.battle-stats {
  display: flex;
  align-items: center;
  gap: 12px;
  font-size: 14px;
  opacity: 0.9;
}
.btn-close-log {
  position: absolute;
  top: 16px;
  right: 16px;
  width: 32px;
  height: 32px;
  border: none;
  background: rgba(255,255,255,0.2);
  color: white;
  border-radius: 50%;
  font-size: 16px;
  cursor: pointer;
  transition: all 0.2s;
}
.btn-close-log:hover { background: rgba(255,255,255,0.3); }

.battle-log-body {
  flex: 1;
  overflow-y: auto;
  padding: 16px 20px;
  background: var(--bg-secondary);
}
.log-item {
  display: flex;
  gap: 12px;
  padding: 10px 12px;
  margin-bottom: 8px;
  border-radius: 8px;
  background: var(--bg-card);
  font-size: 13px;
  line-height: 1.5;
}
.log-time {
  color: var(--text-secondary);
  font-family: monospace;
  font-size: 12px;
  min-width: 50px;
  flex-shrink: 0;
}
.log-text {
  color: var(--text-primary);
  flex: 1;
}
.log-item.system { border-left: 3px solid #3b82f6; }
.log-item.intel { border-left: 3px solid #f59e0b; }
.log-item.deploy { border-left: 3px solid #22c55e; }
.log-item.battle { border-left: 3px solid #ef4444; }
.log-item.result { 
  border-left: 3px solid #a855f7;
  background: rgba(168, 85, 247, 0.1);
}
.log-item.comment { 
  border-left: 3px solid #6b7280;
  font-style: italic;
}

.battle-log-footer {
  padding: 16px 20px;
  background: var(--bg-card);
  border-top: 1px solid var(--border-color);
}
.loot-summary {
  display: flex;
  justify-content: center;
  gap: 24px;
}
.loot-item {
  font-size: 16px;
  font-weight: 600;
}
.loot-item.gold { color: #eab308; }
.loot-item.elixir { color: #a855f7; }
.loot-item.dark { color: #1e293b; }

/* 弹窗动画 */
.modal-enter-active, .modal-leave-active { transition: all 0.3s ease; }
.modal-enter-from, .modal-leave-to { opacity: 0; }
.modal-enter-from .battle-log-panel,
.modal-leave-to .battle-log-panel {
  transform: scale(0.9) translateY(20px);
}
</style>
