import { useEffect, useState } from 'react';
import api from '../../lib/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { MapPin, CheckCircle2, Coffee } from 'lucide-react';
import { isWorkday } from 'chinese-days';

export default function CheckinToday() {
    const [loading, setLoading] = useState(false);
    const [checkedIn, setCheckedIn] = useState(false);
    const [checkinTime, setCheckinTime] = useState<string | null>(null);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);
    const todayIsWorkday = isWorkday(new Date());

    useEffect(() => {
        const checkToday = async () => {
            try {
                const res = await api.get('/checkin/today');
                if (res.data) {
                    setCheckedIn(true);
                    setCheckinTime(new Date(res.data.checkin_time).toLocaleTimeString('zh-CN'));
                }
            } catch (err) {
                console.error(err);
            }
        };

        checkToday();
    }, []);

    const handleCheckin = () => {
        setLoading(true);
        setErrorMsg(null);
        if (!navigator.geolocation) {
            submitCheckin(null, null);
            return;
        }

        navigator.geolocation.getCurrentPosition(
            (pos) => submitCheckin(pos.coords.latitude, pos.coords.longitude),
            (err) => {
                console.warn('Geolocation failed', err);
                submitCheckin(null, null);
            },
            { enableHighAccuracy: true, timeout: 5000 }
        );
    };

    const submitCheckin = async (lat: number | null, lng: number | null) => {
        try {
            const res = await api.post('/checkin', { latitude: lat, longitude: lng });
            setCheckedIn(true);
            setCheckinTime(new Date(res.data.checkin_time).toLocaleTimeString('zh-CN'));
        } catch (err: any) {
            setErrorMsg(err.response?.data?.error || '签到失败');
        } finally {
            setLoading(false);
        }
    };

    return (
        <Card className="w-full border-neutral-800 bg-neutral-900 overflow-hidden">
            <CardHeader className="text-center pb-2">
                <CardTitle className="text-3xl font-light">今日签到</CardTitle>
                <CardDescription>
                    {new Date().toLocaleDateString('zh-CN', { weekday: 'long', month: 'long', day: 'numeric' })}
                </CardDescription>
                {errorMsg && (
                    <p className="text-sm text-red-400 mt-1">{errorMsg}</p>
                )}
            </CardHeader>
            <CardContent className="flex flex-col items-center justify-center p-8 min-h-[300px]">
                {!todayIsWorkday ? (
                    <div className="flex flex-col items-center space-y-4 animate-in fade-in zoom-in duration-500">
                        <div className="rounded-full bg-orange-500/20 p-4">
                            <Coffee className="h-16 w-16 text-orange-500" />
                        </div>
                        <h2 className="text-2xl font-semibold text-white">今天放假无需签到</h2>
                        <p className="text-neutral-400 text-sm">好好休息一下吧！</p>
                    </div>
                ) : checkedIn ? (
                    <div className="flex flex-col items-center space-y-4 animate-in fade-in zoom-in duration-500">
                        <div className="rounded-full bg-green-500/20 p-4">
                            <CheckCircle2 className="h-16 w-16 text-green-500" />
                        </div>
                        <h2 className="text-2xl font-semibold text-white">已签到</h2>
                        <p className="text-neutral-400 text-sm">时间：{checkinTime}</p>
                    </div>
                ) : (
                    <Button
                        onClick={handleCheckin}
                        disabled={loading}
                        className="h-40 w-40 rounded-full text-xl font-bold shadow-lg shadow-blue-500/20 hover:shadow-blue-500/40 transition-all duration-300 transform hover:scale-105 bg-blue-600 hover:bg-blue-500"
                    >
                        {loading ? '定位中...' : '签到'}
                        {!loading && <MapPin className="ml-2 h-5 w-5" />}
                    </Button>
                )}
            </CardContent>
        </Card>
    );
}
