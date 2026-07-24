# Supabase 备份与导出 Runbook（照做清单）

> 给运营 / 开发：云端出事故或要迁环境时，按下面步骤做。  
> 日常「某一款恢复到旧版本」请优先用管理后台 **备份** 分区（`pack_versions`），不必每次全库还原。

---

## 一、平时要开的自动备份（推荐）

### 1. 数据库（Postgres）

1. 打开 [Supabase Dashboard](https://supabase.com/dashboard) → 你的项目  
2. 左侧 **Project Settings（项目设置）→ Database**  
3. 找到 **Backups / Point-in-time recovery（备份 / 时间点恢复）**  
4. 确认当前套餐是否已开：
   - **Free**：通常只有有限的每日备份或无 PITR；重要数据请另做定期导出（见第三节）  
   - **Pro 及以上**：建议打开 **Point-in-time Recovery（PITR）**，可回到最近若干天内的某一时刻  

**白话：** 自动备份是「整库时光机」；管理后台的「备份」分区是「某一款的检查点」。两样都要。

### 2. 文件桶 `style-images`

Supabase Storage **不会**随数据库 PITR 一起完整回滚文件内容。  
因此：

- 删孤儿文件前务必先 **dry-run**（管理后台 → 存储）  
- 误删图片：用户需重新上传；工艺包表格/标注可用 `pack_versions` 恢复  

可选加固（有余力时）：

- 用 [Supabase CLI](https://supabase.com/docs/guides/cli) 或对象存储生命周期，定期把 `style-images` 同步到自家 S3 / 网盘  
- 或在定稿时鼓励用户本机「导出 JSON 备份」（我的项目页已有）

---

## 二、应用内恢复（优先）

| 场景 | 怎么做 |
|------|--------|
| 某一款被改坏 / 误定稿 | `/admin` → **备份** → 选工艺包 → **恢复到此** |
| 恢复前想留退路 | 点恢复时系统会先自动再存一个检查点（审计里有 `admin.pre_restore`） |
| 用户侧打开旧款 | 用户登录后「从云端拉取」或刷新工作室即可看到恢复后的稿 |
| 训练样本整理 | `/admin` → **训练** → 通过/拒绝 → **导出金标准包** |

相关审计动作（日志分区可搜）：

- `admin.packs.checkpoint` / `admin.packs.restore`  
- `admin.storage.orphans.dry_run` / `admin.storage.orphans.delete`  
- `admin.events.review` / `admin.events.export_gold`

---

## 三、整库手动导出（事故 / 迁环境）

### A. 表数据（SQL）

在 Dashboard → **SQL Editor** 可按需导出关键表（示例，按权限调整）：

```sql
-- 仅示例：导出工艺包元数据行数自检
select count(*) from tech_packs;
select count(*) from pack_versions;
select count(*) from ai_events where consent = true;
select count(*) from admin_audit_log;
```

更完整的逻辑备份：

1. Dashboard → **Database → Backups** → 下载最近备份（若套餐提供）  
2. 或用本地：`pg_dump`（需 Database 连接串，在 Project Settings → Database）

```bash
# 示例：把连接串换成你的（勿提交到 Git）
pg_dump "$DATABASE_URL" --format=custom --file=easytpack-$(date +%Y%m%d).dump
```

还原（仅在明确要覆盖时）：

```bash
pg_restore --clean --if-exists --no-owner -d "$DATABASE_URL" easytpack-YYYYMMDD.dump
```

### B. 关键表清单（至少备份这些）

| 表 | 用途 |
|----|------|
| `tech_packs` | 工艺包主数据 |
| `pack_versions` | 定稿/检查点快照 |
| `ai_events` | 训练/consent 事件（含审核字段） |
| `ai_usage` | AI 用量 |
| `profiles` / `referrals` | 邀请积分 |
| `user_entitlements` | 人工加赠 / 暂停 |
| `admin_audit_log` | 管理操作审计 |

Schema 源文件：仓库内 `supabase/schema.sql`（在 SQL Editor 整段执行可升级缺列/缺表）。

### C. Storage 文件

Dashboard → **Storage → style-images** → 按用户目录下载；或用 CLI / API 批量拉。  
路径约定：`{user_id}/{project_id}/…`

---

## 四、建议节奏

| 频率 | 动作 |
|------|------|
| 每次上线前 | 确认 Pro 备份/PITR 仍开启；Preview 环境变量齐全 |
| 每周 | `/admin` 看存储 Top；对可疑用户 dry-run 孤儿（先不删） |
| 重大变更前 | 管理端对关键款「从当前稿建检查点」；或本机导出 JSON |
| 误操作后 | 先 `pack_versions` 恢复单款；整库还原仅作最后手段 |

---

## 五、和 Vercel 预览的关系

- 测功能：打开 **`feat/phase2-cloud`（或本 PR 分支）的 Vercel Preview**  
- 改完 `schema.sql`：在 Supabase **SQL Editor 再跑一遍最新脚本**（`add column if not exists` 安全）  
- 环境变量：`SUPABASE_*`、`ADMIN_EMAILS`、`SUPABASE_SERVICE_ROLE_KEY` 勾选 **Preview** 后 **Redeploy**

更细的钥匙配置见 `docs/SUPABASE_SETUP.md`。
