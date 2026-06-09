export default function RefereeSchedule() {
  return (
    <div className="bg-background text-on-background font-body-md min-h-screen">
      {/* TopNavBar */}
      <header className="bg-surface-container-high dark:bg-surface-container-high fixed top-0 w-full z-50 shadow-md border-b border-outline-variant flex justify-between items-center px-lg py-sm">
        <div className="flex items-center gap-md">
          <span className="text-headline-lg font-headline-lg font-bold text-secondary dark:text-secondary">Champion Hive</span>
        </div>
        <div className="hidden md:flex flex-1 max-w-md mx-xl px-sm py-xs bg-surface-container-highest rounded-lg border border-outline-variant items-center gap-xs">
          <span className="material-symbols-outlined text-on-surface-variant">search</span>
          <input className="bg-transparent border-none focus:ring-0 text-on-surface-variant w-full font-label-sm" placeholder="Search matches..." type="text" />
        </div>
        <div className="flex items-center gap-md">
          <button className="relative p-xs hover:bg-surface-container-highest transition-colors rounded-full active:scale-95 duration-150">
            <span className="material-symbols-outlined text-on-surface-variant">notifications</span>
            <span className="absolute top-1 right-1 w-2 h-2 bg-tertiary rounded-full"></span>
          </button>
          <div className="flex items-center gap-sm">
            <img className="w-8 h-8 rounded-full border-2 border-secondary" data-alt="A professional profile portrait of a sports official in a dark room with dramatic neon green lighting highlights. The official is wearing a sleek, modern athletic uniform, projecting authority and focus. The background is a blurred high-tech stadium environment with deep navy and charcoal tones, maintaining a premium corporate sports aesthetic." src="https://lh3.googleusercontent.com/aida/ADBb0ujiyZTtEyuJw5dUzrZG_h0Gh05bJMaJU52DnY2Axa5RdR_AaeQ0hQgE4TZ9GiruoMU8aMdteDTPqD7fQYpS-RS2zYsSUT5kc_NxFWc2lKLWDpL_yjsESNxQGsGlCxH9GxeNY3V8yo5clI3vK9K7kMB8NbD7VZbRigqX-IFG_uPOwkje9_Rym8EaCMSR2Mkj0Ce_CKo9OzMMpwXOmHQzgexPJkle26gSvtHnqguOm9FCLXcojYi0t3MfJ4g8" />
            <span className="material-symbols-outlined text-on-surface-variant">account_circle</span>
          </div>
        </div>
      </header>
      {/* SideNavBar (Desktop) */}
      <nav className="hidden md:flex fixed left-0 top-0 h-full w-64 z-40 bg-surface-container-low dark:bg-surface-container-low flex-col p-md space-y-xs pt-32">
        <div className="mb-xl px-sm">
          <p className="text-secondary font-headline-md font-headline-md">Ref. Marcus Thorne</p>
          <p className="text-on-surface-variant font-label-sm text-label-sm">Senior Official</p>
        </div>
        <a className="flex items-center gap-sm p-sm text-on-surface-variant hover:bg-surface-container-highest rounded-lg transition-all duration-200 ease-in-out group" href="#">
          <span className="material-symbols-outlined group-hover:text-secondary">sports_score</span>
          <span className="font-label-sm text-label-sm">Live Console</span>
        </a>
        <a className="flex items-center gap-sm p-sm bg-secondary-container text-on-secondary-container rounded-lg font-bold transition-all duration-200 ease-in-out" href="#">
          <span className="material-symbols-outlined">calendar_today</span>
          <span className="font-label-sm text-label-sm">Schedule</span>
        </a>
        <a className="flex items-center gap-sm p-sm text-on-surface-variant hover:bg-surface-container-highest rounded-lg transition-all duration-200 ease-in-out group" href="#">
          <span className="material-symbols-outlined group-hover:text-secondary">description</span>
          <span className="font-label-sm text-label-sm">Reports</span>
        </a>
        <a className="flex items-center gap-sm p-sm text-on-surface-variant hover:bg-surface-container-highest rounded-lg transition-all duration-200 ease-in-out group" href="#">
          <span className="material-symbols-outlined group-hover:text-secondary">analytics</span>
          <span className="font-label-sm text-label-sm">Dashboard</span>
        </a>
        <div className="pt-xl mt-auto">
          <button className="w-full bg-secondary text-on-secondary py-sm rounded-lg font-bold shadow-md hover:brightness-110 active:scale-95 duration-150">
            Go Live
          </button>
        </div>
      </nav>
      {/* Main Content Canvas */}
      <main className="pt-24 pb-32 md:pb-8 md:pl-72 md:pr-8 px-gutter min-h-screen">
        {/* Page Header & Tabs */}
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-lg gap-md">
          <div>
            <h1 className="font-headline-lg text-headline-lg text-on-surface mb-xs">Assignment Schedule</h1>
            <p className="text-on-surface-variant font-body-md">Manage your upcoming fixtures and review past officiating performance.</p>
          </div>
          <div className="flex bg-surface-container-lowest p-1 rounded-xl border border-outline-variant w-fit">
            <button className="px-md py-xs bg-secondary text-on-secondary rounded-lg font-bold text-label-sm transition-all">Upcoming</button>
            <button className="px-md py-xs text-on-surface-variant hover:text-on-surface rounded-lg font-bold text-label-sm transition-all">Past Matches</button>
          </div>
        </div>
        {/* Featured Match (Hero Bento) */}
        <section className="mb-xl">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-gutter">
            {/* Main Highlight Card */}
            <div className="lg:col-span-2 relative glass-card rounded-xl overflow-hidden border-t-4 border-secondary p-lg flex flex-col justify-between min-h-[400px]">
              <div className="absolute inset-0 z-0 opacity-20">
                <img className="w-full h-full object-cover" data-alt="A wide-angle, high-contrast photograph of a professional stadium field at night under intense floodlights. The grass is a vibrant, deep green, and the atmosphere is filled with a light mist that catches the beams of light. The composition is clean and architectural, focusing on the precision of the sports arena's design. The mood is expectant and electric, perfectly suited for a premium sports management background." src="https://lh3.googleusercontent.com/aida/ADBb0ugAslubqau1if-Y7ldh0EkOQy0DB96ef6kXXkQ3470IVP0Gepn5A7WdGmZFd22WhVaEvNxmFG6CGsSdebIi-BDS6sdQ2wKMjuxW8OSNXiqGxY9dvQRqnmmHYe6rbP5etCHFmemp9D1zRPBqKXrNaTZqWNJgsVfcTiPUkptifYp9LaFDmrvbVJk0Zcg-nt1zMaVQdSWYMXoIvp_PzX4-cuWUf-V1WJcDxe5a-R2WuWiRnmlFlkn2FOCI63qm" />
                <div className="absolute inset-0 bg-gradient-to-t from-surface-dim via-transparent to-transparent"></div>
              </div>
              <div className="relative z-10">
                <div className="flex items-center gap-sm mb-md">
                  <span className="bg-tertiary text-on-tertiary px-sm py-1 rounded-full text-label-sm font-bold flex items-center gap-xs">
                    <span className="material-symbols-outlined text-[14px] live-pulse" data-weight="fill">radio_button_checked</span>
                    NEXT UP
                  </span>
                  <span className="text-secondary font-label-sm uppercase tracking-widest">Pro League - Week 5</span>
                </div>
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-lg mb-xl">
                  <div className="flex items-center gap-md">
                    <div className="text-center">
                      <div className="w-16 h-16 bg-surface-container-highest rounded-full flex items-center justify-center mb-sm border border-outline-variant shadow-inner overflow-hidden">
                        <img className="w-10 h-10 object-contain" data-alt="A minimalist, high-contrast logo of a professional sports team featuring sharp geometric lines in neon green against a deep charcoal background. The design is modern, athletic, and corporate, representing power and precision. The lighting is soft but highlights the clean edges of the graphic, giving it a premium, three-dimensional feel." src="https://lh3.googleusercontent.com/aida/ADBb0ujO9yJ1mf1lHIQtA4IQCj-ZKj5djUf_yDNzld5sL4dvz_uJBjYxegv9MgvIn5o-wxsIy_1TEmxwmx_jRIvneDWgDhvmeSxqBO-namYhpnkAjoxvWgBMXPC3wwrBciF4_W8ULBwr9-Uc9nnKI4ajbq45ZsdKT2gCc8JW1FSY3bxlumBglhuYxQLIZZXq_qY9Cuz9D3k55wy7StbZ7HgZM7PAcrbhTrSqvFRHcGQ14DtwYbHyq22E9wiHHBtC" />
                      </div>
                      <span className="font-headline-md text-headline-md block">STRIKE</span>
                    </div>
                    <span className="font-display-xl text-display-xl text-outline-variant px-sm">VS</span>
                    <div className="text-center">
                      <div className="w-16 h-16 bg-surface-container-highest rounded-full flex items-center justify-center mb-sm border border-outline-variant shadow-inner overflow-hidden">
                        <img className="w-10 h-10 object-contain" data-alt="A striking sports logo with bold orange and dark navy colors, showcasing a dynamic symbol of energy and speed. The logo is designed with thick, clean paths and balanced symmetry, fitting for a top-tier competitive team. The image is rendered with a slight metallic sheen, catching the ambient light of a professional stadium setting." src="https://lh3.googleusercontent.com/aida/ADBb0ujlA1I4-0eqo5nUdBuHbXtCvmJQbRK4FbJ72DYUxHAE-xXo0KYtMsNJKBakYbrpyAB9o0ejxHvl0Z6SUP4-cjjDHwGye4gJaLBuOLQ2Em5qUFZJlb1_Jp12v2zrkoOa5A6csX4cMYPaOaXPhX5XrWmTQB5HjlJzx8KwRs8JAvbXHx-Udq7xQJVVU56m3m5Y8xIekDyV6UU4M6dDufyWWaEDxsSuUvl8txYqCxbwdoLJXWNlOoLPpPi1XNDK" />
                      </div>
                      <span className="font-headline-md text-headline-md block">VALOR</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-display-xl font-stats-numeric text-on-surface">19:45</p>
                    <p className="text-secondary font-label-sm uppercase tracking-tighter">Kick-off Today</p>
                  </div>
                </div>
              </div>
              <div className="relative z-10 flex flex-wrap gap-md items-center justify-between border-t border-outline-variant pt-lg">
                <div className="flex gap-xl">
                  <div className="flex items-center gap-sm">
                    <span className="material-symbols-outlined text-secondary">location_on</span>
                    <div>
                      <p className="text-on-surface font-label-sm font-bold">Apex Arena</p>
                      <p className="text-on-surface-variant text-[10px]">Main Turf - Sector B</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-sm">
                    <span className="material-symbols-outlined text-secondary">groups</span>
                    <div>
                      <p className="text-on-surface font-label-sm font-bold">Crew</p>
                      <p className="text-on-surface-variant text-[10px]">Thorne, Miller, Diaz</p>
                    </div>
                  </div>
                </div>
                <button className="bg-secondary text-on-secondary px-xl py-md rounded-lg font-bold flex items-center gap-sm shadow-lg hover:brightness-110 active:scale-95 transition-all">
                  <span className="material-symbols-outlined">play_circle</span>
                  START MATCH
                </button>
              </div>
            </div>
            {/* Stats/Status Sidebar */}
            <div className="space-y-gutter">
              <div className="glass-card rounded-xl p-md border-t-4 border-tertiary h-1/2 flex flex-col justify-center">
                <p className="text-on-surface-variant font-label-sm mb-xs">Assignment Score</p>
                <p className="text-display-xl font-stats-numeric text-tertiary">98.4<span className="text-headline-md">%</span></p>
                <p className="text-on-surface-variant text-label-sm mt-xs">Precision &amp; Fairness Rating</p>
              </div>
              <div className="glass-card rounded-xl p-md border-t-4 border-outline h-1/2 relative overflow-hidden">
                <img className="absolute inset-0 w-full h-full object-cover opacity-30 grayscale hover:grayscale-0 transition-all duration-500" data-alt="A detailed, macro photograph of a professional referee's whistle and yellow card resting on a dark, textured surface that resembles athletic jersey fabric. The lighting is dramatic and directional, creating deep shadows and highlighting the metallic texture of the whistle and the smooth matte finish of the card. The palette is dominated by deep blues, blacks, and a pop of vibrant yellow, reflecting a serious, professional officiating environment." src="https://lh3.googleusercontent.com/aida/ADBb0uj3VEmv-u5gTRcItaE2tuQDzN7zqY6I5T_Wz91wUL5TpxhCC4KCYdmgiFQXKy0qFU-_qhxIVs-OMI5AJl6VjdVN4A0u6KVCFIUDkRrC8BQmCH307GRMGK0ElYkBYULMMuxbJCq1j4pbybkecBKOhRu0PHPbN-AYAHfBipkG3xZ9OdoOaT-ncgGo4ocrpvoukXYETcqH7qpAL_LqM0UkSW5sMpuY3yiimXZF1nAJ8qU5sAXZrbM_gXakWMk" />
                <div className="relative z-10 h-full flex flex-col justify-end">
                  <p className="text-on-surface font-headline-md">Match Integrity</p>
                  <p className="text-on-surface-variant text-label-sm">Standard Protocol: Active</p>
                </div>
              </div>
            </div>
          </div>
        </section>
        {/* Detailed List of Upcoming Matches */}
        <section>
          <div className="flex items-center justify-between mb-md">
            <h2 className="font-headline-md text-headline-md text-on-surface">Upcoming Fixtures</h2>
            <button className="text-secondary font-label-sm flex items-center gap-xs hover:underline">
              View Calendar <span className="material-symbols-outlined text-[18px]">calendar_month</span>
            </button>
          </div>
          <div className="space-y-sm">
            {/* Match Entry 1 */}
            <div className="glass-card rounded-xl p-md flex flex-wrap md:flex-nowrap items-center justify-between gap-md border-l-4 border-secondary group hover:border-l-8 transition-all">
              <div className="flex items-center gap-lg w-full md:w-auto">
                <div className="text-center min-w-[60px]">
                  <p className="text-on-surface font-headline-md leading-none">24</p>
                  <p className="text-on-surface-variant text-label-sm uppercase">OCT</p>
                </div>
                <div className="h-10 w-[1px] bg-outline-variant"></div>
                <div>
                  <p className="text-on-surface font-bold">Phoenix FC vs Iron Wolves</p>
                  <p className="text-on-surface-variant text-label-sm">Premier Division • 20:00</p>
                </div>
              </div>
              <div className="hidden lg:flex items-center gap-xl">
                <div className="flex items-center gap-xs">
                  <span className="material-symbols-outlined text-outline text-[20px]">location_on</span>
                  <span className="text-on-surface-variant text-label-sm">Central Stadium</span>
                </div>
                <div className="flex items-center gap-xs">
                  <span className="material-symbols-outlined text-outline text-[20px]">article</span>
                  <span className="text-on-surface-variant text-label-sm">Briefing Ready</span>
                </div>
              </div>
              <div className="flex items-center gap-sm ml-auto">
                <button className="p-xs text-on-surface-variant hover:text-secondary hover:bg-surface-container-highest rounded-lg transition-colors">
                  <span className="material-symbols-outlined">edit_calendar</span>
                </button>
                <button className="border border-secondary text-secondary px-md py-1 rounded-lg text-label-sm font-bold hover:bg-secondary hover:text-on-secondary transition-all">
                  Details
                </button>
              </div>
            </div>
            {/* Match Entry 2 */}
            <div className="glass-card rounded-xl p-md flex flex-wrap md:flex-nowrap items-center justify-between gap-md border-l-4 border-secondary group hover:border-l-8 transition-all">
              <div className="flex items-center gap-lg w-full md:w-auto">
                <div className="text-center min-w-[60px]">
                  <p className="text-on-surface font-headline-md leading-none">26</p>
                  <p className="text-on-surface-variant text-label-sm uppercase">OCT</p>
                </div>
                <div className="h-10 w-[1px] bg-outline-variant"></div>
                <div>
                  <p className="text-on-surface font-bold">Titan Academy vs Rising Stars</p>
                  <p className="text-on-surface-variant text-label-sm">Youth Elite Cup • 14:30</p>
                </div>
              </div>
              <div className="hidden lg:flex items-center gap-xl">
                <div className="flex items-center gap-xs">
                  <span className="material-symbols-outlined text-outline text-[20px]">location_on</span>
                  <span className="text-on-surface-variant text-label-sm">Field 4 - Sports Park</span>
                </div>
                <div className="flex items-center gap-xs">
                  <span className="material-symbols-outlined text-outline text-[20px]">pending</span>
                  <span className="text-on-surface-variant text-label-sm">Pending Team Sheets</span>
                </div>
              </div>
              <div className="flex items-center gap-sm ml-auto">
                <button className="p-xs text-on-surface-variant hover:text-secondary hover:bg-surface-container-highest rounded-lg transition-colors">
                  <span className="material-symbols-outlined">edit_calendar</span>
                </button>
                <button className="border border-secondary text-secondary px-md py-1 rounded-lg text-label-sm font-bold hover:bg-secondary hover:text-on-secondary transition-all">
                  Details
                </button>
              </div>
            </div>
            {/* Match Entry 3 */}
            <div className="glass-card rounded-xl p-md flex flex-wrap md:flex-nowrap items-center justify-between gap-md border-l-4 border-secondary group hover:border-l-8 transition-all">
              <div className="flex items-center gap-lg w-full md:w-auto">
                <div className="text-center min-w-[60px]">
                  <p className="text-on-surface font-headline-md leading-none">29</p>
                  <p className="text-on-surface-variant text-label-sm uppercase">OCT</p>
                </div>
                <div className="h-10 w-[1px] bg-outline-variant"></div>
                <div>
                  <p className="text-on-surface font-bold">Zenith Warriors vs Storm United</p>
                  <p className="text-on-surface-variant text-label-sm">Pro League - Week 6 • 21:00</p>
                </div>
              </div>
              <div className="hidden lg:flex items-center gap-xl">
                <div className="flex items-center gap-xs">
                  <span className="material-symbols-outlined text-outline text-[20px]">location_on</span>
                  <span className="text-on-surface-variant text-label-sm">Arena of Light</span>
                </div>
                <div className="flex items-center gap-xs">
                  <span className="material-symbols-outlined text-outline text-[20px]">article</span>
                  <span className="text-on-surface-variant text-label-sm">Briefing Ready</span>
                </div>
              </div>
              <div className="flex items-center gap-sm ml-auto">
                <button className="p-xs text-on-surface-variant hover:text-secondary hover:bg-surface-container-highest rounded-lg transition-colors">
                  <span className="material-symbols-outlined">edit_calendar</span>
                </button>
                <button className="border border-secondary text-secondary px-md py-1 rounded-lg text-label-sm font-bold hover:bg-secondary hover:text-on-secondary transition-all">
                  Details
                </button>
              </div>
            </div>
          </div>
        </section>
        {/* Past Matches (Bento Section) */}
        <section className="mt-xl">
          <h2 className="font-headline-md text-headline-md text-on-surface mb-md">Past Match Summaries</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-gutter">
            <div className="glass-card rounded-xl overflow-hidden group">
              <div className="h-32 relative">
                <img className="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all duration-500" data-alt="A cinematic, high-shutter-speed photograph capturing a soccer ball hitting the back of a net in a professional stadium. The lighting is intense and focused, with the dark environment making the bright white of the net and the ball pop. The image conveys energy, success, and the definitive moment of a game. It's styled with a dark, premium aesthetic suitable for a high-end sports dashboard." src="https://lh3.googleusercontent.com/aida/ADBb0uhEOUBJNogjzQUu1-oNKuy7zI5APrQkXEfC3vFbzP_osrB3xvTkwzuKMso8UmyYZiXsHGD_GL4OvAOHRP4McjWfLcT32-kRZHLZvOnhsHqR2q2KXY4sQnzXIV3936tLmM9Gh8bHyOUXOV70s8hMUjj_oJy2eVTERu7qSkhe7moBw0hP3JtNTtCc9IbOa8J9DdDK7e2UL4llQfNASAFsQq9UA5SAxXfsswctdCxMNxuidGF3kACjkqfTmPpzPmapUvz12PO5dvM5DLA" />
                <div className="absolute top-2 right-2 bg-secondary/80 text-on-secondary px-2 py-0.5 rounded text-[10px] font-bold">COMPLETED</div>
              </div>
              <div className="p-md">
                <p className="text-on-surface-variant text-[10px] uppercase font-bold mb-1">Oct 18 • Week 4</p>
                <p className="text-on-surface font-bold text-label-sm mb-xs">Bravehearts 2 - 1 Cobras</p>
                <div className="flex items-center justify-between mt-sm border-t border-outline-variant pt-sm">
                  <span className="text-on-surface-variant text-[11px]">8 Fouls • 2 Yellows</span>
                  <span className="material-symbols-outlined text-secondary text-[18px]">receipt_long</span>
                </div>
              </div>
            </div>
            <div className="glass-card rounded-xl overflow-hidden group">
              <div className="h-32 relative">
                <img className="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all duration-500" data-alt="A focused close-up of a high-performance athletic field showing the chalk-white lines on the perfectly manicured dark green grass. The lighting is low-key, giving the scene a moody, professional feel. The perspective is from a low angle, emphasizing the precision and preparation of a professional sports venue. The overall aesthetic is clean, modern, and high-contrast." src="https://lh3.googleusercontent.com/aida/ADBb0uhXHOsDYIg8Ce-sVc08yTmMfkdyY0VE_YZDjIYZQpF3TwInIyGMSxcg4FbaoZ8I2FoWhkmP2KklaMAlHm6jfu0kdKUgOoUgHIa67ZUQNS_xRY6ACqkVdcLeZ9c3FFtyIQpgGVJtbEAIFh6F9PmgrCufvrrzGCeVPfvJmKv7Us3hxvTBWIHOCZk-60mZ_9_cpHWNyO-hLPZRRshCii3wPq_qL2HjdNGb75ayXLrCIOZlu2Bd_PjYB_Uil4Q" />
                <div className="absolute top-2 right-2 bg-secondary/80 text-on-secondary px-2 py-0.5 rounded text-[10px] font-bold">COMPLETED</div>
              </div>
              <div className="p-md">
                <p className="text-on-surface-variant text-[10px] uppercase font-bold mb-1">Oct 15 • Week 4</p>
                <p className="text-on-surface font-bold text-label-sm mb-xs">Apex United 0 - 0 Falcons</p>
                <div className="flex items-center justify-between mt-sm border-t border-outline-variant pt-sm">
                  <span className="text-on-surface-variant text-[11px]">4 Fouls • 0 Cards</span>
                  <span className="material-symbols-outlined text-secondary text-[18px]">receipt_long</span>
                </div>
              </div>
            </div>
            <div className="glass-card rounded-xl p-md border-2 border-dashed border-outline-variant flex flex-col items-center justify-center text-center opacity-60 hover:opacity-100 transition-opacity cursor-pointer">
              <span className="material-symbols-outlined text-outline text-[48px] mb-xs">history_edu</span>
              <p className="text-on-surface font-bold text-label-sm">Full Report Archive</p>
              <p className="text-on-surface-variant text-[10px]">Access matches from previous seasons</p>
            </div>
          </div>
        </section>
      </main>
      {/* BottomNavBar (Mobile Only) */}
      <nav className="md:hidden fixed bottom-0 left-0 w-full flex justify-around items-center p-xs bg-surface-container-highest dark:bg-surface-container-highest z-50 rounded-t-xl border-t border-outline-variant shadow-lg">
        <a className="flex flex-col items-center justify-center text-on-surface-variant hover:text-secondary group" href="#">
          <span className="material-symbols-outlined">sports</span>
          <span className="font-label-sm text-label-sm">Console</span>
        </a>
        <a className="flex flex-col items-center justify-center bg-secondary text-on-secondary rounded-xl px-4 py-1" href="#">
          <span className="material-symbols-outlined">event_note</span>
          <span className="font-label-sm text-label-sm">Matches</span>
        </a>
        <a className="flex flex-col items-center justify-center text-on-surface-variant hover:text-secondary group" href="#">
          <span className="material-symbols-outlined">history_edu</span>
          <span className="font-label-sm text-label-sm">Reports</span>
        </a>
        <a className="flex flex-col items-center justify-center text-on-surface-variant hover:text-secondary group" href="#">
          <span className="material-symbols-outlined">query_stats</span>
          <span className="font-label-sm text-label-sm">Stats</span>
        </a>
      </nav>
      {/* FAB (Contextual for Home/Console) */}
      <button className="fixed bottom-24 right-6 md:bottom-12 md:right-12 w-14 h-14 bg-tertiary text-on-tertiary rounded-full shadow-2xl flex items-center justify-center hover:scale-110 active:scale-95 transition-all z-40">
        <span className="material-symbols-outlined text-[28px]" data-weight="fill">add_alert</span>
      </button>
    </div>
  );
}
