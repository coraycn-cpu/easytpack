import { redirect } from "next/navigation";

/** @deprecated 首页即画布入口 */
export default function LegacyCanvasPage() {
  redirect("/");
}
