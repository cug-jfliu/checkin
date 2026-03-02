import { useEffect, useState } from 'react';
import api from '../../lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from '@/components/ui/dialog';
import {
    AlertDialog, AlertDialogAction, AlertDialogCancel,
    AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
    AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Pencil, Trash2, Plus, Loader2 } from 'lucide-react';

interface UserRecord {
    id: number;
    username: string;
    name: string | null;
    role: string;
    show_in_weekly: boolean;
    created_at: string;
}

const UserFormFields = ({
    formData,
    setFormData,
    isEdit,
}: {
    formData: { username: string; name: string; password: string; role: string; show_in_weekly: boolean };
    setFormData: (d: any) => void;
    isEdit: boolean;
}) => (
    <div className="grid gap-4 py-4">
        <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor={isEdit ? 'edit-username' : 'username'} className="text-right">用户名*</Label>
            <Input
                id={isEdit ? 'edit-username' : 'username'}
                value={formData.username}
                onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                className="col-span-3 bg-neutral-950 border-neutral-800"
            />
        </div>
        <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor={isEdit ? 'edit-name' : 'name'} className="text-right">真实姓名</Label>
            <Input
                id={isEdit ? 'edit-name' : 'name'}
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="col-span-3 bg-neutral-950 border-neutral-800"
            />
        </div>
        <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor={isEdit ? 'edit-password' : 'password'} className="text-right">
                {isEdit ? '新密码' : '密码'}
            </Label>
            <Input
                id={isEdit ? 'edit-password' : 'password'}
                type="password"
                placeholder={isEdit ? '留空则不修改' : '为空则默认 123456'}
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                className="col-span-3 bg-neutral-950 border-neutral-800"
            />
        </div>
        <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor={isEdit ? 'edit-role' : 'role'} className="text-right">角色</Label>
            <Select value={formData.role} onValueChange={(val) => setFormData({ ...formData, role: val })}>
                <SelectTrigger className="col-span-3 bg-neutral-950 border-neutral-800">
                    <SelectValue placeholder="选择角色" />
                </SelectTrigger>
                <SelectContent className="bg-neutral-900 border-neutral-800 text-white">
                    <SelectItem value="student">Student（学生）</SelectItem>
                    <SelectItem value="admin">Admin（管理员）</SelectItem>
                </SelectContent>
            </Select>
        </div>
        <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor={isEdit ? 'edit-show-weekly' : 'show-weekly'} className="text-right">周报显示</Label>
            <div className="col-span-3 flex items-center gap-3">
                <Switch
                    id={isEdit ? 'edit-show-weekly' : 'show-weekly'}
                    checked={formData.show_in_weekly}
                    onCheckedChange={(checked) => setFormData({ ...formData, show_in_weekly: checked })}
                />
                <span className="text-sm text-neutral-400">在周汇总表中显示该学生</span>
            </div>
        </div>
    </div>
);

