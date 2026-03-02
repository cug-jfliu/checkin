import { useNavigate, useLocation, Outlet } from 'react-router-dom';
import { useAuth } from '../../store/useAuth';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { LogOut, Users, FileClock, CalendarDays } from 'lucide-react';
import { useEffect } from 'react';

export default function AdminLayout() {
    const { user, logout, isAuthenticated } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();

    useEffect(() => {
        if (!isAuthenticated || user?.role !== 'admin') {
            navigate('/login');
        }
    }, [isAuthenticated, user, navigate]);

    if (user?.role !== 'admin') return null;

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    let currentTab = 'checkins';
    if (location.pathname.includes('/admin/users')) currentTab = 'users';
    else if (location.pathname.includes('/admin/weekly')) currentTab = 'weekly';

    const handleTabChange = (value: string) => {
        if (value === 'checkins') navigate('/admin/checkins');
        else if (value === 'users') navigate('/admin/users');
        else if (value === 'weekly') navigate('/admin/weekly');
    };

    return (
        <div className="min-h-screen bg-neutral-950 p-8">
            <div className="max-w-6xl mx-auto space-y-6">
                <div className="flex justify-between items-center bg-neutral-900 p-4 rounded-lg border border-neutral-800">
                    <h1 className="text-2xl font-bold text-white">管理员后台</h1>
                    <div className="flex items-center space-x-4">
                        <span className="text-neutral-400">已登录账号：{user?.username}</span>
                        <Button variant="outline" onClick={handleLogout}>
                            <LogOut className="h-4 w-4" />
                            退出登录
                        </Button>
                    </div>
                </div>

                <Tabs value={currentTab} onValueChange={handleTabChange} className="w-full">
                    <TabsList className="grid w-[600px] grid-cols-3 bg-neutral-900 border-neutral-800">
                        <TabsTrigger value="checkins" className="data-[state=active]:bg-neutral-800">
                            <FileClock className="w-4 h-4 mr-2" />
                            每日签到
                        </TabsTrigger>
                        <TabsTrigger value="users" className="data-[state=active]:bg-neutral-800">
                            <Users className="w-4 h-4 mr-2" />
                            用户管理
                        </TabsTrigger>
                        <TabsTrigger value="weekly" className="data-[state=active]:bg-neutral-800">
                            <CalendarDays className="w-4 h-4 mr-2" />
                            周汇总表
                        </TabsTrigger>
                    </TabsList>
                </Tabs>

                <div className="mt-6">
                    <Outlet />
                </div>
            </div>
        </div>
    );
}
