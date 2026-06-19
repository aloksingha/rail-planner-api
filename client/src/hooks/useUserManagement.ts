import { useState, useEffect, useCallback, useMemo } from 'react';
import axios from 'axios';
import { ALL_ROLES } from '../utils/constants';

export interface User {
    id: string;
    email: string;
    name: string | null;
    mobile: string | null;
    role: string;
    status: string;
    createdAt: string;
    createdByUserId?: string | null;
    hasSpecialPermission?: boolean;
    _count: { bookings: number };
}

export interface AddForm {
    email: string;
    name: string;
    mobile: string;
    role: string;
}

export interface Message {
    text: string;
    type: 'success' | 'error' | '';
}

/**
 * Hook to manage platform users, roles, and administrative operations.
 * Centralizes all logic for provisioning, filtering, and role updates.
 */
export const useUserManagement = () => {
    const [users, setUsers] = useState<User[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [filterRole, setFilterRole] = useState('ALL');
    const [changingRole, setChangingRole] = useState<string | null>(null);
    const [openDropdown, setOpenDropdown] = useState<string | null>(null);
    const [message, setMessage] = useState<Message>({ text: '', type: '' });
    const [showAddUser, setShowAddUser] = useState(false);
    const [addForm, setAddForm] = useState<AddForm>({ email: '', name: '', mobile: '', role: 'SALES_MANAGER' });
    const [addLoading, setAddLoading] = useState(false);
    const [selectedUserForWallet, setSelectedUserForWallet] = useState<User | null>(null);
    const [walletAmount, setWalletAmount] = useState('');
    const [walletReason, setWalletReason] = useState('Test Credit');
    const [isAdjustingWallet, setIsAdjustingWallet] = useState(false);

    let isSuperAdmin = false;
    let currentUser: any = null;
    try {
        const userStr = sessionStorage.getItem('mimic_user') || localStorage.getItem('user');
        if (userStr && userStr !== 'undefined' && userStr !== 'null') {
            currentUser = JSON.parse(userStr);
            isSuperAdmin = currentUser?.role === 'SUPER_ADMIN';
        }
    } catch (e) {
        console.error('Failed to parse user from storage:', e);
    }

    const showMsg = useCallback((text: string, type: 'success' | 'error') => {
        setMessage({ text, type });
        setTimeout(() => setMessage({ text: '', type: '' }), 5000);
    }, []);

    const fetchUsers = useCallback(async () => {
        setIsLoading(true);
        try {
            const token = localStorage.getItem('token');
            const { data } = await axios.get('/api/admin/users', {
                headers: { Authorization: `Bearer ${token}` }
            });
            setUsers(data.users);
        } catch (err: unknown) {
            const error = err as any;
            showMsg(error.response?.data?.error || 'Failed to load users.', 'error');
        } finally {
            setIsLoading(false);
        }
    }, [showMsg]);

    useEffect(() => {
        fetchUsers();
    }, [fetchUsers]);

    const handleRoleChange = async (userId: string, newRole: string, userEmail: string) => {
        if (!confirm(`Change role of "${userEmail}" to ${newRole}?`)) return;
        setChangingRole(userId);
        setOpenDropdown(null);
        try {
            const token = localStorage.getItem('token');
            await axios.patch(`/api/admin/users/${userId}/role`, { role: newRole }, {
                headers: { Authorization: `Bearer ${token}` }
            });
            showMsg(`✅ Role changed to ${newRole} for ${userEmail}`, 'success');
            fetchUsers();
        } catch (err: unknown) {
            const error = err as any;
            showMsg(error.response?.data?.error || 'Failed to change role.', 'error');
        } finally {
            setChangingRole(null);
        }
    };

    const handleAddUser = async (e: React.FormEvent) => {
        e.preventDefault();
        setAddLoading(true);
        try {
            const { data } = await axios.post('/api/admin/assign-role', addForm);
            showMsg(`✅ ${data.message || 'User provisioned successfully.'}`, 'success');
            setAddForm({ email: '', name: '', mobile: '', role: 'SALES_MANAGER' });
            setShowAddUser(false);
            fetchUsers();
        } catch (err: unknown) {
            const error = err as any;
            showMsg(error.response?.data?.error || 'Failed to provision user.', 'error');
        } finally {
            setAddLoading(false);
        }
    };

    const handleStatusUpdate = async (userId: string, status: string, userEmail: string) => {
        const action = status === 'ACTIVE' ? 'Restore Access' : status;
        if (!confirm(`${action} for user "${userEmail}"?`)) return;
        setChangingRole(userId);
        try {
            const token = localStorage.getItem('token');
            await axios.patch(`/api/admin/users/${userId}/status`, { status }, {
                headers: { Authorization: `Bearer ${token}` }
            });
            showMsg(`✅ Status updated to ${status} for ${userEmail}`, 'success');
            fetchUsers();
        } catch (err: unknown) {
            const error = err as any;
            showMsg(error.response?.data?.error || 'Failed to update status.', 'error');
        } finally {
            setChangingRole(null);
        }
    };

    const handleToggleSpecialPermission = async (userId: string, currentStatus: boolean, userEmail: string) => {
        if (!window.confirm(`Are you sure you want to ${currentStatus ? 'REVOKE' : 'GRANT'} special permissions for ${userEmail}?`)) return;
        try {
            const token = localStorage.getItem('token');
            await axios.put(`/api/admin/users/${userId}/special-permission`, { hasSpecialPermission: !currentStatus }, {
                headers: { Authorization: `Bearer ${token}` }
            });
            showMsg(`Successfully updated special permission for ${userEmail}`, 'success');
            setUsers(prev => prev.map(u => u.id === userId ? { ...u, hasSpecialPermission: !currentStatus } : u));
        } catch (err) {
            const error = err as any;
            showMsg(error.response?.data?.error || 'Failed to update special permission', 'error');
        }
    };

    const handleAdjustWallet = async (type: 'CREDIT' | 'DEBIT') => {
        if (!selectedUserForWallet || !walletAmount) return;
        setIsAdjustingWallet(true);
        try {
            const token = localStorage.getItem('token');
            await axios.post('/api/wallet/admin/adjust', {
                targetUserId: selectedUserForWallet.id,
                amount: parseFloat(walletAmount),
                type,
                description: walletReason
            }, {
                headers: { Authorization: `Bearer ${token}` }
            });
            showMsg(`✅ Wallet ${type === 'CREDIT' ? 'credited' : 'debited'} for ${selectedUserForWallet.email}`, 'success');
            setSelectedUserForWallet(null);
            setWalletAmount('');
            fetchUsers();
        } catch (err: unknown) {
            const error = err as any;
            console.error('Wallet Adjustment Failed:', error);
            const serverError = error.response?.data?.error;
            const status = error.response?.status;
            showMsg(serverError || `Failed to adjust wallet (Status: ${status || 'Network Error'})`, 'error');
        } finally {
            setIsAdjustingWallet(false);
        }
    };

    const handleMimicUser = async (user: User) => {
        if (!confirm(`Launch Mimic Session for ${user.email}? This will open in a new tab.`)) return;
        
        setChangingRole(user.id);
        try {
            const token = localStorage.getItem('token');
            const { data } = await axios.post(`/api/auth/impersonate-user/${user.id}`, {}, {
                headers: { Authorization: `Bearer ${token}` }
            });

            if (data.token) {
                window.open(`/?token=${data.token}`, '_blank');
            }
        } catch (err: unknown) {
            const error = err as any;
            showMsg(error.response?.data?.error || 'Failed to mimic user.', 'error');
        } finally {
            setChangingRole(null);
        }
    };

    const handleDeleteUser = async (userId: string, userEmail: string) => {
        if (!confirm(`Are you sure you want to permanently delete user "${userEmail}"? This will cascade delete all bookings, wallets, and logs. This action is IRREVERSIBLE!`)) return;
        setChangingRole(userId);
        try {
            const token = localStorage.getItem('token');
            await axios.delete(`/api/admin/users/${userId}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            showMsg(`✅ User ${userEmail} deleted successfully`, 'success');
            fetchUsers();
        } catch (err: unknown) {
            const error = err as any;
            showMsg(error.response?.data?.error || 'Failed to delete user.', 'error');
        } finally {
            setChangingRole(null);
        }
    };

    const filteredUsers = useMemo(() => {
        if (!Array.isArray(users)) return [];
        return users.filter(u => {
            if (!u) return false;
            const roleMatch = filterRole === 'ALL' || u.role === filterRole;
            const userEmail = u.email || '';
            const userName = u.name || '';
            const searchMatch = !search || 
                userEmail.toLowerCase().includes(search.toLowerCase()) || 
                userName.toLowerCase().includes(search.toLowerCase());
            return roleMatch && searchMatch;
        });
    }, [users, filterRole, search]);

    const groupedUsers = useMemo(() => {
        return ALL_ROLES.reduce<Record<string, User[]>>((acc, role) => {
            acc[role] = filteredUsers.filter(u => u.role === role);
            return acc;
        }, {});
    }, [filteredUsers]);

    const totalByRole = useMemo(() => {
        if (!Array.isArray(users)) return ALL_ROLES.reduce((acc, r) => ({ ...acc, [r]: 0 }), {});
        return ALL_ROLES.reduce<Record<string, number>>((acc, r) => {
            acc[r] = users.filter(u => u && u.role === r).length;
            return acc;
        }, {});
    }, [users]);

    return {
        users,
        isLoading,
        search,
        setSearch,
        filterRole,
        setFilterRole,
        changingRole,
        setChangingRole,
        openDropdown,
        setOpenDropdown,
        message,
        showMsg,
        showAddUser,
        setShowAddUser,
        addForm,
        setAddForm,
        addLoading,
        selectedUserForWallet,
        setSelectedUserForWallet,
        walletAmount,
        setWalletAmount,
        walletReason,
        setWalletReason,
        isAdjustingWallet,
        isSuperAdmin,
        currentUser,
        fetchUsers,
        handleRoleChange,
        handleAddUser,
        handleStatusUpdate,
        handleToggleSpecialPermission,
        handleDeleteUser,
        handleAdjustWallet,
        handleMimicUser,
        filteredUsers,
        groupedUsers,
        totalByRole,
        isSuperAdmin
    };
};
