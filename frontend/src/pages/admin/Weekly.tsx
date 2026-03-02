import { useEffect, useState, useRef } from 'react';
import api from '../../lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Image as ImageIcon, CalendarIcon } from 'lucide-react';
import html2canvas from 'html2canvas';
import { format } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import { cn } from '@/lib/utils';

interface WeeklySummary {
    id: number;
    username: string;
    name: string | null;
    checkins: Record<string, string | null>;
}

export default function AdminWeekly() {
    const [summaries, setSummaries] = useState<WeeklySummary[]>([]);
    const [weekStartDate, setWeekStartDate] = useState<Date>(() => {
        const d = new Date();
        d.setDate(d.getDate() - (d.getDay() === 0 ? 6 : d.getDay() - 1)); // Default to last Monday
        return d;
    });

    // Helper to get local YYYY-MM-DD
    const getLocalDateStr = (dateObj: Date) => {
        const y = dateObj.getFullYear();
        const m = String(dateObj.getMonth() + 1).padStart(2, '0');
        const d = String(dateObj.getDate()).padStart(2, '0');
        return `${y}-${m}-${d}`;
    };

    const weekStart = getLocalDateStr(weekStartDate);
    const reportRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const fetchSummaries = async () => {
            try {
                const res = await api.get(`/admin/weekly-export?start_date=${weekStart}`);

                // Process the data on the client side to use local timezone
                const processedSummaries = res.data.map((s: any) => {
                    const localCheckins: Record<string, string | null> = {};

                    // Initialize the week with nulls
                    weekDays.forEach(day => localCheckins[day] = null);

                    s.checkins.forEach((isoString: string) => {
                        const d = new Date(isoString);
                        // Convert to local YYYY-MM-DD
                        const localDateStr = d.getFullYear() + '-' +
                            String(d.getMonth() + 1).padStart(2, '0') + '-' +
                            String(d.getDate()).padStart(2, '0');

                        // If the local date falls within the displayed week, save the local time
                        if (localCheckins[localDateStr] !== undefined) {
                            localCheckins[localDateStr] = d.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
                        }
                    });

                    return {
                        id: s.id,
                        username: s.username,
                        name: s.name ?? null,
                        checkins: localCheckins
                    };
                });
                setSummaries(processedSummaries);
            } catch (err) {
                console.error('Failed to fetch weekly summaries', err);
            }
        };
        fetchSummaries();
    }, [weekStartDate]);

    const weekDays = Array.from({ length: 7 }).map((_, i) => {
        const d = new Date(weekStart);
        d.setDate(d.getDate() + i);
        return d.toISOString().split('T')[0];
    });

    const exportImage = async () => {
        if (!reportRef.current || summaries.length === 0) return;

        try {
            const canvas = await html2canvas(reportRef.current, {
                backgroundColor: '#171717', // Match neutral-900 background
                scale: 2 // Higher resolution
            });

            const url = canvas.toDataURL('image/png');
            const link = document.createElement('a');
            link.download = `weekly_report_${weekStart}.png`;
            link.href = url;
            link.click();
        } catch (err) {
            console.error('Failed to export image', err);
        }
    };

    return (
        <Card ref={reportRef} className="border-neutral-800 bg-neutral-900 hover:shadow-lg transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between pb-2" data-html2canvas-ignore>
                <CardTitle>周汇总表</CardTitle>
                <div className="flex items-center space-x-4">
                    <div className="flex items-center space-x-2">
                        <Label>起始日期 (周一)</Label>
                        <Popover>
                            <PopoverTrigger asChild>
                                <Button
                                    variant={"outline"}
                                    className={cn(
                                        "w-[175px] justify-start text-left font-normal bg-neutral-950 border-neutral-800",
                                        !weekStartDate && "text-muted-foreground"
                                    )}
                                >
                                    <CalendarIcon className="w-4 h-4" />
                                    {weekStartDate ? format(weekStartDate, "PPP", { locale: zhCN }) : <span>选择日期</span>}
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0 bg-neutral-900 border-neutral-800 text-white" align="end">
                                <Calendar
                                    mode="single"
                                    selected={weekStartDate}
                                    onSelect={(d) => d && setWeekStartDate(d)}
                                    initialFocus
                                    locale={zhCN}
                                />
                            </PopoverContent>
                        </Popover>
                    </div>
                    <Button onClick={exportImage} variant="default" className="bg-blue-600 hover:bg-blue-500 text-white">
                        <ImageIcon className="w-4 h-4" />
                        导出图片
                    </Button>
                </div>
            </CardHeader>
            <CardContent className="overflow-x-auto">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead className="min-w-[120px]">学生</TableHead>
                            {weekDays.map(day => (
                                <TableHead key={day} className="text-center min-w-[100px]">
                                    {new Date(day).toLocaleDateString('zh-CN', { weekday: 'short', month: 'short', day: 'numeric' })}
                                </TableHead>
                            ))}
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {summaries.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={8} className="text-center text-neutral-500 py-8">
                                    没有找到汇总数据
                                </TableCell>
                            </TableRow>
                        ) : (
                            summaries.map((s) => (
                                <TableRow key={s.id}>
                                    <TableCell className="font-medium">{s.name || s.username}</TableCell>
                                    {weekDays.map(day => (
                                        <TableCell key={day} className="text-center">
                                            {s.checkins[day] ? (
                                                <span className="text-green-400 font-medium">{s.checkins[day]}</span>
                                            ) : (
                                                <span className="text-neutral-600">--</span>
                                            )}
                                        </TableCell>
                                    ))}
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </CardContent>
        </Card>
    );
}
