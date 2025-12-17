<template>
  <div class="panel">
    <!-- 顶部：标题 + 模式切换 -->
    <div class="header-row">
      <h2 class="panel-title">🏰 排兵布阵</h2>
      <div class="mode-tabs">
        <button class="mode-tab" :class="{ active: mode === 'deploy' }" @click="switchMode('deploy')">🏗️ 布防</button>
        <button class="mode-tab" :class="{ active: mode === 'battle' }" @click="switchMode('battle')">⚔️ 对战</button>
      </div>
    </div>
    
    <!-- 布防模式：地图+建筑并排 -->
    <template v-if="mode === 'deploy'">
      <div class="deploy-layout">
        <!-- 左侧：地图 -->
        <div class="map-section">
          <div class="tips-bar">
            <span v-if="!selectedBuilding">👆 选择右侧建筑，点击地图放置</span>
            <span v-else>📍 点击放置 {{ selectedBuilding.name }}，右键取消</span>
          </div>
          <div class="battlefield-container">
            <div ref="stageContainer" class="stage-wrapper"></div>
          </div>
          <div class="stats-bar">
            <span>已部署: {{ deployedBuildings.length }} | DPS: {{ totalDefenseDPS }} | HP: {{ totalDefenseHP }}</span>
          </div>
        </div>
        
        <!-- 右侧：建筑选择 + 布局槽位 -->
        <div class="sidebar-section">
          <div class="sidebar-card">
            <h3 class="sidebar-title">防御建筑</h3>
            <div class="buildings-grid">
              <div v-for="building in availableDefenseBuildings" :key="building.type"
                class="building-item" :class="{ selected: selectedBuilding?.type === building.type, deployed: isFullyDeployed(building) }"
                @click="selectBuilding(building)">
                <span class="b-icon">{{ getBuildingIcon(building.type) }}</span>
                <div class="b-info">
                  <span class="b-name">{{ building.name }}</span>
                  <span class="b-detail">Lv.{{ building.level }} · {{ getDeployedCount(building.type) }}/{{ building.count }}</span>
                </div>
              </div>
            </div>
          </div>
          
          <div class="sidebar-card">
            <h3 class="sidebar-title">布局方案（点击切换）</h3>
            <div class="layout-tabs">
              <button v-for="slot in 3" :key="slot" 
                class="layout-tab" :class="{ active: currentSlot === slot }"
                @click="switchSlot(slot)">
                布局{{ slot }}
              </button>
            </div>
            <button class="btn btn-clear-full" @click="clearCurrentSlot">🗑️ 清空当前布局</button>
          </div>
        </div>
      </div>
    </template>
    
    <!-- 模拟对战模式 -->
    <template v-else>
      <div class="battle-layout">
        <!-- 左侧：地图 -->
        <div class="map-section">
          <div class="tips-bar">
            <span v-if="!isSimulating && !selectedTroop">👆 选择兵种，点击地图边缘部署</span>
            <span v-else-if="selectedTroop">📍 点击边缘部署 {{ selectedTroop.name }}</span>
            <span v-else>⚔️ 战斗中...</span>
          </div>
          <div class="battlefield-container">
            <div ref="stageContainer" class="stage-wrapper"></div>
          </div>
          <!-- 战斗结果 -->
          <div class="battle-result" v-if="battleResult">
            <span class="result-text" :class="battleResult.victory ? 'victory' : 'defeat'">
              {{ battleResult.victory ? '🎉 胜利' : '💀 失败' }} 
              {{ '⭐'.repeat(battleResult.stars) }}{{ '☆'.repeat(3 - battleResult.stars) }}
              · 摧毁 {{ battleResult.destruction }}% · 存活 {{ battleResult.surviving }}/{{ battleResult.total }}
              · 损失 {{ battleResult.dead || 0 }} 兵
            </span>
          </div>
        </div>
        
        <!-- 右侧：兵种选择 + 控制 -->
        <div class="sidebar-section">
          <div class="sidebar-card">
            <h3 class="sidebar-title">选择兵种（死亡扣减）</h3>
            <div class="troops-grid">
              <div v-for="troop in availableTroops" :key="troop.id"
                class="troop-item" :class="{ selected: selectedTroop?.id === troop.id }"
                @click="selectTroop(troop)">
                <span class="t-icon">{{ getTroopIcon(troop.name) }}</span>
                <div class="t-info">
                  <span class="t-name">{{ troop.name }}</span>
                  <span class="t-detail">Lv.{{ troop.level }} · 剩{{ troop.count - getDeployedTroopCount(troop.id) }}</span>
                </div>
              </div>
            </div>
          </div>
          
          <div class="sidebar-card">
            <h3 class="sidebar-title">战斗控制</h3>
            <div class="speed-row">
              <span>速度:</span>
              <button v-for="s in [1, 2, 4]" :key="s" class="speed-btn" :class="{ active: battleSpeed === s }" @click="battleSpeed = s">{{ s }}x</button>
            </div>
            <div class="battle-btns">
              <button class="btn btn-battle" @click="startBattle" :disabled="deployedTroops.length === 0 || isSimulating">
                {{ isSimulating ? '战斗中...' : '⚔️ 开始' }}
              </button>
              <button class="btn btn-reset" @click="resetBattle" :disabled="isSimulating">🔄 重置</button>
            </div>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, computed, watch, nextTick } from 'vue'
import { useGameStore } from '../stores/gameStore'
import Konva from 'konva'
import gsap from 'gsap'

const store = useGameStore()
const stageContainer = ref(null)

let stage = null
let gridLayer = null
let buildingsLayer = null
let troopsLayer = null
let effectsLayer = null

const GRID_SIZE = 16 // 52格，每格16px
const GRID_COLS = 52
const GRID_ROWS = 52
const STAGE_WIDTH = GRID_SIZE * GRID_COLS  // 832px
const STAGE_HEIGHT = GRID_SIZE * GRID_ROWS // 832px

// 状态
const mode = ref('deploy') // 'deploy' | 'battle'
const selectedBuilding = ref(null)
const selectedTroop = ref(null)
const deployedBuildings = ref([])
const deployedTroops = ref([])
const isSimulating = ref(false)
const battleResult = ref(null)
const battleSpeed = ref(1) // 战斗速度 1x, 2x, 4x
const currentSlot = ref(1)
const layoutSlots = ref({ 1: null, 2: null, 3: null })

