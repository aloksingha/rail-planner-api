import { useEffect } from 'react';
import { Users, Shield, Zap, Train, Settings, Search, RefreshCw, ChevronDown, CheckCircle2, AlertCircle, UserCog, UserPlus, X, Wallet, Minus, Loader2, AlertTriangle, Lock, Trash2, Star } from 'lucide-react';
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
        filteredUsers,
        groupedUsers,
        totalByRole
    } = useUserManagement();

    useEffect(() => {
        const handler = () => setOpenDropdown(null);
        document.addEventListener('click', handler);
        return () => document.removeEventListener('click', handler);
    }, [setOpenDropdown]);


    return (
        <div className="pb-12 px-4 animate-in fade-in slide-in-from-bottom-4 duration-500 bg-slate-50 dark:bg-slate-950 min-h-screen">
                 {/* SCI-FI HEADER */}
            <div className="glass-panel p-6 mb-8 relative overflow-hidden group border-slate-200 dark:border-white/10 bg-white dark:bg-slate-950/80">
                <div className="absolute top-0 right-0 w-32 h-32 bg-brand-blue/10 rounded-full blur-3xl" />
                <div className="absolute inset-0 bg-[url('/grid-pattern.svg')] opacity-5 dark:opacity-10 bg-repeat bg-[length:24px_24px]" />
                
                <div className="flex items-center justify-between relative z-10">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-brand-blue/5 dark:bg-brand-blue/10 border border-slate-200 dark:border-brand-blue/30 flex items-center justify-center shadow-[0_0_15px_rgba(14,165,233,0.3)]">
                            <Users className="text-brand-blue" size={24} />
                        </div>
                        <div>
                            <h1 className="text-xl font-black text-slate-900 dark:text-white tracking-tight uppercase italic">Users</h1>
                            <p className="text-[10px] text-slate-500 dark:text-slate-400 font-mono uppercase tracking-widest mt-1">User role and account control</p>
                        </div>
                    </div>
                    <button
                        onClick={() => setShowAddUser(v => !v)}
                        className="flex items-center justify-center w-10 h-10 bg-brand-blue/10 hover:bg-brand-blue/20 text-brand-blue border border-brand-blue/30 rounded-xl transition-colors shadow-[0_0_15px_rgba(14,165,233,0.2)]"
                    >
                        {showAddUser ? <X size={16} /> : <UserPlus size={16} />}
                    </button>
                </div>
                
                <div className="absolute bottom-0 left-0 w-full h-px bg-gradient-to-r from-brand-blue/50 via-teal-500/50 to-transparent" />
            </div>

            {/* ADD USER PANEL */}
            {showAddUser && (
                <div className="glass-panel p-5 mb-8 relative overflow-hidden animate-in slide-in-from-top-4 duration-300 border-slate-200 dark:border-white/10 bg-white/50 dark:bg-slate-900/50">
                    <div className="absolute top-0 right-0 p-8 opacity-5 pointer-events-none">
                         <UserPlus size={120} className="text-brand-blue" />
                    </div>
                    
                    <h2 className="text-sm font-black text-slate-900 dark:text-white mb-5 flex items-center gap-2 uppercase tracking-widest">
                        <div className="w-1.5 h-1.5 bg-brand-blue animate-pulse rounded-full" />
                        Register New User
                    </h2>
                    
                    <form onSubmit={handleAddUser} className="space-y-4 relative z-10">
                        <div>
                            <label className="block text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Email Address</label>
                            <input type="email" required value={addForm.email} onChange={e => setAddForm(p => ({ ...p, email: e.target.value }))} placeholder="user@example.com" className="w-full bg-white dark:bg-slate-950/50 border border-slate-200 dark:border-white/10 rounded-xl px-4 py-3 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-brand-blue/50 focus:ring-1 focus:ring-brand-blue/50 font-mono transition-all" />
                        </div>
                        <div>
                            <label className="block text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Full Name</label>
                            <input type="text" value={addForm.name} onChange={e => setAddForm(p => ({ ...p, name: e.target.value }))} placeholder="John Doe" className="w-full bg-white dark:bg-slate-950/50 border border-slate-200 dark:border-white/10 rounded-xl px-4 py-3 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-brand-blue/50 focus:ring-1 focus:ring-brand-blue/50 font-mono transition-all" />
                        </div>
                        <div>
                            <label className="block text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Mobile Number</label>
                            <input 
                                type="tel" 
                                value={addForm.mobile} 
                                onChange={e => {
                                    const val = e.target.value.replace(/\D/g, '');
                                    if (val.length <= 10) setAddForm(p => ({ ...p, mobile: val }));
                                }}
                                placeholder="9876543210" 
                                className={`w-full bg-white dark:bg-slate-950/50 border rounded-xl px-4 py-3 text-sm text-slate-900 dark:text-white focus:outline-none transition-all font-mono ${
                                    addForm.mobile.length > 0 && !isValidIndianMobile(addForm.mobile) && addForm.mobile.length === 10
                                        ? 'border-rose-500 focus:ring-1 focus:ring-rose-500' 
                                        : addForm.mobile.length === 10 
                                            ? 'border-emerald-500/50 focus:ring-1 focus:ring-emerald-500' 
                                            : 'border-slate-200 dark:border-white/10 focus:border-brand-blue/50 focus:ring-1 focus:ring-brand-blue/50'
                                }`} 
                            />
                        </div>
                        <div>
                            <label className="block text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-1.5 ml-1">System Role</label>
                            <div className="relative">
                                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-brand-blue" size={14} />
                                <select value={addForm.role} onChange={e => setAddForm(p => ({ ...p, role: e.target.value }))} className="w-full bg-white dark:bg-slate-950/50 border border-slate-200 dark:border-white/10 rounded-xl pl-9 pr-4 py-3 text-[11px] font-black tracking-widest uppercase text-brand-blue focus:outline-none focus:border-brand-blue/50 focus:ring-1 focus:ring-brand-blue/50 transition-all appearance-none">
                                    <option value="SALES_MANAGER">Sales Manager</option>
                                    <option value="ADMIN">Admin</option>
                                    <option value="SUPER_ADMIN">Super Admin</option>
                                    <option value="CUSTOMER">Customer</option>
                                </select>
                            </div>
                        </div>
                        <div className="pt-2">
                            <button type="submit" disabled={addLoading || !isValidIndianMobile(addForm.mobile)} className="w-full py-4 bg-gradient-to-r from-brand-blue to-teal-500 text-white font-black uppercase tracking-widest text-[11px] rounded-xl flex items-center justify-center gap-3 transition-all active:scale-95 disabled:opacity-30 disabled:scale-100 shadow-[0_0_15px_rgba(14,165,233,0.3)]">
                                {addLoading ? <Loader2 size={16} className="animate-spin" /> : <UserPlus size={16} />}
                                {addLoading ? 'REGISTERING...' : 'REGISTER USER'}
                            </button>
                        </div>
                    </form>
                </div>
            )}

            {/* MESSAGES */}
            {message.text && (
                <div className={`flex items-center gap-3 p-3 rounded-xl border mb-6 text-[10px] font-black uppercase tracking-widest ${
                    message.type === 'success'
                        ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                        : 'bg-rose-500/10 border-rose-500/30 text-rose-400'
                }`}>
                    {message.type === 'success' ? <CheckCircle2 size={14} /> : <AlertCircle size={14} />}
                    {message.text}
                </div>
            )}

            {/* QUICK STATS & FILTERS */}
            <div className="grid grid-cols-2 gap-3 mb-6">
                {ALL_ROLES.map(role => {
                    const meta = ROLE_META[role] || { label: role, color: 'text-slate-400', icon: Users, bg: 'bg-slate-100/10' };
                    const Icon = meta.icon || Users;
                    const isFiltered = filterRole === role;
                    return (
                        <button
                            key={role}
                            onClick={() => setFilterRole(isFiltered ? 'ALL' : role)}
                            className={`flex flex-col items-start p-4 rounded-xl border transition-all text-left relative overflow-hidden group ${
                                isFiltered
                                    ? `bg-brand-blue/10 border-brand-blue/30 shadow-[0_0_15px_rgba(14,165,233,0.2)]`
                                    : 'glass-panel bg-white dark:bg-slate-950 border-slate-200 dark:border-white/10 hover:border-brand-blue/30'
                            }`}
                        >
                            <div className="absolute -right-2 -bottom-2 opacity-5 group-hover:scale-110 transition-transform">
                                 <Icon size={60} className="text-white" />
                            </div>
                            <div className="flex items-center gap-2 mb-2 relative z-10">
                                <div className={`p-1.5 rounded-lg bg-white/5`}>
                                    <Icon size={12} className={meta.color} />
                                </div>
                                <span className={`text-[9px] font-black uppercase tracking-widest ${meta.color}`}>{meta.label}</span>
                            </div>
                            <span className={`text-2xl font-black relative z-10 ${isFiltered ? meta.color : 'text-slate-900 dark:text-white'}`}>{totalByRole[role] || 0}</span>
                        </button>
                    );
                })}
            </div>

            {/* SEARCH */}
            <div className="flex gap-3 mb-8">
                <div className="relative flex-1">
                    <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" />
                    <input
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        placeholder="Search users..."
                        className="w-full glass-panel border-slate-200 dark:border-white/10 pl-11 pr-4 py-3 text-xs text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-600 focus:outline-none focus:border-brand-blue/50 focus:ring-1 focus:ring-brand-blue/50 font-mono tracking-widest uppercase bg-white dark:bg-slate-950/50"
                    />
                </div>
                <button
                    onClick={fetchUsers}
                    className="w-12 glass-panel border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-950 flex items-center justify-center text-slate-400 hover:text-brand-blue hover:border-brand-blue/30 transition-all active:scale-95"
                >
                    <RefreshCw size={16} className={isLoading ? 'animate-spin' : ''} />
                </button>
            </div>

            {/* USER LIST */}
            {isLoading ? (
                <div className="text-center py-12">
                    <div className="w-8 h-8 border-2 border-brand-blue/20 border-t-brand-blue rounded-full animate-spin mx-auto mb-3" />
                    <p className="text-[10px] font-mono uppercase tracking-[0.2em] text-brand-blue animate-pulse">Loading users...</p>
                </div>
            ) : (
                <div className="space-y-6">
                    {ALL_ROLES.map(role => {
                        const meta = ROLE_META[role] || { label: role, color: 'text-slate-400', icon: Users, bg: 'bg-slate-100/10' };
                        const roleUsers = (groupedUsers && groupedUsers[role]) || [];
                        if (roleUsers.length === 0) return null;
                        
                        return (
                            <div key={role} className="space-y-3">
                                <div className="flex items-center gap-2 mb-2 ml-1">
                                    <div className="w-1.5 h-1.5 bg-brand-blue" />
                                    <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">{meta.label}S ({roleUsers.length})</h3>
                                </div>
                                
                                {roleUsers.map(user => (
                                    <div key={user.id} className="glass-panel p-4 relative overflow-hidden group bg-white dark:bg-slate-950 border border-slate-200 dark:border-white/10 rounded-2xl">
                                        <div className={`absolute top-0 left-0 w-1 h-full ${meta.bg.replace('/10','')} opacity-50`} />
                                        
                                        <div className="flex items-start justify-between gap-3 mb-4">
                                            <div className="flex items-center gap-3 flex-1 min-w-0">
                                                <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-sm font-black shrink-0 ${meta.bg} ${meta.color}`}>
                                                    {(user.name || user.email || "?")[0].toUpperCase()}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-sm font-black text-slate-900 dark:text-white truncate tracking-tight">{user.name || 'ANONYMOUS'}</p>
                                                    <p className="text-[10px] font-bold text-slate-500 truncate font-mono mt-0.5">{user.email}</p>
                                                </div>
                                            </div>
                                            
                                            {user.status && (
                                                <div className={`px-2 py-1 rounded-[4px] border border-white/5 text-[8px] font-black uppercase tracking-widest ${STATUS_META[user.status]?.color || 'text-slate-400'}`}>
                                                    {STATUS_META[user.status]?.label || user.status}
                                                </div>
                                            )}
                                        </div>

                                        <div className="grid grid-cols-2 gap-2">
                                            {/* Access Toggle */}
                                            {user.status === 'BLOCKED' ? (
                                                <button
                                                    onClick={() => handleStatusUpdate(user.id, 'ACTIVE', user.email)}
                                                    className="flex items-center justify-center gap-1.5 px-2 py-2.5 bg-emerald-500/5 dark:bg-emerald-500/10 border border-emerald-500/20 rounded-lg text-[9px] font-black uppercase tracking-widest text-emerald-500 dark:text-emerald-400 active:scale-95 transition-transform"
                                                >
                                                    <CheckCircle2 size={12} /> RESTORE ACCESS
                                                </button>
                                            ) : (
                                                <>
                                                    {isSuperAdmin && (user.role === 'ADMIN' || user.role === 'SALES_MANAGER') && (
                                                        <button
                                                            onClick={() => handleToggleSpecialPermission(user.id, !!user.hasSpecialPermission, user.email)}
                                                            className={`flex items-center justify-center gap-1.5 px-2 py-2.5 border rounded-lg text-[9px] font-black uppercase tracking-widest active:scale-95 transition-transform ${user.hasSpecialPermission ? 'bg-indigo-500/5 dark:bg-indigo-500/10 border-indigo-500/20 text-indigo-500 dark:text-indigo-400' : 'bg-slate-500/5 dark:bg-slate-500/10 border-slate-500/20 text-slate-500 dark:text-slate-400'}`}
                                                        >
                                                            <Star size={12} className={user.hasSpecialPermission ? 'fill-indigo-500' : ''} />
                                                            {user.hasSpecialPermission ? 'REVOKE SPECIAL' : 'GRANT SPECIAL'}
                                                        </button>
                                                    )}
                                                    <button
                                                        onClick={() => handleStatusUpdate(user.id, 'BLOCKED', user.email)}
                                                        disabled={user.role === 'SUPER_ADMIN'}
                                                        className="flex items-center justify-center gap-1.5 px-2 py-2.5 bg-rose-500/5 dark:bg-rose-500/10 border border-rose-500/20 rounded-lg text-[9px] font-black uppercase tracking-widest text-rose-500 dark:text-rose-400 active:scale-95 transition-transform disabled:opacity-30"
                                                    >
                                                        <X size={12} /> SUSPEND ACCESS
                                                    </button>
                                                </>
                                            )}

                                            {/* Mimic Session */}
                                            <button
                                                onClick={() => handleMimicUser(user)}
                                                disabled={changingRole === user.id || user.role === 'SUPER_ADMIN'}
                                                className="flex items-center justify-center gap-1.5 px-2 py-2.5 bg-brand-blue/5 dark:bg-brand-blue/10 border border-brand-blue/20 rounded-lg text-[9px] font-black uppercase tracking-widest text-brand-blue active:scale-95 transition-transform disabled:opacity-30"
                                            >
                                                <Zap size={12} /> LOGIN AS
                                            </button>

                                            {(isSuperAdmin || (currentUser?.role === 'ADMIN' && user.createdByUserId === currentUser.id)) && (
                                                <button
                                                    onClick={() => handleDeleteUser(user.id, user.email)}
                                                    disabled={changingRole === user.id || user.id === currentUser?.id || user.role === 'SUPER_ADMIN'}
                                                    className="flex items-center justify-center gap-1.5 px-2 py-2.5 bg-rose-500/5 dark:bg-rose-500/10 border border-rose-500/20 rounded-lg text-[9px] font-black uppercase tracking-widest text-rose-500 active:scale-95 transition-transform disabled:opacity-30 font-mono"
                                                >
                                                    <Trash2 size={12} /> DELETE
                                                </button>
                                            )}

                                            {isSuperAdmin && (
                                                <button
                                                     onClick={() => setSelectedUserForWallet(user)}
                                                     className="w-full mt-2 flex items-center justify-center gap-1.5 px-2 py-2.5 bg-emerald-500/5 dark:bg-emerald-500/10 border border-emerald-500/20 rounded-lg text-[9px] font-black uppercase tracking-widest text-emerald-500 dark:text-emerald-400 active:scale-95 transition-transform font-mono"
                                                >
                                                    <Wallet size={12} /> WALLET ADJUSTMENT
                                                </button>
                                            )}
                                        </div>
                                        
                                        {/* Rank Switcher */}
                                        <div className="mt-2">
                                            <div className="relative group/cog" onClick={e => e.stopPropagation()}>
                                                <button
                                                    onClick={() => setOpenDropdown(openDropdown === user.id ? null : user.id)}
                                                    disabled={changingRole === user.id}
                                                    className="w-full flex items-center justify-between px-3 py-2.5 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-white/5 rounded-lg text-[9px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400 active:scale-95 transition-transform font-mono"
                                                >
                                                    <div className="flex items-center gap-2">
                                                        <UserCog size={12} />
                                                        {changingRole === user.id ? 'UPDATING...' : 'UPDATE ROLE'}
                                                    </div>
                                                    <ChevronDown size={12} />
                                                </button>

                                                {openDropdown === user.id && (
                                                    <div className="absolute left-0 right-0 bottom-full mb-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-xl shadow-2xl z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                                                        {ALL_ROLES.map(r => {
                                                            const rm = ROLE_META[r] || { label: r, color: 'text-slate-400', icon: Users, bg: 'bg-slate-100/10' };
                                                            const RIcon = rm.icon || Users;
                                                            const isCurrent = user.role === r;
                                                            return (
                                                                <button
                                                                    key={r}
                                                                    disabled={isCurrent}
                                                                    onClick={() => handleRoleChange(user.id, r, user.email)}
                                                                    className={`w-full flex items-center gap-3 px-3 py-3 text-[9px] font-black uppercase tracking-widest text-left transition-colors border-b border-slate-50 dark:border-white/5 last:border-0 ${
                                                                        isCurrent
                                                                            ? `bg-brand-blue/5 text-brand-blue cursor-default`
                                                                            : 'text-slate-500 dark:text-slate-400 hover:bg-brand-blue/5 hover:text-brand-blue'
                                                                    }`}
                                                                >
                                                                    <RIcon size={12} />
                                                                    {rm.label}
                                                                    {isCurrent && <Lock size={10} className="ml-auto opacity-50" />}
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
                        );
                    })}

                    {filteredUsers.length === 0 && (
                        <div className="text-center py-12 glass-panel bg-white dark:bg-slate-950 border border-slate-200 dark:border-white/10 rounded-2xl">
                            <Shield size={24} className="mx-auto mb-2 text-slate-300 dark:text-slate-700" />
                            <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">No users found.</p>
                        </div>
                    )}
                </div>
            )}

            {/* WALLET MODAL */}
            {selectedUserForWallet && (
                <div className="fixed inset-0 z-[1000] flex items-end sm:items-center justify-center bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200 p-4">
                    <div className="w-full glass-panel border border-slate-200 dark:border-brand-blue/30 shadow-[0_0_30px_rgba(14,165,233,0.15)] overflow-hidden animate-in slide-in-from-bottom-8 sm:zoom-in-95 duration-300 bg-white dark:bg-slate-950 rounded-2xl max-w-sm">
                        <div className="p-5 border-b border-slate-100 dark:border-white/5 flex items-center justify-between bg-brand-blue/5">
                            <div>
                                <h3 className="text-sm font-black text-slate-900 dark:text-white flex items-center gap-2 uppercase tracking-widest">
                                    <Wallet size={16} className="text-emerald-500" />
                                    Wallet Control
                                </h3>
                                <p className="text-[10px] text-slate-400 font-mono mt-1">{selectedUserForWallet.email}</p>
                            </div>
                            <button onClick={() => setSelectedUserForWallet(null)} className="w-8 h-8 flex items-center justify-center rounded-lg bg-white/5 hover:bg-white/10 text-slate-400 transition-colors">
                                <X size={16} />
                            </button>
                        </div>
                        
                        <div className="p-5 space-y-4">
                            <div>
                                <label className="block text-[10px] font-black text-brand-blue uppercase tracking-widest mb-1.5 ml-1">Amount to deduct (₹)</label>
                                <div className="relative">
                                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-900 dark:text-white font-black text-lg">₹</span>
                                    <input 
                                        type="number" 
                                        value={walletAmount} 
                                        onChange={e => setWalletAmount(e.target.value)}
                                        placeholder="0.00"
                                        className="w-full bg-slate-50 dark:bg-slate-950/50 border border-slate-200 dark:border-white/10 rounded-xl pl-8 pr-4 py-3 text-lg font-black text-slate-900 dark:text-white font-mono focus:outline-none focus:border-brand-blue/50 focus:ring-1 focus:ring-brand-blue/50"
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="block text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Internal Note</label>
                                <input 
                                    type="text" 
                                    value={walletReason} 
                                    onChange={e => setWalletReason(e.target.value)}
                                    placeholder="e.g. Penalty Adjustment"
                                    className="w-full bg-slate-50 dark:bg-slate-950/50 border border-slate-200 dark:border-white/10 rounded-xl px-4 py-3 text-xs text-slate-900 dark:text-white font-mono focus:outline-none focus:border-brand-blue/50 focus:ring-1 focus:ring-brand-blue/50"
                                />
                            </div>
                            
                            <div className="pt-4">
                                <div className="p-3 mb-4 bg-amber-500/10 border border-amber-500/30 rounded-lg flex gap-2 items-start">
                                    <AlertTriangle size={14} className="text-amber-500 shrink-0 mt-0.5" />
                                    <p className="text-[9px] font-black uppercase tracking-wider text-amber-500 leading-relaxed">
                                        Manual credits disabled. Use external payment gateway for top-ups.
                                    </p>
                                </div>
                                <button
                                    onClick={() => handleAdjustWallet('DEBIT')}
                                    disabled={isAdjustingWallet || !walletAmount}
                                    className="w-full py-4 bg-rose-500/10 hover:bg-rose-500/20 text-rose-500 border border-rose-500/30 font-black uppercase tracking-widest text-[11px] rounded-xl flex items-center justify-center gap-2 transition-all active:scale-95 disabled:opacity-30"
                                >
                                    {isAdjustingWallet ? <Loader2 size={16} className="animate-spin" /> : <Minus size={16} />}
                                    DEDUCT BALANCE
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
