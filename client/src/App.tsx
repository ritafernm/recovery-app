function App() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-radial from-slate-900 to-zinc-950 p-4 font-sans text-white select-none">
      
      {/* Main Container */}
      <div className="text-center space-y-4">
        
        {/* Animated Headline Group */}
        <h1 className="flex flex-wrap items-center justify-center gap-4 text-4xl sm:text-6xl font-white tracking-tight uppercase">
          <span>Tailwind is working</span>
          
          {/* Floating Party Emoji */}
          <span className="inline-block animate-bounce [animation-duration:2s] text-5xl sm:text-6xl drop-shadow-lg">
            🥳
          </span>
        </h1>

        {/* Subtitle with pulsing indicator */}
        <div className="flex items-center justify-center gap-2 text-sm sm:text-base font-medium text-slate-400">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
          </span>
          <p>Setup verified in your Vite + React App</p>
        </div>

      </div>

      {/* Footer Branding */}
      <footer className="absolute bottom-6 text-xs text-slate-500 tracking-wide">
        Built with <span className="text-rose-500 animate-pulse inline-block">❤️</span> using Vite + React
      </footer>
      
    </div>
  );
}

export default App;