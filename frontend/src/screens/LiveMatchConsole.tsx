export default function LiveMatchConsole({ data }: { data?: any }) {
  if (!data?.liveMatch) {
    return (
      <OriginalLiveMatchConsole />
    );
  }

  const match = data.liveMatch;
  const events = Array.isArray(data?.liveMatchEvents) ? data.liveMatchEvents : [];

  return (
    <div className="bg-background text-on-background min-h-screen font-body-md">
      {/* TopNavBar */}
      <header className="fixed top-0 w-full z-50 bg-surface-container-high dark:bg-surface-container-high text-secondary dark:text-secondary border-b border-outline-variant shadow-md flex justify-between items-center px-lg py-sm">
        <div className="text-headline-lg font-headline-lg font-bold text-secondary dark:text-secondary">Champion Hive</div>
        <div className="flex items-center space-x-md">
          <div className="hidden md:flex space-x-lg font-headline-md text-headline-md">
            <span className="text-secondary font-bold border-b-2 border-secondary cursor-pointer">Console</span>
            <span className="text-on-surface-variant hover:bg-surface-container-highest transition-colors cursor-pointer px-2 rounded">Matches</span>
            <span className="text-on-surface-variant hover:bg-surface-container-highest transition-colors cursor-pointer px-2 rounded">Reports</span>
            <span className="text-on-surface-variant hover:bg-surface-container-highest transition-colors cursor-pointer px-2 rounded">Stats</span>
          </div>
          <div className="flex items-center space-x-sm">
            <span className="material-symbols-outlined cursor-pointer hover:bg-surface-container-highest p-2 rounded-full">notifications</span>
            <span className="material-symbols-outlined cursor-pointer hover:bg-surface-container-highest p-2 rounded-full">account_circle</span>
          </div>
        </div>
      </header>
      {/* Main Container */}
      <div className="flex pt-20 pb-20 md:pb-0 h-screen overflow-hidden">
        {/* SideNavBar */}
        <aside className="hidden md:flex fixed left-0 top-20 h-[calc(100vh-80px)] w-64 z-40 bg-surface-container-low dark:bg-surface-container-low flex flex-col p-md space-y-xs">
          <div className="flex items-center space-x-sm mb-lg border-b border-outline-variant pb-md">
            <img className="w-12 h-12 rounded-full border-2 border-secondary" data-alt="A professional headshot of a senior sports official in his late 40s, Marcus Thorne. He wears a sleek, black technical sports jacket with subtle reflective accents. The lighting is dramatic and high-contrast, characteristic of a professional sports broadcast environment, with hints of neon green in the background." src="https://lh3.googleusercontent.com/aida/ADBb0ujiyZTtEyuJw5dUzrZG_h0Gh05bJMaJU52DnY2Axa5RdR_AaeQ0hQgE4TZ9GiruoMU8aMdteDTPqD7fQYpS-RS2zYsSUT5kc_NxFWc2lKLWDpL_yjsESNxQGsGlCxH9GxeNY3V8yo5clI3vK9K7kMB8NbD7VZbRigqX-IFG_uPOwkje9_Rym8EaCMSR2Mkj0Ce_CKo9OzMMpwXOmHQzgexPJkle26gSvtHnqguOm9FCLXcojYi0t3MfJ4g8" />
            <div>
              <p className="text-secondary font-headline-md font-bold">Ref. Marcus Thorne</p>
              <p className="text-on-surface-variant text-label-sm font-label-sm">Senior Official</p>
            </div>
          </div>
          <nav className="space-y-xs flex-grow">
            <a className="bg-secondary-container text-on-secondary-container rounded-lg font-bold flex items-center p-sm space-x-sm transition-all duration-200 ease-in-out" href="#">
              <span className="material-symbols-outlined">sports_score</span>
              <span className="font-label-sm text-label-sm">Live Console</span>
            </a>
            <a className="text-on-surface-variant hover:text-on-surface hover:bg-surface-container-highest rounded-lg flex items-center p-sm space-x-sm transition-all duration-200 ease-in-out" href="#">
              <span className="material-symbols-outlined">calendar_today</span>
              <span className="font-label-sm text-label-sm">Schedule</span>
            </a>
            <a className="text-on-surface-variant hover:text-on-surface hover:bg-surface-container-highest rounded-lg flex items-center p-sm space-x-sm transition-all duration-200 ease-in-out" href="#">
              <span className="material-symbols-outlined">description</span>
              <span className="font-label-sm text-label-sm">Reports</span>
            </a>
            <a className="text-on-surface-variant hover:text-on-surface hover:bg-surface-container-highest rounded-lg flex items-center p-sm space-x-sm transition-all duration-200 ease-in-out" href="#">
              <span className="material-symbols-outlined">analytics</span>
              <span className="font-label-sm text-label-sm">Dashboard</span>
            </a>
          </nav>
          <button className="w-full bg-secondary text-on-secondary font-bold py-sm rounded-lg active:scale-95 duration-150 shadow-md">
            Go Live
          </button>
        </aside>
        {/* Content Canvas */}
        <main className="flex-grow md:ml-64 p-md overflow-y-auto bg-background">
          <div className="max-w-6xl mx-auto space-y-md">
            {/* Scoreboard Section */}
            <section className="grid grid-cols-1 lg:grid-cols-3 gap-gutter items-stretch">
              <div className="lg:col-span-2 bg-surface-container-high rounded-xl p-lg border border-outline-variant shadow-lg relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-secondary to-tertiary"></div>
                <div className="flex justify-between items-center mb-md">
                  <span className="flex items-center space-x-xs text-secondary live-pulse">
                    <span className="w-2 h-2 bg-secondary rounded-full"></span>
                    <span className="font-label-sm text-label-sm uppercase tracking-widest">Live Match</span>
                  </span>
                  <span className="text-on-surface-variant font-label-sm text-label-sm">Match ID: {match?.id ?? "—"}</span>
                </div>
                <div className="flex justify-around items-center py-lg">
                  {/* Home Team */}
                  <div className="text-center">
                    <img className="w-24 h-24 mx-auto mb-sm rounded-full border-4 border-surface-container-highest" data-alt="Official logo of the Emerald Falcons football team, featuring a stylized green falcon head with sharp geometric lines. The logo is set against a dark navy background with neon green lighting effects, giving it a modern, high-energy sports branding aesthetic." src="https://lh3.googleusercontent.com/aida/ADBb0ujO9yJ1mf1lHIQtA4IQCj-ZKj5djUf_yDNzld5sL4dvz_uJBjYxegv9MgvIn5o-wxsIy_1TEmxwmx_jRIvneDWgDhvmeSxqBO-namYhpnkAjoxvWgBMXPC3wwrBciF4_W8ULBwr9-Uc9nnKI4ajbq45ZsdKT2gCc8JW1FSY3bxlumBglhuYxQLIZZXq_qY9Cuz9D3k55wy7StbZ7HgZM7PAcrbhTrSqvFRHcGQ14DtwYbHyq22E9wiHHBtC" />
                    <h2 className="font-headline-lg text-headline-lg">{match?.home_team_name ?? "FALCONS"}</h2>
                    <span className="font-display-xl text-display-xl text-secondary">{match?.home_score ?? 0}</span>
                  </div>
                  {/* Timer */}
                  <div className="text-center px-lg border-x border-outline-variant">
                    <p className="font-label-sm text-label-sm text-on-surface-variant mb-xs">{match?.status ?? "FIRST HALF"}</p>
                    <div className="font-display-xl text-display-xl text-on-surface tracking-tighter">42:18</div>
                    <button className="mt-sm material-symbols-outlined text-secondary text-4xl active:scale-90 duration-150">pause_circle</button>
                  </div>
                  {/* Away Team */}
                  <div className="text-center">
                    <img className="w-24 h-24 mx-auto mb-sm rounded-full border-4 border-surface-container-highest" data-alt="Official logo of the Thunder Striking club, showcasing a bold orange lightning bolt integrated into a classic shield shape. The visual style is sleek and corporate, with high-contrast metallic textures and a glowing orange aura against a dark slate background." src="https://lh3.googleusercontent.com/aida/ADBb0ujiyZTtEyuJw5dUzrZG_h0Gh05bJMaJU52DnY2Axa5RdR_AaeQ0hQgE4TZ9GiruoMU8aMdteDTPqD7fQYpS-RS2zYsSUT5kc_NxFWc2lKLWDpL_yjsESNxQGsGlCxH9GxeNY3V8yo5clI3vK9K7kMB8NbD7VZbRigqX-IFG_uPOwkje9_Rym8EaCMSR2Mkj0Ce_CKo9OzMMpwXOmHQzgexPJkle26gSvtHnqguOm9FCLXcojYi0t3MfJ4g8" />
                    <h2 className="font-headline-lg text-headline-lg">{match?.away_team_name ?? "THUNDER"}</h2>
                    <span className="font-display-xl text-display-xl text-tertiary">{match?.away_score ?? 0}</span>
                  </div>
                </div>
              </div>
              {/* Quick Actions Grid */}
              <div className="bg-surface-container-high rounded-xl p-md border border-outline-variant shadow-lg flex flex-col justify-between">
                <h3 className="font-headline-md text-headline-md mb-md flex items-center border-b border-outline-variant pb-xs">
                  <span className="material-symbols-outlined mr-xs">touch_app</span> Quick Actions
                </h3>
                <div className="grid grid-cols-2 gap-sm">
                  <button className="flex flex-col items-center justify-center bg-secondary-container hover:bg-secondary text-on-secondary-container p-md rounded-lg active:scale-95 transition-all">
                    <span className="material-symbols-outlined text-3xl">sports_soccer</span>
                    <span className="font-label-sm text-label-sm mt-xs">Add Goal</span>
                  </button>
                  <button className="flex flex-col items-center justify-center border border-tertiary text-tertiary hover:bg-tertiary hover:text-on-tertiary p-md rounded-lg active:scale-95 transition-all">
                    <span className="material-symbols-outlined text-3xl">warning</span>
                    <span className="font-label-sm text-label-sm mt-xs">Foul</span>
                  </button>
                  <button className="flex flex-col items-center justify-center bg-yellow-500 text-black p-md rounded-lg active:scale-95 transition-all">
                    <span className="material-symbols-outlined text-3xl">style</span>
                    <span className="font-label-sm text-label-sm mt-xs">Yellow Card</span>
                  </button>
                  <button className="flex flex-col items-center justify-center bg-red-600 text-white p-md rounded-lg active:scale-95 transition-all">
                    <span className="material-symbols-outlined text-3xl">style</span>
                    <span className="font-label-sm text-label-sm mt-xs">Red Card</span>
                  </button>
                  <button className="col-span-2 flex items-center justify-center bg-surface-container-highest hover:bg-outline-variant text-on-surface p-sm rounded-lg active:scale-95 transition-all">
                    <span className="material-symbols-outlined mr-sm">swap_horiz</span>
                    <span className="font-label-sm text-label-sm">Substitution</span>
                  </button>
                </div>
              </div>
            </section>
            {/* Main Workspace: Event Selection & Log */}
            <section className="grid grid-cols-1 lg:grid-cols-3 gap-gutter">
              {/* Event Configuration / Selection */}
              <div className="lg:col-span-2 space-y-md">
                <div className="bg-surface-container rounded-xl p-md border border-outline-variant">
                  <div className="flex justify-between items-center mb-md">
                    <h3 className="font-headline-md text-headline-md">Active Selection: Goal</h3>
                    <span className="text-secondary font-label-sm text-label-sm">Step 1: Select Scorer</span>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-sm">
                    {/* Player Card */}
                    <div className="bg-surface-container-low border border-outline-variant p-sm rounded-lg flex items-center space-x-sm cursor-pointer hover:border-secondary transition-colors">
                      <img className="w-10 h-10 rounded-full" data-alt="A focused young athlete with short dark hair, wearing a high-performance green jersey. The shot is captured in a stadium tunnel with moody, cinematic lighting and vibrant neon green accents highlighting the contours of the athlete's face." src="https://lh3.googleusercontent.com/aida/ADBb0ugAslubqau1if-Y7ldh0EkOQy0DB96ef6kXXkQ3470IVP0Gepn5A7WdGmZFd22WhVaEvNxmFG6CGsSdebIi-BDS6sdQ2wKMjuxW8OSNXiqGxY9dvQRqnmmHYe6rbP5etCHFmemp9D1zRPBqKXrNaTZqWNJgsVfcTiPUkptifYp9LaFDmrvbVJk0Zcg-nt1zMaVQdSWYMXoIvp_PzX4-cuWUf-V1WJcDxe5a-R2WuWiRnmlFlkn2FOCI63qm" />
                      <div>
                        <p className="font-label-sm text-label-sm">J. Smith</p>
                        <p className="text-on-surface-variant text-[10px]">#09 • Forward</p>
                      </div>
                    </div>
                    <div className="bg-surface-container-low border border-outline-variant p-sm rounded-lg flex items-center space-x-sm cursor-pointer hover:border-secondary transition-colors">
                      <img className="w-10 h-10 rounded-full" data-alt="Close-up portrait of a professional soccer player with a determined expression. High-key studio lighting with a dark, slate-blue background. The player is wearing a white away jersey with a sleek orange logo." src="https://lh3.googleusercontent.com/aida/ADBb0uhXHOsDYIg8Ce-sVc08yTmMfkdyY0VE_YZDjIYZQpF3TwInIyGMSxcg4FbaoZ8I2FoWhkmP2KklaMAlHm6jfu0kdKUgOoUgHIa67ZUQNS_xRY6ACqkVdcLeZ9c3FFtyIQpgGVJtbEAIFh6F9PmgrCufvrrzGCeVPfvJmKv7Us3hxvTBWIHOCZk-60mZ_9_cpHWNyO-hLPZRRshCii3wPq_qL2HjdNGb75ayXLrCIOZlu2Bd_PjYB_Uil4Q" />
                      <div>
                        <p className="font-label-sm text-label-sm">M. Ross</p>
                        <p className="text-on-surface-variant text-[10px]">#07 • Winger</p>
                      </div>
                    </div>
                    <div className="bg-secondary-container border-2 border-secondary p-sm rounded-lg flex items-center space-x-sm cursor-pointer">
                      <img className="w-10 h-10 rounded-full" data-alt="Dynamic shot of a goalkeeper in mid-action, wearing a bright neon orange uniform. The setting is a night game at a high-end stadium with intense floodlights creating long shadows and vibrant flares. High-contrast athletic atmosphere." src="https://lh3.googleusercontent.com/aida/ADBb0ujlA1I4-0eqo5nUdBuHbXtCvmJQbRK4FbJ72DYUxHAE-xXo0KYtMsNJKBakYbrpyAB9o0ejxHvl0Z6SUP4-cjjDHwGye4gJaLBuOLQ2Em5qUFZJlb1_Jp12v2zrkoOa5A6csX4cMYPaOaXPhX5XrWmTQB5HjlJzx8KwRs8JAvbXHx-Udq7xQJVVU56m3m5Y8xIekDyV6UU4M6dDufyWWaEDxsSuUvl8txYqCxbwdoLJXWNlOoLPpPi1XNDK" />
                      <div>
                        <p className="font-on-secondary-container font-bold text-label-sm">L. Kante</p>
                        <p className="text-on-secondary-fixed-variant text-[10px]">#21 • Midfield</p>
                      </div>
                    </div>
                    {/* More players... */}
                    <div className="bg-surface-container-low border border-outline-variant p-sm rounded-lg flex items-center space-x-sm cursor-pointer hover:border-secondary transition-colors">
                      <div className="w-10 h-10 bg-surface-container-highest rounded-full flex items-center justify-center font-bold text-secondary">AM</div>
                      <div>
                        <p className="font-label-sm text-label-sm">A. Miller</p>
                        <p className="text-on-surface-variant text-[10px]">#03 • Defense</p>
                      </div>
                    </div>
                    <div className="bg-surface-container-low border border-outline-variant p-sm rounded-lg flex items-center space-x-sm cursor-pointer hover:border-secondary transition-colors">
                      <div className="w-10 h-10 bg-surface-container-highest rounded-full flex items-center justify-center font-bold text-secondary">TP</div>
                      <div>
                        <p className="font-label-sm text-label-sm">T. Park</p>
                        <p className="text-on-surface-variant text-[10px]">#11 • Forward</p>
                      </div>
                    </div>
                    <div className="bg-surface-container-low border border-outline-variant p-sm rounded-lg flex items-center space-x-sm cursor-pointer hover:border-secondary transition-colors">
                      <div className="w-10 h-10 bg-surface-container-highest rounded-full flex items-center justify-center font-bold text-secondary">SD</div>
                      <div>
                        <p className="font-label-sm text-label-sm">S. Diaz</p>
                        <p className="text-on-surface-variant text-[10px]">#05 • Midfield</p>
                      </div>
                    </div>
                  </div>
                  <div className="mt-lg flex space-x-md">
                    <button className="flex-grow bg-secondary text-on-secondary font-bold py-md rounded-lg active:scale-95 duration-150 neon-glow">
                      CONFIRM EVENT
                    </button>
                    <button className="px-lg border border-outline-variant text-on-surface-variant font-bold rounded-lg hover:bg-surface-container-highest transition-colors">
                      CANCEL
                    </button>
                  </div>
                </div>
                {/* Footer Controls */}
                <div className="flex flex-col md:flex-row gap-sm">
                  <button className="flex-1 bg-surface-container-high border-2 border-tertiary text-tertiary font-bold py-md rounded-xl flex items-center justify-center space-x-sm active:scale-95 duration-150">
                    <span className="material-symbols-outlined">cancel</span>
                    <span>End Match</span>
                  </button>
                  <button className="flex-1 bg-surface-container-high border-2 border-secondary text-secondary font-bold py-md rounded-xl flex items-center justify-center space-x-sm active:scale-95 duration-150">
                    <span className="material-symbols-outlined">assignment</span>
                    <span>Generate Match Report</span>
                  </button>
                </div>
              </div>
              {/* Live Log Section */}
              <div className="bg-surface-container-high rounded-xl p-md border border-outline-variant shadow-lg h-full min-h-[400px] flex flex-col">
                <h3 className="font-headline-md text-headline-md mb-md flex items-center">
                  <span className="material-symbols-outlined mr-xs">history</span> Live Log
                </h3>
                <div className="space-y-sm overflow-y-auto flex-grow pr-xs custom-scrollbar">
                  {events.map((event: any, index: number) => (
                    /* Log Entry */
                    <div key={event?.id ?? index} className="flex items-start space-x-sm p-sm bg-surface-container-low rounded-lg border-l-4 border-secondary">
                      <span className="font-stats-numeric text-stats-numeric text-secondary w-8">{event?.event_data?.kind ?? "•"}</span>
                      <div className="flex-grow">
                        <p className="font-bold text-on-surface">{event?.event_type ?? "Event"}{event?.event_data?.team ? ` - ${event.event_data.team}` : ""}</p>
                        <p className="text-on-surface-variant text-label-sm">{event?.player_id ? `Player ${event.player_id}` : ""}</p>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="mt-md pt-md border-t border-outline-variant text-center">
                  <button className="text-on-surface-variant hover:text-secondary font-label-sm text-label-sm uppercase transition-colors">
                    View Full Timeline
                  </button>
                </div>
              </div>
            </section>
          </div>
        </main>
      </div>
      {/* BottomNavBar (Mobile Only) */}
      <nav className="md:hidden fixed bottom-0 left-0 w-full bg-surface-container-highest flex justify-around items-center p-xs z-50 rounded-t-xl border-t border-outline-variant shadow-lg">
        <div className="flex flex-col items-center justify-center bg-secondary text-on-secondary rounded-xl px-4 py-1 active:scale-90 duration-200">
          <span className="material-symbols-outlined">sports</span>
          <span className="font-label-sm text-label-sm">Console</span>
        </div>
        <div className="flex flex-col items-center justify-center text-on-surface-variant hover:text-secondary active:scale-90 duration-200">
          <span className="material-symbols-outlined">event_note</span>
          <span className="font-label-sm text-label-sm">Matches</span>
        </div>
        <div className="flex flex-col items-center justify-center text-on-surface-variant hover:text-secondary active:scale-90 duration-200">
          <span className="material-symbols-outlined">history_edu</span>
          <span className="font-label-sm text-label-sm">Reports</span>
        </div>
        <div className="flex flex-col items-center justify-center text-on-surface-variant hover:text-secondary active:scale-90 duration-200">
          <span className="material-symbols-outlined">query_stats</span>
          <span className="font-label-sm text-label-sm">Stats</span>
        </div>
      </nav>
    </div>
  );
}

function OriginalLiveMatchConsole() {
  return (
    <div className="bg-background text-on-background min-h-screen font-body-md">
      {/* TopNavBar */}
      <header className="fixed top-0 w-full z-50 bg-surface-container-high dark:bg-surface-container-high text-secondary dark:text-secondary border-b border-outline-variant shadow-md flex justify-between items-center px-lg py-sm">
        <div className="text-headline-lg font-headline-lg font-bold text-secondary dark:text-secondary">Champion Hive</div>
        <div className="flex items-center space-x-md">
          <div className="hidden md:flex space-x-lg font-headline-md text-headline-md">
            <span className="text-secondary font-bold border-b-2 border-secondary cursor-pointer">Console</span>
            <span className="text-on-surface-variant hover:bg-surface-container-highest transition-colors cursor-pointer px-2 rounded">Matches</span>
            <span className="text-on-surface-variant hover:bg-surface-container-highest transition-colors cursor-pointer px-2 rounded">Reports</span>
            <span className="text-on-surface-variant hover:bg-surface-container-highest transition-colors cursor-pointer px-2 rounded">Stats</span>
          </div>
          <div className="flex items-center space-x-sm">
            <span className="material-symbols-outlined cursor-pointer hover:bg-surface-container-highest p-2 rounded-full">notifications</span>
            <span className="material-symbols-outlined cursor-pointer hover:bg-surface-container-highest p-2 rounded-full">account_circle</span>
          </div>
        </div>
      </header>
      {/* Main Container */}
      <div className="flex pt-20 pb-20 md:pb-0 h-screen overflow-hidden">
        {/* SideNavBar */}
        <aside className="hidden md:flex fixed left-0 top-20 h-[calc(100vh-80px)] w-64 z-40 bg-surface-container-low dark:bg-surface-container-low flex flex-col p-md space-y-xs">
          <div className="flex items-center space-x-sm mb-lg border-b border-outline-variant pb-md">
            <img className="w-12 h-12 rounded-full border-2 border-secondary" data-alt="A professional headshot of a senior sports official in his late 40s, Marcus Thorne. He wears a sleek, black technical sports jacket with subtle reflective accents. The lighting is dramatic and high-contrast, characteristic of a professional sports broadcast environment, with hints of neon green in the background." src="https://lh3.googleusercontent.com/aida/ADBb0ujiyZTtEyuJw5dUzrZG_h0Gh05bJMaJU52DnY2Axa5RdR_AaeQ0hQgE4TZ9GiruoMU8aMdteDTPqD7fQYpS-RS2zYsSUT5kc_NxFWc2lKLWDpL_yjsESNxQGsGlCxH9GxeNY3V8yo5clI3vK9K7kMB8NbD7VZbRigqX-IFG_uPOwkje9_Rym8EaCMSR2Mkj0Ce_CKo9OzMMpwXOmHQzgexPJkle26gSvtHnqguOm9FCLXcojYi0t3MfJ4g8" />
            <div>
              <p className="text-secondary font-headline-md font-bold">Ref. Marcus Thorne</p>
              <p className="text-on-surface-variant text-label-sm font-label-sm">Senior Official</p>
            </div>
          </div>
          <nav className="space-y-xs flex-grow">
            <a className="bg-secondary-container text-on-secondary-container rounded-lg font-bold flex items-center p-sm space-x-sm transition-all duration-200 ease-in-out" href="#">
              <span className="material-symbols-outlined">sports_score</span>
              <span className="font-label-sm text-label-sm">Live Console</span>
            </a>
            <a className="text-on-surface-variant hover:text-on-surface hover:bg-surface-container-highest rounded-lg flex items-center p-sm space-x-sm transition-all duration-200 ease-in-out" href="#">
              <span className="material-symbols-outlined">calendar_today</span>
              <span className="font-label-sm text-label-sm">Schedule</span>
            </a>
            <a className="text-on-surface-variant hover:text-on-surface hover:bg-surface-container-highest rounded-lg flex items-center p-sm space-x-sm transition-all duration-200 ease-in-out" href="#">
              <span className="material-symbols-outlined">description</span>
              <span className="font-label-sm text-label-sm">Reports</span>
            </a>
            <a className="text-on-surface-variant hover:text-on-surface hover:bg-surface-container-highest rounded-lg flex items-center p-sm space-x-sm transition-all duration-200 ease-in-out" href="#">
              <span className="material-symbols-outlined">analytics</span>
              <span className="font-label-sm text-label-sm">Dashboard</span>
            </a>
          </nav>
          <button className="w-full bg-secondary text-on-secondary font-bold py-sm rounded-lg active:scale-95 duration-150 shadow-md">
            Go Live
          </button>
        </aside>
        {/* Content Canvas */}
        <main className="flex-grow md:ml-64 p-md overflow-y-auto bg-background">
          <div className="max-w-6xl mx-auto space-y-md">
            {/* Scoreboard Section */}
            <section className="grid grid-cols-1 lg:grid-cols-3 gap-gutter items-stretch">
              <div className="lg:col-span-2 bg-surface-container-high rounded-xl p-lg border border-outline-variant shadow-lg relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-secondary to-tertiary"></div>
                <div className="flex justify-between items-center mb-md">
                  <span className="flex items-center space-x-xs text-secondary live-pulse">
                    <span className="w-2 h-2 bg-secondary rounded-full"></span>
                    <span className="font-label-sm text-label-sm uppercase tracking-widest">Live Match</span>
                  </span>
                  <span className="text-on-surface-variant font-label-sm text-label-sm">Match ID: CH-4821</span>
                </div>
                <div className="flex justify-around items-center py-lg">
                  {/* Home Team */}
                  <div className="text-center">
                    <img className="w-24 h-24 mx-auto mb-sm rounded-full border-4 border-surface-container-highest" data-alt="Official logo of the Emerald Falcons football team, featuring a stylized green falcon head with sharp geometric lines. The logo is set against a dark navy background with neon green lighting effects, giving it a modern, high-energy sports branding aesthetic." src="https://lh3.googleusercontent.com/aida/ADBb0ujO9yJ1mf1lHIQtA4IQCj-ZKj5djUf_yDNzld5sL4dvz_uJBjYxegv9MgvIn5o-wxsIy_1TEmxwmx_jRIvneDWgDhvmeSxqBO-namYhpnkAjoxvWgBMXPC3wwrBciF4_W8ULBwr9-Uc9nnKI4ajbq45ZsdKT2gCc8JW1FSY3bxlumBglhuYxQLIZZXq_qY9Cuz9D3k55wy7StbZ7HgZM7PAcrbhTrSqvFRHcGQ14DtwYbHyq22E9wiHHBtC" />
                    <h2 className="font-headline-lg text-headline-lg">FALCONS</h2>
                    <span className="font-display-xl text-display-xl text-secondary">2</span>
                  </div>
                  {/* Timer */}
                  <div className="text-center px-lg border-x border-outline-variant">
                    <p className="font-label-sm text-label-sm text-on-surface-variant mb-xs">FIRST HALF</p>
                    <div className="font-display-xl text-display-xl text-on-surface tracking-tighter">42:18</div>
                    <button className="mt-sm material-symbols-outlined text-secondary text-4xl active:scale-90 duration-150">pause_circle</button>
                  </div>
                  {/* Away Team */}
                  <div className="text-center">
                    <img className="w-24 h-24 mx-auto mb-sm rounded-full border-4 border-surface-container-highest" data-alt="Official logo of the Thunder Striking club, showcasing a bold orange lightning bolt integrated into a classic shield shape. The visual style is sleek and corporate, with high-contrast metallic textures and a glowing orange aura against a dark slate background." src="https://lh3.googleusercontent.com/aida/ADBb0ujiyZTtEyuJw5dUzrZG_h0Gh05bJMaJU52DnY2Axa5RdR_AaeQ0hQgE4TZ9GiruoMU8aMdteDTPqD7fQYpS-RS2zYsSUT5kc_NxFWc2lKLWDpL_yjsESNxQGsGlCxH9GxeNY3V8yo5clI3vK9K7kMB8NbD7VZbRigqX-IFG_uPOwkje9_Rym8EaCMSR2Mkj0Ce_CKo9OzMMpwXOmHQzgexPJkle26gSvtHnqguOm9FCLXcojYi0t3MfJ4g8" />
                    <h2 className="font-headline-lg text-headline-lg">THUNDER</h2>
                    <span className="font-display-xl text-display-xl text-tertiary">1</span>
                  </div>
                </div>
              </div>
              {/* Quick Actions Grid */}
              <div className="bg-surface-container-high rounded-xl p-md border border-outline-variant shadow-lg flex flex-col justify-between">
                <h3 className="font-headline-md text-headline-md mb-md flex items-center border-b border-outline-variant pb-xs">
                  <span className="material-symbols-outlined mr-xs">touch_app</span> Quick Actions
                </h3>
                <div className="grid grid-cols-2 gap-sm">
                  <button className="flex flex-col items-center justify-center bg-secondary-container hover:bg-secondary text-on-secondary-container p-md rounded-lg active:scale-95 transition-all">
                    <span className="material-symbols-outlined text-3xl">sports_soccer</span>
                    <span className="font-label-sm text-label-sm mt-xs">Add Goal</span>
                  </button>
                  <button className="flex flex-col items-center justify-center border border-tertiary text-tertiary hover:bg-tertiary hover:text-on-tertiary p-md rounded-lg active:scale-95 transition-all">
                    <span className="material-symbols-outlined text-3xl">warning</span>
                    <span className="font-label-sm text-label-sm mt-xs">Foul</span>
                  </button>
                  <button className="flex flex-col items-center justify-center bg-yellow-500 text-black p-md rounded-lg active:scale-95 transition-all">
                    <span className="material-symbols-outlined text-3xl">style</span>
                    <span className="font-label-sm text-label-sm mt-xs">Yellow Card</span>
                  </button>
                  <button className="flex flex-col items-center justify-center bg-red-600 text-white p-md rounded-lg active:scale-95 transition-all">
                    <span className="material-symbols-outlined text-3xl">style</span>
                    <span className="font-label-sm text-label-sm mt-xs">Red Card</span>
                  </button>
                  <button className="col-span-2 flex items-center justify-center bg-surface-container-highest hover:bg-outline-variant text-on-surface p-sm rounded-lg active:scale-95 transition-all">
                    <span className="material-symbols-outlined mr-sm">swap_horiz</span>
                    <span className="font-label-sm text-label-sm">Substitution</span>
                  </button>
                </div>
              </div>
            </section>
            {/* Main Workspace: Event Selection & Log */}
            <section className="grid grid-cols-1 lg:grid-cols-3 gap-gutter">
              {/* Event Configuration / Selection */}
              <div className="lg:col-span-2 space-y-md">
                <div className="bg-surface-container rounded-xl p-md border border-outline-variant">
                  <div className="flex justify-between items-center mb-md">
                    <h3 className="font-headline-md text-headline-md">Active Selection: Goal</h3>
                    <span className="text-secondary font-label-sm text-label-sm">Step 1: Select Scorer</span>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-sm">
                    {/* Player Card */}
                    <div className="bg-surface-container-low border border-outline-variant p-sm rounded-lg flex items-center space-x-sm cursor-pointer hover:border-secondary transition-colors">
                      <img className="w-10 h-10 rounded-full" data-alt="A focused young athlete with short dark hair, wearing a high-performance green jersey. The shot is captured in a stadium tunnel with moody, cinematic lighting and vibrant neon green accents highlighting the contours of the athlete's face." src="https://lh3.googleusercontent.com/aida/ADBb0ugAslubqau1if-Y7ldh0EkOQy0DB96ef6kXXkQ3470IVP0Gepn5A7WdGmZFd22WhVaEvNxmFG6CGsSdebIi-BDS6sdQ2wKMjuxW8OSNXiqGxY9dvQRqnmmHYe6rbP5etCHFmemp9D1zRPBqKXrNaTZqWNJgsVfcTiPUkptifYp9LaFDmrvbVJk0Zcg-nt1zMaVQdSWYMXoIvp_PzX4-cuWUf-V1WJcDxe5a-R2WuWiRnmlFlkn2FOCI63qm" />
                      <div>
                        <p className="font-label-sm text-label-sm">J. Smith</p>
                        <p className="text-on-surface-variant text-[10px]">#09 • Forward</p>
                      </div>
                    </div>
                    <div className="bg-surface-container-low border border-outline-variant p-sm rounded-lg flex items-center space-x-sm cursor-pointer hover:border-secondary transition-colors">
                      <img className="w-10 h-10 rounded-full" data-alt="Close-up portrait of a professional soccer player with a determined expression. High-key studio lighting with a dark, slate-blue background. The player is wearing a white away jersey with a sleek orange logo." src="https://lh3.googleusercontent.com/aida/ADBb0uhXHOsDYIg8Ce-sVc08yTmMfkdyY0VE_YZDjIYZQpF3TwInIyGMSxcg4FbaoZ8I2FoWhkmP2KklaMAlHm6jfu0kdKUgOoUgHIa67ZUQNS_xRY6ACqkVdcLeZ9c3FFtyIQpgGVJtbEAIFh6F9PmgrCufvrrzGCeVPfvJmKv7Us3hxvTBWIHOCZk-60mZ_9_cpHWNyO-hLPZRRshCii3wPq_qL2HjdNGb75ayXLrCIOZlu2Bd_PjYB_Uil4Q" />
                      <div>
                        <p className="font-label-sm text-label-sm">M. Ross</p>
                        <p className="text-on-surface-variant text-[10px]">#07 • Winger</p>
                      </div>
                    </div>
                    <div className="bg-secondary-container border-2 border-secondary p-sm rounded-lg flex items-center space-x-sm cursor-pointer">
                      <img className="w-10 h-10 rounded-full" data-alt="Dynamic shot of a goalkeeper in mid-action, wearing a bright neon orange uniform. The setting is a night game at a high-end stadium with intense floodlights creating long shadows and vibrant flares. High-contrast athletic atmosphere." src="https://lh3.googleusercontent.com/aida/ADBb0ujlA1I4-0eqo5nUdBuHbXtCvmJQbRK4FbJ72DYUxHAE-xXo0KYtMsNJKBakYbrpyAB9o0ejxHvl0Z6SUP4-cjjDHwGye4gJaLBuOLQ2Em5qUFZJlb1_Jp12v2zrkoOa5A6csX4cMYPaOaXPhX5XrWmTQB5HjlJzx8KwRs8JAvbXHx-Udq7xQJVVU56m3m5Y8xIekDyV6UU4M6dDufyWWaEDxsSuUvl8txYqCxbwdoLJXWNlOoLPpPi1XNDK" />
                      <div>
                        <p className="font-on-secondary-container font-bold text-label-sm">L. Kante</p>
                        <p className="text-on-secondary-fixed-variant text-[10px]">#21 • Midfield</p>
                      </div>
                    </div>
                    {/* More players... */}
                    <div className="bg-surface-container-low border border-outline-variant p-sm rounded-lg flex items-center space-x-sm cursor-pointer hover:border-secondary transition-colors">
                      <div className="w-10 h-10 bg-surface-container-highest rounded-full flex items-center justify-center font-bold text-secondary">AM</div>
                      <div>
                        <p className="font-label-sm text-label-sm">A. Miller</p>
                        <p className="text-on-surface-variant text-[10px]">#03 • Defense</p>
                      </div>
                    </div>
                    <div className="bg-surface-container-low border border-outline-variant p-sm rounded-lg flex items-center space-x-sm cursor-pointer hover:border-secondary transition-colors">
                      <div className="w-10 h-10 bg-surface-container-highest rounded-full flex items-center justify-center font-bold text-secondary">TP</div>
                      <div>
                        <p className="font-label-sm text-label-sm">T. Park</p>
                        <p className="text-on-surface-variant text-[10px]">#11 • Forward</p>
                      </div>
                    </div>
                    <div className="bg-surface-container-low border border-outline-variant p-sm rounded-lg flex items-center space-x-sm cursor-pointer hover:border-secondary transition-colors">
                      <div className="w-10 h-10 bg-surface-container-highest rounded-full flex items-center justify-center font-bold text-secondary">SD</div>
                      <div>
                        <p className="font-label-sm text-label-sm">S. Diaz</p>
                        <p className="text-on-surface-variant text-[10px]">#05 • Midfield</p>
                      </div>
                    </div>
                  </div>
                  <div className="mt-lg flex space-x-md">
                    <button className="flex-grow bg-secondary text-on-secondary font-bold py-md rounded-lg active:scale-95 duration-150 neon-glow">
                      CONFIRM EVENT
                    </button>
                    <button className="px-lg border border-outline-variant text-on-surface-variant font-bold rounded-lg hover:bg-surface-container-highest transition-colors">
                      CANCEL
                    </button>
                  </div>
                </div>
                {/* Footer Controls */}
                <div className="flex flex-col md:flex-row gap-sm">
                  <button className="flex-1 bg-surface-container-high border-2 border-tertiary text-tertiary font-bold py-md rounded-xl flex items-center justify-center space-x-sm active:scale-95 duration-150">
                    <span className="material-symbols-outlined">cancel</span>
                    <span>End Match</span>
                  </button>
                  <button className="flex-1 bg-surface-container-high border-2 border-secondary text-secondary font-bold py-md rounded-xl flex items-center justify-center space-x-sm active:scale-95 duration-150">
                    <span className="material-symbols-outlined">assignment</span>
                    <span>Generate Match Report</span>
                  </button>
                </div>
              </div>
              {/* Live Log Section */}
              <div className="bg-surface-container-high rounded-xl p-md border border-outline-variant shadow-lg h-full min-h-[400px] flex flex-col">
                <h3 className="font-headline-md text-headline-md mb-md flex items-center">
                  <span className="material-symbols-outlined mr-xs">history</span> Live Log
                </h3>
                <div className="space-y-sm overflow-y-auto flex-grow pr-xs custom-scrollbar">
                  {/* Log Entry */}
                  <div className="flex items-start space-x-sm p-sm bg-surface-container-low rounded-lg border-l-4 border-secondary">
                    <span className="font-stats-numeric text-stats-numeric text-secondary w-8">41'</span>
                    <div className="flex-grow">
                      <p className="font-bold text-on-surface">Goal - Falcons</p>
                      <p className="text-on-surface-variant text-label-sm">L. Kante (#21) • Assist by M. Ross</p>
                    </div>
                  </div>
                  {/* Log Entry */}
                  <div className="flex items-start space-x-sm p-sm bg-surface-container-low rounded-lg border-l-4 border-yellow-500">
                    <span className="font-stats-numeric text-stats-numeric text-yellow-500 w-8">32'</span>
                    <div className="flex-grow">
                      <p className="font-bold text-on-surface">Yellow Card - Thunder</p>
                      <p className="text-on-surface-variant text-label-sm">J. Doe (#14) • Reckless Tackle</p>
                    </div>
                  </div>
                  {/* Log Entry */}
                  <div className="flex items-start space-x-sm p-sm bg-surface-container-low rounded-lg border-l-4 border-secondary">
                    <span className="font-stats-numeric text-stats-numeric text-secondary w-8">18'</span>
                    <div className="flex-grow">
                      <p className="font-bold text-on-surface">Goal - Falcons</p>
                      <p className="text-on-surface-variant text-label-sm">J. Smith (#09) • Penalty</p>
                    </div>
                  </div>
                  {/* Log Entry */}
                  <div className="flex items-start space-x-sm p-sm bg-surface-container-low rounded-lg border-l-4 border-tertiary">
                    <span className="font-stats-numeric text-stats-numeric text-tertiary w-8">04'</span>
                    <div className="flex-grow">
                      <p className="font-bold text-on-surface">Goal - Thunder</p>
                      <p className="text-on-surface-variant text-label-sm">B. Wright (#10) • Long Range</p>
                    </div>
                  </div>
                </div>
                <div className="mt-md pt-md border-t border-outline-variant text-center">
                  <button className="text-on-surface-variant hover:text-secondary font-label-sm text-label-sm uppercase transition-colors">
                    View Full Timeline
                  </button>
                </div>
              </div>
            </section>
          </div>
        </main>
      </div>
      {/* BottomNavBar (Mobile Only) */}
      <nav className="md:hidden fixed bottom-0 left-0 w-full bg-surface-container-highest flex justify-around items-center p-xs z-50 rounded-t-xl border-t border-outline-variant shadow-lg">
        <div className="flex flex-col items-center justify-center bg-secondary text-on-secondary rounded-xl px-4 py-1 active:scale-90 duration-200">
          <span className="material-symbols-outlined">sports</span>
          <span className="font-label-sm text-label-sm">Console</span>
        </div>
        <div className="flex flex-col items-center justify-center text-on-surface-variant hover:text-secondary active:scale-90 duration-200">
          <span className="material-symbols-outlined">event_note</span>
          <span className="font-label-sm text-label-sm">Matches</span>
        </div>
        <div className="flex flex-col items-center justify-center text-on-surface-variant hover:text-secondary active:scale-90 duration-200">
          <span className="material-symbols-outlined">history_edu</span>
          <span className="font-label-sm text-label-sm">Reports</span>
        </div>
        <div className="flex flex-col items-center justify-center text-on-surface-variant hover:text-secondary active:scale-90 duration-200">
          <span className="material-symbols-outlined">query_stats</span>
          <span className="font-label-sm text-label-sm">Stats</span>
        </div>
      </nav>
    </div>
  );
}
