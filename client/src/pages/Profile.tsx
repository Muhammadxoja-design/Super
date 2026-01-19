import { useUser } from "@/hooks/use-auth";
import { Loader2, User as UserIcon, LogOut, MapPin, Phone, Briefcase } from "lucide-react";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/StatusBadge";

export default function Profile() {
  const { data: user, isLoading } = useUser();

  if (isLoading) return <div className="flex justify-center pt-20"><Loader2 className="animate-spin" /></div>;
  if (!user) return null;

  return (
    <div className="min-h-screen bg-background pb-24 page-enter">
      {/* Header Banner */}
      <div className="h-40 bg-gradient-to-r from-primary to-blue-700 relative">
        <div className="absolute -bottom-12 left-6">
          <div className="w-24 h-24 rounded-full bg-background p-1.5 shadow-xl">
            <div className="w-full h-full rounded-full bg-muted flex items-center justify-center overflow-hidden relative">
              {user.photoUrl ? (
                <img src={user.photoUrl} alt="Profile" className="w-full h-full object-cover" />
              ) : (
                <UserIcon className="w-10 h-10 text-muted-foreground" />
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="pt-14 px-6">
        <div className="flex justify-between items-start mb-6">
          <div>
            <h1 className="text-2xl font-bold font-display">{user.fullName}</h1>
            <p className="text-muted-foreground">@{user.username || "username"}</p>
          </div>
          <StatusBadge status={user.status} />
        </div>

        <div className="space-y-6">
          <Section title="Shaxsiy ma'lumotlar">
            <InfoItem icon={Phone} label="Telefon" value={user.phone} />
            <InfoItem icon={Briefcase} label="Yo'nalish" value={user.direction} />
            <InfoItem icon={UserIcon} label="Rol" value={user.role} />
          </Section>

          <Section title="Manzil">
            <InfoItem icon={MapPin} label="Viloyat" value={user.region} />
            <InfoItem icon={MapPin} label="Tuman" value={user.district} />
            <InfoItem icon={MapPin} label="Mahalla" value={user.mahalla} />
          </Section>

          <Button variant="destructive" className="w-full rounded-xl mt-8" onClick={() => {/* Logout logic would go here, probably clear cookie */}}>
            <LogOut className="w-4 h-4 mr-2" />
            Chiqish
          </Button>

          <p className="text-center text-xs text-muted-foreground mt-8 pb-4">
            Version 1.0.0
          </p>
        </div>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string, children: React.ReactNode }) {
  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">{title}</h3>
      <div className="glass-card rounded-2xl border border-white/5 divide-y divide-white/5 overflow-hidden">
        {children}
      </div>
    </div>
  );
}

function InfoItem({ icon: Icon, label, value }: { icon: any, label: string, value: string | null }) {
  return (
    <div className="p-4 flex items-center gap-4">
      <div className="w-8 h-8 rounded-lg bg-secondary flex items-center justify-center shrink-0">
        <Icon className="w-4 h-4 text-muted-foreground" />
      </div>
      <div>
        <div className="text-xs text-muted-foreground">{label}</div>
        <div className="font-medium">{value || "—"}</div>
      </div>
    </div>
  );
}
