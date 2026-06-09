export default function ArenaDashboard({ data }: { data?: any }) {
  const stats = data?.stats ?? null;
  const tournaments: any[] = data?.tournaments ?? [];
  const matches: any[] = data?.matches ?? [];
  const activeTournament = data?.tournament ?? null;

  // FALLBACK: render original hardcoded markup when there is no real data.
  if (!data?.stats && !data?.matches?.length) {
    return (
    <div className="bg-background text-on-background font-body-md selection:bg-secondary selection:text-on-secondary">
      {/* SideNavBar */}
      <aside className="fixed left-0 top-0 h-full w-64 z-50 flex flex-col bg-slate-900 border-r border-slate-800 font-lexend">
        <div className="p-6 flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-slate-950 flex items-center justify-center overflow-hidden border border-slate-800">
            <img alt="Champion Hive Logo" className="w-full h-full object-cover" src="https://lh3.googleusercontent.com/aida/ADBb0uhEOUBJNogjzQUu1-oNKuy7zI5APrQkXEfC3vFbzP_osrB3xvTkwzuKMso8UmyYZiXsHGD_GL4OvAOHRP4McjWfLcT32-kRZHLZvOnhsHqR2q2KXY4sQnzXIV3936tLmM9Gh8bHyOUXOV70s8hMUjj_oJy2eVTERu7qSkhe7moBw0hP3JtNTtCc9IbOa8J9DdDK7e2UL4llQfNASAFsQq9UA5SAxXfsswctdCxMNxuidGF3kACjkqfTmPpzPmapUvz12PO5dvM5DLA" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-lime-400">Champion Hive</h1>
            <p className="text-[10px] text-slate-400 uppercase tracking-widest font-bold">Pro League Manager</p>
          </div>
        </div>
        <nav className="flex-1 mt-4">
          <a className="text-lime-400 bg-slate-800/50 border-r-4 border-lime-400 font-bold px-6 py-4 flex items-center gap-3 hover:bg-slate-800 transition-all duration-200" href="#">
            <span className="material-symbols-outlined">dashboard</span>
            <span className="text-label-sm">Dashboard</span>
          </a>
          <a className="text-slate-400 hover:text-slate-200 px-6 py-4 flex items-center gap-3 hover:bg-slate-800 transition-all duration-200" href="#">
            <span className="material-symbols-outlined">emoji_events</span>
            <span className="text-label-sm">Tournaments</span>
          </a>
          <a className="text-slate-400 hover:text-slate-200 px-6 py-4 flex items-center gap-3 hover:bg-slate-800 transition-all duration-200" href="#">
            <span className="material-symbols-outlined">leaderboard</span>
            <span className="text-label-sm">Standings</span>
          </a>
          <a className="text-slate-400 hover:text-slate-200 px-6 py-4 flex items-center gap-3 hover:bg-slate-800 transition-all duration-200" href="#">
            <span className="material-symbols-outlined">groups</span>
            <span className="text-label-sm">Players</span>
          </a>
          <a className="text-slate-400 hover:text-slate-200 px-6 py-4 flex items-center gap-3 hover:bg-slate-800 transition-all duration-200" href="#">
            <span className="material-symbols-outlined">stadium</span>
            <span className="text-label-sm">Venues</span>
          </a>
        </nav>
        <div className="mt-auto border-t border-slate-800">
          <a className="text-slate-400 hover:text-slate-200 px-6 py-4 flex items-center gap-3 hover:bg-slate-800 transition-all duration-200" href="#">
            <span className="material-symbols-outlined">help</span>
            <span className="text-label-sm">Help</span>
          </a>
          <a className="text-slate-400 hover:text-slate-200 px-6 py-4 flex items-center gap-3 hover:bg-slate-800 transition-all duration-200" href="#">
            <span className="material-symbols-outlined">logout</span>
            <span className="text-label-sm">Logout</span>
          </a>
        </div>
      </aside>
      {/* TopNavBar */}
      <header className="fixed top-0 right-0 left-64 h-16 flex justify-between items-center px-8 z-40 bg-slate-950 border-b border-slate-800 font-lexend">
        <div className="flex items-center flex-1 gap-4">
          <div className="w-8 h-8 rounded bg-slate-900 overflow-hidden border border-slate-800">
            <img alt="Champion Hive Logo" className="w-full h-full object-cover" src="https://lh3.googleusercontent.com/aida/ADBb0uhEOUBJNogjzQUu1-oNKuy7zI5APrQkXEfC3vFbzP_osrB3xvTkwzuKMso8UmyYZiXsHGD_GL4OvAOHRP4McjWfLcT32-kRZHLZvOnhsHqR2q2KXY4sQnzXIV3936tLmM9Gh8bHyOUXOV70s8hMUjj_oJy2eVTERu7qSkhe7moBw0hP3JtNTtCc9IbOa8J9DdDK7e2UL4llQfNASAFsQq9UA5SAxXfsswctdCxMNxuidGF3kACjkqfTmPpzPmapUvz12PO5dvM5DLA" />
          </div>
          <div className="relative w-full max-w-md">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 text-sm">search</span>
            <input className="w-full bg-slate-900 border-none rounded-full py-2 pl-10 pr-4 text-sm text-on-surface focus:ring-2 focus:ring-secondary placeholder:text-slate-600 transition-all" placeholder="Search analytics, players, or venues..." type="text" />
          </div>
        </div>
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-4">
            <button className="relative p-2 text-slate-400 hover:text-lime-400 transition-colors">
              <span className="material-symbols-outlined">notifications</span>
              <span className="absolute top-2 right-2 w-2 h-2 bg-tertiary rounded-full"></span>
            </button>
            <button className="p-2 text-slate-400 hover:text-lime-400 transition-colors">
              <span className="material-symbols-outlined">settings</span>
            </button>
          </div>
          <div className="h-8 w-[1px] bg-slate-800"></div>
          <div className="flex items-center gap-3">
            <div className="text-right">
              <p className="text-xs font-bold text-on-surface">Marcus Vane</p>
              <p className="text-[10px] text-slate-500 uppercase tracking-tighter">Admin Chief</p>
            </div>
            <div className="w-10 h-10 rounded-full border-2 border-secondary p-0.5">
              <img alt="User Profile Avatar" className="w-full h-full rounded-full object-cover" src="https://lh3.googleusercontent.com/aida-public/AB6AXuBetf35NBy2WZALHDUpEPMzcAWEepkEgBvsXBE6khbD6xZWpE4knqyUScBKndrdx79g9qoXZgtjRSNm_EqG0M_b65lrBdgOrbZdSXNvxoFq6S17KQpn5QIhJlfdLHBnV59GLjfSYZ5_nmf1Q9dPaPnk8yhlr3ihx3gTJbhCPuKCbJib5tF2LLVLkKMiNzItOrTAJ3ghCPYvyn4j6i14HpANWppA7hhVMU28zbgMGV3EavIfAhIgtvbEELu1LNVQPbCUX1j1pFDWDJCJ" />
            </div>
          </div>
        </div>
      </header>
      {/* Main Content Canvas */}
      <main className="ml-64 mt-16 p-8 min-h-screen">
        {/* Dashboard Header */}
        <div className="mb-8 flex justify-between items-end">
          <div>
            <h2 className="font-headline-lg text-headline-lg text-on-surface">Arena Dashboard</h2>
            <p className="text-slate-400 font-body-md mt-1">Real-time status of Pro League operations and venue performance.</p>
          </div>
          <div className="flex gap-3">
            <button className="px-4 py-2 rounded bg-surface-container-high border border-slate-700 text-tertiary-fixed-dim flex items-center gap-2 hover:bg-slate-800 transition-all text-label-sm uppercase font-bold">
              <span className="material-symbols-outlined text-sm">download</span>
                    Export Data
                </button>
            <button className="px-4 py-2 rounded bg-secondary text-slate-900 flex items-center gap-2 hover:opacity-90 active:scale-95 transition-all text-label-sm uppercase font-bold border-b-2 border-green-700">
              <span className="material-symbols-outlined text-sm">add</span>
                    New Tournament
                </button>
          </div>
        </div>
        {/* Live Now Section (Bento Item 1) */}
        <div className="grid grid-cols-12 gap-gutter">
          <section className="col-span-8 bg-surface-container-low rounded-xl border border-slate-800 p-6 relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-4">
              <span className="bg-tertiary/10 text-tertiary px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest flex items-center gap-1.5 border border-tertiary/20">
                <span className="w-1.5 h-1.5 bg-tertiary rounded-full live-pulse"></span>
                        Live Now
                    </span>
            </div>
            <div className="flex flex-col h-full">
              <div className="mb-8">
                <h3 className="font-headline-md text-headline-md text-secondary mb-1">Summer Smash '24</h3>
                <p className="text-slate-400 font-label-sm uppercase tracking-widest">Pro League • Finals Week</p>
              </div>
              <div className="flex items-center justify-between flex-1 gap-8">
                <div className="flex-1 flex flex-col items-center gap-4">
                  <div className="w-20 h-20 bg-slate-800 rounded-full flex items-center justify-center border-4 border-slate-700 p-2 group-hover:border-secondary transition-colors">
                    <img alt="Team Alpha" className="w-full h-full object-contain" src="https://lh3.googleusercontent.com/aida-public/AB6AXuDXKUovQmkyyiLMoL2pssSvpd9gv6OU8qwjBrHb3d4E7ewmyjGM8hFuFCX_WbEFauN2zeI5wM_rPd1WiEeHAelR0B0xKAlpE9QMK0PY93j-7DM5ZrQinmU8wgLJmCW9v6b5QnVSN_CzHXp8_vr1fRw--l_prFOQXmfsa9N92vE1xcjJlaoCpnEPBdymznt7o0uW3B_HDwoK5bx0OIS2S94Oe3IY4WL6-3qdWuaQy6wXlZp7RqI43leCgvyeoUUcGP96eg5jndawnHBK" />
                  </div>
                  <div className="text-center">
                    <p className="font-display-xl text-display-xl leading-none">88</p>
                    <p className="text-label-sm text-slate-400 uppercase mt-2">Titans</p>
                  </div>
                </div>
                <div className="flex flex-col items-center gap-2">
                  <div className="px-4 py-1 bg-slate-800 rounded-full text-label-sm text-slate-400 font-bold border border-slate-700">Q3 • 04:22</div>
                  <div className="h-0.5 w-16 bg-slate-800"></div>
                  <span className="text-slate-500 font-black italic text-xl">VS</span>
                </div>
                <div className="flex-1 flex flex-col items-center gap-4">
                  <div className="w-20 h-20 bg-slate-800 rounded-full flex items-center justify-center border-4 border-slate-700 p-2 group-hover:border-tertiary transition-colors">
                    <img alt="Team Beta" className="w-full h-full object-contain" src="https://lh3.googleusercontent.com/aida-public/AB6AXuB0J-xHU7nNe7iHBHBsJVRwQCvVyW311E-NVOT6v3ylOfwhtc0sbsy30mKXf9vkxXgsnvLgePnxDhyajl56_2sJ2UR1rV4ba-5HQ6QoGTx2UOco1ySuOQ1QAjg7Q08TjWNNyth-qrL5qg6Os2wRWX1vI3UvQalWYD3mbe9ljfoKg-qfRwrWnlA7_Js2NTVd6Q76Do6IOkj6py_a_6P_SSecNaD_W44muVKiEGbqOC4-Okp-Xm0ywkZpNV0Q1GKTD1ZmeFjbq13mqqgi" />
                  </div>
                  <div className="text-center">
                    <p className="font-display-xl text-display-xl leading-none">94</p>
                    <p className="text-label-sm text-slate-400 uppercase mt-2">Reapers</p>
                  </div>
                </div>
              </div>
              <div className="mt-8 pt-6 border-t border-slate-800 grid grid-cols-3 gap-4">
                <div className="text-center">
                  <p className="text-[10px] text-slate-500 uppercase font-bold mb-1">Win Probability</p>
                  <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                    <div className="bg-secondary h-full" style={{ width: '45%' }}></div>
                  </div>
                </div>
                <div className="text-center">
                  <p className="text-[10px] text-slate-500 uppercase font-bold mb-1">Current Venue</p>
                  <p className="text-label-sm font-bold text-on-surface">Madison Square Central</p>
                </div>
                <div className="text-center">
                  <p className="text-[10px] text-slate-500 uppercase font-bold mb-1">Viewers</p>
                  <p className="text-label-sm font-bold text-tertiary">14.2k Streaming</p>
                </div>
              </div>
            </div>
          </section>
          {/* Open Cup Metrics (Bento Item 2) */}
          <section className="col-span-4 bg-surface-container-low rounded-xl border border-slate-800 p-6 flex flex-col border-t-4 border-t-tertiary">
            <div className="flex justify-between items-center mb-6">
              <h3 className="font-headline-md text-stats-numeric">Open Cup</h3>
              <span className="material-symbols-outlined text-slate-500">more_horiz</span>
            </div>
            <div className="space-y-6 flex-1">
              <div>
                <div className="flex justify-between items-end mb-2">
                  <p className="text-label-sm text-slate-400 uppercase tracking-tighter">Court Activity</p>
                  <p className="font-stats-numeric text-secondary">82%</p>
                </div>
                <div className="grid grid-cols-12 gap-1 h-3">
                  <div className="col-span-10 bg-secondary rounded-l-sm"></div>
                  <div className="col-span-2 bg-slate-800 rounded-r-sm"></div>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-slate-900/50 p-4 rounded-lg border border-slate-800">
                  <p className="text-[10px] text-slate-500 uppercase font-bold mb-1">Active Courts</p>
                  <p className="text-xl font-bold text-on-surface">12/15</p>
                </div>
                <div className="bg-slate-900/50 p-4 rounded-lg border border-slate-800">
                  <p className="text-[10px] text-slate-500 uppercase font-bold mb-1">Match Slots</p>
                  <p className="text-xl font-bold text-on-surface">240</p>
                </div>
              </div>
              <div className="mt-4 p-4 rounded-xl bg-tertiary-container/30 border border-tertiary/20">
                <div className="flex items-start gap-3">
                  <span className="material-symbols-outlined text-tertiary">warning</span>
                  <div>
                    <p className="text-label-sm font-bold text-tertiary-fixed">Equipment Alert</p>
                    <p className="text-[11px] text-tertiary-fixed-dim leading-snug">Court 4 Net tension requires calibration before 4 PM fixture.</p>
                  </div>
                </div>
              </div>
            </div>
            <button className="w-full mt-6 py-3 border border-slate-700 rounded-lg text-slate-400 text-label-sm font-bold hover:bg-slate-800 transition-colors">
                    View Schedule
                </button>
          </section>
          {/* Upcoming Fixtures (List View) */}
          <section className="col-span-5 bg-surface-container-low rounded-xl border border-slate-800 p-6 flex flex-col">
            <div className="flex justify-between items-center mb-6">
              <h3 className="font-headline-md text-stats-numeric">Upcoming Fixtures</h3>
              <button className="text-[11px] text-secondary font-bold uppercase tracking-widest hover:underline">Full Calendar</button>
            </div>
            <div className="space-y-4 overflow-y-auto custom-scrollbar pr-2 max-h-[340px]">
              {/* Fixture Item */}
              <div className="flex items-center gap-4 p-3 rounded-lg bg-slate-900/50 hover:bg-slate-800 transition-colors border border-slate-800/50 group">
                <div className="flex flex-col items-center px-2 py-1 bg-slate-800 rounded border border-slate-700 text-center min-w-[50px]">
                  <span className="text-[10px] text-slate-500 uppercase font-bold">Aug</span>
                  <span className="text-lg font-black text-on-surface">18</span>
                </div>
                <div className="flex-1">
                  <p className="text-label-sm font-bold text-on-surface">Viper Strike vs. Cloud9</p>
                  <p className="text-[11px] text-slate-500">Pro League • Arena West</p>
                </div>
                <div className="text-right">
                  <p className="text-label-sm font-bold text-secondary">19:30</p>
                  <span className="text-[10px] bg-secondary/10 text-secondary px-2 rounded-full font-bold">Confirmed</span>
                </div>
              </div>
              {/* Fixture Item */}
              <div className="flex items-center gap-4 p-3 rounded-lg bg-slate-900/50 hover:bg-slate-800 transition-colors border border-slate-800/50 group">
                <div className="flex flex-col items-center px-2 py-1 bg-slate-800 rounded border border-slate-700 text-center min-w-[50px]">
                  <span className="text-[10px] text-slate-500 uppercase font-bold">Aug</span>
                  <span className="text-lg font-black text-on-surface">19</span>
                </div>
                <div className="flex-1">
                  <p className="text-label-sm font-bold text-on-surface">Raging Bulls vs. Storm</p>
                  <p className="text-[11px] text-slate-500">Invitational • Court 2</p>
                </div>
                <div className="text-right">
                  <p className="text-label-sm font-bold text-on-surface">14:00</p>
                  <span className="text-[10px] bg-slate-800 text-slate-400 px-2 rounded-full font-bold">Pending</span>
                </div>
              </div>
              {/* Fixture Item */}
              <div className="flex items-center gap-4 p-3 rounded-lg bg-slate-900/50 hover:bg-slate-800 transition-colors border border-slate-800/50 group">
                <div className="flex flex-col items-center px-2 py-1 bg-slate-800 rounded border border-slate-700 text-center min-w-[50px]">
                  <span className="text-[10px] text-slate-500 uppercase font-bold">Aug</span>
                  <span className="text-lg font-black text-on-surface">19</span>
                </div>
                <div className="flex-1">
                  <p className="text-label-sm font-bold text-on-surface">Shadow Realm vs. Zenith</p>
                  <p className="text-[11px] text-slate-500">Pro League • Center Stage</p>
                </div>
                <div className="text-right">
                  <p className="text-label-sm font-bold text-on-surface">21:15</p>
                  <span className="text-[10px] bg-slate-800 text-slate-400 px-2 rounded-full font-bold">Scheduled</span>
                </div>
              </div>
            </div>
          </section>
          {/* Daily Performance Chart (Custom Visualization) */}
          <section className="col-span-4 bg-surface-container-low rounded-xl border border-slate-800 p-6 flex flex-col">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h3 className="font-headline-md text-stats-numeric leading-tight">Daily Performance</h3>
                <p className="text-[11px] text-slate-500 uppercase tracking-widest font-bold">Revenue Flow</p>
              </div>
              <div className="text-right">
                <p className="text-xl font-bold text-secondary">$12,840</p>
                <p className="text-[10px] text-secondary-fixed-dim font-bold">+12.4% vs prev.</p>
              </div>
            </div>
            <div className="flex-1 flex items-end justify-between gap-2 px-2 pb-2">
              <div className="flex flex-col items-center gap-2 w-full">
                <div className="w-full bg-slate-800 rounded-t-sm h-16 group relative hover:bg-slate-700 transition-colors">
                  <div className="absolute -top-6 left-1/2 -translate-x-1/2 text-[9px] bg-slate-700 text-white px-1 rounded opacity-0 group-hover:opacity-100 transition-opacity">M</div>
                </div>
                <span className="text-[9px] text-slate-600 font-bold">MON</span>
              </div>
              <div className="flex flex-col items-center gap-2 w-full">
                <div className="w-full bg-slate-800 rounded-t-sm h-24 group relative hover:bg-slate-700 transition-colors"></div>
                <span className="text-[9px] text-slate-600 font-bold">TUE</span>
              </div>
              <div className="flex flex-col items-center gap-2 w-full">
                <div className="w-full bg-secondary rounded-t-sm h-32 group relative hover:bg-secondary-container transition-colors">
                  <div className="absolute -top-6 left-1/2 -translate-x-1/2 text-[9px] bg-secondary text-slate-900 px-1 rounded font-bold">Peak</div>
                </div>
                <span className="text-[9px] text-secondary font-bold">WED</span>
              </div>
              <div className="flex flex-col items-center gap-2 w-full">
                <div className="w-full bg-slate-800 rounded-t-sm h-20 group relative hover:bg-slate-700 transition-colors"></div>
                <span className="text-[9px] text-slate-600 font-bold">THU</span>
              </div>
              <div className="flex flex-col items-center gap-2 w-full">
                <div className="w-full bg-slate-800 rounded-t-sm h-28 group relative hover:bg-slate-700 transition-colors"></div>
                <span className="text-[9px] text-slate-600 font-bold">FRI</span>
              </div>
              <div className="flex flex-col items-center gap-2 w-full">
                <div className="w-full bg-tertiary rounded-t-sm h-40 group relative hover:bg-tertiary-container transition-colors"></div>
                <span className="text-[9px] text-slate-600 font-bold">SAT</span>
              </div>
              <div className="flex flex-col items-center gap-2 w-full">
                <div className="w-full bg-slate-800 rounded-t-sm h-12 group relative hover:bg-slate-700 transition-colors"></div>
                <span className="text-[9px] text-slate-600 font-bold">SUN</span>
              </div>
            </div>
          </section>
          {/* Quick Actions (Tiles) */}
          <section className="col-span-3 grid grid-cols-2 gap-4">
            <button className="bg-surface-container-high border border-slate-800 p-4 rounded-xl flex flex-col items-center justify-center gap-3 hover:border-secondary hover:bg-slate-800 transition-all active:scale-95 group">
              <span className="material-symbols-outlined text-3xl text-slate-500 group-hover:text-secondary transition-colors">description</span>
              <span className="text-[11px] font-black uppercase tracking-widest text-slate-400 group-hover:text-on-surface">Reports</span>
            </button>
            <button className="bg-surface-container-high border border-slate-800 p-4 rounded-xl flex flex-col items-center justify-center gap-3 hover:border-secondary hover:bg-slate-800 transition-all active:scale-95 group">
              <span className="material-symbols-outlined text-3xl text-slate-500 group-hover:text-secondary transition-colors">location_on</span>
              <span className="text-[11px] font-black uppercase tracking-widest text-slate-400 group-hover:text-on-surface">Venues</span>
            </button>
            <button className="bg-surface-container-high border border-slate-800 p-4 rounded-xl flex flex-col items-center justify-center gap-3 hover:border-tertiary hover:bg-slate-800 transition-all active:scale-95 group">
              <span className="material-symbols-outlined text-3xl text-slate-500 group-hover:text-tertiary transition-colors">payments</span>
              <span className="text-[11px] font-black uppercase tracking-widest text-slate-400 group-hover:text-on-surface">Billing</span>
            </button>
            <button className="bg-surface-container-high border border-slate-800 p-4 rounded-xl flex flex-col items-center justify-center gap-3 hover:border-secondary hover:bg-slate-800 transition-all active:scale-95 group">
              <span className="material-symbols-outlined text-3xl text-slate-500 group-hover:text-secondary transition-colors">tune</span>
              <span className="text-[11px] font-black uppercase tracking-widest text-slate-400 group-hover:text-on-surface">Config</span>
            </button>
          </section>
        </div>
        {/* System Stats Footer Strip */}
        <footer className="mt-12 border-t border-slate-800 pt-6 flex justify-between items-center">
          <div className="flex items-center gap-8">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-secondary"></span>
              <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">System Health: Optimal</span>
            </div>
            <div className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Latency: 24ms</div>
            <div className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">API Status: Online</div>
          </div>
          <div className="text-[10px] text-slate-600 font-medium">© 2024 CHAMPION HIVE PRO LEAGUE MANAGEMENT SYSTEM • V2.4.0-STABLE</div>
        </footer>
      </main>
    </div>
    );
  }

  // WIRED: real data path. Design preserved; only data-bearing parts swapped.
  const liveMatch = matches.find((m: any) => m?.status === 'live' || m?.status === 'in_progress') ?? matches[0] ?? null;

  return (
    <div className="bg-background text-on-background font-body-md selection:bg-secondary selection:text-on-secondary">
      {/* SideNavBar */}
      <aside className="fixed left-0 top-0 h-full w-64 z-50 flex flex-col bg-slate-900 border-r border-slate-800 font-lexend">
        <div className="p-6 flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-slate-950 flex items-center justify-center overflow-hidden border border-slate-800">
            <img alt="Champion Hive Logo" className="w-full h-full object-cover" src="https://lh3.googleusercontent.com/aida/ADBb0uhEOUBJNogjzQUu1-oNKuy7zI5APrQkXEfC3vFbzP_osrB3xvTkwzuKMso8UmyYZiXsHGD_GL4OvAOHRP4McjWfLcT32-kRZHLZvOnhsHqR2q2KXY4sQnzXIV3936tLmM9Gh8bHyOUXOV70s8hMUjj_oJy2eVTERu7qSkhe7moBw0hP3JtNTtCc9IbOa8J9DdDK7e2UL4llQfNASAFsQq9UA5SAxXfsswctdCxMNxuidGF3kACjkqfTmPpzPmapUvz12PO5dvM5DLA" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-lime-400">Champion Hive</h1>
            <p className="text-[10px] text-slate-400 uppercase tracking-widest font-bold">Pro League Manager</p>
          </div>
        </div>
        <nav className="flex-1 mt-4">
          <a className="text-lime-400 bg-slate-800/50 border-r-4 border-lime-400 font-bold px-6 py-4 flex items-center gap-3 hover:bg-slate-800 transition-all duration-200" href="#">
            <span className="material-symbols-outlined">dashboard</span>
            <span className="text-label-sm">Dashboard</span>
          </a>
          <a className="text-slate-400 hover:text-slate-200 px-6 py-4 flex items-center gap-3 hover:bg-slate-800 transition-all duration-200" href="#">
            <span className="material-symbols-outlined">emoji_events</span>
            <span className="text-label-sm">Tournaments</span>
          </a>
          <a className="text-slate-400 hover:text-slate-200 px-6 py-4 flex items-center gap-3 hover:bg-slate-800 transition-all duration-200" href="#">
            <span className="material-symbols-outlined">leaderboard</span>
            <span className="text-label-sm">Standings</span>
          </a>
          <a className="text-slate-400 hover:text-slate-200 px-6 py-4 flex items-center gap-3 hover:bg-slate-800 transition-all duration-200" href="#">
            <span className="material-symbols-outlined">groups</span>
            <span className="text-label-sm">Players</span>
          </a>
          <a className="text-slate-400 hover:text-slate-200 px-6 py-4 flex items-center gap-3 hover:bg-slate-800 transition-all duration-200" href="#">
            <span className="material-symbols-outlined">stadium</span>
            <span className="text-label-sm">Venues</span>
          </a>
        </nav>
        <div className="mt-auto border-t border-slate-800">
          <a className="text-slate-400 hover:text-slate-200 px-6 py-4 flex items-center gap-3 hover:bg-slate-800 transition-all duration-200" href="#">
            <span className="material-symbols-outlined">help</span>
            <span className="text-label-sm">Help</span>
          </a>
          <a className="text-slate-400 hover:text-slate-200 px-6 py-4 flex items-center gap-3 hover:bg-slate-800 transition-all duration-200" href="#">
            <span className="material-symbols-outlined">logout</span>
            <span className="text-label-sm">Logout</span>
          </a>
        </div>
      </aside>
      {/* TopNavBar */}
      <header className="fixed top-0 right-0 left-64 h-16 flex justify-between items-center px-8 z-40 bg-slate-950 border-b border-slate-800 font-lexend">
        <div className="flex items-center flex-1 gap-4">
          <div className="w-8 h-8 rounded bg-slate-900 overflow-hidden border border-slate-800">
            <img alt="Champion Hive Logo" className="w-full h-full object-cover" src="https://lh3.googleusercontent.com/aida/ADBb0uhEOUBJNogjzQUu1-oNKuy7zI5APrQkXEfC3vFbzP_osrB3xvTkwzuKMso8UmyYZiXsHGD_GL4OvAOHRP4McjWfLcT32-kRZHLZvOnhsHqR2q2KXY4sQnzXIV3936tLmM9Gh8bHyOUXOV70s8hMUjj_oJy2eVTERu7qSkhe7moBw0hP3JtNTtCc9IbOa8J9DdDK7e2UL4llQfNASAFsQq9UA5SAxXfsswctdCxMNxuidGF3kACjkqfTmPpzPmapUvz12PO5dvM5DLA" />
          </div>
          <div className="relative w-full max-w-md">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 text-sm">search</span>
            <input className="w-full bg-slate-900 border-none rounded-full py-2 pl-10 pr-4 text-sm text-on-surface focus:ring-2 focus:ring-secondary placeholder:text-slate-600 transition-all" placeholder="Search analytics, players, or venues..." type="text" />
          </div>
        </div>
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-4">
            <button className="relative p-2 text-slate-400 hover:text-lime-400 transition-colors">
              <span className="material-symbols-outlined">notifications</span>
              <span className="absolute top-2 right-2 w-2 h-2 bg-tertiary rounded-full"></span>
            </button>
            <button className="p-2 text-slate-400 hover:text-lime-400 transition-colors">
              <span className="material-symbols-outlined">settings</span>
            </button>
          </div>
          <div className="h-8 w-[1px] bg-slate-800"></div>
          <div className="flex items-center gap-3">
            <div className="text-right">
              <p className="text-xs font-bold text-on-surface">Marcus Vane</p>
              <p className="text-[10px] text-slate-500 uppercase tracking-tighter">Admin Chief</p>
            </div>
            <div className="w-10 h-10 rounded-full border-2 border-secondary p-0.5">
              <img alt="User Profile Avatar" className="w-full h-full rounded-full object-cover" src="https://lh3.googleusercontent.com/aida-public/AB6AXuBetf35NBy2WZALHDUpEPMzcAWEepkEgBvsXBE6khbD6xZWpE4knqyUScBKndrdx79g9qoXZgtjRSNm_EqG0M_b65lrBdgOrbZdSXNvxoFq6S17KQpn5QIhJlfdLHBnV59GLjfSYZ5_nmf1Q9dPaPnk8yhlr3ihx3gTJbhCPuKCbJib5tF2LLVLkKMiNzItOrTAJ3ghCPYvyn4j6i14HpANWppA7hhVMU28zbgMGV3EavIfAhIgtvbEELu1LNVQPbCUX1j1pFDWDJCJ" />
            </div>
          </div>
        </div>
      </header>
      {/* Main Content Canvas */}
      <main className="ml-64 mt-16 p-8 min-h-screen">
        {/* Dashboard Header */}
        <div className="mb-8 flex justify-between items-end">
          <div>
            <h2 className="font-headline-lg text-headline-lg text-on-surface">Arena Dashboard</h2>
            <p className="text-slate-400 font-body-md mt-1">Real-time status of Pro League operations and venue performance.</p>
          </div>
          <div className="flex gap-3">
            <button className="px-4 py-2 rounded bg-surface-container-high border border-slate-700 text-tertiary-fixed-dim flex items-center gap-2 hover:bg-slate-800 transition-all text-label-sm uppercase font-bold">
              <span className="material-symbols-outlined text-sm">download</span>
                    Export Data
                </button>
            <button className="px-4 py-2 rounded bg-secondary text-slate-900 flex items-center gap-2 hover:opacity-90 active:scale-95 transition-all text-label-sm uppercase font-bold border-b-2 border-green-700">
              <span className="material-symbols-outlined text-sm">add</span>
                    New Tournament
                </button>
          </div>
        </div>
        {/* Live Now Section (Bento Item 1) */}
        <div className="grid grid-cols-12 gap-gutter">
          <section className="col-span-8 bg-surface-container-low rounded-xl border border-slate-800 p-6 relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-4">
              <span className="bg-tertiary/10 text-tertiary px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest flex items-center gap-1.5 border border-tertiary/20">
                <span className="w-1.5 h-1.5 bg-tertiary rounded-full live-pulse"></span>
                        Live Now
                    </span>
            </div>
            <div className="flex flex-col h-full">
              <div className="mb-8">
                <h3 className="font-headline-md text-headline-md text-secondary mb-1">{activeTournament?.name ?? "Summer Smash '24"}</h3>
                <p className="text-slate-400 font-label-sm uppercase tracking-widest">Pro League • Finals Week</p>
              </div>
              <div className="flex items-center justify-between flex-1 gap-8">
                <div className="flex-1 flex flex-col items-center gap-4">
                  <div className="w-20 h-20 bg-slate-800 rounded-full flex items-center justify-center border-4 border-slate-700 p-2 group-hover:border-secondary transition-colors">
                    <img alt="Team Alpha" className="w-full h-full object-contain" src="https://lh3.googleusercontent.com/aida-public/AB6AXuDXKUovQmkyyiLMoL2pssSvpd9gv6OU8qwjBrHb3d4E7ewmyjGM8hFuFCX_WbEFauN2zeI5wM_rPd1WiEeHAelR0B0xKAlpE9QMK0PY93j-7DM5ZrQinmU8wgLJmCW9v6b5QnVSN_CzHXp8_vr1fRw--l_prFOQXmfsa9N92vE1xcjJlaoCpnEPBdymznt7o0uW3B_HDwoK5bx0OIS2S94Oe3IY4WL6-3qdWuaQy6wXlZp7RqI43leCgvyeoUUcGP96eg5jndawnHBK" />
                  </div>
                  <div className="text-center">
                    <p className="font-display-xl text-display-xl leading-none">{liveMatch?.home_score ?? 88}</p>
                    <p className="text-label-sm text-slate-400 uppercase mt-2">{liveMatch?.home_team_name ?? 'Titans'}</p>
                  </div>
                </div>
                <div className="flex flex-col items-center gap-2">
                  <div className="px-4 py-1 bg-slate-800 rounded-full text-label-sm text-slate-400 font-bold border border-slate-700">{liveMatch?.status ?? 'Q3 • 04:22'}</div>
                  <div className="h-0.5 w-16 bg-slate-800"></div>
                  <span className="text-slate-500 font-black italic text-xl">VS</span>
                </div>
                <div className="flex-1 flex flex-col items-center gap-4">
                  <div className="w-20 h-20 bg-slate-800 rounded-full flex items-center justify-center border-4 border-slate-700 p-2 group-hover:border-tertiary transition-colors">
                    <img alt="Team Beta" className="w-full h-full object-contain" src="https://lh3.googleusercontent.com/aida-public/AB6AXuB0J-xHU7nNe7iHBHBsJVRwQCvVyW311E-NVOT6v3ylOfwhtc0sbsy30mKXf9vkxXgsnvLgePnxDhyajl56_2sJ2UR1rV4ba-5HQ6QoGTx2UOco1ySuOQ1QAjg7Q08TjWNNyth-qrL5qg6Os2wRWX1vI3UvQalWYD3mbe9ljfoKg-qfRwrWnlA7_Js2NTVd6Q76Do6IOkj6py_a_6P_SSecNaD_W44muVKiEGbqOC4-Okp-Xm0ywkZpNV0Q1GKTD1ZmeFjbq13mqqgi" />
                  </div>
                  <div className="text-center">
                    <p className="font-display-xl text-display-xl leading-none">{liveMatch?.away_score ?? 94}</p>
                    <p className="text-label-sm text-slate-400 uppercase mt-2">{liveMatch?.away_team_name ?? 'Reapers'}</p>
                  </div>
                </div>
              </div>
              <div className="mt-8 pt-6 border-t border-slate-800 grid grid-cols-3 gap-4">
                <div className="text-center">
                  <p className="text-[10px] text-slate-500 uppercase font-bold mb-1">Win Probability</p>
                  <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                    <div className="bg-secondary h-full" style={{ width: '45%' }}></div>
                  </div>
                </div>
                <div className="text-center">
                  <p className="text-[10px] text-slate-500 uppercase font-bold mb-1">Current Venue</p>
                  <p className="text-label-sm font-bold text-on-surface">Madison Square Central</p>
                </div>
                <div className="text-center">
                  <p className="text-[10px] text-slate-500 uppercase font-bold mb-1">Viewers</p>
                  <p className="text-label-sm font-bold text-tertiary">14.2k Streaming</p>
                </div>
              </div>
            </div>
          </section>
          {/* Open Cup Metrics (Bento Item 2) */}
          <section className="col-span-4 bg-surface-container-low rounded-xl border border-slate-800 p-6 flex flex-col border-t-4 border-t-tertiary">
            <div className="flex justify-between items-center mb-6">
              <h3 className="font-headline-md text-stats-numeric">Open Cup</h3>
              <span className="material-symbols-outlined text-slate-500">more_horiz</span>
            </div>
            <div className="space-y-6 flex-1">
              <div>
                <div className="flex justify-between items-end mb-2">
                  <p className="text-label-sm text-slate-400 uppercase tracking-tighter">Court Activity</p>
                  <p className="font-stats-numeric text-secondary">82%</p>
                </div>
                <div className="grid grid-cols-12 gap-1 h-3">
                  <div className="col-span-10 bg-secondary rounded-l-sm"></div>
                  <div className="col-span-2 bg-slate-800 rounded-r-sm"></div>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-slate-900/50 p-4 rounded-lg border border-slate-800">
                  <p className="text-[10px] text-slate-500 uppercase font-bold mb-1">Teams</p>
                  <p className="text-xl font-bold text-on-surface">{stats?.teams ?? '12/15'}</p>
                </div>
                <div className="bg-slate-900/50 p-4 rounded-lg border border-slate-800">
                  <p className="text-[10px] text-slate-500 uppercase font-bold mb-1">Stages</p>
                  <p className="text-xl font-bold text-on-surface">{stats?.stages ?? 240}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-slate-900/50 p-4 rounded-lg border border-slate-800">
                  <p className="text-[10px] text-slate-500 uppercase font-bold mb-1">Matches</p>
                  <p className="text-xl font-bold text-on-surface">{stats?.matches ?? 0}</p>
                </div>
                <div className="bg-slate-900/50 p-4 rounded-lg border border-slate-800">
                  <p className="text-[10px] text-slate-500 uppercase font-bold mb-1">Finished</p>
                  <p className="text-xl font-bold text-on-surface">{stats?.finished_matches ?? 0}</p>
                </div>
              </div>
              <div className="mt-4 p-4 rounded-xl bg-tertiary-container/30 border border-tertiary/20">
                <div className="flex items-start gap-3">
                  <span className="material-symbols-outlined text-tertiary">warning</span>
                  <div>
                    <p className="text-label-sm font-bold text-tertiary-fixed">Equipment Alert</p>
                    <p className="text-[11px] text-tertiary-fixed-dim leading-snug">Court 4 Net tension requires calibration before 4 PM fixture.</p>
                  </div>
                </div>
              </div>
            </div>
            <button className="w-full mt-6 py-3 border border-slate-700 rounded-lg text-slate-400 text-label-sm font-bold hover:bg-slate-800 transition-colors">
                    View Schedule
                </button>
          </section>
          {/* Upcoming Fixtures (List View) */}
          <section className="col-span-5 bg-surface-container-low rounded-xl border border-slate-800 p-6 flex flex-col">
            <div className="flex justify-between items-center mb-6">
              <h3 className="font-headline-md text-stats-numeric">Recent Matches</h3>
              <button className="text-[11px] text-secondary font-bold uppercase tracking-widest hover:underline">Full Calendar</button>
            </div>
            <div className="space-y-4 overflow-y-auto custom-scrollbar pr-2 max-h-[340px]">
              {matches.map((m: any, i: number) => (
                /* Fixture Item */
                <div key={m?.id ?? i} className="flex items-center gap-4 p-3 rounded-lg bg-slate-900/50 hover:bg-slate-800 transition-colors border border-slate-800/50 group">
                  <div className="flex flex-col items-center px-2 py-1 bg-slate-800 rounded border border-slate-700 text-center min-w-[50px]">
                    <span className="text-[10px] text-slate-500 uppercase font-bold">Match</span>
                    <span className="text-lg font-black text-on-surface">{i + 1}</span>
                  </div>
                  <div className="flex-1">
                    <p className="text-label-sm font-bold text-on-surface">{m?.home_team_name ?? 'TBD'} vs. {m?.away_team_name ?? 'TBD'}</p>
                    <p className="text-[11px] text-slate-500">{(m?.home_score ?? 0)} - {(m?.away_score ?? 0)}</p>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] bg-secondary/10 text-secondary px-2 rounded-full font-bold">{m?.status ?? 'Scheduled'}</span>
                  </div>
                </div>
              ))}
            </div>
          </section>
          {/* Daily Performance Chart (Custom Visualization) */}
          <section className="col-span-4 bg-surface-container-low rounded-xl border border-slate-800 p-6 flex flex-col">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h3 className="font-headline-md text-stats-numeric leading-tight">Daily Performance</h3>
                <p className="text-[11px] text-slate-500 uppercase tracking-widest font-bold">Revenue Flow</p>
              </div>
              <div className="text-right">
                <p className="text-xl font-bold text-secondary">$12,840</p>
                <p className="text-[10px] text-secondary-fixed-dim font-bold">+12.4% vs prev.</p>
              </div>
            </div>
            <div className="flex-1 flex items-end justify-between gap-2 px-2 pb-2">
              <div className="flex flex-col items-center gap-2 w-full">
                <div className="w-full bg-slate-800 rounded-t-sm h-16 group relative hover:bg-slate-700 transition-colors">
                  <div className="absolute -top-6 left-1/2 -translate-x-1/2 text-[9px] bg-slate-700 text-white px-1 rounded opacity-0 group-hover:opacity-100 transition-opacity">M</div>
                </div>
                <span className="text-[9px] text-slate-600 font-bold">MON</span>
              </div>
              <div className="flex flex-col items-center gap-2 w-full">
                <div className="w-full bg-slate-800 rounded-t-sm h-24 group relative hover:bg-slate-700 transition-colors"></div>
                <span className="text-[9px] text-slate-600 font-bold">TUE</span>
              </div>
              <div className="flex flex-col items-center gap-2 w-full">
                <div className="w-full bg-secondary rounded-t-sm h-32 group relative hover:bg-secondary-container transition-colors">
                  <div className="absolute -top-6 left-1/2 -translate-x-1/2 text-[9px] bg-secondary text-slate-900 px-1 rounded font-bold">Peak</div>
                </div>
                <span className="text-[9px] text-secondary font-bold">WED</span>
              </div>
              <div className="flex flex-col items-center gap-2 w-full">
                <div className="w-full bg-slate-800 rounded-t-sm h-20 group relative hover:bg-slate-700 transition-colors"></div>
                <span className="text-[9px] text-slate-600 font-bold">THU</span>
              </div>
              <div className="flex flex-col items-center gap-2 w-full">
                <div className="w-full bg-slate-800 rounded-t-sm h-28 group relative hover:bg-slate-700 transition-colors"></div>
                <span className="text-[9px] text-slate-600 font-bold">FRI</span>
              </div>
              <div className="flex flex-col items-center gap-2 w-full">
                <div className="w-full bg-tertiary rounded-t-sm h-40 group relative hover:bg-tertiary-container transition-colors"></div>
                <span className="text-[9px] text-slate-600 font-bold">SAT</span>
              </div>
              <div className="flex flex-col items-center gap-2 w-full">
                <div className="w-full bg-slate-800 rounded-t-sm h-12 group relative hover:bg-slate-700 transition-colors"></div>
                <span className="text-[9px] text-slate-600 font-bold">SUN</span>
              </div>
            </div>
          </section>
          {/* Quick Actions (Tiles) */}
          <section className="col-span-3 grid grid-cols-2 gap-4">
            <button className="bg-surface-container-high border border-slate-800 p-4 rounded-xl flex flex-col items-center justify-center gap-3 hover:border-secondary hover:bg-slate-800 transition-all active:scale-95 group">
              <span className="material-symbols-outlined text-3xl text-slate-500 group-hover:text-secondary transition-colors">description</span>
              <span className="text-[11px] font-black uppercase tracking-widest text-slate-400 group-hover:text-on-surface">Reports</span>
            </button>
            <button className="bg-surface-container-high border border-slate-800 p-4 rounded-xl flex flex-col items-center justify-center gap-3 hover:border-secondary hover:bg-slate-800 transition-all active:scale-95 group">
              <span className="material-symbols-outlined text-3xl text-slate-500 group-hover:text-secondary transition-colors">location_on</span>
              <span className="text-[11px] font-black uppercase tracking-widest text-slate-400 group-hover:text-on-surface">Venues</span>
            </button>
            <button className="bg-surface-container-high border border-slate-800 p-4 rounded-xl flex flex-col items-center justify-center gap-3 hover:border-tertiary hover:bg-slate-800 transition-all active:scale-95 group">
              <span className="material-symbols-outlined text-3xl text-slate-500 group-hover:text-tertiary transition-colors">payments</span>
              <span className="text-[11px] font-black uppercase tracking-widest text-slate-400 group-hover:text-on-surface">Billing</span>
            </button>
            <button className="bg-surface-container-high border border-slate-800 p-4 rounded-xl flex flex-col items-center justify-center gap-3 hover:border-secondary hover:bg-slate-800 transition-all active:scale-95 group">
              <span className="material-symbols-outlined text-3xl text-slate-500 group-hover:text-secondary transition-colors">tune</span>
              <span className="text-[11px] font-black uppercase tracking-widest text-slate-400 group-hover:text-on-surface">Config</span>
            </button>
          </section>
        </div>
        {/* System Stats Footer Strip */}
        <footer className="mt-12 border-t border-slate-800 pt-6 flex justify-between items-center">
          <div className="flex items-center gap-8">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-secondary"></span>
              <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">System Health: Optimal</span>
            </div>
            <div className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Latency: 24ms</div>
            <div className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">API Status: Online</div>
          </div>
          <div className="text-[10px] text-slate-600 font-medium">© 2024 CHAMPION HIVE PRO LEAGUE MANAGEMENT SYSTEM • V2.4.0-STABLE</div>
        </footer>
      </main>
    </div>
  );
}
