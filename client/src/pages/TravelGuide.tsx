import { Link } from 'react-router-dom';
import { BookOpen, Search, Train, Clock, HelpCircle, ShieldCheck, Zap } from 'lucide-react';

export default function TravelGuide() {
  return (
    <div className="space-y-10 animate-in fade-in duration-700 pb-20 max-w-5xl mx-auto px-4 sm:px-6">
      {/* Header Banner */}
      <header className="relative overflow-hidden rounded-[2.5rem] bg-gradient-to-br from-brand-blue via-blue-600 to-brand-teal p-8 sm:p-12 text-white shadow-2xl">
        <div className="absolute -top-24 -right-24 w-96 h-96 bg-white/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 max-w-3xl">
          <nav aria-label="breadcrumb" className="breadcrumb mb-4">
            <ol className="flex items-center gap-2 text-xs text-blue-100">
              <li><Link to="/" className="hover:underline font-medium">Home</Link></li>
              <li>/</li>
              <li className="font-semibold text-white">Travel Guide &amp; IRCTC Tatkal FAQ</li>
            </ol>
          </nav>
          
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/10 backdrop-blur-md rounded-full border border-white/20 mb-4 text-xs font-black uppercase tracking-widest">
            <BookOpen size={14} className="text-yellow-300" />
            <span>Platform Knowledge &amp; Travel Guide</span>
          </div>

          <h1 className="text-3xl sm:text-5xl font-black tracking-tight leading-tight mb-4">
            Tickets Pro Travel Intelligence &amp; FAQ
          </h1>
          <p className="text-blue-100/90 text-sm sm:text-base leading-relaxed font-medium">
            Tickets Pro is an automated IRCTC train booking, Tatkal assistance, and live PNR tracking platform designed to streamline train travel reservations across India with instant confirmation updates.
          </p>
        </div>
      </header>

      {/* Quick Table of Contents */}
      <nav aria-label="Quick Table of Contents" className="p-5 rounded-2xl bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-white/5 shadow-sm">
        <span className="text-[10px] font-black uppercase tracking-widest text-slate-500 block mb-3">Quick Navigation:</span>
        <div className="flex flex-wrap gap-2 text-xs font-semibold">
          <a href="#what-is-ticketspro" className="px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:text-brand-blue transition-colors">What is Tickets Pro?</a>
          <a href="#how-to-check-pnr-status" className="px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:text-brand-blue transition-colors">Check PNR Status</a>
          <a href="#how-to-book-tatkal-tickets" className="px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:text-brand-blue transition-colors">Book Tatkal Faster</a>
          <a href="#what-is-tatkal-automation" className="px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:text-brand-blue transition-colors">Tatkal Automation</a>
          <a href="#what-is-chart-preparation" className="px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:text-brand-blue transition-colors">Chart Timings</a>
          <a href="#train-cancellation-refunds" className="px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:text-brand-blue transition-colors">Refund Policy</a>
          <a href="#booking-quota-timings" className="px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:text-brand-blue transition-colors">Quota Timings</a>
        </div>
      </nav>

      {/* Live Interactive Search Tools */}
      <div className="p-6 rounded-3xl bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-white/5 shadow-sm space-y-4">
        <h2 className="text-base font-black text-slate-900 dark:text-white uppercase tracking-tight flex items-center gap-2">
          <Train size={18} className="text-brand-blue" />
          Live Indian Railways Travel Tools
        </h2>
        <form id="pnr-search-form" className="flex flex-col sm:flex-row gap-3 items-center" onSubmit={(e) => { e.preventDefault(); const pnr = (e.currentTarget.elements.namedItem('pnr') as HTMLInputElement)?.value; if (pnr) window.open(`/book-ticket?pnr=${pnr}`, '_self'); }}>
          <input name="pnr" type="text" maxLength={10} placeholder="Enter 10-digit IRCTC PNR Number..." className="w-full sm:flex-1 px-4 py-3 rounded-xl text-xs bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-slate-100 outline-none focus:border-brand-blue" />
          <button type="submit" className="w-full sm:w-auto px-6 py-3 rounded-xl bg-brand-blue hover:bg-brand-blue/90 text-white text-xs font-bold transition-all shadow-md">Check Live PNR Status</button>
        </form>
      </div>

      {/* FAQ Articles Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <article className="p-6 rounded-3xl bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-white/5 shadow-sm">
          <h3 id="what-is-ticketspro" className="text-lg font-black text-slate-900 dark:text-white mb-2">What is Tickets Pro?</h3>
          <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed font-normal">
            Tickets Pro is a smart rail travel booking tool made to help train travelers across India. The app lets you check open seats, reserve bookings fast, and track your PNR on WhatsApp. You get quick updates on your phone to make your trip simple and stress free.
          </p>
        </article>

        <article className="p-6 rounded-3xl bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-white/5 shadow-sm">
          <h3 id="how-to-check-pnr-status" className="text-lg font-black text-slate-900 dark:text-white mb-2">How to Check IRCTC PNR Status?</h3>
          <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed font-normal">
            IRCTC PNR refers to the unique ten-digit booking number printed on your train ticket. You can check live PNR status on Tickets Pro by typing your number into our search tool. We show your coach code, seat number, and train chart status in just one second.
          </p>
          <ol className="mt-3 space-y-1.5 list-decimal list-inside text-xs text-slate-600 dark:text-slate-400 font-medium">
            <li>Step 1: Enter your ten digit IRCTC PNR number in the search input box.</li>
            <li>Step 2: Click Check Status to connect with Indian Railways servers.</li>
            <li>Step 3: See your confirmed coach, seat number, and live journey chart details.</li>
          </ol>
        </article>

        <article className="p-6 rounded-3xl bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-white/5 shadow-sm">
          <h3 id="how-to-book-tatkal-tickets" className="text-lg font-black text-slate-900 dark:text-white mb-2">How to Book Tatkal Train Tickets Faster?</h3>
          <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed font-normal">
            Tatkal booking is an urgent train seat quota that opens one day before train departure. To book fast, save passenger details early in your Tickets Pro account. Open the app before the quota opens, pick your class, and pay quickly to confirm your train seats without delay.
          </p>
          <ol className="mt-3 space-y-1.5 list-decimal list-inside text-xs text-slate-600 dark:text-slate-400 font-medium">
            <li>Step 1: Save passenger names, ages, and berth choices in advance.</li>
            <li>Step 2: Sign in at 09:59 AM for AC classes or 10:59 AM for sleeper class.</li>
            <li>Step 3: Pick the Tatkal quota and pay instantly to lock in your train seats.</li>
          </ol>
        </article>

        <article className="p-6 rounded-3xl bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-white/5 shadow-sm">
          <h3 id="what-is-tatkal-automation" className="text-lg font-black text-slate-900 dark:text-white mb-2">What is Tatkal Booking Automation?</h3>
          <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed font-normal">
            Tatkal booking automation is a smart digital tool that fills in passenger details for you in seconds. It helps travelers save precious time during high morning rush hours. You can avoid slow manual typing, beat server timeouts, and secure confirmed train seats with ease and peace of mind.
          </p>
        </article>

        <article className="p-6 rounded-3xl bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-white/5 shadow-sm">
          <h3 id="what-is-chart-preparation" className="text-lg font-black text-slate-900 dark:text-white mb-2">What is Chart Preparation Time?</h3>
          <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed font-normal">
            Chart preparation refers to the final train seat list made by railway staff four hours before departure. Waiting list travelers can see if their seats got confirmed. Any left over open seats go to current booking so travelers can book last minute tickets at railway stations or online.
          </p>
        </article>

        <article className="p-6 rounded-3xl bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-white/5 shadow-sm">
          <h3 id="train-cancellation-refunds" className="text-lg font-black text-slate-900 dark:text-white mb-2">How Are Cancellations and Refunds Handled?</h3>
          <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed font-normal">
            A train refund is a return of ticket money when a traveler cancels a seat or a train stops. On Tickets Pro, refunds go back to your bank account or wallet within one to two days. All refunds follow official railway rules with no hidden fees or extra charges.
          </p>
        </article>
      </div>

      {/* Railway Travel Definitions */}
      <div className="p-8 rounded-3xl bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-white/5 shadow-sm">
        <h3 id="travel-definitions" className="text-sm font-black uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-4">Indian Railways Travel Definitions</h3>
        <dl className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/30 border border-slate-200/50 dark:border-white/5">
            <dt className="font-black text-slate-900 dark:text-white mb-1.5">PNR (Passenger Name Record)</dt>
            <dd className="text-slate-500 dark:text-slate-400 leading-relaxed">PNR is a unique ten-digit number assigned to train bookings in India storing trip and passenger records.</dd>
          </div>
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/30 border border-slate-200/50 dark:border-white/5">
            <dt className="font-black text-slate-900 dark:text-white mb-1.5">Tatkal Quota</dt>
            <dd className="text-slate-500 dark:text-slate-400 leading-relaxed">Tatkal quota refers to emergency train seats opened by Indian Railways one day before the journey starts.</dd>
          </div>
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/30 border border-slate-200/50 dark:border-white/5">
            <dt className="font-black text-slate-900 dark:text-white mb-1.5">Chart Preparation</dt>
            <dd className="text-slate-500 dark:text-slate-400 leading-relaxed">Chart preparation refers to the final passenger seat allocation made four hours before train departure time.</dd>
          </div>
        </dl>
      </div>

      {/* Quota Timings Table */}
      <div className="p-8 rounded-3xl bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-white/5 shadow-sm overflow-hidden">
        <h3 id="booking-quota-timings" className="text-sm font-black uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-4">IRCTC Booking Quota Timings Reference</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-600 dark:text-slate-400 border-collapse">
            <thead>
              <tr className="border-b border-slate-200 dark:border-white/10 text-slate-900 dark:text-white font-bold uppercase text-[10px] tracking-wider">
                <th className="py-3 px-3">Quota Type</th>
                <th className="py-3 px-3">Opening Time</th>
                <th className="py-3 px-3">Advance Window</th>
                <th className="py-3 px-3">Cancellation Eligibility</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-white/5 font-medium">
              <tr>
                <td className="py-3 px-3 font-bold text-slate-800 dark:text-slate-200">AC Tatkal (1A, 2A, 3A, 3E, CC)</td>
                <td className="py-3 px-3 text-emerald-500 font-bold">10:00 AM IST</td>
                <td className="py-3 px-3">1 Day Prior</td>
                <td className="py-3 px-3">Zero refund on confirmed Tatkal</td>
              </tr>
              <tr>
                <td className="py-3 px-3 font-bold text-slate-800 dark:text-slate-200">Non-AC Tatkal (Sleeper / 2S)</td>
                <td className="py-3 px-3 text-emerald-500 font-bold">11:00 AM IST</td>
                <td className="py-3 px-3">1 Day Prior</td>
                <td className="py-3 px-3">Zero refund on confirmed Tatkal</td>
              </tr>
              <tr>
                <td className="py-3 px-3 font-bold text-slate-800 dark:text-slate-200">General Reservation (GN)</td>
                <td className="py-3 px-3 text-brand-blue font-bold">08:00 AM IST</td>
                <td className="py-3 px-3">Up to 120 Days</td>
                <td className="py-3 px-3">Full refund minus clerkage up to 48 hrs</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
