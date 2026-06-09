export default function LeagueStandings({ data }: { data?: any }) {
  const standingsRows: any[] = data?.standingsFlat ?? [];
  const hasData = standingsRows.length > 0;
  const tournamentName = data?.tournament?.name;
  return (
    <body className="bg-background text-on-background font-body-md min-h-screen">
      <header className="fixed top-0 w-full z-50 border-b border-outline-variant/30 bg-surface/95 backdrop-blur-md shadow-sm">
        <div className="flex justify-between items-center h-20 px-margin max-w-screen-2xl mx-auto">
          <div className="flex items-center gap-xs">
            <span className="font-headline-lg text-headline-lg font-bold text-secondary italic tracking-tighter">Champion Hive</span>
          </div>
          <nav className="hidden md:flex items-center gap-lg">
            <a className="text-on-surface-variant hover:text-secondary transition-colors font-body-md text-body-md" href="#">Tournaments</a>
            <a className="text-secondary font-bold border-b-2 border-secondary pb-1 font-body-md text-body-md" href="#">Standings</a>
            <a className="text-on-surface-variant hover:text-secondary transition-colors font-body-md text-body-md" href="#">Teams</a>
            <a className="text-on-surface-variant hover:text-secondary transition-colors font-body-md text-body-md" href="#">Players</a>
          </nav>
          <div className="flex items-center gap-md">
            <button className="text-on-surface-variant hover:text-secondary transition-colors font-label-sm text-label-sm">Login</button>
            <button className="bg-secondary text-on-secondary px-6 py-2 rounded-lg font-label-sm text-label-sm font-bold active:scale-95 transition-transform">Join League</button>
          </div>
        </div>
      </header>
      <div className="pt-20 lg:flex max-w-screen-2xl mx-auto">
        <aside className="hidden lg:flex flex-col w-64 border-r border-outline-variant bg-surface-container-lowest h-[calc(100vh-5rem)] sticky top-20 py-lg">
          <div className="px-margin mb-xl">
            <h3 className="text-secondary font-headline-md text-headline-md font-bold">Champion Hive</h3>
            <p className="text-on-surface-variant font-label-sm text-label-sm">Elite Tournament Platform</p>
          </div>
          <nav className="flex-1 space-y-1">
            <div className="text-on-surface-variant hover:text-on-surface px-4 py-3 mx-2 my-1 cursor-pointer transition-all hover:bg-surface-container-high rounded-lg flex items-center gap-md">
              <span className="material-symbols-outlined" data-icon="home">home</span>
              <span className="font-body-md text-body-md">Home</span>
            </div>
            <div className="bg-secondary text-on-secondary font-bold rounded-lg px-4 py-3 mx-2 my-1 flex items-center gap-md shadow-lg">
              <span className="material-symbols-outlined" data-icon="leaderboard" data-weight="fill" style={{ fontVariationSettings: "'FILL' 1" }}>leaderboard</span>
              <span className="font-body-md text-body-md">Standings</span>
            </div>
            <div className="text-on-surface-variant hover:text-on-surface px-4 py-3 mx-2 my-1 cursor-pointer transition-all hover:bg-surface-container-high rounded-lg flex items-center gap-md">
              <span className="material-symbols-outlined" data-icon="sports_score">sports_score</span>
              <span className="font-body-md text-body-md">Tournaments</span>
            </div>
            <div className="text-on-surface-variant hover:text-on-surface px-4 py-3 mx-2 my-1 cursor-pointer transition-all hover:bg-surface-container-high rounded-lg flex items-center gap-md">
              <span className="material-symbols-outlined" data-icon="groups">groups</span>
              <span className="font-body-md text-body-md">Teams</span>
            </div>
            <div className="text-on-surface-variant hover:text-on-surface px-4 py-3 mx-2 my-1 cursor-pointer transition-all hover:bg-surface-container-high rounded-lg flex items-center gap-md">
              <span className="material-symbols-outlined" data-icon="person">person</span>
              <span className="font-body-md text-body-md">Players</span>
            </div>
          </nav>
          <div className="px-margin pt-lg">
            <button className="w-full bg-secondary-container text-on-secondary-container py-3 rounded-xl font-bold flex items-center justify-center gap-xs">
              <span className="material-symbols-outlined" data-icon="add_circle">add_circle</span>
                    Start a League
                </button>
          </div>
        </aside>
        <main className="flex-1 p-margin overflow-hidden">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-gutter mb-xl">
            <div>
              <h1 className="font-display-xl text-display-xl text-on-surface mb-xs uppercase tracking-tight">{tournamentName ? <>{tournamentName} <span className="text-secondary">Standings</span></> : <>Pro Division <span className="text-secondary">Standings</span></>}</h1>
              <p className="text-on-surface-variant font-body-lg text-body-lg">Season 12 • Global Championship Series</p>
            </div>
            <div className="w-full md:w-auto">
              <label className="font-label-sm text-label-sm text-on-surface-variant mb-2 block">SELECT LEAGUE</label>
              <div className="flex items-center gap-sm bg-surface-container-high border border-outline-variant p-2 rounded-lg">
                <span className="material-symbols-outlined text-secondary" data-icon="filter_list">filter_list</span>
                <select className="bg-transparent border-none text-on-surface focus:ring-0 font-body-md pr-8">
                  <option>North American Pro League</option>
                  <option>European Championship</option>
                  <option>Asian Pacific Invitational</option>
                </select>
              </div>
            </div>
          </div>
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-gutter">
            <div className="xl:col-span-2 space-y-gutter">
              <div className="bg-surface-container-low rounded-xl border border-outline-variant overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-surface-container-high border-b border-outline-variant/50">
                        <th className="p-4 font-label-sm text-label-sm text-on-surface-variant uppercase">Pos</th>
                        <th className="p-4 font-label-sm text-label-sm text-on-surface-variant uppercase">Team</th>
                        <th className="p-4 font-label-sm text-label-sm text-on-surface-variant uppercase text-center">MP</th>
                        <th className="p-4 font-label-sm text-label-sm text-on-surface-variant uppercase text-center">W</th>
                        <th className="p-4 font-label-sm text-label-sm text-on-surface-variant uppercase text-center">D</th>
                        <th className="p-4 font-label-sm text-label-sm text-on-surface-variant uppercase text-center">L</th>
                        <th className="p-4 font-label-sm text-label-sm text-on-surface-variant uppercase text-center">Form</th>
                        <th className="p-4 font-label-sm text-label-sm text-secondary uppercase text-right">PTS</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-outline-variant/30">
                      {hasData ? (
                        standingsRows.map((row: any, i: number) => (
                          <tr key={row?.team_name ?? i} className="hover:bg-surface-container-highest/30 transition-colors">
                            <td className="p-4 font-stats-numeric text-stats-numeric text-on-surface">{String(row?.position ?? i + 1).padStart(2, "0")}</td>
                            <td className="p-4">
                              <div className="flex items-center gap-sm">
                                <div className="w-10 h-10 rounded-full bg-surface-container-highest flex items-center justify-center border-2 border-outline">
                                  <span className="material-symbols-outlined text-outline" data-icon="shield">shield</span>
                                </div>
                                <span className="font-headline-md text-headline-md text-on-surface">{row?.team_name ?? "—"}</span>
                              </div>
                            </td>
                            <td className="p-4 text-center font-stats-numeric">{row?.matches_played ?? 0}</td>
                            <td className="p-4 text-center font-stats-numeric">{row?.wins ?? 0}</td>
                            <td className="p-4 text-center font-stats-numeric">{row?.draws ?? 0}</td>
                            <td className="p-4 text-center font-stats-numeric">{row?.losses ?? 0}</td>
                            <td className="p-4 text-center font-stats-numeric">{(row?.points_scored ?? 0)}:{(row?.points_conceded ?? 0)} <span className="text-on-surface-variant">({(row?.diff ?? 0) > 0 ? "+" : ""}{row?.diff ?? 0})</span></td>
                            <td className="p-4 text-right font-stats-numeric text-secondary text-2xl">{row?.league_points ?? 0}</td>
                          </tr>
                        ))
                      ) : (
                      <>
                      <tr className="hover:bg-surface-container-highest/30 transition-colors">
                        <td className="p-4 font-stats-numeric text-stats-numeric text-on-surface">01</td>
                        <td className="p-4">
                          <div className="flex items-center gap-sm">
                            <img alt="" className="w-10 h-10 rounded-full border-2 border-secondary" data-alt="A professional sports team logo featuring a stylized geometric eagle with neon green accents on a dark slate background. The aesthetic is clean, corporate, and competitive, symbolizing speed and precision in a high-stakes athletic environment." src="https://lh3.googleusercontent.com/aida/ADBb0ujiyZTtEyuJw5dUzrZG_h0Gh05bJMaJU52DnY2Axa5RdR_AaeQ0hQgE4TZ9GiruoMU8aMdteDTPqD7fQYpS-RS2zYsSUT5kc_NxFWc2lKLWDpL_yjsESNxQGsGlCxH9GxeNY3V8yo5clI3vK9K7kMB8NbD7VZbRigqX-IFG_uPOwkje9_Rym8EaCMSR2Mkj0Ce_CKo9OzMMpwXOmHQzgexPJkle26gSvtHnqguOm9FCLXcojYi0t3MfJ4g8" />
                            <span className="font-headline-md text-headline-md text-on-surface">Cyber Strikers</span>
                          </div>
                        </td>
                        <td className="p-4 text-center font-stats-numeric">18</td>
                        <td className="p-4 text-center font-stats-numeric">14</td>
                        <td className="p-4 text-center font-stats-numeric">2</td>
                        <td className="p-4 text-center font-stats-numeric">2</td>
                        <td className="p-4">
                          <div className="flex justify-center gap-1">
                            <div className="w-2 h-2 rounded-full bg-secondary shadow-[0_0_8px_rgba(74,225,118,0.6)]"></div>
                            <div className="w-2 h-2 rounded-full bg-secondary shadow-[0_0_8px_rgba(74,225,118,0.6)]"></div>
                            <div className="w-2 h-2 rounded-full bg-secondary shadow-[0_0_8px_rgba(74,225,118,0.6)]"></div>
                            <div className="w-2 h-2 rounded-full bg-error shadow-[0_0_8px_rgba(255,180,171,0.6)]"></div>
                            <div className="w-2 h-2 rounded-full bg-secondary shadow-[0_0_8px_rgba(74,225,118,0.6)]"></div>
                          </div>
                        </td>
                        <td className="p-4 text-right font-stats-numeric text-secondary text-2xl">44</td>
                      </tr>
                      <tr className="hover:bg-surface-container-highest/30 transition-colors">
                        <td className="p-4 font-stats-numeric text-stats-numeric text-on-surface">02</td>
                        <td className="p-4">
                          <div className="flex items-center gap-sm">
                            <img alt="" className="w-10 h-10 rounded-full border-2 border-tertiary" data-alt="A futuristic team emblem with a glowing orange lightning bolt motif set against a deep navy circular shield. The design is bold and minimalist, reflecting a high-energy athletic brand for professional tournament management systems." src="https://lh3.googleusercontent.com/aida/ADBb0ujO9yJ1mf1lHIQtA4IQCj-ZKj5djUf_yDNzld5sL4dvz_uJBjYxegv9MgvIn5o-wxsIy_1TEmxwmx_jRIvneDWgDhvmeSxqBO-namYhpnkAjoxvWgBMXPC3wwrBciF4_W8ULBwr9-Uc9nnKI4ajbq45ZsdKT2gCc8JW1FSY3bxlumBglhuYxQLIZZXq_qY9Cuz9D3k55wy7StbZ7HgZM7PAcrbhTrSqvFRHcGQ14DtwYbHyq22E9wiHHBtC" />
                            <span className="font-headline-md text-headline-md text-on-surface">Neon Titans</span>
                          </div>
                        </td>
                        <td className="p-4 text-center font-stats-numeric">18</td>
                        <td className="p-4 text-center font-stats-numeric">12</td>
                        <td className="p-4 text-center font-stats-numeric">4</td>
                        <td className="p-4 text-center font-stats-numeric">2</td>
                        <td className="p-4">
                          <div className="flex justify-center gap-1">
                            <div className="w-2 h-2 rounded-full bg-secondary"></div>
                            <div className="w-2 h-2 rounded-full bg-on-surface-variant/40"></div>
                            <div className="w-2 h-2 rounded-full bg-secondary"></div>
                            <div className="w-2 h-2 rounded-full bg-secondary"></div>
                            <div className="w-2 h-2 rounded-full bg-secondary"></div>
                          </div>
                        </td>
                        <td className="p-4 text-right font-stats-numeric text-secondary text-2xl">40</td>
                      </tr>
                      <tr className="hover:bg-surface-container-highest/30 transition-colors">
                        <td className="p-4 font-stats-numeric text-stats-numeric text-on-surface">03</td>
                        <td className="p-4">
                          <div className="flex items-center gap-sm">
                            <div className="w-10 h-10 rounded-full bg-surface-container-highest flex items-center justify-center border-2 border-outline">
                              <span className="material-symbols-outlined text-outline" data-icon="shield">shield</span>
                            </div>
                            <span className="font-headline-md text-headline-md text-on-surface">Iron Vanguard</span>
                          </div>
                        </td>
                        <td className="p-4 text-center font-stats-numeric">18</td>
                        <td className="p-4 text-center font-stats-numeric">11</td>
                        <td className="p-4 text-center font-stats-numeric">3</td>
                        <td className="p-4 text-center font-stats-numeric">4</td>
                        <td className="p-4">
                          <div className="flex justify-center gap-1">
                            <div className="w-2 h-2 rounded-full bg-error"></div>
                            <div className="w-2 h-2 rounded-full bg-secondary"></div>
                            <div className="w-2 h-2 rounded-full bg-error"></div>
                            <div className="w-2 h-2 rounded-full bg-secondary"></div>
                            <div className="w-2 h-2 rounded-full bg-secondary"></div>
                          </div>
                        </td>
                        <td className="p-4 text-right font-stats-numeric text-secondary text-2xl">36</td>
                      </tr>
                      </>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-gutter">
                <div className="bg-surface-container border-l-4 border-secondary p-lg rounded-xl">
                  <h4 className="font-label-sm text-label-sm text-on-surface-variant uppercase mb-md">Division Top Scorer</h4>
                  <div className="flex items-center gap-lg">
                    <img className="w-16 h-16 rounded-lg object-cover" data-alt="Close-up portrait of a determined professional athlete in a high-tech sports jersey. The lighting is dramatic and cool-toned, reminiscent of a sports arena tunnel. The background is slightly blurred to emphasize the player's focus and intensity." src="https://lh3.googleusercontent.com/aida/ADBb0uhEOUBJNogjzQUu1-oNKuy7zI5APrQkXEfC3vFbzP_osrB3xvTkwzuKMso8UmyYZiXsHGD_GL4OvAOHRP4McjWfLcT32-kRZHLZvOnhsHqR2q2KXY4sQnzXIV3936tLmM9Gh8bHyOUXOV70s8hMUjj_oJy2eVTERu7qSkhe7moBw0hP3JtNTtCc9IbOa8J9DdDK7e2UL4llQfNASAFsQq9UA5SAxXfsswctdCxMNxuidGF3kACjkqfTmPpzPmapUvz12PO5dvM5DLA" />
                    <div>
                      <p className="font-headline-md text-headline-md text-on-surface">Marcus "Bolt" J.</p>
                      <p className="text-secondary font-stats-numeric">24 Goals • Cyber Strikers</p>
                    </div>
                  </div>
                </div>
                <div className="bg-surface-container border-l-4 border-tertiary p-lg rounded-xl">
                  <h4 className="font-label-sm text-label-sm text-on-surface-variant uppercase mb-md">Highest Win Rate</h4>
                  <div className="flex items-center gap-lg">
                    <div className="w-16 h-16 bg-surface-container-highest rounded-lg flex items-center justify-center">
                      <span className="text-tertiary font-display-xl">78%</span>
                    </div>
                    <div>
                      <p className="font-headline-md text-headline-md text-on-surface">Cyber Strikers</p>
                      <p className="text-on-surface-variant font-label-sm">Consistent dominance in Q3</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div className="space-y-gutter">
              <section className="bg-primary-container border border-secondary/20 rounded-xl overflow-hidden relative group">
                <div className="absolute inset-0 bg-gradient-to-br from-secondary/10 to-transparent opacity-50"></div>
                <div className="p-lg relative">
                  <div className="flex justify-between items-start mb-lg">
                    <span className="bg-secondary text-on-secondary px-3 py-1 rounded-full font-label-sm text-label-sm font-bold uppercase tracking-widest pulse-live">Live Preview</span>
                    <span className="material-symbols-outlined text-secondary" data-icon="timer">timer</span>
                  </div>
                  <h3 className="font-headline-md text-headline-md text-on-surface mb-xs">Match of the Day</h3>
                  <p className="text-on-surface-variant font-label-sm text-label-sm mb-lg">Cyber Strikers vs Neon Titans</p>
                  <div className="flex justify-between items-center bg-surface-container-lowest/50 p-md rounded-lg mb-lg border border-outline-variant/30">
                    <div className="text-center">
                      <p className="font-display-xl text-display-xl text-on-surface">04</p>
                      <p className="font-label-sm text-label-sm text-on-surface-variant">HRS</p>
                    </div>
                    <div className="text-on-surface-variant font-display-xl">:</div>
                    <div className="text-center">
                      <p className="font-display-xl text-display-xl text-on-surface">12</p>
                      <p className="font-label-sm text-label-sm text-on-surface-variant">MIN</p>
                    </div>
                    <div className="text-on-surface-variant font-display-xl">:</div>
                    <div className="text-center">
                      <p className="font-display-xl text-display-xl text-on-surface">55</p>
                      <p className="font-label-sm text-label-sm text-on-surface-variant">SEC</p>
                    </div>
                  </div>
                  <button className="w-full bg-secondary text-on-secondary py-3 rounded-lg font-bold hover:shadow-[0_0_15px_rgba(74,225,118,0.4)] transition-all">Get Tickets</button>
                </div>
              </section>
              <section className="bg-surface-container-low border border-outline-variant rounded-xl p-lg">
                <div className="flex justify-between items-center mb-lg">
                  <h3 className="font-headline-md text-headline-md text-on-surface">Recent Results</h3>
                  <span className="material-symbols-outlined text-on-surface-variant cursor-pointer hover:text-secondary" data-icon="history">history</span>
                </div>
                <div className="space-y-md">
                  <div className="flex items-center justify-between p-md bg-surface-container-high rounded-lg group hover:border-secondary transition-all border border-transparent">
                    <div className="flex items-center gap-sm">
                      <img className="w-8 h-8 rounded-full" data-alt="A minimalist logo for a sports team showing a sharp metallic spearhead against a black field. The design is sleek, modern, and high-contrast, fitting the professional gaming and athletic aesthetic of the Champion Hive platform." src="https://lh3.googleusercontent.com/aida/ADBb0ujlA1I4-0eqo5nUdBuHbXtCvmJQbRK4FbJ72DYUxHAE-xXo0KYtMsNJKBakYbrpyAB9o0ejxHvl0Z6SUP4-cjjDHwGye4gJaLBuOLQ2Em5qUFZJlb1_Jp12v2zrkoOa5A6csX4cMYPaOaXPhX5XrWmTQB5HjlJzx8KwRs8JAvbXHx-Udq7xQJVVU56m3m5Y8xIekDyV6UU4M6dDufyWWaEDxsSuUvl8txYqCxbwdoLJXWNlOoLPpPi1XNDK" />
                      <span className="font-label-sm text-label-sm text-on-surface">Vanguard</span>
                    </div>
                    <div className="flex items-center gap-xs">
                      <span className="font-stats-numeric text-on-surface">2</span>
                      <span className="text-on-surface-variant">-</span>
                      <span className="font-stats-numeric text-secondary">3</span>
                    </div>
                    <div className="flex items-center gap-sm">
                      <span className="font-label-sm text-label-sm text-on-surface">Titans</span>
                      <img className="w-8 h-8 rounded-full" data-alt="Futuristic team logo with a neon glow effect, representing a professional tournament competitor." src="https://lh3.googleusercontent.com/aida/ADBb0ujO9yJ1mf1lHIQtA4IQCj-ZKj5djUf_yDNzld5sL4dvz_uJBjYxegv9MgvIn5o-wxsIy_1TEmxwmx_jRIvneDWgDhvmeSxqBO-namYhpnkAjoxvWgBMXPC3wwrBciF4_W8ULBwr9-Uc9nnKI4ajbq45ZsdKT2gCc8JW1FSY3bxlumBglhuYxQLIZZXq_qY9Cuz9D3k55wy7StbZ7HgZM7PAcrbhTrSqvFRHcGQ14DtwYbHyq22E9wiHHBtC" />
                    </div>
                  </div>
                  <div className="flex items-center justify-between p-md bg-surface-container-high rounded-lg group hover:border-secondary transition-all border border-transparent">
                    <div className="flex items-center gap-sm">
                      <img className="w-8 h-8 rounded-full" data-alt="A modern athletic logo featuring a stylized shield with two crossed silver swords on a dark navy background. The iconography is crisp and authoritative, designed for a professional sports management dashboard." src="https://lh3.googleusercontent.com/aida/ADBb0uhXHOsDYIg8Ce-sVc08yTmMfkdyY0VE_YZDjIYZQpF3TwInIyGMSxcg4FbaoZ8I2FoWhkmP2KklaMAlHm6jfu0kdKUgOoUgHIa67ZUQNS_xRY6ACqkVdcLeZ9c3FFtyIQpgGVJtbEAIFh6F9PmgrCufvrrzGCeVPfvJmKv7Us3hxvTBWIHOCZk-60mZ_9_cpHWNyO-hLPZRRshCii3wPq_qL2HjdNGb75ayXLrCIOZlu2Bd_PjYB_Uil4Q" />
                      <span className="font-label-sm text-label-sm text-on-surface">Guardians</span>
                    </div>
                    <div className="flex items-center gap-xs">
                      <span className="font-stats-numeric text-secondary">1</span>
                      <span className="text-on-surface-variant">-</span>
                      <span className="font-stats-numeric text-on-surface">1</span>
                    </div>
                    <div className="flex items-center gap-sm">
                      <span className="font-label-sm text-label-sm text-on-surface">Strikers</span>
                      <img className="w-8 h-8 rounded-full" data-alt="Professional sports team emblem with neon green geometric bird." src="https://lh3.googleusercontent.com/aida/ADBb0ujiyZTtEyuJw5dUzrZG_h0Gh05bJMaJU52DnY2Axa5RdR_AaeQ0hQgE4TZ9GiruoMU8aMdteDTPqD7fQYpS-RS2zYsSUT5kc_NxFWc2lKLWDpL_yjsESNxQGsGlCxH9GxeNY3V8yo5clI3vK9K7kMB8NbD7VZbRigqX-IFG_uPOwkje9_Rym8EaCMSR2Mkj0Ce_CKo9OzMMpwXOmHQzgexPJkle26gSvtHnqguOm9FCLXcojYi0t3MfJ4g8" />
                    </div>
                  </div>
                  <div className="flex items-center justify-between p-md bg-surface-container-high rounded-lg group hover:border-secondary transition-all border border-transparent">
                    <div className="flex items-center gap-sm">
                      <img className="w-8 h-8 rounded-full" data-alt="A sleek corporate sports logo featuring a stylized 'H' within a hexagonal frame, rendered in bright white against a deep blue background. The geometry is rigid and precise, evoking a sense of engineering and professional organization." src="https://lh3.googleusercontent.com/aida/ADBb0uj3VEmv-u5gTRcItaE2tuQDzN7zqY6I5T_Wz91wUL5TpxhCC4KCYdmgiFQXKy0qFU-_qhxIVs-OMI5AJl6VjdVN4A0u6KVCFIUDkRrC8BQmCH307GRMGK0ElYkBYULMMuxbJCq1j4pbybkecBKOhRu0PHPbN-AYAHfBipkG3xZ9OdoOaT-ncgGo4ocrpvoukXYETcqH7qpAL_LqM0UkSW5sMpuY3yiimXZF1nAJ8qU5sAXZrbM_gXakWMk" />
                      <span className="font-label-sm text-label-sm text-on-surface">Hive Pro</span>
                    </div>
                    <div className="flex items-center gap-xs">
                      <span className="font-stats-numeric text-on-surface">0</span>
                      <span className="text-on-surface-variant">-</span>
                      <span className="font-stats-numeric text-secondary">4</span>
                    </div>
                    <div className="flex items-center gap-sm">
                      <span className="font-label-sm text-label-sm text-on-surface">Apex</span>
                      <img className="w-8 h-8 rounded-full" data-alt="Minimalist abstract logo for a competitive athletic team, featuring sharp angular shapes that create a sense of forward motion and velocity. The palette uses deep blacks and vibrant neon accents consistent with the high-performance UI theme." src="https://lh3.googleusercontent.com/aida/ADBb0ugAslubqau1if-Y7ldh0EkOQy0DB96ef6kXXkQ3470IVP0Gepn5A7WdGmZFd22WhVaEvNxmFG6CGsSdebIi-BDS6sdQ2wKMjuxW8OSNXiqGxY9dvQRqnmmHYe6rbP5etCHFmemp9D1zRPBqKXrNaTZqWNJgsVfcTiPUkptifYp9LaFDmrvbVJk0Zcg-nt1zMaVQdSWYMXoIvp_PzX4-cuWUf-V1WJcDxe5a-R2WuWiRnmlFlkn2FOCI63qm" />
                    </div>
                  </div>
                </div>
              </section>
            </div>
          </div>
        </main>
      </div>
      <footer className="w-full py-xl px-margin border-t border-outline-variant bg-surface-container-lowest">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-gutter max-w-7xl mx-auto">
          <div className="col-span-1 md:col-span-1">
            <span className="font-headline-md text-headline-md text-secondary mb-md block">Champion Hive</span>
            <p className="text-on-surface-variant font-label-sm text-label-sm max-w-xs">
                    The ultimate platform for professional tournament organizers and competitive athletes globally.
                </p>
          </div>
          <div className="space-y-sm">
            <h5 className="text-on-surface font-bold font-body-md">Platform</h5>
            <nav className="flex flex-col gap-xs font-label-sm text-label-sm text-on-surface-variant">
              <a className="hover:text-secondary transition-colors" href="#">Tournaments</a>
              <a className="text-secondary underline" href="#">Standings</a>
              <a className="hover:text-secondary transition-colors" href="#">Teams</a>
            </nav>
          </div>
          <div className="space-y-sm">
            <h5 className="text-on-surface font-bold font-body-md">Support</h5>
            <nav className="flex flex-col gap-xs font-label-sm text-label-sm text-on-surface-variant">
              <a className="hover:text-secondary transition-colors" href="#">Contact Us</a>
              <a className="hover:text-secondary transition-colors" href="#">Privacy Policy</a>
              <a className="hover:text-secondary transition-colors" href="#">Terms of Service</a>
            </nav>
          </div>
          <div className="space-y-sm">
            <h5 className="text-on-surface font-bold font-body-md">Subscribe</h5>
            <p className="text-on-surface-variant font-label-sm text-label-sm mb-md">Get the latest match results directly in your inbox.</p>
            <div className="flex bg-surface-container-high border border-outline-variant rounded-lg overflow-hidden">
              <input className="bg-transparent border-none text-on-surface font-label-sm flex-1 focus:ring-0" placeholder="Email address" type="email" />
              <button className="bg-secondary text-on-secondary px-4 py-2 font-bold font-label-sm">Join</button>
            </div>
          </div>
        </div>
        <div className="max-w-7xl mx-auto mt-xl pt-lg border-t border-outline-variant/30 flex flex-col md:flex-row justify-between items-center gap-md">
          <p className="text-on-surface-variant font-label-sm text-label-sm">© 2024 Champion Hive. All rights reserved.</p>
          <div className="flex gap-lg">
            <span className="material-symbols-outlined text-on-surface-variant hover:text-secondary cursor-pointer" data-icon="public">public</span>
            <span className="material-symbols-outlined text-on-surface-variant hover:text-secondary cursor-pointer" data-icon="share">share</span>
          </div>
        </div>
      </footer>
      <div className="md:hidden fixed bottom-0 left-0 w-full bg-surface-container-high border-t border-outline-variant z-50 flex justify-around items-center py-sm">
        <div className="flex flex-col items-center gap-1 text-on-surface-variant">
          <span className="material-symbols-outlined" data-icon="home">home</span>
          <span className="text-[10px] uppercase font-bold">Home</span>
        </div>
        <div className="flex flex-col items-center gap-1 text-secondary">
          <span className="material-symbols-outlined" data-icon="leaderboard" data-weight="fill" style={{ fontVariationSettings: "'FILL' 1" }}>leaderboard</span>
          <span className="text-[10px] uppercase font-bold">Standings</span>
        </div>
        <div className="flex flex-col items-center gap-1 text-on-surface-variant">
          <span className="material-symbols-outlined" data-icon="sports_score">sports_score</span>
          <span className="text-[10px] uppercase font-bold">Leagues</span>
        </div>
        <div className="flex flex-col items-center gap-1 text-on-surface-variant">
          <span className="material-symbols-outlined" data-icon="person">person</span>
          <span className="text-[10px] uppercase font-bold">Account</span>
        </div>
      </div>
    </body>
  );
}
