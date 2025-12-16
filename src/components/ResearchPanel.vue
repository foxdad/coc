<template>
  <div class="panel">
    <!-- 未解锁弹窗 -->
    <div class="locked-modal" v-if="!hasLaboratory">
      <div class="locked-content">
        <div class="locked-icon">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
            <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
          </svg>
        </div>
        <h2 class="locked-title">功能已锁定</h2>
        <p class="locked-desc">需要解锁前置建筑</p>
        
        <div class="locked-requirement">
          <div class="req-label">所需建筑:</div>
          <div class="req-building">
            <span class="req-name">研究实验室</span>
            <span class="req-level-badge">Lv 1</span>
          </div>
          <div class="req-current">当前等级: Lv 0</div>
        </div>
        
        <button class="btn-goto" @click="goToBuildings">
          <span class="btn-goto-icon">建</span>
          前往建筑页面
        </button>
      </div>
    </div>

    <!-- 正常内容 -->
    <template v-else>
      <h2 class="panel-title">研究升级</h2>

      <!-- 实验室状态 -->
      <div class="lab-card">
      <div class="lab-icon">实</div>
      <div class="lab-info">
        <h3>实验室 等级 {{ labLevel }}</h3>
        <p class="lab-desc">可研究兵种最高等级: {{ maxResearchLevel }}</p>
      </div>
      <div class="lab-status" :class="{ busy: isResearching }">
        {{ isResearching ? '研究中' : '空闲' }}
      </div>
    </div>

      <!-- 兵种研究列表 -->
      <h3 class="section-title">兵种升级</h3>
      <div class="research-grid">
        <div v-for="troop in researchableTroops" :key="troop.id" class="research-card">
          <div class="research-icon">{{ troop.name.charAt(0) }}</div>
          <div class="research-info">
            <h4>{{ troop.name }}</h4>
            <div class="research-level">
              等级 {{ troop.level }} / {{ getTroopMaxLevel(troop) }}
            </div>
          </div>
          <div class="research-action">
            <div v-if="troop.level >= getTroopMaxLevel(troop)" class="maxed">已满级</div>
            <div v-else-if="troop.level >= getLabMaxLevel(troop)" class="blocked">需升级实验室</div>
            <div v-else class="upgrade-cost">
              <span>{{ formatNumber(getResearchCost(troop)) }} 圣水</span>
              <span class="research-duration">{{ formatTime(getResearchTime(troop)) }}</span>
            </div>
            <button
              v-if="troop.level < getLabMaxLevel(troop)"
              class="btn"
              :disabled="!canResearch(troop)"
              @click="startResearch(troop)"
            >
              {{ isResearching ? '研究中' : '研究' }}
            </button>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useGameStore } from '../stores/gameStore'

const store = useGameStore()

// 定时器
const tick = ref(0)
let timer = null

onMounted(() => {
  timer = setInterval(() => {
    tick.value++
    checkResearchComplete()
  }, 1000)
})

onUnmounted(() => {
  if (timer) clearInterval(timer)
})

// 是否有实验室
const hasLaboratory = computed(() => {
  return store.buildings.some((b) => b.type === 'laboratory')
})

// 实验室等级
const labLevel = computed(() => {
  const lab = store.buildings.find((b) => b.type === 'laboratory')
  return lab ? lab.level : 0
})

// 前往建筑页面
function goToBuildings() {
  store.setMenu('buildings')
}

// 实验室可研究的最高等级
const maxResearchLevel = computed(() => {
  const levels = { 1: 3, 2: 5, 3: 7 }
  // 4级及以上实验室支持全兵种满级
  if (labLevel.value >= 4) return 9
  return levels[labLevel.value] || 3
})

// 当前是否在研究
const isResearching = computed(() => store.currentResearch !== null)
const currentResearch = computed(() => store.currentResearch)

// 研究剩余时间
const researchRemaining = computed(() => {
  tick.value // 触发响应
  if (!store.currentResearch) return 0
  return Math.max(0, Math.ceil((store.currentResearch.endTime - Date.now()) / 1000))
})

// 研究进度
const researchProgress = computed(() => {
  if (!store.currentResearch) return 0
  const total = store.currentResearch.endTime - store.currentResearch.startTime
  const elapsed = Date.now() - store.currentResearch.startTime
  return Math.min(100, (elapsed / total) * 100)
})

// 可研究的兵种列表
const researchableTroops = computed(() => {
  return store.troops.filter((t) => t.unlocked)
})