// 城墙拖拽放置状态
let isDrawingWall = false
let lastWallGridX = -1
let lastWallGridY = -1

// 建筑配置（防御+资源）
const defenseConfig = {
  // 防御建筑
  cannon: { name: '加农炮', range: 3.5, size: 1, color: '#8B4513', icon: '🔫', canAir: false, dps: [25,35,45,55,65,75,85,95,105], hp: [200,300,400,500,600,700,800,900,1000], isDefense: true },
  archertower: { name: '箭塔', range: 4, size: 1, color: '#A0522D', icon: '🏹', canAir: true, dps: [15,20,25,30,35,40,45,50], hp: [300,400,500,600,700,800,900,1000], isDefense: true },
  mortar: { name: '迫击炮', range: 5.5, minRange: 2, size: 1, color: '#696969', icon: '💣', canAir: false, dps: [80,100,120,140,160], hp: [400,500,600,700,800], isDefense: true },
  airdefense: { name: '防空火箭', range: 5, size: 1, color: '#4169E1', icon: '🚀', canAir: true, airOnly: true, dps: [120,150,180,210], hp: [500,600,700,800], isDefense: true },
  wizardtower: { name: '法师塔', range: 3.5, size: 1, color: '#9370DB', icon: '🔮', canAir: true, dps: [40,50,60,70], hp: [600,700,800,900], isDefense: true },
  xbow: { name: 'X连弩', range: 7, size: 2, color: '#DC143C', icon: '⚔️', canAir: true, dps: [80,90], hp: [1500,1800], isDefense: true },
  wall: { name: '城墙', range: 0, size: 1, color: '#808080', icon: '🧱', isWall: true, dps: [0,0,0,0,0,0,0,0,0], hp: [300,500,700,900,1400,2000,2500,3000,4000] },
  // 资源建筑
  goldmine: { name: '金矿', range: 0, size: 1, color: '#FFD700', icon: '⛏️', isResource: true, dps: [0,0,0,0,0,0,0,0,0], hp: [400,440,480,520,560,600,640,680,720] },
  elixircollector: { name: '圣水收集器', range: 0, size: 1, color: '#FF69B4', icon: '💧', isResource: true, dps: [0,0,0,0,0,0,0,0,0], hp: [400,440,480,520,560,600,640,680,720] },
  goldstorage: { name: '储金罐', range: 0, size: 1, color: '#DAA520', icon: '🏦', isResource: true, dps: [0,0,0,0,0,0,0,0,0], hp: [600,700,800,900,1000,1100,1200,1300,1400] },
  elixirstorage: { name: '圣水瓶', range: 0, size: 1, color: '#DA70D6', icon: '🧪', isResource: true, dps: [0,0,0,0,0,0,0,0,0], hp: [600,700,800,900,1000,1100,1200,1300,1400] },
  darkstorage: { name: '暗黑重油罐', range: 0, size: 1, color: '#2F4F4F', icon: '🛢️', isResource: true, dps: [0,0,0], hp: [2000,2200,2400] },
  darkelixirdrill: { name: '暗黑钻井', range: 0, size: 1, color: '#483D8B', icon: '🔩', isResource: true, dps: [0,0,0], hp: [800,860,920] }
}

// 城墙数量配置（按大本营等级）
const wallCountByTH = { 1: 0, 2: 25, 3: 50, 4: 75, 5: 100, 6: 125, 7: 175, 8: 225, 9: 250 }
// 城墙最高等级（按大本营等级）
const wallMaxLevelByTH = { 1: 0, 2: 2, 3: 3, 4: 4, 5: 5, 6: 6, 7: 7, 8: 8, 9: 9 }

// 兵种配置
// 兵种配置 - 添加攻击偏好 prefer: 'any'(无偏好), 'defense'(防御建筑), 'resource'(资源建筑), 'wall'(城墙)
const troopConfig = {
  '野蛮人': { icon: '⚔️', color: '#f4a460', hp: [200,230,260,290,320,350,380,410,440], dps: [20,25,30,35,40,45,50,55,60], pop: 1, isAir: false, speed: 2, prefer: 'any' },
  '弓箭手': { icon: '🏹', color: '#ff69b4', hp: [80,90,100,110,120,130,140,150,160], dps: [15,18,20,23,25,28,30,33,35], pop: 1, isAir: false, speed: 2, prefer: 'any' },
  '巨人': { icon: '👊', color: '#8b4513', hp: [800,1000,1200,1400,1600,1800,2000,2200], dps: [25,30,35,40,45,50,55,60], pop: 5, isAir: false, speed: 1, prefer: 'defense' },
  '哥布林': { icon: '💰', color: '#32cd32', hp: [100,115,130,145,160,175,190,205,220], dps: [20,25,30,35,40,45,50,55,60], pop: 1, isAir: false, speed: 3, prefer: 'resource' },
  '炸弹人': { icon: '💣', color: '#ff6347', hp: [120,150,180,210,240,270,300,330], dps: [150,200,250,300,350,400,450,500], pop: 2, isAir: false, speed: 2, prefer: 'wall' },
  '气球兵': { icon: '🎈', color: '#87ceeb', hp: [400,500,600,700,800,900,1000], dps: [100,125,150,175,200,225,250], pop: 5, isAir: true, speed: 1.5, prefer: 'defense' },
  '法师': { icon: '🔮', color: '#9370db', hp: [150,175,200,225,250,275,300], dps: [50,60,70,80,90,100,110], pop: 4, isAir: false, speed: 2, prefer: 'any' },
  '飞龙': { icon: '🐉', color: '#ff4500', hp: [1500,1750,2000,2250,2500], dps: [80,90,100,110,120], pop: 20, isAir: true, speed: 1.5, prefer: 'any' },
  '皮卡超人': { icon: '🤖', color: '#4169e1', hp: [3000,3500,4000,4500], dps: [150,175,200,225], pop: 30, isAir: false, speed: 1, prefer: 'any' },
  '天使': { icon: '👼', color: '#fffacd', hp: [600,700,800,900,1000,1100], dps: [0,0,0,0,0,0], pop: 14, isAir: true, speed: 1.5, prefer: 'any', isHealer: true },
  '飞龙宝宝': { icon: '🐲', color: '#ff6b6b', hp: [1000,1100,1200], dps: [60,70,80], pop: 10, isAir: true, speed: 2, prefer: 'any' },
  '女武神': { icon: '⚔️', color: '#dc143c', hp: [1200,1500,1800], dps: [80,100,120], pop: 8, isAir: false, speed: 2, prefer: 'any' },
  '戈仑石人': { icon: '🗿', color: '#696969', hp: [4000,5000,6000], dps: [50,63,75], pop: 30, isAir: false, speed: 0.8, prefer: 'defense' },
  '女巫': { icon: '🧙‍♀️', color: '#800080', hp: [300,350], dps: [50,60], pop: 12, isAir: false, speed: 1.5, prefer: 'any' },
  '亡灵': { icon: '👻', color: '#708090', hp: [120,140,160,180], dps: [40,48,56,64], pop: 2, isAir: true, speed: 2.5, prefer: 'any' },
  '野猪骑士': { icon: '🐗', color: '#cd853f', hp: [800,950,1100,1250], dps: [60,72,84,96], pop: 5, isAir: false, speed: 2.5, prefer: 'defense', jumpWall: true },
  '熔岩猎犬': { icon: '🔥', color: '#8b0000', hp: [5500,6000], dps: [10,15], pop: 30, isAir: true, speed: 1, prefer: 'defense' }
}

