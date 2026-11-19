import KeyRack from '@/components/home/KeyRack';
import PasteSlot from '@/components/home/PasteSlot';
import { toolPages } from '@/lib/site';

export default function Home() {
  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-12 py-4 sm:py-8">
      <div className="grid items-start gap-8 lg:grid-cols-2 lg:gap-12">
        <header className="flex flex-col gap-5 lg:pt-3">
          <h1 className="font-display text-[2.4rem] text-balance text-foreground sm:text-5xl lg:text-[2.6rem] xl:text-[3.2rem]">
            Developer tools that stay in your browser.
          </h1>
          <p className="max-w-[46ch] text-pretty text-base leading-relaxed text-muted-foreground sm:text-lg">
            {toolPages.length} tools for the small jobs: formatting JSON, decoding a token, testing a
            pattern. They run on your machine, so nothing you paste is uploaded.
          </p>
        </header>
        <PasteSlot />
      </div>
      <KeyRack />
    </div>
  );
}
