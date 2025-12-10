import { ReactNode } from 'react';

interface MobileDeviceMockupProps {
  children: ReactNode;
}

export const MobileDeviceMockup = ({ children }: MobileDeviceMockupProps) => {
  return (
    <div className="flex items-center justify-center py-8">
      {/* Phone Frame */}
      <div className="relative bg-gradient-to-b from-zinc-800 to-zinc-900 rounded-[3rem] p-3 shadow-2xl shadow-black/50">
        {/* Inner bezel */}
        <div className="relative bg-black rounded-[2.5rem] overflow-hidden">
          {/* Dynamic Island / Notch */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 z-20 bg-black rounded-b-3xl px-6 py-1">
            <div className="w-24 h-7 bg-zinc-900 rounded-full flex items-center justify-center gap-2">
              <div className="w-3 h-3 rounded-full bg-zinc-800 ring-1 ring-zinc-700" />
              <div className="w-2 h-2 rounded-full bg-zinc-800" />
            </div>
          </div>
          
          {/* Status Bar */}
          <div className="absolute top-2 left-0 right-0 z-10 flex items-center justify-between px-8 py-1 text-white text-xs font-medium">
            <span>9:41</span>
            <div className="flex items-center gap-1">
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 3c-4.97 0-9 4.03-9 9s4.03 9 9 9 9-4.03 9-9-4.03-9-9-9zm0 16c-3.86 0-7-3.14-7-7s3.14-7 7-7 7 3.14 7 7-3.14 7-7 7z" opacity="0.3"/>
                <path d="M1 9l2 2c2.88-2.88 6.79-4.08 10.53-3.62l1.19-2.38C9.44 4.13 4.48 5.76 1 9zm20 2l2-2c-2.64-2.64-6.03-4.04-9.53-4.18l1.03 2.06c2.54.26 4.94 1.38 6.5 4.12zM9 17l3 3 3-3c-1.65-1.66-4.34-1.66-6 0zm4-4.5c-2.76 0-5.26 1.12-7.07 2.93l2.12 2.12c1.26-1.26 3-2.05 4.95-2.05s3.69.79 4.95 2.05l2.12-2.12C18.26 13.62 15.76 12.5 13 12.5z"/>
              </svg>
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                <path d="M15.67 4H14V2h-4v2H8.33C7.6 4 7 4.6 7 5.33v15.33C7 21.4 7.6 22 8.33 22h7.33c.74 0 1.34-.6 1.34-1.33V5.33C17 4.6 16.4 4 15.67 4z"/>
              </svg>
            </div>
          </div>

          {/* Screen Content */}
          <div className="w-[375px] h-[812px] bg-white overflow-hidden">
            {children}
          </div>

          {/* Home Indicator */}
          <div className="absolute bottom-2 left-1/2 -translate-x-1/2 w-32 h-1 bg-white/30 rounded-full" />
        </div>

        {/* Side Buttons */}
        <div className="absolute left-0 top-28 -translate-x-0.5 w-1 h-8 bg-zinc-700 rounded-l-sm" />
        <div className="absolute left-0 top-44 -translate-x-0.5 w-1 h-12 bg-zinc-700 rounded-l-sm" />
        <div className="absolute left-0 top-60 -translate-x-0.5 w-1 h-12 bg-zinc-700 rounded-l-sm" />
        <div className="absolute right-0 top-36 translate-x-0.5 w-1 h-16 bg-zinc-700 rounded-r-sm" />
      </div>
    </div>
  );
};