// 计算属性 - 可部署的建筑（防御+资源+城墙）
const availableDefenseBuildings = computed(() => {
  const defenseTypes = ['cannon', 'archertower', 'mortar', 'airdefense', 'wizardtower', 'xbow']
  const resourceTypes = ['goldmine', 'elixircollector', 'goldstorage', 'elixirstorage', 'darkstorage', 'darkelixirdrill']
  
  // 防御建筑
  const buildings = store.buildings
    .filter(b => defenseTypes.includes(b.type) || resourceTypes.includes(b.type))
    .filter(b => defenseConfig[b.type]) // 确保有配置
    .map(b => ({ ...b, ...defenseConfig[b.type] }))
  
  // 添加城墙（2本及以上解锁）
  if (store.townHallLevel >= 2) {
    const wallCount = wallCountByTH[store.townHallLevel] || 0
    const wallLevel = wallMaxLevelByTH[store.townHallLevel] || 1
    buildings.push({
      id: 'wall',
      type: 'wall',
      name: '城墙',
      level: wallLevel,
      count: wallCount,
      ...defenseConfig.wall
    })
  }
  
  return buildings
})

const availableTroops = computed(() => store.troops.filter(t => t.count > 0 && t.unlocked))

const totalDefenseDPS = computed(() => deployedBuildings.value.reduce((sum, b) => {
  const cfg = defenseConfig[b.type]
  return sum + (cfg?.dps[b.level - 1] || 0)
}, 0))

const totalDefenseHP = computed(() => deployedBuildings.value.reduce((sum, b) => {
  const cfg = defenseConfig[b.type]
  return sum + (cfg?.hp[b.level - 1] || 0)
}, 0))

// 辅助函数
function getBuildingIcon(type) { return defenseConfig[type]?.icon || '🏠' }
function getTroopIcon(name) { return troopConfig[name]?.icon || '👤' }
function getDeployedCount(type) { return deployedBuildings.value.filter(b => b.type === type).length }
function isFullyDeployed(building) { return getDeployedCount(building.type) >= building.count }
function getDeployedTroopCount(troopId) { return deployedTroops.value.filter(t => t.troopId === troopId).length }

// 模式切换
function switchMode(newMode) {
  if (isSimulating.value) return
  mode.value = newMode
  selectedBuilding.value = null
  selectedTroop.value = null
  if (newMode === 'battle') {
    resetBattle()
  }
  // 切换模式后重新初始化画布
  nextTick(() => reinitStage())
}

// 重新初始化画布（保留建筑数据）
function reinitStage() {
  if (stage) {
    stage.destroy()
    stage = null
  }
  if (!stageContainer.value) return
  
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
  drawTownHall()
  
  stage.on('click tap', handleStageClick)
  stage.on('contextmenu', e => { e.evt.preventDefault(); selectedBuilding.value = null; selectedTroop.value = null })
  
  // 城墙拖拽放置事件
  stage.on('mousedown touchstart', handleWallDrawStart)
  stage.on('mousemove touchmove', handleWallDrawMove)
  stage.on('mouseup touchend mouseleave', handleWallDrawEnd)
  
  // 重新绘制已部署的建筑
  redrawDeployedBuildings()
}

// 选择建筑/兵种
function selectBuilding(building) {
  if (isFullyDeployed(building)) return
  selectedBuilding.value = selectedBuilding.value?.type === building.type ? null : building
}

function selectTroop(troop) {
  if (troop.count <= getDeployedTroopCount(troop.id)) return
  selectedTroop.value = selectedTroop.value?.id === troop.id ? null : troop
}

// 初始化画布
function initStage() {
  if (!stageContainer.value) return
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
  drawTownHall()
  
  stage.on('click tap', handleStageClick)
  stage.on('contextmenu', e => { e.evt.preventDefault(); selectedBuilding.value = null; selectedTroop.value = null })
  
  // 城墙拖拽放置事件
  stage.on('mousedown touchstart', handleWallDrawStart)
  stage.on('mousemove touchmove', handleWallDrawMove)
  stage.on('mouseup touchend mouseleave', handleWallDrawEnd)
  
  loadAllSlots()
}

// 城墙拖拽开始
function handleWallDrawStart(e) {
  if (mode.value !== 'deploy' || !selectedBuilding.value || selectedBuilding.value.type !== 'wall') return
  if (isFullyDeployed(selectedBuilding.value)) return
  
  isDrawingWall = true
  const pos = stage.getPointerPosition()
  const gridX = Math.floor(pos.x / GRID_SIZE)
  const gridY = Math.floor(pos.y / GRID_SIZE)
  
  if (canPlaceBuilding(gridX, gridY, selectedBuilding.value)) {
    placeBuilding(selectedBuilding.value, gridX, gridY)
    lastWallGridX = gridX
    lastWallGridY = gridY
  }
}

