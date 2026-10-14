# NEVERLAND · 致那个不想长大的自己

一个约 3 分钟的 3D 互动童话网站，灵感来自《彼得·潘》。情绪方向是治愈怀旧，美术是风格化低多边形。

> 你可以长大，但不必丢掉那个曾经相信魔法的自己。

## 体验流程

1. **卧室**：加班后的深夜。可以点点房间里的旧物，然后点击窗外的星星。
2. **飞行**：「右边第二颗星星，一直飞到天亮。」用鼠标控制方向，穿过星环时会响起音乐盒的音符。
3. **永无岛**：找回三件童年遗物（纸飞机、萤火虫罐子、旧小熊），每件回答一个问题。
4. **日出**：坐在岛东边的长椅上看日出，回顾刚才的答案。
5. **写信**：给小时候的自己写一句话，生成一张可以保存、分享的明信片。
6. **回家**：卧室里的钟重新开始走动，带回来的东西留在了房间里。

## 运行

```bash
npm install
npm run dev
```

打开 http://localhost:5173 。

开发时可以直接跳到某一幕：`?stage=bedroom | flight | island | sunrise | letter | home`

## 构建与部署

```bash
npm run build
```

产物在 `dist/`，是纯静态文件，可以直接部署到 Cloudflare Pages 或 Vercel。

## 技术

- React + Vite + TypeScript
- Three.js + React Three Fiber + drei，Bloom / Vignette 后期
- 所有模型都用代码生成，没有外部 3D 资源
- 声音全部由 Web Audio 实时合成（原创摇篮曲、铺底、风声、星环铃声），没有音频文件
- 明信片用 Canvas 绘制

## 文件结构

| 文件 | 内容 |
|---|---|
| `src/content.ts` | 全部文案、遗物与问题（改稿只改这里） |
| `src/store.ts` | 全局状态与每帧共享数据 |
| `src/audio.ts` | 程序化音乐与音效 |
| `src/postcard.ts` | 明信片绘制 |
| `src/scenes/Bedroom.tsx` | 开场卧室与结尾的清晨卧室 |
| `src/scenes/World.tsx` | 飞行、永无岛、日出 |
| `src/world/` | 天空、模型、地形、发光特效 |
| `src/ui/Overlay.tsx` | 开场、字幕、问题卡、写信、结尾 |

## 版权说明

《彼得·潘》原著是灵感来源。本作的角色、场景、音乐和文案都是原创，没有使用迪士尼等现代改编版本的视觉设计。
