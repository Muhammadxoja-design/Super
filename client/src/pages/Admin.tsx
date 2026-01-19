import { useState } from "react";
import { useAdminUsers, useApproveUser } from "@/hooks/use-admin";
import { Loader2, Check, X, Search, Filter } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/StatusBadge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";

export default function Admin() {
  const [statusFilter, setStatusFilter] = useState<'pending' | 'approved' | 'rejected' | 'all'>('pending');
  const [searchTerm, setSearchTerm] = useState("");
  const { data: users, isLoading } = useAdminUsers(statusFilter);

  const filteredUsers = users?.filter(user => 
    user.fullName?.toLowerCase().includes(searchTerm.toLowerCase()) || 
    user.username?.toLowerCase().includes(searchTerm.toLowerCase())
  ) || [];

  return (
    <div className="min-h-screen bg-background pb-24 px-4 pt-6 page-enter">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-display font-bold">Admin Panel</h1>
        <div className="text-xs font-mono px-2 py-1 bg-primary/10 text-primary rounded-md">
          {filteredUsers.length} users
        </div>
      </div>

      {/* Search & Filter */}
      <div className="flex gap-2 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input 
            placeholder="Search users..." 
            className="pl-9 h-11 bg-card/50 border-border/50" 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <Button variant="outline" size="icon" className="h-11 w-11 shrink-0">
          <Filter className="w-4 h-4" />
        </Button>
      </div>

      {/* Tabs */}
      <div className="flex p-1 bg-card/50 rounded-xl mb-6 overflow-x-auto no-scrollbar">
        {['pending', 'approved', 'rejected', 'all'].map((tab) => (
          <button
            key={tab}
            onClick={() => setStatusFilter(tab as any)}
            className={`flex-1 px-4 py-2 text-sm font-medium rounded-lg whitespace-nowrap transition-all ${
              statusFilter === tab 
                ? 'bg-primary text-primary-foreground shadow-md' 
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
          </button>
        ))}
      </div>

      {/* Users List */}
      {isLoading ? (
        <div className="flex justify-center py-10">
          <Loader2 className="w-8 h-8 text-primary animate-spin" />
        </div>
      ) : (
        <div className="space-y-4">
          {filteredUsers.length === 0 ? (
            <p className="text-center text-muted-foreground py-10">Foydalanuvchilar topilmadi</p>
          ) : (
            filteredUsers.map((user) => (
              <UserCard key={user.id} user={user} />
            ))
          )}
        </div>
      )}
    </div>
  );
}

function UserCard({ user }: { user: any }) {
  const [rejectOpen, setRejectOpen] = useState(false);
  const [reason, setReason] = useState("");
  const approve = useApproveUser();

  const handleApprove = () => {
    approve.mutate({ id: user.id, approved: true });
  };

  const handleReject = () => {
    if (!reason.trim()) return;
    approve.mutate({ id: user.id, approved: false, reason });
    setRejectOpen(false);
  };

  return (
    <div className="glass-card p-5 rounded-2xl border border-white/5">
      <div className="flex justify-between items-start mb-3">
        <div>
          <h3 className="font-bold text-lg">{user.fullName}</h3>
          <p className="text-sm text-muted-foreground">{user.direction}</p>
        </div>
        <StatusBadge status={user.status} />
      </div>

      <div className="grid grid-cols-2 gap-y-2 text-sm text-muted-foreground/80 mb-4">
        <div>📍 {user.region}</div>
        <div>📞 {user.phone}</div>
      </div>

      {user.status === "pending" && (
        <div className="flex gap-3 mt-4 pt-4 border-t border-border/50">
          <Button 
            className="flex-1 bg-green-500 hover:bg-green-600 text-white" 
            size="sm"
            onClick={handleApprove}
            disabled={approve.isPending}
          >
            {approve.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4 mr-2" />}
            Tasdiqlash
          </Button>
          <Button 
            variant="destructive" 
            className="flex-1" 
            size="sm"
            onClick={() => setRejectOpen(true)}
            disabled={approve.isPending}
          >
            <X className="w-4 h-4 mr-2" />
            Rad etish
          </Button>
        </div>
      )}

      {/* Reject Dialog */}
      <Dialog open={rejectOpen} onOpenChange={setRejectOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rad etish sababi</DialogTitle>
            <DialogDescription>
              Foydalanuvchiga rad etish sababini yozing.
            </DialogDescription>
          </DialogHeader>
          <Textarea 
            value={reason} 
            onChange={(e) => setReason(e.target.value)}
            placeholder="Sabab..."
            className="min-h-[100px]"
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectOpen(false)}>Bekor qilish</Button>
            <Button variant="destructive" onClick={handleReject} disabled={!reason.trim() || approve.isPending}>
              Rad etish
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