// 获取兵种在当前实验室等级下的最高可研究等级
// 根据设计文档：1级实验室(3本)、2级实验室(5本)、3级实验室(7本)、4级实验室(9本)
function getLabMaxLevel(troop) {
  // 根据实验室等级和兵种类型确定最高等级
  // 4级及以上实验室都使用满级配置
  const maxLabConfig = { 
    野蛮人: 9, 弓箭手: 9, 巨人: 8, 哥布林: 9, 炸弹人: 8, 
    气球兵: 7, 法师: 7, 天使: 6, 飞龙: 5, 
    皮卡超人: 4, 飞龙宝宝: 3, 女武神: 3, 戈仑石人: 3, 女巫: 2,
    亡灵: 4, 野猪骑士: 4, 熔岩猎犬: 2
  }
  
  const labLimits = {
    // 1级实验室（3本）
    1: { 野蛮人: 3, 弓箭手: 3, 巨人: 2, 哥布林: 3, 炸弹人: 2 },
    // 2级实验室（5本）
    2: { 野蛮人: 5, 弓箭手: 5, 巨人: 4, 哥布林: 5, 炸弹人: 4, 气球兵: 3, 法师: 3 },
    // 3级实验室（7本）- 新增天使、飞龙、亡灵、野猪骑士
    3: { 
      野蛮人: 7, 弓箭手: 7, 巨人: 6, 哥布林: 7, 炸弹人: 6, 
      气球兵: 5, 法师: 5, 天使: 4, 飞龙: 3,
      亡灵: 2, 野猪骑士: 2
    },
  }
  
  // 4级及以上使用满级配置
  const currentLabLevel = labLevel.value
  const limits = currentLabLevel >= 4 ? maxLabConfig : (labLimits[currentLabLevel] || {})
  return limits[troop.name] || troop.maxLevel
}

// 获取兵种最高等级
function getTroopMaxLevel(troop) {
  return troop.maxLevel
}

// 获取研究费用（圣水或暗黑重油）
function getResearchCost(troop) {
  const baseCosts = {
    // 普通兵种（圣水）
    野蛮人: [5000, 10000, 20000, 50000, 100000, 200000, 400000, 800000],
    弓箭手: [5000, 10000, 20000, 50000, 100000, 200000, 400000, 800000],
    巨人: [10000, 25000, 50000, 100000, 200000, 400000, 800000],
    哥布林: [5000, 10000, 20000, 50000, 100000, 200000, 400000, 800000],
    炸弹人: [10000, 25000, 50000, 100000, 200000, 400000, 800000],
    气球兵: [25000, 50000, 100000, 200000, 400000, 800000],
    法师: [50000, 100000, 200000, 400000, 800000, 1500000],
    天使: [100000, 200000, 400000, 800000, 1500000],
    飞龙: [200000, 400000, 800000, 1500000],
    皮卡超人: [400000, 800000, 1500000],
    飞龙宝宝: [500000, 1000000],
    女武神: [400000, 800000],
    戈仑石人: [500000, 1000000],
    女巫: [600000],
    // 暗黑兵种（暗黑重油）- 这里用圣水代替简化
    亡灵: [10000, 20000, 40000],
    野猪骑士: [20000, 40000, 80000],
    熔岩猎犬: [50000],
  }
  const costs = baseCosts[troop.name] || [10000]
  return costs[troop.level - 1] || costs[costs.length - 1]
}

// 获取研究时间（秒）
function getResearchTime(troop) {
  const baseTimes = {
    野蛮人: [60, 120, 300, 600, 900, 1200, 1800, 2400],
    弓箭手: [60, 120, 300, 600, 900, 1200, 1800, 2400],
    巨人: [120, 300, 600, 900, 1200, 1800, 2400],
    哥布林: [60, 120, 300, 600, 900, 1200, 1800, 2400],
    炸弹人: [120, 300, 600, 900, 1200, 1800, 2400],
    气球兵: [300, 600, 900, 1200, 1800, 2400],
    法师: [600, 900, 1200, 1800, 2400, 3600],
    天使: [900, 1200, 1800, 2400, 3600],
    飞龙: [1200, 1800, 2400, 3600],
    皮卡超人: [1800, 2400, 3600],
    飞龙宝宝: [2400, 3600],
    女武神: [1800, 2400],
    戈仑石人: [2400, 3600],
    女巫: [3600],
    亡灵: [600, 900, 1200],
    野猪骑士: [900, 1200, 1800],
    熔岩猎犬: [3600],
  }
  const times = baseTimes[troop.name] || [300]
  return times[troop.level - 1] || times[times.length - 1]
}

// 检查是否可以研究
function canResearch(troop) {
  if (isResearching.value) return false
  if (troop.level >= getLabMaxLevel(troop)) return false
  return store.elixir >= getResearchCost(troop)
}

// 开始研究
function startResearch(troop) {
  const cost = getResearchCost(troop)
  const time = getResearchTime(troop)
  if (store.spendElixir(cost)) {
    store.currentResearch = {
      troopId: troop.id,
      name: troop.name,
      targetLevel: troop.level + 1,
      startTime: Date.now(),
      endTime: Date.now() + time * 1000,
    }
  }
}

// 检查研究是否完成
function checkResearchComplete() {
  if (store.currentResearch && Date.now() >= store.currentResearch.endTime) {
    const troop = store.troops.find((t) => t.id === store.currentResearch.troopId)
    if (troop) {
      troop.level = store.currentResearch.targetLevel
    }
    store.currentResearch = null
  }
}

function formatNumber(num) {
  if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M'
  if (num >= 1000) return Math.floor(num / 1000) + 'K'
  return num.toString()
}

