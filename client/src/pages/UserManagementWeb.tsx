import { useEffect, useState } from 'react';
import { Users, Shield, Zap, Train, Settings, Search, RefreshCw, ChevronDown, CheckCircle2, AlertCircle, UserCog, UserPlus, X, Wallet, Minus, Loader2, AlertTriangle, Trash2, Star } from 'lucide-react';
import { isValidIndianMobile } from '../utils/validation';
import { STATUS_META, ALL_ROLES, ROLE_META } from '../utils/constants';
import { useUserManagement, User } from '../hooks/useUserManagement';

export default function UserManagement() {
    const {
        users,
        isLoading,
        search,
        setSearch,
        filterRole,
        setFilterRole,
        changingRole,
        openDropdown,
        setOpenDropdown,
        message,
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
        handleAdjustWallet,
        handleMimicUser,
        handleDeleteUser,
        handleUpdateSpecialPermissions,
        filteredUsers,
        groupedUsers,
        totalByRole
    } = useUserManagement();

    const [selectedUserForPermissions, setSelectedUserForPermissions] = useState<User | null>(null);
    const [modalPermissions, setModalPermissions] = useState<string[]>([]);

    const PERMISSION_OPTIONS = [
        { key: 'BROADCAST_MESSAGES', label: 'Broadcast Messages' },
        { key: 'CORRIDOR_PRICING', label: 'Corridor Pricing' },
        { key: 'PRICE_REQUESTS', label: 'Price Requests' },
        { key: 'FAILED_BOOKINGS', label: 'Failed Bookings' },
        { key: 'GLOBAL_BOOKINGS', label: 'Global Bookings' },
        { key: 'WALLET_MANAGEMENT', label: 'Wallet Management' },
        { key: 'MANAGE_COUPONS', label: 'Manage Coupons' },
    ];

    useEffect(() => {
        const handler = () => setOpenDropdown(null);
        document.addEventListener('click', handler);
        return () => document.removeEventListener('click', handler);
    }, [setOpenDropdown]);


    return (
        <div className="bg-transparent pb-12 w-full">
            <div className="max-w-6xl mx-auto px-4 sm:px-6 mt-8">

                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                    <div className="flex flex-row items-center gap-4">
                        <div className="p-2 sm:p-2.5 bg-rose-500/10 dark:bg-rose-500/15 rounded-xl border border-rose-500/20 shrink-0">
                            <Users size={20} className="text-rose-500 dark:text-rose-400" />
                        </div>
                        <div>
                            <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tight italic leading-tight">
                                User Management
                            </h1>
                            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 font-medium mt-1">Control platform access and provision executive roles.</p>
                        </div>
                    </div>
                    <button
                        onClick={() => setShowAddUser(v => !v)}
                        className="flex items-center justify-center gap-2 px-4 py-2 bg-violet-600 hover:bg-violet-500 text-white text-sm font-bold rounded-xl transition-colors w-full sm:w-auto"
                    >
                        {showAddUser ? <X size={14} /> : <UserPlus size={14} />}
                        {showAddUser ? 'Cancel' : 'Add User'}
                    </button>
                </div>

                {/* Add User Panel */}
                {showAddUser && (
                    <div className="glass-card rounded-[2rem] p-4 sm:p-8 mb-8 animate-in slide-in-from-top-4 duration-300 shadow-2xl shadow-brand-teal/10 border-white/40 dark:border-white/5 relative overflow-hidden">
                        <div className="absolute top-0 right-0 p-8 opacity-5 pointer-events-none">
                             <UserPlus size={120} className="text-brand-teal" />
                        </div>
                        
                        <h2 className="text-lg font-black text-slate-900 dark:text-white mb-6 flex items-center gap-2 uppercase italic">
                            <UserPlus size={20} className="text-brand-teal" /> 
                            Provision New User
                        </h2>
                        
                        <form onSubmit={handleAddUser} className="grid grid-cols-1 sm:grid-cols-2 gap-6 relative z-10">
                            <div className="sm:col-span-2">
                                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 ml-1">Email Address</label>
                                <input type="email" required value={addForm.email} onChange={e => setAddForm(p => ({ ...p, email: e.target.value }))} placeholder="user@example.com" className="w-full bg-white dark:bg-slate-950 border border-slate-300 dark:border-white/10 rounded-2xl px-5 py-3 text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-brand-teal/50 font-mono transition-all" />
                            </div>
                            <div>
                                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 ml-1">Full Name</label>
                                <input type="text" value={addForm.name} onChange={e => setAddForm(p => ({ ...p, name: e.target.value }))} placeholder="John Doe" className="w-full bg-white dark:bg-slate-950 border border-slate-300 dark:border-white/10 rounded-2xl px-5 py-3 text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-brand-teal/50 transition-all" />
                            </div>
                            <div>
                                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 ml-1">Mobile Number</label>
                                <input 
                                    type="tel" 
                                    value={addForm.mobile} 
                                    onChange={e => {
                                        const val = e.target.value.replace(/\D/g, '');
                                        if (val.length <= 10) {
                                            setAddForm(p => ({ ...p, mobile: val }));
                                        }
                                    }}
                                    placeholder="9876543210" 
                                    className={`w-full bg-white dark:bg-slate-950 border rounded-2xl px-5 py-3 text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none transition-all font-mono ${
                                        addForm.mobile.length > 0 && !isValidIndianMobile(addForm.mobile) && addForm.mobile.length === 10
                                            ? 'border-rose-500' 
                                            : addForm.mobile.length === 10 
                                                ? 'border-emerald-500/50' 
                                                : 'border-slate-300 dark:border-white/10 focus:border-brand-teal/50'
                                    }`} 
                                />
                                {addForm.mobile.length > 0 && addForm.mobile.length < 10 && (
                                    <p className="text-[9px] text-amber-500 font-bold mt-1 ml-1 animate-pulse">Entering digits ({addForm.mobile.length}/10)...</p>
                                )}
                                {addForm.mobile.length === 10 && !isValidIndianMobile(addForm.mobile) && (
                                    <p className="text-[9px] text-rose-500 font-bold mt-1 ml-1 uppercase">Invalid! Must start with 6-9</p>
                                )}
                            </div>
                            <div className="sm:col-span-2">
                                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 ml-1">Assigned Role</label>
                                <select value={addForm.role} onChange={e => setAddForm(p => ({ ...p, role: e.target.value }))} className="w-full bg-white dark:bg-slate-950 border border-slate-300 dark:border-white/10 rounded-2xl px-5 py-3 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-brand-teal/50 transition-all appearance-none cursor-pointer font-bold">
                                    <option value="SALES_MANAGER">Sales Manager</option>
                                    <option value="ADMIN">Admin</option>
                                    <option value="SUPER_ADMIN">Super Admin</option>
                                    <option value="CUSTOMER">Customer</option>
                                </select>
                            </div>
                            <div className="sm:col-span-2 pt-2">
                                <button type="submit" disabled={addLoading || !isValidIndianMobile(addForm.mobile)} className="w-full btn-primary py-4 text-sm uppercase tracking-widest flex items-center justify-center gap-3 disabled:opacity-30 disabled:cursor-not-allowed">
                                    {addLoading ? <Loader2 size={20} className="animate-spin" /> : <UserPlus size={20} />}
                                    {addLoading ? 'Establishing Identity...' : 'Provision Executive Access'}
                                </button>
                            </div>
                        </form>
                    </div>
                )}

                {/* Message */}
                {message.text && (
                    <div className={`flex items-center gap-3 p-4 rounded-xl border mb-6 text-sm font-medium ${
                        message.type === 'success'
                            ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                            : 'bg-rose-500/10 border-rose-500/30 text-rose-300'
                    }`}>
                        {message.type === 'success' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
                        {message.text}
                    </div>
                )}

                {/* Stats Cards */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                    {ALL_ROLES.map(role => {
                        const meta = ROLE_META[role] || { label: role, color: 'text-slate-400', icon: Users, bg: 'bg-slate-100', border: 'border-slate-200' };
                        const Icon = meta.icon || Users;
                        const isFiltered = filterRole === role;
                        return (
                            <button
                                key={role}
                                onClick={() => setFilterRole(isFiltered ? 'ALL' : role)}
                                className={`flex flex-col items-start p-5 rounded-2xl border transition-all cursor-pointer text-left relative overflow-hidden group ${
                                    isFiltered
                                        ? `${meta.bg} ${meta.border} shadow-lg shadow-black/5`
                                        : 'bg-white dark:bg-slate-900/50 border-slate-300 dark:border-white/5 hover:border-slate-400 dark:hover:border-white/10 shadow-sm'
                                }`}
                            >
                                <div className={`absolute -right-4 -bottom-4 opacity-5 group-hover:scale-110 group-hover:rotate-6 transition-all duration-500`}>
                                     <Icon size={80} className={meta.color} />
                                </div>
                                <div className="flex items-center gap-2.5 mb-3 relative z-10">
                                    <div className={`p-2 rounded-lg ${meta.bg}`}>
                                        <Icon size={14} className={meta.color} />
                                    </div>
                                    <span className={`text-[10px] font-black uppercase tracking-widest ${meta.color}`}>{meta.label}</span>
                                </div>
                                <span className={`text-3xl font-black mb-1 relative z-10 ${isFiltered ? meta.color : 'text-slate-900 dark:text-white'}`}>{totalByRole[role] || 0}</span>
                                <span className="text-[10px] text-slate-500 font-bold uppercase tracking-tight relative z-10">
                                    {isFiltered ? 'Clear Selection' : 'Click to Scope'}
                                </span>
                            </button>
                        );
                    })}
                </div>

                {/* Search + Refresh */}
                <div className="flex gap-4 mb-10">
                    <div className="relative flex-1 group">
                        <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-rose-500 transition-colors" />
                        <input
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            placeholder="Find identifying email or full name..."
                            className="w-full bg-white dark:bg-slate-950/60 border border-slate-300 dark:border-white/5 rounded-2xl pl-12 pr-4 py-3.5 text-sm text-slate-900 dark:text-white placeholder-slate-500 focus:outline-none focus:border-rose-500 shadow-md transition-all shadow-slate-200/50 dark:shadow-none"
                        />
                    </div>
                    <button
                        onClick={fetchUsers}
                        className="px-4 bg-white dark:bg-slate-950/60 border border-slate-300 dark:border-white/5 rounded-2xl text-slate-500 hover:text-rose-500 hover:border-rose-500/50 transition-all shadow-md shadow-slate-200/50 dark:shadow-none"
                        title="Refresh Registry"
                    >
                        <RefreshCw size={18} className={isLoading ? 'animate-spin' : ''} />
                    </button>
                </div>

                {/* User Groups */}
                {isLoading ? (
                    <div className="text-center py-16 text-slate-500">
                        <RefreshCw size={24} className="animate-spin mx-auto mb-3" />
                        <p>Loading users...</p>
                    </div>
                ) : (
                    <>
                        {ALL_ROLES.map(role => {
                            const meta = ROLE_META[role] || { label: role, color: 'text-slate-400', icon: Users, bg: 'bg-slate-100', border: 'border-slate-200' };
                            const Icon = meta.icon || Users;
                            const roleUsers = (groupedUsers && groupedUsers[role]) || [];
                            if (roleUsers.length === 0) return null;
                            return (
                                <div key={role} className="mb-12">
                                    <div className="flex items-center gap-3 mb-5 ml-1">
                                        <div className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border text-[10px] font-black uppercase tracking-widest ${meta.bg} ${meta.border} ${meta.color}`}>
                                            <Icon size={12} />
                                            {meta.label}
                                        </div>
                                        <div className="h-px flex-1 bg-slate-200 dark:bg-white/5" />
                                        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-tight">{roleUsers.length} Recorded Identity</span>
                                    </div>
                                    <div className="grid grid-cols-1 gap-3">
                                        {roleUsers.map(user => (
                                            <div key={user.id} className="flex flex-col sm:flex-row sm:items-center gap-4 bg-white dark:bg-slate-900/50 border border-slate-300 dark:border-white/5 rounded-2xl p-5 hover:border-brand-blue dark:hover:border-white/10 transition-all group shadow-md shadow-slate-200/50 dark:shadow-none">
                                                <div className="flex items-center gap-5 flex-1 min-w-0">
                                                     {/* Avatar */}
                                                    <div className={`w-11 h-11 rounded-xl flex items-center justify-center text-base font-black shrink-0 shadow-lg shadow-black/5 ${meta.bg} ${meta.color}`}>
                                                        {(user.name || user.email || "?")[0].toUpperCase()}
                                                    </div>

                                                    {/* Info */}
                                                    <div className="flex-1 min-w-0">
                                                        <p className="text-base font-black text-slate-900 dark:text-white truncate tracking-tight">{user.name || 'Anonymous User'}</p>
                                                        <div className="flex items-center gap-2 mt-0.5">
                                                            <p className="text-xs font-bold text-slate-600 dark:text-slate-400 truncate font-mono">{user.email}</p>
                                                            {user.status && (
                                                                <span className={`text-[9px] font-black px-2 py-0.5 rounded border uppercase tracking-widest ${STATUS_META[user.status]?.bg || 'bg-slate-100'} ${STATUS_META[user.status]?.color || 'text-slate-600'} ${STATUS_META[user.status]?.border || 'border-slate-300'}`}>
                                                                    {STATUS_META[user.status]?.label || user.status}
                                                                </span>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* Action Buttons Container */}
                                                <div className="flex flex-wrap items-center gap-2.5 w-full sm:w-auto sm:ml-auto">
                                                    {/* Bookings (Mobile Visible) */}
                                                    <div className="sm:hidden flex items-center gap-2 px-3 py-1.5 bg-slate-100 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-white/5 mr-auto">
                                                        <span className="text-xs font-black text-slate-900 dark:text-white">{user._count?.bookings ?? 0}</span>
                                                        <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Bookings</span>
                                                    </div>

                                                    {/* Mimic User Button */}
                                                    <div className="flex items-center gap-2">
                                                        {user.status === 'BLOCKED' ? (
                                                            <button
                                                                onClick={() => handleStatusUpdate(user.id, 'ACTIVE', user.email)}
                                                                className="flex items-center justify-center gap-2 h-8 min-w-[100px] px-2 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/20 rounded-xl text-[10px] font-black uppercase tracking-widest text-emerald-600 dark:text-emerald-400 transition-all font-mono"
                                                                title="Unblock Identity"
                                                            >
                                                                <CheckCircle2 size={12} />
                                                                Unblock
                                                            </button>
                                                        ) : (
                                                            <>
                                                                {isSuperAdmin && (user.role === 'ADMIN' || user.role === 'SALES_MANAGER') && (
                                                                    <button
                                                                        onClick={() => {
                                                                            setSelectedUserForPermissions(user);
                                                                            setModalPermissions(user.specialPermissions || []);
                                                                        }}
                                                                        className={`flex items-center justify-center gap-2 h-8 min-w-[100px] px-2 border rounded-xl text-[10px] font-black uppercase tracking-widest transition-all font-mono ${(user.specialPermissions?.length || 0) > 0 ? 'bg-indigo-500/10 hover:bg-indigo-500/20 border-indigo-500/20 text-indigo-600 dark:text-indigo-400' : 'bg-slate-500/10 hover:bg-slate-500/20 border-slate-500/20 text-slate-600 dark:text-slate-400'}`}
                                                                        title="Manage Special Permissions"
                                                                    >
                                                                        <Star size={12} className={(user.specialPermissions?.length || 0) > 0 ? 'fill-indigo-500' : ''} />
                                                                        Special
                                                                    </button>
                                                                )}
                                                                <button
                                                                    onClick={() => handleStatusUpdate(user.id, 'BLOCKED', user.email)}
                                                                    disabled={user.role === 'SUPER_ADMIN'}
                                                                    className="flex items-center justify-center gap-2 h-8 min-w-[100px] px-2 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 rounded-xl text-[10px] font-black uppercase tracking-widest text-rose-600 dark:text-rose-400 transition-all disabled:opacity-20 font-mono"
                                                                    title="Suspend Access"
                                                                >
                                                                    <X size={12} />
                                                                    Block
                                                                </button>
                                                                {user.status === 'RESTRICTED' ? (
                                                                    <button
                                                                        onClick={() => handleStatusUpdate(user.id, 'ACTIVE', user.email)}
                                                                        className="flex items-center justify-center gap-2 h-8 min-w-[100px] px-2 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/20 rounded-xl text-[10px] font-black uppercase tracking-widest text-amber-600 dark:text-amber-400 transition-all font-mono"
                                                                        title="Restore Full Permissions"
                                                                    >
                                                                        <RefreshCw size={12} />
                                                                        Unrestrict
                                                                    </button>
                                                                ) : (
                                                                    <button
                                                                        onClick={() => handleStatusUpdate(user.id, 'RESTRICTED', user.email)}
                                                                        disabled={user.role === 'SUPER_ADMIN'}
                                                                        className="flex items-center justify-center gap-2 h-8 min-w-[100px] px-2 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/20 rounded-xl text-[10px] font-black uppercase tracking-widest text-amber-600 dark:text-amber-400 transition-all disabled:opacity-20 font-mono"
                                                                        title="Apply Throttling"
                                                                    >
                                                                        <AlertCircle size={12} />
                                                                        Restrict
                                                                    </button>
                                                                )}
                                                            </>
                                                        )}
                                                    </div>

                                                    {isSuperAdmin && (
                                                        <button
                                                             onClick={() => setSelectedUserForWallet(user)}
                                                             className="flex items-center justify-center gap-2 h-8 min-w-[100px] px-2 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/20 rounded-xl text-[10px] font-black uppercase tracking-widest text-emerald-600 dark:text-emerald-400 transition-all font-mono"
                                                             title="Manage Capital"
                                                        >
                                                            <Wallet size={12} />
                                                            Wallet
                                                        </button>
                                                    )}

                                                    <button
                                                        onClick={() => handleMimicUser(user)}
                                                        disabled={changingRole === user.id || user.role === 'SUPER_ADMIN'}
                                                        className="flex items-center justify-center gap-2 h-8 min-w-[100px] px-2 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 rounded-xl text-[10px] font-black uppercase tracking-widest text-rose-600 dark:text-rose-400 transition-all disabled:opacity-20 font-mono"
                                                        title="Launch Impersonation"
                                                    >
                                                        <Zap size={12} />
                                                        Mimic
                                                    </button>

                                                    {(isSuperAdmin || (currentUser?.role === 'ADMIN' && user.createdByUserId === currentUser.id)) && (
                                                         <button
                                                             onClick={() => handleDeleteUser(user.id, user.email)}
                                                             disabled={changingRole === user.id || user.id === currentUser?.id || user.role === 'SUPER_ADMIN'}
                                                             className="flex items-center justify-center gap-2 h-8 min-w-[100px] px-2 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 rounded-xl text-[10px] font-black uppercase tracking-widest text-rose-600 dark:text-rose-400 transition-all disabled:opacity-20 font-mono"
                                                             title="Permanently Delete User"
                                                         >
                                                             <Trash2 size={12} />
                                                             Delete
                                                         </button>
                                                     )}

                                                    <div className="relative group/cog" onClick={e => e.stopPropagation()}>
                                                        <button
                                                            onClick={() => setOpenDropdown(openDropdown === user.id ? null : user.id)}
                                                            disabled={changingRole === user.id}
                                                            className="flex items-center justify-center gap-2 h-8 min-w-[100px] px-2 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 border border-slate-300 dark:border-white/10 rounded-xl text-[10px] font-black uppercase tracking-widest text-slate-700 dark:text-slate-300 transition-all font-mono shadow-sm"
                                                        >
                                                            <UserCog size={12} />
                                                            <span className="sm:hidden lg:inline">{changingRole === user.id ? 'Saving...' : 'Role'}</span>
                                                            <ChevronDown size={10} />
                                                        </button>

                                                        {openDropdown === user.id && (
                                                            <div className="absolute right-0 top-full mt-2 w-48 bg-white dark:bg-slate-950 border border-slate-200 dark:border-white/10 rounded-2xl shadow-2xl z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                                                                {ALL_ROLES.map(r => {
                                                                    const rm = ROLE_META[r] || { label: r, icon: Users };
                                                                    const RIcon = rm.icon || Users;
                                                                    const isCurrent = user.role === r;
                                                                    return (
                                                                        <button
                                                                            key={r}
                                                                            disabled={isCurrent}
                                                                            onClick={() => handleRoleChange(user.id, r, user.email)}
                                                                            className={`w-full flex items-center gap-3 px-4 py-3.5 text-[10px] font-black uppercase tracking-widest text-left transition-colors ${
                                                                                isCurrent
                                                                                    ? `${rm.bg} ${rm.color} cursor-default`
                                                                                    : 'text-slate-500 hover:bg-slate-50 dark:hover:bg-white/5 hover:text-slate-900 dark:hover:text-white'
                                                                            }`}
                                                                        >
                                                                            <RIcon size={12} />
                                                                            {rm.label}
                                                                            {isCurrent && <span className="ml-auto text-[9px] font-black opacity-40">LOCKED</span>}
                                                                        </button>
                                                                    );
                                                                })}
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            );
                        })}

                        {filteredUsers.length === 0 && (
                            <div className="text-center py-16 text-slate-500">
                                <Users size={32} className="mx-auto mb-3 opacity-30" />
                                <p>No users found matching your filter.</p>
                            </div>
                        )}
                    </>
                )}
            </div>

            {/* Wallet Modal */}
            {selectedUserForWallet && (
                <div className="fixed inset-0 z-[1000] overflow-y-auto bg-slate-950/80 backdrop-blur-sm p-4 flex justify-center items-start animate-in fade-in duration-200">
                    <div className="my-auto bg-slate-900 border border-slate-700/50 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 relative">
                        <div className="flex items-center justify-between p-5 border-b border-slate-800">
                            <div>
                                <h3 className="text-xl font-bold text-white flex items-center gap-2">
                                    <Wallet size={20} className="text-emerald-400" />
                                    Adjust Wallet
                                </h3>
                                <p className="text-slate-400 text-xs mt-1">{selectedUserForWallet.email}</p>
                            </div>
                            <button onClick={() => setSelectedUserForWallet(null)} className="text-slate-500 hover:text-white transition-colors">
                                <X size={20} />
                            </button>
                        </div>
                        <div className="p-6 space-y-4">
                            <div>
                                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 ml-1">Amount (INR)</label>
                                <div className="relative">
                                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 font-bold">₹</span>
                                    <input 
                                        type="number" 
                                        value={walletAmount} 
                                        onChange={e => setWalletAmount(e.target.value)}
                                        placeholder="0.00"
                                        className="w-full bg-slate-950/50 border border-slate-800 rounded-xl pl-8 pr-4 py-3 text-lg font-black text-white focus:outline-none focus:border-brand-blue"
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 ml-1">Reason / Description</label>
                                <input 
                                    type="text" 
                                    value={walletReason} 
                                    onChange={e => setWalletReason(e.target.value)}
                                    placeholder="e.g. Test Credit"
                                    className="w-full bg-slate-950/50 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-brand-blue"
                                />
                            </div>
                            <div className="mt-6 border-t border-slate-800/50 pt-4">
                                <div className="p-3 mb-4 bg-amber-500/10 border border-amber-500/20 rounded-lg flex gap-3 text-sm text-amber-500 text-left items-start">
                                    <AlertTriangle size={16} className="shrink-0 mt-0.5" />
                                    <p>Manual credits are disabled. All wallet top-ups must be completed directly through the Razorpay payment gateway.</p>
                                </div>
                                <button
                                    onClick={() => handleAdjustWallet('DEBIT')}
                                    disabled={isAdjustingWallet || !walletAmount}
                                    className="w-full flex items-center justify-center gap-2 py-3 bg-rose-500/10 hover:bg-rose-500/20 text-rose-500 border border-rose-500/20 rounded-xl font-bold transition-all disabled:opacity-50"
                                >
                                    {isAdjustingWallet ? <Loader2 size={16} className="animate-spin" /> : <Minus size={16} />}
                                    Debit Balance (Penalty / Refund)
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Special Permissions Modal */}
            {selectedUserForPermissions && (
                <div className="fixed inset-0 z-[1000] overflow-y-auto bg-slate-950/80 backdrop-blur-sm p-4 flex justify-center items-start animate-in fade-in duration-200">
                    <div className="my-auto bg-slate-900 border border-slate-700/50 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 relative">
                        <div className="flex items-center justify-between p-5 border-b border-slate-800">
                            <div>
                                <h3 className="text-xl font-bold text-white flex items-center gap-2">
                                    <Star size={20} className="text-indigo-400" />
                                    Special Permissions
                                </h3>
                                <p className="text-slate-400 text-xs mt-1">{selectedUserForPermissions.email}</p>
                            </div>
                            <button onClick={() => setSelectedUserForPermissions(null)} className="text-slate-500 hover:text-white transition-colors">
                                <X size={20} />
                            </button>
                        </div>
                        <div className="p-6 space-y-4">
                            <div className="space-y-3">
                                {PERMISSION_OPTIONS.map(opt => (
                                    <label key={opt.key} className="flex items-center gap-3 cursor-pointer group">
                                        <div className={`w-5 h-5 rounded border flex flex-shrink-0 items-center justify-center transition-colors ${modalPermissions.includes(opt.key) ? 'bg-indigo-500 border-indigo-500 text-white' : 'border-slate-600 bg-slate-800 group-hover:border-indigo-400'}`}>
                                            {modalPermissions.includes(opt.key) && <CheckCircle2 size={14} />}
                                        </div>
                                        <span className="text-sm font-medium text-slate-300 group-hover:text-white transition-colors">
                                            {opt.label}
                                        </span>
                                        <input
                                            type="checkbox"
                                            className="hidden"
                                            checked={modalPermissions.includes(opt.key)}
                                            onChange={(e) => {
                                                if (e.target.checked) {
                                                    setModalPermissions(prev => [...prev, opt.key]);
                                                } else {
                                                    setModalPermissions(prev => prev.filter(k => k !== opt.key));
                                                }
                                            }}
                                        />
                                    </label>
                                ))}
                            </div>
                            
                            <div className="flex items-center gap-3 pt-4 border-t border-slate-800">
                                <button
                                    onClick={() => setSelectedUserForPermissions(null)}
                                    className="flex-1 px-4 py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm font-bold rounded-xl transition-colors uppercase tracking-wider"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={() => {
                                        handleUpdateSpecialPermissions(selectedUserForPermissions.id, modalPermissions, selectedUserForPermissions.email);
                                        setSelectedUserForPermissions(null);
                                    }}
                                    className="flex-1 flex justify-center items-center gap-2 px-4 py-3 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-bold rounded-xl transition-colors shadow-lg shadow-indigo-600/20 uppercase tracking-wider"
                                >
                                    Save
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
