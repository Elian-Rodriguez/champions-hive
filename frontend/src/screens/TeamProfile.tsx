export default function TeamProfile({ data }: { data?: any }) {
  if (!data?.teams?.length) {
    return <TeamProfileOriginal />;
  }

  const team = data.teams?.[0] ?? {};
  const players = data.firstTeamPlayers ?? [];
  const row = data.standingsFlat?.find((r: any) => r?.team_name === team?.name);

  return (
    <div className="bg-background text-on-background font-body-md min-h-screen">
      <header className="fixed top-0 w-full z-50 border-b border-outline-variant/30 bg-surface/95 backdrop-blur-md shadow-sm">
        <div className="flex justify-between items-center h-20 px-margin max-w-screen-2xl mx-auto">
          <div className="flex items-center gap-8">
            <span className="font-headline-lg text-headline-lg font-bold text-secondary italic tracking-tighter">Champion Hive</span>
            <nav className="hidden md:flex items-center gap-6">
              <a className="text-on-surface-variant hover:text-secondary transition-colors font-body-md" href="#">Tournaments</a>
              <a className="text-on-surface-variant hover:text-secondary transition-colors font-body-md" href="#">Standings</a>
              <a className="text-secondary font-bold border-b-2 border-secondary pb-1 font-body-md" href="#">Teams</a>
              <a className="text-on-surface-variant hover:text-secondary transition-colors font-body-md" href="#">Players</a>
            </nav>
          </div>
          <div className="flex items-center gap-4">
            <button className="px-6 py-2 rounded-lg border border-tertiary text-tertiary hover:bg-surface-container-high transition-all active:scale-95 font-label-sm">Login</button>
            <button className="px-6 py-2 rounded-lg bg-secondary text-on-secondary font-bold hover:brightness-110 transition-all active:scale-95 font-label-sm">Join League</button>
          </div>
        </div>
      </header>
      <main className="pt-24 pb-12 px-margin max-w-screen-2xl mx-auto flex gap-gutter">
        <aside className="hidden lg:flex flex-col w-64 shrink-0 h-[calc(100vh-120px)] sticky top-24">
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-3 px-4 py-3 mx-2 my-1 text-on-surface-variant hover:bg-surface-container-high rounded-lg cursor-pointer transition-all">
              <span className="material-symbols-outlined">home</span>
              <span className="font-body-md">Home</span>
            </div>
            <div className="flex items-center gap-3 px-4 py-3 mx-2 my-1 text-on-surface-variant hover:bg-surface-container-high rounded-lg cursor-pointer transition-all">
              <span className="material-symbols-outlined">sports_score</span>
              <span className="font-body-md">Tournaments</span>
            </div>
            <div className="flex items-center gap-3 px-4 py-3 mx-2 my-1 text-on-surface-variant hover:bg-surface-container-high rounded-lg cursor-pointer transition-all">
              <span className="material-symbols-outlined">leaderboard</span>
              <span className="font-body-md">Standings</span>
            </div>
            <div className="flex items-center gap-3 px-4 py-3 mx-2 my-1 bg-secondary text-on-secondary font-bold rounded-lg cursor-pointer">
              <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>groups</span>
              <span className="font-body-md">Teams</span>
            </div>
            <div className="flex items-center gap-3 px-4 py-3 mx-2 my-1 text-on-surface-variant hover:bg-surface-container-high rounded-lg cursor-pointer transition-all">
              <span className="material-symbols-outlined">person</span>
              <span className="font-body-md">Players</span>
            </div>
          </div>
          <div className="mt-auto border-t border-outline-variant/30 pt-4 flex flex-col gap-1">
            <div className="flex items-center gap-3 px-4 py-3 mx-2 my-1 text-on-surface-variant hover:bg-surface-container-high rounded-lg cursor-pointer transition-all">
              <span className="material-symbols-outlined">settings</span>
              <span className="font-body-md">Settings</span>
            </div>
            <div className="flex items-center gap-3 px-4 py-3 mx-2 my-1 text-on-surface-variant hover:bg-surface-container-high rounded-lg cursor-pointer transition-all">
              <span className="material-symbols-outlined">help</span>
              <span className="font-body-md">Support</span>
            </div>
          </div>
        </aside>
        <div className="flex-1 space-y-gutter">
          <section className="relative rounded-xl overflow-hidden bg-surface-container-low border border-outline-variant/30 h-[400px]">
            <div className="absolute inset-0 bg-gradient-to-t from-surface-container-lowest via-surface-container-lowest/60 to-transparent z-10"></div>
            <img className="absolute inset-0 w-full h-full object-cover" data-alt="A professional athletic team uniform displayed on a sleek, futuristic mannequin against a dark, atmospheric studio background. The lighting is high-contrast with neon green rim lights highlighting the fabric's texture and technical details. The overall mood is intense and elite, consistent with a high-performance sports brand aesthetic." src="https://lh3.googleusercontent.com/aida/ADBb0uj3VEmv-u5gTRcItaE2tuQDzN7zqY6I5T_Wz91wUL5TpxhCC4KCYdmgiFQXKy0qFU-_qhxIVs-OMI5AJl6VjdVN4A0u6KVCFIUDkRrC8BQmCH307GRMGK0ElYkBYULMMuxbJCq1j4pbybkecBKOhRu0PHPbN-AYAHfBipkG3xZ9OdoOaT-ncgGo4ocrpvoukXYETcqH7qpAL_LqM0UkSW5sMpuY3yiimXZF1nAJ8qU5sAXZrbM_gXakWMk" />
            <div className="absolute bottom-0 left-0 w-full p-lg z-20 flex justify-between items-end">
              <div className="flex items-center gap-8">
                <div className="w-32 h-32 rounded-xl bg-surface-container-highest border-2 border-secondary overflow-hidden glow-secondary">
                  <img className="w-full h-full object-cover" data-alt="A bold and modern athletic team crest featuring sharp geometric lines and a stylized predator motif. The logo is rendered in vibrant neon green and deep charcoal gray against a sleek metallic background. The design is authoritative and high-energy, perfect for a premier competitive sports organization." src="https://lh3.googleusercontent.com/aida/ADBb0uhEOUBJNogjzQUu1-oNKuy7zI5APrQkXEfC3vFbzP_osrB3xvTkwzuKMso8UmyYZiXsHGD_GL4OvAOHRP4McjWfLcT32-kRZHLZvOnhsHqR2q2KXY4sQnzXIV3936tLmM9Gh8bHyOUXOV70s8hMUjj_oJy2eVTERu7qSkhe7moBw0hP3JtNTtCc9IbOa8J9DdDK7e2UL4llQfNASAFsQq9UA5SAxXfsswctdCxMNxuidGF3kACjkqfTmPpzPmapUvz12PO5dvM5DLA" />
                </div>
                <div className="flex flex-col gap-2">
                  <span className="font-label-sm text-secondary uppercase tracking-widest">{team?.group_name ?? "Global Division • Pro League"}</span>
                  <h1 className="font-display-xl text-display-xl text-on-surface uppercase">{team?.name ?? "Emerald Vipers"}</h1>
                  <div className="flex gap-4">
                    <div className="flex items-center gap-2">
                      <span className="material-symbols-outlined text-secondary text-sm">workspace_premium</span>
                      <span className="font-label-sm text-on-surface-variant">3x Champions</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="material-symbols-outlined text-secondary text-sm">public</span>
                      <span className="font-label-sm text-on-surface-variant">London, UK</span>
                    </div>
                  </div>
                </div>
              </div>
              <div className="flex gap-4 mb-2">
                <button className="flex items-center gap-2 bg-secondary text-on-secondary px-8 py-3 rounded-lg font-bold hover:brightness-110 transition-all active:scale-95 shadow-lg">
                  <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>add_circle</span>
                  Follow Team
                </button>
                <button className="flex items-center justify-center w-12 h-12 rounded-lg border border-outline-variant text-on-surface hover:bg-surface-container-high transition-all">
                  <span className="material-symbols-outlined">share</span>
                </button>
              </div>
            </div>
          </section>
          <section className="grid grid-cols-1 md:grid-cols-3 gap-gutter">
            <div className="md:col-span-2 bg-surface-container rounded-xl border border-outline-variant/30 p-lg flex flex-col gap-6">
              <div className="flex justify-between items-center">
                <h3 className="font-headline-md text-headline-md text-on-surface">Performance Curve</h3>
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-secondary"></div>
                    <span className="font-label-sm text-on-surface-variant">Win Prob %</span>
                  </div>
                  <select className="bg-surface-container-high border-none text-label-sm text-on-surface rounded focus:ring-secondary">
                    <option>Last 10 Matches</option>
                    <option>Season 2024</option>
                  </select>
                </div>
              </div>
              <div className="h-48 w-full flex items-end gap-2 px-2">
                <div className="flex-1 bg-secondary/10 rounded-t-sm relative group h-[40%] hover:bg-secondary/30 transition-colors">
                  <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-surface-container-highest text-on-surface text-[10px] py-1 px-2 rounded opacity-0 group-hover:opacity-100 transition-opacity">40%</div>
                </div>
                <div className="flex-1 bg-secondary/10 rounded-t-sm relative group h-[65%] hover:bg-secondary/30 transition-colors">
                  <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-surface-container-highest text-on-surface text-[10px] py-1 px-2 rounded opacity-0 group-hover:opacity-100 transition-opacity">65%</div>
                </div>
                <div className="flex-1 bg-secondary/10 rounded-t-sm relative group h-[55%] hover:bg-secondary/30 transition-colors">
                  <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-surface-container-highest text-on-surface text-[10px] py-1 px-2 rounded opacity-0 group-hover:opacity-100 transition-opacity">55%</div>
                </div>
                <div className="flex-1 bg-secondary/10 rounded-t-sm relative group h-[85%] hover:bg-secondary/30 transition-colors">
                  <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-surface-container-highest text-on-surface text-[10px] py-1 px-2 rounded opacity-0 group-hover:opacity-100 transition-opacity">85%</div>
                </div>
                <div className="flex-1 bg-secondary rounded-t-sm relative group h-[95%] shadow-[0_0_20px_rgba(74,225,118,0.4)]">
                  <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-surface-container-highest text-on-surface text-[10px] py-1 px-2 rounded">95%</div>
                </div>
              </div>
            </div>
            <div className="bg-surface-container rounded-xl border-t-4 border-secondary border-outline-variant/30 p-lg flex flex-col justify-between">
              <div>
                <h3 className="font-headline-md text-headline-md text-on-surface">League Rank</h3>
                <div className="mt-4 flex items-baseline gap-2">
                  <span className="font-display-xl text-display-xl text-secondary">{row?.position != null ? `#${String(row.position).padStart(2, "0")}` : "#04"}</span>
                  <span className="font-label-sm text-on-surface-variant uppercase">World Wide</span>
                </div>
              </div>
              <div className="space-y-3">
                <div className="flex justify-between items-center py-2 border-b border-outline-variant/20">
                  <span className="font-body-md text-on-surface-variant">Matches Played</span>
                  <span className="font-stats-numeric text-stats-numeric text-on-surface">{row?.matches_played ?? "—"}</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-outline-variant/20">
                  <span className="font-body-md text-on-surface-variant">Wins</span>
                  <span className="font-stats-numeric text-stats-numeric text-on-surface">{row?.wins ?? "—"}</span>
                </div>
                <div className="flex justify-between items-center py-2">
                  <span className="font-body-md text-on-surface-variant">League Points</span>
                  <span className="font-stats-numeric text-stats-numeric text-secondary">{row?.league_points ?? "—"}</span>
                </div>
              </div>
            </div>
          </section>
          <section className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="font-headline-md text-headline-md text-on-surface">Official Roster</h2>
              <button className="text-secondary font-label-sm hover:underline">View All Stats</button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-gutter">
              {players.map((p: any, i: number) => (
                <div key={p?.id ?? i} className="bg-surface-container-high rounded-xl p-4 border border-outline-variant/30 hover:border-secondary transition-all group cursor-pointer">
                  <div className="relative w-full aspect-square rounded-lg overflow-hidden mb-4">
                    <img className="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all duration-300" data-alt="A sharp, professional portrait of a competitive e-sports player wearing a black and neon green team jersey. The lighting is dramatic and moody, coming from the side to define facial features against a dark, tech-infused background. The atmosphere is focused and intense." src="https://lh3.googleusercontent.com/aida/ADBb0ugAslubqau1if-Y7ldh0EkOQy0DB96ef6kXXkQ3470IVP0Gepn5A7WdGmZFd22WhVaEvNxmFG6CGsSdebIi-BDS6sdQ2wKMjuxW8OSNXiqGxY9dvQRqnmmHYe6rbP5etCHFmemp9D1zRPBqKXrNaTZqWNJgsVfcTiPUkptifYp9LaFDmrvbVJk0Zcg-nt1zMaVQdSWYMXoIvp_PzX4-cuWUf-V1WJcDxe5a-R2WuWiRnmlFlkn2FOCI63qm" />
                    {i === 0 && <div className="absolute top-2 right-2 bg-secondary text-on-secondary px-2 py-1 rounded text-[10px] font-bold">CAPTAIN</div>}
                  </div>
                  <div className="space-y-1">
                    <span className="font-label-sm text-secondary uppercase">#{p?.number ?? "—"}</span>
                    <h4 className="font-headline-md text-headline-md text-on-surface group-hover:text-secondary transition-colors">{p?.name ?? "Unknown"}</h4>
                  </div>
                </div>
              ))}
            </div>
          </section>
          <section className="grid grid-cols-1 xl:grid-cols-2 gap-gutter">
            <div className="bg-surface-container rounded-xl border border-outline-variant/30 p-lg">
              <h3 className="font-headline-md text-headline-md text-on-surface mb-6">Recent Match History</h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-surface-container-high rounded-lg">
                  <div className="flex items-center gap-4">
                    <span className="font-label-sm text-secondary">WIN</span>
                    <div className="w-8 h-8 rounded-full bg-surface-container-highest overflow-hidden">
                      <img className="w-full h-full object-cover" data-alt="Small team logo icon in high contrast neon colors." src="https://lh3.googleusercontent.com/aida/ADBb0ujO9yJ1mf1lHIQtA4IQCj-ZKj5djUf_yDNzld5sL4dvz_uJBjYxegv9MgvIn5o-wxsIy_1TEmxwmx_jRIvneDWgDhvmeSxqBO-namYhpnkAjoxvWgBMXPC3wwrBciF4_W8ULBwr9-Uc9nnKI4ajbq45ZsdKT2gCc8JW1FSY3bxlumBglhuYxQLIZZXq_qY9Cuz9D3k55wy7StbZ7HgZM7PAcrbhTrSqvFRHcGQ14DtwYbHyq22E9wiHHBtC" />
                    </div>
                    <span className="font-body-md text-on-surface font-bold">vs Thunder Storms</span>
                  </div>
                  <div className="text-right">
                    <span className="font-stats-numeric text-on-surface">12 - 08</span>
                    <p className="text-[10px] text-on-surface-variant uppercase">Oct 12, 2024</p>
                  </div>
                </div>
                <div className="flex items-center justify-between p-4 bg-surface-container-high rounded-lg">
                  <div className="flex items-center gap-4">
                    <span className="font-label-sm text-tertiary">LOSS</span>
                    <div className="w-8 h-8 rounded-full bg-surface-container-highest overflow-hidden">
                      <img className="w-full h-full object-cover" data-alt="Small team logo icon in high contrast orange and gray." src="https://lh3.googleusercontent.com/aida/ADBb0ujO9yJ1mf1lHIQtA4IQCj-ZKj5djUf_yDNzld5sL4dvz_uJBjYxegv9MgvIn5o-wxsIy_1TEmxwmx_jRIvneDWgDhvmeSxqBO-namYhpnkAjoxvWgBMXPC3wwrBciF4_W8ULBwr9-Uc9nnKI4ajbq45ZsdKT2gCc8JW1FSY3bxlumBglhuYxQLIZZXq_qY9Cuz9D3k55wy7StbZ7HgZM7PAcrbhTrSqvFRHcGQ14DtwYbHyq22E9wiHHBtC" />
                    </div>
                    <span className="font-body-md text-on-surface font-bold">vs Iron Titans</span>
                  </div>
                  <div className="text-right">
                    <span className="font-stats-numeric text-on-surface">05 - 09</span>
                    <p className="text-[10px] text-on-surface-variant uppercase">Oct 08, 2024</p>
                  </div>
                </div>
                <div className="flex items-center justify-between p-4 bg-surface-container-high rounded-lg">
                  <div className="flex items-center gap-4">
                    <span className="font-label-sm text-secondary">WIN</span>
                    <div className="w-8 h-8 rounded-full bg-surface-container-highest overflow-hidden">
                      <img className="w-full h-full object-cover" data-alt="Small team logo icon." src="https://lh3.googleusercontent.com/aida/ADBb0ujO9yJ1mf1lHIQtA4IQCj-ZKj5djUf_yDNzld5sL4dvz_uJBjYxegv9MgvIn5o-wxsIy_1TEmxwmx_jRIvneDWgDhvmeSxqBO-namYhpnkAjoxvWgBMXPC3wwrBciF4_W8ULBwr9-Uc9nnKI4ajbq45ZsdKT2gCc8JW1FSY3bxlumBglhuYxQLIZZXq_qY9Cuz9D3k55wy7StbZ7HgZM7PAcrbhTrSqvFRHcGQ14DtwYbHyq22E9wiHHBtC" />
                    </div>
                    <span className="font-body-md text-on-surface font-bold">vs Red Hawks</span>
                  </div>
                  <div className="text-right">
                    <span className="font-stats-numeric text-on-surface">15 - 14</span>
                    <p className="text-[10px] text-on-surface-variant uppercase">Oct 05, 2024</p>
                  </div>
                </div>
              </div>
            </div>
            <div className="bg-surface-container rounded-xl border border-outline-variant/30 p-lg relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-32 h-32 bg-secondary/5 -rotate-45 translate-x-12 -translate-y-12"></div>
              <div className="flex justify-between items-start mb-8">
                <div>
                  <span className="inline-flex items-center gap-2 px-3 py-1 bg-tertiary/10 text-tertiary rounded-full font-label-sm pulse-live">
                    <span className="w-2 h-2 rounded-full bg-tertiary"></span>
                    UPCOMING MATCH
                  </span>
                  <h3 className="font-display-xl text-headline-lg text-on-surface mt-4">Vipers vs Blitz</h3>
                </div>
                <div className="text-right">
                  <p className="font-label-sm text-on-surface-variant">STARTS IN</p>
                  <p className="font-stats-numeric text-headline-md text-secondary">02:14:55</p>
                </div>
              </div>
              <div className="flex items-center justify-center gap-12 py-8 border-y border-outline-variant/20">
                <div className="text-center space-y-2">
                  <div className="w-20 h-20 rounded-full border-2 border-secondary p-1 glow-secondary mx-auto">
                    <img className="w-full h-full object-cover rounded-full" data-alt="Team crest icon." src="https://lh3.googleusercontent.com/aida/ADBb0uhEOUBJNogjzQUu1-oNKuy7zI5APrQkXEfC3vFbzP_osrB3xvTkwzuKMso8UmyYZiXsHGD_GL4OvAOHRP4McjWfLcT32-kRZHLZvOnhsHqR2q2KXY4sQnzXIV3936tLmM9Gh8bHyOUXOV70s8hMUjj_oJy2eVTERu7qSkhe7moBw0hP3JtNTtCc9IbOa8J9DdDK7e2UL4llQfNASAFsQq9UA5SAxXfsswctdCxMNxuidGF3kACjkqfTmPpzPmapUvz12PO5dvM5DLA" />
                  </div>
                  <p className="font-label-sm text-on-surface font-bold">VIPERS</p>
                </div>
                <div className="text-display-xl text-outline-variant italic font-extrabold">VS</div>
                <div className="text-center space-y-2">
                  <div className="w-20 h-20 rounded-full border-2 border-tertiary p-1 mx-auto">
                    <img className="w-full h-full object-cover rounded-full" data-alt="Opposing team crest icon." src="https://lh3.googleusercontent.com/aida/ADBb0ujO9yJ1mf1lHIQtA4IQCj-ZKj5djUf_yDNzld5sL4dvz_uJBjYxegv9MgvIn5o-wxsIy_1TEmxwmx_jRIvneDWgDhvmeSxqBO-namYhpnkAjoxvWgBMXPC3wwrBciF4_W8ULBwr9-Uc9nnKI4ajbq45ZsdKT2gCc8JW1FSY3bxlumBglhuYxQLIZZXq_qY9Cuz9D3k55wy7StbZ7HgZM7PAcrbhTrSqvFRHcGQ14DtwYbHyq22E9wiHHBtC" />
                  </div>
                  <p className="font-label-sm text-on-surface font-bold">BLITZ</p>
                </div>
              </div>
              <button className="w-full mt-6 py-4 bg-surface-container-highest border border-tertiary text-tertiary font-bold rounded-lg hover:bg-tertiary hover:text-on-tertiary transition-all">
                Buy Tickets / Set Reminder
              </button>
            </div>
          </section>
        </div>
      </main>
      <footer className="w-full py-xl px-margin border-t border-outline-variant bg-surface-container-lowest">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-gutter max-w-7xl mx-auto">
          <div className="col-span-1 md:col-span-1">
            <span className="font-headline-md text-headline-md text-secondary block mb-4">Champion Hive</span>
            <p className="font-label-sm text-on-surface-variant">© 2024 Champion Hive. All rights reserved.</p>
          </div>
          <div>
            <h5 className="font-label-sm text-on-surface mb-4 uppercase">Platform</h5>
            <ul className="space-y-2">
              <li><a className="font-label-sm text-on-surface-variant hover:text-secondary transition-colors" href="#">Tournaments</a></li>
              <li><a className="font-label-sm text-on-surface-variant hover:text-secondary transition-colors" href="#">Standings</a></li>
              <li><a className="font-label-sm text-on-surface-variant hover:text-secondary transition-colors" href="#">Teams</a></li>
            </ul>
          </div>
          <div>
            <h5 className="font-label-sm text-on-surface mb-4 uppercase">Company</h5>
            <ul className="space-y-2">
              <li><a className="font-label-sm text-on-surface-variant hover:text-secondary transition-colors" href="#">Privacy Policy</a></li>
              <li><a className="font-label-sm text-on-surface-variant hover:text-secondary transition-colors" href="#">Terms of Service</a></li>
              <li><a className="font-label-sm text-on-surface-variant hover:text-secondary transition-colors" href="#">Contact Us</a></li>
            </ul>
          </div>
          <div>
            <h5 className="font-label-sm text-on-surface mb-4 uppercase">Partnerships</h5>
            <ul className="space-y-2">
              <li><a className="font-label-sm text-on-surface-variant hover:text-secondary transition-colors" href="#">Sponsorships</a></li>
              <li><a className="font-label-sm text-on-surface-variant hover:text-secondary transition-colors" href="#">Elite Program</a></li>
            </ul>
          </div>
        </div>
      </footer>
    </div>
  );
}

