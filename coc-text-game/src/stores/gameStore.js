import { defineStore } from 'pinia'
import { ref, computed, watch } from 'vue'

export const useGameStore = defineStore('game', () => {
  // 初始化标记
  const initialized = ref(false)

  // 大本营等级
  const townHallLevel = ref(1)
  
  // 资源
  const gold = ref(500)
  const elixir = ref(500)
  const darkElixir = ref(0)
  const gems = ref(50)
  const trophies = ref(0)
  
  // 村庄树木 - 随机生长，挖掉有几率获得宝石
  const trees = ref([])
  const lastTreeGrowTime = ref(Date.now())

  // 商店状态
  const starterPackClaimed = ref(false)

  // 研究状态
  const currentResearch = ref(null)

  // 主题模式：'light' 或 'dark'
  const themeMode = ref('light')
  
  // 资源产出倍率（1-10倍）
  const resourceMultiplier = ref(1)

  // 训练队列 - 存储正在训练的兵种
  // 格式: { troopId, troopName, population, startTime, endTime }
  const trainingQueue = ref([])

  // 兵种训练时间配置（单位：秒，按数据手册加速版）
  const troopTrainTime = {
    '野蛮人': 1,
    '弓箭手': 1,
    '巨人': 5,
    '哥布林': 1,
    '炸弹人': 5,
    '气球兵': 30,
    '法师': 10,
    '天使': 60,
    '飞龙': 30,
    '皮卡超人': 60,
    '飞龙宝宝': 45,
    '女武神': 45,
    '戈仑石人': 60,
    '女巫': 60,
    '亡灵': 2,
    '野猪骑士': 5,
    '熔岩猎犬': 60
  }
  
  // 默认建筑列表
  const defaultBuildings = [
    { id: 1, type: 'townhall', name: '大本营', level: 1, maxLevel: 9, count: 1 },
    { id: 2, type: 'goldmine', name: '金矿', level: 1, maxLevel: 9, count: 2 },
    { id: 3, type: 'elixircollector', name: '圣水收集器', level: 1, maxLevel: 9, count: 2 },
    { id: 4, type: 'goldstorage', name: '储金罐', level: 1, maxLevel: 9, count: 1 },
    { id: 5, type: 'elixirstorage', name: '圣水瓶', level: 1, maxLevel: 9, count: 1 },
    { id: 6, type: 'barracks', name: '兵营', level: 1, maxLevel: 8, count: 1 },
    { id: 7, type: 'cannon', name: '加农炮', level: 1, maxLevel: 9, count: 1 },
  ]
  
  // 建筑列表
  const buildings = ref([...defaultBuildings])

  // 储金罐单个存储上限（根据等级）
  // 调整后确保每个大本营等级都能存储足够资源升级到下一级
  // 7本→8本需要200万，8本→9本需要300万
  const goldStorageCapacity = {
    1: 1000,     // 1本: 1×1000=1000
    2: 2500,     // 2本: 2×2500=5000
    3: 3334,     // 3本: 3×3334≈10000
    4: 12500,    // 4本: 4×12500=50000
    5: 20000,    // 5本: 5×20000=100000
    6: 50000,    // 6本: 6×50000=300000
    7: 100000,   // 7本: 调整为支持升级需求
    8: 250000,   // 8本: 8×250000=2000000，支持升级到9本
    9: 400000    // 9本: 8×400000=3200000
  }
  
  // 圣水瓶单个存储上限（与储金罐相同）
  const elixirStorageCapacity = {
    1: 1000,
    2: 2500,
    3: 3334,
    4: 12500,
    5: 20000,
    6: 50000,
    7: 100000,
    8: 250000,
    9: 400000
  }

  // 暗黑重油罐单个存储上限
  // 9本需要召唤女王20000暗黑，需要确保能存储足够
  // 9本: 2个暗黑罐×10000 + 大本营5000 = 25000
  const darkStorageCapacity = {
    1: 5000,    // 7本: 1×5000 + 1000(大本营) = 6000
    2: 7500,    // 8本: 2×7500 + 2000(大本营) = 17000
    3: 10000    // 9本: 2×10000 + 5000(大本营) = 25000
  }

  // 大本营存储容量（按数据手册）
  const townHallStorageCapacity = {
    1: { gold: 1000, elixir: 1000, dark: 0 },
    2: { gold: 2000, elixir: 2000, dark: 0 },
    3: { gold: 3000, elixir: 3000, dark: 0 },
    4: { gold: 5000, elixir: 5000, dark: 0 },
    5: { gold: 10000, elixir: 10000, dark: 0 },
    6: { gold: 20000, elixir: 20000, dark: 0 },
    7: { gold: 30000, elixir: 30000, dark: 1000 },
    8: { gold: 50000, elixir: 50000, dark: 2000 },
    9: { gold: 80000, elixir: 80000, dark: 5000 }
  }
  
  // 大本营等级对应的储金罐/圣水瓶最高可升级等级
  // 存储罐可优先升级，保障升级大本营的资源需求
  // 计算依据：确保 罐数×单罐容量+大本营容量 >= 下一级大本营升级费用
  // 4本→5本:150000, 5本→6本:750000, 6本→7本:1000000, 7本→8本:2000000, 8本→9本:3000000
  const storageMaxLevelByTH = {
    1: 2, 2: 4, 3: 5, 4: 6, 5: 9, 6: 9, 7: 9, 8: 9, 9: 9
  }
  
  // 大本营等级对应的储金罐/圣水瓶最大数量
  // 允许提前建造下一级的储金罐数量
  // 5本需要750000: 6个9级罐=750000+10000=760000 ✓
  // 6本需要1000000: 7个9级罐=875000+20000=895000 ✗ 需要8个
  // 所以6本允许建8个罐: 8×125000+20000=1020000 ✓
  const storageCountByTH = {
    1: 2, 2: 3, 3: 4, 4: 5, 5: 6, 6: 8, 7: 8, 8: 8, 9: 8
  }

  // 建筑升级时间配置（单位：秒，按数据手册加速版）
  const upgradeTimeConfig = {
    // 大本营: 1→2: 10秒, 2→3: 10秒, 3→4: 7.5分钟, 4→5: 15分钟, 5→6: 30分钟, 6→7: 45分钟, 7→8: 1小时, 8→9: 2小时
    townhall: [10, 10, 450, 900, 1800, 2700, 3600, 7200],
    // 金矿/圣水收集器: 10秒, 30秒, 2.5分钟, 5分钟, 10分钟, 15分钟, 20分钟, 25分钟
    goldmine: [10, 30, 150, 300, 600, 900, 1200, 1500],
    elixircollector: [10, 30, 150, 300, 600, 900, 1200, 1500],
    // 储金罐/圣水瓶: 10秒, 30秒, 2.5分钟, 5分钟, 10分钟, 15分钟, 20分钟, 25分钟
    goldstorage: [10, 30, 150, 300, 600, 900, 1200, 1500],
    elixirstorage: [10, 30, 150, 300, 600, 900, 1200, 1500],
    // 兵营: 30秒, 2.5分钟, 5分钟, 10分钟, 15分钟, 20分钟, 30分钟 (1→2到7→8)
    barracks: [30, 150, 300, 600, 900, 1200, 1800],
    // 加农炮: 30秒, 2.5分钟, 5分钟, 10分钟, 15分钟, 20分钟, 25分钟, 30分钟
    cannon: [30, 150, 300, 600, 900, 1200, 1500, 1800],
    // 箭塔: 2.5分钟, 5分钟, 10分钟, 15分钟, 20分钟, 25分钟, 30分钟
    archertower: [150, 300, 600, 900, 1200, 1500, 1800],
    // 迫击炮: 10分钟, 15分钟, 20分钟, 25分钟
    mortar: [600, 900, 1200, 1500],
    // 实验室: 15分钟, 30分钟, 45分钟, 1小时
    laboratory: [900, 1800, 2700, 3600],
    // 暗黑重油钻井: 15分钟, 30分钟
    darkelixirdrill: [900, 1800],
    // 暗黑重油罐: 15分钟, 30分钟
    darkstorage: [900, 1800],
    // 暗黑兵营: 30分钟, 45分钟
    darkbarracks: [1800, 2700]
  }
  
  // 获取储金罐/圣水瓶当前最高可升级等级
  const getStorageMaxLevel = computed(() => {
    return storageMaxLevelByTH[townHallLevel.value] || 1
  })
  
  // 获取储金罐/圣水瓶当前最大数量
  const getStorageMaxCount = computed(() => {
    return storageCountByTH[townHallLevel.value] || 1
  })

  // 资源上限（存储罐总容量 + 大本营存储容量）
  const maxGold = computed(() => {
    const storages = buildings.value.filter(b => b.type === 'goldstorage')
    const storageTotal = storages.reduce((sum, s) => {
      const capacity = goldStorageCapacity[s.level] || 1000
      return sum + capacity * (s.count || 1)
    }, 0)
    const thCapacity = townHallStorageCapacity[townHallLevel.value]?.gold || 1000
    return storageTotal + thCapacity
  })
  
  const maxElixir = computed(() => {
    const storages = buildings.value.filter(b => b.type === 'elixirstorage')
    const storageTotal = storages.reduce((sum, s) => {
      const capacity = elixirStorageCapacity[s.level] || 1000
      return sum + capacity * (s.count || 1)
    }, 0)
    const thCapacity = townHallStorageCapacity[townHallLevel.value]?.elixir || 1000
    return storageTotal + thCapacity
  })
  
  const maxDarkElixir = computed(() => {
    if (townHallLevel.value < 7) return 0
    const storages = buildings.value.filter(b => b.type === 'darkstorage')
    const storageTotal = storages.reduce((sum, s) => {
      const capacity = darkStorageCapacity[s.level] || 2500
      return sum + capacity * (s.count || 1)
    }, 0)
    const thCapacity = townHallStorageCapacity[townHallLevel.value]?.dark || 0
    return storageTotal + thCapacity
  })

  // 兵种列表
  const troops = ref([
    { id: 1, name: '野蛮人', level: 1, count: 0, maxLevel: 9, population: 1, unlocked: true },
    { id: 2, name: '弓箭手', level: 1, count: 0, maxLevel: 9, population: 1, unlocked: true },
    { id: 3, name: '巨人', level: 1, count: 0, maxLevel: 8, population: 5, unlocked: true },
  ])

  // 英雄列表
  // 野蛮人之王：7本解锁，8本可升至10级，9本可升至20级
  // 弓箭女皇：9本解锁，可升至10级
  const heroes = ref([
    {
      id: 1,
      name: '野蛮人之王',
      level: 0,
      maxLevel: 20,
      unlockTH: 7,
      hp: 0,
      damage: 0,
      upgrading: false,
      upgradeEndTime: null
    },
    {
      id: 2,
      name: '弓箭女皇',
      level: 0,
      maxLevel: 10,
      unlockTH: 9,
      hp: 0,
      damage: 0,
      upgrading: false,
      upgradeEndTime: null
    }
  ])

  // 英雄升级队列
  const heroUpgradeQueue = ref([])

  // 哥布林副本进度
  const campaignProgress = ref({
    completedLevels: [],      // 已通关的关卡ID
    dailyAttempts: 0,         // 今日已挑战次数
    lastAttemptDate: null,    // 上次挑战日期
    cooldownEndTime: null     // 冷却结束时间
  })

  // 军队容量 - 根据兵营等级计算
  // 普通兵营容量: 1级15人口, 2级20人口, 3级25人口, 4级30人口, 5级35人口, 6级40人口, 7级45人口, 8级50人口
  // 暗黑兵营容量: 1级10人口, 2级15人口, 3级20人口 (7本解锁，9本满级3级)
  // 9本满配: 4个8级普通兵营(200) + 2个3级暗黑兵营(40) = 240人口
  const barracksCapacity = { 1: 15, 2: 20, 3: 25, 4: 30, 5: 35, 6: 40, 7: 45, 8: 50 }
  const darkBarracksCapacity = { 1: 10, 2: 15, 3: 20 }
  const armyCapacity = computed(() => {
    // 普通兵营容量
    const barracks = buildings.value.filter((b) => b.type === 'barracks')
    const normalCapacity = barracks.reduce((sum, b) => {
      const capacity = barracksCapacity[b.level] || 15
      return sum + capacity * (b.count || 1)
    }, 0)
    
    // 暗黑兵营容量
    const darkBarracks = buildings.value.filter((b) => b.type === 'darkbarracks')
    const darkCapacity = darkBarracks.reduce((sum, b) => {
      const capacity = darkBarracksCapacity[b.level] || 10
      return sum + capacity * (b.count || 1)
    }, 0)
    
    return normalCapacity + darkCapacity
  })
  const currentArmy = computed(() => troops.value.reduce((sum, t) => sum + t.count * t.population, 0))

  // 建筑工人
  const builders = ref([
    { id: 1, busy: false, task: null, endTime: null },
  ])
  const freeBuilders = computed(() => builders.value.filter(b => !b.busy).length)

  // 升级队列 - 存储正在升级的建筑
  // 格式: { buildingId, buildingType, startTime, endTime, targetLevel }
  const upgradeQueue = ref([])

  // 获取建筑升级时间（秒）
  function getUpgradeTime(buildingType, currentLevel) {
    const times = upgradeTimeConfig[buildingType] || [60]
    return times[currentLevel - 1] || times[times.length - 1]
  }

  // 开始升级建筑
  function startUpgrade(building) {
    // 检查是否有空闲建筑工人
    const freeBuilder = builders.value.find(b => !b.busy)
    if (!freeBuilder) return false

    const upgradeTime = getUpgradeTime(building.type, building.level)
    const now = Date.now()
    const endTime = now + upgradeTime * 1000

    // 标记建筑正在升级
    building.upgrading = true
    building.upgradeEndTime = endTime

    // 占用建筑工人
    freeBuilder.busy = true
    freeBuilder.task = `升级${building.name}`
    freeBuilder.endTime = endTime

    // 添加到升级队列
    upgradeQueue.value.push({
      buildingId: building.id,
      buildingType: building.type,
      buildingName: building.name,
      startTime: now,
      endTime: endTime,
      targetLevel: building.level + 1
    })

    return true
  }

  // 完成升级
  function completeUpgrade(buildingId) {
    const building = buildings.value.find(b => b.id === buildingId)
    if (!building) return

    // 找到升级队列中的记录
    const queueItem = upgradeQueue.value.find(q => q.buildingId === buildingId)
    
    building.level++
    building.upgrading = false
    building.upgradeEndTime = null

    // 如果是大本营，同步更新
    if (building.type === 'townhall') {
      townHallLevel.value = building.level
    }

    // 释放建筑工人 - 根据任务名称匹配
    const taskName = `升级${building.name}`
    const busyBuilder = builders.value.find(b => b.busy && b.task === taskName)
    if (busyBuilder) {
      busyBuilder.busy = false
      busyBuilder.task = null
      busyBuilder.endTime = null
    }

    // 从升级队列移除
    if (queueItem) {
      const queueIndex = upgradeQueue.value.indexOf(queueItem)
      if (queueIndex !== -1) {
        upgradeQueue.value.splice(queueIndex, 1)
      }
    }
  }

  // 检查并完成所有已完成的升级
  function checkUpgrades() {
    const now = Date.now()
    const completedUpgrades = upgradeQueue.value.filter(q => q.endTime <= now)
    completedUpgrades.forEach(q => {
      completeUpgrade(q.buildingId)
    })

    // 同时释放已完成任务的建筑工人
    builders.value.forEach(b => {
      if (b.busy && b.endTime && b.endTime <= now) {
        b.busy = false
        b.task = null
        b.endTime = null
      }
    })
  }

  // 获取建筑剩余升级时间（秒）
  function getRemainingTime(building) {
    if (!building.upgrading || !building.upgradeEndTime) return 0
    const remaining = Math.max(0, building.upgradeEndTime - Date.now())
    return Math.ceil(remaining / 1000)
  }

  // 资源产量配置（每分钟产量，按数据手册）
  // 1级: 10/分钟, 2级: 15/分钟, 3级: 20/分钟, 4级: 30/分钟, 5级: 40/分钟, 6级: 50/分钟, 7级: 60/分钟, 8级: 70/分钟, 9级: 80/分钟
  const productionRateByLevel = {
    1: 10, 2: 15, 3: 20, 4: 30, 5: 40, 6: 50, 7: 60, 8: 70, 9: 80
  }

  // 计算金币总产量（每分钟）- 应用倍率
  const goldProductionPerMinute = computed(() => {
    const goldMines = buildings.value.filter(b => b.type === 'goldmine' && !b.upgrading)
    const baseRate = goldMines.reduce((sum, m) => {
      const rate = productionRateByLevel[m.level] || 10
      return sum + rate * (m.count || 1)
    }, 0)
    return baseRate * resourceMultiplier.value
  })

  // 计算圣水总产量（每分钟）- 应用倍率
  const elixirProductionPerMinute = computed(() => {
    const collectors = buildings.value.filter(b => b.type === 'elixircollector' && !b.upgrading)
    const baseRate = collectors.reduce((sum, c) => {
      const rate = productionRateByLevel[c.level] || 10
      return sum + rate * (c.count || 1)
    }, 0)
    return baseRate * resourceMultiplier.value
  })

  // 计算暗黑重油总产量（每分钟）- 应用倍率
  const darkProductionPerMinute = computed(() => {
    if (townHallLevel.value < 7) return 0
    const drills = buildings.value.filter(b => b.type === 'darkelixirdrill' && !b.upgrading)
    const baseRate = drills.reduce((sum, d) => {
      // 暗黑钻井产量: 1级5/分钟, 2级8/分钟, 3级10/分钟
      const darkRates = { 1: 5, 2: 8, 3: 10 }
      const rate = darkRates[d.level] || 5
      return sum + rate * (d.count || 1)
    }, 0)
    return baseRate * resourceMultiplier.value
  })

  // 上次收集时间
  const lastCollectTime = ref(Date.now())

  // 自动收集资源
  function collectResources() {
    const now = Date.now()
    const elapsedMinutes = (now - lastCollectTime.value) / 60000 // 转换为分钟
    
    if (elapsedMinutes >= 0.1) { // 至少6秒才收集一次，避免太频繁
      // 收集金币
      const goldGain = Math.floor(goldProductionPerMinute.value * elapsedMinutes)
      if (goldGain > 0) {
        gold.value = Math.min(gold.value + goldGain, maxGold.value)
      }
      
      // 收集圣水
      const elixirGain = Math.floor(elixirProductionPerMinute.value * elapsedMinutes)
      if (elixirGain > 0) {
        elixir.value = Math.min(elixir.value + elixirGain, maxElixir.value)
      }
      
      // 收集暗黑重油
      if (townHallLevel.value >= 7) {
        const darkGain = Math.floor(darkProductionPerMinute.value * elapsedMinutes)
        if (darkGain > 0) {
          darkElixir.value = Math.min(darkElixir.value + darkGain, maxDarkElixir.value)
        }
      }
      
      lastCollectTime.value = now
    }
  }

  // 当前选中的菜单
  const currentMenu = ref('overview')

  // 侧边栏收缩状态
  const sidebarCollapsed = ref(false)

  // 方法
  function addGold(amount) {
    gold.value = Math.min(gold.value + amount, maxGold.value)
  }

  function addElixir(amount) {
    elixir.value = Math.min(elixir.value + amount, maxElixir.value)
  }

  function spendGold(amount) {
    if (gold.value >= amount) {
      gold.value -= amount
      return true
    }
    return false
  }

  function spendElixir(amount) {
    if (elixir.value >= amount) {
      elixir.value -= amount
      return true
    }
    return false
  }

  // 获取兵种训练时间（秒）
  function getTroopTrainTime(troopName) {
    return troopTrainTime[troopName] || 5
  }

  // 开始训练兵种
  function startTraining(troopId, troopName, population) {
    const trainTime = getTroopTrainTime(troopName)
    const now = Date.now()
    const endTime = now + trainTime * 1000

    trainingQueue.value.push({
      troopId,
      troopName,
      population,
      startTime: now,
      endTime
    })

    return true
  }

  // 检查并完成训练
  function checkTraining() {
    const now = Date.now()
    const completed = trainingQueue.value.filter(t => t.endTime <= now)
    
    completed.forEach(item => {
      // 找到对应兵种并增加数量
      let troop = troops.value.find(t => t.id === item.troopId)
      if (troop) {
        troop.count++
      } else {
        // 如果兵种不存在，添加到列表
        troops.value.push({
          id: item.troopId,
          name: item.troopName,
          level: 1,
          count: 1,
          population: item.population,
          unlocked: true
        })
      }
      
      // 从队列移除
      const idx = trainingQueue.value.findIndex(t => t === item)
      if (idx !== -1) {
        trainingQueue.value.splice(idx, 1)
      }
    })
  }

  // 获取训练队列中的总人口
  const trainingPopulation = computed(() => {
    return trainingQueue.value.reduce((sum, t) => sum + t.population, 0)
  })

  function trainTroop(troopId) {
    const troop = troops.value.find(t => t.id === troopId)
    if (troop && currentArmy.value + troop.population <= armyCapacity.value) {
      troop.count++
      return true
    }
    return false
  }

  function setMenu(menu) {
    currentMenu.value = menu
  }

  function toggleSidebar() {
    sidebarCollapsed.value = !sidebarCollapsed.value
  }

  // 切换主题
  function toggleTheme() {
    themeMode.value = themeMode.value === 'light' ? 'dark' : 'light'
    applyTheme()
  }

  // 应用主题到DOM
  function applyTheme() {
    document.documentElement.setAttribute('data-theme', themeMode.value)
  }

  // 树木类型
  const treeTypes = ['橡树', '松树', '灌木', '蘑菇', '石头', '宝箱树']
  
  // 检查并生长新树木（每1分钟有机会生长一棵）
  function checkTreeGrowth() {
    const now = Date.now()
    const elapsed = now - lastTreeGrowTime.value
    // 每1分钟检查一次，50%几率生长
    if (elapsed >= 1 * 60 * 1000) {
      lastTreeGrowTime.value = now
      if (Math.random() < 0.5 && trees.value.length < 10) {
        const newTree = {
          id: Date.now(),
          type: treeTypes[Math.floor(Math.random() * treeTypes.length)],
          grownAt: now
        }
        trees.value.push(newTree)
      }
    }
  }
  
  // 挖掉树木 - 消耗100圣水，有几率获得宝石
  function removeTree(treeId) {
    const treeIndex = trees.value.findIndex(t => t.id === treeId)
    if (treeIndex === -1) return { success: false, message: '树木不存在' }
    
    if (elixir.value < 100) {
      return { success: false, message: '圣水不足' }
    }
    
    elixir.value -= 100
    const tree = trees.value[treeIndex]
    trees.value.splice(treeIndex, 1)
    
    // 计算宝石奖励：50%几率获得1-50宝石
    let gemsGained = 0
    if (Math.random() < 0.5) {
      gemsGained = Math.floor(Math.random() * 50) + 1
      gems.value += gemsGained
    }
    
    return { 
      success: true, 
      treeType: tree.type,
      gemsGained,
      message: gemsGained > 0 ? `挖掉${tree.type}，获得 ${gemsGained} 宝石！` : `挖掉${tree.type}，什么也没发现`
    }
  }

  // 存档功能 - 保存游戏到 localStorage
  function saveGame() {
    const saveData = {
      version: 1,
      timestamp: Date.now(),
      townHallLevel: townHallLevel.value,
      gold: gold.value,
      elixir: elixir.value,
      darkElixir: darkElixir.value,
      gems: gems.value,
      trophies: trophies.value,
      trees: trees.value,
      lastTreeGrowTime: lastTreeGrowTime.value,
      buildings: buildings.value,
      troops: troops.value,
      builders: builders.value,
      upgradeQueue: upgradeQueue.value,
      trainingQueue: trainingQueue.value,
      lastCollectTime: lastCollectTime.value,
      starterPackClaimed: starterPackClaimed.value,
      currentResearch: currentResearch.value,
      themeMode: themeMode.value,
      resourceMultiplier: resourceMultiplier.value,
      heroes: heroes.value,
      heroUpgradeQueue: heroUpgradeQueue.value,
      campaignProgress: campaignProgress.value
    }
    localStorage.setItem('coc-text-game-save', JSON.stringify(saveData))
    return true
  }

  // 自动保存（防抖，避免频繁保存）
  let autoSaveTimer = null
  function autoSave() {
    if (!initialized.value) return
    if (autoSaveTimer) clearTimeout(autoSaveTimer)
    autoSaveTimer = setTimeout(() => {
      saveGame()
    }, 1000) // 1秒后保存
  }

  // 建筑正确的maxLevel配置
  const correctMaxLevels = {
    townhall: 9,
    goldmine: 9,
    elixircollector: 9,
    goldstorage: 9,
    elixirstorage: 9,
    barracks: 8,
    darkbarracks: 3,
    cannon: 9,
    archertower: 8,
    mortar: 5,
    laboratory: 5,
    darkelixirdrill: 3,
    darkstorage: 3
  }

  // 修复存档中的建筑maxLevel
  function fixBuildingMaxLevels() {
    buildings.value.forEach(b => {
      const correctMax = correctMaxLevels[b.type]
      if (correctMax && b.maxLevel !== correctMax) {
        console.log(`修复建筑 ${b.name} 的maxLevel: ${b.maxLevel} -> ${correctMax}`)
        b.maxLevel = correctMax
      }
    })
  }

  // 加载存档功能 - 从 localStorage 加载游戏
  function loadGame() {
    const saveStr = localStorage.getItem('coc-text-game-save')
    if (!saveStr) return false
    
    try {
      const saveData = JSON.parse(saveStr)
      townHallLevel.value = saveData.townHallLevel || 1
      gold.value = saveData.gold || 500
      elixir.value = saveData.elixir || 500
      darkElixir.value = saveData.darkElixir || 0
      gems.value = saveData.gems || 50
      trophies.value = saveData.trophies || 0
      trees.value = saveData.trees || []
      lastTreeGrowTime.value = saveData.lastTreeGrowTime || Date.now()
      buildings.value = saveData.buildings || [...defaultBuildings]
      troops.value = saveData.troops || []
      builders.value = saveData.builders || [{ id: 1, busy: false, task: null, endTime: null }]
      upgradeQueue.value = saveData.upgradeQueue || []
      trainingQueue.value = saveData.trainingQueue || []
      lastCollectTime.value = saveData.lastCollectTime || Date.now()
      starterPackClaimed.value = saveData.starterPackClaimed || false
      currentResearch.value = saveData.currentResearch || null
      themeMode.value = saveData.themeMode || 'light'
      resourceMultiplier.value = saveData.resourceMultiplier || 1
      if (saveData.heroes) {
        heroes.value = saveData.heroes
      }
      heroUpgradeQueue.value = saveData.heroUpgradeQueue || []
      if (saveData.campaignProgress) {
        campaignProgress.value = saveData.campaignProgress
      }
      
      // 修复存档中的建筑maxLevel
      fixBuildingMaxLevels()
      
      applyTheme()
      return true
    } catch (e) {
      console.error('加载存档失败:', e)
      return false
    }
  }

  // 初始化游戏 - 尝试加载存档
  function initGame() {
    if (initialized.value) return
    
    const hasData = hasSaveData()
    if (hasData) {
      loadGame()
      // 加载后检查升级状态
      checkUpgrades()
    } else {
      // 没有存档时应用默认主题
      applyTheme()
    }
    initialized.value = true
    
    // 设置自动保存监听
    setupAutoSave()
  }

  // 设置自动保存监听
  function setupAutoSave() {
    // 监听关键数据变化，自动保存
    watch([gold, elixir, darkElixir, gems, townHallLevel], () => {
      autoSave()
    })
    watch(buildings, () => {
      autoSave()
    }, { deep: true })
    watch(troops, () => {
      autoSave()
    }, { deep: true })
    watch(upgradeQueue, () => {
      autoSave()
    }, { deep: true })
  }

  // 检查是否有存档
  function hasSaveData() {
    return localStorage.getItem('coc-text-game-save') !== null
  }

  // 获取存档信息
  function getSaveInfo() {
    const saveStr = localStorage.getItem('coc-text-game-save')
    if (!saveStr) return null
    try {
      const saveData = JSON.parse(saveStr)
      return {
        timestamp: saveData.timestamp,
        townHallLevel: saveData.townHallLevel,
        gold: saveData.gold,
        elixir: saveData.elixir
      }
    } catch {
      return null
    }
  }

  // 删除存档
  function deleteSave() {
    localStorage.removeItem('coc-text-game-save')
  }

  // 完成副本关卡
  function completeCampaignLevel(levelId) {
    if (!campaignProgress.value.completedLevels.includes(levelId)) {
      campaignProgress.value.completedLevels.push(levelId)
    }
    autoSave()
  }

  // 使用副本挑战次数
  function useCampaignAttempt() {
    const today = new Date().toDateString()
    if (campaignProgress.value.lastAttemptDate !== today) {
      campaignProgress.value.dailyAttempts = 0
      campaignProgress.value.lastAttemptDate = today
    }
    campaignProgress.value.dailyAttempts++
    // 设置10分钟冷却（加速后）
    campaignProgress.value.cooldownEndTime = Date.now() + 10 * 60 * 1000
    autoSave()
  }

  return {
    townHallLevel,
    gold, elixir, darkElixir, gems, trophies, trees,
    maxGold, maxElixir, maxDarkElixir,
    buildings, troops,
    armyCapacity, currentArmy,
    builders, freeBuilders,
    upgradeQueue, currentMenu,
    addGold, addElixir, spendGold, spendElixir,
    trainTroop, setMenu,
    getStorageMaxLevel,
    getStorageMaxCount,
    goldStorageCapacity,
    elixirStorageCapacity,
    storageCountByTH,
    saveGame,
    loadGame,
    hasSaveData,
    getSaveInfo,
    deleteSave,
    upgradeTimeConfig,
    getUpgradeTime,
    startUpgrade,
    completeUpgrade,
    checkUpgrades,
    getRemainingTime,
    initGame,
    initialized,
    goldProductionPerMinute,
    elixirProductionPerMinute,
    darkProductionPerMinute,
    collectResources,
    lastCollectTime,
    starterPackClaimed,
    currentResearch,
    trainingQueue,
    trainingPopulation,
    troopTrainTime,
    getTroopTrainTime,
    startTraining,
    checkTraining,
    themeMode,
    toggleTheme,
    applyTheme,
    resourceMultiplier,
    heroes,
    heroUpgradeQueue,
    campaignProgress,
    completeCampaignLevel,
    useCampaignAttempt,
    sidebarCollapsed,
    toggleSidebar,
    checkTreeGrowth,
    removeTree
  }
})
