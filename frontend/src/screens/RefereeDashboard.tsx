export default function RefereeDashboard() {
  return (
    <div className="bg-background text-on-background font-body-md overflow-x-hidden">
      <header className="bg-surface-container-high dark:bg-surface-container-high fixed top-0 w-full z-50 border-b border-outline-variant shadow-md flex justify-between items-center px-lg py-sm">
        <div className="flex items-center gap-md">
          <span className="text-headline-lg font-headline-lg font-bold text-secondary dark:text-secondary">Champion Hive</span>
        </div>
        <div className="flex items-center gap-sm">
          <button className="p-xs rounded-full hover:bg-surface-container-highest transition-colors active:scale-95 duration-150">
            <span className="material-symbols-outlined text-secondary">notifications</span>
          </button>
          <div className="flex items-center gap-xs ml-sm">
            <div className="w-8 h-8 rounded-full overflow-hidden border border-outline">
              <img alt="Referee avatar" className="w-full h-full object-cover" data-alt="A professional headshot of a sports official in a modern dark grey referee uniform. The lighting is crisp and cinematic, emphasizing a serious and authoritative expression. The background is a blurred stadium interior with neon green and dark navy tones consistent with high-stakes athletic environments." src="https://lh3.googleusercontent.com/aida/ADBb0ujO9yJ1mf1lHIQtA4IQCj-ZKj5djUf_yDNzld5sL4dvz_uJBjYxegv9MgvIn5o-wxsIy_1TEmxwmx_jRIvneDWgDhvmeSxqBO-namYhpnkAjoxvWgBMXPC3wwrBciF4_W8ULBwr9-Uc9nnKI4ajbq45ZsdKT2gCc8JW1FSY3bxlumBglhuYxQLIZZXq_qY9Cuz9D3k55wy7StbZ7HgZM7PAcrbhTrSqvFRHcGQ14DtwYbHyq22E9wiHHBtC" />
            </div>
            <span className="font-label-sm text-label-sm text-on-surface hidden md:block">Ref. Marcus Thorne</span>
          </div>
        </div>
      </header>
      <aside className="bg-surface-container-low dark:bg-surface-container-low fixed left-0 top-0 h-full w-64 z-40 hidden md:flex flex-col p-md space-y-xs pt-24">
        <div className="mb-lg">
          <div className="flex items-center gap-sm p-sm">
            <img className="w-12 h-12 rounded-lg object-cover" data-alt="A sharp, minimalist icon of a stadium whistle rendered in metallic silver and neon green highlights. The image is set against a deep navy blue background with subtle carbon fiber textures. The style is sleek, professional, and corporate-modern, reflecting high-end sports management." src="https://lh3.googleusercontent.com/aida/ADBb0uhEOUBJNogjzQUu1-oNKuy7zI5APrQkXEfC3vFbzP_osrB3xvTkwzuKMso8UmyYZiXsHGD_GL4OvAOHRP4McjWfLcT32-kRZHLZvOnhsHqR2q2KXY4sQnzXIV3936tLmM9Gh8bHyOUXOV70s8hMUjj_oJy2eVTERu7qSkhe7moBw0hP3JtNTtCc9IbOa8J9DdDK7e2UL4llQfNASAFsQq9UA5SAxXfsswctdCxMNxuidGF3kACjkqfTmPpzPmapUvz12PO5dvM5DLA" />
            <div>
              <h3 className="font-headline-md text-headline-md text-secondary leading-tight">Marcus Thorne</h3>
              <p className="font-label-sm text-label-sm text-on-surface-variant">Senior Official</p>
            </div>
          </div>
        </div>
        <nav className="flex-grow space-y-xs">
          <a className="flex items-center gap-sm p-sm text-on-surface-variant hover:bg-surface-container-highest transition-all duration-200 ease-in-out group" href="#">
            <span className="material-symbols-outlined group-hover:text-secondary">sports_score</span>
            <span className="font-label-sm text-label-sm">Live Console</span>
          </a>
          <a className="flex items-center gap-sm p-sm text-on-surface-variant hover:bg-surface-container-highest transition-all duration-200 ease-in-out group" href="#">
            <span className="material-symbols-outlined group-hover:text-secondary">calendar_today</span>
            <span className="font-label-sm text-label-sm">Schedule</span>
          </a>
          <a className="flex items-center gap-sm p-sm text-on-surface-variant hover:bg-surface-container-highest transition-all duration-200 ease-in-out group" href="#">
            <span className="material-symbols-outlined group-hover:text-secondary">description</span>
            <span className="font-label-sm text-label-sm">Reports</span>
          </a>
          <a className="bg-secondary-container text-on-secondary-container rounded-lg font-bold flex items-center gap-sm p-sm transition-all duration-200 ease-in-out" href="#">
            <span className="material-symbols-outlined">analytics</span>
            <span className="font-label-sm text-label-sm">Dashboard</span>
          </a>
        </nav>
        <button className="w-full bg-secondary text-on-secondary font-bold py-sm rounded-lg active:scale-95 transition-transform">
          Go Live
        </button>
      </aside>
      <main className="md:ml-64 pt-24 pb-24 px-md md:px-lg min-h-screen">
        <section className="mb-lg flex flex-col md:flex-row md:items-end justify-between gap-md">
          <div>
            <h1 className="font-display-xl text-display-xl text-on-surface">Official Profile</h1>
            <p className="text-on-surface-variant max-w-2xl mt-sm">Comprehensive performance analysis and activity log for senior official Marcus Thorne. Data updated in real-time based on league officiating standards.</p>
          </div>
          <div className="flex gap-sm">
            <div className="px-md py-sm bg-surface-container rounded-lg border border-outline-variant flex items-center gap-xs">
              <span className="material-symbols-outlined text-secondary" style={{ fontVariationSettings: "'FILL' 1" }}>verified_user</span>
              <span className="font-label-sm text-label-sm text-secondary">TIER 1 ACCREDITED</span>
            </div>
          </div>
        </section>
        <section className="grid grid-cols-1 md:grid-cols-4 gap-md mb-lg">
          <div className="stat-card-gradient p-lg rounded-xl border border-outline-variant border-accent-green flex flex-col justify-between h-40">
            <div className="flex justify-between items-start">
              <span className="text-on-surface-variant font-label-sm text-label-sm">Matches Officiated</span>
              <span className="material-symbols-outlined text-secondary">sports</span>
            </div>
            <div>
              <h2 className="text-display-xl font-stats-numeric text-on-surface">142</h2>
              <p className="text-secondary font-label-sm text-label-sm">+12 this season</p>
            </div>
          </div>
          <div className="stat-card-gradient p-lg rounded-xl border border-outline-variant border-accent-orange flex flex-col justify-between h-40">
            <div className="flex justify-between items-start">
              <span className="text-on-surface-variant font-label-sm text-label-sm">Avg. Cards / Game</span>
              <span className="material-symbols-outlined text-tertiary">style</span>
            </div>
            <div>
              <h2 className="text-display-xl font-stats-numeric text-on-surface">3.4</h2>
              <p className="text-on-surface-variant font-label-sm text-label-sm">League Avg: 4.1</p>
            </div>
          </div>
          <div className="stat-card-gradient p-lg rounded-xl border border-outline-variant border-accent-green flex flex-col justify-between h-40">
            <div className="flex justify-between items-start">
              <span className="text-on-surface-variant font-label-sm text-label-sm">Accuracy Rating</span>
              <span className="material-symbols-outlined text-secondary">target</span>
            </div>
            <div>
              <h2 className="text-display-xl font-stats-numeric text-on-surface">98.2%</h2>
              <p className="text-secondary font-label-sm text-label-sm">Top 5% Official</p>
            </div>
          </div>
          <div className="stat-card-gradient p-lg rounded-xl border border-outline-variant border-accent-green flex flex-col justify-between h-40">
            <div className="flex justify-between items-start">
              <span className="text-on-surface-variant font-label-sm text-label-sm">Feedback Score</span>
              <span className="material-symbols-outlined text-secondary">star</span>
            </div>
            <div>
              <h2 className="text-display-xl font-stats-numeric text-on-surface">4.9</h2>
              <p className="text-on-surface-variant font-label-sm text-label-sm">Based on 86 reviews</p>
            </div>
          </div>
        </section>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-lg">
          <section className="lg:col-span-2 bg-surface-container rounded-xl border border-outline-variant overflow-hidden">
            <div className="p-md border-b border-outline-variant flex justify-between items-center">
              <h3 className="font-headline-md text-headline-md text-on-surface">Recent Activity</h3>
              <button className="text-secondary font-label-sm text-label-sm flex items-center gap-xs">
                VIEW HISTORY <span className="material-symbols-outlined text-sm">arrow_forward</span>
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-surface-container-low text-on-surface-variant font-label-sm text-label-sm">
                    <th className="p-md uppercase tracking-wider">Date</th>
                    <th className="p-md uppercase tracking-wider">Matchup</th>
                    <th className="p-md uppercase tracking-wider">Status</th>
                    <th className="p-md uppercase tracking-wider text-right">Rating</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-outline-variant">
                  <tr className="hover:bg-surface-container-high transition-colors">
                    <td className="p-md font-stats-numeric text-on-surface">Oct 14</td>
                    <td className="p-md">
                      <div className="flex items-center gap-sm">
                        <div className="w-8 h-8 rounded bg-surface-container-highest flex items-center justify-center font-bold text-xs text-secondary">VT</div>
                        <div>
                          <p className="text-on-surface font-semibold">Vanguard Titans vs Neon Pulse</p>
                          <p className="text-on-surface-variant text-xs">Regional Quarter-Finals</p>
                        </div>
                      </div>
                    </td>
                    <td className="p-md">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold bg-secondary/10 text-secondary border border-secondary/20">
                        COMPLETED
                      </span>
                    </td>
                    <td className="p-md text-right font-stats-numeric text-secondary">5.0</td>
                  </tr>
                  <tr className="hover:bg-surface-container-high transition-colors">
                    <td className="p-md font-stats-numeric text-on-surface">Oct 12</td>
                    <td className="p-md">
                      <div className="flex items-center gap-sm">
                        <div className="w-8 h-8 rounded bg-surface-container-highest flex items-center justify-center font-bold text-xs text-tertiary">ST</div>
                        <div>
                          <p className="text-on-surface font-semibold">Storm Riders vs Iron Wolves</p>
                          <p className="text-on-surface-variant text-xs">Exhibition Match</p>
                        </div>
                      </div>
                    </td>
                    <td className="p-md">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold bg-secondary/10 text-secondary border border-secondary/20">
                        COMPLETED
                      </span>
                    </td>
                    <td className="p-md text-right font-stats-numeric text-secondary">4.8</td>
                  </tr>
                  <tr className="hover:bg-surface-container-high transition-colors">
                    <td className="p-md font-stats-numeric text-on-surface">Oct 10</td>
                    <td className="p-md">
                      <div className="flex items-center gap-sm">
                        <div className="w-8 h-8 rounded bg-surface-container-highest flex items-center justify-center font-bold text-xs text-secondary">DC</div>
                        <div>
                          <p className="text-on-surface font-semibold">Dune Crusaders vs Arctic Fox</p>
                          <p className="text-on-surface-variant text-xs">League Match #42</p>
                        </div>
                      </div>
                    </td>
                    <td className="p-md">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold bg-tertiary/10 text-tertiary border border-tertiary/20">
                        FLAGGED
                      </span>
                    </td>
                    <td className="p-md text-right font-stats-numeric text-tertiary">4.2</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>
          <section className="flex flex-col gap-md">
            <div className="bg-surface-container rounded-xl border border-outline-variant p-md">
              <h3 className="font-headline-md text-headline-md text-on-surface mb-md">Official Notifications</h3>
              <div className="space-y-md">
                <div className="p-sm bg-surface-container-low rounded-lg border-l-4 border-secondary">
                  <div className="flex justify-between items-start mb-xs">
                    <span className="font-bold text-on-surface">Schedule Update</span>
                    <span className="text-[10px] text-on-surface-variant">2H AGO</span>
                  </div>
                  <p className="text-sm text-on-surface-variant">Your assignment for the Oct 20 match has been moved to Arena 4. Please confirm availability.</p>
                  <button className="mt-sm text-secondary text-xs font-bold">CONFIRM NOW</button>
                </div>
                <div className="p-sm bg-surface-container-low rounded-lg border-l-4 border-tertiary">
                  <div className="flex justify-between items-start mb-xs">
                    <span className="font-bold text-on-surface">Rule Change Alert</span>
                    <span className="text-[10px] text-on-surface-variant">1D AGO</span>
                  </div>
                  <p className="text-sm text-on-surface-variant">Section 4.2 regarding technical fouls has been revised. Please review the updated officiating handbook.</p>
                  <button className="mt-sm text-tertiary text-xs font-bold">READ HANDBOOK</button>
                </div>
                <div className="p-sm bg-surface-container-low rounded-lg border-l-4 border-outline">
                  <div className="flex justify-between items-start mb-xs">
                    <span className="font-bold text-on-surface">Season Performance Review</span>
                    <span className="text-[10px] text-on-surface-variant">3D AGO</span>
                  </div>
                  <p className="text-sm text-on-surface-variant">Your Q3 performance metrics are now available for download. Great work on consistency!</p>
                </div>
              </div>
            </div>
            <div className="relative rounded-xl overflow-hidden h-48 border border-outline-variant group">
              <img className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" data-alt="A cinematic, high-contrast photograph of an empty, futuristic sports arena at night. The stadium is bathed in ethereal neon green and blue lighting, creating a high-energy, 'game-day' atmosphere. The camera angle is from the sidelines, looking across the pristine turf toward the glowing spectator stands under a dark, dramatic sky." src="https://lh3.googleusercontent.com/aida/ADBb0ugAslubqau1if-Y7ldh0EkOQy0DB96ef6kXXkQ3470IVP0Gepn5A7WdGmZFd22WhVaEvNxmFG6CGsSdebIi-BDS6sdQ2wKMjuxW8OSNXiqGxY9dvQRqnmmHYe6rbP5etCHFmemp9D1zRPBqKXrNaTZqWNJgsVfcTiPUkptifYp9LaFDmrvbVJk0Zcg-nt1zMaVQdSWYMXoIvp_PzX4-cuWUf-V1WJcDxe5a-R2WuWiRnmlFlkn2FOCI63qm" />
              <div className="absolute inset-0 bg-gradient-to-t from-surface-dim to-transparent flex flex-col justify-end p-md">
                <h4 className="font-headline-md text-headline-md text-on-surface">Advanced Ref Training</h4>
                <p className="text-on-surface-variant text-sm mb-xs">Join the Elite Officiating Workshop this December.</p>
                <a className="text-secondary font-bold text-xs uppercase tracking-widest" href="#">Enroll Now</a>
              </div>
            </div>
          </section>
        </div>
        <section className="mt-lg bg-surface-container rounded-xl border border-outline-variant p-lg">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-md mb-lg">
            <div>
              <h3 className="font-headline-md text-headline-md text-on-surface">Officiating Consistency Index</h3>
              <p className="text-on-surface-variant text-sm">Real-time performance tracking compared to league standards over the last 12 months.</p>
            </div>
            <div className="flex gap-xs bg-surface-container-low p-base rounded-lg border border-outline-variant">
              <button className="px-sm py-xs bg-secondary text-on-secondary text-xs font-bold rounded">12M</button>
              <button className="px-sm py-xs text-on-surface-variant text-xs font-bold rounded hover:bg-surface-container-highest">6M</button>
              <button className="px-sm py-xs text-on-surface-variant text-xs font-bold rounded hover:bg-surface-container-highest">3M</button>
            </div>
          </div>
          <div className="w-full h-64 bg-surface-container-lowest rounded-lg border border-outline-variant relative overflow-hidden">
            <div className="absolute inset-0 flex items-end px-md gap-xs">
              <div className="flex-grow bg-secondary/20 border-t-2 border-secondary rounded-t" style={{ height: '60%' }}></div>
              <div className="flex-grow bg-secondary/20 border-t-2 border-secondary rounded-t" style={{ height: '75%' }}></div>
              <div className="flex-grow bg-secondary/20 border-t-2 border-secondary rounded-t" style={{ height: '65%' }}></div>
              <div className="flex-grow bg-secondary/40 border-t-2 border-secondary rounded-t shadow-[0_0_15px_rgba(74,225,118,0.3)]" style={{ height: '90%' }}></div>
              <div className="flex-grow bg-secondary/20 border-t-2 border-secondary rounded-t" style={{ height: '82%' }}></div>
              <div className="flex-grow bg-secondary/20 border-t-2 border-secondary rounded-t" style={{ height: '70%' }}></div>
              <div className="flex-grow bg-secondary/20 border-t-2 border-secondary rounded-t" style={{ height: '78%' }}></div>
              <div className="flex-grow bg-secondary/20 border-t-2 border-secondary rounded-t" style={{ height: '85%' }}></div>
              <div className="flex-grow bg-secondary/20 border-t-2 border-secondary rounded-t" style={{ height: '72%' }}></div>
              <div className="flex-grow bg-secondary/20 border-t-2 border-secondary rounded-t" style={{ height: '60%' }}></div>
              <div className="flex-grow bg-secondary/20 border-t-2 border-secondary rounded-t" style={{ height: '88%' }}></div>
              <div className="flex-grow bg-secondary/50 border-t-2 border-secondary rounded-t shadow-[0_0_15px_rgba(74,225,118,0.5)]" style={{ height: '95%' }}></div>
            </div>
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(74,225,118,0.05),transparent_70%)]"></div>
          </div>
          <div className="grid grid-cols-3 md:grid-cols-6 mt-md gap-sm">
            <div className="flex items-center gap-xs">
              <span className="w-2 h-2 rounded-full bg-secondary"></span>
              <span className="text-xs text-on-surface-variant font-bold uppercase tracking-wider">Decision Rate</span>
            </div>
            <div className="flex items-center gap-xs">
              <span className="w-2 h-2 rounded-full bg-tertiary"></span>
              <span className="text-xs text-on-surface-variant font-bold uppercase tracking-wider">Card Ratio</span>
            </div>
            <div className="flex items-center gap-xs">
              <span className="w-2 h-2 rounded-full bg-outline"></span>
              <span className="text-xs text-on-surface-variant font-bold uppercase tracking-wider">League Baseline</span>
            </div>
          </div>
        </section>
      </main>
      <nav className="md:hidden fixed bottom-0 left-0 w-full flex justify-around items-center p-xs bg-surface-container-highest border-t border-outline-variant shadow-lg z-50 rounded-t-xl">
        <a className="flex flex-col items-center justify-center text-on-surface-variant hover:text-secondary active:scale-90 duration-200" href="#">
          <span className="material-symbols-outlined">sports</span>
          <span className="font-label-sm text-label-sm">Console</span>
        </a>
        <a className="flex flex-col items-center justify-center text-on-surface-variant hover:text-secondary active:scale-90 duration-200" href="#">
          <span className="material-symbols-outlined">event_note</span>
          <span className="font-label-sm text-label-sm">Matches</span>
        </a>
        <a className="flex flex-col items-center justify-center text-on-surface-variant hover:text-secondary active:scale-90 duration-200" href="#">
          <span className="material-symbols-outlined">history_edu</span>
          <span className="font-label-sm text-label-sm">Reports</span>
        </a>
        <a className="flex flex-col items-center justify-center bg-secondary text-on-secondary rounded-xl px-4 py-1 active:scale-90 duration-200" href="#">
          <span className="material-symbols-outlined">query_stats</span>
          <span className="font-label-sm text-label-sm font-bold">Stats</span>
        </a>
      </nav>
    </div>
  );
}
