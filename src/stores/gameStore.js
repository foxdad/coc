import { defineStore } from 'pinia'
import { ref, computed, watch } from 'vue'

export const useGameStore = defineStore('game', () => {
  // 初始化标记
  const initialized = ref(false)

  // 新手引导状态
  const tutorialStep = ref(0) // 0表示未开始或已完成，1-N表示当前步骤
  const tutorialCompleted = ref(false)

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
    darkbarracks: [1800, 2700],
    // 防空火箭: 15分钟, 20分钟, 25分钟
    airdefense: [900, 1200, 1500],
    // 法师塔: 15分钟, 20分钟, 25分钟
    wizardtower: [900, 1200, 1500],
    // X连弩: 1小时
    xbow: [3600]
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

  // ========== 邻邦系统 ==========
  // 生成100个邻邦NPC
  const neighborTemplates = [
    { type: 'warrior', title: '好战者', icon: '⚔️', personality: 'aggressive', preferredResources: ['dark', 'elixir'], favoriteTroops: ['野猪骑士', '皮卡超人'] },
    { type: 'merchant', title: '商贩', icon: '💰', personality: 'greedy', preferredResources: ['gold', 'gems'], favoriteTroops: ['气球兵', '戈仑石人'] },
    { type: 'hermit', title: '隐士', icon: '🧙', personality: 'peaceful', preferredResources: ['elixir'], favoriteTroops: ['天使', '熔岩猎犬'] },
    { type: 'spider', title: '蛛网村', icon: '🕷️', personality: 'possessive', preferredResources: ['dark', 'gems'], favoriteTroops: ['龙', '皮卡超人'] },
    { type: 'mushroom', title: '蘑菇村', icon: '🍄', personality: 'symbiotic', preferredResources: ['elixir'], favoriteTroops: ['亡灵', '熔岩猎犬'] },
    { type: 'circus', title: '马戏村', icon: '🎪', personality: 'theatrical', preferredResources: ['gold', 'dark'], favoriteTroops: ['戈仑石人', '气球兵'] },
    { type: 'farmer', title: '农夫', icon: '🌾', personality: 'peaceful', preferredResources: ['elixir', 'gold'], favoriteTroops: ['巨人', '弓箭手'] },
    { type: 'miner', title: '矿工', icon: '⛏️', personality: 'greedy', preferredResources: ['gold', 'dark'], favoriteTroops: ['哥布林', '炸弹人'] },
    { type: 'hunter', title: '猎人', icon: '🏹', personality: 'aggressive', preferredResources: ['elixir'], favoriteTroops: ['弓箭手', '飞龙'] },
    { type: 'wizard', title: '法师', icon: '🔮', personality: 'peaceful', preferredResources: ['elixir', 'gems'], favoriteTroops: ['法师', '女巫'] }
  ]

  const dialogTemplates = {
    aggressive: {
      enemy: '你这个懦夫！敢来找死？',
      hostile: '又是你？有什么事快说！',
      neutral: '你看起来还算有点实力...',
      friendly: '不错嘛！有空来切磋！',
      ally: '兄弟！你的敌人就是我的敌人！'
    },
    greedy: {
      enemy: '你这个强盗！我要让你血本无归！',
      hostile: '哼，生意人不做亏本买卖。',
      neutral: '客人，要看看货吗？',
      friendly: '老朋友！今天有好货给你！',
      ally: '合作伙伴！我的商路就是你的商路！'
    },
    peaceful: {
      enemy: '你为何要如此贪婪？离开吧...',
      hostile: '暴力不能解决问题。',
      neutral: '旅人，需要休息吗？',
      friendly: '善良的孩子，来喝杯茶吧。',
      ally: '我的智慧与你同在。'
    },
    possessive: {
      enemy: '敢偷我的东西？让你后悔！',
      hostile: '你...让我很不高兴。',
      neutral: '有趣的访客...进来坐坐？',
      friendly: '亲爱的，你来了~',
      ally: '你是我的...永远的。'
    },
    symbiotic: {
      enemy: '你毁了我的家园！',
      hostile: '你的气息...让我不舒服。',
      neutral: '陌生的生命体...你好。',
      friendly: '朋友！来感受温暖！',
      ally: '我们是一体的...共生共荣。'
    },
    theatrical: {
      enemy: '精彩的表演！下次更精彩！',
      hostile: '无聊的观众...滚开。',
      neutral: '嘿！想看表演吗？',
      friendly: '好观众！来看我的新节目！',
      ally: '搭档！我们一起演一场好戏！'
    }
  }

  // 邻邦系统配置
  const neighborConfig = {
    initialCount: 10,        // 初始邻邦数量
    maxCount: 1024,          // 最大邻邦数量
    growthInterval: 60000,   // 加速版：每1分钟增加1个邻邦（毫秒）
  }

  // 上次邻邦增长时间
  const lastNeighborGrowTime = ref(Date.now())

  // 生成单个邻邦（带兵力配置）
  function generateSingleNeighbor(id, createdAt = Date.now()) {
    const template = neighborTemplates[id % neighborTemplates.length]
    const initialFavor = Math.floor(Math.random() * 41) - 20

    // 根据邻邦ID计算基础等级（ID越大等级越高）
    // 1-10号: 1级, 11-30号: 2级, 31-60号: 3级, 61-100号: 4级, 101-150号: 5级...
    // 公式: 等级 = min(9, 1 + floor(sqrt(id / 5)))
    const baseLevel = Math.min(9, 1 + Math.floor(Math.sqrt(id / 5)))
    
    // 加上时间成长（存在时间越长越强，但增幅较小）
    const ageMinutes = Math.floor((Date.now() - createdAt) / 60000)
    const ageBonus = Math.min(2, Math.floor(ageMinutes / 60)) // 每小时+1级，最多+2级
    
    const strengthLevel = Math.min(9, baseLevel + ageBonus)

    // 生成兵力配置
    const troops = generateNeighborTroops(template.personality, strengthLevel)

    // 计算资源储量（可被掠夺）- 高等级邻邦资源更多
    const baseResources = 1000 + strengthLevel * 1000 + id * 50
    const resourceMultiplier = 1 + Math.random() * 0.5

    return {
      id,
      name: `${id}号`,
      title: template.title,
      icon: template.icon,
      personality: template.personality,
      preferredResources: template.preferredResources,
      favoriteTroops: template.favoriteTroops,
      dialogs: dialogTemplates[template.personality],
      favor: initialFavor,
      allied: false,
      lastAidTime: null,
      giftHistory: [],
      // 新增：兵力和资源配置
      createdAt,
      strengthLevel,
      troops,
      resources: {
        gold: Math.floor(baseResources * resourceMultiplier),
        elixir: Math.floor(baseResources * resourceMultiplier * 0.8),
        dark: strengthLevel >= 5 ? Math.floor(baseResources * 0.1) : 0
      },
      defenseStrength: 50 + strengthLevel * 50 + id * 2 // 基础防御力随ID增加
    }
  }

  // 根据性格和强度生成兵力配置
  function generateNeighborTroops(personality, strengthLevel) {
    const troopConfigs = {
      aggressive: [
        { name: '野蛮人', baseCount: 10, levelMod: 5 },
        { name: '巨人', baseCount: 2, levelMod: 2 },
        { name: '野猪骑士', baseCount: 0, levelMod: 3, minLevel: 4 },
        { name: '皮卡超人', baseCount: 0, levelMod: 1, minLevel: 7 }
      ],
      greedy: [
        { name: '哥布林', baseCount: 15, levelMod: 8 },
        { name: '弓箭手', baseCount: 8, levelMod: 4 },
        { name: '炸弹人', baseCount: 2, levelMod: 2 },
        { name: '法师', baseCount: 0, levelMod: 2, minLevel: 5 }
      ],
      peaceful: [
        { name: '弓箭手', baseCount: 10, levelMod: 5 },
        { name: '巨人', baseCount: 1, levelMod: 2 },
        { name: '天使', baseCount: 0, levelMod: 1, minLevel: 5 },
        { name: '飞龙', baseCount: 0, levelMod: 1, minLevel: 7 }
      ],
      possessive: [
        { name: '法师', baseCount: 3, levelMod: 3 },
        { name: '弓箭手', baseCount: 10, levelMod: 5 },
        { name: '飞龙', baseCount: 0, levelMod: 2, minLevel: 6 },
        { name: '女巫', baseCount: 0, levelMod: 1, minLevel: 8 }
      ],
      symbiotic: [
        { name: '亡灵', baseCount: 8, levelMod: 4 },
        { name: '野蛮人', baseCount: 10, levelMod: 5 },
        { name: '女武神', baseCount: 0, levelMod: 2, minLevel: 5 },
        { name: '熔岩猎犬', baseCount: 0, levelMod: 1, minLevel: 7 }
      ],
      theatrical: [
        { name: '气球兵', baseCount: 3, levelMod: 2 },
        { name: '戈仑石人', baseCount: 0, levelMod: 1, minLevel: 5 },
        { name: '骷髅兵', baseCount: 15, levelMod: 10 },
        { name: '飞龙宝宝', baseCount: 0, levelMod: 2, minLevel: 6 }
      ]
    }

    const config = troopConfigs[personality] || troopConfigs.aggressive
    const troops = []

    config.forEach(tc => {
      if (tc.minLevel && strengthLevel < tc.minLevel) return
      // 兵种数量随等级大幅增加
      const count = tc.baseCount + Math.floor(strengthLevel * tc.levelMod)
      if (count > 0) {
        troops.push({
          name: tc.name,
          level: Math.min(9, Math.max(1, strengthLevel)),
          count
        })
      }
    })

    return troops
  }

  // 计算邻邦总兵力值
  function calculateNeighborPower(neighbor) {
    if (!neighbor.troops) return neighbor.defenseStrength || 100
    let power = neighbor.defenseStrength || 50
    neighbor.troops.forEach(t => {
      const troopPower = { '野蛮人': 1, '弓箭手': 1, '哥布林': 0.5, '巨人': 5, '炸弹人': 2, '气球兵': 4, '法师': 4, '天使': 10, '飞龙': 8, '皮卡超人': 10, '亡灵': 1, '野猪骑士': 5, '戈仑石人': 15, '女巫': 8, '熔岩猎犬': 12, '骷髅兵': 0.3 }
      power += (troopPower[t.name] || 1) * t.level * t.count
    })
    return Math.floor(power)
  }

  // 生成初始邻邦
  function generateInitialNeighbors() {
    const result = []
    for (let i = 1; i <= neighborConfig.initialCount; i++) {
      // 初始邻邦有不同的"年龄"，模拟已存在一段时间
      const ageOffset = Math.floor(Math.random() * 30) * 60000 // 0-30分钟随机
      result.push(generateSingleNeighbor(i, Date.now() - ageOffset))
    }
    return result
  }

  const neighbors = ref(generateInitialNeighbors())

  // 检查并增加新邻邦
  function checkNeighborGrowth() {
    const now = Date.now()
    const elapsed = now - lastNeighborGrowTime.value

    if (elapsed >= neighborConfig.growthInterval && neighbors.value.length < neighborConfig.maxCount) {
      const newId = neighbors.value.length + 1
      neighbors.value.push(generateSingleNeighbor(newId, now))
      lastNeighborGrowTime.value = now

      addMessage(
        'info',
        '🏘️ 新邻邦出现',
        `${newId}号村庄出现在你的边境！`,
        { type: 'new_neighbor', neighborId: newId }
      )
      autoSave()
    }
  }

  // 更新所有邻邦的兵力（随时间增强）
  function updateNeighborStrength() {
    neighbors.value.forEach(neighbor => {
      const ageMinutes = Math.floor((Date.now() - (neighbor.createdAt || Date.now())) / 60000)
      const newStrengthLevel = Math.min(9, 1 + Math.floor(ageMinutes / 30))

      if (newStrengthLevel > (neighbor.strengthLevel || 1)) {
        neighbor.strengthLevel = newStrengthLevel
        neighbor.troops = generateNeighborTroops(neighbor.personality, newStrengthLevel)
        neighbor.defenseStrength = 50 + newStrengthLevel * 30

        // 更新资源
        const baseResources = 1000 + newStrengthLevel * 500
        neighbor.resources = {
          gold: Math.floor(baseResources * (1 + Math.random() * 0.5)),
          elixir: Math.floor(baseResources * 0.8 * (1 + Math.random() * 0.5)),
          dark: newStrengthLevel >= 5 ? Math.floor(baseResources * 0.05) : 0
        }
      }
    })
  }

  // 邻邦入侵状态
  const neighborInvasion = ref({
    active: false,
    neighborId: null,
    neighborName: null,
    attackerName: null,
    troops: [],
    result: null
  })

  // 邻邦事件队列
  const neighborEvents = ref([])

  // 战斗历史记录（进攻+防守）
  const battleHistory = ref([])

  // 添加战斗记录
  function addBattleRecord(record) {
    battleHistory.value.unshift(record)
    // 最多保留50条记录
    if (battleHistory.value.length > 50) {
      battleHistory.value.pop()
    }
    autoSave()
  }

  // 全局消息通知队列
  const messages = ref([])
  const unreadMessageCount = ref(0)

  // 添加消息
  function addMessage(type, title, content, data = {}) {
    const msg = {
      id: Date.now(),
      type, // 'warning' | 'info' | 'success' | 'danger'
      title,
      content,
      data,
      time: Date.now(),
      read: false
    }
    messages.value.unshift(msg)
    unreadMessageCount.value++
    // 最多保留50条消息
    if (messages.value.length > 50) {
      messages.value.pop()
    }
  }

  // 标记消息已读
  function markMessageRead(msgId) {
    const msg = messages.value.find(m => m.id === msgId)
    if (msg && !msg.read) {
      msg.read = true
      unreadMessageCount.value = Math.max(0, unreadMessageCount.value - 1)
    }
  }

  // 标记所有消息已读
  function markAllMessagesRead() {
    messages.value.forEach(m => m.read = true)
    unreadMessageCount.value = 0
  }

  // 清空消息
  function clearMessages() {
    messages.value = []
    unreadMessageCount.value = 0
  }

  // 上次邻邦好感度漂移时间
  const lastNeighborDriftTime = ref(Date.now())

  // 赠送礼物给邻邦
  function giftToNeighbor(neighborId, giftType, giftData) {
    const neighbor = neighbors.value.find(n => n.id === neighborId)
    if (!neighbor) return { success: false, message: '邻邦不存在' }

    let favorChange = 0
    let message = ''

    if (giftType === 'resource') {
      const { type, amount } = giftData
      // 检查资源是否足够
      if (type === 'gold' && gold.value < amount) return { success: false, message: '金币不足' }
      if (type === 'elixir' && elixir.value < amount) return { success: false, message: '圣水不足' }
      if (type === 'dark' && darkElixir.value < amount) return { success: false, message: '黑油不足' }
      if (type === 'gems' && gems.value < amount) return { success: false, message: '宝石不足' }

      // 扣除资源
      if (type === 'gold') gold.value -= amount
      else if (type === 'elixir') elixir.value -= amount
      else if (type === 'dark') darkElixir.value -= amount
      else if (type === 'gems') gems.value -= amount

      // 计算好感度变化
      const baseGain = { gold: 3, elixir: 3, dark: 8, gems: 15 }
      favorChange = baseGain[type] || 3
      if (neighbor.preferredResources?.includes(type)) {
        favorChange = Math.floor(favorChange * 1.5)
      }

      const resourceNames = { gold: '金币', elixir: '圣水', dark: '黑油', gems: '宝石' }
      message = `${neighbor.name}收到了${amount}${resourceNames[type]}，好感度+${favorChange}`
    } else if (giftType === 'troop') {
      const { troopId, troopName, level, population } = giftData
      const troop = troops.value.find(t => t.id === troopId)
      if (!troop || troop.count < 1) return { success: false, message: '兵种不足' }

      // 扣除兵种
      troop.count--

      // 计算好感度变化
      favorChange = 5
      if (level >= 5 || population >= 10) {
        favorChange = 25 + Math.floor(level * 2)
      }
      if (neighbor.favoriteTroops?.includes(troopName)) {
        favorChange += 15
        message = `【本命兵种】${neighbor.name}非常喜欢${troopName}！好感度+${favorChange}`
      } else if (level <= 2 && population <= 2) {
        // 低等级兵种可能降好感
        if (neighbor.personality === 'aggressive' || neighbor.personality === 'theatrical') {
          favorChange = -25
          message = `${neighbor.name}对低等级的${troopName}很不满！好感度${favorChange}`
        } else {
          favorChange = -5
          message = `${neighbor.name}对${troopName}不太感兴趣。好感度${favorChange}`
        }
      } else {
        message = `${neighbor.name}收到了${troopName}，好感度+${favorChange}`
      }
    }

    // 更新好感度
    neighbor.favor = Math.max(-100, Math.min(100, neighbor.favor + favorChange))

    // 记录赠送历史
    neighbor.giftHistory.push({
      type: giftType,
      data: giftData,
      favorChange,
      time: Date.now()
    })

    // 处理联动效果
    handleNeighborLinkage(neighbor, favorChange)

    autoSave()
    return { success: true, message, favorChange }
  }

  // 处理邻邦联动效果
  function handleNeighborLinkage(neighbor, favorChange) {
    if (!neighbor.linkedNeighbors) return

    neighbor.linkedNeighbors.forEach(link => {
      const linkedNeighbor = neighbors.value.find(n => n.id === link.id)
      if (!linkedNeighbor) return

      if (link.type === 'ally' && favorChange > 0) {
        // 共生关系：正向联动
        const linkBonus = Math.floor(favorChange * 0.3)
        linkedNeighbor.favor = Math.max(-100, Math.min(100, linkedNeighbor.favor + linkBonus))
      } else if (link.type === 'rival' && neighbor.allied) {
        // 竞争关系：结盟时对方降好感
        linkedNeighbor.favor = Math.max(-100, linkedNeighbor.favor - 30)
      }
    })
  }

  // 提议结盟
  function proposeAlliance(neighborId) {
    const neighbor = neighbors.value.find(n => n.id === neighborId)
    if (!neighbor) return { success: false, message: '邻邦不存在' }
    if (neighbor.favor < 50) return { success: false, message: '好感度不足50，无法结盟' }
    if (neighbor.allied) return { success: false, message: '已经是同盟关系' }

    neighbor.allied = true
    neighbor.favor = Math.min(100, neighbor.favor + 30)

    // 处理竞争关系
    neighbor.linkedNeighbors?.forEach(link => {
      if (link.type === 'rival') {
        const rival = neighbors.value.find(n => n.id === link.id)
        if (rival) {
          rival.favor = Math.max(-100, rival.favor - 30)
        }
      }
    })

    autoSave()
    return { 
      success: true, 
      message: `与${neighbor.name}结成同盟！${neighbor.dialogs.ally}`
    }
  }

  // 请求邻邦援助
  function requestNeighborAid(neighborId) {
    const neighbor = neighbors.value.find(n => n.id === neighborId)
    if (!neighbor) return { success: false, message: '邻邦不存在' }
    if (neighbor.favor < 61) return { success: false, message: '好感度不足61，无法请求援助' }
    
    const now = Date.now()
    if (neighbor.lastAidTime && now - neighbor.lastAidTime < 3600000) {
      const remaining = Math.ceil((3600000 - (now - neighbor.lastAidTime)) / 60000)
      return { success: false, message: `援助冷却中，还需${remaining}分钟` }
    }

    neighbor.lastAidTime = now

    // 根据邻邦性格给予不同援助
    let aidMessage = ''
    const aidAmount = 3000 + Math.floor(Math.random() * 3000) // 3000-6000随机
    
    if (neighbor.personality === 'aggressive' || neighbor.personality === 'theatrical') {
      gold.value = Math.min(maxGold.value, gold.value + aidAmount)
      aidMessage = `${neighbor.name}号派来了战利品！获得${aidAmount}金币`
    } else if (neighbor.personality === 'greedy') {
      gold.value = Math.min(maxGold.value, gold.value + aidAmount)
      aidMessage = `${neighbor.name}号送来了贸易收益！获得${aidAmount}金币`
    } else if (neighbor.personality === 'peaceful' || neighbor.personality === 'symbiotic') {
      elixir.value = Math.min(maxElixir.value, elixir.value + aidAmount)
      aidMessage = `${neighbor.name}号赠予了圣水祝福！获得${aidAmount}圣水`
    } else if (neighbor.personality === 'possessive' && townHallLevel.value >= 7) {
      const darkAmount = Math.floor(aidAmount / 10)
      darkElixir.value = Math.min(maxDarkElixir.value, darkElixir.value + darkAmount)
      aidMessage = `${neighbor.name}号送来了暗黑精华！获得${darkAmount}黑油`
    } else {
      gold.value = Math.min(maxGold.value, gold.value + aidAmount)
      aidMessage = `${neighbor.name}号送来了援助！获得${aidAmount}金币`
    }

    autoSave()
    return { success: true, message: aidMessage }
  }

  // 检查邻邦好感度漂移（每5分钟，加速版）
  function checkNeighborDrift() {
    const now = Date.now()
    // 加速版：1分钟检查一次
    if (now - lastNeighborDriftTime.value < 60000) return

    lastNeighborDriftTime.value = now

    neighbors.value.forEach(neighbor => {
      // 敌对状态自动降好感
      if (neighbor.favor < -20) {
        const driftRate = {
          aggressive: -2,
          theatrical: -2,
          possessive: -1,
          greedy: -1,
          peaceful: -1,
          symbiotic: -1
        }
        const drift = driftRate[neighbor.personality] || -1
        neighbor.favor = Math.max(-100, Math.floor(neighbor.favor + drift))
      }
      // 中立状态随机漂移
      else if (neighbor.favor >= -20 && neighbor.favor <= 20) {
        const drift = Math.random() < 0.5 ? -1 : 1 // 随机 -1 或 +1
        neighbor.favor = Math.max(-100, Math.min(100, Math.floor(neighbor.favor + drift)))
      }
      // 确保好感度为整数
      neighbor.favor = Math.floor(neighbor.favor)
    })

    // 检查是否触发邻邦入侵
    checkNeighborInvasion()
    
    // 检查是否触发邻邦捐赠请求
    checkDonationRequests()
    
    autoSave()
  }

  // 邻邦捐赠请求系统
  const donationRequests = ref([])
  
  // 检查并生成捐赠请求
  function checkDonationRequests() {
    // 先处理过期的请求（超过3分钟未响应）
    const now = Date.now()
    donationRequests.value = donationRequests.value.filter(req => {
      if (now - req.time > 180000) { // 3分钟过期
        // 过期未捐赠，降低好感度
        const neighbor = neighbors.value.find(n => n.id === req.neighborId)
        if (neighbor && !req.fulfilled) {
          const penalty = req.personality === 'greedy' ? -8 : -5
          neighbor.favor = Math.max(-100, neighbor.favor + penalty)
          addMessage(
            'warning',
            '😤 捐赠请求过期',
            `${neighbor.name}${neighbor.title}对你的忽视很不满！好感度${penalty}`,
            { type: 'donation_expired', neighborId: req.neighborId }
          )
        }
        return false
      }
      return true
    })
    
    // 随机触发新的捐赠请求（30%概率，每次检查）
    if (Math.random() > 0.3) return
    
    // 只有中立或友好的邻邦会请求捐赠
    const eligibleNeighbors = neighbors.value.filter(n => 
      n.favor >= -10 && n.favor <= 70 && 
      !donationRequests.value.some(r => r.neighborId === n.id)
    )
    
    if (eligibleNeighbors.length === 0) return
    
    // 随机选择一个邻邦
    const neighbor = eligibleNeighbors[Math.floor(Math.random() * eligibleNeighbors.length)]
    
    // 根据性格决定请求的资源类型和数量
    const requestTypes = {
      greedy: { type: 'gold', amount: 2000, reward: 8 },
      aggressive: { type: 'elixir', amount: 1500, reward: 6 },
      peaceful: { type: 'elixir', amount: 1000, reward: 5 },
      possessive: { type: 'gold', amount: 1500, reward: 6 },
      symbiotic: { type: 'elixir', amount: 800, reward: 4 },
      theatrical: { type: 'gold', amount: 1200, reward: 5 }
    }
    
    const reqConfig = requestTypes[neighbor.personality] || { type: 'gold', amount: 1000, reward: 5 }
    
    // 创建捐赠请求
    const request = {
      id: Date.now(),
      neighborId: neighbor.id,
      neighborName: neighbor.name,
      neighborTitle: neighbor.title,
      neighborIcon: neighbor.icon,
      personality: neighbor.personality,
      resourceType: reqConfig.type,
      amount: reqConfig.amount,
      reward: reqConfig.reward,
      time: now,
      fulfilled: false
    }
    
    donationRequests.value.push(request)
    
    // 发送消息通知
    const resourceNames = { gold: '金币', elixir: '圣水', dark: '黑油' }
    const dialogues = {
      greedy: `"嘿，朋友！能借我点${resourceNames[reqConfig.type]}吗？做生意急用！"`,
      aggressive: `"战友！我需要${resourceNames[reqConfig.type]}来训练部队，帮帮忙！"`,
      peaceful: `"善良的邻居，能分享一些${resourceNames[reqConfig.type]}吗？"`,
      possessive: `"亲爱的...我想要一些${resourceNames[reqConfig.type]}，你会给我的对吧？"`,
      symbiotic: `"朋友，我们互帮互助，能给我一些${resourceNames[reqConfig.type]}吗？"`,
      theatrical: `"观众朋友！赞助我${resourceNames[reqConfig.type]}，我给你表演精彩节目！"`
    }
    
    addMessage(
      'info',
      `📨 ${neighbor.name}${neighbor.title}的请求`,
      dialogues[neighbor.personality] || `请求捐赠 ${reqConfig.amount} ${resourceNames[reqConfig.type]}`,
      { 
        type: 'donation_request', 
        requestId: request.id,
        neighborId: neighbor.id,
        resourceType: reqConfig.type,
        amount: reqConfig.amount,
        reward: reqConfig.reward
      }
    )
  }
  
  // 响应捐赠请求
  function fulfillDonationRequest(requestId) {
    const request = donationRequests.value.find(r => r.id === requestId)
    if (!request) return { success: false, message: '请求不存在或已过期' }
    if (request.fulfilled) return { success: false, message: '已经捐赠过了' }
    
    // 检查资源是否足够
    if (request.resourceType === 'gold' && gold.value < request.amount) {
      return { success: false, message: '金币不足' }
    }
    if (request.resourceType === 'elixir' && elixir.value < request.amount) {
      return { success: false, message: '圣水不足' }
    }
    if (request.resourceType === 'dark' && darkElixir.value < request.amount) {
      return { success: false, message: '黑油不足' }
    }
    
    // 扣除资源
    if (request.resourceType === 'gold') gold.value -= request.amount
    else if (request.resourceType === 'elixir') elixir.value -= request.amount
    else if (request.resourceType === 'dark') darkElixir.value -= request.amount
    
    // 增加好感度
    const neighbor = neighbors.value.find(n => n.id === request.neighborId)
    if (neighbor) {
      neighbor.favor = Math.min(100, neighbor.favor + request.reward)
    }
    
    // 标记为已完成
    request.fulfilled = true
    
    // 从列表中移除
    donationRequests.value = donationRequests.value.filter(r => r.id !== requestId)
    
    autoSave()
    
    const resourceNames = { gold: '金币', elixir: '圣水', dark: '黑油' }
    return { 
      success: true, 
      message: `捐赠成功！${request.neighborName}${request.neighborTitle}很感激，好感度+${request.reward}`,
      reward: request.reward
    }
  }
  
  // 拒绝捐赠请求
  function rejectDonationRequest(requestId) {
    const request = donationRequests.value.find(r => r.id === requestId)
    if (!request) return { success: false, message: '请求不存在或已过期' }
    
    // 降低好感度
    const neighbor = neighbors.value.find(n => n.id === request.neighborId)
    const penalty = request.personality === 'greedy' ? -10 : request.personality === 'possessive' ? -12 : -6
    if (neighbor) {
      neighbor.favor = Math.max(-100, neighbor.favor + penalty)
    }
    
    // 从列表中移除
    donationRequests.value = donationRequests.value.filter(r => r.id !== requestId)
    
    autoSave()
    
    return { 
      success: true, 
      message: `拒绝了${request.neighborName}的请求，好感度${penalty}`,
      penalty
    }
  }

  // 检查邻邦入侵
  function checkNeighborInvasion() {
    // 敌对状态（好感度 < -20）就有可能来攻击
    const hostileNeighbors = neighbors.value.filter(n => n.favor < -20)
    if (hostileNeighbors.length === 0) return

    hostileNeighbors.forEach(neighbor => {
      // 根据好感度计算入侵概率
      // 血仇（≤-60）：15-25% | 敌对（-59~-20）：5-10%
      let invasionChance = 0.05
      if (neighbor.favor <= -60) {
        invasionChance = neighbor.personality === 'theatrical' ? 0.25 : 0.15
      } else if (neighbor.favor <= -40) {
        invasionChance = neighbor.personality === 'aggressive' ? 0.12 : 0.08
      }
      
      if (Math.random() < invasionChance) {
        triggerNeighborInvasion(neighbor)
      }
    })
  }

  // 触发邻邦入侵
  function triggerNeighborInvasion(neighbor) {
    if (neighborInvasion.value.active) return

    // 根据性格生成攻击部队
    const troopsByPersonality = {
      aggressive: [
        { name: '巨人', level: 5, count: 5 },
        { name: '弓箭手', level: 5, count: 20 }
      ],
      theatrical: [
        { name: '骷髅兵', level: 8, count: 20 },
        { name: '气球兵', level: 5, count: 5 }
      ],
      possessive: [
        { name: '哥布林', level: 6, count: 15 },
        { name: '法师', level: 5, count: 5 }
      ],
      greedy: [
        { name: '哥布林', level: 5, count: 25 },
        { name: '炸弹人', level: 4, count: 5 }
      ],
      peaceful: [
        { name: '弓箭手', level: 4, count: 15 },
        { name: '巨人', level: 3, count: 3 }
      ],
      symbiotic: [
        { name: '野蛮人', level: 5, count: 20 },
        { name: '弓箭手', level: 4, count: 10 }
      ]
    }

    const attackTroops = troopsByPersonality[neighbor.personality] || [
      { name: '野蛮人', level: 5, count: 15 },
      { name: '弓箭手', level: 5, count: 10 }
    ]

    neighborInvasion.value = {
      active: true,
      neighborId: neighbor.id,
      neighborName: `${neighbor.name}号`,
      attackerName: `${neighbor.name}${neighbor.title}的军队`,
      troops: attackTroops,
      result: null
    }

    // 添加入侵警告消息
    addMessage(
      'danger',
      '⚠️ 敌袭警报！',
      `${neighbor.name}${neighbor.title}正在进攻你的村庄！`,
      { neighborId: neighbor.id, type: 'invasion' }
    )

    // 3秒后自动解决入侵
    setTimeout(() => {
      resolveNeighborInvasion()
    }, 3000)
  }

  // 解决邻邦入侵
  function resolveNeighborInvasion() {
    if (!neighborInvasion.value.active) return

    const neighbor = neighbors.value.find(n => n.id === neighborInvasion.value.neighborId)
    
    // 计算防御力
    let defenseStrength = 0
    const defenseBuildings = buildings.value.filter(b => 
      ['cannon', 'archertower', 'mortar', 'airdefense', 'wizardtower'].includes(b.type)
    )
    defenseBuildings.forEach(b => {
      const baseDefense = { cannon: 10, archertower: 12, mortar: 15, airdefense: 20, wizardtower: 25 }
      defenseStrength += (baseDefense[b.type] || 10) * b.level * (b.count || 1)
    })
    defenseStrength += townHallLevel.value * 20

    // 计算攻击力
    let attackStrength = 0
    neighborInvasion.value.troops.forEach(t => {
      attackStrength += t.level * t.count * 5
    })

    const defenseRatio = defenseStrength / (defenseStrength + attackStrength)
    const defended = defenseRatio > 0.4 + Math.random() * 0.2

    let goldLost = 0, elixirLost = 0, darkLost = 0

    if (!defended) {
      const lootRate = 0.15 + Math.random() * 0.1
      goldLost = Math.floor(gold.value * lootRate)
      elixirLost = Math.floor(elixir.value * lootRate)
      if (townHallLevel.value >= 7) {
        darkLost = Math.floor(darkElixir.value * lootRate * 0.5)
      }
      gold.value -= goldLost
      elixir.value -= elixirLost
      darkElixir.value -= darkLost

      // 防御失败降低好感度
      if (neighbor) {
        neighbor.favor = Math.max(-100, neighbor.favor - 10)
      }
    } else {
      // 防御成功略微提升好感度
      if (neighbor) {
        neighbor.favor = Math.min(100, neighbor.favor + 5)
      }
    }

    neighborInvasion.value.result = {
      defended,
      goldLost,
      elixirLost,
      darkLost
    }

    // 生成防御战斗日志
    const defenseBattleLog = generateDefenseBattleLog(
      neighbor,
      neighborInvasion.value.troops,
      defenseBuildings,
      defended,
      defenseRatio,
      { gold: goldLost, elixir: elixirLost, dark: darkLost }
    )

    // 添加到入侵历史记录（与NPC入侵共用）
    const historyRecord = {
      attackerName: neighborInvasion.value.attackerName,
      attackerTH: '邻邦',
      defended,
      goldLost,
      elixirLost,
      darkLost,
      defenseRate: Math.floor(defenseRatio * 100),
      time: Date.now()
    }
    npcInvasion.value.invasionHistory.unshift(historyRecord)
    // 最多保留20条记录
    if (npcInvasion.value.invasionHistory.length > 20) {
      npcInvasion.value.invasionHistory.pop()
    }

    // 保存战斗记录到战斗历史
    addBattleRecord({
      id: Date.now(),
      type: 'defense',
      target: neighborInvasion.value.attackerName,
      targetIcon: neighbor?.icon || '⚔️',
      victory: defended,
      playerPower: Math.floor(defenseStrength),
      enemyPower: Math.floor(attackStrength),
      loot: { gold: -goldLost, elixir: -elixirLost, dark: -darkLost },
      battleLog: defenseBattleLog,
      time: Date.now()
    })

    // 添加结果消息
    if (defended) {
      addMessage(
        'success',
        '🛡️ 防御成功！',
        `成功击退了${neighborInvasion.value.attackerName}的进攻！`,
        { type: 'defense_success' }
      )
    } else {
      addMessage(
        'warning',
        '💔 村庄被掠夺',
        `${neighborInvasion.value.attackerName}掠夺了 ${goldLost} 金币、${elixirLost} 圣水`,
        { type: 'defense_fail' }
      )
    }

    setTimeout(() => {
      neighborInvasion.value = {
        active: false,
        neighborId: null,
        neighborName: null,
        attackerName: null,
        troops: [],
        result: null
      }
    }, 3000)

    autoSave()
  }

  // 生成防御战斗日志
  function generateDefenseBattleLog(neighbor, attackTroops, defenseBuildings, defended, defenseRatio, lostResources) {
    const logs = []
    const directions = ['北方', '南方', '东方', '西方', '东北角', '西北角', '东南角', '西南角']
    const randomDir = () => directions[Math.floor(Math.random() * directions.length)]
    const attackerName = neighbor ? `${neighbor.name}${neighbor.title}` : '未知敌军'

    logs.push({ type: 'system', time: '警报', text: `🚨 敌袭警报！${attackerName}的军队正在进攻你的村庄！` })

    if (attackTroops && attackTroops.length > 0) {
      const troopDesc = attackTroops.map(t => `${t.count}名${t.level}级${t.name}`).join('、')
      logs.push({ type: 'intel', time: '侦查', text: `🎯 敌军配置：${troopDesc}` })
    }

    if (defenseBuildings && defenseBuildings.length > 0) {
      const defenseNames = { cannon: '加农炮', archertower: '箭塔', mortar: '迫击炮', airdefense: '防空火箭', wizardtower: '法师塔' }
      const defenseDesc = defenseBuildings.slice(0, 3).map(b => `${b.level}级${defenseNames[b.type] || b.name}`).join('、')
      logs.push({ type: 'deploy', time: '防御', text: `🛡️ 防御阵容：${defenseDesc}${defenseBuildings.length > 3 ? '等' : ''} 严阵以待！` })
    }

    let timeCounter = 5
    const battleEvents = []
    if (attackTroops) {
      attackTroops.forEach(troop => {
        const templates = {
          '野蛮人': [`敌方野蛮人从${randomDir()}冲锋！`, `野蛮人${defended ? '被箭塔射杀' : '突破防线'}！`],
          '弓箭手': [`敌方弓箭手在${randomDir()}列阵！`, `弓箭手${defended ? '被法师塔消灭' : '压制我方'}！`],
          '巨人': [`敌方巨人从${randomDir()}逼近！`, `巨人${defended ? '被加农炮击杀' : '吸引火力'}！`],
          '哥布林': [`敌方哥布林从${randomDir()}潜入！`, `哥布林${defended ? '触发陷阱' : '洗劫资源'}！`],
          '气球兵': [`敌方气球兵升空！`, `气球兵${defended ? '被防空击落' : '投下炸弹'}！`],
          '法师': [`敌方法师释放火球！`, `法师${defended ? '被反制' : '烧毁建筑'}！`]
        }
        const events = templates[troop.name] || [`敌方${troop.name}进攻！`, `${troop.name}${defended ? '被击退' : '突破'}！`]
        battleEvents.push(events[Math.floor(Math.random() * events.length)])
      })
    }
    if (defenseBuildings) {
      const defenseNames = { cannon: '加农炮', archertower: '箭塔', mortar: '迫击炮', airdefense: '防空火箭', wizardtower: '法师塔' }
      defenseBuildings.slice(0, 2).forEach(b => {
        const name = defenseNames[b.type] || '防御塔'
        battleEvents.push(`${b.level}级${name}${defended ? '精准命中敌军' : '火力不足'}！`)
      })
    }
    battleEvents.slice(0, 5).forEach(event => {
      logs.push({ type: 'battle', time: `00:${String(timeCounter).padStart(2, '0')}`, text: event })
      timeCounter += Math.floor(Math.random() * 8) + 3
    })

    if (defended) {
      logs.push({ type: 'result', time: '结算', text: `🏆 防守成功！敌军被击退，破坏率 ${Math.floor((1 - defenseRatio) * 100)}%。` })
      logs.push({ type: 'comment', time: '点评', text: '💬 "防御布局立功了！敌人根本无法突破。"' })
    } else {
      logs.push({ type: 'result', time: '结算', text: `💀 防守失败！损失金币 ${lostResources.gold}，圣水 ${lostResources.elixir}${lostResources.dark > 0 ? `，黑油 ${lostResources.dark}` : ''}。` })
      logs.push({ type: 'comment', time: '点评', text: '💬 "防御力不足，需要升级更多防御建筑。"' })
    }
    return logs
  }

  // 生成战斗日志
  function generateBattleLog(neighbor, playerTroops, neighborTroops, victory, powerRatio, lootResult) {
    const logs = []
    const directions = ['北方', '南方', '东方', '西方', '东北角', '西北角', '东南角', '西南角']
    const randomDir = () => directions[Math.floor(Math.random() * directions.length)]
    
    // 侦查报告
    logs.push({
      type: 'system',
      time: '侦查',
      text: `📡 侦查报告：目标是 ${neighbor.name}${neighbor.title} 的村庄。防御力 ${calculateNeighborPower(neighbor)}，${neighbor.personality === 'aggressive' ? '戒备森严' : neighbor.personality === 'peaceful' ? '防御薄弱' : '防御一般'}。`
    })

    // 敌方配置
    if (neighborTroops && neighborTroops.length > 0) {
      const troopDesc = neighborTroops.map(t => `${t.count}名${t.level}级${t.name}`).join('、')
      logs.push({
        type: 'intel',
        time: '情报',
        text: `🎯 敌方驻军：${troopDesc}`
      })
    }

    // 玩家部队
    const activeTroops = playerTroops.filter(t => t.count > 0 && t.unlocked)
    if (activeTroops.length > 0) {
      const playerDesc = activeTroops.slice(0, 3).map(t => `${t.count}名${t.name}`).join('、')
      logs.push({
        type: 'deploy',
        time: '部署',
        text: `⚔️ 我方出击：${playerDesc}${activeTroops.length > 3 ? '等' : ''} 从${randomDir()}发起进攻！`
      })
    }

    // 战斗过程
    let timeCounter = 5
    const battleEvents = []

    // 根据兵种生成战斗事件
    activeTroops.forEach(troop => {
      if (troop.count === 0) return
      const events = getBattleEventsForTroop(troop.name, troop.count, troop.level, victory, randomDir())
      battleEvents.push(...events)
    })

    // 敌方反击事件
    if (neighborTroops) {
      neighborTroops.forEach(t => {
        if (Math.random() > 0.5) {
          battleEvents.push(getDefenseEvent(t.name, t.count, victory, randomDir()))
        }
      })
    }

    // 随机排序并添加时间戳
    battleEvents.sort(() => Math.random() - 0.5)
    battleEvents.slice(0, 5).forEach(event => {
      logs.push({
        type: 'battle',
        time: `00:${String(timeCounter).padStart(2, '0')}`,
        text: event
      })
      timeCounter += Math.floor(Math.random() * 8) + 3
    })

    // 结算
    if (victory) {
      const stars = powerRatio > 0.7 ? 3 : powerRatio > 0.55 ? 2 : 1
      logs.push({
        type: 'result',
        time: '结算',
        text: `🏆 战斗胜利！获得 ${stars}星。掠夺金币 ${lootResult.gold}，圣水 ${lootResult.elixir}${lootResult.dark > 0 ? `，黑油 ${lootResult.dark}` : ''}。`
      })
      logs.push({
        type: 'comment',
        time: '点评',
        text: getVictoryComment(powerRatio, activeTroops)
      })
    } else {
      logs.push({
        type: 'result',
        time: '结算',
        text: `💀 进攻失败！敌方防御过于强大，我军被迫撤退。`
      })
      logs.push({
        type: 'comment',
        time: '点评',
        text: getDefeatComment(powerRatio, neighbor)
      })
    }

    return logs
  }

  // 根据兵种生成战斗事件
  function getBattleEventsForTroop(troopName, count, level, victory, direction) {
    const events = []
    const templates = {
      '野蛮人': [
        `野蛮人小队从${direction}冲锋，怒吼声震天！`,
        `${count}名野蛮人挥舞战斧，${victory ? '撕开了敌方防线' : '遭遇顽强抵抗'}！`,
        `野蛮人们${victory ? '势如破竹' : '伤亡惨重'}，${victory ? '敌方阵地动摇' : '被迫后撤'}。`
      ],
      '弓箭手': [
        `弓箭手在${direction}列阵，箭雨倾泻而下！`,
        `${count}名弓箭手精准射击，${victory ? '敌方守军纷纷倒下' : '但敌方城墙太厚'}。`,
        `弓箭手${victory ? '压制了敌方火力' : '遭到敌方法师反击'}！`
      ],
      '巨人': [
        `巨人从${direction}缓缓推进，大地为之震颤！`,
        `巨人承受了大量炮火，HP下降${victory ? '30%' : '60%'}！`,
        `巨人${victory ? '成功吸引了所有防御塔火力' : '倒在了敌方炮火下'}！`
      ],
      '哥布林': [
        `哥布林小队从${direction}潜入，目标直指资源库！`,
        `${count}名哥布林${victory ? '成功洗劫了储金罐' : '被陷阱炸飞'}！`,
        `哥布林们${victory ? '满载而归' : '空手而逃'}。`
      ],
      '气球兵': [
        `气球兵从${direction}升空，投下致命炸弹！`,
        `气球兵${victory ? '摧毁了敌方加农炮' : '被防空火箭击落'}！`,
        `${victory ? '爆炸声此起彼伏，敌方防御崩溃' : '气球残骸坠落，进攻受阻'}。`
      ],
      '法师': [
        `法师在${direction}释放火球术，烈焰吞噬一切！`,
        `${count}名法师联手施法，${victory ? '敌方建筑化为灰烬' : '但魔力消耗殆尽'}！`,
        `法师的魔法${victory ? '势不可挡' : '被敌方法师塔反制'}！`
      ],
      '飞龙': [
        `飞龙从${direction}俯冲而下，龙息席卷战场！`,
        `飞龙${victory ? '无视城墙，直捣黄龙' : '遭遇防空火箭猛烈攻击'}！`,
        `${victory ? '龙威之下，敌军溃散' : '飞龙负伤撤退'}。`
      ],
      '皮卡超人': [
        `皮卡超人从${direction}冲锋，重剑横扫！`,
        `皮卡超人${victory ? '一剑劈开城墙' : '被集火攻击'}！`,
        `${victory ? '无人能挡皮卡的怒火' : '皮卡倒在了敌方炮火下'}！`
      ]
    }

    const troopEvents = templates[troopName] || [
      `${troopName}从${direction}发起进攻！`,
      `${count}名${troopName}${victory ? '奋勇作战' : '遭遇抵抗'}！`
    ]

    events.push(troopEvents[Math.floor(Math.random() * troopEvents.length)])
    return events
  }

  // 防御事件
  function getDefenseEvent(troopName, count, victory, direction) {
    const templates = [
      `敌方${count}名${troopName}从${direction}反击！`,
      `${troopName}守军${victory ? '被我军击溃' : '顽强抵抗'}！`,
      `敌方${troopName}${victory ? '节节败退' : '发起猛烈反扑'}！`
    ]
    return templates[Math.floor(Math.random() * templates.length)]
  }

  // 胜利点评
  function getVictoryComment(powerRatio, troops) {
    const comments = [
      '💬 "漂亮的进攻！兵种配合得当，时机把握精准。"',
      '💬 "这波掠夺干净利落，敌人毫无还手之力！"',
      '💬 "不错的战术，但下次可以尝试更激进的打法。"',
      '💬 "资源到手！继续保持这种进攻节奏。"'
    ]
    if (powerRatio > 0.7) {
      return '💬 "碾压级别的胜利！敌人根本不是对手！"'
    }
    return comments[Math.floor(Math.random() * comments.length)]
  }

  // 失败点评
  function getDefeatComment(powerRatio, neighbor) {
    const comments = [
      `💬 "敌方防御太强了，需要更多兵力才能攻克${neighbor.name}。"`,
      '💬 "这次进攻准备不足，下次要带更多部队。"',
      '💬 "失败是成功之母，总结经验再战！"',
      `💬 "${neighbor.title}的防御不是盖的，需要重新制定战术。"`
    ]
    return comments[Math.floor(Math.random() * comments.length)]
  }

  // 掠夺邻邦
  function raidNeighbor(neighborId) {
    const neighbor = neighbors.value.find(n => n.id === neighborId)
    if (!neighbor) return { success: false, message: '邻邦不存在' }

    // 计算玩家攻击力（基于当前兵种）
    let playerPower = 0
    const troopPowerMap = { '野蛮人': 1, '弓箭手': 1, '哥布林': 0.5, '巨人': 5, '炸弹人': 2, '气球兵': 4, '法师': 4, '天使': 10, '飞龙': 8, '皮卡超人': 10, '飞龙宝宝': 6, '女武神': 6, '戈仑石人': 15, '女巫': 8, '亡灵': 1, '野猪骑士': 5, '熔岩猎犬': 12 }
    
    const playerTroopsCopy = []
    troops.value.forEach(t => {
      if (t.count > 0 && t.unlocked) {
        const power = troopPowerMap[t.name] || 1
        playerPower += power * t.level * t.count
        playerTroopsCopy.push({ ...t })
      }
    })

    // 如果没有兵，给一个很小的基础攻击力
    if (playerPower === 0) {
      playerPower = 10
    }

    // 计算邻邦防御力（基于兵力配置）
    const neighborPower = calculateNeighborPower(neighbor)

    // 战斗结果：攻击力 vs 防御力
    const powerRatio = playerPower / (playerPower + neighborPower)
    const victoryThreshold = 0.45 + Math.random() * 0.1
    const victory = powerRatio > victoryThreshold

    // 计算好感度惩罚
    let favorPenalty = 20
    if (neighbor.favor > 60) favorPenalty = 50
    else if (neighbor.favor > 20) favorPenalty = 40
    else if (neighbor.favor > -20) favorPenalty = 30
    else if (neighbor.favor > -60) favorPenalty = 25

    // 消耗兵力
    const troopLossRate = victory 
      ? 0.1 + (1 - powerRatio) * 0.2
      : 0.3 + (1 - powerRatio) * 0.3
    
    troops.value.forEach(t => {
      if (t.count > 0 && t.unlocked) {
        const loss = Math.ceil(t.count * troopLossRate)
        t.count = Math.max(0, t.count - loss)
      }
    })

    // 计算战利品
    let lootResult = { gold: 0, elixir: 0, dark: 0 }
    if (victory) {
      const lootRate = 0.3 + powerRatio * 0.2
      const neighborRes = neighbor.resources || { gold: 2000, elixir: 1600, dark: 0 }
      
      lootResult.gold = Math.floor(neighborRes.gold * lootRate)
      lootResult.elixir = Math.floor(neighborRes.elixir * lootRate)
      lootResult.dark = Math.floor((neighborRes.dark || 0) * lootRate)

      gold.value = Math.min(maxGold.value, gold.value + lootResult.gold)
      elixir.value = Math.min(maxElixir.value, elixir.value + lootResult.elixir)
      if (lootResult.dark > 0) {
        darkElixir.value = Math.min(maxDarkElixir.value, darkElixir.value + lootResult.dark)
      }

      neighbor.resources.gold = Math.max(0, neighborRes.gold - lootResult.gold)
      neighbor.resources.elixir = Math.max(0, neighborRes.elixir - lootResult.elixir)
      if (neighbor.resources.dark) {
        neighbor.resources.dark = Math.max(0, neighborRes.dark - lootResult.dark)
      }
    }

    // 生成战斗日志
    const battleLog = generateBattleLog(neighbor, playerTroopsCopy, neighbor.troops, victory, powerRatio, lootResult)

    let result = {
      success: true,
      victory,
      playerPower: Math.floor(playerPower),
      neighborPower: Math.floor(neighborPower),
      goldGained: lootResult.gold,
      elixirGained: lootResult.elixir,
      darkGained: lootResult.dark,
      favorLost: victory ? favorPenalty : Math.floor(favorPenalty * 0.7),
      battleLog,
      message: victory 
        ? `⚔️ 掠夺成功！[${Math.floor(playerPower)} vs ${Math.floor(neighborPower)}]`
        : `💀 掠夺失败！[${Math.floor(playerPower)} vs ${Math.floor(neighborPower)}]`
    }

    // 更新好感度
    neighbor.favor = Math.max(-100, neighbor.favor - favorPenalty)
    
    // 如果是同盟，解除同盟
    if (neighbor.allied) {
      neighbor.allied = false
      result.message += ' 同盟关系已破裂！'
    }

    // 处理联动效果（掠夺会影响关联邻邦）
    if (neighbor.linkedNeighbors) {
      neighbor.linkedNeighbors.forEach(link => {
        const linkedNeighbor = neighbors.value.find(n => n.id === link.id)
        if (linkedNeighbor) {
          if (link.type === 'ally') {
            linkedNeighbor.favor = Math.max(-100, linkedNeighbor.favor - Math.floor(favorPenalty * 0.5))
          } else if (link.type === 'rival') {
            linkedNeighbor.favor = Math.min(100, linkedNeighbor.favor + Math.floor(favorPenalty * 0.2))
          }
        }
      })
    }

    // 保存战斗记录
    addBattleRecord({
      id: Date.now(),
      type: 'attack', // 进攻
      target: `${neighbor.name}${neighbor.title}`,
      targetIcon: neighbor.icon,
      victory,
      playerPower: Math.floor(playerPower),
      enemyPower: Math.floor(neighborPower),
      loot: lootResult,
      battleLog,
      time: Date.now()
    })

    autoSave()
    return result
  }

  // 部落城堡数据
  // 5本解锁，援军容量根据等级增加
  const clanCastle = ref({
    level: 0,                 // 0表示未建造，1-6级
    troops: [],               // 援军列表 { name, level, count, population }
    spell: null,              // 援军法术（5级解锁）
    lastRequestTime: null,    // 上次请求时间
    requestCooldown: 25000    // 请求冷却时间（25秒，加速后）
  })

  // 部落城堡配置
  const clanCastleConfig = {
    unlockTH: 5,              // 5本解锁
    maxLevel: 6,
    // 各等级属性
    levels: {
      1: { capacity: 10, hp: 1000, spellSlot: 0, protection: { gold: 1000, elixir: 1000, dark: 0 } },
      2: { capacity: 15, hp: 1400, spellSlot: 0, protection: { gold: 1500, elixir: 1500, dark: 0 } },
      3: { capacity: 20, hp: 1800, spellSlot: 0, protection: { gold: 2000, elixir: 2000, dark: 0 } },
      4: { capacity: 25, hp: 2200, spellSlot: 0, protection: { gold: 2500, elixir: 2500, dark: 0 } },
      5: { capacity: 30, hp: 2600, spellSlot: 1, protection: { gold: 3000, elixir: 3000, dark: 100 } },
      6: { capacity: 35, hp: 3000, spellSlot: 1, protection: { gold: 3500, elixir: 3500, dark: 100 } }
    },
    // 升级消耗
    upgradeCost: {
      1: { gold: 10000, time: 300 },      // 建造：1万金币，5分钟
      2: { gold: 50000, time: 600 },      // 1→2：5万金币，10分钟
      3: { gold: 100000, time: 900 },     // 2→3：10万金币，15分钟
      4: { gold: 200000, time: 1200 },    // 3→4：20万金币，20分钟
      5: { gold: 500000, time: 1800 },    // 4→5：50万金币，30分钟
      6: { gold: 1000000, time: 2700 }    // 5→6：100万金币，45分钟
    },
    // 各等级解锁大本营
    unlockTHByLevel: { 1: 5, 2: 5, 3: 6, 4: 7, 5: 8, 6: 9 }
  }

  // 获取部落城堡当前容量
  const clanCastleCapacity = computed(() => {
    if (clanCastle.value.level === 0) return 0
    return clanCastleConfig.levels[clanCastle.value.level]?.capacity || 0
  })

  // 获取部落城堡当前援军人口
  const clanCastleCurrentPopulation = computed(() => {
    return clanCastle.value.troops.reduce((sum, t) => sum + (t.population * t.count), 0)
  })

  // 请求援军（模拟NPC捐赠）
  function requestTroops(troopName, count) {
    if (clanCastle.value.level === 0) {
      return { success: false, message: '部落城堡未建造' }
    }

    // 检查冷却
    if (clanCastle.value.lastRequestTime) {
      const elapsed = Date.now() - clanCastle.value.lastRequestTime
      if (elapsed < clanCastle.value.requestCooldown) {
        const remaining = Math.ceil((clanCastle.value.requestCooldown - elapsed) / 1000)
        return { success: false, message: `请求冷却中，还需 ${remaining} 秒` }
      }
    }

    // 获取兵种信息
    const troopInfo = troops.value.find(t => t.name === troopName)
    if (!troopInfo) {
      return { success: false, message: '未知兵种' }
    }

    const population = troopInfo.population || 1
    const totalPopulation = population * count
    const currentPop = clanCastleCurrentPopulation.value
    const capacity = clanCastleCapacity.value

    if (currentPop + totalPopulation > capacity) {
      return { success: false, message: `援军容量不足，剩余 ${capacity - currentPop} 人口` }
    }

    // 模拟NPC捐赠（随机等级1-3）
    const donatedLevel = Math.min(3, Math.floor(Math.random() * 3) + 1)

    // 添加援军
    const existingTroop = clanCastle.value.troops.find(t => t.name === troopName && t.level === donatedLevel)
    if (existingTroop) {
      existingTroop.count += count
    } else {
      clanCastle.value.troops.push({
        name: troopName,
        level: donatedLevel,
        count: count,
        population: population
      })
    }

    clanCastle.value.lastRequestTime = Date.now()
    autoSave()

    return { 
      success: true, 
      message: `获得 ${count} 个 ${donatedLevel} 级${troopName}援军！`,
      troopLevel: donatedLevel
    }
  }

  // 清空援军（战斗后）
  function clearClanCastleTroops() {
    clanCastle.value.troops = []
    clanCastle.value.spell = null
    autoSave()
  }

  // 删除指定援军
  function removeClanCastleTroop(troopName, troopLevel, count = 1) {
    const troopIndex = clanCastle.value.troops.findIndex(
      t => t.name === troopName && t.level === troopLevel
    )
    if (troopIndex === -1) {
      return { success: false, message: '援军不存在' }
    }

    const troop = clanCastle.value.troops[troopIndex]
    if (troop.count <= count) {
      // 删除整个条目
      clanCastle.value.troops.splice(troopIndex, 1)
    } else {
      // 减少数量
      troop.count -= count
    }

    autoSave()
    return { success: true, message: `已移除 ${count} 个 ${troopLevel}级${troopName}` }
  }

  // 建造/升级部落城堡
  function upgradeClanCastle() {
    // 检查是否已经在升级队列中
    const alreadyUpgrading = upgradeQueue.value.some(q => q.buildingId === 'clancastle')
    if (alreadyUpgrading) {
      return { success: false, message: '部落城堡正在建造/升级中' }
    }

    const nextLevel = clanCastle.value.level + 1
    if (nextLevel > clanCastleConfig.maxLevel) {
      return { success: false, message: '已达最高等级' }
    }

    const requiredTH = clanCastleConfig.unlockTHByLevel[nextLevel]
    if (townHallLevel.value < requiredTH) {
      return { success: false, message: `需要 ${requiredTH} 级大本营` }
    }

    const cost = clanCastleConfig.upgradeCost[nextLevel]
    if (gold.value < cost.gold) {
      return { success: false, message: '金币不足' }
    }

    // 检查建筑工人
    const freeBuilder = builders.value.find(b => !b.busy)
    if (!freeBuilder) {
      return { success: false, message: '没有空闲的建筑工人' }
    }

    // 扣除资源
    gold.value -= cost.gold

    // 占用建筑工人
    const endTime = Date.now() + cost.time * 1000
    freeBuilder.busy = true
    freeBuilder.task = clanCastle.value.level === 0 ? '建造部落城堡' : '升级部落城堡'
    freeBuilder.endTime = endTime

    // 添加到升级队列
    upgradeQueue.value.push({
      buildingId: 'clancastle',
      buildingType: 'clancastle',
      buildingName: '部落城堡',
      startTime: Date.now(),
      endTime: endTime,
      targetLevel: nextLevel
    })

    autoSave()
    return { success: true, message: `开始${clanCastle.value.level === 0 ? '建造' : '升级'}部落城堡` }
  }

  // 完成部落城堡升级
  function completeClanCastleUpgrade() {
    const queueItem = upgradeQueue.value.find(q => q.buildingId === 'clancastle')
    if (!queueItem) return

    clanCastle.value.level = queueItem.targetLevel

    // 释放建筑工人
    const busyBuilder = builders.value.find(b => b.busy && (b.task === '建造部落城堡' || b.task === '升级部落城堡'))
    if (busyBuilder) {
      busyBuilder.busy = false
      busyBuilder.task = null
      busyBuilder.endTime = null
    }

    // 从队列移除
    const idx = upgradeQueue.value.indexOf(queueItem)
    if (idx !== -1) {
      upgradeQueue.value.splice(idx, 1)
    }

    autoSave()
  }

  // 检查部落城堡升级
  function checkClanCastleUpgrade() {
    const queueItem = upgradeQueue.value.find(q => q.buildingId === 'clancastle')
    if (queueItem && queueItem.endTime <= Date.now()) {
      completeClanCastleUpgrade()
    }
  }

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

  // 建筑工人（每个工人有独立的精力值）
  const builders = ref([
    { id: 1, busy: false, task: null, endTime: null, fatigue: 100 },
  ])
  const freeBuilders = computed(() => builders.value.filter(b => !b.busy).length)

  // 建筑工人平均疲劳值（用于判断NPC入侵）
  const builderFatigue = computed(() => {
    if (builders.value.length === 0) return 100
    const total = builders.value.reduce((sum, b) => sum + (b.fatigue ?? 100), 0)
    return Math.round(total / builders.value.length)
  })
  const lastFatigueCheckTime = ref(Date.now())
  
  // NPC入侵系统
  const npcInvasion = ref({
    active: false,           // 是否正在入侵
    attacker: null,          // 入侵者信息
    result: null,            // 入侵结果
    lastInvasionTime: null,  // 上次入侵时间
    invasionHistory: []      // 入侵历史记录
  })
  
  // NPC村庄列表
  const npcVillages = [
    { name: '哥布林强盗', thLevel: 3, strength: 0.3, greed: 0.15 },
    { name: '野蛮人部落', thLevel: 4, strength: 0.4, greed: 0.2 },
    { name: '暗影掠夺者', thLevel: 5, strength: 0.5, greed: 0.25 },
    { name: '骷髅军团', thLevel: 6, strength: 0.6, greed: 0.3 },
    { name: '巨人联盟', thLevel: 7, strength: 0.7, greed: 0.35 },
    { name: '飞龙骑士团', thLevel: 8, strength: 0.8, greed: 0.4 },
    { name: '暗黑领主', thLevel: 9, strength: 0.9, greed: 0.45 }
  ]

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
      if (q.buildingId === 'clancastle') {
        completeClanCastleUpgrade()
      } else {
        completeUpgrade(q.buildingId)
      }
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

  // 检查建筑工人疲劳值（每分钟检查一次，每个工人单独计算）
  function checkBuilderFatigue() {
    const now = Date.now()
    const elapsed = now - lastFatigueCheckTime.value
    
    // 每分钟检查一次
    if (elapsed >= 60 * 1000) {
      lastFatigueCheckTime.value = now
      
      // 每个工人单独计算疲劳值
      builders.value.forEach(builder => {
        // 确保有fatigue属性
        if (builder.fatigue === undefined) builder.fatigue = 100
        
        if (builder.busy) {
          // 工作中的工人消耗疲劳值（每分钟-3~5点）
          const fatigueDecrease = 3 + Math.floor(Math.random() * 3)
          builder.fatigue = Math.max(0, builder.fatigue - fatigueDecrease)
        } else {
          // 空闲时恢复疲劳值（每分钟+5点）
          builder.fatigue = Math.min(100, builder.fatigue + 5)
        }
      })
      
      // 平均疲劳值≤50%时触发NPC入侵检查
      if (builderFatigue.value <= 50) {
        checkNPCInvasion()
      }
    }
  }
  
  // 恢复指定工人的疲劳值（使用宝石）
  function restoreBuilderFatigue(builderId = null, amount = 50) {
    const gemCost = Math.ceil(amount / 10) // 每10点疲劳值消耗1宝石
    if (gems.value < gemCost) {
      return { success: false, message: '宝石不足' }
    }
    
    if (builderId !== null) {
      // 恢复指定工人
      const builder = builders.value.find(b => b.id === builderId)
      if (builder) {
        gems.value -= gemCost
        builder.fatigue = Math.min(100, (builder.fatigue ?? 0) + amount)
        return { success: true, message: `消耗 ${gemCost} 宝石，工人${builder.id}恢复 ${amount} 点精力` }
      }
      return { success: false, message: '工人不存在' }
    } else {
      // 恢复所有工人
      const totalCost = gemCost * builders.value.length
      if (gems.value < totalCost) {
        return { success: false, message: `宝石不足，需要 ${totalCost} 宝石` }
      }
      gems.value -= totalCost
      builders.value.forEach(b => {
        b.fatigue = Math.min(100, (b.fatigue ?? 0) + amount)
      })
      return { success: true, message: `消耗 ${totalCost} 宝石，所有工人恢复 ${amount} 点精力` }
    }
  }
  
  // 检查NPC入侵
  function checkNPCInvasion() {
    // 如果正在入侵中或刚入侵过（5分钟冷却），跳过
    if (npcInvasion.value.active) return
    if (npcInvasion.value.lastInvasionTime && 
        Date.now() - npcInvasion.value.lastInvasionTime < 5 * 60 * 1000) return
    
    // 疲劳值越低，入侵概率越高
    // 疲劳值50: 5%概率, 疲劳值40: 15%概率, 疲劳值30: 25%概率, 疲劳值20: 40%概率, 疲劳值10: 60%概率, 疲劳值0: 80%概率
    let invasionChance = 0.05
    if (builderFatigue.value <= 10) invasionChance = 0.6
    else if (builderFatigue.value <= 20) invasionChance = 0.4
    else if (builderFatigue.value <= 30) invasionChance = 0.25
    else if (builderFatigue.value <= 40) invasionChance = 0.15
    
    if (Math.random() < invasionChance) {
      triggerNPCInvasion()
    }
  }
  
  // 触发NPC入侵
  function triggerNPCInvasion() {
    // 根据玩家大本营等级选择合适的NPC
    const eligibleNPCs = npcVillages.filter(npc => 
      npc.thLevel >= townHallLevel.value - 2 && npc.thLevel <= townHallLevel.value + 1
    )
    
    if (eligibleNPCs.length === 0) return
    
    const attacker = eligibleNPCs[Math.floor(Math.random() * eligibleNPCs.length)]
    
    npcInvasion.value.active = true
    npcInvasion.value.attacker = {
      ...attacker,
      attackTime: Date.now()
    }
    
    // 自动进行防御战斗
    setTimeout(() => {
      resolveNPCInvasion()
    }, 100)
  }
  
  // 解决NPC入侵
  function resolveNPCInvasion() {
    if (!npcInvasion.value.active || !npcInvasion.value.attacker) return
    
    const attacker = npcInvasion.value.attacker
    
    // 计算防御力（基于防御建筑）
    let defenseStrength = 0
    const defenseBuildings = buildings.value.filter(b => 
      ['cannon', 'archertower', 'mortar', 'airdefense', 'wizardtower'].includes(b.type)
    )
    defenseBuildings.forEach(b => {
      const baseDefense = { cannon: 10, archertower: 12, mortar: 15, airdefense: 20, wizardtower: 25 }
      defenseStrength += (baseDefense[b.type] || 10) * b.level * (b.count || 1)
    })
    
    // 大本营等级也提供基础防御
    defenseStrength += townHallLevel.value * 20
    
    // NPC攻击力
    const attackStrength = attacker.thLevel * 50 * attacker.strength
    
    // 计算战斗结果
    const defenseRatio = defenseStrength / (defenseStrength + attackStrength)
    const randomFactor = 0.8 + Math.random() * 0.4 // 0.8-1.2随机因子
    const finalDefenseRate = Math.min(1, defenseRatio * randomFactor)
    
    // 防御成功率
    const defended = finalDefenseRate > 0.5
    
    let goldLost = 0
    let elixirLost = 0
    let darkLost = 0
    
    if (!defended) {
      // 防御失败，损失资源
      const lootRate = attacker.greed * (1 - finalDefenseRate)
      goldLost = Math.floor(gold.value * lootRate)
      elixirLost = Math.floor(elixir.value * lootRate)
      if (townHallLevel.value >= 7) {
        darkLost = Math.floor(darkElixir.value * lootRate * 0.5)
      }
      
      gold.value -= goldLost
      elixir.value -= elixirLost
      darkElixir.value -= darkLost
      
      // 损失奖杯
      const trophyLoss = Math.floor(Math.random() * 15) + 5
      trophies.value = Math.max(0, trophies.value - trophyLoss)
    }
    
    // 记录结果
    const result = {
      defended,
      attackerName: attacker.name,
      attackerTH: attacker.thLevel,
      goldLost,
      elixirLost,
      darkLost,
      defenseRate: Math.floor(finalDefenseRate * 100),
      time: Date.now()
    }
    
    npcInvasion.value.result = result
    npcInvasion.value.lastInvasionTime = Date.now()
    
    // 添加到历史记录
    npcInvasion.value.invasionHistory.unshift(result)
    if (npcInvasion.value.invasionHistory.length > 10) {
      npcInvasion.value.invasionHistory.pop()
    }
    
    // 入侵结束后，所有工人疲劳值略微恢复（工人被吓醒了）
    builders.value.forEach(b => {
      b.fatigue = Math.min(100, (b.fatigue ?? 0) + 10)
    })
    
    autoSave()
  }
  
  // 清除入侵结果（用户确认后）
  function clearInvasionResult() {
    npcInvasion.value.active = false
    npcInvasion.value.result = null
  }
  
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
      campaignProgress: campaignProgress.value,
      lastFatigueCheckTime: lastFatigueCheckTime.value,
      npcInvasion: {
        lastInvasionTime: npcInvasion.value.lastInvasionTime,
        invasionHistory: npcInvasion.value.invasionHistory
      },
      clanCastle: clanCastle.value,
      tutorialCompleted: tutorialCompleted.value,
      neighbors: neighbors.value,
      lastNeighborDriftTime: lastNeighborDriftTime.value,
      lastNeighborGrowTime: lastNeighborGrowTime.value,
      battleHistory: battleHistory.value,
      donationRequests: donationRequests.value
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
    airdefense: 4,
    wizardtower: 4,
    xbow: 2,
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
      builders.value = saveData.builders || [{ id: 1, busy: false, task: null, endTime: null, fatigue: 100 }]
      // 确保每个工人都有fatigue属性
      builders.value.forEach(b => {
        if (b.fatigue === undefined) b.fatigue = 100
      })
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
      lastFatigueCheckTime.value = saveData.lastFatigueCheckTime || Date.now()
      if (saveData.npcInvasion) {
        npcInvasion.value.lastInvasionTime = saveData.npcInvasion.lastInvasionTime
        npcInvasion.value.invasionHistory = saveData.npcInvasion.invasionHistory || []
      }
      if (saveData.clanCastle) {
        clanCastle.value = saveData.clanCastle
      }
      tutorialCompleted.value = saveData.tutorialCompleted || false
      if (saveData.neighbors) {
        // 合并存档数据，保留新增邻邦的默认值
        saveData.neighbors.forEach(savedNeighbor => {
          const neighbor = neighbors.value.find(n => n.id === savedNeighbor.id)
          if (neighbor) {
            neighbor.favor = savedNeighbor.favor
            neighbor.allied = savedNeighbor.allied
            neighbor.lastAidTime = savedNeighbor.lastAidTime
            neighbor.giftHistory = savedNeighbor.giftHistory || []
          }
        })
      }
      lastNeighborDriftTime.value = saveData.lastNeighborDriftTime || Date.now()
      lastNeighborGrowTime.value = saveData.lastNeighborGrowTime || Date.now()
      
      // 加载战斗历史
      if (saveData.battleHistory) {
        battleHistory.value = saveData.battleHistory
      }
      
      // 加载捐赠请求
      if (saveData.donationRequests) {
        donationRequests.value = saveData.donationRequests
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
    tutorialStep, tutorialCompleted,
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
    removeTree,
    builderFatigue,
    checkBuilderFatigue,
    restoreBuilderFatigue,
    npcInvasion,
    clearInvasionResult,
    clanCastle,
    clanCastleConfig,
    clanCastleCapacity,
    clanCastleCurrentPopulation,
    requestTroops,
    clearClanCastleTroops,
    removeClanCastleTroop,
    upgradeClanCastle,
    // 邻邦系统
    neighbors,
    neighborInvasion,
    neighborEvents,
    giftToNeighbor,
    proposeAlliance,
    requestNeighborAid,
    raidNeighbor,
    checkNeighborDrift,
    checkNeighborGrowth,
    updateNeighborStrength,
    calculateNeighborPower,
    resolveNeighborInvasion,
    // 消息系统
    messages,
    unreadMessageCount,
    addMessage,
    markMessageRead,
    markAllMessagesRead,
    clearMessages,
    // 战斗历史
    battleHistory,
    addBattleRecord,
    // 捐赠请求系统
    donationRequests,
    fulfillDonationRequest,
    rejectDonationRequest
  }
})
