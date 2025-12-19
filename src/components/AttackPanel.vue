<template>
  <div class="panel">
    <div class="header-row">
      <h2 class="panel-title">⚔️ 进攻掠夺</h2>
      <div class="mode-tabs">
        <button class="mode-tab" :class="{ active: attackMode === 'text' }" @click="attackMode = 'text'">📝 文字版</button>
        <button class="mode-tab" :class="{ active: attackMode === 'visual' }" @click="attackMode = 'visual'">🗺️ 地图版</button>
      </div>
    </div>
    
    <!-- 当前军队卡片 -->
    <div class="army-card">
      <div class="army-header">
        <span>当前军队</span>
        <span>{{ store.currentArmy }} / {{ store.armyCapacity }}</span>
      </div>
      <div class="army-list" v-if="activeTroops.length > 0">
        <span v-for="troop in activeTroops" :key="troop.id" class="army-tag">
          {{ troop.name }} ×{{ troop.count }}
        </span>
      </div>
      <div class="army-empty" v-else>
        <span>暂无部队</span>
        <button class="btn-link" @click="store.setMenu('troops')">去训练</button>
      </div>
    </div>
    
    <!-- 搜索对手 -->
    <div class="search-section">
      <div class="search-card" v-if="!currentTarget">
        <p>消耗金币搜索可攻击的村庄</p>
        <p class="no-army-hint" v-if="store.currentArmy === 0">⚠️ 没有可用军队，请先训练部队</p>
        <button class="btn" @click="searchTarget" :disabled="store.gold < 100 || store.currentArmy === 0">
          🔍 搜索对手 (100 金币)
        </button>
      </div>
      
      <!-- 目标村庄卡片 -->
      <div class="target-card" v-else>
        <div class="target-header">
          <div class="target-info">
            <h4>{{ currentTarget.name }}</h4>
            <span class="target-th">{{ currentTarget.townHall }}本</span>
          </div>
          <button class="btn btn-outline btn-sm" @click="searchTarget">下一个</button>
        </div>

        <div class="loot-grid">
          <div class="loot-item">
            <span class="loot-label">金币</span>
            <span class="loot-value gold">{{ formatNumber(currentTarget.gold) }}</span>
          </div>
          <div class="loot-item">
            <span class="loot-label">圣水</span>
            <span class="loot-value elixir">{{ formatNumber(currentTarget.elixir) }}</span>
          </div>
          <div class="loot-item">
            <span class="loot-label">奖杯</span>
            <span class="loot-value trophy">+{{ currentTarget.trophies }}</span>
          </div>
        </div>
        
        <div class="target-defense">
          <span class="defense-label">防御配置:</span>
          <span v-for="(def, index) in currentTarget.defenseDisplay" :key="index" class="defense-tag">{{ def }}</span>
        </div>
      </div>
    </div>

    <!-- 文字版战斗 -->
    <template v-if="attackMode === 'text'">
      <div class="text-battle-section" v-if="currentTarget">
        <div class="attack-warning">
          <span>⚠️ 进攻将消耗所有部队，请确保已准备充足兵力</span>
        </div>
        <button class="btn btn-attack" :disabled="store.currentArmy === 0 || isTextBattling" @click="startTextBattle">
          {{ isTextBattling ? '战斗中...' : '⚔️ 发起进攻' }}
        </button>
        
        <!-- 文字战斗日志 -->
        <div class="battle-log" v-if="battleLog.length > 0">
          <h4>📜 战斗日志</h4>
          <div class="log-content" ref="logContainer">
            <p v-for="(log, i) in battleLog" :key="i" :class="log.type">{{ log.text }}</p>
          </div>
        </div>
      </div>
    </template>

    <!-- 地图版战斗 -->
    <template v-else>
      <div class="visual-battle-section" v-if="currentTarget">
        <div class="visual-layout">
          <!-- 左侧：地图 -->
          <div class="map-side">
            <div class="tips-bar">
              <span v-if="!isVisualBattling && !selectedTroop">👆 选择右侧兵种，点击地图边缘部署</span>
              <span v-else-if="selectedTroop">📍 点击边缘部署 {{ selectedTroop.name }}</span>
              <span v-else>⚔️ 战斗进行中...</span>
            </div>
            <div class="battlefield-container">
              <div ref="stageContainer" class="stage-wrapper"></div>
            </div>
          </div>
          
          <!-- 右侧：兵种选择和控制 -->
          <div class="control-side">
            <div class="troop-selector">
              <h4>🎖️ 选择兵种</h4>
              <div class="troops-list">
                <div v-for="troop in activeTroops" :key="troop.id"
                  class="troop-item" :class="{ selected: selectedTroop?.id === troop.id, depleted: troop.count - getDeployedCount(troop.id) <= 0 }"
                  @click="selectTroop(troop)">
                  <span class="t-icon">{{ getTroopIcon(troop.name) }}</span>
                  <div class="t-info">
                    <span class="t-name">{{ troop.name }}</span>
                    <span class="t-level">Lv.{{ troop.level }}</span>
                  </div>
                  <span class="t-count">{{ troop.count - getDeployedCount(troop.id) }}</span>
                </div>
              </div>
              
              <!-- 援军区域 -->
              <div class="cc-troops" v-if="store.clanCastle.level > 0 && store.clanCastle.troops.length > 0">
                <h4>🏰 援军</h4>
                <div class="troops-list cc-list">
                  <div v-for="(troop, index) in store.clanCastle.troops" :key="'cc-' + index"
                    class="troop-item cc-item" :class="{ selected: selectedTroop?.isClanCastle && selectedTroop?.ccIndex === index, depleted: troop.count - getDeployedCCCount(index) <= 0 }"
                    @click="selectCCTroop(troop, index)">
                    <span class="t-icon">{{ getTroopIcon(troop.name) }}</span>
                    <div class="t-info">
                      <span class="t-name">{{ troop.name }}</span>
                      <span class="t-level">Lv.{{ troop.level }}</span>
                    </div>
                    <span class="t-count">{{ troop.count - getDeployedCCCount(index) }}</span>
                  </div>
                </div>
              </div>
            </div>
            
            <div class="battle-controls">
              <div class="deployed-info">
                <span>已部署: {{ deployedTroops.length }} 兵</span>
              </div>
              <div class="speed-row">
                <span>速度:</span>
                <button v-for="s in [1, 2, 4]" :key="s" class="speed-btn" :class="{ active: battleSpeed === s }" @click="battleSpeed = s">{{ s }}x</button>
              </div>
              <div class="battle-btns">
                <button class="btn btn-battle" @click="startVisualBattle" :disabled="deployedTroops.length === 0 || isVisualBattling" v-if="!isVisualBattling">
                  ⚔️ 开始
                </button>
                <button class="btn btn-surrender" @click="endVisualBattle" v-if="isVisualBattling">
                  🏳️ 结束战斗
                </button>
                <button class="btn btn-reset" @click="resetVisualBattle" :disabled="isVisualBattling">🔄 重置</button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </template>

    <!-- 战斗结果弹窗 -->
    <div class="modal-overlay" v-if="battleResult">
      <div class="modal-card">
        <h3 :class="battleResult.victory ? 'text-win' : 'text-lose'">
          {{ battleResult.victory ? '🎉 胜利!' : '💀 失败' }}
        </h3>
        <div class="stars">{{ '★'.repeat(battleResult.stars) }}{{ '☆'.repeat(3 - battleResult.stars) }}</div>
        <p class="destruction">摧毁率: {{ battleResult.destruction }}%</p>
        <div class="troop-status" v-if="battleResult.deadCount !== undefined">
          <span class="dead-count">☠️ 阵亡 {{ battleResult.deadCount }}</span>
          <span class="survive-count">💪 存活 {{ battleResult.survivingCount }}</span>
        </div>
        <div class="result-loot">
          <span class="loot-gold">+{{ formatNumber(battleResult.goldGained) }} 金币</span>
          <span class="loot-elixir">+{{ formatNumber(battleResult.elixirGained) }} 圣水</span>
        </div>
        <div class="result-trophies" :class="battleResult.trophiesGained >= 0 ? 'trophy-gain' : 'trophy-loss'">
          {{ battleResult.trophiesGained >= 0 ? '+' : '' }}{{ battleResult.trophiesGained }} 🏆
        </div>
        <button class="btn" @click="closeBattleResult">确定</button>
      </div>
    </div>
    
    <!-- 战斗记录 -->
    <h3 class="section-title">📋 战斗记录</h3>
    <div class="history-card" v-if="battleHistory.length > 0">
      <div v-for="(record, index) in battleHistory" :key="index" class="history-item">
        <span class="history-result" :class="record.victory ? 'text-win' : 'text-lose'">
          {{ record.victory ? '胜' : '败' }}
        </span>
        <span class="history-target">{{ record.targetName }}</span>
        <span class="history-stars">{{ '★'.repeat(record.stars) }}</span>
        <span class="history-loot">+{{ formatNumber(record.goldGained) }}</span>
      </div>
    </div>
    <p class="text-muted" v-else>暂无战斗记录</p>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, watch, nextTick } from 'vue'
