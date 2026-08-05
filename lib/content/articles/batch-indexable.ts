import type { ArticleRecord } from "@/lib/content/articles/types";
import { BRAND_SHORT_NAME } from "@/lib/brand";

const PUB = "2026-08-05";

/**
 * 第三批：易收录结构（问句标题 + 速答 + 要点 + 步骤/清单 + FAQ）
 * EN 优先，ZH 同步。
 */
export const INDEXABLE_BATCH: ArticleRecord[] = [
  {
    slug: "what-is-bom-apparel",
    publishedAt: PUB,
    updatedAt: PUB,
    series: "fundamentals",
    relatedSlugs: [
      "how-to-write-garment-bom",
      "tech-pack-vs-bom",
      "what-is-tech-pack",
      "tech-pack-checklist",
    ],
    en: {
      title: "What is a BOM in apparel?",
      description:
        "BOM means bill of materials: the list of fabrics, trims, thread, and packing used to cut and sew a garment style.",
      definition:
        "In apparel, a BOM (bill of materials) is the itemized list of everything needed to make a style — shell fabric, lining, trims, thread, labels, and packing — usually with color, spec, and usage.",
      audience: "Designers, merchandisers, and anyone filling the materials tab of a tech pack.",
      keyTakeaways: [
        "BOM = what to buy and cut, not how to sew",
        "Each row should name the material, type, color/spec, and usage when known",
        "A BOM alone is not a full tech pack — you still need drawings and sizes",
        "Mark unknowns as TBD instead of leaving silent blanks",
      ],
      sections: [
        {
          heading: "What belongs on a garment BOM",
          bullets: [
            "Shell / main fabric and lining if any",
            "Trims: zipper, button, elastic, tape, drawcord",
            "Thread and specialty stitches if they drive cost",
            "Labels, hangtags, polybags, and packing materials when required",
          ],
        },
        {
          heading: "BOM vs tech pack",
          paragraphs: [
            "The tech pack is the full package (images + ops + sizes + BOM). The BOM is one table inside it that purchasing and cutting rooms rely on.",
          ],
        },
      ],
      faq: [
        {
          question: "Is BOM the same as a materials list?",
          answer:
            "Yes — bill of materials is the industry name for that materials list in a tech pack.",
        },
        {
          question: "Do I need supplier names on the first sample BOM?",
          answer:
            "Helpful but not always required. Spec and color are more critical for sampling; add mills as they lock.",
        },
        {
          question: "Should consumption be exact before sampling?",
          answer:
            "Estimate and label it. Exact yield often waits until the sample is cut.",
        },
        {
          question: "Where does PackFlow keep the BOM?",
          answer: `${BRAND_SHORT_NAME} keeps BOM beside the canvas with ops and size so materials stay tied to the same style images.`,
        },
      ],
      ctaLabel: "Fill a BOM in PackFlow",
    },
    zh: {
      title: "服装 BOM 是什么？",
      description:
        "BOM（物料清单）列出做一款衣服要用的面料、辅料、线与包装等，是工艺包里的采购与开裁依据。",
      definition:
        "在服装里，BOM（Bill of Materials，物料清单）是做成衣所需物料的明细：主料、里料、辅料、线、唛头与包装等，通常含颜色、规格与用量。",
      audience: "要填工艺包「物料」页的设计、跟单。",
      keyTakeaways: [
        "BOM 管「买什么/裁什么」，不管怎么缝",
        "每行尽量有名称、类别、颜色规格、已知用量",
        "只有 BOM 不算完整工艺包，还要有图和尺码",
        "未知项写 TBD，不要留空白又不说明",
      ],
      sections: [
        {
          heading: "服装 BOM 通常写什么",
          bullets: [
            "主料 / 面料，以及里料（如有）",
            "辅料：拉链、纽扣、松紧、织带、抽绳等",
            "影响成本的线与特殊线迹",
            "需要时的洗唛、吊牌、胶袋与包装材料",
          ],
        },
        {
          heading: "BOM 和工艺包的关系",
          paragraphs: [
            "工艺包是整份资料（图 + 工艺 + 尺码 + BOM）。BOM 是其中一张表，采购与裁床主要看它。",
          ],
        },
      ],
      faq: [
        {
          question: "BOM 就是物料表吗？",
          answer: "是。BOM 是工艺包里物料表的行业叫法。",
        },
        {
          question: "头版就要写供应商吗？",
          answer:
            "有更好，但不总是必须。打样阶段规格与颜色更关键，工厂/布行锁定后再补。",
        },
        {
          question: "用量要一次算准吗？",
          answer: "先估并标明。精确出成率常等样衣开裁后才准。",
        },
        {
          question: "PackFlow 里 BOM 在哪？",
          answer: `${BRAND_SHORT_NAME} 把物料与工艺、尺码放在画布旁，和同一款图绑在一起。`,
        },
      ],
      ctaLabel: "在 PackFlow 填 BOM",
    },
  },
  {
    slug: "what-is-pom-apparel",
    publishedAt: PUB,
    updatedAt: PUB,
    series: "fundamentals",
    relatedSlugs: [
      "size-chart-basics",
      "pants-size-chart-pom",
      "how-to-annotate-garment",
      "tech-pack-vs-bom",
    ],
    en: {
      title: "What is POM in apparel size charts?",
      description:
        "POM means point of measure: a named measurement point with a method and a value for the sample size.",
      definition:
        "POM (point of measure) is a named place on a garment you measure — for example chest or body length — with a clear method and a number for the sample size in the tech pack size chart.",
      audience: "Anyone writing or reading apparel size charts.",
      keyTakeaways: [
        "POM = named measurement point + how to measure + sample value",
        "POM names should match size lines on the drawing when possible",
        "State cm or inch and the sample size code",
        "Do not invent numbers for unknown POMs — leave TBD",
      ],
      sections: [
        {
          heading: "POM vs size chart",
          paragraphs: [
            "The size chart is the table. Each row is usually one POM. Grades (other sizes) are optional until the sample is approved or the buyer fixes a rule.",
          ],
        },
        {
          heading: "Examples of common POMs",
          bullets: [
            "Chest / bust circumference",
            "Body length / center back length",
            "Sleeve length, shoulder, hem opening",
            "For bottoms: waist, hip, inseam, outseam",
          ],
        },
      ],
      faq: [
        {
          question: "Is POM the same as size?",
          answer:
            "No. Size (S/M/L) is the fit code. POM is each measurement that defines that size.",
        },
        {
          question: "Body POM or garment POM?",
          answer:
            "Say which. Factory tech packs usually use finished garment measurements.",
        },
        {
          question: "How many POMs do I need?",
          answer:
            "Enough to control the silhouette and critical openings — quality over a huge unused list.",
        },
        {
          question: "How does PackFlow use POMs?",
          answer: `${BRAND_SHORT_NAME} can link size-chart rows to size lines on the image so names and numbers stay aligned.`,
        },
      ],
      ctaLabel: "Edit POMs in PackFlow",
    },
    zh: {
      title: "服装尺码表里的 POM 是什么？",
      description:
        "POM（Point of Measure）是命名的测量点：含部位名、量法与基准码数值。",
      definition:
        "POM（Point of Measure，测量点）是成衣上要量的命名位置——如胸围、衣长——在工艺包尺码表里写清量法，并给出基准码数值。",
      audience: "编写或阅读服装尺码表的人。",
      keyTakeaways: [
        "POM = 部位名 + 量法 + 基准码数值",
        "名称尽量与图上尺寸线一致",
        "写明 cm/inch 与基准码号",
        "未知尺寸标 TBD，不要编数字",
      ],
      sections: [
        {
          heading: "POM 和尺码表",
          paragraphs: [
            "尺码表是整张表；每一行通常是一个 POM。其它码的跳码可在样衣确认或买家给规则后再写。",
          ],
        },
        {
          heading: "常见 POM 例子",
          bullets: [
            "胸围 / 胸宽",
            "衣长 / 后中长",
            "袖长、肩宽、下摆",
            "下装：腰围、臀围、内长、外长",
          ],
        },
      ],
      faq: [
        {
          question: "POM 等于尺码吗？",
          answer: "不等于。S/M/L 是码号；POM 是定义该码的每一项尺寸。",
        },
        {
          question: "量人体还是量成衣？",
          answer: "写清楚。工厂工艺包多数用成品成衣寸。",
        },
        {
          question: "要写多少个 POM？",
          answer: "够控制廓形与关键开口即可——质量优于堆很长不用的表。",
        },
        {
          question: "PackFlow 怎么用 POM？",
          answer: `${BRAND_SHORT_NAME} 可将尺码行与图上尺寸线关联，名称和数字更不易对不上。`,
        },
      ],
      ctaLabel: "在 PackFlow 编辑 POM",
    },
  },
  {
    slug: "how-to-write-garment-bom",
    publishedAt: PUB,
    updatedAt: PUB,
    series: "howto",
    relatedSlugs: [
      "what-is-bom-apparel",
      "tech-pack-checklist",
      "how-to-make-tech-pack",
      "hoodie-tech-pack-guide",
    ],
    en: {
      title: "How to write a garment BOM (step by step)",
      description:
        "Step-by-step: list shell, trims, thread, and packing so purchasing and factories can use your tech pack BOM.",
      definition:
        "To write a garment BOM: list every material the style needs, classify it (fabric/trim/etc.), add color and spec, estimate usage, and label anything still TBD before you send the pack.",
      audience: "Beginners filling a BOM for the first tech pack.",
      keyTakeaways: [
        "Start from the drawing — every visible material should appear once",
        "One row = one purchasable item",
        "Color + spec beat vague names like “blue fabric”",
        "Export the BOM with the same revision as the drawings",
      ],
      sections: [
        {
          heading: "Fields that matter",
          bullets: [
            "Name (what buyers call it)",
            "Category (fabric, trim, packaging…)",
            "Color / pantone or lab dip ref when known",
            "Spec (weight, width, length, size of zip)",
            "Usage / consumption estimate",
          ],
        },
      ],
      steps: [
        {
          title: "Walk the garment visually",
          body: "From collar to hem, note shell, lining, visible trims, and labels.",
        },
        {
          title: "Add one BOM row per item",
          body: "Do not merge zipper and puller if they are purchased separately.",
        },
        {
          title: "Fill color, spec, and usage",
          body: "Use TBD labels where missing. Prefer too specific over too vague.",
        },
        {
          title: "Cross-check with ops notes",
          body: "If ops mention binding or stay tape, those materials must appear on the BOM.",
        },
        {
          title: "Send with the pack revision",
          body: "Keep BOM, drawings, and size chart on the same dated send.",
        },
      ],
      faq: [
        {
          question: "Can I copy a BOM from a similar style?",
          answer:
            "Yes as a draft — then delete rows that do not apply and add new trims.",
        },
        {
          question: "Where do I put artwork files?",
          answer:
            "Reference them in the pack and on print/embroidery rows; attach files as your buyer requires.",
        },
        {
          question: "How does PackFlow help?",
          answer: `${BRAND_SHORT_NAME} keeps BOM next to the image so you can check that every trim you see has a row.`,
        },
      ],
      ctaLabel: "Write a BOM in PackFlow",
    },
    zh: {
      title: "服装 BOM 怎么写？（分步）",
      description:
        "按步骤列出面料、辅料、线与包装，让采购和工厂能直接用你的物料表。",
      definition:
        "写服装 BOM：列出本款所需全部物料，分类（面料/辅料等），补颜色与规格，估算用量，未定项标 TBD，再随工艺包发出。",
      audience: "第一次填工艺包物料表的新手。",
      keyTakeaways: [
        "从图面走一遍——看得见的物料都要有行",
        "一行 = 一个可采购项",
        "颜色+规格优于「蓝色布」这种模糊写法",
        "BOM 与图、尺码用同一版次发出",
      ],
      sections: [
        {
          heading: "关键字段",
          bullets: [
            "名称（沟通时怎么叫）",
            "类别（面料、辅料、包装…）",
            "颜色 / 潘通或确认样编号",
            "规格（克重、幅宽、拉链尺寸等）",
            "用量估算",
          ],
        },
      ],
      steps: [
        {
          title: "按图面从上到下看",
          body: "从领到摆，记下主料、里料、可见辅料与唛头。",
        },
        {
          title: "每种物料单独一行",
          body: "拉链与拉片若分开采购，就不要挤在同一行。",
        },
        {
          title: "补颜色、规格、用量",
          body: "缺的标 TBD。宁可写细，不要写空。",
        },
        {
          title: "对照工艺说明",
          body: "工艺里写了包边、牵带，BOM 里就要有对应物料。",
        },
        {
          title: "与整包同版发送",
          body: "BOM、图、尺码表用同一日期/版次。",
        },
      ],
      faq: [
        {
          question: "能抄相似款 BOM 吗？",
          answer: "可以当草稿——删掉不适用的，补上新辅料。",
        },
        {
          question: "印绣花文件放哪？",
          answer: "在包内与印绣花物料行注明，并按买家要求附文件。",
        },
        {
          question: "PackFlow 怎么帮？",
          answer: `${BRAND_SHORT_NAME} 把 BOM 放在图旁，方便核对「看见的辅料是否都有行」。`,
        },
      ],
      ctaLabel: "在 PackFlow 写 BOM",
    },
  },
  {
    slug: "how-to-send-tech-pack-to-factory",
    publishedAt: PUB,
    updatedAt: PUB,
    series: "howto",
    relatedSlugs: [
      "tech-pack-checklist",
      "common-factory-tech-pack-questions",
      "for-merchandisers",
      "how-to-make-tech-pack",
    ],
    en: {
      title: "How to send a tech pack to a factory",
      description:
        "A clean send process: one revision, clear formats, contact person, and what to ask the factory to confirm.",
      definition:
        "To send a tech pack to a factory: finalize one dated revision (drawings + BOM + sizes + ops), export the agreed files (often PDF/Excel), state sample size and due date, and ask the factory to confirm open TBDs in writing.",
      audience: "Merchandisers and freelancers emailing the first sampling pack.",
      keyTakeaways: [
        "One pack = one revision date",
        "Say sample size, units, and which garment in a set",
        "List questions you want confirmed — do not assume silence means OK",
        "Update the same project when they reply",
      ],
      sections: [
        {
          heading: "What to attach",
          bullets: [
            "PDF or agreed visual export of the pack",
            "Excel BOM/size if purchasing needs sheets",
            "Artwork files referenced in the BOM",
            "Short cover note: style no., sample size, deadline",
          ],
        },
      ],
      steps: [
        {
          title: "Run the pre-send checklist",
          body: "Identity, images, BOM, ops, size chart, TBD labels — see the checklist article.",
        },
        {
          title: "Export one revision",
          body: "Name files with style + date. Avoid “final_final2”.",
        },
        {
          title: "Write a short cover note",
          body: "Sample size, units, due date, and 3–5 confirmation questions.",
        },
        {
          title: "Send to one primary contact",
          body: "CC stakeholders, but keep one factory owner of replies.",
        },
        {
          title: "Log answers back into the pack",
          body: "When they confirm fabric or change a POM, update the same dated project.",
        },
      ],
      faq: [
        {
          question: "Email or portal?",
          answer:
            "Follow the factory’s rule. Either way, keep your master pack in one place.",
        },
        {
          question: "What if they only want Excel?",
          answer:
            "Send Excel plus a PDF of drawings so callouts are not lost.",
        },
        {
          question: "Can PackFlow export for this?",
          answer: `${BRAND_SHORT_NAME} exports tech pack previews/files from the studio after you finish annotations and tables.`,
        },
      ],
      ctaLabel: "Export from PackFlow",
    },
    zh: {
      title: "工艺包怎么发给工厂？",
      description:
        "一次发样怎么发：单一版次、约定格式、对接人，以及要工厂书面确认什么。",
      definition:
        "发给工厂：整理好带日期的一版（图 + BOM + 尺码 + 工艺），按约定导出（常为 PDF/Excel），写明基准码与交期，并请工厂书面确认未定事项。",
      audience: "首次发打样资料的跟单与自由设计师。",
      keyTakeaways: [
        "一包一个版次日期",
        "写清基准码、单位、套装做哪件",
        "列出要确认的问题——别把沉默当同意",
        "工厂回复后改回同一项目",
      ],
      sections: [
        {
          heading: "一般附什么",
          bullets: [
            "PDF 或约定的可视导出",
            "采购需要时的 Excel BOM/尺码",
            "BOM 里引用的图稿文件",
            "短信封面：款号、基准码、交期",
          ],
        },
      ],
      steps: [
        {
          title: "过一遍发送前清单",
          body: "身份、图、BOM、工艺、尺码、TBD——见检查清单文。",
        },
        {
          title: "导出同一版次",
          body: "文件名带款号+日期。避免「最终版2」。",
        },
        {
          title: "写简短说明",
          body: "基准码、单位、交期，以及 3～5 个确认问题。",
        },
        {
          title: "发给主对接人",
          body: "可以抄送，但工厂侧要有一个主回复人。",
        },
        {
          title: "把答案写回工艺包",
          body: "确认面料或改 POM 后，更新同一项目并改日期。",
        },
      ],
      faq: [
        {
          question: "用邮件还是系统？",
          answer: "听工厂规定。无论哪种，你自己的主稿只维护一份。",
        },
        {
          question: "对方只要 Excel？",
          answer: "Excel + 带标注的 PDF 图，避免引出丢失。",
        },
        {
          question: "PackFlow 能导出吗？",
          answer: `${BRAND_SHORT_NAME} 在工作室完成标注与表格后，可导出工艺包预览/文件。`,
        },
      ],
      ctaLabel: "从 PackFlow 导出",
    },
  },
  {
    slug: "hoodie-tech-pack-guide",
    publishedAt: PUB,
    updatedAt: PUB,
    series: "howto",
    relatedSlugs: [
      "how-to-make-tech-pack",
      "how-to-write-garment-bom",
      "how-to-annotate-garment",
      "size-chart-basics",
    ],
    en: {
      title: "How to make a hoodie tech pack",
      description:
        "Hoodie-specific tech pack tips: hood, rib, kangaroo pocket, and POMs factories check first.",
      definition:
        "A hoodie tech pack should show clear front/back views, call out hood, rib, and pocket construction, list fleece/rib/trim on the BOM, and include POMs like chest, body length, sleeve, and hood opening.",
      audience: "Teams sampling pullover or zip hoodies.",
      keyTakeaways: [
        "Call out hood volume, rib height, and pocket bag depth",
        "BOM: shell fleece, rib, drawcord, eyelets, zipper if any",
        "POMs: chest, length, sleeve, shoulder, hood opening",
        "Say pullover vs zip — construction differs a lot",
      ],
      sections: [
        {
          heading: "Must-annotate areas",
          bullets: [
            "Hood shape and lining if different",
            "Rib cuff and hem height",
            "Kangaroo or zip pocket placement",
            "Drawcord exits and aglets",
          ],
        },
        {
          heading: "Common hoodie BOM rows",
          bullets: [
            "Main fleece / French terry",
            "Rib for cuff and hem",
            "Drawcord + tips",
            "Metal or plastic eyelets",
            "Zipper + puller for zip hoodies",
          ],
        },
      ],
      steps: [
        {
          title: "Upload a flat or clean front photo",
          body: "Prefer a front flat; add back for hood and shoulder seams.",
        },
        {
          title: "Annotate hood, rib, and pocket",
          body: "Short notes beat long paragraphs. Link to ops rows.",
        },
        {
          title: "Fill hoodie BOM and POMs",
          body: "Include rib and cord. Measure chest, length, sleeve, hood opening.",
        },
        {
          title: "Export and ask factory to confirm rib & hood",
          body: "These two areas drive most hoodie sample comments.",
        },
      ],
      faq: [
        {
          question: "Do I need a side view?",
          answer:
            "Helpful for pocket depth and sleeve pitch; not always mandatory if callouts are clear.",
        },
        {
          question: "What fabric weight should I list?",
          answer:
            "List gsm or oz when known; otherwise TBD with a hand-feel note.",
        },
        {
          question: "Can PackFlow help with hoodie packs?",
          answer: `${BRAND_SHORT_NAME} supports annotation, BOM, size, and export for hoodie styles like any other garment.`,
        },
      ],
      ctaLabel: "Start a hoodie pack in PackFlow",
    },
    zh: {
      title: "卫衣 / 连帽衫工艺包怎么做？",
      description:
        "连帽卫衣专项：帽子、罗纹、袋鼠袋与工厂常看的尺寸点。",
      definition:
        "卫衣工艺包应有清晰正背面、标出帽子/罗纹/口袋结构，BOM 含抓绒或毛圈、罗纹与抽绳等辅料，尺码含胸围、衣长、袖长、帽口等 POM。",
      audience: "打套头或拉链卫衣样的团队。",
      keyTakeaways: [
        "标清帽子容量、罗纹高、袋深",
        "BOM：主料、罗纹、抽绳、鸡眼、拉链（如有）",
        "POM：胸围、衣长、袖长、肩宽、帽口",
        "写明套头还是拉链——结构差很多",
      ],
      sections: [
        {
          heading: "必须标到的区域",
          bullets: [
            "帽型，里料若不同要写",
            "袖口与下摆罗纹高度",
            "袋鼠袋或拉链袋位置",
            "抽绳出口与绳头",
          ],
        },
        {
          heading: "常见卫衣 BOM 行",
          bullets: [
            "主身抓绒 / 毛圈",
            "袖口下摆罗纹",
            "抽绳 + 绳头",
            "金属或塑料鸡眼",
            "拉链卫衣的拉链 + 拉片",
          ],
        },
      ],
      steps: [
        {
          title: "上传平铺或干净正面图",
          body: "优先正面平铺；背面补帽子与肩缝。",
        },
        {
          title: "标注帽、罗纹、口袋",
          body: "短说明 + 工艺行关联，比长文更有效。",
        },
        {
          title: "填卫衣 BOM 与 POM",
          body: "别漏罗纹和绳。量胸围、衣长、袖长、帽口。",
        },
        {
          title: "导出并请工厂确认罗纹与帽子",
          body: "这两处最容易在头版被改。",
        },
      ],
      faq: [
        {
          question: "要侧面图吗？",
          answer: "对袋深和袖斜有帮助；引出够清楚时可不强制。",
        },
        {
          question: "克重怎么写？",
          answer: "已知就写 gsm；未知标 TBD 并备注手感。",
        },
        {
          question: "PackFlow 适合卫衣吗？",
          answer: `${BRAND_SHORT_NAME} 同样支持卫衣的标注、物料、尺码与导出。`,
        },
      ],
      ctaLabel: "在 PackFlow 做卫衣工艺包",
    },
  },
  {
    slug: "pants-size-chart-pom",
    publishedAt: PUB,
    updatedAt: PUB,
    series: "howto",
    relatedSlugs: [
      "what-is-pom-apparel",
      "size-chart-basics",
      "how-to-annotate-garment",
      "tech-pack-checklist",
    ],
    en: {
      title: "Pants size chart: essential POMs",
      description:
        "Which POMs to include for trousers and shorts — waist, hip, inseam, and how to measure them.",
      definition:
        "A pants size chart should include waist, hip, and length POMs (inseam and/or outseam) with clear methods, plus rise and thigh when fit-critical, all stated for the sample size in cm or inches.",
      audience: "Anyone documenting bottoms in a tech pack.",
      keyTakeaways: [
        "Minimum: waist, hip, inseam (or outseam), hem opening",
        "Add front/back rise for fit-critical styles",
        "Say where waist is measured (top edge vs at belt)",
        "Match POM names to size lines on the flat",
      ],
      sections: [
        {
          heading: "Core pants POMs",
          bullets: [
            "Waist circumference",
            "Hip / seat",
            "Inseam and/or outseam",
            "Thigh and knee (optional but useful)",
            "Leg opening / hem",
            "Front rise / back rise when needed",
          ],
        },
        {
          heading: "Method tips",
          paragraphs: [
            "Measure waist at the specified edge with the garment flat unless the buyer asks for worn measure. Note elastic waists separately (relaxed vs stretched).",
          ],
        },
      ],
      steps: [
        {
          title: "List POMs for your silhouette",
          body: "Skinny jeans need more leg POMs than loose shorts.",
        },
        {
          title: "Write one-line methods",
          body: "Example: “Inseam — crotch seam to hem along inseam.”",
        },
        {
          title: "Fill sample-size values",
          body: "Leave TBD rather than guessing stretch grades.",
        },
        {
          title: "Draw matching size lines on the image",
          body: "So the factory sees waist vs hip at a glance.",
        },
      ],
      faq: [
        {
          question: "Inseam or outseam?",
          answer:
            "Many packs include both. If only one, inseam is more common for trousers.",
        },
        {
          question: "What about shorts?",
          answer:
            "Same waist/hip logic; length becomes outseam or side seam length from waist to hem.",
        },
        {
          question: "Can PackFlow link pants POMs to the canvas?",
          answer: `Yes — ${BRAND_SHORT_NAME} supports size lines linked to chart rows for bottoms as for tops.`,
        },
      ],
      ctaLabel: "Build a pants chart in PackFlow",
    },
    zh: {
      title: "裤装尺码表要写哪些 POM？",
      description:
        "长裤/短裤常用测量点：腰围、臀围、内长等，以及怎么量、怎么和图纸对应。",
      definition:
        "裤装尺码表应包含腰围、臀围与长度类 POM（内长和/或外长）并写清量法；合身关键时再加前/后浪与大腿围，全部按基准码用厘米或英寸填写。",
      audience: "要在工艺包里做下装尺寸的人。",
      keyTakeaways: [
        "最少：腰围、臀围、内长（或外长）、脚口",
        "合身款补前浪/后浪",
        "写明腰围量在何处（上口还是裤腰中）",
        "POM 名与平铺图尺寸线一致",
      ],
      sections: [
        {
          heading: "裤装核心 POM",
          bullets: [
            "腰围",
            "臀围",
            "内长和/或外长",
            "大腿围、膝围（可选但有用）",
            "脚口 / 下摆宽",
            "需要时的前浪 / 后浪",
          ],
        },
        {
          heading: "量法提示",
          paragraphs: [
            "除非买家要求穿着量，一般平放量腰上口。松紧腰要分松量与拉量。",
          ],
        },
      ],
      steps: [
        {
          title: "按廓形列 POM",
          body: "紧身牛仔裤比宽松短裤需要更多腿部点。",
        },
        {
          title: "每条写一行量法",
          body: "例如：「内长 — 裆缝沿内缝至脚口」。",
        },
        {
          title: "填基准码数值",
          body: "弹力跳码未定时标 TBD，不要瞎填。",
        },
        {
          title: "在图上画对应尺寸线",
          body: "工厂一眼能区分腰与臀。",
        },
      ],
      faq: [
        {
          question: "内长还是外长？",
          answer: "很多包装两个。只写一个时，长裤更常见写内长。",
        },
        {
          question: "短裤呢？",
          answer: "腰臀逻辑相同；长度常用侧缝长或外长。",
        },
        {
          question: "PackFlow 能关联裤装 POM 吗？",
          answer: `可以 — ${BRAND_SHORT_NAME} 对下装同样支持尺寸线与表行关联。`,
        },
      ],
      ctaLabel: "在 PackFlow 做裤装尺码表",
    },
  },
  {
    slug: "flat-sketch-vs-tech-pack",
    publishedAt: PUB,
    updatedAt: PUB,
    series: "compare",
    relatedSlugs: [
      "what-is-tech-pack",
      "how-to-annotate-garment",
      "excel-vs-tech-pack-software",
      "how-to-make-tech-pack",
    ],
    en: {
      title: "Flat sketch vs tech pack: what’s the difference?",
      description:
        "A flat sketch shows the garment outline; a tech pack adds BOM, sizes, and construction for production.",
      definition:
        "A flat sketch (or flat) is a clean 2D drawing of a garment; a tech pack is the full production package that includes flats or photos plus BOM, POM, and construction notes for sampling and manufacturing.",
      audience: "Designers who already draw flats and need to know what else factories require.",
      keyTakeaways: [
        "Flat = visual outline; tech pack = visual + tables + notes",
        "Factories cannot sample reliably from a flat alone",
        "You can start with a flat photo/scan inside a tech pack studio",
        "Callouts turn a flat into production language",
      ],
      sections: [
        {
          heading: "What a flat is good for",
          bullets: [
            "Showing silhouette and design lines",
            "Comparing colorways visually",
            "Fast internal design reviews",
          ],
        },
        {
          heading: "What you still need for production",
          bullets: [
            "Materials (BOM)",
            "Measurements (POM / size chart)",
            "Construction / ops notes",
            "Revision control when anything changes",
          ],
        },
      ],
      faq: [
        {
          question: "Is a CAD flat required?",
          answer:
            "Not always. A clear product flat photo can work if annotations and tables are complete.",
        },
        {
          question: "Can AI turn a photo into a flat?",
          answer:
            "Some tools draft flats or views; always check proportion before factory send.",
        },
        {
          question: "How does PackFlow use flats?",
          answer: `${BRAND_SHORT_NAME} treats flats or photos as canvas artboards you annotate, then fill BOM/size/ops around them.`,
        },
      ],
      ctaLabel: "Turn a flat into a pack in PackFlow",
    },
    zh: {
      title: "款式图（Flat）和工艺包有什么区别？",
      description:
        "Flat 是廓形线稿/平铺示意；工艺包还要物料、尺码与工艺，才能打样生产。",
      definition:
        "Flat（款式平铺图/线稿）是服装的二维示意；工艺包是完整生产资料，包含 flat 或照片，再加上 BOM、POM 与工艺说明，供打样与大货。",
      audience: "会画 flat、但还不清工厂还要什么的设计师。",
      keyTakeaways: [
        "Flat = 图面轮廓；工艺包 = 图 + 表 + 说明",
        "只有 flat 工厂很难稳定打样",
        "可把 flat 放进工艺包工作室当主图",
        "引出标注把 flat 变成生产语言",
      ],
      sections: [
        {
          heading: "Flat 擅长什么",
          bullets: [
            "表达廓形与设计线",
            "看配色",
            "内部快速评审",
          ],
        },
        {
          heading: "生产还缺什么",
          bullets: [
            "物料（BOM）",
            "尺寸（POM / 尺码表）",
            "工艺 / 工序说明",
            "变更时的版本管理",
          ],
        },
      ],
      faq: [
        {
          question: "必须 CAD flat 吗？",
          answer: "不一定。清晰产品平铺图 + 完整标注与表格也可以。",
        },
        {
          question: "AI 能把照片变成 flat 吗？",
          answer: "有些工具可出草稿视角；发工厂前务必核对比例。",
        },
        {
          question: "PackFlow 怎么用 flat？",
          answer: `${BRAND_SHORT_NAME} 把 flat 或照片当画板，在上面标注，并在旁填写物料/尺码/工艺。`,
        },
      ],
      ctaLabel: "在 PackFlow 把 flat 做成工艺包",
    },
  },
  {
    slug: "common-factory-tech-pack-questions",
    publishedAt: PUB,
    updatedAt: PUB,
    series: "fundamentals",
    relatedSlugs: [
      "how-to-send-tech-pack-to-factory",
      "tech-pack-checklist",
      "for-pattern-makers",
      "what-is-tech-pack",
    ],
    en: {
      title: "Common factory questions about tech packs (and how to answer)",
      description:
        "Typical factory questions on tech packs — missing POM, fabric TBD, which garment in a set — with clear reply patterns.",
      definition:
        "Factories usually ask which garment is in scope, what the sample size is, which POMs and methods apply, what is still TBD on the BOM, and which revision is current — answer those up front to cut sampling delays.",
      audience: "Brands and freelancers who get long factory email threads.",
      keyTakeaways: [
        "Answer scope, sample size, and revision in the first send",
        "TBDs should be explicit, not blank",
        "Point to the POM method, not only the number",
        "Keep one master pack when answering follow-ups",
      ],
      sections: [
        {
          heading: "Questions you will hear",
          bullets: [
            "Which piece in the set are we sampling?",
            "What is the sample size and unit?",
            "How do you measure this POM?",
            "Is fabric confirmed or TBD?",
            "Is the back view for reference only?",
            "Which file is the latest?",
          ],
        },
        {
          heading: "Reply patterns that work",
          paragraphs: [
            "Short, numbered answers beat long essays. Update the pack and resend a dated PDF when drawings change — do not only reply in chat.",
          ],
        },
      ],
      faq: [
        {
          question: "The factory asks for a pattern. Is that the tech pack?",
          answer:
            "No. The pattern is the graded paper/CAD. The tech pack guides sampling; pattern makers still create the pattern.",
        },
        {
          question: "They say the pack is incomplete. What first?",
          answer:
            "Ask which section: image, BOM, size, or ops. Fix that section and bump the revision date.",
        },
        {
          question: "Should I answer in English or Chinese?",
          answer:
            "Use the language the factory team reads daily; export bilingual tables if mixed teams are involved.",
        },
        {
          question: "How can PackFlow reduce these questions?",
          answer: `${BRAND_SHORT_NAME} keeps drawings and tables together with checklists and export — fewer mismatched attachments.`,
        },
      ],
      ctaLabel: "Tighten your pack in PackFlow",
    },
    zh: {
      title: "工厂常问的工艺包问题（及怎么答）",
      description:
        "工厂高频问题：做哪件、基准码、量法、面料是否确定、哪版最新——附简洁回复方式。",
      definition:
        "工厂常问：本包做哪件、基准码是多少、POM 怎么量、BOM 还有哪些 TBD、哪份是当前版——发样前先写清，能减少打样延误。",
      audience: "经常被工厂邮件追问的品牌与自由设计师。",
      keyTakeaways: [
        "第一次发送就写清范围、基准码、版次",
        "TBD 要写明，不要空白",
        "回复 POM 时连带量法，不只给数字",
        "后续回答仍改同一主稿",
      ],
      sections: [
        {
          heading: "你几乎一定会遇到的问题",
          bullets: [
            "套装打哪一件？",
            "基准码和单位？",
            "这个 POM 怎么量？",
            "面料确定了吗还是 TBD？",
            "背面图是否仅示意？",
            "哪份文件最新？",
          ],
        },
        {
          heading: "有效的回复方式",
          paragraphs: [
            "简短编号回答优于长文。图有改动就更新日期并重发 PDF——不要只在聊天里改口。",
          ],
        },
      ],
      faq: [
        {
          question: "工厂要纸样，那是工艺包吗？",
          answer:
            "不是。纸样是打版输出；工艺包指导打样，版师仍要出纸样/CAD。",
        },
        {
          question: "说资料不齐，先怎么办？",
          answer: "问清缺图、BOM、尺码还是工艺；补该块并改版次日期。",
        },
        {
          question: "用中文还是英文回？",
          answer: "用工厂日常阅读的语言；中英团队可导出对照表。",
        },
        {
          question: "PackFlow 如何减少追问？",
          answer: `${BRAND_SHORT_NAME} 把图和表放一起，并支持检查与导出，减少附件对不上。`,
        },
      ],
      ctaLabel: "在 PackFlow 把包补齐",
    },
  },
];
