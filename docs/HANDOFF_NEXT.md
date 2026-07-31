# 交接说明 · 下一期对话引用

> 用途：新开对话时把本文路径或全文贴给助手，即可接上本期进度。  
> 更新日期：2026-07-31  
> 产品仓库：`coraycn-cpu/easytpack`（Packflow / EasytPack）  
> 发布线：`main`（真实上线以 main 为准）  
> 测试方式：**只用 Vercel Preview**，不要默认要求本地 `npm run dev`

---

## 1. 本期已完成并已进 main

| PR | 内容 | 状态 |
|----|------|------|
| [#12](https://github.com/coraycn-cpu/easytpack/pull/12) | 画布 AI 物料/工艺/尺寸多图去重；尺码删行联动尺寸线；改数字同步标注文字 | **已合并** |
| [#13](https://github.com/coraycn-cpu/easytpack/pull/13) | 导出文案面向版师/客户；尺码「编辑/跳码」合并窗口；进入工作台加载；登录加载遮罩 | **已合并** |

相关更早已合：#7～#11（Preview 测试约定、首页登录引导、AI 额度、大图压缩等）。

当前 `main` 顶端大致为：`#13` → `#12` → `#11` …

---

## 2. 功能要点（下一期别重复做）

### 2.1 AI 多图去重（#12）

- 公共工具：[`lib/ai/merge-identity.ts`](../lib/ai/merge-identity.ts)  
  - `normalizePartKey` / `canonicalPartKey` / `bomIdentity` / `upsertBomItems` / `upsertProcessItems`
- 物料：正背面再跑 AI 时按「主面料/里料」等身份合并，只补空字段  
- 工艺：同部位 upsert；当前图画板已有同工艺点则跳过  
- 尺寸表/线：统一部位别名；尺寸线项目级去重后再画  
- 尺码删行：一次持久化（修双重写入）；删行删除对应尺寸线；改基准码数字同步 `Annotation.text`  
- 曾有「展开编辑」；后在 #13 与跳码合并（见下）

### 2.2 导出文案（#13）

- [`lib/export/client-facing-copy.ts`](../lib/export/client-facing-copy.ts)  
  - 过滤「用户上传了…需要分析」「初稿说明：已生成…」等过程话  
- 封面「款式说明」优先：手写描述 → 款名+品类+特征  
- 不再把一键生成进度写入 `style_review`（[`FullCollectFlowOverlay`](../components/studio/FullCollectFlowOverlay.tsx)）  
- 识图 `summary` 提示改为专业款式描述（[`lib/ai/intake.ts`](../lib/ai/intake.ts)）

### 2.3 尺码窗口合并（#13）

- 侧栏入口统一为 **「编辑 / 跳码」**  
- 大面板：[`components/studio/SizeChartExpandDialog.tsx`](../components/studio/SizeChartExpandDialog.tsx)  
  - 改数、删行、加减码列、按档差跳码同一窗口  
- [`SizeGradeDialog.tsx`](../components/studio/SizeGradeDialog.tsx) 仅为兼容 re-export，勿再套娃打开

### 2.4 加载提示（#13）

- 进入工作台：[`StudioBootOverlay`](../components/studio/StudioBootOverlay.tsx) + [`artboardImageLayoutKey`](../lib/studio/artboard-layout.ts)（多图显示进度）  
- 登录/注册：[`BusyOverlay`](../components/ui/BusyOverlay.tsx) + [`LoginClient`](../app/login/LoginClient.tsx)（成功跳转前保持「正在进入…」）  
- 顶栏：[`AuthHeaderControls`](../components/auth/AuthHeaderControls.tsx) 显示「检查登录…」

---

## 3. 明确暂不改（用户决定）

### 拖动款式图到左/上边缘被裁切

- **状态：暂不改**，用户要再测一段时间再说  
- **原因**：舞台包围盒在 [`lib/canvas/bounds.ts`](../lib/canvas/bounds.ts) 故意固定 `offsetX/Y = STUDIO_CONTENT_PAD`，不随负向 `minX/minY` 扩展；往左/上拖过原点会被 Konva Stage 裁掉  
- **另有**：`InfiniteCanvas` 的 `overflow-hidden`、左右侧栏 UI 遮挡  
- **说明文档线索**：工作台已是可平移缩放的无限画布；`1000×750` 是单板 AI 逻辑坐标（[`lib/canvas/constants.ts`](../lib/canvas/constants.ts)），不是整站死锁纸面  
- **若下期要修**：改 `computeStudioStageBounds` / `computeMultiStudioStageBounds`（向左上扩展时增大 offset/宽高，或拖动时自动平移视口），不要误做成「再换一套无限画布」

---

## 4. 沟通与协作约定（继续遵守）

- 用户是新手：回复白话；完成后写「今天做完了什么 / 下一步」  
- 测试以 **Vercel Preview** 为准；环境变量写 **Vercel → Environment Variables**  
- 小改动等用户说「推」再推；需要 Preview 验证的功能可推分支开 PR  
- 新功能分支命名：`cursor/<descriptive-name>-261f`，base 用 `main`  
- Next.js 有破坏性变更：写代码前先看 `node_modules/next/dist/docs/`（见 [`AGENTS.md`](../AGENTS.md)）

---

## 5. 建议下一期可开的话题（未立项）

按优先级仅供参考，**不要默认开工**，等用户点名：

1. **拖图左/上不被裁切**（见 §3）  
2. **进入工作台自动 fit 全部画板**（图看起来偏小时常被问到，成本低于改逻辑坐标）  
3. **额度历史展示**：旧「视角生图」行可能仍显示 -1，标签写「（5点）」易误解（#10 后新单应为 -5）  
4. **继续打磨导出封面**：旧项目里已脏的 `style_review` 是否在侧栏提示用户清空重生成  

---

## 6. 新对话可复制的开场白（示例）

```text
请先阅读 docs/HANDOFF_NEXT.md。
上一期 #12/#13 已合进 main：AI 多图去重、导出文案、尺码编辑/跳码合并、进入与登录加载都已完成。
拖图到左上被裁切暂不改。
本期我要做的是：……
请用 Vercel Preview 验证，分支命名 cursor/<name>-261f。
```

---

## 7. 关键文件速查

| 主题 | 路径 |
|------|------|
| BOM/工艺合并身份 | `lib/ai/merge-identity.ts` |
| 导出客户向文案 | `lib/export/client-facing-copy.ts` |
| 封面构建 | `lib/export/techpack-document.ts` |
| 尺码大面板 | `components/studio/SizeChartExpandDialog.tsx` |
| 尺码侧栏 | `components/studio/SizeChartEditor.tsx` / `StudioDataPanel.tsx` |
| 尺寸线删/同步 | `lib/canvas/size-annotations.ts` |
| 舞台包围盒（拖图裁切） | `lib/canvas/bounds.ts` |
| 无限工作台 | `components/studio/InfiniteCanvas.tsx` |
| 进入加载 | `components/studio/StudioBootOverlay.tsx` |
| 登录加载 | `components/ui/BusyOverlay.tsx` / `app/login/LoginClient.tsx` |
| 上线说明 | `docs/GO_LIVE.md` |
