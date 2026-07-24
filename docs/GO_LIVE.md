# 第一个基础版 · 上线清单（照做）

> **结论：** 代码侧「第一个基础版」能力已齐（未登录本机做款 · 登录云同步 · AI 额度 · 邀请 · 导出 · 管理后台 M1–M3）。  
> **上线能不能成，取决于下面运维勾选**——不是还缺一大块功能。

**明确不做（首版不挡上线）：** 支付 Stripe、团队组织、公开分享链接、向量库 / LoRA、自动化测试。

---

## 〇、发布线说明（先搞清楚测哪个站）

| 分支 | 现在有什么 |
|------|------------|
| `main` | **旧站**：没有用户中心 / 云同步 / 管理后台（不要直接当正式站） |
| `feat/phase2-cloud` | 云端一期（到 M2） |
| `cursor/admin-m3-backup-restore-7a03`（PR #2） | 在上面 + **M3 备份/孤儿/训练审核** |

**建议发布顺序：**

1. 合并 PR #2 → `feat/phase2-cloud`  
2. 在 Preview 按本清单冒烟通过  
3. 再把 `feat/phase2-cloud` 合进正式发布线（如 `main`），或把正式域名指到含云端的部署  

---

## 一、Vercel 环境变量（Preview + Production 都要勾）

在 Vercel → 项目 → **Settings → Environment Variables**。改完必须 **Redeploy**。

| 名字 | 必填？ | 说明 |
|------|--------|------|
| `NEXT_PUBLIC_SUPABASE_URL` | ✅ | Supabase Project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | ✅ | anon 公钥 |
| `AI_GATEWAY_API_KEY` | ✅（要用 AI） | AI 网关钥匙 |
| `AI_PROVIDER` 等模型变量 | 建议 | 见 `.env.example` |
| `ADMIN_EMAILS` | 要用后台 | 如 `you@qq.com`（不要加引号） |
| `SUPABASE_SERVICE_ROLE_KEY` | 要用后台 | service_role（机密，勿进前端） |
| `AI_FREE_MONTHLY_UNITS` | 可选 | 默认 200 |

详细配钥匙步骤：`docs/SUPABASE_SETUP.md`。

---

## 二、Supabase（正式库也要做一遍）

- [ ] SQL Editor 整段执行最新 `supabase/schema.sql`  
- [ ] Storage 有私有桶 **`style-images`**  
- [ ] Authentication → Email 已开；测试期可关「必须验证邮箱」  
- [ ] URL Configuration：Site URL = 正式域名；Redirect URLs 含正式站 + `https://*.vercel.app/**`  
- [ ]（建议）按 `docs/SUPABASE_BACKUP_RUNBOOK.md` 看一眼自动备份是否开启  

---

## 三、产品能力验收（对照「第一个基础版」）

在 **含云端的 Preview / 正式站** 上勾：

### 用户侧

- [ ] 未登录：能新建款、画布**手动**标注、导出（本机保存）  
- [ ] 未登录点 AI / 同步存档 → 引导注册登录  
- [ ] 注册 / 登录成功；顶栏不是一直「本机模式」  
- [ ] 登录后保存或点同步 → `tech_packs` 有行；`style-images` 有图  
- [ ] 换无痕窗口登录同一账号 → 能打开旧款且图正常  
- [ ] 用户中心：用量（免费+邀请+加赠）、邀请链接、同步偏好  
- [ ] 邀请第二邮箱注册 → 双方各 +50（最多 6 人 / 上限 300）  
- [ ] AI 超额有提示；管理员暂停后返回明确文案  
- [ ] 导出：Excel / 打印 PDF；失败/占位图有红字提示  

### 管理侧（`/admin`，白名单邮箱）

- [ ] 总览 / 用户 / 训练 / 备份 / 存储 / 日志 / 配置 都能打开  
- [ ] 用户：加赠额度、paused，审计有记录  
- [ ] 备份：建检查点、恢复到版本  
- [ ] 训练：待审通过/拒绝；可导出金标准包  
- [ ] 存储：孤儿 dry-run（确认无误再删）  

更细路径：`docs/SMOKE_CHECKLIST.md`。

---

## 四、代码完成度速查（计划对照）

| 块 | 状态 |
|----|------|
| 本期 P0 生图诚实（失败不写假图） | ✅ 主路径已做（历史占位仍可能出现角标） |
| 本期 P0 本机存储 UX | ✅ |
| 本期 P1 导出可读 | ✅（PDF=浏览器打印，够用） |
| 本期 P1 合规可跳 | ✅ |
| 本期 P2 入口文案 + 冒烟清单 | ✅ |
| 本期 P2 studio 彻底拆分 | ⚠️ 可延后（不挡首发） |
| Phase2 登录/同步/额度/邀请 | ✅ |
| Admin M1 可读 | ✅ |
| Admin M2 加赠/暂停 | ✅ |
| Admin M3 备份/孤儿/审核 | ✅（在 PR #2） |
| Stripe / 团队 / LoRA | 明确暂缓 |

---

## 五、上线当天最短路径（白话）

1. 合并 M3 PR → 等 Vercel Preview 绿勾  
2. Production 环境变量勾齐 → Redeploy 正式部署  
3. 正式 Supabase 再跑一遍 `schema.sql` + 确认回调域名  
4. 用自己邮箱走一遍：注册 → 做款 → 同步 → 导出 → `/admin` 看一眼  
5. 没大问题再把正式域名流量切过去  

卡住时优先看：`docs/SUPABASE_SETUP.md`「常见问题」表。
