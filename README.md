# EasytPack

沟通型工艺包：图供参考，以标注与表格为准。可本机使用；配好云端后可登录同步、邀请积分、管理后台运营。

## 文档（请从这里开始）

| 文档 | 干什么 |
|------|--------|
| [docs/GO_LIVE.md](./docs/GO_LIVE.md) | **第一个基础版上线清单**（先看这个） |
| [docs/SUPABASE_SETUP.md](./docs/SUPABASE_SETUP.md) | 云端钥匙、表、登录回调（Vercel 优先） |
| [docs/SMOKE_CHECKLIST.md](./docs/SMOKE_CHECKLIST.md) | 发版前手工冒烟 |
| [docs/SUPABASE_BACKUP_RUNBOOK.md](./docs/SUPABASE_BACKUP_RUNBOOK.md) | 数据库备份 / 恢复说明 |
| [`.env.example`](./.env.example) | 环境变量名一览 |

## 第一个基础版包含什么

- 未登录可本机**手动**做款、导出（本机浏览器保存）  
- **AI 与云端存档需注册/登录**  
- 登录后云端同步（跨设备）  
- AI 月度额度（免费 + 邀请 + 管理员加赠；可暂停）  
- 邀请好友双方加分  
- 管理后台：用户 / 训练审核 / 备份恢复 / 存储清理 / 日志  
- **不含：** 支付收银台、团队组织、模型微调  

## 本地开发（可选）

多数测试在 **Vercel Preview** 完成即可。若本机调试：

```bash
npm install
cp .env.example .env.local   # 填钥匙
npm run dev
```

打开 [http://localhost:3000](http://localhost:3000)。

## 发布分支提醒

云端能力（登录同步、额度邀请、管理后台等）**已在 `main`**。日常测 **Vercel Preview**；上线清单见 `docs/GO_LIVE.md`。
