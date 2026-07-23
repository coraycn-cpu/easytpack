# 云端账号准备（新手一步一步 · Vercel 优先）

目标：让 EasytPack「登录后把工艺包存到网上」，换电脑也能打开。  
**没配好之前，网站照常能用**——只是工艺包还存在「你当前浏览器」里。

> 你主要在 **Vercel** 上测试，下面按这个习惯写。本地一般不用开预览。

---

## 你需要准备的东西

1. 一个 [Supabase](https://supabase.com) 账号（免费档够测试）
2. 你的 Vercel 项目（已连着这个 GitHub 仓库）
3. 测试时请用分支 **`feat/phase2-cloud`** 的预览地址（不要拿正式版 `main` 混测）

---

## 第 1 步：新建云项目（Supabase 网站）

1. 打开 https://supabase.com → 登录  
2. 点 **New project**  
3. 起个名字，例如 `easytpack`  
4. 设一个数据库密码（自己记下来）  
5. 选一个离你近的地区 → **Create**  
6. 等一两分钟，项目准备好即可  

---

## 第 2 步：把两把「钥匙」填进 Vercel（最重要）

1. 在 Supabase 左侧点 **Project Settings**（齿轮）→ **API**  
2. 找到并复制：  
   - **Project URL**（类似 `https://xxxx.supabase.co`）  
   - **anon public** 密钥（很长一串）  
3. 打开 [Vercel](https://vercel.com) → 你的 **easytpack** 项目 → **Settings** → **Environment Variables**  
4. 确认（或新增）这两项，**名字必须一模一样**：  

| 名字 | 值从哪来 |
|------|----------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase 的 Project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase 的 anon / publishable 公钥 |

5. **环境范围**：若你用分支预览（Preview）测试，这两项务必勾上 **Preview**，不要只勾 Production。  
6. 改完变量后点一次 **Redeploy**（Deployments → 选中那次部署 → Redeploy），否则新钥匙不会进线上包。

Integrations 面板自动塞进来的 `POSTGRES_*`、`SUPABASE_JWT_SECRET`、`SUPABASE_SECRET_KEY` 等可以先留着，**当前登录功能用不到它们**；真正危险的是 Secret/密码类，不要贴到公开地方就行。

---

## 第 3 步：创建数据表 + 图片桶（在 Supabase 网页执行脚本）

1. Supabase 左侧点 **SQL Editor**  
2. 点 **New query**  
3. 打开本仓库文件：`supabase/schema.sql`（GitHub 上打开该文件也能复制）  
4. **全选复制** → 粘贴到 SQL 编辑器  
5. 点 **Run**  
6. 下方出现成功提示即可  

这一步会建好：工艺包表、版本表、AI 用量/事件表，以及图片存放桶 **`style-images`**（私有）和读写规则。

**自检：** 左侧 **Storage → Buckets** 应能看到 `style-images`。若没有：再跑一遍脚本；或在 Storage 界面新建同名私有桶后，只重跑脚本里 `storage.objects` 的几条 policy。

---

## 第 4 步：打开邮箱注册（方便测试登录）

1. Supabase 左侧 **Authentication** → **Providers** → **Email**  
2. 确认 Email 已开启  
3. 测试阶段建议关掉 **Confirm email**（否则要收邮件才能登录，麻烦）  

---

## 第 5 步：允许登录回调（很重要）

登录成功后网站要「接得住」回来的地址：

1. Supabase → **Authentication** → **URL Configuration**  
2. **Site URL** 可填正式站，例如 `https://你的域名.vercel.app`  
3. **Redirect URLs** 里加上预览站，例如：  
   - `https://*.vercel.app/**`  
   - 或 Vercel 给这次 Preview 的完整链接 + `/auth/callback`

若登录后跳回去却像没登上，多半是这里漏配了。

---

## 第 6 步：在 Vercel 预览上自检

- [ ] Vercel 里两行钥匙已填，且对 **Preview** 生效，并 Redeploy 过  
- [ ] Supabase 里 SQL 跑成功，Storage 有 `style-images`  
- [ ] 打开 **`feat/phase2-cloud`** 的 Preview 链接  
- [ ] 顶栏能看到「登录 / 注册」（没配好会显示「本机模式」）  
- [ ] 能注册 / 登录；未登录时仍能做工艺包  
- [ ] 登录后保存或点「同步到网上」→ Supabase **Table Editor → tech_packs** 有行  
- [ ] **Storage → style-images** 下有 `{用户id}/{项目id}/…` 图片  
- [ ] 换浏览器 / 无痕窗口登录同一账号 →「我的项目」能看到并打开（图能出来）

更细的路径见 `docs/SMOKE_CHECKLIST.md` 第 7 节。

---

## 常见问题（白话）

| 现象 | 怎么办 |
|------|--------|
| 顶栏一直是「本机模式」 | Vercel 变量名不对、只勾了 Production 却在 Preview 测、或填完没 Redeploy |
| 登录失败 / 跳转怪 | 检查第 5 步回调地址；测试期关掉「确认邮箱」 |
| SQL 报错 table already exists | 多半表已建过，可当成功 |
| 登录后列表是空的 | 点「我的项目」→「从云端拉取」或「双向同步」；确认另一台曾同步成功 |
| 打开旧款没图 | 再点一次「同步到网上」后重开；确认 Storage 里有对应文件、桶策略已建 |
| 同步失败黄字提示 | 本机稿还在；检查网络 / RLS / 桶是否存在后重试 |

---

## 和开发分支的关系

请在 **`feat/phase2-cloud`** 的 Vercel Preview 上测；正式站 `main` 先别急着合。
