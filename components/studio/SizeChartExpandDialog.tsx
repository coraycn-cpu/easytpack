"use client";

import DataExpandShell from "@/components/studio/DataExpandShell";
import SizeChartEditor from "@/components/studio/SizeChartEditor";
import type { SizeChart } from "@/types/project";

type SizeChartExpandDialogProps = {
  open: boolean;
  onClose: () => void;
  chart: SizeChart;
  onChange: (chart: SizeChart) => void;
  onRemoveRowPart?: (part: string, nextChart: SizeChart) => void;
  dimensionCounts?: Record<string, number>;
};

/** 尺码表展开大面板：可删部位行、改数字，与侧栏共用同一套保存逻辑 */
export default function SizeChartExpandDialog({
  open,
  onClose,
  chart,
  onChange,
  onRemoveRowPart,
  dimensionCounts,
}: SizeChartExpandDialogProps) {
  return (
    <DataExpandShell
      open={open}
      onClose={onClose}
      title="尺码表"
      subtitle="大面板编辑测量部位与各码数值；删除部位会同步去掉画布上对应尺寸线；改数字会更新标注文字。点「完成」关闭。"
    >
      <SizeChartEditor
        chart={chart}
        onChange={onChange}
        onRemoveRowPart={onRemoveRowPart}
        dimensionCounts={dimensionCounts}
        flat
      />
    </DataExpandShell>
  );
}