import { useGameStore } from '../stores/gameStore'
import Konva from 'konva'

const store = useGameStore()

// 模式切换
const attackMode = ref('text') // 'text' | 'visual'

// 通用状态
const currentTarget = ref(null)
const battleResult = ref(null)
const battleHistory = ref([])

// 文字版状态
const isTextBattling = ref(false)
const battleLog = ref([])
const logContainer = ref(null)

// 地图版状态
const stageContainer = ref(null)
const selectedTroop = ref(null)
const deployedTroops = ref([])
const isVisualBattling = ref(false)
const battleSpeed = ref(1)
const shouldEndBattle = ref(false) // 手动结束战斗标记
const currentBattleData = ref(null) // 当前战斗数据

let stage = null
let gridLayer = null
let buildingsLayer = null
let troopsLayer = null
let effectsLayer = null

const GRID_SIZE = 14
const GRID_COLS = 44
const GRID_ROWS = 44
const STAGE_WIDTH = GRID_SIZE * GRID_COLS
const STAGE_HEIGHT = GRID_SIZE * GRID_ROWS

// 敌方建筑数据
const enemyBuildings = ref([])

const activeTroops = computed(() => store.troops.filter(t => t.count > 0))

function formatNumber(num) {
  if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M'
  if (num >= 1000) return (num / 1000).toFixed(0) + 'K'
  return num.toString()
}

const targetNames = ['废弃村庄', '新手营地', '资源矿场', '防御要塞', '黄金部落', '暗影城堡', '哥布林峡谷', '野蛮人营地']

// 防御建筑配置
const defenseConfig = {
  cannon: { name: '加农炮', dps: 15, hp: 500, canAir: false, icon: '🔫', color: '#8B4513' },
  archertower: { name: '箭塔', dps: 12, hp: 400, canAir: true, icon: '🏹', color: '#A0522D' },
  mortar: { name: '迫击炮', dps: 8, hp: 600, canAir: false, splash: true, icon: '💣', color: '#696969' },
  airdefense: { name: '防空火箭', dps: 100, hp: 800, canAir: true, airOnly: true, icon: '🚀', color: '#4169E1' },
  wizardtower: { name: '法师塔', dps: 25, hp: 700, canAir: true, splash: true, icon: '🔮', color: '#9370DB' },
  wall: { name: '城墙', dps: 0, hp: 500, icon: '🧱', color: '#808080', isWall: true },
  goldmine: { name: '金矿', dps: 0, hp: 400, icon: '⛏️', color: '#FFD700', isResource: true },
  elixircollector: { name: '圣水收集器', dps: 0, hp: 400, icon: '💧', color: '#FF69B4', isResource: true },
  goldstorage: { name: '储金罐', dps: 0, hp: 600, icon: '🏦', color: '#DAA520', isResource: true },
  elixirstorage: { name: '圣水瓶', dps: 0, hp: 600, icon: '🧪', color: '#DA70D6', isResource: true }
}

// 城墙数量和等级配置（按大本营等级）
const wallCountByTH = { 1: 0, 2: 25, 3: 50, 4: 75, 5: 100, 6: 125, 7: 175, 8: 225, 9: 250 }
const wallHPByLevel = { 1: 300, 2: 500, 3: 700, 4: 900, 5: 1400, 6: 2000, 7: 2500, 8: 3000, 9: 4000 }

// 兵种配置
const troopConfig = {
  '野蛮人': { hp: 200, dps: 20, isAir: false, role: 'dps', icon: '⚔️', color: '#f4a460', prefer: 'any' },
  '弓箭手': { hp: 80, dps: 15, isAir: false, role: 'dps', icon: '🏹', color: '#ff69b4', prefer: 'any' },
  '巨人': { hp: 800, dps: 25, isAir: false, role: 'tank', icon: '👊', color: '#8b4513', prefer: 'defense' },
  '哥布林': { hp: 100, dps: 20, isAir: false, role: 'dps', icon: '💰', color: '#32cd32', prefer: 'resource' },
  '炸弹人': { hp: 120, dps: 150, isAir: false, role: 'breaker', icon: '💣', color: '#ff6347', prefer: 'wall' },
  '气球兵': { hp: 400, dps: 100, isAir: true, role: 'dps', icon: '🎈', color: '#87ceeb', prefer: 'defense' },
  '法师': { hp: 150, dps: 50, isAir: false, role: 'dps', splash: true, icon: '🔮', color: '#9370db', prefer: 'any' },
  '天使': { hp: 200, dps: 0, isAir: true, role: 'healer', healPerSec: 50, icon: '👼', color: '#fffacd', prefer: 'any' },
  '飞龙': { hp: 1500, dps: 80, isAir: true, role: 'tank', icon: '🐉', color: '#ff4500', prefer: 'any' },
  '皮卡超人': { hp: 3000, dps: 150, isAir: false, role: 'tank', icon: '🤖', color: '#4169e1', prefer: 'any' },
  '戈仑石人': { hp: 4000, dps: 50, isAir: false, role: 'tank', icon: '🗿', color: '#696969', prefer: 'defense' },
  '亡灵': { hp: 120, dps: 40, isAir: true, role: 'dps', icon: '👻', color: '#708090', prefer: 'any' },
  '野猪骑士': { hp: 800, dps: 60, isAir: false, role: 'dps', icon: '🐗', color: '#cd853f', prefer: 'defense', jumpWall: true },
  '熔岩猎犬': { hp: 3000, dps: 20, isAir: true, role: 'tank', icon: '🔥', color: '#8b0000', prefer: 'defense' }
}

function getTroopIcon(name) { return troopConfig[name]?.icon || '👤' }
function getDeployedCount(troopId) { return deployedTroops.value.filter(t => t.troopId === troopId).length }

// 根据大本营等级生成防御配置
function generateDefenses(thLevel) {
  const defenses = []
  const cannonCount = Math.min(thLevel, 9)
  if (cannonCount > 0) defenses.push({ type: 'cannon', count: cannonCount, level: Math.min(thLevel, 9) })
  if (thLevel >= 2) defenses.push({ type: 'archertower', count: Math.min(thLevel - 1, 8), level: Math.min(thLevel, 8) })
  if (thLevel >= 3) defenses.push({ type: 'mortar', count: Math.min(Math.floor((thLevel - 1) / 2), 4), level: Math.min(thLevel - 2, 5) })
  if (thLevel >= 4) defenses.push({ type: 'airdefense', count: Math.min(Math.floor((thLevel - 2) / 2), 3), level: Math.min(thLevel - 3, 6) })
  if (thLevel >= 5) defenses.push({ type: 'wizardtower', count: Math.min(Math.floor((thLevel - 3) / 2), 4), level: Math.min(thLevel - 4, 5) })
  // 资源建筑
  defenses.push({ type: 'goldmine', count: Math.min(thLevel + 1, 8), level: thLevel })
  defenses.push({ type: 'elixircollector', count: Math.min(thLevel + 1, 8), level: thLevel })
  defenses.push({ type: 'goldstorage', count: Math.min(thLevel, 8), level: thLevel })
  defenses.push({ type: 'elixirstorage', count: Math.min(thLevel, 8), level: thLevel })
  return defenses
}