function formatTime(seconds) {
  if (seconds <= 0) return '完成'
  if (seconds < 60) return `${seconds}秒`
  if (seconds < 3600) {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return secs > 0 ? `${mins}分${secs}秒` : `${mins}分`
  }
  const hours = Math.floor(seconds / 3600)
  const mins = Math.floor((seconds % 3600) / 60)
  return mins > 0 ? `${hours}时${mins}分` : `${hours}时`
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

.lab-card {
  background: linear-gradient(135deg, #333 0%, #555 100%);
  border-radius: 12px;
  padding: 20px;
  display: flex;
  align-items: center;
  gap: 16px;
  color: #fff;
  margin-bottom: 16px;
}

.lab-icon {
  width: 56px;
  height: 56px;
  background: rgba(255, 255, 255, 0.15);
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24px;
  font-weight: 600;
}

.lab-info {
  flex: 1;
}

.lab-info h3 {
  font-size: 18px;
  margin-bottom: 4px;
}

.lab-desc {
  font-size: 14px;
  opacity: 0.8;
}

.lab-status {
  padding: 6px 16px;
  background: rgba(76, 175, 80, 0.3);
  border-radius: 20px;
  font-size: 14px;
  color: #8bc34a;
}

.lab-status.busy {
  background: rgba(255, 152, 0, 0.3);
  color: #ffb74d;
}

.research-progress-card {
  background: var(--bg-card);
  border: 1px solid var(--border-light);
  border-radius: 12px;
  padding: 16px;
  margin-bottom: 16px;
}

.research-header {
  display: flex;
  justify-content: space-between;
  margin-bottom: 8px;
}

.research-name {
  font-weight: 500;
  color: var(--text-primary);
}

.research-time {
  color: var(--text-secondary);
}

.research-bar {
  height: 8px;
  background: var(--progress-bg);
  border-radius: 4px;
  overflow: hidden;
}

.research-fill {
  height: 100%;
  background: linear-gradient(90deg, #2196f3, #64b5f6);
  border-radius: 4px;
  transition: width 0.5s ease;
}

.research-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 16px;
}

.research-card {
  background: var(--bg-card);
  border: 1px solid var(--border-light);
  border-radius: 12px;
  padding: 16px;
  display: flex;
  align-items: center;
  gap: 16px;
}

.research-icon {
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

.research-info {
  flex: 1;
}

.research-info h4 {
  font-size: 15px;
  font-weight: 500;
  margin-bottom: 4px;
  color: var(--text-primary);
}

.research-level {
  font-size: 13px;
  color: var(--text-secondary);
}

.research-action {
  text-align: right;
}

.upgrade-cost {
  margin-bottom: 8px;
}

.upgrade-cost span {
  display: block;
  font-size: 13px;
  color: var(--text-secondary);
}

.research-duration {
  font-size: 12px;
  color: var(--text-muted);
}

.maxed,
.blocked {
  font-size: 13px;
  color: var(--text-muted);
  padding: 8px 0;
}

.blocked {
  color: #ff9800;
}

.btn {
  padding: 8px 20px;
  background: var(--text-primary);
  color: var(--bg-secondary);
  border: none;
  border-radius: 6px;
  font-size: 14px;
  cursor: pointer;
  transition: background 0.2s;
}

.btn:hover:not(:disabled) {
  opacity: 0.85;
}

.btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* 锁定弹窗样式 */
.locked-modal {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 60vh;
}

.locked-content {
  background: var(--bg-card);
  border-radius: 20px;
  padding: 40px 48px;
  text-align: center;
  max-width: 400px;
  box-shadow: 0 4px 20px var(--shadow);
}

.locked-icon {
  width: 80px;
  height: 80px;
  background: var(--hover-bg);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto 24px;
  color: var(--text-secondary);
}

.locked-title {
  font-size: 24px;
  font-weight: 600;
  color: var(--text-primary);
  margin-bottom: 8px;
}

.locked-desc {
  font-size: 15px;
  color: var(--text-secondary);
  margin-bottom: 24px;
}

.locked-requirement {
  background: var(--hover-bg);
  border-radius: 12px;
  padding: 20px;
  margin-bottom: 24px;
}

.req-label {
  font-size: 13px;
  color: var(--text-secondary);
  margin-bottom: 12px;
}

.req-building {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  margin-bottom: 8px;
}

.req-name {
  font-size: 18px;
  font-weight: 600;
  color: var(--text-primary);
}

.req-level-badge {
  background: var(--text-primary);
  color: var(--bg-secondary);
  padding: 4px 10px;
  border-radius: 6px;
  font-size: 13px;
  font-weight: 500;
}

.req-current {
  font-size: 14px;
  color: var(--text-muted);
}

.btn-goto {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  width: 100%;
  padding: 14px 24px;
  background: var(--text-primary);
  color: var(--bg-secondary);
  border: none;
  border-radius: 12px;
  font-size: 15px;
  font-weight: 500;
  cursor: pointer;
  transition: opacity 0.2s;
}

.btn-goto:hover {
  opacity: 0.85;
}

.btn-goto-icon {
  width: 24px;
  height: 24px;
  background: rgba(255, 255, 255, 0.2);
  border-radius: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
}
</style>