// 城墙拖拽移动 - 连续放置
function handleWallDrawMove(e) {
  if (!isDrawingWall || !selectedBuilding.value || selectedBuilding.value.type !== 'wall') return
  if (isFullyDeployed(selectedBuilding.value)) {
    isDrawingWall = false
    return
  }
  
  const pos = stage.getPointerPosition()
  if (!pos) return
  const gridX = Math.floor(pos.x / GRID_SIZE)
  const gridY = Math.floor(pos.y / GRID_SIZE)
  
  // 只在移动到新格子时放置
  if (gridX !== lastWallGridX || gridY !== lastWallGridY) {
    if (canPlaceBuilding(gridX, gridY, selectedBuilding.value)) {
      placeBuilding(selectedBuilding.value, gridX, gridY)
      lastWallGridX = gridX
      lastWallGridY = gridY
    }
  }
}

// 城墙拖拽结束
function handleWallDrawEnd() {
  isDrawingWall = false
  lastWallGridX = -1
  lastWallGridY = -1
}

function drawGrid() {
  gridLayer.add(new Konva.Rect({ x: 0, y: 0, width: STAGE_WIDTH, height: STAGE_HEIGHT, fill: '#7CBA5F' }))
  for (let i = 0; i <= GRID_COLS; i++) {
    gridLayer.add(new Konva.Line({ points: [i * GRID_SIZE, 0, i * GRID_SIZE, STAGE_HEIGHT], stroke: '#5A9A3F', strokeWidth: 1, opacity: 0.4 }))
  }
  for (let i = 0; i <= GRID_ROWS; i++) {
    gridLayer.add(new Konva.Line({ points: [0, i * GRID_SIZE, STAGE_WIDTH, i * GRID_SIZE], stroke: '#5A9A3F', strokeWidth: 1, opacity: 0.4 }))
  }
  // 部署区域标记（边缘2格）
  gridLayer.add(new Konva.Rect({ x: 0, y: 0, width: STAGE_WIDTH, height: 2 * GRID_SIZE, fill: 'rgba(255,100,100,0.2)' }))
  gridLayer.add(new Konva.Rect({ x: 0, y: STAGE_HEIGHT - 2 * GRID_SIZE, width: STAGE_WIDTH, height: 2 * GRID_SIZE, fill: 'rgba(255,100,100,0.2)' }))
  gridLayer.add(new Konva.Rect({ x: 0, y: 0, width: 2 * GRID_SIZE, height: STAGE_HEIGHT, fill: 'rgba(255,100,100,0.2)' }))
  gridLayer.add(new Konva.Rect({ x: STAGE_WIDTH - 2 * GRID_SIZE, y: 0, width: 2 * GRID_SIZE, height: STAGE_HEIGHT, fill: 'rgba(255,100,100,0.2)' }))
  gridLayer.draw()
}

function drawTownHall() {
  // 大本营占4×4格，放在地图中心
  const thSize = 4
  const x = (Math.floor(GRID_COLS / 2) - Math.floor(thSize / 2)) * GRID_SIZE
  const y = (Math.floor(GRID_ROWS / 2) - Math.floor(thSize / 2)) * GRID_SIZE
  const pixelSize = thSize * GRID_SIZE
  const group = new Konva.Group({ x, y, id: 'townhall' })
  group.add(new Konva.Rect({ width: pixelSize - 2, height: pixelSize - 2, x: 1, y: 1, fill: '#FFD700', cornerRadius: 3, stroke: '#B8860B', strokeWidth: 1 }))
  const icon = new Konva.Text({ text: '🏰', x: pixelSize / 2, y: pixelSize / 2 - 8, fontSize: 16 })
  icon.offsetX(icon.width() / 2)
  group.add(icon)
  const lvl = new Konva.Text({ text: `${store.townHallLevel}`, x: pixelSize / 2, y: pixelSize / 2 + 8, fontSize: 10, fill: '#333', fontStyle: 'bold' })
  lvl.offsetX(lvl.width() / 2)
  group.add(lvl)
  buildingsLayer.add(group)
  buildingsLayer.draw()
}

// 处理点击
function handleStageClick() {
  const pos = stage.getPointerPosition()
  const gridX = Math.floor(pos.x / GRID_SIZE)
  const gridY = Math.floor(pos.y / GRID_SIZE)
  
  if (mode.value === 'deploy' && selectedBuilding.value) {
    // 城墙由拖拽事件处理，这里跳过
    if (selectedBuilding.value.type === 'wall') return
    if (canPlaceBuilding(gridX, gridY, selectedBuilding.value)) {
      placeBuilding(selectedBuilding.value, gridX, gridY)
    }
  } else if (mode.value === 'battle' && selectedTroop.value && !isSimulating.value) {
    // 只能在边缘部署兵种
    if (gridX < 2 || gridX >= GRID_COLS - 2 || gridY < 2 || gridY >= GRID_ROWS - 2) {
      placeTroop(selectedTroop.value, pos.x, pos.y)
    }
  }
}

function canPlaceBuilding(gridX, gridY, building) {
  const size = defenseConfig[building.type]?.size || 1
  if (gridX < 0 || gridY < 0 || gridX + size > GRID_COLS || gridY + size > GRID_ROWS) return false
  // 大本营占4×4格
  const thSize = 4
  const thX = Math.floor(GRID_COLS / 2) - Math.floor(thSize / 2)
  const thY = Math.floor(GRID_ROWS / 2) - Math.floor(thSize / 2)
  if (gridX < thX + thSize && gridX + size > thX && gridY < thY + thSize && gridY + size > thY) return false
  for (const d of deployedBuildings.value) {
    const dSize = defenseConfig[d.type]?.size || 1
    if (gridX < d.gridX + dSize && gridX + size > d.gridX && gridY < d.gridY + dSize && gridY + size > d.gridY) return false
  }
  return true
}

