import React, { useState, useEffect } from 'react';
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
import { useCreateBranch, useUpdateBranch } from './useBranches';
import { useI18n } from '@/shared/i18n';
import type { BranchDto } from '@/types';
import { Building2, AlertCircle } from 'lucide-react';

interface BranchModalProps {
  isOpen: boolean;
  onClose: () => void;
  branch?: BranchDto | null;
  onSuccess?: () => void;
}

const REGIONS = [
  'Xorazm viloyati',
  'Toshkent shahri',
  'Toshkent viloyati',
  'Samarqand viloyati',
  'Buxoro viloyati',
  'Farg‘ona viloyati',
  'Andijon viloyati',
  'Namangan viloyati',
  'Qashqadaryo viloyati',
  'Surxondaryo viloyati',
  'Jizzax viloyati',
  'Sirdaryo viloyati',
  'Navoiy viloyati',
  'Qoraqalpog‘iston Respublikasi',
];

export const BranchModal: React.FC<BranchModalProps> = ({
  isOpen,
  onClose,
  branch,
  onSuccess,
}) => {
  const { t } = useI18n();
  const isEditing = !!branch;
  const createMutation = useCreateBranch();
  const updateMutation = useUpdateBranch();

  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [region, setRegion] = useState('Xorazm viloyati');
  const [district, setDistrict] = useState('');
  const [address, setAddress] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState('ACTIVE');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (branch) {
      setName(branch.name || '');
      setCode(branch.code || '');
      setRegion(branch.region || 'Xorazm viloyati');
      setDistrict(branch.district || '');
      setAddress(branch.address || '');
      setPhone(branch.phone || '');
      setEmail(branch.email || '');
      setDescription(branch.description || '');
      setStatus(branch.status || 'ACTIVE');
    } else {
      setName('');
      setCode('');
      setRegion('Xorazm viloyati');
      setDistrict('');
      setAddress('');
      setPhone('');
      setEmail('');
      setDescription('');
      setStatus('ACTIVE');
    }
    setError(null);
  }, [branch, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError(t('branches.validation.nameRequired', 'Filial nomi kiritilishi shart'));
      return;
    }
    if (!code.trim()) {
      setError(t('branches.validation.codeRequired', 'Filial kodi kiritilishi shart'));
      return;
    }
    const cleanCode = code.trim().toUpperCase();
    if (!/^[A-Z0-9_-]+$/.test(cleanCode)) {
      setError(t('branches.validation.codeInvalid', 'Filial kodi faqat lotin harflari va raqamlardan iborat bo‘lishi kerak'));
      return;
    }
    if (email && email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setError(t('branches.validation.emailInvalid', 'Elektron pochta formati noto‘g‘ri'));
      return;
    }
    setError(null);

    try {
      if (isEditing && branch) {
        await updateMutation.mutateAsync({
          id: branch.id,
          data: {
            name: name.trim(),
            code: cleanCode,
            region: region.trim(),
            district: district.trim(),
            address: address.trim(),
            phone: phone.trim(),
            email: email.trim(),
            description: description.trim(),
            status,
          },
        });
      } else {
        await createMutation.mutateAsync({
          name: name.trim(),
          code: cleanCode,
          region: region.trim(),
          district: district.trim(),
          address: address.trim(),
          phone: phone.trim(),
          email: email.trim(),
          description: description.trim(),
          status,
        });
      }
      onSuccess?.();
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Xatolik yuz berdi';
      setError(msg);
    }
  };

  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto bg-card text-card-foreground border-border shadow-2xl">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-primary/10 text-primary border border-primary/20">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <DialogTitle className="text-foreground">
                {isEditing ? 'Filialni tahrirlash' : 'Yangi filial yaratish'}
              </DialogTitle>
              <DialogDescription className="text-muted-foreground text-xs mt-0.5">
                {isEditing
                  ? 'Filialning asosiy parametrlarini, infratuzilmasi va aloqa vositalarini yangilang'
                  : 'Platformaga yangi hududiy o‘quv filiali yoki IT markazini ro‘yxatdan o‘tkazing'}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {error && (
          <div className="flex items-center gap-2 p-3 text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-lg">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="branch-name" className="text-foreground">
                {t('branches.branchName', 'Filial nomi')} <span className="text-destructive">*</span>
              </Label>
              <Input
                id="branch-name"
                placeholder="Masalan: IT Park Yangiariq filiali"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className="bg-card text-foreground border-border"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="branch-code" className="text-foreground">
                {t('branches.branchCode', 'Filial kodi')} <span className="text-destructive">*</span>
              </Label>
              <Input
                id="branch-code"
                placeholder="Masalan: ITP-YA yoki UR-CENTRAL"
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                required
                className="bg-card text-foreground border-border font-mono"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="branch-region" className="text-foreground">
                {t('branches.region', 'Hudud / Viloyat')} <span className="text-destructive">*</span>
              </Label>
              <select
                id="branch-region"
                className="w-full h-10 px-3 py-1 bg-card border border-border rounded-md text-sm text-foreground shadow-xs focus:ring-2 focus:ring-ring focus:outline-hidden"
                value={region}
                onChange={(e) => setRegion(e.target.value)}
              >
                {REGIONS.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="branch-district" className="text-foreground">
                {t('branches.district', 'Tuman / Shahar')}
              </Label>
              <Input
                id="branch-district"
                placeholder="Masalan: Yangiariq tumani"
                value={district}
                onChange={(e) => setDistrict(e.target.value)}
                className="bg-card text-foreground border-border"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="branch-address" className="text-foreground">
              {t('branches.address', 'To‘liq manzil')}
            </Label>
            <Input
              id="branch-address"
              placeholder="Masalan: Mustaqillik ko‘chasi, 24-uy"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              className="bg-card text-foreground border-border"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="branch-phone" className="text-foreground">
                {t('branches.phone', 'Telefon raqami')}
              </Label>
              <Input
                id="branch-phone"
                placeholder="+998 62 227 12 34"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="bg-card text-foreground border-border"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="branch-email" className="text-foreground">
                {t('branches.email', 'Elektron pochta')}
              </Label>
              <Input
                id="branch-email"
                type="email"
                placeholder="filial@axm.uz"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="bg-card text-foreground border-border"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="branch-status" className="text-foreground">
                {t('branches.status', 'Holati')}
              </Label>
              <select
                id="branch-status"
                className="w-full h-10 px-3 py-1 bg-card border border-border rounded-md text-sm text-foreground shadow-xs focus:ring-2 focus:ring-ring focus:outline-hidden"
                value={status}
                onChange={(e) => setStatus(e.target.value)}
              >
                <option value="ACTIVE">Faol (ACTIVE)</option>
                <option value="INACTIVE">Nofaol (INACTIVE)</option>
                <option value="ARCHIVED">Arxivlangan (ARCHIVED)</option>
              </select>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="branch-description" className="text-foreground">
              {t('branches.description', 'Filial haqida qisqacha tavsif')}
            </Label>
            <textarea
              id="branch-description"
              rows={3}
              className="w-full p-2.5 bg-card border border-border rounded-md text-sm text-foreground shadow-xs focus:ring-2 focus:ring-ring focus:outline-hidden"
              placeholder="Filialning vazifasi, laboratoriyalari va o‘quv yo‘nalishlari haqida..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          <DialogFooter className="pt-4">
            <Button type="button" variant="outline" onClick={onClose} disabled={isPending}>
              Bekor qilish
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? 'Saqlanmoqda...' : isEditing ? 'Saqlash' : 'Filialni yaratish'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
