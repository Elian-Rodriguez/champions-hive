export default function LeagueMetrics2() {
  return (
    <div className="bg-background text-on-surface font-body-md overflow-x-hidden">
      {/* SideNavBar */}
      <aside className="fixed left-0 top-0 h-full w-64 z-50 flex flex-col bg-slate-900 border-r border-slate-800 side-nav-glow">
        <div className="px-6 py-8 flex flex-col gap-2">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-lg bg-slate-950 flex items-center justify-center overflow-hidden border border-slate-800 shadow-lg">
              <img alt="Champion Hive Logo" className="w-full h-full object-contain" src="https://lh3.googleusercontent.com/aida/ADBb0uhEOUBJNogjzQUu1-oNKuy7zI5APrQkXEfC3vFbzP_osrB3xvTkwzuKMso8UmyYZiXsHGD_GL4OvAOHRP4McjWfLcT32-kRZHLZvOnhsHqR2q2KXY4sQnzXIV3936tLmM9Gh8bHyOUXOV70s8hMUjj_oJy2eVTERu7qSkhe7moBw0hP3JtNTtCc9IbOa8J9DdDK7e2UL4llQfNASAFsQq9UA5SAxXfsswctdCxMNxuidGF3kACjkqfTmPpzPmapUvz12PO5dvM5DLA" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-lime-400 font-headline-md tracking-tighter">Champion Hive</h1>
              <p className="text-[10px] uppercase tracking-widest text-slate-500 font-bold">Pro League Manager</p>
            </div>
          </div>
        </div>
        <nav className="flex-1 mt-4">
          <a className="text-slate-400 hover:text-slate-200 px-6 py-4 flex items-center gap-3 transition-all duration-200 hover:bg-slate-800" href="#">
            <span className="material-symbols-outlined">dashboard</span>
            <span className="font-headline-md text-sm">Dashboard</span>
          </a>
          <a className="text-slate-400 hover:text-slate-200 px-6 py-4 flex items-center gap-3 transition-all duration-200 hover:bg-slate-800" href="#">
            <span className="material-symbols-outlined">emoji_events</span>
            <span className="font-headline-md text-sm">Tournaments</span>
          </a>
          <a className="text-lime-400 bg-slate-800/50 border-r-4 border-lime-400 font-bold px-6 py-4 flex items-center gap-3" href="#">
            <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>leaderboard</span>
            <span className="font-headline-md text-sm">Standings</span>
          </a>
          <a className="text-slate-400 hover:text-slate-200 px-6 py-4 flex items-center gap-3 transition-all duration-200 hover:bg-slate-800" href="#">
            <span className="material-symbols-outlined">groups</span>
            <span className="font-headline-md text-sm">Players</span>
          </a>
          <a className="text-slate-400 hover:text-slate-200 px-6 py-4 flex items-center gap-3 transition-all duration-200 hover:bg-slate-800" href="#">
            <span className="material-symbols-outlined">stadium</span>
            <span className="font-headline-md text-sm">Venues</span>
          </a>
        </nav>
        <div className="mt-auto border-t border-slate-800">
          <a className="text-slate-400 hover:text-slate-200 px-6 py-4 flex items-center gap-3 transition-all duration-200 hover:bg-slate-800" href="#">
            <span className="material-symbols-outlined">help</span>
            <span className="font-headline-md text-sm">Help</span>
          </a>
          <a className="text-slate-400 hover:text-slate-200 px-6 py-4 flex items-center gap-3 transition-all duration-200 hover:bg-slate-800" href="#">
            <span className="material-symbols-outlined">logout</span>
            <span className="font-headline-md text-sm">Logout</span>
          </a>
        </div>
      </aside>
      {/* TopNavBar */}
      <header className="fixed top-0 right-0 left-64 h-16 flex justify-between items-center px-8 z-40 bg-slate-950 border-b border-slate-800">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 mr-4">
            <img alt="Logo" className="w-8 h-8 object-contain" src="https://lh3.googleusercontent.com/aida/ADBb0uhEOUBJNogjzQUu1-oNKuy7zI5APrQkXEfC3vFbzP_osrB3xvTkwzuKMso8UmyYZiXsHGD_GL4OvAOHRP4McjWfLcT32-kRZHLZvOnhsHqR2q2KXY4sQnzXIV3936tLmM9Gh8bHyOUXOV70s8hMUjj_oJy2eVTERu7qSkhe7moBw0hP3JtNTtCc9IbOa8J9DdDK7e2UL4llQfNASAFsQq9UA5SAxXfsswctdCxMNxuidGF3kACjkqfTmPpzPmapUvz12PO5dvM5DLA" />
            <span className="font-headline-md text-sm font-bold text-on-surface">Champion Hive</span>
          </div>
          <div className="relative">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 text-sm">search</span>
            <input className="bg-slate-900 border-none rounded-full pl-10 pr-4 py-1.5 text-sm text-on-surface focus:ring-1 focus:ring-secondary w-64 transition-all" placeholder="Search League..." type="text" />
          </div>
        </div>
        <div className="flex items-center gap-6">
          <button className="relative text-slate-400 hover:text-secondary transition-colors">
            <span className="material-symbols-outlined">notifications</span>
            <span className="absolute top-0 right-0 w-2 h-2 bg-secondary rounded-full"></span>
          </button>
          <button className="text-slate-400 hover:text-secondary transition-colors">
            <span className="material-symbols-outlined">settings</span>
          </button>
          <div className="h-8 w-[1px] bg-slate-800"></div>
          <div className="flex items-center gap-3">
            <div className="text-right">
              <p className="text-xs font-bold text-on-surface">Alex Thompson</p>
              <p className="text-[10px] text-slate-500 font-label-sm">COMMISSIONER</p>
            </div>
            <img alt="Profile" className="w-9 h-9 rounded-full border border-slate-700 object-cover" data-alt="A close-up portrait of a professional sports executive in a dark navy tailored suit. The lighting is dramatic and cinematic, with high contrast highlighting sharp features. The background is a blurred, high-tech command center with glowing green data displays. The overall mood is authoritative, intense, and modern, fitting a high-stakes competitive environment." src="https://lh3.googleusercontent.com/aida/ADBb0ujMxExzo8Z3tDIBmPwgn5rdVFvapuuaGh-cktOlKsvDQnSa3C99sGooYLOlYDFGrOkE5rnwKz8j4O4xgGGw8I7ZKX0S3C9WEg5FYWVSuT5wN2Goz32-PeZrg1H-C3fY3ddj4xXVY0i6NWpJ06SL9QzblMF7NFj_Qkb1yEXfk1G9pjlRJPqcImnej2MUJeS_V1CqreL_q3CucM37JO7QNxziXImlEqxHM8ZQPTYjH40lSDBDTFa6R9lGWqvn" />
          </div>
        </div>
      </header>
      {/* Main Content */}
      <main className="ml-64 mt-16 p-8 min-h-screen">
        {/* Header Section */}
        <div className="flex justify-between items-end mb-8">
          <div>
            <nav className="flex items-center gap-2 text-xs text-slate-500 font-label-sm mb-2">
              <span>DASHBOARD</span>
              <span className="material-symbols-outlined text-[10px]">chevron_right</span>
              <span className="text-secondary">PRO LEAGUE STANDINGS</span>
            </nav>
            <h2 className="font-headline-lg text-display-xl text-on-surface tracking-tighter">League Metrics</h2>
          </div>
          <div className="flex gap-3">
            <button className="bg-surface-container-high border border-slate-700 px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-slate-800 transition-colors">
              <span className="material-symbols-outlined text-sm">calendar_today</span>
              <span className="font-label-sm">SEASON 24/25</span>
            </button>
            <button className="bg-secondary text-slate-950 px-4 py-2 rounded-lg flex items-center gap-2 font-bold hover:opacity-90 transition-opacity">
              <span className="material-symbols-outlined text-sm" style={{ fontVariationSettings: "'FILL' 1" }}>download</span>
              <span className="font-label-sm">EXPORT DATA</span>
            </button>
          </div>
        </div>
        {/* Bento Grid Layout */}
        <div className="grid grid-cols-12 gap-6">
          {/* League Standings Table (Main Content) */}
          <div className="col-span-8 bg-surface-container-low rounded-xl border border-slate-800 p-6">
            <div className="flex justify-between items-center mb-6">
              <h3 className="font-headline-md text-on-surface">Pro Division Standings</h3>
              <div className="flex gap-2">
                <span className="bg-secondary/10 text-secondary text-[10px] font-bold px-2 py-1 rounded">LIVE UPDATING</span>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-500 font-label-sm">
                    <th className="pb-4 px-2">POS</th><th className="pb-4 px-2">PHOTO</th>
                    <th className="pb-4 px-2">TEAM</th>
                    <th className="pb-4 px-2 text-center">MP</th>
                    <th className="pb-4 px-2 text-center">W</th>
                    <th className="pb-4 px-2 text-center">D</th>
                    <th className="pb-4 px-2 text-center">L</th>
                    <th className="pb-4 px-4 text-center">PTS</th>
                    <th className="pb-4 px-2">FORM</th>
                  </tr>
                </thead>
                <tbody className="font-stats-numeric">
                  <tr className="group hover:bg-slate-800/30 transition-colors">
                    <td className="py-4 px-2 text-secondary font-bold">01</td><td className="py-4 px-2"><div className="w-10 h-10 rounded-full border border-slate-700 overflow-hidden bg-slate-800"><img alt="Titan Velocity Member" className="w-full h-full object-cover" src="https://lh3.googleusercontent.com/aida/ADBb0ujMxExzo8Z3tDIBmPwgn5rdVFvapuuaGh-cktOlKsvDQnSa3C99sGooYLOlYDFGrOkE5rnwKz8j4O4xgGGw8I7ZKX0S3C9WEg5FYWVSuT5wN2Goz32-PeZrg1H-C3fY3ddj4xXVY0i6NWpJ06SL9QzblMF7NFj_Qkb1yEXfk1G9pjlRJPqcImnej2MUJeS_V1CqreL_q3CucM37JO7QNxziXImlEqxHM8ZQPTYjH40lSDBDTFa6R9lGWqvn" /></div></td>
                    <td className="py-4 px-2">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded bg-slate-800 border border-slate-700 flex items-center justify-center">
                          <span className="material-symbols-outlined text-secondary" style={{ fontVariationSettings: "'FILL' 1" }}>bolt</span>
                        </div>
                        <span className="font-headline-md text-sm">Titan Velocity</span>
                      </div>
                    </td>
                    <td className="py-4 px-2 text-center text-slate-400">12</td>
                    <td className="py-4 px-2 text-center">10</td>
                    <td className="py-4 px-2 text-center text-slate-400">1</td>
                    <td className="py-4 px-2 text-center text-slate-400">1</td>
                    <td className="py-4 px-4 text-center font-black text-on-surface text-lg">31</td>
                    <td className="py-4 px-2">
                      <div className="flex gap-1">
                        <div className="form-dot win"></div>
                        <div className="form-dot win"></div>
                        <div className="form-dot win"></div>
                        <div className="form-dot win"></div>
                        <div className="form-dot draw"></div>
                      </div>
                    </td>
                  </tr>
                  <tr className="group hover:bg-slate-800/30 transition-colors border-t border-slate-800/50">
                    <td className="py-4 px-2 text-on-surface font-bold">02</td><td className="py-4 px-2"><div className="w-10 h-10 rounded-full border border-slate-700 overflow-hidden bg-slate-800"><img alt="Neon Hunters Member" className="w-full h-full object-cover scale-x-[-1]" src="https://lh3.googleusercontent.com/aida/ADBb0ujMxExzo8Z3tDIBmPwgn5rdVFvapuuaGh-cktOlKsvDQnSa3C99sGooYLOlYDFGrOkE5rnwKz8j4O4xgGGw8I7ZKX0S3C9WEg5FYWVSuT5wN2Goz32-PeZrg1H-C3fY3ddj4xXVY0i6NWpJ06SL9QzblMF7NFj_Qkb1yEXfk1G9pjlRJPqcImnej2MUJeS_V1CqreL_q3CucM37JO7QNxziXImlEqxHM8ZQPTYjH40lSDBDTFa6R9lGWqvn" /></div></td>
                    <td className="py-4 px-2">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded bg-slate-800 border border-slate-700 flex items-center justify-center">
                          <span className="material-symbols-outlined text-tertiary" style={{ fontVariationSettings: "'FILL' 1" }}>diamond</span>
                        </div>
                        <span className="font-headline-md text-sm">Neon Hunters</span>
                      </div>
                    </td>
                    <td className="py-4 px-2 text-center text-slate-400">12</td>
                    <td className="py-4 px-2 text-center">9</td>
                    <td className="py-4 px-2 text-center text-slate-400">2</td>
                    <td className="py-4 px-2 text-center text-slate-400">1</td>
                    <td className="py-4 px-4 text-center font-black text-on-surface text-lg">29</td>
                    <td className="py-4 px-2">
                      <div className="flex gap-1">
                        <div className="form-dot win"></div>
                        <div className="form-dot win"></div>
                        <div className="form-dot draw"></div>
                        <div className="form-dot win"></div>
                        <div className="form-dot win"></div>
                      </div>
                    </td>
                  </tr>
                  <tr className="group hover:bg-slate-800/30 transition-colors border-t border-slate-800/50">
                    <td className="py-4 px-2 text-on-surface font-bold">03</td><td className="py-4 px-2"><div className="w-10 h-10 rounded-full border border-slate-700 overflow-hidden bg-slate-800"><img alt="Iron Valkyries Member" className="w-full h-full object-cover brightness-110" src="https://lh3.googleusercontent.com/aida/ADBb0ujMxExzo8Z3tDIBmPwgn5rdVFvapuuaGh-cktOlKsvDQnSa3C99sGooYLOlYDFGrOkE5rnwKz8j4O4xgGGw8I7ZKX0S3C9WEg5FYWVSuT5wN2Goz32-PeZrg1H-C3fY3ddj4xXVY0i6NWpJ06SL9QzblMF7NFj_Qkb1yEXfk1G9pjlRJPqcImnej2MUJeS_V1CqreL_q3CucM37JO7QNxziXImlEqxHM8ZQPTYjH40lSDBDTFa6R9lGWqvn" /></div></td>
                    <td className="py-4 px-2">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded bg-slate-800 border border-slate-700 flex items-center justify-center">
                          <span className="material-symbols-outlined text-blue-400" style={{ fontVariationSettings: "'FILL' 1" }}>waves</span>
                        </div>
                        <span className="font-headline-md text-sm">Iron Valkyries</span>
                      </div>
                    </td>
                    <td className="py-4 px-2 text-center text-slate-400">11</td>
                    <td className="py-4 px-2 text-center">8</td>
                    <td className="py-4 px-2 text-center text-slate-400">1</td>
                    <td className="py-4 px-2 text-center text-slate-400">2</td>
                    <td className="py-4 px-4 text-center font-black text-on-surface text-lg">25</td>
                    <td className="py-4 px-2">
                      <div className="flex gap-1">
                        <div className="form-dot loss"></div>
                        <div className="form-dot win"></div>
                        <div className="form-dot win"></div>
                        <div className="form-dot draw"></div>
                        <div className="form-dot win"></div>
                      </div>
                    </td>
                  </tr>
                  <tr className="group hover:bg-slate-800/30 transition-colors border-t border-slate-800/50">
                    <td className="py-4 px-2 text-on-surface font-bold">04</td><td className="py-4 px-2"><div className="w-10 h-10 rounded-full border border-slate-700 overflow-hidden bg-slate-800"><img alt="Magma Force Member" className="w-full h-full object-cover contrast-110" src="https://lh3.googleusercontent.com/aida/ADBb0ujMxExzo8Z3tDIBmPwgn5rdVFvapuuaGh-cktOlKsvDQnSa3C99sGooYLOlYDFGrOkE5rnwKz8j4O4xgGGw8I7ZKX0S3C9WEg5FYWVSuT5wN2Goz32-PeZrg1H-C3fY3ddj4xXVY0i6NWpJ06SL9QzblMF7NFj_Qkb1yEXfk1G9pjlRJPqcImnej2MUJeS_V1CqreL_q3CucM37JO7QNxziXImlEqxHM8ZQPTYjH40lSDBDTFa6R9lGWqvn" /></div></td>
                    <td className="py-4 px-2">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded bg-slate-800 border border-slate-700 flex items-center justify-center">
                          <span className="material-symbols-outlined text-orange-400" style={{ fontVariationSettings: "'FILL' 1" }}>local_fire_department</span>
                        </div>
                        <span className="font-headline-md text-sm">Magma Force</span>
                      </div>
                    </td>
                    <td className="py-4 px-2 text-center text-slate-400">12</td>
                    <td className="py-4 px-2 text-center">7</td>
                    <td className="py-4 px-2 text-center text-slate-400">2</td>
                    <td className="py-4 px-2 text-center text-slate-400">3</td>
                    <td className="py-4 px-4 text-center font-black text-on-surface text-lg">23</td>
                    <td className="py-4 px-2">
                      <div className="flex gap-1">
                        <div className="form-dot win"></div>
                        <div className="form-dot loss"></div>
                        <div className="form-dot win"></div>
                        <div className="form-dot loss"></div>
                        <div className="form-dot win"></div>
                      </div>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
            <div className="mt-6 pt-6 border-t border-slate-800 flex justify-center">
              <button className="text-secondary font-label-sm hover:underline">VIEW FULL STANDINGS (20 TEAMS)</button>
            </div>
          </div>
          {/* Performance Curve (Visual Data) */}
          <div className="col-span-4 space-y-6">
            {/* Bar Chart Section */}
            <div className="bg-surface-container-low rounded-xl border border-slate-800 p-6">
              <h3 className="font-headline-md text-on-surface mb-6">Performance Curve</h3>
              <div className="h-48 flex items-end justify-between gap-2 px-2">
                <div className="flex flex-col items-center gap-2 w-full">
                  <div className="w-full bg-secondary/20 rounded-t-sm relative group">
                    <div className="absolute bottom-0 left-0 w-full bg-secondary h-[40%] transition-all"></div>
                    <div className="h-32"></div>
                  </div>
                  <span className="text-[10px] text-slate-500 font-label-sm">WK 1</span>
                </div>
                <div className="flex flex-col items-center gap-2 w-full">
                  <div className="w-full bg-secondary/20 rounded-t-sm relative">
                    <div className="absolute bottom-0 left-0 w-full bg-secondary h-[65%]"></div>
                    <div className="h-32"></div>
                  </div>
                  <span className="text-[10px] text-slate-500 font-label-sm">WK 2</span>
                </div>
                <div className="flex flex-col items-center gap-2 w-full">
                  <div className="w-full bg-secondary/20 rounded-t-sm relative">
                    <div className="absolute bottom-0 left-0 w-full bg-secondary h-[55%]"></div>
                    <div className="h-32"></div>
                  </div>
                  <span className="text-[10px] text-slate-500 font-label-sm">WK 3</span>
                </div>
                <div className="flex flex-col items-center gap-2 w-full">
                  <div className="w-full bg-secondary/20 rounded-t-sm relative">
                    <div className="absolute bottom-0 left-0 w-full bg-secondary h-[85%] shadow-[0_0_15px_rgba(74,225,118,0.4)]"></div>
                    <div className="h-32"></div>
                  </div>
                  <span className="text-[10px] text-secondary font-bold font-label-sm">WK 4</span>
                </div>
                <div className="flex flex-col items-center gap-2 w-full">
                  <div className="w-full bg-secondary/20 rounded-t-sm relative">
                    <div className="absolute bottom-0 left-0 w-full bg-secondary h-[70%]"></div>
                    <div className="h-32"></div>
                  </div>
                  <span className="text-[10px] text-slate-500 font-label-sm">WK 5</span>
                </div>
              </div>
              <p className="mt-4 text-xs text-slate-400 font-body-md">Win probability increased by <span className="text-secondary font-bold">+12.4%</span> this week based on offensive efficiency metrics.</p>
            </div>
            {/* Current Form Highlight */}
            <div className="bg-surface-container-high rounded-xl border-l-4 border-secondary p-6 shadow-xl">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <p className="text-[10px] text-secondary font-bold uppercase tracking-widest mb-1">STREAK ALERT</p>
                  <h4 className="font-headline-md text-on-surface">Titan Velocity</h4>
                </div>
                <span className="material-symbols-outlined text-secondary text-3xl">trending_up</span>
              </div>
              <div className="flex items-center gap-2 mb-4">
                <div className="flex -space-x-2">
                  <div className="w-8 h-8 rounded-full border-2 border-slate-900 bg-secondary"></div>
                  <div className="w-8 h-8 rounded-full border-2 border-slate-900 bg-secondary"></div>
                  <div className="w-8 h-8 rounded-full border-2 border-slate-900 bg-secondary"></div>
                  <div className="w-8 h-8 rounded-full border-2 border-slate-900 bg-secondary"></div>
                </div>
                <span className="text-xs font-bold text-on-surface">4 MATCH WIN STREAK</span>
              </div>
              <div className="text-[10px] text-slate-400 grid grid-cols-2 gap-2">
                <div className="bg-slate-950/50 p-2 rounded">
                  <p>OFFENSE</p>
                  <p className="text-on-surface font-bold text-sm">92.4</p>
                </div>
                <div className="bg-slate-950/50 p-2 rounded">
                  <p>DEFENSE</p>
                  <p className="text-on-surface font-bold text-sm">88.1</p>
                </div>
              </div>
            </div>
          </div>
          {/* Top Scorers Special Card (Asymmetric Layout) */}
          <div className="col-span-12 grid grid-cols-4 gap-6">
            <div className="col-span-3 bg-slate-950 rounded-xl border border-slate-800 overflow-hidden relative">
              <div className="absolute inset-0 bg-gradient-to-r from-slate-950 via-slate-950/40 to-transparent z-10"></div>
              <div className="absolute inset-y-0 right-0 w-1/2 overflow-hidden">
                <img alt="Champion Hive Top Scorer Background" className="h-full w-full object-cover opacity-60 grayscale hover:grayscale-0 transition-all duration-700" src="https://lh3.googleusercontent.com/aida/ADBb0ujMxExzo8Z3tDIBmPwgn5rdVFvapuuaGh-cktOlKsvDQnSa3C99sGooYLOlYDFGrOkE5rnwKz8j4O4xgGGw8I7ZKX0S3C9WEg5FYWVSuT5wN2Goz32-PeZrg1H-C3fY3ddj4xXVY0i6NWpJ06SL9QzblMF7NFj_Qkb1yEXfk1G9pjlRJPqcImnej2MUJeS_V1CqreL_q3CucM37JO7QNxziXImlEqxHM8ZQPTYjH40lSDBDTFa6R9lGWqvn" />
              </div>
              <div className="relative z-20 p-8 h-full flex flex-col justify-center max-w-lg">
                <span className="text-secondary font-bold text-xs tracking-[0.3em] mb-2 uppercase">League MVP Race</span>
                <h2 className="text-display-xl font-display-xl text-on-surface mb-2">Marcus 'Viper' Chen</h2>
                <div className="flex items-center gap-6 mb-6">
                  <div className="flex flex-col">
                    <span className="text-slate-500 text-[10px] uppercase font-bold">Total Kills</span>
                    <span className="text-3xl font-stats-numeric text-secondary">482</span>
                  </div>
                  <div className="w-[1px] h-10 bg-slate-800"></div>
                  <div className="flex flex-col">
                    <span className="text-slate-500 text-[10px] uppercase font-bold">Accuracy</span>
                    <span className="text-3xl font-stats-numeric text-on-surface">68%</span>
                  </div>
                  <div className="w-[1px] h-10 bg-slate-800"></div>
                  <div className="flex flex-col">
                    <span className="text-slate-500 text-[10px] uppercase font-bold">Win Rate</span>
                    <span className="text-3xl font-stats-numeric text-on-surface">74%</span>
                  </div>
                </div>
                <button className="bg-secondary text-slate-950 w-fit px-6 py-3 rounded-lg font-bold text-sm hover:translate-x-1 transition-transform flex items-center gap-2">
                  PLAYER PROFILE <span className="material-symbols-outlined text-sm">arrow_forward</span>
                </button>
              </div>
            </div>
            {/* Runner Ups */}
            <div className="col-span-1 flex flex-col gap-4">
              <div className="bg-surface-container rounded-xl border border-slate-800 p-4 flex items-center gap-4 hover:border-slate-600 transition-all cursor-pointer">
                <div className="w-12 h-12 rounded bg-slate-800 flex-shrink-0 flex items-center justify-center font-bold text-slate-500">2</div>
                <div>
                  <p className="font-headline-md text-sm text-on-surface">Sarah 'Ghost' J.</p>
                  <p className="text-xs text-slate-500">441 KILLS</p>
                </div>
                <span className="material-symbols-outlined ml-auto text-slate-600">chevron_right</span>
              </div>
              <div className="bg-surface-container rounded-xl border border-slate-800 p-4 flex items-center gap-4 hover:border-slate-600 transition-all cursor-pointer">
                <div className="w-12 h-12 rounded bg-slate-800 flex-shrink-0 flex items-center justify-center font-bold text-slate-500">3</div>
                <div>
                  <p className="font-headline-md text-sm text-on-surface">Elena 'Nova' R.</p>
                  <p className="text-xs text-slate-500">419 KILLS</p>
                </div>
                <span className="material-symbols-outlined ml-auto text-slate-600">chevron_right</span>
              </div>
              <div className="bg-surface-container rounded-xl border border-slate-800 p-4 flex items-center gap-4 hover:border-slate-600 transition-all cursor-pointer">
                <div className="w-12 h-12 rounded bg-slate-800 flex-shrink-0 flex items-center justify-center font-bold text-slate-500">4</div>
                <div>
                  <p className="font-headline-md text-sm text-on-surface">Devin 'Axe' W.</p>
                  <p className="text-xs text-slate-500">398 KILLS</p>
                </div>
                <span className="material-symbols-outlined ml-auto text-slate-600">chevron_right</span>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