function searchTarget() {
  if (!store.spendGold(100)) return
  resetVisualBattle()
  battleLog.value = []
  
  const thLevel = Math.max(1, store.townHallLevel + Math.floor(Math.random() * 3) - 1)
  const defenses = generateDefenses(thLevel)
  
  currentTarget.value = {
    name: targetNames[Math.floor(Math.random() * targetNames.length)],
    townHall: thLevel,
    townHallHP: 450 + thLevel * 400,
    gold: thLevel * 8000 + Math.floor(Math.random() * 15000),
    elixir: thLevel * 6000 + Math.floor(Math.random() * 12000),
    trophies: Math.floor(Math.random() * 20) + 5 + thLevel * 2,
    defenses: defenses,
    defenseDisplay: defenses.filter(d => defenseConfig[d.type]?.dps > 0).map(d => `${defenseConfig[d.type].name}×${d.count}`)
  }
  
  // 地图版：生成敌方建筑布局
  if (attackMode.value === 'visual') {
    nextTick(() => generateEnemyLayout())
  }
}

// ========== 文字版战斗 ==========
async function startTextBattle() {
  if (store.currentArmy === 0 || !currentTarget.value) return
  isTextBattling.value = true
  battleLog.value = []
  
  const target = currentTarget.value
  addLog(`⚔️ 向 ${target.name} 发起进攻！`, 'info')
  await delay(500)
  
  // 计算军队属性
  let totalArmyHP = 0, totalArmyDPS = 0, airTroopHP = 0, healPerSec = 0, hasTank = false
  const armyComposition = []
  
  store.troops.forEach(t => {
    if (t.count <= 0) return
    const config = troopConfig[t.name]
    if (!config) return
    const levelBonus = 1 + (t.level - 1) * 0.1
    totalArmyHP += config.hp * levelBonus * t.count
    totalArmyDPS += config.dps * levelBonus * t.count
    if (config.isAir) airTroopHP += config.hp * levelBonus * t.count
    if (config.role === 'tank') hasTank = true
    if (config.role === 'healer') healPerSec += config.healPerSec * t.count
    armyComposition.push(`${t.name}×${t.count}`)
  })
  
  addLog(`📋 部署军队: ${armyComposition.join(', ')}`, 'info')
  await delay(400)
  
  // 计算防御属性
  let totalDefenseDPS = 0, antiAirDPS = 0, totalDefenseHP = target.townHallHP
  
  target.defenses.forEach(d => {
    const config = defenseConfig[d.type]
    if (!config || config.dps === 0) return
    const levelBonus = 1 + (d.level - 1) * 0.15
    const dps = config.dps * levelBonus * d.count
    totalDefenseHP += config.hp * levelBonus * d.count
    if (config.airOnly) antiAirDPS += dps
    else if (config.canAir) { totalDefenseDPS += dps * 0.5; antiAirDPS += dps * 0.5 }
    else totalDefenseDPS += dps
  })
  
  addLog(`🏰 敌方防御: ${target.defenseDisplay.join(', ')}`, 'enemy')
  await delay(400)
  
  // 模拟战斗回合
  const airRatio = airTroopHP / (totalArmyHP || 1)
  const effectiveDefenseDPS = totalDefenseDPS * (1 - airRatio) + antiAirDPS * airRatio
  const tankBonus = hasTank ? 0.7 : 1.0
  
  let armyHP = totalArmyHP, defenseHP = totalDefenseHP
  const battleDuration = 180
  let round = 0
  
  addLog(`💥 战斗开始！`, 'battle')
  await delay(300)

  for (let t = 0; t < battleDuration && armyHP > 0 && defenseHP > 0; t += 30) {
    round++
    defenseHP -= totalArmyDPS * 30
    armyHP -= effectiveDefenseDPS * tankBonus * 30
    armyHP = Math.min(totalArmyHP, armyHP + healPerSec * 15)
    
    const armyPercent = Math.max(0, Math.floor((armyHP / totalArmyHP) * 100))
    const defPercent = Math.max(0, Math.floor((defenseHP / totalDefenseHP) * 100))
    
    if (round % 2 === 0) {
      const events = ['我方部队冲锋！', '敌方防御反击！', '激烈交火中...', '战况胶着！']
      addLog(`⚔️ [${round * 30}秒] ${events[round % events.length]} 军队${armyPercent}% | 防御${defPercent}%`, 'battle')
      await delay(200)
    }
  }
  
  // 计算结果
  const defenseDestroyed = Math.max(0, totalDefenseHP - defenseHP)
  let destruction = Math.floor((defenseDestroyed / totalDefenseHP) * 100)
  if (armyHP <= 0 && defenseHP > 0) destruction = Math.min(destruction, 49)
  destruction = Math.min(100, Math.max(0, destruction + Math.floor(Math.random() * 21) - 10))
  
  const stars = destruction >= 100 ? 3 : destruction >= 50 ? 2 : destruction >= 30 ? 1 : 0
  const victory = stars >= 1
  
  // 计算存活率（根据剩余血量比例）
  const survivalRate = Math.max(0, armyHP / totalArmyHP)
  
  if (victory) addLog(`🎉 战斗胜利！摧毁率 ${destruction}%`, 'win')
  else addLog(`💀 战斗失败... 摧毁率 ${destruction}%`, 'lose')
  
  // 计算死亡兵力
  let totalDead = 0
  store.troops.forEach(t => {
    if (t.count > 0) {
      const deadCount = Math.floor(t.count * (1 - survivalRate))
      totalDead += deadCount
      t.count = t.count - deadCount // 只扣除死亡的兵
    }
  })
  
  addLog(`☠️ 阵亡 ${totalDead} 兵，存活率 ${Math.floor(survivalRate * 100)}%`, survivalRate > 0.5 ? 'info' : 'lose')
  
  // 应用结果
  const goldGained = Math.floor(target.gold * (destruction / 100))
  const elixirGained = Math.floor(target.elixir * (destruction / 100))
  const trophiesGained = victory ? target.trophies : -Math.floor(target.trophies / 2)
  
  store.addGold(goldGained)
  store.addElixir(elixirGained)
  store.trophies = Math.max(0, store.trophies + trophiesGained)
  store.builders.forEach(b => { b.fatigue = Math.max(0, (b.fatigue ?? 100) - (10 + Math.floor(Math.random() * 11))) })
  
  // 清空使用的援军
  if (store.clanCastle.troops.length > 0) {
    store.clearClanCastleTroops()
  }
  
  battleResult.value = { victory, stars, destruction, goldGained, elixirGained, trophiesGained }
  battleHistory.value.unshift({ victory, stars, targetName: target.name, goldGained, trophiesGained })
  if (battleHistory.value.length > 5) battleHistory.value.pop()
  
  isTextBattling.value = false
  currentTarget.value = null
}

function addLog(text, type = 'info') {
  battleLog.value.push({ text, type })
  nextTick(() => { if (logContainer.value) logContainer.value.scrollTop = logContainer.value.scrollHeight })
}

function delay(ms) { return new Promise(r => setTimeout(r, ms)) }

