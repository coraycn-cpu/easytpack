import type { ArticleRecord } from "@/lib/content/articles/types";
import { BRAND_SHORT_NAME } from "@/lib/brand";

const PUB = "2026-08-05";

/**
 * 第四批：品类（外套/裙装）+ 痛点（跳码/印绣花/样衣码/工艺说明/版本）
 * 易收录结构：问句标题 + 速答 + 要点 + 步骤/清单 + FAQ；EN 优先，ZH 同步。
 */
export const CATEGORY_PAIN_BATCH: ArticleRecord[] = [
  {
    slug: "jacket-tech-pack-guide",
    publishedAt: PUB,
    updatedAt: PUB,
    series: "howto",
    relatedSlugs: [
      "hoodie-tech-pack-guide",
      "how-to-write-garment-bom",
      "how-to-annotate-garment",
      "print-embroidery-tech-pack",
    ],
    en: {
      title: "How to make a jacket tech pack",
      description:
        "Jacket tech pack checklist: shell, lining, closures, insulation, and POMs factories check first.",
      definition:
        "A jacket tech pack needs clear outer and lining views, callouts for closures and pockets, a BOM covering shell/lining/insulation/hardware, and POMs such as chest, length, sleeve, and shoulder for the sample size.",
      audience: "Teams sampling fashion or outdoor jackets.",
      keyTakeaways: [
        "Show shell and lining (or note if unlined)",
        "Call out zipper/button, storm flap, and pocket bags",
        "BOM: shell, lining, fill, zipper, snaps, tape",
        "POMs: chest, body length, sleeve, shoulder, hem",
      ],
      sections: [
        {
          heading: "Must-annotate jacket areas",
          bullets: [
            "Closure type and direction",
            "Collar / hood / stand construction",
            "Pocket placement and bag depth",
            "Hem and cuff finishes",
            "Any reflective or branding patches",
          ],
        },
        {
          heading: "Typical jacket BOM rows",
          bullets: [
            "Shell fabric",
            "Lining",
            "Insulation / padding if any",
            "Main zipper + puller",
            "Snaps, Velcro, or buttons",
            "Seam tape or binder when required",
          ],
        },
      ],
      steps: [
        {
          title: "Upload front flat (and lining view if critical)",
          body: "Add a back view for vents and shoulder seams when they matter.",
        },
        {
          title: "Annotate closures and pockets",
          body: "Short callouts linked to ops rows beat long paragraphs.",
        },
        {
          title: "Fill BOM and sample POMs",
          body: "Do not forget hardware. State cm and sample size.",
        },
        {
          title: "Ask factory to confirm zipper & lining first",
          body: "These drive most early jacket sample comments.",
        },
      ],
      faq: [
        {
          question: "Do I need a separate lining flat?",
          answer:
            "If lining construction is complex, yes. Otherwise a callout photo or note can be enough.",
        },
        {
          question: "How do I show insulation?",
          answer:
            "List gsm or fill power on the BOM and note quilt pattern on the drawing.",
        },
        {
          question: "Can PackFlow handle jacket packs?",
          answer: `${BRAND_SHORT_NAME} supports multi-view boards, BOM, size, and export for jackets like other categories.`,
        },
      ],
      ctaLabel: "Start a jacket pack in PackFlow",
    },
    zh: {
      title: "外套 / 夹克工艺包怎么做？",
      description:
        "夹克专项：面料与里料、门襟、填充、五金，以及工厂常看的尺寸点。",
      definition:
        "夹克工艺包需要清晰的外层与里料示意、门襟与口袋引出、BOM 覆盖面料/里料/填充/五金，以及胸围、衣长、袖长、肩宽等基准码 POM。",
      audience: "打时装或户外夹克样的团队。",
      keyTakeaways: [
        "有里要出里；无里写明",
        "标清拉链/纽扣、风襟、袋布",
        "BOM：面、里、棉、拉链、四合扣、压胶条等",
        "POM：胸围、衣长、袖长、肩宽、下摆",
      ],
      sections: [
        {
          heading: "必须标到的区域",
          bullets: [
            "门襟类型与方向",
            "领 / 帽 / 立领结构",
            "口袋位置与袋深",
            "下摆与袖口收口",
            "反光条或商标章",
          ],
        },
        {
          heading: "常见夹克 BOM 行",
          bullets: [
            "主身面料",
            "里料",
            "填充 / 棉（如有）",
            "主拉链 + 拉片",
            "四合扣、魔术贴或纽扣",
            "需要时的压胶条或包边条",
          ],
        },
      ],
      steps: [
        {
          title: "上传正面平铺（关键时补里料图）",
          body: "背面补气眼、肩缝等关键结构。",
        },
        {
          title: "标注门襟与口袋",
          body: "短引出 + 工艺行，比长文有效。",
        },
        {
          title: "填 BOM 与基准码 POM",
          body: "别漏五金。写明厘米与码号。",
        },
        {
          title: "请工厂先确认拉链与里料",
          body: "头版意见多半出在这两处。",
        },
      ],
      faq: [
        {
          question: "一定要单独里料图吗？",
          answer: "里料复杂时建议有；简单可用引出或细节图。",
        },
        {
          question: "填充怎么写？",
          answer: "BOM 写克重或充绒量，图上注明绗缝样式。",
        },
        {
          question: "PackFlow 适合夹克吗？",
          answer: `${BRAND_SHORT_NAME} 支持多视角、物料、尺码与导出，夹克同样适用。`,
        },
      ],
      ctaLabel: "在 PackFlow 做夹克工艺包",
    },
  },
  {
    slug: "dress-tech-pack-guide",
    publishedAt: PUB,
    updatedAt: PUB,
    series: "howto",
    relatedSlugs: [
      "skirt-size-chart-pom",
      "how-to-annotate-garment",
      "print-embroidery-tech-pack",
      "how-to-make-tech-pack",
    ],
    en: {
      title: "How to make a dress tech pack",
      description:
        "Dress tech pack basics: silhouette callouts, lining, closure, length POMs, and hem finishes.",
      definition:
        "A dress tech pack should show the silhouette clearly, annotate neckline, closure, and hem, list shell/lining/trim on the BOM, and include POMs such as bust, waist, hip, and length for the sample size.",
      audience: "Teams sampling day dresses, slips, or occasion dresses.",
      keyTakeaways: [
        "State length definition (from HPS, CB, or waist seam)",
        "Call out neckline, zipper, slit, and lining",
        "BOM includes lining and closure hardware",
        "POMs: bust, waist, hip, length — plus sweep if needed",
      ],
      sections: [
        {
          heading: "Dress areas to annotate",
          bullets: [
            "Neckline and facing / binding",
            "Side or CB zipper",
            "Waist seam or empire line",
            "Hem type and slit height",
            "Lining join if partial lined",
          ],
        },
      ],
      steps: [
        {
          title: "Upload a front flat (add back for zipper)",
          body: "Side view helps for fit and slit if critical.",
        },
        {
          title: "Annotate closure, neckline, hem",
          body: "Link each mark to a short ops row.",
        },
        {
          title: "Fill BOM and length POMs carefully",
          body: "Write how length is measured to avoid factory disputes.",
        },
        {
          title: "Confirm lining and zipper with the factory",
          body: "These affect cost and lead time early.",
        },
      ],
      faq: [
        {
          question: "Do I need both bust and chest?",
          answer:
            "Use one clear name and method. “Bust” is common for dresses — define the measure line.",
        },
        {
          question: "What about stretch knits?",
          answer:
            "Note fabric stretch % and whether POMs are relaxed garment measures.",
        },
        {
          question: "Can PackFlow build dress packs?",
          answer: `Yes — annotate and table the dress in ${BRAND_SHORT_NAME}, then export for sampling.`,
        },
      ],
      ctaLabel: "Start a dress pack in PackFlow",
    },
    zh: {
      title: "连衣裙工艺包怎么做？",
      description:
        "连衣裙要点：廓形引出、里料、门襟/拉链、长度量法与下摆。",
      definition:
        "连衣裙工艺包要清晰展示廓形，标出领口、门襟/拉链与下摆，BOM 含面料/里料/辅料，尺码含胸围、腰围、臀围与衣长等基准码 POM。",
      audience: "打日常裙、吊带裙或礼服裙样的团队。",
      keyTakeaways: [
        "写清衣长定义（肩点、后中或腰缝起量）",
        "标领口、拉链、开衩、里料",
        "BOM 含里料与门襟五金",
        "POM：胸、腰、臀、衣长——需要时加摆围",
      ],
      sections: [
        {
          heading: "要标到的区域",
          bullets: [
            "领口与贴边 / 包边",
            "侧缝或后中拉链",
            "腰节或高腰线",
            "下摆类型与开衩高度",
            "局部里料的接合位置",
          ],
        },
      ],
      steps: [
        {
          title: "上传正面平铺（拉链看背面）",
          body: "开衩或合身关键时可补侧面。",
        },
        {
          title: "标注门襟、领口、下摆",
          body: "每条引出对应短工艺行。",
        },
        {
          title: "认真填 BOM 与衣长 POM",
          body: "衣长量法写清，避免工厂争议。",
        },
        {
          title: "与工厂确认里料和拉链",
          body: "直接影响成本与交期。",
        },
      ],
      faq: [
        {
          question: "胸围和胸宽都要写吗？",
          answer: "用一个清晰名称和量法即可。连衣裙常用「胸围」并定义量线。",
        },
        {
          question: "弹力针织裙？",
          answer: "注明弹力，并说明 POM 是否为成衣松量尺寸。",
        },
        {
          question: "PackFlow 能做裙装吗？",
          answer: `可以 — 在 ${BRAND_SHORT_NAME} 标注并填表后导出打样。`,
        },
      ],
      ctaLabel: "在 PackFlow 做连衣裙工艺包",
    },
  },
  {
    slug: "skirt-size-chart-pom",
    publishedAt: PUB,
    updatedAt: PUB,
    series: "howto",
    relatedSlugs: [
      "pants-size-chart-pom",
      "what-is-pom-apparel",
      "dress-tech-pack-guide",
      "size-chart-basics",
    ],
    en: {
      title: "Skirt size chart: essential POMs",
      description:
        "Which POMs to include for skirts — waist, hip, length, sweep — and how to measure them.",
      definition:
        "A skirt size chart should include waist, hip, and length POMs with clear methods, plus hem sweep or slit height when style-critical, all filled for the sample size.",
      audience: "Anyone documenting skirts in a tech pack.",
      keyTakeaways: [
        "Minimum: waist, hip, length",
        "Add sweep for flared hems; slit height when open",
        "Define length start point (waist seam vs top edge)",
        "Elastic waists: list relaxed and stretched waist",
      ],
      sections: [
        {
          heading: "Core skirt POMs",
          bullets: [
            "Waist",
            "Hip (at stated distance below waist)",
            "Length (center front / center back — say which)",
            "Hem sweep / circumference",
            "Slit height from hem if any",
          ],
        },
      ],
      steps: [
        {
          title: "Pick POMs for the silhouette",
          body: "Pencil skirts need hip control; circle skirts need sweep.",
        },
        {
          title: "Write one-line methods",
          body: "Example: “Length CB — waist seam to hem along center back.”",
        },
        {
          title: "Fill sample values and mark TBD grades",
          body: "Do not invent full size runs before sample approval.",
        },
        {
          title: "Match size lines on the flat",
          body: "Waist vs hip lines should be obvious on the image.",
        },
      ],
      faq: [
        {
          question: "Front length or back length?",
          answer:
            "State both if they differ (shaped hems). Otherwise pick CB or CF and stay consistent.",
        },
        {
          question: "Where is hip measured?",
          answer:
            "Specify cm below waist (e.g. 18–20 cm) or “fullest hip” — do not leave it vague.",
        },
        {
          question: "Does PackFlow support skirt charts?",
          answer: `Yes — build skirt POMs and size lines in ${BRAND_SHORT_NAME} like other bottoms.`,
        },
      ],
      ctaLabel: "Build a skirt chart in PackFlow",
    },
    zh: {
      title: "半身裙尺码表要写哪些 POM？",
      description:
        "半裙常用测量点：腰围、臀围、裙长、摆围，以及量法怎么写才不歧义。",
      definition:
        "半身裙尺码表应包含腰围、臀围与裙长，并写清量法；摆围或开衩高度在款式关键时补上，全部按基准码填写。",
      audience: "要在工艺包里做半裙尺寸的人。",
      keyTakeaways: [
        "最少：腰围、臀围、裙长",
        "大摆补摆围；有开衩写开衩高",
        "裙长起点写清（腰缝还是上口）",
        "松紧腰：写松量腰与拉量腰",
      ],
      sections: [
        {
          heading: "半裙核心 POM",
          bullets: [
            "腰围",
            "臀围（写明腰下多少厘米）",
            "裙长（前中 / 后中——写明）",
            "下摆围 / 摆宽",
            "如有开衩：距下摆高度",
          ],
        },
      ],
      steps: [
        {
          title: "按廓形选 POM",
          body: "包臀裙重臀围；大摆裙重摆围。",
        },
        {
          title: "每条写一行量法",
          body: "例如：「后中裙长 — 腰缝沿后中至下摆」。",
        },
        {
          title: "填基准码，跳码未定标 TBD",
          body: "样衣通过前不要硬编全码。",
        },
        {
          title: "图上画对应尺寸线",
          body: "腰线与臀线要一眼能分。",
        },
      ],
      faq: [
        {
          question: "前长还是后长？",
          answer: "前后不同（如鱼尾）就两个都写；否则固定前中或后中。",
        },
        {
          question: "臀围量在哪？",
          answer: "写清腰下厘米数或「臀最丰处」，不要含糊。",
        },
        {
          question: "PackFlow 支持半裙表吗？",
          answer: `支持 — 在 ${BRAND_SHORT_NAME} 做半裙 POM 与尺寸线即可。`,
        },
      ],
      ctaLabel: "在 PackFlow 做半裙尺码表",
    },
  },
  {
    slug: "how-to-grade-size-chart",
    publishedAt: PUB,
    updatedAt: PUB,
    series: "howto",
    relatedSlugs: [
      "size-chart-basics",
      "what-is-pom-apparel",
      "what-is-sample-size-apparel",
      "pants-size-chart-pom",
    ],
    en: {
      title: "How to grade a size chart (apparel jump sizes)",
      description:
        "When and how to add grade rules to a tech pack size chart — after sample lock, with clear steps per POM.",
      definition:
        "Grading a size chart means adding step values (jump sizes) from a locked sample size to other sizes for each POM; do it after sample approval or when the buyer already provides a grade rule — never invent stretch grades blindly.",
      audience: "Merchandisers and tech designers expanding beyond sample size.",
      keyTakeaways: [
        "Lock sample size and methods first",
        "Grade per POM — not one magic number for everything",
        "Prefer “fill empty cells” over overwriting hand edits",
        "Document the base size and unit on every send",
      ],
      sections: [
        {
          heading: "When to grade",
          bullets: [
            "Sample fit approved, or",
            "Buyer supplied a fixed grade rule, or",
            "Re-order of a known block with historical steps",
          ],
        },
        {
          heading: "Risks of early grading",
          paragraphs: [
            "Grading before fit locks wrong proportions into every size. Stretch fabrics and tailored jackets are especially sensitive.",
          ],
        },
      ],
      steps: [
        {
          title: "Confirm sample size values",
          body: "Every critical POM should be filled and method-clear.",
        },
        {
          title: "Set step (grade) per POM",
          body: "Chest may jump 2 cm; length may jump 1 cm — they differ.",
        },
        {
          title: "Generate other sizes",
          body: "Fill empty cells from the base; protect hand-edited values if your tool allows.",
        },
        {
          title: "Spot-check extremes",
          body: "Review smallest and largest size for impossible openings.",
        },
        {
          title: "Export with base size called out",
          body: "Factories must know which column is the sample anchor.",
        },
      ],
      faq: [
        {
          question: "Is grade the same as tolerance?",
          answer:
            "No. Grade is the step between sizes. Tolerance is allowed variance in production.",
        },
        {
          question: "Who owns the grade rule?",
          answer:
            "Often the buyer or pattern team. Merchandising should not invent grades silently.",
        },
        {
          question: "Does PackFlow support grading?",
          answer: `${BRAND_SHORT_NAME} size tools support sample values and grade workflows in the size editor — always human-check results.`,
        },
      ],
      ctaLabel: "Grade sizes in PackFlow",
    },
    zh: {
      title: "服装尺码表怎么跳码 / 放码？",
      description:
        "何时写跳码、按 POM 设档差、如何从基准码生成其它码——避免未合身就乱放码。",
      definition:
        "跳码/放码是在锁定的基准码之上，为每个 POM 设定档差并生成其它码数值；应在样衣确认后，或买家已给规则时再做——不要对弹力款盲目编全码。",
      audience: "要从基准码扩展到多码的跟单与工艺。",
      keyTakeaways: [
        "先锁定基准码与量法",
        "按 POM 设档差，不要一个数打天下",
        "优先「只填空格」，别覆盖手改",
        "每次发送标明基准码与单位",
      ],
      sections: [
        {
          heading: "什么时候跳码",
          bullets: [
            "样衣合身已确认，或",
            "买家已给固定跳码规则，或",
            "老款复单且有历史档差",
          ],
        },
        {
          heading: "过早跳码的风险",
          paragraphs: [
            "合身未定就放码，错误比例会进所有码。弹力料与修身外套尤其敏感。",
          ],
        },
      ],
      steps: [
        {
          title: "确认基准码数值",
          body: "关键 POM 填齐且量法清楚。",
        },
        {
          title: "按 POM 设档差",
          body: "胸围可能 +2cm，衣长 +1cm——各不相同。",
        },
        {
          title: "生成其它码",
          body: "从基准码填空；工具支持时保护已手改格。",
        },
        {
          title: "抽查最小码与最大码",
          body: "看开口、腰围是否不合理。",
        },
        {
          title: "导出并标明基准码列",
          body: "工厂必须知道哪一列是样衣锚点。",
        },
      ],
      faq: [
        {
          question: "跳码等于公差吗？",
          answer: "不等于。跳码是码差；公差是大货允许偏差。",
        },
        {
          question: "谁定跳码规则？",
          answer: "常是买家或版房。跟单不要默默自编。",
        },
        {
          question: "PackFlow 支持跳码吗？",
          answer: `${BRAND_SHORT_NAME} 尺码编辑支持基准码与跳码流程——结果务必人工核对。`,
        },
      ],
      ctaLabel: "在 PackFlow 做跳码",
    },
  },
  {
    slug: "print-embroidery-tech-pack",
    publishedAt: PUB,
    updatedAt: PUB,
    series: "howto",
    relatedSlugs: [
      "how-to-annotate-garment",
      "how-to-write-garment-bom",
      "jacket-tech-pack-guide",
      "tech-pack-checklist",
    ],
    en: {
      title: "How to spec print and embroidery in a tech pack",
      description:
        "Placement, size, colors, and files: what factories need for print/embroidery callouts in apparel tech packs.",
      definition:
        "To spec print or embroidery in a tech pack: show placement on the garment image, give finished size, list colors/threads, attach artwork files, and add matching BOM rows so purchasing and production use the same reference.",
      audience: "Designers and merchandisers with logos, graphics, or embroidery.",
      keyTakeaways: [
        "Placement sketch + measurements from landmarks (HPS, center front)",
        "Finished width × height of the design",
        "Colorways / pantone / thread codes",
        "Artwork file name + BOM row for print/embroidery",
      ],
      sections: [
        {
          heading: "What to put on the drawing",
          bullets: [
            "Box or outline of the design area",
            "Distance from neckline / CF / pocket",
            "Note “do not scale” if size is locked",
          ],
        },
        {
          heading: "What to put in tables",
          bullets: [
            "BOM: print method or embroidery type",
            "Ink / thread colors",
            "Backing or underbase if required",
            "Link to file version (date in filename)",
          ],
        },
      ],
      steps: [
        {
          title: "Place the artwork on the garment view",
          body: "Use the same artboard the factory will sew from.",
        },
        {
          title: "Measure placement and size",
          body: "Write cm from clear landmarks; avoid “about the chest”.",
        },
        {
          title: "Add BOM + color notes",
          body: "One row per technique if print and embroidery both exist.",
        },
        {
          title: "Attach files and version them",
          body: "AI or PNG/PDF as required; bump date when art changes.",
        },
      ],
      faq: [
        {
          question: "Vector or raster?",
          answer:
            "Follow the factory. Embroidery digitizing often needs vector; some printers accept high-res PNG.",
        },
        {
          question: "What if placement is approximate?",
          answer:
            "Say so and give a tolerance — silent “approximate” causes disputes.",
        },
        {
          question: "Can PackFlow show placement?",
          answer: `${BRAND_SHORT_NAME} callouts and detail views mark placement; attach final art per your send process.`,
        },
      ],
      ctaLabel: "Mark placement in PackFlow",
    },
    zh: {
      title: "工艺包里印花 / 绣花怎么标注？",
      description:
        "位置、尺寸、颜色与文件：工厂做印绣花需要的工艺包信息清单。",
      definition:
        "在工艺包里做印花/绣花：在款式图上标位置与成品尺寸，列出颜色/线色，附上图稿文件，并在 BOM 建对应行，让采购与生产用同一套依据。",
      audience: "有 logo、图案或绣花的设计与跟单。",
      keyTakeaways: [
        "位置示意 + 相对肩点/前中等的尺寸",
        "图案成品宽 × 高",
        "色号 / 潘通 / 绣线色",
        "图稿文件名 + BOM 印绣花行",
      ],
      sections: [
        {
          heading: "图上写什么",
          bullets: [
            "图案区域框或轮廓",
            "距领口 / 前中 / 口袋的距离",
            "尺寸锁定则注明「不可缩放」",
          ],
        },
        {
          heading: "表上写什么",
          bullets: [
            "BOM：印花工艺或绣花类型",
            "墨色 / 线色",
            "需要时的衬底或底浆",
            "文件版本（文件名带日期）",
          ],
        },
      ],
      steps: [
        {
          title: "在成衣视角上摆好图稿位置",
          body: "用工厂会照着做的那张图。",
        },
        {
          title: "量位置和大小",
          body: "用清晰基准点写厘米；避免「大概在胸口」。",
        },
        {
          title: "补 BOM 与颜色说明",
          body: "印和绣都有时分行写。",
        },
        {
          title: "附图并改版本",
          body: "按工厂要求附 AI/PNG/PDF；改稿就改日期。",
        },
      ],
      faq: [
        {
          question: "要矢量还是位图？",
          answer: "听工厂。绣花打版常要矢量；部分印花收高清 PNG。",
        },
        {
          question: "位置只是大概怎么办？",
          answer: "写明并给公差——含糊的「大概」最易扯皮。",
        },
        {
          question: "PackFlow 能标位置吗？",
          answer: `${BRAND_SHORT_NAME} 可用引出与细节图标位置；终稿图按发送流程附件。`,
        },
      ],
      ctaLabel: "在 PackFlow 标印绣位置",
    },
  },
  {
    slug: "what-is-sample-size-apparel",
    publishedAt: PUB,
    updatedAt: PUB,
    series: "fundamentals",
    relatedSlugs: [
      "how-to-grade-size-chart",
      "size-chart-basics",
      "how-to-send-tech-pack-to-factory",
      "what-is-pom-apparel",
    ],
    en: {
      title: "What is sample size in apparel tech packs?",
      description:
        "Sample size is the fit size you develop first — how to name it, measure it, and communicate it to factories.",
      definition:
        "Sample size (also called base size or fit size) is the size code you develop and measure first in a tech pack — all POMs on the chart should be filled for that size before grading other sizes.",
      audience: "Anyone writing size charts or sending first samples.",
      keyTakeaways: [
        "One clear sample size code (e.g. M or 38)",
        "All critical POMs filled for that size",
        "Methods written so the factory measures the same way",
        "Grade other sizes only after fit lock (usually)",
      ],
      sections: [
        {
          heading: "Why sample size matters",
          paragraphs: [
            "Factories cut the first sample to this size. If the code or measurements are fuzzy, every later size inherits the confusion.",
          ],
        },
        {
          heading: "How to state it on the pack",
          bullets: [
            "Size code next to the chart title",
            "Unit (cm/inch)",
            "Body vs garment measure note",
            "Date of the measurement set",
          ],
        },
      ],
      faq: [
        {
          question: "Is sample size always Medium?",
          answer:
            "No. Many brands use a numeric base (e.g. 38) or a specific fit model size. Pick one and stay consistent.",
        },
        {
          question: "Can I sample two sizes at once?",
          answer:
            "Possible but clarify which chart is master. Most teams lock one base first.",
        },
        {
          question: "How does PackFlow show sample size?",
          answer: `${BRAND_SHORT_NAME} size charts use a base/sample column as the anchor for values and grading.`,
        },
      ],
      ctaLabel: "Set sample size in PackFlow",
    },
    zh: {
      title: "工艺包里的基准码 / 样衣码是什么？",
      description:
        "样衣码（基准码）是先打样、先填尺码的那一码——怎么命名、怎么告诉工厂。",
      definition:
        "样衣码（也称基准码、fit size）是工艺包里先开发、先测量的那个码号；尺码表上关键 POM 应先填齐这一码，再考虑跳其它码。",
      audience: "写尺码表或发头版的人。",
      keyTakeaways: [
        "写清一个样衣码（如 M 或 38）",
        "该码关键 POM 填齐",
        "量法写清，工厂才能同法复量",
        "通常合身锁定后再跳其它码",
      ],
      sections: [
        {
          heading: "为什么样衣码重要",
          paragraphs: [
            "工厂按这一码裁头版。码号或尺寸含糊，后面所有码都会跟着乱。",
          ],
        },
        {
          heading: "在包上怎么写",
          bullets: [
            "尺码表标题旁写码号",
            "单位（cm/inch）",
            "注明成衣寸还是号型寸",
            "测量数据的日期",
          ],
        },
      ],
      faq: [
        {
          question: "样衣码一定是 M 吗？",
          answer: "不一定。很多品牌用数字基码（如 38）或指定模特码。选定后保持一致。",
        },
        {
          question: "可以同时打两码样吗？",
          answer: "可以，但要写明哪张表是主表。多数团队先锁一码。",
        },
        {
          question: "PackFlow 如何体现基准码？",
          answer: `${BRAND_SHORT_NAME} 尺码表以基准码列作为数值与跳码的锚点。`,
        },
      ],
      ctaLabel: "在 PackFlow 设基准码",
    },
  },
  {
    slug: "how-to-write-construction-notes",
    publishedAt: PUB,
    updatedAt: PUB,
    series: "howto",
    relatedSlugs: [
      "how-to-annotate-garment",
      "tech-pack-vs-bom",
      "common-factory-tech-pack-questions",
      "how-to-make-tech-pack",
    ],
    en: {
      title: "How to write construction notes in a tech pack",
      description:
        "Clear ops / construction notes: part name, stitch, seam, finish — linked to callouts on the drawing.",
      definition:
        "Construction notes (ops) in a tech pack describe how each part is sewn: part name, stitch or seam type, allowance, and finish — ideally using the same names as callouts on the garment image.",
      audience: "Designers turning drawings into factory-readable instructions.",
      keyTakeaways: [
        "One part name across drawing and ops table",
        "Say stitch / seam / finish, not only “nice quality”",
        "Link notes to boxed regions when possible",
        "Short rows beat essays nobody reads",
      ],
      sections: [
        {
          heading: "What a useful ops row contains",
          bullets: [
            "Part name (Collar, Side seam, Hem…)",
            "Process description",
            "Stitch or seam type",
            "Seam allowance if critical",
          ],
        },
        {
          heading: "Common mistakes",
          bullets: [
            "Marketing adjectives with no sew method",
            "Part names that do not match the drawing",
            "Contradicting left/right or front/back",
          ],
        },
      ],
      steps: [
        {
          title: "List parts from the drawing",
          body: "Walk neckline to hem; create one ops row per critical part.",
        },
        {
          title: "Add stitch and seam detail",
          body: "Example: “Coverstitch hem, 2.5 cm turn.”",
        },
        {
          title: "Match callout names",
          body: "If the box says “Placket”, the ops row says “Placket”.",
        },
        {
          title: "Review contradictions",
          body: "Zipper side, pocket direction, and topstitch color are frequent bugs.",
        },
      ],
      faq: [
        {
          question: "Ops vs BOM?",
          answer:
            "Ops = how to sew. BOM = what materials to use. Both are required.",
        },
        {
          question: "How detailed is enough?",
          answer:
            "Enough that two factories would sew the same join. Critical joins need more detail than decorative topstitch.",
        },
        {
          question: "Can PackFlow store ops notes?",
          answer: `Yes — ${BRAND_SHORT_NAME} process/ops tab sits beside the canvas and can link to regions.`,
        },
      ],
      ctaLabel: "Write ops in PackFlow",
    },
    zh: {
      title: "工艺包里的工艺说明怎么写？",
      description:
        "部位名、针法、缝份、收口：写清工序说明，并与图上引出同名对应。",
      definition:
        "工艺包中的工艺/工序说明描述各部位怎么缝：部位名、针法或缝型、缝份与收口——最好与款式图引出使用同一套名称。",
      audience: "要把图面变成工厂可读指令的设计师。",
      keyTakeaways: [
        "图与表用同一部位名",
        "写针法/缝型/收口，不要只写「精致」",
        "尽量关联框选区域",
        "短行优于没人看的长文",
      ],
      sections: [
        {
          heading: "一行工艺通常含什么",
          bullets: [
            "部位名（领、侧缝、下摆…）",
            "工艺描述",
            "针法或缝型",
            "关键时的缝份",
          ],
        },
        {
          heading: "常见错误",
          bullets: [
            "只有形容词、没有缝法",
            "部位名与图不一致",
            "左右/前后写反",
          ],
        },
      ],
      steps: [
        {
          title: "按图列出部位",
          body: "从领到摆，关键部位各建一行。",
        },
        {
          title: "补针法与缝份",
          body: "例如：「下摆双针绷缝，折边 2.5cm」。",
        },
        {
          title: "与引出同名",
          body: "框写「门襟」，工艺行也写「门襟」。",
        },
        {
          title: "检查矛盾",
          body: "拉链左右、袋口方向、明线颜色最易错。",
        },
      ],
      faq: [
        {
          question: "工艺和 BOM 有何不同？",
          answer: "工艺 = 怎么缝；BOM = 用什么料。两者都要。",
        },
        {
          question: "写多细才够？",
          answer: "细到两家工厂会缝成同一种接合。关键接合要细，装饰明线可简。",
        },
        {
          question: "PackFlow 能写工艺吗？",
          answer: `可以 — ${BRAND_SHORT_NAME} 工艺页在画布旁，并可关联区域。`,
        },
      ],
      ctaLabel: "在 PackFlow 写工艺",
    },
  },
  {
    slug: "tech-pack-revision-control",
    publishedAt: PUB,
    updatedAt: PUB,
    series: "fundamentals",
    relatedSlugs: [
      "how-to-send-tech-pack-to-factory",
      "common-factory-tech-pack-questions",
      "for-merchandisers",
      "tech-pack-checklist",
    ],
    en: {
      title: "Tech pack revision control: keep one current version",
      description:
        "How to date, name, and replace tech pack revisions so factories never sew from an old PDF.",
      definition:
        "Tech pack revision control means maintaining one current dated package (drawings + tables), naming each send clearly, and telling the factory which older files to discard when anything changes.",
      audience: "Anyone who has accidentally sampled from an outdated attachment.",
      keyTakeaways: [
        "Style + date (or v1/v2) in every filename",
        "Change log: what moved since last send",
        "Resend full pack when drawings change — not chat-only edits",
        "Keep one master project as source of truth",
      ],
      sections: [
        {
          heading: "Minimum revision hygiene",
          bullets: [
            "Revision date on the cover or filename",
            "Sample size still stated",
            "List of changed pages/sections",
            "Explicit “supersedes file X”",
          ],
        },
        {
          heading: "What usually goes wrong",
          paragraphs: [
            "Factories keep the first PDF. Chat messages saying “move the pocket 1 cm” never update that PDF. Always republish the pack.",
          ],
        },
      ],
      steps: [
        {
          title: "Edit the master project",
          body: "Do not fork copies for every email.",
        },
        {
          title: "Bump the date or version",
          body: "Even small callout moves deserve a new stamp.",
        },
        {
          title: "Write a 3-line change log",
          body: "What changed: pocket, POM, fabric TBD → confirmed.",
        },
        {
          title: "Resend and name the superseded file",
          body: "Ask them to archive the previous dated PDF.",
        },
      ],
      faq: [
        {
          question: "Do I need formal ECO documents?",
          answer:
            "Large brands may. Smaller teams can start with dated packs + change logs.",
        },
        {
          question: "PDF only or also Excel?",
          answer:
            "Whatever you sent before — update both if both are in use.",
        },
        {
          question: "How does PackFlow help?",
          answer: `${BRAND_SHORT_NAME} keeps one style project you update and re-export — better than scattered chat fixes.`,
        },
      ],
      ctaLabel: "Keep one master in PackFlow",
    },
    zh: {
      title: "工艺包版本怎么管？避免工厂用旧 PDF",
      description:
        "日期、文件名、变更说明：让工厂始终按当前版打样，而不是聊天里改口。",
      definition:
        "工艺包版本管理：维护一份带日期的当前稿（图+表），每次发送命名清楚，并告知工厂作废哪些旧文件。",
      audience: "曾经被旧附件坑过的跟单与设计师。",
      keyTakeaways: [
        "文件名含款号 + 日期（或 v1/v2）",
        "变更说明：相对上一版改了什么",
        "改图就重发整包，不要只在聊天改",
        "只保留一个主项目当真相来源",
      ],
      sections: [
        {
          heading: "最低限度的版本习惯",
          bullets: [
            "封面或文件名写日期",
            "仍写明基准码",
            "列出改动页/模块",
            "写明「替代文件 X」",
          ],
        },
        {
          heading: "常见翻车",
          paragraphs: [
            "工厂留着第一份 PDF。聊天说「口袋移 1cm」并不会更新那份 PDF。一定要重新出包。",
          ],
        },
      ],
      steps: [
        {
          title: "改主项目",
          body: "不要为每封邮件复制一份。",
        },
        {
          title: "更新日期或版号",
          body: "引出挪一点也值得盖新章。",
        },
        {
          title: "写三行变更说明",
          body: "改了口袋、POM，还是面料 TBD 已确认。",
        },
        {
          title: "重发并点名作废旧文件",
          body: "请对方归档上一份带日期的 PDF。",
        },
      ],
      faq: [
        {
          question: "要正式工程变更单吗？",
          answer: "大牌可能要。小团队可先用日期包 + 变更说明。",
        },
        {
          question: "只更 PDF 还是 Excel 也要？",
          answer: "之前发过什么就更新什么——两套都在用就两套都更。",
        },
        {
          question: "PackFlow 怎么帮？",
          answer: `${BRAND_SHORT_NAME} 用同一款项目改完再导出，比聊天补丁更安全。`,
        },
      ],
      ctaLabel: "在 PackFlow 维护主稿",
    },
  },
];
