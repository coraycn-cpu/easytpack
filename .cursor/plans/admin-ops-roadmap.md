# 管理后台运营计划（Admin Ops）

> 基于 `feat/phase2-cloud` 已连通的只读 `/admin`。  
> **原则：** 先服务日常运营可读可控；支付接口暂不做，先用「权益/档位」条件限制为以后 Stripe 留缝。

---

## 一、项目进度回顾

### 已完成（产品侧）

| 能力 | 状态 |
|------|------|
| 登录 / 注册、云端同步、自动/手动 | ✅ |
| 用户中心：用量、同步、邀请 | ✅ |
| 邀请积分：双方各 50，最多 6 人，上限 300 | ✅ |
| AI 月度额度：免费档 + 邀请积分，超额 429 | ✅ |
| Consent → `ai_events` | ✅ |
| 本机 JSON 备份导入/导出 | ✅ |
| 导出诚实提示（failed/placeholder） | ✅ |

### 已完成（管理侧 · 初版）

| 能力 | 状态 |
|------|------|
| `/admin` 邮箱白名单 + service role | ✅ |
| 总览数字：档案数、成功邀请、本月 AI 点、consent 事件 | ✅ |
| 最近 consent 事件 / 成功邀请列表 | ✅ |

### 明确暂缓

- Stripe / 支付收银台 / Webhook
- 真实多团队组织（共享款式库、成员权限）
- 向量库 / LoRA / 自动训练流水线

---

## 二、日常运营目标（后台要解决什么）

管理员应能在一个后台完成：

1. **用户**：谁在用、是否活跃、是否异常  
2. **档案**：积分、邀请码、档位/备注、是否暂停 AI  
3. **训练**：consent 事件筛选、抽检、导出干净样本  
4. **AI 额度**：查看已用/上限，人工加赠、重置口径、暂停调用  
5. **存储**：`style-images` 各用户占用，发现孤儿文件  
6. **备份**：项目版本快照可恢复（不仅本机 JSON）  
7. **支付条件**：无 Stripe 时也能用 `plan` / `entitlement` 限制功能；以后接支付只改「权益来源」

---

## 三、分阶段计划

### M1 — 运营可读（深读，少写）

**目标：** 后台从「四个数字」变成可日常巡查的控制台。

| 模块 | 交付 | 验收 |
|------|------|------|
| 用户 | `profiles` 列表：邮箱、积分、创建时间、本月 AI 用量、工艺包数；支持搜索 | 能按邮箱搜到 `test@qq.com` |
| 训练 | `ai_events` 筛选（consent/action/outcome/日期）+ JSONL/CSV 导出 | 只导出 consent=true 的干净集可选 |
| 存储 | 按用户统计 `style-images` 对象数/约计字节 | 能看出占用 Top 用户 |
| 配置 | 展示生效的免费额度、白名单是否配置、service role 是否就绪（不展示密钥） | 一眼看出环境是否配齐 |
| 日志 | 管理审计 + AI 用量/失败 + 邀请 + consent 聚合查看 | `/admin`「日志」分区可切换类型 |
| 导航 | `/admin` 分区：总览 / 用户 / 训练 / 存储 / 日志 / 配置 | 分区可点 |

**状态：✅ 已落地**

---

### M2 — 可控运营（人工写操作，无支付）

**目标：** 客服/运营能处理「加额度、停用、备注」，所有动作可审计。

**Schema（`user_entitlements`）：**

```text
plan: free | comped | paused     -- 档位；paused = 禁止 AI
ai_monthly_bonus: int            -- 人工加赠月额度（非邀请分）
notes: text
updated_at / updated_by
```

| 模块 | 交付 | 验收 |
|------|------|------|
| 额度 | 管理端给用户 +N 月额度；`getEffectiveAiLimit` = 免费 + 邀请 + bonus | 用户中心立刻看到新上限 |
| 暂停 | `plan=paused` → AI 路由硬拦 | 该用户调用返回明确文案 |
| 档案 | 改备注；写操作审计 | `admin_audit_log` 有 `admin.entitlement.update` |
| 审计 | 表 `admin_audit_log` | 每次写必落库 |

**支付条件限制（无 Stripe）：**

- `plan=comped` 表示内部赠送；团队入口仍 disabled  
- **不接** Checkout、Customer Portal、Webhook  

**状态：✅ 本轮落地（训练事件审核队列仍可后续补）**
### M3 — 可靠与资产（备份 / 存储治理 / 训练队列）

| 模块 | 交付 | 验收 |
|------|------|------|
| 备份 | 定稿/检查点写入 `pack_versions`；后台可恢复到 `tech_packs` | 恢复后用户能打开该款 |
| 存储 | 孤儿文件 dry-run → 确认删除；按用户清理 | 有审计、可回滚说明 |
| 训练 | 审核队列 + 金标准样本包导出 | 导出 manifest 含过滤条件 |
| 运维 | Supabase 自动备份 / 导出 runbook（文档） | 文档可照做 |

**状态：✅ 本轮落地**

- 云端同步在 `in_review` / `finalized` 时自动写版本（同 `updatedAt` 去重）
- `/admin` 新增「备份」分区；存储支持孤儿 dry-run/删除；训练支持审核与金标准导出
- 文档：`docs/SUPABASE_BACKUP_RUNBOOK.md`

## 四、额度公式（统一口径）

```text
月上限 = AI_FREE_MONTHLY_UNITS
       + min(profiles.points, 300)          -- 邀请积分
       + entitlements.ai_monthly_bonus      -- M2 人工加赠

若 plan = paused → 上限视为 0（或直接拒）
若将来付费 → 用 subscription_quota 替换/叠加 bonus，不改调用方
```

用户中心与管理后台必须显示同一拆分：免费 / 邀请 / 加赠 / 已用。

---

## 五、安全与实现约束

1. 所有跨用户读写只走 **service role**，且仅在 `requireAdminSession` 之后  
2. 写操作必须写 `admin_audit_log`  
3. 不把 service role / 完整用户 PII 无必要下发到前端  
4. `/admin` 继续邮箱白名单；M2 后再考虑 DB 角色表  
5. 本机模式（未登录）不受管理端暂停影响（保持可演示）

---

## 六、推荐执行顺序（立即）

1. ~~**先做 M1**~~ ✅  
2. ~~**再做 M2**~~ ✅  
3. ~~**最后 M3**~~ ✅：`pack_versions` 真用起来、存储清理、训练审核队列、备份 runbook  

对应代码落点：

- UI：`app/admin/page.tsx`（总览 / 用户 / 训练 / 备份 / 存储 / 日志 / 配置）  
- API：`app/api/admin/{users,events,packs,storage,logs,entitlements}/*`  
- 额度：`lib/ai/quota.ts` 读 entitlements  
- 版本：`lib/project/pack-versions.ts` + 云端同步挂钩  
- Schema：`supabase/schema.sql`  
- 运维文档：`docs/SUPABASE_BACKUP_RUNBOOK.md`

---

## 七、成功标准（运营可感）

- 管理员 1 分钟内能回答：有多少用户、谁最耗 AI、谁占存储多  
- 能导出一批 consent 训练事件给离线分析  
- 能给指定用户临时加额度或暂停，无需改环境变量、无需上支付  
- 出事故时有审计可追；项目有版本可恢复（M3）