// ========== 地图版战斗 ==========
function initStage() {
  if (!stageContainer.value) return
  if (stage) stage.destroy()
  
  stage = new Konva.Stage({ container: stageContainer.value, width: STAGE_WIDTH, height: STAGE_HEIGHT })
  gridLayer = new Konva.Layer()
  buildingsLayer = new Konva.Layer()
  troopsLayer = new Konva.Layer()
  effectsLayer = new Konva.Layer()
  
  stage.add(gridLayer)
  stage.add(buildingsLayer)
  stage.add(troopsLayer)
  stage.add(effectsLayer)
  
  drawGrid()
  stage.on('click tap', handleStageClick)
}

function drawGrid() {
  gridLayer.add(new Konva.Rect({ x: 0, y: 0, width: STAGE_WIDTH, height: STAGE_HEIGHT, fill: '#7CBA5F' }))
  for (let i = 0; i <= GRID_COLS; i++) {
    gridLayer.add(new Konva.Line({ points: [i * GRID_SIZE, 0, i * GRID_SIZE, STAGE_HEIGHT], stroke: '#5A9A3F', strokeWidth: 1, opacity: 0.3 }))
  }
  for (let i = 0; i <= GRID_ROWS; i++) {
    gridLayer.add(new Konva.Line({ points: [0, i * GRID_SIZE, STAGE_WIDTH, i * GRID_SIZE], stroke: '#5A9A3F', strokeWidth: 1, opacity: 0.3 }))
  }
  // 部署区域
  gridLayer.add(new Konva.Rect({ x: 0, y: 0, width: STAGE_WIDTH, height: 2 * GRID_SIZE, fill: 'rgba(255,100,100,0.2)' }))
  gridLayer.add(new Konva.Rect({ x: 0, y: STAGE_HEIGHT - 2 * GRID_SIZE, width: STAGE_WIDTH, height: 2 * GRID_SIZE, fill: 'rgba(255,100,100,0.2)' }))
  gridLayer.add(new Konva.Rect({ x: 0, y: 0, width: 2 * GRID_SIZE, height: STAGE_HEIGHT, fill: 'rgba(255,100,100,0.2)' }))
  gridLayer.add(new Konva.Rect({ x: STAGE_WIDTH - 2 * GRID_SIZE, y: 0, width: 2 * GRID_SIZE, height: STAGE_HEIGHT, fill: 'rgba(255,100,100,0.2)' }))
  gridLayer.draw()
}

function generateEnemyLayout() {
  if (!currentTarget.value) return
  initStage()
  enemyBuildings.value = []
  
  const thLevel = currentTarget.value.townHall
  const centerX = Math.floor(GRID_COLS / 2)
  const centerY = Math.floor(GRID_ROWS / 2)
  
  // 大本营在中心
  const thX = centerX - 2
  const thY = centerY - 2
  drawBuilding('townhall', thX, thY, thLevel, 4, '🏰', '#FFD700', currentTarget.value.townHallHP)
  
  const placed = [{ x: thX, y: thY, size: 4 }]
  
  // 分离防御建筑和资源建筑
  const defenseBuildings = currentTarget.value.defenses.filter(d => defenseConfig[d.type]?.dps > 0)
  const resourceBuildings = currentTarget.value.defenses.filter(d => defenseConfig[d.type]?.isResource)
  
  // 计算城墙范围 - 根据大本营等级决定城墙圈大小
  const wallCount = wallCountByTH[thLevel] || 0
  const wallHP = wallHPByLevel[thLevel] || 500
  const wallCfg = defenseConfig.wall
  
  // 城墙圈的半径根据等级增加
  const baseRadius = 5 + Math.floor(thLevel / 2) // 5-9格半径
  
  // 先放置防御建筑在城墙内（围绕大本营）
  const defensePositions = []
  // 在大本营周围的固定位置放置防御建筑
  const defenseSlots = [
    { dx: -3, dy: -3 }, { dx: 0, dy: -4 }, { dx: 3, dy: -3 },
    { dx: -4, dy: 0 }, { dx: 4, dy: 0 },
    { dx: -3, dy: 3 }, { dx: 0, dy: 4 }, { dx: 3, dy: 3 },
    { dx: -2, dy: -2 }, { dx: 2, dy: -2 }, { dx: -2, dy: 2 }, { dx: 2, dy: 2 },
    { dx: -4, dy: -2 }, { dx: 4, dy: -2 }, { dx: -4, dy: 2 }, { dx: 4, dy: 2 },
    { dx: -2, dy: -4 }, { dx: 2, dy: -4 }, { dx: -2, dy: 4 }, { dx: 2, dy: 4 }
  ]
  
  let slotIndex = 0
  defenseBuildings.forEach(def => {
    const cfg = defenseConfig[def.type]
    if (!cfg) return
    for (let i = 0; i < def.count && slotIndex < defenseSlots.length; i++) {
      const slot = defenseSlots[slotIndex++]
      const posX = centerX + slot.dx
      const posY = centerY + slot.dy
      // 检查是否与已放置的建筑重叠
      const isOccupied = placed.some(p => 
        posX >= p.x && posX < p.x + p.size && posY >= p.y && posY < p.y + p.size
      )
      if (!isOccupied) {
        placed.push({ x: posX, y: posY, size: 1 })
        defensePositions.push({ x: posX, y: posY })
        drawBuilding(def.type, posX, posY, def.level, 1, cfg.icon, cfg.color, 
          cfg.hp * (1 + (def.level - 1) * 0.15), cfg.dps * (1 + (def.level - 1) * 0.15), cfg)
      }
    }
  })
  
  // 生成城墙 - 包围大本营和防御建筑
  if (thLevel >= 2 && wallCount > 0) {
    const wallPositions = []
    
    // 生成方形城墙圈包围核心区域
    for (let x = centerX - baseRadius; x <= centerX + baseRadius; x++) {
      wallPositions.push({ x, y: centerY - baseRadius }) // 上边
      wallPositions.push({ x, y: centerY + baseRadius }) // 下边
    }
    for (let y = centerY - baseRadius + 1; y < centerY + baseRadius; y++) {
      wallPositions.push({ x: centerX - baseRadius, y }) // 左边
      wallPositions.push({ x: centerX + baseRadius, y }) // 右边
    }
    
    // 如果城墙数量足够，添加第二圈
    if (wallCount > wallPositions.length + 20) {
      const outerRadius = baseRadius + 3
      for (let x = centerX - outerRadius; x <= centerX + outerRadius; x++) {
        wallPositions.push({ x, y: centerY - outerRadius })
        wallPositions.push({ x, y: centerY + outerRadius })
      }
      for (let y = centerY - outerRadius + 1; y < centerY + outerRadius; y++) {
        wallPositions.push({ x: centerX - outerRadius, y })
        wallPositions.push({ x: centerX + outerRadius, y })
      }
    }
    
    // 放置城墙（留4个入口）
    const totalWalls = Math.min(wallCount, wallPositions.length)
    const gapInterval = Math.floor(wallPositions.length / 4)
    let wallsPlaced = 0
    
    wallPositions.forEach((pos, idx) => {
      if (wallsPlaced >= totalWalls) return
      // 每隔一段留一个缺口作为入口
      if (idx % gapInterval === Math.floor(gapInterval / 2)) return
      
      const isOccupied = placed.some(p => 
        pos.x >= p.x && pos.x < p.x + p.size && pos.y >= p.y && pos.y < p.y + p.size
      )
      if (!isOccupied && pos.x >= 2 && pos.x < GRID_COLS - 2 && pos.y >= 2 && pos.y < GRID_ROWS - 2) {
        drawBuilding('wall', pos.x, pos.y, thLevel, 1, '', wallCfg.color, wallHP, 0, wallCfg)
        placed.push({ x: pos.x, y: pos.y, size: 1 })
        wallsPlaced++
      }
    })
  }
  
  // 资源建筑放在城墙外围
  const outerSlots = [
    { dx: -8, dy: -6 }, { dx: -6, dy: -8 }, { dx: 0, dy: -9 }, { dx: 6, dy: -8 }, { dx: 8, dy: -6 },
    { dx: -9, dy: 0 }, { dx: 9, dy: 0 },
    { dx: -8, dy: 6 }, { dx: -6, dy: 8 }, { dx: 0, dy: 9 }, { dx: 6, dy: 8 }, { dx: 8, dy: 6 },
    { dx: -7, dy: -3 }, { dx: 7, dy: -3 }, { dx: -7, dy: 3 }, { dx: 7, dy: 3 },
    { dx: -10, dy: -2 }, { dx: 10, dy: -2 }, { dx: -10, dy: 2 }, { dx: 10, dy: 2 },
    { dx: -5, dy: -10 }, { dx: 5, dy: -10 }, { dx: -5, dy: 10 }, { dx: 5, dy: 10 }
  ]
  
  let outerIndex = 0
  resourceBuildings.forEach(def => {
    const cfg = defenseConfig[def.type]
    if (!cfg) return
    for (let i = 0; i < def.count && outerIndex < outerSlots.length; i++) {
      const slot = outerSlots[outerIndex++]
      const posX = centerX + slot.dx
      const posY = centerY + slot.dy
      if (posX >= 2 && posX < GRID_COLS - 2 && posY >= 2 && posY < GRID_ROWS - 2) {
        const isOccupied = placed.some(p => 
          posX >= p.x && posX < p.x + p.size && posY >= p.y && posY < p.y + p.size
        )
        if (!isOccupied) {
          placed.push({ x: posX, y: posY, size: 1 })
          drawBuilding(def.type, posX, posY, def.level, 1, cfg.icon, cfg.color, 
            cfg.hp * (1 + (def.level - 1) * 0.15), 0, cfg)
        }
      }
    }
  })
  
  buildingsLayer.draw()
}

