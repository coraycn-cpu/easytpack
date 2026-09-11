# PackFlow · Cursor 会话交接文档

> 写给下一期 Cursor / 云端助手（以及老板本人速览）。  
> 更新日期：2026-09-11  
> 代码主线：GitHub `main`（以最新合并为准）  
> 测法：**一律用 Vercel Preview**，不要默认本机 `npm run dev`。

---

## 1. 产品目标（一句话）

**PackFlow 服装工艺单 AI 智能画板**：用「图 + 标注 + 表格」沟通工艺包。  
图供参考，以标注与表格为准。可本机用；配好云端后可登录同步、邀请加分、管理后台运营。

品牌对外名：

- 全称：`PackFlow服装工艺单AI智能画板系统`（见 `lib/brand.ts`）
- 短名：`PackFlow`
- Logo：斜切两瓣蓝 P（左上尖角 + 右碗，对角缝），色值约 `#2E7FFF`；favicon 为黑底蓝标

---

## 2. 当前「第一个基础版」范围

### 已包含（代码侧基本齐，见 `docs/GO_LIVE.md`）

| 能力 | 说明 |
|------|------|
| 本机做款 | 未登录可手动标注、本机浏览器保存、导出 |
| 登录云同步 | Supabase 账号跨设备存档 |
| AI 辅助 | 需登录；有月度额度、超额提示 |
| 邀请加分 | 邀请好友双方加额度 |
| 导出 | Excel / 浏览器打印 PDF |
| 管理后台 `/admin` | 用户、额度加减/暂停、训练审核、备份、存储清理、日志 |
| 中/英切换 | 整站文案 + AI 输出语言（#25） |
| 文章库 `/articles` | 英文优先、中英同 URL；专题入口卡片互链（#26–#28） |
| 首页营销 | 功能介绍 / FAQ、页尾联系与试用说明、工艺包轮播等 |

### 明确不做（首版不挡上线）

- 支付收银台（Stripe 等）
- 团队 / 组织账号
- 公开分享链接产品化
- 向量库 / LoRA 微调
- 完整自动化测试套件

---

## 3. 技术选型（白话）

| 层 | 选型 | 备注 |
|----|------|------|
| 前端框架 | **Next.js 16**（App Router）+ React 19 | 以仓库内 `node_modules/next/dist/docs/` 为准，勿套旧版习惯 |
| 画布 | Konva / react-konva | 工艺标注主界面 |
| 云端数据库 / 登录 | **Supabase**（Postgres + Auth + Storage） | 桶名 `style-images`；表结构见 `supabase/schema.sql` |
| AI | 网关钥匙 `AI_GATEWAY_API_KEY` 等 | 配在 **Vercel → Environment Variables** |
| 部署 | **Vercel** | Preview 测功能；Production 勾齐变量后 Redeploy |
| 内容文章 | 代码内文案（非 CMS） | `lib/content/articles/` |
| 国际化 | 自建文案表 + 切换器 | `lib/i18n/`、`components/i18n/` |
| 导出 | ExcelJS 等 | 失败勿写假图 |

关键路径速查：

```
app/                 页面与 API
components/studio    画板相关 UI
components/brand     Logo / 页尾品牌
lib/brand.ts         品牌名常量
lib/content/articles 文章内容与专题
docs/GO_LIVE.md      上线勾选清单
docs/SUPABASE_SETUP.md
docs/SMOKE_CHECKLIST.md
```

分支命名习惯（本仓库云端助手）：`cursor/<简短英文描述>-e429`。

---

## 4. 近期已合入（便于对齐上下文）

以下 PR 均已进 `main`（编号供检索，细节以 GitHub 为准）：

| PR | 内容 |
|----|------|
| #16–#17 | 进站合并 / UI 优化；拖图左上不再被裁 |
| #18 | 云端 https 图给 AI 时的解析修复 |
| #19 | 图层列表显示工艺部位名 |
| #20–#21 | 首页联系 / 试用说明；功能介绍与 FAQ（SEO） |
| #22–#23 | 项目库按最近更新排序；拖图闪屏与列表性能 |
| #24 | 额度 50 / 邀请 +10；AI 确认可取消；首页轮播 |
| #25 | 整站中英切换（含 AI 语言） |
| #26–#28 | `/articles` 双语指南 + 专题入口互链 |
| #27 | PackFlow 视觉与 i18n 合并冲突处理 |
| #29–#30 | Logo / favicon：先错版后纠正为「斜切 P」附件 |

