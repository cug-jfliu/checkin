import { useEffect, useState } from 'react';
import api from '../../lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { format } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import { CalendarIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface CheckinRecord {
    id: number;
    username: string;
    name: string | null;
    checkin_time: string;
    latitude: number | null;
    longitude: number | null;
}

export default function AdminCheckins() {
    const [records, setRecords] = useState<CheckinRecord[]>([]);
    const [date, setDate] = useState<Date>(new Date());

    useEffect(() => {
        const fetchRecords = async () => {
            try {
                // Ensure date string is local YYYY-MM-DD
                const y = date.getFullYear();
                const m = String(date.getMonth() + 1).padStart(2, '0');
                const d = String(date.getDate()).padStart(2, '0');
                const dateStr = `${y}-${m}-${d}`;

                const res = await api.get(`/admin/records?date=${dateStr}`);
                setRecords(res.data);
            } catch (err) {
                console.error('Failed to fetch records', err);
            }
        };
        fetchRecords();
    }, [date]);

    return (
        <Card className="border-neutral-800 bg-neutral-900">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle>每日签到记录</CardTitle>
                <div className="flex items-center space-x-2">
                    <Label>日期筛选</Label>
                    <Popover>
                        <PopoverTrigger asChild>
                            <Button
                                variant={"outline"}
                                className={cn(
                                    "w-[175px] justify-start text-left font-normal bg-neutral-950 border-neutral-800",
                                    !date && "text-muted-foreground"
                                )}
                            >
                                <CalendarIcon className="w-4 h-4" />
                                {date ? format(date, "PPP", { locale: zhCN }) : <span>选择日期</span>}
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
            </CardHeader>
            <CardContent>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>用户</TableHead>
                            <TableHead>时间</TableHead>
                            <TableHead>定位</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {records.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={3} className="text-center text-neutral-500 py-8">
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
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </CardContent>
        </Card>
    );
}