function findRandomPosition(placed, size) {
  for (let attempt = 0; attempt < 100; attempt++) {
    const x = 4 + Math.floor(Math.random() * (GRID_COLS - 8 - size))
    const y = 4 + Math.floor(Math.random() * (GRID_ROWS - 8 - size))
    let valid = true
    for (const p of placed) {
      if (x < p.x + p.size + 1 && x + size + 1 > p.x && y < p.y + p.size + 1 && y + size + 1 > p.y) {
        valid = false; break
      }
    }
    if (valid) return { x, y }
  }
  return null
}

function drawBuilding(type, gridX, gridY, level, size, icon, color, hp, dps = 0, cfg = null) {
  const x = gridX * GRID_SIZE, y = gridY * GRID_SIZE
  const pixelSize = size * GRID_SIZE
  const group = new Konva.Group({ x, y })
  group.add(new Konva.Rect({ width: pixelSize - 1, height: pixelSize - 1, fill: color, cornerRadius: 2, stroke: '#333', strokeWidth: 0.5 }))
  if (GRID_SIZE >= 12) {
    const iconText = new Konva.Text({ text: icon, x: pixelSize / 2, y: pixelSize / 2 - 5, fontSize: size === 4 ? 14 : 10 })
    iconText.offsetX(iconText.width() / 2)
    group.add(iconText)
  }
  buildingsLayer.add(group)
  
  enemyBuildings.value.push({
    type, gridX, gridY, x, y, level, size, hp, maxHp: hp, dps: dps || 0, alive: true, konvaGroup: group,
    isDefense: cfg?.dps > 0, isResource: cfg?.isResource, canAir: cfg?.canAir, airOnly: cfg?.airOnly,
    isWall: cfg?.isWall || false
  })
}

function selectTroop(troop) {
  if (troop.count <= getDeployedCount(troop.id)) return
  selectedTroop.value = selectedTroop.value?.id === troop.id ? null : troop
}

// 选择援军
function selectCCTroop(troop, index) {
  if (troop.count <= getDeployedCCCount(index)) return
  const ccTroop = {
    ...troop,
    id: 'cc-' + index,
    isClanCastle: true,
    ccIndex: index
  }
  selectedTroop.value = selectedTroop.value?.ccIndex === index ? null : ccTroop
}

// 获取已部署的援军数量
function getDeployedCCCount(ccIndex) {
  return deployedTroops.value.filter(t => t.isClanCastle && t.ccIndex === ccIndex).length
}

function handleStageClick() {
  if (!selectedTroop.value || isVisualBattling.value) return
  const pos = stage.getPointerPosition()
  const gridX = Math.floor(pos.x / GRID_SIZE), gridY = Math.floor(pos.y / GRID_SIZE)
  // 只能在边缘部署
  if (gridX < 2 || gridX >= GRID_COLS - 2 || gridY < 2 || gridY >= GRID_ROWS - 2) {
    placeTroop(selectedTroop.value, pos.x, pos.y)
  }
}

function placeTroop(troop, x, y) {
  const cfg = troopConfig[troop.name]
  if (!cfg) { selectedTroop.value = null; return }
  
  // 检查是否还有可部署的兵
  if (troop.isClanCastle) {
    if (getDeployedCCCount(troop.ccIndex) >= troop.count) { selectedTroop.value = null; return }
  } else {
    if (getDeployedCount(troop.id) >= troop.count) { selectedTroop.value = null; return }
  }
  
  const levelBonus = 1 + (troop.level - 1) * 0.1
  const deployed = {
    id: Date.now() + Math.random(), troopId: troop.id, name: troop.name, level: troop.level,
    x, y, hp: cfg.hp * levelBonus, maxHp: cfg.hp * levelBonus, dps: cfg.dps * levelBonus,
    isAir: cfg.isAir, speed: 2, alive: true, prefer: cfg.prefer || 'any', jumpWall: cfg.jumpWall,
    isClanCastle: troop.isClanCastle || false,
    ccIndex: troop.ccIndex
  }
  
  const group = new Konva.Group({ x, y })
  // 兵种圆圈（援军用金色边框）
  const strokeColor = troop.isClanCastle ? '#ffd700' : '#fff'
  group.add(new Konva.Circle({ radius: 9, fill: cfg.color, stroke: strokeColor, strokeWidth: troop.isClanCastle ? 2 : 1.5 }))
  // 兵种名称第一个字
  const nameText = new Konva.Text({
    text: troop.name.charAt(0),
    fontSize: 10,
    fontStyle: 'bold',
    fill: '#fff',
    shadowColor: '#000',
    shadowBlur: 2,
    shadowOffset: { x: 0, y: 0 },
    shadowOpacity: 0.8
  })
  nameText.offsetX(nameText.width() / 2)
  nameText.offsetY(nameText.height() / 2)
  group.add(nameText)
  // 血条
  group.add(new Konva.Rect({ x: -8, y: -14, width: 16, height: 3, fill: '#333', cornerRadius: 1 }))
  const hpBar = new Konva.Rect({ x: -8, y: -14, width: 16, height: 3, fill: '#4CAF50', cornerRadius: 1 })
  group.add(hpBar)
  
  troopsLayer.add(group)
  deployed.konvaGroup = group
  deployed.hpBar = hpBar
  deployedTroops.value.push(deployed)
  troopsLayer.draw()
  
  if (getDeployedCount(troop.id) >= troop.count) selectedTroop.value = null
}

function resetVisualBattle() {
  isVisualBattling.value = false
  deployedTroops.value.forEach(t => t.konvaGroup?.destroy())
  deployedTroops.value = []
  selectedTroop.value = null
  if (troopsLayer) { troopsLayer.destroyChildren(); troopsLayer.draw() }
  if (effectsLayer) { effectsLayer.destroyChildren(); effectsLayer.draw() }
}

