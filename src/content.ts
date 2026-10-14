// 所有文案集中在这里，方便以后改稿。

export type ItemId = 'plane' | 'jar' | 'bear'

export interface MemoryItem {
  id: ItemId
  name: string
  found: string
  question: string
  options: string[]
  reflect: (answer: string) => string
  label: (answer: string) => string
  pos: [number, number] // 岛上的 x, z
}

export const ITEMS: MemoryItem[] = [
  {
    id: 'plane',
    name: '一只纸飞机',
    found: '你小时候折过很多纸飞机，每一只都想飞得比上一只更远。',
    question: '小时候，你最想成为什么样的人？',
    options: ['宇航员', '画家', '老师', '科学家', '开一家小店的人'],
    reflect: (a) => `你曾经想成为${a}。`,
    label: (a) => `想成为 · ${a}`,
    pos: [-6.5, 5],
  },
  {
    id: 'jar',
    name: '一罐萤火虫',
    found: '那年夏天的晚上，你把整片草地的光都装进了玻璃罐里。',
    question: '你记忆里最快乐的那个夏天，在做什么？',
    options: ['在外婆家过暑假', '和朋友在楼下疯跑', '吃着冰棍看动画片', '在河边抓小鱼', '趴在地上看蚂蚁搬家'],
    reflect: (a) => `你最快乐的那个夏天，是${a}。`,
    label: (a) => `那个夏天 · ${a}`,
    pos: [5.5, -5.5],
  },
  {
    id: 'bear',
    name: '一只旧小熊',
    found: '它的一只耳朵缝过两次。你说过，要永远和它做朋友。',
    question: '那时候，谁总是陪在你身边？',
    options: ['妈妈', '爸爸', '外婆和外公', '一个最好的朋友', '一只小狗'],
    reflect: (a) => `那时候，总有${a}陪在你身边。`,
    label: (a) => `陪着你的 · ${a}`,
    pos: [-2.2, -3.2],
  },
]

export const LINES = {
  introQuestion: '你上一次觉得自己还是个孩子，是什么时候？',
  bedroomWake: '又是一个加班到很晚的夜晚。',
  bedroomHint: '窗外有一颗星星，好像一直在等你。',
  bedroomStar: '今晚，你可以暂时不用做大人。',
  bedroomObjects: {
    clock: '这只钟很久以前就停了。你一直没有发现。',
    drawing: '一张旧画：一座房子，一个太阳，还有一个歪歪扭扭的你。',
    toybox: '盒子里装着你小时候最宝贝的东西。搬了好几次家，你都没舍得扔。',
    laptop: '邮件还没回完，明天还有很多事情要做。',
  } as Record<string, string>,
  flightStart: '右边第二颗星星，一直飞到天亮。',
  flightMid: '想一件快乐的事情，你就能飞起来。',
  flightEnd: '那就是永无岛。',
  islandArrive: '欢迎回来。这座岛上，藏着三件你弄丢的东西。',
  islandProgress: ['还有两件。它们一直在等你。', '最后一件了。'],
  islandDone: '天快亮了。去岛的东边坐一会儿吧。',
  sunriseOutro: '原来你并没有忘记，只是太久没有想起。',
  letterTitle: '亲爱的小时候的我，',
  homeClock: '钟，又开始走了。',
  ending: '长大不是童话的结束，而是学会自己创造魔法。',
  theme: '你可以长大，但不必丢掉那个曾经相信魔法的自己。',
}

export const HINTS: Partial<Record<string, string>> = {
  bedroom: '点击房间里的东西看看',
  flight: '移动鼠标控制方向 · 穿过星环',
  island: 'WASD / 方向键移动 · 或点击地面',
}

export const TOUCH_HINTS: Partial<Record<string, string>> = {
  bedroom: '左右滑动看看房间 · 点一点里面的东西',
  flight: '按住屏幕拖动控制方向 · 穿过星环',
  island: '点击地面走过去',
}
