# 云端账号准备（新手一步一步 · Vercel 优先）

目标：让 EasytPack 以后能「登录后把工艺包存到网上」，换电脑也能打开。  
**没配好之前，网站照常能用**——只是工艺包还存在「你当前浏览器」里，没有真正上云。

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

## 第 2 步：把两把「钥匙」填进 Vercel

1. 在 Supabase 左侧点 **Project Settings**（齿轮）→ **API**  
2. 找到并复制：  
   - **Project URL**（类似 `https://xxxx.supabase.co`）  
   - **anon public** 密钥（很长一串）  
3. 打开 [Vercel](https://vercel.com) → 你的 **easytpack** 项目 → **Settings** → **Environment Variables**  
4. 新增这两项（名字必须一模一样）：  

| 名字 | 值 |
|------|-----|
| `NEXT_PUBLIC_SUPABASE_URL` | 刚才的 Project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | 刚才的 anon 密钥 |

5. 勾选环境时建议：**Production / Preview / Development** 都勾上（至少勾 Preview，方便测分支）  
6. 保存后，需要让网站重新部署一次才生效：  
   - 可以在 Vercel → **Deployments** 里找到最新部署，点 **Redeploy**  
   - 或者等你下次推送代码自动部署  

> 可选：同页还有 **service_role**，现在先不要填到网页前端相关变量里；以后做管理后台再说。

---

## 第 3 步：创建数据表（在 Supabase 网页执行脚本）

1. Supabase 左侧点 **SQL Editor**  
2. 点 **New query**  
3. 打开本仓库文件：`supabase/schema.sql`（GitHub 网页也能打开复制）  
4. **全选复制** → 粘贴到 SQL 编辑器  
5. 点 **Run**  
6. 下方出现成功提示即可  

这一步会建好：工艺包表、版本表、AI 用量/事件表，以及图片存放规则（文件夹名 `style-images`）。

如果提示某条规则已存在，一般可以忽略；整段再 Run 一次通常也没事。

---

## 第 4 步：打开邮箱注册（方便测试登录）

1. Supabase 左侧 **Authentication** → **Providers** → **Email**  
2. 确认 Email 已开启  
3. 测试阶段建议关掉 **Confirm email**（否则要收邮件才能登录，麻烦）  

---

## 第 5 步：允许登录回调（很重要）

登录成功后网站要「接得住」回来的地址：

1. Supabase → **Authentication** → **URL Configuration**  
2. **Site URL** 先填你的正式站，例如 `https://你的域名.vercel.app`  
3. **Redirect URLs** 里加上（按你实际预览域名改）：  
   - `https://你的正式域名.vercel.app/**`  
   - `https://*-你的团队.vercel.app/**`（覆盖分支预览链接，若你的 Vercel 预览是这种格式）  
   - 或者把 Vercel 给的具体 Preview 链接也加进去  

若登录后跳回去却像没登上，多半是这里漏配了。

---

## 第 6 步：在 Vercel 上自检

- [ ] Vercel 环境变量两行都填了，并重新部署过  
- [ ] Supabase 里 SQL 跑成功  
- [ ] 打开 **分支预览链接**（`feat/phase2-cloud`）  
- [ ] 顶栏能看到「登录」（没配钥匙时会显示「本机模式」）  
- [ ] 能注册 / 登录；未登录时仍能做工艺包  

---

## 常见问题（白话）

| 现象 | 怎么办 |
|------|--------|
| 顶栏一直是「本机模式」 | Vercel 变量没填、名字写错，或填完没重新部署 |
| 登录失败 / 跳转怪 | 检查第 5 步 Redirect URLs；关掉 Confirm email 再试 |
| SQL 报错 table already exists | 多半表已建过，可当成功 |
| 登录后项目还是只有浏览器本地的 | 正常：真正「存到网上」还在后面几步 |

---

## 和开发分支的关系

请在 **`feat/phase2-cloud`** 的 Vercel 预览上测云端功能，正式版 `main` 先保持稳定。