async function startVisualBattle() {
  if (deployedTroops.value.length === 0 || isVisualBattling.value) return
  isVisualBattling.value = true
  shouldEndBattle.value = false
  
  const troops = deployedTroops.value.map(t => ({ ...t, lastAttack: 0, path: null, pathIndex: 0 }))
  const buildings = enemyBuildings.value.map(b => ({ ...b, lastAttack: 0 }))
  const totalBuildings = buildings.length
  
  // 存储战斗数据供手动结束时使用
  currentBattleData.value = { troops, buildings, totalBuildings }
  
  // ========== 动态寻路系统 ==========
  
  // 构建碰撞网格（只有城墙是障碍物）
  const buildCollisionGrid = (walls) => {
    const grid = Array(GRID_ROWS).fill(null).map(() => Array(GRID_COLS).fill(0))
    for (const w of walls) {
      if (!w.alive) continue
      const gx = Math.floor(w.x / GRID_SIZE)
      const gy = Math.floor(w.y / GRID_SIZE)
      if (gx >= 0 && gx < GRID_COLS && gy >= 0 && gy < GRID_ROWS) {
        grid[gy][gx] = w // 存储城墙引用
      }
    }
    return grid
  }
  
  // 像素坐标转网格坐标
  const toGrid = (px, py) => ({ gx: Math.floor(px / GRID_SIZE), gy: Math.floor(py / GRID_SIZE) })
  
  // 简化寻路 - 检测直线路径上是否有城墙阻挡
  const hasWallBlocking = (startX, startY, endX, endY, grid) => {
    const start = toGrid(startX, startY)
    const end = toGrid(endX, endY)
    
    // Bresenham 直线算法检测路径上的格子
    let x = start.gx, y = start.gy
    const dx = Math.abs(end.gx - start.gx)
    const dy = Math.abs(end.gy - start.gy)
    const sx = start.gx < end.gx ? 1 : -1
    const sy = start.gy < end.gy ? 1 : -1
    let err = dx - dy
    
    while (true) {
      // 跳过起点
      if (!(x === start.gx && y === start.gy)) {
        if (x >= 0 && x < GRID_COLS && y >= 0 && y < GRID_ROWS) {
          if (grid[y][x] !== 0) return grid[y][x] // 返回阻挡的城墙
        }
      }
      
      if (x === end.gx && y === end.gy) break
      const e2 = 2 * err
      if (e2 > -dy) { err -= dy; x += sx }
      if (e2 < dx) { err += dx; y += sy }
    }
    return null // 没有阻挡
  }
  
  // 根据偏好选择目标建筑
  const selectTarget = (troop, aliveBuildings) => {
    const walls = aliveBuildings.filter(b => b.isWall)
    const defenseOnly = aliveBuildings.filter(b => b.isDefense && !b.isWall)
    const resourceOnly = aliveBuildings.filter(b => b.isResource || b.type === 'townhall')
    const nonWalls = aliveBuildings.filter(b => !b.isWall)
    
    let candidates = []
    
    if (troop.prefer === 'wall') {
      candidates = walls.length > 0 ? walls : nonWalls
    } else if (troop.prefer === 'defense') {
      candidates = defenseOnly.length > 0 ? defenseOnly : nonWalls
    } else if (troop.prefer === 'resource') {
      candidates = resourceOnly.length > 0 ? resourceOnly : nonWalls
    } else {
      candidates = nonWalls
    }
    
    // 找最近的目标
    let target = null, minDist = Infinity
    for (const b of candidates) {
      const dist = Math.hypot(troop.x - b.x - GRID_SIZE / 2, troop.y - b.y - GRID_SIZE / 2)
      if (dist < minDist) {
        minDist = dist
        target = b
      }
    }
    return { target, dist: minDist }
  }
  
  let gameTime = 0
  const maxTime = 180
  const frameInterval = 50
  
  while (gameTime < maxTime && isVisualBattling.value && !shouldEndBattle.value) {
    const speed = battleSpeed.value
    const dt = (frameInterval / 1000) * speed
    gameTime += dt
    
    const aliveTroops = troops.filter(t => t.alive)
    const aliveBuildings = buildings.filter(b => b.alive)
    const aliveWalls = aliveBuildings.filter(b => b.isWall)
    
    if (aliveTroops.length === 0 || aliveBuildings.length === 0) break
    
    // 每帧重建碰撞网格（因为城墙可能被摧毁）
    const collisionGrid = buildCollisionGrid(aliveWalls)
    
    // 兵种行动
    for (const troop of aliveTroops) {
      // 1. 选择目标
      const { target, dist } = selectTarget(troop, aliveBuildings)
      if (!target) continue
      
      const targetCX = target.x + GRID_SIZE / 2
      const targetCY = target.y + GRID_SIZE / 2
      const attackRange = 18
      const moveSpeed = troop.speed * speed * 1.5
      
      // 2. 如果在攻击范围内，直接攻击
      if (dist <= attackRange) {
        target.hp -= troop.dps * dt
        // 攻击特效（每0.3秒显示一次）
        if (gameTime - (troop.lastAttack || 0) > 0.3) {
          troop.lastAttack = gameTime
          showAttackEffect(troop.x, troop.y, targetCX, targetCY, '#FF6B6B')
        }
        if (target.hp <= 0) {
          target.alive = false
          showDestroyEffect(targetCX, targetCY)
          target.konvaGroup?.destroy()
        }
        continue
      }
      
      // 3. 空中单位或能跳墙的单位直接飞向目标
      if (troop.isAir || troop.jumpWall) {
        const dx = targetCX - troop.x
        const dy = targetCY - troop.y
        const len = Math.hypot(dx, dy)
        if (len > 1) {
          troop.x += (dx / len) * moveSpeed
          troop.y += (dy / len) * moveSpeed
          troop.konvaGroup?.position({ x: troop.x, y: troop.y })
        }
        continue
      }
      
      // 4. 地面单位 - 检测直线路径上是否有城墙
      const blockingWall = hasWallBlocking(troop.x, troop.y, targetCX, targetCY, collisionGrid)
      
      if (!blockingWall) {
        // 没有城墙阻挡，直接向目标移动
        const dx = targetCX - troop.x
        const dy = targetCY - troop.y
        const len = Math.hypot(dx, dy)
        if (len > 1) {
          troop.x += (dx / len) * moveSpeed
          troop.y += (dy / len) * moveSpeed
          troop.konvaGroup?.position({ x: troop.x, y: troop.y })
        }
      } else {
        // 有城墙阻挡，移动到城墙并攻击
        const wallCX = blockingWall.x + GRID_SIZE / 2
        const wallCY = blockingWall.y + GRID_SIZE / 2
        const distToWall = Math.hypot(troop.x - wallCX, troop.y - wallCY)
        
        if (distToWall <= GRID_SIZE + 6) {
          // 在攻击范围内，攻击城墙
          blockingWall.hp -= troop.dps * dt
          // 攻击特效
          if (gameTime - (troop.lastAttack || 0) > 0.3) {
            troop.lastAttack = gameTime
            showAttackEffect(troop.x, troop.y, wallCX, wallCY, '#FFA500')
          }
          if (blockingWall.hp <= 0) {
            blockingWall.alive = false
            showDestroyEffect(wallCX, wallCY)
            blockingWall.konvaGroup?.destroy()
          }
        } else {
          // 移动向城墙
          const toWallX = wallCX - troop.x
          const toWallY = wallCY - troop.y
          const toWallLen = Math.hypot(toWallX, toWallY)
          troop.x += (toWallX / toWallLen) * moveSpeed
          troop.y += (toWallY / toWallLen) * moveSpeed
          troop.konvaGroup?.position({ x: troop.x, y: troop.y })
        }
      }
    }

    // 防御建筑攻击
    for (const def of aliveBuildings.filter(b => b.isDefense && b.dps > 0)) {
      let target = null, minDist = Infinity
      for (const t of aliveTroops) {
        // 防空火箭(airOnly)只能攻击空中单位
        if (def.airOnly === true && !t.isAir) continue
        // 不能对空的建筑(如加农炮、迫击炮)无法攻击空中单位
        if (def.canAir === false && t.isAir) continue
        const dist = Math.hypot(def.x + GRID_SIZE/2 - t.x, def.y + GRID_SIZE/2 - t.y)
        if (dist < minDist) { minDist = dist; target = t }
      }
      // 防御射程：防空火箭射程更远(150)，其他建筑(100)
      const attackRange = def.airOnly ? 150 : 100
      if (target && minDist < attackRange) {
        target.hp -= def.dps * dt
        target.hpBar?.width(Math.max(0, (target.hp / target.maxHp) * 16))
        // 防御建筑攻击特效
        if (gameTime - (def.lastAttack || 0) > 0.5) {
          def.lastAttack = gameTime
          showAttackEffect(def.x + GRID_SIZE / 2, def.y + GRID_SIZE / 2, target.x, target.y, '#FFD700')
        }
        if (target.hp <= 0) {
          target.alive = false
          showDestroyEffect(target.x, target.y)
          target.konvaGroup?.destroy()
        }
      }
    }
    
    troopsLayer.draw()
    buildingsLayer.draw()
    effectsLayer.draw()
    await new Promise(r => setTimeout(r, frameInterval))
  }
  
  // 计算结果
  const destroyed = buildings.filter(b => !b.alive).length
  const destruction = Math.floor((destroyed / totalBuildings) * 100)
  const stars = destruction >= 100 ? 3 : destruction >= 50 ? 2 : destruction >= 30 ? 1 : 0
  const victory = stars >= 1
  
  // 统计死亡的兵（只扣除死亡的，存活的保留）
  const deadTroops = troops.filter(t => !t.alive)
  const survivingTroops = troops.filter(t => t.alive)
  const deadCount = deadTroops.length
  const survivingCount = survivingTroops.length
  
  // 按兵种ID统计死亡数量
  const deadByTroopId = {}
  deadTroops.forEach(t => {
    deadByTroopId[t.troopId] = (deadByTroopId[t.troopId] || 0) + 1
  })
  
  // 只扣除死亡的兵
  store.troops.forEach(t => {
    if (deadByTroopId[t.id]) {
      t.count = Math.max(0, t.count - deadByTroopId[t.id])
    }
  })
  
  const target = currentTarget.value
  const goldGained = Math.floor(target.gold * (destruction / 100))
  const elixirGained = Math.floor(target.elixir * (destruction / 100))
  const trophiesGained = victory ? target.trophies : -Math.floor(target.trophies / 2)
  
  store.addGold(goldGained)
  store.addElixir(elixirGained)
  store.trophies = Math.max(0, store.trophies + trophiesGained)
  
  // 清空使用的援军
  if (store.clanCastle.troops.length > 0) {
    store.clearClanCastleTroops()
  }
  
  battleResult.value = { victory, stars, destruction, goldGained, elixirGained, trophiesGained, deadCount, survivingCount }
  battleHistory.value.unshift({ victory, stars, targetName: target.name, goldGained, trophiesGained })
  if (battleHistory.value.length > 5) battleHistory.value.pop()
  
  isVisualBattling.value = false
  currentBattleData.value = null
}

