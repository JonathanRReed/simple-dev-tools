import Image from 'next/image';

export default function Footer() {
  return (
    <footer className="w-full flex justify-center items-end p-8 pb-12 bg-transparent mt-32">
      <div className="footer-card bg-[#181926]/90 rounded-3xl shadow-2xl px-8 py-10 max-w-xl w-full flex flex-col items-start gap-6 relative" style={{backdropFilter:'blur(24px)', WebkitBackdropFilter:'blur(24px)'}}>
        <div className="flex items-center gap-3">
          <Image src="/logo.avif" alt="Hello.World Consulting Logo" width={40} height={40} className="rounded-full" unoptimized />
          <span className="text-2xl text-white font-normal">A product of <span className="font-bold text-[#a78bfa]">Hello.World Consulting</span></span>
        </div>
        <span className="italic text-[#a78bfa] text-lg">Made by Jonathan Reed</span>
        <div className="flex flex-col gap-2 mt-2 w-full">
          <a href="https://helloworldfirm.com" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-[#a78bfa] text-lg font-medium hover:underline">
            <Image src="/logo.avif" alt="Hello.World Consulting Logo" width={28} height={28} className="rounded-full" unoptimized />
            helloworldfirm.com
          </a>
          <a href="https://JonathanRReed.com" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-[#a78bfa] text-lg font-medium hover:underline">
            <Image src="/jonathan.avif" alt="Jonathan Reed" width={28} height={28} className="rounded-full border-2 border-[#a78bfa]" unoptimized />
            JonathanRReed.com
          </a>
        </div>
        <span className="text-gray-400 text-sm mt-4">2025 &copy; All Rights Reserved</span>
      </div>
    </footer>
  );
}
