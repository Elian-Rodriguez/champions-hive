export default function ElitePlatform({ data }: { data?: any }) {
  const tournaments = data?.tournaments ?? [];
  return (
    <div className="bg-background text-on-background font-body-md selection:bg-secondary selection:text-on-secondary">
      <header className="fixed top-0 w-full z-50 border-b border-outline-variant/30 bg-surface/95 backdrop-blur-md shadow-sm">
        <nav className="flex justify-between items-center h-20 px-margin max-w-screen-2xl mx-auto">
          <div className="flex items-center gap-xs">
            <span className="font-headline-lg text-headline-lg font-bold text-secondary italic tracking-tighter">Champion Hive</span>
          </div>
          <div className="hidden md:flex items-center gap-lg">
            <a className="text-on-surface-variant hover:text-secondary transition-colors font-body-md text-body-md" href="#">Tournaments</a>
            <a className="text-on-surface-variant hover:text-secondary transition-colors font-body-md text-body-md" href="#">Standings</a>
            <a className="text-on-surface-variant hover:text-secondary transition-colors font-body-md text-body-md" href="#">Teams</a>
            <a className="text-on-surface-variant hover:text-secondary transition-colors font-body-md text-body-md" href="#">Players</a>
          </div>
          <div className="flex items-center gap-md">
            <button className="text-on-surface-variant hover:text-secondary transition-colors font-label-sm text-label-sm uppercase tracking-wider">Login</button>
            <button className="bg-secondary text-on-secondary font-bold px-6 py-2.5 rounded-lg active:scale-95 transition-transform hover:bg-secondary-fixed transition-colors">Join League</button>
          </div>
        </nav>
      </header>
      <main className="pt-20">
        <section className="relative min-h-[85vh] flex items-center overflow-hidden px-margin">
          <div className="absolute inset-0 z-0">
            <div className="absolute inset-0 bg-gradient-to-r from-background via-background/80 to-transparent z-10"></div>
            <img alt="Champion Hive Premium Logo" className="w-full h-full object-cover object-right opacity-40" src="https://lh3.googleusercontent.com/aida/ADBb0uhEOUBJNogjzQUu1-oNKuy7zI5APrQkXEfC3vFbzP_osrB3xvTkwzuKMso8UmyYZiXsHGD_GL4OvAOHRP4McjWfLcT32-kRZHLZvOnhsHqR2q2KXY4sQnzXIV3936tLmM9Gh8bHyOUXOV70s8hMUjj_oJy2eVTERu7qSkhe7moBw0hP3JtNTtCc9IbOa8J9DdDK7e2UL4llQfNASAFsQq9UA5SAxXfsswctdCxMNxuidGF3kACjkqfTmPpzPmapUvz12PO5dvM5DLA" />
          </div>
          <div className="relative z-20 max-w-4xl">
            <div className="inline-flex items-center gap-xs bg-secondary-container/20 border border-secondary/30 px-4 py-1.5 rounded-full mb-lg">
              <span className="material-symbols-outlined text-secondary text-[18px]">verified</span>
              <span className="text-secondary font-label-sm text-label-sm uppercase tracking-widest">Elite Tournament Network</span>
            </div>
            <h1 className="font-display-xl text-display-xl text-on-surface mb-md leading-tight">
              DOMINATE THE <span className="text-secondary italic">ARENA</span>.<br />MANAGE WITH PRECISION.
            </h1>
            <p className="font-body-lg text-body-lg text-on-surface-variant max-w-2xl mb-xl">
              The professional-grade platform for tournament organizers, athletes, and fans. Real-time statistics, automated brackets, and elite league management.
            </p>
            <div className="flex flex-wrap gap-md">
              <button className="bg-secondary text-on-secondary font-headline-md text-headline-md px-8 py-4 rounded-lg flex items-center gap-sm shadow-[0_0_20px_rgba(74,225,118,0.3)] hover:shadow-[0_0_30px_rgba(74,225,118,0.5)] transition-all">
                Register Your Team
                <span className="material-symbols-outlined">rocket_launch</span>
              </button>
              <button className="border-2 border-tertiary text-tertiary font-headline-md text-headline-md px-8 py-4 rounded-lg flex items-center gap-sm hover:bg-tertiary/10 transition-all">
                Explore Leagues
                <span className="material-symbols-outlined">explore</span>
              </button>
            </div>
          </div>
        </section>
        <section className="py-xl px-margin max-w-screen-2xl mx-auto">
          <div className="flex justify-between items-end mb-xl">
            <div>
              <h2 className="font-headline-lg text-headline-lg text-on-surface">Live Tournaments</h2>
              <p className="text-on-surface-variant mt-xs">Real-time action from the world's most competitive circuits.</p>
            </div>
            <button className="text-secondary font-label-sm text-label-sm uppercase flex items-center gap-xs border-b border-secondary/0 hover:border-secondary transition-all">
              View All Schedules <span className="material-symbols-outlined">arrow_forward</span>
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-gutter">
            {tournaments.length ? (
              tournaments.map((t: any, i: number) => (
                <div key={t?.id ?? i} className="glass-card rounded-xl overflow-hidden group border-l-4 border-l-secondary">
                  <div className="relative h-48">
                    <img className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" alt={t?.name ?? ''} src={t?.banner_url ?? t?.logo_url ?? "https://lh3.googleusercontent.com/aida/ADBb0ugAslubqau1if-Y7ldh0EkOQy0DB96ef6kXXkQ3470IVP0Gepn5A7WdGmZFd22WhVaEvNxmFG6CGsSdebIi-BDS6sdQ2wKMjuxW8OSNXiqGxY9dvQRqnmmHYe6rbP5etCHFmemp9D1zRPBqKXrNaTZqWNJgsVfcTiPUkptifYp9LaFDmrvbVJk0Zcg-nt1zMaVQdSWYMXoIvp_PzX4-cuWUf-V1WJcDxe5a-R2WuWiRnmlFlkn2FOCI63qm"} />
                    <div className="absolute top-4 left-4 bg-error-container text-on-error-container px-3 py-1 rounded-full flex items-center gap-xs font-label-sm text-label-sm uppercase">
                      <span className="w-2 h-2 rounded-full bg-error pulse-live"></span>
                      {t?.status ?? 'Live'}
                    </div>
                  </div>
                  <div className="p-lg">
                    <h3 className="font-headline-md text-headline-md text-on-surface mb-xs">{t?.name ?? 'Tournament'}</h3>
                    <div className="flex items-center gap-md text-on-surface-variant mb-md">
                      <div className="flex items-center gap-xs">
                        <span className="material-symbols-outlined text-[18px]">sports</span>
                        <span className="text-label-sm">{t?.sport_type ?? ''}</span>
                      </div>
                      <div className="flex items-center gap-xs">
                        <span className="material-symbols-outlined text-[18px]">emoji_events</span>
                        <span className="text-label-sm">{t?.status ?? ''}</span>
                      </div>
                    </div>
                    <div className="flex items-center justify-between pt-md border-t border-outline-variant/30">
                      <div className="flex -space-x-3">
                        {t?.logo_url ? (
                          <img className="w-10 h-10 rounded-full border-2 border-surface" alt={t?.name ?? ''} src={t.logo_url} />
                        ) : (
                          <div className="w-10 h-10 rounded-full border-2 border-surface bg-secondary-container"></div>
                        )}
                        <div className="w-10 h-10 rounded-full border-2 border-surface bg-surface-container-highest"></div>
                      </div>
                      <button className="bg-secondary/10 text-secondary border border-secondary/30 px-4 py-1.5 rounded-lg hover:bg-secondary hover:text-on-secondary transition-all font-label-sm text-label-sm">Enter Hub</button>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <>
                <div className="glass-card rounded-xl overflow-hidden group border-l-4 border-l-secondary">
                  <div className="relative h-48">
                    <img className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" data-alt="A dynamic high-action sports photography shot of an intense basketball game under neon stadium lights. The players are captured in mid-air motion with dramatic motion blur and high contrast shadows. The atmosphere is energetic and professional, dominated by deep blues and vibrant green lighting accents that match the Champion Hive brand identity." src="https://lh3.googleusercontent.com/aida/ADBb0ugAslubqau1if-Y7ldh0EkOQy0DB96ef6kXXkQ3470IVP0Gepn5A7WdGmZFd22WhVaEvNxmFG6CGsSdebIi-BDS6sdQ2wKMjuxW8OSNXiqGxY9dvQRqnmmHYe6rbP5etCHFmemp9D1zRPBqKXrNaTZqWNJgsVfcTiPUkptifYp9LaFDmrvbVJk0Zcg-nt1zMaVQdSWYMXoIvp_PzX4-cuWUf-V1WJcDxe5a-R2WuWiRnmlFlkn2FOCI63qm" />
                    <div className="absolute top-4 left-4 bg-error-container text-on-error-container px-3 py-1 rounded-full flex items-center gap-xs font-label-sm text-label-sm uppercase">
                      <span className="w-2 h-2 rounded-full bg-error pulse-live"></span>
                      Live
                    </div>
                  </div>
                  <div className="p-lg">
                    <h3 className="font-headline-md text-headline-md text-on-surface mb-xs">Apex Pro League S4</h3>
                    <div className="flex items-center gap-md text-on-surface-variant mb-md">
                      <div className="flex items-center gap-xs">
                        <span className="material-symbols-outlined text-[18px]">groups</span>
                        <span className="text-label-sm">16 Teams</span>
                      </div>
                      <div className="flex items-center gap-xs">
                        <span className="material-symbols-outlined text-[18px]">payments</span>
                        <span className="text-label-sm">$25,000 Prize</span>
                      </div>
                    </div>
                    <div className="flex items-center justify-between pt-md border-t border-outline-variant/30">
                      <div className="flex -space-x-3">
                        <img className="w-10 h-10 rounded-full border-2 border-surface" data-alt="A minimalist esports team logo featuring a stylized predator bird in deep forest green and sharp white. The design is modern, sleek, and high-contrast, set against a dark neutral background for a premium competitive feel." src="https://lh3.googleusercontent.com/aida/ADBb0ujiyZTtEyuJw5dUzrZG_h0Gh05bJMaJU52DnY2Axa5RdR_AaeQ0hQgE4TZ9GiruoMU8aMdteDTPqD7fQYpS-RS2zYsSUT5kc_NxFWc2lKLWDpL_yjsESNxQGsGlCxH9GxeNY3V8yo5clI3vK9K7kMB8NbD7VZbRigqX-IFG_uPOwkje9_Rym8EaCMSR2Mkj0Ce_CKo9OzMMpwXOmHQzgexPJkle26gSvtHnqguOm9FCLXcojYi0t3MfJ4g8" />
                        <img className="w-10 h-10 rounded-full border-2 border-surface" data-alt="A vibrant esports team emblem with a futuristic neon green shield design. The logo is clean and bold, utilizing geometric shapes and high-saturation colors to evoke energy and precision." src="https://lh3.googleusercontent.com/aida/ADBb0ujO9yJ1mf1lHIQtA4IQCj-ZKj5djUf_yDNzld5sL4dvz_uJBjYxegv9MgvIn5o-wxsIy_1TEmxwmx_jRIvneDWgDhvmeSxqBO-namYhpnkAjoxvWgBMXPC3wwrBciF4_W8ULBwr9-Uc9nnKI4ajbq45ZsdKT2gCc8JW1FSY3bxlumBglhuYxQLIZZXq_qY9Cuz9D3k55wy7StbZ7HgZM7PAcrbhTrSqvFRHcGQ14DtwYbHyq22E9wiHHBtC" />
                        <div className="w-10 h-10 rounded-full border-2 border-surface bg-surface-container-highest flex items-center justify-center text-label-sm">+14</div>
                      </div>
                      <button className="bg-secondary/10 text-secondary border border-secondary/30 px-4 py-1.5 rounded-lg hover:bg-secondary hover:text-on-secondary transition-all font-label-sm text-label-sm">Watch Stream</button>
                    </div>
                  </div>
                </div>
                <div className="glass-card rounded-xl overflow-hidden group border-l-4 border-l-tertiary">
                  <div className="relative h-48">
                    <img className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" data-alt="A cinematic wide shot of a professional football stadium at night, illuminated by massive floodlights that create a dramatic lens flare effect. The grass is a deep lush green, and the atmosphere is filled with a sense of anticipation and grandeur. The color palette emphasizes deep navy blue shadows and bright electric highlights." src="https://lh3.googleusercontent.com/aida/ADBb0uhXHOsDYIg8Ce-sVc08yTmMfkdyY0VE_YZDjIYZQpF3TwInIyGMSxcg4FbaoZ8I2FoWhkmP2KklaMAlHm6jfu0kdKUgOoUgHIa67ZUQNS_xRY6ACqkVdcLeZ9c3FFtyIQpgGVJtbEAIFh6F9PmgrCufvrrzGCeVPfvJmKv7Us3hxvTBWIHOCZk-60mZ_9_cpHWNyO-hLPZRRshCii3wPq_qL2HjdNGb75ayXLrCIOZlu2Bd_PjYB_Uil4Q" />
                    <div className="absolute top-4 left-4 bg-surface-container-high text-on-surface-variant px-3 py-1 rounded-full flex items-center gap-xs font-label-sm text-label-sm uppercase">
                      <span className="material-symbols-outlined text-[16px]">schedule</span>
                      Finals Tomorrow
                    </div>
                  </div>
                  <div className="p-lg">
                    <h3 className="font-headline-md text-headline-md text-on-surface mb-xs">European Masters Invitational</h3>
                    <div className="flex items-center gap-md text-on-surface-variant mb-md">
                      <div className="flex items-center gap-xs">
                        <span className="material-symbols-outlined text-[18px]">groups</span>
                        <span className="text-label-sm">32 Teams</span>
                      </div>
                      <div className="flex items-center gap-xs">
                        <span className="material-symbols-outlined text-[18px]">emoji_events</span>
                        <span className="text-label-sm">Major Status</span>
                      </div>
                    </div>
                    <div className="flex items-center justify-between pt-md border-t border-outline-variant/30">
                      <div className="flex -space-x-3">
                        <div className="w-10 h-10 rounded-full border-2 border-surface bg-tertiary-container flex items-center justify-center"><span className="material-symbols-outlined text-tertiary text-sm" data-weight="fill">shield</span></div>
                        <div className="w-10 h-10 rounded-full border-2 border-surface bg-surface-container-highest"></div>
                        <div className="w-10 h-10 rounded-full border-2 border-surface bg-surface-container-highest"></div>
                      </div>
                      <button className="bg-surface-container-high text-on-surface px-4 py-1.5 rounded-lg hover:bg-on-surface hover:text-surface transition-all font-label-sm text-label-sm">View Bracket</button>
                    </div>
                  </div>
                </div>
                <div className="glass-card rounded-xl overflow-hidden group border-l-4 border-l-secondary">
                  <div className="relative h-48">
                    <img className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" data-alt="A gritty, urban photography style capture of a street basketball court at sunset. The long shadows and orange-to-purple sky contrast with the harsh artificial court lighting. The focus is on the intensity of the game, with a modern, high-contrast aesthetic that fits a premium sports management brand." src="https://lh3.googleusercontent.com/aida/ADBb0ujlA1I4-0eqo5nUdBuHbXtCvmJQbRK4FbJ72DYUxHAE-xXo0KYtMsNJKBakYbrpyAB9o0ejxHvl0Z6SUP4-cjjDHwGye4gJaLBuOLQ2Em5qUFZJlb1_Jp12v2zrkoOa5A6csX4cMYPaOaXPhX5XrWmTQB5HjlJzx8KwRs8JAvbXHx-Udq7xQJVVU56m3m5Y8xIekDyV6UU4M6dDufyWWaEDxsSuUvl8txYqCxbwdoLJXWNlOoLPpPi1XNDK" />
                    <div className="absolute top-4 left-4 bg-error-container text-on-error-container px-3 py-1 rounded-full flex items-center gap-xs font-label-sm text-label-sm uppercase">
                      <span className="w-2 h-2 rounded-full bg-error pulse-live"></span>
                      Live
                    </div>
                  </div>
                  <div className="p-lg">
                    <h3 className="font-headline-md text-headline-md text-on-surface mb-xs">Urban Clash: Summer Open</h3>
                    <div className="flex items-center gap-md text-on-surface-variant mb-md">
                      <div className="flex items-center gap-xs">
                        <span className="material-symbols-outlined text-[18px]">groups</span>
                        <span className="text-label-sm">8 Teams</span>
                      </div>
                      <div className="flex items-center gap-xs">
                        <span className="material-symbols-outlined text-[18px]">location_on</span>
                        <span className="text-label-sm">New York</span>
                      </div>
                    </div>
                    <div className="flex items-center justify-between pt-md border-t border-outline-variant/30">
                      <div className="flex -space-x-3">
                        <div className="w-10 h-10 rounded-full border-2 border-surface bg-secondary-container"></div>
                        <div className="w-10 h-10 rounded-full border-2 border-surface bg-surface-container-highest"></div>
                      </div>
                      <button className="bg-secondary/10 text-secondary border border-secondary/30 px-4 py-1.5 rounded-lg hover:bg-secondary hover:text-on-secondary transition-all font-label-sm text-label-sm">Enter Hub</button>
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
        </section>
        <section className="py-xl bg-surface-container-low">
          <div className="max-w-screen-2xl mx-auto px-margin">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-xl items-center">
              <div className="lg:col-span-4">
                <h2 className="font-headline-lg text-headline-lg text-on-surface mb-md">League Leaders</h2>
                <p className="text-body-lg text-on-surface-variant mb-xl">Our proprietary statistical engine tracks every play, every goal, and every milestone in real-time.</p>
                <div className="space-y-md">
                  <div className="flex items-center gap-md p-md bg-surface rounded-xl border border-outline-variant/20">
                    <span className="material-symbols-outlined text-secondary text-3xl">insights</span>
                    <div>
                      <h4 className="font-bold text-on-surface">Win Probability</h4>
                      <p className="text-label-sm text-on-surface-variant">Live predictive modeling</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-md p-md bg-surface rounded-xl border border-outline-variant/20">
                    <span className="material-symbols-outlined text-tertiary text-3xl">speed</span>
                    <div>
                      <h4 className="font-bold text-on-surface">Player Velocity</h4>
                      <p className="text-label-sm text-on-surface-variant">Advanced motion tracking</p>
                    </div>
                  </div>
                </div>
              </div>
              <div className="lg:col-span-8">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-gutter">
                  <div className="bg-surface p-xl rounded-2xl border border-outline-variant/30 relative overflow-hidden group">
                    <div className="absolute -top-10 -right-10 w-40 h-40 bg-secondary/10 rounded-full blur-3xl group-hover:bg-secondary/20 transition-all"></div>
                    <span className="text-secondary font-label-sm text-label-sm uppercase tracking-widest block mb-md">MVP Candidate</span>
                    <div className="flex items-center gap-lg mb-xl">
                      <img className="w-20 h-20 rounded-full object-cover border-2 border-secondary" data-alt="A professional headshot of a focused athlete with intense eyes and a determined expression. The lighting is dramatic and moody, with high-key green rim lighting that highlights their silhouette against a dark, tech-inspired background. The style is modern, sharp, and athletic." src="https://lh3.googleusercontent.com/aida/ADBb0uj3VEmv-u5gTRcItaE2tuQDzN7zqY6I5T_Wz91wUL5TpxhCC4KCYdmgiFQXKy0qFU-_qhxIVs-OMI5AJl6VjdVN4A0u6KVCFIUDkRrC8BQmCH307GRMGK0ElYkBYULMMuxbJCq1j4pbybkecBKOhRu0PHPbN-AYAHfBipkG3xZ9OdoOaT-ncgGo4ocrpvoukXYETcqH7qpAL_LqM0UkSW5sMpuY3yiimXZF1nAJ8qU5sAXZrbM_gXakWMk" />
                      <div>
                        <h3 className="font-headline-md text-headline-md text-on-surface">Marcus "Bolt" Vane</h3>
                        <p className="text-on-surface-variant">Team Neon Strike</p>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-md">
                      <div>
                        <p className="text-label-sm text-on-surface-variant uppercase mb-base">Goals</p>
                        <p className="font-stats-numeric text-4xl text-on-surface">42</p>
                      </div>
                      <div>
                        <p className="text-label-sm text-on-surface-variant uppercase mb-base">Rating</p>
                        <p className="font-stats-numeric text-4xl text-secondary">9.8</p>
                      </div>
                    </div>
                  </div>
                  <div className="bg-surface p-xl rounded-2xl border border-outline-variant/30 relative overflow-hidden group">
                    <div className="absolute -top-10 -right-10 w-40 h-40 bg-tertiary/10 rounded-full blur-3xl group-hover:bg-tertiary/20 transition-all"></div>
                    <span className="text-tertiary font-label-sm text-label-sm uppercase tracking-widest block mb-md">Current #1 Seed</span>
                    <div className="flex items-center gap-lg mb-xl">
                      <div className="w-20 h-20 rounded-xl bg-surface-container-highest flex items-center justify-center border-2 border-tertiary">
                        <span className="material-symbols-outlined text-4xl text-tertiary" data-weight="fill">workspace_premium</span>
                      </div>
                      <div>
                        <h3 className="font-headline-md text-headline-md text-on-surface">Vanguard Elite</h3>
                        <p className="text-on-surface-variant">Regional Conference</p>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-md">
                      <div>
                        <p className="text-label-sm text-on-surface-variant uppercase mb-base">Record</p>
                        <p className="font-stats-numeric text-4xl text-on-surface">18 - 0</p>
                      </div>
                      <div>
                        <p className="text-label-sm text-on-surface-variant uppercase mb-base">Win rate</p>
                        <p className="font-stats-numeric text-4xl text-tertiary">100%</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
        <section className="py-xl px-margin max-w-screen-2xl mx-auto">
          <h2 className="font-display-xl text-display-xl text-center mb-xl">Engineered for <span className="text-secondary italic">Excellence</span></h2>
          <div className="grid grid-cols-1 md:grid-cols-4 lg:grid-cols-6 gap-md">
            <div className="md:col-span-4 bg-surface-container p-lg rounded-2xl border border-outline-variant/20 flex flex-col justify-between h-96 relative overflow-hidden">
              <div className="relative z-10">
                <span className="material-symbols-outlined text-secondary text-5xl mb-md">analytics</span>
                <h3 className="font-headline-lg text-headline-lg text-on-surface mb-sm">Professional Statistics</h3>
                <p className="text-body-lg text-on-surface-variant max-w-md">Access data usually reserved for professional broadcast crews. Predictive analytics, heatmaps, and advanced metrics at your fingertips.</p>
              </div>
              <div className="absolute bottom-0 right-0 w-1/2 h-2/3 bg-gradient-to-tl from-secondary/20 to-transparent"></div>
            </div>
            <div className="md:col-span-2 bg-surface-container p-lg rounded-2xl border border-outline-variant/20 flex flex-col justify-between h-96">
              <div>
                <span className="material-symbols-outlined text-tertiary text-5xl mb-md">account_tree</span>
                <h3 className="font-headline-md text-headline-md text-on-surface mb-sm">Elite Management</h3>
                <p className="text-on-surface-variant">Automated bracket generation, dispute resolution tools, and unified team communication channels.</p>
              </div>
              <button className="w-full py-3 rounded-lg border-2 border-outline-variant text-on-surface font-bold hover:bg-surface-container-high transition-all">Learn More</button>
            </div>
            <div className="md:col-span-2 lg:col-span-2 bg-surface-container-low p-lg rounded-2xl border border-outline-variant/20">
              <span className="material-symbols-outlined text-on-primary-container text-3xl mb-md">verified_user</span>
              <h4 className="font-bold text-on-surface mb-xs">Fair Play Guard</h4>
              <p className="text-label-sm text-on-surface-variant leading-relaxed">Integrated anti-cheat and verification systems to ensure a level playing field for every competitor.</p>
            </div>
            <div className="md:col-span-2 lg:col-span-2 bg-surface-container-low p-lg rounded-2xl border border-outline-variant/20">
              <span className="material-symbols-outlined text-on-primary-container text-3xl mb-md">cast</span>
              <h4 className="font-bold text-on-surface mb-xs">Broadcast Ready</h4>
              <p className="text-label-sm text-on-surface-variant leading-relaxed">Dynamic overlays and API integrations for high-quality streaming and real-time coverage.</p>
            </div>
            <div className="md:col-span-2 lg:col-span-2 bg-secondary text-on-secondary p-lg rounded-2xl flex items-center justify-between group cursor-pointer">
              <div>
                <h4 className="font-bold text-headline-md mb-xs">Start Your League</h4>
                <p className="text-on-secondary/80 font-label-sm">Launch in under 5 minutes</p>
              </div>
              <span className="material-symbols-outlined text-4xl group-hover:translate-x-2 transition-transform">bolt</span>
            </div>
          </div>
        </section>
        <section className="py-xl px-margin">
          <div className="max-w-5xl mx-auto bg-gradient-to-br from-secondary/20 to-tertiary/20 rounded-3xl p-xl text-center border border-outline-variant/20 backdrop-blur-sm">
            <h2 className="font-display-xl text-display-xl text-on-surface mb-md">Ready to Enter the Hive?</h2>
            <p className="text-body-lg text-on-surface-variant mb-xl max-w-2xl mx-auto">Join thousands of athletes and organizers already using Champion Hive to power their competitive ecosystems.</p>
            <div className="flex flex-col sm:flex-row gap-md justify-center">
              <button className="bg-secondary text-on-secondary font-bold px-10 py-4 rounded-xl text-lg hover:scale-105 transition-transform shadow-xl">Create Tournament</button>
              <button className="bg-surface text-on-surface border border-outline-variant font-bold px-10 py-4 rounded-xl text-lg hover:bg-surface-container-high transition-all">Join as Player</button>
            </div>
          </div>
        </section>
      </main>
      <footer className="w-full py-xl px-margin border-t border-outline-variant bg-surface-container-lowest">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-gutter max-w-7xl mx-auto">
          <div className="md:col-span-1">
            <span className="font-headline-md text-headline-md text-secondary block mb-md">Champion Hive</span>
            <p className="text-on-surface-variant font-label-sm text-label-sm leading-relaxed">The definitive platform for professional tournament administration and athletic data visualization.</p>
          </div>
          <div>
            <h4 className="font-bold text-on-surface mb-md uppercase tracking-widest text-xs">Platform</h4>
            <ul className="space-y-sm">
              <li><a className="text-on-surface-variant hover:text-secondary transition-colors font-label-sm text-label-sm" href="#">Tournaments</a></li>
              <li><a className="text-on-surface-variant hover:text-secondary transition-colors font-label-sm text-label-sm" href="#">Live Scores</a></li>
              <li><a className="text-on-surface-variant hover:text-secondary transition-colors font-label-sm text-label-sm" href="#">League Management</a></li>
            </ul>
          </div>
          <div>
            <h4 className="font-bold text-on-surface mb-md uppercase tracking-widest text-xs">Resources</h4>
            <ul className="space-y-sm">
              <li><a className="text-on-surface-variant hover:text-secondary transition-colors font-label-sm text-label-sm" href="#">Sponsorships</a></li>
              <li><a className="text-on-surface-variant hover:text-secondary transition-colors font-label-sm text-label-sm" href="#">Contact Us</a></li>
              <li><a className="text-on-surface-variant hover:text-secondary transition-colors font-label-sm text-label-sm" href="#">API Documentation</a></li>
            </ul>
          </div>
          <div>
            <h4 className="font-bold text-on-surface mb-md uppercase tracking-widest text-xs">Legal</h4>
            <ul className="space-y-sm">
              <li><a className="text-on-surface-variant hover:text-secondary transition-colors font-label-sm text-label-sm" href="#">Privacy Policy</a></li>
              <li><a className="text-on-surface-variant hover:text-secondary transition-colors font-label-sm text-label-sm" href="#">Terms of Service</a></li>
            </ul>
          </div>
        </div>
        <div className="max-w-7xl mx-auto mt-xl pt-lg border-t border-outline-variant/10 flex flex-col md:row justify-between items-center gap-md">
          <p className="text-on-surface-variant font-label-sm text-label-sm">© 2024 Champion Hive. All rights reserved.</p>
          <div className="flex gap-lg">
            <span className="material-symbols-outlined text-on-surface-variant hover:text-secondary cursor-pointer transition-colors">public</span>
            <span className="material-symbols-outlined text-on-surface-variant hover:text-secondary cursor-pointer transition-colors">hub</span>
            <span className="material-symbols-outlined text-on-surface-variant hover:text-secondary cursor-pointer transition-colors">podcasts</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
