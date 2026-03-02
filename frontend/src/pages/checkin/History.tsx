import { useEffect, useState } from 'react';
import api from '../../lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { MapPin as MapPinIcon } from 'lucide-react';

interface Record {
    id: number;
    checkin_time: string;
    latitude: number | null;
    longitude: number | null;
}

export default function CheckinHistory() {
    const [history, setHistory] = useState<Record[]>([]);

    useEffect(() => {
        const fetchHistory = async () => {
            try {
                const res = await api.get('/checkin/history');
                // Filter to the last 7 days only
                const sevenDaysAgo = new Date();
                sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
                const filtered = (res.data as Record[]).filter(
                    (r) => new Date(r.checkin_time) >= sevenDaysAgo
                );
                setHistory(filtered);
            } catch (err) {
                console.error(err);
            }
        };

        fetchHistory();
    }, []);

    return (
        <Card className="w-full border-neutral-800 bg-neutral-900">
            <CardHeader>
                <CardTitle>最近七天签到记录</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
                <Table>
                    <TableHeader>
                        <TableRow className="border-neutral-800 hover:bg-neutral-800/50">
                            <TableHead>日期</TableHead>
                            <TableHead>时间</TableHead>
                            <TableHead className="text-right">定位</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {history.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={3} className="text-center text-neutral-500 py-8">
                                    没有签到记录
                                </TableCell>
                            </TableRow>
                        ) : (
                            history.map((record) => {
                                const d = new Date(record.checkin_time);
                                return (
                                    <TableRow key={record.id} className="border-neutral-800 hover:bg-neutral-800/50">
                                        <TableCell className="font-medium">
                                            {d.toLocaleDateString('zh-CN', { month: 'long', day: 'numeric', weekday: 'long' })}
                                        </TableCell>
                                        <TableCell className="text-neutral-400">
                                            {d.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}
                                        </TableCell>
                                        <TableCell className="text-right">
                                            {record.latitude && record.longitude ? (
                                                <a
                                                    href={`https://maps.google.com/?q=${record.latitude},${record.longitude}`}
                                                    target="_blank"
                                                    rel="noreferrer"
                                                    className="inline-flex items-center justify-end text-blue-400 hover:text-blue-300"
                                                >
                                                    <MapPinIcon className="h-4 w-4" />
                                                </a>
                                            ) : (
                                                <span className="text-neutral-600 text-sm">--</span>
                                            )}
                                        </TableCell>
                                    </TableRow>
                                );
                            })
                        )}
                    </TableBody>
                </Table>
            </CardContent>
        </Card>
    );
}