// 攻击特效 - 显示攻击线
function showAttackEffect(fromX, fromY, toX, toY, color) {
  if (!effectsLayer) return
  const line = new Konva.Line({
    points: [fromX, fromY, toX, toY],
    stroke: color,
    strokeWidth: 2,
    opacity: 0.8
  })
  effectsLayer.add(line)
  // 简单动画：逐渐消失
  let opacity = 0.8
  const fadeOut = () => {
    opacity -= 0.15
    if (opacity <= 0) {
      line.destroy()
    } else {
      line.opacity(opacity)
      effectsLayer.draw()
      requestAnimationFrame(fadeOut)
    }
  }
  requestAnimationFrame(fadeOut)
  
  // 火花效果
  const spark = new Konva.Circle({ x: toX, y: toY, radius: 4, fill: color, opacity: 0.8 })
  effectsLayer.add(spark)
  let sparkOpacity = 0.8
  let sparkRadius = 4
  const sparkFade = () => {
    sparkOpacity -= 0.1
    sparkRadius += 1
    if (sparkOpacity <= 0) {
      spark.destroy()
    } else {
      spark.opacity(sparkOpacity)
      spark.radius(sparkRadius)
      effectsLayer.draw()
      requestAnimationFrame(sparkFade)
    }
  }
  requestAnimationFrame(sparkFade)
}

// 摧毁特效
function showDestroyEffect(x, y) {
  if (!effectsLayer) return
  for (let i = 0; i < 6; i++) {
    const p = new Konva.Circle({ x, y, radius: 3, fill: '#FF6B6B' })
    effectsLayer.add(p)
    const angle = (i / 6) * Math.PI * 2
    const targetX = x + Math.cos(angle) * 20
    const targetY = y + Math.sin(angle) * 20
    let progress = 0
    const animate = () => {
      progress += 0.1
      if (progress >= 1) {
        p.destroy()
      } else {
        p.x(x + (targetX - x) * progress)
        p.y(y + (targetY - y) * progress)
        p.opacity(1 - progress)
        effectsLayer.draw()
        requestAnimationFrame(animate)
      }
    }
    requestAnimationFrame(animate)
  }
}

// 手动结束战斗
function endVisualBattle() {
  shouldEndBattle.value = true
}

function closeBattleResult() {
  battleResult.value = null
  currentTarget.value = null
  resetVisualBattle()
}

// 监听模式切换
watch(attackMode, (newMode) => {
  if (newMode === 'visual' && currentTarget.value) {
    nextTick(() => generateEnemyLayout())
  }
})

onMounted(() => {
  if (attackMode.value === 'visual') nextTick(() => initStage())
})

onUnmounted(() => {
  if (stage) stage.destroy()
})
</script>

<style scoped>
.panel { padding: 20px; }
.header-row { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; }
.panel-title { font-size: 22px; font-weight: 600; color: var(--text-primary); margin: 0; }
.mode-tabs { display: flex; gap: 8px; }
.mode-tab { padding: 8px 16px; border: 1px solid var(--border-color); background: var(--bg-card); border-radius: 8px; cursor: pointer; font-size: 14px; color: var(--text-primary); transition: all 0.2s; }
.mode-tab.active { background: var(--text-primary); color: var(--bg-secondary); }
.mode-tab:hover:not(.active) { border-color: var(--text-primary); }

.section-title { font-size: 16px; font-weight: 500; margin: 24px 0 16px; color: var(--text-primary); }

.army-card { background: var(--bg-card); border: 1px solid var(--border-color); border-radius: 12px; padding: 16px; margin-bottom: 16px; }
.army-header { display: flex; justify-content: space-between; margin-bottom: 12px; font-size: 14px; color: var(--text-primary); }
.army-list { display: flex; flex-wrap: wrap; gap: 8px; }
.army-tag { padding: 6px 14px; background: var(--hover-bg); border-radius: 20px; font-size: 14px; color: var(--text-primary); }
.army-empty { display: flex; align-items: center; gap: 12px; color: var(--text-secondary); }
.btn-link { background: none; border: none; color: var(--text-primary); text-decoration: underline; cursor: pointer; }

.search-section { margin-bottom: 20px; }
.search-card { background: var(--bg-card); border: 1px dashed var(--border-color); border-radius: 12px; padding: 32px; text-align: center; }
.search-card p { color: var(--text-secondary); margin-bottom: 16px; }
.no-army-hint { color: #ff9800; font-size: 14px; }

.target-card { background: var(--bg-card); border: 1px solid var(--border-color); border-radius: 12px; padding: 20px; }
.target-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; }
.target-info h4 { font-size: 18px; font-weight: 500; margin-bottom: 4px; color: var(--text-primary); }
.target-th { font-size: 13px; color: var(--text-secondary); }