本会话相关 Agent：`https://cursor.com/agents/bc-3c462a1e-088f-484f-8368-78908372e429`（Packflow UI 完善）。

---

## 5. 未完成 / 易踩坑（交接重点）

### 运维勾选（比写功能更挡上线）

对照 `docs/GO_LIVE.md`，仍依赖人工确认：

1. Vercel **Preview + Production** 环境变量是否齐（Supabase URL/anon、AI 钥匙、`ADMIN_EMAILS`、`SUPABASE_SERVICE_ROLE_KEY` 等）  
2. 改变量后是否 **Redeploy**  
3. Supabase：最新 `schema.sql`、Storage 桶、登录回调域名含正式站 + `*.vercel.app`  
4. 用真实邮箱走一遍：注册 → 做款 → 同步 → 导出 → `/admin`

### 产品 / 工程尾巴

| 项 | 说明 |
|----|------|
| Studio 大文件拆分 | `GO_LIVE` 标为可延后，不挡首发 |
| 历史「占位图」角标 | 主路径已诚实失败；旧数据仍可能带占位提示 |
| Logo 像素级还原 | #30 已按「斜切 P」附件纠正；若与设计源文件仍有细差，需对照原 PNG 再调 SVG |
| 文章发现性 | 专题卡片已加；后续长尾文记得写入专题 `topics` 与 `relatedSlugs` |
| 本机 `.env.local` | 仅调试用；**验收以 Preview 为准** |

### 沟通约定（给助手）

- 对用户白话、少术语；做完附「今天做完了什么 / 下一步」  
- 规则文件：`.cursor/rules/plain-language-newbie.mdc`  
- Next 规则：`AGENTS.md` / `CLAUDE.md`（先读本仓库 Next 文档再改）

---

## 6. 建议下一步（按优先级）

1. **上线验收**：按 `docs/GO_LIVE.md` + `docs/SMOKE_CHECKLIST.md` 在 **Production / 最新 Preview** 勾完运维与冒烟。  
2. **品牌确认**：Preview 上看顶栏 Logo、浏览器标签页图标是否与最终附件一致；不一致再开小 PR 微调 SVG。  
3. **SEO 内容**：若继续扩文章，保持「速答 → 要点 → 目录 → 正文 → FAQ → CTA → 相关」结构，并挂到专题入口。  
4. **体验债（不挡首发）**：Studio 组件拆分、列表/画布性能继续观察。  
5. **商业化以后再说**：支付、团队空间、公开分享——等基础版跑稳再开题。

---

## 7. 下一期助手开场可用提示词（可直接粘贴）

```text
请先阅读 docs/CURSOR_HANDOFF.md 与 docs/GO_LIVE.md。
本仓库是 PackFlow（服装工艺单 AI 画板），Next.js 16 + Supabase + Vercel。
对用户用白话；验收一律用 Vercel Preview。
当前任务：……（填写具体需求）
```

---

## 8. 相关链接（仓库内）

| 文档 | 用途 |
|------|------|
| [GO_LIVE.md](./GO_LIVE.md) | 第一个基础版上线勾选 |
| [SUPABASE_SETUP.md](./SUPABASE_SETUP.md) | 云端钥匙与回调 |
| [SMOKE_CHECKLIST.md](./SMOKE_CHECKLIST.md) | 发版前手工冒烟 |
| [SUPABASE_BACKUP_RUNBOOK.md](./SUPABASE_BACKUP_RUNBOOK.md) | 备份 / 恢复 |
| [2026-07-31/PACKFLOW_UI_SYSTEM/…](./2026-07-31/PACKFLOW_UI_SYSTEM/PACKFLOW_UI_SYSTEM_DESIGN.md) | UI 系统设计参考 |

---

*本文仅作会话交接；若与 `main` 最新代码冲突，以代码与已合并 PR 为准，并请更新本节日期与 PR 列表。*