export default function AdminUsers() {
    const [users, setUsers] = useState<UserRecord[]>([]);
    const [loading, setLoading] = useState(true);

    const [isAddOpen, setIsAddOpen] = useState(false);
    const [isEditOpen, setIsEditOpen] = useState(false);

    // Delete confirm dialog
    const [deleteTarget, setDeleteTarget] = useState<UserRecord | null>(null);
    const [deleting, setDeleting] = useState(false);

    const emptyForm = { id: 0, username: '', name: '', password: '', role: 'student', show_in_weekly: true };
    const [formData, setFormData] = useState(emptyForm);
    const [submitting, setSubmitting] = useState(false);

    const fetchUsers = async () => {
        setLoading(true);
        try {
            const res = await api.get(`/admin/users`);
            setUsers(res.data);
        } catch (err) {
            console.error('Failed to fetch users', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchUsers(); }, []);

    const handleAddOpen = (open: boolean) => {
        setIsAddOpen(open);
        if (open) setFormData(emptyForm);
    };

    const handleEditOpen = (user: UserRecord) => {
        setFormData({
            id: user.id,
            username: user.username,
            name: user.name || '',
            password: '',
            role: user.role,
            show_in_weekly: user.show_in_weekly ?? true,
        });
        setIsEditOpen(true);
    };

    const handleSave = async () => {
        setSubmitting(true);
        try {
            const payload = {
                username: formData.username,
                name: formData.name || null,
                password: formData.password || null,
                role: formData.role,
                show_in_weekly: formData.show_in_weekly,
            };
            if (isEditOpen) {
                await api.put(`/admin/users/${formData.id}`, payload);
            } else {
                await api.post(`/admin/users`, payload);
            }
            setIsAddOpen(false);
            setIsEditOpen(false);
            fetchUsers();
        } catch (err: any) {
            alert(err.response?.data?.error || '保存失败');
        } finally {
            setSubmitting(false);
        }
    };

    const confirmDelete = async () => {
        if (!deleteTarget) return;
        setDeleting(true);
        try {
            await api.delete(`/admin/users/${deleteTarget.id}`);
            setDeleteTarget(null);
            fetchUsers();
        } catch (err: any) {
            alert(err.response?.data?.error || '删除失败');
        } finally {
            setDeleting(false);
        }
    };

    return (
        <Card className="border-neutral-800 bg-neutral-900">
            <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>所有用户</CardTitle>
                <Dialog open={isAddOpen} onOpenChange={handleAddOpen}>
                    <DialogTrigger asChild>
                        <Button className="bg-blue-600 hover:bg-blue-500 text-white">
                            <Plus className="w-4 h-4" /> 新增用户
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="bg-neutral-900 border-neutral-800 text-white sm:max-w-[450px]">
                        <DialogHeader>
                            <DialogTitle>新建用户</DialogTitle>
                        </DialogHeader>
                        <UserFormFields formData={formData} setFormData={setFormData} isEdit={false} />
                        <DialogFooter>
                            <Button disabled={submitting || !formData.username} onClick={handleSave} className="bg-blue-600 hover:bg-blue-500 text-white">
                                {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                保存
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </CardHeader>
            <CardContent>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>ID</TableHead>
                            <TableHead>用户名</TableHead>
                            <TableHead>真实姓名</TableHead>
                            <TableHead>角色</TableHead>
                            <TableHead>周报显示</TableHead>
                            <TableHead>创建时间</TableHead>
                            <TableHead className="text-right">操作</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {loading ? (
                            <TableRow>
                                <TableCell colSpan={7} className="text-center py-8">
                                    <Loader2 className="h-6 w-6 animate-spin mx-auto text-neutral-500" />
                                </TableCell>
                            </TableRow>
                        ) : users.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={7} className="text-center text-neutral-500 py-8">
                                    暂无用户
                                </TableCell>
                            </TableRow>
                        ) : (
                            users.map((u) => (
                                <TableRow key={u.id}>
                                    <TableCell className="text-neutral-500">{u.id}</TableCell>
                                    <TableCell className="font-medium">{u.username}</TableCell>
                                    <TableCell className="text-neutral-300">{u.name || '-'}</TableCell>
                                    <TableCell>
                                        <span className={`px-2 py-1 rounded-full text-xs ${u.role === 'admin' ? 'bg-blue-500/20 text-blue-400' : 'bg-green-500/20 text-green-400'}`}>
                                            {u.role}
                                        </span>
                                    </TableCell>
                                    <TableCell>
                                        {u.show_in_weekly
                                            ? <span className="text-green-400 text-sm">显示</span>
                                            : <span className="text-neutral-500 text-sm">隐藏</span>
                                        }
                                    </TableCell>
                                    <TableCell>{new Date(u.created_at).toLocaleString('zh-CN')}</TableCell>
                                    <TableCell className="text-right">
                                        <Button variant="ghost" size="icon" onClick={() => handleEditOpen(u)}>
                                            <Pencil className="h-4 w-4 text-blue-400" />
                                        </Button>
                                        <Button variant="ghost" size="icon" onClick={() => setDeleteTarget(u)}>
                                            <Trash2 className="h-4 w-4 text-red-400" />
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>

                {/* Edit Dialog */}
                <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
                    <DialogContent className="bg-neutral-900 border-neutral-800 text-white sm:max-w-[450px]">
                        <DialogHeader>
                            <DialogTitle>编辑用户</DialogTitle>
                        </DialogHeader>
                        <UserFormFields formData={formData} setFormData={setFormData} isEdit={true} />
                        <DialogFooter>
                            <Button disabled={submitting || !formData.username} onClick={handleSave} className="bg-blue-600 hover:bg-blue-500 text-white">
                                {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                保存修改
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>

                {/* Delete Confirm AlertDialog */}
                <AlertDialog open={!!deleteTarget} onOpenChange={(open) => { if (!open) setDeleteTarget(null); }}>
                    <AlertDialogContent className="bg-neutral-900 border-neutral-800 text-white">
                        <AlertDialogHeader>
                            <AlertDialogTitle>确认删除用户</AlertDialogTitle>
                            <AlertDialogDescription className="text-neutral-400">
                                你即将删除用户 <span className="text-white font-semibold">「{deleteTarget?.name || deleteTarget?.username}」</span>。<br />
                                此操作不可撤销，该用户的所有签到记录也将被一并删除。
                            </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                            <AlertDialogCancel className="bg-neutral-800 border-neutral-700 text-white hover:bg-neutral-700">
                                取消
                            </AlertDialogCancel>
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
            </CardContent>
        </Card>
    );
}
