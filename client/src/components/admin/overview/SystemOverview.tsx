import { OverviewHeader } from "./OverviewHeader";
import { KpiSlider } from "./KpiSlider";
import { SystemChart } from "./SystemChart";
import { ActivityMonitor } from "./ActivityMonitor";
import { QuickActions } from "./QuickActions";

export function SystemOverview() {
  return (
    <div className="relative min-h-screen pb-24">
      {/* Background Ambience */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-32 -right-32 h-[500px] w-[500px] rounded-full bg-violet-600/10 blur-[100px]" />
        <div className="absolute top-[40%] -left-32 h-[400px] w-[400px] rounded-full bg-fuchsia-600/10 blur-[100px]" />
        <div className="absolute -bottom-32 right-[20%] h-[400px] w-[400px] rounded-full bg-cyan-600/10 blur-[100px]" />
      </div>

      <div className="relative z-10">
        <OverviewHeader />
        
        <div className="animate-in fade-in slide-in-from-bottom-6 duration-700">
          <KpiSlider />
        </div>
        
        <div className="animate-in fade-in slide-in-from-bottom-8 duration-700 delay-150 fill-mode-both">
          <SystemChart />
        </div>

        <div className="animate-in fade-in slide-in-from-bottom-8 duration-700 delay-300 fill-mode-both">
          <ActivityMonitor />
        </div>

        <div className="animate-in fade-in slide-in-from-bottom-8 duration-700 delay-500 fill-mode-both">
          <QuickActions />
        </div>
      </div>
    </div>
  );
}