function placeBuilding(building, gridX, gridY) {
  const cfg = defenseConfig[building.type]
  const size = cfg.size || 1
  const deployed = { id: Date.now(), type: building.type, name: building.name, level: building.level, gridX, gridY, x: gridX * GRID_SIZE, y: gridY * GRID_SIZE }
  
  const group = new Konva.Group({ x: deployed.x, y: deployed.y, draggable: true })
  const pixelSize = size * GRID_SIZE
  group.add(new Konva.Rect({ width: pixelSize - 1, height: pixelSize - 1, x: 0.5, y: 0.5, fill: cfg.color, cornerRadius: 2, stroke: '#333', strokeWidth: 0.5 }))
  // 格子小时只显示颜色块，不显示图标
  if (GRID_SIZE >= 16) {
    const icon = new Konva.Text({ text: cfg.icon, x: pixelSize / 2, y: pixelSize / 2 - 4, fontSize: size === 2 ? 12 : 10 })
    icon.offsetX(icon.width() / 2)
    group.add(icon)
  }
  
  group.on('dragend', () => {
    const newX = Math.round(group.x() / GRID_SIZE), newY = Math.round(group.y() / GRID_SIZE)
    const idx = deployedBuildings.value.findIndex(b => b.id === deployed.id)
    const temp = deployedBuildings.value.splice(idx, 1)[0]
    if (canPlaceBuilding(newX, newY, building)) {
      deployed.gridX = newX; deployed.gridY = newY; deployed.x = newX * GRID_SIZE; deployed.y = newY * GRID_SIZE
    }
    group.x(deployed.x); group.y(deployed.y)
    deployedBuildings.value.push(temp)
    buildingsLayer.draw()
  })
  
  buildingsLayer.add(group)
  deployed.konvaGroup = group
  deployedBuildings.value.push(deployed)
  gsap.from(group, { scaleX: 0, scaleY: 0, duration: 0.2, ease: 'back.out', onUpdate: () => buildingsLayer.draw() })
  if (isFullyDeployed(building)) selectedBuilding.value = null
}

function placeTroop(troop, x, y) {
  const cfg = troopConfig[troop.name]
  if (!cfg) return
  if (getDeployedTroopCount(troop.id) >= troop.count) { selectedTroop.value = null; return }
  
  const deployed = {
    id: Date.now() + Math.random(), troopId: troop.id, name: troop.name, level: troop.level,
    x, y, hp: cfg.hp[troop.level - 1] || cfg.hp[0], maxHp: cfg.hp[troop.level - 1] || cfg.hp[0],
    dps: cfg.dps[troop.level - 1] || cfg.dps[0], isAir: cfg.isAir, speed: cfg.speed, alive: true,
    prefer: cfg.prefer || 'any', // 攻击偏好
    jumpWall: cfg.jumpWall || false // 是否能跳过城墙
  }
  
  const troopRadius = Math.max(4, GRID_SIZE * 0.4)
  const group = new Konva.Group({ x, y })
  group.add(new Konva.Circle({ radius: troopRadius, fill: cfg.color, stroke: '#fff', strokeWidth: 1 }))
  // HP条
  const hpWidth = troopRadius * 2
  group.add(new Konva.Rect({ x: -hpWidth/2, y: -troopRadius - 4, width: hpWidth, height: 2, fill: '#333', cornerRadius: 1 }))
  const hpBar = new Konva.Rect({ x: -hpWidth/2, y: -troopRadius - 4, width: hpWidth, height: 2, fill: '#4CAF50', cornerRadius: 1, id: `hp-${deployed.id}` })
  group.add(hpBar)
  
  troopsLayer.add(group)
  deployed.konvaGroup = group
  deployed.hpBar = hpBar
  deployedTroops.value.push(deployed)
  
  gsap.from(group, { scaleX: 0, scaleY: 0, duration: 0.2, ease: 'back.out', onUpdate: () => troopsLayer.draw() })
  
  if (getDeployedTroopCount(troop.id) >= troop.count) selectedTroop.value = null
}

// 重新绘制已部署的建筑（用于模式切换后恢复）
function redrawDeployedBuildings() {
  const buildings = [...deployedBuildings.value]
  deployedBuildings.value = []
  buildings.forEach(b => {
    const cfg = defenseConfig[b.type]
    const size = cfg.size || 1
    const deployed = { id: b.id, type: b.type, name: b.name, level: b.level, gridX: b.gridX, gridY: b.gridY, x: b.x, y: b.y }
    
    const pixelSize = size * GRID_SIZE
    const group = new Konva.Group({ x: deployed.x, y: deployed.y, draggable: mode.value === 'deploy' })
    group.add(new Konva.Rect({ width: pixelSize - 1, height: pixelSize - 1, x: 0.5, y: 0.5, fill: cfg.color, cornerRadius: 2, stroke: '#333', strokeWidth: 0.5 }))
    if (GRID_SIZE >= 16) {
      const icon = new Konva.Text({ text: cfg.icon, x: pixelSize / 2, y: pixelSize / 2 - 4, fontSize: size === 2 ? 12 : 10 })
      icon.offsetX(icon.width() / 2)
      group.add(icon)
    }
    
    if (mode.value === 'deploy') {
      group.on('dragend', () => {
        const newX = Math.round(group.x() / GRID_SIZE), newY = Math.round(group.y() / GRID_SIZE)
        const idx = deployedBuildings.value.findIndex(item => item.id === deployed.id)
        const temp = deployedBuildings.value.splice(idx, 1)[0]
        if (canPlaceBuilding(newX, newY, { type: b.type })) {
          deployed.gridX = newX; deployed.gridY = newY; deployed.x = newX * GRID_SIZE; deployed.y = newY * GRID_SIZE
        }
        group.x(deployed.x); group.y(deployed.y)
        deployedBuildings.value.push(temp)
        buildingsLayer.draw()
      })
    }
    
    buildingsLayer.add(group)
    deployed.konvaGroup = group
    deployedBuildings.value.push(deployed)
  })
  buildingsLayer.draw()
}

// 清空/重置
function clearDeployment() {
  deployedBuildings.value.forEach(b => b.konvaGroup?.destroy())
  deployedBuildings.value = []
  if (buildingsLayer) buildingsLayer.draw()
}

function resetBattle() {
  isSimulating.value = false
  battleResult.value = null
  deployedTroops.value.forEach(t => t.konvaGroup?.destroy())
  deployedTroops.value = []
  // 重置建筑状态
  deployedBuildings.value.forEach(b => { b.currentHp = null; b.alive = true })
  troopsLayer.destroyChildren()
  effectsLayer.destroyChildren()
  troopsLayer.draw()
  effectsLayer.draw()
}

