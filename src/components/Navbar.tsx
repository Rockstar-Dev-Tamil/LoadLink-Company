import { translations } from '../translations';

export function Navbar({ lang }: { lang: 'English' | 'Hindi' | 'Tamil' }) {
  const t = translations[lang];
  return (
    <header className="sticky top-0 z-40 w-full bg-[#0A0C14]/80 backdrop-blur-xl border-b border-white/5">
      <div className="flex h-16 items-center justify-between px-4 sm:px-6 lg:p-8">
        <div className="flex flex-1 items-center">
          <div className="w-full max-w-md relative group">
            <input 
               type="text" 
               className="bg-white/5 border border-white/10 text-sm rounded-full w-full py-2.5 pl-10 pr-4 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500" 
               placeholder={t.search}
            />
          </div>
        </div>

        <div className="flex items-center gap-4">
          <button className="relative w-10 h-10 rounded-full bg-white/5 border border-white/5 flex items-center justify-center">
            <svg className="w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
            </svg>
            <span className="absolute top-2 right-2.5 w-2 h-2 rounded-full bg-blue-500 border border-[#0A0C14]"></span>
          </button>
        </div>
      </div>
    </header>
  );
}
