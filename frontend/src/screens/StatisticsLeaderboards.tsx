export default function StatisticsLeaderboards({ data }: { data?: any }) {
  const standings = data?.standingsFlat ?? [];
  const stats = data?.stats ?? null;

  if (!standings.length) {
    return (
    <body className="bg-background text-on-surface font-body-md">
      <header className="fixed top-0 w-full z-50 border-b border-outline-variant/30 bg-surface/95 backdrop-blur-md shadow-sm">
        <div className="flex justify-between items-center h-20 px-margin max-w-screen-2xl mx-auto">
          <div className="flex items-center gap-xs">
            <span className="font-headline-lg text-headline-lg font-bold text-secondary italic tracking-tighter">Champion Hive</span>
          </div>
          <nav className="hidden md:flex items-center gap-lg">
            <a className="text-on-surface-variant hover:text-secondary transition-colors font-body-md" href="#">Tournaments</a>
            <a className="text-secondary font-bold border-b-2 border-secondary pb-1 font-body-md" href="#">Standings</a>
            <a className="text-on-surface-variant hover:text-secondary transition-colors font-body-md" href="#">Teams</a>
            <a className="text-on-surface-variant hover:text-secondary transition-colors font-body-md" href="#">Players</a>
          </nav>
          <div className="flex items-center gap-md">
            <button className="text-on-surface-variant font-label-sm uppercase tracking-wider hover:text-secondary transition-colors">Login</button>
            <button className="bg-secondary text-on-secondary font-headline-md text-[14px] px-lg py-xs rounded hover:brightness-110 active:scale-95 transition-all border-b-2 border-on-secondary-container">Join League</button>
          </div>
        </div>
      </header>
      <main className="pt-32 pb-xl px-margin max-w-screen-2xl mx-auto space-y-xl">
        <section className="grid grid-cols-1 lg:grid-cols-12 gap-gutter">
          <div className="lg:col-span-8">
            <div className="flex items-center justify-between mb-lg">
              <h1 className="font-display-xl text-display-xl text-on-surface">League MVP Race</h1>
              <div className="flex items-center gap-sm bg-surface-container rounded-full px-md py-xs border border-outline-variant/30">
                <span className="material-symbols-outlined text-secondary" style={{ fontVariationSettings: "'FILL' 1" }}>stars</span>
                <span className="font-label-sm text-secondary uppercase">Premium Stats View</span>
              </div>
            </div>
            <div className="relative overflow-hidden rounded-xl border border-secondary/30 stats-gradient p-xl">
              <div className="absolute top-0 right-0 p-lg">
                <span className="font-display-xl text-[120px] text-secondary/5 font-black italic">01</span>
              </div>
              <div className="flex flex-col md:flex-row gap-xl relative z-10">
                <div className="w-full md:w-1/2 aspect-square rounded-xl overflow-hidden border-2 border-secondary active-pulse">
                  <img alt="" className="w-full h-full object-cover" data-alt="A cinematic, high-contrast studio portrait of a professional athlete looking intense and focused against a dark, moody background. The lighting is dramatic, highlighting the contours of the face and athletic build with sharp neon green rim lights. The atmosphere is prestigious and authoritative, representing the league's top-performing MVP candidate in a modern, sports-centric visual style." src="https://lh3.googleusercontent.com/aida/ADBb0ugAslubqau1if-Y7ldh0EkOQy0DB96ef6kXXkQ3470IVP0Gepn5A7WdGmZFd22WhVaEvNxmFG6CGsSdebIi-BDS6sdQ2wKMjuxW8OSNXiqGxY9dvQRqnmmHYe6rbP5etCHFmemp9D1zRPBqKXrNaTZqWNJgsVfcTiPUkptifYp9LaFDmrvbVJk0Zcg-nt1zMaVQdSWYMXoIvp_PzX4-cuWUf-V1WJcDxe5a-R2WuWiRnmlFlkn2FOCI63qm" />
                </div>
                <div className="w-full md:w-1/2 flex flex-col justify-center">
                  <span className="text-secondary font-label-sm uppercase tracking-[0.2em] mb-xs">Current Leader</span>
                  <h2 className="font-headline-lg text-headline-lg text-on-surface mb-md">Marcus 'Viper' Thorne</h2>
                  <div className="grid grid-cols-2 gap-md mb-lg">
                    <div className="bg-surface-container-high p-md rounded-lg border border-outline-variant/20">
                      <p className="text-on-surface-variant font-label-sm uppercase">MVP Points</p>
                      <p className="font-stats-numeric text-display-xl text-secondary">2,840</p>
                    </div>
                    <div className="bg-surface-container-high p-md rounded-lg border border-outline-variant/20">
                      <p className="text-on-surface-variant font-label-sm uppercase">Win Rate</p>
                      <p className="font-stats-numeric text-display-xl text-tertiary">84%</p>
                    </div>
                  </div>
                  <div className="flex gap-sm">
                    <div className="flex -space-x-3">
                      <div className="w-10 h-10 rounded-full border-2 border-surface overflow-hidden">
                        <img alt="" className="w-full h-full object-cover" src="https://lh3.googleusercontent.com/aida/ADBb0ujiyZTtEyuJw5dUzrZG_h0Gh05bJMaJU52DnY2Axa5RdR_AaeQ0hQgE4TZ9GiruoMU8aMdteDTPqD7fQYpS-RS2zYsSUT5kc_NxFWc2lKLWDpL_yjsESNxQGsGlCxH9GxeNY3V8yo5clI3vK9K7kMB8NbD7VZbRigqX-IFG_uPOwkje9_Rym8EaCMSR2Mkj0Ce_CKo9OzMMpwXOmHQzgexPJkle26gSvtHnqguOm9FCLXcojYi0t3MfJ4g8" />
                      </div>
                      <div className="w-10 h-10 rounded-full border-2 border-surface bg-secondary flex items-center justify-center">
                        <span className="material-symbols-outlined text-on-secondary text-sm" style={{ fontVariationSettings: "'FILL' 1" }}>shield</span>
                      </div>
                    </div>
                    <span className="font-body-md text-on-surface-variant self-center">Apex Predators • Captain</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div className="lg:col-span-4 flex flex-col gap-gutter">
            <h3 className="font-headline-md text-headline-md text-on-surface px-xs">Top Contenders</h3>
            <div className="space-y-sm">
              <div className="bg-surface-container hover:bg-surface-container-high transition-all p-md rounded-lg border border-outline-variant/30 flex items-center gap-md">
                <span className="font-stats-numeric text-on-surface-variant w-6">02</span>
                <img className="w-12 h-12 rounded-full object-cover border border-tertiary" data-alt="A professional close-up headshot of a competitive athlete for a sports leaderboard. The lighting is crisp and modern with warm orange accents reflecting the tertiary brand color. The subject has an expression of calm confidence, shot against a dark slate background to maintain the premium corporate-sports aesthetic." src="https://lh3.googleusercontent.com/aida/ADBb0uhEOUBJNogjzQUu1-oNKuy7zI5APrQkXEfC3vFbzP_osrB3xvTkwzuKMso8UmyYZiXsHGD_GL4OvAOHRP4McjWfLcT32-kRZHLZvOnhsHqR2q2KXY4sQnzXIV3936tLmM9Gh8bHyOUXOV70s8hMUjj_oJy2eVTERu7qSkhe7moBw0hP3JtNTtCc9IbOa8J9DdDK7e2UL4llQfNASAFsQq9UA5SAxXfsswctdCxMNxuidGF3kACjkqfTmPpzPmapUvz12PO5dvM5DLA" />
                <div className="flex-grow">
                  <p className="font-headline-md text-[16px] text-on-surface">Elena Rodriguez</p>
                  <p className="font-label-sm text-on-surface-variant">2,710 PTS</p>
                </div>
                <span className="material-symbols-outlined text-tertiary">trending_up</span>
              </div>
              <div className="bg-surface-container hover:bg-surface-container-high transition-all p-md rounded-lg border border-outline-variant/30 flex items-center gap-md">
                <span className="font-stats-numeric text-on-surface-variant w-6">03</span>
                <img className="w-12 h-12 rounded-full object-cover border border-outline-variant" data-alt="A professional sports profile portrait of a player in a sleek team jersey. The background is a deep navy with subtle geometric patterns. Lighting is sharp and professional, focused on the athlete's determined expression, aligned with high-end sports management branding and high-contrast visuals." src="https://lh3.googleusercontent.com/aida/ADBb0uhXHOsDYIg8Ce-sVc08yTmMfkdyY0VE_YZDjIYZQpF3TwInIyGMSxcg4FbaoZ8I2FoWhkmP2KklaMAlHm6jfu0kdKUgOoUgHIa67ZUQNS_xRY6ACqkVdcLeZ9c3FFtyIQpgGVJtbEAIFh6F9PmgrCufvrrzGCeVPfvJmKv7Us3hxvTBWIHOCZk-60mZ_9_cpHWNyO-hLPZRRshCii3wPq_qL2HjdNGb75ayXLrCIOZlu2Bd_PjYB_Uil4Q" />
                <div className="flex-grow">
                  <p className="font-headline-md text-[16px] text-on-surface">Jackson 'Pulse' Wu</p>
                  <p className="font-label-sm text-on-surface-variant">2,655 PTS</p>
                </div>
                <span className="material-symbols-outlined text-error">trending_down</span>
              </div>
              <div className="bg-surface-container hover:bg-surface-container-high transition-all p-md rounded-lg border border-outline-variant/30 flex items-center gap-md">
                <span className="font-stats-numeric text-on-surface-variant w-6">04</span>
                <img className="w-12 h-12 rounded-full object-cover border border-outline-variant" data-alt="Close-up profile of a female professional athlete, with focused eyes and a sleek athletic aesthetic. The image uses professional stadium-style lighting with cold blue and sharp white highlights. The composition is clean and centered, suitable for a premium leaderboard interface with dark-mode styling." src="https://lh3.googleusercontent.com/aida/ADBb0ujlA1I4-0eqo5nUdBuHbXtCvmJQbRK4FbJ72DYUxHAE-xXo0KYtMsNJKBakYbrpyAB9o0ejxHvl0Z6SUP4-cjjDHwGye4gJaLBuOLQ2Em5qUFZJlb1_Jp12v2zrkoOa5A6csX4cMYPaOaXPhX5XrWmTQB5HjlJzx8KwRs8JAvbXHx-Udq7xQJVVU56m3m5Y8xIekDyV6UU4M6dDufyWWaEDxsSuUvl8txYqCxbwdoLJXWNlOoLPpPi1XNDK" />
                <div className="flex-grow">
                  <p className="font-headline-md text-[16px] text-on-surface">Sarah Jenkins</p>
                  <p className="font-label-sm text-on-surface-variant">2,490 PTS</p>
                </div>
                <span className="material-symbols-outlined text-secondary">horizontal_rule</span>
              </div>
              <div className="bg-surface-container hover:bg-surface-container-high transition-all p-md rounded-lg border border-outline-variant/30 flex items-center gap-md">
                <span className="font-stats-numeric text-on-surface-variant w-6">05</span>
                <img className="w-12 h-12 rounded-full object-cover border border-outline-variant" data-alt="Cinematic sports photography of a player in action-ready pose, focused and determined. The shot features high-contrast lighting typical of a night game under stadium floodlights, with deep shadows and vibrant neon green highlights that match the corporate-modern design system's accent colors." src="https://lh3.googleusercontent.com/aida/ADBb0uj3VEmv-u5gTRcItaE2tuQDzN7zqY6I5T_Wz91wUL5TpxhCC4KCYdmgiFQXKy0qFU-_qhxIVs-OMI5AJl6VjdVN4A0u6KVCFIUDkRrC8BQmCH307GRMGK0ElYkBYULMMuxbJCq1j4pbybkecBKOhRu0PHPbN-AYAHfBipkG3xZ9OdoOaT-ncgGo4ocrpvoukXYETcqH7qpAL_LqM0UkSW5sMpuY3yiimXZF1nAJ8qU5sAXZrbM_gXakWMk" />
                <div className="flex-grow">
                  <p className="font-headline-md text-[16px] text-on-surface">David Chen</p>
                  <p className="font-label-sm text-on-surface-variant">2,320 PTS</p>
                </div>
                <span className="material-symbols-outlined text-secondary">trending_up</span>
              </div>
            </div>
            <button className="w-full py-md border border-outline-variant/50 rounded-lg font-label-sm text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface transition-all">VIEW FULL MVP RANKINGS</button>
          </div>
        </section>
        <section className="grid grid-cols-1 lg:grid-cols-2 gap-gutter">
          <div className="bg-surface-container rounded-xl border border-outline-variant/30 overflow-hidden">
            <div className="p-lg border-b border-outline-variant/30 flex justify-between items-center">
              <div>
                <h3 className="font-headline-md text-headline-md text-on-surface">Top Scorers</h3>
                <p className="text-on-surface-variant font-label-sm">Regular Season Leaderboard</p>
              </div>
              <button className="bg-surface-container-high p-xs rounded hover:bg-outline-variant/20">
                <span className="material-symbols-outlined">filter_list</span>
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-surface-container-low text-on-surface-variant border-b border-outline-variant/30">
                    <th className="px-lg py-md font-label-sm uppercase">Player</th>
                    <th className="px-lg py-md font-label-sm uppercase">Games</th>
                    <th className="px-lg py-md font-label-sm uppercase">Points</th>
                    <th className="px-lg py-md font-label-sm uppercase text-right">Avg</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-outline-variant/10">
                  <tr className="hover:bg-surface-container-high transition-colors">
                    <td className="px-lg py-md">
                      <div className="flex items-center gap-md">
                        <div className="w-8 h-8 rounded bg-secondary-container/20 flex items-center justify-center text-secondary font-bold text-[12px]">MT</div>
                        <span className="font-body-md font-semibold">Marcus Thorne</span>
                      </div>
                    </td>
                    <td className="px-lg py-md font-stats-numeric">18</td>
                    <td className="px-lg py-md font-stats-numeric">462</td>
                    <td className="px-lg py-md font-stats-numeric text-secondary text-right">25.7</td>
                  </tr>
                  <tr className="hover:bg-surface-container-high transition-colors">
                    <td className="px-lg py-md">
                      <div className="flex items-center gap-md">
                        <div className="w-8 h-8 rounded bg-tertiary-container/20 flex items-center justify-center text-tertiary font-bold text-[12px]">ER</div>
                        <span className="font-body-md font-semibold">Elena Rodriguez</span>
                      </div>
                    </td>
                    <td className="px-lg py-md font-stats-numeric">19</td>
                    <td className="px-lg py-md font-stats-numeric">448</td>
                    <td className="px-lg py-md font-stats-numeric text-secondary text-right">23.6</td>
                  </tr>
                  <tr className="hover:bg-surface-container-high transition-colors">
                    <td className="px-lg py-md">
                      <div className="flex items-center gap-md">
                        <div className="w-8 h-8 rounded bg-surface-container-highest flex items-center justify-center text-on-surface-variant font-bold text-[12px]">JW</div>
                        <span className="font-body-md font-semibold">Jackson Wu</span>
                      </div>
                    </td>
                    <td className="px-lg py-md font-stats-numeric">17</td>
                    <td className="px-lg py-md font-stats-numeric">391</td>
                    <td className="px-lg py-md font-stats-numeric text-secondary text-right">23.0</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-gutter">
            <div className="bg-surface-container rounded-xl border border-outline-variant/30 p-lg relative overflow-hidden group">
              <div className="absolute top-0 right-0 p-lg">
                <span className="material-symbols-outlined text-secondary text-4xl opacity-20 group-hover:opacity-40 transition-opacity">shield</span>
              </div>
              <h3 className="font-headline-md text-headline-md text-on-surface mb-md">Best Defense</h3>
              <div className="space-y-lg mt-md">
                <div>
                  <div className="flex justify-between mb-xs">
                    <span className="font-body-md text-on-surface">Iron Gate United</span>
                    <span className="font-stats-numeric text-secondary">0.82 PAPG</span>
                  </div>
                  <div className="w-full bg-surface-container-highest h-2 rounded-full overflow-hidden">
                    <div className="bg-secondary h-full rounded-full" style={{ width: '92%' }}></div>
                  </div>
                </div>
                <div>
                  <div className="flex justify-between mb-xs">
                    <span className="font-body-md text-on-surface">Titan Legion</span>
                    <span className="font-stats-numeric text-secondary">0.94 PAPG</span>
                  </div>
                  <div className="w-full bg-surface-container-highest h-2 rounded-full overflow-hidden">
                    <div className="bg-secondary h-full rounded-full" style={{ width: '84%' }}></div>
                  </div>
                </div>
                <div>
                  <div className="flex justify-between mb-xs">
                    <span className="font-body-md text-on-surface">Shadow Squad</span>
                    <span className="font-stats-numeric text-secondary">1.05 PAPG</span>
                  </div>
                  <div className="w-full bg-surface-container-highest h-2 rounded-full overflow-hidden">
                    <div className="bg-secondary h-full rounded-full" style={{ width: '78%' }}></div>
                  </div>
                </div>
              </div>
              <p className="mt-xl text-[10px] text-on-surface-variant font-label-sm uppercase tracking-widest">Points Allowed Per Game</p>
            </div>
            <div className="bg-surface-container rounded-xl border border-outline-variant/30 p-lg">
              <h3 className="font-headline-md text-headline-md text-on-surface mb-md">Efficiency Mix</h3>
              <div className="relative h-48 flex items-end justify-between gap-sm pt-xl">
                <div className="flex flex-col items-center gap-xs w-full">
                  <div className="bg-tertiary w-full rounded-t" style={{ height: '60%' }}></div>
                  <span className="text-[10px] font-label-sm text-on-surface-variant">AST</span>
                </div>
                <div className="flex flex-col items-center gap-xs w-full">
                  <div className="bg-secondary w-full rounded-t" style={{ height: '85%' }}></div>
                  <span className="text-[10px] font-label-sm text-on-surface-variant">REB</span>
                </div>
                <div className="flex flex-col items-center gap-xs w-full">
                  <div className="bg-tertiary w-full rounded-t" style={{ height: '45%' }}></div>
                  <span className="text-[10px] font-label-sm text-on-surface-variant">STL</span>
                </div>
                <div className="flex flex-col items-center gap-xs w-full">
                  <div className="bg-secondary w-full rounded-t" style={{ height: '70%' }}></div>
                  <span className="text-[10px] font-label-sm text-on-surface-variant">BLK</span>
                </div>
              </div>
              <div className="mt-lg pt-md border-t border-outline-variant/20 flex gap-md">
                <div className="flex items-center gap-xs">
                  <span className="w-2 h-2 rounded-full bg-secondary"></span>
                  <span className="text-[11px] font-label-sm text-on-surface-variant">Offensive</span>
                </div>
                <div className="flex items-center gap-xs">
                  <span className="w-2 h-2 rounded-full bg-tertiary"></span>
                  <span className="text-[11px] font-label-sm text-on-surface-variant">Defensive</span>
                </div>
              </div>
            </div>
          </div>
        </section>
        <section>
          <div className="flex items-center justify-between mb-lg">
            <h3 className="font-headline-md text-headline-md text-on-surface">Team Efficiency Overview</h3>
            <div className="flex gap-xs">
              <button className="bg-secondary text-on-secondary px-md py-xs rounded font-label-sm border-b-2 border-on-secondary-container">Weekly</button>
              <button className="bg-surface-container px-md py-xs rounded font-label-sm text-on-surface-variant hover:text-on-surface">Season</button>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-gutter">
            <div className="bg-surface-container rounded-xl border border-outline-variant/30 p-lg hover:border-secondary transition-colors cursor-pointer group">
              <div className="flex items-center gap-md mb-md">
                <div className="w-12 h-12 rounded-lg bg-surface-container-high border border-outline-variant/50 p-2 group-hover:scale-110 transition-transform">
                  <img alt="" className="w-full h-full object-contain" src="https://lh3.googleusercontent.com/aida/ADBb0ujO9yJ1mf1lHIQtA4IQCj-ZKj5djUf_yDNzld5sL4dvz_uJBjYxegv9MgvIn5o-wxsIy_1TEmxwmx_jRIvneDWgDhvmeSxqBO-namYhpnkAjoxvWgBMXPC3wwrBciF4_W8ULBwr9-Uc9nnKI4ajbq45ZsdKT2gCc8JW1FSY3bxlumBglhuYxQLIZZXq_qY9Cuz9D3k55wy7StbZ7HgZM7PAcrbhTrSqvFRHcGQ14DtwYbHyq22E9wiHHBtC" />
                </div>
                <div>
                  <p className="font-headline-md text-[18px] text-on-surface">Shadow Kings</p>
                  <p className="font-label-sm text-secondary uppercase">League Leader</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-sm">
                <div className="bg-surface-container-low p-sm rounded">
                  <p className="text-[10px] font-label-sm text-on-surface-variant uppercase">Efficiency</p>
                  <p className="font-stats-numeric text-on-surface">112.4</p>
                </div>
                <div className="bg-surface-container-low p-sm rounded">
                  <p className="text-[10px] font-label-sm text-on-surface-variant uppercase">Pace</p>
                  <p className="font-stats-numeric text-on-surface">98.2</p>
                </div>
              </div>
            </div>
            <div className="bg-surface-container rounded-xl border border-outline-variant/30 p-lg hover:border-tertiary transition-colors cursor-pointer group">
              <div className="flex items-center gap-md mb-md">
                <div className="w-12 h-12 rounded-lg bg-surface-container-high border border-outline-variant/50 p-2 group-hover:scale-110 transition-transform">
                  <div className="w-full h-full bg-tertiary/20 rounded flex items-center justify-center text-tertiary">
                    <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>bolt</span>
                  </div>
                </div>
                <div>
                  <p className="font-headline-md text-[18px] text-on-surface">Neon Storm</p>
                  <p className="font-label-sm text-tertiary uppercase">Rising Star</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-sm">
                <div className="bg-surface-container-low p-sm rounded">
                  <p className="text-[10px] font-label-sm text-on-surface-variant uppercase">Efficiency</p>
                  <p className="font-stats-numeric text-on-surface">108.9</p>
                </div>
                <div className="bg-surface-container-low p-sm rounded">
                  <p className="text-[10px] font-label-sm text-on-surface-variant uppercase">Pace</p>
                  <p className="font-stats-numeric text-on-surface">104.5</p>
                </div>
              </div>
            </div>
            <div className="bg-surface-container rounded-xl border border-outline-variant/30 p-lg hover:border-secondary transition-colors cursor-pointer group">
              <div className="flex items-center gap-md mb-md">
                <div className="w-12 h-12 rounded-lg bg-surface-container-high border border-outline-variant/50 p-2 group-hover:scale-110 transition-transform">
                  <div className="w-full h-full bg-secondary/20 rounded flex items-center justify-center text-secondary">
                    <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>shield_with_heart</span>
                  </div>
                </div>
                <div>
                  <p className="font-headline-md text-[18px] text-on-surface">Iron Guard</p>
                  <p className="font-label-sm text-on-surface-variant uppercase">Steady Core</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-sm">
                <div className="bg-surface-container-low p-sm rounded">
                  <p className="text-[10px] font-label-sm text-on-surface-variant uppercase">Efficiency</p>
                  <p className="font-stats-numeric text-on-surface">105.2</p>
                </div>
                <div className="bg-surface-container-low p-sm rounded">
                  <p className="text-[10px] font-label-sm text-on-surface-variant uppercase">Pace</p>
                  <p className="font-stats-numeric text-on-surface">92.1</p>
                </div>
              </div>
            </div>
            <div className="bg-surface-container rounded-xl border border-outline-variant/30 p-lg hover:border-secondary transition-colors cursor-pointer group">
              <div className="flex items-center gap-md mb-md">
                <div className="w-12 h-12 rounded-lg bg-surface-container-high border border-outline-variant/50 p-2 group-hover:scale-110 transition-transform">
                  <div className="w-full h-full bg-on-surface-variant/20 rounded flex items-center justify-center text-on-surface-variant">
                    <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>groups</span>
                  </div>
                </div>
                <div>
                  <p className="font-headline-md text-[18px] text-on-surface">Rogue One</p>
                  <p className="font-label-sm text-on-surface-variant uppercase">Mid Tier</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-sm">
                <div className="bg-surface-container-low p-sm rounded">
                  <p className="text-[10px] font-label-sm text-on-surface-variant uppercase">Efficiency</p>
                  <p className="font-stats-numeric text-on-surface">102.7</p>
                </div>
                <div className="bg-surface-container-low p-sm rounded">
                  <p className="text-[10px] font-label-sm text-on-surface-variant uppercase">Pace</p>
                  <p className="font-stats-numeric text-on-surface">95.8</p>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>
      <footer className="w-full py-xl px-margin border-t border-outline-variant bg-surface-container-lowest">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-gutter max-w-7xl mx-auto">
          <div className="md:col-span-1">
            <span className="font-headline-md text-headline-md text-secondary block mb-md">Champion Hive</span>
            <p className="text-on-surface-variant font-label-sm leading-relaxed mb-md">Precision analytics for the modern athlete. Elevating performance through data-driven insights and premium competitive management.</p>
            <div className="flex gap-md">
              <span className="material-symbols-outlined text-on-surface-variant hover:text-secondary cursor-pointer">public</span>
              <span className="material-symbols-outlined text-on-surface-variant hover:text-secondary cursor-pointer">rss_feed</span>
              <span className="material-symbols-outlined text-on-surface-variant hover:text-secondary cursor-pointer">mail</span>
            </div>
          </div>
          <div>
            <h4 className="text-on-surface font-headline-md text-[16px] mb-md">Platform</h4>
            <ul className="space-y-sm">
              <li><a className="text-on-surface-variant hover:text-secondary font-label-sm transition-colors" href="#">Tournaments</a></li>
              <li><a className="text-on-surface-variant hover:text-secondary font-label-sm transition-colors" href="#">League Standings</a></li>
              <li><a className="text-on-surface-variant hover:text-secondary font-label-sm transition-colors" href="#">Player Scout</a></li>
              <li><a className="text-on-surface-variant hover:text-secondary font-label-sm transition-colors" href="#">Team Matrix</a></li>
            </ul>
          </div>
          <div>
            <h4 className="text-on-surface font-headline-md text-[16px] mb-md">Resources</h4>
            <ul className="space-y-sm">
              <li><a className="text-on-surface-variant hover:text-secondary font-label-sm transition-colors" href="#">Support Center</a></li>
              <li><a className="text-on-surface-variant hover:text-secondary font-label-sm transition-colors" href="#">API Documentation</a></li>
              <li><a className="text-on-surface-variant hover:text-secondary font-label-sm transition-colors" href="#">Brand Assets</a></li>
              <li><a className="text-on-surface-variant hover:text-secondary font-label-sm transition-colors" href="#">Sponsorships</a></li>
            </ul>
          </div>
          <div>
            <h4 className="text-on-surface font-headline-md text-[16px] mb-md">Legal</h4>
            <ul className="space-y-sm">
              <li><a className="text-on-surface-variant hover:text-secondary font-label-sm transition-colors" href="#">Privacy Policy</a></li>
              <li><a className="text-on-surface-variant hover:text-secondary font-label-sm transition-colors" href="#">Terms of Service</a></li>
              <li><a className="text-on-surface-variant hover:text-secondary font-label-sm transition-colors" href="#">Data Processing</a></li>
              <li><p className="text-on-surface-variant/50 font-label-sm mt-lg">© 2024 Champion Hive. All rights reserved.</p></li>
            </ul>
          </div>
        </div>
      </footer>
    </body>
    );
  }

  const leader = standings[0] ?? {};
  const leaderPlayed = Number(leader?.matches_played) || 0;
  const leaderWins = Number(leader?.wins) || 0;
  const leaderWinRate = leaderPlayed > 0 ? Math.round((leaderWins / leaderPlayed) * 100) : 0;
  const contenders = standings.slice(1, 5);
  const trendIcons = ['trending_up', 'trending_down', 'horizontal_rule', 'trending_up'];
  const trendColors = ['text-tertiary', 'text-error', 'text-secondary', 'text-secondary'];
  const bestDefense = [...standings]
    .sort((a: any, b: any) => (Number(a?.points_conceded) || 0) - (Number(b?.points_conceded) || 0))
    .slice(0, 3);
  const maxConceded = Math.max(1, ...bestDefense.map((r: any) => Number(r?.points_conceded) || 0));
  const efficiencyTeams = standings.slice(0, 4);
  const efficiencyTags = ['League Leader', 'Rising Star', 'Steady Core', 'Mid Tier'];
  const initials = (name?: string) =>
    (name ?? '')
      .split(' ')
      .map((w: string) => w[0])
      .filter(Boolean)
      .slice(0, 2)
      .join('')
      .toUpperCase();

  return (
    <body className="bg-background text-on-surface font-body-md">
      <header className="fixed top-0 w-full z-50 border-b border-outline-variant/30 bg-surface/95 backdrop-blur-md shadow-sm">
        <div className="flex justify-between items-center h-20 px-margin max-w-screen-2xl mx-auto">
          <div className="flex items-center gap-xs">
            <span className="font-headline-lg text-headline-lg font-bold text-secondary italic tracking-tighter">Champion Hive</span>
          </div>
          <nav className="hidden md:flex items-center gap-lg">
            <a className="text-on-surface-variant hover:text-secondary transition-colors font-body-md" href="#">Tournaments</a>
            <a className="text-secondary font-bold border-b-2 border-secondary pb-1 font-body-md" href="#">Standings</a>
            <a className="text-on-surface-variant hover:text-secondary transition-colors font-body-md" href="#">Teams</a>
            <a className="text-on-surface-variant hover:text-secondary transition-colors font-body-md" href="#">Players</a>
          </nav>
          <div className="flex items-center gap-md">
            <button className="text-on-surface-variant font-label-sm uppercase tracking-wider hover:text-secondary transition-colors">Login</button>
            <button className="bg-secondary text-on-secondary font-headline-md text-[14px] px-lg py-xs rounded hover:brightness-110 active:scale-95 transition-all border-b-2 border-on-secondary-container">Join League</button>
          </div>
        </div>
      </header>
      <main className="pt-32 pb-xl px-margin max-w-screen-2xl mx-auto space-y-xl">
        <section className="grid grid-cols-1 lg:grid-cols-12 gap-gutter">
          <div className="lg:col-span-8">
            <div className="flex items-center justify-between mb-lg">
              <h1 className="font-display-xl text-display-xl text-on-surface">{data?.tournament?.name ?? 'League Standings'}</h1>
              <div className="flex items-center gap-sm bg-surface-container rounded-full px-md py-xs border border-outline-variant/30">
                <span className="material-symbols-outlined text-secondary" style={{ fontVariationSettings: "'FILL' 1" }}>stars</span>
                <span className="font-label-sm text-secondary uppercase">Premium Stats View</span>
              </div>
            </div>
            <div className="relative overflow-hidden rounded-xl border border-secondary/30 stats-gradient p-xl">
              <div className="absolute top-0 right-0 p-lg">
                <span className="font-display-xl text-[120px] text-secondary/5 font-black italic">01</span>
              </div>
              <div className="flex flex-col md:flex-row gap-xl relative z-10">
                <div className="w-full md:w-1/2 aspect-square rounded-xl overflow-hidden border-2 border-secondary active-pulse">
                  <img alt="" className="w-full h-full object-cover" data-alt="A cinematic, high-contrast studio portrait of a professional athlete looking intense and focused against a dark, moody background. The lighting is dramatic, highlighting the contours of the face and athletic build with sharp neon green rim lights. The atmosphere is prestigious and authoritative, representing the league's top-performing MVP candidate in a modern, sports-centric visual style." src="https://lh3.googleusercontent.com/aida/ADBb0ugAslubqau1if-Y7ldh0EkOQy0DB96ef6kXXkQ3470IVP0Gepn5A7WdGmZFd22WhVaEvNxmFG6CGsSdebIi-BDS6sdQ2wKMjuxW8OSNXiqGxY9dvQRqnmmHYe6rbP5etCHFmemp9D1zRPBqKXrNaTZqWNJgsVfcTiPUkptifYp9LaFDmrvbVJk0Zcg-nt1zMaVQdSWYMXoIvp_PzX4-cuWUf-V1WJcDxe5a-R2WuWiRnmlFlkn2FOCI63qm" />
                </div>
                <div className="w-full md:w-1/2 flex flex-col justify-center">
                  <span className="text-secondary font-label-sm uppercase tracking-[0.2em] mb-xs">Current Leader</span>
                  <h2 className="font-headline-lg text-headline-lg text-on-surface mb-md">{leader?.team_name ?? '—'}</h2>
                  <div className="grid grid-cols-2 gap-md mb-lg">
                    <div className="bg-surface-container-high p-md rounded-lg border border-outline-variant/20">
                      <p className="text-on-surface-variant font-label-sm uppercase">League Points</p>
                      <p className="font-stats-numeric text-display-xl text-secondary">{leader?.league_points ?? 0}</p>
                    </div>
                    <div className="bg-surface-container-high p-md rounded-lg border border-outline-variant/20">
                      <p className="text-on-surface-variant font-label-sm uppercase">Win Rate</p>
                      <p className="font-stats-numeric text-display-xl text-tertiary">{leaderWinRate}%</p>
                    </div>
                  </div>
                  <div className="flex gap-sm">
                    <div className="flex -space-x-3">
                      <div className="w-10 h-10 rounded-full border-2 border-surface overflow-hidden">
                        <img alt="" className="w-full h-full object-cover" src="https://lh3.googleusercontent.com/aida/ADBb0ujiyZTtEyuJw5dUzrZG_h0Gh05bJMaJU52DnY2Axa5RdR_AaeQ0hQgE4TZ9GiruoMU8aMdteDTPqD7fQYpS-RS2zYsSUT5kc_NxFWc2lKLWDpL_yjsESNxQGsGlCxH9GxeNY3V8yo5clI3vK9K7kMB8NbD7VZbRigqX-IFG_uPOwkje9_Rym8EaCMSR2Mkj0Ce_CKo9OzMMpwXOmHQzgexPJkle26gSvtHnqguOm9FCLXcojYi0t3MfJ4g8" />
                      </div>
                      <div className="w-10 h-10 rounded-full border-2 border-surface bg-secondary flex items-center justify-center">
                        <span className="material-symbols-outlined text-on-secondary text-sm" style={{ fontVariationSettings: "'FILL' 1" }}>shield</span>
                      </div>
                    </div>
                    <span className="font-body-md text-on-surface-variant self-center">{leader?.wins ?? 0}W · {leader?.draws ?? 0}D · {leader?.losses ?? 0}L</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div className="lg:col-span-4 flex flex-col gap-gutter">
            <h3 className="font-headline-md text-headline-md text-on-surface px-xs">Top Contenders</h3>
            <div className="space-y-sm">
              {contenders.map((row: any, i: number) => (
              <div key={i} className="bg-surface-container hover:bg-surface-container-high transition-all p-md rounded-lg border border-outline-variant/30 flex items-center gap-md">
                <span className="font-stats-numeric text-on-surface-variant w-6">{String(row?.position ?? i + 2).padStart(2, '0')}</span>
                <div className="w-12 h-12 rounded-full border border-outline-variant flex items-center justify-center bg-surface-container-high text-on-surface-variant font-bold text-[12px]">{initials(row?.team_name)}</div>
                <div className="flex-grow">
                  <p className="font-headline-md text-[16px] text-on-surface">{row?.team_name ?? '—'}</p>
                  <p className="font-label-sm text-on-surface-variant">{row?.league_points ?? 0} PTS</p>
                </div>
                <span className={`material-symbols-outlined ${trendColors[i % trendColors.length]}`}>{trendIcons[i % trendIcons.length]}</span>
              </div>
              ))}
            </div>
            <button className="w-full py-md border border-outline-variant/50 rounded-lg font-label-sm text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface transition-all">VIEW FULL STANDINGS</button>
          </div>
        </section>
        <section className="grid grid-cols-1 lg:grid-cols-2 gap-gutter">
          <div className="bg-surface-container rounded-xl border border-outline-variant/30 overflow-hidden">
            <div className="p-lg border-b border-outline-variant/30 flex justify-between items-center">
              <div>
                <h3 className="font-headline-md text-headline-md text-on-surface">Top Scorers</h3>
                <p className="text-on-surface-variant font-label-sm">Regular Season Leaderboard</p>
              </div>
              <button className="bg-surface-container-high p-xs rounded hover:bg-outline-variant/20">
                <span className="material-symbols-outlined">filter_list</span>
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-surface-container-low text-on-surface-variant border-b border-outline-variant/30">
                    <th className="px-lg py-md font-label-sm uppercase">Team</th>
                    <th className="px-lg py-md font-label-sm uppercase">Games</th>
                    <th className="px-lg py-md font-label-sm uppercase">Goles</th>
                    <th className="px-lg py-md font-label-sm uppercase text-right">Diff</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-outline-variant/10">
                  {standings.map((row: any, i: number) => (
                  <tr key={i} className="hover:bg-surface-container-high transition-colors">
                    <td className="px-lg py-md">
                      <div className="flex items-center gap-md">
                        <div className="w-8 h-8 rounded bg-secondary-container/20 flex items-center justify-center text-secondary font-bold text-[12px]">{initials(row?.team_name)}</div>
                        <span className="font-body-md font-semibold">{row?.team_name ?? '—'}</span>
                      </div>
                    </td>
                    <td className="px-lg py-md font-stats-numeric">{row?.matches_played ?? 0}</td>
                    <td className="px-lg py-md font-stats-numeric">{row?.points_scored ?? 0}</td>
                    <td className="px-lg py-md font-stats-numeric text-secondary text-right">{row?.diff ?? 0}</td>
                  </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-gutter">
            <div className="bg-surface-container rounded-xl border border-outline-variant/30 p-lg relative overflow-hidden group">
              <div className="absolute top-0 right-0 p-lg">
                <span className="material-symbols-outlined text-secondary text-4xl opacity-20 group-hover:opacity-40 transition-opacity">shield</span>
              </div>
              <h3 className="font-headline-md text-headline-md text-on-surface mb-md">Best Defense</h3>
              <div className="space-y-lg mt-md">
                {bestDefense.map((row: any, i: number) => (
                <div key={i}>
                  <div className="flex justify-between mb-xs">
                    <span className="font-body-md text-on-surface">{row?.team_name ?? '—'}</span>
                    <span className="font-stats-numeric text-secondary">{row?.points_conceded ?? 0} GC</span>
                  </div>
                  <div className="w-full bg-surface-container-highest h-2 rounded-full overflow-hidden">
                    <div className="bg-secondary h-full rounded-full" style={{ width: `${Math.round((1 - (Number(row?.points_conceded) || 0) / maxConceded) * 80) + 20}%` }}></div>
                  </div>
                </div>
                ))}
              </div>
              <p className="mt-xl text-[10px] text-on-surface-variant font-label-sm uppercase tracking-widest">Goals Conceded</p>
            </div>
            <div className="bg-surface-container rounded-xl border border-outline-variant/30 p-lg">
              <h3 className="font-headline-md text-headline-md text-on-surface mb-md">Efficiency Mix</h3>
              <div className="relative h-48 flex items-end justify-between gap-sm pt-xl">
                <div className="flex flex-col items-center gap-xs w-full">
                  <div className="bg-tertiary w-full rounded-t" style={{ height: '60%' }}></div>
                  <span className="text-[10px] font-label-sm text-on-surface-variant">AST</span>
                </div>
                <div className="flex flex-col items-center gap-xs w-full">
                  <div className="bg-secondary w-full rounded-t" style={{ height: '85%' }}></div>
                  <span className="text-[10px] font-label-sm text-on-surface-variant">REB</span>
                </div>
                <div className="flex flex-col items-center gap-xs w-full">
                  <div className="bg-tertiary w-full rounded-t" style={{ height: '45%' }}></div>
                  <span className="text-[10px] font-label-sm text-on-surface-variant">STL</span>
                </div>
                <div className="flex flex-col items-center gap-xs w-full">
                  <div className="bg-secondary w-full rounded-t" style={{ height: '70%' }}></div>
                  <span className="text-[10px] font-label-sm text-on-surface-variant">BLK</span>
                </div>
              </div>
              <div className="mt-lg pt-md border-t border-outline-variant/20 flex gap-md">
                <div className="flex items-center gap-xs">
                  <span className="w-2 h-2 rounded-full bg-secondary"></span>
                  <span className="text-[11px] font-label-sm text-on-surface-variant">Offensive</span>
                </div>
                <div className="flex items-center gap-xs">
                  <span className="w-2 h-2 rounded-full bg-tertiary"></span>
                  <span className="text-[11px] font-label-sm text-on-surface-variant">Defensive</span>
                </div>
              </div>
            </div>
          </div>
        </section>
        <section>
          <div className="flex items-center justify-between mb-lg">
            <div>
              <h3 className="font-headline-md text-headline-md text-on-surface">Team Efficiency Overview</h3>
              <p className="text-on-surface-variant font-label-sm">{stats?.teams ?? standings.length} teams · {stats?.finished_matches ?? 0}/{stats?.matches ?? 0} matches played</p>
            </div>
            <div className="flex gap-xs">
              <button className="bg-secondary text-on-secondary px-md py-xs rounded font-label-sm border-b-2 border-on-secondary-container">Weekly</button>
              <button className="bg-surface-container px-md py-xs rounded font-label-sm text-on-surface-variant hover:text-on-surface">Season</button>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-gutter">
            {efficiencyTeams.map((row: any, i: number) => (
            <div key={i} className="bg-surface-container rounded-xl border border-outline-variant/30 p-lg hover:border-secondary transition-colors cursor-pointer group">
              <div className="flex items-center gap-md mb-md">
                <div className="w-12 h-12 rounded-lg bg-surface-container-high border border-outline-variant/50 p-2 group-hover:scale-110 transition-transform">
                  <div className="w-full h-full bg-secondary/20 rounded flex items-center justify-center text-secondary font-bold text-[12px]">{initials(row?.team_name)}</div>
                </div>
                <div>
                  <p className="font-headline-md text-[18px] text-on-surface">{row?.team_name ?? '—'}</p>
                  <p className="font-label-sm text-secondary uppercase">{efficiencyTags[i] ?? `Rank ${row?.position ?? i + 1}`}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-sm">
                <div className="bg-surface-container-low p-sm rounded">
                  <p className="text-[10px] font-label-sm text-on-surface-variant uppercase">Goles</p>
                  <p className="font-stats-numeric text-on-surface">{row?.points_scored ?? 0}</p>
                </div>
                <div className="bg-surface-container-low p-sm rounded">
                  <p className="text-[10px] font-label-sm text-on-surface-variant uppercase">GC</p>
                  <p className="font-stats-numeric text-on-surface">{row?.points_conceded ?? 0}</p>
                </div>
              </div>
            </div>
            ))}
          </div>
        </section>
      </main>
      <footer className="w-full py-xl px-margin border-t border-outline-variant bg-surface-container-lowest">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-gutter max-w-7xl mx-auto">
          <div className="md:col-span-1">
            <span className="font-headline-md text-headline-md text-secondary block mb-md">Champion Hive</span>
            <p className="text-on-surface-variant font-label-sm leading-relaxed mb-md">Precision analytics for the modern athlete. Elevating performance through data-driven insights and premium competitive management.</p>
            <div className="flex gap-md">
              <span className="material-symbols-outlined text-on-surface-variant hover:text-secondary cursor-pointer">public</span>
              <span className="material-symbols-outlined text-on-surface-variant hover:text-secondary cursor-pointer">rss_feed</span>
              <span className="material-symbols-outlined text-on-surface-variant hover:text-secondary cursor-pointer">mail</span>
            </div>
          </div>
          <div>
            <h4 className="text-on-surface font-headline-md text-[16px] mb-md">Platform</h4>
            <ul className="space-y-sm">
              <li><a className="text-on-surface-variant hover:text-secondary font-label-sm transition-colors" href="#">Tournaments</a></li>
              <li><a className="text-on-surface-variant hover:text-secondary font-label-sm transition-colors" href="#">League Standings</a></li>
              <li><a className="text-on-surface-variant hover:text-secondary font-label-sm transition-colors" href="#">Player Scout</a></li>
              <li><a className="text-on-surface-variant hover:text-secondary font-label-sm transition-colors" href="#">Team Matrix</a></li>
            </ul>
          </div>
          <div>
            <h4 className="text-on-surface font-headline-md text-[16px] mb-md">Resources</h4>
            <ul className="space-y-sm">
              <li><a className="text-on-surface-variant hover:text-secondary font-label-sm transition-colors" href="#">Support Center</a></li>
              <li><a className="text-on-surface-variant hover:text-secondary font-label-sm transition-colors" href="#">API Documentation</a></li>
              <li><a className="text-on-surface-variant hover:text-secondary font-label-sm transition-colors" href="#">Brand Assets</a></li>
              <li><a className="text-on-surface-variant hover:text-secondary font-label-sm transition-colors" href="#">Sponsorships</a></li>
            </ul>
          </div>
          <div>
            <h4 className="text-on-surface font-headline-md text-[16px] mb-md">Legal</h4>
            <ul className="space-y-sm">
              <li><a className="text-on-surface-variant hover:text-secondary font-label-sm transition-colors" href="#">Privacy Policy</a></li>
              <li><a className="text-on-surface-variant hover:text-secondary font-label-sm transition-colors" href="#">Terms of Service</a></li>
              <li><a className="text-on-surface-variant hover:text-secondary font-label-sm transition-colors" href="#">Data Processing</a></li>
              <li><p className="text-on-surface-variant/50 font-label-sm mt-lg">© 2024 Champion Hive. All rights reserved.</p></li>
            </ul>
          </div>
        </div>
      </footer>
    </body>
  );
}
