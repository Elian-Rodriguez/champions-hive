export default function PostMatchReport() {
  return (
    <div className="bg-background text-on-background font-body-md min-h-screen">
      <header className="bg-surface-container-high dark:bg-surface-container-high fixed top-0 w-full z-50 shadow-md border-b border-outline-variant flex justify-between items-center px-lg py-sm">
        <div className="flex items-center gap-md">
          <span className="text-headline-lg font-headline-lg font-bold text-secondary dark:text-secondary">Champion Hive</span>
        </div>
        <div className="flex items-center gap-sm">
          <button className="p-xs rounded-full hover:bg-surface-container-highest transition-colors active:scale-95 duration-150">
            <span className="material-symbols-outlined text-on-surface-variant">notifications</span>
          </button>
          <div className="flex items-center gap-xs ml-xs">
            <span className="text-label-sm font-label-sm text-on-surface-variant hidden md:block">Ref. Marcus Thorne</span>
            <img className="w-10 h-10 rounded-full border-2 border-secondary object-cover" data-alt="Close up professional portrait of a sports official in a modern black referee uniform against a blurred green field background. The lighting is crisp and authoritative, emphasizing a professional sports management aesthetic with deep greens and high-contrast shadows. The referee looks focused and ready for high-stakes competition." src="https://lh3.googleusercontent.com/aida/ADBb0ujiyZTtEyuJw5dUzrZG_h0Gh05bJMaJU52DnY2Axa5RdR_AaeQ0hQgE4TZ9GiruoMU8aMdteDTPqD7fQYpS-RS2zYsSUT5kc_NxFWc2lKLWDpL_yjsESNxQGsGlCxH9GxeNY3V8yo5clI3vK9K7kMB8NbD7VZbRigqX-IFG_uPOwkje9_Rym8EaCMSR2Mkj0Ce_CKo9OzMMpwXOmHQzgexPJkle26gSvtHnqguOm9FCLXcojYi0t3MfJ4g8" />
          </div>
        </div>
      </header>
      <aside className="fixed left-0 top-0 h-full w-64 z-40 bg-surface-container-low dark:bg-surface-container-low hidden md:flex flex-col p-md space-y-xs pt-32">
        <nav className="flex-1 space-y-xs">
          <a className="flex items-center gap-sm px-sm py-md rounded-lg text-on-surface-variant hover:bg-surface-container-highest transition-all duration-200" href="#">
            <span className="material-symbols-outlined">sports_score</span>
            <span className="font-label-sm text-label-sm">Live Console</span>
          </a>
          <a className="flex items-center gap-sm px-sm py-md bg-secondary-container text-on-secondary-container rounded-lg font-bold" href="#">
            <span className="material-symbols-outlined">history_edu</span>
            <span className="font-label-sm text-label-sm">Reports</span>
          </a>
          <a className="flex items-center gap-sm px-sm py-md rounded-lg text-on-surface-variant hover:bg-surface-container-highest transition-all duration-200" href="#">
            <span className="material-symbols-outlined">calendar_today</span>
            <span className="font-label-sm text-label-sm">Schedule</span>
          </a>
          <a className="flex items-center gap-sm px-sm py-md rounded-lg text-on-surface-variant hover:bg-surface-container-highest transition-all duration-200" href="#">
            <span className="material-symbols-outlined">analytics</span>
            <span className="font-label-sm text-label-sm">Dashboard</span>
          </a>
        </nav>
        <button className="w-full bg-secondary text-on-secondary py-sm rounded-lg font-bold hover:opacity-90 active:scale-95 transition-all">
          Go Live
        </button>
      </aside>
      <main className="md:pl-64 pt-24 pb-32 px-md lg:px-lg max-w-7xl mx-auto">
        <div className="mb-lg flex flex-col md:flex-row md:items-end justify-between gap-md">
          <div>
            <span className="text-secondary font-bold text-label-sm uppercase tracking-widest mb-xs block">Official Post-Match Report</span>
            <h1 className="font-headline-lg text-headline-lg text-on-surface">Match Submission: #M29401</h1>
            <p className="text-on-surface-variant font-body-md mt-xs">Titan United vs. Storm City • Stadium Arcadium • July 24, 2024</p>
          </div>
          <div className="flex gap-sm">
            <div className="bg-surface-container px-md py-sm rounded-xl border border-outline-variant flex items-center gap-sm">
              <span className="material-symbols-outlined text-secondary">timer</span>
              <div>
                <p className="text-[10px] text-on-surface-variant uppercase">Final Whistle</p>
                <p className="font-stats-numeric text-stats-numeric">22:15</p>
              </div>
            </div>
          </div>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-gutter">
          <div className="lg:col-span-8 bg-surface-container rounded-xl p-lg border border-outline-variant relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-secondary to-tertiary"></div>
            <h2 className="font-headline-md text-headline-md mb-lg flex items-center gap-sm">
              <span className="material-symbols-outlined text-secondary">scoreboard</span>
              Confirm Final Score
            </h2>
            <div className="flex items-center justify-around gap-lg py-lg bg-surface-container-low rounded-2xl border border-outline-variant/30">
              <div className="flex flex-col items-center text-center gap-md">
                <img className="w-24 h-24 rounded-full border-2 border-outline-variant p-2" data-alt="Minimalist emblem for Titan United sports team. A sleek metallic silver shield with a stylized thunderbolt across the center. The background is a deep obsidian black with subtle neon teal highlights, evoking a futuristic and competitive professional sports aesthetic." src="https://lh3.googleusercontent.com/aida/ADBb0uhXHOsDYIg8Ce-sVc08yTmMfkdyY0VE_YZDjIYZQpF3TwInIyGMSxcg4FbaoZ8I2FoWhkmP2KklaMAlHm6jfu0kdKUgOoUgHIa67ZUQNS_xRY6ACqkVdcLeZ9c3FFtyIQpgGVJtbEAIFh6F9PmgrCufvrrzGCeVPfvJmKv7Us3hxvTBWIHOCZk-60mZ_9_cpHWNyO-hLPZRRshCii3wPq_qL2HjdNGb75ayXLrCIOZlu2Bd_PjYB_Uil4Q" />
                <h3 className="font-headline-md text-headline-md">Titan Utd.</h3>
                <div className="relative">
                  <input className="w-24 h-24 bg-surface-container-highest border-2 border-secondary rounded-xl text-center font-display-xl text-display-xl text-secondary focus:ring-secondary focus:border-secondary transition-all" type="number" value="3" />
                </div>
              </div>
              <div className="flex flex-col items-center justify-center">
                <span className="text-headline-md font-bold text-outline-variant">VS</span>
                <div className="h-px w-12 bg-outline-variant my-md"></div>
                <span className="text-label-sm text-on-surface-variant uppercase">Full Time</span>
              </div>
              <div className="flex flex-col items-center text-center gap-md">
                <img className="w-24 h-24 rounded-full border-2 border-outline-variant p-2" data-alt="Modern sports team logo for Storm City. A vibrant orange tornado icon contained within a circular neon orange border. The style is sharp and graphic, utilizing a high-contrast dark navy background that makes the orange neon elements pop with stadium-like intensity." src="https://lh3.googleusercontent.com/aida/ADBb0ujlA1I4-0eqo5nUdBuHbXtCvmJQbRK4FbJ72DYUxHAE-xXo0KYtMsNJKBakYbrpyAB9o0ejxHvl0Z6SUP4-cjjDHwGye4gJaLBuOLQ2Em5qUFZJlb1_Jp12v2zrkoOa5A6csX4cMYPaOaXPhX5XrWmTQB5HjlJzx8KwRs8JAvbXHx-Udq7xQJVVU56m3m5Y8xIekDyV6UU4M6dDufyWWaEDxsSuUvl8txYqCxbwdoLJXWNlOoLPpPi1XNDK" />
                <h3 className="font-headline-md text-headline-md">Storm City</h3>
                <div className="relative">
                  <input className="w-24 h-24 bg-surface-container-highest border-2 border-secondary rounded-xl text-center font-display-xl text-display-xl text-secondary focus:ring-secondary focus:border-secondary transition-all" type="number" value="1" />
                </div>
              </div>
            </div>
          </div>
          <div className="lg:col-span-4 grid grid-cols-1 gap-gutter">
            <div className="bg-surface-container rounded-xl p-md border border-outline-variant flex items-center justify-between">
              <div className="flex items-center gap-sm">
                <span className="material-symbols-outlined text-tertiary">warning</span>
                <span className="text-body-md font-bold">Total Fouls</span>
              </div>
              <span className="font-stats-numeric text-display-xl text-tertiary">14</span>
            </div>
            <div className="bg-surface-container rounded-xl p-md border border-outline-variant flex items-center justify-between">
              <div className="flex items-center gap-sm">
                <span className="material-symbols-outlined text-on-error">front_hand</span>
                <span className="text-body-md font-bold">Red Cards</span>
              </div>
              <span className="font-stats-numeric text-display-xl text-error">0</span>
            </div>
            <div className="bg-surface-container-low rounded-xl p-md border border-secondary/50 flex items-center justify-between group cursor-pointer hover:bg-surface-container-highest transition-colors">
              <div className="flex items-center gap-sm">
                <span className="material-symbols-outlined text-secondary">verified</span>
                <span className="text-body-md font-bold">Referees</span>
              </div>
              <div className="flex -space-x-3">
                <img className="w-10 h-10 rounded-full border-2 border-surface-container object-cover" data-alt="Professional sports official headshot." src="https://lh3.googleusercontent.com/aida/ADBb0ujiyZTtEyuJw5dUzrZG_h0Gh05bJMaJU52DnY2Axa5RdR_AaeQ0hQgE4TZ9GiruoMU8aMdteDTPqD7fQYpS-RS2zYsSUT5kc_NxFWc2lKLWDpL_yjsESNxQGsGlCxH9GxeNY3V8yo5clI3vK9K7kMB8NbD7VZbRigqX-IFG_uPOwkje9_Rym8EaCMSR2Mkj0Ce_CKo9OzMMpwXOmHQzgexPJkle26gSvtHnqguOm9FCLXcojYi0t3MfJ4g8" />
                <img className="w-10 h-10 rounded-full border-2 border-surface-container object-cover" data-alt="Referees officiating a high-energy match." src="https://lh3.googleusercontent.com/aida/ADBb0ujO9yJ1mf1lHIQtA4IQCj-ZKj5djUf_yDNzld5sL4dvz_uJBjYxegv9MgvIn5o-wxsIy_1TEmxwmx_jRIvneDWgDhvmeSxqBO-namYhpnkAjoxvWgBMXPC3wwrBciF4_W8ULBwr9-Uc9nnKI4ajbq45ZsdKT2gCc8JW1FSY3bxlumBglhuYxQLIZZXq_qY9Cuz9D3k55wy7StbZ7HgZM7PAcrbhTrSqvFRHcGQ14DtwYbHyq22E9wiHHBtC" />
                <div className="w-10 h-10 rounded-full border-2 border-surface-container bg-surface-container-highest flex items-center justify-center text-label-sm font-bold text-on-surface-variant">+2</div>
              </div>
            </div>
          </div>
          <div className="lg:col-span-7 bg-surface-container rounded-xl p-lg border border-outline-variant">
            <h2 className="font-headline-md text-headline-md mb-lg flex items-center gap-sm">
              <span className="material-symbols-outlined text-secondary">rule</span>
              Recorded Disciplinary Actions
            </h2>
            <div className="space-y-sm max-h-[400px] overflow-y-auto custom-scrollbar pr-xs">
              <div className="flex items-center justify-between p-md bg-surface-container-low rounded-xl border-l-4 border-tertiary">
                <div className="flex items-center gap-md">
                  <div className="w-10 h-14 bg-tertiary rounded flex items-center justify-center text-on-tertiary font-bold text-stats-numeric">Y</div>
                  <div>
                    <h4 className="font-bold text-on-surface">Elena Rodriguez (Storm City)</h4>
                    <p className="text-label-sm text-on-surface-variant">42' • Persistent Infringement</p>
                  </div>
                </div>
                <button className="text-on-surface-variant hover:text-error transition-colors">
                  <span className="material-symbols-outlined">delete_outline</span>
                </button>
              </div>
              <div className="flex items-center justify-between p-md bg-surface-container-low rounded-xl border-l-4 border-tertiary">
                <div className="flex items-center gap-md">
                  <div className="w-10 h-14 bg-tertiary rounded flex items-center justify-center text-on-tertiary font-bold text-stats-numeric">Y</div>
                  <div>
                    <h4 className="font-bold text-on-surface">Mark J. Peterson (Titan United)</h4>
                    <p className="text-label-sm text-on-surface-variant">58' • Unsporting Behavior</p>
                  </div>
                </div>
                <button className="text-on-surface-variant hover:text-error transition-colors">
                  <span className="material-symbols-outlined">delete_outline</span>
                </button>
              </div>
              <div className="flex items-center justify-between p-md bg-surface-container-low rounded-xl border-l-4 border-outline-variant">
                <div className="flex items-center gap-md opacity-60">
                  <div className="w-10 h-14 bg-surface-container-highest rounded flex items-center justify-center text-on-surface-variant font-bold text-stats-numeric">
                    <span className="material-symbols-outlined">sports_handball</span>
                  </div>
                  <div>
                    <h4 className="font-bold text-on-surface">Foul - David Lin (Titan United)</h4>
                    <p className="text-label-sm text-on-surface-variant">71' • Tactical Foul (No Card)</p>
                  </div>
                </div>
                <button className="text-on-surface-variant hover:text-error transition-colors">
                  <span className="material-symbols-outlined">delete_outline</span>
                </button>
              </div>
            </div>
            <button className="w-full mt-lg border-2 border-dashed border-outline-variant py-md rounded-xl text-on-surface-variant hover:border-secondary hover:text-secondary transition-all flex items-center justify-center gap-sm font-bold">
              <span className="material-symbols-outlined">add_circle</span>
              Add Event Manually
            </button>
          </div>
          <div className="lg:col-span-5 flex flex-col gap-gutter">
            <div className="bg-surface-container rounded-xl p-lg border border-outline-variant flex-1">
              <h2 className="font-headline-md text-headline-md mb-md flex items-center gap-sm">
                <span className="material-symbols-outlined text-secondary">description</span>
                Incident Observations
              </h2>
              <textarea className="w-full h-48 bg-surface-container-low border border-outline-variant rounded-xl p-md text-on-surface focus:ring-2 focus:ring-secondary focus:border-secondary transition-all font-body-md" placeholder="Detail any notable incidents, pitch conditions, or crowd behavior that requires official attention..."></textarea>
              <div className="mt-lg p-md bg-secondary/10 border border-secondary/20 rounded-xl">
                <div className="flex items-start gap-sm">
                  <span className="material-symbols-outlined text-secondary mt-1">info</span>
                  <p className="text-label-sm text-on-surface-variant leading-relaxed">
                    By signing this report, you confirm that all match data recorded is accurate and represents the final outcome of the competition. Once submitted, changes require administrative override.
                  </p>
                </div>
              </div>
            </div>
            <div className="bg-surface-container rounded-xl p-lg border border-outline-variant">
              <div className="flex flex-col gap-sm">
                <div className="flex items-center gap-sm mb-md px-md py-sm bg-surface-container-low rounded-xl">
                  <img className="w-12 h-12 rounded border border-outline-variant object-cover" data-alt="A macro shot of a sleek digital pen resting on a glass tablet screen displaying a sophisticated biometric signature interface. The lighting is focused and dramatic, using a deep blue and neon green color palette that suggests high security and digital integrity in a professional tournament setting." src="https://lh3.googleusercontent.com/aida/ADBb0uj3VEmv-u5gTRcItaE2tuQDzN7zqY6I5T_Wz91wUL5TpxhCC4KCYdmgiFQXKy0qFU-_qhxIVs-OMI5AJl6VjdVN4A0u6KVCFIUDkRrC8BQmCH307GRMGK0ElYkBYULMMuxbJCq1j4pbybkecBKOhRu0PHPbN-AYAHfBipkG3xZ9OdoOaT-ncgGo4ocrpvoukXYETcqH7qpAL_LqM0UkSW5sMpuY3yiimXZF1nAJ8qU5sAXZrbM_gXakWMk" />
                  <div className="flex-1">
                    <p className="text-[10px] text-on-surface-variant uppercase font-bold">Digital Signature</p>
                    <p className="font-bold text-secondary">Marcus Thorne (Lead Official)</p>
                  </div>
                  <span className="material-symbols-outlined text-secondary" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
                </div>
                <button className="w-full bg-secondary text-on-secondary font-headline-md text-headline-md py-md rounded-xl shadow-lg shadow-secondary/20 hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-md">
                  Confirm Official Report
                  <span className="material-symbols-outlined">send</span>
                </button>
                <button className="w-full border-2 border-tertiary/50 text-tertiary font-bold py-sm rounded-xl hover:bg-tertiary/10 transition-all">
                  Save as Draft
                </button>
              </div>
            </div>
          </div>
          <div className="lg:col-span-12 bg-surface-container rounded-xl overflow-hidden border border-outline-variant relative">
            <div className="absolute inset-0 bg-gradient-to-t from-surface-dim via-transparent to-transparent z-10"></div>
            <img className="w-full h-48 object-cover opacity-40" data-alt="A high-wide cinematic view of a modern football stadium at night under brilliant floodlights. The pitch is perfectly manicured with vibrant green grass, and the stands are filled with the soft glow of spectators. The overall mood is intense, professional, and electric, captured in a sharp architectural photography style with deep navy sky and brilliant white stadium lights." src="https://lh3.googleusercontent.com/aida/ADBb0ugAslubqau1if-Y7ldh0EkOQy0DB96ef6kXXkQ3470IVP0Gepn5A7WdGmZFd22WhVaEvNxmFG6CGsSdebIi-BDS6sdQ2wKMjuxW8OSNXiqGxY9dvQRqnmmHYe6rbP5etCHFmemp9D1zRPBqKXrNaTZqWNJgsVfcTiPUkptifYp9LaFDmrvbVJk0Zcg-nt1zMaVQdSWYMXoIvp_PzX4-cuWUf-V1WJcDxe5a-R2WuWiRnmlFlkn2FOCI63qm" />
            <div className="absolute bottom-4 left-6 z-20">
              <div className="flex items-center gap-sm">
                <span className="w-3 h-3 bg-secondary rounded-full live-pulse"></span>
                <span className="font-bold text-on-surface">Data Verified with VAR Hawk-Eye System</span>
              </div>
            </div>
          </div>
        </div>
      </main>
      <nav className="md:hidden fixed bottom-0 left-0 w-full flex justify-around items-center p-xs bg-surface-container-highest dark:bg-surface-container-highest z-50 rounded-t-xl shadow-lg border-t border-outline-variant">
        <a className="flex flex-col items-center justify-center text-on-surface-variant hover:text-secondary py-1" href="#">
          <span className="material-symbols-outlined">sports</span>
          <span className="font-label-sm text-label-sm">Console</span>
        </a>
        <a className="flex flex-col items-center justify-center text-on-surface-variant hover:text-secondary py-1" href="#">
          <span className="material-symbols-outlined">event_note</span>
          <span className="font-label-sm text-label-sm">Matches</span>
        </a>
        <a className="flex flex-col items-center justify-center bg-secondary text-on-secondary rounded-xl px-4 py-1" href="#">
          <span className="material-symbols-outlined">history_edu</span>
          <span className="font-label-sm text-label-sm">Reports</span>
        </a>
        <a className="flex flex-col items-center justify-center text-on-surface-variant hover:text-secondary py-1" href="#">
          <span className="material-symbols-outlined">query_stats</span>
          <span className="font-label-sm text-label-sm">Stats</span>
        </a>
      </nav>
    </div>
  );
}
