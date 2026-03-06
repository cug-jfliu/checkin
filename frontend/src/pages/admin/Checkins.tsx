import { useEffect, useState } from 'react';
import api from '../../lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { format } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import { CalendarIcon, Pencil, Trash2, Plus, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface CheckinRecord {
    id: number;
    username: string;
    name: string | null;
    checkin_time: string;
    latitude: number | null;
    longitude: number | null;
}

interface UserRecord {
    id: number;
    username: string;
    name: string | null;
    role: string;
    show_in_weekly: boolean;
}

/** 将 Date + "HH:MM:SS" 组合为 RFC3339 字符串（本地时区） */
function toRfc3339(date: Date, timeStr: string): string {
    const parts = timeStr.split(':').map(Number);
    const h = parts[0], m = parts[1], s = parts[2] ?? 0;
    const d = new Date(date);
    d.setHours(h, m, s, 0);
    const off = -d.getTimezoneOffset();
    const sign = off >= 0 ? '+' : '-';
    const pad = (n: number) => String(Math.abs(n)).padStart(2, '0');
    const hh = pad(Math.floor(Math.abs(off) / 60));
    const mm = pad(Math.abs(off) % 60);
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}${sign}${hh}:${mm}`;
}

/** 将 ISO 字符串格式化为 HH:MM:SS（本地时间） */
function toLocalTimeInput(iso: string): string {
    const d = new Date(iso);
    return [
        String(d.getHours()).padStart(2, '0'),
        String(d.getMinutes()).padStart(2, '0'),
        String(d.getSeconds()).padStart(2, '0'),
    ].join(':');
}

export default function AdminCheckins() {
    const [records, setRecords] = useState<CheckinRecord[]>([]);
    const [date, setDate] = useState<Date>(new Date());
    const [loading, setLoading] = useState(false);

    // 所有用户（用于补录下拉）
    const [allUsers, setAllUsers] = useState<UserRecord[]>([]);

    // 编辑弹窗
    const [editTarget, setEditTarget] = useState<CheckinRecord | null>(null);
    const [editTime, setEditTime] = useState('');
    const [editLat, setEditLat] = useState('');
    const [editLng, setEditLng] = useState('');
    const [editSubmitting, setEditSubmitting] = useState(false);
    const [editError, setEditError] = useState<string | null>(null);

    // 补录弹窗
    const [addOpen, setAddOpen] = useState(false);
    const [addUserId, setAddUserId] = useState('');
    const [addTime, setAddTime] = useState('09:00');
    const [addLat, setAddLat] = useState('');
    const [addLng, setAddLng] = useState('');
    const [addSubmitting, setAddSubmitting] = useState(false);
    const [addError, setAddError] = useState<string | null>(null);

    // 删除确认
    const [deleteTarget, setDeleteTarget] = useState<CheckinRecord | null>(null);
    const [deleting, setDeleting] = useState(false);

    const dateStr = (() => {
        const y = date.getFullYear();
        const m = String(date.getMonth() + 1).padStart(2, '0');
        const d = String(date.getDate()).padStart(2, '0');
        return `${y}-${m}-${d}`;
    })();

    const fetchRecords = async () => {
        setLoading(true);
        try {
            const res = await api.get(`/admin/records?date=${dateStr}`);
            setRecords(res.data);
        } catch (err) {
            console.error('Failed to fetch records', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchRecords(); }, [date]);

    useEffect(() => {
        api.get('/admin/users').then(res => setAllUsers(res.data)).catch(console.error);
    }, []);

    // ── 编辑 ──
    const openEdit = (r: CheckinRecord) => {
        setEditTarget(r);
        setEditTime(toLocalTimeInput(r.checkin_time));
        setEditLat(r.latitude != null ? String(r.latitude) : '');
        setEditLng(r.longitude != null ? String(r.longitude) : '');
        setEditError(null);
    };

    const handleEditSave = async () => {
        if (!editTarget) return;
        setEditSubmitting(true);
        const lat = editLat !== '' ? parseFloat(editLat) : null;
        const lng = editLng !== '' ? parseFloat(editLng) : null;
        try {
            await api.put(`/admin/checkins/${editTarget.id}`, {
                checkin_time: toRfc3339(new Date(editTarget.checkin_time), editTime),
                latitude: isNaN(lat as number) ? null : lat,
                longitude: isNaN(lng as number) ? null : lng,
            });
            setEditTarget(null);
            fetchRecords();
        } catch (err: any) {
            setEditError(err.response?.data?.error || '保存失败');
        } finally {
            setEditSubmitting(false);
        }
    };

    // ── 补录 ──
    const openAdd = () => {
        setAddUserId('');
        setAddTime('09:00');
        setAddLat('');
        setAddLng('');
        setAddError(null);
        setAddOpen(true);
    };

    const handleAddSave = async () => {
        if (!addUserId) return;
        setAddSubmitting(true);
        const lat = addLat !== '' ? parseFloat(addLat) : null;
        const lng = addLng !== '' ? parseFloat(addLng) : null;
        try {
            await api.post('/admin/checkins', {
                user_id: Number(addUserId),
                checkin_time: toRfc3339(date, addTime),
                latitude: isNaN(lat as number) ? null : lat,
                longitude: isNaN(lng as number) ? null : lng,
            });
            setAddOpen(false);
            fetchRecords();
        } catch (err: any) {
            setAddError(err.response?.data?.error || '补录失败');
        } finally {
            setAddSubmitting(false);
        }
    };

    // ── 删除 ──
    const confirmDelete = async () => {
        if (!deleteTarget) return;
        setDeleting(true);
        try {
            await api.delete(`/admin/checkins/${deleteTarget.id}`);
            setDeleteTarget(null);
            fetchRecords();
        } catch (err) {
            console.error(err);
        } finally {
            setDeleting(false);
        }
    };

    return (
        <Card className="border-neutral-800 bg-neutral-900">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle>每日签到记录</CardTitle>
                <div className="flex items-center space-x-3">
                    {/* 日期选择 */}
                    <div className="flex items-center space-x-2">
                        <Label>日期</Label>
                        <Popover>
                            <PopoverTrigger asChild>
                                <Button
                                    variant="outline"
                                    className={cn(
                                        'w-[175px] justify-start text-left font-normal bg-neutral-950 border-neutral-800',
                                        !date && 'text-muted-foreground'
                                    )}
                                >
                                    <CalendarIcon className="w-4 h-4" />
                                    {date ? format(date, 'PPP', { locale: zhCN }) : <span>选择日期</span>}
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0 bg-neutral-900 border-neutral-800 text-white" align="end">
                                <Calendar
                                    mode="single"
                                    selected={date}
                                    onSelect={(d) => d && setDate(d)}
                                    initialFocus
                                    locale={zhCN}
                                />
                            </PopoverContent>
                        </Popover>
                    </div>
                    {/* 补录按钮 */}
                    <Button className="bg-blue-600 hover:bg-blue-500 text-white" onClick={openAdd}>
                        <Plus className="w-4 h-4" /> 补录
                    </Button>
                </div>
            </CardHeader>

            <CardContent>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>用户</TableHead>
                            <TableHead>打卡时间</TableHead>
                            <TableHead>定位</TableHead>
                            <TableHead className="text-right">操作</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {loading ? (
                            <TableRow>
                                <TableCell colSpan={4} className="text-center py-8">
                                    <Loader2 className="h-6 w-6 animate-spin mx-auto text-neutral-500" />
                                </TableCell>
                            </TableRow>
                        ) : records.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={4} className="text-center text-neutral-500 py-8">
                                    该日期没有签到记录
                                </TableCell>
                            </TableRow>
                        ) : (
                            records.map((r) => (
                                <TableRow key={r.id}>
                                    <TableCell className="font-medium">{r.name || r.username}</TableCell>
                                    <TableCell>{new Date(r.checkin_time).toLocaleTimeString('zh-CN')}</TableCell>
                                    <TableCell>
                                        {r.latitude && r.longitude ? (
                                            <a
                                                href={`https://maps.google.com/?q=${r.latitude},${r.longitude}`}
                                                target="_blank"
                                                rel="noreferrer"
                                                className="text-blue-400 hover:text-blue-300 underline"
                                            >
                                                {r.latitude.toFixed(4)}, {r.longitude.toFixed(4)}
                                            </a>
                                        ) : (
                                            <span className="text-neutral-500">无</span>
                                        )}
                                    </TableCell>
                                    <TableCell className="text-right space-x-1">
                                        <Button variant="ghost" size="icon" onClick={() => openEdit(r)}>
                                            <Pencil className="h-4 w-4 text-blue-400" />
                                        </Button>
                                        <Button variant="ghost" size="icon" onClick={() => setDeleteTarget(r)}>
                                            <Trash2 className="h-4 w-4 text-red-400" />
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </CardContent>

            {/* ── 编辑弹窗 ── */}
            <Dialog open={!!editTarget} onOpenChange={(open) => { if (!open) setEditTarget(null); }}>
                <DialogContent className="bg-neutral-900 border-neutral-800 text-white sm:max-w-[360px]">
                    <DialogHeader>
                        <DialogTitle>修改打卡时间</DialogTitle>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label className="text-right">用户</Label>
                            <span className="col-span-3 text-neutral-300">
                                {editTarget?.name || editTarget?.username}
                            </span>
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="edit-time" className="text-right">时间</Label>
                            <div lang="en-GB" className="col-span-3">
                                <Input
                                    id="edit-time"
                                    type="time"
                                    step={1}
                                    value={editTime}
                                    onChange={(e) => setEditTime(e.target.value)}
                                    className="w-full bg-neutral-950 border-neutral-800"
                                />
                            </div>
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="edit-lat" className="text-right">纬度</Label>
                            <Input
                                id="edit-lat"
                                type="number"
                                step="any"
                                placeholder="留空则清除定位"
                                value={editLat}
                                onChange={(e) => setEditLat(e.target.value)}
                                className="col-span-3 bg-neutral-950 border-neutral-800"
                            />
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="edit-lng" className="text-right">经度</Label>
                            <Input
                                id="edit-lng"
                                type="number"
                                step="any"
                                placeholder="留空则清除定位"
                                value={editLng}
                                onChange={(e) => setEditLng(e.target.value)}
                                className="col-span-3 bg-neutral-950 border-neutral-800"
                            />
                        </div>
                        {editError && <p className="text-sm text-red-400 px-1">{editError}</p>}
                    </div>
                    <DialogFooter>
                        <Button
                            disabled={editSubmitting || !editTime}
                            onClick={handleEditSave}
                            className="bg-blue-600 hover:bg-blue-500 text-white"
                        >
                            {editSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            保存
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* ── 补录弹窗 ── */}
            <Dialog open={addOpen} onOpenChange={setAddOpen}>
                <DialogContent className="bg-neutral-900 border-neutral-800 text-white sm:max-w-[360px]">
                    <DialogHeader>
                        <DialogTitle>补录打卡记录</DialogTitle>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label className="text-right">日期</Label>
                            <span className="col-span-3 text-neutral-300">{dateStr}</span>
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="add-user" className="text-right">用户</Label>
                            <Select value={addUserId} onValueChange={setAddUserId}>
                                <SelectTrigger className="col-span-3 bg-neutral-950 border-neutral-800">
                                    <SelectValue placeholder="选择用户" />
                                </SelectTrigger>
                                <SelectContent className="bg-neutral-900 border-neutral-800 text-white">
                                    {allUsers.map((u) => (
                                        <SelectItem key={u.id} value={String(u.id)}>
                                            {u.name ? `${u.name} (${u.username})` : u.username}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="add-time" className="text-right">时间</Label>
                            <div lang="en-GB" className="col-span-3">
                                <Input
                                    id="add-time"
                                    type="time"
                                    step={1}
                                    value={addTime}
                                    onChange={(e) => setAddTime(e.target.value)}
                                    className="w-full bg-neutral-950 border-neutral-800"
                                />
                            </div>
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="add-lat" className="text-right">纬度</Label>
                            <Input
                                id="add-lat"
                                type="number"
                                step="any"
                                placeholder="可选"
                                value={addLat}
                                onChange={(e) => setAddLat(e.target.value)}
                                className="col-span-3 bg-neutral-950 border-neutral-800"
                            />
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="add-lng" className="text-right">经度</Label>
                            <Input
                                id="add-lng"
                                type="number"
                                step="any"
                                placeholder="可选"
                                value={addLng}
                                onChange={(e) => setAddLng(e.target.value)}
                                className="col-span-3 bg-neutral-950 border-neutral-800"
                            />
                        </div>
                        {addError && <p className="text-sm text-red-400 px-1">{addError}</p>}
                    </div>
                    <DialogFooter>
                        <Button
                            disabled={addSubmitting || !addUserId || !addTime}
                            onClick={handleAddSave}
                            className="bg-blue-600 hover:bg-blue-500 text-white"
                        >
                            {addSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            补录
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* ── 删除确认 ── */}
            <AlertDialog open={!!deleteTarget} onOpenChange={(open) => { if (!open) setDeleteTarget(null); }}>
                <AlertDialogContent className="bg-neutral-900 border-neutral-800 text-white">
                    <AlertDialogHeader>
                        <AlertDialogTitle>确认删除</AlertDialogTitle>
                        <AlertDialogDescription className="text-neutral-400">
                            即将删除 <span className="text-white font-semibold">「{deleteTarget?.name || deleteTarget?.username}」</span> 在该日期的打卡记录，此操作不可撤销。
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel className="bg-neutral-800 border-neutral-700 text-white hover:bg-neutral-700">取消</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={confirmDelete}
                            disabled={deleting}
                            className="bg-red-600 hover:bg-red-500 text-white"
                        >
                            {deleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            确认删除
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </Card>
    );
}