function TeamProfileOriginal() {
  return (
    <div className="bg-background text-on-background font-body-md min-h-screen">
      <header className="fixed top-0 w-full z-50 border-b border-outline-variant/30 bg-surface/95 backdrop-blur-md shadow-sm">
        <div className="flex justify-between items-center h-20 px-margin max-w-screen-2xl mx-auto">
          <div className="flex items-center gap-8">
            <span className="font-headline-lg text-headline-lg font-bold text-secondary italic tracking-tighter">Champion Hive</span>
            <nav className="hidden md:flex items-center gap-6">
              <a className="text-on-surface-variant hover:text-secondary transition-colors font-body-md" href="#">Tournaments</a>
              <a className="text-on-surface-variant hover:text-secondary transition-colors font-body-md" href="#">Standings</a>
              <a className="text-secondary font-bold border-b-2 border-secondary pb-1 font-body-md" href="#">Teams</a>
              <a className="text-on-surface-variant hover:text-secondary transition-colors font-body-md" href="#">Players</a>
            </nav>
          </div>
          <div className="flex items-center gap-4">
            <button className="px-6 py-2 rounded-lg border border-tertiary text-tertiary hover:bg-surface-container-high transition-all active:scale-95 font-label-sm">Login</button>
            <button className="px-6 py-2 rounded-lg bg-secondary text-on-secondary font-bold hover:brightness-110 transition-all active:scale-95 font-label-sm">Join League</button>
          </div>
        </div>
      </header>
      <main className="pt-24 pb-12 px-margin max-w-screen-2xl mx-auto flex gap-gutter">
        <aside className="hidden lg:flex flex-col w-64 shrink-0 h-[calc(100vh-120px)] sticky top-24">
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-3 px-4 py-3 mx-2 my-1 text-on-surface-variant hover:bg-surface-container-high rounded-lg cursor-pointer transition-all">
              <span className="material-symbols-outlined">home</span>
              <span className="font-body-md">Home</span>
            </div>
            <div className="flex items-center gap-3 px-4 py-3 mx-2 my-1 text-on-surface-variant hover:bg-surface-container-high rounded-lg cursor-pointer transition-all">
              <span className="material-symbols-outlined">sports_score</span>
              <span className="font-body-md">Tournaments</span>
            </div>
            <div className="flex items-center gap-3 px-4 py-3 mx-2 my-1 text-on-surface-variant hover:bg-surface-container-high rounded-lg cursor-pointer transition-all">
              <span className="material-symbols-outlined">leaderboard</span>
              <span className="font-body-md">Standings</span>
            </div>
            <div className="flex items-center gap-3 px-4 py-3 mx-2 my-1 bg-secondary text-on-secondary font-bold rounded-lg cursor-pointer">
              <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>groups</span>
              <span className="font-body-md">Teams</span>
            </div>
            <div className="flex items-center gap-3 px-4 py-3 mx-2 my-1 text-on-surface-variant hover:bg-surface-container-high rounded-lg cursor-pointer transition-all">
              <span className="material-symbols-outlined">person</span>
              <span className="font-body-md">Players</span>
            </div>
          </div>
          <div className="mt-auto border-t border-outline-variant/30 pt-4 flex flex-col gap-1">
            <div className="flex items-center gap-3 px-4 py-3 mx-2 my-1 text-on-surface-variant hover:bg-surface-container-high rounded-lg cursor-pointer transition-all">
              <span className="material-symbols-outlined">settings</span>
              <span className="font-body-md">Settings</span>
            </div>
            <div className="flex items-center gap-3 px-4 py-3 mx-2 my-1 text-on-surface-variant hover:bg-surface-container-high rounded-lg cursor-pointer transition-all">
              <span className="material-symbols-outlined">help</span>
              <span className="font-body-md">Support</span>
            </div>
          </div>
        </aside>
        <div className="flex-1 space-y-gutter">
          <section className="relative rounded-xl overflow-hidden bg-surface-container-low border border-outline-variant/30 h-[400px]">
            <div className="absolute inset-0 bg-gradient-to-t from-surface-container-lowest via-surface-container-lowest/60 to-transparent z-10"></div>
            <img className="absolute inset-0 w-full h-full object-cover" data-alt="A professional athletic team uniform displayed on a sleek, futuristic mannequin against a dark, atmospheric studio background. The lighting is high-contrast with neon green rim lights highlighting the fabric's texture and technical details. The overall mood is intense and elite, consistent with a high-performance sports brand aesthetic." src="https://lh3.googleusercontent.com/aida/ADBb0uj3VEmv-u5gTRcItaE2tuQDzN7zqY6I5T_Wz91wUL5TpxhCC4KCYdmgiFQXKy0qFU-_qhxIVs-OMI5AJl6VjdVN4A0u6KVCFIUDkRrC8BQmCH307GRMGK0ElYkBYULMMuxbJCq1j4pbybkecBKOhRu0PHPbN-AYAHfBipkG3xZ9OdoOaT-ncgGo4ocrpvoukXYETcqH7qpAL_LqM0UkSW5sMpuY3yiimXZF1nAJ8qU5sAXZrbM_gXakWMk" />
            <div className="absolute bottom-0 left-0 w-full p-lg z-20 flex justify-between items-end">
              <div className="flex items-center gap-8">
                <div className="w-32 h-32 rounded-xl bg-surface-container-highest border-2 border-secondary overflow-hidden glow-secondary">
                  <img className="w-full h-full object-cover" data-alt="A bold and modern athletic team crest featuring sharp geometric lines and a stylized predator motif. The logo is rendered in vibrant neon green and deep charcoal gray against a sleek metallic background. The design is authoritative and high-energy, perfect for a premier competitive sports organization." src="https://lh3.googleusercontent.com/aida/ADBb0uhEOUBJNogjzQUu1-oNKuy7zI5APrQkXEfC3vFbzP_osrB3xvTkwzuKMso8UmyYZiXsHGD_GL4OvAOHRP4McjWfLcT32-kRZHLZvOnhsHqR2q2KXY4sQnzXIV3936tLmM9Gh8bHyOUXOV70s8hMUjj_oJy2eVTERu7qSkhe7moBw0hP3JtNTtCc9IbOa8J9DdDK7e2UL4llQfNASAFsQq9UA5SAxXfsswctdCxMNxuidGF3kACjkqfTmPpzPmapUvz12PO5dvM5DLA" />
                </div>
                <div className="flex flex-col gap-2">
                  <span className="font-label-sm text-secondary uppercase tracking-widest">Global Division • Pro League</span>
                  <h1 className="font-display-xl text-display-xl text-on-surface uppercase">Emerald Vipers</h1>
                  <div className="flex gap-4">
                    <div className="flex items-center gap-2">
                      <span className="material-symbols-outlined text-secondary text-sm">workspace_premium</span>
                      <span className="font-label-sm text-on-surface-variant">3x Champions</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="material-symbols-outlined text-secondary text-sm">public</span>
                      <span className="font-label-sm text-on-surface-variant">London, UK</span>
                    </div>
                  </div>
                </div>
              </div>
              <div className="flex gap-4 mb-2">
                <button className="flex items-center gap-2 bg-secondary text-on-secondary px-8 py-3 rounded-lg font-bold hover:brightness-110 transition-all active:scale-95 shadow-lg">
                  <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>add_circle</span>
                  Follow Team
                </button>
                <button className="flex items-center justify-center w-12 h-12 rounded-lg border border-outline-variant text-on-surface hover:bg-surface-container-high transition-all">
                  <span className="material-symbols-outlined">share</span>
                </button>
              </div>
            </div>
          </section>
          <section className="grid grid-cols-1 md:grid-cols-3 gap-gutter">
            <div className="md:col-span-2 bg-surface-container rounded-xl border border-outline-variant/30 p-lg flex flex-col gap-6">
              <div className="flex justify-between items-center">
                <h3 className="font-headline-md text-headline-md text-on-surface">Performance Curve</h3>
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-secondary"></div>
                    <span className="font-label-sm text-on-surface-variant">Win Prob %</span>
                  </div>
                  <select className="bg-surface-container-high border-none text-label-sm text-on-surface rounded focus:ring-secondary">
                    <option>Last 10 Matches</option>
                    <option>Season 2024</option>
                  </select>
                </div>
              </div>
              <div className="h-48 w-full flex items-end gap-2 px-2">
                <div className="flex-1 bg-secondary/10 rounded-t-sm relative group h-[40%] hover:bg-secondary/30 transition-colors">
                  <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-surface-container-highest text-on-surface text-[10px] py-1 px-2 rounded opacity-0 group-hover:opacity-100 transition-opacity">40%</div>
                </div>
                <div className="flex-1 bg-secondary/10 rounded-t-sm relative group h-[65%] hover:bg-secondary/30 transition-colors">
                  <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-surface-container-highest text-on-surface text-[10px] py-1 px-2 rounded opacity-0 group-hover:opacity-100 transition-opacity">65%</div>
                </div>
                <div className="flex-1 bg-secondary/10 rounded-t-sm relative group h-[55%] hover:bg-secondary/30 transition-colors">
                  <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-surface-container-highest text-on-surface text-[10px] py-1 px-2 rounded opacity-0 group-hover:opacity-100 transition-opacity">55%</div>
                </div>
                <div className="flex-1 bg-secondary/10 rounded-t-sm relative group h-[85%] hover:bg-secondary/30 transition-colors">
                  <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-surface-container-highest text-on-surface text-[10px] py-1 px-2 rounded opacity-0 group-hover:opacity-100 transition-opacity">85%</div>
                </div>
                <div className="flex-1 bg-secondary rounded-t-sm relative group h-[95%] shadow-[0_0_20px_rgba(74,225,118,0.4)]">
                  <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-surface-container-highest text-on-surface text-[10px] py-1 px-2 rounded">95%</div>
                </div>
              </div>
            </div>
            <div className="bg-surface-container rounded-xl border-t-4 border-secondary border-outline-variant/30 p-lg flex flex-col justify-between">
              <div>
                <h3 className="font-headline-md text-headline-md text-on-surface">League Rank</h3>
                <div className="mt-4 flex items-baseline gap-2">
                  <span className="font-display-xl text-display-xl text-secondary">#04</span>
                  <span className="font-label-sm text-on-surface-variant uppercase">World Wide</span>
                </div>
              </div>
              <div className="space-y-3">
                <div className="flex justify-between items-center py-2 border-b border-outline-variant/20">
                  <span className="font-body-md text-on-surface-variant">Win Rate</span>
                  <span className="font-stats-numeric text-stats-numeric text-on-surface">78.2%</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-outline-variant/20">
                  <span className="font-body-md text-on-surface-variant">Total Points</span>
                  <span className="font-stats-numeric text-stats-numeric text-on-surface">2,840</span>
                </div>
                <div className="flex justify-between items-center py-2">
                  <span className="font-body-md text-on-surface-variant">Streak</span>
                  <span className="font-stats-numeric text-stats-numeric text-secondary">W 5</span>
                </div>
              </div>
            </div>
          </section>
          <section className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="font-headline-md text-headline-md text-on-surface">Official Roster</h2>
              <button className="text-secondary font-label-sm hover:underline">View All Stats</button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-gutter">
              <div className="bg-surface-container-high rounded-xl p-4 border border-outline-variant/30 hover:border-secondary transition-all group cursor-pointer">
                <div className="relative w-full aspect-square rounded-lg overflow-hidden mb-4">
                  <img className="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all duration-300" data-alt="A sharp, professional portrait of a competitive e-sports player wearing a black and neon green team jersey. The lighting is dramatic and moody, coming from the side to define facial features against a dark, tech-infused background. The atmosphere is focused and intense." src="https://lh3.googleusercontent.com/aida/ADBb0ugAslubqau1if-Y7ldh0EkOQy0DB96ef6kXXkQ3470IVP0Gepn5A7WdGmZFd22WhVaEvNxmFG6CGsSdebIi-BDS6sdQ2wKMjuxW8OSNXiqGxY9dvQRqnmmHYe6rbP5etCHFmemp9D1zRPBqKXrNaTZqWNJgsVfcTiPUkptifYp9LaFDmrvbVJk0Zcg-nt1zMaVQdSWYMXoIvp_PzX4-cuWUf-V1WJcDxe5a-R2WuWiRnmlFlkn2FOCI63qm" />
                  <div className="absolute top-2 right-2 bg-secondary text-on-secondary px-2 py-1 rounded text-[10px] font-bold">CAPTAIN</div>
                </div>
                <div className="space-y-1">
                  <span className="font-label-sm text-secondary uppercase">Front Liner</span>
                  <h4 className="font-headline-md text-headline-md text-on-surface group-hover:text-secondary transition-colors">Viper_Alpha</h4>
                  <p className="font-body-md text-on-surface-variant">Marcus Thorne</p>
                </div>
              </div>
              <div className="bg-surface-container-high rounded-xl p-4 border border-outline-variant/30 hover:border-secondary transition-all group cursor-pointer">
                <div className="relative w-full aspect-square rounded-lg overflow-hidden mb-4">
                  <img className="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all duration-300" data-alt="A high-fidelity portrait of a professional sports athlete in their team kit. High-key neon highlights accentuate the sleek athletic wear. The player has a determined, professional expression. The background features subtle digital data stream overlays, reinforcing a modern, competitive sports management aesthetic." src="https://lh3.googleusercontent.com/aida/ADBb0uhXHOsDYIg8Ce-sVc08yTmMfkdyY0VE_YZDjIYZQpF3TwInIyGMSxcg4FbaoZ8I2FoWhkmP2KklaMAlHm6jfu0kdKUgOoUgHIa67ZUQNS_xRY6ACqkVdcLeZ9c3FFtyIQpgGVJtbEAIFh6F9PmgrCufvrrzGCeVPfvJmKv7Us3hxvTBWIHOCZk-60mZ_9_cpHWNyO-hLPZRRshCii3wPq_qL2HjdNGb75ayXLrCIOZlu2Bd_PjYB_Uil4Q" />
                </div>
                <div className="space-y-1">
                  <span className="font-label-sm text-tertiary uppercase">Support</span>
                  <h4 className="font-headline-md text-headline-md text-on-surface group-hover:text-secondary transition-colors">Neon_Shadow</h4>
                  <p className="font-body-md text-on-surface-variant">Lena Kovic</p>
                </div>
              </div>
              <div className="bg-surface-container-high rounded-xl p-4 border border-outline-variant/30 hover:border-secondary transition-all group cursor-pointer">
                <div className="relative w-full aspect-square rounded-lg overflow-hidden mb-4">
                  <img className="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all duration-300" data-alt="Close-up headshot of a competitive team member. Precise lighting creates a professional athletic look. The uniform features high-contrast green branding. The scene is set in a professional arena environment with soft blurred background floodlights, suggesting a game-day atmosphere." src="https://lh3.googleusercontent.com/aida/ADBb0ujlA1I4-0eqo5nUdBuHbXtCvmJQbRK4FbJ72DYUxHAE-xXo0KYtMsNJKBakYbrpyAB9o0ejxHvl0Z6SUP4-cjjDHwGye4gJaLBuOLQ2Em5qUFZJlb1_Jp12v2zrkoOa5A6csX4cMYPaOaXPhX5XrWmTQB5HjlJzx8KwRs8JAvbXHx-Udq7xQJVVU56m3m5Y8xIekDyV6UU4M6dDufyWWaEDxsSuUvl8txYqCxbwdoLJXWNlOoLPpPi1XNDK" />
                </div>
                <div className="space-y-1">
                  <span className="font-label-sm text-secondary uppercase">Tactician</span>
                  <h4 className="font-headline-md text-headline-md text-on-surface group-hover:text-secondary transition-colors">Z-Pulse</h4>
                  <p className="font-body-md text-on-surface-variant">David Wu</p>
                </div>
              </div>
              <div className="bg-surface-container-high rounded-xl p-4 border border-outline-variant/30 hover:border-secondary transition-all group cursor-pointer">
                <div className="relative w-full aspect-square rounded-lg overflow-hidden mb-4">
                  <img className="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all duration-300" data-alt="Studio portrait of a pro athlete with a focused gaze. The lighting is sophisticated, using deep shadows and vibrant emerald green highlights to align with the team's visual identity. The image conveys high stakes and the peak of athletic professionalism." src="https://lh3.googleusercontent.com/aida/ADBb0ujiyZTtEyuJw5dUzrZG_h0Gh05bJMaJU52DnY2Axa5RdR_AaeQ0hQgE4TZ9GiruoMU8aMdteDTPqD7fQYpS-RS2zYsSUT5kc_NxFWc2lKLWDpL_yjsESNxQGsGlCxH9GxeNY3V8yo5clI3vK9K7kMB8NbD7VZbRigqX-IFG_uPOwkje9_Rym8EaCMSR2Mkj0Ce_CKo9OzMMpwXOmHQzgexPJkle26gSvtHnqguOm9FCLXcojYi0t3MfJ4g8" />
                </div>
                <div className="space-y-1">
                  <span className="font-label-sm text-tertiary uppercase">Rookie</span>
                  <h4 className="font-headline-md text-headline-md text-on-surface group-hover:text-secondary transition-colors">Ghost_Rider</h4>
                  <p className="font-body-md text-on-surface-variant">Sasha Volkov</p>
                </div>
              </div>
            </div>
          </section>
          <section className="grid grid-cols-1 xl:grid-cols-2 gap-gutter">
            <div className="bg-surface-container rounded-xl border border-outline-variant/30 p-lg">
              <h3 className="font-headline-md text-headline-md text-on-surface mb-6">Recent Match History</h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-surface-container-high rounded-lg">
                  <div className="flex items-center gap-4">
                    <span className="font-label-sm text-secondary">WIN</span>
                    <div className="w-8 h-8 rounded-full bg-surface-container-highest overflow-hidden">
                      <img className="w-full h-full object-cover" data-alt="Small team logo icon in high contrast neon colors." src="https://lh3.googleusercontent.com/aida/ADBb0ujO9yJ1mf1lHIQtA4IQCj-ZKj5djUf_yDNzld5sL4dvz_uJBjYxegv9MgvIn5o-wxsIy_1TEmxwmx_jRIvneDWgDhvmeSxqBO-namYhpnkAjoxvWgBMXPC3wwrBciF4_W8ULBwr9-Uc9nnKI4ajbq45ZsdKT2gCc8JW1FSY3bxlumBglhuYxQLIZZXq_qY9Cuz9D3k55wy7StbZ7HgZM7PAcrbhTrSqvFRHcGQ14DtwYbHyq22E9wiHHBtC" />
                    </div>
                    <span className="font-body-md text-on-surface font-bold">vs Thunder Storms</span>
                  </div>
                  <div className="text-right">
                    <span className="font-stats-numeric text-on-surface">12 - 08</span>
                    <p className="text-[10px] text-on-surface-variant uppercase">Oct 12, 2024</p>
                  </div>
                </div>
                <div className="flex items-center justify-between p-4 bg-surface-container-high rounded-lg">
                  <div className="flex items-center gap-4">
                    <span className="font-label-sm text-tertiary">LOSS</span>
                    <div className="w-8 h-8 rounded-full bg-surface-container-highest overflow-hidden">
                      <img className="w-full h-full object-cover" data-alt="Small team logo icon in high contrast orange and gray." src="https://lh3.googleusercontent.com/aida/ADBb0ujO9yJ1mf1lHIQtA4IQCj-ZKj5djUf_yDNzld5sL4dvz_uJBjYxegv9MgvIn5o-wxsIy_1TEmxwmx_jRIvneDWgDhvmeSxqBO-namYhpnkAjoxvWgBMXPC3wwrBciF4_W8ULBwr9-Uc9nnKI4ajbq45ZsdKT2gCc8JW1FSY3bxlumBglhuYxQLIZZXq_qY9Cuz9D3k55wy7StbZ7HgZM7PAcrbhTrSqvFRHcGQ14DtwYbHyq22E9wiHHBtC" />
                    </div>
                    <span className="font-body-md text-on-surface font-bold">vs Iron Titans</span>
                  </div>
                  <div className="text-right">
                    <span className="font-stats-numeric text-on-surface">05 - 09</span>
                    <p className="text-[10px] text-on-surface-variant uppercase">Oct 08, 2024</p>
                  </div>
                </div>
                <div className="flex items-center justify-between p-4 bg-surface-container-high rounded-lg">
                  <div className="flex items-center gap-4">
                    <span className="font-label-sm text-secondary">WIN</span>
                    <div className="w-8 h-8 rounded-full bg-surface-container-highest overflow-hidden">
                      <img className="w-full h-full object-cover" data-alt="Small team logo icon." src="https://lh3.googleusercontent.com/aida/ADBb0ujO9yJ1mf1lHIQtA4IQCj-ZKj5djUf_yDNzld5sL4dvz_uJBjYxegv9MgvIn5o-wxsIy_1TEmxwmx_jRIvneDWgDhvmeSxqBO-namYhpnkAjoxvWgBMXPC3wwrBciF4_W8ULBwr9-Uc9nnKI4ajbq45ZsdKT2gCc8JW1FSY3bxlumBglhuYxQLIZZXq_qY9Cuz9D3k55wy7StbZ7HgZM7PAcrbhTrSqvFRHcGQ14DtwYbHyq22E9wiHHBtC" />
                    </div>
                    <span className="font-body-md text-on-surface font-bold">vs Red Hawks</span>
                  </div>
                  <div className="text-right">
                    <span className="font-stats-numeric text-on-surface">15 - 14</span>
                    <p className="text-[10px] text-on-surface-variant uppercase">Oct 05, 2024</p>
                  </div>
                </div>
              </div>
            </div>
            <div className="bg-surface-container rounded-xl border border-outline-variant/30 p-lg relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-32 h-32 bg-secondary/5 -rotate-45 translate-x-12 -translate-y-12"></div>
              <div className="flex justify-between items-start mb-8">
                <div>
                  <span className="inline-flex items-center gap-2 px-3 py-1 bg-tertiary/10 text-tertiary rounded-full font-label-sm pulse-live">
                    <span className="w-2 h-2 rounded-full bg-tertiary"></span>
                    UPCOMING MATCH
                  </span>
                  <h3 className="font-display-xl text-headline-lg text-on-surface mt-4">Vipers vs Blitz</h3>
                </div>
                <div className="text-right">
                  <p className="font-label-sm text-on-surface-variant">STARTS IN</p>
                  <p className="font-stats-numeric text-headline-md text-secondary">02:14:55</p>
                </div>
              </div>
              <div className="flex items-center justify-center gap-12 py-8 border-y border-outline-variant/20">
                <div className="text-center space-y-2">
                  <div className="w-20 h-20 rounded-full border-2 border-secondary p-1 glow-secondary mx-auto">
                    <img className="w-full h-full object-cover rounded-full" data-alt="Team crest icon." src="https://lh3.googleusercontent.com/aida/ADBb0uhEOUBJNogjzQUu1-oNKuy7zI5APrQkXEfC3vFbzP_osrB3xvTkwzuKMso8UmyYZiXsHGD_GL4OvAOHRP4McjWfLcT32-kRZHLZvOnhsHqR2q2KXY4sQnzXIV3936tLmM9Gh8bHyOUXOV70s8hMUjj_oJy2eVTERu7qSkhe7moBw0hP3JtNTtCc9IbOa8J9DdDK7e2UL4llQfNASAFsQq9UA5SAxXfsswctdCxMNxuidGF3kACjkqfTmPpzPmapUvz12PO5dvM5DLA" />
                  </div>
                  <p className="font-label-sm text-on-surface font-bold">VIPERS</p>
                </div>
                <div className="text-display-xl text-outline-variant italic font-extrabold">VS</div>
                <div className="text-center space-y-2">
                  <div className="w-20 h-20 rounded-full border-2 border-tertiary p-1 mx-auto">
                    <img className="w-full h-full object-cover rounded-full" data-alt="Opposing team crest icon." src="https://lh3.googleusercontent.com/aida/ADBb0ujO9yJ1mf1lHIQtA4IQCj-ZKj5djUf_yDNzld5sL4dvz_uJBjYxegv9MgvIn5o-wxsIy_1TEmxwmx_jRIvneDWgDhvmeSxqBO-namYhpnkAjoxvWgBMXPC3wwrBciF4_W8ULBwr9-Uc9nnKI4ajbq45ZsdKT2gCc8JW1FSY3bxlumBglhuYxQLIZZXq_qY9Cuz9D3k55wy7StbZ7HgZM7PAcrbhTrSqvFRHcGQ14DtwYbHyq22E9wiHHBtC" />
                  </div>
                  <p className="font-label-sm text-on-surface font-bold">BLITZ</p>
                </div>
              </div>
              <button className="w-full mt-6 py-4 bg-surface-container-highest border border-tertiary text-tertiary font-bold rounded-lg hover:bg-tertiary hover:text-on-tertiary transition-all">
                Buy Tickets / Set Reminder
              </button>
            </div>
          </section>
        </div>
      </main>
      <footer className="w-full py-xl px-margin border-t border-outline-variant bg-surface-container-lowest">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-gutter max-w-7xl mx-auto">
          <div className="col-span-1 md:col-span-1">
            <span className="font-headline-md text-headline-md text-secondary block mb-4">Champion Hive</span>
            <p className="font-label-sm text-on-surface-variant">© 2024 Champion Hive. All rights reserved.</p>
          </div>
          <div>
            <h5 className="font-label-sm text-on-surface mb-4 uppercase">Platform</h5>
            <ul className="space-y-2">
              <li><a className="font-label-sm text-on-surface-variant hover:text-secondary transition-colors" href="#">Tournaments</a></li>
              <li><a className="font-label-sm text-on-surface-variant hover:text-secondary transition-colors" href="#">Standings</a></li>
              <li><a className="font-label-sm text-on-surface-variant hover:text-secondary transition-colors" href="#">Teams</a></li>
            </ul>
          </div>
          <div>
            <h5 className="font-label-sm text-on-surface mb-4 uppercase">Company</h5>
            <ul className="space-y-2">
              <li><a className="font-label-sm text-on-surface-variant hover:text-secondary transition-colors" href="#">Privacy Policy</a></li>
              <li><a className="font-label-sm text-on-surface-variant hover:text-secondary transition-colors" href="#">Terms of Service</a></li>
              <li><a className="font-label-sm text-on-surface-variant hover:text-secondary transition-colors" href="#">Contact Us</a></li>
            </ul>
          </div>
          <div>
            <h5 className="font-label-sm text-on-surface mb-4 uppercase">Partnerships</h5>
            <ul className="space-y-2">
              <li><a className="font-label-sm text-on-surface-variant hover:text-secondary transition-colors" href="#">Sponsorships</a></li>
              <li><a className="font-label-sm text-on-surface-variant hover:text-secondary transition-colors" href="#">Elite Program</a></li>
            </ul>
          </div>
        </div>
      </footer>
    </div>
  );
}
