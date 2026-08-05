import type { ArticleRecord } from "@/lib/content/articles/types";
import { BRAND_SHORT_NAME } from "@/lib/brand";

const PUB = "2026-08-05";

/**
 * 第五批：衬衫/牛仔/T 恤 + 复板/色组/针梭织/拉链辅料/复单
 * 易收录结构；EN 优先，ZH 同步。
 */
export const SHIRT_DENIM_FIT_BATCH: ArticleRecord[] = [
  {
    slug: "shirt-tech-pack-guide",
    publishedAt: PUB,
    updatedAt: PUB,
    series: "howto",
    relatedSlugs: [
      "tee-tshirt-tech-pack-guide",
      "how-to-spec-zipper-trims",
      "how-to-write-construction-notes",
      "how-to-annotate-garment",
    ],
    en: {
      title: "How to make a shirt tech pack",
      description:
        "Shirt tech pack essentials: collar, placket, cuff, yoke, and POMs factories check first.",
      definition:
        "A shirt tech pack should show clear front/back flats, call out collar, placket, cuff, and pocket details, list shell and interlining on the BOM, and include POMs such as chest, length, sleeve, neck, and shoulder for the sample size.",
      audience: "Teams sampling woven dress shirts or casual shirts.",
      keyTakeaways: [
        "Call out collar stand/leaf, placket type, and cuff style",
        "BOM: shell, interlining, buttons, thread, labels",
        "POMs: chest, body length, sleeve, neck, shoulder, cuff opening",
        "State woven vs stretch woven if any elastane",
      ],
      sections: [
        {
          heading: "Must-annotate shirt areas",
          bullets: [
            "Collar construction (one-piece / two-piece)",
            "Front placket and button spacing",
            "Yoke and back pleat if any",
            "Cuff and sleeve placket",
            "Pocket shape and stitch",
          ],
        },
      ],
      steps: [
        {
          title: "Upload front and back flats",
          body: "Back view matters for yoke and pleats.",
        },
        {
          title: "Annotate collar, placket, cuff",
          body: "Link each callout to a short ops row.",
        },
        {
          title: "Fill BOM including interlining",
          body: "Collar and cuff often need fusible — list it.",
        },
        {
          title: "Fill sample POMs and neck size",
          body: "Neck is critical for dress shirts — method must be clear.",
        },
      ],
      faq: [
        {
          question: "Do I need a collar detail crop?",
          answer:
            "Yes when the collar is a design feature or uses special stays.",
        },
        {
          question: "How do I show button spacing?",
          answer:
            "Note count and spacing from the top button; mark on the placket callout.",
        },
        {
          question: "Can PackFlow build shirt packs?",
          answer: `${BRAND_SHORT_NAME} supports multi-view annotation, BOM, size, and export for shirts.`,
        },
      ],
      ctaLabel: "Start a shirt pack in PackFlow",
    },
    zh: {
      title: "衬衫工艺包怎么做？",
      description:
        "衬衫要点：领、门襟、袖头、育克，以及工厂常看的尺寸点。",
      definition:
        "衬衫工艺包应有清晰正背面平铺，标出领、门襟、袖头与口袋，BOM 含面料与粘衬，尺码含胸围、衣长、袖长、领围、肩宽等基准码 POM。",
      audience: "打正装或休闲梭织衬衫样的团队。",
      keyTakeaways: [
        "标清领座/领面、门襟类型、袖头款式",
        "BOM：面料、粘衬、纽扣、线、唛头",
        "POM：胸围、衣长、袖长、领围、肩宽、袖口",
        "有弹力梭织要写明",
      ],
      sections: [
        {
          heading: "必须标到的区域",
          bullets: [
            "领型结构（一片领 / 两片领）",
            "门襟与纽扣间距",
            "育克与后背褶（如有）",
            "袖头与袖开叉",
            "口袋形状与线迹",
          ],
        },
      ],
      steps: [
        {
          title: "上传正背面平铺",
          body: "背面看育克与褶最重要。",
        },
        {
          title: "标注领、门襟、袖头",
          body: "引出对应短工艺行。",
        },
        {
          title: "填 BOM（含粘衬）",
          body: "领、袖头常用粘衬——别漏。",
        },
        {
          title: "填基准码 POM 与领围",
          body: "正装衬衫领围量法必须写清。",
        },
      ],
      faq: [
        {
          question: "要领部特写吗？",
          answer: "领是卖点或有特殊骨时建议有。",
        },
        {
          question: "纽扣间距怎么写？",
          answer: "写颗数与从上往下间距，并在门襟引出标明。",
        },
        {
          question: "PackFlow 能做衬衫吗？",
          answer: `${BRAND_SHORT_NAME} 支持多视角标注、物料、尺码与导出。`,
        },
      ],
      ctaLabel: "在 PackFlow 做衬衫工艺包",
    },
  },
  {
    slug: "denim-jeans-tech-pack",
    publishedAt: PUB,
    updatedAt: PUB,
    series: "howto",
    relatedSlugs: [
      "pants-size-chart-pom",
      "how-to-write-construction-notes",
      "print-embroidery-tech-pack",
      "how-to-handle-fit-comments",
    ],
    en: {
      title: "How to make a jeans / denim tech pack",
      description:
        "Denim tech pack tips: wash, hardware, stitch, pocket bags, and critical pant POMs.",
      definition:
        "A jeans tech pack should document silhouette and wash intent, call out rivets/buttons/zip, list denim and pocketing on the BOM, and include POMs such as waist, hip, thigh, inseam, and leg opening for the sample size.",
      audience: "Teams sampling denim jeans or denim jackets (bottoms focus).",
      keyTakeaways: [
        "Describe wash / distress level in plain language",
        "Hardware: button, rivet, zipper brand/spec if locked",
        "BOM: denim, pocketing, thread, leather patch",
        "POMs: waist, hip, thigh, knee, inseam, opening",
      ],
      sections: [
        {
          heading: "Denim-specific callouts",
          bullets: [
            "Front pocket and coin pocket",
            "Back pocket stitch design",
            "Belt loop count and width",
            "Hem finish (chainstitch, clean finish)",
            "Wash references (photo or approved standard)",
          ],
        },
      ],
      steps: [
        {
          title: "Upload front/back flats of the fit",
          body: "Side view helps for rise and thigh.",
        },
        {
          title: "Annotate pockets, hardware, hem",
          body: "Back pocket design often needs a detail crop.",
        },
        {
          title: "Fill denim BOM and wash note",
          body: "Weight (oz) and stretch % when known; else TBD.",
        },
        {
          title: "Lock sample pant POMs",
          body: "Rise and thigh drive most fit comments — measure carefully.",
        },
      ],
      faq: [
        {
          question: "Do I need a physical wash standard?",
          answer:
            "Best practice yes for bulk. For first sample, photos + descriptors may start — then lock a standard.",
        },
        {
          question: "How do I spec stretch denim?",
          answer:
            "List elastane %, recovery note if any, and whether POMs are relaxed garment measures.",
        },
        {
          question: "Can PackFlow handle denim packs?",
          answer: `Yes — use ${BRAND_SHORT_NAME} for views, callouts, BOM, size, and export.`,
        },
      ],
      ctaLabel: "Start a denim pack in PackFlow",
    },
    zh: {
      title: "牛仔裤 / 丹宁工艺包怎么做？",
      description:
        "丹宁要点：水洗、五金、线迹、袋布，以及裤装关键 POM。",
      definition:
        "牛仔裤工艺包要写清廓形与水洗意向，标出撞钉/纽扣/拉链，BOM 含丹宁与袋布等，尺码含腰围、臀围、大腿、内长、脚口等基准码 POM。",
      audience: "打牛仔裤或丹宁下装样的团队。",
      keyTakeaways: [
        "用水白话写水洗 / 做旧程度",
        "五金：纽扣、撞钉、拉链规格（锁定时）",
        "BOM：丹宁、袋布、线、皮牌",
        "POM：腰、臀、大腿、膝、内长、脚口",
      ],
      sections: [
        {
          heading: "丹宁专项引出",
          bullets: [
            "前袋与表袋",
            "后袋线迹花样",
            "裤耳数量与宽度",
            "脚口收法（链式、光边等）",
            "水洗参照（照片或确认标样）",
          ],
        },
      ],
      steps: [
        {
          title: "上传合身廓形的正背面平铺",
          body: "侧面有助于看前浪与大腿。",
        },
        {
          title: "标注口袋、五金、脚口",
          body: "后袋花样常需细节图。",
        },
        {
          title: "填丹宁 BOM 与水洗说明",
          body: "已知写 oz 与弹力%；未知标 TBD。",
        },
        {
          title: "锁定样裤 POM",
          body: "前浪与大腿最易被改——量准。",
        },
      ],
      faq: [
        {
          question: "一定要实物水洗标样吗？",
          answer: "大货最好有。头版可用照片+描述起步，再锁定标样。",
        },
        {
          question: "弹力丹宁怎么写？",
          answer: "写氨纶比例、回复要求（如有），并说明 POM 是否松量成衣寸。",
        },
        {
          question: "PackFlow 适合丹宁吗？",
          answer: `适合 — 用 ${BRAND_SHORT_NAME} 做视角、引出、物料、尺码与导出。`,
        },
      ],
      ctaLabel: "在 PackFlow 做丹宁工艺包",
    },
  },
  {
    slug: "tee-tshirt-tech-pack-guide",
    publishedAt: PUB,
    updatedAt: PUB,
    series: "howto",
    relatedSlugs: [
      "shirt-tech-pack-guide",
      "print-embroidery-tech-pack",
      "how-to-make-tech-pack",
      "knit-vs-woven-tech-pack",
    ],
    en: {
      title: "How to make a T-shirt tech pack",
      description:
        "Simple tee packs done right: neck, sleeve, hem, fabric gsm, and print placement if any.",
      definition:
        "A T-shirt tech pack should show a clear front (and back if printed), note neck and hem construction, list jersey gsm and trims on the BOM, and include POMs such as chest, body length, and sleeve for the sample size.",
      audience: "Brands and freelancers sampling basic or graphic tees.",
      keyTakeaways: [
        "State knit type and gsm when known",
        "Neck: rib height / binding width",
        "Print/embroidery needs placement + art files",
        "POMs: chest, length, sleeve — keep methods short",
      ],
      sections: [
        {
          heading: "Even simple tees need clarity",
          bullets: [
            "Crew / V / scoop neck details",
            "Sleeve hem vs cuff rib",
            "Side seam or tubular",
            "Label position",
          ],
        },
      ],
      steps: [
        {
          title: "Upload a front flat or clean product photo",
          body: "Add back when artwork sits there.",
        },
        {
          title: "Annotate neck and hem",
          body: "Two short callouts prevent most tee disputes.",
        },
        {
          title: "Fill jersey BOM + optional print rows",
          body: "Link artwork if graphic.",
        },
        {
          title: "Fill sample chest and length",
          body: "These two POMs drive most basic-tee fit talks.",
        },
      ],
      faq: [
        {
          question: "Is one photo enough?",
          answer:
            "For a blank tee, often yes. Graphics need placement views.",
        },
        {
          question: "How do I spec shrinkage?",
          answer:
            "Note expected wash shrink % if the factory asks; otherwise discuss after first sample.",
        },
        {
          question: "Can PackFlow do tee packs quickly?",
          answer: `${BRAND_SHORT_NAME} is built for fast annotation + tables + export, including simple tees.`,
        },
      ],
      ctaLabel: "Start a tee pack in PackFlow",
    },
    zh: {
      title: "T 恤工艺包怎么做？",
      description:
        "基础 T 也要写清：领、袖、下摆、克重，以及印花位置（如有）。",
      definition:
        "T 恤工艺包应有清晰正面（有印花则补背面），写明领与下摆做法，BOM 含汗布克重与辅料，尺码含胸围、衣长、袖长等基准码 POM。",
      audience: "打素 Tee 或印花 Tee 的品牌与自由设计师。",
      keyTakeaways: [
        "已知则写针织类型与克重",
        "领：罗纹高 / 包边宽",
        "印绣花要位置 + 图稿",
        "POM：胸围、衣长、袖长——量法写短",
      ],
      sections: [
        {
          heading: "再简单也要写清的点",
          bullets: [
            "圆领 / V 领 / 挖领细节",
            "袖口光边还是罗纹",
            "有侧缝还是圆筒",
            "唛头位置",
          ],
        },
      ],
      steps: [
        {
          title: "上传正面平铺或干净产品图",
          body: "背面有图案就补背面。",
        },
        {
          title: "标注领与下摆",
          body: "两条短引出能挡掉多数争议。",
        },
        {
          title: "填汗布 BOM + 可选印花行",
          body: "有图案就关联图稿。",
        },
        {
          title: "填基准码胸围与衣长",
          body: "基础 T 合身讨论多半看这两项。",
        },
      ],
      faq: [
        {
          question: "一张图够吗？",
          answer: "素 Tee 常常够。有图案要补位置图。",
        },
        {
          question: "缩水怎么写？",
          answer: "工厂若问，可写预估洗后缩率；否则头版后再谈。",
        },
        {
          question: "PackFlow 能快速做 T 吗？",
          answer: `${BRAND_SHORT_NAME} 适合快速标注、填表与导出，含基础 T。`,
        },
      ],
      ctaLabel: "在 PackFlow 做 T 恤工艺包",
    },
  },
  {
    slug: "how-to-handle-fit-comments",
    publishedAt: PUB,
    updatedAt: PUB,
    series: "howto",
    relatedSlugs: [
      "tech-pack-revision-control",
      "how-to-grade-size-chart",
      "common-factory-tech-pack-questions",
      "denim-jeans-tech-pack",
    ],
    en: {
      title: "How to handle fit comments and update a tech pack",
      description:
        "Turn sample fit comments into dated pack revisions — what to change on drawings, POMs, and ops.",
      definition:
        "To handle apparel fit comments: capture each comment clearly, decide drawing vs POM vs construction changes, update the master tech pack with a new revision date, and resend so the factory does not sew from the old PDF.",
      audience: "Merchandisers and designers after first sample try-on.",
      keyTakeaways: [
        "Log comments as numbered items",
        "Map each item to image, POM, or ops",
        "Bump revision — never chat-only fixes",
        "Reconfirm sample size after big fit moves",
      ],
      sections: [
        {
          heading: "Typical fit comment types",
          bullets: [
            "Too tight / loose at a POM",
            "Length change",
            "Pocket or design-line move",
            "Construction feel (bulk at seam)",
          ],
        },
      ],
      steps: [
        {
          title: "Write a numbered comment list",
          body: "One idea per line with before → after when possible.",
        },
        {
          title: "Update the master pack",
          body: "Change size lines, callouts, or ops rows to match.",
        },
        {
          title: "Stamp a new revision",
          body: "Filename + cover date; list what changed.",
        },
        {
          title: "Resend and name the superseded file",
          body: "Ask the factory to archive the previous PDF.",
        },
      ],
      faq: [
        {
          question: "Should I regrade all sizes after a fit change?",
          answer:
            "If only the sample was wrong, fix the base first; regrade after the next sample passes.",
        },
        {
          question: "Photos of the fitting?",
          answer:
            "Helpful attachments — still update the pack numbers and drawings.",
        },
        {
          question: "How does PackFlow help refits?",
          answer: `${BRAND_SHORT_NAME} keeps one project you edit and re-export after each fitting round.`,
        },
      ],
      ctaLabel: "Update the pack in PackFlow",
    },
    zh: {
      title: "样衣合身意见怎么改回工艺包？",
      description:
        "把复板意见变成带日期的新版本：改图、改 POM 还是改工艺，怎么发给工厂。",
      definition:
        "处理合身意见：把每条意见写清，判断改图、改尺码还是改工艺，更新主工艺包并改版次日期，再重发，避免工厂仍按旧 PDF 做。",
      audience: "头版试穿后的跟单与设计。",
      keyTakeaways: [
        "意见做成编号清单",
        "每条对应到图 / POM / 工艺",
        "升版重发 — 不要只在聊天改",
        "大幅改合身后重新确认基准码",
      ],
      sections: [
        {
          heading: "常见意见类型",
          bullets: [
            "某 POM 紧 / 松",
            "长度调整",
            "口袋或设计线位移",
            "结构手感（缝口过厚等）",
          ],
        },
      ],
      steps: [
        {
          title: "写编号意见清单",
          body: "一行一个点，尽量写清改前 → 改后。",
        },
        {
          title: "改主工艺包",
          body: "同步改尺寸线、引出或工艺行。",
        },
        {
          title: "盖新版日期",
          body: "文件名 + 封面日期；列出变更。",
        },
        {
          title: "重发并作废旧文件",
          body: "请工厂归档上一份 PDF。",
        },
      ],
      faq: [
        {
          question: "改合身后要不要立刻全码跳码？",
          answer: "若只是样衣不准，先修基准码；下一版通过后再跳码。",
        },
        {
          question: "要附试穿照片吗？",
          answer: "有帮助 — 但仍要改包里的数字与图面。",
        },
        {
          question: "PackFlow 怎么辅助复板？",
          answer: `${BRAND_SHORT_NAME} 用同一项目改完再导出，适合每一轮合身。`,
        },
      ],
      ctaLabel: "在 PackFlow 更新工艺包",
    },
  },
  {
    slug: "colorway-lab-dip-tech-pack",
    publishedAt: PUB,
    updatedAt: PUB,
    series: "howto",
    relatedSlugs: [
      "how-to-write-garment-bom",
      "tech-pack-revision-control",
      "for-merchandisers",
      "how-to-send-tech-pack-to-factory",
    ],
    en: {
      title: "How to manage colorways and lab dips in a tech pack",
      description:
        "Colorways, pantone/lab dips, and BOM color columns — keep sampling colors aligned with the pack.",
      definition:
        "To manage colorways in a tech pack: name each colorway, reference pantone or approved lab dips on the BOM, show color on views when helpful, and revise the pack when a dip is approved or rejected.",
      audience: "Merchandisers running multi-color sampling.",
      keyTakeaways: [
        "One colorway name used everywhere",
        "BOM color column cites pantone or dip code",
        "Approve/reject dips in writing with dates",
        "Update pack revision when color locks",
      ],
      sections: [
        {
          heading: "What to put in the pack",
          bullets: [
            "Colorway list (e.g. Black, Ivory, Red-01)",
            "BOM rows with color refs per material",
            "Trim colors that must match or contrast",
            "Print color separations if relevant",
          ],
        },
      ],
      steps: [
        {
          title: "Name colorways once",
          body: "Avoid renaming mid-season without a revision note.",
        },
        {
          title: "Link BOM colors to standards",
          body: "Pantone, lab dip ID, or approved fabric swatch code.",
        },
        {
          title: "Track dip status",
          body: "Pending / approved / rejected — date each decision.",
        },
        {
          title: "Revise the pack when color locks",
          body: "Factories should not guess from chat photos alone.",
        },
      ],
      faq: [
        {
          question: "Do I need a pack per colorway?",
          answer:
            "Often one pack with a colorway table is enough; split only when construction differs.",
        },
        {
          question: "Screen photos as color approval?",
          answer:
            "Risky. Prefer physical dips or controlled digital standards your factory accepts.",
        },
        {
          question: "How does PackFlow help?",
          answer: `${BRAND_SHORT_NAME} keeps BOM color fields with the same style project you revise after approvals.`,
        },
      ],
      ctaLabel: "Manage color in PackFlow BOM",
    },
    zh: {
      title: "工艺包里色组 / 色样（Lab Dip）怎么管？",
      description:
        "色组命名、潘通/确认色样与 BOM 颜色列——让打样颜色与工艺包一致。",
      definition:
        "管理色组：为每个色组命名，在 BOM 引用潘通或确认 lab dip，需要时在图上示意颜色，色样通过或驳回后升级工艺包版本。",
      audience: "多色打样的跟单。",
      keyTakeaways: [
        "色组名全局统一",
        "BOM 颜色列写潘通或色样编号",
        "色样通过/驳回书面记录日期",
        "颜色锁定后改工艺包版次",
      ],
      sections: [
        {
          heading: "包里要有什么",
          bullets: [
            "色组列表（如 Black、Ivory、Red-01）",
            "各物料的颜色依据",
            "需同色或撞色的辅料",
            "相关时的印花分色",
          ],
        },
      ],
      steps: [
        {
          title: "一次性定好色组名",
          body: "季中改名要写变更说明。",
        },
        {
          title: "BOM 颜色对齐标准",
          body: "潘通、lab dip 编号或确认布号。",
        },
        {
          title: "跟踪色样状态",
          body: "待确认 / 通过 / 驳回 — 每次写日期。",
        },
        {
          title: "颜色锁定后升版工艺包",
          body: "别让工厂只凭聊天照片猜色。",
        },
      ],
      faq: [
        {
          question: "每个色组一份工艺包吗？",
          answer: "多数一份包装一张色组表即可；结构不同再拆包。",
        },
        {
          question: "手机拍照能当批色吗？",
          answer: "风险大。尽量用实物色样或工厂认可的标准。",
        },
        {
          question: "PackFlow 怎么帮？",
          answer: `${BRAND_SHORT_NAME} 在同一款项目里维护 BOM 颜色，确认后改版再导出。`,
        },
      ],
      ctaLabel: "在 PackFlow BOM 管颜色",
    },
  },
  {
    slug: "knit-vs-woven-tech-pack",
    publishedAt: PUB,
    updatedAt: PUB,
    series: "fundamentals",
    relatedSlugs: [
      "tee-tshirt-tech-pack-guide",
      "shirt-tech-pack-guide",
      "size-chart-basics",
      "what-is-bom-apparel",
    ],
    en: {
      title: "Knit vs woven: what changes in a tech pack?",
      description:
        "How knit and woven garments differ in BOM, construction notes, and POM methods inside a tech pack.",
      definition:
        "Knit and woven tech packs share the same structure (views, BOM, ops, sizes), but knits need gsm/stretch and recovery notes while wovens need weave/weight and often interlining — POM methods and seam types also differ.",
      audience: "Teams switching between jersey and woven categories.",
      keyTakeaways: [
        "Always state fabric category on the BOM",
        "Knits: gsm, stretch, recovery, shrink talk",
        "Wovens: weave, weight, fusible/interlining",
        "Seam and stitch language must match the fabric",
      ],
      sections: [
        {
          heading: "BOM differences",
          bullets: [
            "Knit: jersey/fleece + rib + optional elastics",
            "Woven: shell + lining + interlining + closures",
          ],
        },
        {
          heading: "Size chart differences",
          paragraphs: [
            "Knit POMs are often relaxed garment measures; note stretch. Woven dress shirts may need neck and cuff openings specified tightly.",
          ],
        },
      ],
      faq: [
        {
          question: "Can one template cover both?",
          answer:
            "Yes at structure level. Swap the fabric and ops vocabulary per category.",
        },
        {
          question: "What about knit-woven mixes?",
          answer:
            "Label each panel’s fabric on the BOM and call out joins that mix stretch with stable fabric.",
        },
        {
          question: "Does PackFlow care knit vs woven?",
          answer: `${BRAND_SHORT_NAME} is category-agnostic — you choose the right callouts, BOM rows, and POMs.`,
        },
      ],
      ctaLabel: "Build either type in PackFlow",
    },
    zh: {
      title: "针织 vs 梭织：工艺包要改什么？",
      description:
        "针织与梭织在 BOM、工艺说明与 POM 量法上的差别——结构相同，细节不同。",
      definition:
        "针织与梭织工艺包结构相同（图、BOM、工艺、尺码），但针织要写克重/弹力与回复，梭织要写组织/克重且常有粘衬——POM 量法与缝型也不同。",
      audience: "在卫衣 T 与衬衫外套之间切换的团队。",
      keyTakeaways: [
        "BOM 写明面料大类",
        "针织：克重、弹力、回复、缩水",
        "梭织：组织、克重、粘衬",
        "针法缝型要匹配面料",
      ],
      sections: [
        {
          heading: "BOM 差异",
          bullets: [
            "针织：汗布/抓绒 + 罗纹 + 可选松紧",
            "梭织：面料 + 里料 + 粘衬 + 门襟五金",
          ],
        },
        {
          heading: "尺码表差异",
          paragraphs: [
            "针织 POM 多为成衣松量，需注明弹力。梭织正装衬衫对领围、袖口要求更严。",
          ],
        },
      ],
      faq: [
        {
          question: "一套模板都能用吗？",
          answer: "结构可以共用。按品类换面料与工艺用语。",
        },
        {
          question: "针梭拼接呢？",
          answer: "BOM 按裁片标面料，并标出弹力与稳定面料的接合。",
        },
        {
          question: "PackFlow 区分针梭织吗？",
          answer: `${BRAND_SHORT_NAME} 不限品类 — 由你选对引出、BOM 与 POM。`,
        },
      ],
      ctaLabel: "在 PackFlow 做任一品类",
    },
  },
  {
    slug: "how-to-spec-zipper-trims",
    publishedAt: PUB,
    updatedAt: PUB,
    series: "howto",
    relatedSlugs: [
      "how-to-write-garment-bom",
      "jacket-tech-pack-guide",
      "how-to-write-construction-notes",
      "shirt-tech-pack-guide",
    ],
    en: {
      title: "How to spec zippers and trims in a tech pack",
      description:
        "Zipper length, type, puller, and matching trims — what to write on BOM and callouts.",
      definition:
        "To spec zippers and trims in a tech pack: name the trim on the BOM with type/size/color, show placement on the drawing, and note critical details (separating vs closed zipper, puller shape, logo) so purchasing and sewing match.",
      audience: "Anyone whose samples fail on hardware or trim mismatch.",
      keyTakeaways: [
        "Zipper: type, length, teeth, puller, separating or not",
        "Buttons: size, material, hole count, spacing",
        "One BOM row per purchasable trim",
        "Call out placement when position is design-critical",
      ],
      sections: [
        {
          heading: "Zipper fields that matter",
          bullets: [
            "Closed-end vs separating",
            "Coil / metal / molded",
            "Length in cm",
            "Puller style and finish",
            "Color match to shell or contrast",
          ],
        },
      ],
      steps: [
        {
          title: "List every trim from the drawing",
          body: "Zipper, snaps, buttons, elastic, cord, labels.",
        },
        {
          title: "Fill BOM specs",
          body: "Prefer measurable specs over brand-only names unless locked.",
        },
        {
          title: "Annotate placement when needed",
          body: "Pocket zippers and exposed zips need clear callouts.",
        },
        {
          title: "Confirm with purchasing",
          body: "If a brand is locked, write it; else allow equivalents in writing.",
        },
      ],
      faq: [
        {
          question: "What if the factory substitutes the zipper?",
          answer:
            "State “no substitute” or list approved alternates in the pack.",
        },
        {
          question: "Puller sold separately?",
          answer:
            "If purchased apart, give it its own BOM row.",
        },
        {
          question: "Can PackFlow track trims?",
          answer: `${BRAND_SHORT_NAME} BOM categories cover trims beside the canvas callouts.`,
        },
      ],
      ctaLabel: "Spec trims in PackFlow",
    },
    zh: {
      title: "工艺包里拉链和辅料怎么写规格？",
      description:
        "拉链长度与类型、拉片、纽扣与松紧——BOM 与引出要写清什么。",
      definition:
        "写拉链与辅料：在 BOM 写名称、类型、尺寸、颜色，在图上标位置，并注明开尾/闭尾、拉片形状、logo 等关键点，让采购与车缝一致。",
      audience: "曾因五金/辅料不符导致复板的人。",
      keyTakeaways: [
        "拉链：类型、长度、牙、拉片、是否开尾",
        "纽扣：尺寸、材质、孔数、间距",
        "每个可采购辅料单独一行",
        "位置影响设计时要引出",
      ],
      sections: [
        {
          heading: "拉链关键字段",
          bullets: [
            "闭尾还是开尾",
            "尼龙牙 / 金属 / 树脂",
            "长度（cm）",
            "拉片样式与表面处理",
            "与主身同色还是撞色",
          ],
        },
      ],
      steps: [
        {
          title: "按图列出全部辅料",
          body: "拉链、四合扣、纽扣、松紧、绳、唛头。",
        },
        {
          title: "填 BOM 规格",
          body: "未锁品牌时写可量化规格，优于只写品牌名。",
        },
        {
          title: "需要时标位置",
          body: "袋拉链、外露拉链要引出清楚。",
        },
        {
          title: "与采购确认",
          body: "锁品牌就写死；允许替代要书面列出。",
        },
      ],
      faq: [
        {
          question: "工厂擅自换拉链怎么办？",
          answer: "在包里写「不可替代」或列出可接受替代。",
        },
        {
          question: "拉片分开采购？",
          answer: "分开买就单独一行 BOM。",
        },
        {
          question: "PackFlow 能管辅料吗？",
          answer: `${BRAND_SHORT_NAME} 的 BOM 含辅料类别，并与画布引出对照。`,
        },
      ],
      ctaLabel: "在 PackFlow 写辅料规格",
    },
  },
  {
    slug: "tech-pack-for-reorders",
    publishedAt: PUB,
    updatedAt: PUB,
    series: "fundamentals",
    relatedSlugs: [
      "tech-pack-revision-control",
      "colorway-lab-dip-tech-pack",
      "how-to-grade-size-chart",
      "for-merchandisers",
    ],
    en: {
      title: "Tech packs for reorders: what to freeze and what to update",
      description:
        "Reorder tech packs — freeze approved construction, update color/qty, and avoid silent changes.",
      definition:
        "For apparel reorders, freeze the approved sample’s construction, POM base, and materials unless intentionally changed; update colorways, quantities, and dates, and issue a clear revision if anything structural moves.",
      audience: "Merchandisers placing repeat bulk orders.",
      keyTakeaways: [
        "Start from the approved pack, not the first draft",
        "Freeze fit and construction unless there is an ECO",
        "Update color, labels, and delivery notes",
        "Call out any intentional change in a change log",
      ],
      sections: [
        {
          heading: "Usually freeze",
          bullets: [
            "Sample size POM set that passed",
            "Construction notes and critical trims",
            "Artwork size/placement if unchanged",
          ],
        },
        {
          heading: "Usually update",
          bullets: [
            "Colorways and lab dip refs",
            "Order quantities and deliveries",
            "Season/style codes on labels",
            "Factory contact and revision date",
          ],
        },
      ],
      faq: [
        {
          question: "Can I reuse last year’s PDF as-is?",
          answer:
            "Only if nothing changed and the file is clearly dated. Prefer exporting from the current master project.",
        },
        {
          question: "Factory asks to change a trim for cost?",
          answer:
            "Treat as a revision — approve in writing and update the BOM.",
        },
        {
          question: "How does PackFlow help reorders?",
          answer: `${BRAND_SHORT_NAME} keeps the approved style project to duplicate/update instead of rebuilding from chat.`,
        },
      ],
      ctaLabel: "Reuse a style in PackFlow",
    },
    zh: {
      title: "复单工艺包：哪些冻结、哪些更新？",
      description:
        "复单时冻结已确认的结构与尺码，更新色组与数量——避免悄悄改规格。",
      definition:
        "服装复单：以通过样的工艺包为底，冻结合身、工艺与物料（除非有意变更）；更新色组、数量与日期；结构有变必须出变更说明并升版。",
      audience: "下重复大货订单的跟单。",
      keyTakeaways: [
        "从通过版出发，不是从第一稿",
        "无工程变更就冻结合身与工艺",
        "更新颜色、唛头、交期说明",
        "任何有意改动写进变更日志",
      ],
      sections: [
        {
          heading: "通常冻结",
          bullets: [
            "已通过的基准码 POM",
            "工艺说明与关键辅料",
            "未改的图稿尺寸与位置",
          ],
        },
        {
          heading: "通常更新",
          bullets: [
            "色组与色样依据",
            "订单数量与交期",
            "唛头上的季节/款号",
            "工厂对接与版次日期",
          ],
        },
      ],
      faq: [
        {
          question: "直接用去年 PDF 可以吗？",
          answer: "仅当完全无改且日期清楚。更好从当前主项目重新导出。",
        },
        {
          question: "工厂要换辅料降本？",
          answer: "当作变更 — 书面同意并改 BOM。",
        },
        {
          question: "PackFlow 怎么帮复单？",
          answer: `${BRAND_SHORT_NAME} 保留通过款项目，复制/更新即可，不必从聊天重建。`,
        },
      ],
      ctaLabel: "在 PackFlow 复用款式",
    },
  },
];
