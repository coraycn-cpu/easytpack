import { Suspense } from "react";
import BusyOverlay from "@/components/ui/BusyOverlay";
import LoginClient from "./LoginClient";

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="relative min-h-screen bg-zinc-50">
          <BusyOverlay
            title="正在打开登录页…"
            subtitle="请稍候"
          />
        </div>
      }
    >
      <LoginClient />
    </Suspense>
  );
}