// 开始战斗
async function startBattle() {
  if (isSimulating.value || deployedTroops.value.length === 0) return
  isSimulating.value = true
  battleResult.value = null
  
  // 初始化防御建筑战斗状态
  // 初始化所有建筑（防御+资源+城墙）
  const allBuildings = deployedBuildings.value.map(b => {
    const cfg = defenseConfig[b.type]
    return { 
      ...b, 
      currentHp: cfg.hp[b.level - 1] || 500, 
      maxHp: cfg.hp[b.level - 1] || 500, 
      dps: cfg.dps[b.level - 1] || 0, 
      range: cfg.range || 0, 
      canAir: cfg.canAir, 
      airOnly: cfg.airOnly, 
      isDefense: cfg.isDefense || false,
      isResource: cfg.isResource || false,
      isWall: cfg.isWall || false,
      alive: true, 
      lastAttack: 0 
    }
  })
  
  // 大本营（算作资源建筑）
  const thHp = 450 + store.townHallLevel * 400
  const townHall = { name: '大本营', currentHp: thHp, maxHp: thHp, alive: true, x: Math.floor(GRID_COLS / 2) * GRID_SIZE, y: Math.floor(GRID_ROWS / 2) * GRID_SIZE, isResource: true }
  
  const troops = deployedTroops.value.map(t => ({ ...t, lastAttack: 0 }))
  const totalTroops = troops.length
  const totalBuildings = allBuildings.length + 1
  
  // 战斗循环 - 使用速度控制
  let gameTime = 0
  const maxGameTime = 180 // 180秒
  const frameInterval = 50 // 50ms per frame (20fps)
  
  while (gameTime < maxGameTime && isSimulating.value) {
    const speed = battleSpeed.value
    const dt = (frameInterval / 1000) * speed // 实际时间增量
    gameTime += dt
    
    const aliveTroops = troops.filter(t => t.alive)
    const aliveBuildings = allBuildings.filter(d => d.alive)
    
    if (aliveTroops.length === 0) break
    if (aliveBuildings.length === 0 && !townHall.alive) break
    
    // 兵种行动 - 根据攻击偏好选择目标
    for (const troop of aliveTroops) {
      let target = null, minDist = Infinity
      
      // 分类建筑
      const walls = aliveBuildings.filter(d => d.isWall)
      const defenseOnly = aliveBuildings.filter(d => d.isDefense)
      const resourceOnly = aliveBuildings.filter(d => d.isResource)
      const nonWalls = aliveBuildings.filter(d => !d.isWall)
      
      // 根据攻击偏好选择目标
      if (troop.prefer === 'wall') {
        // 炸弹人：专门攻击城墙
        for (const wall of walls) {
          const dist = Math.hypot(troop.x - wall.x - GRID_SIZE/2, troop.y - wall.y - GRID_SIZE/2)
          if (dist < minDist) { minDist = dist; target = wall }
        }
        // 没有城墙了就攻击其他建筑
        if (!target) {
          for (const def of nonWalls) {
            const dist = Math.hypot(troop.x - def.x - GRID_SIZE/2, troop.y - def.y - GRID_SIZE/2)
            if (dist < minDist) { minDist = dist; target = def }
          }
        }
      } else if (troop.prefer === 'defense') {
        // 巨人/气球兵/野猪骑士：优先攻击防御建筑
        for (const def of defenseOnly) {
          const dist = Math.hypot(troop.x - def.x - GRID_SIZE/2, troop.y - def.y - GRID_SIZE/2)
          if (dist < minDist) { minDist = dist; target = def }
        }
        // 没有防御建筑了就攻击其他建筑
        if (!target) {
          for (const b of nonWalls) {
            const dist = Math.hypot(troop.x - b.x - GRID_SIZE/2, troop.y - b.y - GRID_SIZE/2)
            if (dist < minDist) { minDist = dist; target = b }
          }
        }
        // 检查路径上是否有城墙挡路（空中单位和能跳墙的单位不受影响）
        if (target && !troop.isAir && !troop.jumpWall) {
          for (const wall of walls) {
            const wallDist = Math.hypot(troop.x - wall.x - GRID_SIZE/2, troop.y - wall.y - GRID_SIZE/2)
            if (wallDist < minDist * 0.7) { target = wall; minDist = wallDist }
          }
        }
      } else if (troop.prefer === 'resource') {
        // 哥布林：优先攻击资源建筑
        for (const res of resourceOnly) {
          const dist = Math.hypot(troop.x - res.x - GRID_SIZE/2, troop.y - res.y - GRID_SIZE/2)
          if (dist < minDist) { minDist = dist; target = res }
        }
        // 也攻击大本营（算资源）
        if (townHall.alive) {
          const thDist = Math.hypot(troop.x - townHall.x, troop.y - townHall.y)
          if (thDist < minDist) { minDist = thDist; target = townHall }
        }
        // 没有资源建筑了就攻击其他建筑
        if (!target) {
          for (const b of nonWalls) {
            const dist = Math.hypot(troop.x - b.x - GRID_SIZE/2, troop.y - b.y - GRID_SIZE/2)
            if (dist < minDist) { minDist = dist; target = b }
          }
        }
        // 检查路径上是否有城墙挡路
        if (target && !troop.isAir && !troop.jumpWall) {
          for (const wall of walls) {
            const wallDist = Math.hypot(troop.x - wall.x - GRID_SIZE/2, troop.y - wall.y - GRID_SIZE/2)
            if (wallDist < minDist * 0.7) { target = wall; minDist = wallDist }
          }
        }
      } else {
        // 无偏好：攻击最近的建筑（不含城墙，除非挡路）
        for (const b of nonWalls) {
          const dist = Math.hypot(troop.x - b.x - GRID_SIZE/2, troop.y - b.y - GRID_SIZE/2)
          if (dist < minDist) { minDist = dist; target = b }
        }
        // 检查路径上是否有城墙挡路
        if (target && !troop.isAir && !troop.jumpWall) {
          for (const wall of walls) {
            const wallDist = Math.hypot(troop.x - wall.x - GRID_SIZE/2, troop.y - wall.y - GRID_SIZE/2)
            if (wallDist < minDist * 0.7) { target = wall; minDist = wallDist }
          }
        }
      }
      
      // 如果没有目标，攻击大本营
      if (!target && townHall.alive) {
        target = townHall
        minDist = Math.hypot(troop.x - townHall.x, troop.y - townHall.y)
      }
      
      if (target) {
        const targetX = target.x + (target.gridX !== undefined ? GRID_SIZE/2 : 0)
        const targetY = target.y + (target.gridY !== undefined ? GRID_SIZE/2 : 0)
        
        if (minDist > GRID_SIZE * 1.2) {
          // 移动
          const angle = Math.atan2(targetY - troop.y, targetX - troop.x)
          troop.x += Math.cos(angle) * troop.speed * GRID_SIZE * dt
          troop.y += Math.sin(angle) * troop.speed * GRID_SIZE * dt
          troop.konvaGroup?.x(troop.x)
          troop.konvaGroup?.y(troop.y)
        } else {
          // 攻击 - 添加攻击特效
          target.currentHp -= troop.dps * dt
          if (gameTime - troop.lastAttack > 0.3) {
            troop.lastAttack = gameTime
            showAttackEffect(troop.x, troop.y, targetX, targetY, '#FF6B6B')
          }
          if (target.currentHp <= 0 && target.alive) {
            target.alive = false
            showDestroyEffect(targetX, targetY)
            if (target.konvaGroup) gsap.to(target.konvaGroup, { opacity: 0.3, duration: 0.3 / speed, onUpdate: () => buildingsLayer.draw() })
          }
        }
      }
    }
    
    // 防御建筑攻击（只有isDefense的建筑才能攻击）
    const aliveDefenses = aliveBuildings.filter(b => b.isDefense)
    for (const def of aliveDefenses) {
      if (!def.range || def.range <= 0) continue // 没有攻击范围的不攻击
      let target = null, minDist = Infinity
      for (const troop of aliveTroops) {
        if (def.airOnly && !troop.isAir) continue
        if (!def.canAir && troop.isAir) continue
        const dist = Math.hypot(troop.x - def.x - GRID_SIZE/2, troop.y - def.y - GRID_SIZE/2)
        if (dist <= def.range * GRID_SIZE && dist < minDist) { minDist = dist; target = troop }
      }
      if (target) {
        target.hp -= def.dps * dt
        // 攻击特效
        if (gameTime - def.lastAttack > 0.5) {
          def.lastAttack = gameTime
          const defX = def.x + GRID_SIZE/2
          const defY = def.y + GRID_SIZE/2
          showAttackEffect(defX, defY, target.x, target.y, '#FFD700')
        }
        // 更新HP条
        if (target.hpBar) {
          const pct = Math.max(0, target.hp / target.maxHp)
          const troopRadius = Math.max(4, GRID_SIZE * 0.4)
          const hpWidth = troopRadius * 2
          target.hpBar.width(hpWidth * pct)
          target.hpBar.fill(pct > 0.5 ? '#4CAF50' : pct > 0.25 ? '#FF9800' : '#F44336')
        }
        if (target.hp <= 0 && target.alive) {
          target.alive = false
          showDestroyEffect(target.x, target.y)
          if (target.konvaGroup) gsap.to(target.konvaGroup, { opacity: 0, scaleX: 0, scaleY: 0, duration: 0.2 / speed, onComplete: () => { target.konvaGroup?.destroy(); troopsLayer.draw() } })
        }
      }
    }
    
    // 更新画面
    troopsLayer.draw()
    effectsLayer.draw()
    await new Promise(r => setTimeout(r, frameInterval))
  }
  
  // 计算结果
  const destroyed = allBuildings.filter(d => !d.alive).length + (townHall.alive ? 0 : 1)
  const destruction = Math.floor((destroyed / totalBuildings) * 100)
  const deadTroops = troops.filter(t => !t.alive)
  const surviving = troops.filter(t => t.alive).length
  let stars = 0
  if (!townHall.alive) stars++
  if (destruction >= 50) stars++
  if (destruction >= 100) stars++
  
  // 扣减死亡的兵种数量
  deadTroops.forEach(dead => {
    const troop = store.troops.find(t => t.id === dead.troopId)
    if (troop && troop.count > 0) {
      troop.count -= 1
    }
  })
  
  battleResult.value = { victory: stars >= 1, stars, destruction, surviving, total: totalTroops, dead: deadTroops.length }
  isSimulating.value = false
}

