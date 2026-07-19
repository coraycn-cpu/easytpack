/**
 * 对话附图策略：按用户意图选择原图 / 原图+选中画板 / 不附图。
 * 启发式即可，误判时优先保原图（款式分析安全）。
 */

export type ChatImageMode = "none" | "intake" | "intake_and_active";

const CANVAS_RE =
  /标工艺|标注|标出|画板|背面|线稿|这张图|这张|当前图|当前画板|这根|画歪|歪了|对不对|生成背面|生成线稿|看一下这|这图|选中画板|在图上|图上标|按当前|这版/;

const STYLE_RE =
  /面料|辅料|领口|领子|袖长|袖子|品类|结构|款式|推荐|怎么做|要注意|工艺要点|缝制|门襟|口袋|版型|克重|成分|弹力/;

/** 明显只改工艺包文字、不看图 */
const TEXT_ONLY_RE =
  /(改|修改|把|将|删|删除|去掉|增加|补充|填).{0,24}(标题|工艺说明|缝份|针法|物料|用量|规格|尺码|测量点|评语)|标题改|工艺包还缺|一键补全|写评语|写一下评语/;

export function resolveChatImageMode(message: string): ChatImageMode {
  const t = message.trim();
  if (!t) return "intake";

  if (CANVAS_RE.test(t)) return "intake_and_active";

  // 纯文字改包：无画布词、无强款式视觉问法时可不附图
  if (TEXT_ONLY_RE.test(t) && !STYLE_RE.test(t)) return "none";

  return "intake";
}

export function chatImageModeLabel(mode: ChatImageMode, activeName?: string): string {
  switch (mode) {
    case "none":
      return "依据工艺包文字";
    case "intake_and_active":
      return activeName
        ? `依据上传原图 +「${activeName}」`
        : "依据上传原图 + 选中画板";
    default:
      return "依据上传原图";
  }
}

/** 建议执行时需要标明目标画板的动作 */
export function isBoardScopedChatAction(action: string): boolean {
  return (
    action === "annotate-process" ||
    action === "view-back" ||
    action === "view-line-art"
  );
}
