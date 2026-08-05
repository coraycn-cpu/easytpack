import type { ArticleRecord } from "@/lib/content/articles/types";
import { BRAND_SHORT_NAME } from "@/lib/brand";

const PUB = "2026-08-05";

/**
 * 首发 6 篇：英文优先撰写，中文同步。
 * slug 保持英文，利于 URL / 外贸 SEO。
 */
export const ARTICLES: ArticleRecord[] = [
  {
    slug: "what-is-tech-pack",
    publishedAt: PUB,
    updatedAt: PUB,
    series: "fundamentals",
    relatedSlugs: [
      "tech-pack-vs-bom",
      "tech-pack-checklist",
      "how-to-make-tech-pack",
      "ai-tech-pack-tools",
    ],
    en: {
      title: "What is an apparel tech pack?",
      description:
        "A tech pack (工艺包) is the shared document set that turns a style idea into sewable, measurable factory instructions — BOM, ops, sizes, and artwork.",
      definition:
        "An apparel tech pack is a structured package of drawings, measurements, materials (BOM), construction notes, and labels that factories and pattern teams use to sample and produce a style consistently.",
      audience:
        "Designers, merchandisers, pattern makers, and anyone sending styles to factories or overseas buyers.",
      sections: [
        {
          heading: "Why tech packs exist",
          paragraphs: [
            "Photos alone are ambiguous: fabric, stitch, tolerance, and which garment in a set can all be misread. A tech pack reduces email ping-pong by putting decisions in one place.",
            "In Chinese apparel teams this package is often called a 工艺包 / 工艺单. English buyers usually say tech pack or techpack.",
          ],
        },
        {
          heading: "What a solid tech pack usually includes",
          bullets: [
            "Front (and often back) flats or clear style photos with callouts",
            "Bill of materials (BOM): fabrics, trims, thread, packaging",
            "Construction / operations notes by part (ops)",
            "Size chart / POM with sample size and grade rules when needed",
            "Artwork, labels, care, and packing notes if they affect production",
          ],
        },
        {
          heading: "How PackFlow helps",
          paragraphs: [
            `${BRAND_SHORT_NAME} is an AI-assisted studio for building tech packs from style photos: annotate manually anytime, use AI when signed in, then export for pattern or factory review.`,
          ],
        },
      ],
      faq: [
        {
          question: "Is a tech pack the same as a sketch?",
          answer:
            "No. A sketch or mood image starts the idea; a tech pack adds materials, measurements, and construction detail so production can repeat the style.",
        },
        {
          question: "Do I need English and Chinese versions?",
          answer:
            "If you work with export buyers or overseas factories, an English-labeled pack helps. Domestic factories may prefer Chinese. Many teams keep both.",
        },
        {
          question: "Can AI replace a pattern maker?",
          answer:
            "No. AI can draft annotations and tables faster; pattern makers and factories still own fit, grading, and production risk.",
        },
      ],
      ctaLabel: "Create a style in PackFlow",
    },
    zh: {
      title: "什么是服装工艺包（Tech Pack）？",
      description:
        "工艺包（Tech Pack）是把款式想法变成可打样、可沟通的工厂说明：图纸、物料、工艺与尺码等结构化信息。",
      definition:
        "服装工艺包是一套结构化资料：款式图/线稿、物料清单（BOM）、部位工艺说明、尺码表（POM）以及必要的标示与包装说明，供版师与工厂按同一标准打样与生产。",
      audience: "设计师、跟单、版师，以及需要把款发给工厂或海外客户的人。",
      sections: [
        {
          heading: "为什么需要工艺包",
          paragraphs: [
            "只靠照片容易歧义：面料、针法、公差、套装里到底做哪一件，都可能理解不一致。工艺包把决定写在同一处，减少来回确认。",
            "国内常叫「工艺包 / 工艺单」；外贸买家多说 tech pack / techpack。本质都是可交付的沟通包。",
          ],
        },
        {
          heading: "一份靠谱的工艺包通常包含",
          bullets: [
            "正面（常含背面）平铺图或清晰款式图，可带引出标注",
            "物料清单（BOM）：面料、辅料、线、包装等",
            "按部位写的工艺 / 工序说明",
            "尺码表 / POM：基准码与必要时的跳码规则",
            "影响生产的印绣花、唛头、洗标与包装说明",
          ],
        },
        {
          heading: "PackFlow 能帮什么",
          paragraphs: [
            `${BRAND_SHORT_NAME} 是 AI 辅助工艺包工作室：可随时手动标注，登录后可用 AI，再导出给版师或工厂核对。`,
          ],
        },
      ],
      faq: [
        {
          question: "工艺包等于效果图吗？",
          answer:
            "不等于。效果图表达感觉；工艺包还要补物料、尺寸与工艺细节，才能稳定复打样。",
        },
        {
          question: "要不要中英两套？",
          answer:
            "对接海外买家或工厂时，英文标签更省事；国内工厂常偏好中文。很多团队两套都留。",
        },
        {
          question: "AI 能替代版师吗？",
          answer:
            "不能。AI 可加快标注与表格初稿；合身、放码与生产风险仍由版师和工厂把关。",
        },
      ],
      ctaLabel: "在 PackFlow 新建款式",
    },
  },
  {
    slug: "tech-pack-vs-bom",
    publishedAt: PUB,
    updatedAt: PUB,
    series: "fundamentals",
    relatedSlugs: [
      "what-is-tech-pack",
      "tech-pack-checklist",
      "size-chart-basics",
    ],
    en: {
      title: "Tech pack vs BOM vs size chart vs ops sheet",
      description:
        "How a tech pack relates to BOM, size chart (POM), and construction notes — and why teams keep them together.",
      definition:
        "A tech pack is the parent package; BOM lists materials, the size chart lists measurements (POM), and ops/construction notes describe how each part is sewn — each answers a different factory question.",
      audience:
        "Anyone mixing Excel tabs or chat screenshots and wondering what belongs where.",
      sections: [
        {
          heading: "Quick map",
          bullets: [
            "Tech pack = the whole deliverable (views + tables + notes)",
            "BOM = what to buy / cut (fabric, trim, thread, packing)",
            "Size chart / POM = what to measure and sample-size values",
            "Ops / construction = how to sew each part (stitch, seam, finish)",
          ],
        },
        {
          heading: "Common mix-ups",
          paragraphs: [
            "Putting only a BOM in an email is not a full tech pack: factories still need drawings and sizes. Likewise, a size chart without part callouts on the image is hard to audit.",
            "Keep one style = one package. If you sell a set (vest + shorts), say clearly which garment each page or artboard covers.",
          ],
        },
        {
          heading: "In PackFlow",
          paragraphs: [
            `${BRAND_SHORT_NAME} keeps process (ops), BOM, size, and remarks beside the canvas so the package stays linked to the same style images.`,
          ],
        },
      ],
      faq: [
        {
          question: "Can BOM live in a separate spreadsheet?",
          answer:
            "Yes for purchasing, but the version sent to the factory should match the drawings and sizes in the same pack revision.",
        },
        {
          question: "What is POM?",
          answer:
            "Point of measure — named measurement points (e.g. chest, length) with a method and a value for the sample size.",
        },
      ],
      ctaLabel: "Open PackFlow studio",
    },
    zh: {
      title: "工艺包、BOM、尺码表、工艺说明有什么区别？",
      description:
        "工艺包是总包；BOM 管物料，尺码表（POM）管测量，工艺说明管怎么缝。搞清分工，沟通更少踩坑。",
      definition:
        "工艺包是整份交付物；BOM 回答「用什么料」，尺码表（POM）回答「量哪里、多少厘米」，工艺/工序说明回答「各部位怎么缝」——分别解决工厂的不同问题。",
      audience: "习惯用多个 Excel / 聊天截图拼资料、分不清该往哪放的同学。",
      sections: [
        {
          heading: "一张对照表",
          bullets: [
            "工艺包 = 整份可交付包（图 + 表 + 说明）",
            "BOM = 买什么 / 裁什么（面辅料、线、包装）",
            "尺码表 / POM = 测什么、基准码数值",
            "工艺 / 工序 = 各部位怎么缝（针法、缝份、收口）",
          ],
        },
        {
          heading: "常见混淆",
          paragraphs: [
            "只发 BOM 不算完整工艺包：工厂还要图和尺码。只有尺码表、图上没有部位引出，也不好核对。",
            "一款一份包。若是套装（马甲+短裤），写清每一页/画板对应哪一件。",
          ],
        },
        {
          heading: "在 PackFlow 里",
          paragraphs: [
            `${BRAND_SHORT_NAME} 把工艺、物料、尺寸、评语放在同一画布旁，和款式图绑在一起，减少版本对不上。`,
          ],
        },
      ],
      faq: [
        {
          question: "BOM 可以单独用表格吗？",
          answer:
            "采购可以另表；发给工厂的版本应与同一次工艺包里的图和尺码一致。",
        },
        {
          question: "POM 是什么？",
          answer:
            "Point of measure：命名的测量点（如胸围、衣长），含量法与基准码数值。",
        },
      ],
      ctaLabel: "打开 PackFlow 工作室",
    },
  },
  {
    slug: "tech-pack-checklist",
    publishedAt: PUB,
    updatedAt: PUB,
    series: "fundamentals",
    relatedSlugs: [
      "what-is-tech-pack",
      "how-to-make-tech-pack",
      "how-to-annotate-garment",
      "excel-vs-tech-pack-software",
    ],
    en: {
      title: "Tech pack checklist before you email the factory",
      description:
        "A practical checklist for apparel tech packs: images, BOM, ops, sizes, and revision notes before you send.",
      definition:
        "Before sending a tech pack, confirm the style identity, clear front reference, labeled materials, construction notes, sample-size chart, and a revision date so the factory knows which file is current.",
      audience: "Merchandisers and freelancers about to send the first sampling pack.",
      sections: [
        {
          heading: "Identity",
          bullets: [
            "Style name / number and season or buyer code if any",
            "Which garment in a set (top vs bottom) is in scope",
            "Sample size and units (usually cm)",
          ],
        },
        {
          heading: "Visuals",
          bullets: [
            "Clear front photo or flat; back / detail views when critical",
            "Callouts for tricky areas (collar, pocket, print placement)",
            "Prefer long edge around 2000px or less for smooth AI and sharing",
          ],
        },
        {
          heading: "Tables & notes",
          bullets: [
            "BOM rows with name, type, color/spec, and usage where known",
            "Ops notes for main parts — not only a marketing blurb",
            "Size chart with method hints for key POMs",
            "Open risks called out (fabric TBD, artwork pending)",
          ],
        },
        {
          heading: "Send hygiene",
          bullets: [
            "One pack revision date or version label",
            "Export format the factory can open (PDF / Excel as agreed)",
            "Contact for questions",
          ],
        },
      ],
      faq: [
        {
          question: "Must every row be perfect before sampling?",
          answer:
            "No — mark unknowns clearly. Factories hate silent blanks more than labeled TBDs.",
        },
        {
          question: "Is a model photo OK as the only image?",
          answer:
            "It can start the pack, but flats or cropped product views reduce fit and proportion confusion. Say if a view is illustrative only.",
        },
      ],
      ctaLabel: "Build your checklist in PackFlow",
    },
    zh: {
      title: "发给工厂前的工艺包检查清单",
      description:
        "发样前核对：款号、主图、BOM、工艺、尺码与版本日期，减少工厂来回问。",
      definition:
        "发送工艺包前，确认款式身份、清晰正面参考图、物料与工艺说明、基准码尺码表，以及版本/日期，让工厂知道哪份是当前稿。",
      audience: "即将发第一份打样资料的跟单与自由设计师。",
      sections: [
        {
          heading: "身份信息",
          bullets: [
            "款名 / 款号，以及季节或客户代号（如有）",
            "套装时写清本包覆盖上装还是下装",
            "基准码与单位（多为厘米）",
          ],
        },
        {
          heading: "图面",
          bullets: [
            "清晰正面图或平铺；关键时补背面 / 细节",
            "难点部位有引出（领、袋、印花位置）",
            "长边约 2000px 以内更利于分享与 AI",
          ],
        },
        {
          heading: "表格与说明",
          bullets: [
            "BOM：名称、类别、颜色规格、已知用量",
            "主要部位有工艺说明，不只是营销文案",
            "尺码表含关键 POM 的量法提示",
            "未定事项写清楚（面料待定、图稿未到等）",
          ],
        },
        {
          heading: "发送习惯",
          bullets: [
            "写明版本日期或版次",
            "按约定导出（PDF / Excel 等）",
            "留下问题对接人",
          ],
        },
      ],
      faq: [
        {
          question: "打样前必须每格都填满吗？",
          answer:
            "不必。未知项标明 TBD；工厂更怕「空着却没说」。",
        },
        {
          question: "只有模特图可以吗？",
          answer:
            "可以起步，但平铺或产品图更不易误判比例。若某视角仅示意，请注明。",
        },
      ],
      ctaLabel: "用 PackFlow 做检查清单",
    },
  },
  {
    slug: "how-to-make-tech-pack",
    publishedAt: PUB,
    updatedAt: PUB,
    series: "howto",
    relatedSlugs: [
      "what-is-tech-pack",
      "tech-pack-checklist",
      "how-to-annotate-garment",
    ],
    en: {
      title: "How to make a tech pack from a style photo (4 steps)",
      description:
        "Four practical steps: upload a front image, annotate ops and sizes, fill BOM, then export for sampling.",
      definition:
        "To make a tech pack from a style photo: capture a clear front reference, mark parts and measurements, list materials, then export a dated package for the factory.",
      audience: "Beginners building their first digital tech pack.",
      sections: [
        {
          heading: "Before you start",
          paragraphs: [
            "Use a sharp front view of the target garment. For sets, decide which piece you are documenting first.",
            "You can annotate manually without an account; AI assist and cloud sync need registration in PackFlow.",
          ],
        },
      ],
      steps: [
        {
          title: "Upload the front style image",
          body: "Create a new style and place the clearest front photo on the canvas. Add back or detail views later if needed.",
        },
        {
          title: "Annotate parts and sizes",
          body: "Box or call out construction areas; draw size lines for key POMs. Keep labels short and consistent.",
        },
        {
          title: "Fill ops, BOM, and size chart",
          body: "Translate callouts into ops rows, materials into BOM, and measurements into the size chart. Mark TBDs openly.",
        },
        {
          title: "Export and send",
          body: "Preview the pack, export the agreed format, and include a revision date. Update the same project when the factory replies.",
        },
      ],
      faq: [
        {
          question: "How long should the first pack take?",
          answer:
            "A simple tee can be drafted in one sitting; complex outerwear needs more detail views and ops rows. Speed comes from reusing structure, not skipping clarity.",
        },
        {
          question: "Where does AI help most?",
          answer:
            "Drafting ops/BOM/size suggestions and extra views after you confirm the garment — always human-review before factory send.",
        },
      ],
      ctaLabel: "Start a style on PackFlow",
    },
    zh: {
      title: "从款式图做工艺包：四步上手",
      description:
        "上传正面图 → 标工艺与尺寸 → 填物料与尺码表 → 导出发给工厂。新手可按四步走。",
      definition:
        "从款式图做工艺包：准备清晰正面参考、标注部位与尺寸、列出物料，再导出带日期的资料包发给工厂。",
      audience: "第一次做数字化工艺包的新手。",
      sections: [
        {
          heading: "开始之前",
          paragraphs: [
            "用目标单款的清晰正面图。套装先定本文档做哪一件。",
            "在 PackFlow 可先手动标注；AI 与云端同步需注册。",
          ],
        },
      ],
      steps: [
        {
          title: "上传正面款式图",
          body: "新建款式，把最清晰的正面图放到画布。需要时再补背面或细节。",
        },
        {
          title: "标注部位与尺寸",
          body: "用框选/引出标工艺区域，用尺寸线标关键 POM。标签尽量短且统一。",
        },
        {
          title: "填写工艺、BOM 与尺码表",
          body: "把标注落成工艺行、物料行和尺码数字；未定项写明 TBD。",
        },
        {
          title: "导出并发送",
          body: "预览后按约定格式导出，写上版本日期。工厂反馈仍在同一项目里改。",
        },
      ],
      faq: [
        {
          question: "第一份要做多久？",
          answer:
            "简单 T 恤可一次做完；复杂外套需要更多视角与工艺行。快来自结构复用，不是省略说明。",
        },
        {
          question: "AI 最适合帮哪一步？",
          answer:
            "确认单款后，可草稿工艺/物料/尺码与补视角；发给工厂前务必人工核对。",
        },
      ],
      ctaLabel: "在 PackFlow 开始新建",
    },
  },
  {
    slug: "how-to-annotate-garment",
    publishedAt: PUB,
    updatedAt: PUB,
    series: "howto",
    relatedSlugs: [
      "how-to-make-tech-pack",
      "tech-pack-checklist",
      "size-chart-basics",
    ],
    en: {
      title: "How to annotate a garment image for production",
      description:
        "Practical rules for boxing parts, callouts, and size lines so factories understand your tech pack drawings.",
      definition:
        "Good garment annotation names the part, points to the exact area on the image, and links to ops or size rows — so readers do not guess what a scribble means.",
      audience: "Anyone marking flats or photos before sampling.",
      sections: [
        {
          heading: "Annotation types that matter",
          bullets: [
            "Region / box: construction zones (collar, placket, pocket bag)",
            "Callout / arrow: small details that need a short note",
            "Size line: a POM from point A to B with a numeric value",
            "Decorative marks: do not treat as production instructions",
          ],
        },
        {
          heading: "Clarity rules",
          bullets: [
            "One idea per mark — do not overload a single box",
            "Use the same part name in the drawing and in the ops table",
            "Prefer the active color flat for construction; say when a back view is illustrative",
            "Lock finished marks if your tool supports it, so they are not dragged by accident",
          ],
        },
        {
          heading: "In PackFlow",
          paragraphs: [
            `${BRAND_SHORT_NAME} supports manual boxes, size lines, and AI-assisted fills. You can skip AI and keep working locally; register when you want assist or cloud save.`,
          ],
        },
      ],
      faq: [
        {
          question: "Should I annotate on the model photo or a flat?",
          answer:
            "Flats are usually clearer for construction. If you only have a model shot, crop to the garment and note that proportions are wearing ease.",
        },
        {
          question: "How many callouts are too many?",
          answer:
            "If two marks fight for the same area, merge the note or use a detail crop. Factories skim; density hides risk.",
        },
      ],
      ctaLabel: "Annotate in PackFlow",
    },
    zh: {
      title: "款式图怎么标注才方便工厂看？",
      description:
        "框选部位、引出说明、尺寸线怎么用：让工艺包图面可核对、少猜。",
      definition:
        "好的服装标注要写清部位名、指到图上准确区域，并与工艺或尺码行对应——读的人不用猜涂鸦含义。",
      audience: "打样前要在平铺图或照片上做标注的人。",
      sections: [
        {
          heading: "常用标注类型",
          bullets: [
            "区域 / 方框：工艺区域（领、门襟、袋布）",
            "引出 / 箭头：小细节附短说明",
            "尺寸线：从一个点到另一个点的 POM 与数值",
            "装饰笔迹：不要当成生产指令",
          ],
        },
        {
          heading: "清晰原则",
          bullets: [
            "一条标注一个意思，不要塞进太多内容",
            "图上的部位名与工艺表用同一套叫法",
            "工艺尽量标在彩平铺上；背面若仅示意请写明",
            "工具支持时锁定已完成标注，避免误拖",
          ],
        },
        {
          heading: "在 PackFlow 里",
          paragraphs: [
            `${BRAND_SHORT_NAME} 支持手动方框、尺寸线与 AI 辅助填写。可不登录先手动做；要用 AI 或云端再注册。`,
          ],
        },
      ],
      faq: [
        {
          question: "标在模特图还是平铺图？",
          answer:
            "平铺通常更清楚。只有模特图时，尽量裁到服装并注明含穿着松量。",
        },
        {
          question: "引出是不是越多越好？",
          answer:
            "同一区域打架就合并说明或用细节图。工厂是扫读的，过密反而藏风险。",
        },
      ],
      ctaLabel: "在 PackFlow 上标注",
    },
  },
  {
    slug: "size-chart-basics",
    publishedAt: PUB,
    updatedAt: PUB,
    series: "howto",
    relatedSlugs: [
      "tech-pack-vs-bom",
      "how-to-annotate-garment",
      "tech-pack-checklist",
    ],
    en: {
      title: "Apparel size chart basics (POM) for tech packs",
      description:
        "How to name POMs, set a sample size, write methods, and grade without confusing the factory.",
      definition:
        "A tech-pack size chart lists named points of measure (POM), a measurement method, and values for the sample size — optionally with grade rules for other sizes.",
      audience: "Teams adding measurements after drawings and BOM.",
      sections: [
        {
          heading: "Core fields",
          bullets: [
            "Part / POM name (e.g. Chest, Body length)",
            "Method (how to measure on the garment or body)",
            "Sample-size value in cm (state the size code)",
            "Optional grade / step for neighboring sizes",
          ],
        },
        {
          heading: "Practical tips",
          bullets: [
            "Match POM names to size lines on the image when possible",
            "Do not invent grades for stretch styles without a base fit",
            "Call out critical tolerances separately if the buyer requires them",
            "If a POM is unknown, leave it blank and labeled — do not fake numbers",
          ],
        },
        {
          heading: "In PackFlow",
          paragraphs: [
            `${BRAND_SHORT_NAME} links size rows to canvas size lines where possible, so changing a number can stay consistent with the drawing.`,
          ],
        },
      ],
      faq: [
        {
          question: "Sample size first or full size run first?",
          answer:
            "Lock the sample size with the factory first. Grade after the sample is accepted unless the buyer already fixed a grade rule.",
        },
        {
          question: "Body size vs garment size?",
          answer:
            "Say which you mean. Most factory tech packs use garment measurements on the finished sample.",
        },
      ],
      ctaLabel: "Edit size chart in PackFlow",
    },
    zh: {
      title: "工艺包尺码表（POM）基础",
      description:
        "怎么命名测量点、定基准码、写量法与跳码，减少工厂量错部位。",
      definition:
        "工艺包尺码表列出测量点名称（POM）、量法，以及基准码数值；需要时再写其它码的跳码规则。",
      audience: "图和物料大致齐了、开始补尺寸的人。",
      sections: [
        {
          heading: "核心字段",
          bullets: [
            "部位 / POM 名（如胸围、衣长）",
            "量法（在成衣或人体上怎么量）",
            "基准码数值（厘米，并写明码号）",
            "可选：相邻码档差 / 跳码",
          ],
        },
        {
          heading: "实用建议",
          bullets: [
            "POM 名尽量与图上尺寸线一致",
            "弹力款未定合身前，不要硬编全套跳码",
            "买家有公差要求时单独写清",
            "未知尺寸留空并标明，不要编数字",
          ],
        },
        {
          heading: "在 PackFlow 里",
          paragraphs: [
            `${BRAND_SHORT_NAME} 尽量把尺码行与画布尺寸线关联，改数字时更容易和图面一致。`,
          ],
        },
      ],
      faq: [
        {
          question: "先定基准码还是先做全码？",
          answer:
            "先与工厂锁定基准码样衣。除非买家已给跳码规则，否则样衣通过后再放码。",
        },
        {
          question: "号型寸还是成衣寸？",
          answer:
            "写清楚口径。工厂工艺包多数用成品样衣上的成衣测量。",
        },
      ],
      ctaLabel: "在 PackFlow 编辑尺码表",
    },
  },
  {
    slug: "for-pattern-makers",
    publishedAt: PUB,
    updatedAt: PUB,
    series: "roles",
    relatedSlugs: [
      "how-to-annotate-garment",
      "size-chart-basics",
      "tech-pack-checklist",
      "for-merchandisers",
    ],
    en: {
      title: "Tech packs for pattern makers: what to look for",
      description:
        "How pattern makers read tech packs — drawings, POM, construction notes, and revision hygiene before sampling.",
      definition:
        "For pattern makers, a useful tech pack shows clear flats or photos with part callouts, a sample-size POM chart with methods, and construction notes that match the drawings — not marketing copy alone.",
      audience: "Pattern makers and tech designers reviewing packs from brands or freelancers.",
      sections: [
        {
          heading: "What usually blocks sampling",
          bullets: [
            "Ambiguous which garment in a set is in scope",
            "POM names that do not match anything on the image",
            "Ops notes that contradict the drawing (e.g. zipper side)",
            "Missing sample size or mixed body vs garment measures",
          ],
        },
        {
          heading: "A pattern-friendly pack",
          bullets: [
            "Front flat (or clean product crop) plus critical details",
            "Callouts linked to short ops rows by the same part name",
            "Sample size locked; grades only after fit agree — or buyer rule attached",
            "Revision date when drawings change",
          ],
        },
        {
          heading: "Working with PackFlow packs",
          paragraphs: [
            `${BRAND_SHORT_NAME} keeps ops, BOM, and size beside the canvas so pattern review can check drawing and tables together. AI drafts still need human fit judgment.`,
          ],
        },
      ],
      faq: [
        {
          question: "Can AI replace pattern making?",
          answer:
            "No. AI can speed annotation and table drafts. Pattern makers own block, fit, and production risk.",
        },
        {
          question: "What if only a model photo is provided?",
          answer:
            "Ask for a flat or crop, and treat wearing ease as unknown until measured on a sample.",
        },
      ],
      ctaLabel: "Review a pack in PackFlow",
    },
    zh: {
      title: "版师看工艺包：先核对什么？",
      description:
        "版师视角：图面、POM、工艺说明与版本习惯——打样前少踩坑。",
      definition:
        "对版师来说，好用的工艺包要有清晰平铺/产品图与部位引出、带量法的基准码尺码表，以及与图面一致的工艺说明——不能只有营销文案。",
      audience: "接收品牌或自由设计师资料的版师、工艺师。",
      sections: [
        {
          heading: "常见卡打样的点",
          bullets: [
            "套装里到底做哪一件说不清",
            "尺码点名称在图上对不上",
            "工艺说明与图矛盾（如门襟左右）",
            "没写基准码，或号型寸与成衣寸混用",
          ],
        },
        {
          heading: "版师友好的包长什么样",
          bullets: [
            "正面平铺（或干净产品裁切）+ 关键细节",
            "引出与工艺表用同一套部位名",
            "先锁定基准码；跳码等合身确认或买家规则齐全再写",
            "改图就改版本日期",
          ],
        },
        {
          heading: "和 PackFlow 稿件协作",
          paragraphs: [
            `${BRAND_SHORT_NAME} 把工艺、物料、尺寸放在画布旁，便于对照图和表。AI 草稿仍需人工判断合身。`,
          ],
        },
      ],
      faq: [
        {
          question: "AI 能替代打版吗？",
          answer:
            "不能。AI 加快标注与表格；版型、合身与生产风险仍由版师负责。",
        },
        {
          question: "只有模特图怎么办？",
          answer:
            "尽量要平铺或裁切图；穿着松量在未量样前视为未知。",
        },
      ],
      ctaLabel: "在 PackFlow 核对工艺包",
    },
  },
  {
    slug: "for-merchandisers",
    publishedAt: PUB,
    updatedAt: PUB,
    series: "roles",
    relatedSlugs: [
      "tech-pack-checklist",
      "tech-pack-vs-bom",
      "how-to-make-tech-pack",
      "for-export-apparel",
    ],
    en: {
      title: "Tech packs for merchandisers: keep sampling moving",
      description:
        "A merchandiser’s view of tech packs — BOM readiness, TBD hygiene, factory questions, and version control.",
      definition:
        "Merchandisers use tech packs to align materials, timelines, and factory questions: a clear BOM, labeled unknowns, and one current revision reduce sampling delays.",
      audience: "Merchandisers, production coordinators, and brand ops.",
      sections: [
        {
          heading: "Your job in the pack",
          bullets: [
            "Style identity and which SKU / colorway the pack covers",
            "BOM rows buyers and factories can purchase against",
            "Open risks listed (fabric lead time, artwork pending)",
            "Single file/version everyone replies to",
          ],
        },
        {
          heading: "Speed without sloppy packs",
          paragraphs: [
            "Empty cells without labels create silent risk. Prefer “TBD — fabric mill X by date” over blank rows.",
            "When the factory asks a question, update the same project instead of scattering answers across chat screenshots.",
          ],
        },
        {
          heading: "In PackFlow",
          paragraphs: [
            `${BRAND_SHORT_NAME} stores the style as one project with export for sharing. Cloud sync (after sign-in) helps when design and merchandising sit on different devices.`,
          ],
        },
      ],
      faq: [
        {
          question: "Should merchandising own the size chart?",
          answer:
            "Often jointly with tech design. Merchandising should ensure the sample size and units are stated; pattern owns methods and fit.",
        },
        {
          question: "How many revisions are normal?",
          answer:
            "Expect several before bulk. Date each send so factories discard old PDFs.",
        },
      ],
      ctaLabel: "Organize a style in PackFlow",
    },
    zh: {
      title: "跟单怎么用工艺包推动打样？",
      description:
        "跟单视角：BOM 是否可采购、TBD 怎么写、工厂问答与版本怎么管。",
      definition:
        "跟单用工艺包对齐物料、交期与工厂问题：清晰 BOM、标明未知项、只维护一个当前版本，能明显减少打样延误。",
      audience: "跟单、生产协调、品牌运营。",
      sections: [
        {
          heading: "跟单在包里要盯的",
          bullets: [
            "款号身份、本包对应哪个色/SKU",
            "BOM 行是否够采购下单",
            "风险写明（面料交期、图稿未到）",
            "所有人回复同一份当前版本",
          ],
        },
        {
          heading: "要快，但不要糊",
          paragraphs: [
            "空格子又不说明，是静默风险。宁可写「TBD — 某日前面料厂确认」。",
            "工厂提问后，改同一项目，避免答案散落在聊天截图里。",
          ],
        },
        {
          heading: "在 PackFlow 里",
          paragraphs: [
            `${BRAND_SHORT_NAME} 以项目保存整款并可导出分享。登录后云端同步，方便设计与跟单不在同一台电脑。`,
          ],
        },
      ],
      faq: [
        {
          question: "尺码表该跟单负责吗？",
          answer:
            "常与工艺/版师共管。跟单确保写清基准码与单位；量法与合身由版师把关。",
        },
        {
          question: "改几版算正常？",
          answer:
            "大货前常有多轮。每次发送写日期，方便工厂丢掉旧 PDF。",
        },
      ],
      ctaLabel: "用 PackFlow 整理一款",
    },
  },
  {
    slug: "for-export-apparel",
    publishedAt: PUB,
    updatedAt: PUB,
    series: "roles",
    relatedSlugs: [
      "what-is-tech-pack",
      "tech-pack-checklist",
      "excel-vs-tech-pack-software",
      "for-merchandisers",
    ],
    en: {
      title: "English tech packs for export apparel",
      description:
        "What overseas buyers and factories expect in an English tech pack: labels, units, and bilingual habits.",
      definition:
        "An export-ready apparel tech pack uses clear English part and POM labels, states cm (or agreed units), and keeps drawings aligned with BOM and construction notes for overseas buyers and factories.",
      audience: "Export merchandisers and brands selling to US/EU buyers.",
      sections: [
        {
          heading: "Language & labeling",
          bullets: [
            "Prefer standard fashion English on tables (Collar, Placket, POM names)",
            "Keep Chinese notes if your domestic factory needs them — many teams ship bilingual packs",
            "Avoid slang or internal codes without a glossary",
          ],
        },
        {
          heading: "Units and fit culture",
          bullets: [
            "State cm vs inch explicitly",
            "Sample size code (e.g. M / 38) next to the chart",
            "Call out when a back view is illustrative, not a graded pattern",
          ],
        },
        {
          heading: "PackFlow angle",
          paragraphs: [
            `${BRAND_SHORT_NAME} can export packs with English-oriented labels for overseas review while you still draft in Chinese when preferred. Always human-check translations before buyer send.`,
          ],
        },
      ],
      faq: [
        {
          question: "Is machine translation enough?",
          answer:
            "For internal drafts maybe; for buyer/factory send, review stitch and fabric terms — wrong words cause wrong materials.",
        },
        {
          question: "Do buyers need full grade rules upfront?",
          answer:
            "Often sample first. Attach grade only when the buyer already fixed it or sample is approved.",
        },
      ],
      ctaLabel: "Export a pack from PackFlow",
    },
    zh: {
      title: "外贸服装英文工艺包要注意什么？",
      description:
        "给海外买家/工厂的英文工艺包：标签、单位、中英习惯与核对要点。",
      definition:
        "适合出口的英文工艺包使用清晰的英文部位与 POM 名称，标明厘米（或约定单位），并保证图面与 BOM、工艺说明一致，方便海外买家与工厂阅读。",
      audience: "外贸跟单、对接美欧买家的品牌方。",
      sections: [
        {
          heading: "语言与命名",
          bullets: [
            "表格优先用常见服装英语（Collar、Placket、POM 名）",
            "国内工厂需要时可保留中文——很多团队做中英对照",
            "内部代号若无注释，海外方看不懂",
          ],
        },
        {
          heading: "单位与合身口径",
          bullets: [
            "写清 cm 还是 inch",
            "尺码表旁标明基准码（如 M / 38）",
            "背面图若仅示意、非打版依据，请注明",
          ],
        },
        {
          heading: "和 PackFlow 的关系",
          paragraphs: [
            `${BRAND_SHORT_NAME} 可导出偏英文标签的工艺包，也支持你先用中文起草。发给买家前务必人工核对译文。`,
          ],
        },
      ],
      faq: [
        {
          question: "机翻够用吗？",
          answer:
            "内部草稿可以；发给买家/工厂前要核对面料与针法用词，译错会买错料。",
        },
        {
          question: "一开始就要全套跳码吗？",
          answer:
            "多数先打基准码样。买家已给规则或样衣通过后再附跳码。",
        },
      ],
      ctaLabel: "从 PackFlow 导出工艺包",
    },
  },
  {
    slug: "excel-vs-tech-pack-software",
    publishedAt: PUB,
    updatedAt: PUB,
    series: "compare",
    relatedSlugs: [
      "what-is-tech-pack",
      "ai-tech-pack-tools",
      "how-to-make-tech-pack",
      "tech-pack-checklist",
    ],
    en: {
      title: "Excel tech packs vs dedicated tech pack tools",
      description:
        "When spreadsheets are enough for apparel tech packs — and when a studio with drawings + tables linked works better.",
      definition:
        "Excel can store BOM and size charts, but dedicated tech pack tools keep drawings, annotations, and tables in one revision — reducing mismatched files when factories sample.",
      audience: "Teams choosing between spreadsheet packs and product studios.",
      sections: [
        {
          heading: "Where Excel still wins",
          bullets: [
            "Purchasing already lives in sheets",
            "Very simple styles with one photo and short notes",
            "Buyers who only accept a specific spreadsheet template",
          ],
        },
        {
          heading: "Where Excel gets painful",
          bullets: [
            "Drawings in chat, tables in Drive, versions disagree",
            "Callouts that do not link to ops rows",
            "Hard to show AI-assisted views or region edits next to data",
          ],
        },
        {
          heading: "A practical split",
          paragraphs: [
            "Many teams draft the visual pack in a studio, then export Excel/PDF for purchasing or factory SOPs. PackFlow targets the linked drawing + tables step — not replacing every ERP sheet.",
          ],
        },
      ],
      faq: [
        {
          question: "Must I abandon Excel?",
          answer:
            "No. Keep Excel for purchasing if needed; keep one visual source of truth for sampling.",
        },
        {
          question: "What should I migrate first?",
          answer:
            "Styles with heavy email confusion around images and sizes — highest pain, clearest win.",
        },
      ],
      ctaLabel: "Try a linked pack in PackFlow",
    },
    zh: {
      title: "Excel 做工艺包 vs 专用工具",
      description:
        "表格什么时候够用，什么时候更适合「图+表一体」的工艺包工作室。",
      definition:
        "Excel 能存 BOM 与尺码表；专用工艺包工具把图纸、标注与表格放在同一版本里，减少工厂打样时文件对不上。",
      audience: "在表格包和产品工作室之间做选择的团队。",
      sections: [
        {
          heading: "Excel 仍然合适的时候",
          bullets: [
            "采购流程已经在表格里",
            "极简款：一张图 + 很短说明",
            "买家只收指定 Excel 模板",
          ],
        },
        {
          heading: "Excel 容易痛苦的地方",
          bullets: [
            "图在聊天、表在网盘，版本对不齐",
            "引出与工艺行对不上",
            "难把 AI 补视角/局部修改与数据放一起看",
          ],
        },
        {
          heading: "务实分工",
          paragraphs: [
            "很多团队在工作室做「可视工艺包」，再导出 Excel/PDF 给采购或工厂。PackFlow 针对图+表联动这一步，不是替代所有 ERP 表格。",
          ],
        },
      ],
      faq: [
        {
          question: "必须丢掉 Excel 吗？",
          answer:
            "不必。采购可继续用表；打样保留一个可视的「当前真相」来源。",
        },
        {
          question: "先迁哪类款？",
          answer:
            "图和尺寸邮件扯皮最多的款——痛点最大、收益最明显。",
        },
      ],
      ctaLabel: "在 PackFlow 试图+表一体",
    },
  },
  {
    slug: "ai-tech-pack-tools",
    publishedAt: PUB,
    updatedAt: PUB,
    series: "compare",
    relatedSlugs: [
      "what-is-tech-pack",
      "how-to-make-tech-pack",
      "how-to-annotate-garment",
      "excel-vs-tech-pack-software",
    ],
    en: {
      title: "Are AI tech pack tools reliable? Where they help",
      description:
        "Honest scope for AI in apparel tech packs: drafts, views, and tables — plus what still needs humans.",
      definition:
        "AI tech pack tools can draft annotations, BOM/ops/size suggestions, and extra views from style photos; humans must confirm the target garment, fit-critical measures, and factory-facing wording before sampling.",
      audience: "Teams evaluating AI assist for tech packs without over-trusting automation.",
      sections: [
        {
          heading: "High-value AI jobs",
          bullets: [
            "First-pass part suggestions on a clear front image",
            "Draft BOM / ops / remarks to edit, not to ship blindly",
            "Extra color views or line art after the garment is confirmed",
          ],
        },
        {
          heading: "Keep humans in the loop",
          bullets: [
            "Multi-garment photos: confirm which piece is in scope",
            "Critical POM and stretch grades",
            "Buyer-facing English terms and material codes",
          ],
        },
        {
          heading: "How PackFlow positions AI",
          paragraphs: [
            `${BRAND_SHORT_NAME} lets you annotate manually anytime (including as a guest). AI runs after sign-in with monthly credits; cancel or skip when you prefer to work by hand. Treat AI as a draft accelerator inside a real tech pack studio.`,
          ],
        },
      ],
      faq: [
        {
          question: "Will AI send a pack to the factory for me?",
          answer:
            "You should still review and export. AI does not own factory liability.",
        },
        {
          question: "What image works best?",
          answer:
            "Sharp front views, long edge around 2000px or less, single target garment when possible.",
        },
      ],
      ctaLabel: "Try AI assist in PackFlow",
    },
    zh: {
      title: "AI 做工艺包靠谱吗？适合哪些环节？",
      description:
        "如实讲清 AI 在工艺包里能加速什么、哪里必须人工把关。",
      definition:
        "AI 工艺包工具可从款式图草稿标注、物料/工艺/尺码建议与补视角；发样前仍须人工确认目标单款、合身关键尺寸与给工厂的措辞。",
      audience: "想用 AI 加速、又不想过度信任自动化的团队。",
      sections: [
        {
          heading: "AI 更有价值的环节",
          bullets: [
            "清晰正面图上的部位初稿",
            "BOM / 工艺 / 评语草稿（可改，不要盲发）",
            "确认单款后再补彩图视角或线稿",
          ],
        },
        {
          heading: "必须人看的地方",
          bullets: [
            "一图多件：先确认做哪一件",
            "关键 POM 与弹力跳码",
            "给买家的英文用词与物料编码",
          ],
        },
        {
          heading: "PackFlow 怎么定位 AI",
          paragraphs: [
            `${BRAND_SHORT_NAME} 可随时手动标注（含访客）。登录后按月额度用 AI；想手做可跳过或取消。把 AI 当作工作室里的草稿加速器，而不是自动发包机器人。`,
          ],
        },
      ],
      faq: [
        {
          question: "AI 会直接发给工厂吗？",
          answer:
            "仍需你核对并导出。工厂责任不在 AI。",
        },
        {
          question: "什么样的图最好用？",
          answer:
            "清晰正面、长边约 2000px 以内，尽量一张图一个目标款。",
        },
      ],
      ctaLabel: "在 PackFlow 试用 AI",
    },
  },
];

export function listArticles(): ArticleRecord[] {
  return ARTICLES;
}

export function getArticleBySlug(slug: string): ArticleRecord | undefined {
  return ARTICLES.find((a) => a.slug === slug);
}

export function listArticleSlugs(): string[] {
  return ARTICLES.map((a) => a.slug);
}
