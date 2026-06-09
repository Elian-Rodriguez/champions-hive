export default function LoginScreen() {
  return (
    <div className="bg-background text-on-background min-h-screen flex items-center justify-center font-body-md overflow-hidden">
      <div className="flex w-full h-screen overflow-hidden">
        <div className="hidden lg:flex lg:w-3/5 relative flex-col justify-between p-12 bg-surface-container-lowest">
          <div className="absolute inset-0 z-0">
            <img className="w-full h-full object-cover opacity-30 mix-blend-luminosity" data-alt="A powerful action shot of an athlete in mid-motion during a championship tournament, set against a dark stadium backdrop." src="https://lh3.googleusercontent.com/aida/ADBb0ujMxExzo8Z3tDIBmPwgn5rdVFvapuuaGh-cktOlKsvDQnSa3C99sGooYLOlYDFGrOkE5rnwKz8j4O4xgGGw8I7ZKX0S3C9WEg5FYWVSuT5wN2Goz32-PeZrg1H-C3fY3ddj4xXVY0i6NWpJ06SL9QzblMF7NFj_Qkb1yEXfk1G9pjlRJPqcImnej2MUJeS_V1CqreL_q3CucM37JO7QNxziXImlEqxHM8ZQPTYjH40lSDBDTFa6R9lGWqvn" />
            <div className="absolute inset-0 bg-gradient-to-tr from-surface-container-lowest via-surface-container-lowest/90 to-transparent"></div>
            <div className="absolute bottom-0 right-0 w-64 h-64 bg-secondary/10 blur-[100px] rounded-full"></div>
            <div className="absolute top-20 left-20 w-32 h-32 bg-tertiary/10 blur-[60px] rounded-full"></div>
          </div>
          <div className="relative z-10 flex flex-col h-full justify-between">
            <div>
              <span className="font-display-xl text-display-xl text-secondary italic tracking-tighter uppercase">CHAMPION HIVE</span>
              <p className="font-headline-md text-headline-md text-on-surface mt-4 max-w-md">Master the Game. Orchestrate the Glory.</p>
            </div>
            <div className="flex flex-col items-center justify-center flex-1">
              <div className="relative group">
                <div className="absolute inset-0 bg-secondary/20 blur-[80px] rounded-full transform scale-75 group-hover:scale-100 transition-transform duration-1000"></div>
                <img alt="Champion Hive Premium Icon" className="relative z-10 w-[420px] h-[420px] object-contain drop-shadow-[0_0_30px_rgba(74,225,118,0.3)] animate-pulse [animation-duration:8s]" src="https://lh3.googleusercontent.com/aida/ADBb0uhEOUBJNogjzQUu1-oNKuy7zI5APrQkXEfC3vFbzP_osrB3xvTkwzuKMso8UmyYZiXsHGD_GL4OvAOHRP4McjWfLcT32-kRZHLZvOnhsHqR2q2KXY4sQnzXIV3936tLmM9Gh8bHyOUXOV70s8hMUjj_oJy2eVTERu7qSkhe7moBw0hP3JtNTtCc9IbOa8J9DdDK7e2UL4llQfNASAFsQq9UA5SAxXfsswctdCxMNxuidGF3kACjkqfTmPpzPmapUvz12PO5dvM5DLA" />
              </div>
            </div>
            <div className="max-w-lg space-y-6">
              <div className="flex items-center gap-4">
                <div className="h-1 w-12 bg-secondary"></div>
                <span className="font-label-sm text-label-sm uppercase tracking-widest text-secondary">The Professional Standard</span>
              </div>
              <p className="text-on-surface-variant font-body-lg text-body-lg leading-relaxed">
                Join the world's most elite tournament circuit. Real-time statistics, professional brackets, and seamless athlete management integrated into one powerful dashboard.
              </p>
              <div className="flex gap-8 pt-4">
                <div>
                  <div className="font-stats-numeric text-stats-numeric text-on-surface">500+</div>
                  <div className="font-label-sm text-label-sm text-on-surface-variant uppercase">Tournaments</div>
                </div>
                <div>
                  <div className="font-stats-numeric text-stats-numeric text-on-surface">12k+</div>
                  <div className="font-label-sm text-label-sm text-on-surface-variant uppercase">Athletes</div>
                </div>
                <div>
                  <div className="font-stats-numeric text-stats-numeric text-on-surface">50+</div>
                  <div className="font-label-sm text-label-sm text-on-surface-variant uppercase">Countries</div>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div className="w-full lg:w-2/5 flex items-center justify-center p-6 sm:p-12 bg-surface-container shadow-2xl z-20 border-l border-outline-variant/30">
          <div className="w-full max-w-md flex flex-col">
            <div className="lg:hidden mb-12 flex flex-col items-center gap-6">
              <img alt="Champion Hive Premium Icon" className="w-24 h-24 object-contain" src="https://lh3.googleusercontent.com/aida/ADBb0uhEOUBJNogjzQUu1-oNKuy7zI5APrQkXEfC3vFbzP_osrB3xvTkwzuKMso8UmyYZiXsHGD_GL4OvAOHRP4McjWfLcT32-kRZHLZvOnhsHqR2q2KXY4sQnzXIV3936tLmM9Gh8bHyOUXOV70s8hMUjj_oJy2eVTERu7qSkhe7moBw0hP3JtNTtCc9IbOa8J9DdDK7e2UL4llQfNASAFsQq9UA5SAxXfsswctdCxMNxuidGF3kACjkqfTmPpzPmapUvz12PO5dvM5DLA" />
              <span className="font-display-xl text-[36px] text-secondary italic tracking-tighter uppercase">CHAMPION HIVE</span>
            </div>
            <div className="mb-10">
              <h1 className="font-headline-lg text-headline-lg text-on-surface mb-2">Welcome Back</h1>
              <p className="text-on-surface-variant font-body-md text-body-md">Sign in to manage your tournaments and track athletes.</p>
            </div>
            <form className="space-y-6">
              <div className="space-y-2">
                <label className="font-label-sm text-label-sm text-on-surface-variant uppercase ml-1" htmlFor="email">Email</label>
                <div className="relative flex items-center group">
                  <span className="material-symbols-outlined absolute left-4 text-outline group-focus-within:text-secondary">mail</span>
                  <input className="w-full bg-surface-container-low border border-outline-variant text-on-surface pl-12 pr-4 py-4 rounded-lg focus:outline-none focus:ring-2 focus:ring-secondary/20 focus:border-secondary transition-all font-body-md" id="email" name="email" placeholder="name@arena.com" type="email" />
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between items-center px-1">
                  <label className="font-label-sm text-label-sm text-on-surface-variant uppercase" htmlFor="password">Password</label>
                  <a className="text-tertiary font-label-sm text-label-sm hover:underline" href="#">Forgot password?</a>
                </div>
                <div className="relative flex items-center group">
                  <span className="material-symbols-outlined absolute left-4 text-outline group-focus-within:text-secondary">lock</span>
                  <input className="w-full bg-surface-container-low border border-outline-variant text-on-surface pl-12 pr-4 py-4 rounded-lg focus:outline-none focus:ring-2 focus:ring-secondary/20 focus:border-secondary transition-all font-body-md" id="password" name="password" placeholder="••••••••" type="password" />
                </div>
              </div>
              <div className="flex items-center space-x-3 px-1">
                <input className="w-5 h-5 rounded border-outline-variant bg-surface-container-low text-secondary focus:ring-secondary cursor-pointer" id="remember" name="remember" type="checkbox" />
                <label className="font-body-md text-body-md text-on-surface-variant cursor-pointer select-none" htmlFor="remember">Remember this device</label>
              </div>
              <button className="w-full bg-secondary hover:bg-secondary-fixed text-on-secondary font-headline-md text-headline-md py-4 rounded-lg shadow-lg shadow-secondary/10 transform active:scale-95 transition-all duration-200 border-b-2 border-on-secondary-container" type="submit">
                Sign In
              </button>
            </form>
            <div className="relative my-10">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-outline-variant"></div>
              </div>
              <div className="relative flex justify-center text-label-sm text-on-surface-variant uppercase">
                <span className="bg-surface-container px-4">Or continue with</span>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <button className="flex items-center justify-center gap-3 py-3 px-4 border border-outline-variant rounded-lg bg-surface-container-high hover:bg-surface-variant transition-colors group">
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path d="M12 5.04c1.64 0 3.12.56 4.28 1.66l3.21-3.21C17.54 1.76 14.99 1 12 1 7.37 1 3.42 3.67 1.48 7.58l3.77 2.92C6.15 7.42 8.85 5.04 12 5.04z" fill="#EA4335"></path>
                  <path d="M23.49 12.27c0-.82-.07-1.61-.21-2.38H12v4.51h6.44c-.28 1.47-1.11 2.72-2.36 3.56l3.66 2.84c2.14-1.98 3.39-4.89 3.39-8.53z" fill="#FBBC05"></path>
                  <path d="M12 23c3.12 0 5.74-1.03 7.65-2.8l-3.66-2.84c-1.06.71-2.42 1.13-3.99 1.13-3.08 0-5.7-2.09-6.63-4.91L1.64 16.5C3.62 20.35 7.51 23 12 23z" fill="#4285F4"></path>
                  <path d="M5.37 13.59c-.24-.71-.37-1.47-.37-2.26s.14-1.55.37-2.26L1.6 6.15C.58 8.16 0 10.42 0 12.83s.58 4.67 1.6 6.68l3.77-2.92z" fill="#34A853"></path>
                </svg>
                <span className="font-label-sm text-label-sm text-on-surface">Google</span>
              </button>
              <button className="flex items-center justify-center gap-3 py-3 px-4 border border-outline-variant rounded-lg bg-surface-container-high hover:bg-surface-variant transition-colors group">
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M17.05 20.28c-.96.95-2.21 1.72-3.73 1.72-2.12 0-3.15-1.35-5.26-1.35-2.13 0-3.3 1.35-5.22 1.35-1.35 0-2.4-.63-3.31-1.53C-1.84 17.15-2.23 11.95.83 8.8c1.53-1.56 3.12-2.34 4.74-2.34 1.83 0 2.85 1.08 4.14 1.08 1.25 0 2.1-.99 4.14-.99 1.47 0 2.85.72 3.84 1.77-3.12 1.77-2.61 5.91.42 7.14-.72 1.77-1.59 3.33-3.06 4.82zM13.06 5.51c-.84-1.02-1.41-2.46-1.26-3.87 1.2.06 2.64.81 3.51 1.83.78.9 1.47 2.4 1.32 3.75-1.32.12-2.73-.66-3.57-1.71z"></path>
                </svg>
                <span className="font-label-sm text-label-sm text-on-surface">Apple</span>
              </button>
            </div>
            <p className="mt-12 text-center text-on-surface-variant font-body-md text-body-md">
              Don't have an account? <a className="text-secondary font-semibold hover:underline" href="#">Register</a>
            </p>
            <div className="mt-auto pt-10 flex justify-center space-x-6">
              <a className="font-label-sm text-label-sm text-outline hover:text-on-surface-variant transition-colors uppercase" href="#">Privacy</a>
              <a className="font-label-sm text-label-sm text-outline hover:text-on-surface-variant transition-colors uppercase" href="#">Terms</a>
              <a className="font-label-sm text-label-sm text-outline hover:text-on-surface-variant transition-colors uppercase" href="#">Support</a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