.loot-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; margin-bottom: 16px; }
.loot-item { background: var(--hover-bg); border-radius: 8px; padding: 12px; text-align: center; }
.loot-label { display: block; font-size: 12px; color: var(--text-secondary); margin-bottom: 4px; }
.loot-value { font-size: 18px; font-weight: 600; }
.loot-value.gold { color: #ffc107; }
.loot-value.elixir { color: #e91e63; }
.loot-value.trophy { color: #ff9800; }

.target-defense { margin-bottom: 16px; }
.defense-label { font-size: 13px; color: var(--text-secondary); margin-right: 8px; }
.defense-tag { display: inline-block; padding: 4px 10px; background: var(--hover-bg); border-radius: 12px; font-size: 13px; margin: 2px 4px 2px 0; color: var(--text-primary); }

.btn { padding: 12px 24px; background: var(--text-primary); color: var(--bg-secondary); border: none; border-radius: 8px; font-size: 14px; cursor: pointer; transition: opacity 0.2s; }
.btn:hover:not(:disabled) { opacity: 0.85; }
.btn:disabled { opacity: 0.5; cursor: not-allowed; }
.btn-outline { background: var(--bg-card); color: var(--text-primary); border: 1px solid var(--border-color); }
.btn-sm { padding: 6px 14px; font-size: 13px; }
.btn-attack { width: 100%; padding: 14px; font-size: 16px; font-weight: 500; }
.btn-reset { background: var(--bg-card); color: var(--text-primary); border: 1px solid var(--border-color); }

.attack-warning { display: flex; align-items: center; gap: 10px; padding: 12px 16px; background: rgba(255, 152, 0, 0.1); border: 1px solid rgba(255, 152, 0, 0.3); border-radius: 8px; margin-bottom: 16px; font-size: 13px; color: #ffb74d; }

/* 文字版战斗 */
.text-battle-section { margin-top: 20px; }
.battle-log { margin-top: 20px; background: var(--bg-card); border: 1px solid var(--border-color); border-radius: 12px; padding: 16px; }
.battle-log h4 { margin: 0 0 12px; font-size: 14px; color: var(--text-primary); }
.log-content { max-height: 300px; overflow-y: auto; font-size: 13px; line-height: 1.8; }
.log-content p { margin: 4px 0; padding: 4px 8px; border-radius: 4px; }
.log-content .info { color: var(--text-secondary); }
.log-content .enemy { color: #f44336; background: rgba(244, 67, 54, 0.1); }
.log-content .battle { color: #ff9800; }
.log-content .win { color: #4caf50; background: rgba(76, 175, 80, 0.1); font-weight: 600; }
.log-content .lose { color: #f44336; background: rgba(244, 67, 54, 0.1); font-weight: 600; }

/* 地图版战斗 - 左右布局 */
.visual-battle-section { margin-top: 20px; }
.visual-layout { display: flex; gap: 16px; }
.map-side { flex: 1; background: var(--bg-card); border: 1px solid var(--border-color); border-radius: 12px; padding: 12px; }
.control-side { width: 220px; display: flex; flex-direction: column; gap: 12px; }
.tips-bar { text-align: center; padding: 8px; font-size: 13px; color: var(--text-secondary); margin-bottom: 8px; }
.battlefield-container { display: flex; justify-content: center; }
.stage-wrapper { border: 2px solid var(--border-color); border-radius: 8px; overflow: hidden; }

.troop-selector { background: var(--bg-card); border: 1px solid var(--border-color); border-radius: 12px; padding: 12px; flex: 1; overflow: hidden; display: flex; flex-direction: column; }
.troop-selector h4 { margin: 0 0 10px; font-size: 14px; color: var(--text-primary); }
.cc-troops { margin-top: 12px; padding-top: 12px; border-top: 1px solid var(--border-color); }
.cc-troops h4 { color: #ffd700; }
.cc-list { max-height: 150px; }
.cc-item { border-color: rgba(255, 215, 0, 0.3); }
.cc-item.selected { border-color: #ffd700; background: rgba(255, 215, 0, 0.1); }
.troops-list { flex: 1; overflow-y: auto; display: flex; flex-direction: column; gap: 6px; max-height: 400px; }
.troop-item { display: flex; align-items: center; gap: 8px; padding: 8px 10px; background: var(--hover-bg); border: 2px solid transparent; border-radius: 8px; cursor: pointer; transition: all 0.2s; }
.troop-item:hover { border-color: var(--border-color); }
.troop-item.selected { border-color: #4caf50; background: rgba(76, 175, 80, 0.1); }
.troop-item.depleted { opacity: 0.5; cursor: not-allowed; }
.t-icon { font-size: 18px; }
.t-info { flex: 1; display: flex; flex-direction: column; }
.t-name { font-size: 13px; color: var(--text-primary); font-weight: 500; }
.t-level { font-size: 11px; color: var(--text-secondary); }
.t-count { font-size: 13px; font-weight: 600; color: var(--text-primary); background: var(--bg-card); padding: 2px 8px; border-radius: 10px; min-width: 28px; text-align: center; }

.battle-controls { background: var(--bg-card); border: 1px solid var(--border-color); border-radius: 12px; padding: 12px; }
.deployed-info { font-size: 13px; color: var(--text-secondary); margin-bottom: 10px; text-align: center; }
.speed-row { display: flex; align-items: center; justify-content: center; gap: 6px; margin-bottom: 10px; font-size: 13px; color: var(--text-primary); }
.speed-btn { padding: 4px 10px; border: 1px solid var(--border-color); background: var(--bg-card); border-radius: 6px; cursor: pointer; font-size: 12px; color: var(--text-primary); }
.speed-btn.active { background: var(--text-primary); color: var(--bg-secondary); }
.battle-btns { display: flex; gap: 8px; }
.btn-battle { flex: 1; padding: 10px; font-size: 14px; }
.btn-surrender { flex: 1; padding: 10px; font-size: 14px; background: #f44336; color: white; }
.btn-surrender:hover { background: #d32f2f; }
.btn-reset { padding: 10px 12px; font-size: 13px; }

/* 结果弹窗 */
.modal-overlay { position: fixed; inset: 0; background: rgba(0, 0, 0, 0.5); display: flex; align-items: center; justify-content: center; z-index: 1000; }
.modal-card { background: var(--bg-card); border-radius: 16px; padding: 32px 40px; text-align: center; min-width: 320px; }
.modal-card h3 { font-size: 28px; margin-bottom: 12px; }
.text-win { color: #4caf50; }
.text-lose { color: #f44336; }
.stars { font-size: 36px; color: #ffc107; margin-bottom: 16px; }
.destruction { color: var(--text-secondary); margin-bottom: 12px; }
.troop-status { display: flex; justify-content: center; gap: 20px; margin-bottom: 12px; font-size: 14px; }
.dead-count { color: #f44336; }
.survive-count { color: #4caf50; }
.result-loot { margin-bottom: 12px; display: flex; justify-content: center; gap: 16px; }
.loot-gold { color: #ffc107; }
.loot-elixir { color: #e91e63; }
.result-trophies { font-size: 18px; font-weight: 600; margin-bottom: 24px; }
.trophy-gain { color: #ff9800; }
.trophy-loss { color: #f44336; }

/* 战斗记录 */
.history-card { background: var(--bg-card); border: 1px solid var(--border-color); border-radius: 12px; overflow: hidden; }
.history-item { display: flex; align-items: center; gap: 16px; padding: 14px 20px; border-bottom: 1px solid var(--border-light); }
.history-item:last-child { border-bottom: none; }
.history-result { font-weight: 600; width: 24px; }
.history-target { flex: 1; color: var(--text-primary); }
.history-stars { color: #ffc107; }
.history-loot { color: var(--text-secondary); font-size: 14px; }
.text-muted { color: var(--text-secondary); }
</style>
