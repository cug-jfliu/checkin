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
        <Card className={`w-full border-neutral-800 bg-neutral-900 overflow-hidden transition-all duration-500 ${!todayIsWorkday && !checkedIn ? 'ring-1 ring-orange-500/30' : ''}`}>
            <CardHeader className="text-center pb-2">
                <CardTitle className="text-3xl font-light">
                    {!todayIsWorkday && !checkedIn ? '✨ 卷王签到' : '今日签到'}
                </CardTitle>
                <CardDescription>
                    {new Date().toLocaleDateString('zh-CN', { weekday: 'long', month: 'long', day: 'numeric' })}
                    {!todayIsWorkday && <span className="ml-2 text-orange-500 font-medium">(休息日)</span>}
                </CardDescription>
                {errorMsg && (
                    <p className="text-sm text-red-400 mt-1">{errorMsg}</p>
                )}
            </CardHeader>
            <CardContent className="flex flex-col items-center justify-center p-8 min-h-[300px]">
                {checkedIn ? (
                    <div className="flex flex-col items-center space-y-4 animate-in fade-in zoom-in duration-500">
                        <div className={`rounded-full p-4 ${!todayIsWorkday ? 'bg-orange-500/20 active:scale-110 transition-transform' : 'bg-green-500/20'}`}>
                            <CheckCircle2 className={`h-16 w-16 ${!todayIsWorkday ? 'text-orange-500' : 'text-green-500'}`} />
                        </div>
                        <h2 className="text-2xl font-semibold text-white">
                            {!todayIsWorkday ? '休息日签到成功！' : '已签到'}
                        </h2>
                        <p className="text-neutral-400 text-sm">时间：{checkinTime}</p>
                        {!todayIsWorkday && (
                            <p className="text-orange-400/80 text-xs italic animate-pulse">勤奋如你，休息日也不忘签到 🔥</p>
                        )}
                    </div>
                ) : (
                    <div className="flex flex-col items-center space-y-6">
                        {!todayIsWorkday && (
                            <div className="flex items-center space-x-2 text-orange-500 bg-orange-500/10 px-4 py-1.5 rounded-full animate-bounce">
                                <Coffee className="h-4 w-4" />
                                <span className="text-sm font-medium">卷王模式已开启</span>
                            </div>
                        )}
                        <Button
                            onClick={handleCheckin}
                            disabled={loading}
                            className={`h-40 w-40 rounded-full text-xl font-bold transition-all duration-300 transform hover:scale-105 ${!todayIsWorkday
                                    ? 'bg-gradient-to-br from-orange-600 to-red-600 hover:from-orange-500 hover:to-red-500 shadow-[0_0_20px_rgba(234,88,12,0.3)] hover:shadow-[0_0_30px_rgba(234,88,12,0.5)] border-2 border-orange-400/50'
                                    : 'bg-blue-600 hover:bg-blue-500 shadow-lg shadow-blue-500/20 hover:shadow-blue-500/40'
                                }`}
                        >
                            {loading ? '定位中...' : (!todayIsWorkday ? '卷王签到' : '签到')}
                            {!loading && <MapPin className="ml-2 h-5 w-5" />}
                        </Button>
                        {!todayIsWorkday && (
                            <p className="text-neutral-500 text-sm">虽然是休息日，但签到永不停歇</p>
                        )}
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