// 攻击特效 - 显示攻击线
function showAttackEffect(fromX, fromY, toX, toY, color) {
  const line = new Konva.Line({
    points: [fromX, fromY, toX, toY],
    stroke: color,
    strokeWidth: 1,
    opacity: 0.8
  })
  effectsLayer.add(line)
  gsap.to(line, { opacity: 0, duration: 0.15, onComplete: () => line.destroy() })
  
  // 命中点火花
  const sparkSize = Math.max(2, GRID_SIZE * 0.3)
  const spark = new Konva.Circle({ x: toX, y: toY, radius: sparkSize, fill: color, opacity: 0.8 })
  effectsLayer.add(spark)
  gsap.to(spark, { radius: sparkSize * 2, opacity: 0, duration: 0.2, onComplete: () => spark.destroy() })
}

function showDestroyEffect(x, y) {
  const particleSize = Math.max(2, GRID_SIZE * 0.2)
  const spread = GRID_SIZE * 1.5
  for (let i = 0; i < 6; i++) {
    const p = new Konva.Circle({ x, y, radius: particleSize, fill: '#FF6B6B' })
    effectsLayer.add(p)
    const angle = (i / 6) * Math.PI * 2
    gsap.to(p, { x: x + Math.cos(angle) * spread, y: y + Math.sin(angle) * spread, opacity: 0, duration: 0.4, onComplete: () => p.destroy() })
  }
  effectsLayer.draw()
}

// 布局切换 - 点击Tab直接切换，自动保存当前布局
function switchSlot(slot) {
  if (slot === currentSlot.value) return
  // 自动保存当前布局
  saveCurrentLayout()
  // 切换到新槽位并加载
  currentSlot.value = slot
  loadCurrentSlot()
}

// 保存当前布局到当前槽位
function saveCurrentLayout() {
  layoutSlots.value[currentSlot.value] = deployedBuildings.value.map(b => ({ type: b.type, level: b.level, gridX: b.gridX, gridY: b.gridY }))
  localStorage.setItem('coc-defense-layouts', JSON.stringify(layoutSlots.value))
}

// 加载当前槽位的布局
function loadCurrentSlot() {
  clearDeployment()
  const data = layoutSlots.value[currentSlot.value]
  if (!data || data.length === 0) return
  data.forEach(item => {
    const building = availableDefenseBuildings.value.find(b => b.type === item.type)
    if (building && getDeployedCount(item.type) < building.count && canPlaceBuilding(item.gridX, item.gridY, building)) {
      placeBuilding({ ...building }, item.gridX, item.gridY)
    }
  })
}

// 清空当前槽位
function clearCurrentSlot() {
  clearDeployment()
  layoutSlots.value[currentSlot.value] = []
  localStorage.setItem('coc-defense-layouts', JSON.stringify(layoutSlots.value))
}

