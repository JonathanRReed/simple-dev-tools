export default function Home() {
  return (
    <div className="relative flex-1 flex flex-col items-center justify-center min-h-screen w-full overflow-hidden">
      {/* Large SVG Blob Glow behind hero text */}
      <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[90vw] h-[70vh] z-0 pointer-events-none">
        <svg
          width="1600"
          height="900"
          viewBox="0 0 1600 900"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="w-full h-full object-cover"
          style={{ filter: 'blur(120px)', opacity: 0.5 }}
        >
          <style>{`
            :root {
              --color1: var(--rp-iris);
              --color2: var(--rp-rose);
            }
            @keyframes colorChange1 {
              0%, 100% { fill: var(--color1); }
              50% { fill: var(--color2); }
            }
            .blob-path {
              animation: colorChange1 8s infinite linear;
            }
          `}</style>
          <ellipse
            className="blob-path"
            cx="800"
            cy="450"
            rx="700"
            ry="350"
            fill="var(--color1)"
          />
        </svg>
      </div>
      <div className="relative z-10 flex flex-col items-center w-full max-w-3xl">
        <h1 className="text-3xl md:text-6xl font-extrabold text-rp-text mb-3 text-center drop-shadow-[0_1px_0_rgba(0,0,0,0.3)]">Simple-Dev-Tools</h1>
        <p className="mb-10 text-lg md:text-xl text-rp-foam text-center max-w-2xl">Simple dev tools by Hello.World Consulting</p>
        {/* Tool cards/links will go here */}
      </div>
    </div>
  );
}
