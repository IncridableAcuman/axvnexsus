import React, { useState } from 'react';
import {
  UserPlus,
  Check,
  AlertCircle,
  Copy,
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { userApi } from '@/api';
import { useToast } from '@/shared/ui/toast/ToastContext';
import type { UserProvisionDto } from '@/types';

interface CreateUserModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const CreateUserModal: React.FC<CreateUserModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const toast = useToast();

  const [fullName, setFullName] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [primaryRole, setPrimaryRole] = useState('ADMIN');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  // Result dialog state
  const [provisionResult, setProvisionResult] = useState<UserProvisionDto | null>(null);
  const [copiedPass, setCopiedPass] = useState(false);

  const resetForm = () => {
    setFullName('');
    setUsername('');
    setEmail('');
    setPhone('');
    setPassword('');
    setPrimaryRole('ADMIN');
    setError('');
    setProvisionResult(null);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim()) {
      setError('Xodim F.I.O sini kiriting');
      return;
    }

    try {
      setSaving(true);
      setError('');

      const res = await userApi.createUser({
        fullName: fullName.trim(),
        username: username.trim() || undefined,
        email: email.trim() || undefined,
        phone: phone.trim() || undefined,
        password: password.trim() || undefined,
        primaryRole,
      });

      const data = res.data.data;
      setProvisionResult(data);
      toast.success('Muvaffaqiyatli yaratildi', `${data.fullName} hisobi ochildi`);
      onSuccess();
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        'Foydalanuvchi hisobini yaratishda xatolik yuz berdi';
      setError(msg);
      toast.error('Xatolik', msg);
    } finally {
      setSaving(false);
    }
  };

  const handleCopyPassword = () => {
    if (provisionResult?.temporaryPassword) {
      navigator.clipboard.writeText(provisionResult.temporaryPassword);
      setCopiedPass(true);
      setTimeout(() => setCopiedPass(false), 2000);
      toast.success('Nusxalandi', 'Parol nusxalab olindi');
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="sm:max-w-md border-0 rounded-3xl shadow-2xl bg-card text-card-foreground p-6 sm:p-7">
        <DialogHeader className="space-y-1 text-left">
          <DialogTitle className="text-lg font-bold text-foreground flex items-center gap-2">
            <UserPlus className="w-5 h-5 text-primary" />
            <span>Yangi Xodim / Administrator Qo‘shish</span>
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            Boshqaruv roli va xavfsiz kirish hisobini yaratish
          </DialogDescription>
        </DialogHeader>

        {error && (
          <div className="flex items-center gap-2 p-3 rounded-xl bg-destructive/10 text-destructive text-xs mt-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {provisionResult ? (
          <div className="space-y-4 pt-3">
            <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-foreground space-y-2">
              <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 font-bold text-sm">
                <Check className="w-4 h-4" />
                <span>Hisob muvaffaqiyatli faollashtirildi!</span>
              </div>
              <p className="text-xs text-muted-foreground">
                Ushbu kirish ma'lumotlarini nusxalab oling va yangi xodimga yetkazing:
              </p>

              <div className="space-y-2 pt-2 text-xs">
                <div className="flex items-center justify-between p-2.5 rounded-xl bg-background/80">
                  <span className="text-muted-foreground">F.I.O:</span>
                  <span className="font-bold text-foreground">{provisionResult.fullName}</span>
                </div>
                <div className="flex items-center justify-between p-2.5 rounded-xl bg-background/80">
                  <span className="text-muted-foreground">Login (Username):</span>
                  <span className="font-mono font-bold text-foreground">{provisionResult.username}</span>
                </div>
                <div className="flex items-center justify-between p-2.5 rounded-xl bg-background/80">
                  <span className="text-muted-foreground">Biriktirilgan Rol:</span>
                  <span className="font-bold text-primary">{provisionResult.primaryRole}</span>
                </div>
                <div className="flex items-center justify-between p-2.5 rounded-xl bg-background/80">
                  <span className="text-muted-foreground">Vaqtinchalik Parol:</span>
                  <div className="flex items-center gap-1.5 font-mono font-black text-foreground">
                    <span>{provisionResult.temporaryPassword}</span>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={handleCopyPassword}
                      className="h-6 w-6 text-muted-foreground hover:text-foreground cursor-pointer"
                      title="Nusxa olish"
                    >
                      {copiedPass ? (
                        <Check className="w-3.5 h-3.5 text-emerald-500" />
                      ) : (
                        <Copy className="w-3.5 h-3.5" />
                      )}
                    </Button>
                  </div>
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button
                type="button"
                onClick={handleClose}
                className="w-full rounded-xl text-xs font-bold cursor-pointer"
              >
                Tushundim, yakunlash
              </Button>
            </DialogFooter>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <Label htmlFor="staff-name" className="text-xs font-semibold">
                F.I.O (Ism-familiya) *
              </Label>
              <Input
                id="staff-name"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Masalan: Dilshod Rahimov"
                className="rounded-xl text-xs"
                required
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="staff-username" className="text-xs font-semibold">
                  Login (Username)
                </Label>
                <Input
                  id="staff-username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Ixtiyoriy (avto)"
                  className="rounded-xl text-xs font-mono"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="staff-role" className="text-xs font-semibold">
                  Asosiy rol *
                </Label>
                <Select value={primaryRole} onValueChange={setPrimaryRole}>
                  <SelectTrigger id="staff-role" className="rounded-xl text-xs">
                    <SelectValue placeholder="Rolni tanlang" />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl">
                    <SelectItem value="ADMIN">Tizim Administratori (ADMIN)</SelectItem>
                    <SelectItem value="PROGRAM_ADMIN">Dastur Administratori (PROGRAM_ADMIN)</SelectItem>
                    <SelectItem value="REGIONAL_COORDINATOR">Mintaqaviy Koordinator (REGIONAL_COORDINATOR)</SelectItem>
                    <SelectItem value="COORDINATOR">Filial Koordinatori (COORDINATOR)</SelectItem>
                    <SelectItem value="OBSERVER">Kuzatuvchi (OBSERVER)</SelectItem>
                    <SelectItem value="CONTENT_MANAGER">Kontent Menejeri (CONTENT_MANAGER)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="staff-email" className="text-xs font-semibold">
                  Elektron pochta (Email)
                </Label>
                <Input
                  id="staff-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="xodim@axm-nexus.uz"
                  className="rounded-xl text-xs"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="staff-phone" className="text-xs font-semibold">
                  Telefon raqami
                </Label>
                <Input
                  id="staff-phone"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+998 90 123 45 67"
                  className="rounded-xl text-xs font-mono"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="staff-password" className="text-xs font-semibold">
                Dastlabki parol (Ixtiyoriy)
              </Label>
              <Input
                id="staff-password"
                type="text"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Bo‘sh qoldirilsa, avtomatik yaratiladi"
                className="rounded-xl text-xs font-mono"
              />
            </div>

            <DialogFooter className="flex items-center justify-end gap-2 pt-4 border-t border-border/10">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleClose}
                disabled={saving}
                className="rounded-xl text-xs cursor-pointer"
              >
                Bekor qilish
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={saving}
                className="rounded-xl text-xs font-bold gap-1.5 cursor-pointer shadow-sm"
              >
                <UserPlus className="w-3.5 h-3.5" />
                <span>{saving ? 'Yaratilmoqda...' : 'Hisobni ochish'}</span>
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
};
