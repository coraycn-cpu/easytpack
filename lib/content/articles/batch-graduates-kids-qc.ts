import type { ArticleRecord } from "@/lib/content/articles/types";
import { BRAND_SHORT_NAME } from "@/lib/brand";

const PUB = "2026-08-05";

/**
 * 第六批：服装专业毕业生 / 新人设计师 + 童装 / 充绒 / 验货
 * 易收录结构；EN 优先，ZH 同步。
 */
export const GRADUATES_KIDS_QC_BATCH: ArticleRecord[] = [
  {
    slug: "first-tech-pack-for-fashion-graduates",
    publishedAt: PUB,
    updatedAt: PUB,
    series: "roles",
    relatedSlugs: [
      "junior-designer-tech-pack-mistakes",
      "how-to-make-tech-pack",
      "tech-pack-checklist",
      "tech-pack-portfolio-tips",
    ],
    en: {
      title: "First tech pack for fashion graduates: a starter path",
      description:
        "How fashion graduates can build a first factory-ready tech pack without over-designing the paperwork.",
      definition:
        "A fashion graduate’s first tech pack should start from one clear style photo or flat, add part callouts, a simple BOM, sample-size POMs, and short construction notes — then export one dated file for feedback instead of chasing perfect formatting.",
      audience: "Fashion school graduates and junior designers sending a first sampling pack.",
      keyTakeaways: [
        "One garment, one pack, one sample size",
        "Clarity beats fancy templates",
        "Ask for factory questions early",
        "Treat the first send as a learning loop, not a final thesis",
      ],
      sections: [
        {
          heading: "What factories expect from juniors",
          bullets: [
            "Readable drawings with callouts",
            "Named materials — even if TBD",
            "Sample size and units",
            "A contact and revision date",
          ],
        },
        {
          heading: "What you can skip at first",
          bullets: [
            "Full multi-size grade before fit",
            "Over-long brand storytelling pages",
            "Unrelated mood boards inside the factory file",
          ],
        },
      ],
      steps: [
        {
          title: "Pick one simple style",
          body: "A tee, shirt, or easy pant teaches the workflow faster than a complex coat.",
        },
        {
          title: "Annotate 5–8 critical parts",
          body: "Neck, closure, hem, and one pocket is enough to start.",
        },
        {
          title: "Fill BOM + sample POMs",
          body: "Mark unknowns as TBD — do not invent specs.",
        },
        {
          title: "Export, send, and log questions",
          body: "Every factory question becomes your next checklist item.",
        },
      ],
      faq: [
        {
          question: "Do I need InDesign for my first pack?",
          answer:
            "No. Factories care about complete information more than layout polish. A clear studio export is fine.",
        },
        {
          question: "Should I translate to English immediately?",
          answer:
            "If the factory or buyer is overseas, yes for labels. Otherwise Chinese-first is OK — keep terms consistent.",
        },
        {
          question: "How can PackFlow help graduates?",
          answer: `${BRAND_SHORT_NAME} lets you annotate and fill tables in one place, then export — good for learning the real pack structure.`,
        },
      ],
      ctaLabel: "Build your first pack in PackFlow",
    },
    zh: {
      title: "服装专业毕业生：第一份工艺包怎么做？",
      description:
        "毕业生/新人如何做出能发给工厂的第一份工艺包——先求清楚，再求漂亮。",
      definition:
        "毕业生的第一份工艺包：从一张清晰款式图或 flat 起步，加上部位引出、简单 BOM、基准码 POM 与短工艺说明，导出一份带日期的文件去要反馈——不要先追求排版完美。",
      audience: "服装院校毕业生与第一次发打样资料的初级设计师。",
      keyTakeaways: [
        "一款一包、一个基准码",
        "清楚比花哨模板重要",
        "尽早收集工厂问题",
        "第一次发送是学习循环，不是毕业论文",
      ],
      sections: [
        {
          heading: "工厂对新人最在意什么",
          bullets: [
            "图面能读、有引出",
            "物料有名——未知就写 TBD",
            "基准码与单位",
            "对接人与版次日期",
          ],
        },
        {
          heading: "第一次可以先不做的",
          bullets: [
            "合身未定就全码跳码",
            "超长品牌故事页",
            "把情绪板塞进给工厂的文件",
          ],
        },
      ],
      steps: [
        {
          title: "选一款简单的",
          body: "T 恤、衬衫或基础裤，比复杂大衣更快跑通流程。",
        },
        {
          title: "标 5～8 个关键部位",
          body: "领、门襟、下摆、再加一个口袋就够起步。",
        },
        {
          title: "填 BOM + 基准码 POM",
          body: "未知标 TBD — 不要编规格。",
        },
        {
          title: "导出、发送、记下问题",
          body: "工厂每问一句，就变成你下一份检查清单。",
        },
      ],
      faq: [
        {
          question: "第一份必须用 InDesign 吗？",
          answer: "不必。工厂更在意信息是否齐全。工作室清晰导出即可。",
        },
        {
          question: "要立刻做英文吗？",
          answer: "对接海外再上英文标签；否则可中文先做，用语保持一致。",
        },
        {
          question: "PackFlow 对毕业生有何帮助？",
          answer: `${BRAND_SHORT_NAME} 把标注与表格放一起再导出，便于学真实工艺包结构。`,
        },
      ],
      ctaLabel: "在 PackFlow 做第一份工艺包",
    },
  },
  {
    slug: "junior-designer-tech-pack-mistakes",
    publishedAt: PUB,
    updatedAt: PUB,
    series: "roles",
    relatedSlugs: [
      "first-tech-pack-for-fashion-graduates",
      "common-factory-tech-pack-questions",
      "tech-pack-checklist",
      "how-to-annotate-garment",
    ],
    en: {
      title: "Common tech pack mistakes junior designers make",
      description:
        "Frequent junior mistakes: vague callouts, silent BOM blanks, missing sample size, and chat-only changes.",
      definition:
        "Junior tech pack mistakes usually include unnamed callouts, blank BOM cells without TBD, missing sample size/units, conflicting left/right notes, and updating factories only in chat instead of a new dated pack.",
      audience: "Junior designers and interns preparing sampling files.",
      keyTakeaways: [
        "Every callout needs a clear part name",
        "Blank ≠ TBD — label unknowns",
        "Always state sample size and cm/inch",
        "Resend a revision when drawings change",
      ],
      sections: [
        {
          heading: "Top mistakes",
          bullets: [
            "Pretty flat with zero construction notes",
            "“Blue fabric” with no weight or content",
            "POMs without measurement methods",
            "Set photos without saying which garment",
            "Three PDFs with no “current” date",
          ],
        },
        {
          heading: "Quick fixes",
          paragraphs: [
            "Run a checklist before send. If a factory asks the same question twice, add that answer permanently into the pack.",
          ],
        },
      ],
      faq: [
        {
          question: "Is too much detail also a mistake?",
          answer:
            "Yes — essays nobody reads. Prefer short ops rows linked to callouts.",
        },
        {
          question: "Should juniors invent grades?",
          answer:
            "No. Lock sample fit first unless the buyer gave a rule.",
        },
        {
          question: "How does PackFlow reduce these mistakes?",
          answer: `${BRAND_SHORT_NAME} keeps drawings and tables together so blanks and mismatches are easier to spot.`,
        },
      ],
      ctaLabel: "Check your pack in PackFlow",
    },
    zh: {
      title: "初级设计师做工艺包最常见的坑",
      description:
        "新人高频失误：引出含糊、BOM 空白、漏基准码、只在聊天里改规格。",
      definition:
        "初级工艺包常见问题：引出无部位名、BOM 空着却不写 TBD、漏基准码/单位、左右写反，以及改图只发聊天不升版。",
      audience: "准备打样文件的初级设计师与实习生。",
      keyTakeaways: [
        "每条引出要有部位名",
        "空白 ≠ TBD — 未知要标明",
        "务必写基准码与单位",
        "改图就重发带日期的新版",
      ],
      sections: [
        {
          heading: "高频错误",
          bullets: [
            "漂亮 flat 却零工艺说明",
            "「蓝色布」无克重成分",
            "有 POM 无数法",
            "套装图不写做哪件",
            "三份 PDF 没有「当前版」日期",
          ],
        },
        {
          heading: "快速纠正",
          paragraphs: [
            "发送前过检查清单。工厂问第二次的问题，就写进包里变成固定说明。",
          ],
        },
      ],
      faq: [
        {
          question: "写太细也是错吗？",
          answer: "是 — 没人看的长文不如短工艺行 + 引出。",
        },
        {
          question: "新人可以自己编跳码吗？",
          answer: "不要。先锁样衣合身，除非买家已给规则。",
        },
        {
          question: "PackFlow 如何少踩坑？",
          answer: `${BRAND_SHORT_NAME} 图和表在一起，空白与对不上更容易被看见。`,
        },
      ],
      ctaLabel: "在 PackFlow 检查工艺包",
    },
  },
  {
    slug: "tech-pack-portfolio-tips",
    publishedAt: PUB,
    updatedAt: PUB,
    series: "roles",
    relatedSlugs: [
      "first-tech-pack-for-fashion-graduates",
      "flat-sketch-vs-tech-pack",
      "how-to-make-tech-pack",
      "for-export-apparel",
    ],
    en: {
      title: "Tech packs in a fashion portfolio: what to show",
      description:
        "How graduates should present tech pack pages in a portfolio without leaking confidential factory files.",
      definition:
        "In a fashion portfolio, show 1–2 anonymized tech pack spreads that prove you can link flats, callouts, BOM, and size charts — redact brand secrets, and caption what you personally owned.",
      audience: "Graduates building internship or junior-designer portfolios.",
      keyTakeaways: [
        "Show structure, not every confidential page",
        "Caption your role (drew flats / wrote BOM / measured POMs)",
        "Redact supplier names and unreleased artwork",
        "One complete mini-pack beats ten mood boards",
      ],
      sections: [
        {
          heading: "Good portfolio slices",
          bullets: [
            "Annotated flat + matching ops rows",
            "BOM excerpt with clear specs",
            "Size chart for sample size with methods",
            "Before/after revision note from a fit comment",
          ],
        },
        {
          heading: "Avoid",
          bullets: [
            "Full live buyer packs without permission",
            "Unreadable tiny screenshots",
            "Packs with no explanation of your contribution",
          ],
        },
      ],
      faq: [
        {
          question: "School project packs OK?",
          answer:
            "Yes — label them as schoolwork and keep the same clarity standards.",
        },
        {
          question: "English or Chinese portfolio?",
          answer:
            "Match the job market you apply to; bilingual captions help export roles.",
        },
        {
          question: "Can PackFlow exports go in a portfolio?",
          answer: `Yes — export clean pages from ${BRAND_SHORT_NAME} and redact as needed.`,
        },
      ],
      ctaLabel: "Create portfolio pages in PackFlow",
    },
    zh: {
      title: "作品集里怎么放工艺包页面？",
      description:
        "毕业生作品集展示工艺包：证明你会串联图、引出、BOM 与尺码，同时注意脱敏。",
      definition:
        "作品集里放 1～2 页脱敏后的工艺包展开，证明你能把 flat、引出、BOM 与尺码表串起来——隐去品牌机密，并注明你负责哪部分。",
      audience: "做实习/初级设计师作品集的毕业生。",
      keyTakeaways: [
        "展示结构，不必公开每一页机密",
        "注明你的职责（画图 / 写 BOM / 量 POM）",
        "打码供应商与未发布图稿",
        "一份完整小包胜过十张情绪板",
      ],
      sections: [
        {
          heading: "适合放的切片",
          bullets: [
            "带引出的 flat + 对应工艺行",
            "规格清楚的 BOM 节选",
            "带量法的基准码尺码表",
            "合身意见改版前后对照",
          ],
        },
        {
          heading: "避免",
          bullets: [
            "未经允许的完整客户活包",
            "缩到看不清的截图",
            "不写明你贡献了什么",
          ],
        },
      ],
      faq: [
        {
          question: "课程作业包可以吗？",
          answer: "可以 — 标明课程作品，标准仍要清楚。",
        },
        {
          question: "作品集用中文还是英文？",
          answer: "看投递市场；外贸岗双语说明加分。",
        },
        {
          question: "PackFlow 导出能进作品集吗？",
          answer: `可以 — 从 ${BRAND_SHORT_NAME} 导出清晰页并按需脱敏。`,
        },
      ],
      ctaLabel: "用 PackFlow 做作品集页",
    },
  },
  {
    slug: "kids-children-tech-pack",
    publishedAt: PUB,
    updatedAt: PUB,
    series: "howto",
    relatedSlugs: [
      "how-to-make-tech-pack",
      "what-is-sample-size-apparel",
      "tech-pack-qc-inspection-checklist",
      "how-to-spec-zipper-trims",
    ],
    en: {
      title: "How to make a kids / children’s apparel tech pack",
      description:
        "Kids tech packs: safety trims, age/size naming, growth ease, and clear sample size communication.",
      definition:
        "A children’s apparel tech pack follows the same structure as adult packs but must highlight safety-related trims, clear age or height size naming, and sample-size POMs appropriate to the child size chart you are developing.",
      audience: "Designers and merchandisers sampling kidswear.",
      keyTakeaways: [
        "State size system (age, height, or brand code)",
        "Call out cords, small parts, and snap security",
        "POMs follow the kids chart — do not copy adult blindly",
        "Label regulations/testing needs when known (market-specific)",
      ],
      sections: [
        {
          heading: "Kids-specific callouts",
          bullets: [
            "Neck opening ease for pull-on styles",
            "Detachable parts and button security",
            "Cord length / placement restrictions by market",
            "Soft seams where irritation matters",
          ],
        },
      ],
      steps: [
        {
          title: "Define the size name on the cover",
          body: "e.g. 110 cm or 5Y — keep it consistent on the chart.",
        },
        {
          title: "Annotate safety-sensitive trims",
          body: "Snaps, zippers near face, and any small components.",
        },
        {
          title: "Fill kids BOM + sample POMs",
          body: "Use the children’s measurement set, not adult shortcuts.",
        },
        {
          title: "Ask factory about testing needs early",
          body: "Mark TBD if lab tests are pending — do not hide them.",
        },
      ],
      faq: [
        {
          question: "Can I reuse an adult tee pack?",
          answer:
            "Only as a layout template. Rebuild sizes, ease, and safety notes for kids.",
        },
        {
          question: "One pack for a full age range?",
          answer:
            "Start with one sample size; grade only with an approved kids grade rule.",
        },
        {
          question: "Does PackFlow support kids packs?",
          answer: `Yes — build callouts, BOM, and size charts in ${BRAND_SHORT_NAME} the same way, with kids-specific content.`,
        },
      ],
      ctaLabel: "Start a kids pack in PackFlow",
    },
    zh: {
      title: "童装工艺包怎么做？",
      description:
        "童装要点：安全辅料、尺码命名（年龄/身高）、松量，以及基准码怎么写。",
      definition:
        "童装工艺包结构与成人相同，但更要突出安全相关辅料、清晰的年龄或身高尺码命名，以及符合童装尺码表的基准码 POM。",
      audience: "打童装样的设计与跟单。",
      keyTakeaways: [
        "写清尺码体系（年龄、身高或品牌代号）",
        "标绳带、小零件、四合扣牢固度",
        "POM 用童装表，不要照搬成人",
        "已知法规/检测要求要写明（视市场）",
      ],
      sections: [
        {
          heading: "童装专项引出",
          bullets: [
            "套头款领口松量",
            "可拆零件与扣子牢固",
            "绳带长度/位置（视出口市场）",
            "易磨皮肤处的柔软缝份",
          ],
        },
      ],
      steps: [
        {
          title: "封面上写清尺码名",
          body: "如 110cm 或 5Y — 与尺码表一致。",
        },
        {
          title: "标注安全敏感辅料",
          body: "四合扣、近脸拉链、小部件。",
        },
        {
          title: "填童装 BOM + 基准码 POM",
          body: "用儿童测量体系，不要套成人捷径。",
        },
        {
          title: "尽早问工厂检测需求",
          body: "待检就标 TBD — 不要藏着。",
        },
      ],
      faq: [
        {
          question: "能直接套成人 T 的包吗？",
          answer: "只能借版式。尺码、松量与安全说明必须按童装重做。",
        },
        {
          question: "一个包覆盖全年龄段吗？",
          answer: "先做一个基准码；有批准的童装跳码规则再扩展。",
        },
        {
          question: "PackFlow 支持童装吗？",
          answer: `支持 — 在 ${BRAND_SHORT_NAME} 同样做引出、BOM 与尺码，内容按童装写。`,
        },
      ],
      ctaLabel: "在 PackFlow 做童装工艺包",
    },
  },
  {
    slug: "down-padded-jacket-tech-pack",
    publishedAt: PUB,
    updatedAt: PUB,
    series: "howto",
    relatedSlugs: [
      "jacket-tech-pack-guide",
      "how-to-write-garment-bom",
      "how-to-annotate-garment",
      "tech-pack-qc-inspection-checklist",
    ],
    en: {
      title: "How to make a down / padded jacket tech pack",
      description:
        "Fill power, baffle design, lining, and hardware — what a padded/down jacket tech pack must specify.",
      definition:
        "A down or padded jacket tech pack must show shell/lining views, specify fill type and amount (or gsm), call out baffle or quilt pattern, and include hardware plus sample POMs such as chest, length, and sleeve.",
      audience: "Teams sampling puffers and insulated jackets.",
      keyTakeaways: [
        "Fill: down cluster/fill power or synthetic gsm",
        "Quilt/baffle pattern on the drawing",
        "BOM: shell, lining, fill, zipper, snaps, tape",
        "Note stitch-through vs box baffle if relevant",
      ],
      sections: [
        {
          heading: "Must-spec insulation details",
          bullets: [
            "Fill weight per size or per garment",
            "Down/feather ratio if down",
            "Quilt spacing or baffle map",
            "Cold-spot risk areas (shoulders, seams)",
          ],
        },
      ],
      steps: [
        {
          title: "Upload shell flat + lining/quilt reference",
          body: "Factories need to see channel layout.",
        },
        {
          title: "Annotate baffle and closures",
          body: "Zip garage, chin guard, and hem adjusters if any.",
        },
        {
          title: "Fill insulation BOM precisely",
          body: "TBD is OK early — never leave fill blank silently.",
        },
        {
          title: "Confirm sample POMs after loft settles",
          body: "Bulk can change appearance — note measurement timing if needed.",
        },
      ],
      faq: [
        {
          question: "Is fill power enough alone?",
          answer:
            "No. Factories also need fill weight and construction (baffle vs stitch-through).",
        },
        {
          question: "Synthetic vs down in one pack family?",
          answer:
            "Say which SKU uses which fill; do not mix silently across colorways.",
        },
        {
          question: "Can PackFlow document puffers?",
          answer: `Yes — multi-view callouts and BOM rows in ${BRAND_SHORT_NAME} cover insulated jackets.`,
        },
      ],
      ctaLabel: "Start a puffer pack in PackFlow",
    },
    zh: {
      title: "羽绒服 / 棉服工艺包怎么做？",
      description:
        "充绒量、胆布结构、里料与五金——棉服/羽绒工艺包必须写清的点。",
      definition:
        "羽绒或棉服工艺包要有面/里示意，写明填充种类与用量（或克重），标出绗缝或胆格，并含五金与胸围、衣长、袖长等基准码 POM。",
      audience: "打充棉或羽绒服样的团队。",
      keyTakeaways: [
        "填充：绒子/蓬松度或化纤克重",
        "图上画出绗缝/胆格",
        "BOM：面、里、填充、拉链、扣、压胶条",
        "写明透缝还是立衬胆（如相关）",
      ],
      sections: [
        {
          heading: "填充必须写清的细节",
          bullets: [
            "每件或每码充绒/棉量",
            "羽绒的绒子含量（如适用）",
            "绗缝间距或胆格示意",
            "易漏冷点（肩、缝骨）",
          ],
        },
      ],
      steps: [
        {
          title: "上传外层平铺 + 绗缝/里料参照",
          body: "工厂要看到通道怎么走。",
        },
        {
          title: "标注胆格与门襟",
          body: "拉链仓、下摆抽绳等一并标出。",
        },
        {
          title: "精确填填充 BOM",
          body: "早期可 TBD — 但不要空白不说明。",
        },
        {
          title: "蓬松稳定后再核 POM",
          body: "必要时注明测量时机。",
        },
      ],
      faq: [
        {
          question: "只写蓬松度够吗？",
          answer: "不够。还要充绒量与结构（胆格 vs 透缝）。",
        },
        {
          question: "同一系列有的羽绒有的棉？",
          answer: "写明哪个 SKU 用哪种填充，不要跨色组默默混用。",
        },
        {
          question: "PackFlow 能做棉服吗？",
          answer: `能 — ${BRAND_SHORT_NAME} 多视角引出与 BOM 适合充绒款。`,
        },
      ],
      ctaLabel: "在 PackFlow 做棉服工艺包",
    },
  },
  {
    slug: "tech-pack-qc-inspection-checklist",
    publishedAt: PUB,
    updatedAt: PUB,
    series: "howto",
    relatedSlugs: [
      "tech-pack-checklist",
      "how-to-send-tech-pack-to-factory",
      "how-to-handle-fit-comments",
      "common-factory-tech-pack-questions",
    ],
    en: {
      title: "Tech pack QC checklist before bulk and inspection",
      description:
        "A practical QC-oriented checklist: match sample to pack, tolerances, labels, and measurement points.",
      definition:
        "A tech pack QC checklist verifies that bulk or inspection will measure the same POMs, materials, and construction as the approved sample — including tolerances, label data, and the current revision of the pack.",
      audience: "Merchandisers and QA preparing PP sample or bulk inspection.",
      keyTakeaways: [
        "Approved sample + current pack must match",
        "POM list and methods identical to inspection sheet",
        "Tolerances stated where required",
        "Trims, labels, and artwork against locked standards",
      ],
      sections: [
        {
          heading: "Before inspection",
          bullets: [
            "Revision date of the pack in hand",
            "Sample size and graded sizes in scope",
            "Critical POM shortlist for the inspector",
            "Workmanship points (stitch, seam, pressing)",
          ],
        },
      ],
      steps: [
        {
          title: "Align pack and approved sample",
          body: "Photo any drift; update pack before inspection day.",
        },
        {
          title: "Export a measurement sheet from the same POMs",
          body: "Do not invent a second naming system.",
        },
        {
          title: "List fail points that block shipment",
          body: "Safety, major measurement fails, wrong colorway.",
        },
        {
          title: "Record results back to the style file",
          body: "Failed points become the next revision inputs.",
        },
      ],
      faq: [
        {
          question: "Is AQL the same as a tech pack?",
          answer:
            "No. AQL is a sampling plan. The tech pack defines what “correct” looks like.",
        },
        {
          question: "Who writes tolerances?",
          answer:
            "Often the buyer or QA standard. Put them on the pack or linked inspection sheet.",
        },
        {
          question: "Can PackFlow support QC prep?",
          answer: `${BRAND_SHORT_NAME} keeps the approved measurements and notes in one project you can export for QA.`,
        },
      ],
      ctaLabel: "Prepare QC from PackFlow",
    },
    zh: {
      title: "大货 / 验货前的工艺包质检清单",
      description:
        "验货导向清单：样衣与包是否一致、公差、唛头，以及测量点是否统一。",
      definition:
        "工艺包质检清单用于确认大货或验货会按通过样的同一套 POM、物料与工艺来量——含公差、唛头信息与当前版工艺包。",
      audience: "准备产前样或大货验货的跟单与 QA。",
      keyTakeaways: [
        "通过样与当前包必须一致",
        "POM 名称量法与验货表相同",
        "需要处写明公差",
        "辅料、唛头、图稿对齐锁定标准",
      ],
      sections: [
        {
          heading: "验货前核对",
          bullets: [
            "手中工艺包的版次日期",
            "验货覆盖的基准码与其它码",
            "给验货员的关键 POM 短名单",
            "做工点（针迹、缝骨、整烫）",
          ],
        },
      ],
      steps: [
        {
          title: "对齐工艺包与通过样",
          body: "有偏差就拍照，验货前改包。",
        },
        {
          title: "用同一套 POM 导出测量表",
          body: "不要另起一套命名。",
        },
        {
          title: "列出阻断出货的失败项",
          body: "安全、严重尺寸、错误色组等。",
        },
        {
          title: "结果写回款式档案",
          body: "失败点成为下一版输入。",
        },
      ],
      faq: [
        {
          question: "AQL 等于工艺包吗？",
          answer: "不等于。AQL 是抽样方案；工艺包定义「正确」长什么样。",
        },
        {
          question: "公差谁写？",
          answer: "常是买家或 QA 标准。写在包上或关联验货表。",
        },
        {
          question: "PackFlow 能辅助验货准备吗？",
          answer: `${BRAND_SHORT_NAME} 把通过的尺寸与说明留在同一项目，可导出给 QA。`,
        },
      ],
      ctaLabel: "用 PackFlow 准备验货",
    },
  },
  {
    slug: "how-to-read-factory-comments",
    publishedAt: PUB,
    updatedAt: PUB,
    series: "howto",
    relatedSlugs: [
      "how-to-handle-fit-comments",
      "common-factory-tech-pack-questions",
      "junior-designer-tech-pack-mistakes",
      "tech-pack-revision-control",
    ],
    en: {
      title: "How to read factory comments on a tech pack",
      description:
        "Translate factory feedback into pack actions: clarify, change, or reject — with revision discipline.",
      definition:
        "Reading factory comments means sorting each note into clarify (pack was unclear), change (design/fit update), or reject (out of scope) — then updating the dated tech pack so the next sample follows one source of truth.",
      audience: "Juniors and merchandisers receiving long factory emails.",
      keyTakeaways: [
        "Number every factory line item",
        "Classify: clarify / change / reject",
        "Answer in the pack, not only email",
        "One revision after the batch of decisions",
      ],
      sections: [
        {
          heading: "Comment patterns",
          bullets: [
            "“Please confirm…” → pack was ambiguous",
            "“Suggest change…” → optional engineering advice",
            "“Cannot do…” → capability or cost limit",
            "Measurement disputes → method mismatch",
          ],
        },
      ],
      steps: [
        {
          title: "Paste comments into a numbered list",
          body: "Keep the factory’s wording where possible.",
        },
        {
          title: "Tag each line clarify/change/reject",
          body: "Decide owners (design vs merchandising vs pattern).",
        },
        {
          title: "Update the master pack once",
          body: "Bundle answers into a single revision when you can.",
        },
        {
          title: "Reply with the new file + change log",
          body: "Point to superseded PDF explicitly.",
        },
      ],
      faq: [
        {
          question: "Factory tone feels harsh — is the pack wrong?",
          answer:
            "Not always. Many notes are routine confirms. Still fix ambiguity.",
        },
        {
          question: "Should graduates answer alone?",
          answer:
            "Escalate fit and cost decisions; you can draft the clarified pack.",
        },
        {
          question: "How does PackFlow help?",
          answer: `${BRAND_SHORT_NAME} is the master file you update after sorting comments — then re-export.`,
        },
      ],
      ctaLabel: "Turn comments into a PackFlow revision",
    },
    zh: {
      title: "工厂对工艺包的意见怎么读、怎么回？",
      description:
        "把工厂反馈分成：澄清、修改、拒绝——再升版工艺包，避免只在邮件里扯皮。",
      definition:
        "读工厂意见：把每条分成澄清（包没写清）、修改（设计/合身要变）、拒绝（超出范围）——然后更新带日期的工艺包，让下一版样只跟一个真相来源。",
      audience: "收到超长工厂邮件的新人与跟单。",
      keyTakeaways: [
        "工厂条目全部编号",
        "分类：澄清 / 修改 / 拒绝",
        "答案写回包，不只回邮件",
        "一批决策合并成一次升版",
      ],
      sections: [
        {
          heading: "意见常见句式",
          bullets: [
            "「请确认…」→ 包有歧义",
            "「建议改…」→ 工程建议，可选",
            "「做不了…」→ 能力或成本限制",
            "尺寸争议 → 量法不一致",
          ],
        },
      ],
      steps: [
        {
          title: "粘贴成编号清单",
          body: "尽量保留工厂原话。",
        },
        {
          title: "每条打标签：澄清/修改/拒绝",
          body: "定负责人（设计 / 跟单 / 版师）。",
        },
        {
          title: "集中改主工艺包",
          body: "能合并就一次升版答完。",
        },
        {
          title: "回新文件 + 变更说明",
          body: "明确作废旧 PDF。",
        },
      ],
      faq: [
        {
          question: "语气很冲就代表包很差吗？",
          answer: "不一定。很多是例行确认。但歧义仍要修。",
        },
        {
          question: "毕业生能独自回复吗？",
          answer: "合身与成本升级请示；你可以先改澄清后的包。",
        },
        {
          question: "PackFlow 怎么帮？",
          answer: `${BRAND_SHORT_NAME} 是你整理意见后更新的主文件，然后重新导出。`,
        },
      ],
      ctaLabel: "把意见变成 PackFlow 新版",
    },
  },
];
