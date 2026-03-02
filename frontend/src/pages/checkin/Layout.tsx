import { useNavigate, useLocation, Outlet } from 'react-router-dom';
import { useAuth } from '../../store/useAuth';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { MapPin, LogOut, History } from 'lucide-react';
import { useEffect } from 'react';

export default function CheckinLayout() {
    const { user, logout, isAuthenticated } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();

    useEffect(() => {
        if (!isAuthenticated) {
            navigate('/login');
        }
    }, [isAuthenticated, navigate]);

    if (!user) return null;

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    let currentTab = 'today';
    if (location.pathname.includes('/checkin/history')) currentTab = 'history';

    const handleTabChange = (value: string) => {
        if (value === 'today') navigate('/checkin/today');
        else if (value === 'history') navigate('/checkin/history');
    };

    return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-neutral-950 p-4">
            <div className="w-full max-w-md space-y-4">
                <div className="flex justify-between items-center mb-4">
                    <h1 className="text-xl font-bold text-white">欢迎，{user.name || user.username}</h1>
                    <Button variant="ghost" size="icon" onClick={handleLogout}>
                        <LogOut className="h-5 w-5 text-neutral-400" />
                    </Button>
                </div>

                <Tabs value={currentTab} onValueChange={handleTabChange} className="w-full">
                    <TabsList className="grid w-full grid-cols-2 mb-4 bg-neutral-900 border-neutral-800">
                        <TabsTrigger value="today" className="data-[state=active]:bg-neutral-800">
                            <MapPin className="w-4 h-4 mr-2" />
                            今日
                        </TabsTrigger>
                        <TabsTrigger value="history" className="data-[state=active]:bg-neutral-800">
                            <History className="w-4 h-4 mr-2" />
                            历史记录
                        </TabsTrigger>
                    </TabsList>
                </Tabs>

                <div className="w-full">
                    <Outlet />
                </div>
            </div>
        </div>
    );
}
