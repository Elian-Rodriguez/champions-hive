export default function TournamentManagement1() {
  return (
    <div className="bg-background text-on-background font-body-md custom-scrollbar">
      {/* SideNavBar Shell */}
      <aside className="fixed left-0 top-0 h-full w-64 z-50 flex flex-col bg-slate-900 font-lexend border-r border-slate-800">
        <div className="p-6 flex items-center gap-3">
          <div className="w-12 h-12 flex-shrink-0">
            <img alt="Champion Hive Premium Logo" className="w-full h-full object-contain drop-shadow-[0_0_8px_rgba(74,225,118,0.3)]" src="https://lh3.googleusercontent.com/aida/ADBb0uhEOUBJNogjzQUu1-oNKuy7zI5APrQkXEfC3vFbzP_osrB3xvTkwzuKMso8UmyYZiXsHGD_GL4OvAOHRP4McjWfLcT32-kRZHLZvOnhsHqR2q2KXY4sQnzXIV3936tLmM9Gh8bHyOUXOV70s8hMUjj_oJy2eVTERu7qSkhe7moBw0hP3JtNTtCc9IbOa8J9DdDK7e2UL4llQfNASAFsQq9UA5SAxXfsswctdCxMNxuidGF3kACjkqfTmPpzPmapUvz12PO5dvM5DLA" />
          </div>
          <div>
            <h1 className="text-xl font-extrabold text-white tracking-tight">Champion Hive</h1>
            <p className="text-[10px] text-secondary font-bold uppercase tracking-[0.2em]">Pro League Manager</p>
          </div>
        </div>
        <nav className="flex-1 mt-4">
          <a className="text-slate-400 hover:text-slate-200 px-6 py-4 flex items-center gap-3 hover:bg-slate-800 transition-all duration-200 active:opacity-80" href="#">
            <span className="material-symbols-outlined" data-icon="dashboard">dashboard</span>
                Dashboard
            </a>
          <a className="text-secondary bg-slate-800/50 border-r-4 border-secondary font-bold px-6 py-4 flex items-center gap-3 active:opacity-80" href="#">
            <span className="material-symbols-outlined" data-icon="emoji_events">emoji_events</span>
                Tournaments
            </a>
          <a className="text-slate-400 hover:text-slate-200 px-6 py-4 flex items-center gap-3 hover:bg-slate-800 transition-all duration-200 active:opacity-80" href="#">
            <span className="material-symbols-outlined" data-icon="leaderboard">leaderboard</span>
                Standings
            </a>
          <a className="text-slate-400 hover:text-slate-200 px-6 py-4 flex items-center gap-3 hover:bg-slate-800 transition-all duration-200 active:opacity-80" href="#">
            <span className="material-symbols-outlined" data-icon="groups">groups</span>
                Players
            </a>
          <a className="text-slate-400 hover:text-slate-200 px-6 py-4 flex items-center gap-3 hover:bg-slate-800 transition-all duration-200 active:opacity-80" href="#">
            <span className="material-symbols-outlined" data-icon="stadium">stadium</span>
                Venues
            </a>
        </nav>
        <div className="mt-auto border-t border-slate-800 py-4">
          <a className="text-slate-400 hover:text-slate-200 px-6 py-4 flex items-center gap-3 hover:bg-slate-800 transition-all duration-200 active:opacity-80" href="#">
            <span className="material-symbols-outlined" data-icon="help">help</span>
                Help
            </a>
          <a className="text-slate-400 hover:text-slate-200 px-6 py-4 flex items-center gap-3 hover:bg-slate-800 transition-all duration-200 active:opacity-80" href="#">
            <span className="material-symbols-outlined" data-icon="logout">logout</span>
                Logout
            </a>
        </div>
      </aside>
      {/* TopNavBar Shell */}
      <header className="fixed top-0 right-0 left-64 h-16 flex justify-between items-center px-8 z-40 bg-slate-950 border-b border-slate-800 font-lexend">
        <div className="flex items-center flex-1 max-w-xl">
          <div className="relative w-full">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 text-sm" data-icon="search">search</span>
            <input className="w-full bg-slate-900 border-none rounded-lg py-2 pl-10 pr-4 text-sm text-on-surface focus:ring-2 focus:ring-secondary transition-all" placeholder="Search tournaments, teams, or players..." type="text" />
          </div>
        </div>
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2">
            <button className="w-10 h-10 flex items-center justify-center text-slate-400 hover:bg-slate-900 rounded-full transition-colors active:scale-95 duration-150">
              <span className="material-symbols-outlined" data-icon="notifications">notifications</span>
            </button>
            <button className="w-10 h-10 flex items-center justify-center text-slate-400 hover:bg-slate-900 rounded-full transition-colors active:scale-95 duration-150">
              <span className="material-symbols-outlined" data-icon="settings">settings</span>
            </button>
          </div>
          <div className="h-8 w-px bg-slate-800"></div>
          <div className="flex items-center gap-3">
            <div className="text-right">
              <p className="text-xs font-bold text-on-surface">Alex Rivera</p>
              <p className="text-[10px] text-slate-500 font-medium">Head Organizer</p>
            </div>
            <img alt="User Profile Avatar" className="w-10 h-10 rounded-full border-2 border-slate-800" src="https://lh3.googleusercontent.com/aida-public/AB6AXuD1eLXRM4-55hCybXwl1W7VHfCVV8E8HrNcIzpLWiFVbacBBWpKkr1upMJENv2FDfYovLSoAbnukaNFm5xX2PIBrDaokOavK-Hr_xnjnyYr_SWZTeuRgWaSe1m_qfnWI3Ui_5Zv_VJKBe4FTg4xlEGxhRa1s3TD1r_-FLs67uinc6UAc8XZDBv2AA0VlI4IaxiU-qEcXXp2zY1l5-WFV8P0keLywfEn_8_vu901Vt-bv-RBfADrLVgcxpgP9_L9MIFt3d3H_2dYlpDK" />
          </div>
        </div>
      </header>
      {/* Main Content Canvas */}
      <main className="ml-64 mt-16 p-8 min-h-screen">
        {/* Header Section */}
        <div className="flex justify-between items-end mb-8">
          <div>
            <h2 className="font-headline-lg text-headline-lg text-on-surface">Tournament Management</h2>
            <p className="font-body-md text-on-surface-variant mt-1">Oversee active leagues, registrations, and historical archives.</p>
          </div>
          <button className="bg-secondary text-on-secondary px-6 py-2.5 rounded-lg font-bold flex items-center gap-2 hover:brightness-110 active:scale-95 transition-all shadow-lg shadow-secondary/10">
            <span className="material-symbols-outlined" data-icon="add_circle">add_circle</span>
                Create Tournament
            </button>
        </div>
        {/* Filters Strip */}
        <div className="flex flex-wrap items-center gap-4 mb-8 bg-surface-container-low p-4 rounded-xl border border-outline-variant/30">
          <div className="flex items-center gap-2 bg-surface-container-high px-3 py-1.5 rounded-lg border border-outline-variant/20">
            <span className="text-label-sm font-label-sm text-on-surface-variant">Sport:</span>
            <select className="bg-transparent border-none text-on-surface font-bold text-sm focus:ring-0 cursor-pointer">
              <option>All Sports</option>
              <option>Soccer</option>
              <option>Basketball</option>
              <option>Tennis</option>
            </select>
          </div>
          <div className="flex items-center gap-2 bg-surface-container-high px-3 py-1.5 rounded-lg border border-outline-variant/20">
            <span className="text-label-sm font-label-sm text-on-surface-variant">Status:</span>
            <select className="bg-transparent border-none text-on-surface font-bold text-sm focus:ring-0 cursor-pointer">
              <option>Any Status</option>
              <option>Live</option>
              <option>Registration Open</option>
              <option>Finished</option>
            </select>
          </div>
          <div className="flex items-center gap-2 bg-surface-container-high px-3 py-1.5 rounded-lg border border-outline-variant/20">
            <span className="text-label-sm font-label-sm text-on-surface-variant">Sort by:</span>
            <select className="bg-transparent border-none text-on-surface font-bold text-sm focus:ring-0 cursor-pointer">
              <option>Newest First</option>
              <option>Start Date</option>
              <option>Popularity</option>
            </select>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <span className="text-label-sm font-label-sm text-slate-500">View:</span>
            <div className="flex bg-slate-900 rounded-lg p-1">
              <button className="p-1.5 bg-slate-800 text-secondary rounded-md">
                <span className="material-symbols-outlined text-sm" data-icon="grid_view">grid_view</span>
              </button>
              <button className="p-1.5 text-slate-500 hover:text-slate-300 transition-colors">
                <span className="material-symbols-outlined text-sm" data-icon="format_list_bulleted">format_list_bulleted</span>
              </button>
            </div>
          </div>
        </div>
        {/* Tournament Cards Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Card 1: Copa de Titanes 2024 (Live) */}
          <div className="bg-surface-container-low rounded-xl overflow-hidden border border-secondary/30 flex flex-col group hover:border-secondary transition-all duration-300">
            <div className="relative h-48">
              <img className="w-full h-full object-cover grayscale-[0.5] group-hover:grayscale-0 transition-all duration-500" data-alt="A dynamic, low-angle shot of a high-end soccer stadium at night under bright floodlights. A professional-grade football sits on a lush green turf in the foreground, with the stands blurred in the distance. The lighting is dramatic and cinematic, featuring neon green highlights reflecting off the wet grass. The atmosphere is intense, ready for a major championship final." src="https://lh3.googleusercontent.com/aida/ADBb0ujMxExzo8Z3tDIBmPwgn5rdVFvapuuaGh-cktOlKsvDQnSa3C99sGooYLOlYDFGrOkE5rnwKz8j4O4xgGGw8I7ZKX0S3C9WEg5FYWVSuT5wN2Goz32-PeZrg1H-C3fY3ddj4xXVY0i6NWpJ06SL9QzblMF7NFj_Qkb1yEXfk1G9pjlRJPqcImnej2MUJeS_V1CqreL_q3CucM37JO7QNxziXImlEqxHM8ZQPTYjH40lSDBDTFa6R9lGWqvn" />
              <div className="absolute top-4 left-4 bg-tertiary-container/80 backdrop-blur-md px-3 py-1 rounded-full flex items-center gap-2 border border-tertiary/40">
                <span className="w-2 h-2 rounded-full bg-tertiary-fixed-dim live-pulse"></span>
                <span className="text-[10px] font-bold text-tertiary-fixed tracking-widest uppercase">Live</span>
              </div>
              <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-slate-950 to-transparent">
                <span className="bg-slate-900/80 backdrop-blur px-2 py-0.5 rounded text-[10px] font-bold text-secondary border border-secondary/20 mb-2 inline-block">SOCCER • PRO LEAGUE</span>
                <h3 className="font-headline-md text-headline-md text-white">Copa de Titanes 2024</h3>
              </div>
            </div>
            <div className="p-6 flex-1 flex flex-col">
              <div className="flex justify-between mb-4">
                <div>
                  <p className="text-label-sm font-label-sm text-slate-500 mb-1">CURRENT PROGRESS</p>
                  <p className="font-stats-numeric text-stats-numeric text-on-surface">68% <span className="text-xs font-normal text-slate-500">completed</span></p>
                </div>
                <div className="text-right">
                  <p className="text-label-sm font-label-sm text-slate-500 mb-1">TEAMS</p>
                  <p className="font-stats-numeric text-stats-numeric text-on-surface">32/32</p>
                </div>
              </div>
              <div className="w-full bg-slate-800 h-1.5 rounded-full mb-6 overflow-hidden">
                <div className="bg-secondary h-full rounded-full w-[68%]" style={{ boxShadow: '0 0 10px rgba(74, 225, 118, 0.5)' }}></div>
              </div>
              <div className="mt-auto flex gap-3">
                <button className="flex-1 bg-secondary text-slate-950 font-bold py-2.5 rounded-lg border-b-2 border-on-secondary-fixed-variant hover:brightness-110 active:translate-y-0.5 transition-all">Manage Live</button>
                <button className="w-12 h-10 border border-slate-700 text-slate-400 flex items-center justify-center rounded-lg hover:border-secondary hover:text-secondary transition-colors">
                  <span className="material-symbols-outlined" data-icon="analytics">analytics</span>
                </button>
              </div>
            </div>
          </div>
          {/* Card 2: Summer Dunk Classic (Registration) */}
          <div className="bg-surface-container-low rounded-xl overflow-hidden border border-slate-800 flex flex-col group hover:border-slate-700 transition-all duration-300">
            <div className="relative h-48">
              <img className="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all duration-500" data-alt="A vibrant outdoor basketball court in Los Angeles at sunset." src="https://lh3.googleusercontent.com/aida-public/AB6AXuDvpEN_D3YPMaFtxHRv_L6yEVUlmqulI0xRg9jNZjqXH_5T6w-6J2Ym-hZRJj5oSzTPHityfxbNJxI9cOTAlFkeUyvfAqmOTGGrzWRDmvUUhUH17o6U1EyHB7j8iQzWoiv8vgJcYwD6CWj8O1NWIempYsgGvOpukFfXuFTd4zcvW8wIKuk1kFwuAoTMBiX5QJ1ldmrs-X2OrpQ6036gBHueGPpV24uhrzG_TevXyE4grDEimMrGE6MMyIDqEdBF54kJ4VL9zRTFkFCN" />
              <div className="absolute top-4 left-4 bg-secondary-container/80 backdrop-blur-md px-3 py-1 rounded-full flex items-center gap-2 border border-secondary/40">
                <span className="text-[10px] font-bold text-on-secondary-container tracking-widest uppercase">Registration Open</span>
              </div>
              <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-slate-950 to-transparent">
                <span className="bg-slate-900/80 backdrop-blur px-2 py-0.5 rounded text-[10px] font-bold text-tertiary-fixed border border-tertiary/20 mb-2 inline-block">BASKETBALL • OPEN CATEGORY</span>
                <h3 className="font-headline-md text-headline-md text-white">Summer Dunk Classic</h3>
              </div>
            </div>
            <div className="p-6 flex-1 flex flex-col">
              <div className="flex justify-between mb-4">
                <div>
                  <p className="text-label-sm font-label-sm text-slate-500 mb-1">REGISTRATION</p>
                  <p className="font-stats-numeric text-stats-numeric text-on-surface">12/16 <span className="text-xs font-normal text-slate-500">slots taken</span></p>
                </div>
                <div className="text-right">
                  <p className="text-label-sm font-label-sm text-slate-500 mb-1">CLOSES IN</p>
                  <p className="font-stats-numeric text-stats-numeric text-tertiary-fixed">4 Days</p>
                </div>
              </div>
              <div className="w-full bg-slate-800 h-1.5 rounded-full mb-6 overflow-hidden">
                <div className="bg-secondary h-full rounded-full w-[75%]"></div>
              </div>
              <div className="mt-auto flex gap-3">
                <button className="flex-1 bg-surface-container-high border border-secondary text-secondary font-bold py-2.5 rounded-lg border-b-2 hover:bg-secondary/10 active:translate-y-0.5 transition-all">Review Entries</button>
                <button className="w-12 h-10 border border-slate-700 text-slate-400 flex items-center justify-center rounded-lg hover:border-secondary hover:text-secondary transition-colors">
                  <span className="material-symbols-outlined" data-icon="share">share</span>
                </button>
              </div>
            </div>
          </div>
          {/* Card 3: Liga Regional Invierno (Finished) */}
          <div className="bg-surface-container-low rounded-xl overflow-hidden border border-slate-800 flex flex-col opacity-80 group hover:opacity-100 transition-all duration-300">
            <div className="relative h-48">
              <img className="w-full h-full object-cover grayscale transition-all duration-500" data-alt="A professional indoor volleyball court in a sleek, modern gymnasium." src="https://lh3.googleusercontent.com/aida-public/AB6AXuBjZFXT0drUrkpTJ3qTkdcrTjT56x6XBqm5o7Wryjbz_y4KS7FupV4NDa9V1ETTC4qGxUOOOKBKT3a27cObZJqA-07yOd5u1qxlhJPZ8u4enHMwHj2MJ2pIYmznftEm4KWGNYSdeEhgnfxwPkMfaQaqg5gKBO5y_ptjPrkb55Mmmv9gfLzRdlg99nca77eDk4UNafosE_wtQZ-4qmW4sZfFdYbn5yzMK6SkPHIhWGucWDvTrPzru37ussRC86c_-psERLeNglycICp5" />
              <div className="absolute top-4 left-4 bg-slate-800/80 backdrop-blur-md px-3 py-1 rounded-full flex items-center gap-2 border border-slate-700">
                <span className="text-[10px] font-bold text-slate-400 tracking-widest uppercase">Finished</span>
              </div>
              <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-slate-950 to-transparent">
                <span className="bg-slate-900/80 backdrop-blur px-2 py-0.5 rounded text-[10px] font-bold text-slate-500 border border-slate-800 mb-2 inline-block">VOLLEYBALL • REGIONAL</span>
                <h3 className="font-headline-md text-headline-md text-slate-300">Liga Regional Invierno</h3>
              </div>
            </div>
            <div className="p-6 flex-1 flex flex-col">
              <div className="flex justify-between mb-4">
                <div>
                  <p className="text-label-sm font-label-sm text-slate-500 mb-1">CHAMPION</p>
                  <p className="font-stats-numeric text-stats-numeric text-secondary flex items-center gap-1">
                    <span className="material-symbols-outlined text-sm" data-icon="stars" style={{ fontVariationSettings: "'FILL' 1" }}>stars</span>
                                Frost Peaks FC
                            </p>
                </div>
                <div className="text-right">
                  <p className="text-label-sm font-label-sm text-slate-500 mb-1">END DATE</p>
                  <p className="font-stats-numeric text-stats-numeric text-slate-400">Jan 12</p>
                </div>
              </div>
              <div className="w-full bg-slate-800 h-1.5 rounded-full mb-6 overflow-hidden">
                <div className="bg-slate-600 h-full rounded-full w-full"></div>
              </div>
              <div className="mt-auto flex gap-3">
                <button className="flex-1 bg-slate-800 text-slate-300 font-bold py-2.5 rounded-lg border-b-2 border-slate-950 hover:bg-slate-700 active:translate-y-0.5 transition-all">View Archive</button>
                <button className="w-12 h-10 border border-slate-700 text-slate-400 flex items-center justify-center rounded-lg hover:border-slate-500 transition-colors">
                  <span className="material-symbols-outlined" data-icon="download">download</span>
                </button>
              </div>
            </div>
          </div>
        </div>
        {/* Recent Activity Log (High Density Info Section) */}
        <div className="mt-12 bg-surface-container-low rounded-xl border border-outline-variant/30 overflow-hidden">
          <div className="px-6 py-4 border-b border-outline-variant/30 flex justify-between items-center">
            <h4 className="font-headline-md text-sm uppercase tracking-wider text-on-surface">System Activity Log</h4>
            <button className="text-secondary text-xs font-bold hover:underline">View Full Log</button>
          </div>
          <div className="divide-y divide-outline-variant/10">
            <div className="px-6 py-3 flex items-center gap-4 hover:bg-surface-container-high transition-colors">
              <span className="material-symbols-outlined text-secondary text-lg" data-icon="check_circle">check_circle</span>
              <span className="text-sm font-bold text-on-surface">Registration Approved:</span>
              <span className="text-sm text-on-surface-variant flex-1">Team 'Thunder Hawks' added to Summer Dunk Classic.</span>
              <span className="text-xs text-slate-500">2 mins ago</span>
            </div>
            <div className="px-6 py-3 flex items-center gap-4 hover:bg-surface-container-high transition-colors">
              <span className="material-symbols-outlined text-tertiary text-lg" data-icon="warning">warning</span>
              <span className="text-sm font-bold text-on-surface">Score Conflict:</span>
              <span className="text-sm text-on-surface-variant flex-1">Copa de Titanes - Match #104 requires manual verification.</span>
              <span className="text-xs text-slate-500">14 mins ago</span>
            </div>
            <div className="px-6 py-3 flex items-center gap-4 hover:bg-surface-container-high transition-colors">
              <span className="material-symbols-outlined text-primary text-lg" data-icon="info">info</span>
              <span className="text-sm font-bold text-on-surface">Schedule Update:</span>
              <span className="text-sm text-on-surface-variant flex-1">Court 4 assigned for Semi-Finals in regional winter league.</span>
              <span className="text-xs text-slate-500">1 hour ago</span>
            </div>
          </div>
        </div>
      </main>
      {/* Floating Action Button Contextual */}
      <button className="fixed bottom-8 right-8 w-14 h-14 bg-secondary text-slate-950 rounded-full shadow-2xl flex items-center justify-center hover:scale-110 active:scale-95 transition-all z-50 border-4 border-slate-950">
        <span className="material-symbols-outlined font-bold" data-icon="add">add</span>
      </button>
    </div>
  );
}