function loadAllSlots() {
  const saved = localStorage.getItem('coc-defense-layouts')
  if (saved) {
    try { layoutSlots.value = JSON.parse(saved) } catch (e) { console.error(e) }
  }
  // 自动加载槽位1
  setTimeout(() => loadCurrentSlot(), 100)
}

onMounted(() => initStage())
onUnmounted(() => { isSimulating.value = false; stage?.destroy() })
</script>

<style scoped>
/* 面板基础 */
.panel { padding: 20px; }

/* 顶部：标题 + 模式切换 */
.header-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16px;
}
.panel-title {
  font-size: 20px;
  font-weight: 600;
  color: #333;
  margin: 0;
}
.mode-tabs {
  display: flex;
  gap: 8px;
}
.mode-tab {
  padding: 8px 20px;
  border: 1px solid #ddd;
  border-radius: 6px;
  background: #fff;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
  color: #666;
}
.mode-tab:hover:not(.active) {
  border-color: #999;
}
.mode-tab.active {
  border-color: #4CAF50;
  background: #E8F5E9;
  color: #2E7D32;
}

/* 布局容器：左右并排 */
.deploy-layout,
.battle-layout {
  display: flex;
  gap: 16px;
  align-items: flex-start;
}

/* 左侧：地图区域 */
.map-section {
  flex: 0 0 auto;
}
.tips-bar {
  background: #FFFDE7;
  border: 1px solid #FFF59D;
  border-radius: 6px;
  padding: 8px 12px;
  margin-bottom: 12px;
  font-size: 13px;
  color: #F57F17;
}
.battlefield-container {
  background: #fff;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  padding: 8px;
  max-width: 650px;
  max-height: 650px;
  overflow: auto;
}
.stage-wrapper {
  border-radius: 4px;
  overflow: hidden;
  display: block;
  border: 2px solid #5A9A3F;
}
.stats-bar {
  margin-top: 12px;
  padding: 10px 12px;
  background: #f5f5f5;
  border: 1px solid #e0e0e0;
  border-radius: 6px;
  font-size: 12px;
  color: #666;
  text-align: center;
}

/* 右侧：侧边栏 */
.sidebar-section {
  flex: 1;
  min-width: 220px;
  max-width: 280px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.sidebar-card {
  background: #fff;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  padding: 14px;
}
.sidebar-title {
  font-size: 13px;
  font-weight: 600;
  color: #333;
  margin: 0 0 12px 0;
  padding-bottom: 8px;
  border-bottom: 1px solid #eee;
}

/* 建筑列表 */
.buildings-grid {
  display: flex;
  flex-direction: column;
  gap: 8px;
  max-height: 240px;
  overflow-y: auto;
}
.building-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 10px;
  background: #fafafa;
  border: 1px solid #e0e0e0;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.15s;
}
.building-item:hover:not(.deployed) {
  border-color: #999;
  background: #f0f0f0;
}
.building-item.selected {
  border-color: #4CAF50;
  background: #E8F5E9;
}
.building-item.deployed {
  opacity: 0.45;
  cursor: not-allowed;
}
.b-icon {
  font-size: 20px;
  width: 28px;
  text-align: center;
}
.b-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.b-name {
  font-size: 13px;
  font-weight: 500;
  color: #333;
}
.b-detail {
  font-size: 11px;
  color: #888;
}

/* 兵种列表 */
.troops-grid {
  display: flex;
  flex-direction: column;
  gap: 8px;
  max-height: 200px;
  overflow-y: auto;
}
.troop-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 10px;
  background: #fafafa;
  border: 1px solid #e0e0e0;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.15s;
}
.troop-item:hover {
  border-color: #999;
  background: #f0f0f0;
}
.troop-item.selected {
  border-color: #FF5722;
  background: #FBE9E7;
}
.t-icon {
  font-size: 20px;
  width: 28px;
  text-align: center;
}
.t-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.t-name {
  font-size: 13px;
  font-weight: 500;
  color: #333;
}
.t-detail {
  font-size: 11px;
  color: #888;
}

/* 布局Tab */
.layout-tabs {
  display: flex;
  gap: 8px;
  margin-bottom: 12px;
}
.layout-tab {
  flex: 1;
  padding: 10px 8px;
  border: 1px solid #ddd;
  border-radius: 6px;
  background: #fafafa;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.15s;
  color: #666;
  text-align: center;
}
.layout-tab:hover:not(.active) {
  border-color: #999;
  background: #f0f0f0;
}
.layout-tab.active {
  border-color: #4CAF50;
  background: #E8F5E9;
  color: #2E7D32;
}

/* 速度控制 */
.speed-row {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 12px;
  font-size: 13px;
  color: #666;
}
.speed-btn {
  padding: 5px 12px;
  border: 1px solid #ddd;
  border-radius: 4px;
  background: #fff;
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.15s;
}
.speed-btn:hover {
  border-color: #999;
}
.speed-btn.active {
  border-color: #FF5722;
  background: #FBE9E7;
  color: #E64A19;
}

/* 战斗按钮 */
.battle-btns {
  display: flex;
  gap: 8px;
}
.btn {
  flex: 1;
  padding: 10px 16px;
  border: none;
  border-radius: 6px;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.15s;
}
.btn-battle {
  background: #FF5722;
  color: #fff;
}
.btn-battle:hover:not(:disabled) {
  background: #E64A19;
}
.btn-reset {
  background: #fff;
  color: #333;
  border: 1px solid #ddd;
}
.btn-reset:hover:not(:disabled) {
  background: #f5f5f5;
}
.btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
.btn-clear-full {
  width: 100%;
  padding: 8px 12px;
  border: 1px solid #ddd;
  border-radius: 6px;
  background: #fff;
  font-size: 13px;
  cursor: pointer;
  transition: all 0.15s;
  color: #666;
}
.btn-clear-full:hover {
  background: #f5f5f5;
  border-color: #999;
}

/* 战斗结果 */
.battle-result {
  margin-top: 12px;
  padding: 10px 12px;
  background: #f5f5f5;
  border: 1px solid #e0e0e0;
  border-radius: 6px;
  text-align: center;
}
.result-text {
  font-size: 13px;
  font-weight: 500;
}
.result-text.victory {
  color: #2E7D32;
}
.result-text.defeat {
  color: #C62828;
}
</style>